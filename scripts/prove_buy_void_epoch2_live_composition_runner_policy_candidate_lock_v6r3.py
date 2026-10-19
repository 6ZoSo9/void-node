#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "ops/security/buy-void-epoch2-live-composition-runner-policy-candidate-lock-v6r3.json"
CANDIDATE = ROOT / "scripts/prove_buy_void_epoch2_live_composition_runner_policy_candidate_v6r3.py"
CANDIDATE_BLOB = "56b63f083ca4f6dabc163dbe055f4389124275d0"
CANDIDATE_WORKFLOW = ROOT / ".github/workflows/buy-void-epoch2-live-composition-runner-policy-candidate-v6r3.yml"
CANDIDATE_WORKFLOW_BLOB = "439d270427c2bac9cffe1ea1877ab92dbf622673"
RUNNER = ROOT / "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"
RUNNER_BLOB = "46da5a2df6ccace675ae6f572b11ba011b41efc8"
V6R2_LOCK = ROOT / "ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json"
V6R2_LOCK_BLOB = "bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b"

MARKER = "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_CANDIDATE_LOCK_V6R3"
LOCK_PREFIX = "voidbuye2runnerpollock6r3_"
LOCK_ID = "voidbuye2runnerpollock6r3_4d55eadc456d48aed2e77df8a4897c0756b173761e7a10b0f1b53b24dd4d50a2"
CANDIDATE_ID = "voidbuye2runnerpolcand6r3_eee91de4d93ea4ab3068621659a8420255772b49f25556f3d93cbd67d3059c0a"
RUNNER_SHA256 = "fda5cddcf632a1f21e474574fdd890751e66db5f488451747b1a62aff65e17ba"
RUNNER_BYTES = 50243
NATIVE_SHA256 = "85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
NATIVE_BYTES = 726976
RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
SOURCE_HEAD = "0ada7fde0d90c3946b10693f4621cbd690bfcde6"
SOURCE_TREE = "9e930fba9aacfafb5b163767302786cd7f31c81e"

def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()

def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("ascii")

def exact_file(path: Path, maximum: int) -> bytes:
    before = path.lstat()
    assert stat.S_ISREG(before.st_mode)
    assert not stat.S_ISLNK(before.st_mode)
    assert before.st_nlink == 1
    assert 0 < before.st_size <= maximum
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        assert opened.st_dev == before.st_dev and opened.st_ino == before.st_ino
        chunks=[]
        remaining=opened.st_size
        while remaining:
            chunk=os.read(fd,min(64*1024,remaining))
            assert chunk
            chunks.append(chunk)
            remaining-=len(chunk)
        assert os.read(fd,1)==b""
        after=os.fstat(fd)
        visible=path.lstat()
        for field in ("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns"):
            assert getattr(opened,field)==getattr(after,field)
            assert getattr(after,field)==getattr(visible,field)
        return b"".join(chunks)
    finally:
        os.close(fd)

for path, expected, maximum in (
    (CANDIDATE, CANDIDATE_BLOB, 2*1024*1024),
    (CANDIDATE_WORKFLOW, CANDIDATE_WORKFLOW_BLOB, 256*1024),
    (RUNNER, RUNNER_BLOB, 4*1024*1024),
    (V6R2_LOCK, V6R2_LOCK_BLOB, 128*1024),
):
    raw=exact_file(path,maximum)
    assert git_blob(raw)==expected,(path,git_blob(raw),expected)

lock=json.loads(exact_file(LOCK,256*1024))
assert lock["schema"]=="void_buy_void_epoch2_live_composition_runner_policy_candidate_lock_v6r3"
assert lock["marker"]==MARKER
assert lock["version"]==1
assert lock["repository"]=="6ZoSo9/void-node"
assert lock["candidate_head"]=="33dcb727396ddd3281b3dee5fde398e86c9c7c48"
assert lock["candidate_hosted_evidence"]=={
    "workflow":"Buy VOID Epoch-2 live-composition runner policy candidate V6R3",
    "run_id":39270541453,
    "job_id":118121335657,
    "conclusion":"success",
}
report=lock["candidate_report"]
assert report["candidate_id"]==CANDIDATE_ID
assert report["candidate_script_git_blob_sha1"]==CANDIDATE_BLOB
assert report["candidate_workflow_git_blob_sha1"]==CANDIDATE_WORKFLOW_BLOB
assert report["runner_source_git_blob_sha1"]==RUNNER_BLOB
assert report["runner_sha256"]==RUNNER_SHA256
assert report["runner_bytes"]==RUNNER_BYTES
assert report["runtime_head"]==RUNTIME_HEAD
assert report["source_head"]==SOURCE_HEAD
assert report["source_tree"]==SOURCE_TREE
assert report["source_runtime_add_only_compatibility_exact"] is True
assert report["source_runtime_added_path_count"]==15
assert report["native_v6r2_lock_git_blob_sha1"]==V6R2_LOCK_BLOB
assert report["native_binary_sha256"]==NATIVE_SHA256
assert report["native_binary_bytes"]==NATIVE_BYTES
assert report["native_binary_identity_reused"] is True
assert report["native_binary_rebuild_required"] is False
assert report["policy_runtime_expected_head"]==RUNTIME_HEAD
assert report["policy_node_identity_derived_on_protected_host"] is True
assert report["source_head_must_not_replace_policy_runtime_head"] is True
assert report["self_test_green"] is True
assert report["derive_verify_green"] is True

for key in (
    "candidate_accepted","runner_identity_accepted",
    "native_reuse_identity_accepted","policy_template_accepted",
):
    assert lock[key] is True,key
assert lock["native_binary_rebuild_required"] is False
for key in (
    "protected_install_authorized","live_execution_authorized",
    "credential_access_authorized","private_key_access_authorized",
    "signing_authorized","transaction_authorized","rpc_call_authorized",
    "payment_acceptance_authorized","public_presale_activation_authorized",
    "wc_void_market_activation_authorized","treasury_liquidity_action_authorized",
    "funds_movement_authorized","production_host_evidence_authority",
):
    assert lock[key] is False,key
assert lock["next_gate"]=="void_buy_void_epoch2_live_composition_runner_policy_upgrade_v6r3_plan"

material=dict(lock)
observed_id=material.pop("lock_id")
expected_id=LOCK_PREFIX+sha256(canonical(material))
assert observed_id==LOCK_ID==expected_id,(observed_id,expected_id)

with tempfile.TemporaryDirectory(prefix="void-e2-v6r3-lock-proof-") as td:
    out=Path(td)/"candidate.json"
    env={"PATH":os.environ.get("PATH","/usr/bin:/bin"),"HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"}
    for argv in (
        [sys.executable,"-I","-B",str(CANDIDATE),"--self-test"],
        [sys.executable,"-I","-B",str(CANDIDATE),"--derive",str(out)],
        [sys.executable,"-I","-B",str(CANDIDATE),"--verify",str(out)],
    ):
        cp=subprocess.run(argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding="utf-8",errors="strict",env=env,cwd=str(ROOT),timeout=60,check=False)
        assert cp.returncode==0,(argv,cp.stdout,cp.stderr)
        assert cp.stderr=="",(argv,cp.stderr)
    derived=json.loads(out.read_bytes())
    assert derived["candidate_id"]==CANDIDATE_ID
    assert derived["runner"]["sha256"]==RUNNER_SHA256
    assert derived["runner"]["bytes"]==RUNNER_BYTES
    assert derived["native_reuse"]["native_binary_sha256"]==NATIVE_SHA256
    assert derived["native_reuse"]["native_binary_bytes"]==NATIVE_BYTES

print(MARKER+"_PROOF_GREEN")
print("lock_id="+LOCK_ID)
print("candidate_id="+CANDIDATE_ID)
print("candidate_hosted_run_bound=true")
print("candidate_hosted_job_bound=true")
print("candidate_script_blob_bound=true")
print("candidate_workflow_blob_bound=true")
print("runner_v4_identity_accepted=true")
print("v6r2_native_identity_reused=true")
print("policy_template_accepted=true")
print("native_binary_rebuild_required=false")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("funds_movement_authorized=false")
