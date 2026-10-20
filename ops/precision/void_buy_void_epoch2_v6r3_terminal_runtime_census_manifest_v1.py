#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile

MARKER="VOID_BUY_VOID_EPOCH2_V6R3_TERMINAL_RUNTIME_CENSUS_MANIFEST_V1"
VERSION=1
CONTRACT_ID="voidbuye2v6r3pyruntimecontract1_cdb98f511f04a3c798200e304481ec14d94373fdbdf6ec30cf88b0e281b0eb4f"
FRESHNESS_GATE_ID="voidbuye2v6r3pyclosurefreshness1_66f0fc4c608ab2874e75620e0e4037c9a672369fbd460b12a35a0b0600398a66"
CONTRACT_BLOB="c70dfd9da29c75b348a3619f6df7329381e939cf"
FRESHNESS_GATE_BLOB="9657fff243e44135e1f992b1ef5b8e0d977b8b65"
MAX_TREE_ENTRIES=100_000
MAX_REGULAR_FILE_BYTES=512*1024*1024
MAX_REPORT_BYTES=16*1024*1024
HOST_EXECUTION_ENABLED=False

class Hold(RuntimeError):
    pass

def canonical(value:object)->bytes:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode("ascii")

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def _meta(st:os.stat_result)->dict[str,int]:
    return {
        "mode":stat.S_IMODE(st.st_mode),
        "uid":st.st_uid,
        "gid":st.st_gid,
        "nlink":st.st_nlink,
        "size":st.st_size,
        "dev":st.st_dev,
        "ino":st.st_ino,
        "mtime_ns":st.st_mtime_ns,
        "ctime_ns":st.st_ctime_ns,
    }

def _same_generation(a:os.stat_result,b:os.stat_result)->bool:
    fields=("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns")
    return all(getattr(a,k)==getattr(b,k) for k in fields)

def stable_regular(path:Path)->dict[str,object]:
    before=path.lstat()
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode)
        or before.st_nlink!=1
        or before.st_size<0 or before.st_size>MAX_REGULAR_FILE_BYTES
    ):
        raise Hold("regular_metadata_invalid:"+os.fspath(path))
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        opened=os.fstat(fd)
        if not _same_generation(before,opened):
            raise Hold("regular_generation_rebound:"+os.fspath(path))
        digest=hashlib.sha256();remaining=opened.st_size
        while remaining:
            chunk=os.read(fd,min(1024*1024,remaining))
            if not chunk:
                raise Hold("regular_short_read:"+os.fspath(path))
            digest.update(chunk);remaining-=len(chunk)
        if os.read(fd,1)!=b"":
            raise Hold("regular_grew:"+os.fspath(path))
        after=os.fstat(fd);visible=path.lstat()
        if not _same_generation(opened,after) or not _same_generation(after,visible):
            raise Hold("regular_generation_changed:"+os.fspath(path))
        return {"kind":"regular",**_meta(opened),"sha256":digest.hexdigest()}
    finally:
        os.close(fd)

def directory_record(path:Path)->dict[str,object]:
    st=path.lstat()
    if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
        raise Hold("directory_metadata_invalid:"+os.fspath(path))
    return {"kind":"directory",**_meta(st)}

def symlink_record(path:Path,display_path:str,real_root:Path,display_root:str)->dict[str,object]:
    before=path.lstat()
    if not stat.S_ISLNK(before.st_mode):
        raise Hold("symlink_metadata_invalid:"+os.fspath(path))
    text=os.readlink(path)
    after=path.lstat()
    if not _same_generation(before,after):
        raise Hold("symlink_generation_changed:"+os.fspath(path))
    resolved=Path(os.path.realpath(path))
    record={"kind":"symlink",**_meta(before),"target_text":text}
    try:
        resolved.relative_to(real_root)
        in_root=True
    except ValueError:
        in_root=False
    record["resolved_within_inventory_root"]=in_root
    if in_root:
        rel=resolved.relative_to(real_root).as_posix()
        record["resolved_display_path"]=display_root if rel=="." else display_root.rstrip("/")+"/"+rel
        try:
            rst=resolved.lstat()
        except FileNotFoundError:
            record["resolved_exists"]=False
        else:
            record["resolved_exists"]=True
            record["resolved_kind"]=(
                "regular" if stat.S_ISREG(rst.st_mode) else
                "directory" if stat.S_ISDIR(rst.st_mode) else
                "symlink" if stat.S_ISLNK(rst.st_mode) else "special"
            )
            if stat.S_ISREG(rst.st_mode):
                record["resolved_sha256"]=stable_regular(resolved)["sha256"]
    else:
        record["resolved_display_path"]=None
        record["resolved_exists"]=resolved.exists()
    return record

def _display(display_root:str,rel:Path)->str:
    if not display_root.startswith("/") or display_root=="/":
        raise Hold("display_root_invalid")
    if rel.as_posix()==".":
        return display_root
    return display_root.rstrip("/")+"/"+rel.as_posix()

def collect_tree(real_root:Path,display_root:str)->dict[str,dict[str,object]]:
    real_root=Path(os.path.abspath(os.fspath(real_root)))
    if real_root.is_symlink():
        raise Hold("inventory_root_symlink")
    if not real_root.is_dir():
        raise Hold("inventory_root_not_directory")
    objects:dict[str,dict[str,object]]={}
    stack=[real_root]
    while stack:
        current=stack.pop()
        rel=current.relative_to(real_root)
        display=_display(display_root,rel)
        if display in objects:
            raise Hold("duplicate_inventory_path")
        objects[display]=directory_record(current)
        if len(objects)>MAX_TREE_ENTRIES:
            raise Hold("tree_entry_bound_exceeded")
        try:
            entries=sorted(os.scandir(current),key=lambda e:e.name,reverse=True)
        except OSError as exc:
            raise Hold("directory_scan_failed:"+display) from exc
        for entry in entries:
            path=Path(entry.path)
            rel=path.relative_to(real_root)
            display=_display(display_root,rel)
            st=path.lstat()
            if stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode):
                stack.append(path)
                continue
            if display in objects:
                raise Hold("duplicate_inventory_path")
            if stat.S_ISREG(st.st_mode):
                objects[display]=stable_regular(path)
            elif stat.S_ISLNK(st.st_mode):
                objects[display]=symlink_record(path,display,real_root,display_root)
            else:
                raise Hold("special_file_forbidden:"+display)
            if len(objects)>MAX_TREE_ENTRIES:
                raise Hold("tree_entry_bound_exceeded")
    return dict(sorted(objects.items()))

def absence_record(real_root:Path,display_root:str,display_path:str)->dict[str,object]:
    prefix=display_root.rstrip("/")+"/"
    if not display_path.startswith(prefix):
        raise Hold("absence_outside_display_root")
    rel=display_path[len(prefix):]
    if not rel or rel.startswith("/") or ".." in Path(rel).parts:
        raise Hold("absence_path_invalid")
    target=real_root/rel
    if target.exists() or target.is_symlink():
        raise Hold("declared_absence_materialized:"+display_path)
    parent=target.parent
    while parent!=real_root and not parent.exists():
        parent=parent.parent
    if not parent.exists():
        raise Hold("absence_parent_missing:"+display_path)
    parent_rel=parent.relative_to(real_root)
    return {
        "exists":False,
        "nearest_existing_parent":_display(display_root,parent_rel),
        "parent":directory_record(parent),
    }

def build_manifest(
    real_root:Path,display_root:str,sys_path:list[str],declared_absent:list[str],
    accessed_paths:list[str],
)->dict[str,object]:
    if not sys_path or any(not p.startswith("/") or p=="" for p in sys_path):
        raise Hold("sys_path_invalid")
    if "" in sys_path or "." in sys_path:
        raise Hold("sys_path_cwd_forbidden")
    objects=collect_tree(real_root,display_root)
    absences={p:absence_record(real_root,display_root,p) for p in sorted(set(declared_absent))}
    if not set(accessed_paths).issubset(objects):
        raise Hold("unaccepted_runtime_file_access")
    manifest={
        "schema":"void_buy_void_epoch2_v6r3_terminal_runtime_manifest_v1",
        "contract_id":CONTRACT_ID,
        "freshness_gate_id":FRESHNESS_GATE_ID,
        "sys_path":list(sys_path),
        "objects":objects,
        "absent":absences,
        "accessed_paths":sorted(set(accessed_paths)),
        "post_exec_dumpability_verified":False,
        "post_exec_dumpability_accepted":False,
    }
    raw=canonical(manifest)
    if len(raw)>MAX_REPORT_BYTES:
        raise Hold("manifest_report_bound_exceeded")
    return manifest

def require_terminal_equal(accepted:dict,observed:dict)->None:
    if accepted!=observed:
        raise Hold("terminal_manifest_changed")
    if observed.get("post_exec_dumpability_verified") is not False:
        raise Hold("post_exec_dumpability_overclaim")
    if observed.get("post_exec_dumpability_accepted") is not False:
        raise Hold("post_exec_dumpability_overclaim")

def fixture_self_test()->None:
    with tempfile.TemporaryDirectory(prefix="void-e2-v6r3-census-manifest-v1-") as td:
        root=Path(td)/"root";root.mkdir()
        py=root/"python";py.mkdir()
        dyn=py/"lib-dynload";dyn.mkdir()
        (py/"hashlib.py").write_bytes(b"x=1\n")
        (dyn/"_hashlib.so").write_bytes(b"ELF-fixture")
        (py/"alias.py").symlink_to("hashlib.py")
        sys_path=["/fixture/python","/fixture/python/lib-dynload"]
        absent=["/fixture/etc/ld.so.preload"]
        etc=root/"etc";etc.mkdir()
        manifest=build_manifest(
            root,"/fixture",sys_path,absent,
            ["/fixture/python/hashlib.py","/fixture/python/lib-dynload/_hashlib.so"],
        )
        require_terminal_equal(manifest,json.loads(canonical(manifest)))
        assert manifest["objects"]["/fixture/python/hashlib.py"]["sha256"]==sha256(b"x=1\n")
        assert manifest["objects"]["/fixture/python/alias.py"]["target_text"]=="hashlib.py"
        assert manifest["absent"]["/fixture/etc/ld.so.preload"]["exists"] is False

        changed=json.loads(canonical(manifest))
        changed["objects"]["/fixture/python/hashlib.py"]["sha256"]="0"*64
        try: require_terminal_equal(manifest,changed)
        except Hold as exc: assert str(exc)=="terminal_manifest_changed"
        else: raise AssertionError("content_drift_accepted")

        changed=json.loads(canonical(manifest))
        changed["post_exec_dumpability_verified"]=True
        try: require_terminal_equal(manifest,changed)
        except Hold: pass
        else: raise AssertionError("dumpability_overclaim_accepted")

        fifo=root/"python"/"bad-special"
        os.mkfifo(fifo)
        try: collect_tree(root,"/fixture")
        except Hold as exc: assert "special_file_forbidden" in str(exc)
        else: raise AssertionError("special_file_accepted")
        fifo.unlink()

        (root/"etc"/"ld.so.preload").write_text("hostile",encoding="utf-8")
        try: absence_record(root,"/fixture","/fixture/etc/ld.so.preload")
        except Hold as exc: assert "declared_absence_materialized" in str(exc)
        else: raise AssertionError("materialized_absence_accepted")

    print(MARKER+"_SELF_TEST_GREEN")
    print("bounded_no_follow_regular_hashing=true")
    print("complete_directory_regular_symlink_inventory=true")
    print("declared_absence_parent_identity_bound=true")
    print("special_files_rejected=true")
    print("terminal_manifest_drift_rejected=true")
    print("post_exec_dumpability_overclaim_rejected=true")
    print("host_execution_enabled=false")
    print("host_census_authorized=false")
    print("host_plan_authorized=false")
    print("funds_movement=false")

def source_plan()->None:
    print(MARKER)
    print("mode=source-plan")
    print("contract_id="+CONTRACT_ID)
    print("freshness_gate_id="+FRESHNESS_GATE_ID)
    print("contract_blob="+CONTRACT_BLOB)
    print("freshness_gate_blob="+FRESHNESS_GATE_BLOB)
    print("host_execution_enabled=false")
    print("host_census_authorized=false")
    print("protected_install_authorized=false")
    print("post_exec_dumpability_accepted=false")
    print("host_plan_authorized=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")
    print("next_gate=source_authenticated_host_observer_adapter")

def main()->int:
    parser=argparse.ArgumentParser()
    modes=parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--self-test",action="store_true")
    modes.add_argument("--source-plan",action="store_true")
    args=parser.parse_args()
    if HOST_EXECUTION_ENABLED:
        raise SystemExit("HOLD=host_execution_must_remain_disabled_in_source_candidate")
    if args.self_test:
        fixture_self_test()
    else:
        source_plan()
    return 0

if __name__=="__main__":
    raise SystemExit(main())
