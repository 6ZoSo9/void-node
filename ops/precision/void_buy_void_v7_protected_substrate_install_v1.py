#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, pathlib, shutil, stat, subprocess, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
LOCK_REL="ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json"
LOCK_ID="voidv7substratelock1_6014a83805170202a6117b6004b94e1daddb2dd9123c17802002e72c8002a649"
MATERIALIZER_REL="scripts/materialize_buy_void_v7_protected_substrate_v1.py"
MATERIALIZER_BLOB="62d7427577a38fbd69c8405b66951cfb46a28b37"
SOURCE_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
SOURCE_TREE="de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
SOURCE_RELEASE=pathlib.Path("/opt/void-node-live/releases/"+SOURCE_HEAD)
SOURCE_TARGET=pathlib.Path("/opt/void-buy-void-v7-reviewed-v1")
PREENTRY_TARGET=pathlib.Path("/opt/void-buy-void-v7-preentry-v1/void_buy_void_source_finality_v7_native_preentry_v1")
SELECTOR_TARGET=pathlib.Path("/opt/void-buy-void-v7-selector-v1/void_buy_void_source_finality_live_process_v2_selector_guard_v1")
LAUNCHER_REL=pathlib.Path("ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash")
LAUNCHER_SHA="f2f864fc6e4f95c2cc7b258d68ecbeb95e7c006ead3951cbca39e0b3bbe37346"
NATIVE_SHA="8ce663ff7e3713fc6bf615dd743350be9e50dff729fdb3d609b065b158397851"; NATIVE_BYTES=21600; SELECTOR_SHA="048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232"; SELECTOR_BYTES=26680
MARKER="VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V1"
CONFIRM="INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V1_CREATE_ONLY"
class E(RuntimeError): pass
def sha(p):
 h=hashlib.sha256();
 with open(p,"rb") as f:
  for b in iter(lambda:f.read(1024*1024),b""): h.update(b)
 return h.hexdigest()
def git_at(root,*args):
 p=subprocess.run(["/usr/bin/git","-c","safe.directory="+str(root),"-C",str(root),*args],stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC","GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null","GIT_CONFIG_SYSTEM":"/dev/null","GIT_NO_REPLACE_OBJECTS":"1","GIT_OPTIONAL_LOCKS":"0","GIT_TERMINAL_PROMPT":"0"},timeout=30)
 if p.returncode: raise E("git_failed:"+str(args[0]))
 return p.stdout.strip()
def source_release():
 if not SOURCE_RELEASE.is_dir() or SOURCE_RELEASE.is_symlink(): raise E("source_release_missing")
 if git_at(SOURCE_RELEASE,"rev-parse","HEAD")!=SOURCE_HEAD or git_at(SOURCE_RELEASE,"rev-parse","HEAD^{tree}")!=SOURCE_TREE: raise E("source_release_generation_mismatch")
 if git_at(SOURCE_RELEASE,"status","--porcelain=v1","--untracked-files=all")!="": raise E("source_release_dirty")
def lock():
 x=json.loads((ROOT/LOCK_REL).read_text())
 if x.get("lock_id")!=LOCK_ID: raise E("lock_id_mismatch")
 if x.get("protected_substrate_install_authorized") is not True: raise E("protected_substrate_install_not_authorized_by_lock")
 if subprocess.run(["/usr/bin/git","-C",str(ROOT),"rev-parse","HEAD:"+MATERIALIZER_REL],stdout=subprocess.PIPE,text=True).stdout.strip()!=MATERIALIZER_BLOB: raise E("materializer_blob_mismatch")
def check_candidate(path,sha256,bytes_,label):
 st=path.lstat()
 if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_size!=bytes_ or sha(path)!=sha256: raise E(label+"_candidate_invalid")
def plan(native,selector):
 source_release(); check_candidate(native,NATIVE_SHA,NATIVE_BYTES,"native"); check_candidate(selector,SELECTOR_SHA,SELECTOR_BYTES,"selector")
 print(MARKER); print("mode=plan"); print("source_target="+str(SOURCE_TARGET)); print("native_target="+str(PREENTRY_TARGET)); print("selector_target="+str(SELECTOR_TARGET)); print("create_only=true"); print("protected_substrate_install_authorized=false"); print("apply_requires_successor_lock=true")
def main():
 ap=argparse.ArgumentParser(); ap.add_argument("--plan",action="store_true"); ap.add_argument("--apply",action="store_true"); ap.add_argument("--native",type=pathlib.Path,required=True); ap.add_argument("--selector",type=pathlib.Path,required=True); ap.add_argument("--confirm",default=""); ns=ap.parse_args()
 if ns.plan==ns.apply: raise E("exactly_one_mode_required")
 if ns.plan: plan(ns.native,ns.selector); return
 if os.geteuid()!=0: raise E("root_required")
 if ns.confirm!=CONFIRM: raise E("confirmation_required")
 lock()  # current V1 lock intentionally HOLDS because install authority is false
 raise E("v1_candidate_lock_does_not_authorize_install_apply")
if __name__=="__main__":
 try: main()
 except (E,OSError,subprocess.SubprocessError) as e:
  print(MARKER); print("status=HOLD"); print("reason="+str(e)); print("protected_filesystem_mutation=false"); print("service_mutation=false"); print("credential_access=false"); print("transaction=false"); print("funds_movement=false"); raise SystemExit(2)
