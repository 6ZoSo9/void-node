#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import stat
from typing import Any

MARKER="VOID_APOLLYON_TRAINING_BUS_ISOLATION_INSTALLED_CUSTODY_READONLY_V1"
TARGET_HOST="Xiphos"

UNIT_PATH=Path(
    "/etc/systemd/system/void-apollyon-training-bus-isolation-v1.service"
)
PREENTRY_PATH=Path(
    "/opt/void-apollyon-training-bus-isolation-v1/"
    "apollyon_training_bus_isolation_preentry_v1"
)
EXPECTED_UNIT_GIT_BLOB_SHA1="62fbabe1cf7ae0d940f5d96e19b06282f841267b"
EXPECTED_PREENTRY_SHA256=(
    "6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47"
)
EXPECTED_PREENTRY_BYTES=17352
EXPECTED_CANDIDATE_ID=(
    "apollyon_training_preentry_binary_candidate_v1:"
    "128eb2363781cacbaf9603be185af613e444cef7a40b8894cd491aa6bf8f8a56"
)
EXPECTED_LOCK_ID=(
    "apollyon_training_preentry_binary_candidate_lock_v1:"
    "d5acb7184059f2690120374f990968f0a041872e8119c555d3da21671c6d49a5"
)
EXPECTED_UNIT_MODE=0o644
EXPECTED_PREENTRY_MODE=0o755
MAX_UNIT_BYTES=64*1024
MAX_PREENTRY_BYTES=1024*1024


class Hold(RuntimeError):
    pass


def hold(reason:str)->None:
    raise Hold(reason)


def canonical(value:Any)->str:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)


def sha256(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def same_identity(a:os.stat_result,b:os.stat_result)->bool:
    return (
        a.st_dev==b.st_dev and
        a.st_ino==b.st_ino and
        a.st_uid==b.st_uid and
        a.st_gid==b.st_gid and
        a.st_mode==b.st_mode and
        a.st_nlink==b.st_nlink and
        a.st_size==b.st_size and
        getattr(a,"st_mtime_ns",None)==getattr(b,"st_mtime_ns",None) and
        getattr(a,"st_ctime_ns",None)==getattr(b,"st_ctime_ns",None)
    )


def assert_ancestor_custody(
    pathname:Path,
    *,
    owner_uid:int,
    owner_gid:int,
    trusted_root:Path,
)->list[tuple[Path,os.stat_result]]:
    absolute=Path(os.path.abspath(os.fspath(pathname)))
    root=Path(os.path.abspath(os.fspath(trusted_root)))
    if (
        absolute!=pathname or not absolute.is_absolute() or
        root!=trusted_root or not root.is_absolute()
    ):
        hold("apollyon_training_installed_custody_path_not_canonical")
    try:
        relative_parent=absolute.parent.relative_to(root)
    except ValueError as exc:
        raise Hold(
            "apollyon_training_installed_custody_path_outside_trusted_root"
        ) from exc
    current=root
    ancestors=[current]
    for part in relative_parent.parts:
        current=current/part
        ancestors.append(current)
    snapshot=[]
    for ancestor in ancestors:
        try:
            metadata=os.lstat(ancestor)
        except OSError as exc:
            raise Hold(
                "apollyon_training_installed_custody_ancestor_unreadable"
            ) from exc
        if (
            not stat.S_ISDIR(metadata.st_mode) or
            stat.S_ISLNK(metadata.st_mode) or
            metadata.st_uid!=owner_uid or
            metadata.st_gid!=owner_gid or
            stat.S_IMODE(metadata.st_mode)&0o022
        ):
            hold("apollyon_training_installed_custody_ancestor_untrusted")
        snapshot.append((ancestor,metadata))
    return snapshot


def close_descriptor(fd:int)->None:
    try:
        os.close(fd)
    except OSError as exc:
        raise Hold(
            "apollyon_training_installed_custody_descriptor_close_failed"
        ) from exc


def best_effort_close(fd:int)->None:
    try:
        os.close(fd)
    except OSError:
        pass


def revalidate_retained_file(
    pathname:Path,
    fd:int,
    expected:os.stat_result,
    ancestor_before:list[tuple[Path,os.stat_result]],
    *,
    owner_uid:int,
    owner_gid:int,
    trusted_root:Path,
)->None:
    try:
        opened=os.fstat(fd)
    except OSError as exc:
        raise Hold(
            "apollyon_training_installed_custody_descriptor_io_failed"
        ) from exc
    try:
        visible=os.lstat(pathname)
    except OSError as exc:
        raise Hold(
            "apollyon_training_installed_custody_file_rebound"
        ) from exc
    if (
        not same_identity(expected,opened) or
        not same_identity(opened,visible)
    ):
        hold("apollyon_training_installed_custody_read_identity_drift")

    ancestor_after=assert_ancestor_custody(
        pathname,
        owner_uid=owner_uid,
        owner_gid=owner_gid,
        trusted_root=trusted_root,
    )
    if len(ancestor_before)!=len(ancestor_after):
        hold("apollyon_training_installed_custody_ancestor_identity_drift")
    for (before_path,before_meta),(after_name,after_meta) in zip(
        ancestor_before,ancestor_after,
    ):
        if (
            before_path!=after_name or
            before_meta.st_dev!=after_meta.st_dev or
            before_meta.st_ino!=after_meta.st_ino or
            before_meta.st_uid!=after_meta.st_uid or
            before_meta.st_gid!=after_meta.st_gid or
            before_meta.st_mode!=after_meta.st_mode or
            before_meta.st_nlink!=after_meta.st_nlink
        ):
            hold("apollyon_training_installed_custody_ancestor_identity_drift")


def read_stable_regular_file(
    pathname:Path,
    *,
    owner_uid:int,
    owner_gid:int,
    mode:int,
    maximum_bytes:int,
    exact_bytes:int|None=None,
    trusted_root:Path=Path("/"),
)->tuple[bytes,os.stat_result,int,list[tuple[Path,os.stat_result]]]:
    ancestor_before=assert_ancestor_custody(
        pathname,
        owner_uid=owner_uid,
        owner_gid=owner_gid,
        trusted_root=trusted_root,
    )
    try:
        before=os.lstat(pathname)
    except OSError as exc:
        raise Hold("apollyon_training_installed_custody_file_unreadable") from exc
    if (
        not stat.S_ISREG(before.st_mode) or
        stat.S_ISLNK(before.st_mode) or
        before.st_uid!=owner_uid or
        before.st_gid!=owner_gid or
        before.st_nlink!=1 or
        stat.S_IMODE(before.st_mode)!=mode or
        before.st_size<1 or
        before.st_size>maximum_bytes or
        (exact_bytes is not None and before.st_size!=exact_bytes)
    ):
        hold("apollyon_training_installed_custody_file_metadata_invalid")

    try:
        fd=os.open(pathname,os.O_RDONLY|getattr(os,"O_NOFOLLOW",0))
    except OSError as exc:
        raise Hold("apollyon_training_installed_custody_file_open_failed") from exc

    try:
        try:
            opened=os.fstat(fd)
        except OSError as exc:
            raise Hold(
                "apollyon_training_installed_custody_descriptor_io_failed"
            ) from exc
        if not same_identity(before,opened):
            hold("apollyon_training_installed_custody_open_identity_drift")
        chunks=[]
        remaining=before.st_size
        while remaining:
            try:
                chunk=os.read(fd,min(remaining,64*1024))
            except OSError as exc:
                raise Hold(
                    "apollyon_training_installed_custody_descriptor_io_failed"
                ) from exc
            if not chunk:
                hold("apollyon_training_installed_custody_short_read")
            chunks.append(chunk)
            remaining-=len(chunk)
        try:
            extra=os.read(fd,1)
        except OSError as exc:
            raise Hold(
                "apollyon_training_installed_custody_descriptor_io_failed"
            ) from exc
        if extra:
            hold("apollyon_training_installed_custody_oversize_read")
        try:
            after_fd=os.fstat(fd)
        except OSError as exc:
            raise Hold(
                "apollyon_training_installed_custody_descriptor_io_failed"
            ) from exc

        try:
            after_path=os.lstat(pathname)
        except OSError as exc:
            raise Hold(
                "apollyon_training_installed_custody_file_rebound"
            ) from exc
        if (
            not same_identity(opened,after_fd) or
            not same_identity(after_fd,after_path)
        ):
            hold("apollyon_training_installed_custody_read_identity_drift")
        data=b"".join(chunks)
        if len(data)!=before.st_size:
            hold("apollyon_training_installed_custody_read_size_mismatch")
        revalidate_retained_file(
            pathname,
            fd,
            before,
            ancestor_before,
            owner_uid=owner_uid,
            owner_gid=owner_gid,
            trusted_root=trusted_root,
        )
        return data,before,fd,ancestor_before
    except BaseException:
        best_effort_close(fd)
        raise


def qualify_materials(
    unit_path:Path,
    preentry_path:Path,
    *,
    owner_uid:int,
    owner_gid:int,
    require_xiphos:bool,
    observation_scope:str,
    trusted_root:Path=Path("/"),
)->dict[str,Any]:
    if observation_scope not in {"live_installed","synthetic_fixture"}:
        hold("apollyon_training_installed_custody_observation_scope_invalid")
    if require_xiphos!=(observation_scope=="live_installed"):
        hold("apollyon_training_installed_custody_observation_scope_mismatch")
    if require_xiphos:
        try:
            hostname=socket.gethostname()
        except OSError as exc:
            raise Hold(
                "apollyon_training_installed_custody_hostname_lookup_failed"
            ) from exc
        if hostname.casefold()!=TARGET_HOST.casefold():
            hold("apollyon_training_installed_custody_wrong_host")

    unit_fd=None
    preentry_fd=None
    try:
        unit_bytes,unit_stat,unit_fd,unit_ancestors=read_stable_regular_file(
            unit_path,
            owner_uid=owner_uid,
            owner_gid=owner_gid,
            mode=EXPECTED_UNIT_MODE,
            maximum_bytes=MAX_UNIT_BYTES,
            trusted_root=trusted_root,
        )
        if git_blob_sha1(unit_bytes)!=EXPECTED_UNIT_GIT_BLOB_SHA1:
            hold("apollyon_training_installed_custody_unit_bytes_mismatch")

        preentry_bytes,preentry_stat,preentry_fd,preentry_ancestors=(
            read_stable_regular_file(
                preentry_path,
                owner_uid=owner_uid,
                owner_gid=owner_gid,
                mode=EXPECTED_PREENTRY_MODE,
                maximum_bytes=MAX_PREENTRY_BYTES,
                exact_bytes=EXPECTED_PREENTRY_BYTES,
                trusted_root=trusted_root,
            )
        )
        if sha256(preentry_bytes)!=EXPECTED_PREENTRY_SHA256:
            hold("apollyon_training_installed_custody_preentry_bytes_mismatch")
        if not preentry_bytes.startswith(b"\x7fELF"):
            hold("apollyon_training_installed_custody_preentry_not_elf")

        material={
            "marker":MARKER,
            "version":1,
            "status":(
                "installed_material_custody_observed_live_enforcement_unproven"
                if observation_scope=="live_installed"
                else "synthetic_material_custody_fixture_qualified"
            ),
            "observation_scope":observation_scope,
            "target_host":TARGET_HOST,
            "candidate_id":EXPECTED_CANDIDATE_ID,
            "candidate_lock_id":EXPECTED_LOCK_ID,
            "joint_material_identity_stable":True,
            "unit":{
                "path":os.fspath(unit_path),
                "git_blob_sha1":EXPECTED_UNIT_GIT_BLOB_SHA1,
                "bytes":len(unit_bytes),
                "owner_uid":unit_stat.st_uid,
                "owner_gid":unit_stat.st_gid,
                "mode":f"{stat.S_IMODE(unit_stat.st_mode):04o}",
                "links":unit_stat.st_nlink,
                "direct_regular":True,
                "stable_read_identity":True,
                "trusted_ancestry":True,
            },
            "preentry":{
                "path":os.fspath(preentry_path),
                "sha256":EXPECTED_PREENTRY_SHA256,
                "bytes":len(preentry_bytes),
                "owner_uid":preentry_stat.st_uid,
                "owner_gid":preentry_stat.st_gid,
                "mode":f"{stat.S_IMODE(preentry_stat.st_mode):04o}",
                "links":preentry_stat.st_nlink,
                "direct_regular":True,
                "elf_magic_verified":True,
                "stable_read_identity":True,
                "trusted_ancestry":True,
            },
            "synthetic_fixture_unit_identity_observed":
                observation_scope=="synthetic_fixture",
            "synthetic_fixture_preentry_binary_identity_observed":
                observation_scope=="synthetic_fixture",
            "installed_unit_identity_observed":
                observation_scope=="live_installed",
            "installed_preentry_binary_identity_observed":
                observation_scope=="live_installed",
            "installed_unit_identity_proven":False,
            "installed_preentry_binary_identity_proven":False,
            "trusted_observer_proven":False,
            "dynamic_runtime_closure_proven":False,
            "training_entrypoint_identity_proven":False,
            "live_systemd_enforcement_proven":False,
            "inherited_system_bus_descriptor_absence_proven":False,
            "absolute_runtime_service_control_denial_proven":False,
            "canonical_installed_qualification_complete":False,
            "host_mutation_performed":False,
            "service_action_performed":False,
            "training_execution_performed":False,
            "attempt_claimed":False,
            "wallet_access_performed":False,
            "transaction_signing_performed":False,
            "funds_movement_performed":False,
            "remaining_requirements":[
                "trusted_live_observer_execution",
                "reviewed_training_entrypoint_identity",
                "dynamic_runtime_closure",
                "pid1_systemd_generation",
                "dedicated_training_cgroup_identity",
                "live_descriptor_isolation_enforcement",
            ],
            "next_gate":"installed_apollyon_training_bus_isolation_qualification_v1",
        }
        result={
            **material,
            "observation_id":
                "apollyon_training_installed_custody_v1:"+
                sha256(canonical(material).encode("utf-8")),
        }

        # Both retained descriptors and both visible paths/ancestor chains must
        # still match the exact bytes whose hashes were admitted above.
        revalidate_retained_file(
            unit_path,
            unit_fd,
            unit_stat,
            unit_ancestors,
            owner_uid=owner_uid,
            owner_gid=owner_gid,
            trusted_root=trusted_root,
        )
        revalidate_retained_file(
            preentry_path,
            preentry_fd,
            preentry_stat,
            preentry_ancestors,
            owner_uid=owner_uid,
            owner_gid=owner_gid,
            trusted_root=trusted_root,
        )
        return result
    finally:
        if preentry_fd is not None:
            close_descriptor(preentry_fd)
        if unit_fd is not None:
            close_descriptor(unit_fd)


def live_observe()->dict[str,Any]:
    return qualify_materials(
        UNIT_PATH,
        PREENTRY_PATH,
        owner_uid=0,
        owner_gid=0,
        require_xiphos=True,
        observation_scope="live_installed",
    )


def self_test()->None:
    if EXPECTED_PREENTRY_BYTES<4096 or EXPECTED_PREENTRY_BYTES>MAX_PREENTRY_BYTES:
        raise AssertionError("preentry byte bound invalid")
    if len(EXPECTED_PREENTRY_SHA256)!=64:
        raise AssertionError("preentry hash malformed")
    if len(EXPECTED_UNIT_GIT_BLOB_SHA1)!=40:
        raise AssertionError("unit Git blob malformed")
    if not EXPECTED_LOCK_ID.startswith(
        "apollyon_training_preentry_binary_candidate_lock_v1:"
    ):
        raise AssertionError("lock identity malformed")
    print(MARKER+"_SELF_TEST=GREEN")
    print("read_only=true")
    print("host_mutation=false")
    print("service_action=false")
    print("training_execution=false")
    print("installed_unit_identity_proven_by_self_test=false")
    print("installed_preentry_binary_identity_proven_by_self_test=false")
    print("canonical_installed_qualification_complete=false")


def main()->int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--self-test",action="store_true")
    parser.add_argument("--observe",action="store_true")
    args=parser.parse_args()
    if args.self_test==args.observe:
        parser.error("choose exactly one of --self-test or --observe")
    if args.self_test:
        self_test()
        return 0
    try:
        result=live_observe()
    except Hold as exc:
        print("HOLD="+str(exc),file=os.sys.stderr)
        print("read_only=true",file=os.sys.stderr)
        print("host_mutation=false",file=os.sys.stderr)
        print("service_action=false",file=os.sys.stderr)
        print("training_execution=false",file=os.sys.stderr)
        return 2
    print(canonical(result))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
