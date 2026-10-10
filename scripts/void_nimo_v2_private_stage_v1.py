#!/usr/bin/env python3
"""Verify or privately stage the exact INACTIVE Nimo V2 archive.

No sudo, SSH, production install, service, credentials, customer ledgers or funds.
The opt-in --stage mode writes ONLY one fresh 0700 directory under the
unprivileged account's registered home. It NEVER touches /usr/local/libexec.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import pwd
import stat
import tarfile
import tempfile

SCHEMA = "VOID_NIMO_V2_PRIVATE_STAGE_V1"
STAGE_NAME = "void-nimo-v2-inactive-review-20261009"
PREFIX = "inactive-v2-candidate/"
ARCHIVE_SIZE = 256000
ARCHIVE_SHA256 = "656357f5ed98da324e205ca85085fa4b72d9289f8e2c2b7d5d43eb8e082c87c6"
ORIGINAL_V1_AUTO = "ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6"
EXPECTED = (
    ("payload/dist/economic/buy_void_allocation_custody_external_witness_v1.js", 35821, "35d80f00a9ec0ce57bb457596d27e8c86a70d76efe310372e1fff796a92d43ca"),
    ("payload/dist/economic/buy_void_allocation_custody_witness_transport_v1.js", 35066, "8e03107d1545977a19b847bbec926543b9812b6d9c16a4d7e13e62cf5c790979"),
    ("payload/dist/economic/buy_void_allocation_reservation_high_water_v1.js", 12251, "1999015c9e0770a5a94b3b4d29f5aa6a47036406754673adb2ed5829c5e406e9"),
    ("payload/dist/economic/buy_void_allocation_reservation_ledger_v1.js", 37442, "af497a5b7f62b08b60e90a527ae3365540fd2a13fcd99f6dd4e8253423869c0f"),
    ("payload/dist/economic/buy_void_auto_fulfillment_v1.js", 26226, "119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c"),
    ("payload/dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js", 21165, "0b4dd188dbbf7658542b1d20c521227fa1fc01d7d79e89a713863b771380da13"),
    ("payload/dist/economic/buy_void_filesystem_bakery_lock_v1.js", 18018, "7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994"),
    ("payload/tools/void-buy-allocation-custody-witness-forced-command-v2.mjs", 48914, "88f425986eff8597cdf6725e4608b3790aed2359fef6ae9fadb76292d9e5a26d"),
    ("review/manifest.json", 2068, "4abc15e0dc2260bbb03e977f7b4723be2770b91d9483e46fe5c37013adb85fbc"),
    ("review/proposed-lock.json", 4522, "ce4f471bd2dd133e727d84af13a790e7c6a3374a21a613c481f4374cced4dd36"),
)
D = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
R = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
W = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW


def hold(message):
    raise ValueError("nimo_v2_private_stage_" + message)


def sha(value):
    return hashlib.sha256(value).hexdigest()


def ensure_unprivileged():
    if os.name != "posix" or not hasattr(os, "pread") or os.getuid() < 1:
        hold("unprivileged_linux_required")
    if os.geteuid() != os.getuid():
        hold("setuid_or_root_forbidden")


def exact_file(a, b):
    return (a.st_dev, a.st_ino, a.st_uid, a.st_gid, a.st_mode, a.st_nlink,
            a.st_size, a.st_mtime_ns, a.st_ctime_ns) == (
            b.st_dev, b.st_ino, b.st_uid, b.st_gid, b.st_mode, b.st_nlink,
            b.st_size, b.st_mtime_ns, b.st_ctime_ns)


def read_archive(path):
    if not isinstance(path, str) or not os.path.isabs(path) or "\x00" in path:
        hold("archive_path_invalid")
    if os.path.normpath(path) != path or "//" in path:
        hold("archive_path_not_canonical")
    visible = os.lstat(path)
    if not stat.S_ISREG(visible.st_mode) or visible.st_nlink != 1 or (
            visible.st_uid != os.getuid()) or visible.st_size != ARCHIVE_SIZE:
        hold("archive_visible_metadata_invalid")
    fd = os.open(path, R)
    try:
        opened = os.fstat(fd)
        if not exact_file(visible, opened) or not stat.S_ISREG(opened.st_mode):
            hold("archive_descriptor_changed")
        raw = os.pread(fd, ARCHIVE_SIZE + 1, 0)
        after = os.fstat(fd)
        now = os.lstat(path)
        if len(raw) != ARCHIVE_SIZE or not exact_file(opened, after) or (
                not exact_file(after, now)):
            hold("archive_read_window_changed")
        if sha(raw) != ARCHIVE_SHA256:
            hold("archive_exact_wire_sha256_mismatch")
        return raw
    finally:
        os.close(fd)


def verified_members(raw):
    # Full physical TAR digest checked before the parser sees any member.
    if len(raw) != ARCHIVE_SIZE or sha(raw) != ARCHIVE_SHA256:
        hold("archive_exact_wire_sha256_mismatch")
    entries = []
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as arc:
        seen = set()
        for m in arc:
            if not m.isfile() or m.uid != 0 or m.gid != 0 or (
                    m.mode != 0o444) or m.mtime != 0 or m.name in seen:
                hold("archive_member_metadata_invalid")
            seen.add(m.name)
            if len(entries) >= len(EXPECTED):
                hold("archive_member_count_exceeded")
            expected_name, size, digest = EXPECTED[len(entries)]
            if m.name != PREFIX + expected_name or m.size != size:
                hold("archive_member_identity_invalid")
            content = arc.extractfile(m).read()
            if len(content) != size or sha(content) != digest:
                hold("archive_member_hash_invalid")
            entries.append((expected_name, content))
    if len(entries) != len(EXPECTED):
        hold("archive_member_count_invalid")
    return entries


def home_descriptor(home):
    visible = os.lstat(home)
    if not stat.S_ISDIR(visible.st_mode) or stat.S_ISLNK(visible.st_mode):
        hold("home_not_directory")
    if visible.st_uid != os.getuid() or (visible.st_mode & 0o022):
        hold("home_owner_or_write_mode_invalid")
    fd = os.open(home, D)
    if not exact_file(visible, os.fstat(fd)):
        os.close(fd)
        hold("home_directory_rebound")
    return fd


def private_directory(fd, label, create=False):
    if create:
        os.mkdir(label, 0o700, dir_fd=fd)
    opened = os.open(label, D, dir_fd=fd)
    observed = os.fstat(opened)
    if not stat.S_ISDIR(observed.st_mode) or observed.st_uid != os.getuid() or (
            observed.st_mode & 0o7777) != 0o700:
        os.close(opened)
        hold("private_stage_directory_invalid")
    return opened


def ensure_path(rootfd, names):
    opened = []
    fd = rootfd
    try:
        for name in names:
            try:
                os.mkdir(name, 0o700, dir_fd=fd)
            except FileExistsError:
                pass
            fd = private_directory(fd, name)
            opened.append(fd)
        return opened
    except Exception:
        for item in reversed(opened):
            os.close(item)
        raise


def write_exact(fd, bytes_data):
    offset = 0
    while offset < len(bytes_data):
        count = os.write(fd, bytes_data[offset:])
        if count <= 0:
            hold("short_write")
        offset += count
    os.fchmod(fd, 0o444)
    os.fsync(fd)


def stage_into(raw, parent, stage_name=STAGE_NAME):
    ensure_unprivileged()
    entries = verified_members(raw)
    pfd = home_descriptor(parent)
    try:
        # Fail closed on a pre-existing/partial stage. Never replace it.
        stagefd = private_directory(pfd, stage_name, create=True)
        try:
            for name, payload in entries:
                parts = (PREFIX + name).split("/")
                dirs = ensure_path(stagefd, parts[:-1])
                targetfd = dirs[-1] if dirs else stagefd
                try:
                    ffd = os.open(parts[-1], W, 0o400, dir_fd=targetfd)
                    try:
                        write_exact(ffd, payload)
                    finally:
                        os.close(ffd)
                    os.fsync(targetfd)
                finally:
                    for fd in reversed(dirs):
                        os.close(fd)
            os.fsync(stagefd)
        finally:
            os.close(stagefd)
        os.fsync(pfd)
    finally:
        os.close(pfd)
    # Only source-level stage; do not mark V2 accepted or installed.
    inspect_stage(parent, stage_name)


def inspect_stage(parent, stage_name=STAGE_NAME):
    ensure_unprivileged()
    pfd = home_descriptor(parent)
    try:
        rootfd = private_directory(pfd, stage_name)
        try:
            parent_path = os.path.join(parent, stage_name)
            expected_paths = {PREFIX + name for name, _, _ in EXPECTED}
            wanted_dirs = set()
            for relative in expected_paths:
                bits = relative.split("/")
                for i in range(1, len(bits)):
                    wanted_dirs.add("/".join(bits[:i]))
            actual_files = set()
            actual_dirs = set()
            for directory, subdirs, files in os.walk(parent_path, followlinks=False):
                relbase = os.path.relpath(directory, parent_path)
                if relbase != ".":
                    actual_dirs.add(relbase)
                for n in subdirs:
                    relative = os.path.join(relbase, n) if relbase != "." else n
                    info = os.lstat(os.path.join(directory, n))
                    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode):
                        hold("stage_unexpected_directory")
                for n in files:
                    relative = os.path.join(relbase, n) if relbase != "." else n
                    actual_files.add(relative)
            if actual_files != expected_paths or actual_dirs != wanted_dirs:
                hold("stage_extra_or_missing_entries")
            for name, size, digest in EXPECTED:
                pieces = (PREFIX + name).split("/")
                fds = []
                current = rootfd
                try:
                    for part in pieces[:-1]:
                        current = private_directory(current, part)
                        fds.append(current)
                    visible = os.stat(
                        pieces[-1], dir_fd=current, follow_symlinks=False)
                    fd = os.open(pieces[-1], R, dir_fd=current)
                    try:
                        a = os.fstat(fd)
                        data = os.pread(fd, size + 1, 0)
                        b = os.fstat(fd)
                        again = os.stat(
                            pieces[-1], dir_fd=current, follow_symlinks=False)
                        if not stat.S_ISREG(a.st_mode) or a.st_uid != os.getuid() or (
                                a.st_mode & 0o7777) != 0o444 or a.st_nlink != 1 or (
                                not exact_file(visible, a)) or (
                                not exact_file(a, b)) or (
                                not exact_file(b, again)):
                            hold("stage_file_identity_invalid")
                        if len(data) != size or sha(data) != digest:
                            hold("stage_file_content_invalid")
                    finally:
                        os.close(fd)
                finally:
                    for opened in reversed(fds):
                        os.close(opened)
        finally:
            os.close(rootfd)
    finally:
        os.close(pfd)
    return len(EXPECTED)


def report(kind, count=10):
    result = dict(marker=SCHEMA, mode=kind,
                  exact_review_tar_sha256=ARCHIVE_SHA256,
                  exact_review_tar_bytes=ARCHIVE_SIZE,
                  verified_review_file_count=count,
                  original_v1_paths_opened=False,
                  original_v1_mutated=False,
                  v2_private_user_stage_reviewed=kind in ("stage", "inspect-stage"),
                  installed_v2_accepted=False,
                  dedicated_principal_authenticated=False,
                  custody_reserve_enabled=False,
                  payment_to_allocation_authorized=False,
                  presale_activation=False, funds_moved=False)
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))


def selftest(raw):
    ensure_unprivileged()
    verified_members(raw)
    for label, modified in [
        ("append", raw + b"X"),
        ("padding", raw[:-1] + b"Z"),
        ("bit", bytes([raw[0] ^ 1]) + raw[1:]),
    ]:
        try:
            verified_members(modified)
            hold("test_" + label + "_accepted")
        except ValueError as exc:
            if "test_" in str(exc):
                raise
    with tempfile.TemporaryDirectory(prefix="void-nimo-private-stage-test-") as temp:
        os.chmod(temp, 0o700)
        stage_into(raw, temp, "stage")
        if inspect_stage(temp, "stage") != 10:
            hold("selftest_stage_missing")
        try:
            stage_into(raw, temp, "stage")
            hold("test_existing_stage_accepted")
        except FileExistsError:
            pass
        file = Path(temp, "stage", PREFIX,
                    "payload/dist/economic/buy_void_auto_fulfillment_v1.js")
        os.chmod(file, 0o600)
        try:
            inspect_stage(temp, "stage")
            hold("test_changed_stage_accepted")
        except ValueError as exc:
            if "test_" in str(exc):
                raise
    report("self-test")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--plan", metavar="INACTIVE_ARCHIVE")
    modes.add_argument("--stage", metavar="INACTIVE_ARCHIVE")
    modes.add_argument("--inspect-stage", action="store_true")
    modes.add_argument("--self-test", metavar="INACTIVE_ARCHIVE")
    args = parser.parse_args()
    ensure_unprivileged()
    home = pwd.getpwuid(os.getuid()).pw_dir
    if args.inspect_stage:
        report("inspect-stage", inspect_stage(home))
        return
    name = args.plan or args.stage or args.self_test
    raw = read_archive(name)
    if args.self_test:
        selftest(raw)
    elif args.plan:
        verified_members(raw)
        report("plan")
    else:
        stage_into(raw, home)
        report("stage")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, tarfile.TarError) as error:
        # No arbitrary paths, file contents, usernames or privileged state
        # in the diagnostic; runtime errors remain a hard HOLD, exit 2.
        print("VOID_NIMO_V2_PRIVATE_STAGE_V1_HOLD: " +
              (str(error) if str(error).startswith("nimo_v2_private_stage_")
               else "unqualified_private_io_or_archive"), file=__import__("sys").stderr)
        raise SystemExit(2)
