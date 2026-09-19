#!/usr/bin/env python3
"""Prepare or execute an explicitly confirmed, content-conditional Funnel change.

This tool never installs, starts, stops, disables or restarts a service. It does
not change DNS. Rollback is a NEW confirmed content-CAS operation, not a claim
to historical mutation lineage. Tailscale ETags identify content, not time.
"""
import argparse
import copy
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import signal
import socket
import stat
import time

MARKER = "VOID_PUBLIC_FRONTDOOR_CUTOVER_V2"
ROOT = Path(__file__).resolve().parents[2]
LIMIT = 1024 * 1024
SOCKET = "/var/run/tailscale/tailscaled.sock"
STATE = Path.home() / ".local" / "state" / "void-public-frontdoor-v2"
LOCK_NAME = "\0void-public-frontdoor-cutover-v2-" + str(os.getuid())


def require(condition, reason):
    if not condition:
        raise RuntimeError(reason)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def strict_json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "duplicate JSON key")
            result[key] = value
        return result
    return json.loads(data, object_pairs_hook=pairs,
                      parse_constant=lambda value: require(False, "nonfinite JSON"))


class State:
    """One UID-wide kernel lock and one retained, no-follow state directory."""
    def __init__(self, path=STATE, lock_name=LOCK_NAME):
        self.path = Path(path)
        self.lock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
        self.fd = None
        try:
            # Abstract sockets cannot be replaced by renaming a filesystem path.
            self.lock.bind(lock_name)
            self.fd = self.open_directory(create=True)
            self.identity = self.identify(self.fd)
        except BaseException:
            self.close()
            raise

    @staticmethod
    def identify(fd):
        s = os.fstat(fd)
        return (s.st_dev, s.st_ino, s.st_uid, s.st_mode)

    def open_directory(self, create=False):
        require(self.path.is_absolute() and ".." not in self.path.parts, "invalid state path")
        fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
        try:
            for part in self.path.parts[1:]:
                try:
                    child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
                except FileNotFoundError:
                    require(create, "state directory replaced or removed")
                    os.mkdir(part, 0o700, dir_fd=fd)
                    os.fsync(fd)
                    child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
                os.close(fd)
                fd = child
                s = os.fstat(fd)
                require(s.st_uid in (0, os.getuid()) and not s.st_mode & 0o022,
                        "state ancestor has foreign write authority")
            s = os.fstat(fd)
            require(s.st_uid == os.getuid() and not s.st_mode & 0o077,
                    "state directory must be owned and private")
            result, fd = fd, None
            return result
        finally:
            if fd is not None:
                os.close(fd)

    def current(self):
        other = self.open_directory()
        try:
            require(self.identify(other) == self.identity, "state directory generation changed")
        finally:
            os.close(other)

    def read(self, name):
        require(name in {"plan.json", "receipt.json", "spent.json"}, "invalid state leaf")
        try:
            fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=self.fd)
        except FileNotFoundError:
            return None
        try:
            before = os.fstat(fd)
            require(stat.S_ISREG(before.st_mode) and before.st_uid == os.getuid()
                    and not before.st_mode & 0o077 and before.st_size <= LIMIT,
                    "unsafe state file")
            output = bytearray()
            for _ in range(258):
                chunk = os.read(fd, min(65536, LIMIT + 1 - len(output)))
                if not chunk:
                    break
                output.extend(chunk)
                require(len(output) <= LIMIT, "state too large")
            else:
                raise RuntimeError("state read work limit")
            after = os.fstat(fd)
            fields = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns, s.st_mode)
            require(fields(before) == fields(after) and len(output) == before.st_size, "state changed during read")
            return strict_json(output)
        finally:
            os.close(fd)

    def write(self, name, value):
        require(name in {"plan.json", "receipt.json", "spent.json"}, "invalid state leaf")
        data = canonical(value) + b"\n"
        require(len(data) <= LIMIT, "state too large")
        leaf = ".pending-" + os.urandom(16).hex()
        fd = os.open(leaf, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=self.fd)
        try:
            view = memoryview(data)
            while view:
                size = os.write(fd, view)
                require(size > 0, "state write made no progress")
                view = view[size:]
            os.fsync(fd)
        finally:
            os.close(fd)
        # Even if the pathname is renamed, publication stays inside this inode.
        os.replace(leaf, name, src_dir_fd=self.fd, dst_dir_fd=self.fd)
        os.fsync(self.fd)

    def close(self):
        if self.fd is not None:
            os.close(self.fd)
            self.fd = None
        self.lock.close()


class LocalConnection(http.client.HTTPConnection):
    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(5)
        self.sock.connect(SOCKET)


def local_api(method, configuration=None, etag=None):
    require(method in {"GET", "POST"}, "invalid LocalAPI method")
    connection = LocalConnection("local-tailscaled.sock", timeout=5)
    def expired(signum, frame):
        raise TimeoutError("LocalAPI absolute deadline")
    old = signal.signal(signal.SIGALRM, expired)
    signal.setitimer(signal.ITIMER_REAL, 5)
    try:
        headers = {"Content-Type": "application/json"}
        if method == "POST":
            require(isinstance(etag, str) and re.fullmatch(r'"?[a-fA-F0-9]{64}"?', etag), "missing content ETag")
            headers["If-Match"] = etag
        connection.request(method, "/localapi/v0/serve-config",
                           body=None if configuration is None else canonical(configuration), headers=headers)
        response = connection.getresponse()
        body = response.read(LIMIT + 1)
        require(len(body) <= LIMIT, "LocalAPI response too large")
        require(response.status != 412, "content changed before conditional write; no overwrite")
        require(response.status == 200, "LocalAPI refused operation; HTTP " + str(response.status))
        if method == "POST":
            return None
        tag = response.getheader("ETag")
        require(isinstance(tag, str) and re.fullmatch(r'"?[a-fA-F0-9]{64}"?', tag), "LocalAPI content ETag unavailable")
        config = strict_json(body)
        require(isinstance(config, dict), "ServeConfig must be an object")
        return config, tag
    finally:
        connection.close()
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old)


def source_binding():
    paths = ["ops/public/void_public_frontdoor_cutover_v2.py",
             "ops/public/void-public-frontdoor-v1.mjs",
             "public/void-public-frontdoor-v1/index.html"]
    return {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in paths}


def candidate(config, hostname):
    require(re.fullmatch(r"[a-z0-9][a-z0-9.-]*\.ts\.net", hostname), "invalid canonical hostname")
    require(not config.get("Foreground"), "foreground Serve configuration needs separate reconciliation")
    key = hostname + ":443"
    require(config.get("TCP", {}).get("443") == {"HTTPS": True}, "canonical 443 is not simple HTTPS")
    web = config.get("Web", {}).get(key)
    require(isinstance(web, dict) and set(web) == {"Handlers"}
            and set(web["Handlers"]) == {"/"}, "canonical root configuration is not simple")
    root = web["Handlers"]["/"]
    require(isinstance(root, dict) and set(root) == {"Proxy"}
            and re.fullmatch(r"http://127\.0\.0\.1:[1-9][0-9]{0,4}", root["Proxy"]), "canonical predecessor is not loopback")
    output = copy.deepcopy(config)
    output["Web"][key]["Handlers"]["/"] = {"Proxy": "http://127.0.0.1:8083"}
    output.setdefault("AllowFunnel", {})[key] = True
    require(output != config, "canonical route already has proposed content")
    return output


def probe_frontdoor():
    connection = http.client.HTTPConnection("127.0.0.1", 8083, timeout=6)
    def expired(signum, frame):
        raise TimeoutError("frontdoor preflight absolute deadline")
    old = signal.signal(signal.SIGALRM, expired)
    signal.setitimer(signal.ITIMER_REAL, 6)
    try:
        connection.request("GET", "/__void/frontdoor/status.json")
        response = connection.getresponse()
        data = response.read(16385)
        require(response.status == 200 and len(data) <= 16384, "frontdoor status unavailable")
        value = strict_json(data)
        require(value.get("marker") == "VOID_PUBLIC_FRONTDOOR_V1"
                and value.get("ready") is True and value.get("read_only") is True
                and value.get("bind") == "127.0.0.1" and value.get("port") == 8083
                and value.get("upstream") == "http://127.0.0.1:8082",
                "complete read-only website readiness is required before cutover")
    finally:
        connection.close()
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old)


def prepare(state, hostname, rollback=False, api=local_api, bindings=source_binding):
    state.current()
    receipt = state.read("receipt.json")
    before, etag = api("GET")
    if rollback:
        require(receipt and receipt["phase"] in {"installed", "uncertain"}, "no active recovery candidate")
        original = receipt["plan"]
        require(original["action"] == "publish" and before == original["after"],
                "current content differs from candidate; preserve foreign routing")
        after = original["before"]
        hostname = original["hostname"]
    else:
        require(not receipt or receipt["phase"] == "retired", "prior transaction requires explicit reconciliation")
        after = candidate(before, hostname)
    plan = {"marker": MARKER, "action": "restore" if rollback else "publish",
            "hostname": hostname, "before": before, "after": after,
            "before_etag": etag, "created_at": int(time.time()),
            "nonce": os.urandom(16).hex(), "source": bindings(),
            "authority": "explicit_current_content_cas_only",
            "service_mutation": False, "dns_mutation": False}
    state.current()
    state.write("plan.json", plan)
    return digest(plan)


def apply(state, confirmation, api=local_api, readiness=probe_frontdoor, bindings=source_binding):
    state.current()
    plan = state.read("plan.json")
    require(plan and re.fullmatch(r"[a-f0-9]{64}", confirmation or "")
            and digest(plan) == confirmation, "exact plan confirmation required")
    require(plan["marker"] == MARKER and plan["source"] == bindings(), "source binding changed")
    require(0 <= time.time() - plan["created_at"] <= 1800, "plan expired")
    spent = state.read("spent.json") or []
    require(isinstance(spent, list) and len(spent) < 1024
            and all(isinstance(item, str) and re.fullmatch(r"[a-f0-9]{64}", item) for item in spent),
            "invalid or exhausted attempt ledger")
    require(confirmation not in spent, "confirmed plan was already attempted")
    receipt = state.read("receipt.json")
    if receipt and receipt.get("plan_sha256") == confirmation:
        raise RuntimeError("plan already attempted; inspect receipt before preparing any successor")
    current, etag = api("GET")
    require(current == plan["before"] and etag == plan["before_etag"], "prepared predecessor changed")
    if plan["action"] == "publish":
        require(candidate(current, plan["hostname"]) == plan["after"], "candidate scope changed")
        readiness()
    else:
        require(plan["action"] == "restore" and receipt
                and receipt["phase"] in {"installed", "uncertain"}
                and receipt["plan"]["action"] == "publish"
                and plan["before"] == receipt["plan"]["after"]
                and plan["after"] == receipt["plan"]["before"], "restore lacks original content binding")
    state.current()
    state.write("spent.json", [*spent, confirmation])
    pending = {"phase": "uncertain", "plan_sha256": confirmation, "plan": plan,
               "previous_receipt": receipt if plan["action"] == "restore" else None}
    state.write("receipt.json", pending)
    state.current()
    api("POST", plan["after"], etag)
    observed, _ = api("GET")
    require(observed == plan["after"], "post-write content differs; no automatic rollback")
    pending["phase"] = "retired" if plan["action"] == "restore" else "installed"
    state.write("receipt.json", pending)
    state.current()
    return pending["phase"]


def reconcile(state, api=local_api):
    """Resolve an interrupted write by current content; never change routing."""
    state.current()
    receipt = state.read("receipt.json")
    require(receipt and receipt["phase"] == "uncertain", "no uncertain receipt")
    current, _ = api("GET")
    plan = receipt["plan"]
    if current == plan["after"]:
        receipt["phase"] = "retired" if plan["action"] == "restore" else "installed"
    elif current == plan["before"]:
        if plan["action"] == "restore":
            receipt = receipt["previous_receipt"]
            require(receipt and receipt["phase"] in {"installed", "uncertain"}, "missing prior receipt")
            receipt["phase"] = "installed"
        else:
            receipt["phase"] = "retired"
    else:
        raise RuntimeError("foreign current content requires separate operator reconciliation")
    state.current()
    state.write("receipt.json", receipt)
    return receipt["phase"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--prepare", action="store_true")
    group.add_argument("--prepare-rollback", action="store_true")
    group.add_argument("--apply", action="store_true")
    group.add_argument("--status", action="store_true")
    group.add_argument("--reconcile", action="store_true")
    parser.add_argument("--hostname")
    parser.add_argument("--confirm")
    args = parser.parse_args()
    state = State()
    try:
        if args.prepare or args.prepare_rollback:
            confirmation = prepare(state, args.hostname or "", args.prepare_rollback)
            plan = state.read("plan.json")
            key = plan["hostname"] + ":443"
            print("canonical_hostname=" + plan["hostname"])
            print("before_proxy=" + plan["before"]["Web"][key]["Handlers"]["/"]["Proxy"])
            print("before_public=" + str(plan["before"].get("AllowFunnel", {}).get(key, False)).lower())
            print("after_proxy=" + plan["after"]["Web"][key]["Handlers"]["/"]["Proxy"])
            print("after_public=" + str(plan["after"].get("AllowFunnel", {}).get(key, False)).lower())
            print("plan_sha256=" + confirmation)
            print("prepared_only=true; service_changed=false; funnel_changed=false; dns_changed=false")
        elif args.apply:
            print("phase=" + apply(state, args.confirm))
            print("service_changed=false; dns_changed=false; public_reachability_proven=false")
        elif args.reconcile:
            print("phase=" + reconcile(state))
            print("service_changed=false; funnel_changed=false; dns_changed=false")
        else:
            receipt = state.read("receipt.json")
            print("phase=" + (receipt["phase"] if receipt else "no_transaction"))
            print("service_changed=false; funnel_changed=false; dns_changed=false")
    finally:
        state.close()


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError, KeyError, TypeError, http.client.HTTPException) as error:
        print("HOLD " + MARKER + ": " + str(error))
        raise SystemExit(2)
