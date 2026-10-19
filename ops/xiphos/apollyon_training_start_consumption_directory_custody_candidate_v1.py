#!/usr/bin/env python3
"""Read-only, synthetic-fixture precursor to Xiphos store origin qualification.

NEVER issues a writer capability. No live-host read entrypoint is available.
"""
from __future__ import annotations

import sys

# Fail closed before importing checkout-resolved Python modules. The caller
# must also enforce a trusted interpreter *startup*; a script guard cannot
# prevent pre-entry sitecustomize/.pth execution in an unisolated interpreter.
if not (
    sys.flags.isolated == 1
    and sys.flags.ignore_environment == 1
    and sys.flags.no_user_site == 1
    and sys.flags.dont_write_bytecode == 1
    and sys.flags.safe_path == 1
):
    print("HOLD=isolated_python_required", file=sys.stderr)
    raise SystemExit(2)

import argparse
import errno
import hashlib
import json
import os
from pathlib import Path
import stat
from typing import Any

MARKER = "VOID_APOLLYON_TRAINING_START_CONSUMPTION_DIRECTORY_CUSTODY_CANDIDATE_V1"
FIXED_ROOT = "/var/lib/void-apollyon-attempt-claim-v2"
CONSUMPTION_LEAF = "training-start-consumption-v1"
DIR_FLAGS = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK


class Hold(RuntimeError):
    pass


def hold(code: str) -> None:
    raise Hold(code)


def same_inode(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev, a.st_ino, a.st_mode, a.st_uid, a.st_gid,
        a.st_nlink, a.st_mtime_ns, a.st_ctime_ns,
    ) == (
        b.st_dev, b.st_ino, b.st_mode, b.st_uid, b.st_gid,
        b.st_nlink, b.st_mtime_ns, b.st_ctime_ns,
    )


def identity(row: os.stat_result) -> dict[str, int]:
    return {
        "device": row.st_dev,
        "inode": row.st_ino,
        "uid": row.st_uid,
        "gid": row.st_gid,
        "mode": stat.S_IMODE(row.st_mode),
    }


def close_once(fd: int, reason: str) -> None:
    try:
        os.close(fd)
    except OSError as exc:
        # Linux close(2) error does not establish whether FD remains open.
        # Never retry an indeterminate close and never report success.
        raise Hold(reason) from exc


def require_no_extended_acl(fd: int, label: str) -> None:
    # Both access and default POSIX ACLs are authority-bearing directory state.
    # A default ACL can alter the ACL inherited by future children even when
    # the directory's own mode is 0700, so custody requires absence of both.
    for name in ("system.posix_acl_access", "system.posix_acl_default"):
        try:
            os.getxattr(fd, name)
        except OSError as exc:
            if exc.errno == errno.ENODATA:
                continue
            raise Hold(label + "_acl_check_unavailable") from exc
        hold(label + "_extended_acl_present")


def require_private_directory(
    row: os.stat_result, uid: int, gid: int, label: str
) -> None:
    if (
        not stat.S_ISDIR(row.st_mode)
        or row.st_uid != uid
        or row.st_gid != gid
        or stat.S_IMODE(row.st_mode) != 0o700
        or row.st_nlink < 2
    ):
        hold(label + "_metadata_invalid")


def root_fixture_path(raw: Path) -> tuple[str, list[str]]:
    candidate = os.fspath(raw)
    if not isinstance(candidate, str) or not candidate.startswith("/"):
        hold("fixture_root_must_be_absolute")
    if candidate == FIXED_ROOT or candidate.startswith(FIXED_ROOT + "/"):
        hold("fixture_production_root_forbidden")
    parts = candidate.split("/")
    if (
        len(parts) < 3
        or any(x in ("", ".", "..") for x in parts[1:])
        or candidate != os.path.abspath(candidate)
    ):
        hold("fixture_root_path_invalid")
    # A pathname that merely differs from FIXED_ROOT is not a disposable
    # fixture. Deny unrelated host roots before the first os.open/stat.
    # This is a test-namespace restriction, NOT proof of host mount custody.
    if (
        len(parts) < 4
        or parts[1] != "tmp"
        or not parts[2].startswith("apollyon-")
    ):
        hold("fixture_root_outside_disposable_namespace")
    return candidate, parts[1:]


def open_fixture_root(
    root: Path, uid: int, gid: int, trusted_ancestors: bool
) -> tuple[int, os.stat_result]:
    _, components = root_fixture_path(root)
    current = os.open("/", DIR_FLAGS)
    try:
        for index, component in enumerate(components):
            before = os.stat(component, dir_fd=current, follow_symlinks=False)
            if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
                hold("fixture_ancestor_not_direct_directory")
            child = os.open(component, DIR_FLAGS, dir_fd=current)
            try:
                opened = os.fstat(child)
                visible = os.stat(component, dir_fd=current, follow_symlinks=False)
                if not (same_inode(before, opened) and same_inode(opened, visible)):
                    hold("fixture_root_component_changed")
                final = index == len(components) - 1
                if final:
                    require_private_directory(opened, uid, gid, "fixture_root")
                    require_no_extended_acl(child, "fixture_root")
                elif trusted_ancestors:
                    if (
                        opened.st_uid != 0
                        or opened.st_gid != 0
                        or stat.S_IMODE(opened.st_mode) & 0o022
                    ):
                        hold("fixture_ancestor_custody_untrusted")
                    require_no_extended_acl(child, "fixture_ancestor")
            except BaseException:
                close_once(child, "fixture_rejected_child_close_uncertain")
                raise
            previous = current
            current = child
            close_once(previous, "fixture_prior_parent_close_uncertain")
        return current, os.fstat(current)
    except BaseException:
        close_once(current, "fixture_traversal_close_uncertain")
        raise


def observe_fixture_only(
    root_path: Path,
    *,
    uid: int,
    gid: int,
    trusted_ancestors: bool = False,
) -> dict[str, Any]:
    """Inspect only a disposable/nonproduction root, close all FDs, deny authority."""
    if os.name != "posix" or not sys.platform.startswith("linux"):
        hold("linux_required")
    if (
        type(uid) is not int or type(gid) is not int
        or uid <= 0 or gid <= 0
        or uid != os.geteuid() or gid != os.getegid()
    ):
        hold("fixture_owner_identity_invalid")
    fixed_path, _ = root_fixture_path(root_path)
    root_fd, root_initial = open_fixture_root(root_path, uid, gid, trusted_ancestors)
    child_fd = -1
    try:
        before = os.stat(CONSUMPTION_LEAF, dir_fd=root_fd, follow_symlinks=False)
        if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
            hold("consumption_directory_not_direct")
        child_fd = os.open(CONSUMPTION_LEAF, DIR_FLAGS, dir_fd=root_fd)
        opened = os.fstat(child_fd)
        visible = os.stat(CONSUMPTION_LEAF, dir_fd=root_fd, follow_symlinks=False)
        if not (same_inode(before, opened) and same_inode(opened, visible)):
            hold("consumption_directory_generation_changed")
        require_private_directory(opened, uid, gid, "consumption_directory")
        require_no_extended_acl(child_fd, "consumption_directory")

        final_fd = os.fstat(child_fd)
        final_visible = os.stat(
            CONSUMPTION_LEAF, dir_fd=root_fd, follow_symlinks=False
        )
        final_root = os.fstat(root_fd)
        final_root_visible = os.stat(fixed_path, follow_symlinks=False)
        if not (
            same_inode(opened, final_fd)
            and same_inode(final_fd, final_visible)
            and same_inode(root_initial, final_root)
            and same_inode(final_root, final_root_visible)
        ):
            hold("consumption_directory_final_generation_changed")

        # No descriptor escapes. This is fixture custody evidence only,
        # never a protected Xiphos store observation or writer admission.
        material = {
            "marker": MARKER,
            "version": 1,
            "status": "fixture_directory_custody_observed_no_host_authority",
            "target_host": "Xiphos",
            "fixture_only": True,
            "synthetic_root": fixed_path,
            "fixed_claim_state_root": FIXED_ROOT,
            "fixed_consumption_directory": FIXED_ROOT + "/" + CONSUMPTION_LEAF,
            "directory_leaf": CONSUMPTION_LEAF,
            "fixture_root_identity": identity(final_root),
            "fixture_consumption_directory_identity": identity(final_fd),
            "fixture_descriptor_stable": True,
            "fixture_visible_generation_stable": True,
            "trusted_ancestor_custody_proven": trusted_ancestors,
            "protected_store_origin_proven": False,
            "current_store_generation_revalidation_performed": False,
            "generation_lineage_revalidation_performed": False,
            "authorization_winner_reread_performed": False,
            "durable_claim_record_reread_performed": False,
            "consumption_slot_classification_performed": False,
            "writer_directory_capability_origin_proven": False,
            "writer_invocation_authorized": False,
            "consumption_publication_authorized": False,
            "trainer_release_authorized": False,
            "training_execution_authorized": False,
            "credential_access": False,
            "signing": False,
            "transaction": False,
            "funds_movement": False,
            "next_gate": "apollyon_training_start_protected_store_revalidator_v1",
        }
        serialized = json.dumps(material, sort_keys=True, separators=(",", ":"))
        return {
            **material,
            "fixture_custody_receipt_id":
                "apollyon_consumption_directory_fixture_custody_v1:"
                + hashlib.sha256(serialized.encode("utf-8")).hexdigest(),
        }
    except OSError as exc:
        raise Hold("fixture_host_io_failed") from exc
    finally:
        # Do not let a close error mask an uncertain descriptor as "success".
        # Both descriptors are attempted once, even when the first close fails.
        first = None
        for fd in (child_fd, root_fd):
            if fd < 0:
                continue
            try:
                close_once(fd, "fixture_directory_close_uncertain")
            except Hold as exc:
                if first is None:
                    first = exc
        if first is not None:
            raise first


def self_test() -> None:
    if not (FIXED_ROOT.startswith("/var/lib/") and CONSUMPTION_LEAF == "training-start-consumption-v1"):
        hold("fixed_root_contract_invalid")
    for value in (
        MARKER + "_SELF_TEST_GREEN",
        "fixture_only=true",
        "live_host_path_read_supported=false",
        "protected_store_origin_proven=false",
        "writer_invocation_authorized=false",
        "training_execution_authorized=false",
        "funds_movement=false",
    ):
        print(value)


def main() -> int:
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--self-test", action="store_true")
    modes.add_argument("--live-read", action="store_true")
    args = parser.parse_args()
    if args.live_read:
        # Refuse before opening *any* host path.
        print("HOLD=installed_host_origin_not_authorized", file=sys.stderr)
        return 2
    self_test()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
