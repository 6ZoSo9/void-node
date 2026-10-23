#!/usr/bin/env python3
import hashlib, pathlib, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGET=ROOT/"ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py"
MARKER="VOID_BUY_VOID_V7_V5_SOURCE_STAGE_INSTALL_V1_PROOF"
raw=TARGET.read_bytes()
compile(raw,str(TARGET),"exec",dont_inherit=True,optimize=0)
text=raw.decode("utf-8")
required=(
 'VOID_V7_V5_SOURCE_STAGE_INSTALL_V1',
 'SOURCE_HEAD = "3dc143bb16d7c1d1d5e0f674881cf12621818661"',
 'SOURCE_TREE = "21e7fae2d3dfeb6a918c11799ae6644c6ca70a64"',
 '"b9d8ad7aec19592b104d47da4a496710d4fde8db"',
 'REACHABLE_COMMITS = 18390',
 'CANDIDATE = pathlib.Path("/home/zoso/Downloads/void-v7-v5-full-history-candidate")',
 'TARGET_NAME = ".void-buy-void-v7-reviewed-v1.stage-v5"',
 'STAGE_NAME = ".void-buy-void-v7-reviewed-v1.stage-v5.build-v1"',
 'CONFIRM_TOKEN = "INSTALL_VOID_V7_V5_SOURCE_STAGE_V1_CREATE_ONLY"',
 'BUILDER_BLOB = "bb78c7d9f468baa20b580d052d934d9b97c05134"',
 'V4_BLOB = "1ce5de6d4ffa0a89ead32ca734d43f0da72fed59"',
 'candidate_copy_descriptor_relative=true',
 'runtime_uid_child_capability_clear_required=true',
 'candidate_copy_iterative_depth_bound_required=true',
 'RENAME_NOREPLACE = 1',
 'fixed_v4_source_revalidation_required=true',
 'fixed_v4_source_mutation=false',
 'fixed_source_exchange_authority=false',
)
for token in required:
    assert token in text, token
for forbidden in (
 '4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb',
 'de12c9d2d5e475d435d21da3b047d7b63b69e2b7',
 'void-v7-full-history-candidate-6011fc',
 'LIVE_RELEASE',
 'live_shallow_release',
 'len(SOURCE_PARENTS) != 2',
):
    assert forbidden not in text, forbidden
assert 'if len(SOURCE_PARENTS) != 1:' in text
assert '_verify_full_history_root(TARGET, 0, 0, 0o755)' in text
assert '_verify_full_history_root(STAGE, 0, 0, 0o755)' in text
assert 'os.fchmod(fd, 0o755)' in text
cp=subprocess.run([sys.executable,"-I","-B",str(TARGET),"--self-test"],
 stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=60,check=False)
assert cp.returncode==0 and cp.stderr=="",cp.stdout+cp.stderr
assert "VOID_V7_V5_SOURCE_STAGE_INSTALL_V1_SELF_TEST_GREEN" in cp.stdout.splitlines()
sp=subprocess.run([sys.executable,"-I","-B",str(TARGET),"--source-plan"],
 stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=60,check=False)
assert sp.returncode==0 and sp.stderr=="",sp.stdout+sp.stderr
for line in (
 "source_only=true","host_read=false","host_write=false","create_only=true",
 "fixed_v4_source_mutation=false","service_mutation=false","funds_movement=false"
):
    assert line in sp.stdout.splitlines(),line
print(MARKER+"_GREEN")
print("installer_sha256="+hashlib.sha256(raw).hexdigest())
print("predecessor_algorithm_family_bound=true")
print("v5_exact_generation_bound=true")
print("single_parent_bound=true")
print("hidden_source_stage_target_bound=true")
print("final_stage_root_mode_0755_bound=true")
print("fixed_v4_source_revalidation_bound=true")
print("fixed_source_exchange_authority=false")
print("service_mutation=false")
print("funds_movement=false")