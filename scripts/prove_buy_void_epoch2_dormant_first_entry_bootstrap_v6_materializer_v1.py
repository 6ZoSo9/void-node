#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]
MAT_REL="scripts/materialize_buy_void_epoch2_dormant_first_entry_bootstrap_v6.py"
MAT=ROOT/MAT_REL
MAT_BLOB="376c7e491544dc2a4b31e8122e43feea287dcb8d"
LOCK_REL="ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
LOCK_BLOB="f5b03c6b81016edf21f605099e0ef8976f40e107"
CANDIDATE_REL="scripts/prove_buy_void_epoch2_dormant_first_entry_bootstrap_v6_candidate_v1.py"
CANDIDATE_BLOB="b963ac9ef0b9c8ac685763b3a82375f970ef12df"
MANIFEST_REL="ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
MANIFEST_BLOB="6e0630af72111bd9976dcc38cdcdada1904dd067"

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

def publication_fixtures(module,binary:bytes,manifest:bytes)->list[dict]:
    """Actual main/writer calls; candidate bytes are inert inputs to these fixtures."""
    assert len(binary)==module.EXPECTED_BINARY_BYTES
    assert git_blob(binary)==module.EXPECTED_BINARY_GIT_BLOB
    assert hashlib.sha256(binary).hexdigest()==module.EXPECTED_BINARY_SHA256
    assert len(manifest)==module.MANIFEST_BYTES
    assert git_blob(manifest)==module.MANIFEST_BLOB
    assert hashlib.sha256(manifest).hexdigest()==module.MANIFEST_SHA256
    results=[]
    for case in (
        "normal_control",
        "parent_relocated_after_open",
        "leaf_replaced_after_fsync",
        "leaf_replaced_at_final_name_check",
    ):
        with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v6-publication-") as td:
            root=Path(td); parent=root/"parent"; parent.mkdir()
            output=parent/"bundle"; relocated=root/"relocated-parent"
            preserved=root/"preserved-bootstrap"
            parent_stat=parent.stat()
            sentinel=b"replacement directory must survive HOLD\n"
            corrupted=binary[:-1]+bytes([binary[-1]^1])

            class PublicationOS:
                def __init__(self):
                    self.live=set(); self.fired=False
                def __getattr__(self,name):
                    return getattr(os,name)
                def open(self,path,flags,*args,**kwargs):
                    fd=os.open(path,flags,*args,**kwargs)
                    self.live.add(fd)
                    if case=="parent_relocated_after_open" and kwargs.get("dir_fd") is None and Path(path)==parent and flags&os.O_DIRECTORY:
                        assert not self.fired
                        self.fired=True
                        parent.rename(relocated)
                        parent.mkdir(); output.mkdir()
                        (output/"sentinel.txt").write_bytes(sentinel)
                    return fd
                def close(self,fd):
                    os.close(fd); self.live.remove(fd)
                def replace_leaf(self):
                    assert not self.fired
                    self.fired=True
                    (output/module.BOOTSTRAP_NAME).rename(preserved)
                    (output/module.BOOTSTRAP_NAME).write_bytes(corrupted)
                    (output/module.BOOTSTRAP_NAME).chmod(0o555)
                def fsync(self,fd):
                    os.fsync(fd)
                    st=os.fstat(fd)
                    if case=="leaf_replaced_after_fsync" and (st.st_dev,st.st_ino)==(parent_stat.st_dev,parent_stat.st_ino):
                        self.replace_leaf()
                def stat(self,path,*args,**kwargs):
                    if case=="leaf_replaced_at_final_name_check" and path==module.BOOTSTRAP_NAME and kwargs.get("dir_fd") is not None:
                        self.replace_leaf()
                    return os.stat(path,*args,**kwargs)

            proxy=PublicationOS(); calls=0
            def inert_material():
                nonlocal calls
                calls+=1
                return binary,manifest
            original_os=module.os; original_derive=module.derive_material
            original_argv=sys.argv
            captured=io.StringIO(); error=None; status=None
            try:
                module.os=proxy; module.derive_material=inert_material
                sys.argv=[str(module.__file__),"--derive-dir",str(output)]
                with contextlib.redirect_stdout(captured):
                    try:
                        status=module.main()
                    except module.MaterializeError as exc:
                        error=str(exc)
            finally:
                sys.argv=original_argv
                module.derive_material=original_derive; module.os=original_os
            assert calls==1
            assert not proxy.live,"publication descriptors leaked: "+case
            lines=captured.getvalue().splitlines()
            green=module.MARKER+"_DERIVE_GREEN"
            if case=="normal_control":
                assert not proxy.fired and error is None and status==0
                assert green in lines and "output="+str(output) in lines
                for line in (
                    "output_leaf_generations_revalidated=true",
                    "output_visible_parent_generation_revalidated=true",
                    "output_requested_path_generation_revalidated=true",
                ):
                    assert line in lines,line
                sums=(module.EXPECTED_BINARY_SHA256+"  "+module.BOOTSTRAP_NAME+"\n"+
                      module.MANIFEST_SHA256+"  "+module.MANIFEST_NAME+"\n").encode("ascii")
                for name,raw,mode in ((module.BOOTSTRAP_NAME,binary,0o555),(module.MANIFEST_NAME,manifest,0o444),(module.SUMS_NAME,sums,0o444)):
                    leaf=output/name
                    assert leaf.read_bytes()==raw
                    assert stat.S_IMODE(leaf.stat().st_mode)==mode
            else:
                assert proxy.fired and status is None and error is not None
                assert green not in lines and not any(line.startswith("output=") for line in lines)
                if case=="parent_relocated_after_open":
                    assert error=="output_visible_parent_generation_changed"
                    assert (output/"sentinel.txt").read_bytes()==sentinel
                    assert sorted(p.name for p in output.iterdir())==["sentinel.txt"]
                    assert ((relocated/"bundle")/module.BOOTSTRAP_NAME).read_bytes()==binary
                else:
                    expected="output_file_changed:" if case=="leaf_replaced_after_fsync" else "output_file_generation_changed:"
                    assert error==expected+module.BOOTSTRAP_NAME,error
                    assert preserved.read_bytes()==binary
                    assert (output/module.BOOTSTRAP_NAME).read_bytes()==corrupted
                    assert (output/module.MANIFEST_NAME).read_bytes()==manifest
            results.append({"case":case,"outcome":"GREEN" if error is None else error,
                            "all_publication_fds_closed":True,"replacement_entries_preserved":True})
    return results

def print_publication_facts()->None:
    print("publication_fixture_cases=4")
    print("publication_normal_control_verified=true")
    print("publication_parent_relocation_rejected=true")
    print("publication_leaf_replacement_rejected=true")
    print("publication_final_leaf_name_check_exercised=true")
    print("publication_descriptors_closed_on_success_and_failure=true")
    print("publication_rebound_entries_preserved=true")
    print("publication_fixture_candidate_bytes_supplied_inertly=true")
    print("publication_fixture_native_execution=false")

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
    assert len(publication_fixtures(module,binary1,manifest1))==4

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
  "output_leaf_generation_revalidation_required=true",
  "output_visible_parent_generation_revalidation_required=true",
  "output_requested_path_generation_revalidation_required=true",
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
print_publication_facts()
print("artifact_publication_only=true")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement=false")
