#!/usr/bin/env python3

# Bootstrap isolation must run before any shadowable standard-library import.
# Only `sys` is used here; it is a built-in module and cannot be replaced by a
# checkout-local Python file.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = (
    "VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V1"
)
_BOOTSTRAP_NEGATIVE_AUTHORITY_FIELDS = (
    "epoch2_installed_generation_qualified",
    "filesystem_write_performed",
    "runner_execution",
    "live_composition_execution",
    "service_mutation",
    "network_contact",
    "credential_access",
    "private_key_access",
    "wallet_or_signer_access",
    "signing",
    "transaction_submission",
    "payment_acceptance",
    "public_presale_activation",
    "wc_void_market_activation",
    "treasury_or_liquidity_action",
    "funds_movement",
    "production_host_evidence_authority",
)

if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_mode_required")
        for _field in _BOOTSTRAP_NEGATIVE_AUTHORITY_FIELDS:
            print(_field + "=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_mode_required")

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import selectors
import signal
import stat
import subprocess
import sys
import time
import types
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_presale_epoch2_installed_generation_host_evidence_v1"
PARENT_PLAN_ID = (
    "voidbuyhostevplan1_"
    "665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab"
)

FIXED_CHECKOUT = Path("/home/zoso/dev/void-node")
FIXED_GIT = Path("/usr/bin/git")
FIXED_SETPRIV = Path("/usr/bin/setpriv")
FIXED_PYTHON = Path("/usr/bin/python3")
RUNTIME_UID = 1000
RUNTIME_GID = 1000
QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py"
)
QUALIFIER_BLOB = "a04c2e7665294cdd142426e9eb01ee27c5292b8d"
QUALIFIER_PROOF_REL = (
    "scripts/"
    "prove_void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py"
)
QUALIFIER_PROOF_BLOB = "c14ec00acffbc55630aa68db0013d97cac068ab3"
EXPECTED_QUALIFIER_MARKER = "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V5"
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_protected_install_v5.py"
)
INSTALLER_BLOB = "fd7a06490ccf6fb14831d8b0372a892e2764c9dc"
EXPECTED_INSTALLER_MARKER = (
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V5"
)
LOCK_REL = "ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json"
LOCK_BLOB = "bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b"
MAX_REVIEWED_SOURCE_BYTES = 2 * 1024 * 1024
MAX_CHECKOUT_FILE_BYTES = 64 * 1024 * 1024
MAX_CHECKOUT_TOTAL_BYTES = 512 * 1024 * 1024
MAX_CHECKOUT_FILES = 50000
MAX_CHECKOUT_LIST_BYTES = 16 * 1024 * 1024
MAX_GIT_OUTPUT_BYTES = MAX_CHECKOUT_LIST_BYTES
MAX_GIT_STDERR_BYTES = 64 * 1024
GIT_TIMEOUT_SECONDS = 20
STATUS_QUERY = ("status", "--porcelain=v1", "--untracked-files=all")
HEX40 = re.compile(r"^[0-9a-f]{40}$")

GIT_ENV = {
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
    "GIT_NO_LAZY_FETCH": "1",
    "GIT_ALLOW_PROTOCOL": "",
}

# This trusted in-memory launcher runs after the UID/capability drop, with -I.
# No Git parser runs until Landlock is enforced. Unsupported kernels HOLD.
GIT_READ_SANDBOX = r'''
import ctypes
import json
import os
import stat
import sys

def enter():
    if os.uname().machine != "x86_64":
        raise RuntimeError("architecture")
    request = json.loads(sys.argv[1])
    argv, checkout = request["argv"], request["checkout"]
    libc = ctypes.CDLL(None, use_errno=True)
    libc.syscall.restype = ctypes.c_long
    abi = libc.syscall(444, 0, 0, 1)
    if abi < 3:
        raise RuntimeError("landlock_unavailable")
    class Ruleset(ctypes.Structure):
        _fields_ = [("handled_access_fs", ctypes.c_uint64)]
    class Beneath(ctypes.Structure):
        _pack_ = 1
        _fields_ = [("allowed_access", ctypes.c_uint64), ("parent_fd", ctypes.c_int32)]
    # Handle every filesystem right through ABI 3, plus device ioctl on ABI 5+.
    rules = Ruleset((1 << (16 if abi >= 5 else 15)) - 1)
    rules_fd = libc.syscall(444, ctypes.byref(rules), ctypes.sizeof(rules), 0)
    if rules_fd < 0:
        raise RuntimeError("ruleset")
    retained = []
    def open_path(path):
        if not path.startswith("/"):
            raise RuntimeError("absolute_path")
        fd = os.open("/", os.O_PATH | os.O_DIRECTORY | os.O_CLOEXEC)
        try:
            for component in path.split("/")[1:]:
                if not component or component in (".", ".."):
                    raise RuntimeError("path_component")
                child = os.open(component, os.O_PATH | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=fd)
                os.close(fd)
                fd = child
                if stat.S_ISLNK(os.fstat(fd).st_mode):
                    raise RuntimeError("symlink")
            retained.append(fd)
            return fd
        except BaseException:
            os.close(fd)
            raise
    def allow_fd(fd, access):
        rule = Beneath(access, fd)
        if libc.syscall(445, rules_fd, 1, ctypes.byref(rule), 0) != 0:
            raise RuntimeError("rule")
    def allow_file(path, access=4, optional=False, trusted=False):
        try:
            fd = open_path(os.path.realpath(path) if trusted else path)
        except FileNotFoundError:
            if optional:
                return
            raise
        metadata = os.fstat(fd)
        if not stat.S_ISREG(metadata.st_mode) or (not trusted and metadata.st_nlink != 1):
            raise RuntimeError("metadata_file")
        allow_fd(fd, access)
    checkout_fd = open_path(checkout)
    if not stat.S_ISDIR(os.fstat(checkout_fd).st_mode):
        raise RuntimeError("checkout_directory")
    allow_fd(checkout_fd, 8)  # enumeration, never worktree file contents
    gitdir = checkout + "/.git"
    git_fd = open_path(gitdir)
    if not stat.S_ISDIR(os.fstat(git_fd).st_mode):
        raise RuntimeError("git_directory")
    for name in ("config", "HEAD", "index", "packed-refs", "shallow"):
        allow_file(gitdir + "/" + name, optional=name not in ("config", "HEAD"))
    # Object/ref leaves get individual inode rules, never a subtree READ_FILE
    # grant. Symlinks and hardlinks cannot import an outside file into this set.
    pending = [gitdir + "/objects", gitdir + "/refs"]
    count = 0
    while pending:
        path = pending.pop()
        fd = open_path(path)
        metadata = os.fstat(fd)
        count += 1
        if count > 50000:
            raise RuntimeError("metadata_limit")
        if stat.S_ISDIR(metadata.st_mode):
            scan_fd = os.open(".", os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC, dir_fd=fd)
            try:
                with os.scandir(scan_fd) as entries:
                    for entry in entries:
                        pending.append(path + "/" + entry.name)
                        if len(pending) + count > 50000:
                            raise RuntimeError("metadata_limit")
            finally:
                os.close(scan_fd)
        elif stat.S_ISREG(metadata.st_mode) and metadata.st_nlink == 1:
            allow_fd(fd, 4)
        else:
            raise RuntimeError("metadata_type")
        retained.remove(fd)
        os.close(fd)
    for path in ("/usr/lib", "/usr/lib64", "/lib", "/lib64"):
        try:
            fd = open_path(os.path.realpath(path))
        except FileNotFoundError:
            continue
        if not stat.S_ISDIR(os.fstat(fd).st_mode):
            raise RuntimeError("runtime_directory")
        allow_fd(fd, 1 | 4 | 8)
    allow_file(argv[0], 1 | 4, trusted=True)
    allow_file("/usr/bin/python3", 1 | 4, trusted=True)
    allow_file("/etc/ld.so.cache", optional=True, trusted=True)
    allow_file("/proc/self/status", trusted=True)
    # Git opens this discard device O_RDWR even for read-only queries.
    allow_fd(open_path("/dev/null"), 2 | 4)
    if libc.prctl(38, 1, 0, 0, 0) != 0:
        raise RuntimeError("no_new_privs")
    if libc.syscall(446, rules_fd, 0) != 0:
        raise RuntimeError("restrict_self")
    for fd in retained:
        os.close(fd)
    os.close(rules_fd)
    os.execve(argv[0], argv, os.environ)

try:
    enter()
except BaseException:
    sys.stderr.write("git_read_boundary_failed\n")
    sys.exit(125)
'''


EXPECTED_DELEGATED_INSTALLER_GIT_ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/home/zoso",
    "LANG": "C",
    "LC_ALL": "C",
    "GIT_OPTIONAL_LOCKS": "0",
    "GIT_NO_REPLACE_OBJECTS": "1",
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
}

DELEGATED_GIT_CONFIG = {
    "HOME": "/nonexistent",
    "GIT_TERMINAL_PROMPT": "0",
    "GIT_ATTR_NOSYSTEM": "1",
    "GIT_CONFIG_COUNT": "2",
    "GIT_CONFIG_KEY_0": "core.fsmonitor",
    "GIT_CONFIG_VALUE_0": "false",
    "GIT_CONFIG_KEY_1": "core.hooksPath",
    "GIT_CONFIG_VALUE_1": "/dev/null",
}


class EvidenceError(RuntimeError):
    pass


def _require_isolated_python() -> None:
    if sys.flags.isolated != 1 or not getattr(sys.flags, "safe_path", False):
        raise EvidenceError("python_isolated_mode_required")
    checkout = FIXED_CHECKOUT.resolve(strict=False)
    for entry in sys.path:
        if not isinstance(entry, str) or entry == "":
            raise EvidenceError("python_path_not_isolated")
        candidate = Path(entry).resolve(strict=False)
        if candidate == checkout or checkout in candidate.parents:
            raise EvidenceError("python_path_checkout_exposure")


def _harden_installer_git_environment(installer: types.ModuleType) -> types.ModuleType:
    clean = getattr(installer, "CLEAN_GIT_ENV", None)
    if clean != EXPECTED_DELEGATED_INSTALLER_GIT_ENV:
        raise EvidenceError("delegated_installer_git_environment_invalid")
    hardened = dict(clean)
    hardened.update(DELEGATED_GIT_CONFIG)
    installer.CLEAN_GIT_ENV = hardened
    return installer


def _guard_qualifier_installer_loader(
    qualifier: types.ModuleType, expected_head: str
) -> None:
    if not callable(getattr(qualifier, "_load_installer", None)):
        raise EvidenceError("qualifier_installer_loader_missing")
    if (
        getattr(qualifier, "INSTALLER_SOURCE", None) != FIXED_CHECKOUT / INSTALLER_REL
        or getattr(qualifier, "INSTALLER_SOURCE_GIT_BLOB_SHA1", None) != INSTALLER_BLOB
    ):
        raise EvidenceError("qualifier_installer_binding_invalid")

    def guarded_load_installer():
        return _load_verified_installer(expected_head)

    qualifier._load_installer = guarded_load_installer


def _load_verified_installer(expected_head: str) -> types.ModuleType:
    raw = exact_git_object(expected_head, INSTALLER_REL, INSTALLER_BLOB)
    visible = FIXED_CHECKOUT / INSTALLER_REL
    _read_visible_source_exact(visible, raw)
    installer = types.ModuleType(
        "void_buy_void_epoch2_live_composition_native_protected_install_v5"
    )
    installer.__file__ = str(visible)
    installer.__package__ = ""
    exec(compile(raw, str(visible), "exec", dont_inherit=True), installer.__dict__)
    if (
        getattr(installer, "MARKER", None) != EXPECTED_INSTALLER_MARKER
        or getattr(installer, "ROOT", None) != FIXED_CHECKOUT
        or getattr(installer, "FIXED_CHECKOUT", None) != FIXED_CHECKOUT
        or getattr(installer, "LOCK_REL", None) != LOCK_REL
        or getattr(installer, "LOCK_PATH", None) != FIXED_CHECKOUT / LOCK_REL
        or getattr(installer, "LOCK_GIT_BLOB_SHA1", None) != LOCK_BLOB
        or not callable(getattr(installer, "_direct_repo_bytes", None))
        or not callable(getattr(installer, "_run_git", None))
    ):
        raise EvidenceError("installer_source_contract_invalid")

    def guarded_repository_bytes(path: Path) -> bytes:
        # The reviewed qualification calls this boundary only for accepted_lock().
        if path != FIXED_CHECKOUT / LOCK_REL:
            raise EvidenceError("installer_repository_path_not_allowed")
        lock = exact_git_object(expected_head, LOCK_REL, LOCK_BLOB)
        return _read_visible_source_exact(path, lock)

    installer._direct_repo_bytes = guarded_repository_bytes
    _guard_installer_git_queries(installer, expected_head)
    return _harden_installer_git_environment(installer)


def _guard_installer_git_queries(installer: types.ModuleType, expected_head: str) -> None:
    allowed = {
        ("rev-parse", "--verify", "HEAD"),
        ("branch", "--show-current"),
    }
    for name in ("LOCK_REL", "NATIVE_SOURCE_REL", "RUNNER_SOURCE_REL", "SEALED_V2_REL", "QUALIFIER_REL"):
        relative = getattr(installer, name, None)
        if not isinstance(relative, str) or not relative or relative.startswith("/") or ".." in relative.split("/"):
            raise EvidenceError("installer_git_query_contract_invalid")
        allowed.add(("rev-parse", "HEAD:" + relative))

    def guarded_run_git(args: list[str]) -> str:
        query = tuple(args)
        if query == STATUS_QUERY:
            _verify_checkout_bytes(expected_head)
            return ""
        if query not in allowed:
            raise EvidenceError("delegated_git_query_not_allowed")
        if query == ("branch", "--show-current"):
            args = ["symbolic-ref", "--short", "-q", "HEAD"]
        return _git(args).decode("utf-8", "strict")

    installer._run_git = guarded_run_git


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def _git(args: list[str]) -> bytes:
    # No content conversion, diff, status, checkout, or user-selected command.
    if not args or args[0] not in ("rev-parse", "symbolic-ref", "show", "ls-tree", "ls-files"):
        raise EvidenceError("git_query_not_allowed")
    if os.geteuid() == 0:
        prefix = [
            str(FIXED_SETPRIV),
            "--no-new-privs",
            "--reuid=" + str(RUNTIME_UID),
            "--regid=" + str(RUNTIME_GID),
            "--clear-groups",
            "--inh-caps=-all",
            "--ambient-caps=-all",
            "--bounding-set=-all",
        ]
    elif os.geteuid() == RUNTIME_UID:
        prefix = []
    else:
        raise EvidenceError("checkout_query_uid_invalid")
    git_argv = [
                str(FIXED_GIT),
                "--no-replace-objects",
                "-C",
                str(FIXED_CHECKOUT),
                "--git-dir=" + str(FIXED_CHECKOUT / ".git"),
                "--work-tree=" + str(FIXED_CHECKOUT),
                "-c",
                "safe.directory=" + str(FIXED_CHECKOUT),
                "-c",
                "core.fsmonitor=false",
                "-c",
                "core.hooksPath=/dev/null",
                "-c",
                "core.untrackedCache=false",
                "-c",
                "core.excludesFile=/dev/null",
                "-c",
                "protocol.allow=never",
                *args,
    ]
    return _run_git_bounded(
        [*prefix, str(FIXED_PYTHON), "-I", "-B", "-c", GIT_READ_SANDBOX,
         json.dumps({"argv": git_argv, "checkout": str(FIXED_CHECKOUT)})]
    )


def _run_git_bounded(command: list[str]) -> bytes:
    process = None
    selector = None
    buffers = {"stdout": bytearray(), "stderr": bytearray()}
    try:
        selector = selectors.DefaultSelector()
        process = subprocess.Popen(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=GIT_ENV,
            cwd="/",
            close_fds=True,
            start_new_session=True,
        )
        deadline = time.monotonic() + GIT_TIMEOUT_SECONDS
        for name, limit in (("stdout", MAX_GIT_OUTPUT_BYTES), ("stderr", MAX_GIT_STDERR_BYTES)):
            stream = getattr(process, name)
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, selectors.EVENT_READ, (name, limit))
        while selector.get_map():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise subprocess.TimeoutExpired(command, GIT_TIMEOUT_SECONDS)
            ready = selector.select(remaining)
            if not ready:
                raise subprocess.TimeoutExpired(command, GIT_TIMEOUT_SECONDS)
            for key, _events in ready:
                name, limit = key.data
                buffer = buffers[name]
                chunk = os.read(key.fd, min(65536, limit - len(buffer) + 1))
                if not chunk:
                    selector.unregister(key.fileobj)
                elif len(buffer) + len(chunk) > limit:
                    raise EvidenceError("git_" + name + "_limit")
                else:
                    buffer.extend(chunk)
        process.wait(timeout=max(0.0, deadline - time.monotonic()))
        if process.returncode != 0:
            # Git diagnostics contain checkout-controlled bytes, never receipt data.
            raise EvidenceError("git_command_failed:" + str(process.returncode))
        if buffers["stderr"]:
            raise EvidenceError("git_stderr")
        return bytes(buffers["stdout"])
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise EvidenceError(
            "git_execution_failed:" + type(exc).__name__
        ) from exc
    finally:
        if selector is not None:
            selector.close()
        if process is not None:
            try:
                if process.returncode is None:
                    # Do not poll/reap the leader before killing its group: its
                    # retained PID prevents reuse while descendants hold pipes.
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    process.wait(timeout=1)
            except (OSError, subprocess.TimeoutExpired) as exc:
                raise EvidenceError("git_cleanup_failed") from exc
            finally:
                process.stdout.close()
                process.stderr.close()


def checkout_snapshot(expected_head: str) -> dict[str, Any]:
    if HEX40.fullmatch(expected_head) is None:
        raise EvidenceError("expected_head_invalid")
    head = _git(["rev-parse", "--verify", "HEAD^{commit}"]).decode().strip()
    tree = _git(["rev-parse", "--verify", "HEAD^{tree}"]).decode().strip()
    branch = _git(["symbolic-ref", "--short", "-q", "HEAD"]).decode().strip()
    if head != expected_head:
        raise EvidenceError("checkout_head_mismatch")
    if branch != "main":
        raise EvidenceError("checkout_branch_not_main")
    if HEX40.fullmatch(tree) is None:
        raise EvidenceError("checkout_tree_invalid")
    _verify_checkout_bytes(expected_head)
    return {"head": head, "tree": tree, "branch": branch, "clean": True}


def _checkout_records(raw: bytes) -> list[bytes]:
    if len(raw) > MAX_CHECKOUT_LIST_BYTES or (raw and not raw.endswith(b"\0")):
        raise EvidenceError("checkout_listing_invalid")
    records = raw[:-1].split(b"\0") if raw else []
    if len(records) > MAX_CHECKOUT_FILES:
        raise EvidenceError("checkout_listing_limit")
    return records


def _checkout_path(raw: bytes) -> str:
    try:
        relative = raw.decode("utf-8", "strict")
    except UnicodeError as exc:
        raise EvidenceError("checkout_path_invalid") from exc
    if not relative or any(part in ("", ".", "..", ".git") for part in relative.split("/")):
        raise EvidenceError("checkout_path_invalid")
    return relative


def _verify_checkout_bytes(expected_head: str) -> None:
    """Compare raw tree/index/worktree bytes without invoking content filters."""
    if HEX40.fullmatch(expected_head) is None:
        raise EvidenceError("expected_head_invalid")
    tree_query = ["ls-tree", "-r", "-l", "-z", "--full-tree", expected_head]
    index_query = ["ls-files", "--stage", "--full-name", "-z"]
    # Do not open .git/info/exclude, per-directory .gitignore files, or any
    # configured excludes source. Ignored files are untracked evidence too.
    others_query = ["ls-files", "--others", "--full-name", "-z"]
    raw_tree = _git(tree_query)
    raw_index = _git(index_query)
    entries: dict[str, tuple[str, str, int]] = {}
    total = 0
    try:
        for record in _checkout_records(raw_tree):
            header, name = record.split(b"\t", 1)
            mode, kind, blob, size_raw = header.decode("ascii").split()
            relative = _checkout_path(name)
            if mode not in ("100644", "100755") or kind != "blob":
                raise EvidenceError("checkout_entry_type_unsupported")
            if HEX40.fullmatch(blob) is None or not size_raw.isdecimal():
                raise EvidenceError("checkout_tree_record_invalid")
            size = int(size_raw)
            total += size
            if size > MAX_CHECKOUT_FILE_BYTES or total > MAX_CHECKOUT_TOTAL_BYTES:
                raise EvidenceError("checkout_content_limit")
            if relative in entries:
                raise EvidenceError("checkout_duplicate_path")
            entries[relative] = (mode, blob, size)
        index: dict[str, tuple[str, str]] = {}
        for record in _checkout_records(raw_index):
            header, name = record.split(b"\t", 1)
            mode, blob, stage = header.decode("ascii").split()
            relative = _checkout_path(name)
            if stage != "0" or relative in index:
                raise EvidenceError("checkout_index_unmerged_or_duplicate")
            index[relative] = (mode, blob)
    except (ValueError, UnicodeError) as exc:
        raise EvidenceError("checkout_listing_invalid") from exc
    if not entries or index != {path: (entry[0], entry[1]) for path, entry in entries.items()}:
        raise EvidenceError("checkout_index_differs_from_head")
    if _git(others_query):
        raise EvidenceError("checkout_untracked_files")
    for relative, (mode, blob, size) in entries.items():
        raw = _read_visible_file(FIXED_CHECKOUT / relative, size, MAX_CHECKOUT_FILE_BYTES, mode)
        if git_blob(raw) != blob:
            raise EvidenceError("checkout_worktree_bytes_mismatch")
    # Reobserve the same head, index, and untracked-file boundary after reads.
    if (
        _git(["rev-parse", "--verify", "HEAD^{commit}"]).decode().strip() != expected_head
        or _git(["symbolic-ref", "--short", "-q", "HEAD"]).decode().strip() != "main"
        or _git(index_query) != raw_index
        or _git(others_query)
    ):
        raise EvidenceError("checkout_generation_changed")


def exact_git_object(expected_head: str, relative: str, blob: str) -> bytes:
    tree_blob = _git(["rev-parse", expected_head + ":" + relative]).decode().strip()
    if tree_blob != blob:
        raise EvidenceError("git_tree_blob_mismatch:" + relative)
    raw = _git(["show", expected_head + ":" + relative])
    if git_blob(raw) != blob:
        raise EvidenceError("git_object_blob_mismatch:" + relative)
    return raw


def _open_source_parent(path: Path) -> int:
    if not path.is_absolute() or ".." in path.parts or not path.name:
        raise EvidenceError("reviewed_source_path_invalid")
    flags = os.O_PATH | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
    fd = os.open("/", flags)
    try:
        for part in path.parts[1:-1]:
            child = os.open(part, flags, dir_fd=fd)
            os.close(fd)
            fd = child
        return fd
    except BaseException:
        os.close(fd)
        raise


def _read_visible_source_exact(path: Path, expected: bytes) -> bytes:
    if not 0 < len(expected) <= MAX_REVIEWED_SOURCE_BYTES:
        raise EvidenceError("reviewed_source_expected_size_invalid")
    direct = _read_visible_file(path, len(expected), MAX_REVIEWED_SOURCE_BYTES)
    if direct != expected:
        raise EvidenceError("reviewed_source_bytes_mismatch")
    return direct


def _read_visible_file(
    path: Path, expected_size: int, maximum: int, expected_mode: str | None = None
) -> bytes:
    if not 0 <= expected_size <= maximum:
        raise EvidenceError("reviewed_source_expected_size_invalid")
    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
    parent_fd = fd = visible_parent_fd = -1
    try:
        parent_fd = _open_source_parent(path)
        fd = os.open(path.name, flags, dir_fd=parent_fd)
        before = os.fstat(fd)
        if (
            not stat.S_ISREG(before.st_mode)
            or before.st_nlink != 1
            or before.st_size != expected_size
        ):
            raise EvidenceError("reviewed_source_metadata_invalid")
        mode = "100755" if before.st_mode & stat.S_IXUSR else "100644"
        if expected_mode is not None and mode != expected_mode:
            raise EvidenceError("checkout_worktree_mode_mismatch")

        chunks: list[bytes] = []
        remaining = expected_size + 1
        while remaining > 0:
            chunk = os.read(fd, min(64 * 1024, remaining))
            if not chunk:
                break
            chunks.append(chunk)
            remaining -= len(chunk)
        after = os.fstat(fd)

        direct = b"".join(chunks)
        if len(direct) != expected_size:
            raise EvidenceError("reviewed_source_size_changed")
        for field in (
            "st_dev",
            "st_ino",
            "st_uid",
            "st_gid",
            "st_mode",
            "st_nlink",
            "st_size",
            "st_mtime_ns",
            "st_ctime_ns",
        ):
            if getattr(before, field) != getattr(after, field):
                raise EvidenceError("reviewed_source_generation_unstable:" + field)

        # Rewalk without following any symlink, including checkout ancestors.
        visible_parent_fd = _open_source_parent(path)
        parent = os.fstat(parent_fd)
        visible_parent = os.fstat(visible_parent_fd)
        if (parent.st_dev, parent.st_ino) != (visible_parent.st_dev, visible_parent.st_ino):
            raise EvidenceError("reviewed_source_parent_changed")
        visible = os.stat(path.name, dir_fd=visible_parent_fd, follow_symlinks=False)
        if (
            not stat.S_ISREG(visible.st_mode)
            or stat.S_ISLNK(visible.st_mode)
            or visible.st_nlink != 1
            or visible.st_dev != after.st_dev
            or visible.st_ino != after.st_ino
            or visible.st_uid != after.st_uid
            or visible.st_gid != after.st_gid
            or visible.st_mode != after.st_mode
            or visible.st_size != after.st_size
            or visible.st_mtime_ns != after.st_mtime_ns
            or visible.st_ctime_ns != after.st_ctime_ns
        ):
            raise EvidenceError("reviewed_source_visible_generation_changed")
        return direct
    except OSError as exc:
        raise EvidenceError("reviewed_source_unavailable") from exc
    finally:
        close_error = None
        for retained in (visible_parent_fd, fd, parent_fd):
            if retained >= 0:
                try:
                    os.close(retained)
                except OSError as exc:
                    close_error = exc
        if close_error is not None:
            raise EvidenceError("reviewed_source_close_failed") from close_error


def load_qualifier(expected_head: str) -> types.ModuleType:
    raw = exact_git_object(expected_head, QUALIFIER_REL, QUALIFIER_BLOB)
    exact_git_object(expected_head, QUALIFIER_PROOF_REL, QUALIFIER_PROOF_BLOB)

    visible = FIXED_CHECKOUT / QUALIFIER_REL
    _read_visible_source_exact(visible, raw)

    module = types.ModuleType("void_presale_verified_epoch2_installed_qualifier_v5")
    module.__file__ = str(visible)
    module.__package__ = ""
    exec(
        compile(raw.decode("utf-8", "strict"), str(visible), "exec", dont_inherit=True),
        module.__dict__,
    )
    if getattr(module, "MARKER", None) != EXPECTED_QUALIFIER_MARKER:
        raise EvidenceError("qualifier_marker_mismatch")
    if not callable(getattr(module, "collect", None)):
        raise EvidenceError("qualifier_collect_missing")
    _guard_qualifier_installer_loader(module, expected_head)
    return module


def validate_result(result: object, expected_head: str) -> dict[str, Any]:
    if not isinstance(result, dict):
        raise EvidenceError("qualifier_result_not_object")
    required_true = (
        "read_only",
        "root_execution_required",
        "protected_upgrade_verified",
        "installed_generation_stable",
        "predecessor_generation_retained",
        "predecessor_generation_stable",
        "node_generation_bound",
        "checkout_generation_bound",
        "git_generation_bound",
        "setpriv_generation_bound",
        "native_self_test_execution",
        "native_self_test_descriptor_bound",
        "native_self_test_stable",
    )
    for key in required_true:
        if result.get(key) is not True:
            raise EvidenceError("qualifier_true_field_missing:" + key)

    required_false = (
        "runner_execution",
        "live_composition_execution",
        "credential_access",
        "private_key_access",
        "signing",
        "transaction",
        "payment_acceptance",
        "public_presale_activation",
        "wc_void_market_activation",
        "treasury_liquidity_action",
        "funds_movement",
        "production_host_evidence_authority",
    )
    for key in required_false:
        if result.get(key) is not False:
            raise EvidenceError("qualifier_false_field_overclaim:" + key)

    if result.get("marker") != EXPECTED_QUALIFIER_MARKER:
        raise EvidenceError("qualifier_result_marker_mismatch")
    if result.get("version") != 5:
        raise EvidenceError("qualifier_result_version_mismatch")
    if result.get("expected_head") != expected_head:
        raise EvidenceError("qualifier_result_head_mismatch")
    for key in (
        "accepted_lock_id",
        "candidate_id",
        "native_self_test_sha256",
        "native_sha256",
        "runner_sha256",
        "policy_sha256",
        "predecessor_native_sha256",
        "predecessor_runner_sha256",
        "predecessor_policy_sha256",
        "node_sha256",
    ):
        value = result.get(key)
        if not isinstance(value, str) or not value:
            raise EvidenceError("qualifier_identity_missing:" + key)
    return result


def collect(expected_head: str) -> dict[str, Any]:
    _require_isolated_python()
    if os.geteuid() != 0:
        raise EvidenceError("root_required_for_epoch2_host_evidence")
    checkout = checkout_snapshot(expected_head)
    qualifier = load_qualifier(expected_head)
    try:
        qualified = qualifier.collect(expected_head)
    except Exception as exc:
        raise EvidenceError("epoch2_installed_qualification_failed") from exc
    result = validate_result(qualified, expected_head)

    return {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": 1,
        "parent_host_evidence_plan_id": PARENT_PLAN_ID,
        "status":
            "EPOCH2_INSTALLED_GENERATION_EVIDENCE_GREEN_PRODUCTION_AUTHORITY_STILL_HOLD",
        "expected_head": expected_head,
        "checkout_tree": checkout["tree"],
        "accepted_lock_id": result["accepted_lock_id"],
        "candidate_id": result["candidate_id"],
        "epoch2_installed_generation_qualified": True,
        "protected_upgrade_verified": True,
        "installed_generation_stable": True,
        "retained_predecessor_verified": True,
        "node_generation_bound": True,
        "checkout_generation_bound": True,
        "git_generation_bound": True,
        "setpriv_generation_bound": True,
        "native_self_test_execution_performed": True,
        "native_self_test_descriptor_bound": True,
        "native_self_test_stable": True,
        "native_self_test_sha256": result["native_self_test_sha256"],
        "native_sha256": result["native_sha256"],
        "native_bytes": result["native_bytes"],
        "runner_sha256": result["runner_sha256"],
        "runner_bytes": result["runner_bytes"],
        "policy_sha256": result["policy_sha256"],
        "predecessor_native_sha256": result["predecessor_native_sha256"],
        "predecessor_runner_sha256": result["predecessor_runner_sha256"],
        "predecessor_policy_sha256": result["predecessor_policy_sha256"],
        "node_sha256": result["node_sha256"],
        "node_bytes": result["node_bytes"],
        "filesystem_read_performed": True,
        "filesystem_write_performed": False,
        "process_execution_performed": True,
        "runner_execution": False,
        "live_composition_execution": False,
        "service_mutation": False,
        "network_contact": False,
        "credential_access": False,
        "private_key_access": False,
        "wallet_or_signer_access": False,
        "signing": False,
        "transaction_submission": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_or_liquidity_action": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
    }


def self_test() -> None:
    assert len(PARENT_PLAN_ID) == len("voidbuyhostevplan1_") + 64
    assert len(QUALIFIER_BLOB) == 40
    assert len(QUALIFIER_PROOF_BLOB) == 40
    assert len(INSTALLER_BLOB) == 40
    assert len(LOCK_BLOB) == 40
    assert HEX40.fullmatch("a" * 40)
    assert HEX40.fullmatch("A" * 40) is None
    print(MARKER + "_SELF_TEST_GREEN")
    print("parent_host_evidence_plan_bound=true")
    print("exact_qualifier_source_and_proof_bound=true")
    print("checkout_observation_avoids_content_filters=true")
    print("delegated_original_status_bypassed=true")
    print("raw_tree_index_worktree_equality_required=true")
    print("git_metadata_queries_drop_root_privileges=true")
    print("qualifier_source_descriptor_bound=true")
    print("qualifier_source_nofollow_bounded_read=true")
    print("delegated_installer_source_descriptor_bound=true")
    print("delegated_installer_original_loader_bypassed=true")
    print("delegated_accepted_lock_descriptor_bound=true")
    print("reviewed_source_ancestor_symlinks_rejected=true")
    print("root_required_for_future_run=true")
    print("python_isolated_mode_required_for_future_run=true")
    print("preimport_python_isolation_enforced=true")
    print("unisolated_shadow_module_blocked=true")
    print("unisolated_future_module_blocked=true")
    print("delegated_installer_git_fsmonitor_disabled=true")
    print("delegated_installer_git_hooks_disabled=true")
    print("installed_generation_before_middle_after_stability_required=true")
    print("double_descriptor_bound_native_self_test_required=true")
    print("native_self_test_execution_performed_by_future_host_run=true")
    print("runner_execution=false")
    print("live_composition_execution=false")
    print("filesystem_write_performed=false")
    print("service_mutation=false")
    print("network_contact=false")
    print("credential_access=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--run", action="store_true")
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if not args.expected_head:
        raise EvidenceError("expected_head_required")
    result = collect(args.expected_head)
    print(json.dumps(result, sort_keys=True, separators=(",", ":"), ensure_ascii=True))
    return 0


def _emit_hold(exc: EvidenceError) -> None:
    reason = re.sub(r"[^A-Za-z0-9_:./-]", "_", str(exc)[:1000])
    print(MARKER)
    print("status=HOLD")
    print("reason=" + (reason or "unspecified_evidence_failure"))
    for field in _BOOTSTRAP_NEGATIVE_AUTHORITY_FIELDS:
        print(field + "=false")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except EvidenceError as exc:
        _emit_hold(exc)
        raise SystemExit(2)
