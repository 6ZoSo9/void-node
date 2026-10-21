#!/usr/bin/env python3
# Built-in-only first import: non-isolated Python must HOLD before a checkout
# shadow of __future__ (or any other non-built-in module) can execute.

# Built-in-only bootstrap guard. This does not authenticate Python startup hooks;
# privileged execution still requires a separately reviewed trusted launcher.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V5"
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_mode_required")
        print("protected_filesystem_mutation=false")
        print("service_mutation=false")
        print("credential_access=false")
        print("signing=false")
        print("transaction=false")
        print("funds_movement=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_mode_required")

import argparse
import ctypes
import hashlib
import json
import os
import pathlib
import shutil
import stat
import tempfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_v7_protected_substrate_install_plan_v5"
PLAN_PREFIX = "voidv7substrateinstallplan5_"
CONFIRM_TOKEN = "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V5_CREATE_ONLY"

PREDECESSOR_MERGE = "0ada7fde0d90c3946b10693f4621cbd690bfcde6"
PREDECESSOR_TREE = "9e930fba9aacfafb5b163767302786cd7f31c81e"
LOCK_REL = "ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json"
LOCK_BLOB = "831f6e3f79a62a334662cebc6d2c39133bc7a309"
LOCK_ID = "voidv7substratelock1_6014a83805170202a6117b6004b94e1daddb2dd9123c17802002e72c8002a649"
MATERIALIZER_REL = "scripts/materialize_buy_void_v7_protected_substrate_v2.py"
MATERIALIZER_BLOB = "474614da950db72082fb95a5174405ce8caf2513"
PREDECESSOR_INSTALLER_REL = "ops/precision/void_buy_void_v7_protected_substrate_install_v3.py"
PREDECESSOR_INSTALLER_BLOB = "4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38"
PREDECESSOR_QUALIFIER_REL = "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v3.py"
PREDECESSOR_QUALIFIER_BLOB = "ea3c31180810ea4efe4341683742827dcf6ac5ac"
V4_INSTALLER_REL = "ops/precision/void_buy_void_v7_protected_substrate_install_v4.py"
V4_INSTALLER_BLOB = "4448acb51cbc15d845550a55cd11c38f4185a7b3"
FULL_HISTORY_INSTALLER_REL = "ops/precision/void_v7_full_history_protected_replica_install_v1.py"
FULL_HISTORY_INSTALLER_BLOB = "a4d5762fe0e1c41b0919b8abb827123e556552ca"
QUALIFIER_REL = "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v4.py"
QUALIFIER_BLOB = "69b1ff028487a139470671cf0afb8937a299897d"

SOURCE_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
SOURCE_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
LIVE_RELEASE = pathlib.Path("/opt/void-node-live/releases/" + SOURCE_HEAD)
SOURCE_RELEASE = pathlib.Path("/opt/void-v7-source-release-full-history-v1")
INSTALL_PARENT = pathlib.Path("/opt")
SOURCE_NAME = "void-buy-void-v7-reviewed-v1"
PREENTRY_DIR_NAME = "void-buy-void-v7-preentry-v1"
SELECTOR_DIR_NAME = "void-buy-void-v7-selector-v1"
SOURCE_TARGET = INSTALL_PARENT / SOURCE_NAME
PREENTRY_DIR = INSTALL_PARENT / PREENTRY_DIR_NAME
SELECTOR_DIR = INSTALL_PARENT / SELECTOR_DIR_NAME
PREENTRY_NAME = "void_buy_void_source_finality_v7_native_preentry_v1"
SELECTOR_NAME = "void_buy_void_source_finality_live_process_v2_selector_guard_v1"
PREENTRY_TARGET = PREENTRY_DIR / PREENTRY_NAME
SELECTOR_TARGET = SELECTOR_DIR / SELECTOR_NAME
SOURCE_RELEASE_ROOT_MODE = 0o555
PROTECTED_SOURCE_ROOT_MODE = 0o755
SOURCE_STAGE_NAME = ".void-buy-void-v7-reviewed-v1.stage-v3"
PREENTRY_STAGE_NAME = ".void-buy-void-v7-preentry-v1.stage-v3"
SELECTOR_STAGE_NAME = ".void-buy-void-v7-selector-v1.stage-v3"
SOURCE_STAGE = INSTALL_PARENT / SOURCE_STAGE_NAME
PREENTRY_STAGE = INSTALL_PARENT / PREENTRY_STAGE_NAME
SELECTOR_STAGE = INSTALL_PARENT / SELECTOR_STAGE_NAME
NATIVE_SHA256 = "8ce663ff7e3713fc6bf615dd743350be9e50dff729fdb3d609b065b158397851"
NATIVE_BYTES = 21600
SELECTOR_SHA256 = "048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232"
SELECTOR_BYTES = 26680
RUNTIME_UID = 1000
RUNTIME_GID = 1000
PR_SET_NO_NEW_PRIVS = 38
MAX_NODES = 250000
MAX_FILE_BYTES = 512 * 1024 * 1024
MAX_TOTAL_BYTES = 16 * 1024 * 1024 * 1024
COPY_CHUNK = 1024 * 1024
RENAME_NOREPLACE = 1
_PUBLISHED: list[str] = []
_CREATED_STAGES: set[pathlib.Path] = set()
_WRITE_PERFORMED = False

class InstallError(RuntimeError):
    pass

def sha256_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw)
    return h.hexdigest()

def _runtime_uid_write_audit_builtin(paths: list[pathlib.Path], label: str) -> None:
    unique = sorted({os.path.abspath(os.fspath(path)) for path in paths})
    if not unique:
        return
    for raw_path in unique:
        path = pathlib.Path(raw_path)
        if not path.exists() and not path.is_symlink():
            raise InstallError(label + "_runtime_write_audit_path_missing")
    if os.geteuid() == RUNTIME_UID and os.getegid() == RUNTIME_GID:
        for raw_path in unique:
            if os.access(raw_path, os.W_OK, effective_ids=True):
                raise InstallError(label + "_runtime_writable")
        return
    if os.geteuid() != 0 or os.getuid() != 0:
        raise InstallError(label + "_runtime_write_audit_identity_invalid")
    pid = os.fork()
    if pid == 0:
        try:
            os.setgroups([])
            os.setgid(RUNTIME_GID)
            os.setuid(RUNTIME_UID)
            for raw_path in unique:
                if os.access(raw_path, os.W_OK, effective_ids=True):
                    os._exit(3)
            os._exit(0)
        except BaseException:
            os._exit(5)
    waited, status = os.waitpid(pid, 0)
    if waited != pid or not os.WIFEXITED(status):
        raise InstallError(label + "_runtime_write_audit_child_abnormal")
    code = os.WEXITSTATUS(status)
    if code == 0:
        return
    if code == 3:
        raise InstallError(label + "_runtime_writable")
    raise InstallError(label + "_runtime_write_audit_failed")

def _require_runtime_uid_nonwritable(paths: list[pathlib.Path], label: str) -> None:
    _runtime_uid_write_audit_builtin(paths, label)

def require_privileged_source_custody() -> None:
    if os.geteuid() != 0 or os.getuid() != 0:
        raise InstallError("root_required_for_privileged_source_custody")
    source_root = pathlib.Path(os.path.abspath(os.fspath(ROOT)))
    if source_root.resolve(strict=True) != source_root:
        raise InstallError("privileged_source_root_alias_forbidden")

    runtime_paths: list[pathlib.Path] = []
    runtime_records: list[tuple[pathlib.Path, tuple[int, int, int, int, int, int, int, int, int]]] = []
    ancestor_records: list[tuple[pathlib.Path, tuple[int, int, int, int, int, int, int, int, int]]] = []
    current = source_root
    while True:
        st = os.lstat(current)
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or st.st_gid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise InstallError("privileged_source_ancestor_custody_invalid:" + os.fspath(current))
        identity = _metadata_identity(st)
        runtime_paths.append(current)
        ancestor_records.append((current, identity))
        if current == current.parent:
            break
        current = current.parent

    # No root traversal begins until the exact runtime identity is unable to
    # mutate the source root or any ancestor.
    _require_runtime_uid_nonwritable(runtime_paths, "privileged_source_ancestors")
    for path, expected in ancestor_records:
        if _metadata_identity(path.lstat()) != expected:
            raise InstallError("privileged_source_ancestor_generation_changed:" + os.fspath(path))

    root_identity = _metadata_identity(source_root.lstat())
    pending: list[tuple[pathlib.Path, tuple[int, int, int, int, int, int, int, int, int]]] = [
        (source_root, root_identity)
    ]
    symlinks: list[
        tuple[pathlib.Path, tuple[int, int, int, int, int, int, int, int, int], str]
    ] = []
    checked = 0

    while pending:
        directory, expected_directory = pending.pop()
        before = directory.lstat()
        if (
            _metadata_identity(before) != expected_directory
            or not stat.S_ISDIR(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
        ):
            raise InstallError("privileged_source_directory_generation_changed_before_descent:" + os.fspath(directory))
        _require_runtime_uid_nonwritable([directory], "privileged_source_directory_pre_descent")
        if _metadata_identity(directory.lstat()) != expected_directory:
            raise InstallError("privileged_source_directory_generation_changed_before_scandir:" + os.fspath(directory))

        entry_names: list[str] = []
        try:
            with os.scandir(directory) as scan:
                for entry in scan:
                    checked += 1
                    if checked > MAX_NODES:
                        raise InstallError("privileged_source_node_limit")
                    entry_names.append(entry.name)
        except OSError as exc:
            raise InstallError("privileged_source_scandir_failed:" + os.fspath(directory)) from exc
        if _metadata_identity(directory.lstat()) != expected_directory:
            raise InstallError("privileged_source_directory_generation_changed_during_scandir:" + os.fspath(directory))

        for entry_name in entry_names:
            path = directory / entry_name
            st = os.lstat(path)
            if st.st_uid != 0 or st.st_gid != 0:
                raise InstallError("privileged_source_node_owner_invalid:" + os.fspath(path))
            mode = stat.S_IMODE(st.st_mode)
            identity = _metadata_identity(st)

            if stat.S_ISLNK(st.st_mode):
                symlinks.append((path, identity, os.readlink(path)))
                continue

            if mode & 0o022:
                raise InstallError("privileged_source_node_writable:" + os.fspath(path))
            runtime_paths.append(path)
            runtime_records.append((path, identity))

            if stat.S_ISDIR(st.st_mode):
                # Establish ACL-aware non-writability before the child can ever
                # become a future scandir target.
                _require_runtime_uid_nonwritable([path], "privileged_source_directory_pre_queue")
                if _metadata_identity(path.lstat()) != identity:
                    raise InstallError("privileged_source_directory_generation_changed_before_queue:" + os.fspath(path))
                pending.append((path, identity))
            elif not stat.S_ISREG(st.st_mode):
                raise InstallError("privileged_source_node_kind_invalid:" + os.fspath(path))

    # Retain the whole-tree terminal audit and generation census.
    _require_runtime_uid_nonwritable(runtime_paths, "privileged_source")
    for path, expected in ancestor_records:
        if _metadata_identity(path.lstat()) != expected:
            raise InstallError("privileged_source_ancestor_generation_changed_terminal:" + os.fspath(path))
    for path, expected in runtime_records:
        if _metadata_identity(path.lstat()) != expected:
            raise InstallError("privileged_source_node_generation_changed_terminal:" + os.fspath(path))

    # Resolve symlinks only after every mutation-capable directory is behind the
    # ACL barrier. Parent directories are now immutable to the runtime identity.
    for path, expected, target in symlinks:
        if _metadata_identity(path.lstat()) != expected or os.readlink(path) != target:
            raise InstallError("privileged_source_symlink_generation_changed:" + os.fspath(path))
        try:
            resolved = path.resolve(strict=True)
        except OSError as exc:
            raise InstallError("privileged_source_symlink_unavailable:" + os.fspath(path)) from exc
        if resolved != source_root and source_root not in resolved.parents:
            raise InstallError("privileged_source_symlink_escape:" + os.fspath(path))

def _metadata_identity(st: os.stat_result) -> tuple[int, int, int, int, int, int, int, int, int]:
    return (
        st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode, st.st_nlink,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )

def _read_tool_fd(fd: int, max_bytes: int, label: str) -> bytes:
    os.lseek(fd, 0, os.SEEK_SET)
    chunks: list[bytes] = []
    total = 0
    while True:
        part = os.read(fd, 1024 * 1024)
        if not part:
            break
        total += len(part)
        if total > max_bytes:
            raise InstallError(label + "_tool_size_limit")
        chunks.append(part)
    os.lseek(fd, 0, os.SEEK_SET)
    return b"".join(chunks)

def _read_metadata_file(path: pathlib.Path, label: str, max_bytes: int = 1024 * 1024) -> tuple[bytes, tuple[int, int, int, int, int, int, int, int, int]]:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 0
        or before.st_size > max_bytes
    ):
        raise InstallError(label + "_metadata_file_invalid:" + os.fspath(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if _metadata_identity(opened) != _metadata_identity(before):
            raise InstallError(label + "_metadata_file_rebound:" + os.fspath(path))
        chunks: list[bytes] = []
        remaining = opened.st_size + 1
        while remaining:
            part = os.read(fd, min(64 * 1024, remaining))
            if not part:
                break
            chunks.append(part)
            remaining -= len(part)
        raw = b"".join(chunks)
        if len(raw) != opened.st_size:
            raise InstallError(label + "_metadata_file_size_changed:" + os.fspath(path))
        after = os.fstat(fd)
        visible = path.lstat()
        if _metadata_identity(after) != _metadata_identity(opened):
            raise InstallError(label + "_metadata_file_generation_changed:" + os.fspath(path))
        if _metadata_identity(visible) != _metadata_identity(opened):
            raise InstallError(label + "_metadata_file_visible_changed:" + os.fspath(path))
        return raw, _metadata_identity(opened)
    finally:
        os.close(fd)

_GIT_CONFIG_ALLOWED_KEYS = {
    "core": frozenset(("repositoryformatversion", "filemode", "bare", "logallrefupdates")),
    "remote": frozenset(("url", "fetch")),
    "branch": frozenset(("remote", "merge")),
}

def _git_config_closed(raw: bytes, label: str) -> None:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise InstallError(label + "_git_config_not_utf8") from exc
    if "\x00" in text:
        raise InstallError(label + "_git_config_nul")
    section = ""
    section_token = ""
    for lineno, original in enumerate(text.splitlines(), 1):
        line = original.strip()
        if not line or line.startswith("#") or line.startswith(";"):
            continue
        if line.endswith("\\"):
            raise InstallError(label + "_git_config_continuation_forbidden:" + str(lineno))
        if line.startswith("["):
            if not line.endswith("]"):
                raise InstallError(label + "_git_config_section_invalid:" + str(lineno))
            section = line[1:-1].strip().lower()
            section_token = section.split(None, 1)[0].split(".", 1)[0] if section else ""
            if section_token in ("include", "includeif"):
                raise InstallError(label + "_git_config_include_forbidden")
            if section_token == "filter":
                raise InstallError(label + "_git_config_filter_forbidden")
            if section_token == "extensions":
                raise InstallError(label + "_git_config_extension_forbidden:section")
            if section_token not in _GIT_CONFIG_ALLOWED_KEYS:
                raise InstallError(label + "_git_config_section_forbidden:" + str(lineno))
            continue
        key_part = line.split("=", 1)[0].strip()
        key = key_part.split(None, 1)[0].lower() if key_part else ""
        if not key or not section_token:
            raise InstallError(label + "_git_config_key_invalid:" + str(lineno))
        if key.startswith("include.") or key.startswith("includeif."):
            raise InstallError(label + "_git_config_include_forbidden")
        if section_token == "core" and key == "worktree":
            raise InstallError(label + "_git_config_core_worktree_forbidden")
        if section_token == "core" and key == "attributesfile":
            raise InstallError(label + "_git_config_core_attributesfile_forbidden")
        if section_token == "remote" and key in ("promisor", "partialclonefilter"):
            raise InstallError(label + "_git_config_promisor_forbidden")
        if key not in _GIT_CONFIG_ALLOWED_KEYS[section_token]:
            raise InstallError(label + "_git_config_key_forbidden:" + section_token + "." + key)

def _direct_git_metadata_snapshot(
    root: pathlib.Path,
    label: str,
    *,
    allow_shallow: bool = False,
) -> tuple[object, ...]:
    root_abs = pathlib.Path(os.path.abspath(os.fspath(root)))
    try:
        if root_abs.resolve(strict=True) != root_abs:
            raise InstallError(label + "_git_root_alias_forbidden")
    except OSError as exc:
        raise InstallError(label + "_git_root_unavailable") from exc
    git_dir = root_abs / ".git"
    gst = git_dir.lstat()
    if not stat.S_ISDIR(gst.st_mode) or stat.S_ISLNK(gst.st_mode):
        raise InstallError(label + "_git_dir_must_be_real_directory")
    if git_dir.resolve(strict=True) != git_dir:
        raise InstallError(label + "_git_dir_alias_forbidden")
    objects = git_dir / "objects"
    ost = objects.lstat()
    if not stat.S_ISDIR(ost.st_mode) or stat.S_ISLNK(ost.st_mode):
        raise InstallError(label + "_git_objects_must_be_real_directory")
    if objects.resolve(strict=True) != objects:
        raise InstallError(label + "_git_objects_alias_forbidden")
    forbidden = (
        git_dir / "commondir",
        git_dir / "config.worktree",
        git_dir / "info" / "grafts",
        objects / "info" / "alternates",
        objects / "info" / "http-alternates",
    )
    for path in forbidden:
        if path.exists() or path.is_symlink():
            raise InstallError(label + "_git_metadata_indirection_forbidden:" + path.name)
    shallow = git_dir / "shallow"
    if not allow_shallow and (shallow.exists() or shallow.is_symlink()):
        raise InstallError(label + "_git_metadata_indirection_forbidden:shallow")
    config_raw, config_identity = _read_metadata_file(git_dir / "config", label + "_git_config")
    _git_config_closed(config_raw, label)
    return (
        _metadata_identity(gst),
        _metadata_identity(ost),
        config_identity,
        sha256_bytes(config_raw),
    )

def _direct_main_ref(
    root: pathlib.Path,
    label: str,
    *,
    allow_shallow: bool = False,
) -> str:
    before = _direct_git_metadata_snapshot(root, label, allow_shallow=allow_shallow)
    git_dir = root / ".git"
    head_raw, head_id = _read_metadata_file(git_dir / "HEAD", label + "_git_head", 4096)
    if head_raw != b"ref: refs/heads/main\n":
        raise InstallError(label + "_git_head_not_main")
    ref_path = git_dir / "refs" / "heads" / "main"
    ref_raw, ref_id = _read_metadata_file(ref_path, label + "_git_main_ref", 4096)
    if (
        len(ref_raw) != 41
        or not ref_raw.endswith(b"\n")
        or any(ch not in b"0123456789abcdef" for ch in ref_raw[:-1])
    ):
        raise InstallError(label + "_git_main_ref_invalid")
    head_raw2, head_id2 = _read_metadata_file(git_dir / "HEAD", label + "_git_head_terminal", 4096)
    ref_raw2, ref_id2 = _read_metadata_file(ref_path, label + "_git_main_ref_terminal", 4096)
    after = _direct_git_metadata_snapshot(root, label, allow_shallow=allow_shallow)
    if (
        before != after
        or head_raw2 != head_raw
        or head_id2 != head_id
        or ref_raw2 != ref_raw
        or ref_id2 != ref_id
    ):
        raise InstallError(label + "_git_ref_generation_changed")
    return ref_raw[:-1].decode("ascii")

def require_git_metadata_provenance(root: pathlib.Path, label: str) -> str:
    return _direct_main_ref(root, label)

def _write_git_metadata_fixture(
    root: pathlib.Path,
    config: str = "[core]\nrepositoryformatversion = 0\nbare = false\n",
) -> None:
    (root / ".git" / "objects" / "info").mkdir(parents=True)
    (root / ".git" / "info").mkdir(parents=True)
    (root / ".git" / "config").write_text(config, "utf-8")

def _assert_git_metadata_fixture_rejected(mutator: Any) -> None:
    with tempfile.TemporaryDirectory(prefix="void-v7-git-metadata-self-test-") as td:
        root = pathlib.Path(td) / "repo"
        root.mkdir()
        _write_git_metadata_fixture(root)
        mutator(root)
        try:
            _direct_git_metadata_snapshot(root, "self_test")
        except InstallError:
            return
        raise AssertionError("git_metadata_adversary_not_rejected")

def install_parent_custody() -> tuple[tuple[str, int, int, int, int, int, int], ...]:
    current = INSTALL_PARENT
    first = True
    rows: list[tuple[str, int, int, int, int, int, int]] = []
    runtime_paths: list[pathlib.Path] = []
    while True:
        st = os.lstat(current)
        mode = stat.S_IMODE(st.st_mode)
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or st.st_gid != 0
            or mode & 0o022
        ):
            raise InstallError("install_parent_custody_invalid:" + os.fspath(current))
        if first and mode != 0o755:
            raise InstallError("install_parent_mode_invalid:" + os.fspath(current))
        rows.append((os.fspath(current), st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode, st.st_nlink))
        runtime_paths.append(current)
        if current == current.parent:
            break
        current = current.parent
        first = False
    _require_runtime_uid_nonwritable(runtime_paths, "install_parent")
    return tuple(rows)

def install_parent_fd_matches(fd: int, expected: tuple[tuple[str, int, int, int, int, int, int], ...]) -> bool:
    if not expected or expected[0][0] != os.fspath(INSTALL_PARENT):
        return False
    st = os.fstat(fd)
    row = expected[0]
    return (st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode, st.st_nlink) == row[1:]

def source_release_ancestor_custody() -> tuple[tuple[str, int, int, int, int, int, int], ...]:
    current = SOURCE_RELEASE.parent
    rows: list[tuple[str, int, int, int, int, int, int]] = []
    audit_paths: list[pathlib.Path] = []
    while True:
        st = os.lstat(current)
        mode = stat.S_IMODE(st.st_mode)
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or st.st_gid != 0
            or mode & 0o022
        ):
            raise InstallError("source_release_ancestor_custody_invalid:" + os.fspath(current))
        rows.append((os.fspath(current), st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode, st.st_nlink))
        audit_paths.append(current)
        if current == current.parent:
            break
        current = current.parent
    _require_runtime_uid_nonwritable(audit_paths, "source_release_ancestors")
    return tuple(rows)

def revalidate_source_release_ancestor_custody(
    expected: tuple[tuple[str, int, int, int, int, int, int], ...]
) -> None:
    observed = source_release_ancestor_custody()
    if observed != expected:
        raise InstallError("source_release_ancestor_generation_changed")

def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")

def _direct_blob_identity(path: pathlib.Path, expected_blob: str, label: str) -> bytes:
    raw, _identity = _read_metadata_file(path, label, MAX_FILE_BYTES)
    if git_blob_sha1(raw) != expected_blob:
        raise InstallError(label + "_blob_mismatch")
    return raw

def verify_repository(expected_head: str, expected_tree: str) -> None:
    if len(expected_head) != 40 or any(ch not in "0123456789abcdef" for ch in expected_head):
        raise InstallError("expected_head_invalid")
    if len(expected_tree) != 40 or any(ch not in "0123456789abcdef" for ch in expected_tree):
        raise InstallError("expected_tree_invalid")
    observed_head = require_git_metadata_provenance(ROOT, "checkout")
    if observed_head != expected_head:
        raise InstallError("checkout_head_mismatch")
    require_worktree_matches_tree(ROOT, expected_tree, "checkout")
    for rel, blob in {
        LOCK_REL: LOCK_BLOB,
        MATERIALIZER_REL: MATERIALIZER_BLOB,
        PREDECESSOR_INSTALLER_REL: PREDECESSOR_INSTALLER_BLOB,
        PREDECESSOR_QUALIFIER_REL: PREDECESSOR_QUALIFIER_BLOB,
        V4_INSTALLER_REL: V4_INSTALLER_BLOB,
        FULL_HISTORY_INSTALLER_REL: FULL_HISTORY_INSTALLER_BLOB,
        QUALIFIER_REL: QUALIFIER_BLOB,
    }.items():
        _direct_blob_identity(ROOT / rel, blob, "accepted_dependency:" + rel)

def accepted_lock(expected_head: str, expected_tree: str) -> dict[str, Any]:
    del expected_head, expected_tree
    raw = _direct_blob_identity(ROOT / LOCK_REL, LOCK_BLOB, "accepted_lock")
    try:
        lock = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InstallError("accepted_lock_json_invalid") from exc
    if not isinstance(lock, dict):
        raise InstallError("accepted_lock_shape_invalid")
    required = {
        "lock_id": LOCK_ID, "candidate_packet_identity_accepted": True,
        "native_preentry_binary_identity_accepted": True, "selector_binary_identity_accepted": True,
        "protected_source_generation_bound": True, "protected_substrate_install_authorized": False,
        "protected_installer_apply_authorized": False, "installed_qualification_authority": False,
        "receipt_publication_authorized": False, "provider_rpc_contact_authorized": False,
        "credential_access_authorized": False, "private_key_access_authorized": False,
        "signing_authorized": False, "transaction_authorized": False,
        "payment_acceptance_authorized": False, "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False, "funds_movement_authorized": False,
    }
    for key, value in required.items():
        if lock.get(key) != value:
            raise InstallError("accepted_lock_field_mismatch:" + key)
    native, selector, source = lock.get("native_preentry"), lock.get("selector"), lock.get("accepted_source_generation")
    if not all(isinstance(v, dict) for v in (native, selector, source)):
        raise InstallError("accepted_lock_identity_sections_missing")
    if native.get("binary_sha256") != NATIVE_SHA256 or native.get("binary_bytes") != NATIVE_BYTES:
        raise InstallError("accepted_native_identity_mismatch")
    if selector.get("binary_sha256") != SELECTOR_SHA256 or selector.get("binary_bytes") != SELECTOR_BYTES:
        raise InstallError("accepted_selector_identity_mismatch")
    if source.get("head") != SOURCE_HEAD or source.get("tree") != SOURCE_TREE or source.get("branch") != "main":
        raise InstallError("accepted_source_generation_mismatch")
    return lock

def _bounded_directory_names(path: pathlib.Path, label: str, limit: int) -> tuple[str, ...]:
    if limit < 0:
        raise InstallError(label + "_entry_limit_invalid")
    names: list[str] = []
    try:
        with os.scandir(path) as scan:
            for entry in scan:
                if len(names) >= limit:
                    raise InstallError(label + "_entry_limit")
                names.append(entry.name)
    except OSError as exc:
        raise InstallError(label + "_scandir_failed:" + os.fspath(path)) from exc
    return tuple(names)


def full_history_content_digest(
    root: pathlib.Path,
    expected_uid: int,
    expected_gid: int,
    expected_root_mode: int,
) -> tuple[str, int, int]:
    root_abs = pathlib.Path(os.path.abspath(os.fspath(root)))
    if root_abs.resolve(strict=True) != root_abs:
        raise InstallError("full_history_tree_root_alias_forbidden")
    rst = root_abs.lstat()
    if (
        not stat.S_ISDIR(rst.st_mode)
        or stat.S_ISLNK(rst.st_mode)
        or rst.st_uid != expected_uid
        or rst.st_gid != expected_gid
        or stat.S_IMODE(rst.st_mode) != expected_root_mode
    ):
        raise InstallError("full_history_tree_root_metadata_invalid")
    root_identity = _metadata_identity(rst)
    h = hashlib.sha256()
    nodes = 0
    total = 0
    pending: list[tuple[pathlib.Path, str]] = [(root_abs, "")]
    while pending:
        directory, prefix = pending.pop()
        before = directory.lstat()
        remaining_nodes = MAX_NODES - nodes
        names = sorted(
            _bounded_directory_names(
                directory, "full_history_tree_directory", remaining_nodes + 1
            )
        )
        if len(names) > remaining_nodes:
            raise InstallError("full_history_tree_node_limit")
        if _metadata_identity(directory.lstat()) != _metadata_identity(before):
            raise InstallError("full_history_tree_directory_changed:" + (prefix or "."))
        nodes += len(names)
        for entry_name in names:
            try:
                entry_name.encode("utf-8", "strict")
            except UnicodeEncodeError as exc:
                raise InstallError("full_history_tree_name_not_utf8") from exc
            child = directory / entry_name
            rel = entry_name if not prefix else prefix + "/" + entry_name
            st = child.lstat()
            if st.st_uid != expected_uid or st.st_gid != expected_gid:
                raise InstallError("full_history_tree_owner_invalid:" + rel)
            if stat.S_ISLNK(st.st_mode):
                raise InstallError("full_history_tree_symlink_forbidden:" + rel)
            if stat.S_ISDIR(st.st_mode):
                if stat.S_IMODE(st.st_mode) & 0o022:
                    raise InstallError("full_history_tree_directory_group_or_world_writable:" + rel)
                h.update(b"D\0" + rel.encode("utf-8") + b"\0")
                pending.append((child, rel))
            elif stat.S_ISREG(st.st_mode):
                if stat.S_IMODE(st.st_mode) & 0o022:
                    raise InstallError("full_history_tree_file_group_or_world_writable:" + rel)
                if st.st_nlink != 1:
                    raise InstallError("full_history_tree_file_link_count_invalid:" + rel)
                identity = _metadata_identity(st)
                digest = _read_regular_sha256_exact(
                    child, identity, "full_history_tree_file"
                )
                total += st.st_size
                if total > MAX_TOTAL_BYTES:
                    raise InstallError("full_history_tree_total_bytes_limit")
                h.update(
                    b"F\0" + rel.encode("utf-8") + b"\0"
                    + str(st.st_size).encode("ascii") + b"\0"
                    + bytes.fromhex(digest)
                )
            else:
                raise InstallError("full_history_tree_kind_invalid:" + rel)
    if _metadata_identity(root_abs.lstat()) != root_identity:
        raise InstallError("full_history_tree_root_generation_changed")
    return h.hexdigest(), nodes, total


def verify_live_release() -> tuple[str, int, int]:
    root = LIVE_RELEASE
    if root.resolve(strict=True) != root or not root.is_dir() or root.is_symlink():
        raise InstallError("live_release_path_invalid")
    st = root.lstat()
    if (
        st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != SOURCE_RELEASE_ROOT_MODE
    ):
        raise InstallError("live_release_root_metadata_invalid")
    paths: list[pathlib.Path] = []
    identities: list[tuple[pathlib.Path, tuple[int, int, int, int, int, int, int, int, int]]] = []
    current = root
    while True:
        cst = current.lstat()
        if (
            not stat.S_ISDIR(cst.st_mode)
            or stat.S_ISLNK(cst.st_mode)
            or cst.st_uid != 0
            or cst.st_gid != 0
            or stat.S_IMODE(cst.st_mode) & 0o022
        ):
            raise InstallError("live_release_ancestor_custody_invalid:" + os.fspath(current))
        paths.append(current)
        identities.append((current, _metadata_identity(cst)))
        if current == current.parent:
            break
        current = current.parent
    _require_runtime_uid_nonwritable(paths, "live_release")
    live_tree_digest = tree_digest(root, SOURCE_RELEASE_ROOT_MODE)
    shallow_raw, shallow_identity = _read_metadata_file(
        root / ".git" / "shallow", "live_release_shallow", 4096
    )
    if shallow_raw != (SOURCE_HEAD + "\n").encode("ascii"):
        raise InstallError("live_release_shallow_mismatch")
    if _direct_main_ref(root, "live_release", allow_shallow=True) != SOURCE_HEAD:
        raise InstallError("live_release_head_mismatch")
    require_worktree_matches_tree(root, SOURCE_TREE, "live_release")
    shallow_raw2, shallow_identity2 = _read_metadata_file(
        root / ".git" / "shallow", "live_release_shallow_terminal", 4096
    )
    if shallow_raw2 != shallow_raw or shallow_identity2 != shallow_identity:
        raise InstallError("live_release_shallow_generation_changed")
    for path, expected in identities:
        if _metadata_identity(path.lstat()) != expected:
            raise InstallError("live_release_ancestor_generation_changed:" + os.fspath(path))
    return live_tree_digest


def verify_source_release(
    expected_full_history_content_sha256: str,
) -> tuple[str, int, int]:
    if (
        len(expected_full_history_content_sha256) != 64
        or any(ch not in "0123456789abcdef" for ch in expected_full_history_content_sha256)
    ):
        raise InstallError("expected_full_history_content_sha256_invalid")
    ancestors = source_release_ancestor_custody()
    if SOURCE_RELEASE.resolve(strict=True) != SOURCE_RELEASE or not SOURCE_RELEASE.is_dir() or SOURCE_RELEASE.is_symlink():
        raise InstallError("source_release_path_invalid")
    if require_git_metadata_provenance(SOURCE_RELEASE, "source_release") != SOURCE_HEAD:
        raise InstallError("source_release_head_mismatch")
    require_worktree_matches_tree(SOURCE_RELEASE, SOURCE_TREE, "source_release")
    observed = full_history_content_digest(SOURCE_RELEASE, 0, 0, SOURCE_RELEASE_ROOT_MODE)
    if observed[0] != expected_full_history_content_sha256:
        raise InstallError("full_history_content_sha256_mismatch")
    revalidate_source_release_ancestor_custody(ancestors)
    return observed

def _read_regular_sha256_exact(
    path: pathlib.Path,
    expected: tuple[int, int, int, int, int, int, int, int, int],
    label: str,
) -> str:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink < 1
        or before.st_size < 0
        or before.st_size > MAX_FILE_BYTES
        or _metadata_identity(before) != expected
    ):
        raise InstallError(label + "_visible_generation_invalid:" + os.fspath(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if (
            not stat.S_ISREG(opened.st_mode)
            or opened.st_nlink != before.st_nlink
            or opened.st_size != before.st_size
            or _metadata_identity(opened) != expected
        ):
            raise InstallError(label + "_opened_generation_invalid:" + os.fspath(path))
        h = hashlib.sha256()
        remaining = opened.st_size
        while remaining:
            part = os.read(fd, min(COPY_CHUNK, remaining))
            if not part:
                raise InstallError(label + "_short_read:" + os.fspath(path))
            h.update(part)
            remaining -= len(part)
        if os.read(fd, 1):
            raise InstallError(label + "_grew_during_read:" + os.fspath(path))
        after = os.fstat(fd)
        visible = path.lstat()
        if _metadata_identity(after) != expected:
            raise InstallError(label + "_descriptor_generation_changed:" + os.fspath(path))
        if _metadata_identity(visible) != expected:
            raise InstallError(label + "_visible_generation_changed:" + os.fspath(path))
        return h.hexdigest()
    finally:
        os.close(fd)

def _read_regular_git_blob_sha1_exact(
    path: pathlib.Path,
    expected: tuple[int, int, int, int, int, int, int, int, int],
    label: str,
) -> str:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink < 1
        or before.st_size < 0
        or before.st_size > MAX_FILE_BYTES
        or _metadata_identity(before) != expected
    ):
        raise InstallError(label + "_visible_generation_invalid:" + os.fspath(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if (
            not stat.S_ISREG(opened.st_mode)
            or opened.st_nlink != before.st_nlink
            or opened.st_size != before.st_size
            or _metadata_identity(opened) != expected
        ):
            raise InstallError(label + "_opened_generation_invalid:" + os.fspath(path))
        h = hashlib.sha1()
        h.update(b"blob " + str(opened.st_size).encode("ascii") + b"\0")
        remaining = opened.st_size
        while remaining:
            part = os.read(fd, min(COPY_CHUNK, remaining))
            if not part:
                raise InstallError(label + "_short_read:" + os.fspath(path))
            h.update(part)
            remaining -= len(part)
        if os.read(fd, 1):
            raise InstallError(label + "_grew_during_read:" + os.fspath(path))
        after = os.fstat(fd)
        visible = path.lstat()
        if _metadata_identity(after) != expected:
            raise InstallError(label + "_descriptor_generation_changed:" + os.fspath(path))
        if _metadata_identity(visible) != expected:
            raise InstallError(label + "_visible_generation_changed:" + os.fspath(path))
        return h.hexdigest()
    finally:
        os.close(fd)

def _git_tree_oid_from_worktree(root: pathlib.Path, label: str) -> str:
    nodes = 0
    total = 0
    root_before = root.lstat()
    if not stat.S_ISDIR(root_before.st_mode) or stat.S_ISLNK(root_before.st_mode):
        raise InstallError(label + "_worktree_root_invalid")
    root_identity = _metadata_identity(root_before)

    def walk(directory: pathlib.Path, depth: int) -> str:
        nonlocal nodes, total
        if depth > 256:
            raise InstallError(label + "_worktree_depth_limit")
        before = directory.lstat()
        if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
            raise InstallError(label + "_worktree_directory_invalid:" + os.fspath(directory))
        directory_identity = _metadata_identity(before)
        rows: list[tuple[bytes, bytes]] = []
        names: list[str] = []
        try:
            with os.scandir(directory) as scan:
                for entry in scan:
                    nodes += 1
                    if nodes > MAX_NODES:
                        raise InstallError(label + "_worktree_node_limit")
                    names.append(entry.name)
        except OSError as exc:
            raise InstallError(label + "_worktree_scandir_failed:" + os.fspath(directory)) from exc
        for name in names:
            if directory == root and name == ".git":
                gst = os.lstat(directory / name)
                if not stat.S_ISDIR(gst.st_mode) or stat.S_ISLNK(gst.st_mode):
                    raise InstallError(label + "_git_dir_generation_invalid")
                continue
            try:
                raw_name = os.fsencode(name)
                raw_name.decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError) as exc:
                raise InstallError(label + "_worktree_name_not_utf8") from exc
            if not raw_name or b"/" in raw_name or b"\0" in raw_name:
                raise InstallError(label + "_worktree_name_invalid")
            child = directory / name
            st = os.lstat(child)
            identity = _metadata_identity(st)
            if stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode):
                oid = walk(child, depth + 1)
                mode = b"40000"
                sort_key = raw_name + b"/"
            elif stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode):
                if st.st_size > MAX_FILE_BYTES:
                    raise InstallError(label + "_worktree_file_size_limit:" + name)
                total += st.st_size
                if total > MAX_TOTAL_BYTES:
                    raise InstallError(label + "_worktree_total_bytes_limit")
                oid = _read_regular_git_blob_sha1_exact(child, identity, label + "_worktree_blob")
                mode = b"100755" if stat.S_IMODE(st.st_mode) & stat.S_IXUSR else b"100644"
                sort_key = raw_name + b"\0"
            elif stat.S_ISLNK(st.st_mode):
                target_raw = os.fsencode(os.readlink(child))
                if len(target_raw) > MAX_FILE_BYTES:
                    raise InstallError(label + "_worktree_symlink_size_limit:" + name)
                if _metadata_identity(child.lstat()) != identity:
                    raise InstallError(label + "_worktree_symlink_generation_changed:" + name)
                oid = git_blob_sha1(target_raw)
                mode = b"120000"
                sort_key = raw_name + b"\0"
            else:
                raise InstallError(label + "_worktree_kind_invalid:" + name)
            rows.append((sort_key, mode + b" " + raw_name + b"\0" + bytes.fromhex(oid)))
        if _metadata_identity(directory.lstat()) != directory_identity:
            raise InstallError(label + "_worktree_directory_generation_changed:" + os.fspath(directory))
        rows.sort(key=lambda item: item[0])
        body_len = sum(len(record) for _key, record in rows)
        h = hashlib.sha1()
        h.update(b"tree " + str(body_len).encode("ascii") + b"\0")
        for _key, record in rows:
            h.update(record)
        return h.hexdigest()

    oid = walk(root, 0)
    if _metadata_identity(root.lstat()) != root_identity:
        raise InstallError(label + "_worktree_root_generation_changed")
    return oid

def require_worktree_matches_tree(root: pathlib.Path, expected_tree: str, label: str) -> None:
    if len(expected_tree) != 40 or any(ch not in "0123456789abcdef" for ch in expected_tree):
        raise InstallError(label + "_expected_tree_invalid")
    actual = _git_tree_oid_from_worktree(root, label)
    if actual != expected_tree:
        raise InstallError(label + "_worktree_tree_oid_mismatch")

def _strict_internal_symlink(path: pathlib.Path, root: pathlib.Path, label: str) -> pathlib.Path:
    try:
        resolved = path.resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise InstallError(label + "_target_unavailable:" + os.fspath(path)) from exc
    if resolved != root and not str(resolved).startswith(str(root) + os.sep):
        raise InstallError(label + "_escapes_root:" + os.fspath(path))
    return resolved

def _revalidate_tree_record(
    root: pathlib.Path,
    record: tuple[pathlib.Path, str, str, int, tuple[int, int, int, int, int, int, int, int, int], str | None],
) -> None:
    child, relative, kind, _mode, expected, target = record
    st = child.lstat()
    if _metadata_identity(st) != expected:
        raise InstallError("tree_generation_changed:" + relative)
    if kind == "L":
        if not stat.S_ISLNK(st.st_mode):
            raise InstallError("tree_symlink_kind_changed:" + relative)
        if os.readlink(child) != target:
            raise InstallError("tree_symlink_target_changed:" + relative)
        _strict_internal_symlink(child, root, "tree_symlink")
    elif kind == "D":
        if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
            raise InstallError("tree_directory_kind_changed:" + relative)
    elif kind == "F":
        if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode):
            raise InstallError("tree_regular_kind_changed:" + relative)
    else:
        raise InstallError("tree_record_kind_invalid:" + relative)

def tree_digest(root: pathlib.Path, expected_root_mode: int) -> tuple[str, int, int]:
    if root.resolve() != root or not root.is_dir() or root.is_symlink():
        raise InstallError("tree_root_invalid:" + os.fspath(root))
    rst = root.lstat()
    if (
        not stat.S_ISDIR(rst.st_mode)
        or stat.S_ISLNK(rst.st_mode)
        or rst.st_uid != 0
        or rst.st_gid != 0
        or stat.S_IMODE(rst.st_mode) != expected_root_mode
    ):
        raise InstallError("tree_root_metadata_invalid:" + os.fspath(root))
    root_identity = _metadata_identity(rst)
    _require_runtime_uid_nonwritable([root], "tree_root_pre_descent")
    if _metadata_identity(root.lstat()) != root_identity:
        raise InstallError("tree_root_generation_changed_before_descent")
    nodes, total = 0, 0
    records: list[
        tuple[
            pathlib.Path, str, str, int,
            tuple[int, int, int, int, int, int, int, int, int],
            str | None,
        ]
    ] = []
    runtime_directories: list[pathlib.Path] = [root]
    runtime_regulars: list[pathlib.Path] = []
    pending: list[tuple[pathlib.Path, pathlib.PurePosixPath]] = [(root, pathlib.PurePosixPath("."))]

    # Pass 1 is metadata-only: no regular-file contents are opened or read.
    while pending:
        directory, rel = pending.pop()
        entry_names: list[str] = []
        try:
            with os.scandir(directory) as scan:
                for entry in scan:
                    nodes += 1
                    if nodes > MAX_NODES:
                        raise InstallError("tree_node_limit")
                    entry_names.append(entry.name)
        except OSError as exc:
            raise InstallError("tree_scandir_failed:" + os.fspath(directory)) from exc
        for entry_name in sorted(entry_names):
            child, relative = directory / entry_name, (rel / entry_name).as_posix()
            st = os.lstat(child)
            mode = stat.S_IMODE(st.st_mode)
            if st.st_uid != 0 or st.st_gid != 0:
                raise InstallError("tree_node_not_root_owned:" + relative)
            if not stat.S_ISLNK(st.st_mode) and mode & 0o022:
                raise InstallError("tree_node_writable:" + relative)
            identity = _metadata_identity(st)
            if stat.S_ISDIR(st.st_mode):
                _require_runtime_uid_nonwritable([child], "tree_directory_pre_descent")
                if _metadata_identity(child.lstat()) != identity:
                    raise InstallError("tree_directory_generation_changed_before_descent:" + relative)
                runtime_directories.append(child)
                records.append((child, relative, "D", mode, identity, None))
                pending.append((child, rel / entry_name))
            elif stat.S_ISREG(st.st_mode):
                if st.st_size > MAX_FILE_BYTES:
                    raise InstallError("tree_file_size_limit:" + relative)
                total += st.st_size
                if total > MAX_TOTAL_BYTES:
                    raise InstallError("tree_total_bytes_limit")
                runtime_regulars.append(child)
                records.append((child, relative, "F", mode, identity, None))
            elif stat.S_ISLNK(st.st_mode):
                records.append((child, relative, "L", mode, identity, os.readlink(child)))
            else:
                raise InstallError("tree_node_kind_invalid:" + relative)

    # Establish ACL-aware runtime non-writability of every mutation-capable
    # directory before any regular-file content is read.
    _require_runtime_uid_nonwritable(runtime_directories, "tree_directories")
    if _metadata_identity(root.lstat()) != root_identity:
        raise InstallError("tree_root_generation_changed")
    for record in records:
        _revalidate_tree_record(root, record)

    # With directory entries now runtime-immutable, prove each regular file is
    # also non-writable by the runtime UID before reading its contents.
    _require_runtime_uid_nonwritable(runtime_regulars, "tree_regulars")
    if _metadata_identity(root.lstat()) != root_identity:
        raise InstallError("tree_root_generation_changed")
    for record in records:
        _revalidate_tree_record(root, record)

    h = hashlib.sha256()
    for child, relative, kind, mode, identity, target in records:
        if kind == "D":
            h.update(("D\0" + relative + "\0" + format(mode, "04o") + "\n").encode())
        elif kind == "F":
            digest = _read_regular_sha256_exact(child, identity, "tree_regular")
            h.update(("F\0" + relative + "\0" + format(mode, "04o") + "\0" + str(identity[6]) + "\0" + digest + "\n").encode())
        else:
            _revalidate_tree_record(root, (child, relative, kind, mode, identity, target))
            h.update(("L\0" + relative + "\0" + str(target) + "\n").encode())

    if _metadata_identity(root.lstat()) != root_identity:
        raise InstallError("tree_root_generation_changed_terminal")
    for record in records:
        _revalidate_tree_record(root, record)
    return h.hexdigest(), nodes, total

def candidate_fd_metadata_valid(mode: int, nlink: int, size: int, expected_bytes: int) -> bool:
    return stat.S_ISREG(mode) and nlink == 1 and size == expected_bytes

def read_candidate(path: pathlib.Path, expected_sha: str, expected_bytes: int, label: str) -> bytes:
    if not path.is_absolute() or path.resolve(strict=False) != path:
        raise InstallError(label + "_candidate_path_not_normalized_absolute")
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or before.st_nlink != 1 or before.st_size != expected_bytes:
        raise InstallError(label + "_candidate_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if not candidate_fd_metadata_valid(opened.st_mode, opened.st_nlink, opened.st_size, expected_bytes):
            raise InstallError(label + "_candidate_opened_type_invalid")
        if (opened.st_dev, opened.st_ino, opened.st_mode, opened.st_nlink, opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns) != (before.st_dev, before.st_ino, before.st_mode, before.st_nlink, before.st_size, before.st_mtime_ns, before.st_ctime_ns):
            raise InstallError(label + "_candidate_rebound")
        raw = bytearray()
        while len(raw) < expected_bytes:
            part = os.read(fd, min(COPY_CHUNK, expected_bytes - len(raw)))
            if not part:
                raise InstallError(label + "_candidate_short_read")
            raw.extend(part)
        if os.read(fd, 1):
            raise InstallError(label + "_candidate_grew")
        after, visible = os.fstat(fd), path.lstat()
        if not candidate_fd_metadata_valid(after.st_mode, after.st_nlink, after.st_size, expected_bytes):
            raise InstallError(label + "_candidate_type_changed")
        if (after.st_dev, after.st_ino, after.st_mode, after.st_nlink, after.st_size, after.st_mtime_ns, after.st_ctime_ns) != (opened.st_dev, opened.st_ino, opened.st_mode, opened.st_nlink, opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns):
            raise InstallError(label + "_candidate_changed")
        if (visible.st_dev, visible.st_ino, visible.st_mode, visible.st_nlink, visible.st_size, visible.st_mtime_ns, visible.st_ctime_ns) != (after.st_dev, after.st_ino, after.st_mode, after.st_nlink, after.st_size, after.st_mtime_ns, after.st_ctime_ns):
            raise InstallError(label + "_candidate_visible_changed")
    finally:
        os.close(fd)
    data = bytes(raw)
    if sha256_bytes(data) != expected_sha or not data.startswith(b"\x7fELF"):
        raise InstallError(label + "_candidate_identity_mismatch")
    return data

def exact_binary_root(root: pathlib.Path, filename: str, expected_sha: str, expected_bytes: int, label: str) -> bool:
    if not root.exists() and not root.is_symlink():
        return False
    st = root.lstat()
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != 0o755
    ):
        raise InstallError(label + "_root_metadata_invalid")
    root_identity = _metadata_identity(st)
    _require_runtime_uid_nonwritable([root], label + "_installed_root")
    if _metadata_identity(root.lstat()) != root_identity:
        raise InstallError(label + "_root_generation_changed")
    root_entries: list[str] = []
    try:
        with os.scandir(root) as scan:
            for entry in scan:
                root_entries.append(entry.name)
                if len(root_entries) > 1:
                    raise InstallError(label + "_root_entries_invalid")
    except OSError as exc:
        raise InstallError(label + "_root_scandir_failed") from exc
    if root_entries != [filename]:
        raise InstallError(label + "_root_entries_invalid")
    path = root / filename
    fst = path.lstat()
    if (
        not stat.S_ISREG(fst.st_mode)
        or stat.S_ISLNK(fst.st_mode)
        or fst.st_uid != 0
        or fst.st_gid != 0
        or fst.st_nlink != 1
        or stat.S_IMODE(fst.st_mode) != 0o555
        or fst.st_size != expected_bytes
    ):
        raise InstallError(label + "_installed_binary_invalid")
    file_identity = _metadata_identity(fst)
    _require_runtime_uid_nonwritable([path], label + "_installed_leaf")
    if _metadata_identity(root.lstat()) != root_identity or _metadata_identity(path.lstat()) != file_identity:
        raise InstallError(label + "_installed_generation_changed")
    if _read_regular_sha256_exact(path, file_identity, label + "_installed_binary") != expected_sha:
        raise InstallError(label + "_installed_binary_invalid")
    if _metadata_identity(root.lstat()) != root_identity or _metadata_identity(path.lstat()) != file_identity:
        raise InstallError(label + "_installed_generation_changed_terminal")
    return True

def source_target_state(source_digest: tuple[str, int, int]) -> bool:
    if not SOURCE_TARGET.exists() and not SOURCE_TARGET.is_symlink():
        return False
    st = SOURCE_TARGET.lstat()
    if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_uid != 0 or st.st_gid != 0 or stat.S_IMODE(st.st_mode) != PROTECTED_SOURCE_ROOT_MODE:
        raise InstallError("protected_source_target_metadata_invalid")
    if tree_digest(SOURCE_TARGET, PROTECTED_SOURCE_ROOT_MODE) != source_digest:
        raise InstallError("protected_source_target_generation_mismatch")
    if require_git_metadata_provenance(SOURCE_TARGET, "protected_source") != SOURCE_HEAD:
        raise InstallError("protected_source_target_head_mismatch")
    require_worktree_matches_tree(SOURCE_TARGET, SOURCE_TREE, "protected_source")
    return True

def ensure_stage_roots_absent() -> None:
    for stage in (SOURCE_STAGE, PREENTRY_STAGE, SELECTOR_STAGE):
        if stage.exists() or stage.is_symlink():
            raise InstallError("staging_root_preexisting:" + os.fspath(stage))

def collect_plan(
    native_path: pathlib.Path,
    selector_path: pathlib.Path,
    expected_head: str,
    expected_tree: str,
    expected_full_history_content_sha256: str,
) -> dict[str, Any]:
    install_parent_custody()
    verify_repository(expected_head, expected_tree)
    accepted_lock(expected_head, expected_tree)
    live_identity = verify_live_release()
    source_ancestors = source_release_ancestor_custody()
    source_digest = tree_digest(SOURCE_RELEASE, SOURCE_RELEASE_ROOT_MODE)
    revalidate_source_release_ancestor_custody(source_ancestors)
    full_history_identity = verify_source_release(expected_full_history_content_sha256)
    revalidate_source_release_ancestor_custody(source_ancestors)
    native_raw = read_candidate(native_path, NATIVE_SHA256, NATIVE_BYTES, "native")
    selector_raw = read_candidate(selector_path, SELECTOR_SHA256, SELECTOR_BYTES, "selector")
    source_exact = source_target_state(source_digest)
    preentry_exact = exact_binary_root(PREENTRY_DIR, PREENTRY_NAME, NATIVE_SHA256, NATIVE_BYTES, "native_preentry")
    selector_exact = exact_binary_root(SELECTOR_DIR, SELECTOR_NAME, SELECTOR_SHA256, SELECTOR_BYTES, "selector")
    if not (source_exact and preentry_exact and selector_exact):
        ensure_stage_roots_absent()
    body = {
        "schema": SCHEMA, "version": 5, "expected_head": expected_head, "expected_tree": expected_tree,
        "expected_full_history_content_sha256": expected_full_history_content_sha256,
        "predecessor_v3_installer_merge": PREDECESSOR_MERGE, "predecessor_v3_installer_tree": PREDECESSOR_TREE, "accepted_lock_id": LOCK_ID,
        "live_release": {"head": SOURCE_HEAD, "tree": SOURCE_TREE, "path": os.fspath(LIVE_RELEASE),
                         "root_mode": format(SOURCE_RELEASE_ROOT_MODE, "04o"), "shallow": True,
                         "tree_digest": live_identity[0], "nodes": live_identity[1],
                         "regular_file_bytes": live_identity[2],
                         "mutation_authorized": False},
        "source_release": {"head": SOURCE_HEAD, "tree": SOURCE_TREE, "path": os.fspath(SOURCE_RELEASE),
                           "root_mode": format(SOURCE_RELEASE_ROOT_MODE, "04o"),
                           "tree_digest": source_digest[0], "nodes": source_digest[1], "regular_file_bytes": source_digest[2],
                           "full_history_content_sha256": full_history_identity[0],
                           "full_history_nodes": full_history_identity[1],
                           "full_history_regular_file_bytes": full_history_identity[2]},
        "protected_source_root_mode": format(PROTECTED_SOURCE_ROOT_MODE, "04o"),
        "installed_qualifier": {"path": QUALIFIER_REL, "blob": QUALIFIER_BLOB},
        "native_candidate": {"sha256": sha256_bytes(native_raw), "bytes": len(native_raw)},
        "selector_candidate": {"sha256": sha256_bytes(selector_raw), "bytes": len(selector_raw)},
        "installed_state": {"protected_source_exact": source_exact, "native_preentry_exact": preentry_exact, "selector_exact": selector_exact},
        "install_parent_custody_exact": True,
        "git_metadata_provenance_self_contained": True,
        "git_metadata_indirection_rejected": True,
        "create_only": True, "resumable_exact_components": True, "mismatched_component_holds": True,
        "partial_publication_possible": True, "no_rollback_after_publication": True,
        "service_mutation": False, "systemd_mutation": False, "credential_access": False, "private_key_access": False,
        "wallet_or_signer_access": False, "signing": False, "transaction": False, "payment_acceptance": False,
        "public_presale_activation": False, "wc_void_market_activation": False, "funds_movement": False,
    }
    return {"body": body, "plan_id": PLAN_PREFIX + sha256_bytes(canonical(body)), "native_raw": native_raw,
            "selector_raw": selector_raw, "source_digest": source_digest}

def _copy_regular(src: pathlib.Path, dst: pathlib.Path, mode: int) -> None:
    before = src.lstat()
    if (not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or before.st_uid != 0 or before.st_gid != 0
            or before.st_size > MAX_FILE_BYTES or mode & 0o022):
        raise InstallError("source_regular_metadata_invalid:" + os.fspath(src))
    sfd, dfd = os.open(src, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW), None
    try:
        opened = os.fstat(sfd)
        if (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns) != (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns):
            raise InstallError("source_regular_rebound:" + os.fspath(src))
        dfd = os.open(dst, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW, 0o600)
        remaining = opened.st_size
        while remaining:
            part = os.read(sfd, min(COPY_CHUNK, remaining))
            if not part:
                raise InstallError("source_regular_short_read:" + os.fspath(src))
            view = memoryview(part)
            while view:
                wrote = os.write(dfd, view)
                if wrote <= 0:
                    raise InstallError("destination_short_write:" + os.fspath(dst))
                view = view[wrote:]
            remaining -= len(part)
        if os.read(sfd, 1):
            raise InstallError("source_regular_grew:" + os.fspath(src))
        after, visible = os.fstat(sfd), src.lstat()
        if (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns) != (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns):
            raise InstallError("source_regular_changed:" + os.fspath(src))
        if (visible.st_dev, visible.st_ino, visible.st_size, visible.st_mtime_ns, visible.st_ctime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns):
            raise InstallError("source_regular_visible_changed:" + os.fspath(src))
        os.fchown(dfd, 0, 0); os.fchmod(dfd, mode); os.fsync(dfd)
    finally:
        if dfd is not None: os.close(dfd)
        os.close(sfd)

def _copy_tree(src_root: pathlib.Path, dst_root: pathlib.Path) -> None:
    install_parent_custody()
    root_st, root_mode = src_root.lstat(), stat.S_IMODE(src_root.lstat().st_mode)
    if (not stat.S_ISDIR(root_st.st_mode) or stat.S_ISLNK(root_st.st_mode) or root_st.st_uid != 0 or root_st.st_gid != 0 or root_mode != SOURCE_RELEASE_ROOT_MODE):
        raise InstallError("source_release_root_metadata_invalid")
    global _WRITE_PERFORMED
    dst_root.mkdir(mode=0o755); _CREATED_STAGES.add(dst_root); _WRITE_PERFORMED = True
    os.chown(dst_root, 0, 0); os.chmod(dst_root, 0o755)
    count = 0; total = 0
    def recurse(src_dir: pathlib.Path, dst_dir: pathlib.Path) -> None:
        nonlocal count, total
        entry_names: list[str] = []
        try:
            with os.scandir(src_dir) as scan:
                for entry in scan:
                    count += 1
                    if count > MAX_NODES:
                        raise InstallError("copy_node_limit")
                    entry_names.append(entry.name)
        except OSError as exc:
            raise InstallError("copy_scandir_failed:" + os.fspath(src_dir)) from exc
        for entry_name in sorted(entry_names):
            src, dst, st = src_dir / entry_name, dst_dir / entry_name, os.lstat(src_dir / entry_name)
            mode = stat.S_IMODE(st.st_mode)
            if st.st_uid != 0 or st.st_gid != 0: raise InstallError("source_node_not_root_owned:" + os.fspath(src))
            if stat.S_ISDIR(st.st_mode):
                if mode & 0o022: raise InstallError("source_directory_writable:" + os.fspath(src))
                dst.mkdir(mode=mode); os.chown(dst, 0, 0); os.chmod(dst, mode); recurse(src, dst)
            elif stat.S_ISREG(st.st_mode):
                total += st.st_size
                if total > MAX_TOTAL_BYTES: raise InstallError("copy_total_bytes_limit")
                _copy_regular(src, dst, mode)
            elif stat.S_ISLNK(st.st_mode):
                target = os.readlink(src)
                _strict_internal_symlink(src, src_root, "source_symlink")
                os.symlink(target, dst); os.lchown(dst, 0, 0)
            else:
                raise InstallError("source_node_kind_invalid:" + os.fspath(src))
        dfd = os.open(dst_dir, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try: os.fsync(dfd)
        finally: os.close(dfd)
    recurse(src_root, dst_root)

def _create_binary_stage(stage: pathlib.Path, filename: str, raw: bytes, expected_sha: str) -> None:
    install_parent_custody()
    global _WRITE_PERFORMED
    stage.mkdir(mode=0o755); _CREATED_STAGES.add(stage); _WRITE_PERFORMED = True
    os.chown(stage, 0, 0); os.chmod(stage, 0o755)
    dfd = os.open(stage, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW); fd = None
    try:
        fd = os.open(filename, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW, 0o500, dir_fd=dfd)
        view = memoryview(raw)
        while view:
            wrote = os.write(fd, view)
            if wrote <= 0: raise InstallError("binary_stage_short_write:" + filename)
            view = view[wrote:]
        os.fchown(fd, 0, 0); os.fchmod(fd, 0o555); os.fsync(fd); os.lseek(fd, 0, os.SEEK_SET)
        check = bytearray()
        while len(check) < len(raw):
            part = os.read(fd, min(COPY_CHUNK, len(raw) - len(check)))
            if not part: break
            check.extend(part)
        if bytes(check) != raw or sha256_bytes(bytes(check)) != expected_sha:
            raise InstallError("binary_stage_readback_mismatch:" + filename)
        os.fsync(dfd)
    finally:
        if fd is not None: os.close(fd)
        os.close(dfd)

def _record_publication_after_rename(stage: pathlib.Path, label: str) -> None:
    # Once renameat2 succeeds the component is published. Record that truth
    # before parent fsync or close can fail; a later HOLD must never claim the
    # publication did not happen.
    _CREATED_STAGES.discard(stage)
    if label not in _PUBLISHED:
        _PUBLISHED.append(label)

def _rename_noreplace(old_name: str, new_name: str, stage: pathlib.Path, label: str) -> None:
    libc = ctypes.CDLL(None, use_errno=True); renameat2 = getattr(libc, "renameat2", None)
    if renameat2 is None: raise InstallError("renameat2_unavailable")
    expected_parent = install_parent_custody()
    parent_fd = os.open(INSTALL_PARENT, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        if not install_parent_fd_matches(parent_fd, expected_parent):
            raise InstallError("install_parent_descriptor_identity_mismatch")
        if renameat2(parent_fd, old_name.encode(), parent_fd, new_name.encode(), RENAME_NOREPLACE) != 0:
            raise InstallError("rename_noreplace_failed:" + str(ctypes.get_errno()))
        _record_publication_after_rename(stage, label)
        os.fsync(parent_fd)
        if not install_parent_fd_matches(parent_fd, expected_parent):
            raise InstallError("install_parent_descriptor_generation_changed")
        install_parent_custody()
    finally:
        os.close(parent_fd)

def _cleanup_stage(stage: pathlib.Path) -> None:
    if stage not in _CREATED_STAGES:
        return
    install_parent_custody()
    if stage.exists() and not stage.is_symlink():
        shutil.rmtree(stage)
    _CREATED_STAGES.discard(stage)

def _publish_source(expected_digest: tuple[str, int, int], expected_full_history_content_sha256: str) -> None:
    if SOURCE_STAGE.exists() or SOURCE_STAGE.is_symlink(): raise InstallError("source_stage_preexisting")
    source_ancestors = source_release_ancestor_custody()
    _copy_tree(SOURCE_RELEASE, SOURCE_STAGE)
    revalidate_source_release_ancestor_custody(source_ancestors)
    if tree_digest(SOURCE_RELEASE, SOURCE_RELEASE_ROOT_MODE) != expected_digest: raise InstallError("source_release_changed_during_copy")
    revalidate_source_release_ancestor_custody(source_ancestors)
    verify_source_release(expected_full_history_content_sha256)
    revalidate_source_release_ancestor_custody(source_ancestors)
    if tree_digest(SOURCE_STAGE, PROTECTED_SOURCE_ROOT_MODE) != expected_digest: raise InstallError("source_stage_digest_mismatch")
    if require_git_metadata_provenance(SOURCE_STAGE, "source_stage") != SOURCE_HEAD:
        raise InstallError("source_stage_head_mismatch")
    require_worktree_matches_tree(SOURCE_STAGE, SOURCE_TREE, "source_stage")
    _rename_noreplace(SOURCE_STAGE_NAME, SOURCE_NAME, SOURCE_STAGE, "protected_source")
    if not source_target_state(expected_digest): raise InstallError("source_postpublication_verification_failed")

def _publish_binary(stage: pathlib.Path, stage_name: str, target_name: str, filename: str, raw: bytes, digest: str, label: str) -> None:
    if stage.exists() or stage.is_symlink(): raise InstallError(label + "_stage_preexisting")
    _create_binary_stage(stage, filename, raw, digest); _rename_noreplace(stage_name, target_name, stage, label)

def source_plan() -> None:
    print(MARKER); print("mode=source-plan"); print("source_only=true"); print("accepted_v2_installer_merge=" + PREDECESSOR_MERGE)
    print("accepted_v1_lock_id=" + LOCK_ID); print("accepted_v1_lock_install_authority=false")
    print("operation_bound_plan_id_required=true"); print("explicit_create_only_confirmation_required=true")
    print("isolated_python_required=true"); print("trusted_root_launcher_still_required=true")
    print("resumable_exact_components=true"); print("mismatched_component_holds=true")
    print("partial_publication_possible=true"); print("no_rollback_after_publication=true")
    print("predecessor_v3_installer_merge_tree_bound=true"); print("strict_symlink_target_required=true")
    print("publication_bookkeeping_precedes_parent_fsync=true")
    print("install_parent_root_owned_0755_required=true")
    print("install_parent_descriptor_identity_required=true")
    print("acl_aware_runtime_uid_nonwritability_required=true")
    print("immutable_source_release_root_mode_0555_required=true")
    print("protected_source_root_mode_0755_required=true")
    print("installed_qualifier_v4_bound=true")
    print("git_metadata_provenance_required_for_all_roots=true")
    print("git_external_metadata_and_object_indirection_rejected=true")
    print("git_local_config_exact_allowlist_required=true")
    print("git_dynamic_observer_authority_removed=true")
    print("direct_main_ref_required=true")
    print("direct_worktree_git_tree_oid_required=true")
    print("trusted_launcher_expected_head_tree_pair_required=true")
    print("trusted_full_history_content_sha256_required=true")
    print("live_shallow_release_cross_binding_required=true")
    print("live_release_acl_aware_tree_custody_required=true")
    print("protected_full_history_replica_source_required=true")
    print("full_history_regular_single_link_required=true")
    print("v4_installer_dependency_bound=true")
    print("full_history_replica_installer_dependency_bound=true")
    print("trusted_full_history_content_sha256_required=true")
    print("live_shallow_release_cross_binding_required=true")
    print("protected_full_history_replica_source_required=true")
    print("live_runtime_release_mutation=false")
    print("dynamic_git_execution_not_authoritative=true")
    print("runtime_write_audit_external_helper_free=true")
    print("source_release_ancestor_acl_custody_required=true")
    print("source_release_ancestor_generation_revalidation_required=true")
    print("source_control_network=false"); print("protected_filesystem_mutation=false"); print("service_mutation=false")
    print("credential_access=false"); print("signing=false"); print("transaction=false"); print("funds_movement=false")

def self_test() -> None:
    assert SOURCE_TARGET == pathlib.Path("/opt/void-buy-void-v7-reviewed-v1")
    assert PREENTRY_TARGET.name == PREENTRY_NAME and SELECTOR_TARGET.name == SELECTOR_NAME
    sample = {"schema": SCHEMA, "version": 5, "expected_head": "a" * 40, "expected_tree": "b" * 40, "expected_full_history_content_sha256": "c" * 64}
    pid = PLAN_PREFIX + sha256_bytes(canonical(sample))
    assert pid.startswith(PLAN_PREFIX) and len(pid) == len(PLAN_PREFIX) + 64
    assert getattr(ctypes.CDLL(None), "renameat2", None) is not None
    sentinel = pathlib.Path("/void-v7-install-v4-self-test-stage-does-not-exist")
    _CREATED_STAGES.add(sentinel)
    _record_publication_after_rename(sentinel, "self_test_component")
    assert sentinel not in _CREATED_STAGES and "self_test_component" in _PUBLISHED
    _PUBLISHED.remove("self_test_component")
    print(MARKER + "_SELF_TEST_GREEN"); print("accepted_v1_lock_remains_install_authority_false=true")
    print("isolated_python_required=true"); print("trusted_root_launcher_still_required=true")
    print("privileged_source_custody_required_before_apply=true")
    print("privileged_source_root_acl_barrier_before_scandir=true")
    print("privileged_source_directory_acl_barrier_before_descent=true")
    print("privileged_source_symlink_resolution_after_directory_acl_barrier=true")
    print("operation_bound_plan_id_required=true"); print("explicit_create_only_confirmation_required=true")
    print("rename_noreplace_required=true"); print("resumable_exact_components=true")
    print("predecessor_v3_installer_merge_tree_bound=true"); print("strict_symlink_target_required=true")
    print("publication_bookkeeping_precedes_parent_fsync=true")
    print("install_parent_root_owned_0755_required=true")
    print("install_parent_descriptor_identity_required=true")
    print("acl_aware_runtime_uid_nonwritability_required=true")
    print("immutable_source_release_root_mode_0555_required=true")
    print("protected_source_root_mode_0755_required=true")
    assert SOURCE_RELEASE_ROOT_MODE == 0o555 and PROTECTED_SOURCE_ROOT_MODE == 0o755
    assert candidate_fd_metadata_valid(stat.S_IFREG | 0o600, 1, 7, 7)
    assert not candidate_fd_metadata_valid(stat.S_IFIFO | 0o600, 1, 7, 7)
    assert not candidate_fd_metadata_valid(stat.S_IFREG | 0o600, 2, 7, 7)
    assert not candidate_fd_metadata_valid(stat.S_IFREG | 0o600, 1, 8, 7)
    print("candidate_open_nonblocking_required=true")
    print("candidate_retained_fd_regular_single_link_required=true")
    print("candidate_fifo_or_special_file_rejected_before_read=true")
    print("tree_metadata_pass_precedes_acl_audit=true")
    print("tree_root_acl_audit_precedes_first_scandir=true")
    print("tree_directory_acl_audit_precedes_descent=true")
    print("tree_directory_acl_audit_precedes_regular_file_reads=true")
    print("tree_regular_acl_audit_precedes_regular_file_reads=true")
    print("tree_regular_descriptor_nofollow_nonblocking_required=true")
    print("tree_regular_descriptor_generation_revalidation_required=true")
    print("installed_binary_acl_audit_precedes_hash=true")
    print("installed_binary_descriptor_hash_required=true")
    with tempfile.TemporaryDirectory(prefix="void-v7-tree-read-race-") as td:
        troot = pathlib.Path(td)
        reviewed = troot / "reviewed"
        reviewed.write_bytes(b"reviewed-bytes")
        os.chmod(reviewed, 0o444)
        spoof = reviewed.lstat()
        expected = _metadata_identity(spoof)

        class _RacePath:
            def __init__(self, actual: pathlib.Path, fake: os.stat_result) -> None:
                self.actual = actual
                self.fake = fake
            def lstat(self) -> os.stat_result:
                return self.fake
            def __fspath__(self) -> str:
                return os.fspath(self.actual)

        fifo = troot / "race-fifo"
        os.mkfifo(fifo, 0o600)
        try:
            _read_regular_sha256_exact(_RacePath(fifo, spoof), expected, "self_test_fifo")
        except (InstallError, OSError):
            pass
        else:
            raise AssertionError("fifo_race_unexpected_success")

        outside = troot / "outside"
        outside.write_bytes(b"must-not-be-read")
        link = troot / "race-link"
        link.symlink_to(outside)
        try:
            _read_regular_sha256_exact(_RacePath(link, spoof), expected, "self_test_symlink")
        except (InstallError, OSError):
            pass
        else:
            raise AssertionError("symlink_race_unexpected_success")
    print("tree_regular_fifo_race_rejected_nonblocking=true")
    print("tree_regular_symlink_race_rejected_nofollow=true")
    _assert_git_metadata_fixture_rejected(lambda root: ((root / ".git").rename(root / ".git.real"), (root / ".git").write_text("gitdir: /tmp/hostile\n", "utf-8")))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "commondir").write_text("/tmp/hostile\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "objects" / "info" / "alternates").write_text("/tmp/hostile-objects\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "objects" / "info" / "http-alternates").write_text("https://invalid.example/objects\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "info" / "grafts").write_text("0" * 81 + "\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "shallow").write_text("0" * 40 + "\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text("[include]\npath = /tmp/hostile\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text('[includeIf\t"gitdir:/opt/**"]\npath = /tmp/hostile\n', "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text("[core]\nworktree = /tmp/hostile\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text("[core]\nattributesFile = /tmp/hostile-attrs\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text('[filter "evil"]\nclean = /tmp/hostile-filter\n', "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text("[extensions]\nworktreeConfig = true\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text('[remote "origin"]\npromisor = true\n', "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text("[core]\nrepositoryformatversion = 0\nbare = false\nautocrlf = true\n", "utf-8"))
    with tempfile.TemporaryDirectory(prefix="void-v7-direct-tree-self-test-") as td:
        manifest_root = pathlib.Path(td)
        (manifest_root / ".git").mkdir()
        (manifest_root / "sub").mkdir()
        plain = manifest_root / "plain.txt"
        plain.write_bytes(b"plain-bytes\n")
        executable = manifest_root / "sub" / "run.sh"
        executable.write_bytes(b"#!/bin/sh\nexit 0\n")
        os.chmod(executable, 0o755)
        link = manifest_root / "link"
        link.symlink_to("plain.txt")

        sub_record = b"100755 run.sh\0" + bytes.fromhex(git_blob_sha1(executable.read_bytes()))
        sub_tree = hashlib.sha1(
            b"tree " + str(len(sub_record)).encode("ascii") + b"\0" + sub_record
        ).hexdigest()
        root_records = [
            (b"link\0", b"120000 link\0" + bytes.fromhex(git_blob_sha1(b"plain.txt"))),
            (b"plain.txt\0", b"100644 plain.txt\0" + bytes.fromhex(git_blob_sha1(plain.read_bytes()))),
            (b"sub/", b"40000 sub\0" + bytes.fromhex(sub_tree)),
        ]
        root_records.sort(key=lambda item: item[0])
        root_body = b"".join(record for _key, record in root_records)
        expected_tree = hashlib.sha1(
            b"tree " + str(len(root_body)).encode("ascii") + b"\0" + root_body
        ).hexdigest()
        assert _git_tree_oid_from_worktree(manifest_root, "self_test_tree") == expected_tree

        ignored = manifest_root / "ignored.tmp"
        ignored.write_bytes(b"ignored-but-published")
        assert _git_tree_oid_from_worktree(manifest_root, "self_test_tree") != expected_tree
    print("direct_worktree_git_tree_oid_fixture_green=true")
    print("git_real_in_tree_dir_required=true")
    print("git_commondir_indirection_rejected=true")
    print("git_object_alternates_rejected=true")
    print("git_http_alternates_rejected=true")
    print("git_grafts_rejected=true")
    print("git_shallow_rejected=true")
    print("git_local_config_include_rejected=true")
    print("git_includeif_horizontal_whitespace_rejected=true")
    print("git_core_worktree_redirect_rejected=true")
    print("git_core_attributesfile_rejected=true")
    print("git_filter_driver_rejected=true")
    print("git_local_config_exact_allowlist_required=true")
    print("git_dynamic_observer_authority_removed=true")
    print("direct_main_ref_required=true")
    print("direct_worktree_git_tree_oid_required=true")
    print("trusted_launcher_expected_head_tree_pair_required=true")
    print("dynamic_git_execution_not_authoritative=true")
    print("untracked_paths_change_direct_tree_oid=true")
    print("git_worktree_config_extension_rejected=true")
    print("git_promisor_partial_clone_rejected=true")
    print("git_direct_main_ref_generation_required=true")
    print("git_metadata_provenance_required_for_all_roots=true")
    print("dynamic_git_root_or_runtime_exec_removed=true")
    print("runtime_write_audit_external_helper_free=true")
    print("source_release_ancestor_acl_custody_required=true")
    print("source_release_ancestor_generation_revalidation_required=true")
    assert QUALIFIER_REL.endswith("_installed_qualification_v4.py") and len(QUALIFIER_BLOB) == 40
    print("installed_qualifier_v4_bound=true")
    print("partial_publication_truthful=true"); print("no_rollback_after_publication=true")
    print("service_mutation=false"); print("transaction=false"); print("funds_movement=false")

def plan(
    native: pathlib.Path,
    selector: pathlib.Path,
    expected_head: str,
    expected_tree: str,
    expected_full_history_content_sha256: str,
) -> None:
    result = collect_plan(
        native, selector, expected_head, expected_tree,
        expected_full_history_content_sha256,
    )
    body, state = result["body"], result["body"]["installed_state"]
    print(MARKER); print("mode=plan"); print("read_only=true"); print("plan_id=" + result["plan_id"])
    print("expected_head=" + expected_head); print("expected_tree=" + expected_tree); print("expected_full_history_content_sha256=" + expected_full_history_content_sha256)
    print("accepted_lock_id=" + LOCK_ID); print("source_tree_digest=" + body["source_release"]["tree_digest"])
    print("live_release_path=" + os.fspath(LIVE_RELEASE)); print("full_history_release_path=" + os.fspath(SOURCE_RELEASE))
    for key in ("protected_source_exact", "native_preentry_exact", "selector_exact"): print(key + "=" + str(state[key]).lower())
    print("create_only=true"); print("resumable_exact_components=true"); print("partial_publication_possible=true")
    print("no_rollback_after_publication=true"); print("filesystem_write=false"); print("service_mutation=false")
    print("credential_access=false"); print("signing=false"); print("transaction=false"); print("funds_movement=false")
    if all(state.values()):
        print("already_installed=true"); print("next_action=RUN_INSTALLED_QUALIFICATION_V4")
    else:
        print("already_installed=false"); print("next_action=SEPARATELY_AUTHORIZE_V7_PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V5")

def apply(
    native: pathlib.Path,
    selector: pathlib.Path,
    expected_head: str,
    expected_tree: str,
    expected_full_history_content_sha256: str,
    expected_plan_id: str,
    confirm: str,
) -> None:
    if confirm != CONFIRM_TOKEN: raise InstallError("explicit_create_only_confirmation_required")
    require_privileged_source_custody()
    if (not expected_plan_id.startswith(PLAN_PREFIX) or len(expected_plan_id) != len(PLAN_PREFIX) + 64
            or any(ch not in "0123456789abcdef" for ch in expected_plan_id[len(PLAN_PREFIX):])):
        raise InstallError("expected_plan_id_invalid")
    if os.geteuid() != 0: raise InstallError("root_required_for_apply")
    result = collect_plan(
        native, selector, expected_head, expected_tree,
        expected_full_history_content_sha256,
    )
    if result["plan_id"] != expected_plan_id: raise InstallError("expected_plan_id_mismatch")
    state = result["body"]["installed_state"]
    if all(state.values()):
        print(MARKER); print("mode=apply"); print("status=ALREADY_GREEN"); print("protected_filesystem_mutation=false")
        print("next_action=RUN_INSTALLED_QUALIFICATION_V4"); return
    try:
        if not state["protected_source_exact"]: _publish_source(result["source_digest"], expected_full_history_content_sha256)
        if not state["native_preentry_exact"]:
            _publish_binary(PREENTRY_STAGE, PREENTRY_STAGE_NAME, PREENTRY_DIR_NAME, PREENTRY_NAME, result["native_raw"], NATIVE_SHA256, "native_preentry")
            if not exact_binary_root(PREENTRY_DIR, PREENTRY_NAME, NATIVE_SHA256, NATIVE_BYTES, "native_preentry"):
                raise InstallError("native_preentry_postpublication_verification_failed")
        if not state["selector_exact"]:
            _publish_binary(SELECTOR_STAGE, SELECTOR_STAGE_NAME, SELECTOR_DIR_NAME, SELECTOR_NAME, result["selector_raw"], SELECTOR_SHA256, "selector")
            if not exact_binary_root(SELECTOR_DIR, SELECTOR_NAME, SELECTOR_SHA256, SELECTOR_BYTES, "selector"):
                raise InstallError("selector_postpublication_verification_failed")
    except BaseException:
        for stage in (SOURCE_STAGE, PREENTRY_STAGE, SELECTOR_STAGE):
            try: _cleanup_stage(stage)
            except OSError: pass
        raise
    final = collect_plan(
        native, selector, expected_head, expected_tree,
        expected_full_history_content_sha256,
    )
    if not all(final["body"]["installed_state"].values()): raise InstallError("final_installed_state_not_exact")
    print(MARKER); print("mode=apply"); print("status=PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V5_GREEN")
    print("plan_id=" + expected_plan_id); print("published_components=" + ",".join(_PUBLISHED)); print("protected_install_performed=true")
    print("partial_publication_possible=true"); print("no_rollback_after_publication=true")
    print("service_mutation=false"); print("systemd_mutation=false"); print("credential_access=false"); print("private_key_access=false")
    print("wallet_or_signer_access=false"); print("signing=false"); print("transaction=false"); print("payment_acceptance=false")
    print("public_presale_activation=false"); print("wc_void_market_activation=false"); print("funds_movement=false")
    print("next_action=RUN_INSTALLED_QUALIFICATION_V4")

def main() -> int:
    parser = argparse.ArgumentParser(); mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true"); mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true"); mode.add_argument("--apply", action="store_true")
    parser.add_argument("--native", type=pathlib.Path); parser.add_argument("--selector", type=pathlib.Path)
    parser.add_argument("--expected-head", default=""); parser.add_argument("--expected-tree", default="")
    parser.add_argument("--expected-full-history-content-sha256", default="")
    parser.add_argument("--expected-plan-id", default=""); parser.add_argument("--confirm", default="")
    args = parser.parse_args()
    if args.self_test: self_test(); return 0
    if args.source_plan: source_plan(); return 0
    if args.native is None or args.selector is None: raise InstallError("native_and_selector_candidate_paths_required")
    if not args.expected_head: raise InstallError("expected_head_required")
    if not args.expected_tree: raise InstallError("expected_tree_required")
    if not args.expected_full_history_content_sha256:
        raise InstallError("expected_full_history_content_sha256_required")
    if args.plan:
        plan(
            args.native, args.selector, args.expected_head, args.expected_tree,
            args.expected_full_history_content_sha256,
        )
        return 0
    apply(
        args.native, args.selector, args.expected_head, args.expected_tree,
        args.expected_full_history_content_sha256,
        args.expected_plan_id, args.confirm,
    )
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (InstallError, OSError, UnicodeError) as exc:
        print(MARKER); print("status=HOLD"); print("reason=" + str(exc)); print("published_components=" + ",".join(_PUBLISHED))
        print("partial_publication_possible=true"); print("no_rollback_after_publication=true")
        print("protected_filesystem_mutation=" + str(_WRITE_PERFORMED).lower()); print("service_mutation=false"); print("systemd_mutation=false")
        print("credential_access=false"); print("private_key_access=false"); print("wallet_or_signer_access=false"); print("signing=false")
        print("transaction=false"); print("payment_acceptance=false"); print("public_presale_activation=false")
        print("wc_void_market_activation=false"); print("funds_movement=false"); raise SystemExit(2)
