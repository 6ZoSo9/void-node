#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
from typing import Any

MARKER="VOID_APOLLYON_V2_INSTALLED_LAUNCHER_V1"
FIXED_LAUNCHER=Path(
    "/opt/void-apollyon-custody-v2-preentry-v1/"
    "apollyon_v2_installed_live_launcher_v1.py"
)
INSTALLED_SOURCE_ROOT=Path("/opt/void-apollyon-custody-v2-reviewed-v1")
RUN_PARENT=Path("/run")
NODE=Path("/usr/bin/node")
RUNNER_REL="tools/apollyon-designated-host-custody-live-qualification-v2.mjs"
REVIEWED_FILES={
    RUNNER_REL:"abb68e12cbd13bedfa7bf598b50b0a96709d898b",
    "ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py":
        "06e110108c74c450074ed6500ac7f7458f49b5aa",
    "tools/apollyon-custody-host-policy-qualification-v1.mjs":
        "6f34e79d94c502e31ca4923fd78922d4875550a5",
    "tools/apollyon-custody-host-policy-qualification-v2.mjs":
        "623cc8fd8b0726d96e3773d1f7c5e97b15d99a74",
    "tools/apollyon-authorization-custody-core-v1.mjs":
        "f9f18db5bbfeea466202ef0d7babe08c3c401d66",
    "tools/apollyon-authorization-custody-service-v1.mjs":
        "8961572ba5834371b1229f790a1960940fc74935",
    "tools/apollyon-authorization-custody-client-v1.mjs":
        "fb31dbbda76c94f0ad08e38094c151a24a78b486",
}
MAX_FILE_BYTES=2*1024*1024
FORBIDDEN_ENV=(
    "NODE_OPTIONS","NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH",
    "PYTHONPATH","PYTHONSTARTUP",
)


class Hold(RuntimeError):
    pass


def hold(reason:str)->None:
    raise Hold(reason)


def git_blob_sha1(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def same_identity(a:os.stat_result,b:os.stat_result)->bool:
    return (
        a.st_dev==b.st_dev and a.st_ino==b.st_ino and
        a.st_uid==b.st_uid and a.st_gid==b.st_gid and
        a.st_mode==b.st_mode and a.st_nlink==b.st_nlink and
        a.st_size==b.st_size and
        getattr(a,"st_mtime_ns",None)==getattr(b,"st_mtime_ns",None) and
        getattr(a,"st_ctime_ns",None)==getattr(b,"st_ctime_ns",None)
    )


def assert_direct_ancestors(pathname:Path,*,root_owned:bool)->None:
    absolute=Path(os.path.abspath(os.fspath(pathname)))
    parts=absolute.parts
    current=Path(parts[0])
    for part in parts[1:]:
        current=current/part
        metadata=os.lstat(current)
        if stat.S_ISLNK(metadata.st_mode):
            hold("apollyon_v2_installed_launcher_symlink_ancestor")
        if current!=absolute and not stat.S_ISDIR(metadata.st_mode):
            hold("apollyon_v2_installed_launcher_ancestor_not_directory")
        if root_owned and (
            metadata.st_uid!=0 or stat.S_IMODE(metadata.st_mode)&0o022
        ):
            hold("apollyon_v2_installed_launcher_untrusted_ancestor")


def read_reviewed_file(
    source_root:Path,
    relative:str,
    expected_blob:str,
    *,
    require_root_custody:bool,
)->bytes:
    root=Path(os.path.abspath(os.fspath(source_root)))
    target=root/Path(relative)
    if target!=Path(os.path.abspath(os.fspath(target))):
        hold("apollyon_v2_installed_launcher_source_path_invalid")
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise Hold("apollyon_v2_installed_launcher_source_escape") from exc

    assert_direct_ancestors(target,root_owned=require_root_custody)
    before=os.lstat(target)
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_nlink!=1 or before.st_size<1 or before.st_size>MAX_FILE_BYTES
    ):
        hold("apollyon_v2_installed_launcher_source_file_invalid")
    if require_root_custody and (
        before.st_uid!=0 or stat.S_IMODE(before.st_mode)&0o022
    ):
        hold("apollyon_v2_installed_launcher_source_file_untrusted")

    flags=os.O_RDONLY|getattr(os,"O_NOFOLLOW",0)
    fd=os.open(target,flags)
    try:
        opened=os.fstat(fd)
        if not same_identity(before,opened):
            hold("apollyon_v2_installed_launcher_source_open_drift")
        data=os.read(fd,before.st_size+1)
        after=os.fstat(fd)
        visible=os.lstat(target)
        if (
            len(data)!=before.st_size or not same_identity(opened,after) or
            not same_identity(after,visible)
        ):
            hold("apollyon_v2_installed_launcher_source_read_drift")
    finally:
        os.close(fd)

    if git_blob_sha1(data)!=expected_blob:
        hold("apollyon_v2_installed_launcher_source_blob_mismatch:"+relative)
    return data


def fsync_directory(pathname:Path)->None:
    fd=os.open(pathname,os.O_RDONLY|getattr(os,"O_DIRECTORY",0))
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def write_private_file(root:Path,relative:str,data:bytes,expected_blob:str)->Path:
    target=root/Path(relative)
    target.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    cursor=root
    for part in Path(relative).parts[:-1]:
        cursor=cursor/part
        os.chmod(cursor,0o700)
    fd=os.open(
        target,
        os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,"O_NOFOLLOW",0),
        0o400,
    )
    try:
        total=0
        while total<len(data):
            total+=os.write(fd,data[total:])
        os.fsync(fd)
        os.fchmod(fd,0o400)
    finally:
        os.close(fd)
    if git_blob_sha1(target.read_bytes())!=expected_blob:
        hold("apollyon_v2_installed_launcher_private_blob_mismatch:"+relative)
    fsync_directory(target.parent)
    return target


def materialize_reviewed_closure(
    source_root:Path,
    target_parent:Path,
    *,
    require_root_custody:bool,
)->Path:
    source_root=Path(os.path.abspath(os.fspath(source_root)))
    target_parent=Path(os.path.abspath(os.fspath(target_parent)))
    if require_root_custody:
        assert_direct_ancestors(source_root,root_owned=True)
        root_meta=os.lstat(source_root)
        if (
            not stat.S_ISDIR(root_meta.st_mode) or root_meta.st_uid!=0 or
            stat.S_IMODE(root_meta.st_mode)&0o022
        ):
            hold("apollyon_v2_installed_launcher_source_root_untrusted")
    materials:dict[str,bytes]={}
    try:
        for relative,expected in REVIEWED_FILES.items():
            materials[relative]=read_reviewed_file(
                source_root,relative,expected,
                require_root_custody=require_root_custody,
            )
        private_root=Path(tempfile.mkdtemp(
            prefix=".void-apollyon-v2-live-",
            dir=target_parent,
        ))
        os.chmod(private_root,0o700)
        for relative,expected in REVIEWED_FILES.items():
            write_private_file(private_root,relative,materials[relative],expected)
        fsync_directory(private_root)
        return private_root
    finally:
        for key,data in list(materials.items()):
            materials[key]=b"\0"*len(data)


def assert_installed_launcher_identity()->None:
    current=Path(os.path.abspath(__file__))
    if current!=FIXED_LAUNCHER:
        hold("apollyon_v2_installed_launcher_fixed_path_required")
    assert_direct_ancestors(current,root_owned=True)
    metadata=os.lstat(current)
    if (
        not stat.S_ISREG(metadata.st_mode) or stat.S_ISLNK(metadata.st_mode) or
        metadata.st_uid!=0 or metadata.st_nlink!=1 or
        stat.S_IMODE(metadata.st_mode)&0o022
    ):
        hold("apollyon_v2_installed_launcher_identity_untrusted")


def sanitized_environment()->dict[str,str]:
    for key in FORBIDDEN_ENV:
        if os.environ.get(key):
            hold("apollyon_v2_installed_launcher_loader_environment_forbidden")
    return {
        "PATH":"/usr/sbin:/usr/bin:/sbin:/bin",
        "LC_ALL":"C",
        "VOID_APOLLYON_V2_INSTALLED_LAUNCHER":MARKER,
    }


def execute_live(argv:list[str])->int:
    if os.geteuid()!=0:
        hold("apollyon_v2_installed_launcher_root_required")
    assert_installed_launcher_identity()
    if not NODE.exists() or NODE.is_symlink():
        hold("apollyon_v2_installed_launcher_node_invalid")
    private_root=materialize_reviewed_closure(
        INSTALLED_SOURCE_ROOT,RUN_PARENT,require_root_custody=True,
    )
    try:
        runner=private_root/RUNNER_REL
        completed=subprocess.run(
            [os.fspath(NODE),os.fspath(runner),*argv],
            env=sanitized_environment(),
            check=False,
            timeout=60,
        )
        return completed.returncode
    finally:
        shutil.rmtree(private_root)


def self_test()->None:
    repo_root=Path(__file__).resolve().parents[2]
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-v2-launcher-test-"
    ) as td:
        top=Path(td)
        source=top/"source"
        source.mkdir(mode=0o700)
        for relative in REVIEWED_FILES:
            target=source/relative
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes((repo_root/relative).read_bytes())

        # Modified source is rejected before Node can evaluate it.
        runner=source/RUNNER_REL
        marker=top/"pre-entry-sentinel"
        runner.write_text(
            'import fs from "node:fs";'
            f'fs.writeFileSync({marker.as_posix()!r},"ran");\n',
            encoding="utf-8",
        )
        try:
            materialize_reviewed_closure(
                source,top,require_root_custody=False,
            )
        except Hold as exc:
            if "source_blob_mismatch" not in str(exc):
                raise
        else:
            raise AssertionError("modified runner unexpectedly admitted")
        if marker.exists():
            raise AssertionError("modified runner executed before HOLD")

        # After preparation, replacing the source cannot redirect execution.
        runner.write_bytes((repo_root/RUNNER_REL).read_bytes())
        prepared=materialize_reviewed_closure(
            source,top,require_root_custody=False,
        )
        try:
            marker2=top/"post-prepare-sentinel"
            runner.write_text(
                'import fs from "node:fs";'
                f'fs.writeFileSync({marker2.as_posix()!r},"ran");\n',
                encoding="utf-8",
            )
            result=subprocess.run(
                [os.fspath(NODE),os.fspath(prepared/RUNNER_REL),"--self-test"],
                env={
                    "PATH":"/usr/sbin:/usr/bin:/sbin:/bin",
                    "LC_ALL":"C",
                    "VOID_APOLLYON_V2_INSTALLED_LAUNCHER":MARKER,
                },
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
                timeout=30,
            )
            if result.returncode!=0:
                raise AssertionError(
                    "prepared runner self-test failed: "+result.stderr[-1000:]
                )
            if (
                "VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V2_SELF_TEST=GREEN"
                not in result.stdout
            ):
                raise AssertionError("prepared runner green marker missing")
            if marker2.exists():
                raise AssertionError("post-prepare source replacement executed")
        finally:
            shutil.rmtree(prepared)

    print(MARKER+"_SELF_TEST=GREEN")
    print("modified_runner_rejected_before_node=true")
    print("post_prepare_source_replacement_inert=true")
    print("live_worktree_invocation_supported=false")
    print("attempt_claim=false")
    print("training_execution=false")


def main()->int:
    if sys.argv[1:]==["--self-test"]:
        self_test()
        return 0
    return execute_live(sys.argv[1:])


if __name__=="__main__":
    try:
        raise SystemExit(main())
    except Hold as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("host_observation_read_only=true",file=sys.stderr)
        print("temporary_filesystem_write=true",file=sys.stderr)
        print("persistent_host_mutation=false",file=sys.stderr)
        print("service_action=false",file=sys.stderr)
        print("attempt_claim=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr)
        raise SystemExit(2)
