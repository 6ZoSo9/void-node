#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import deque
import hashlib
import json
import os
import posixpath
from pathlib import Path
import stat
import tempfile

MARKER="VOID_BUY_VOID_EPOCH2_V6R3_TERMINAL_RUNTIME_CENSUS_MANIFEST_V2"
VERSION=2
CONTRACT_ID="voidbuye2v6r3pyruntimecontract2_6fe0f7e5779d998659ffb67d64832e9ce5babac92584c88f43c1400cef3e4e50"
FRESHNESS_GATE_ID="voidbuye2v6r3pyclosurefreshness2_5840ca9aaecbbef2b50783fe05d364161e66b19a79c793b71dd80d18d243c54b"
CONTRACT_BLOB="c56361ecaccb916a79591c016200b8dc02f5ca54"
FRESHNESS_GATE_BLOB="864c04c578d0abdb6e8c01d3f9dd7eda6ceff2ac"
MAX_TREE_ENTRIES=100_000
MAX_REGULAR_FILE_BYTES=512*1024*1024
MAX_REPORT_BYTES=16*1024*1024
MAX_INPUT_PATH_BYTES=4096
# V1 source generation is a reviewed lineage input, not live V2 authority.
SOURCE_V1_BLOB="05458587b5743da09ed2f752e971ca67938cceac"
GIT_AWARE_FRESHNESS_REQUIRED=True
FIRST_ENTRY_LOCK_ID="voidbuye2v6r3planfirstentrybinlock2_b5e1bbca28ed7aad579ac7f37a7575ed90eadd44f73d24edac79df3cc74664c1"
FIRST_ENTRY_LOCK_BLOB="14a3ff2eca0583d1355dc8b75bd54cc55115d946"
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

def _contained_resolve(
    path:Path,real_root:Path,display_path:str,
    *,missing_component_out:list[Path]|None=None,
)->Path:
    """Resolve each symlink hop inside the inventory root, never just the end.

    A final realpath/relative_to check falsely accepts root/link ->
    outside/bridge -> root/file. This function does not open external paths,
    caps link expansion, and refuses upward traversal above real_root.
    Future *protected-host* use additionally needs independent FD/ACL custody.
    """
    try:
        relative=path.relative_to(real_root)
    except ValueError as exc:
        raise Hold("symlink_source_outside_inventory_root:"+display_path) from exc
    pending=deque(relative.parts)
    current=real_root
    hops=0
    missing_component:Path|None=None
    while pending:
        part=pending.popleft()
        if part in ("","."):
            continue
        if part=="..":
            # On Linux, a missing segment cannot be erased by a later "..":
            # nonexistent/../real remains ENOENT, not the real leaf.
            if missing_component is not None:
                raise Hold("symlink_missing_component_parent_reentry:"+display_path)
            if current==real_root:
                raise Hold("symlink_target_outside_inventory_root:"+display_path)
            current=current.parent
            continue
        next_path=current/part
        if missing_component is not None:
            current=next_path
            continue
        try:
            st=next_path.lstat()
        except FileNotFoundError:
            missing_component=next_path
            if missing_component_out is not None:
                missing_component_out.append(next_path)
            current=next_path
            continue
        if stat.S_ISLNK(st.st_mode):
            hops+=1
            if hops>40:
                raise Hold("symlink_resolution_hop_limit:"+display_path)
            target_text=os.readlink(next_path)
            if not _same_generation(st,next_path.lstat()):
                raise Hold("symlink_chain_generation_changed:"+display_path)
            target=Path(target_text)
            if target.is_absolute():
                # Keep '..' parts unnormalized so escape-then-return loses
                # authority at the first out-of-root component.
                if target.parts[:len(real_root.parts)]!=real_root.parts:
                    raise Hold("symlink_target_outside_inventory_root:"+display_path)
                pending=deque(target.parts[len(real_root.parts):]+tuple(pending))
                current=real_root
            else:
                pending=deque(target.parts+tuple(pending))
        else:
            if pending and not stat.S_ISDIR(st.st_mode):
                raise Hold("symlink_intermediate_not_directory:"+display_path)
            current=next_path
    return current


def symlink_record(path:Path,display_path:str,real_root:Path,display_root:str)->dict[str,object]:
    before=path.lstat()
    if not stat.S_ISLNK(before.st_mode):
        raise Hold("symlink_metadata_invalid:"+os.fspath(path))
    text=os.readlink(path)
    after=path.lstat()
    if not _same_generation(before,after):
        raise Hold("symlink_generation_changed:"+os.fspath(path))
    missing_components:list[Path]=[]
    resolved=_contained_resolve(
        path,real_root,display_path,
        missing_component_out=missing_components,
    )
    missing_component=missing_components[0] if missing_components else None
    record={"kind":"symlink",**_meta(before),"target_text":text}
    try:
        resolved.relative_to(real_root)
        in_root=True
    except ValueError:
        in_root=False
    record["resolved_within_inventory_root"]=in_root
    if not in_root:
        raise Hold("symlink_target_outside_inventory_root:"+display_path)
    rel=resolved.relative_to(real_root).as_posix()
    record["resolved_display_path"]=_display(display_root,Path(rel))
    if missing_component is not None:
        # The first absent path is authoritative for this resolution:
        # never check a lexically folded final path and misreport it present.
        # An unexpectedly materialized missing segment invalidates the
        # entire observation instead of converting a dangling link to GREEN.
        try:
            missing_component.lstat()
        except FileNotFoundError:
            record["resolved_exists"]=False
        except OSError as exc:
            raise Hold("symlink_missing_component_observation_failed:"+display_path) from exc
        else:
            raise Hold("symlink_missing_component_materialized:"+display_path)
    else:
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
            if record["resolved_kind"]=="special":
                raise Hold("symlink_resolved_special_file_forbidden:"+display_path)
            if stat.S_ISREG(rst.st_mode):
                record["resolved_sha256"]=stable_regular(resolved)["sha256"]
    terminal=path.lstat()
    if not _same_generation(before,terminal):
        raise Hold("symlink_generation_changed_after_resolution:"+display_path)
    if missing_component is not None:
        try:
            missing_component.lstat()
        except FileNotFoundError:
            pass
        except OSError as exc:
            raise Hold("symlink_missing_component_terminal_failed:"+display_path) from exc
        else:
            raise Hold("symlink_missing_component_materialized:"+display_path)
    return record

def require_display_root(display_root:str)->int:
    # One logical root prefixes every inventory key. Validate it before any
    # directory traversal or repeated key allocation.
    if (type(display_root) is not str or not display_root
        or len(display_root)>MAX_INPUT_PATH_BYTES
        or "\x00" in display_root or not display_root.startswith("/")
        or display_root=="/" or display_root.startswith("//")
        or posixpath.normpath(display_root)!=display_root):
        if type(display_root) is str and len(display_root)>MAX_INPUT_PATH_BYTES:
            raise Hold("display_root_length_exceeded")
        raise Hold("display_root_not_canonical")
    try:
        n=len(display_root.encode("utf-8","strict"))
    except UnicodeError as exc:
        raise Hold("display_root_encoding_invalid") from exc
    if n>MAX_INPUT_PATH_BYTES:
        raise Hold("display_root_length_exceeded")
    return n


def _display(display_root:str,rel:Path)->str:
    if not display_root.startswith("/") or display_root=="/":
        raise Hold("display_root_invalid")
    name=(display_root if rel.as_posix()=="." else
          display_root.rstrip("/")+"/"+rel.as_posix())
    try:
        encoded_bytes=len(name.encode("utf-8","strict"))
    except UnicodeError as exc:
        raise Hold("manifest_display_path_encoding_invalid") from exc
    if encoded_bytes>MAX_INPUT_PATH_BYTES:
        raise Hold("manifest_display_path_length_exceeded")
    return name

def collect_tree(
    real_root:Path,display_root:str,*,display_budget:int=MAX_REPORT_BYTES,
    record_budget:int=MAX_REPORT_BYTES,
)->dict[str,dict[str,object]]:
    root_bytes=require_display_root(display_root)
    if (type(display_budget) is not int or
        not 1<=display_budget<=MAX_REPORT_BYTES):
        raise Hold("manifest_display_budget_invalid")
    if type(record_budget) is not int or not 1<=record_budget<=MAX_REPORT_BYTES:
        raise Hold("manifest_record_budget_invalid")
    if root_bytes>display_budget:
        raise Hold("manifest_display_path_budget_exceeded")
    display_bytes_total=root_bytes
    real_root=Path(os.path.abspath(os.fspath(real_root)))
    if real_root.is_symlink():
        raise Hold("inventory_root_symlink")
    if not real_root.is_dir():
        raise Hold("inventory_root_not_directory")
    objects:dict[str,dict[str,object]]={}
    record_bytes_total=0

    def add_record(display:str,record:dict[str,object])->None:
        nonlocal record_bytes_total
        if display in objects:
            raise Hold("duplicate_inventory_path")
        # Count actual escaped JSON bytes, including metadata and symlink
        # target fields; raw UTF-8 counts alone miss JSON \u00XX expansion.
        try:
            encoded_bytes=len(canonical({display:record}))
        except (UnicodeError,TypeError,ValueError) as exc:
            raise Hold("manifest_record_encoding_invalid") from exc
        if encoded_bytes>record_budget-record_bytes_total:
            raise Hold("manifest_record_budget_exceeded")
        record_bytes_total+=encoded_bytes
        objects[display]=record

    directory_generations:dict[Path,os.stat_result]={}
    stack=[real_root]
    # Count all discovered objects, including directories not yet popped from
    # the stack.  A budget on objects alone misses queued directory fan-out.
    discovered_count=1
    if discovered_count>MAX_TREE_ENTRIES:
        raise Hold("tree_entry_bound_exceeded")
    while stack:
        current=stack.pop()
        rel=current.relative_to(real_root)
        display=_display(display_root,rel)
        if display in objects:
            raise Hold("duplicate_inventory_path")
        before_dir=current.lstat()
        add_record(display,directory_record(current))
        directory_generations[current]=before_dir
        if len(objects)>MAX_TREE_ENTRIES:
            raise Hold("tree_entry_bound_exceeded")
        # Never materialize an unbounded scandir iterator.  Reject the
        # first over-budget entry before sorting, stat-ing, or queuing it.
        entries=[]
        try:
            with os.scandir(current) as iterator:
                for entry in iterator:
                    discovered_count+=1
                    if discovered_count>MAX_TREE_ENTRIES:
                        raise Hold("tree_entry_bound_exceeded")
                    # Count each rendered name while consuming scandir;
                    # a completed unsorted entry list must never evade the
                    # aggregate display-name budget.
                    child_display=_display(display_root,rel/entry.name)
                    display_bytes=len(child_display.encode("utf-8","strict"))
                    if display_bytes_total+display_bytes>display_budget:
                        raise Hold("manifest_display_path_budget_exceeded")
                    display_bytes_total+=display_bytes
                    entries.append(entry)
        except OSError as exc:
            raise Hold("directory_scan_failed:"+display) from exc
        entries.sort(key=lambda e:e.name,reverse=True)
        for entry in entries:
            path=Path(entry.path)
            rel=path.relative_to(real_root)
            display=_display(display_root,rel)
            # The key was already charged in the bounded scandir iterator.
            st=path.lstat()
            if stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode):
                stack.append(path)
                continue
            if display in objects:
                raise Hold("duplicate_inventory_path")
            if stat.S_ISREG(st.st_mode):
                add_record(display,stable_regular(path))
            elif stat.S_ISLNK(st.st_mode):
                # A symlink stores target_text and resolved_display_path
                # in addition to its inventory key. All three variable
                # strings must consume the same cumulative byte budget.
                record=symlink_record(path,display,real_root,display_root)
                for field in ("target_text","resolved_display_path"):
                    try:
                        extra_bytes=len(record[field].encode("utf-8","strict"))
                    except UnicodeError as exc:
                        raise Hold("manifest_symlink_record_encoding_invalid") from exc
                    if display_bytes_total+extra_bytes>display_budget:
                        raise Hold("manifest_display_path_budget_exceeded")
                    display_bytes_total+=extra_bytes
                add_record(display,record)
            else:
                raise Hold("special_file_forbidden:"+display)
            if len(objects)>MAX_TREE_ENTRIES:
                raise Hold("tree_entry_bound_exceeded")
    for directory,before in directory_generations.items():
        after=directory.lstat()
        if not _same_generation(before,after):
            raise Hold("directory_generation_changed_during_inventory:"+os.fspath(directory))
    return dict(sorted(objects.items()))

def absence_record(real_root:Path,display_root:str,display_path:str)->dict[str,object]:
    # The standalone absence primitive must authenticate logical identity
    # before following any pathname for parent/generation observation.
    try:
        require_display_root(display_root)
    except Hold as exc:
        raise Hold("absence_path_not_canonical_or_outside_root") from exc
    if (type(display_path) is not str
        or not display_path or len(display_path)>MAX_INPUT_PATH_BYTES
        or "\x00" in display_path or not display_path.startswith(display_root+"/")
        or posixpath.normpath(display_path)!=display_path):
        raise Hold("absence_path_not_canonical_or_outside_root")
    try:
        path_bytes=len(display_path.encode("utf-8","strict"))
    except UnicodeError as exc:
        raise Hold("absence_path_encoding_invalid") from exc
    if path_bytes>MAX_INPUT_PATH_BYTES:
        raise Hold("absence_path_length_exceeded")
    rel=display_path[len(display_root)+1:]
    if not rel or rel.startswith("/") or "." in rel.split("/") or ".." in rel.split("/"):
        raise Hold("absence_path_invalid")
    real_root=Path(os.path.abspath(os.fspath(real_root)))
    if (real_root.is_symlink() or not real_root.is_dir()
        or real_root.resolve()!=real_root):
        raise Hold("absence_inventory_root_not_canonical")
    target=real_root/rel
    missing_components:list[Path]=[]
    resolved=_contained_resolve(
        target,real_root,display_path,missing_component_out=missing_components,
    )
    missing_component=missing_components[0] if missing_components else None
    if missing_component is not None:
        try:
            missing_component.lstat()
        except FileNotFoundError:
            pass
        except OSError as exc:
            raise Hold("absence_first_missing_observation_failed:"+display_path) from exc
        else:
            raise Hold("absence_first_missing_component_materialized:"+display_path)
    if resolved!=target:
        # Even an internal alias would make nearest-parent provenance
        # ambiguous; a future host adapter must qualify it separately.
        raise Hold("absence_intermediate_symlink_forbidden:"+display_path)
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

def require_manifest_input_budget(
    sys_path:list[str],declared_absent:list[str],accessed_paths:list[str],
    *,max_entries:int=MAX_TREE_ENTRIES,max_bytes:int=MAX_REPORT_BYTES,
)->None:
    # Reject oversized caller-provided inventories BEFORE any tree walk,
    # set/sort/dictionary expansion, or final JSON encoding. Python hints
    # alone do not prevent a caller from passing unbounded generators.
    if (
        type(max_entries) is not int or not 1<=max_entries<=MAX_TREE_ENTRIES
        or type(max_bytes) is not int or not 1<=max_bytes<=MAX_REPORT_BYTES
    ):
        raise Hold("manifest_input_budget_invalid")
    groups=(sys_path,declared_absent,accessed_paths)
    if any(type(group) is not list for group in groups):
        raise Hold("manifest_input_sequence_invalid")
    if sum(len(group) for group in groups)>max_entries:
        raise Hold("manifest_input_path_count_exceeded")
    total_bytes=0
    for group in groups:
        for candidate in group:
            if type(candidate) is not str or not candidate or "\x00" in candidate:
                raise Hold("manifest_input_path_invalid")
            try:
                n=len(candidate.encode("utf-8","strict"))
            except UnicodeError as exc:
                raise Hold("manifest_input_path_encoding_invalid") from exc
            if n>MAX_INPUT_PATH_BYTES:
                raise Hold("manifest_input_path_length_exceeded")
            total_bytes+=n
            if total_bytes>max_bytes:
                raise Hold("manifest_input_byte_budget_exceeded")


def build_manifest(
    real_root:Path,display_root:str,sys_path:list[str],declared_absent:list[str],
    accessed_paths:list[str],*,record_budget:int=MAX_REPORT_BYTES,
)->dict[str,object]:
    require_manifest_input_budget(sys_path,declared_absent,accessed_paths)
    require_display_root(display_root)
    if not isinstance(sys_path,list) or not sys_path or any(
        not isinstance(p,str) or chr(0) in p or not p.startswith("/")
        or p.startswith("//") or posixpath.normpath(p)!=p or p.endswith("/")
        for p in sys_path
    ):
        raise Hold("sys_path_invalid_or_noncanonical")
    if not isinstance(declared_absent,list) or any(
        not isinstance(p,str) or chr(0) in p for p in declared_absent
    ):
        raise Hold("declared_absence_path_invalid")
    if not isinstance(accessed_paths,list) or any(
        not isinstance(p,str) or chr(0) in p or not p.startswith("/")
        or p.startswith("//") or posixpath.normpath(p)!=p or p.endswith("/")
        for p in accessed_paths
    ):
        raise Hold("accessed_path_invalid_or_noncanonical")
    # Charge exact canonical JSON for both inventory and absence records.
    # The latter must not accumulate unchecked while awaiting the final
    # full-manifest output limit.
    objects=collect_tree(real_root,display_root,record_budget=record_budget)
    record_bytes_total=sum(
        len(canonical({name:item})) for name,item in objects.items()
    )
    absences={}
    for absent_path in sorted(set(declared_absent)):
        evidence=absence_record(real_root,display_root,absent_path)
        try:
            payload_bytes=len(canonical({absent_path:evidence}))
        except (UnicodeError,TypeError,ValueError) as exc:
            raise Hold("manifest_absence_record_encoding_invalid") from exc
        if payload_bytes>record_budget-record_bytes_total:
            raise Hold("manifest_absence_record_budget_exceeded")
        record_bytes_total+=payload_bytes
        absences[absent_path]=evidence
    for p in sys_path:
        if p in objects:
            if objects[p]["kind"] not in ("directory","regular"):
                raise Hold("sys_path_special_or_symlink_authority:"+p)
        elif p not in absences or absences[p]["exists"] is not False:
            raise Hold("sys_path_not_inventoried_or_absent:"+p)
    if not set(accessed_paths).issubset(objects):
        raise Hold("unaccepted_runtime_file_access")
    manifest={
        "schema":"void_buy_void_epoch2_v6r3_terminal_runtime_manifest_v2",
        "contract_id":CONTRACT_ID,
        "freshness_gate_id":FRESHNESS_GATE_ID,
        "first_entry_binary_lock_id":FIRST_ENTRY_LOCK_ID,
        "sys_path":list(sys_path),
        "objects":objects,
        "absent":absences,
        "accessed_paths":sorted(set(accessed_paths)),
        "post_exec_dumpability_verified":False,
        "post_exec_dumpability_accepted":False,
        "git_subprocess_runtime_closure_accepted":False,
        "installed_first_entry_binary_identity_proven":False,
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
    if observed.get("git_subprocess_runtime_closure_accepted") is not False:
        raise Hold("git_subprocess_runtime_closure_overclaim")
    if observed.get("installed_first_entry_binary_identity_proven") is not False:
        raise Hold("installed_first_entry_binary_overclaim")

def fixture_self_test()->None:
    with tempfile.TemporaryDirectory(prefix="void-e2-v6r3-census-manifest-v2-") as td:
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

        # Absence records have their own canonical JSON escape/metadata cost.
        object_payload=sum(
            len(canonical({name:item})) for name,item in manifest["objects"].items()
        )
        absence_payload=sum(
            len(canonical({name:item})) for name,item in manifest["absent"].items()
        )
        exact_record_budget=object_payload+absence_payload
        assert exact_record_budget<=MAX_REPORT_BYTES
        assert build_manifest(
            root,"/fixture",sys_path,absent,
            ["/fixture/python/hashlib.py","/fixture/python/lib-dynload/_hashlib.so"],
            record_budget=exact_record_budget,
        )==manifest
        try:
            build_manifest(
                root,"/fixture",sys_path,absent,[],
                record_budget=exact_record_budget-1,
            )
        except Hold as exc:
            assert str(exc)=="manifest_absence_record_budget_exceeded",str(exc)
        else:
            raise AssertionError("absence_metadata_unbudgeted")

        # Linux path components may include control bytes which canonical
        # ensure_ascii JSON expands beyond the raw UTF-8 byte budget.
        escaped_absence="/fixture/etc/"+chr(1)*24
        expanded_absences=[*absent,escaped_absence]
        escaped_manifest=build_manifest(
            root,"/fixture",sys_path,expanded_absences,[],
        )
        assert escaped_manifest["absent"][escaped_absence]["exists"] is False
        assert len(canonical(escaped_absence))>len(escaped_absence.encode("utf-8"))*3
        escaped_object_payload=sum(
            len(canonical({name:item}))
            for name,item in escaped_manifest["objects"].items()
        )
        escaped_absence_payload=sum(
            len(canonical({name:item}))
            for name,item in escaped_manifest["absent"].items()
        )
        escaped_record_budget=escaped_object_payload+escaped_absence_payload
        assert build_manifest(
            root,"/fixture",sys_path,expanded_absences,[],
            record_budget=escaped_record_budget,
        )==escaped_manifest
        try:
            build_manifest(
                root,"/fixture",sys_path,expanded_absences,[],
                record_budget=escaped_record_budget-1,
            )
        except Hold as exc:
            assert str(exc)=="manifest_absence_record_budget_exceeded",str(exc)
        else:
            raise AssertionError("absence_escaped_json_over_budget_accepted")

        # The key-only guard must not admit unbudgeted symlink target text.
        key_only_budget=sum(
            len(name.encode("utf-8","strict")) for name in manifest["objects"]
        )
        symlink_extra_bytes=sum(
            len(item[field].encode("utf-8","strict"))
            for item in manifest["objects"].values()
            if item["kind"]=="symlink"
            for field in ("target_text","resolved_display_path")
        )
        assert symlink_extra_bytes>0
        try:
            collect_tree(root,"/fixture",display_budget=key_only_budget)
        except Hold as exc:
            assert str(exc)=="manifest_display_path_budget_exceeded",str(exc)
        else:
            raise AssertionError("symlink_record_variable_strings_unbudgeted")
        assert collect_tree(
            root,"/fixture",display_budget=key_only_budget+symlink_extra_bytes
        )==manifest["objects"]

        # Count actual canonical JSON metadata and escaped strings BEFORE
        # inserting records, not only the raw bytes of displayed names.
        record_payload=sum(
            len(canonical({name:item})) for name,item in manifest["objects"].items()
        )
        assert collect_tree(root,"/fixture",record_budget=record_payload)==manifest["objects"]
        try:
            collect_tree(root,"/fixture",record_budget=record_payload-1)
        except Hold as exc:
            assert str(exc)=="manifest_record_budget_exceeded",str(exc)
        else:
            raise AssertionError("serialized_record_budget_escaped")

        # Control characters are legal in Linux symlink targets but expand
        # sixfold under canonical ensure_ascii JSON escaping.
        escaped=py/"json-control-target"
        escaped_target=chr(1)*24
        escaped.symlink_to(escaped_target)
        control_objects=collect_tree(root,"/fixture")
        assert control_objects["/fixture/python/json-control-target"]["target_text"]==escaped_target
        assert len(canonical(escaped_target))>len(escaped_target.encode("utf-8"))*4
        control_payload=sum(
            len(canonical({name:item})) for name,item in control_objects.items()
        )
        assert collect_tree(root,"/fixture",record_budget=control_payload)==control_objects
        try:
            collect_tree(root,"/fixture",record_budget=control_payload-1)
        except Hold as exc:
            assert str(exc)=="manifest_record_budget_exceeded",str(exc)
        else:
            raise AssertionError("escaped_json_record_over_budget_accepted")
        escaped.unlink()
        try:
            collect_tree(root,"/fixture",record_budget=0)
        except Hold as exc:
            assert str(exc)=="manifest_record_budget_invalid",str(exc)
        else:
            raise AssertionError("invalid_record_budget_accepted")

        # A logical root prefixes every object key. Prove early bounds
        # without large allocations or protected-host filesystem reads.
        oversized_root="/"+"r"*MAX_INPUT_PATH_BYTES
        multibyte_root="/"+"é"*(MAX_INPUT_PATH_BYTES//2+1)
        non_utf8_root="/"+chr(0xd800)
        for bad_root,reason in (
            (oversized_root,"display_root_length_exceeded"),
            (multibyte_root,"display_root_length_exceeded"),
            (non_utf8_root,"display_root_encoding_invalid"),
            ("//fixture","display_root_not_canonical"),
        ):
            for operation in (
                lambda:collect_tree(root,bad_root),
                lambda:build_manifest(root,bad_root,sys_path,absent,[]),
            ):
                try:
                    operation()
                except Hold as exc:
                    assert str(exc)==reason,(str(bad_root[:12]),str(exc))
                else:
                    raise AssertionError("unbounded_display_root_accepted")
        for bad_root,bad_absence in (
            (oversized_root,oversized_root+"/ghost"),
            ("/fixture","/fixture/"+"x"*MAX_INPUT_PATH_BYTES),
            ("/fixture","/fixture/"+chr(0xd800)),
        ):
            try:
                absence_record(root,bad_root,bad_absence)
            except Hold as exc:
                assert str(exc) in (
                    "absence_path_not_canonical_or_outside_root",
                    "absence_path_encoding_invalid",
                )
            else:
                raise AssertionError("unbounded_absence_display_path_accepted")
        try:
            collect_tree(root,"/fixture",display_budget=len("/fixture")+1)
        except Hold as exc:
            assert str(exc)=="manifest_display_path_budget_exceeded"
        else:
            raise AssertionError("inventory_display_path_budget_bypassed")
        assert len(collect_tree(root,"/fixture"))>3
        # A valid root may still prefix one child beyond the 4KiB individual
        # logical-path bound while remaining far below the 16MiB aggregate cap.
        near_limit_root="/"+"r"*(MAX_INPUT_PATH_BYTES-4)
        assert len(near_limit_root.encode("utf-8"))<MAX_INPUT_PATH_BYTES
        try:
            collect_tree(root,near_limit_root)
        except Hold as exc:
            assert str(exc)=="manifest_display_path_length_exceeded"
        else:
            raise AssertionError("single_oversized_display_key_accepted")

        # NUL and noncanonical paths must fail before constructing a JSON
        # authority record or calling a POSIX filesystem API.
        nul=chr(0)
        identity_cases=(
            ("display_root",lambda:build_manifest(root,"/fixture"+nul,sys_path,absent,[]),
             "display_root_not_canonical"),
            ("sys_path",lambda:build_manifest(root,"/fixture",["/fixture/python"+nul],absent,[]),
             "manifest_input_path_invalid"),
            ("declared_absent",lambda:build_manifest(root,"/fixture",sys_path,
             ["/fixture/etc/ghost"+nul],[]),"manifest_input_path_invalid"),
            ("accessed",lambda:build_manifest(root,"/fixture",sys_path,absent,
             ["/fixture/python/hashlib.py"+nul]),"manifest_input_path_invalid"),
            ("accessed_noncanonical",lambda:build_manifest(root,"/fixture",sys_path,absent,
             ["/fixture/python/../etc/ld.so.preload"]),"accessed_path_invalid_or_noncanonical"),
            ("absence_root",lambda:absence_record(root,"/fixture"+nul,
             "/fixture"+nul+"/etc/ghost"),"absence_path_not_canonical_or_outside_root"),
            ("absence_leaf",lambda:absence_record(root,"/fixture",
             "/fixture/etc/ghost"+nul),"absence_path_not_canonical_or_outside_root"),
            # Exactly two leading slashes have implementation-defined POSIX
            # resolution. Preserve the latest parent negative cases.
            ("display_root_double_slash",lambda:build_manifest(
                root,"//fixture",sys_path,absent,[]),"display_root_not_canonical"),
            ("absence_root_double_slash",lambda:absence_record(
                root,"//fixture","//fixture/etc/ghost",
            ),"absence_path_not_canonical_or_outside_root"),
        )
        for label,case,expected in identity_cases:
            try: case()
            except Hold as exc: assert str(exc)==expected,(label,str(exc))
            else: raise AssertionError("non_posix_path_accepted:"+label)

        # Input cardinality/bytes are verified before inventory expansion.
        # All fixtures are in-memory and retain production limits unchanged.
        require_manifest_input_budget(
            ["/fixture/python"],[],[],max_entries=1,max_bytes=64,
        )
        for paths,absent_paths,accessed in (
            (["/fixture/python"]*3,[],[]),
            (["/fixture/python"],["/fixture/a"],["/fixture/b"]),
        ):
            try:
                require_manifest_input_budget(
                    paths,absent_paths,accessed,max_entries=2,
                )
            except Hold as exc:
                assert str(exc)=="manifest_input_path_count_exceeded"
            else:
                raise AssertionError("unbounded_input_path_count_accepted")
        try:
            require_manifest_input_budget(
                ["/fixture/python"],[],[],max_bytes=4,
            )
        except Hold as exc:
            assert str(exc)=="manifest_input_byte_budget_exceeded"
        else:
            raise AssertionError("unbounded_input_path_bytes_accepted")
        try:
            require_manifest_input_budget(["/fixture/"+"x"*4096],[],[])
        except Hold as exc:
            assert str(exc)=="manifest_input_path_length_exceeded"
        else:
            raise AssertionError("oversized_input_path_accepted")
        for bad_path in (None,"",123,"/fixture/\x00bad"):
            try:
                require_manifest_input_budget([bad_path],[],[])
            except Hold as exc:
                assert str(exc)=="manifest_input_path_invalid"
            else:
                raise AssertionError("malformed_input_path_accepted")
        try:
            require_manifest_input_budget(iter(["/fixture/python"]),[],[])
        except Hold as exc:
            assert str(exc)=="manifest_input_sequence_invalid"
        else:
            raise AssertionError("unbounded_input_iterator_accepted")

        # No sys.path entry is execution authority merely because it is
        # absolute. An existing directory must be enumerated, or the path
        # must be explicitly declared absent with parent metadata.
        for bogus in ("/tmp/uncensused-runtime", "/fixture/python/alias.py",
                      "/fixture/python/../etc", "/fixture//python"):
            try:
                build_manifest(root,"/fixture",[bogus],absent,[])
            except Hold:
                pass
            else:
                raise AssertionError("unverified_sys_path_accepted:"+bogus)
        admitted=build_manifest(
            root,"/fixture",["/fixture/python","/fixture/optional-stdlib"],
            [*absent,"/fixture/optional-stdlib"],[],
        )
        assert admitted["absent"]["/fixture/optional-stdlib"]["exists"] is False
        try:
            build_manifest(root,"/fixture/../escape",sys_path,absent,[])
        except Hold as exc:
            assert "display_root_not_canonical" in str(exc)
        else:
            raise AssertionError("noncanonical_display_root_accepted")

        # The isolated absence primitive previously allowed an unobserved
        # intermediate symlink to escape into an outside directory and record
        # its child as the missing path's parent.
        external_parent=Path(td)/"outside-absence";external_parent.mkdir()
        (external_parent/"nested").mkdir()
        external_alias=root/"offroot-parent"
        external_alias.symlink_to(external_parent,target_is_directory=True)
        try:
            absence_record(root,"/fixture","/fixture/offroot-parent/nested/missing")
        except Hold as exc:
            assert "symlink_target_outside_inventory_root" in str(exc)
        else:
            raise AssertionError("escaped_absence_parent_accepted")
        external_alias.unlink()
        contained_alias=root/"internal-absence-alias"
        contained_alias.symlink_to("etc",target_is_directory=True)
        try:
            absence_record(root,"/fixture","/fixture/internal-absence-alias/missing")
        except Hold as exc:
            assert "absence_intermediate_symlink_forbidden" in str(exc)
        else:
            raise AssertionError("aliased_absence_parent_accepted")
        contained_alias.unlink()

        outside=Path(td)/"outside";outside.write_text("x",encoding="utf-8")
        outside_link=root/"python"/"outside-link"
        outside_link.symlink_to(outside)
        try: collect_tree(root,"/fixture")
        except Hold as exc: assert "symlink_target_outside_inventory_root" in str(exc)
        else: raise AssertionError("outside_root_symlink_accepted")
        outside_link.unlink()

        # Escape-then-return is not acceptable: os.path.realpath() of this
        # path ends inside root, although the first symlink crosses outside.
        outside_hop=Path(td)/"outside-hop";outside_hop.mkdir()
        (outside_hop/"bridge").symlink_to(py/"hashlib.py")
        pivot=py/"escape-return";pivot.symlink_to(outside_hop/"bridge")
        assert Path(os.path.realpath(pivot))==py/"hashlib.py"
        try:
            collect_tree(root,"/fixture")
        except Hold as exc:
            assert "symlink_target_outside_inventory_root" in str(exc)
        else:
            raise AssertionError("outside_intermediate_symlink_hop_accepted")
        pivot.unlink()

        # Linux ENOENT cannot be canceled by lexical "missing/../safe".
        # The old scanner returned /root/python/hashlib.py and incorrectly
        # claimed a dangling link was a present authenticated regular leaf.
        missing_reentry=py/"missing-parent-reentry"
        missing_reentry.symlink_to("absent-intermediate/../hashlib.py")
        assert not missing_reentry.exists()
        try:
            collect_tree(root,"/fixture")
        except Hold as exc:
            assert "symlink_missing_component_parent_reentry" in str(exc)
        else:
            raise AssertionError("missing_component_reentry_reported_existing_leaf")
        missing_reentry.unlink()

        # A conventional dangling symlink stays explicit absent evidence.
        dangling=py/"dangling-contained"
        dangling.symlink_to("nonexistent-tree/nonexistent-leaf.py")
        dangling_manifest=collect_tree(root,"/fixture")
        assert dangling_manifest["/fixture/python/dangling-contained"]["resolved_exists"] is False
        dangling.unlink()

        # Cyclic paths must terminate with a bounded explicit HOLD.
        loop=py/"cyclic-link";loop.symlink_to("cyclic-link")
        try:
            collect_tree(root,"/fixture")
        except Hold as exc:
            assert "symlink_resolution_hop_limit" in str(exc)
        else:
            raise AssertionError("symlink_cycle_accepted")
        loop.unlink()
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

        # Bounded fan-out regression: root + one queued directory consumes the
        # entire two-entry budget.  The next directory must HOLD *before*
        # building a larger list or appending more pending directories.
        fanout=Path(td)/"fanout";fanout.mkdir()
        for name in ("one","two","three"):
            (fanout/name).mkdir()
        original_limit=MAX_TREE_ENTRIES
        try:
            globals()["MAX_TREE_ENTRIES"]=2
            try:
                collect_tree(fanout,"/fixture-fanout")
            except Hold as exc:
                assert str(exc)=="tree_entry_bound_exceeded"
            else:
                raise AssertionError("queued_directory_fanout_over_budget_accepted")
        finally:
            globals()["MAX_TREE_ENTRIES"]=original_limit

        # A synthetic endless scandir proves the collector takes no more than
        # remaining-budget + one sentinel from an iterator.  No filesystem
        # mutation or privileged host path is involved in this fake iterator.
        observed=[0]
        class _SyntheticEntry:
            name="one"
        class _BudgetSentinel:
            def __enter__(self):return self
            def __exit__(self,*_exc):return False
            def __iter__(self):return self
            def __next__(self):
                observed[0]+=1
                if observed[0]>2:
                    raise AssertionError("unbounded_scandir_consumption")
                return _SyntheticEntry()
        original_scan=os.scandir
        def _synthetic_scan(_path):
            assert Path(_path)==fanout
            return _BudgetSentinel()
        try:
            globals()["MAX_TREE_ENTRIES"]=2
            os.scandir=_synthetic_scan
            try:
                collect_tree(fanout,"/fixture-fanout")
            except Hold as exc:
                assert str(exc)=="tree_entry_bound_exceeded"
            else:
                raise AssertionError("unbounded_scandir_accepted")
            assert observed[0]==2,observed
        finally:
            os.scandir=original_scan
            globals()["MAX_TREE_ENTRIES"]=original_limit

        # This adversary must not request a second scandir element after
        # the first displayed key exceeds the tiny byte budget.
        observed_key_budget=[0]
        class _NameBudgetSentinel:
            def __enter__(self): return self
            def __exit__(self,*_exc): return False
            def __iter__(self): return self
            def __next__(self):
                observed_key_budget[0]+=1
                if observed_key_budget[0]>1:
                    raise AssertionError("display_budget_scandir_overscan")
                return _SyntheticEntry()
        def _display_budget_scan(_path):
            assert Path(_path)==fanout
            return _NameBudgetSentinel()
        try:
            os.scandir=_display_budget_scan
            try:
                collect_tree(
                    fanout,"/fixture-fanout",
                    display_budget=len("/fixture-fanout")+1,
                )
            except Hold as exc:
                assert str(exc)=="manifest_display_path_budget_exceeded"
            else:
                raise AssertionError("display_budget_late_rejection_accepted")
            assert observed_key_budget[0]==1,observed_key_budget
        finally:
            os.scandir=original_scan

        (root/"etc"/"ld.so.preload").write_text("hostile",encoding="utf-8")
        try: absence_record(root,"/fixture","/fixture/etc/ld.so.preload")
        except Hold as exc: assert "declared_absence_materialized" in str(exc)
        else: raise AssertionError("materialized_absence_accepted")

    print(MARKER+"_SELF_TEST_GREEN")
    print("bounded_no_follow_regular_hashing=true")
    print("complete_directory_regular_symlink_inventory=true")
    print("declared_absence_parent_identity_bound=true")
    print("special_files_rejected=true")
    print("symlink_intermediate_outside_root_rejected=true")
    print("symlink_hop_limit_rejects_cycles=true")
    print("absence_intermediate_symlink_escape_rejected=true")
    print("absence_parent_symlink_alias_rejected=true")
    print("sys_path_must_be_inventoried_or_explicitly_absent=true")
    print("census_input_cardinality_and_byte_budget_pretraversal=true")
    print("census_display_root_length_utf8_and_path_budget_bound=true")
    print("census_individual_display_path_bound=true")
    print("census_symlink_record_strings_budget_bound=true")
    print("census_canonical_json_record_payload_budget_bound=true")
    print("census_escaped_control_record_amplification_rejected=true")
    print("census_absence_record_canonical_budget_bound=true")
    print("census_absence_json_escape_amplification_rejected=true")
    print("census_direct_absence_display_path_budget_bound=true")
    print("census_unbounded_generator_and_oversize_path_rejected=true")
    print("noncanonical_manifest_paths_rejected=true")
    print("embedded_nul_and_non_posix_input_paths_rejected=true")
    print("non_posix_path_negative_fixtures=9")
    print("symlink_missing_component_parent_reentry_rejected=true")
    print("contained_dangling_symlink_remains_absent=true")
    print("discovered_entry_budget_includes_queued_directories=true")
    print("scandir_consumption_bounded_before_sort=true")
    print("display_name_budget_checked_during_scandir=true")
    print("over_budget_synthetic_scandir_rejected=true")
    print("terminal_manifest_drift_rejected=true")
    print("post_exec_dumpability_overclaim_rejected=true")
    changed=json.loads(canonical(manifest))
    changed["git_subprocess_runtime_closure_accepted"]=True
    try:
        require_terminal_equal(manifest,changed)
    except Hold: pass
    else: raise AssertionError("git_runtime_closure_overclaim_accepted")
    changed=json.loads(canonical(manifest))
    changed["installed_first_entry_binary_identity_proven"]=True
    try:
        require_terminal_equal(manifest,changed)
    except Hold: pass
    else: raise AssertionError("installed_first_entry_binary_overclaim_accepted")
    print("git_subprocess_runtime_closure_overclaim_rejected=true")
    print("installed_first_entry_binary_overclaim_rejected=true")
    print("host_execution_enabled=false")
    print("host_census_authorized=false")
    print("host_plan_authorized=false")
    print("funds_movement=false")

def source_plan()->None:
    print(MARKER)
    print("mode=source-plan")
    print("contract_id="+CONTRACT_ID)
    print("freshness_gate_id="+FRESHNESS_GATE_ID)
    print("first_entry_lock_id="+FIRST_ENTRY_LOCK_ID)
    print("first_entry_lock_blob="+FIRST_ENTRY_LOCK_BLOB)
    print("source_v1_blob="+SOURCE_V1_BLOB)
    print("contract_blob="+CONTRACT_BLOB)
    print("freshness_gate_blob="+FRESHNESS_GATE_BLOB)
    print("git_aware_freshness_required=true")
    print("host_execution_enabled=false")
    print("host_census_authorized=false")
    print("protected_install_authorized=false")
    print("post_exec_dumpability_accepted=false")
    print("git_subprocess_runtime_closure_accepted=false")
    print("installed_first_entry_binary_identity_proven=false")
    print("host_plan_authorized=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")
    print("next_gate=source_authenticated_host_observer_adapter_v2")

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
