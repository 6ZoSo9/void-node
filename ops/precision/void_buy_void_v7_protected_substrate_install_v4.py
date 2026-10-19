#!/usr/bin/env python3
from __future__ import annotations

# Built-in-only bootstrap guard. This does not authenticate Python startup hooks;
# privileged execution still requires a separately reviewed trusted launcher.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V4"
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
import subprocess
import tempfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_v7_protected_substrate_install_plan_v4"
PLAN_PREFIX = "voidv7substrateinstallplan4_"
CONFIRM_TOKEN = "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V4_CREATE_ONLY"

PREDECESSOR_MERGE = "0ada7fde0d90c3946b10693f4621cbd690bfcde6"
PREDECESSOR_TREE = "9e930fba9aacfafb5b163767302786cd7f31c81e"
LOCK_REL = "ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json"
LOCK_BLOB = "831f6e3f79a62a334662cebc6d2c39133bc7a309"
LOCK_ID = "voidv7substratelock1_6014a83805170202a6117b6004b94e1daddb2dd9123c17802002e72c8002a649"
MATERIALIZER_REL = "scripts/materialize_buy_void_v7_protected_substrate_v2.py"
MATERIALIZER_BLOB = "474614da950db72082fb95a5174405ce8caf2513"
PREDECESSOR_INSTALLER_REL = "ops/precision/void_buy_void_v7_protected_substrate_install_v3.py"
PREDECESSOR_INSTALLER_BLOB = "4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38"
QUALIFIER_REL = "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v3.py"
QUALIFIER_BLOB = "2132ed4f545364347e27bd77adc3ab447c0df397"

SOURCE_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
SOURCE_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
SOURCE_RELEASE = pathlib.Path("/opt/void-node-live/releases/" + SOURCE_HEAD)
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
SOURCE_STAGE_NAME = ".void-buy-void-v7-reviewed-v1.stage-v2"
PREENTRY_STAGE_NAME = ".void-buy-void-v7-preentry-v1.stage-v2"
SELECTOR_STAGE_NAME = ".void-buy-void-v7-selector-v1.stage-v2"
SOURCE_STAGE = INSTALL_PARENT / SOURCE_STAGE_NAME
PREENTRY_STAGE = INSTALL_PARENT / PREENTRY_STAGE_NAME
SELECTOR_STAGE = INSTALL_PARENT / SELECTOR_STAGE_NAME
NATIVE_SHA256 = "8ce663ff7e3713fc6bf615dd743350be9e50dff729fdb3d609b065b158397851"
NATIVE_BYTES = 21600
SELECTOR_SHA256 = "048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232"
SELECTOR_BYTES = 26680
RUNTIME_UID = 1000
RUNTIME_GID = 1000
FIXED_GIT = pathlib.Path("/usr/bin/git")
FIXED_SETPRIV = pathlib.Path("/usr/bin/setpriv")
FIXED_PYTHON = pathlib.Path("/usr/bin/python3")
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

_RUNTIME_WRITE_AUDIT_CODE = (
    "import os,sys\n"
    "for raw in sys.stdin.buffer.read().split(b'\\0'):\n"
    "    if not raw: continue\n"
    "    p=os.fsdecode(raw)\n"
    "    if not os.path.lexists(p): sys.stdout.buffer.write(raw); raise SystemExit(4)\n"
    "    if os.access(p, os.W_OK, effective_ids=True): sys.stdout.buffer.write(raw); raise SystemExit(3)\n"
    "raise SystemExit(0)\n"
)

def _require_runtime_uid_nonwritable(paths: list[pathlib.Path], label: str) -> None:
    unique = sorted({os.path.abspath(os.fspath(path)) for path in paths})
    if not unique:
        return
    if os.geteuid() == RUNTIME_UID and os.getegid() == RUNTIME_GID:
        for raw_path in unique:
            path = pathlib.Path(raw_path)
            if not path.exists() and not path.is_symlink():
                raise InstallError(label + "_runtime_write_audit_path_missing")
            if os.access(path, os.W_OK, effective_ids=True):
                raise InstallError(label + "_runtime_writable")
        return
    if os.geteuid() != 0:
        raise InstallError(label + "_runtime_write_audit_identity_invalid")
    if not FIXED_SETPRIV.is_file() or not FIXED_PYTHON.is_file():
        raise InstallError(label + "_runtime_write_audit_helper_unavailable")
    payload = b"\0".join(os.fsencode(path) for path in unique) + b"\0"
    cp = subprocess.run(
        [
            os.fspath(FIXED_SETPRIV), "--no-new-privs",
            "--reuid=" + str(RUNTIME_UID), "--regid=" + str(RUNTIME_GID), "--clear-groups",
            os.fspath(FIXED_PYTHON), "-I", "-B", "-c", _RUNTIME_WRITE_AUDIT_CODE,
        ],
        input=payload,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=120,
        env=_git_env(),
    )
    if cp.returncode == 0 and cp.stdout == b"" and cp.stderr == b"":
        return
    if cp.returncode == 3 and cp.stderr == b"":
        raise InstallError(label + "_runtime_writable")
    if cp.returncode == 4 and cp.stderr == b"":
        raise InstallError(label + "_runtime_write_audit_path_missing")
    raise InstallError(label + "_runtime_write_audit_failed")

def require_privileged_source_custody() -> None:
    if os.geteuid() != 0 or os.getuid() != 0:
        raise InstallError("root_required_for_privileged_source_custody")
    source_root = pathlib.Path(os.path.abspath(os.fspath(ROOT)))
    if source_root.resolve(strict=True) != source_root:
        raise InstallError("privileged_source_root_alias_forbidden")
    runtime_paths: list[pathlib.Path] = []
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
        runtime_paths.append(current)
        if current == current.parent:
            break
        current = current.parent
    pending = [source_root]
    checked = 0
    while pending:
        directory = pending.pop()
        for entry in os.scandir(directory):
            checked += 1
            if checked > MAX_NODES:
                raise InstallError("privileged_source_node_limit")
            path = pathlib.Path(entry.path)
            st = os.lstat(path)
            if st.st_uid != 0 or st.st_gid != 0:
                raise InstallError("privileged_source_node_owner_invalid:" + os.fspath(path))
            mode = stat.S_IMODE(st.st_mode)
            if stat.S_ISLNK(st.st_mode):
                try:
                    resolved = path.resolve(strict=True)
                except OSError as exc:
                    raise InstallError("privileged_source_symlink_unavailable:" + os.fspath(path)) from exc
                if resolved != source_root and source_root not in resolved.parents:
                    raise InstallError("privileged_source_symlink_escape:" + os.fspath(path))
                continue
            if mode & 0o022:
                raise InstallError("privileged_source_node_writable:" + os.fspath(path))
            runtime_paths.append(path)
            if stat.S_ISDIR(st.st_mode):
                pending.append(path)
            elif not stat.S_ISREG(st.st_mode):
                raise InstallError("privileged_source_node_kind_invalid:" + os.fspath(path))
    _require_runtime_uid_nonwritable(runtime_paths, "privileged_source")

def _metadata_identity(st: os.stat_result) -> tuple[int, int, int, int, int, int, int, int, int]:
    return (
        st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode, st.st_nlink,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )

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

def _git_config_closed(raw: bytes, label: str) -> None:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise InstallError(label + "_git_config_not_utf8") from exc
    if "\x00" in text:
        raise InstallError(label + "_git_config_nul")
    section = ""
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
            if section == "include" or section.startswith("includeif "):
                raise InstallError(label + "_git_config_include_forbidden")
            continue
        key_part = line.split("=", 1)[0].strip()
        key = key_part.split(None, 1)[0].lower() if key_part else ""
        if not key:
            raise InstallError(label + "_git_config_key_invalid:" + str(lineno))
        if key.startswith("include.") or key.startswith("includeif."):
            raise InstallError(label + "_git_config_include_forbidden")
        if section == "core" and key == "worktree":
            raise InstallError(label + "_git_config_core_worktree_forbidden")
        if section == "extensions" and key in ("worktreeconfig", "partialclone"):
            raise InstallError(label + "_git_config_extension_forbidden:" + key)
        if section.startswith('remote "') and key in ("promisor", "partialclonefilter"):
            raise InstallError(label + "_git_config_promisor_forbidden")

def _direct_git_metadata_snapshot(root: pathlib.Path, label: str) -> tuple[object, ...]:
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
        git_dir / "shallow",
        git_dir / "info" / "grafts",
        objects / "info" / "alternates",
        objects / "info" / "http-alternates",
    )
    for path in forbidden:
        if path.exists() or path.is_symlink():
            raise InstallError(label + "_git_metadata_indirection_forbidden:" + path.name)
    config_raw, config_identity = _read_metadata_file(git_dir / "config", label + "_git_config")
    _git_config_closed(config_raw, label)
    return (
        _metadata_identity(gst),
        _metadata_identity(ost),
        config_identity,
        sha256_bytes(config_raw),
    )

def _git_probe_text(root: pathlib.Path, *args: str) -> str:
    argv = [
        os.fspath(FIXED_GIT), "-c", "safe.directory=" + os.fspath(root), "-c", "core.hooksPath=/dev/null",
        "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", "-c", "submodule.recurse=false",
        "--no-replace-objects", "-C", os.fspath(root), *args,
    ]
    if os.geteuid() == 0:
        if not FIXED_SETPRIV.is_file():
            raise InstallError("setpriv_unavailable")
        argv = [os.fspath(FIXED_SETPRIV), "--no-new-privs", "--reuid=1000", "--regid=1000", "--clear-groups", *argv]
    elif os.geteuid() != RUNTIME_UID or os.getegid() != RUNTIME_GID:
        raise InstallError("repository_observer_identity_invalid")
    cp = subprocess.run(
        argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, check=False, timeout=30, env=_git_env(),
    )
    if cp.returncode != 0 or cp.stderr != "":
        raise InstallError("git_provenance_probe_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()

def _resolve_git_reported(root: pathlib.Path, value: str, label: str) -> pathlib.Path:
    candidate = pathlib.Path(value)
    if not candidate.is_absolute():
        candidate = root / candidate
    try:
        return candidate.resolve(strict=True)
    except OSError as exc:
        raise InstallError(label + "_git_reported_path_unavailable") from exc

def require_git_metadata_provenance(root: pathlib.Path, label: str) -> None:
    before = _direct_git_metadata_snapshot(root, label)
    expected_git_dir = (root / ".git").resolve(strict=True)
    observed_git_dir = _resolve_git_reported(root, _git_probe_text(root, "rev-parse", "--git-dir"), label)
    observed_common_dir = _resolve_git_reported(root, _git_probe_text(root, "rev-parse", "--git-common-dir"), label)
    observed_top = _resolve_git_reported(root, _git_probe_text(root, "rev-parse", "--show-toplevel"), label)
    shallow = _git_probe_text(root, "rev-parse", "--is-shallow-repository")
    after = _direct_git_metadata_snapshot(root, label)
    if before != after:
        raise InstallError(label + "_git_metadata_generation_changed")
    if observed_git_dir != expected_git_dir:
        raise InstallError(label + "_git_dir_not_in_tree")
    if observed_common_dir != expected_git_dir:
        raise InstallError(label + "_git_common_dir_not_in_tree")
    if observed_top != root.resolve(strict=True):
        raise InstallError(label + "_git_toplevel_mismatch")
    if shallow != "false":
        raise InstallError(label + "_git_shallow_forbidden")

def _write_git_metadata_fixture(root: pathlib.Path, config: str = "[core]\nrepositoryformatversion = 0\nbare = false\n") -> None:
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

def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")

def _git_env() -> dict[str, str]:
    return {
        "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1", "GIT_OPTIONAL_LOCKS": "0", "GIT_TERMINAL_PROMPT": "0",
        "GIT_ASKPASS": "/bin/false", "GIT_NO_LAZY_FETCH": "1", "GIT_PROTOCOL_FROM_USER": "0",
        "GIT_ALLOW_PROTOCOL": "", "GIT_PAGER": "",
    }

def git_text(root: pathlib.Path, *args: str) -> str:
    argv = [
        os.fspath(FIXED_GIT), "-c", "safe.directory=" + os.fspath(root), "-c", "core.hooksPath=/dev/null",
        "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", "-c", "submodule.recurse=false",
        "--no-replace-objects", "-C", os.fspath(root), *args,
    ]
    if os.geteuid() == 0:
        if not FIXED_SETPRIV.is_file():
            raise InstallError("setpriv_unavailable")
        argv = [os.fspath(FIXED_SETPRIV), "--no-new-privs", "--reuid=1000", "--regid=1000", "--clear-groups", *argv]
    elif os.geteuid() != RUNTIME_UID or os.getegid() != RUNTIME_GID:
        raise InstallError("repository_observer_identity_invalid")
    cp = subprocess.run(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                        text=True, check=False, timeout=60, env=_git_env())
    if cp.returncode != 0 or cp.stderr != "":
        raise InstallError("git_observation_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()

def git_bytes(root: pathlib.Path, *args: str) -> bytes:
    argv = [
        os.fspath(FIXED_GIT), "-c", "safe.directory=" + os.fspath(root), "-c", "core.hooksPath=/dev/null",
        "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", "-c", "submodule.recurse=false",
        "--no-replace-objects", "-C", os.fspath(root), *args,
    ]
    if os.geteuid() == 0:
        if not FIXED_SETPRIV.is_file():
            raise InstallError("setpriv_unavailable")
        argv = [os.fspath(FIXED_SETPRIV), "--no-new-privs", "--reuid=1000", "--regid=1000", "--clear-groups", *argv]
    elif os.geteuid() != RUNTIME_UID or os.getegid() != RUNTIME_GID:
        raise InstallError("repository_observer_identity_invalid")
    cp = subprocess.run(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                        check=False, timeout=60, env=_git_env())
    if cp.returncode != 0 or cp.stderr != b"":
        raise InstallError("git_observation_failed:" + (args[0] if args else "unknown"))
    return cp.stdout

def git_is_ancestor(root: pathlib.Path, base: str, head: str) -> bool:
    argv = [
        os.fspath(FIXED_GIT), "-c", "safe.directory=" + os.fspath(root), "-c", "core.hooksPath=/dev/null",
        "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", "-c", "submodule.recurse=false",
        "--no-replace-objects", "-C", os.fspath(root), "merge-base", "--is-ancestor", base, head,
    ]
    if os.geteuid() == 0:
        argv = [os.fspath(FIXED_SETPRIV), "--no-new-privs", "--reuid=1000", "--regid=1000", "--clear-groups", *argv]
    cp = subprocess.run(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                        check=False, timeout=20, env=_git_env())
    if cp.returncode not in (0, 1) or cp.stdout or cp.stderr:
        raise InstallError("git_ancestor_observation_failed")
    return cp.returncode == 0

def verify_repository(expected_head: str) -> None:
    require_git_metadata_provenance(ROOT, "checkout")
    if len(expected_head) != 40 or any(ch not in "0123456789abcdef" for ch in expected_head):
        raise InstallError("expected_head_invalid")
    if git_text(ROOT, "rev-parse", "--verify", "HEAD") != expected_head:
        raise InstallError("checkout_head_mismatch")
    if git_text(ROOT, "branch", "--show-current") != "main":
        raise InstallError("checkout_branch_not_main")
    if git_text(ROOT, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise InstallError("checkout_not_clean")
    if not git_is_ancestor(ROOT, PREDECESSOR_MERGE, expected_head):
        raise InstallError("predecessor_v3_installer_merge_not_current_ancestor")
    if git_text(ROOT, "rev-parse", PREDECESSOR_MERGE + "^{tree}") != PREDECESSOR_TREE:
        raise InstallError("predecessor_v3_installer_merge_tree_mismatch")
    for rel, blob in {
        LOCK_REL: LOCK_BLOB, MATERIALIZER_REL: MATERIALIZER_BLOB,
        PREDECESSOR_INSTALLER_REL: PREDECESSOR_INSTALLER_BLOB, QUALIFIER_REL: QUALIFIER_BLOB,
    }.items():
        if git_text(ROOT, "rev-parse", "HEAD:" + rel) != blob:
            raise InstallError("accepted_dependency_blob_mismatch:" + rel)

def accepted_lock(expected_head: str) -> dict[str, Any]:
    raw = git_bytes(ROOT, "show", expected_head + ":" + LOCK_REL)
    if git_blob_sha1(raw) != LOCK_BLOB:
        raise InstallError("accepted_lock_blob_mismatch")
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

def verify_source_release() -> None:
    if SOURCE_RELEASE.resolve() != SOURCE_RELEASE or not SOURCE_RELEASE.is_dir() or SOURCE_RELEASE.is_symlink():
        raise InstallError("source_release_path_invalid")
    require_git_metadata_provenance(SOURCE_RELEASE, "source_release")
    if git_text(SOURCE_RELEASE, "rev-parse", "--verify", "HEAD^{commit}") != SOURCE_HEAD:
        raise InstallError("source_release_head_mismatch")
    if git_text(SOURCE_RELEASE, "rev-parse", "--verify", "HEAD^{tree}") != SOURCE_TREE:
        raise InstallError("source_release_tree_mismatch")
    if git_text(SOURCE_RELEASE, "symbolic-ref", "--short", "-q", "HEAD") != "main":
        raise InstallError("source_release_branch_not_main")
    if git_text(SOURCE_RELEASE, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise InstallError("source_release_not_clean")

def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb", buffering=0) as f:
        for chunk in iter(lambda: f.read(COPY_CHUNK), b""):
            h.update(chunk)
    return h.hexdigest()

def _strict_internal_symlink(path: pathlib.Path, root: pathlib.Path, label: str) -> pathlib.Path:
    try:
        resolved = path.resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise InstallError(label + "_target_unavailable:" + os.fspath(path)) from exc
    if resolved != root and not str(resolved).startswith(str(root) + os.sep):
        raise InstallError(label + "_escapes_root:" + os.fspath(path))
    return resolved

def tree_digest(root: pathlib.Path, expected_root_mode: int) -> tuple[str, int, int]:
    if root.resolve() != root or not root.is_dir() or root.is_symlink():
        raise InstallError("tree_root_invalid:" + os.fspath(root))
    rst = root.lstat()
    if rst.st_uid != 0 or rst.st_gid != 0 or stat.S_IMODE(rst.st_mode) != expected_root_mode:
        raise InstallError("tree_root_metadata_invalid:" + os.fspath(root))
    h, nodes, total = hashlib.sha256(), 0, 0
    runtime_paths: list[pathlib.Path] = [root]
    pending: list[tuple[pathlib.Path, pathlib.PurePosixPath]] = [(root, pathlib.PurePosixPath("."))]
    while pending:
        directory, rel = pending.pop()
        for entry in sorted(os.scandir(directory), key=lambda e: e.name):
            nodes += 1
            if nodes > MAX_NODES:
                raise InstallError("tree_node_limit")
            child, relative = directory / entry.name, (rel / entry.name).as_posix()
            st = os.lstat(child)
            mode = stat.S_IMODE(st.st_mode)
            if st.st_uid != 0 or st.st_gid != 0:
                raise InstallError("tree_node_not_root_owned:" + relative)
            if not stat.S_ISLNK(st.st_mode) and mode & 0o022:
                raise InstallError("tree_node_writable:" + relative)
            if not stat.S_ISLNK(st.st_mode):
                runtime_paths.append(child)
            if stat.S_ISDIR(st.st_mode):
                h.update(("D\0" + relative + "\0" + format(mode, "04o") + "\n").encode())
                pending.append((child, rel / entry.name))
            elif stat.S_ISREG(st.st_mode):
                if st.st_size > MAX_FILE_BYTES:
                    raise InstallError("tree_file_size_limit:" + relative)
                total += st.st_size
                if total > MAX_TOTAL_BYTES:
                    raise InstallError("tree_total_bytes_limit")
                h.update(("F\0" + relative + "\0" + format(mode, "04o") + "\0" + str(st.st_size) + "\0" + sha256_file(child) + "\n").encode())
            elif stat.S_ISLNK(st.st_mode):
                _strict_internal_symlink(child, root, "tree_symlink")
                h.update(("L\0" + relative + "\0" + os.readlink(child) + "\n").encode())
            else:
                raise InstallError("tree_node_kind_invalid:" + relative)
    _require_runtime_uid_nonwritable(runtime_paths, "tree")
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
    if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_uid != 0 or st.st_gid != 0 or stat.S_IMODE(st.st_mode) != 0o755:
        raise InstallError(label + "_root_metadata_invalid")
    if sorted(os.listdir(root)) != [filename]:
        raise InstallError(label + "_root_entries_invalid")
    path, fst = root / filename, (root / filename).lstat()
    if (not stat.S_ISREG(fst.st_mode) or stat.S_ISLNK(fst.st_mode) or fst.st_uid != 0 or fst.st_gid != 0 or fst.st_nlink != 1
            or stat.S_IMODE(fst.st_mode) != 0o555 or fst.st_size != expected_bytes or sha256_file(path) != expected_sha):
        raise InstallError(label + "_installed_binary_invalid")
    _require_runtime_uid_nonwritable([root, path], label + "_installed")
    return True

def source_target_state(source_digest: tuple[str, int, int]) -> bool:
    if not SOURCE_TARGET.exists() and not SOURCE_TARGET.is_symlink():
        return False
    st = SOURCE_TARGET.lstat()
    if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_uid != 0 or st.st_gid != 0 or stat.S_IMODE(st.st_mode) != PROTECTED_SOURCE_ROOT_MODE:
        raise InstallError("protected_source_target_metadata_invalid")
    if tree_digest(SOURCE_TARGET, PROTECTED_SOURCE_ROOT_MODE) != source_digest:
        raise InstallError("protected_source_target_generation_mismatch")
    require_git_metadata_provenance(SOURCE_TARGET, "protected_source")
    if git_text(SOURCE_TARGET, "rev-parse", "--verify", "HEAD^{commit}") != SOURCE_HEAD or git_text(SOURCE_TARGET, "rev-parse", "--verify", "HEAD^{tree}") != SOURCE_TREE:
        raise InstallError("protected_source_target_git_generation_mismatch")
    if git_text(SOURCE_TARGET, "symbolic-ref", "--short", "-q", "HEAD") != "main" or git_text(SOURCE_TARGET, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise InstallError("protected_source_target_not_clean_main")
    return True

def ensure_stage_roots_absent() -> None:
    for stage in (SOURCE_STAGE, PREENTRY_STAGE, SELECTOR_STAGE):
        if stage.exists() or stage.is_symlink():
            raise InstallError("staging_root_preexisting:" + os.fspath(stage))

def collect_plan(native_path: pathlib.Path, selector_path: pathlib.Path, expected_head: str) -> dict[str, Any]:
    install_parent_custody()
    verify_repository(expected_head)
    accepted_lock(expected_head)
    source_digest = tree_digest(SOURCE_RELEASE, SOURCE_RELEASE_ROOT_MODE)
    verify_source_release()
    native_raw = read_candidate(native_path, NATIVE_SHA256, NATIVE_BYTES, "native")
    selector_raw = read_candidate(selector_path, SELECTOR_SHA256, SELECTOR_BYTES, "selector")
    source_exact = source_target_state(source_digest)
    preentry_exact = exact_binary_root(PREENTRY_DIR, PREENTRY_NAME, NATIVE_SHA256, NATIVE_BYTES, "native_preentry")
    selector_exact = exact_binary_root(SELECTOR_DIR, SELECTOR_NAME, SELECTOR_SHA256, SELECTOR_BYTES, "selector")
    if not (source_exact and preentry_exact and selector_exact):
        ensure_stage_roots_absent()
    body = {
        "schema": SCHEMA, "version": 4, "expected_head": expected_head,
        "predecessor_v3_installer_merge": PREDECESSOR_MERGE, "predecessor_v3_installer_tree": PREDECESSOR_TREE, "accepted_lock_id": LOCK_ID,
        "source_release": {"head": SOURCE_HEAD, "tree": SOURCE_TREE, "path": os.fspath(SOURCE_RELEASE),
                           "root_mode": format(SOURCE_RELEASE_ROOT_MODE, "04o"),
                           "tree_digest": source_digest[0], "nodes": source_digest[1], "regular_file_bytes": source_digest[2]},
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
        for entry in sorted(os.scandir(src_dir), key=lambda e: e.name):
            count += 1
            if count > MAX_NODES: raise InstallError("copy_node_limit")
            src, dst, st = src_dir / entry.name, dst_dir / entry.name, os.lstat(src_dir / entry.name)
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

def _publish_source(expected_digest: tuple[str, int, int]) -> None:
    if SOURCE_STAGE.exists() or SOURCE_STAGE.is_symlink(): raise InstallError("source_stage_preexisting")
    _copy_tree(SOURCE_RELEASE, SOURCE_STAGE)
    if tree_digest(SOURCE_RELEASE, SOURCE_RELEASE_ROOT_MODE) != expected_digest: raise InstallError("source_release_changed_during_copy")
    verify_source_release()
    if tree_digest(SOURCE_STAGE, PROTECTED_SOURCE_ROOT_MODE) != expected_digest: raise InstallError("source_stage_digest_mismatch")
    require_git_metadata_provenance(SOURCE_STAGE, "source_stage")
    if git_text(SOURCE_STAGE, "rev-parse", "--verify", "HEAD^{commit}") != SOURCE_HEAD or git_text(SOURCE_STAGE, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise InstallError("source_stage_git_generation_invalid")
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
    print("installed_qualifier_v3_bound=true")
    print("git_metadata_provenance_required_for_all_roots=true")
    print("git_external_metadata_and_object_indirection_rejected=true")
    print("source_control_network=false"); print("protected_filesystem_mutation=false"); print("service_mutation=false")
    print("credential_access=false"); print("signing=false"); print("transaction=false"); print("funds_movement=false")

def self_test() -> None:
    assert SOURCE_TARGET == pathlib.Path("/opt/void-buy-void-v7-reviewed-v1")
    assert PREENTRY_TARGET.name == PREENTRY_NAME and SELECTOR_TARGET.name == SELECTOR_NAME
    sample = {"schema": SCHEMA, "version": 4, "expected_head": "a" * 40}
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
    _assert_git_metadata_fixture_rejected(lambda root: ((root / ".git").rename(root / ".git.real"), (root / ".git").write_text("gitdir: /tmp/hostile\n", "utf-8")))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "commondir").write_text("/tmp/hostile\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "objects" / "info" / "alternates").write_text("/tmp/hostile-objects\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "objects" / "info" / "http-alternates").write_text("https://invalid.example/objects\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "info" / "grafts").write_text("0" * 81 + "\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "shallow").write_text("0" * 40 + "\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text("[include]\npath = /tmp/hostile\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text("[core]\nworktree = /tmp/hostile\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text("[extensions]\nworktreeConfig = true\n", "utf-8"))
    _assert_git_metadata_fixture_rejected(lambda root: (root / ".git" / "config").write_text('[remote "origin"]\npromisor = true\n', "utf-8"))
    print("git_real_in_tree_dir_required=true")
    print("git_commondir_indirection_rejected=true")
    print("git_object_alternates_rejected=true")
    print("git_http_alternates_rejected=true")
    print("git_grafts_rejected=true")
    print("git_shallow_rejected=true")
    print("git_local_config_include_rejected=true")
    print("git_core_worktree_redirect_rejected=true")
    print("git_worktree_config_extension_rejected=true")
    print("git_promisor_partial_clone_rejected=true")
    print("git_exact_dir_common_toplevel_required=true")
    print("git_metadata_provenance_required_for_all_roots=true")
    assert QUALIFIER_REL.endswith("_installed_qualification_v3.py") and len(QUALIFIER_BLOB) == 40
    print("installed_qualifier_v3_bound=true")
    print("partial_publication_truthful=true"); print("no_rollback_after_publication=true")
    print("service_mutation=false"); print("transaction=false"); print("funds_movement=false")

def plan(native: pathlib.Path, selector: pathlib.Path, expected_head: str) -> None:
    result = collect_plan(native, selector, expected_head); body, state = result["body"], result["body"]["installed_state"]
    print(MARKER); print("mode=plan"); print("read_only=true"); print("plan_id=" + result["plan_id"])
    print("expected_head=" + expected_head); print("accepted_lock_id=" + LOCK_ID); print("source_tree_digest=" + body["source_release"]["tree_digest"])
    for key in ("protected_source_exact", "native_preentry_exact", "selector_exact"): print(key + "=" + str(state[key]).lower())
    print("create_only=true"); print("resumable_exact_components=true"); print("partial_publication_possible=true")
    print("no_rollback_after_publication=true"); print("filesystem_write=false"); print("service_mutation=false")
    print("credential_access=false"); print("signing=false"); print("transaction=false"); print("funds_movement=false")
    if all(state.values()):
        print("already_installed=true"); print("next_action=RUN_INSTALLED_QUALIFICATION_V3")
    else:
        print("already_installed=false"); print("next_action=SEPARATELY_AUTHORIZE_V7_PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V4")

def apply(native: pathlib.Path, selector: pathlib.Path, expected_head: str, expected_plan_id: str, confirm: str) -> None:
    if confirm != CONFIRM_TOKEN: raise InstallError("explicit_create_only_confirmation_required")
    require_privileged_source_custody()
    if (not expected_plan_id.startswith(PLAN_PREFIX) or len(expected_plan_id) != len(PLAN_PREFIX) + 64
            or any(ch not in "0123456789abcdef" for ch in expected_plan_id[len(PLAN_PREFIX):])):
        raise InstallError("expected_plan_id_invalid")
    if os.geteuid() != 0: raise InstallError("root_required_for_apply")
    result = collect_plan(native, selector, expected_head)
    if result["plan_id"] != expected_plan_id: raise InstallError("expected_plan_id_mismatch")
    state = result["body"]["installed_state"]
    if all(state.values()):
        print(MARKER); print("mode=apply"); print("status=ALREADY_GREEN"); print("protected_filesystem_mutation=false")
        print("next_action=RUN_INSTALLED_QUALIFICATION_V3"); return
    try:
        if not state["protected_source_exact"]: _publish_source(result["source_digest"])
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
    final = collect_plan(native, selector, expected_head)
    if not all(final["body"]["installed_state"].values()): raise InstallError("final_installed_state_not_exact")
    print(MARKER); print("mode=apply"); print("status=PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V4_GREEN")
    print("plan_id=" + expected_plan_id); print("published_components=" + ",".join(_PUBLISHED)); print("protected_install_performed=true")
    print("partial_publication_possible=true"); print("no_rollback_after_publication=true")
    print("service_mutation=false"); print("systemd_mutation=false"); print("credential_access=false"); print("private_key_access=false")
    print("wallet_or_signer_access=false"); print("signing=false"); print("transaction=false"); print("payment_acceptance=false")
    print("public_presale_activation=false"); print("wc_void_market_activation=false"); print("funds_movement=false")
    print("next_action=RUN_INSTALLED_QUALIFICATION_V3")

def main() -> int:
    parser = argparse.ArgumentParser(); mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true"); mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true"); mode.add_argument("--apply", action="store_true")
    parser.add_argument("--native", type=pathlib.Path); parser.add_argument("--selector", type=pathlib.Path)
    parser.add_argument("--expected-head", default=""); parser.add_argument("--expected-plan-id", default=""); parser.add_argument("--confirm", default="")
    args = parser.parse_args()
    if args.self_test: self_test(); return 0
    if args.source_plan: source_plan(); return 0
    if args.native is None or args.selector is None: raise InstallError("native_and_selector_candidate_paths_required")
    if not args.expected_head: raise InstallError("expected_head_required")
    if args.plan: plan(args.native, args.selector, args.expected_head); return 0
    apply(args.native, args.selector, args.expected_head, args.expected_plan_id, args.confirm); return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (InstallError, OSError, subprocess.SubprocessError, UnicodeError) as exc:
        print(MARKER); print("status=HOLD"); print("reason=" + str(exc)); print("published_components=" + ",".join(_PUBLISHED))
        print("partial_publication_possible=true"); print("no_rollback_after_publication=true")
        print("protected_filesystem_mutation=" + str(_WRITE_PERFORMED).lower()); print("service_mutation=false"); print("systemd_mutation=false")
        print("credential_access=false"); print("private_key_access=false"); print("wallet_or_signer_access=false"); print("signing=false")
        print("transaction=false"); print("payment_acceptance=false"); print("public_presale_activation=false")
        print("wc_void_market_activation=false"); print("funds_movement=false"); raise SystemExit(2)
