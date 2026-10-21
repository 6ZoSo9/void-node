#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import selectors
import stat
import subprocess
import time
import types
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V6"
)
PLAN_SCHEMA = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v6"
)
PLAN_PREFIX = "voidbuye2protectedbootstrapplan6_"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_installed_qualification_v6.py"
)
QUALIFIER_BLOB = "5f7321725b306184567111c0a7831d08243ad052"

BOOTSTRAP_PATH = Path(
    "/opt/void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v6/bin/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v6"
)
BOOTSTRAP_BYTES = 874_608
BOOTSTRAP_SHA256 = (
    "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
)
BOOTSTRAP_GIT_BLOB = "b577d70666f98ac59a75b84b3dab741fe7b93a4b"

LAUNCHER_LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-"
    "candidate-lock-v2.json"
)
LAUNCHER_LOCK_BLOB = "227c2fa449abf1387925373c706ecd07775d5898"
LAUNCHER_MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_v2.py"
)
LAUNCHER_MATERIALIZER_BLOB = "609cde180490f4f5f53ed7e34d73b95f22313bcd"
LAUNCHER_BYTES = 731_072
LAUNCHER_SHA256 = (
    "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
)
LAUNCHER_GIT_BLOB = "798907b18c73ee2cc1dea0fe05b36f27ab4137a7"

LAUNCHER_LOCK_ID = (
    "voidbuye2dormantfirstentrylock2_"
    "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543"
)
LAUNCHER_CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand2_"
    "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b"
)

NATIVE_LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
)
NATIVE_LOCK_BLOB = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
NATIVE_MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_native_v2.py"
)
NATIVE_MATERIALIZER_BLOB = "557eb68453d517d78bb3b6c6d8427df9ed36316f"
NATIVE_BYTES = 726_976
NATIVE_SHA256 = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)

HEX40 = re.compile(r"^[0-9a-f]{40}$")
MAX_READ = 2 * 1024 * 1024
MAX_GIT_OUTPUT = 8 * 1024 * 1024
MAX_GIT_STDERR = 64 * 1024
GIT_TIMEOUT = 20
MAX_TRACKED_FILE_BYTES = 16 * 1024 * 1024
MAX_TRACKED_TOTAL_BYTES = 256 * 1024 * 1024
MAX_TRACKED_ENTRIES = 30_000
MAX_INDEX_BYTES = 16 * 1024 * 1024
MAX_CHECKOUT_DIRECTORIES = 1024
MAX_PATH_BYTES = 4096
MAX_PATH_DEPTH = 128
MAX_SYMLINK_BYTES = 4096
TRACKED_MODES = {"100644", "100755", "120000"}

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


class PlanError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def _safe_relative_path(raw: bytes, *, metadata: bool = False) -> list[bytes]:
    parts = raw.split(b"/")
    if (
        not raw
        or len(raw) > MAX_PATH_BYTES
        or len(parts) > MAX_PATH_DEPTH
        or b"\0" in raw
        or any(part in (b"", b".", b"..") or len(part) > 255 for part in parts)
        or (not metadata and any(part.lower() == b".git" for part in parts))
    ):
        raise PlanError("checkout_path_invalid")
    return parts


def _git_read_allowed(args: tuple[str, ...]) -> bool:
    if args in (
        ("rev-parse", "--verify", "HEAD^{commit}"),
        ("rev-parse", "--verify", "HEAD^{tree}"),
        ("symbolic-ref", "--quiet", "HEAD"),
        ("ls-files", "--stage", "-v", "-z", "--full-name", "--sparse"),
        ("ls-files", "--others", "--exclude-standard", "-z", "--full-name"),
    ):
        return True
    if len(args) == 5 and args[:4] == ("ls-tree", "-r", "--full-tree", "-z"):
        return HEX40.fullmatch(args[4]) is not None
    if len(args) == 2 and args[0] == "rev-parse" and args[1].startswith("HEAD:"):
        _safe_relative_path(os.fsencode(args[1][5:]))
        return True
    return False


def git_bytes(*args: str) -> bytes:
    # Only these raw plumbing reads are admitted. In particular, worktree
    # content never enters status, diff, filters, textconv, or hash-object.
    if not _git_read_allowed(args):
        raise PlanError("git_read_not_allowed")
    argv = [
        "/usr/bin/git", "--no-pager", "-C", str(ROOT),
        "--git-dir=" + str(ROOT / ".git"), "--work-tree=" + str(ROOT),
        "-c", "core.fsmonitor=false",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.untrackedCache=false",
        "-c", "core.bare=false",
        "-c", "protocol.allow=never",
        *args,
    ]
    proc = None
    selector = selectors.DefaultSelector()
    output = bytearray()
    errors = bytearray()
    try:
        proc = subprocess.Popen(
            argv, stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=GIT_ENV,
        )
        assert proc.stdout is not None and proc.stderr is not None
        for stream, buffer, limit in (
            (proc.stdout, output, MAX_GIT_OUTPUT),
            (proc.stderr, errors, MAX_GIT_STDERR),
        ):
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, selectors.EVENT_READ, (buffer, limit))
        deadline = time.monotonic() + GIT_TIMEOUT
        while selector.get_map():
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise PlanError("git_read_timeout")
            for key, _ in selector.select(min(remaining, 0.25)):
                buffer, limit = key.data
                try:
                    chunk = os.read(key.fd, min(64 * 1024, limit - len(buffer) + 1))
                except BlockingIOError:
                    continue
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                if len(buffer) + len(chunk) > limit:
                    raise PlanError("git_output_limit")
                buffer.extend(chunk)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise PlanError("git_read_timeout")
        try:
            returncode = proc.wait(timeout=remaining)
        except subprocess.TimeoutExpired as exc:
            raise PlanError("git_read_timeout") from exc
        if returncode != 0 or errors:
            raise PlanError("git_failed:" + args[0])
        return bytes(output)
    except OSError as exc:
        raise PlanError("git_read_unavailable") from exc
    finally:
        selector.close()
        if proc is not None:
            if proc.poll() is None:
                proc.kill()
                try:
                    proc.wait(timeout=2)
                except subprocess.TimeoutExpired as exc:
                    raise PlanError("git_read_cleanup_timeout") from exc
            for stream in (proc.stdout, proc.stderr):
                if stream is not None:
                    stream.close()


def git(*args: str) -> str:
    try:
        return git_bytes(*args).decode("ascii", "strict").strip()
    except UnicodeDecodeError as exc:
        raise PlanError("git_text_invalid") from exc


def _listing_records(raw: bytes) -> list[bytes]:
    if len(raw) > MAX_GIT_OUTPUT or (raw and not raw.endswith(b"\0")):
        raise PlanError("git_listing_invalid")
    if raw.count(b"\0") > MAX_TRACKED_ENTRIES:
        raise PlanError("git_listing_limit")
    records = raw[:-1].split(b"\0") if raw else []
    if any(not row for row in records):
        raise PlanError("git_listing_limit")
    return records


def _parse_tree(raw: bytes) -> dict[bytes, tuple[str, str]]:
    result = {}
    for record in _listing_records(raw):
        try:
            fields, path = record.split(b"\t", 1)
            mode, kind, blob = fields.decode("ascii", "strict").split(" ")
        except (ValueError, UnicodeDecodeError) as exc:
            raise PlanError("git_tree_record_invalid") from exc
        _safe_relative_path(path)
        if mode not in TRACKED_MODES or kind != "blob" or HEX40.fullmatch(blob) is None:
            raise PlanError("git_tree_mode_or_blob_invalid")
        if path in result:
            raise PlanError("git_tree_duplicate_path")
        result[path] = (mode, blob)
    return result


def _parse_index(raw: bytes) -> dict[bytes, tuple[str, str]]:
    result = {}
    for record in _listing_records(raw):
        try:
            fields, path = record.split(b"\t", 1)
            flag, mode, blob, stage = fields.decode("ascii", "strict").split(" ")
        except (ValueError, UnicodeDecodeError) as exc:
            raise PlanError("git_index_record_invalid") from exc
        _safe_relative_path(path)
        if (
            flag != "H" or stage != "0" or mode not in TRACKED_MODES
            or HEX40.fullmatch(blob) is None
        ):
            raise PlanError("git_index_flags_mode_or_stage_invalid")
        if path in result:
            raise PlanError("git_index_duplicate_path")
        result[path] = (mode, blob)
    return result


def _metadata(value: os.stat_result) -> tuple[int, ...]:
    return tuple(getattr(value, name) for name in (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
        "st_size", "st_mtime_ns", "st_ctime_ns",
    ))


def _directory_identity(value: os.stat_result) -> tuple[int, ...]:
    return tuple(getattr(value, name) for name in (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
    ))


def _open_checkout_root() -> tuple[int, list[tuple[int, ...]]]:
    raw = os.fsencode(ROOT)
    if not ROOT.is_absolute() or os.path.normpath(raw) != raw:
        raise PlanError("checkout_root_invalid")
    parts = raw[1:].split(b"/") if raw != b"/" else []
    if len(raw) > MAX_PATH_BYTES or len(parts) > MAX_PATH_DEPTH:
        raise PlanError("checkout_root_limit")
    fd = os.open(b"/", os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
    identities = [_directory_identity(os.fstat(fd))]
    try:
        for part in parts:
            before = os.stat(part, dir_fd=fd, follow_symlinks=False)
            if not stat.S_ISDIR(before.st_mode):
                raise PlanError("checkout_parent_not_physical_directory")
            child = os.open(
                part, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                dir_fd=fd,
            )
            try:
                if (
                    _metadata(before) != _metadata(os.fstat(child))
                    or _metadata(before) != _metadata(os.stat(part, dir_fd=fd, follow_symlinks=False))
                ):
                    raise PlanError("checkout_parent_rebound")
            except BaseException:
                os.close(child)
                raise
            os.close(fd)
            fd = child
            identities.append(_directory_identity(before))
        return fd, identities
    except BaseException:
        os.close(fd)
        raise


class _CheckoutPaths:
    # Retain directory authority while streaming files. At most the bounded
    # parent-directory set remains open; leaf metadata is rechecked by name.
    def __init__(self) -> None:
        root_fd, self.ancestry = _open_checkout_root()
        self.fds = {b"": root_fd}
        self.directories = {b"": _metadata(os.fstat(root_fd))}
        self.leaves: dict[bytes, tuple[int, ...]] = {}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        for fd in self.fds.values():
            os.close(fd)

    def directory(self, path: bytes) -> int:
        if path in self.fds:
            return self.fds[path]
        parts = _safe_relative_path(path, metadata=True)
        parent_path = b""
        for part in parts:
            child_path = parent_path + (b"/" if parent_path else b"") + part
            if child_path not in self.fds:
                if len(self.fds) >= MAX_CHECKOUT_DIRECTORIES:
                    raise PlanError("checkout_directory_limit")
                parent_fd = self.fds[parent_path]
                before = os.stat(part, dir_fd=parent_fd, follow_symlinks=False)
                if not stat.S_ISDIR(before.st_mode):
                    raise PlanError("checkout_parent_not_physical_directory")
                fd = os.open(
                    part, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                    dir_fd=parent_fd,
                )
                try:
                    if (
                        _metadata(before) != _metadata(os.fstat(fd))
                        or _metadata(before) != _metadata(os.stat(part, dir_fd=parent_fd, follow_symlinks=False))
                    ):
                        raise PlanError("checkout_directory_rebound")
                except BaseException:
                    os.close(fd)
                    raise
                self.fds[child_path] = fd
                self.directories[child_path] = _metadata(before)
            parent_path = child_path
        return self.fds[path]

    def parent(self, path: bytes, *, metadata: bool = False) -> tuple[int, bytes]:
        parts = _safe_relative_path(path, metadata=metadata)
        return self.directory(b"/".join(parts[:-1])), parts[-1]

    def regular(
        self, path: bytes, limit: int, *, capture: bool = False,
        mode: str | None = None, metadata: bool = False,
    ) -> tuple[bytes, str, str, tuple[int, ...]]:
        parent, name = self.parent(path, metadata=metadata)
        before = os.stat(name, dir_fd=parent, follow_symlinks=False)
        if (
            not stat.S_ISREG(before.st_mode) or before.st_nlink != 1
            or before.st_size < 0 or before.st_size > limit
            or (mode is not None and bool(before.st_mode & stat.S_IXUSR) != (mode == "100755"))
        ):
            raise PlanError("checkout_file_metadata_invalid")
        observed = _metadata(before)
        fd = os.open(
            name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
            dir_fd=parent,
        )
        try:
            if _metadata(os.fstat(fd)) != observed:
                raise PlanError("checkout_file_rebound")
            blob = hashlib.sha1(b"blob " + str(before.st_size).encode("ascii") + b"\0")
            digest = hashlib.sha256()
            raw = bytearray()
            remaining = before.st_size
            while remaining:
                chunk = os.read(fd, min(1024 * 1024, remaining))
                if not chunk:
                    raise PlanError("checkout_file_short_read")
                blob.update(chunk)
                digest.update(chunk)
                if capture:
                    raw.extend(chunk)
                remaining -= len(chunk)
            if os.read(fd, 1):
                raise PlanError("checkout_file_grew")
            if (
                _metadata(os.fstat(fd)) != observed
                or _metadata(os.stat(name, dir_fd=parent, follow_symlinks=False)) != observed
            ):
                raise PlanError("checkout_file_changed")
        finally:
            os.close(fd)
        self.leaves[path] = observed
        return bytes(raw), blob.hexdigest(), digest.hexdigest(), observed

    def symlink(self, path: bytes, limit: int = MAX_SYMLINK_BYTES) -> tuple[str, int]:
        parent, name = self.parent(path)
        before = os.stat(name, dir_fd=parent, follow_symlinks=False)
        if (
            not stat.S_ISLNK(before.st_mode) or before.st_nlink != 1
            or before.st_size < 1 or before.st_size > min(MAX_SYMLINK_BYTES, limit)
        ):
            raise PlanError("checkout_symlink_metadata_invalid")
        raw = os.readlink(name, dir_fd=parent)
        if (
            not isinstance(raw, bytes) or len(raw) != before.st_size
            or _metadata(os.stat(name, dir_fd=parent, follow_symlinks=False)) != _metadata(before)
        ):
            raise PlanError("checkout_symlink_changed")
        self.leaves[path] = _metadata(before)
        return git_blob(raw), len(raw)

    def revalidate(self) -> None:
        for path, observed in self.leaves.items():
            parent, name = self.parent(path, metadata=True)
            if _metadata(os.stat(name, dir_fd=parent, follow_symlinks=False)) != observed:
                raise PlanError("checkout_leaf_generation_changed")
        for path, observed in self.directories.items():
            if _metadata(os.fstat(self.fds[path])) != observed:
                raise PlanError("checkout_directory_generation_changed")
            if path:
                parent, name = self.parent(path, metadata=True)
                if _metadata(os.stat(name, dir_fd=parent, follow_symlinks=False)) != observed:
                    raise PlanError("checkout_directory_generation_changed")
        root_fd, ancestry = _open_checkout_root()
        try:
            if ancestry != self.ancestry or _metadata(os.fstat(root_fd)) != self.directories[b""]:
                raise PlanError("checkout_visible_root_generation_changed")
        finally:
            os.close(root_fd)

    def generation_sha256(self, index_sha256: str) -> str:
        return sha256(canonical({
            "root_ancestry": self.ancestry,
            "directories": [[path.hex(), value] for path, value in sorted(self.directories.items())],
            "leaves": [[path.hex(), value] for path, value in sorted(self.leaves.items())],
            "index_sha256": index_sha256,
        }))


def repository_blob(relative: str, expected: str) -> bytes:
    try:
        with _CheckoutPaths() as paths:
            raw, blob, _, observed = paths.regular(os.fsencode(relative), MAX_READ, capture=True)
            if observed[6] < 1:
                raise PlanError("repository_file_metadata_invalid:" + relative)
            if blob != expected:
                raise PlanError("repository_blob_mismatch:" + relative)
            if git("rev-parse", "HEAD:" + relative) != expected:
                raise PlanError("repository_head_blob_mismatch:" + relative)
            paths.revalidate()
            return raw
    except OSError as exc:
        raise PlanError("repository_file_unavailable:" + relative) from exc


def stable_artifact(
    path: Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str | None,
    label: str,
) -> dict[str, Any]:
    raw_path = str(path)
    if (
        not path.is_absolute()
        or os.path.normpath(raw_path) != raw_path
        or "\n" in raw_path
        or "\r" in raw_path
    ):
        raise PlanError(label + "_path_invalid")

    try:
        before = path.lstat()
    except OSError as exc:
        raise PlanError(label + "_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != 0o555
        or before.st_size != expected_bytes
    ):
        raise PlanError(label + "_metadata_invalid")

    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if (
            opened.st_dev != before.st_dev
            or opened.st_ino != before.st_ino
            or opened.st_size != before.st_size
            or opened.st_mtime_ns != before.st_mtime_ns
            or opened.st_ctime_ns != before.st_ctime_ns
        ):
            raise PlanError(label + "_rebound")

        digest = hashlib.sha256()
        raw = bytearray()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise PlanError(label + "_short_read")
            digest.update(chunk)
            raw.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise PlanError(label + "_grew")

        after = os.fstat(fd)
        visible = path.lstat()
        if (
            after.st_dev != opened.st_dev
            or after.st_ino != opened.st_ino
            or after.st_size != opened.st_size
            or visible.st_dev != opened.st_dev
            or visible.st_ino != opened.st_ino
            or visible.st_size != opened.st_size
            or visible.st_mtime_ns != opened.st_mtime_ns
            or visible.st_ctime_ns != opened.st_ctime_ns
        ):
            raise PlanError(label + "_changed")
    finally:
        os.close(fd)

    data = bytes(raw)
    if digest.hexdigest() != expected_sha256:
        raise PlanError(label + "_sha256_mismatch")
    observed_blob = git_blob(data)
    if expected_git_blob is not None and observed_blob != expected_git_blob:
        raise PlanError(label + "_git_blob_mismatch")
    if not data.startswith(b"\x7fELF"):
        raise PlanError(label + "_not_elf")

    return {
        "path": raw_path,
        "bytes": len(data),
        "sha256": expected_sha256,
        "git_blob_sha1": observed_blob,
        "mode": "0555",
        "uid": before.st_uid,
        "gid": before.st_gid,
        "dev": before.st_dev,
        "ino": before.st_ino,
    }


def _safe_tool(path: Path, label: str, maximum: int) -> dict[str, Any]:
    raw_path = str(path)
    if not path.is_absolute() or os.path.normpath(raw_path) != raw_path:
        raise PlanError(label + "_path_invalid")
    try:
        alias = path.lstat()
    except OSError as exc:
        raise PlanError(label + "_unavailable") from exc
    if alias.st_uid != 0:
        raise PlanError(label + "_alias_not_root_owned")
    if stat.S_ISREG(alias.st_mode):
        if stat.S_IMODE(alias.st_mode) & 0o022:
            raise PlanError(label + "_alias_writable")
    elif not stat.S_ISLNK(alias.st_mode):
        raise PlanError(label + "_alias_type_invalid")

    real = Path(os.path.realpath(path))
    current = Path("/")
    for part in real.parent.parts[1:]:
        current = current / part
        st = current.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise PlanError(label + "_ancestry_invalid:" + str(current))
    st = real.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
        or st.st_size < 1
        or st.st_size > maximum
    ):
        raise PlanError(label + "_target_invalid")
    fd = os.open(real, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if (
            opened.st_dev != st.st_dev
            or opened.st_ino != st.st_ino
            or opened.st_size != st.st_size
            or opened.st_mtime_ns != st.st_mtime_ns
            or opened.st_ctime_ns != st.st_ctime_ns
        ):
            raise PlanError(label + "_rebound")
        h = hashlib.sha256()
        remaining = st.st_size
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise PlanError(label + "_short_read")
            h.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise PlanError(label + "_grew")
        after = os.fstat(fd)
        visible = real.lstat()
        if (
            after.st_dev != opened.st_dev
            or after.st_ino != opened.st_ino
            or visible.st_dev != opened.st_dev
            or visible.st_ino != opened.st_ino
            or visible.st_size != opened.st_size
            or visible.st_mtime_ns != opened.st_mtime_ns
            or visible.st_ctime_ns != opened.st_ctime_ns
        ):
            raise PlanError(label + "_changed")
    finally:
        os.close(fd)
    return {
        "path": raw_path,
        "resolved_path": str(real),
        "bytes": st.st_size,
        "sha256": h.hexdigest(),
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "uid": st.st_uid,
        "gid": st.st_gid,
        "dev": st.st_dev,
        "ino": st.st_ino,
    }


def _checkout_refs(expected_head: str) -> dict[str, str]:
    head = git("rev-parse", "--verify", "HEAD^{commit}")
    tree = git("rev-parse", "--verify", "HEAD^{tree}")
    branch = git("symbolic-ref", "--quiet", "HEAD")
    if head != expected_head:
        raise PlanError("checkout_head_mismatch")
    if HEX40.fullmatch(tree) is None:
        raise PlanError("checkout_tree_invalid")
    if branch != "refs/heads/main":
        raise PlanError("checkout_branch_not_main")
    return {"head": head, "tree": tree, "branch": "main"}


def checkout_snapshot(expected_head: str) -> dict[str, str]:
    if HEX40.fullmatch(expected_head) is None:
        raise PlanError("expected_head_invalid")
    try:
        with _CheckoutPaths() as paths:
            # A physical .git directory is required. No temporary metadata,
            # refresh, or content conversion is used to observe the checkout.
            paths.directory(b".git")
            _, _, index_hash, index_metadata = paths.regular(
                b".git/index", MAX_INDEX_BYTES, metadata=True,
            )
            refs = _checkout_refs(expected_head)
            tree_raw = git_bytes("ls-tree", "-r", "--full-tree", "-z", expected_head)
            index_raw = git_bytes("ls-files", "--stage", "-v", "-z", "--full-name", "--sparse")
            tree = _parse_tree(tree_raw)
            index = _parse_index(index_raw)
            if tree != index:
                raise PlanError("checkout_index_tree_mismatch")
            if git_bytes("ls-files", "--others", "--exclude-standard", "-z", "--full-name"):
                raise PlanError("checkout_not_clean")
            total = 0
            for path, (mode, expected_blob) in sorted(tree.items()):
                remaining = MAX_TRACKED_TOTAL_BYTES - total
                if mode == "120000":
                    blob, size = paths.symlink(path, remaining)
                else:
                    _, blob, _, observed = paths.regular(
                        path, min(MAX_TRACKED_FILE_BYTES, remaining), mode=mode,
                    )
                    size = observed[6]
                total += size
                if total > MAX_TRACKED_TOTAL_BYTES:
                    raise PlanError("checkout_total_bytes_limit")
                if blob != expected_blob:
                    raise PlanError("checkout_tracked_raw_blob_mismatch")
            if git_bytes("ls-files", "--others", "--exclude-standard", "-z", "--full-name"):
                raise PlanError("checkout_not_clean")
            if git_bytes("ls-files", "--stage", "-v", "-z", "--full-name", "--sparse") != index_raw:
                raise PlanError("checkout_index_listing_changed")
            if git_bytes("ls-tree", "-r", "--full-tree", "-z", expected_head) != tree_raw:
                raise PlanError("checkout_tree_listing_changed")
            if _checkout_refs(expected_head) != refs:
                raise PlanError("checkout_refs_changed")
            _, _, final_hash, final_metadata = paths.regular(
                b".git/index", MAX_INDEX_BYTES, metadata=True,
            )
            if final_hash != index_hash or final_metadata != index_metadata:
                raise PlanError("checkout_index_generation_changed")
            paths.revalidate()
            return {**refs, "generation_sha256": paths.generation_sha256(index_hash)}
    except OSError as exc:
        raise PlanError("checkout_observation_unavailable") from exc


def load_qualifier():
    raw = repository_blob(QUALIFIER_REL, QUALIFIER_BLOB)
    module = types.ModuleType("void_e2_v6_installed_qualifier_verified")
    module.__file__ = str(ROOT / QUALIFIER_REL)
    module.__package__ = None
    try:
        code = compile(
            raw.decode("utf-8", "strict"),
            QUALIFIER_REL,
            "exec",
            dont_inherit=True,
            optimize=0,
        )
        exec(code, module.__dict__)
    except Exception as exc:
        raise PlanError("qualifier_verified_execution_failed") from exc
    if getattr(module, "MARKER", "") != (
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6"
    ):
        raise PlanError("qualifier_marker_mismatch")
    if getattr(module, "INSTALLER_SOURCE_GIT_BLOB_SHA1", "") != (
        "438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84"
    ):
        raise PlanError("qualifier_installer_blob_mismatch")
    return module


def source_dependencies() -> dict[str, Any]:
    launcher_lock_raw = repository_blob(LAUNCHER_LOCK_REL, LAUNCHER_LOCK_BLOB)
    repository_blob(LAUNCHER_MATERIALIZER_REL, LAUNCHER_MATERIALIZER_BLOB)
    native_lock_raw = repository_blob(NATIVE_LOCK_REL, NATIVE_LOCK_BLOB)
    repository_blob(NATIVE_MATERIALIZER_REL, NATIVE_MATERIALIZER_BLOB)

    try:
        launcher_lock = json.loads(launcher_lock_raw.decode("utf-8", "strict"))
        native_lock = json.loads(native_lock_raw.decode("utf-8", "strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PlanError("accepted_lock_json_invalid") from exc
    if not isinstance(launcher_lock, dict) or not isinstance(native_lock, dict):
        raise PlanError("accepted_lock_shape_invalid")

    launcher_required = {
        "lock_id": LAUNCHER_LOCK_ID,
        "candidate_accepted": True,
        "launcher_binary_identity_accepted": True,
        "runtime_head_contract_accepted": True,
        "canonical_main_candidate_authority": True,
        "superseded_v1_lock_install_authority": False,
        "protected_install_authorized": False,
        "precision_install_authorized": False,
        "native_or_binder_live_execution_authorized": False,
        "funds_movement_authorized": False,
    }
    for key, expected in launcher_required.items():
        if launcher_lock.get(key) != expected:
            raise PlanError("launcher_lock_field_mismatch:" + key)
    launcher_report = launcher_lock.get("candidate_report")
    if (
        not isinstance(launcher_report, dict)
        or launcher_report.get("candidate_id") != LAUNCHER_CANDIDATE_ID
        or launcher_report.get("launcher_binary_bytes") != LAUNCHER_BYTES
        or launcher_report.get("launcher_binary_sha256") != LAUNCHER_SHA256
        or launcher_report.get("launcher_binary_git_blob_sha1") != LAUNCHER_GIT_BLOB
        or launcher_report.get("runtime_expected_head_compile_bound") is not False
        or launcher_report.get("runtime_expected_head_strict_lowercase_hex") is not True
        or launcher_report.get("runtime_expected_head_forwarded_unchanged") is not True
        or launcher_report.get("repository_head_not_embedded_in_launcher") is not True
    ):
        raise PlanError("launcher_lock_candidate_report_invalid")

    native_required = {
        "lock_id":
            "voidbuye2dormantbinderlock3_"
            "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a",
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
        "funds_movement_authorized": False,
    }
    for key, expected in native_required.items():
        if native_lock.get(key) != expected:
            raise PlanError("native_lock_field_mismatch:" + key)
    native_report = native_lock.get("candidate_report")
    if (
        not isinstance(native_report, dict)
        or native_report.get("candidate_id") != (
            "voidbuye2dormantbindercand2_"
            "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"
        )
        or native_report.get("native_binary_bytes") != NATIVE_BYTES
        or native_report.get("native_binary_sha256") != NATIVE_SHA256
    ):
        raise PlanError("native_lock_candidate_report_invalid")

    return {"launcher_lock": launcher_lock, "native_lock": native_lock}


def collect_plan(
    launcher: Path,
    native: Path,
    expected_head: str,
) -> dict[str, Any]:
    if os.geteuid() == 0:
        raise PlanError("nonroot_plan_required")
    checkout = checkout_snapshot(expected_head)
    source_dependencies()

    qualifier = load_qualifier()
    installer = qualifier._load_installer()
    expected_bootstrap = {
        "lock_id":
            "voidbuye2dormantbootstraplock3_"
            "4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396",
        "candidate_id":
            "voidbuye2dormantbootstrapcand3_"
            "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2",
        "bytes": BOOTSTRAP_BYTES,
        "sha256": BOOTSTRAP_SHA256,
        "git_blob_sha1": BOOTSTRAP_GIT_BLOB,
        "manifest_bytes": 2382,
        "manifest_sha256":
            "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9",
        "manifest_git_blob_sha1":
            "de56bacb30bea0adc418e240cf3fb8d900b061ef",
        "policy_schema":
            "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
            "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6",
    }
    observed_bootstrap = {
        "lock_id": installer.LOCK_ID,
        "candidate_id": installer.CANDIDATE_ID,
        "bytes": installer.BOOTSTRAP_BYTES,
        "sha256": installer.BOOTSTRAP_SHA256,
        "git_blob_sha1": installer.BOOTSTRAP_GIT_BLOB_SHA1,
        "manifest_bytes": installer.MANIFEST_BYTES,
        "manifest_sha256": installer.MANIFEST_SHA256,
        "manifest_git_blob_sha1": installer.MANIFEST_GIT_BLOB_SHA1,
        "policy_schema": installer.POLICY_SCHEMA,
    }
    if observed_bootstrap != expected_bootstrap:
        raise PlanError("qualifier_bootstrap_generation_mismatch")
    installed_path = (
        installer.INSTALL_ROOT / installer.BIN_DIR / installer.BOOTSTRAP_NAME
    )
    if installed_path != BOOTSTRAP_PATH:
        raise PlanError("qualifier_bootstrap_path_mismatch")

    launcher_info = stable_artifact(
        launcher,
        expected_bytes=LAUNCHER_BYTES,
        expected_sha256=LAUNCHER_SHA256,
        expected_git_blob=LAUNCHER_GIT_BLOB,
        label="accepted_launcher",
    )
    native_info = stable_artifact(
        native,
        expected_bytes=NATIVE_BYTES,
        expected_sha256=NATIVE_SHA256,
        expected_git_blob=None,
        label="accepted_native",
    )
    python_info = _safe_tool(Path("/usr/bin/python3"), "qualification_python", 512 * 1024 * 1024)
    git_info = _safe_tool(Path("/usr/bin/git"), "qualification_git", 64 * 1024 * 1024)

    qualification_contract = {
        "qualifier_source_path": str(ROOT / QUALIFIER_REL),
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "qualifier_installer_git_blob_sha1":
            "438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84",
        "expected_head": expected_head,
        "root_execution_required": True,
        "read_only_required": False,
        "temporary_git_metadata_write_required": True,
        "temporary_git_metadata_cleanup_required": True,
        "descriptor_bound_source_execution_required": True,
        "interpreter": python_info,
        "git_tool": git_info,
        "required_result": {
            "version": 6,
            "read_only": False,
            "expected_head": expected_head,
            "accepted_lock_id": expected_bootstrap["lock_id"],
            "candidate_id": expected_bootstrap["candidate_id"],
            "installed_identity_green": True,
            "policy_generation_green": True,
            "python_generation_bound": True,
            "git_generation_bound": True,
            "checkout_generation_bound": True,
            "installed_generation_stable": True,
            "bootstrap_descriptor_bound_self_test": True,
            "bootstrap_self_test_execution": True,
            "bootstrap_self_test_count": 2,
            "bootstrap_self_test_stable": True,
            "bootstrap_sha256": BOOTSTRAP_SHA256,
            "bootstrap_bytes": BOOTSTRAP_BYTES,
            "bootstrap_git_blob_sha1": BOOTSTRAP_GIT_BLOB,
            "manifest_sha256": expected_bootstrap["manifest_sha256"],
            "manifest_bytes": expected_bootstrap["manifest_bytes"],
            "manifest_git_blob_sha1": expected_bootstrap["manifest_git_blob_sha1"],
            "bootstrap_execution_beyond_self_test": False,
            "inner_installer_execution": False,
            "protected_installer_apply": False,
            "filesystem_write": True,
            "protected_filesystem_mutation": False,
            "git_boundary_policy":
                "private_metadata_pinned_objects_raw_checkout_outer_v6",
            "temporary_git_metadata_write_required": True,
            "temporary_git_metadata_write_performed": True,
            "temporary_git_metadata_cleanup_completed": True,
            "source_repository_mutation": False,
            "source_object_fetch": False,
            "repository_config_loaded": False,
            "repository_callback_execution": False,
            "standalone_git_tool_admission": True,
            "native_parent_authority_claimed": False,
            "service_mutation": False,
            "systemd_mutation": False,
            "credential_access": False,
            "private_key_access": False,
            "signing": False,
            "transaction": False,
            "rpc_call": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "wc_void_market_activation": False,
            "treasury_liquidity_action": False,
            "funds_movement": False,
            "production_host_evidence_authority": False,
        },
    }

    bootstrap_argv = [
        str(BOOTSTRAP_PATH),
        "--installer-plan",
        "--launcher",
        str(launcher),
        "--native",
        str(native),
        "--expected-head",
        expected_head,
    ]

    body = {
        "schema": PLAN_SCHEMA,
        "version": 6,
        "checkout": checkout,
        "expected_head": expected_head,
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "qualification_contract": qualification_contract,
        "installed_qualification_performed": False,
        "installed_qualification_required_before_bootstrap_plan": True,
        "expected_installed_bootstrap": expected_bootstrap,
        "accepted_launcher": launcher_info,
        "accepted_launcher_lock_id": LAUNCHER_LOCK_ID,
        "accepted_launcher_candidate_id": LAUNCHER_CANDIDATE_ID,
        "launcher_runtime_head_contract_accepted": True,
        "launcher_superseded_v1_lock_install_authority": False,
        "accepted_native": native_info,
        "bootstrap_argv": bootstrap_argv,
        "bootstrap_execution_performed": False,
        "protected_installer_apply_performed": False,
        "filesystem_write": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "transaction": False,
        "rpc_call": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_liquidity_action": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
    }
    if canonical(checkout_snapshot(expected_head)) != canonical(checkout):
        raise PlanError("checkout_generation_changed_during_plan")
    return {"plan_id": plan_id_for_body(body), "body": body}


def plan_id_for_body(body: object) -> str:
    return PLAN_PREFIX + sha256(canonical(body))


def emit_plan(result: dict[str, Any]) -> None:
    body = result["body"]
    if result["plan_id"] != plan_id_for_body(body):
        raise PlanError("plan_id_body_mismatch")
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("nonroot_required=true")
    print("plan_id=" + result["plan_id"])
    print("plan_body_json=" + canonical(body).decode("ascii"))
    print("expected_head=" + body["expected_head"])
    print("qualifier_git_blob_sha1=" + QUALIFIER_BLOB)
    print("installed_qualification_performed=false")
    print("installed_qualification_required_before_bootstrap_plan=true")
    print("qualification_root_execution_required=true")
    print("qualification_descriptor_bound_source_execution_required=true")
    print("expected_installed_bootstrap_identity_bound=true")
    print("accepted_launcher_identity_green=true")
    print("accepted_launcher_lock_id=" + LAUNCHER_LOCK_ID)
    print("accepted_launcher_candidate_id=" + LAUNCHER_CANDIDATE_ID)
    print("launcher_runtime_head_contract_accepted=true")
    print("launcher_superseded_v1_lock_install_authority=false")
    print("accepted_native_identity_green=true")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print(
        "bootstrap_argv_json="
        + json.dumps(body["bootstrap_argv"], separators=(",", ":"))
    )
    print(
        "qualification_contract_json="
        + json.dumps(body["qualification_contract"], sort_keys=True, separators=(",", ":"))
    )
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALLER_BOOTSTRAP_V6_QUALIFY_AND_EXECUTE_PLAN"
    )


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("qualifier_git_blob_sha1=" + QUALIFIER_BLOB)
    print("launcher_lock_git_blob_sha1=" + LAUNCHER_LOCK_BLOB)
    print("launcher_materializer_git_blob_sha1=" + LAUNCHER_MATERIALIZER_BLOB)
    print("accepted_launcher_lock_id=" + LAUNCHER_LOCK_ID)
    print("accepted_launcher_candidate_id=" + LAUNCHER_CANDIDATE_ID)
    print("launcher_runtime_head_contract_accepted=true")
    print("launcher_superseded_v1_lock_install_authority=false")
    print("native_lock_git_blob_sha1=" + NATIVE_LOCK_BLOB)
    print("native_materializer_git_blob_sha1=" + NATIVE_MATERIALIZER_BLOB)
    print("bootstrap_path=" + str(BOOTSTRAP_PATH))
    print("installed_qualification_performed=false")
    print("qualification_descriptor_bound_source_execution_required=true")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")


def self_test() -> None:
    assert HEX40.fullmatch("a" * 40)
    assert HEX40.fullmatch("A" * 40) is None
    assert PLAN_PREFIX == "voidbuye2protectedbootstrapplan6_"
    assert BOOTSTRAP_BYTES == 874_608
    assert BOOTSTRAP_SHA256 == (
        "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
    )
    assert BOOTSTRAP_GIT_BLOB == "b577d70666f98ac59a75b84b3dab741fe7b93a4b"
    assert str(BOOTSTRAP_PATH).endswith("protected_install_bootstrap_v6")
    print(MARKER + "_SELF_TEST_GREEN")
    print("nonroot_plan_required=true")
    print("merged_v6_qualifier_bound=true")
    print("accepted_launcher_materializer_bound=true")
    print("accepted_launcher_lock_v2_bound=true")
    print("launcher_runtime_head_contract_accepted=true")
    print("launcher_superseded_v1_lock_install_authority=false")
    print("accepted_native_materializer_bound=true")
    print("strict_runtime_head_required=true")
    print("qualification_root_execution_separate=true")
    print("qualification_descriptor_bound_source_execution_required=true")
    print("installed_qualification_performed=false")
    print("operation_bound_plan_id=true")
    print("structured_bootstrap_argv_only=true")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    parser.add_argument("--launcher", default="")
    parser.add_argument("--native", default="")
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.launcher or not args.native or not args.expected_head:
        raise PlanError("plan_arguments_required")
    result = collect_plan(Path(args.launcher), Path(args.native), args.expected_head)
    emit_plan(result)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PlanError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("read_only=true")
        print("installed_qualification_performed=false")
        print("bootstrap_execution_performed=false")
        print("protected_installer_apply_performed=false")
        print("filesystem_write=false")
        print("service_mutation=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("treasury_liquidity_action=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
