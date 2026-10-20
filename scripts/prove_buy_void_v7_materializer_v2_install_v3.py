#!/usr/bin/env python3
from __future__ import annotations
import ast, pathlib, subprocess, sys

ROOT=pathlib.Path(__file__).resolve().parents[1]
MARKER="VOID_BUY_VOID_V7_MATERIALIZER_V2_INSTALL_V3_PROOF"
MAT=ROOT/"scripts/materialize_buy_void_v7_protected_substrate_v2.py"
INS=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_install_v3.py"
V1=ROOT/"scripts/materialize_buy_void_v7_protected_substrate_v1.py"
LOCK=ROOT/"ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json"
PRED=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_install_v2.py"
QUAL=ROOT/"ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v2.py"

def gblob(path:pathlib.Path)->str:
 cp=subprocess.run(["/usr/bin/git","hash-object",str(path)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=20)
 if cp.returncode or cp.stderr: raise RuntimeError("hash_object_failed:"+str(path))
 return cp.stdout.strip()

assert gblob(MAT)=="474614da950db72082fb95a5174405ce8caf2513"
assert gblob(INS)=="4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38"
assert gblob(V1)=="62d7427577a38fbd69c8405b66951cfb46a28b37"
assert gblob(LOCK)=="831f6e3f79a62a334662cebc6d2c39133bc7a309"
assert gblob(PRED)=="aae2d1a011053ea0665bf07972d9670cca73f6da"
assert gblob(QUAL)=="56a7ca798553766af525d9fb1ccbe58b70fe9c1d"

ms=MAT.read_text("utf-8"); isrc=INS.read_text("utf-8")
ast.parse(ms); ast.parse(isrc)
assert 'NATIVE_FLAGS=("-std=c11","-Wall","-Wextra","-Werror","-O2")' in ms
nb=ms[ms.index("def build_native"):ms.index("def one(")]
assert "strip" not in nb
assert '["/usr/bin/strip","--strip-all"' in ms
assert '"GIT_NO_LAZY_FETCH":"1"' in ms
assert '"GIT_ALLOW_PROTOCOL":""' in ms
assert '"core.fsmonitor=false"' in ms
assert "verify()\n print(MARKER+\"_DERIVE_GREEN\")" in ms
for needle in (
 'MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V3"',
 'PLAN_PREFIX = "voidv7substrateinstallplan3_"',
 'CONFIRM_TOKEN = "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V3_CREATE_ONLY"',
 'ACCEPTANCE_MERGE = "fa3cda59b8ea00f1bff9a936179ba0ef94d9d0de"',
 'ACCEPTANCE_TREE = "8cf585e4e32f085520b5f3536101e082f284f9e7"',
 'MATERIALIZER_REL = "scripts/materialize_buy_void_v7_protected_substrate_v2.py"',
 'MATERIALIZER_BLOB = "474614da950db72082fb95a5174405ce8caf2513"',
 'PREDECESSOR_INSTALLER_BLOB = "aae2d1a011053ea0665bf07972d9670cca73f6da"',
 '"schema": SCHEMA, "version": 3',
 '"accepted_v2_installer_merge": ACCEPTANCE_MERGE',
 'SEPARATELY_AUTHORIZE_V7_PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V3',
 'PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V3_GREEN',
):
 assert needle in isrc, needle

for path,marker in (
 (MAT,"VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_MATERIALIZER_V2_SELF_TEST_GREEN"),
 (INS,"VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V3_SELF_TEST_GREEN"),
):
 cp=subprocess.run([sys.executable,"-I","-B",str(path),"--self-test"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30)
 assert cp.returncode==0 and cp.stderr=="" and marker in cp.stdout.splitlines(), (path,cp.stderr,cp.stdout)

cp=subprocess.run([sys.executable,"-I","-B",str(INS),"--source-plan"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30)
assert cp.returncode==0 and cp.stderr==""
assert "accepted_v1_lock_install_authority=false" in cp.stdout.splitlines()

print(MARKER+"_GREEN")
print("historical_v1_materializer_preserved=true")
print("v1_materializer_native_contract_bug_not_reused=true")
print("materializer_v2_separate_build_contracts=true")
print("selector_strip_required=true")
print("native_strip_forbidden=true")
print("accepted_native_identity_preserved=true")
print("materializer_git_callbacks_neutralized=true")
print("materializer_postbuild_repository_revalidation=true")
print("installer_v3_plan_body_version=3")
print("installer_v3_binds_materializer_v2=true")
print("installer_v3_binds_predecessor_v2=true")
print("accepted_v1_lock_install_authority=false")
print("protected_filesystem_mutation=false")
print("transaction=false")
print("funds_movement=false")
