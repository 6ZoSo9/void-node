#!/usr/bin/env python3
from __future__ import annotations
import hashlib, os, re, shutil, stat, subprocess, tempfile, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_REL = "ops/precision/void_buy_void_v7_create_only_closed_tree_bootstrap_v1.c"
SOURCE = ROOT / SOURCE_REL
SOURCE_BLOB = "2a8397c85d698d168f2257ec801557281b73c04d"
PLAN_REL = "ops/security/buy-void-v7-create-only-persistent-seal-plan-v1.json"
PLAN_BLOB = "9dde5523dca6ab240626430ce1c2b82f1cfe7f20"
PLAN_ID = "voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc"
MARKER = "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_BOOTSTRAP_V1"

class E(RuntimeError): pass

def run(args, *, env=None, check=True, timeout=120):
    cp=subprocess.run(args,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,timeout=timeout)
    if check and cp.returncode != 0:
        raise E(f"command_failed:{args[0]}:{cp.returncode}:{cp.stderr.decode('utf-8','replace')[:500]}")
    return cp

def git_blob(path: Path)->str:
    raw=path.read_bytes(); return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

def sha(raw: bytes)->str: return hashlib.sha256(raw).hexdigest()

def require(cond, reason):
    if not cond: raise E(reason)

def discover(names):
    for n in names:
        p=shutil.which(n)
        if p:return p
    raise E("tool_missing:"+",".join(names))

def manifest_bytes(payload: Path)->bytes:
    rows=[]
    for p in sorted(payload.rglob("*"), key=lambda x:x.relative_to(payload).as_posix()):
        rel=p.relative_to(payload).as_posix()
        if p.is_symlink(): raise E("fixture_symlink_forbidden")
        if p.is_dir(): rows.append(("D","0555",rel,0,"-"))
        elif p.is_file():
            raw=p.read_bytes(); mode="0555" if os.access(p,os.X_OK) else "0444"
            rows.append(("F",mode,rel,len(raw),sha(raw)))
        else: raise E("fixture_kind_invalid")
    generation=sha(b"\n".join((r[2].encode()+b"\0"+(r[4].encode())) for r in rows))
    text="schema=VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_MANIFEST_V1\n"
    text+=f"generation={generation}\nentry_count={len(rows)}\n"
    for k,m,p,n,h in rows:text+=f"entry={k}|{m}|{p}|{n}|{h}\n"
    return text.encode("ascii")

def fixture_source(base: Path, *, large=False):
    src=base/"src"; payload=src/"payload"; (payload/"bin").mkdir(parents=True)
    tool=(b"tool-v1\n"*(1024*1024 if large else 1)); (payload/"bin"/"tool").write_bytes(tool); os.chmod(payload/"bin"/"tool",0o755)
    (payload/"policy.conf").write_bytes(b"policy=v1\n")
    (src/"manifest-v1.conf").write_bytes(manifest_bytes(payload))
    return src

def main():
    source=SOURCE.read_bytes(); text=source.decode("ascii")
    require(git_blob(SOURCE)==SOURCE_BLOB,"source_blob_mismatch")
    require(git_blob(ROOT/PLAN_REL)==PLAN_BLOB,"plan_blob_mismatch")
    require(PLAN_ID in text and PLAN_BLOB in text and "PLAN_REQUIREMENTS 70U" in text,"plan_contract_not_bound")
    for required in (
        "single_threaded_write_phase_required=true",
        "async_destination_io_forbidden=true",
        "destination_io_quiescence_before_publication_required=true",
        "production_payload_manifest_lock_not_bound",
        "O_WRONLY|O_CREAT|O_EXCL|O_CLOEXEC|O_NOFOLLOW",
        "SYS_renameat2",
        "RENAME_NOREPLACE",
        "writable_destination_fd_retained",
        "shared_writable_mapping_present",
        "source_mutation_changed_copy",
        "receipt_self_hash_cycle_absent=true",
    ): require(required in text,"source_contract_missing:"+required)
    require(not re.search(r"\b(?:pthread_create|fork|vfork|posix_spawn|aio_write|lio_listio)\s*\(",text),"forbidden_production_callsite")
    require("syscall(__NR_fork)" in text and "__NR_io_uring_enter" in text and "__NR_io_submit" in text,"barrier_syscalls_not_bound")
    require(text.count("mmap(NULL,4096,PROT_READ|PROT_WRITE,MAP_SHARED|MAP_ANONYMOUS") == 1,"shared_mmap_only_self_test")
    fixture_body=text[text.index("static int fixture_apply("):text.index("static void barrier_self_test(")]
    require(fixture_body.index("install_write_barrier();") < fixture_body.index("open(parent_path,O_RDONLY|O_DIRECTORY|O_CLOEXEC|O_NOFOLLOW)"),"write_barrier_after_destination_parent_authority")

    cc=discover(("cc","gcc","clang")); readelf=discover(("readelf",))
    with tempfile.TemporaryDirectory(prefix="void-v7-closed-tree-proof-") as td:
        t=Path(td); normal=t/"bootstrap"; test=t/"bootstrap-test"
        common=[cc,"-static","-O2","-std=c11","-Wall","-Wextra","-Werror","-Wno-misleading-indentation",str(SOURCE)]
        run(common+["-o",str(normal)],timeout=180)
        run(common+["-DVOID_V7_CLOSED_TREE_TEST_HOOKS","-o",str(test)],timeout=180)
        ph=run([readelf,"-lW",str(normal)]).stdout; dyn=run([readelf,"-dW",str(normal)]).stdout
        require(b" INTERP " not in ph and b"NEEDED" not in dyn,"bootstrap_not_static")

        st=run([str(normal),"--self-test"]); require(MARKER.encode()+b"_SELF_TEST_GREEN" in st.stdout,"self_test_missing")
        sp=run([str(normal),"--source-plan"]); require(b"production_apply_enabled=false" in sp.stdout and b"root_execution=false" in sp.stdout,"source_plan_authority_invalid")
        blocked=run([str(normal),"--apply"],check=False); require(blocked.returncode==2 and b"production_payload_manifest_lock_not_bound" in blocked.stdout+blocked.stderr,"production_apply_not_blocked")
        barrier=run([str(normal),"--barrier-self-test"]); require(MARKER.encode()+b"_BARRIER_SELF_TEST_GREEN" in barrier.stdout,"barrier_self_test_missing")
        for marker in (b"fork_denied=true",b"io_uring_denied=true",b"shared_writable_mmap_denied=true"):
            require(marker in barrier.stdout,"barrier_marker_missing:"+marker.decode())

        malformed=t/"malformed"; msrc=fixture_source(malformed); mparent=malformed/"parent"; mparent.mkdir()
        mp=msrc/"manifest-v1.conf"; raw=mp.read_bytes(); mp.write_bytes(raw.replace(b"\nentry_count=",b"\n\nentry_count=",1))
        rejected=run([str(test),"--fixture-apply",str(msrc),str(mparent),"final","stage"],check=False)
        require(rejected.returncode==2 and b"manifest_noncanonical" in rejected.stdout+rejected.stderr and not (mparent/"final").exists(),"blank_line_manifest_not_rejected")

        case=t/"success"; src=fixture_source(case); parent=case/"parent"; parent.mkdir()
        good=run([str(test),"--fixture-apply",str(src),str(parent),"final","stage"])
        require(MARKER.encode()+b"_FIXTURE_GREEN" in good.stdout,"fixture_success_missing")
        final=parent/"final"; require(final.is_dir() and not (parent/"stage").exists(),"fixture_publication_shape_invalid")
        require(stat.S_IMODE(final.stat().st_mode)==0o555,"final_root_mode_invalid")
        require((final/"install-receipt-v1.conf").is_file(),"receipt_missing")
        again=run([str(test),"--fixture-apply",str(src),str(parent),"final","stage"])
        require(MARKER.encode()+b"_FIXTURE_ALREADY_GREEN" in again.stdout,"idempotent_exact_final_not_accepted")

        os.chmod(final,0o755); (final/"unexpected-extra").write_bytes(b"extra\n"); os.chmod(final/"unexpected-extra",0o444); os.chmod(final,0o555)
        extra=run([str(test),"--fixture-apply",str(src),str(parent),"final","stage"],check=False)
        require(extra.returncode==2 and b"unexpected_tree_entry" in extra.stdout+extra.stderr and not (parent/"stage").exists(),"unexpected_final_entry_not_rejected")
        os.chmod(final,0o755); (final/"unexpected-extra").unlink(); os.chmod(final,0o555)

        os.chmod(final/"policy.conf",0o644); (final/"policy.conf").write_bytes(b"tamper\n"); os.chmod(final/"policy.conf",0o444)
        bad=run([str(test),"--fixture-apply",str(src),str(parent),"final","stage"],check=False)
        require(bad.returncode==2 and not (parent/"stage").exists(),"mismatched_final_not_held")

        race=t/"race"; rsrc=fixture_source(race,large=True); rparent=race/"parent"; rparent.mkdir()
        marker=race/"pin-marker"
        env=dict(os.environ); env["VOID_V7_TEST_DELAY_AFTER_SOURCE_PIN_MS"]="500"; env["VOID_V7_TEST_PIN_MARKER"]=str(marker)
        proc=subprocess.Popen([str(test),"--fixture-apply",str(rsrc),str(rparent),"final","stage"],stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env)
        deadline=time.time()+10
        while not marker.exists() and time.time()<deadline:
            time.sleep(.01)
        require(marker.exists(),"source_pin_marker_missing")
        (rsrc/"payload"/"bin"/"tool").write_bytes(b"evil\n")
        out,err=proc.communicate(timeout=120)
        reason=out+err
        require(proc.returncode==2 and any(token in reason for token in (b"source_mutation_changed_copy",b"source_changed_during_copy",b"source_grew_during_copy")) and not (rparent/"final").exists(),"source_race_not_rejected")

        crash=t/"crash"; csrc=fixture_source(crash); cparent=crash/"parent"; cparent.mkdir()
        env2=dict(os.environ); env2["VOID_V7_TEST_EXIT_AFTER_RENAME"]="1"
        first=run([str(test),"--fixture-apply",str(csrc),str(cparent),"final","stage"],env=env2,check=False)
        require(first.returncode==73 and (cparent/"final").is_dir(),"crash_after_publish_fixture_invalid")
        recovered=run([str(test),"--fixture-apply",str(csrc),str(cparent),"final","stage"])
        require(MARKER.encode()+b"_FIXTURE_ALREADY_GREEN" in recovered.stdout,"crash_recovery_not_green")

        pre=t/"stage"; psrc=fixture_source(pre); pparent=pre/"parent"; pparent.mkdir(); (pparent/"stage").mkdir()
        held=run([str(test),"--fixture-apply",str(psrc),str(pparent),"final","stage"],check=False)
        require(held.returncode==2 and b"stage_preexisting" in held.stdout+held.stderr and not (pparent/"final").exists(),"preexisting_stage_not_held")

    print(MARKER+"_SOURCE_PROOF_GREEN")
    print("source_blob="+SOURCE_BLOB)
    print("static_bootstrap=true")
    print("plan_contract_70_requirements_bound=true")
    print("manifest_blank_lines_rejected=true")
    print("single_thread_and_process_creation_barrier_proven=true")
    print("write_barrier_precedes_destination_parent_authority=true")
    print("async_destination_io_syscalls_denied=true")
    print("shared_writable_destination_mapping_creation_denied=true")
    print("source_mutation_after_pin_rejected_before_publication=true")
    print("fresh_inode_atomic_noreplace_fixture_green=true")
    print("exact_idempotent_final_fixture_green=true")
    print("unexpected_final_entries_rejected=true")
    print("mismatched_existing_final_holds_without_repair=true")
    print("crash_after_publish_revalidation_fixture_green=true")
    print("production_payload_manifest_lock_bound=false")
    print("production_apply_enabled=false")
    print("root_execution=false")
    print("protected_filesystem_mutation=false")
    print("new_launcher_generation_authorized=false")
    print("protected_v5_apply=false")
    print("funds_movement=false")

if __name__=="__main__":
    try: main()
    except (E,OSError,ValueError,subprocess.SubprocessError) as exc:
        print(MARKER+"_SOURCE_PROOF_HOLD reason="+str(exc),file=os.sys.stderr);raise SystemExit(2)
