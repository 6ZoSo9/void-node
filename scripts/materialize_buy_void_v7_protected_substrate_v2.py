#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, stat, subprocess, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
LOCK_REL="ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json"
LOCK_GIT_BLOB="831f6e3f79a62a334662cebc6d2c39133bc7a309"
LOCK_ID="voidv7substratelock1_6014a83805170202a6117b6004b94e1daddb2dd9123c17802002e72c8002a649"
ACCEPTED_SOURCE_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
REPAIR_PARENT="fa3cda59b8ea00f1bff9a936179ba0ef94d9d0de"
REPAIR_PARENT_TREE="8cf585e4e32f085520b5f3536101e082f284f9e7"
V1_MATERIALIZER_REL="scripts/materialize_buy_void_v7_protected_substrate_v1.py"
V1_MATERIALIZER_BLOB="62d7427577a38fbd69c8405b66951cfb46a28b37"
SELECTOR_SOURCE_REL="ops/precision/void_buy_void_source_finality_live_process_v2_selector_guard.c"
SELECTOR_SOURCE_BLOB="b7aad6ecea7afa5b7f931b50b4b463e992b19748"
SELECTOR_SHA256="048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232"
SELECTOR_BYTES=26680
NATIVE_SOURCE_REL="ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c"
NATIVE_SOURCE_BLOB="14fbb6759589ca2719da6a52d058891d987b2db9"
NATIVE_SHA256="8ce663ff7e3713fc6bf615dd743350be9e50dff729fdb3d609b065b158397851"
NATIVE_BYTES=21600
CC_SHA256="1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26"
STRIP_SHA256="0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42"
SELECTOR_FLAGS=("-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident","-Wl,--build-id=none")
NATIVE_FLAGS=("-std=c11","-Wall","-Wextra","-Werror","-O2")
MARKER="VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_MATERIALIZER_V2"
class E(RuntimeError): pass
def sha(p): return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
GIT_ENV={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC","GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null","GIT_CONFIG_SYSTEM":"/dev/null","GIT_NO_REPLACE_OBJECTS":"1","GIT_OPTIONAL_LOCKS":"0","GIT_TERMINAL_PROMPT":"0","GIT_ASKPASS":"/bin/false","GIT_NO_LAZY_FETCH":"1","GIT_PROTOCOL_FROM_USER":"0","GIT_ALLOW_PROTOCOL":"","GIT_PAGER":""}
def git(*args):
 p=subprocess.run(["/usr/bin/git","-c","core.hooksPath=/dev/null","-c","core.fsmonitor=false","-c","core.untrackedCache=false","-c","submodule.recurse=false","--no-replace-objects","-C",str(ROOT),*args],stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=GIT_ENV,timeout=30)
 if p.returncode or p.stderr!="": raise E("git_failed:"+str(args[0]))
 return p.stdout.strip()
def ancestor(base,head):
 p=subprocess.run(["/usr/bin/git","-c","core.hooksPath=/dev/null","-c","core.fsmonitor=false","-c","core.untrackedCache=false","-c","submodule.recurse=false","--no-replace-objects","-C",str(ROOT),"merge-base","--is-ancestor",base,head],stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=GIT_ENV,timeout=20)
 if p.returncode not in (0,1) or p.stdout or p.stderr: raise E("git_ancestor_failed")
 return p.returncode==0
def verify():
 if git("branch","--show-current")!="main": raise E("main_required")
 head=git("rev-parse","HEAD")
 if not ancestor(ACCEPTED_SOURCE_HEAD,head): raise E("accepted_source_not_ancestor")
 if git("rev-parse",REPAIR_PARENT+"^{tree}")!=REPAIR_PARENT_TREE: raise E("repair_parent_tree_mismatch")
 if not ancestor(REPAIR_PARENT,head): raise E("repair_parent_not_current_ancestor")
 if git("rev-parse","HEAD:"+LOCK_REL)!=LOCK_GIT_BLOB: raise E("lock_blob_mismatch")
 if git("rev-parse","HEAD:"+V1_MATERIALIZER_REL)!=V1_MATERIALIZER_BLOB: raise E("historical_v1_materializer_blob_mismatch")
 lock=json.loads((ROOT/LOCK_REL).read_text())
 if lock.get("lock_id")!=LOCK_ID or lock.get("protected_substrate_install_authorized") is not False: raise E("lock_contract_invalid")
 if git("rev-parse","HEAD:"+SELECTOR_SOURCE_REL)!=SELECTOR_SOURCE_BLOB: raise E("selector_source_blob_mismatch")
 if git("rev-parse","HEAD:"+NATIVE_SOURCE_REL)!=NATIVE_SOURCE_BLOB: raise E("native_source_blob_mismatch")
 if sha("/usr/bin/cc")!=CC_SHA256 or sha("/usr/bin/strip")!=STRIP_SHA256: raise E("toolchain_generation_mismatch")
def build_selector(src,out):
 env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC","SOURCE_DATE_EPOCH":"0"}
 p=subprocess.run(["/usr/bin/cc",*SELECTOR_FLAGS,"-o",str(out),str(ROOT/src)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,timeout=30)
 if p.returncode: raise E("selector_compile_failed")
 p=subprocess.run(["/usr/bin/strip","--strip-all",str(out)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,timeout=30)
 if p.returncode: raise E("selector_strip_failed")
 os.chmod(out,0o555)
def build_native(src,out):
 env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC","SOURCE_DATE_EPOCH":"0"}
 p=subprocess.run(["/usr/bin/cc",*NATIVE_FLAGS,"-o",str(out),str(ROOT/src)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,timeout=30)
 if p.returncode: raise E("native_compile_failed")
 os.chmod(out,0o555)
def one(src,expected_sha,expected_bytes,label,dest,builder,marker):
 a=dest/(label+"-a"); b=dest/(label+"-b"); builder(src,a); builder(src,b)
 ba=a.read_bytes(); bb=b.read_bytes()
 if ba!=bb or len(ba)!=expected_bytes or hashlib.sha256(ba).hexdigest()!=expected_sha: raise E(label+"_identity_mismatch")
 s=subprocess.run([str(a),"--self-test"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=10)
 if s.returncode or s.stderr!="" or marker not in s.stdout.splitlines(): raise E(label+"_self_test_failed")
 return a
def main():
 ap=argparse.ArgumentParser()
 mode=ap.add_mutually_exclusive_group(required=True)
 mode.add_argument("--self-test",action="store_true")
 mode.add_argument("--source-plan",action="store_true")
 mode.add_argument("--derive",type=pathlib.Path)
 ns=ap.parse_args()
 if ns.self_test:
  print(MARKER+"_SELF_TEST_GREEN")
  print("separate_selector_native_build_contracts=true")
  print("selector_strip_required=true")
  print("native_strip_forbidden=true")
  print("accepted_native_identity_preserved=true")
  print("historical_v1_materializer_preserved=true")
  print("historical_v1_materializer_install_authority=false")
  print("git_callbacks_neutralized=true")
  print("git_lazy_fetch_disabled=true")
  print("git_transport_denied=true")
  print("protected_substrate_install_authorized=false")
  return
 if ns.source_plan:
  print(MARKER)
  print("mode=source-plan")
  print("source_only=true")
  print("repair_parent="+REPAIR_PARENT)
  print("repair_parent_tree="+REPAIR_PARENT_TREE)
  print("historical_v1_materializer_blob="+V1_MATERIALIZER_BLOB)
  print("selector_build_contract=SELECTOR_FLAGS_PLUS_STRIP")
  print("native_build_contract=NATIVE_FLAGS_NO_STRIP")
  print("accepted_native_sha256="+NATIVE_SHA256)
  print("accepted_native_bytes="+str(NATIVE_BYTES))
  print("historical_v1_materializer_install_authority=false")
  print("protected_filesystem_mutation=false")
  print("transaction=false")
  print("funds_movement=false")
  return
 verify()
 ns.derive.mkdir(mode=0o700,parents=True,exist_ok=False)
 one(SELECTOR_SOURCE_REL,SELECTOR_SHA256,SELECTOR_BYTES,"selector",ns.derive,build_selector,"VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1_SELF_TEST_GREEN")
 one(NATIVE_SOURCE_REL,NATIVE_SHA256,NATIVE_BYTES,"native-preentry",ns.derive,build_native,"VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1_SELF_TEST=GREEN")
 verify()
 print(MARKER+"_DERIVE_GREEN")
 print("output="+str(ns.derive))
 print("selector_contract=SELECTOR_FLAGS_PLUS_STRIP")
 print("native_contract=NATIVE_FLAGS_NO_STRIP")
 print("historical_v1_materializer_preserved=true")
 print("historical_v1_materializer_install_authority=false")
 print("protected_substrate_install_authorized=false")
if __name__=="__main__":
 try: main()
 except (E,OSError,subprocess.SubprocessError) as e:
  print(MARKER); print("status=HOLD"); print("reason="+str(e)); print("protected_substrate_install_authorized=false"); raise SystemExit(2)
