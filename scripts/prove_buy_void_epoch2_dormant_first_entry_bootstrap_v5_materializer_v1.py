#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
MAT_REL="scripts/materialize_buy_void_epoch2_dormant_first_entry_bootstrap_v5.py"
MAT=ROOT/MAT_REL
MAT_BLOB="b35e06ef8124a037d142366229f55473d765878b"
LOCK_REL="ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v5-candidate-lock-v1.json"
LOCK_BLOB="46f8512395936f5fc81423ce31a5c9b88928a21f"
CANDIDATE_REL="scripts/prove_buy_void_epoch2_dormant_first_entry_bootstrap_v5_candidate_v1.py"
CANDIDATE_BLOB="2b17ad5aebd44caf8162b88ea9b9d7e25161c75e"
MANIFEST_REL="ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf"
MANIFEST_BLOB="782f747cda24a214c64e8ec3f49b6791bbb62f97"

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

assert git_blob(MAT.read_bytes())==MAT_BLOB
assert git_blob((ROOT/LOCK_REL).read_bytes())==LOCK_BLOB
assert git_blob((ROOT/CANDIDATE_REL).read_bytes())==CANDIDATE_BLOB
assert git_blob((ROOT/MANIFEST_REL).read_bytes())==MANIFEST_BLOB

spec=importlib.util.spec_from_file_location("void_bootstrap_v5_materializer",MAT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()

with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v5-materializer-proof-") as td:
    root=Path(td)
    one=root/"one"; two=root/"two"
    binary1,manifest1=module.derive_material()
    binary2,manifest2=module.derive_material()
    assert binary1==binary2
    assert manifest1==manifest2
    assert len(binary1)==874600
    assert hashlib.sha256(binary1).hexdigest()=="4392f1aa3e35edf4e347fd81c15c9b1ba0810c71111f4e96dafcbf2e1cb52374"
    assert len(manifest1)==2382
    assert hashlib.sha256(manifest1).hexdigest()=="3ab7f9b6e23c6fd2fe82486fd2a396c3bd207e335675e6c5bfe58776ab99d6ff"
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
  "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V5_MATERIALIZER_V1_SELF_TEST_GREEN",
  "accepted_bootstrap_v5_lock_bound=true",
  "candidate_tool_verified_before_execution=true",
  "source_generation_manifest_bound=true",
  "candidate_binary_identity_accepted=true",
  "artifact_publication_only=true",
  "protected_install_authorized=false",
  "live_execution_authorized=false",
  "funds_movement=false",
):
    assert line in cp.stdout.splitlines(),line

print("VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V5_MATERIALIZER_V1_PROOF_GREEN")
print("materializer_blob_bound=true")
print("accepted_bootstrap_v5_lock_bound=true")
print("candidate_tool_blob_bound=true")
print("source_generation_manifest_bound=true")
print("two_materializations_byte_identical=true")
print("accepted_binary_bytes=874600")
print("accepted_binary_sha256=4392f1aa3e35edf4e347fd81c15c9b1ba0810c71111f4e96dafcbf2e1cb52374")
print("manifest_bytes=2382")
print("manifest_sha256=3ab7f9b6e23c6fd2fe82486fd2a396c3bd207e335675e6c5bfe58776ab99d6ff")
print("create_only_output_replay_rejected=true")
print("artifact_publication_only=true")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement=false")
