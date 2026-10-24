#!/usr/bin/env python3
from __future__ import annotations

import sys as _bootstrap_sys

MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALLED_QUALIFICATION_V5"
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
    or _bootstrap_sys.flags.optimize != 0
    or not __debug__
):
    print(MARKER)
    print("status=HOLD")
    print("reason=python_isolated_unoptimized_mode_required")
    raise SystemExit(2)
del _bootstrap_sys

import argparse
import hashlib
import os
import pathlib
import stat
import tempfile

SOURCE_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
SOURCE_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
LIVE_RELEASE = pathlib.Path("/opt/void-node-live/releases/" + SOURCE_HEAD)
FULL_HISTORY_RELEASE = pathlib.Path("/opt/void-v7-source-release-full-history-v1")
SOURCE = pathlib.Path("/opt/void-buy-void-v7-reviewed-v1")
PREENTRY = pathlib.Path("/opt/void-buy-void-v7-preentry-v1/void_buy_void_source_finality_v7_native_preentry_v1")
SELECTOR = pathlib.Path("/opt/void-buy-void-v7-selector-v1/void_buy_void_source_finality_live_process_v2_selector_guard_v1")

NATIVE_SHA256 = "8ce663ff7e3713fc6bf615dd743350be9e50dff729fdb3d609b065b158397851"
NATIVE_BYTES = 21600
SELECTOR_SHA256 = "048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232"
SELECTOR_BYTES = 26680

RUNTIME_UID = 1000
RUNTIME_GID = 1000
MAX_NODES = 250000
MAX_FILE_BYTES = 512 * 1024 * 1024
MAX_TOTAL_BYTES = 16 * 1024 * 1024 * 1024
COPY_CHUNK = 1024 * 1024

V6_INSTALLER_REL = "ops/precision/void_buy_void_v7_protected_substrate_install_v6.py"
V6_INSTALLER_BLOB = "bff71178f3771a04d96d4f4a9aabe88e050eb683"


class QualifyError(RuntimeError):
    pass


def _metadata_identity(st: os.stat_result) -> tuple[int, int, int, int, int, int, int, int, int]:
    return (
        st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode, st.st_nlink,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )


def _hex(value: str, size: int, label: str) -> str:
    if len(value) != size or any(ch not in "0123456789abcdef" for ch in value):
        raise QualifyError(label + "_invalid")
    return value


def _read_small_regular(path: pathlib.Path, label: str, maximum: int = 1024 * 1024) -> bytes:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 0
        or before.st_size > maximum
    ):
        raise QualifyError(label + "_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        expected = _metadata_identity(opened)
        if expected != _metadata_identity(before):
            raise QualifyError(label + "_rebound")
        out = bytearray()
        remaining = opened.st_size
        while remaining:
            part = os.read(fd, min(64 * 1024, remaining))
            if not part:
                raise QualifyError(label + "_short_read")
            out.extend(part)
            remaining -= len(part)
        if os.read(fd, 1):
            raise QualifyError(label + "_grew")
        if _metadata_identity(os.fstat(fd)) != expected or _metadata_identity(path.lstat()) != expected:
            raise QualifyError(label + "_generation_changed")
        return bytes(out)
    finally:
        os.close(fd)


def _stream_regular(
    path: pathlib.Path,
    label: str,
    *,
    git_blob: bool,
) -> tuple[int, str, str | None, tuple[int, int, int, int, int, int, int, int, int]]:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 0
        or before.st_size > MAX_FILE_BYTES
    ):
        raise QualifyError(label + "_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        expected = _metadata_identity(opened)
        if expected != _metadata_identity(before):
            raise QualifyError(label + "_rebound")
        sha = hashlib.sha256()
        blob = hashlib.sha1() if git_blob else None
        if blob is not None:
            blob.update(b"blob " + str(opened.st_size).encode("ascii") + b"\0")
        remaining = opened.st_size
        while remaining:
            part = os.read(fd, min(COPY_CHUNK, remaining))
            if not part:
                raise QualifyError(label + "_short_read")
            sha.update(part)
            if blob is not None:
                blob.update(part)
            remaining -= len(part)
        if os.read(fd, 1):
            raise QualifyError(label + "_grew")
        if _metadata_identity(os.fstat(fd)) != expected or _metadata_identity(path.lstat()) != expected:
            raise QualifyError(label + "_generation_changed")
        return opened.st_size, sha.hexdigest(), blob.hexdigest() if blob is not None else None, expected
    finally:
        os.close(fd)


def _bounded_names(path: pathlib.Path, label: str, limit: int) -> tuple[str, ...]:
    if limit < 0:
        raise QualifyError(label + "_entry_limit_invalid")
    names: list[str] = []
    try:
        with os.scandir(path) as scan:
            for entry in scan:
                if len(names) >= limit:
                    raise QualifyError(label + "_entry_limit")
                names.append(entry.name)
    except OSError as exc:
        raise QualifyError(label + "_scandir_failed") from exc
    return tuple(names)


def _content_digest(
    root: pathlib.Path,
    expected_uid: int,
    expected_gid: int,
    expected_root_mode: int,
    *,
    require_runtime_nonwritable: bool = True,
) -> tuple[str, int, int]:
    root_abs = pathlib.Path(os.path.abspath(os.fspath(root)))
    if root_abs.resolve(strict=True) != root_abs:
        raise QualifyError("tree_root_alias_forbidden")
    rst = root_abs.lstat()
    if (
        not stat.S_ISDIR(rst.st_mode)
        or stat.S_ISLNK(rst.st_mode)
        or rst.st_uid != expected_uid
        or rst.st_gid != expected_gid
        or stat.S_IMODE(rst.st_mode) != expected_root_mode
    ):
        raise QualifyError("tree_root_metadata_invalid")
    root_identity = _metadata_identity(rst)
    if require_runtime_nonwritable:
        _require_runtime_nonwritable(root_abs, "tree_root")
    h = hashlib.sha256()
    nodes = 0
    total = 0
    pending: list[tuple[pathlib.Path, str]] = [(root_abs, "")]
    while pending:
        directory, prefix = pending.pop()
        before = directory.lstat()
        remaining_nodes = MAX_NODES - nodes
        names = sorted(_bounded_names(directory, "tree_directory", remaining_nodes + 1))
        if len(names) > remaining_nodes:
            raise QualifyError("tree_node_limit")
        if _metadata_identity(directory.lstat()) != _metadata_identity(before):
            raise QualifyError("tree_directory_changed:" + (prefix or "."))
        nodes += len(names)
        for entry_name in names:
            try:
                entry_name.encode("utf-8", "strict")
            except UnicodeEncodeError as exc:
                raise QualifyError("tree_name_not_utf8") from exc
            child = directory / entry_name
            rel = entry_name if not prefix else prefix + "/" + entry_name
            st = child.lstat()
            if st.st_uid != expected_uid or st.st_gid != expected_gid:
                raise QualifyError("tree_owner_invalid:" + rel)
            if stat.S_ISLNK(st.st_mode):
                raise QualifyError("tree_symlink_forbidden:" + rel)
            if stat.S_ISDIR(st.st_mode):
                if stat.S_IMODE(st.st_mode) & 0o022:
                    raise QualifyError("tree_directory_group_or_world_writable:" + rel)
                if require_runtime_nonwritable:
                    _require_runtime_nonwritable(child, "tree_directory")
                h.update(b"D\0" + rel.encode("utf-8") + b"\0")
                pending.append((child, rel))
            elif stat.S_ISREG(st.st_mode):
                if stat.S_IMODE(st.st_mode) & 0o022:
                    raise QualifyError("tree_file_group_or_world_writable:" + rel)
                if require_runtime_nonwritable:
                    _require_runtime_nonwritable(child, "tree_file")
                file_size, file_sha256, _oid, _identity = _stream_regular(
                    child, "tree_file", git_blob=False
                )
                total += file_size
                if total > MAX_TOTAL_BYTES:
                    raise QualifyError("tree_total_bytes_limit")
                h.update(
                    b"F\0" + rel.encode("utf-8") + b"\0"
                    + str(file_size).encode("ascii") + b"\0"
                    + bytes.fromhex(file_sha256)
                )
            else:
                raise QualifyError("tree_kind_invalid:" + rel)
    if _metadata_identity(root_abs.lstat()) != root_identity:
        raise QualifyError("tree_root_generation_changed")
    return h.hexdigest(), nodes, total


def _git_tree_oid_from_worktree(root: pathlib.Path, label: str) -> str:
    nodes = 0
    total = 0
    root_before = root.lstat()
    if not stat.S_ISDIR(root_before.st_mode) or stat.S_ISLNK(root_before.st_mode):
        raise QualifyError(label + "_worktree_root_invalid")
    root_identity = _metadata_identity(root_before)

    def walk(directory: pathlib.Path, depth: int) -> str:
        nonlocal nodes, total
        if depth > 256:
            raise QualifyError(label + "_worktree_depth_limit")
        before = directory.lstat()
        if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
            raise QualifyError(label + "_worktree_directory_invalid")
        directory_identity = _metadata_identity(before)
        rows: list[tuple[bytes, bytes]] = []
        names: list[str] = []
        with os.scandir(directory) as scan:
            for entry in scan:
                nodes += 1
                if nodes > MAX_NODES:
                    raise QualifyError(label + "_worktree_node_limit")
                names.append(entry.name)
        for name in names:
            if directory == root and name == ".git":
                gst = os.lstat(directory / name)
                if not stat.S_ISDIR(gst.st_mode) or stat.S_ISLNK(gst.st_mode):
                    raise QualifyError(label + "_git_dir_invalid")
                continue
            try:
                raw_name = os.fsencode(name)
                raw_name.decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError) as exc:
                raise QualifyError(label + "_worktree_name_not_utf8") from exc
            if not raw_name or b"/" in raw_name or b"\0" in raw_name:
                raise QualifyError(label + "_worktree_name_invalid")
            child = directory / name
            st = os.lstat(child)
            identity = _metadata_identity(st)
            if stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode):
                oid = walk(child, depth + 1)
                mode = b"40000"
                sort_key = raw_name + b"/"
            elif stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode):
                if st.st_size > MAX_FILE_BYTES:
                    raise QualifyError(label + "_worktree_file_size_limit")
                total += st.st_size
                if total > MAX_TOTAL_BYTES:
                    raise QualifyError(label + "_worktree_total_bytes_limit")
                _size, _sha, oid, _ident = _stream_regular(
                    child, label + "_worktree_blob", git_blob=True
                )
                assert oid is not None
                mode = b"100755" if stat.S_IMODE(st.st_mode) & stat.S_IXUSR else b"100644"
                sort_key = raw_name + b"\0"
            elif stat.S_ISLNK(st.st_mode):
                target = os.fsencode(os.readlink(child))
                if len(target) > MAX_FILE_BYTES:
                    raise QualifyError(label + "_worktree_symlink_size_limit")
                if _metadata_identity(child.lstat()) != identity:
                    raise QualifyError(label + "_worktree_symlink_generation_changed")
                blob = hashlib.sha1()
                blob.update(b"blob " + str(len(target)).encode("ascii") + b"\0" + target)
                oid = blob.hexdigest()
                mode = b"120000"
                sort_key = raw_name + b"\0"
            else:
                raise QualifyError(label + "_worktree_kind_invalid")
            rows.append((sort_key, mode + b" " + raw_name + b"\0" + bytes.fromhex(oid)))
        if _metadata_identity(directory.lstat()) != directory_identity:
            raise QualifyError(label + "_worktree_directory_generation_changed")
        rows.sort(key=lambda item: item[0])
        body = b"".join(record for _key, record in rows)
        h = hashlib.sha1()
        h.update(b"tree " + str(len(body)).encode("ascii") + b"\0" + body)
        return h.hexdigest()

    oid = walk(root, 0)
    if _metadata_identity(root.lstat()) != root_identity:
        raise QualifyError(label + "_worktree_root_generation_changed")
    return oid


def _direct_main_ref(root: pathlib.Path, label: str) -> str:
    root_abs = pathlib.Path(os.path.abspath(os.fspath(root)))
    if root_abs.resolve(strict=True) != root_abs:
        raise QualifyError(label + "_root_alias_forbidden")
    git_dir = root_abs / ".git"
    gst = git_dir.lstat()
    if not stat.S_ISDIR(gst.st_mode) or stat.S_ISLNK(gst.st_mode):
        raise QualifyError(label + "_git_dir_invalid")
    head = _read_small_regular(git_dir / "HEAD", label + "_head", 4096)
    if head != b"ref: refs/heads/main\n":
        raise QualifyError(label + "_head_not_main")
    ref_path = git_dir / "refs" / "heads" / "main"
    ref = _read_small_regular(ref_path, label + "_main_ref", 4096)
    if len(ref) != 41 or not ref.endswith(b"\n") or any(ch not in b"0123456789abcdef" for ch in ref[:-1]):
        raise QualifyError(label + "_main_ref_invalid")
    return ref[:-1].decode("ascii")


def _require_runtime_nonwritable(path: pathlib.Path, label: str) -> None:
    current = path
    while True:
        if os.access(current, os.W_OK, effective_ids=True):
            raise QualifyError(label + "_runtime_writable:" + os.fspath(current))
        if current == current.parent:
            break
        current = current.parent


def _verify_repo_root(
    root: pathlib.Path,
    label: str,
    *,
    root_mode: int,
    shallow: bool,
) -> None:
    st = root.lstat()
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != root_mode
    ):
        raise QualifyError(label + "_root_metadata_invalid")
    _require_runtime_nonwritable(root, label)
    if _direct_main_ref(root, label) != SOURCE_HEAD:
        raise QualifyError(label + "_head_mismatch")
    shallow_path = root / ".git" / "shallow"
    if shallow:
        if _read_small_regular(shallow_path, label + "_shallow", 4096) != (SOURCE_HEAD + "\n").encode("ascii"):
            raise QualifyError(label + "_shallow_mismatch")
    elif shallow_path.exists() or shallow_path.is_symlink():
        raise QualifyError(label + "_unexpected_shallow")
    if _git_tree_oid_from_worktree(root, label) != SOURCE_TREE:
        raise QualifyError(label + "_tree_mismatch")


def _exact_binary(path: pathlib.Path, expected_bytes: int, expected_sha: str, label: str) -> None:
    st = path.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) != 0o555
        or st.st_nlink != 1
        or st.st_size != expected_bytes
    ):
        raise QualifyError(label + "_metadata_invalid")
    _require_runtime_nonwritable(path, label)
    size, sha, _oid, _ident = _stream_regular(path, label, git_blob=False)
    if size != expected_bytes or sha != expected_sha:
        raise QualifyError(label + "_identity_mismatch")


def require_runtime_identity() -> None:
    if (
        os.getuid() != RUNTIME_UID
        or os.geteuid() != RUNTIME_UID
        or os.getgid() != RUNTIME_GID
        or os.getegid() != RUNTIME_GID
        or os.getgroups() != []
    ):
        raise QualifyError("runtime_identity_invalid")


def qualify(expected_full_history_content_sha256: str) -> None:
    expected = _hex(expected_full_history_content_sha256, 64, "expected_full_history_content_sha256")
    require_runtime_identity()
    _verify_repo_root(LIVE_RELEASE, "live_release", root_mode=0o555, shallow=True)
    live_before = _content_digest(LIVE_RELEASE, 0, 0, 0o555)
    _verify_repo_root(FULL_HISTORY_RELEASE, "full_history_release", root_mode=0o555, shallow=False)
    _verify_repo_root(SOURCE, "protected_source", root_mode=0o755, shallow=False)

    full_before = _content_digest(FULL_HISTORY_RELEASE, 0, 0, 0o555)
    source_before = _content_digest(SOURCE, 0, 0, 0o755)
    if full_before[0] != expected or source_before[0] != expected:
        raise QualifyError("protected_source_full_history_digest_mismatch")
    if full_before[1:] != source_before[1:]:
        raise QualifyError("protected_source_full_history_shape_mismatch")

    _exact_binary(PREENTRY, NATIVE_BYTES, NATIVE_SHA256, "native_preentry")
    _exact_binary(SELECTOR, SELECTOR_BYTES, SELECTOR_SHA256, "selector")

    full_after = _content_digest(FULL_HISTORY_RELEASE, 0, 0, 0o555)
    source_after = _content_digest(SOURCE, 0, 0, 0o755)
    live_after = _content_digest(LIVE_RELEASE, 0, 0, 0o555)
    if full_after != full_before or source_after != source_before or live_after != live_before:
        raise QualifyError("source_generation_changed_during_qualification")
    _verify_repo_root(LIVE_RELEASE, "live_release_terminal", root_mode=0o555, shallow=True)

    print(MARKER)
    print("status=INSTALLED_QUALIFICATION_V5_GREEN")
    print("live_shallow_release_cross_binding_green=true")
    print("live_release_acl_aware_tree_custody_green=true")
    print("full_history_provenance_digest_green=true")
    print("protected_source_full_history_digest_green=true")
    print("expected_full_history_content_sha256=" + expected)
    print("source_head=" + SOURCE_HEAD)
    print("source_tree=" + SOURCE_TREE)
    print("source_nodes=" + str(source_after[1]))
    print("source_regular_file_bytes=" + str(source_after[2]))
    print("native_preentry_identity_exact=true")
    print("selector_identity_exact=true")
    print("external_repository_observer=false")
    print("privileged_execution_authorized=false")
    print("receipt_publication_authorized=false")
    print("provider_rpc_contact=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("live_release_path=" + os.fspath(LIVE_RELEASE))
    print("full_history_release_path=" + os.fspath(FULL_HISTORY_RELEASE))
    print("protected_source_path=" + os.fspath(SOURCE))
    print("trusted_full_history_content_sha256_required=true")
    print("live_shallow_release_cross_binding_required=true")
    print("protected_source_full_history_digest_equality_required=true")
    print("external_repository_observer=false")
    print("v6_installer_source_path=" + V6_INSTALLER_REL)
    print("v6_installer_git_blob_sha1=" + V6_INSTALLER_BLOB)
    print("host_read=false")
    print("host_write=false")
    print("funds_movement=false")


def self_test() -> None:
    _hex("a" * 64, 64, "digest")
    try:
        _hex("a" * 63, 64, "digest")
    except QualifyError:
        pass
    else:
        raise AssertionError("short_digest_accepted")
    with tempfile.TemporaryDirectory(prefix="void-v7-qual-v5-") as td:
        root = pathlib.Path(td)
        sub = root / "sub"
        sub.mkdir()
        (root / "a.txt").write_bytes(b"A")
        (sub / "b.txt").write_bytes(b"B")
        os.chmod(root, 0o755)
        os.chmod(sub, 0o755)
        uid, gid = os.getuid(), os.getgid()
        d1 = _content_digest(
            root, uid, gid, 0o755, require_runtime_nonwritable=False
        )
        (sub / "b.txt").write_bytes(b"C")
        d2 = _content_digest(
            root, uid, gid, 0o755, require_runtime_nonwritable=False
        )
        assert d1[0] != d2[0]
    print(MARKER + "_SELF_TEST_GREEN")
    print("trusted_full_history_content_sha256_required=true")
    print("content_digest_matches_replica_v1_contract=true")
    print("acl_aware_whole_tree_nonwritability_required=true")
    print("digest_self_test_does_not_weaken_production_acl_gate=true")
    print("direct_worktree_tree_oid_required=true")
    assert V6_INSTALLER_REL.endswith("_protected_substrate_install_v6.py")
    assert len(V6_INSTALLER_BLOB) == 40
    print("external_repository_observer=false")
    print("v6_installer_source_generation_bound=true")
    print("v6_installer_generation_coordination_required=true")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--qualify", action="store_true")
    parser.add_argument("--expected-full-history-content-sha256", default="")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.expected_full_history_content_sha256:
        raise QualifyError("expected_full_history_content_sha256_required")
    qualify(args.expected_full_history_content_sha256)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (QualifyError, OSError, UnicodeError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("host_write=false")
        print("service_mutation=false")
        print("credential_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
