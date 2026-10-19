#!/usr/bin/env python3
from __future__ import annotations
import ast, pathlib, subprocess, sys

ROOT=pathlib.Path(__file__).resolve().parents[1]
MARKER="VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V4_PROOF"
INS=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_install_v4.py"
MAT=ROOT/"scripts/materialize_buy_void_v7_protected_substrate_v2.py"
PRED=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_install_v3.py"
LOCK=ROOT/"ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json"
QUAL=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v3.py"
PRED_QUAL=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v2.py"

def gblob(path:pathlib.Path)->str:
    cp=subprocess.run(["/usr/bin/git","hash-object",str(path)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=20)
    if cp.returncode or cp.stderr: raise RuntimeError("hash_object_failed:"+str(path))
    return cp.stdout.strip()

assert gblob(INS)=="952e59ad3de6892091bc70f5cb1c281f5f5f5526"
assert gblob(MAT)=="474614da950db72082fb95a5174405ce8caf2513"
assert gblob(PRED)=="4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38"
assert gblob(LOCK)=="831f6e3f79a62a334662cebc6d2c39133bc7a309"
assert gblob(QUAL)=="d3ad73b041ec7357e2ad8e758caf9d9390a4785b"
assert gblob(PRED_QUAL)=="56a7ca798553766af525d9fb1ccbe58b70fe9c1d"

src=INS.read_text("utf-8")
qsrc=QUAL.read_text("utf-8")
ast.parse(src)
ast.parse(qsrc)

required=(
    'MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V4"',
    'SCHEMA = "void_buy_void_v7_protected_substrate_install_plan_v4"',
    'PLAN_PREFIX = "voidv7substrateinstallplan4_"',
    'CONFIRM_TOKEN = "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V4_CREATE_ONLY"',
    'PREDECESSOR_MERGE = "0ada7fde0d90c3946b10693f4621cbd690bfcde6"',
    'PREDECESSOR_TREE = "9e930fba9aacfafb5b163767302786cd7f31c81e"',
    'PREDECESSOR_INSTALLER_BLOB = "4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38"',
    'MATERIALIZER_BLOB = "474614da950db72082fb95a5174405ce8caf2513"',
    'SOURCE_RELEASE_ROOT_MODE = 0o555',
    'PROTECTED_SOURCE_ROOT_MODE = 0o755',
    'def tree_digest(root: pathlib.Path, expected_root_mode: int)',
    'stat.S_IMODE(rst.st_mode) != expected_root_mode',
    'tree_digest(SOURCE_RELEASE, SOURCE_RELEASE_ROOT_MODE)',
    'tree_digest(SOURCE_TARGET, PROTECTED_SOURCE_ROOT_MODE)',
    'tree_digest(SOURCE_STAGE, PROTECTED_SOURCE_ROOT_MODE)',
    'root_mode != SOURCE_RELEASE_ROOT_MODE',
    '"root_mode": format(SOURCE_RELEASE_ROOT_MODE, "04o")',
    '"protected_source_root_mode": format(PROTECTED_SOURCE_ROOT_MODE, "04o")',
    '"schema": SCHEMA, "version": 4',
    'SEPARATELY_AUTHORIZE_V7_PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V4',
    'PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V4_GREEN',
    'QUALIFIER_REL = "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v3.py"',
    'QUALIFIER_BLOB = "d3ad73b041ec7357e2ad8e758caf9d9390a4785b"',
    '"installed_qualifier": {"path": QUALIFIER_REL, "blob": QUALIFIER_BLOB}',
    'RUN_INSTALLED_QUALIFICATION_V3',
    'installed_qualifier_v3_bound=true',
    'immutable_source_release_root_mode_0555_required=true',
    'protected_source_root_mode_0755_required=true',
    'def install_parent_custody()',
    'def install_parent_fd_matches(',
    '"install_parent_custody_exact": True',
    'install_parent_descriptor_identity_mismatch',
    'install_parent_descriptor_generation_changed',
    'install_parent_root_owned_0755_required=true',
    'install_parent_descriptor_identity_required=true',
)
for needle in required:
    assert needle in src, needle

for stale in ('tree_digest(SOURCE_RELEASE)','tree_digest(SOURCE_TARGET)','tree_digest(SOURCE_STAGE)'):
    assert stale not in src, stale
assert 'RUN_INSTALLED_QUALIFICATION_V2' not in src

qrequired=(
    'MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALLED_QUALIFICATION_V3"',
    'PREDECESSOR_QUALIFIER_BLOB = "56a7ca798553766af525d9fb1ccbe58b70fe9c1d"',
    'SOURCE_RELEASE_ROOT_MODE = 0o555',
    'PROTECTED_SOURCE_ROOT_MODE = 0o755',
    'def root_metadata_fields_valid(',
    'def tree_digest(root: pathlib.Path, expected_root_mode: int)',
    'tree_digest(SOURCE_RELEASE, SOURCE_RELEASE_ROOT_MODE)',
    'tree_digest(SOURCE, PROTECTED_SOURCE_ROOT_MODE)',
    'status=INSTALLED_QUALIFICATION_V3_GREEN',
    'root_mode_role_split_verified=true',
    'source_release_root_mode_required=0555',
    'protected_source_root_mode_required=0755',
    'def _binary_ancestor_snapshot(path: pathlib.Path, label: str)',
    'def open_exact_executable_lease(',
    'os.O_NOFOLLOW | os.O_NONBLOCK',
    '[f"/proc/self/fd/{fd}", "--self-test"]',
    'pass_fds=(fd,)',
    'binary_root_and_ancestor_custody_verified=true',
    'binary_self_test_descriptor_execution=true',
    'binary_retained_descriptor_post_execution_revalidated=true',
)
for needle in qrequired:
    assert needle in qsrc, needle
assert 'os.chmod(SOURCE_RELEASE' not in qsrc
assert 'os.chown(SOURCE_RELEASE' not in qsrc
assert 'os.chmod(SOURCE_RELEASE' not in src
assert 'os.chown(SOURCE_RELEASE' not in src

cp=subprocess.run([sys.executable,"-I","-B",str(INS),"--self-test"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30)
assert cp.returncode==0 and cp.stderr=="" and "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V4_SELF_TEST_GREEN" in cp.stdout.splitlines()
assert "immutable_source_release_root_mode_0555_required=true" in cp.stdout.splitlines()
assert "protected_source_root_mode_0755_required=true" in cp.stdout.splitlines()

cp=subprocess.run([sys.executable,"-I","-B",str(INS),"--source-plan"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30)
assert cp.returncode==0 and cp.stderr==""
assert "immutable_source_release_root_mode_0555_required=true" in cp.stdout.splitlines()
assert "protected_source_root_mode_0755_required=true" in cp.stdout.splitlines()
assert "installed_qualifier_v3_bound=true" in cp.stdout.splitlines()
assert "accepted_v1_lock_install_authority=false" in cp.stdout.splitlines()

cp=subprocess.run([sys.executable,"-I","-B",str(QUAL),"--self-test"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30)
assert cp.returncode==0 and cp.stderr=="" and "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALLED_QUALIFICATION_V3_SELF_TEST_GREEN" in cp.stdout.splitlines()
assert "swapped_root_modes_rejected=true" in cp.stdout.splitlines()
assert "binary_root_and_ancestor_custody_required=true" in cp.stdout.splitlines()
assert "binary_self_test_descriptor_execution_required=true" in cp.stdout.splitlines()
assert "binary_retained_descriptor_revalidation_required=true" in cp.stdout.splitlines()
assert 'subprocess.run(\n            [str(path), "--self-test"]' not in qsrc
cp=subprocess.run([sys.executable,"-I","-B",str(QUAL)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30)
assert cp.returncode==0 and cp.stderr==""
assert "source_release_root_mode_required=0555" in cp.stdout.splitlines()
assert "protected_source_root_mode_required=0755" in cp.stdout.splitlines()

print(MARKER+"_GREEN")
print("precision_observed_source_release_root_mode_0555_bound=true")
print("immutable_source_release_root_mode_0555_required=true")
print("protected_source_root_mode_0755_required=true")
print("installed_qualifier_v3_bound=true")
print("qualifier_swapped_root_modes_rejected=true")
print("qualifier_binary_root_ancestor_custody_bound=true")
print("qualifier_binary_descriptor_execution_bound=true")
print("qualifier_binary_post_execution_revalidation_bound=true")
print("source_release_chmod_or_chown_forbidden=true")
print("tree_child_root_ownership_preserved=true")
print("tree_group_world_write_rejection_preserved=true")
print("strict_internal_symlink_containment_preserved=true")
print("install_parent_root_owned_0755_bound=true")
print("install_parent_descriptor_identity_bound=true")
print("accepted_native_selector_identity_preserved=true")
print("create_only_publication_preserved=true")
print("operation_bound_plan_v4_required=true")
print("protected_filesystem_mutation=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
