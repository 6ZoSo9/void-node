#!/usr/bin/env python3
"""Publish hash-chained VOID release channel state through an exact-head PR."""
from __future__ import annotations
import argparse, json, os, re, shutil, subprocess, sys, time
from pathlib import Path

MARKER="VOID_RELEASE_PROMOTION_PR_V1"
DEFAULT_REPO=Path.home()/"dev"/"void-node"
PUBLIC_ROOT=Path("public/public-node/void-network/channels")

def log(s=""): print(s, flush=True)
def run(cmd, cwd=None, check=True, capture=False):
    log("+ "+" ".join(map(str,cmd)))
    p=subprocess.run(cmd,cwd=str(cwd) if cwd else None,text=True,
        stdout=subprocess.PIPE if capture else None,stderr=subprocess.PIPE if capture else None,check=False)
    if capture:
        if p.stdout: sys.stdout.write(p.stdout)
        if p.stderr: sys.stderr.write(p.stderr)
    if check and p.returncode: raise RuntimeError(f"command failed rc={p.returncode}: {' '.join(cmd)}")
    return p
def cap(cmd,cwd=None):
    p=subprocess.run(cmd,cwd=str(cwd) if cwd else None,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
    if p.returncode:
        sys.stderr.write(p.stdout+p.stderr); raise RuntimeError(f"command failed rc={p.returncode}: {' '.join(cmd)}")
    return p.stdout.strip()
def pr_view(repo, pr):
    return json.loads(cap(["gh","pr","view",str(pr),"--json","state,headRefOid,mergeable,mergeStateStatus,mergedAt,url"],repo))
def checks(repo, pr):
    p=subprocess.run(["gh","pr","checks",str(pr),"--json","bucket,name,state,workflow,link"],cwd=repo,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.stdout.strip(): return json.loads(p.stdout)
    if "no checks reported" in (p.stderr+p.stdout).lower(): return []
    raise RuntimeError((p.stderr or p.stdout).strip())
def job_truth(repo_slug, link):
    m=re.search(r"/job/(\d+)",link or "")
    if not m: return None
    p=subprocess.run(["gh","api",f"repos/{repo_slug}/actions/jobs/{m.group(1)}"],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode: return None
    try: return json.loads(p.stdout)
    except Exception: return None
def normalize(repo_slug, rows):
    out=[]
    for row in rows:
        r=dict(row)
        if r.get("bucket")=="pending":
            truth=job_truth(repo_slug,str(r.get("link") or ""))
            if truth and truth.get("completed_at") and truth.get("conclusion") in {"success","skipped","neutral"}:
                r["bucket"]="pass" if truth.get("conclusion")=="success" else "skipping"
                r["state"]="SUCCESS" if truth.get("conclusion")=="success" else str(truth.get("conclusion")).upper()
                r["stale_outer_status_repaired"]=True
        out.append(r)
    return out
def wait_green(repo, repo_slug, pr, head):
    register=int(os.environ.get("VOID_WALL_CHECK_REGISTRATION_TIMEOUT_SECONDS","1800"))
    watch=int(os.environ.get("VOID_WALL_CHECK_WATCH_TIMEOUT_SECONDS","7200"))
    interval=max(5,int(os.environ.get("VOID_WALL_CHECK_INTERVAL_SECONDS","20")))
    start=time.monotonic()
    while True:
        if pr_view(repo,pr)["headRefOid"]!=head: raise RuntimeError("PR head changed while waiting for checks")
        rows=checks(repo,pr)
        if rows: break
        if time.monotonic()-start>register: raise RuntimeError("timed out waiting for checks to register")
        log("checks_registered=0"); time.sleep(interval)
    start=time.monotonic()
    while True:
        if pr_view(repo,pr)["headRefOid"]!=head: raise RuntimeError("PR head changed during checks")
        rows=normalize(repo_slug,checks(repo,pr))
        pending=[x for x in rows if x.get("bucket")=="pending"]
        failed=[x for x in rows if x.get("bucket") in {"fail","cancel"}]
        log(f"checks_total={len(rows)} pending={len(pending)} failed={len(failed)}")
        for x in pending: log(f"pending_check workflow={x.get('workflow')!r} name={x.get('name')!r} state={x.get('state')!r}")
        repaired=[x for x in rows if x.get("stale_outer_status_repaired")]
        for x in repaired: log(f"stale_pending_reclassified_green workflow={x.get('workflow')!r} name={x.get('name')!r}")
        if failed: raise RuntimeError(f"GitHub checks failed: {failed}")
        if not pending:
            bad=[x for x in rows if x.get("bucket") not in {"pass","skipping","neutral"}]
            if bad: raise RuntimeError(f"non-green check buckets: {bad}")
            return
        if time.monotonic()-start>watch: raise RuntimeError("timed out waiting for checks")
        time.sleep(interval)
def sync_file(src, dst):
    if src.exists():
        dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)
    elif dst.exists():
        dst.unlink()
def copy_state(repo, state_dir):
    derived=state_dir/"derived"
    for name in ["release-history-v1.json","release-revocations-v1.json","release-freeze-v1.json","release-state-summary-v1.json"]:
        sync_file(derived/name,repo/PUBLIC_ROOT/name)
    for name in ["candidate-v1.json","stable-v1.json"]:
        sync_file(derived/"channels"/name,repo/PUBLIC_ROOT/name)
    target=repo/PUBLIC_ROOT/"receipts"
    if target.exists(): shutil.rmtree(target)
    if (derived/"receipts").exists(): shutil.copytree(derived/"receipts",target)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--repo",type=Path,default=DEFAULT_REPO)
    ap.add_argument("--state-dir",type=Path,required=True)
    ap.add_argument("--action",required=True,choices=["candidate","stable","freeze","unfreeze","revoke","rollback"])
    ap.add_argument("--confirm",required=True)
    ap.add_argument("--branch",default="")
    ap.add_argument("--merge",action="store_true")
    ap.add_argument("--validate-only",action="store_true")
    args=ap.parse_args(); repo=args.repo.expanduser().resolve(); state=args.state_dir.expanduser().resolve()
    tool=repo/"tools/void-release-promotion-v1.mjs"
    run(["node",str(tool),"verify","--state-dir",str(state)],repo)
    ledger=json.loads((state/"promotion-ledger-v1.json").read_text())
    tip=ledger["history_tip_sha256"]
    expected=f"PUBLISH VOID RELEASE CHANNEL STATE {tip}"
    if args.confirm!=expected: raise RuntimeError(f"confirmation mismatch; expected exactly: {expected}")
    if args.validate_only:
        log(f"history_tip_sha256={tip}"); log(f"{MARKER}_VALIDATE_GREEN"); return 0
    if cap(["git","status","--porcelain"],repo): raise RuntimeError("refusing to operate on a dirty checkout")
    repo_slug=cap(["gh","repo","view","--json","nameWithOwner","--jq",".nameWithOwner"],repo)
    run(["git","fetch","origin","main","--tags"],repo)
    run(["git","checkout","main"],repo); run(["git","pull","--ff-only","origin","main"],repo)
    branch=args.branch or f"release/promotion-{args.action}-{tip[:12]}"
    run(["git","checkout","-b",branch],repo)
    copy_state(repo,state)
    run(["git","diff","--check"],repo)
    run(["make","public-release-publication-promotion-v1-proof"],repo)
    run(["git","add","--all"],repo)
    if not cap(["git","diff","--cached","--stat"],repo): raise RuntimeError("promotion state produced no repository change")
    run(["git","commit","-m",f"release: publish {args.action} channel state {tip[:12]}"],repo)
    head=cap(["git","rev-parse","HEAD"],repo)
    run(["git","push","-u","origin",branch],repo)
    body=f"""## Release channel state\n\nAction: `{args.action}`\nLedger tip: `{tip}`\n\nThe state was generated from the hash-chained VOID release promotion ledger and verified before commit.\n\nNo release tag publication, live deployment, service restart, money movement, Buy VOID fulfillment, validator admission, treasury movement, or authority transfer occurs in this PR.\n\n## Proof\n\n```bash\nmake public-release-publication-promotion-v1-proof\n```\n"""
    url=cap(["gh","pr","create","--base","main","--head",branch,"--title",f"release: publish {args.action} channel state","--body",body],repo)
    pr=url.rstrip('/').split('/')[-1]
    log(f"pr_url={url}")
    if args.merge:
        wait_green(repo,repo_slug,pr,head)
        run(["gh","pr","merge",pr,"--squash","--delete-branch","--match-head-commit",head],repo)
        if pr_view(repo,pr)["state"]!="MERGED": raise RuntimeError("merge returned without MERGED state")
        run(["git","fetch","origin","main","--tags"],repo); run(["git","checkout","main"],repo); run(["git","pull","--ff-only","origin","main"],repo)
    log(f"branch={branch}"); log(f"commit={head}"); log(f"merged={str(args.merge).lower()}")
    log("release_tag_publish=false"); log("live_deployment=false"); log("service_restart=false"); log("money_movement=false")
    log(f"{MARKER}_GREEN")
    return 0
if __name__=="__main__":
    try: raise SystemExit(main())
    except (RuntimeError,OSError,ValueError,json.JSONDecodeError,subprocess.TimeoutExpired) as e:
        log(f"{MARKER}_FAIL"); log(f"error={e}"); raise SystemExit(1)
