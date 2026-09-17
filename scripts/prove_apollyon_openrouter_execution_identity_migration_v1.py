#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
import os
import resource
import select
import signal
import socket
import subprocess
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
S = ROOT / "scripts"
PROOF_MARKER = "VOID_OPENROUTER_EXECUTION_IDENTITY_MIGRATION_V1_PROOF_GREEN"


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

CLIENT = r"""import { runBrokerClientV1 } from '__CLIENT_URI__';
import { req } from './request.mjs';
const response=await runBrokerClientV1(process.env.VOID_PROOF_SOCKET,req);
console.log('VOID_BROKER_RESPONSE_JSON='+JSON.stringify(response));
"""

SEEDER = r"""import { constants as FS } from 'node:fs';
import { mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { req } from './request.mjs';
import { buildOpenRouterBrokerBindingV1 } from '__BINDING_URI__';
import { openOperationLedgerNamespaceV1 } from '__NAMESPACE_URI__';
import { prepareBrokerOperationV1 } from '__PREPARE_URI__';
import { appendBrokerAuthorizedRecordV1 } from '__APPEND_URI__';
import { loadLedgerRecordsV1 } from '__LOAD_URI__';
import { LEDGER_EVENT_V1, makeLedgerRecordV1 } from '__RECORD_URI__';
import { openPinnedLedgerDirectoryV1 } from '__PUBLISH_URI__';
import { acceptedResultDigestV1, publishAcceptedResultCapsuleV1 } from '__CAPSULE_URI__';

const state=process.env.STATE_DIRECTORY;
const target=process.env.VOID_PROOF_LEGACY_PHASE;
if(!['ACCEPTED','RESULT_WITNESSED'].includes(target))throw new Error('invalid legacy target');
const ledgerPath=join(state,'ledger-v1');
const acceptedPath=join(state,'accepted-results-v1');
await mkdir(ledgerPath,{recursive:true,mode:0o700});
await mkdir(acceptedPath,{recursive:true,mode:0o700});
const ledgerRoot=await open(ledgerPath,FS.O_RDONLY|FS.O_DIRECTORY|FS.O_NOFOLLOW);
const acceptedRoot=await openPinnedLedgerDirectoryV1(acceptedPath);
let ns=null;
try {
  const binding=buildOpenRouterBrokerBindingV1({
    logicalOperationIntentDigest:req.logical_operation_intent_digest,
    registrySha256:req.registry_sha256,
    requestBody:req.request_body,
    contestant:req.contestant,
  });
  ns=await openOperationLedgerNamespaceV1(ledgerRoot,binding.operationId);
  await prepareBrokerOperationV1(ns.directoryHandle,binding);
  async function append(type,resultDigest=null){
    const records=await loadLedgerRecordsV1(ns.directoryHandle);
    const previous=records.at(-1);
    const record=makeLedgerRecordV1({
      type,
      operationId:binding.operationId,
      logicalOperationIntentDigest:binding.logicalOperationIntentDigest,
      logicalWorkDigest:binding.logicalWorkDigest,
      sequence:records.length,
      previousRecordSha256:previous.recordSha256,
      resultDigest,
    });
    await appendBrokerAuthorizedRecordV1(ns.directoryHandle,record);
  }
  await append(LEDGER_EVENT_V1.PROVIDER_ADMITTED,null);
  const result={
    marker:'VOID_APOLLYON_OPENROUTER_VALIDATED_RESULT_V1',
    content:`legacy-${target.toLowerCase()}-evidence`,
    broker_admission_capability_id:req.admission_capability.capability_id,
    broker_replay_capability_id:req.replay_capability.capability_id,
    model_requested:req.contestant.model,
    model_canonical_slug:req.contestant.canonical_slug,
    legacy_execution_identity_contract:'pre-v46-routing-metadata-only',
  };
  const digest=acceptedResultDigestV1(result);
  await append(LEDGER_EVENT_V1.RESULT_WITNESSED,digest);
  await publishAcceptedResultCapsuleV1(acceptedRoot,binding,digest,result);
  if(target==='ACCEPTED')await append(LEDGER_EVENT_V1.PROVIDER_RESULT,digest);
  console.log(`VOID_PROOF_SEEDED_LEGACY_STATE phase=${target} operation=${binding.operationId} digest=${digest}`);
} finally {
  if(ns)await ns.directoryHandle.handle.close().catch(()=>{});
  await acceptedRoot.handle.close().catch(()=>{});
  await ledgerRoot.close().catch(()=>{});
}
"""


def render(template: str) -> str:
    replacements = {
        "__BINDING_URI__": (S / "apollyon_openrouter_broker_binding_v1.mjs").as_uri(),
        "__CAPABILITY_URI__": (S / "apollyon_openrouter_broker_admission_capability_v1.mjs").as_uri(),
        "__CLIENT_URI__": (S / "apollyon_openrouter_broker_client_v1.mjs").as_uri(),
        "__NAMESPACE_URI__": (S / "apollyon_execution_ledger_namespace_v1.mjs").as_uri(),
        "__PREPARE_URI__": (S / "apollyon_execution_broker_prepare_v1.mjs").as_uri(),
        "__APPEND_URI__": (S / "apollyon_execution_broker_authorized_append_v1.mjs").as_uri(),
        "__LOAD_URI__": (S / "apollyon_execution_ledger_load_v1.mjs").as_uri(),
        "__RECORD_URI__": (S / "apollyon_execution_ledger_record_v1.mjs").as_uri(),
        "__PUBLISH_URI__": (S / "apollyon_execution_ledger_publish_v1.mjs").as_uri(),
        "__CAPSULE_URI__": (S / "apollyon_accepted_result_capsule_v1.mjs").as_uri(),
    }
    for key, value in replacements.items():
        template = template.replace(key, value)
    return template


def write_request(tmp: Path, value: dict):
    (tmp / "request.mjs").write_text(
        "export const req=" + json.dumps(value, separators=(",", ":"), ensure_ascii=False) + ";\n"
    )


def sign_request(tmp: Path, creds: Path, value: dict) -> dict:
    write_request(tmp, value)
    (tmp / "signer.mjs").write_text(render(SIGNER))
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


def seed_legacy_state(tmp: Path, state: Path, request: dict, phase: str):
    write_request(tmp, request)
    (tmp / "seeder.mjs").write_text(render(SEEDER))
    cp = subprocess.run(
        ["node", str(tmp / "seeder.mjs")],
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
            "STATE_DIRECTORY": str(state),
            "VOID_PROOF_LEGACY_PHASE": phase,
            "NODE_OPTIONS": "--max-old-space-size=1024",
        },
        preexec_fn=limits,
    )
    if cp.returncode != 0 or "VOID_PROOF_SEEDED_LEGACY_STATE" not in (cp.stdout or ""):
        raise SystemExit(cp.stdout)


def spawn_server(fd: int, state: Path, creds: Path, marker: Path, mock: Path):
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


def run_client(tmp: Path, sock: Path, request: dict) -> dict:
    write_request(tmp, request)
    (tmp / "client.mjs").write_text(render(CLIENT))
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


def snapshot_state(root: Path) -> dict:
    out = {}
    for path in sorted(root.rglob("*")):
        rel = str(path.relative_to(root))
        if path.is_symlink():
            out[rel] = ["symlink", os.readlink(path)]
        elif path.is_file():
            st = path.stat()
            out[rel] = [
                "file",
                hashlib.sha256(path.read_bytes()).hexdigest(),
                st.st_mode & 0o777,
                st.st_nlink,
            ]
        elif path.is_dir():
            st = path.stat()
            out[rel] = ["dir", st.st_mode & 0o777]
    return out


def assert_evidence_hold(response: dict, label: str):
    if response.get("status") != "HOLD":
        raise SystemExit(f"HOLD {label} legacy evidence unexpectedly ACCEPTED")
    if response.get("hold_code") != "EXECUTION_IDENTITY_EVIDENCE_HOLD":
        raise SystemExit(
            f"HOLD {label} wrong migration code={response.get('hold_code')}"
        )
    if response.get("result") is not None or response.get("result_digest") is not None:
        raise SystemExit(f"HOLD {label} disclosed legacy result material")
    if not str(response.get("operation_id", "")).startswith("apollyon_op_v1:"):
        raise SystemExit(f"HOLD {label} migration response lacks bound operation id")


tmp = Path(tempfile.mkdtemp(prefix="void-broker-execution-identity-migration-ci-"))
listener = None
server = None
try:
    state = tmp / "state"
    broker_creds = tmp / "broker-creds"
    signer_creds = tmp / "signer-creds"
    for directory in [state, broker_creds, signer_creds]:
        directory.mkdir(mode=0o700)
        os.chmod(directory, 0o700)

    fake_api_key = "sk-proof-never-sent-123456789"
    (broker_creds / "openrouter_api_key").write_text(fake_api_key + "\n")
    os.chmod(broker_creds / "openrouter_api_key", 0o600)
    admission_key = bytes([0x42]) * 32
    for directory in [broker_creds, signer_creds]:
        (directory / "apollyon_openrouter_admission_mac_v1").write_bytes(admission_key)
        os.chmod(directory / "apollyon_openrouter_admission_mac_v1", 0o600)

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

    accepted_base = copy.deepcopy(base)
    accepted_signed = sign_request(tmp, signer_creds, accepted_base)

    witnessed_base = copy.deepcopy(base)
    witnessed_base["request_id"] = "voidobr1_" + ("4" * 64)
    witnessed_base["logical_operation_intent_digest"] = "3" * 64
    witnessed_signed = sign_request(tmp, signer_creds, witnessed_base)

    seed_legacy_state(tmp, state, accepted_signed, "ACCEPTED")
    seed_legacy_state(tmp, state, witnessed_signed, "RESULT_WITNESSED")
    before = snapshot_state(state)

    sock = tmp / "broker.sock"
    listener = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    listener.bind(str(sock))
    listener.listen(32)
    os.chmod(sock, 0o600)
    server = spawn_server(listener.fileno(), state, broker_creds, marker, mock)

    accepted_response = run_client(tmp, sock, accepted_signed)
    assert_evidence_hold(accepted_response, "ACCEPTED")

    witnessed_response = run_client(tmp, sock, witnessed_signed)
    assert_evidence_hold(witnessed_response, "RESULT_WITNESSED")

    forged_replay = copy.deepcopy(accepted_signed)
    forged_replay["replay_capability"]["authority_mac_sha256"] = "0" * 64
    forged_response = run_client(tmp, sock, forged_replay)
    if forged_response.get("status") != "HOLD" or forged_response.get("hold_code") != "ADMISSION_HOLD":
        raise SystemExit("HOLD forged legacy replay capability did not fail admission")
    if forged_response.get("result") is not None or forged_response.get("result_digest") is not None:
        raise SystemExit("HOLD forged legacy replay disclosed result material")

    if marker.read_text() != "":
        raise SystemExit("HOLD legacy migration touched provider network")
    after = snapshot_state(state)
    if after != before:
        raise SystemExit("HOLD legacy migration mutated preserved historical broker state")

    print(
        f"{PROOF_MARKER} "
        "legacy_accepted_green_blocked=true "
        "legacy_result_witnessed_green_blocked=true "
        "legacy_result_disclosure_zero=true "
        "legacy_provider_calls_zero=true "
        "legacy_state_preserved=true "
        "forged_legacy_replay_hold=true"
    )
finally:
    stop_server(server)
    if listener:
        try:
            listener.close()
        except Exception:
            pass
