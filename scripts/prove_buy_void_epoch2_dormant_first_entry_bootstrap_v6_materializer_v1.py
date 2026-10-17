#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
MAT_REL="scripts/materialize_buy_void_epoch2_dormant_first_entry_bootstrap_v6.py"
MAT=ROOT/MAT_REL
MAT_BLOB="3a937c756a91ad2565897f1ae5d881f9fa2f41c6"
LOCK_REL="ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
LOCK_BLOB="f5b03c6b81016edf21f605099e0ef8976f40e107"
CANDIDATE_REL="scripts/prove_buy_void_epoch2_dormant_first_entry_bootstrap_v6_candidate_v1.py"
CANDIDATE_BLOB="b963ac9ef0b9c8ac685763b3a82375f970ef12df"
MANIFEST_REL="ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
MANIFEST_BLOB="6e0630af72111bd9976dcc38cdcdada1904dd067"

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

with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v6-materializer-proof-") as td:
    root=Path(td)
    one=root/"one"; two=root/"two"
    binary1,manifest1=module.derive_material()
    binary2,manifest2=module.derive_material()
    assert binary1==binary2
    assert manifest1==manifest2
    assert len(binary1)==874608
    assert hashlib.sha256(binary1).hexdigest()=="c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
    assert git_blob(binary1)=="a91707c3e5803071fc73c3451c9bcb3b774f8b48"
    assert len(manifest1)==2382
    assert hashlib.sha256(manifest1).hexdigest()=="aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"
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
  "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MATERIALIZER_V1_SELF_TEST_GREEN",
  "accepted_bootstrap_v6_lock_bound=true",
  "candidate_tool_verified_before_execution=true",
  "source_generation_manifest_bound=true",
  "inner_installer_generation_bound=true",
  "candidate_binary_identity_accepted=true",
  "descriptor_independent_candidate_bound=true",
  "accepted_binary_git_blob_bound=true",
  "artifact_publication_only=true",
  "protected_install_authorized=false",
  "live_execution_authorized=false",
  "funds_movement=false",
):
    assert line in cp.stdout.splitlines(),line

print("VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MATERIALIZER_V1_PROOF_GREEN")
print("materializer_blob_bound=true")
print("accepted_bootstrap_v6_lock_bound=true")
print("candidate_tool_blob_bound=true")
print("source_generation_manifest_bound=true")
print("inner_installer_generation_bound=true")
print("two_materializations_byte_identical=true")
print("descriptor_independent_candidate_bound=true")
print("accepted_binary_git_blob_sha1=a91707c3e5803071fc73c3451c9bcb3b774f8b48")
print("accepted_binary_bytes=874608")
print("accepted_binary_sha256=c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b")
print("manifest_bytes=2382")
print("manifest_sha256=aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662")
print("create_only_output_replay_rejected=true")
print("artifact_publication_only=true")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement=false")
