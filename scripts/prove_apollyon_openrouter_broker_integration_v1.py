#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
import os
import resource
import select
import shutil
import signal
import socket
import subprocess
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
S = ROOT / "scripts"
PROOF_MARKER = "VOID_OPENROUTER_BROKER_INTEGRATION_V1_PROOF_GREEN"


def limits():
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_NOFILE, (512, 512))
    eight_gib = 8 * 1024 * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (eight_gib, eight_gib))


def wait_ready(proc, timeout=10):
    deadline = time.monotonic() + timeout
    output = []
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            if proc.stdout:
                output.append(proc.stdout.read() or "")
            return False, "".join(output)
        ready, _, _ = select.select([proc.stdout], [], [], 0.25)
        if ready:
            line = proc.stdout.readline()
            if line:
                output.append(line)
                if "VOID_APOLLYON_OPENROUTER_BROKER_SERVICE_READY_V1" in line:
                    return True, "".join(output)
    return False, "".join(output)


MOCK = r"""import { appendFile } from 'node:fs/promises';
const marker=process.env.VOID_PROOF_FETCH_MARKER;
globalThis.fetch=async(url,o={})=>{
  const method=String(o?.method??'GET').toUpperCase();
  await appendFile(marker,`${method} ${url}\n`);
  throw new Error(`PROOF_FORBIDS_PROVIDER_NETWORK ${method} ${url}`);
};
"""

SIGNER = r"""import { buildOpenRouterBrokerBindingV1 } from '__BINDING_URI__';
import { buildBrokerAdmissionCapabilityV1, buildBrokerReplayCapabilityV1, readBrokerAdmissionMacCredentialV1 } from '__CAPABILITY_URI__';
import { req } from './request.mjs';
let key=null;
try {
  key=await readBrokerAdmissionMacCredentialV1(process.env.CREDENTIALS_DIRECTORY);
  const binding=buildOpenRouterBrokerBindingV1({
    logicalOperationIntentDigest:req.logical_operation_intent_digest,
    registrySha256:req.registry_sha256,
    requestBody:req.request_body,
    contestant:req.contestant,
  });
  const provenance={
    binding,
    model:req.contestant.model,
    canonicalSlug:req.contestant.canonical_slug,
    trialId:`voidat1_${'a'.repeat(64)}`,
    admissionId:`voidaa1_${'b'.repeat(64)}`,
    admissionReceiptSha256:'c'.repeat(64),
    promptSha256:'d'.repeat(64),
  };
  const admission=buildBrokerAdmissionCapabilityV1(provenance,key);
  const replay=buildBrokerReplayCapabilityV1(provenance,key);
  console.log('VOID_PROOF_SIGNED_REQUEST_JSON='+JSON.stringify({...req,admission_capability:admission,replay_capability:replay}));
} finally {
  if(key)key.fill(0);
}
"""

CLIENT = r"""import { runBrokerClientV1 } from './scripts/apollyon_openrouter_broker_client_v1.mjs';
import { req } from './request.mjs';
for(const key of ['OPENROUTER_API_KEY','CREDENTIALS_DIRECTORY','STATE_DIRECTORY']){
  if(process.env[key]!==undefined)throw new Error(`client unexpectedly received ${key}`);
}
const response=await runBrokerClientV1(process.env.VOID_PROOF_SOCKET,req);
console.log('VOID_BROKER_RESPONSE_JSON='+JSON.stringify(response));
"""


def write_request(tmp, value):
    (tmp / "request.mjs").write_text(
        "export const req=" + json.dumps(value, separators=(",", ":"), ensure_ascii=False) + ";\n"
    )


def sign_request(tmp, creds):
    signer = SIGNER.replace(
        "__BINDING_URI__", (S / "apollyon_openrouter_broker_binding_v1.mjs").as_uri()
    ).replace(
        "__CAPABILITY_URI__", (S / "apollyon_openrouter_broker_admission_capability_v1.mjs").as_uri()
    )
    (tmp / "signer.mjs").write_text(signer)
    cp = subprocess.run(
        ["node", str(tmp / "signer.mjs")],
        cwd=tmp,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=30,
        env={
            "PATH": os.environ.get("PATH", ""),
            "HOME": str(Path.home()),
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "CREDENTIALS_DIRECTORY": str(creds),
            "NODE_OPTIONS": "--max-old-space-size=1024",
        },
        preexec_fn=limits,
    )
    if cp.returncode != 0 or "VOID_PROOF_SIGNED_REQUEST_JSON=" not in (cp.stdout or ""):
        raise SystemExit(cp.stdout)
    line = next(x for x in cp.stdout.splitlines() if x.startswith("VOID_PROOF_SIGNED_REQUEST_JSON="))
    return json.loads(line.split("=", 1)[1])


def spawn_server(fd, state, creds, marker, mock):
    def setup():
        os.dup2(fd, 3)
        os.set_inheritable(3, True)
        limits()

    proc = subprocess.Popen(
        [
            "/bin/bash",
            "-lc",
            "export LISTEN_PID=$$; exec node --import "
            + str(mock)
            + " "
            + str(S / "apollyon_openrouter_broker_service_main_v1.mjs"),
        ],
        cwd=ROOT,
        env={
            "PATH": os.environ.get("PATH", ""),
            "HOME": str(Path.home()),
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "LISTEN_FDS": "1",
            "STATE_DIRECTORY": str(state),
            "CREDENTIALS_DIRECTORY": str(creds),
            "VOID_PROOF_FETCH_MARKER": str(marker),
            "NODE_OPTIONS": "--max-old-space-size=1024",
        },
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        pass_fds=(fd,),
        preexec_fn=setup,
    )
    ready, prefix = wait_ready(proc)
    if not ready:
        raise SystemExit("HOLD broker not ready\n" + prefix)
    return proc


def stop_server(proc):
    if proc and proc.poll() is None:
        proc.send_signal(signal.SIGTERM)
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)


def run_client(tmp, sock):
    cp = subprocess.run(
        ["node", str(tmp / "client.mjs")],
        cwd=tmp,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=30,
        env={
            "PATH": os.environ.get("PATH", ""),
            "HOME": str(Path.home()),
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "VOID_PROOF_SOCKET": str(sock),
            "NODE_OPTIONS": "--max-old-space-size=1024",
        },
        preexec_fn=limits,
    )
    if cp.returncode != 0:
        raise SystemExit(cp.stdout)
    line = next((x for x in cp.stdout.splitlines() if x.startswith("VOID_BROKER_RESPONSE_JSON=")), None)
    if line is None:
        raise SystemExit("HOLD client response JSON missing")
    return json.loads(line.split("=", 1)[1])


def assert_hold(response, expected_code=None):
    if response.get("status") != "HOLD":
        raise SystemExit("HOLD fresh request unexpectedly accepted: " + json.dumps(response, sort_keys=True))
    if response.get("result") is not None or response.get("result_digest") is not None:
        raise SystemExit("HOLD response exposed result material")
    if expected_code is not None and response.get("hold_code") != expected_code:
        raise SystemExit(
            f"HOLD wrong hold code expected={expected_code} actual={response.get('hold_code')}"
        )


def assert_no_provider_or_state(marker, state):
    if marker.read_text() != "":
        raise SystemExit("HOLD execution-identity gate touched provider network: " + marker.read_text())
    namespaces = list((state / "ledger-v1").glob("apollyon-op-v1-*"))
    if namespaces:
        raise SystemExit("HOLD execution-identity gate created operation namespace")
    capsules = list((state / "accepted-results-v1").glob("accepted-result-v1-*.json"))
    if capsules:
        raise SystemExit("HOLD execution-identity gate created accepted-result capsule")


def assert_socket_closes(sock_path, payload, timeout=7):
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect(str(sock_path))
        if payload:
            try:
                s.sendall(payload)
            except (BrokenPipeError, ConnectionResetError):
                return
        try:
            data = s.recv(1)
            if data != b"":
                raise SystemExit("HOLD partial IPC client received unexpected data")
        except (ConnectionResetError, BrokenPipeError):
            pass
        except socket.timeout:
            raise SystemExit("HOLD partial IPC client exceeded reviewed acquisition lifetime")
    finally:
        s.close()


def assert_many_partial_close(sock_path, count=12, timeout=7):
    clients = []
    try:
        for _ in range(count):
            s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            s.settimeout(0.25)
            s.connect(str(sock_path))
            try:
                s.sendall(b"{")
            except (BrokenPipeError, ConnectionResetError):
                pass
            clients.append(s)
        deadline = time.monotonic() + timeout
        pending = set(range(len(clients)))
        while pending and time.monotonic() < deadline:
            for index in list(pending):
                try:
                    if clients[index].recv(1) == b"":
                        pending.remove(index)
                except (ConnectionResetError, BrokenPipeError):
                    pending.remove(index)
                except socket.timeout:
                    pass
            time.sleep(0.05)
        if pending:
            raise SystemExit(f"HOLD incomplete IPC clients exceeded lifetime count={len(pending)}")
    finally:
        for s in clients:
            try:
                s.close()
            except Exception:
                pass


tmp = Path(tempfile.mkdtemp(prefix="void-broker-execution-identity-ci-"))
listener = None
server = None
try:
    state = tmp / "state"
    broker_creds = tmp / "broker-creds"
    signer_creds = tmp / "signer-creds"
    for directory in [state, broker_creds, signer_creds]:
        directory.mkdir(mode=0o700)
        os.chmod(directory, 0o700)

    (tmp / "scripts").mkdir(mode=0o700)
    shutil.copy2(
        S / "apollyon_openrouter_broker_client_v1.mjs",
        tmp / "scripts" / "apollyon_openrouter_broker_client_v1.mjs",
    )
    shutil.copy2(
        S / "apollyon_openrouter_broker_ipc_protocol_v1.mjs",
        tmp / "scripts" / "apollyon_openrouter_broker_ipc_protocol_v1.mjs",
    )
    (tmp / "client.mjs").write_text(CLIENT)

    fake_api_key = "sk-proof-never-sent-123456789"
    (broker_creds / "openrouter_api_key").write_text(fake_api_key + "\n")
    os.chmod(broker_creds / "openrouter_api_key", 0o600)
    admission_key = bytes([0x42]) * 32
    for directory in [broker_creds, signer_creds]:
        (directory / "apollyon_openrouter_admission_mac_v1").write_bytes(admission_key)
        os.chmod(directory / "apollyon_openrouter_admission_mac_v1", 0o600)
    if (signer_creds / "openrouter_api_key").exists():
        raise SystemExit("HOLD signer unexpectedly received provider credential")

    marker = tmp / "provider-calls.txt"
    marker.write_text("")
    mock = tmp / "forbid-provider-fetch.mjs"
    mock.write_text(MOCK)

    registry = json.loads((ROOT / "public" / "apollyon-openrouter-contestants-v1.json").read_text())
    registry_sha = hashlib.sha256(
        json.dumps(registry, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()
    reviewed = [x for x in registry.get("contestants", []) if x.get("model") == "stealth/ox-alpha"]
    if len(reviewed) != 1 or reviewed[0].get("status") != "qualified":
        raise SystemExit("HOLD reviewed stealth/ox-alpha registry entry invalid")
    contestant = reviewed[0]

    base = {
        "marker": "VOID_APOLLYON_OPENROUTER_BROKER_REQUEST_V1",
        "version": 1,
        "request_id": "voidobr1_" + ("1" * 64),
        "logical_operation_intent_digest": "2" * 64,
        "registry_sha256": registry_sha,
        "request_body": {
            "model": "stealth/ox-alpha",
            "messages": [
                {"role": "system", "content": "public"},
                {"role": "user", "content": "public"},
            ],
            "max_tokens": 4096,
            "stream": False,
            "provider": {
                "allow_fallbacks": False,
                "require_parameters": True,
                "max_price": {"prompt": 0, "completion": 0},
                "zdr": False,
            },
        },
        "contestant": contestant,
        "admission_capability": None,
        "replay_capability": None,
        "timeout_ms": 120000,
    }

    sock = tmp / "broker.sock"
    listener = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    listener.bind(str(sock))
    listener.listen(32)
    os.chmod(sock, 0o600)
    server = spawn_server(listener.fileno(), state, broker_creds, marker, mock)

    write_request(tmp, base)
    unsigned = run_client(tmp, sock)
    assert_hold(unsigned, "ADMISSION_HOLD")
    assert_no_provider_or_state(marker, state)

    signed = sign_request(tmp, signer_creds)

    forged = copy.deepcopy(signed)
    forged["admission_capability"]["authority_mac_sha256"] = "0" * 64
    write_request(tmp, forged)
    forged_response = run_client(tmp, sock)
    assert_hold(forged_response, "ADMISSION_HOLD")
    assert_no_provider_or_state(marker, state)

    write_request(tmp, signed)
    exact = run_client(tmp, sock)
    assert_hold(exact, "EXECUTION_IDENTITY_HOLD")
    if not str(exact.get("operation_id", "")).startswith("apollyon_op_v1:"):
        raise SystemExit("HOLD execution identity response lacks bound operation id")
    assert_no_provider_or_state(marker, state)

    changed = copy.deepcopy(signed)
    changed["request_body"]["messages"][1]["content"] += " changed"
    write_request(tmp, changed)
    changed_response = run_client(tmp, sock)
    assert_hold(changed_response, "ADMISSION_HOLD")
    assert_no_provider_or_state(marker, state)

    bad_registry = copy.deepcopy(signed)
    bad_registry["registry_sha256"] = "f" * 64
    write_request(tmp, bad_registry)
    bad_registry_response = run_client(tmp, sock)
    assert_hold(bad_registry_response, "ADMISSION_HOLD")
    assert_no_provider_or_state(marker, state)

    unreviewed = copy.deepcopy(signed)
    unreviewed["contestant"]["model"] = "stealth/not-reviewed"
    unreviewed["contestant"]["canonical_slug"] = "stealth/not-reviewed"
    unreviewed["request_body"]["model"] = "stealth/not-reviewed"
    write_request(tmp, unreviewed)
    unreviewed_response = run_client(tmp, sock)
    assert_hold(unreviewed_response, "ADMISSION_HOLD")
    assert_no_provider_or_state(marker, state)

    assert_socket_closes(sock, b"{")
    assert_many_partial_close(sock)
    assert_no_provider_or_state(marker, state)

    print(
        PROOF_MARKER
        + " production_execution_identity_hold=true"
        + " valid_fresh_zero_catalog=true"
        + " valid_fresh_zero_chat=true"
        + " valid_fresh_zero_namespace=true"
        + " accepted_capsule_zero=true"
        + " forged_capability_hold=true"
        + " changed_work_hold=true"
        + " bad_registry_hold=true"
        + " unreviewed_contestant_hold=true"
        + " partial_ipc_lifetime_bounded=true"
        + " incomplete_clients_bounded=true"
    )
finally:
    stop_server(server)
    if listener is not None:
        try:
            listener.close()
        except Exception:
            pass
    shutil.rmtree(tmp, ignore_errors=True)
