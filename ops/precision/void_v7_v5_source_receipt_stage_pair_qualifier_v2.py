#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import stat
import subprocess
import sys
import tempfile
from typing import Any

MARKER="VOID_V7_V5_SOURCE_RECEIPT_STAGE_PAIR_QUALIFIER_V2"

SOURCE_STAGE=pathlib.Path("/opt/.void-buy-void-v7-reviewed-v1.stage-v5")
SOURCE_INTERNAL_STAGE=pathlib.Path("/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1")
FIXED_V4_SOURCE=pathlib.Path("/opt/void-buy-void-v7-reviewed-v1")
SOURCE_PREDECESSOR=pathlib.Path("/opt/void-buy-void-v7-reviewed-v1.predecessor-v4")

RECEIPT_STAGE=pathlib.Path(
    "/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5"
)
FIXED_V4_RECEIPT=pathlib.Path(
    "/var/lib/void-source-finality-v7/deployment-receipt.json"
)
RECEIPT_PREDECESSOR=pathlib.Path(
    "/var/lib/void-source-finality-v7/deployment-receipt-v4-predecessor.json"
)

V5_HEAD="be2fbe41aaba291d3f874b9de52bcb87336307f5"
V5_TREE="749877d2320ecee9d659720b32e4726a0c42d697"
V5_PARENT="79081038cf4f03c2971bdcb32c54daf6a87fbabf"
V5_REACHABLE_COMMITS=18357

V4_HEAD="75927cae2c7ed0b4273e6218937dedf69824f64c"
V4_TREE="51fcfacd0303ae6e1c5aa8f4505fbff24ded3371"

V4_RECEIPT_ID=(
    "voidbsfdep1_3f128abf9c9d9c2fc97c8d3620be212b12542b0e57a149672bdb988efee1d5a1"
)
V4_RECEIPT_SHA256=(
    "da43b974970fdfee00f914d61064bee86d192ad9b67769f52696e1fbd05bfa87"
)
V4_RECEIPT_BYTES=1136

V5_RECEIPT_ID=(
    "voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37"
)
V5_RECEIPT_SHA256=(
    "12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001"
)
V5_RECEIPT_BYTES=1136

SHA40=re.compile(r"^[0-9a-f]{40}$")

class QualifyError(RuntimeError):
    pass

def run(
    argv:list[str],
    *,
    timeout:int=120,
    env:dict[str,str]|None=None,
)->subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        argv,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=timeout,
        env=env,
    )

def git(root:pathlib.Path,*args:str,timeout:int=120)->str:
    cp=run(
        [
            "/usr/bin/git",
            "--no-replace-objects",
            "-c","core.hooksPath=/dev/null",
            "-c","core.fsmonitor=false",
            "-c","core.untrackedCache=false",
            "-c","submodule.recurse=false",
            "-c","pack.writeReverseIndex=false",
            "-c","safe.directory="+str(root),
            "-C",str(root),
            *args,
        ],
        timeout=timeout,
        env={
            "PATH":"/usr/bin:/bin",
            "HOME":"/nonexistent",
            "LANG":"C",
            "LC_ALL":"C",
            "TZ":"UTC",
            "GIT_CONFIG_NOSYSTEM":"1",
            "GIT_CONFIG_GLOBAL":"/dev/null",
            "GIT_CONFIG_SYSTEM":"/dev/null",
            "GIT_NO_REPLACE_OBJECTS":"1",
            "GIT_OPTIONAL_LOCKS":"0",
            "GIT_TERMINAL_PROMPT":"0",
            "GIT_ASKPASS":"/bin/false",
            "GIT_NO_LAZY_FETCH":"1",
            "GIT_PROTOCOL_FROM_USER":"0",
            "GIT_ALLOW_PROTOCOL":"",
            "GIT_PAGER":"",
        },
    )
    if cp.returncode!=0 or cp.stderr:
        raise QualifyError("git_failed:"+(args[0] if args else "unknown"))
    return cp.stdout.decode("utf-8","strict").strip()

def meta(path:pathlib.Path)->dict[str,Any]:
    try:st=path.lstat()
    except FileNotFoundError:return {"exists":False}
    return {
        "exists":True,
        "kind":(
            "directory" if stat.S_ISDIR(st.st_mode)
            else "regular" if stat.S_ISREG(st.st_mode)
            else "symlink" if stat.S_ISLNK(st.st_mode)
            else "other"
        ),
        "dev":st.st_dev,"ino":st.st_ino,"uid":st.st_uid,"gid":st.st_gid,
        "mode":stat.S_IMODE(st.st_mode),"nlink":st.st_nlink,"size":st.st_size,
        "mtime_ns":st.st_mtime_ns,"ctime_ns":st.st_ctime_ns,
    }

def same_generation(a:dict[str,Any],b:dict[str,Any],label:str)->None:
    for key in ("dev","ino","uid","gid","mode","nlink","size","mtime_ns","ctime_ns"):
        if a.get(key)!=b.get(key):
            raise QualifyError(label+"_generation_changed:"+key)

def read_regular(path:pathlib.Path,max_bytes:int,label:str)->tuple[bytes,dict[str,Any]]:
    before=meta(path)
    if (
        not before.get("exists") or before.get("kind")!="regular"
        or before.get("nlink")!=1 or before.get("size",0)<=0
        or before.get("size",0)>max_bytes
    ):
        raise QualifyError(label+"_shape_invalid")
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        opened=os.fstat(fd)
        opened_meta={
            "dev":opened.st_dev,"ino":opened.st_ino,"uid":opened.st_uid,
            "gid":opened.st_gid,"mode":stat.S_IMODE(opened.st_mode),
            "nlink":opened.st_nlink,"size":opened.st_size,
            "mtime_ns":opened.st_mtime_ns,"ctime_ns":opened.st_ctime_ns,
        }
        same_generation(before,opened_meta,label+"_open")
        raw=bytearray()
        offset=0
        while offset<opened.st_size:
            part=os.pread(fd,min(64*1024,opened.st_size-offset),offset)
            if not part:raise QualifyError(label+"_short_read")
            raw.extend(part);offset+=len(part)
        if os.pread(fd,1,opened.st_size):
            raise QualifyError(label+"_grew")
        after=os.fstat(fd)
        after_meta={
            "dev":after.st_dev,"ino":after.st_ino,"uid":after.st_uid,
            "gid":after.st_gid,"mode":stat.S_IMODE(after.st_mode),
            "nlink":after.st_nlink,"size":after.st_size,
            "mtime_ns":after.st_mtime_ns,"ctime_ns":after.st_ctime_ns,
        }
        visible=meta(path)
        same_generation(opened_meta,after_meta,label+"_fd")
        same_generation(after_meta,visible,label+"_visible")
        return bytes(raw),after_meta
    finally:
        os.close(fd)

def verify_receipt(
    path:pathlib.Path,
    expected_id:str,
    expected_sha256:str,
    expected_bytes:int,
    label:str,
    *,
    expected_uid:int=0,
    expected_gid:int=0,
)->dict[str,Any]:
    raw,st=read_regular(path,64*1024,label)
    if len(raw)!=expected_bytes:
        raise QualifyError(label+"_bytes_mismatch")
    digest=hashlib.sha256(raw).hexdigest()
    if digest!=expected_sha256:
        raise QualifyError(label+"_sha256_mismatch")
    try:value=json.loads(raw.decode("utf-8","strict"))
    except (UnicodeError,json.JSONDecodeError) as exc:
        raise QualifyError(label+"_json_invalid") from exc
    if not isinstance(value,dict) or value.get("receipt_id")!=expected_id:
        raise QualifyError(label+"_id_mismatch")
    if (
        st.get("uid")!=expected_uid or st.get("gid")!=expected_gid
        or st.get("mode")!=0o444 or st.get("nlink")!=1
    ):
        raise QualifyError(label+"_custody_invalid")
    # The root-owned metadata belongs to the *same FD generation* as the
    # authenticated receipt bytes, never to a later pathname lookup. A final
    # pathname check may reject a rename, but cannot supply authority.
    visible=meta(path)
    same_generation(st,visible,label+"_terminal")
    return {"receipt_id":expected_id,"sha256":digest,"bytes":len(raw),"metadata":st}


# Source-stage custody is a separate trust requirement from Git object hashes.
# Git does not authenticate filesystem ownership, mode, ACLs or inode identity.
# Walk from retained no-follow directory FDs and verify all descendants twice
# around the independently executed Git source checks. No source is modified.
MAX_CUSTODY_NODES=250000
MAX_CUSTODY_DEPTH=64

def _claim_custody_node(
    count:int,
    depth:int,
    *,
    max_nodes:int=MAX_CUSTODY_NODES,
    max_depth:int=MAX_CUSTODY_DEPTH,
)->int:
    if (
        type(count) is not int or count<0 or
        type(depth) is not int or depth<0 or
        type(max_nodes) is not int or max_nodes<1 or max_nodes>MAX_CUSTODY_NODES or
        type(max_depth) is not int or max_depth<0 or max_depth>MAX_CUSTODY_DEPTH
    ):
        raise QualifyError("staged_tree_bound_invalid")
    if depth>max_depth:
        raise QualifyError("staged_tree_depth_limit")
    claimed=count+1
    if claimed>max_nodes:
        raise QualifyError("staged_tree_node_limit")
    return claimed

def _fd_meta(fd:int)->dict[str,Any]:
    st=os.fstat(fd)
    return {
        "exists":True,
        "kind":("directory" if stat.S_ISDIR(st.st_mode)
                else "regular" if stat.S_ISREG(st.st_mode) else "other"),
        "dev":st.st_dev,"ino":st.st_ino,"uid":st.st_uid,"gid":st.st_gid,
        "mode":stat.S_IMODE(st.st_mode),"nlink":st.st_nlink,
        "size":st.st_size,"mtime_ns":st.st_mtime_ns,"ctime_ns":st.st_ctime_ns,
    }

def scan_staged_tree_custody(
    root:pathlib.Path,
    *,
    expected_uid:int=0,
    expected_gid:int=0,
    max_nodes:int=MAX_CUSTODY_NODES,
    max_depth:int=MAX_CUSTODY_DEPTH,
)->dict[str,Any]:
    root_before=meta(root)
    if root_before.get("kind")!="directory" or root.resolve(strict=True)!=root:
        raise QualifyError("staged_tree_root_invalid")
    root_fd=os.open(
        root,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC
    )
    digest=hashlib.sha256()
    count=0
    root_device=_fd_meta(root_fd)["dev"]
    try:
        same_generation(root_before,_fd_meta(root_fd),"staged_tree_root_open")

        def visit(fd:int,rel:str,depth:int)->None:
            nonlocal count
            count=_claim_custody_node(
                count,depth,max_nodes=max_nodes,max_depth=max_depth
            )
            here_before=_fd_meta(fd)
            if here_before["kind"]!="directory":
                raise QualifyError("staged_tree_directory_kind_invalid")
            if (here_before["uid"]!=expected_uid or
                here_before["gid"]!=expected_gid or
                here_before["mode"]!=0o755 or
                here_before["dev"]!=root_device):
                raise QualifyError("staged_tree_directory_custody_invalid:"+rel)
            attrs=os.listxattr(fd)
            if any(name in attrs for name in (
                "system.posix_acl_access","system.posix_acl_default"
            )):
                raise QualifyError("staged_tree_directory_acl_forbidden:"+rel)
            digest.update(
                (json.dumps(["D",rel,*[here_before[k] for k in (
                    "dev","ino","uid","gid","mode","nlink",
                    "size","mtime_ns","ctime_ns"
                )]],separators=(",",":"))+"\\n").encode("utf-8")
            )
            names:list[str]=[]
            with os.scandir(fd) as iterator:
                for entry in iterator:
                    names.append(entry.name)
                    if len(names)>max_nodes-count:
                        raise QualifyError("staged_tree_node_limit")
            for name in sorted(names):
                if (name in ("",".","..") or "/" in name or
                    not name.isprintable() or
                    len(name.encode("utf-8","strict"))>255):
                    raise QualifyError("staged_tree_name_invalid")
                child_rel=name if not rel else rel+"/"+name
                child_depth=depth+1
                if child_depth>max_depth:
                    raise QualifyError("staged_tree_depth_limit")
                before=os.stat(name,dir_fd=fd,follow_symlinks=False)
                if stat.S_ISLNK(before.st_mode):
                    raise QualifyError("staged_tree_symlink_forbidden:"+child_rel)
                is_dir=stat.S_ISDIR(before.st_mode)
                is_file=stat.S_ISREG(before.st_mode)
                if not (is_dir or is_file):
                    raise QualifyError("staged_tree_kind_invalid:"+child_rel)
                flags=(os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK|
                       (os.O_DIRECTORY if is_dir else 0))
                child_fd=os.open(name,flags,dir_fd=fd)
                try:
                    opened=_fd_meta(child_fd)
                    # Compare the trusted open descriptor to the immediate
                    # parent-directory lookup, not a second untrusted path.
                    before_meta={
                        "dev":before.st_dev,"ino":before.st_ino,
                        "uid":before.st_uid,"gid":before.st_gid,
                        "mode":stat.S_IMODE(before.st_mode),
                        "nlink":before.st_nlink,"size":before.st_size,
                        "mtime_ns":before.st_mtime_ns,"ctime_ns":before.st_ctime_ns,
                    }
                    same_generation(before_meta,opened,"staged_tree_open:"+child_rel)
                    if (opened["uid"]!=expected_uid or
                        opened["gid"]!=expected_gid or
                        opened["dev"]!=root_device):
                        raise QualifyError("staged_tree_owner_or_device_invalid:"+child_rel)
                    child_attrs=os.listxattr(child_fd)
                    if any(attr in child_attrs for attr in (
                        "system.posix_acl_access","system.posix_acl_default",
                        "security.capability"
                    )):
                        raise QualifyError("staged_tree_access_extension_forbidden:"+child_rel)
                    if is_dir:
                        if opened["kind"]!="directory" or opened["mode"]!=0o755:
                            raise QualifyError("staged_tree_directory_mode_invalid:"+child_rel)
                        visit(child_fd,child_rel,child_depth)
                    else:
                        count=_claim_custody_node(
                            count,child_depth,
                            max_nodes=max_nodes,max_depth=max_depth,
                        )
                        if (opened["kind"]!="regular" or
                            opened["mode"] not in (0o444,0o755) or
                            opened["nlink"]!=1):
                            raise QualifyError("staged_tree_file_mode_invalid:"+child_rel)
                        digest.update(
                            (json.dumps(["F",child_rel,*[opened[k] for k in (
                                "dev","ino","uid","gid","mode","nlink",
                                "size","mtime_ns","ctime_ns"
                            )]],separators=(",",":"))+"\\n").encode("utf-8")
                        )
                    same_generation(opened,_fd_meta(child_fd),
                                    "staged_tree_fd:"+child_rel)
                    visible=os.stat(name,dir_fd=fd,follow_symlinks=False)
                    visible_meta={
                        "dev":visible.st_dev,"ino":visible.st_ino,
                        "uid":visible.st_uid,"gid":visible.st_gid,
                        "mode":stat.S_IMODE(visible.st_mode),
                        "nlink":visible.st_nlink,"size":visible.st_size,
                        "mtime_ns":visible.st_mtime_ns,"ctime_ns":visible.st_ctime_ns,
                    }
                    same_generation(opened,visible_meta,
                                    "staged_tree_visible:"+child_rel)
                finally:
                    os.close(child_fd)
            same_generation(here_before,_fd_meta(fd),
                            "staged_tree_directory:"+rel)

        visit(root_fd,"",0)
        same_generation(root_before,_fd_meta(root_fd),"staged_tree_root_fd")
        same_generation(_fd_meta(root_fd),meta(root),"staged_tree_root_visible")
        return {
            "generation_sha256":digest.hexdigest(),
            "nodes":count,
            "root_metadata":_fd_meta(root_fd),
        }
    finally:
        os.close(root_fd)

def verify_source(
    root:pathlib.Path,
    *,
    expected_head:str,
    expected_tree:str,
    expected_parent:str|None,
    expected_count:int|None,
    expected_root_mode:int|None,
    label:str,
)->dict[str,Any]:
    st=meta(root)
    if (
        not st.get("exists") or st.get("kind")!="directory"
        or st.get("uid")!=0 or st.get("gid")!=0
        or (
            st.get("mode")!=expected_root_mode
            if expected_root_mode is not None
            else bool(st.get("mode",0)&0o022)
        )
    ):
        raise QualifyError(label+"_root_custody_invalid")
    if root.resolve(strict=True)!=root:
        raise QualifyError(label+"_root_alias")
    custody_before=None
    if expected_root_mode==0o755 and expected_count is not None:
        custody_before=scan_staged_tree_custody(root)
    head=git(root,"rev-parse","--verify","HEAD^{commit}")
    tree=git(root,"rev-parse","--verify","HEAD^{tree}")
    branch=git(root,"symbolic-ref","--quiet","--short","HEAD")
    status=git(root,"status","--porcelain=v1","--untracked-files=all")
    shallow=git(root,"rev-parse","--is-shallow-repository")
    if head!=expected_head:raise QualifyError(label+"_head_mismatch")
    if tree!=expected_tree:raise QualifyError(label+"_tree_mismatch")
    if branch!="main":raise QualifyError(label+"_branch_mismatch")
    if status!="":raise QualifyError(label+"_dirty")
    if expected_parent is not None:
        parents=git(root,"rev-list","--parents","-n","1","HEAD").split()
        if parents!=[expected_head,expected_parent]:
            raise QualifyError(label+"_parent_mismatch")
    if expected_count is not None:
        if shallow!="false":raise QualifyError(label+"_shallow")
        count=git(root,"rev-list","--count",expected_head)
        if count!=str(expected_count):
            raise QualifyError(label+"_reachable_commit_count_mismatch")
        missing=git(
            root,"rev-list","--objects","--missing=print",expected_head,
            timeout=180,
        )
        if any(line.startswith("?") for line in missing.splitlines()):
            raise QualifyError(label+"_missing_reachable_object")
        fsck=git(root,"fsck","--strict","--no-reflogs","--full",timeout=180)
        if fsck!="":
            raise QualifyError(label+"_fsck_output_nonempty")
    if custody_before is not None:
        custody_after=scan_staged_tree_custody(root)
        if (custody_after["generation_sha256"]!=custody_before["generation_sha256"]
            or custody_after["nodes"]!=custody_before["nodes"]):
            raise QualifyError(label+"_custody_generation_changed")
        same_generation(st,custody_after["root_metadata"],
                        label+"_root_terminal")
    return {
        "path":str(root),"head":head,"tree":tree,"branch":branch,
        "clean":True,"shallow":shallow=="true",
        "reachable_commits":expected_count,
        "metadata":st,
    }

def self_test()->None:
    assert SHA40.fullmatch(V5_HEAD)
    assert SHA40.fullmatch(V5_TREE)
    assert SHA40.fullmatch(V5_PARENT)
    assert V5_REACHABLE_COMMITS==18357
    assert SOURCE_STAGE.name==".void-buy-void-v7-reviewed-v1.stage-v5"
    assert RECEIPT_STAGE.name==".deployment-receipt.json.stage-v5"
    assert len(V5_RECEIPT_SHA256)==64
    assert V5_RECEIPT_BYTES==1136
    with tempfile.TemporaryDirectory(prefix="void-v5-stage-pair-") as td:
        p=pathlib.Path(td)/"receipt"
        p.write_bytes(b"x")
        try:
            verify_receipt(p,"voidbsfdep1_"+"0"*64,"0"*64,1,"fixture")
        except QualifyError:
            pass
        else:
            raise AssertionError("bad_receipt_fixture_accepted")

    # Disposable non-root fixtures exercise the *actual* descriptor and
    # recursive-custody boundaries, never a privileged source or receipt.
    with tempfile.TemporaryDirectory(prefix="void-v5-custody-negative-") as td:
        base=pathlib.Path(td)
        root=base/"source"
        child=root/"nested"
        child.mkdir(parents=True)
        os.chmod(root,0o755)
        os.chmod(child,0o755)
        leaf=child/"regular.txt"
        leaf.write_bytes(b"hello")
        os.chmod(leaf,0o444)
        scan=scan_staged_tree_custody(
            root,expected_uid=os.getuid(),expected_gid=os.getgid()
        )
        assert scan["nodes"]==3
        assert _claim_custody_node(
            MAX_CUSTODY_NODES-1,MAX_CUSTODY_DEPTH
        )==MAX_CUSTODY_NODES
        try:
            _claim_custody_node(MAX_CUSTODY_NODES,0)
        except QualifyError as exc:
            assert "staged_tree_node_limit" in str(exc)
        else:
            raise AssertionError("whole_tree_node_cap_plus_one_accepted")
        try:
            _claim_custody_node(0,MAX_CUSTODY_DEPTH+1)
        except QualifyError as exc:
            assert "staged_tree_depth_limit" in str(exc)
        else:
            raise AssertionError("tree_depth_cap_plus_one_accepted")
        try:
            scan_staged_tree_custody(
                root,expected_uid=os.getuid(),expected_gid=os.getgid(),
                max_depth=1,
            )
        except QualifyError as exc:
            assert "staged_tree_depth_limit" in str(exc)
        else:
            raise AssertionError("regular_file_beyond_depth_cap_accepted")
        os.chmod(leaf,0o666)
        try:
            scan_staged_tree_custody(
                root,expected_uid=os.getuid(),expected_gid=os.getgid()
            )
        except QualifyError as exc:
            assert "staged_tree_file_mode_invalid" in str(exc)
        else:
            raise AssertionError("writable_descendant_file_accepted")
        os.chmod(leaf,0o444)
        os.chmod(child,0o777)
        try:
            scan_staged_tree_custody(
                root,expected_uid=os.getuid(),expected_gid=os.getgid()
            )
        except QualifyError as exc:
            assert "staged_tree_directory" in str(exc)
        else:
            raise AssertionError("writable_descendant_directory_accepted")
        os.chmod(child,0o755)
        old_fingerprint=scan_staged_tree_custody(
            root,expected_uid=os.getuid(),expected_gid=os.getgid()
        )["generation_sha256"]
        moved=child/"displaced.txt"
        leaf.rename(moved)
        leaf.write_bytes(b"hello")
        os.chmod(leaf,0o444)
        assert scan_staged_tree_custody(
            root,expected_uid=os.getuid(),expected_gid=os.getgid()
        )["generation_sha256"]!=old_fingerprint
        moved.unlink()
        # Exact receipt bytes are taken from A, which is replaced with B
        # before the caller can finish verification. Terminal generation
        # comparison must reject it, never mix A's data and B's custody.
        receipt=base/"receipt.json"
        replacement=base/"replacement.json"
        receipt_id="voidbsfdep1_"+"a"*64
        raw=json.dumps({"receipt_id":receipt_id},separators=(",",":")).encode()
        receipt.write_bytes(raw)
        replacement.write_bytes(b"{}")
        os.chmod(receipt,0o444)
        os.chmod(replacement,0o444)
        baseline=read_regular
        def swap_after_read(
            path:pathlib.Path,max_bytes:int,label:str
        )->tuple[bytes,dict[str,Any]]:
            result=baseline(path,max_bytes,label)
            os.replace(replacement,receipt)
            return result
        globals()["read_regular"]=swap_after_read
        try:
            try:
                verify_receipt(
                    receipt,receipt_id,hashlib.sha256(raw).hexdigest(),
                    len(raw),"fixture_receipt_swap",
                    expected_uid=os.getuid(),expected_gid=os.getgid(),
                )
            except QualifyError as exc:
                assert "fixture_receipt_swap_terminal_generation_changed" in str(exc)
            else:
                raise AssertionError("receipt_path_replacement_accepted")
        finally:
            globals()["read_regular"]=baseline
    print(MARKER+"_SELF_TEST_GREEN")
    print("whole_tree_node_limit_includes_root=true")
    print("whole_tree_node_cap_boundary_tested=true")
    print("all_child_types_depth_limited=true")
    print("regular_file_depth_cap_plus_one_rejected=true")
    print("receipt_verified_fd_metadata_bound=true")
    print("receipt_path_substitution_rejected=true")
    print("recursive_source_custody_bound=true")
    print("writable_descendant_file_rejected=true")
    print("writable_descendant_directory_rejected=true")
    print("staged_tree_generation_change_detected=true")
    print("fixed_paths_only=true")
    print("source_stage_exact_v5_generation_required=true")
    print("source_stage_root_mode_0755_required=true")
    print("fixed_v4_source_root_owned_nonwritable_required=true")
    print("source_internal_stage_build_v1_required=true")
    print("receipt_stage_exact_v5_identity_required=true")
    print("fixed_v4_pair_unchanged_required=true")
    print("reserved_predecessor_paths_absent_required=true")
    print("journal_fence_path_selection_deferred=true")
    print("exchange_preconditions_complete=false")
    print("exchange_authority=false")
    print("runtime_cutover_authority=false")
    print("filesystem_mutation=false")
    print("service_mutation=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

def inspect()->int:
    if os.geteuid()==0:
        raise QualifyError("sudo_invocation_forbidden")
    if SOURCE_INTERNAL_STAGE.exists() or SOURCE_INTERNAL_STAGE.is_symlink():
        raise QualifyError("source_internal_stage_residual_present")
    if SOURCE_PREDECESSOR.exists() or SOURCE_PREDECESSOR.is_symlink():
        raise QualifyError("source_predecessor_present")
    if RECEIPT_PREDECESSOR.exists() or RECEIPT_PREDECESSOR.is_symlink():
        raise QualifyError("receipt_predecessor_present")

    fixed_source=verify_source(
        FIXED_V4_SOURCE,
        expected_head=V4_HEAD,
        expected_tree=V4_TREE,
        expected_parent=None,
        expected_count=None,
        expected_root_mode=None,
        label="fixed_v4_source",
    )
    fixed_receipt=verify_receipt(
        FIXED_V4_RECEIPT,V4_RECEIPT_ID,V4_RECEIPT_SHA256,V4_RECEIPT_BYTES,
        "fixed_v4_receipt",
    )
    v5_source=verify_source(
        SOURCE_STAGE,
        expected_head=V5_HEAD,
        expected_tree=V5_TREE,
        expected_parent=V5_PARENT,
        expected_count=V5_REACHABLE_COMMITS,
        expected_root_mode=0o755,
        label="v5_source_stage",
    )
    v5_receipt=verify_receipt(
        RECEIPT_STAGE,V5_RECEIPT_ID,V5_RECEIPT_SHA256,V5_RECEIPT_BYTES,
        "v5_receipt_stage",
    )

    if fixed_source["metadata"]["dev"]!=v5_source["metadata"]["dev"]:
        raise QualifyError("source_stage_not_same_filesystem_as_fixed_source")
    if fixed_receipt["metadata"]["dev"]!=v5_receipt["metadata"]["dev"]:
        raise QualifyError("receipt_stage_not_same_filesystem_as_fixed_receipt")

    print(MARKER+"_GREEN")
    print("read_only=true")
    print("sudo_invocation=false")
    print("filesystem_mutation=false")
    print("v5_source_stage_exact=true")
    print("v5_source_stage_mode_0755=true")
    print("fixed_v4_source_root_owned_nonwritable=true")
    print("v5_source_head="+V5_HEAD)
    print("v5_source_tree="+V5_TREE)
    print("v5_source_reachable_commits="+str(V5_REACHABLE_COMMITS))
    print("v5_receipt_stage_exact=true")
    print("v5_receipt_id="+V5_RECEIPT_ID)
    print("v5_receipt_sha256="+V5_RECEIPT_SHA256)
    print("v5_receipt_bytes="+str(V5_RECEIPT_BYTES))
    print("fixed_v4_source_unchanged=true")
    print("fixed_v4_receipt_unchanged=true")
    print("source_predecessor_absent=true")
    print("receipt_predecessor_absent=true")
    print("source_internal_stage_absent=true")
    print("source_same_filesystem=true")
    print("receipt_same_filesystem=true")
    print("staging_pair_exact=true")
    print("journal_fence_path_selection_deferred=true")
    print("exchange_preconditions_complete=false")
    print("fixed_source_exchange_authority=false")
    print("fixed_receipt_exchange_authority=false")
    print("runtime_cutover_authority=false")
    print("service_mutation=false")
    print("credential_wallet_signer_transaction_authority=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print("next_gate=DEFINE_HARDENED_EXCHANGE_IMPLEMENTATION_JOURNAL_AND_FENCE_PATHS")
    return 0

def main()->int:
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test",action="store_true")
    group.add_argument("--inspect",action="store_true")
    args=parser.parse_args()
    if args.self_test:self_test();return 0
    return inspect()

if __name__=="__main__":
    try:
        raise SystemExit(main())
    except (QualifyError,OSError,subprocess.SubprocessError,UnicodeError,json.JSONDecodeError) as exc:
        print(MARKER+"_HOLD")
        print("reason="+re.sub(r"[^A-Za-z0-9_:./-]","_",str(exc)[:500]))
        print("read_only=true")
        print("filesystem_mutation=false")
        print("staging_pair_exact=false")
        print("exchange_preconditions_complete=false")
        print("fixed_source_exchange_authority=false")
        print("fixed_receipt_exchange_authority=false")
        print("runtime_cutover_authority=false")
        print("service_mutation=false")
        print("credential_wallet_signer_transaction_authority=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)