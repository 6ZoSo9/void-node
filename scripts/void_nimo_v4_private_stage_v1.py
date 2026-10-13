#!/usr/bin/env python3
"""Plan, privately stage, or inspect the exact inactive Nimo V4 witness bundle.

Production installation is intentionally out of scope. Public --stage writes
only a fresh user-owned private directory under the invoking user's home.
"""
from __future__ import annotations

import argparse
import ctypes
import errno
import secrets
import hashlib
import io
import json
import os
from pathlib import Path
import pwd
import stat
import sys
import tarfile
import tempfile

MARKER = "VOID_NIMO_V4_PRIVATE_STAGE_V1"
ARCHIVE_BYTES = 266240
ARCHIVE_SHA256 = "6bb01af17cc87dfb42b63942143458f3e95990d8ae1ef6c1671fc5cd7d4feaf8"
CANDIDATE_ID = "voidwfb4_b5d9516e5fa462ca7ed2333ebe3ef715eaf62ecdd3c0a6b049ecc9eb1e1659c2"
PREFIX = "inactive-v4-candidate/"
STAGE_NAME = "void-nimo-v4-inactive-review-20261011"
R = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW
RD = R | os.O_DIRECTORY

RUNTIME = (
    ("tools/void-buy-allocation-custody-witness-forced-command-v2.mjs", 48914,
     "88f425986eff8597cdf6725e4608b3790aed2359fef6ae9fadb76292d9e5a26d"),
    ("dist/economic/buy_void_allocation_custody_external_witness_v1.js", 35821,
     "35d80f00a9ec0ce57bb457596d27e8c86a70d76efe310372e1fff796a92d43ca"),
    ("dist/economic/buy_void_allocation_custody_witness_transport_v1.js", 35066,
     "8e03107d1545977a19b847bbec926543b9812b6d9c16a4d7e13e62cf5c790979"),
    ("dist/economic/buy_void_allocation_reservation_high_water_v1.js", 12251,
     "1999015c9e0770a5a94b3b4d29f5aa6a47036406754673adb2ed5829c5e406e9"),
    ("dist/economic/buy_void_allocation_reservation_ledger_v1.js", 47309,
     "51de81388631ecef2a8c3feea68960040ccbda75fd29ada171cb9c9c7b53188a"),
    ("dist/economic/buy_void_auto_fulfillment_v1.js", 26226,
     "119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c"),
    ("dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js", 21165,
     "0b4dd188dbbf7658542b1d20c521227fa1fc01d7d79e89a713863b771380da13"),
    ("dist/economic/buy_void_filesystem_bakery_lock_v1.js", 18018,
     "7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994"),
)
RUNTIME_MAP = {p: (n, h) for p, n, h in RUNTIME}
ARCHIVE_NAMES = {
    PREFIX + "review/proposed-v2-lock.json",
    PREFIX + "review/manifest.json",
    *[PREFIX + "payload/" + p for p, _, _ in RUNTIME],
}


def hold(reason: str) -> None:
    raise ValueError("nimo_v4_private_stage_" + reason)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def exact_file(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev, a.st_ino, a.st_uid, a.st_gid, a.st_mode, a.st_nlink,
        a.st_size, a.st_mtime_ns, a.st_ctime_ns
    ) == (
        b.st_dev, b.st_ino, b.st_uid, b.st_gid, b.st_mode, b.st_nlink,
        b.st_size, b.st_mtime_ns, b.st_ctime_ns
    )


def require_unprivileged() -> None:
    if os.name != "posix" or not hasattr(os, "pread") or os.getuid() < 1:
        hold("unprivileged_posix_required")
    if os.geteuid() != os.getuid():
        hold("setuid_forbidden")


def read_archive(path: str) -> dict[str, bytes]:
    if not isinstance(path, str) or not os.path.isabs(path) or "\x00" in path:
        hold("archive_path_invalid")
    if os.path.normpath(path) != path or "//" in path:
        hold("archive_path_not_canonical")
    visible = os.lstat(path)
    if (
        not stat.S_ISREG(visible.st_mode)
        or visible.st_nlink != 1
        or visible.st_uid != os.getuid()
        or visible.st_size != ARCHIVE_BYTES
        or (visible.st_mode & 0o022)
    ):
        hold("archive_visible_metadata_invalid")
    fd = os.open(path, R | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if not exact_file(visible, opened) or not stat.S_ISREG(opened.st_mode):
            hold("archive_descriptor_changed")
        raw = os.pread(fd, ARCHIVE_BYTES + 1, 0)
        after = os.fstat(fd)
        now = os.lstat(path)
        if len(raw) != ARCHIVE_BYTES or not exact_file(opened, after) or not exact_file(after, now):
            hold("archive_read_window_changed")
        if digest(raw) != ARCHIVE_SHA256:
            hold("archive_exact_wire_sha256_mismatch")
    finally:
        os.close(fd)

    values: dict[str, bytes] = {}
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as archive:
        for member in archive:
            if len(values) >= len(ARCHIVE_NAMES):
                hold("archive_member_count_exceeded")
            if (
                member.name not in ARCHIVE_NAMES
                or member.name in values
                or not member.isfile()
                or member.uid != 0
                or member.gid != 0
                or member.mode != 0o444
                or member.mtime != 0
            ):
                hold("archive_member_metadata_invalid")
            handle = archive.extractfile(member)
            if handle is None:
                hold("archive_member_missing")
            data = handle.read(member.size + 1)
            if len(data) != member.size:
                hold("archive_member_size_invalid")
            values[member.name] = data
    if set(values) != ARCHIVE_NAMES:
        hold("archive_member_set_invalid")
    payload: dict[str, bytes] = {}
    for rel, expected_bytes, expected_sha in RUNTIME:
        data = values[PREFIX + "payload/" + rel]
        if len(data) != expected_bytes or digest(data) != expected_sha:
            hold("archive_payload_invalid:" + rel)
        payload[rel] = data
    return payload


def open_private_parent(parent: str) -> tuple[int, os.stat_result]:
    visible = os.lstat(parent)
    if (
        not stat.S_ISDIR(visible.st_mode)
        or stat.S_ISLNK(visible.st_mode)
        or visible.st_uid != os.getuid()
        or (visible.st_mode & 0o022)
    ):
        hold("parent_owner_or_mode_invalid")
    fd = os.open(parent, RD)
    opened = os.fstat(fd)
    if not exact_file(visible, opened):
        os.close(fd)
        hold("parent_rebound")
    return fd, opened


def verify_stage_visible(parentfd: int, stagefd: int, name: str = STAGE_NAME) -> None:
    opened = os.fstat(stagefd)
    visible = os.stat(name, dir_fd=parentfd, follow_symlinks=False)
    if (
        not stat.S_ISDIR(visible.st_mode)
        or stat.S_ISLNK(visible.st_mode)
        or visible.st_uid != os.getuid()
        or (visible.st_mode & 0o7777) != 0o700
        or not exact_file(opened, visible)
    ):
        hold("stage_root_rebound")


def open_or_create_dir(parentfd: int, name: str) -> tuple[int, bool]:
    if not name or "/" in name or name in (".", ".."):
        hold("directory_component_invalid")
    created = False
    try:
        os.mkdir(name, 0o700, dir_fd=parentfd)
        created = True
        os.fsync(parentfd)
    except FileExistsError:
        pass
    fd = os.open(name, RD, dir_fd=parentfd)
    st = os.fstat(fd)
    if st.st_uid != os.getuid() or (st.st_mode & 0o7777) != 0o700:
        os.close(fd)
        hold("private_directory_invalid")
    return fd, created


def write_payload(rootfd: int, rel: str, data: bytes) -> None:
    parts = rel.split("/")
    current = os.dup(rootfd)
    try:
        for part in parts[:-1]:
            nxt, _ = open_or_create_dir(current, part)
            os.close(current)
            current = nxt
        flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_CLOEXEC | os.O_NOFOLLOW
        fd = os.open(parts[-1], flags, 0o400, dir_fd=current)
        try:
            offset = 0
            while offset < len(data):
                wrote = os.write(fd, data[offset:])
                if wrote <= 0:
                    hold("short_write")
                offset += wrote
            os.fsync(fd)
            st = os.fstat(fd)
            if (
                not stat.S_ISREG(st.st_mode)
                or st.st_uid != os.getuid()
                or st.st_nlink != 1
                or (st.st_mode & 0o7777) != 0o400
                or st.st_size != len(data)
            ):
                hold("staged_file_metadata_invalid")
        finally:
            os.close(fd)
        os.fsync(current)
    finally:
        os.close(current)


def expected_tree() -> dict:
    root: dict = {}
    for rel, _, _ in RUNTIME:
        cursor = root
        parts = rel.split("/")
        for part in parts[:-1]:
            cursor = cursor.setdefault(part, {})
        cursor[parts[-1]] = None
    return root


def inspect_tree(fd: int, tree: dict, prefix: str = "") -> int:
    # Keep descriptors open until inspection ends. A final identity pass
    # alone is not a snapshot: an early leaf can be replaced while a later
    # entry is rechecked. Linux inotify observes modifications in every
    # opened parent directory throughout BOTH passes. A watcher loss/overflow
    # or any event is a HOLD, never acceptance of a possibly changed tree.
    if sys.platform != "linux":
        hold("stage_watch_linux_required")
    libc = ctypes.CDLL(None, use_errno=True)
    init = getattr(libc, "inotify_init1", None)
    add = getattr(libc, "inotify_add_watch", None)
    if init is None or add is None:
        hold("stage_watch_unavailable")
    init.argtypes = [ctypes.c_int]
    init.restype = ctypes.c_int
    add.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    add.restype = ctypes.c_int
    watchfd = init(os.O_NONBLOCK | os.O_CLOEXEC)
    if watchfd < 0:
        hold("stage_watch_unavailable")
    # All modifications, metadata changes, entry rebinding, and watch loss
    # are relevant. Kernel queue overflow is also delivered and must HOLD.
    watch_mask = (0x0002 | 0x0004 | 0x0008 | 0x0040 | 0x0080 |
                  0x0100 | 0x0200 | 0x0400 | 0x0800)
    retained = []

    def watch_directory(dirfd: int) -> None:
        # /proc/self/fd pins the already validated directory inode, not
        # a pathname re-resolved after an attacker-controlled rename.
        procfd = os.fsencode("/proc/self/fd/" + str(dirfd))
        if add(watchfd, procfd, watch_mask) < 0:
            hold("stage_watch_add_failed")

    def walk(curfd: int, expected: dict, relative: str) -> int:
        initial = set(os.listdir(curfd))
        if initial != set(expected):
            hold("stage_extra_or_missing_entries")
        count = 0
        for name, child in expected.items():
            visible = os.stat(name, dir_fd=curfd, follow_symlinks=False)
            rel = relative + name
            if child is None:
                if (
                    not stat.S_ISREG(visible.st_mode)
                    or visible.st_uid != os.getuid()
                    or visible.st_nlink != 1
                    or (visible.st_mode & 0o7777) != 0o400
                ):
                    hold("stage_file_identity_invalid")
                expected_bytes, expected_sha = RUNTIME_MAP[rel]
                opened_fd = os.open(name, R, dir_fd=curfd)
                held = False
                try:
                    opened = os.fstat(opened_fd)
                    if not exact_file(visible, opened):
                        hold("stage_file_rebound:" + rel)
                    raw = os.pread(opened_fd, expected_bytes + 1, 0)
                    after = os.fstat(opened_fd)
                    still_visible = os.stat(
                        name, dir_fd=curfd, follow_symlinks=False,
                    )
                    if (not exact_file(opened, after)
                            or not exact_file(after, still_visible)):
                        hold("stage_file_rebound:" + rel)
                    if len(raw) != expected_bytes or digest(raw) != expected_sha:
                        hold("stage_file_content_invalid:" + rel)
                    retained.append((curfd, name, opened_fd, after, "file:" + rel))
                    held = True
                finally:
                    if not held:
                        os.close(opened_fd)
                count += 1
            else:
                if (
                    not stat.S_ISDIR(visible.st_mode)
                    or stat.S_ISLNK(visible.st_mode)
                    or visible.st_uid != os.getuid()
                    or (visible.st_mode & 0o7777) != 0o700
                ):
                    hold("stage_directory_invalid")
                dirfd = os.open(name, RD, dir_fd=curfd)
                held = False
                try:
                    opened = os.fstat(dirfd)
                    if not exact_file(visible, opened):
                        hold("stage_directory_rebound")
                    retained.append((curfd, name, dirfd, opened, "dir:" + rel))
                    held = True
                    watch_directory(dirfd)
                    count += walk(dirfd, child, rel + "/")
                finally:
                    if not held:
                        os.close(dirfd)
        if set(os.listdir(curfd)) != initial:
            hold("stage_entries_changed_during_inspection")
        return count

    try:
        watch_directory(fd)
        count = walk(fd, tree, prefix)
        # Retain the original identity pass and descriptors. The watch
        # additionally rejects a rebind AFTER an earlier final check.
        for parentfd, name, openedfd, previous, kind in retained:
            current = os.fstat(openedfd)
            visible = os.stat(name, dir_fd=parentfd, follow_symlinks=False)
            if not exact_file(previous, current) or not exact_file(current, visible):
                hold("stage_global_rebound:" + kind)
        try:
            observed_events = os.read(watchfd, 4096)
        except BlockingIOError:
            observed_events = b""
        if observed_events:
            hold("stage_mutated_during_inspection")
        return count
    finally:
        for _, _, openedfd, _, _ in reversed(retained):
            os.close(openedfd)
        os.close(watchfd)


def inspect_stage(parent: str) -> int:
    pfd, _ = open_private_parent(parent)
    try:
        sfd = os.open(STAGE_NAME, RD, dir_fd=pfd)
        try:
            verify_stage_visible(pfd, sfd)
            count = inspect_tree(sfd, expected_tree())
            verify_stage_visible(pfd, sfd)
            return count
        finally:
            os.close(sfd)
    finally:
        os.close(pfd)


def publish_stage_no_replace(parentfd: int, source: str) -> None:
    # Linux-only atomic create-once directory publication. os.rename() can
    # replace an existing empty target and is therefore not a safe fallback.
    libc = ctypes.CDLL(None, use_errno=True)
    rename = getattr(libc, "renameat2", None)
    if rename is None:
        hold("rename_noreplace_unsupported")
    rename.argtypes = [
        ctypes.c_int, ctypes.c_char_p, ctypes.c_int,
        ctypes.c_char_p, ctypes.c_uint,
    ]
    rename.restype = ctypes.c_int
    if rename(parentfd, os.fsencode(source), parentfd,
              os.fsencode(STAGE_NAME), 1) != 0:
        number = ctypes.get_errno()
        if number == errno.EEXIST:
            hold("stage_already_exists")
        raise OSError(number, os.strerror(number))


# Unpublished partial stages are intentionally retained under a random
# mode-0700 sibling name. Linux offers no general atomic unlink-by-inode
# for pathnames; recursively unlinking after stat can delete a same-UID
# process's substituted file. A failed stage does not occupy STAGE_NAME.


def stage_into(payload: dict[str, bytes], parent: str) -> None:
    pfd, _ = open_private_parent(parent)
    try:
        # An existing canonical target is never overwritten or repaired.
        try:
            os.stat(STAGE_NAME, dir_fd=pfd, follow_symlinks=False)
        except FileNotFoundError:
            pass
        else:
            hold("stage_already_exists")

        temp_name = "." + STAGE_NAME + ".build-" + secrets.token_hex(16)
        os.mkdir(temp_name, 0o700, dir_fd=pfd)
        # A failed open retains this private unpublished directory for
        # inspection rather than unlinking a replaceable pathname.
        tfd = os.open(temp_name, RD, dir_fd=pfd)
        published = False
        try:
            verify_stage_visible(pfd, tfd, temp_name)
            for rel, _, _ in RUNTIME:
                write_payload(tfd, rel, payload[rel])
            os.fsync(tfd)
            verify_stage_visible(pfd, tfd, temp_name)
            if inspect_tree(tfd, expected_tree()) != len(RUNTIME):
                hold("unpublished_stage_inspection_failed")
            os.fsync(tfd)
            verify_stage_visible(pfd, tfd, temp_name)
            publish_stage_no_replace(pfd, temp_name)
            published = True
            # If this post-rename fsync fails, leave the canonical stage
            # intact and return HOLD; deletion would compound uncertainty.
            os.fsync(pfd)
            verify_stage_visible(pfd, tfd)
            if inspect_tree(tfd, expected_tree()) != len(RUNTIME):
                hold("published_stage_inspection_failed")
            verify_stage_visible(pfd, tfd)
        finally:
            # If publication did not occur, only a random private build name
            # remains; the immutable final name stays free for safe retries.
            # Do not unlink pathnames whose identities may have been swapped.
            os.close(tfd)
    finally:
        os.close(pfd)
    if inspect_stage(parent) != len(RUNTIME):
        hold("post_stage_inspection_failed")


def report(mode: str, count: int = 0) -> None:
    print(json.dumps({
        "marker": MARKER,
        "mode": mode,
        "archive_bytes": ARCHIVE_BYTES,
        "archive_sha256": ARCHIVE_SHA256,
        "candidate_manifest_id": CANDIDATE_ID,
        "runtime_files_exact": len(RUNTIME),
        "staged_files_verified": count,
        "user_private_stage_only": True,
        "installed_nimo_v4_accepted": False,
        "authenticated_custody_principal_verified": False,
        "verified_payment_to_allocation_mounted": False,
        "custody_reserve_or_recover_enabled": False,
        "presale_activation": False,
        "funds_moved": False,
    }, sort_keys=True, separators=(",", ":")))


def self_test(payload: dict[str, bytes]) -> None:
    with tempfile.TemporaryDirectory(prefix="void-nimo-v4-stage-test-") as temp:
        os.chmod(temp, 0o700)
        stage_into(payload, temp)
        if inspect_stage(temp) != len(RUNTIME):
            hold("selftest_stage_missing")
        try:
            stage_into(payload, temp)
        except ValueError as exc:
            if "stage_already_exists" not in str(exc):
                raise
        else:
            hold("selftest_repeat_stage_accepted")
        target = Path(temp, STAGE_NAME, RUNTIME[0][0])
        os.chmod(target, 0o600)
        raw = bytearray(target.read_bytes())
        raw[-1] ^= 1
        target.write_bytes(raw)
        os.chmod(target, 0o400)
        try:
            inspect_stage(temp)
        except ValueError as exc:
            if "stage_file_content_invalid" not in str(exc):
                raise
        else:
            hold("selftest_tampered_stage_accepted")
    with tempfile.TemporaryDirectory(prefix="void-nimo-v4-stage-race-") as temp:
        os.chmod(temp, 0o700)
        stage_into(payload, temp)
        root = Path(temp)
        stage = root / STAGE_NAME
        moved = root / (STAGE_NAME + "-moved")
        stage.rename(moved)
        stage.symlink_to(moved, target_is_directory=True)
        try:
            inspect_stage(temp)
        except (ValueError, OSError):
            pass
        else:
            hold("selftest_stage_root_rebind_accepted")


    with tempfile.TemporaryDirectory(prefix="void-nimo-v4-stage-interrupted-") as temp:
        os.chmod(temp, 0o700)
        original_write = globals()["write_payload"]
        calls = 0
        def fail_after_first(rootfd: int, rel: str, data: bytes) -> None:
            nonlocal calls
            original_write(rootfd, rel, data)
            calls += 1
            if calls == 1:
                raise OSError(errno.ENOSPC, "synthetic-stage-interruption")
        try:
            globals()["write_payload"] = fail_after_first
            try:
                stage_into(payload, temp)
            except OSError as exc:
                if exc.errno != errno.ENOSPC:
                    raise
            else:
                hold("selftest_interrupted_stage_accepted")
        finally:
            globals()["write_payload"] = original_write
        if Path(temp, STAGE_NAME).exists():
            hold("selftest_partial_canonical_stage_published")
        retained_builds = [
            name for name in os.listdir(temp)
            if name.startswith("." + STAGE_NAME + ".build-")
        ]
        if len(retained_builds) != 1:
            hold("selftest_private_partial_not_retained")
        stage_into(payload, temp)
        if inspect_stage(temp) != len(RUNTIME):
            hold("selftest_retry_after_interruption_failed")

    with tempfile.TemporaryDirectory(prefix="void-nimo-v4-stage-leaf-race-") as temp:
        os.chmod(temp, 0o700)
        stage_into(payload, temp)
        leaf = Path(temp, STAGE_NAME, RUNTIME[0][0])
        moved = leaf.with_name(leaf.name + ".moved")
        original_pread = os.pread
        replaced = False
        def replace_after_read(fd: int, count: int, offset: int) -> bytes:
            nonlocal replaced
            raw = original_pread(fd, count, offset)
            if not replaced and os.fstat(fd).st_size == RUNTIME[0][1]:
                moved_path = str(moved)
                leaf.rename(moved_path)
                leaf.write_bytes(payload[RUNTIME[0][0]])
                os.chmod(leaf, 0o400)
                replaced = True
            return raw
        try:
            os.pread = replace_after_read
            try:
                inspect_stage(temp)
            except ValueError as exc:
                if "stage_file_rebound" not in str(exc):
                    raise
            else:
                hold("selftest_staged_leaf_rebound_accepted")
        finally:
            os.pread = original_pread
        if not replaced:
            hold("selftest_staged_leaf_race_not_exercised")

    with tempfile.TemporaryDirectory(prefix="void-nimo-v4-stage-late-race-") as temp:
        os.chmod(temp, 0o700)
        stage_into(payload, temp)
        early = Path(temp, STAGE_NAME, RUNTIME[0][0])
        moved = early.with_name(early.name + ".moved")
        original_pread = os.pread
        swapped = False
        def swap_first_leaf_during_later_subtree(
            fd: int, count: int, offset: int,
        ) -> bytes:
            nonlocal swapped
            raw = original_pread(fd, count, offset)
            if not swapped and os.fstat(fd).st_size == RUNTIME[1][1]:
                early.rename(moved)
                early.write_bytes(payload[RUNTIME[0][0]])
                os.chmod(early, 0o400)
                swapped = True
            return raw
        try:
            os.pread = swap_first_leaf_during_later_subtree
            try:
                inspect_stage(temp)
            except ValueError as exc:
                if "stage_global_rebound" not in str(exc):
                    raise
            else:
                hold("selftest_late_subtree_rebind_accepted")
        finally:
            os.pread = original_pread
        if not swapped:
            hold("selftest_late_subtree_race_not_exercised")

    # Regression: after the early leaf has PASSED the final identity loop,
    # a later-leaf os.stat hook replaces that earlier name with identical
    # bytes and mode. Final metadata-only passes used to accept this race.
    with tempfile.TemporaryDirectory(prefix="void-nimo-v4-stage-final-pass-") as temp:
        os.chmod(temp, 0o700)
        stage_into(payload, temp)
        early = Path(temp, STAGE_NAME, RUNTIME[0][0])
        moved = early.with_name(early.name + ".moved")
        original_stat = os.stat
        later_name = RUNTIME[1][0].rsplit("/", 1)[-1]
        observed_later = 0
        mutated = False
        def rebind_during_final_pass(name, *args, **kwargs):
            nonlocal observed_later, mutated
            visible = original_stat(name, *args, **kwargs)
            if name == later_name and kwargs.get("dir_fd") is not None:
                observed_later += 1
                if observed_later == 3:
                    early.rename(moved)
                    early.write_bytes(payload[RUNTIME[0][0]])
                    os.chmod(early, 0o400)
                    mutated = True
            return visible
        try:
            os.stat = rebind_during_final_pass
            try:
                inspect_stage(temp)
            except ValueError as exc:
                if "stage_mutated_during_inspection" not in str(exc):
                    raise
            else:
                hold("selftest_final_pass_race_accepted")
        finally:
            os.stat = original_stat
        if not mutated or observed_later != 3:
            hold("selftest_final_pass_race_not_exercised")

def main() -> None:
    require_unprivileged()
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--plan", metavar="INACTIVE_ARCHIVE")
    modes.add_argument("--stage", metavar="INACTIVE_ARCHIVE")
    modes.add_argument("--inspect-stage", action="store_true")
    modes.add_argument("--self-test", metavar="INACTIVE_ARCHIVE")
    args = parser.parse_args()
    home = pwd.getpwuid(os.getuid()).pw_dir
    if args.inspect_stage:
        report("inspect-stage", inspect_stage(home))
        return
    archive = args.plan or args.stage or args.self_test
    payload = read_archive(archive)
    if args.plan:
        report("plan")
    elif args.stage:
        stage_into(payload, home)
        report("stage", len(RUNTIME))
    else:
        self_test(payload)
        report("self-test")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, AssertionError, tarfile.TarError) as exc:
        print(
            "VOID_NIMO_V4_PRIVATE_STAGE_V1_HOLD:"
            + (str(exc) if str(exc).startswith("nimo_v4_private_stage_") else "unqualified_private_io_or_archive"),
            file=sys.stderr,
        )
        raise SystemExit(2)
