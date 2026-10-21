#!/usr/bin/env python3
import sys

MARKER = "VOID_V7_SOURCE_RELEASE_FULL_HISTORY_RESEAL_V1"
if sys.flags.isolated != 1:
    print(MARKER); print("status=HOLD"); print("reason=python_isolation_required"); raise SystemExit(2)
if sys.flags.optimize != 0 or not __debug__:
    print(MARKER); print("status=HOLD"); print("reason=python_optimization_forbidden"); raise SystemExit(2)

import argparse
import os
from pathlib import Path
import pwd
import re
import shutil
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
TARGET_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
TARGET_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
TARGET_PARENTS = (
    "5752b69a7253a44fd3fabe2964476174b3a80c40",
    "6b7fc90219676a96f5a2c34619e4cfdf3f002244",
)
EXPECTED_REACHABLE_COMMITS = 17931
ACCOUNT_HOME_ROOT = Path("/home")
EXTRA_RECEIPT_LINE_SEPARATORS = frozenset(("\u0085", "\u2028", "\u2029"))
CONFIG_TEXT = (
    "[core]\n"
    "\trepositoryformatversion = 0\n"
    "\tfilemode = true\n"
    "\tbare = false\n"
    "\tlogallrefupdates = true\n"
)
HEX40 = re.compile(r"^[0-9a-f]{40}$")
MAX_OUTPUT = 64 * 1024 * 1024
MAX_MOUNTINFO_BYTES = 8 * 1024 * 1024
MAX_FDINFO_BYTES = 64 * 1024
MOUNTINFO_PATH = Path("/proc/self/mountinfo")

_CANDIDATE_CREATED = False
_CLEANUP_ATTEMPTED = False
_CLEANUP_COMPLETED = False
_CLEANUP_RESIDUAL_UNKNOWN = False
_CLEANUP_REASON = "none"

class ResealError(RuntimeError):
    pass

def _env():
    return {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_ASKPASS": "/bin/false",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_PROTOCOL_FROM_USER": "0",
        "GIT_ALLOW_PROTOCOL": "",
        "GIT_PAGER": "",
    }

def _git_args(root: Path, *args: str):
    return [
        "/usr/bin/git",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.fsmonitor=false",
        "-c", "core.untrackedCache=false",
        "-c", "submodule.recurse=false",
        "-c", "pack.writeReverseIndex=false",
        "--no-replace-objects",
        "-C", os.fspath(root),
        *args,
    ]

def _run(
    root: Path,
    *args: str,
    input_data: bytes | None = None,
    allowed=(0,),
    pass_fds: tuple[int, ...] = (),
) -> bytes:
    try:
        cp = subprocess.run(
            _git_args(root, *args),
            input=input_data,
            stdin=None if input_data is not None else subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=_env(),
            timeout=180,
            check=False,
            pass_fds=pass_fds,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ResealError("git_exec_or_timeout:" + (args[0] if args else "unknown")) from exc
    if cp.returncode not in allowed or cp.stderr:
        raise ResealError("git_failed:" + (args[0] if args else "unknown"))
    if len(cp.stdout) > MAX_OUTPUT:
        raise ResealError("git_output_too_large")
    return cp.stdout

def _text(root: Path, *args: str) -> str:
    try:
        return _run(root, *args).decode("utf-8", "strict").strip()
    except UnicodeDecodeError as exc:
        raise ResealError("git_output_not_utf8") from exc

def _identity(st: os.stat_result) -> tuple[int, int, int, int, int, int]:
    return (st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode, st.st_nlink)

def _directory_lease_identity(st: os.stat_result) -> tuple[int, int, int, int, int]:
    # Directory link counts are expected to change while this builder creates
    # and removes child directories. The stable lease is device/inode/owner/mode.
    return (st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode)

def _decode_mountinfo_path(raw: bytes) -> Path:
    out = bytearray()
    index = 0
    while index < len(raw):
        if raw[index] != 0x5C:
            out.append(raw[index])
            index += 1
            continue
        if index + 3 >= len(raw):
            raise ResealError("mountinfo_escape_truncated")
        digits = raw[index + 1:index + 4]
        if any(value < ord("0") or value > ord("7") for value in digits):
            raise ResealError("mountinfo_escape_invalid")
        value = int(digits.decode("ascii"), 8)
        if value not in (0x09, 0x0A, 0x20, 0x5C):
            raise ResealError("mountinfo_escape_unsupported")
        out.append(value)
        index += 4
    path = Path(os.fsdecode(bytes(out)))
    if not path.is_absolute():
        raise ResealError("mountinfo_mountpoint_not_absolute")
    return path

def _mount_points() -> frozenset[Path]:
    try:
        raw = MOUNTINFO_PATH.read_bytes()
    except OSError as exc:
        raise ResealError("mountinfo_unavailable") from exc
    if len(raw) > MAX_MOUNTINFO_BYTES:
        raise ResealError("mountinfo_too_large")
    points: set[Path] = set()
    for line in raw.splitlines():
        fields = line.split(b" ")
        if len(fields) < 6:
            raise ResealError("mountinfo_line_invalid")
        points.add(_decode_mountinfo_path(fields[4]))
    if Path("/") not in points:
        raise ResealError("mountinfo_root_missing")
    return frozenset(points)

def _reject_mountpoint_alias(
    path: Path,
    label: str,
    mount_points: frozenset[Path] | None = None,
) -> None:
    points = _mount_points() if mount_points is None else mount_points
    if path in points:
        raise ResealError(label + "_mountpoint_alias_forbidden")

def _fd_mount_id(fd: int, label: str) -> int:
    path = Path("/proc/self/fdinfo") / str(fd)
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise ResealError(label + "_fdinfo_unavailable") from exc
    if len(raw) > MAX_FDINFO_BYTES:
        raise ResealError(label + "_fdinfo_too_large")
    values = []
    for line in raw.splitlines():
        if line.startswith(b"mnt_id:"):
            field = line.split(b":", 1)[1].strip()
            if not field.isdigit():
                raise ResealError(label + "_mount_id_invalid")
            values.append(int(field))
    if len(values) != 1 or values[0] <= 0:
        raise ResealError(label + "_mount_id_missing_or_ambiguous")
    return values[0]

def _candidate_git_args(git_fd: int, work_fd: int, *args: str) -> list[str]:
    return [
        "/usr/bin/git",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.fsmonitor=false",
        "-c", "core.untrackedCache=false",
        "-c", "submodule.recurse=false",
        "-c", "pack.writeReverseIndex=false",
        "--no-replace-objects",
        "--git-dir=/proc/self/fd/" + str(git_fd),
        "--work-tree=/proc/self/fd/" + str(work_fd),
        *args,
    ]

def _candidate_run(
    work_fd: int,
    git_fd: int,
    objects_fd: int,
    *args: str,
    input_data: bytes | None = None,
    allowed=(0,),
    extra_fds: tuple[int, ...] = (),
) -> bytes:
    env = _env()
    env["GIT_OBJECT_DIRECTORY"] = "/proc/self/fd/" + str(objects_fd)
    retained = tuple(dict.fromkeys((work_fd, git_fd, objects_fd, *extra_fds)))
    try:
        cp = subprocess.run(
            _candidate_git_args(git_fd, work_fd, *args),
            input=input_data,
            stdin=None if input_data is not None else subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            timeout=180,
            check=False,
            pass_fds=retained,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ResealError("candidate_git_exec_or_timeout:" + (args[0] if args else "unknown")) from exc
    if cp.returncode not in allowed or cp.stderr:
        raise ResealError("candidate_git_failed:" + (args[0] if args else "unknown"))
    if len(cp.stdout) > MAX_OUTPUT:
        raise ResealError("candidate_git_output_too_large")
    return cp.stdout

def _candidate_text(work_fd: int, git_fd: int, objects_fd: int, *args: str) -> str:
    try:
        return _candidate_run(work_fd, git_fd, objects_fd, *args).decode("utf-8", "strict").strip()
    except UnicodeDecodeError as exc:
        raise ResealError("candidate_git_output_not_utf8") from exc

def _write_new_regular_at(dir_fd: int, name: str, data: bytes, mode: int, label: str) -> None:
    fd = os.open(
        name,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
        mode,
        dir_fd=dir_fd,
    )
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1 or st.st_uid != os.getuid():
            raise ResealError(label + "_created_file_metadata_invalid")
        view = memoryview(data)
        offset = 0
        while offset < len(view):
            written = os.write(fd, view[offset:])
            if written <= 0:
                raise ResealError(label + "_short_write")
            offset += written
        os.fsync(fd)
    finally:
        os.close(fd)

def _read_regular_at(dir_fd: int, name: str, label: str, max_bytes: int = 1024 * 1024) -> bytes:
    fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW, dir_fd=dir_fd)
    try:
        st = os.fstat(fd)
        if (
            not stat.S_ISREG(st.st_mode)
            or st.st_nlink != 1
            or st.st_size < 0
            or st.st_size > max_bytes
        ):
            raise ResealError(label + "_file_metadata_invalid")
        chunks: list[bytes] = []
        remaining = st.st_size
        while remaining:
            part = os.read(fd, min(65536, remaining))
            if not part:
                raise ResealError(label + "_short_read")
            chunks.append(part)
            remaining -= len(part)
        if os.read(fd, 1):
            raise ResealError(label + "_file_grew")
        return b"".join(chunks)
    finally:
        os.close(fd)

def _entry_absent_at(dir_fd: int, name: str, label: str) -> None:
    try:
        os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    except FileNotFoundError:
        return
    raise ResealError(label + "_forbidden_metadata:" + name)

def _open_directory_at(dir_fd: int, name: str, label: str) -> int:
    try:
        fd = os.open(
            name,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=dir_fd,
        )
    except OSError as exc:
        raise ResealError(label + "_directory_open_failed") from exc
    st = os.fstat(fd)
    if not stat.S_ISDIR(st.st_mode):
        os.close(fd)
        raise ResealError(label + "_directory_kind_invalid")
    return fd

def _parents(root: Path, commit: str) -> tuple[str, ...]:
    raw = _text(root, "cat-file", "-p", commit)
    parents = tuple(line[7:] for line in raw.splitlines() if line.startswith("parent "))
    if any(HEX40.fullmatch(p) is None for p in parents):
        raise ResealError("parent_shape_invalid")
    return parents

def _forbidden_metadata(root: Path):
    g = root / ".git"
    return (
        g / "commondir",
        g / "config.worktree",
        g / "shallow",
        g / "info" / "grafts",
        g / "objects" / "info" / "alternates",
        g / "objects" / "info" / "http-alternates",
    )

def _config_exact(root: Path) -> None:
    raw = (root / ".git" / "config").read_text("utf-8")
    if raw != CONFIG_TEXT:
        raise ResealError("git_config_not_exact_closed_form")

def _complete_graph(root: Path) -> None:
    missing = _text(root, "rev-list", "--objects", "--missing=print", TARGET_HEAD)
    for line in missing.splitlines():
        if line.startswith("?"):
            raise ResealError("missing_reachable_object")
    count = int(_text(root, "rev-list", "--count", TARGET_HEAD))
    if count != EXPECTED_REACHABLE_COMMITS:
        raise ResealError("reachable_commit_count_mismatch")

def verify_source() -> dict[str, object]:
    top = Path(_text(ROOT, "rev-parse", "--show-toplevel")).resolve()
    if top != ROOT.resolve():
        raise ResealError("source_toplevel_mismatch")
    source_git = ROOT / ".git"
    if not source_git.is_dir() or source_git.is_symlink():
        raise ResealError("source_git_dir_not_physical")
    source_objects = source_git / "objects"
    if not source_objects.is_dir() or source_objects.is_symlink():
        raise ResealError("source_objects_dir_invalid")
    for path in _forbidden_metadata(ROOT):
        if path.exists() or path.is_symlink():
            raise ResealError("source_forbidden_git_metadata:" + path.name)
    if _text(ROOT, "symbolic-ref", "--quiet", "--short", "HEAD") != "main":
        raise ResealError("source_branch_not_main")
    if _text(ROOT, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise ResealError("source_checkout_not_clean")
    if _text(ROOT, "rev-parse", "--is-shallow-repository") != "false":
        raise ResealError("source_repository_shallow")
    if _text(ROOT, "rev-parse", TARGET_HEAD + "^{tree}") != TARGET_TREE:
        raise ResealError("target_tree_mismatch")
    if _parents(ROOT, TARGET_HEAD) != TARGET_PARENTS:
        raise ResealError("target_parent_set_mismatch")
    _complete_graph(ROOT)
    return {
        "source_head": _text(ROOT, "rev-parse", "HEAD"),
        "target_head": TARGET_HEAD,
        "target_tree": TARGET_TREE,
        "target_parents": TARGET_PARENTS,
        "reachable_commits": EXPECTED_REACHABLE_COMMITS,
    }

def _candidate_parents(work_fd: int, git_fd: int, objects_fd: int, commit: str) -> tuple[str, ...]:
    raw = _candidate_text(work_fd, git_fd, objects_fd, "cat-file", "-p", commit)
    parents = tuple(line[7:] for line in raw.splitlines() if line.startswith("parent "))
    if any(HEX40.fullmatch(parent) is None for parent in parents):
        raise ResealError("candidate_parent_shape_invalid")
    return parents

def _candidate_complete_graph(work_fd: int, git_fd: int, objects_fd: int) -> None:
    missing = _candidate_text(
        work_fd, git_fd, objects_fd,
        "rev-list", "--objects", "--missing=print", TARGET_HEAD,
    )
    if any(line.startswith("?") for line in missing.splitlines()):
        raise ResealError("candidate_missing_reachable_object")
    count = int(_candidate_text(work_fd, git_fd, objects_fd, "rev-list", "--count", TARGET_HEAD))
    if count != EXPECTED_REACHABLE_COMMITS:
        raise ResealError("candidate_reachable_commit_count_mismatch")

def _revalidate_parent_lease(output: Path, parent_fd: int, expected: tuple[int, int, int, int, int]) -> None:
    try:
        visible = output.parent.lstat()
    except OSError as exc:
        raise ResealError("output_parent_generation_unavailable") from exc
    if (
        _directory_lease_identity(os.fstat(parent_fd)) != expected
        or _directory_lease_identity(visible) != expected
    ):
        raise ResealError("output_parent_generation_changed")
    _revalidate_output_parent_chain(output)

def _revalidate_candidate_lease(
    output: Path,
    parent_fd: int,
    parent_identity: tuple[int, int, int, int, int],
    candidate_fd: int,
    candidate_identity: tuple[int, int, int, int, int],
) -> None:
    _revalidate_parent_lease(output, parent_fd, parent_identity)
    try:
        visible_at_parent = os.stat(output.name, dir_fd=parent_fd, follow_symlinks=False)
        visible_path = output.lstat()
    except OSError as exc:
        raise ResealError("candidate_visible_generation_unavailable") from exc
    current = _directory_lease_identity(os.fstat(candidate_fd))
    if (
        current != candidate_identity
        or _directory_lease_identity(visible_at_parent) != candidate_identity
        or _directory_lease_identity(visible_path) != candidate_identity
        or not stat.S_ISDIR(visible_at_parent.st_mode)
        or stat.S_ISLNK(visible_at_parent.st_mode)
    ):
        raise ResealError("candidate_visible_generation_changed")
    _reject_mountpoint_alias(output, "candidate_root")
    _reject_descendant_mountpoints(output, "candidate_root")
    _reject_source_checkout_overlap(output)

def _verify_candidate_metadata_fds(
    candidate_fd: int,
    git_fd: int,
    objects_fd: int,
) -> None:
    git_visible = os.stat(".git", dir_fd=candidate_fd, follow_symlinks=False)
    if _identity(git_visible) != _identity(os.fstat(git_fd)) or not stat.S_ISDIR(git_visible.st_mode):
        raise ResealError("candidate_git_dir_generation_changed")
    objects_visible = os.stat("objects", dir_fd=git_fd, follow_symlinks=False)
    if _identity(objects_visible) != _identity(os.fstat(objects_fd)) or not stat.S_ISDIR(objects_visible.st_mode):
        raise ResealError("candidate_objects_dir_generation_changed")
    for name in ("commondir", "config.worktree", "shallow"):
        _entry_absent_at(git_fd, name, "candidate")
    info_fd = _open_directory_at(git_fd, "info", "candidate_git_info")
    object_info_fd = _open_directory_at(objects_fd, "info", "candidate_object_info")
    try:
        _entry_absent_at(info_fd, "grafts", "candidate")
        _entry_absent_at(object_info_fd, "alternates", "candidate")
        _entry_absent_at(object_info_fd, "http-alternates", "candidate")
    finally:
        os.close(object_info_fd)
        os.close(info_fd)
    config_raw = _read_regular_at(git_fd, "config", "candidate_git_config")
    if config_raw.decode("utf-8", "strict") != CONFIG_TEXT:
        raise ResealError("git_config_not_exact_closed_form")

def verify_candidate_lease(
    output: Path,
    parent_fd: int,
    parent_identity: tuple[int, int, int, int, int],
    candidate_fd: int,
    candidate_identity: tuple[int, int, int, int, int],
    git_fd: int,
    objects_fd: int,
) -> None:
    _revalidate_candidate_lease(
        output, parent_fd, parent_identity, candidate_fd, candidate_identity
    )
    _verify_candidate_metadata_fds(candidate_fd, git_fd, objects_fd)
    if _candidate_text(candidate_fd, git_fd, objects_fd, "rev-parse", "--is-shallow-repository") != "false":
        raise ResealError("candidate_repository_shallow")
    if _candidate_text(candidate_fd, git_fd, objects_fd, "rev-parse", "HEAD") != TARGET_HEAD:
        raise ResealError("candidate_head_mismatch")
    if _candidate_text(candidate_fd, git_fd, objects_fd, "rev-parse", "HEAD^{tree}") != TARGET_TREE:
        raise ResealError("candidate_tree_mismatch")
    if _candidate_text(candidate_fd, git_fd, objects_fd, "symbolic-ref", "--quiet", "--short", "HEAD") != "main":
        raise ResealError("candidate_branch_not_main")
    if _candidate_parents(candidate_fd, git_fd, objects_fd, TARGET_HEAD) != TARGET_PARENTS:
        raise ResealError("candidate_parent_set_mismatch")
    _candidate_complete_graph(candidate_fd, git_fd, objects_fd)
    if _candidate_text(candidate_fd, git_fd, objects_fd, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise ResealError("candidate_worktree_not_clean")
    if _candidate_text(candidate_fd, git_fd, objects_fd, "write-tree") != TARGET_TREE:
        raise ResealError("candidate_index_tree_mismatch")
    fsck = _candidate_run(
        candidate_fd, git_fd, objects_fd,
        "fsck", "--full", "--strict", "--no-reflogs", TARGET_HEAD,
    )
    if fsck:
        raise ResealError("candidate_fsck_output_nonempty")
    _revalidate_candidate_lease(
        output, parent_fd, parent_identity, candidate_fd, candidate_identity
    )
    _verify_candidate_metadata_fds(candidate_fd, git_fd, objects_fd)

def _receipt_safe_path(path: Path, label: str) -> str:
    raw = os.fspath(path)
    if any(
        ord(ch) < 0x20
        or ord(ch) == 0x7f
        or ch in EXTRA_RECEIPT_LINE_SEPARATORS
        for ch in raw
    ):
        raise ResealError(label + "_path_line_or_control_character")
    return raw

def _require_physical_user_directory(path: Path, label: str) -> Path:
    _receipt_safe_path(path, label)
    if not path.is_absolute() or Path(os.path.abspath(os.fspath(path))) != path:
        raise ResealError(label + "_directory_path_not_canonical")
    try:
        st = path.lstat()
        resolved = path.resolve(strict=True)
    except OSError as exc:
        raise ResealError(label + "_directory_unavailable") from exc
    if stat.S_ISLNK(st.st_mode):
        raise ResealError(label + "_directory_alias_forbidden")
    if not stat.S_ISDIR(st.st_mode):
        raise ResealError(label + "_directory_kind_invalid")
    if st.st_uid != os.getuid():
        raise ResealError(label + "_directory_owner_invalid")
    if resolved != path:
        raise ResealError(label + "_directory_alias_forbidden")
    _reject_mountpoint_alias(path, label)
    return path

def _require_physical_account_home_root() -> Path:
    root = ACCOUNT_HOME_ROOT
    _receipt_safe_path(root, "account_home_root")
    try:
        st = root.lstat()
        resolved = root.resolve(strict=True)
    except OSError as exc:
        raise ResealError("account_home_root_unavailable") from exc
    if (
        stat.S_ISLNK(st.st_mode)
        or not stat.S_ISDIR(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
        or resolved != root
    ):
        raise ResealError("account_home_root_not_physical_root_custodied")
    _reject_mountpoint_alias(root, "account_home_root")
    return root

def _validate_account_home_location(home: Path, account_name: str) -> None:
    _receipt_safe_path(home, "account_home")
    if home.parent != ACCOUNT_HOME_ROOT or home.name != account_name:
        raise ResealError("account_home_outside_allowed_user_root")
    if os.getuid() == 0:
        raise ResealError("root_account_forbidden")

def _account_home() -> Path:
    try:
        entry = pwd.getpwuid(os.getuid())
    except KeyError as exc:
        raise ResealError("account_passwd_entry_unavailable") from exc
    home = Path(entry.pw_dir)
    _validate_account_home_location(home, entry.pw_name)
    _require_physical_account_home_root()
    return _require_physical_user_directory(home, "account_home")

def _configured_output_root() -> Path:
    root = _account_home() / "Downloads"
    _receipt_safe_path(root, "candidate_build_write_scope")
    return root

def _physical_output_root() -> Path:
    return _require_physical_user_directory(
        _configured_output_root(),
        "output_root",
    )

def _reject_source_checkout_overlap(path: Path) -> None:
    source_root = ROOT.resolve(strict=True)
    candidate = path.resolve(strict=False)
    if candidate == source_root or source_root in candidate.parents:
        raise ResealError("output_under_source_checkout")

def _revalidate_output_parent_chain(output: Path) -> None:
    configured = _configured_output_root()
    lexical_parent = Path(os.path.abspath(os.fspath(output.parent)))
    if lexical_parent != configured and configured not in lexical_parent.parents:
        raise ResealError("output_outside_downloads")

    allowed = _physical_output_root()
    try:
        parent = output.parent.resolve(strict=True)
    except OSError as exc:
        raise ResealError("output_parent_unavailable") from exc
    if parent != output.parent:
        raise ResealError("output_parent_alias_forbidden")
    if parent != allowed and allowed not in parent.parents:
        raise ResealError("output_parent_escaped_downloads")

    current = parent
    while True:
        _require_physical_user_directory(current, "output_parent")
        if current == allowed:
            break
        if current == current.parent or allowed not in current.parents:
            raise ResealError("output_parent_escaped_downloads")
        current = current.parent

def _reject_descendant_mountpoints(path: Path, label: str) -> None:
    for mountpoint in _mount_points():
        if mountpoint == path or path in mountpoint.parents:
            raise ResealError(label + "_descendant_mountpoint_forbidden")

def _validate_output(output: Path) -> Path:
    _receipt_safe_path(output, "output")
    if not output.is_absolute():
        raise ResealError("output_must_be_absolute")
    _reject_source_checkout_overlap(output)
    _revalidate_output_parent_chain(output)

    if output.exists() or output.is_symlink():
        raise ResealError("output_already_exists")
    if output.resolve(strict=False) != output:
        raise ResealError("output_path_not_canonical")
    return output

def _cleanup_fd_tree(directory_fd: int, expected_mount_id: int) -> None:
    if _fd_mount_id(directory_fd, "cleanup_directory") != expected_mount_id:
        raise ResealError("cleanup_mount_boundary_changed")
    entries = list(os.scandir(directory_fd))
    for entry in entries:
        st = os.stat(entry.name, dir_fd=directory_fd, follow_symlinks=False)
        if stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode):
            child_fd = os.open(
                entry.name,
                os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                dir_fd=directory_fd,
            )
            try:
                if _fd_mount_id(child_fd, "cleanup_child") != expected_mount_id:
                    raise ResealError("cleanup_descendant_mount_boundary_forbidden")
                _cleanup_fd_tree(child_fd, expected_mount_id)
            finally:
                os.close(child_fd)
            os.rmdir(entry.name, dir_fd=directory_fd)
        else:
            os.unlink(entry.name, dir_fd=directory_fd)

def _cleanup_candidate(
    parent_fd: int,
    candidate_fd: int,
    candidate_name: str,
    candidate_identity: tuple[int, int, int, int, int],
) -> tuple[bool, bool, bool, str]:
    try:
        candidate_mount_id = _fd_mount_id(candidate_fd, "cleanup_candidate")
        _cleanup_fd_tree(candidate_fd, candidate_mount_id)
    except (OSError, ResealError) as exc:
        return (
            True,
            False,
            True,
            "candidate_tree_cleanup_failed:" + exc.__class__.__name__ + ":" + str(exc),
        )
    try:
        visible = os.stat(candidate_name, dir_fd=parent_fd, follow_symlinks=False)
    except FileNotFoundError:
        if os.fstat(candidate_fd).st_nlink == 0:
            return (True, True, False, "candidate_already_unlinked")
        return (True, False, True, "candidate_root_name_missing")
    except OSError as exc:
        return (True, False, True, "candidate_root_observation_failed:" + exc.__class__.__name__)
    if _directory_lease_identity(visible) != candidate_identity:
        return (True, False, True, "candidate_root_generation_mismatch")
    try:
        os.rmdir(candidate_name, dir_fd=parent_fd)
    except OSError as exc:
        return (True, False, True, "candidate_root_remove_failed:" + exc.__class__.__name__)
    return (True, True, False, "candidate_removed")

def build(output: Path) -> None:
    global _CANDIDATE_CREATED
    global _CLEANUP_ATTEMPTED, _CLEANUP_COMPLETED, _CLEANUP_RESIDUAL_UNKNOWN, _CLEANUP_REASON

    verify_source()
    output = _validate_output(output)

    parent_fd = candidate_fd = git_fd = objects_fd = pack_fd = refs_fd = heads_fd = -1
    parent_identity = candidate_identity = None
    try:
        parent_fd = os.open(
            output.parent,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        )
        parent_identity = _directory_lease_identity(os.fstat(parent_fd))
        _revalidate_parent_lease(output, parent_fd, parent_identity)

        os.mkdir(output.name, mode=0o700, dir_fd=parent_fd)
        _CANDIDATE_CREATED = True
        # Child creation may change directory link counts; the stable retained
        # lease intentionally excludes link count and is revalidated here before
        # the candidate descriptor is admitted.
        _revalidate_parent_lease(output, parent_fd, parent_identity)
        candidate_fd = os.open(
            output.name,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
            dir_fd=parent_fd,
        )
        candidate_identity = _directory_lease_identity(os.fstat(candidate_fd))
        _revalidate_candidate_lease(
            output, parent_fd, parent_identity, candidate_fd, candidate_identity
        )

        os.mkdir(".git", mode=0o700, dir_fd=candidate_fd)
        git_fd = _open_directory_at(candidate_fd, ".git", "candidate_git")
        _reject_mountpoint_alias(output / ".git", "candidate_git")
        for name in ("objects", "refs", "info"):
            os.mkdir(name, mode=0o700, dir_fd=git_fd)
        objects_fd = _open_directory_at(git_fd, "objects", "candidate_objects")
        _reject_mountpoint_alias(output / ".git" / "objects", "candidate_objects")
        os.mkdir("info", mode=0o700, dir_fd=objects_fd)
        os.mkdir("pack", mode=0o700, dir_fd=objects_fd)
        pack_fd = _open_directory_at(objects_fd, "pack", "candidate_pack")
        _reject_mountpoint_alias(output / ".git" / "objects" / "pack", "candidate_pack")
        refs_fd = _open_directory_at(git_fd, "refs", "candidate_refs")
        _reject_mountpoint_alias(output / ".git" / "refs", "candidate_refs")
        os.mkdir("heads", mode=0o700, dir_fd=refs_fd)
        os.mkdir("tags", mode=0o700, dir_fd=refs_fd)
        heads_fd = _open_directory_at(refs_fd, "heads", "candidate_heads")
        _reject_mountpoint_alias(output / ".git" / "refs" / "heads", "candidate_heads")

        _revalidate_candidate_lease(
            output, parent_fd, parent_identity, candidate_fd, candidate_identity
        )
        _write_new_regular_at(git_fd, "config", CONFIG_TEXT.encode("utf-8"), 0o644, "candidate_config")
        _write_new_regular_at(git_fd, "HEAD", b"ref: refs/heads/main\n", 0o644, "candidate_head")
        _revalidate_candidate_lease(
            output, parent_fd, parent_identity, candidate_fd, candidate_identity
        )

        pack_prefix = "/proc/self/fd/" + str(pack_fd) + "/pack"
        pack_id_raw = _run(
            ROOT,
            "pack-objects",
            "--revs",
            pack_prefix,
            input_data=(TARGET_HEAD + "\n").encode("ascii"),
            pass_fds=(pack_fd,),
        )
        try:
            pack_id = pack_id_raw.decode("ascii", "strict").strip()
        except UnicodeDecodeError as exc:
            raise ResealError("pack_id_not_ascii") from exc
        if HEX40.fullmatch(pack_id) is None:
            raise ResealError("pack_id_invalid")
        pack_name = "pack-" + pack_id + ".pack"
        index_name = "pack-" + pack_id + ".idx"
        expected_entries = {pack_name, index_name}
        actual_entries = set(os.listdir(pack_fd))
        if actual_entries != expected_entries:
            raise ResealError("pack_directory_layout_invalid")
        pack_stat = os.stat(pack_name, dir_fd=pack_fd, follow_symlinks=False)
        index_stat = os.stat(index_name, dir_fd=pack_fd, follow_symlinks=False)
        if (
            not stat.S_ISREG(pack_stat.st_mode)
            or not stat.S_ISREG(index_stat.st_mode)
            or pack_stat.st_nlink != 1
            or index_stat.st_nlink != 1
        ):
            raise ResealError("pack_file_metadata_invalid")
        _run(
            ROOT,
            "verify-pack",
            "-s",
            "/proc/self/fd/" + str(pack_fd) + "/" + index_name,
            pass_fds=(pack_fd,),
        )

        _write_new_regular_at(
            heads_fd,
            "main",
            (TARGET_HEAD + "\n").encode("ascii"),
            0o644,
            "candidate_main_ref",
        )
        _revalidate_candidate_lease(
            output, parent_fd, parent_identity, candidate_fd, candidate_identity
        )

        _candidate_run(
            candidate_fd, git_fd, objects_fd,
            "reset", "--hard", TARGET_HEAD,
        )
        _revalidate_candidate_lease(
            output, parent_fd, parent_identity, candidate_fd, candidate_identity
        )
        verify_candidate_lease(
            output,
            parent_fd,
            parent_identity,
            candidate_fd,
            candidate_identity,
            git_fd,
            objects_fd,
        )
    except BaseException:
        if parent_fd >= 0 and candidate_fd >= 0 and candidate_identity is not None:
            (
                _CLEANUP_ATTEMPTED,
                _CLEANUP_COMPLETED,
                _CLEANUP_RESIDUAL_UNKNOWN,
                _CLEANUP_REASON,
            ) = _cleanup_candidate(
                parent_fd, candidate_fd, output.name, candidate_identity
            )
        elif _CANDIDATE_CREATED:
            _CLEANUP_ATTEMPTED = False
            _CLEANUP_COMPLETED = False
            _CLEANUP_RESIDUAL_UNKNOWN = True
            _CLEANUP_REASON = "candidate_created_before_descriptor_lease"
        raise
    finally:
        for fd in (heads_fd, refs_fd, pack_fd, objects_fd, git_fd, candidate_fd, parent_fd):
            if fd >= 0:
                try:
                    os.close(fd)
                except OSError:
                    pass

    print(MARKER)
    print("status=FULL_HISTORY_RESEAL_CANDIDATE_GREEN")
    print("output=" + _receipt_safe_path(output, "output"))
    print("target_head=" + TARGET_HEAD)
    print("target_tree=" + TARGET_TREE)
    print("reachable_commits=" + str(EXPECTED_REACHABLE_COMMITS))
    print("descriptor_bound_candidate_mutation=true")
    print("mountpoint_alias_rejection=true")
    print("candidate_cleanup_attempted=false")
    print("candidate_retained_on_success=true")
    print("source_repository_mutation=false")
    print("protected_filesystem_mutation=false")
    print("network=false")
    print("protected_replace_authorized=false")

def self_test() -> None:
    if len(TARGET_PARENTS) != 2 or any(HEX40.fullmatch(p) is None for p in TARGET_PARENTS):
        raise AssertionError("parent_constants_invalid")
    if CONFIG_TEXT.count("[core]") != 1:
        raise AssertionError("config_contract_invalid")
    with tempfile.TemporaryDirectory(prefix="void-v7-reseal-self-test-") as td:
        p = Path(td) / "candidate"
        p.mkdir()
        (p / ".git").mkdir()
        (p / ".git" / "objects").mkdir()
        (p / ".git" / "config").write_text(CONFIG_TEXT, "utf-8")
        _config_exact(p)
        (p / ".git" / "shallow").write_text(TARGET_HEAD + "\n", "ascii")
        if not any(x.name == "shallow" and x.exists() for x in _forbidden_metadata(p)):
            raise AssertionError("shallow_fixture_not_detected")
    for separator in ("\n", "\r", "\x85", "\u2028", "\u2029"):
        try:
            _receipt_safe_path(
                Path("/tmp/bad" + separator + "status=FORGED"),
                "self_test",
            )
        except ResealError as exc:
            if str(exc) != "self_test_path_line_or_control_character":
                raise
        else:
            raise AssertionError("receipt_line_separator_fixture_not_rejected")
    with tempfile.TemporaryDirectory(prefix="void-v7-reseal-dir-self-test-") as td:
        physical = Path(td) / "physical"
        alias = Path(td) / "alias"
        physical.mkdir()
        alias.symlink_to(physical, target_is_directory=True)
        _require_physical_user_directory(physical, "self_test_physical")
        try:
            _require_physical_user_directory(alias, "self_test_alias")
        except ResealError as exc:
            if str(exc) != "self_test_alias_directory_alias_forbidden":
                raise
        else:
            raise AssertionError("physical_directory_alias_fixture_not_rejected")
    try:
        _validate_account_home_location(Path("/opt/void-service"), "void-service")
    except ResealError as exc:
        if str(exc) != "account_home_outside_allowed_user_root":
            raise
    else:
        raise AssertionError("protected_account_home_fixture_not_rejected")
    try:
        _reject_source_checkout_overlap(ROOT / ".git" / "reseal")
    except ResealError as exc:
        if str(exc) != "output_under_source_checkout":
            raise
    else:
        raise AssertionError("source_checkout_output_fixture_not_rejected")
    fake_mount = Path("/home/test/Downloads/bind")
    try:
        _reject_mountpoint_alias(fake_mount, "self_test_mount", frozenset((Path("/"), fake_mount)))
    except ResealError as exc:
        if str(exc) != "self_test_mount_mountpoint_alias_forbidden":
            raise
    else:
        raise AssertionError("mountpoint_alias_fixture_not_rejected")
    with tempfile.TemporaryDirectory(prefix="void-v7-reseal-cleanup-self-test-") as td:
        parent = Path(td)
        parent_fd = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try:
            os.mkdir("candidate", mode=0o700, dir_fd=parent_fd)
            candidate_fd = os.open(
                "candidate",
                os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                dir_fd=parent_fd,
            )
            try:
                candidate_identity = _directory_lease_identity(os.fstat(candidate_fd))
                _write_new_regular_at(candidate_fd, "probe", b"x", 0o600, "self_test_cleanup")
                attempted, completed, residual, reason = _cleanup_candidate(
                    parent_fd, candidate_fd, "candidate", candidate_identity
                )
                if not attempted or not completed or residual or reason != "candidate_removed":
                    raise AssertionError("cleanup_success_fixture_failed")
            finally:
                os.close(candidate_fd)
        finally:
            os.close(parent_fd)
    print(MARKER + "_SELF_TEST_GREEN")
    print("receipt_line_separators_rejected=true")
    print("passwd_account_home_required=true")
    print("account_home_directly_under_physical_home_root_required=true")
    print("protected_account_home_rejected=true")
    print("physical_downloads_root_required=true")
    print("output_parent_aliases_rejected=true")
    print("source_checkout_output_rejected=true")
    print("mountpoint_aliases_rejected=true")
    print("descriptor_bound_candidate_mutation=true")
    print("directory_lease_link_count_independent=true")
    print("cleanup_failure_receipt_bound=true")
    print("cleanup_mount_boundary_rejection_bound=true")
    print("exact_target_commit_tree_parents_bound=true")
    print("complete_reachable_object_graph_required=true")
    print("single_process_pack_and_index_generation=true")
    print("closed_git_config_required=true")
    print("shallow_graft_alternate_commondir_rejected=true")
    print("output_restricted_to_downloads=true")
    print("protected_filesystem_mutation=false")
    print("network=false")

def plan() -> None:
    result = verify_source()
    print(MARKER)
    print("mode=plan")
    print("source_only=true")
    for key, value in result.items():
        if isinstance(value, tuple):
            print(key + "=" + ",".join(value))
        else:
            print(key + "=" + str(value))
    print("candidate_build_write_scope=" + _receipt_safe_path(_configured_output_root(), "candidate_build_write_scope"))
    print("protected_filesystem_mutation=false")
    print("network=false")
    print("protected_replace_authorized=false")

def main() -> int:
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--build", action="store_true")
    ap.add_argument("--output", type=Path)
    ns = ap.parse_args()
    if ns.self_test:
        self_test(); return 0
    if ns.plan:
        plan(); return 0
    if ns.output is None:
        raise ResealError("output_required")
    build(ns.output)
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ResealError, OSError, subprocess.SubprocessError, ValueError) as exc:
        print(MARKER); print("status=HOLD"); print("reason=" + re.sub(r"[^A-Za-z0-9_:./-]", "_", str(exc)[:500]))
        print("candidate_created=" + str(_CANDIDATE_CREATED).lower())
        print("candidate_cleanup_attempted=" + str(_CLEANUP_ATTEMPTED).lower())
        print("candidate_cleanup_completed=" + str(_CLEANUP_COMPLETED).lower())
        print("candidate_cleanup_residual_unknown=" + str(_CLEANUP_RESIDUAL_UNKNOWN).lower())
        print("candidate_cleanup_reason=" + re.sub(r"[^A-Za-z0-9_:.-]", "_", _CLEANUP_REASON[:300]))
        print("source_repository_mutation=false"); print("protected_filesystem_mutation=false"); print("network=false")
        print("protected_replace_authorized=false"); raise SystemExit(2)
