#!/usr/bin/env python3
"""Deterministic cutover/state fixtures. Never accesses Tailscale or systemd."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import http.server
import socketserver
import threading

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/public/void_public_frontdoor_cutover_v2.py"
spec = importlib.util.spec_from_file_location("cutover", SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
HOST = "precision.example.ts.net"
KEY = HOST + ":443"
INITIAL = {
    "TCP": {"443": {"HTTPS": True}, "8443": {"HTTPS": True}, "10000": {"HTTPS": True}},
    "Web": {
        KEY: {"Handlers": {"/": {"Proxy": "http://127.0.0.1:4100"}}},
        HOST + ":8443": {"Handlers": {"/": {"Proxy": "http://127.0.0.1:4112"}}},
        HOST + ":10000": {"Handlers": {"/": {"Proxy": "http://127.0.0.1:4113"}}},
    },
    "AllowFunnel": {HOST + ":8443": True, HOST + ":10000": True},
}
cases = 0


class API:
    def __init__(self):
        self.value = copy.deepcopy(INITIAL)
        self.writes = 0
        self.posts = 0
        self.before_post = lambda: None
        self.after_post = lambda: None

    def etag(self):
        return hashlib.sha256(json.dumps(self.value, sort_keys=True).encode()).hexdigest()

    def __call__(self, method, value=None, etag=None):
        if method == "GET":
            return copy.deepcopy(self.value), self.etag()
        assert method == "POST"
        self.posts += 1
        self.before_post()
        if etag != self.etag():
            raise RuntimeError("412 content mismatch")
        self.value = copy.deepcopy(value)
        self.writes += 1
        self.after_post()


def blocked(fn, pattern=None):
    global cases
    try:
        fn()
    except (RuntimeError, OSError) as error:
        if pattern:
            assert pattern in str(error), (pattern, str(error))
    else:
        raise AssertionError("expected fail-closed rejection")
    cases += 1


def exercise(fn):
    root = Path(tempfile.mkdtemp(prefix="void-frontdoor-cas-proof-", dir=Path.home()))
    state = None
    try:
        state = m.State(root / "state")
        fn(state, API())
    finally:
        if state is not None:
            state.close()
        shutil.rmtree(root)


def prepare(state, api, rollback=False):
    return m.prepare(state, HOST, rollback, api=api)


def apply(state, api, confirmation, readiness=lambda: None):
    return m.apply(state, confirmation, api=api, readiness=readiness)


def normal(state, api):
    global cases
    confirmation = prepare(state, api)
    assert api.writes == 0
    blocked(lambda: apply(state, api, "0" * 64), "confirmation")
    assert apply(state, api, confirmation) == "installed"
    assert api.value["Web"][KEY]["Handlers"]["/"]["Proxy"] == "http://127.0.0.1:8083"
    assert api.value["AllowFunnel"][KEY] is True
    for port in ("8443", "10000"):
        assert api.value["Web"][HOST + ":" + port] == INITIAL["Web"][HOST + ":" + port]
        assert api.value["TCP"][port] == INITIAL["TCP"][port]
        assert api.value["AllowFunnel"][HOST + ":" + port] == INITIAL["AllowFunnel"][HOST + ":" + port]
    blocked(lambda: apply(state, api, confirmation), "already attempted")
    restore = prepare(state, api, True)
    assert api.writes == 1
    assert apply(state, api, restore) == "retired"
    assert api.value == INITIAL
    blocked(lambda: apply(state, api, restore), "already attempted")
    blocked(lambda: prepare(state, api, True), "no active")
    cases += 2


def final_race(state, api):
    confirmation = prepare(state, api)
    def foreign():
        api.value["Web"][KEY]["Handlers"]["/"]["Proxy"] = "http://127.0.0.1:9000"
    api.before_post = foreign
    blocked(lambda: apply(state, api, confirmation), "412")
    assert api.posts == 1 and api.writes == 0
    assert api.value["Web"][KEY]["Handlers"]["/"]["Proxy"].endswith(":9000")
    assert state.read("receipt.json")["phase"] == "uncertain"
    blocked(lambda: m.reconcile(state, api=api), "foreign current content")


def predecessor(state, api):
    confirmation = prepare(state, api)
    api.value["AllowFunnel"][HOST + ":8443"] = False
    blocked(lambda: apply(state, api, confirmation), "predecessor changed")
    assert api.posts == 0


def foreign_rollback(state, api):
    apply(state, api, prepare(state, api))
    original = copy.deepcopy(api.value)
    api.value["Web"][KEY]["Handlers"]["/"]["Proxy"] = "http://127.0.0.1:9000"
    blocked(lambda: prepare(state, api, True), "preserve foreign")
    assert api.writes == 1
    # Exact-content ABA cannot prove lineage. A NEW explicit confirmation may
    # restore matching current content. No stored automatic rollback runs.
    api.value = original
    restore = prepare(state, api, True)
    assert api.writes == 1
    assert apply(state, api, restore) == "retired"
    assert api.value == INITIAL


def retired_aba(state, api):
    publish = prepare(state, api)
    apply(state, api, publish)
    installed = copy.deepcopy(api.value)
    restore = prepare(state, api, True)
    old_plan = state.read("plan.json")
    apply(state, api, restore)
    api.value = installed
    state.write("plan.json", old_plan)
    blocked(lambda: apply(state, api, restore), "already attempted")
    assert api.writes == 2 and api.value == installed


def interrupted(state, api):
    confirmation = prepare(state, api)
    def lost_reply():
        raise RuntimeError("reply lost after write")
    api.after_post = lost_reply
    blocked(lambda: apply(state, api, confirmation), "reply lost")
    assert state.read("receipt.json")["phase"] == "uncertain"
    assert m.reconcile(state, api=api) == "installed"
    restore = prepare(state, api, True)
    blocked(lambda: apply(state, api, restore), "reply lost")
    assert m.reconcile(state, api=api) == "retired"
    assert api.writes == 2 and api.value == INITIAL


def lost_before_write(state, api):
    confirmation = prepare(state, api)
    def lost():
        raise RuntimeError("transport failed before write")
    api.before_post = lost
    blocked(lambda: apply(state, api, confirmation), "transport failed")
    assert api.writes == 0
    assert m.reconcile(state, api=api) == "retired"


def unsafe_inputs(state, api):
    confirmation = prepare(state, api)
    blocked(lambda: apply(state, api, confirmation, lambda: m.require(False, "not ready")), "not ready")
    assert api.posts == 0
    plan = state.read("plan.json")
    plan["source"] = {}
    state.write("plan.json", plan)
    blocked(lambda: apply(state, api, m.digest(plan)), "source binding")
    plan["source"] = m.source_binding()
    plan["created_at"] -= 3600
    state.write("plan.json", plan)
    blocked(lambda: apply(state, api, m.digest(plan)), "expired")
    for mutator in (
        lambda x: x.update(Foreground={"session": {}}),
        lambda x: x["Web"][KEY]["Handlers"].update({"/private": {"Text": "foreign"}}),
        lambda x: x["TCP"].update({"443": {"TCPForward": "127.0.0.1:4100"}}),
    ):
        value = copy.deepcopy(INITIAL)
        mutator(value)
        blocked(lambda: m.candidate(value, HOST))
    assert api.posts == 0


def namespace(state, api):
    old = state.path.with_name("retained-directory")
    state.path.rename(old)
    state.path.mkdir(mode=0o700)
    blocked(state.current, "directory generation changed")
    child_code = (
        "import importlib.util,sys; "
        "s=importlib.util.spec_from_file_location('m',sys.argv[1]); "
        "m=importlib.util.module_from_spec(s);s.loader.exec_module(m); "
        "m.State(sys.argv[2])"
    )
    child = subprocess.run([sys.executable, "-c", child_code, str(SOURCE), str(state.path)],
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5, close_fds=True)
    assert child.returncode != 0 and b"Address already in use" in child.stderr
    state.write("plan.json", {"retained": True})
    assert (old / "plan.json").exists()
    assert not (state.path / "plan.json").exists()
    blocked(lambda: prepare(state, api), "directory generation changed")
    assert api.posts == 0


def native_localapi():
    """Exercise the actual Unix HTTP client and If-Match wire header."""
    global cases
    root = Path(tempfile.mkdtemp(prefix="void-frontdoor-localapi-proof-", dir=Path.home()))
    old_socket = m.SOCKET
    fixture = API()
    observed = []
    class Server(socketserver.UnixStreamServer):
        pass
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *args):
            return
        def do_GET(self):
            assert self.path == "/localapi/v0/serve-config"
            body = json.dumps(fixture.value).encode()
            self.send_response(200)
            self.send_header("ETag", fixture.etag())
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        def do_POST(self):
            assert self.path == "/localapi/v0/serve-config"
            observed.append(self.headers.get("If-Match"))
            value = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            if self.headers.get("If-Match") != fixture.etag():
                self.send_response(412)
            else:
                fixture.value = value
                fixture.writes += 1
                self.send_response(200)
            self.send_header("Content-Length", "0")
            self.end_headers()
    server = None
    try:
        m.SOCKET = str(root / "fixture.sock")
        server = Server(m.SOCKET, Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        value, tag = m.local_api("GET")
        assert value == INITIAL
        after = m.candidate(value, HOST)
        m.local_api("POST", after, tag)
        assert observed == [tag] and fixture.writes == 1
        current, next_tag = m.local_api("GET")
        assert current == after and next_tag != tag
        blocked(lambda: m.local_api("POST", INITIAL, tag), "content changed")
        assert fixture.value == after and fixture.writes == 1
        m.local_api("POST", INITIAL, next_tag)
        assert fixture.value == INITIAL and fixture.writes == 2
        cases += 2
    finally:
        m.SOCKET = old_socket
        if server:
            server.shutdown()
            server.server_close()
        shutil.rmtree(root)


if __name__ == "__main__":
    for test in (normal, final_race, predecessor, foreign_rollback, retired_aba,
                 interrupted, lost_before_write, unsafe_inputs, namespace):
        exercise(test)
    native_localapi()

    # This recovery helper has no service command path, including after a later
    # service replacement. Service lifecycle is a separately reviewed operation.
    text = SOURCE.read_text()
    assert "systemctl" not in text and "subprocess" not in text
    assert "If-Match" in text
    print("VOID_PUBLIC_FRONTDOOR_CUTOVER_V2_GREEN")
    print("cases=" + str(cases))
    print("auxiliary_8443_and_10000_preserved=true")
    print("final_compare_set_foreign_content_rejected=true")
    print("rollback_requires_new_confirmation=true")
    print("etag_is_content_identity_not_mutation_lineage=true")
    print("service_generation_mutation_paths=0")
    print("retained_directory_and_kernel_lock_proved=true")
    print("live_funnel_invocations=0")
    print("unix_localapi_if_match_wire_contract_proved=true")
