#!/usr/bin/env python3
from __future__ import annotations
import argparse, fcntl, hashlib, json, os, pathlib, re, shutil, subprocess, sys, tempfile, time

MARKER="VOID_RELEASE_QUALIFICATION_PR_V1"

def run(cmd, cwd=None, capture=False, check=True):
    print("+", " ".join(cmd), flush=True)
    p=subprocess.run(cmd,cwd=cwd,text=True,stdout=subprocess.PIPE if capture else None,stderr=subprocess.PIPE if capture else None)
    if capture:
        if p.stdout: print(p.stdout,end="")
        if p.stderr: print(p.stderr,end="",file=sys.stderr)
    if check and p.returncode: raise SystemExit(f"command failed rc={p.returncode}: {' '.join(cmd)}")
    return p

def out(cmd,cwd=None):
    p=subprocess.run(cmd,cwd=cwd,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode:
        print(p.stdout,end=""); print(p.stderr,end="",file=sys.stderr); raise SystemExit(p.returncode)
    return p.stdout.strip()

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--repo",type=pathlib.Path,default=pathlib.Path.home()/"dev/void-node")
    ap.add_argument("--receipt",type=pathlib.Path,required=True)
    ap.add_argument("--approval",type=pathlib.Path,required=True)
    ap.add_argument("--confirm",required=True)
    ap.add_argument("--validate-only",action="store_true")
    ap.add_argument("--merge",action="store_true")
    a=ap.parse_args(); repo=a.repo.expanduser().resolve()
    receipt=json.loads(a.receipt.read_text()); approval=json.loads(a.approval.read_text())
    if receipt.get("marker")!="VOID_RELEASE_QUALIFICATION_RECEIPT_V1" or receipt.get("passed") is not True: raise SystemExit("invalid qualification receipt")
    if approval.get("marker")!="VOID_RELEASE_QUALIFICATION_APPROVAL_V1" or approval.get("approved") is not True: raise SystemExit("invalid qualification approval")
    digest=sha(a.receipt)
    expected=f"PUBLISH VOID RELEASE QUALIFICATION {digest}"
    if a.confirm!=expected: raise SystemExit(f"exact confirmation required: {expected}")
    run(["node","tools/void-release-qualification-v1.mjs","verify","--plan",str(a.receipt.parent/"qualification-plan-v1.json"),"--result-dir",str(a.receipt.parent/"results"),"--receipt",str(a.receipt),"--approval",str(a.approval)],cwd=repo)
    print(f"qualification_receipt_sha256={digest}")
    print("release_tag_publish=false")
    print("live_deployment=false")
    print("service_restart=false")
    print("money_movement=false")
    print("guarded_lanes_activated=false")
    if a.validate_only:
        print(f"{MARKER}_VALIDATE_GREEN"); return
    if out(["git","status","--porcelain"],cwd=repo): raise SystemExit("dirty checkout")
    run(["git","fetch","origin","main"],cwd=repo); run(["git","checkout","main"],cwd=repo); run(["git","pull","--ff-only","origin","main"],cwd=repo)
    tag=receipt["release_tag"].replace("/","-")
    branch=f"release/qualification-{tag}-{digest[:12]}"
    run(["git","checkout","-b",branch],cwd=repo)
    target=repo/"public/public-node/void-network/qualification/releases"/tag
    target.mkdir(parents=True,exist_ok=True)
    shutil.copy2(a.receipt,target/"qualification-receipt-v1.json")
    shutil.copy2(a.approval,target/"qualification-approval-v1.json")
    with tempfile.TemporaryDirectory() as td:
        run(["node","tools/void-release-qualification-v1.mjs","render","--receipt",str(a.receipt),"--approval",str(a.approval),"--out-dir",td],cwd=repo)
        shutil.copy2(pathlib.Path(td)/"release-qualification-v1.json",target/"index.json")
        shutil.copy2(pathlib.Path(td)/"release-qualification-v1.html",target/"index.html")
    run(["git","add","--all"],cwd=repo); run(["git","diff","--cached","--check"],cwd=repo)
    run(["git","commit","-m",f"release: publish qualification for {receipt['release_tag']}"],cwd=repo)
    head=out(["git","rev-parse","HEAD"],cwd=repo); run(["git","push","-u","origin",branch],cwd=repo)
    url=out(["gh","pr","create","--base","main","--head",branch,"--title",f"release: publish qualification for {receipt['release_tag']}","--body",f"Qualification receipt: `{digest}`\n\nNo release tag, deployment, service restart, or money movement."],cwd=repo)
    print(f"pr_url={url}")
    if a.merge:
        run(["gh","pr","checks",url,"--watch","--fail-fast","--interval","20"],cwd=repo)
        run(["gh","pr","merge",url,"--squash","--delete-branch","--match-head-commit",head],cwd=repo)
    print(f"{MARKER}_GREEN")

if __name__=="__main__": main()
