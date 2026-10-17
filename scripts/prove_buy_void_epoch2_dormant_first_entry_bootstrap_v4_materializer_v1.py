#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
MAT_REL="scripts/materialize_buy_void_epoch2_dormant_first_entry_bootstrap_v4.py"
MAT=ROOT/MAT_REL
MAT_BLOB="20207ae5738bf41667c8c59a5d8181d2d5070750"
LOCK_REL="ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v4-candidate-lock-v1.json"
LOCK_BLOB="471a52641135ee3ce31d521980e6ea37af18ce58"
CANDIDATE_REL="scripts/prove_buy_void_epoch2_dormant_first_entry_bootstrap_v4_candidate_v1.py"
CANDIDATE_BLOB="a14a7f56b1fb4ee14213fe9094adad14b45aae2f"
MANIFEST_REL="ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v1.conf"
MANIFEST_BLOB="a484a7d2e1159ebbef3357ec849af92d7f12cff1"

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

assert git_blob(MAT.read_bytes())==MAT_BLOB
assert git_blob((ROOT/LOCK_REL).read_bytes())==LOCK_BLOB
assert git_blob((ROOT/CANDIDATE_REL).read_bytes())==CANDIDATE_BLOB
assert git_blob((ROOT/MANIFEST_REL).read_bytes())==MANIFEST_BLOB

spec=importlib.util.spec_from_file_location("void_bootstrap_v4_materializer",MAT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()

with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v4-materializer-proof-") as td:
    root=Path(td)
    one=root/"one"; two=root/"two"
    binary1,manifest1=module.derive_material()
    binary2,manifest2=module.derive_material()
    assert binary1==binary2
    assert manifest1==manifest2
    assert len(binary1)==839416
    assert hashlib.sha256(binary1).hexdigest()=="a4605ab39da0a37afe8ef7f6084b93f542a57dcbe8c3c9433c47481cb21c7ce3"
    assert len(manifest1)==2380
    assert hashlib.sha256(manifest1).hexdigest()=="435345cd442c4d59760984c3445d178461cbbf163a0a53e760a392ca2d0bae77"
    module.write_dir(one,binary1,manifest1)
    module.write_dir(two,binary2,manifest2)
    for name in (module.BOOTSTRAP_NAME,module.MANIFEST_NAME,module.SUMS_NAME):
        assert (one/name).read_bytes()==(two/name).read_bytes()
    try:
        module.write_dir(one,binary1,manifest1)
    except module.MaterializeError as exc:
        assert str(exc)=="output_directory_exists"
    else:
        raise AssertionError("create-only materializer replay accepted")

cp=subprocess.run(
  ["/usr/bin/python3","-I","-B",str(MAT),"--self-test"],
  cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
  text=True,check=False,timeout=30,
)
assert cp.returncode==0,cp.stderr
for line in (
  "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V4_MATERIALIZER_V1_SELF_TEST_GREEN",
  "accepted_bootstrap_v4_lock_bound=true",
  "candidate_tool_verified_before_execution=true",
  "source_generation_manifest_bound=true",
  "candidate_binary_identity_accepted=true",
  "artifact_publication_only=true",
  "protected_install_authorized=false",
  "live_execution_authorized=false",
  "funds_movement=false",
):
    assert line in cp.stdout.splitlines(),line

print("VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V4_MATERIALIZER_V1_PROOF_GREEN")
print("materializer_blob_bound=true")
print("accepted_bootstrap_v4_lock_bound=true")
print("candidate_tool_blob_bound=true")
print("source_generation_manifest_bound=true")
print("two_materializations_byte_identical=true")
print("accepted_binary_bytes=839416")
print("accepted_binary_sha256=a4605ab39da0a37afe8ef7f6084b93f542a57dcbe8c3c9433c47481cb21c7ce3")
print("manifest_bytes=2380")
print("manifest_sha256=435345cd442c4d59760984c3445d178461cbbf163a0a53e760a392ca2d0bae77")
print("create_only_output_replay_rejected=true")
print("artifact_publication_only=true")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement=false")
