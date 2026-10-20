#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

MARKER = "VOID_BUY_VOID_V7_POSTMERGE_SOURCE_RUNTIME_COMPAT_V1"
SCHEMA = "void_buy_void_v7_postmerge_source_runtime_compat_v1"
VERSION = 1

RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
RUNTIME_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
SOURCE_BASE_HEAD = "fd8131500330d8f8d51caa8275db456338c0a878"
SOURCE_BASE_TREE = "ff80027780ba8a037a56e0a322849420dae88565"
HEX40 = re.compile(r"^[0-9a-f]{40}$")

SELF_ADDITIONS = (
    ".github/workflows/buy-void-v7-postmerge-source-runtime-compat-v1.yml",
    "docs/operators/buy-void-v7-postmerge-source-runtime-compat-v1.md",
    "ops/precision/void_buy_void_v7_postmerge_source_runtime_compat_v1.py",
    "scripts/prove_buy_void_v7_postmerge_source_runtime_compat_v1.py",
)

BASE_ADDITIONS: dict[str, tuple[str, str, int]] = {
    ".github/workflows/buy-void-v7-materializer-v2-install-v3.yml": ("100644", "c689997ecdf97e58c3fedf96a7cae2fb6f76c8a2", 4403),
    ".github/workflows/buy-void-v7-protected-substrate-install-v2.yml": ("100644", "f2bfa4df16c4c4a69be275dd504b7a458512e7db", 5672),
    ".github/workflows/buy-void-v7-protected-substrate-install-v4.yml": ("100644", "5b640d01fc488e6b5d38f822a6736eab1b0c9c37", 9532),
    "docs/operators/buy-void-v7-materializer-v2-install-v3.md": ("100644", "91a9c04c02ba4ddbe5417e03b73efe0e71605e81", 1980),
    "docs/operators/buy-void-v7-protected-substrate-install-v2.md": ("100644", "a6d81892b9493258e7c8f4aaf8ac4981955ec42a", 4628),
    "docs/operators/buy-void-v7-protected-substrate-install-v4.md": ("100644", "eb9361f5b6da964d1cfe8ee0eaa761f7e5e25656", 20642),
    "docs/operators/buy-void-v7-protected-substrate-source-proposal-v3.md": ("100644", "78190cd9f71e4dd0ee4f7fdc1144b70fc644db8c", 967),
    "ops/precision/void_buy_void_v7_protected_substrate_install_v1.py": ("100755", "9f7f035b814549dad9cc6eeee3620d2c04b95d8a", 4762),
    "ops/precision/void_buy_void_v7_protected_substrate_install_v2.py": ("100755", "aae2d1a011053ea0665bf07972d9670cca73f6da", 36881),
    "ops/precision/void_buy_void_v7_protected_substrate_install_v3.py": ("100755", "4bf7c29dc32b6c358a3cd299055bf6c2ebe71c38", 36987),
    "ops/precision/void_buy_void_v7_protected_substrate_install_v4.py": ("100644", "0dc070665b2bb3a786e0e7d2a91a1a25326e2adc", 86934),
    "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v2.py": ("100755", "56a7ca798553766af525d9fb1ccbe58b70fe9c1d", 11949),
    "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v3.py": ("100644", "ea3c31180810ea4efe4341683742827dcf6ac5ac", 29366),
    "ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json": ("100644", "831f6e3f79a62a334662cebc6d2c39133bc7a309", 2756),
    "public/void/bootstrap/v2/manifests/voidpbm1_d91349b90ea46c066f18262247baf58f8b4fe5673e4a0446e4d6bf01cc7f6694.json": ("100644", "08d944e7a7b84059e2baf623d2ad7aa3f0cf55e5", 1166),
    "scripts/materialize_buy_void_v7_protected_substrate_v1.py": ("100755", "62d7427577a38fbd69c8405b66951cfb46a28b37", 4706),
    "scripts/materialize_buy_void_v7_protected_substrate_v2.py": ("100755", "474614da950db72082fb95a5174405ce8caf2513", 7922),
    "scripts/prove_buy_void_v7_materializer_v2_install_v3.py": ("100755", "c853547fe037ced8fbaa63da11987343c9f0ee4e", 4030),
    "scripts/prove_buy_void_v7_protected_substrate_install_v2.py": ("100755", "7d09250dab932971e18171d667bfb98994e05e7e", 7950),
    "scripts/prove_buy_void_v7_protected_substrate_install_v4.py": ("100644", "b730fb8a81880199e3bd36d5608b7b13564512b0", 24537),
    "scripts/prove_buy_void_v7_protected_substrate_source_proposal_v3.py": ("100755", "568bd08c6c3a120864a6b4f69a8d5b5cb41f5f72", 3464),
}

BASE_MODIFICATIONS: dict[
    str,
    tuple[tuple[str, str, int], tuple[str, str, int]],
] = {
    "public/bootstrap/tor-signed-v1.json": (
        ("100644", "82e964dae62873dd95c28c5791b12c9d678e8fab", 1844),
        ("100644", "5d74430ff5452d86044d0a1ae5c5f3af34e17a4a", 1844),
    ),
    "public/bootstrap/v1.json": (
        ("100644", "e0caed35ceadffaebba0257cefaa172fd2ee1164", 1166),
        ("100644", "08d944e7a7b84059e2baf623d2ad7aa3f0cf55e5", 1166),
    ),
    "scripts/prove_void_tor_bootstrap_manifest_candidate_v1.mjs": (
        ("100644", "44d998e55aea52dd20155d70d481737e73f6f9fa", 9980),
        ("100644", "3b2fc33060f58837ecda47b725a421779e7d3131", 10597),
    ),
}

RUNTIME_SENSITIVE_EQUAL: dict[str, str] = {
    "ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json": "bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b",
    "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c": "5021727f1def1ec11f870d735cab65acc1701a5e",
    "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs": "499df9b94b5b89354837570da0c7e47ec280025d",
    "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs": "14cbe81e27d04fee77cbe75225ce308bf8561a7b",
    "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py": "74c69fe8a95ed5f361a39971618f43f7c768c865",
}

MAX_GIT_OUTPUT = 32 * 1024 * 1024
MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_TOTAL_BYTES = 512 * 1024 * 1024
MAX_TRACKED = 50000


class CompatError(RuntimeError):
    pass


def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw)
    return h.hexdigest()


def _git_env() -> dict[str, str]:
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


def _git_args(root: Path, *args: str) -> list[str]:
    return [
        "/usr/bin/git",
        "-c", "safe.directory=" + str(root),
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.fsmonitor=false",
        "-c", "core.untrackedCache=false",
        "-c", "submodule.recurse=false",
        "--no-replace-objects",
        "-C", str(root),
        *args,
    ]


def _run_git(root: Path, *args: str, allowed: tuple[int, ...] = (0,)) -> bytes:
    label = args[0] if args else "unknown"
    try:
        cp = subprocess.run(
            _git_args(root, *args),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=_git_env(),
            timeout=30,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise CompatError("git_timeout:" + label) from exc
    except OSError as exc:
        raise CompatError(
            "git_exec_failed:"
            + label
            + ":errno_"
            + str(exc.errno if exc.errno is not None else "unknown")
        ) from exc
    if cp.returncode not in allowed:
        raise CompatError("git_failed:" + label)
    if cp.stderr:
        raise CompatError("git_stderr:" + label)
    if len(cp.stdout) > MAX_GIT_OUTPUT:
        raise CompatError("git_output_too_large")
    return cp.stdout


def _git_text(root: Path, *args: str) -> str:
    try:
        return _run_git(root, *args).decode("utf-8", "strict").strip()
    except UnicodeDecodeError as exc:
        raise CompatError("git_output_not_utf8") from exc


def _is_ancestor(root: Path, base: str, head: str) -> bool:
    try:
        cp = subprocess.run(
            _git_args(root, "merge-base", "--is-ancestor", base, head),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=_git_env(),
            timeout=20,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise CompatError("git_ancestor_probe_timeout") from exc
    except OSError as exc:
        raise CompatError(
            "git_ancestor_probe_exec_failed:errno_"
            + str(exc.errno if exc.errno is not None else "unknown")
        ) from exc
    if cp.returncode not in (0, 1) or cp.stdout or cp.stderr:
        raise CompatError("git_ancestor_probe_failed")
    return cp.returncode == 0


def _tree_entries(raw: bytes) -> dict[str, tuple[str, str, int]]:
    result: dict[str, tuple[str, str, int]] = {}
    for record in raw.split(b"\0"):
        if not record:
            continue
        try:
            meta, raw_path = record.split(b"\t", 1)
            mode_raw, kind_raw, oid_raw, size_raw = meta.split(b" ", 3)
            mode = mode_raw.decode("ascii")
            kind = kind_raw.decode("ascii")
            oid = oid_raw.decode("ascii")
            size = int(size_raw.decode("ascii"))
            path = raw_path.decode("utf-8")
        except (ValueError, UnicodeDecodeError) as exc:
            raise CompatError("tree_record_invalid") from exc
        if kind != "blob" or mode not in ("100644", "100755", "120000"):
            raise CompatError("tree_entry_kind_forbidden:" + path)
        if HEX40.fullmatch(oid) is None or size < 0 or size > MAX_FILE_BYTES:
            raise CompatError("tree_entry_identity_invalid:" + path)
        if path in result:
            raise CompatError("tree_duplicate_path:" + path)
        result[path] = (mode, oid, size)
        if len(result) > MAX_TRACKED:
            raise CompatError("tree_entry_limit")
    return result


def _index_entries(raw: bytes) -> dict[str, tuple[str, str]]:
    result: dict[str, tuple[str, str]] = {}
    for record in raw.split(b"\0"):
        if not record:
            continue
        try:
            meta, raw_path = record.split(b"\t", 1)
            mode_raw, oid_raw, stage_raw = meta.split(b" ", 2)
            mode = mode_raw.decode("ascii")
            oid = oid_raw.decode("ascii")
            stage = stage_raw.decode("ascii")
            path = raw_path.decode("utf-8")
        except (ValueError, UnicodeDecodeError) as exc:
            raise CompatError("index_record_invalid") from exc
        if stage != "0":
            raise CompatError("index_nonzero_stage:" + path)
        if mode not in ("100644", "100755", "120000") or HEX40.fullmatch(oid) is None:
            raise CompatError("index_entry_identity_invalid:" + path)
        if path in result:
            raise CompatError("index_duplicate_path:" + path)
        result[path] = (mode, oid)
    return result


def _verify_base_delta(
    runtime_entries: dict[str, tuple[str, str, int]],
    base_entries: dict[str, tuple[str, str, int]],
) -> None:
    expected = dict(runtime_entries)
    for path, identity in BASE_ADDITIONS.items():
        if path in expected:
            raise CompatError("base_add_collides_runtime:" + path)
        if base_entries.get(path) != identity:
            raise CompatError("base_add_identity_mismatch:" + path)
        expected[path] = identity
    for path, (runtime_identity, source_identity) in BASE_MODIFICATIONS.items():
        if runtime_entries.get(path) != runtime_identity:
            raise CompatError("base_modified_runtime_identity_mismatch:" + path)
        if base_entries.get(path) != source_identity:
            raise CompatError("base_modified_source_identity_mismatch:" + path)
        expected[path] = source_identity
    if base_entries != expected:
        raise CompatError("base_runtime_source_delta_not_exact")


def _verify_current_delta(
    base_entries: dict[str, tuple[str, str, int]],
    current_entries: dict[str, tuple[str, str, int]],
) -> None:
    expected = dict(base_entries)
    for path in SELF_ADDITIONS:
        if path in expected:
            raise CompatError("self_add_collides_base:" + path)
        identity = current_entries.get(path)
        if identity is None:
            raise CompatError("self_add_missing:" + path)
        expected[path] = identity
    if current_entries != expected:
        raise CompatError("current_source_delta_not_exact_self_additions")


def _verify_sensitive(
    runtime_entries: dict[str, tuple[str, str, int]],
    base_entries: dict[str, tuple[str, str, int]],
    current_entries: dict[str, tuple[str, str, int]],
) -> None:
    for path, expected_blob in RUNTIME_SENSITIVE_EQUAL.items():
        r = runtime_entries.get(path)
        b = base_entries.get(path)
        c = current_entries.get(path)
        if r is None or b is None or c is None:
            raise CompatError("runtime_sensitive_path_missing:" + path)
        if r[1] != expected_blob or b[1] != expected_blob or c[1] != expected_blob:
            raise CompatError("runtime_sensitive_blob_drift:" + path)
        if r != b or b != c:
            raise CompatError("runtime_sensitive_identity_drift:" + path)


def _stat_identity(st: os.stat_result) -> tuple[int, int, int, int, int, int, int]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_mode,
        st.st_nlink,
        st.st_size,
        st.st_mtime_ns,
        st.st_ctime_ns,
    )


def _ancestor_symlink_free(root: Path, path: Path) -> None:
    relative = path.relative_to(root)
    current = root
    for part in relative.parts[:-1]:
        current = current / part
        st = os.lstat(current)
        if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
            raise CompatError("tracked_ancestor_not_direct_directory:" + str(relative))


def _read_exact_worktree(
    root: Path,
    relative: str,
    identity: tuple[str, str, int],
) -> tuple[str, tuple[int, int, int, int, int, int, int], bytes | None]:
    mode, oid, size = identity
    path = root / relative
    try:
        _ancestor_symlink_free(root, path)
        st = os.lstat(path)
        if mode == "120000":
            if not stat.S_ISLNK(st.st_mode):
                raise CompatError("worktree_symlink_kind_mismatch:" + relative)
            raw = os.fsencode(os.readlink(path))
            if len(raw) != size or git_blob(raw) != oid:
                raise CompatError("worktree_symlink_identity_mismatch:" + relative)
            return ("L", _stat_identity(st), raw)
        if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode):
            raise CompatError("worktree_regular_kind_mismatch:" + relative)
        actual_mode = "100755" if (st.st_mode & 0o111) else "100644"
        if actual_mode != mode or st.st_size != size or st.st_nlink < 1:
            raise CompatError("worktree_regular_metadata_mismatch:" + relative)
        before = _stat_identity(st)
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
        try:
            opened = os.fstat(fd)
            if _stat_identity(opened) != before:
                raise CompatError("worktree_regular_rebound:" + relative)
            h = hashlib.sha1()
            h.update(b"blob " + str(size).encode("ascii") + b"\0")
            remaining = size
            while remaining:
                part = os.read(fd, min(1024 * 1024, remaining))
                if not part:
                    raise CompatError("worktree_regular_short_read:" + relative)
                h.update(part)
                remaining -= len(part)
            if os.read(fd, 1):
                raise CompatError("worktree_regular_grew:" + relative)
            after = os.fstat(fd)
            visible = os.lstat(path)
            if _stat_identity(after) != before or _stat_identity(visible) != before:
                raise CompatError("worktree_regular_generation_changed:" + relative)
            if h.hexdigest() != oid:
                raise CompatError("worktree_regular_blob_mismatch:" + relative)
            return ("F", before, None)
        finally:
            os.close(fd)
    except OSError as exc:
        raise CompatError(
            "worktree_observation_failed:"
            + relative
            + ":errno_"
            + str(exc.errno if exc.errno is not None else "unknown")
        ) from exc


def _terminal_revalidate_worktree(
    root: Path,
    fingerprints: dict[
        str,
        tuple[str, tuple[int, int, int, int, int, int, int], bytes | None],
    ],
) -> None:
    for relative, (kind, expected_stat, expected_target) in fingerprints.items():
        path = root / relative
        try:
            _ancestor_symlink_free(root, path)
            st = os.lstat(path)
            if _stat_identity(st) != expected_stat:
                raise CompatError("worktree_terminal_generation_changed:" + relative)
            if kind == "L":
                if not stat.S_ISLNK(st.st_mode):
                    raise CompatError("worktree_terminal_kind_changed:" + relative)
                if os.fsencode(os.readlink(path)) != expected_target:
                    raise CompatError("worktree_terminal_symlink_changed:" + relative)
            elif kind == "F":
                if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode):
                    raise CompatError("worktree_terminal_kind_changed:" + relative)
            else:
                raise CompatError("worktree_terminal_fingerprint_kind_invalid:" + relative)
        except OSError as exc:
            raise CompatError(
                "worktree_terminal_observation_failed:"
                + relative
                + ":errno_"
                + str(exc.errno if exc.errno is not None else "unknown")
            ) from exc


def _require_index_unchanged(initial: bytes, observed: bytes) -> None:
    if observed != initial:
        raise CompatError("checkout_index_generation_changed")


def verify_repository(root: Path, expected_head: str, require_main: bool) -> dict[str, object]:
    try:
        root = root.resolve(strict=True)
    except OSError as exc:
        raise CompatError(
            "checkout_root_observation_failed:errno_"
            + str(exc.errno if exc.errno is not None else "unknown")
        ) from exc
    if HEX40.fullmatch(expected_head) is None:
        raise CompatError("expected_head_invalid")
    if _git_text(root, "rev-parse", "--verify", "HEAD^{commit}") != expected_head:
        raise CompatError("checkout_head_mismatch")
    if require_main and _git_text(root, "branch", "--show-current") != "main":
        raise CompatError("checkout_branch_not_main")
    if not _is_ancestor(root, SOURCE_BASE_HEAD, expected_head):
        raise CompatError("source_base_not_ancestor")
    if _git_text(root, "rev-parse", RUNTIME_HEAD + "^{tree}") != RUNTIME_TREE:
        raise CompatError("runtime_tree_mismatch")
    if _git_text(root, "rev-parse", SOURCE_BASE_HEAD + "^{tree}") != SOURCE_BASE_TREE:
        raise CompatError("source_base_tree_mismatch")

    runtime_entries = _tree_entries(_run_git(root, "ls-tree", "-r", "-l", "-z", "--full-tree", RUNTIME_HEAD))
    base_entries = _tree_entries(_run_git(root, "ls-tree", "-r", "-l", "-z", "--full-tree", SOURCE_BASE_HEAD))
    current_entries = _tree_entries(_run_git(root, "ls-tree", "-r", "-l", "-z", "--full-tree", expected_head))
    _verify_base_delta(runtime_entries, base_entries)
    _verify_current_delta(base_entries, current_entries)
    _verify_sensitive(runtime_entries, base_entries, current_entries)

    index_query = ("ls-files", "--stage", "--full-name", "-z")
    raw_index = _run_git(root, *index_query)
    index_entries = _index_entries(raw_index)
    expected_index = {path: (mode, oid) for path, (mode, oid, _size) in current_entries.items()}
    if index_entries != expected_index:
        raise CompatError("checkout_index_tree_mismatch")

    total = 0
    fingerprints: dict[
        str,
        tuple[str, tuple[int, int, int, int, int, int, int], bytes | None],
    ] = {}
    for path, identity in current_entries.items():
        total += identity[2]
        if total > MAX_TOTAL_BYTES:
            raise CompatError("tracked_worktree_total_bytes_limit")
        fingerprints[path] = _read_exact_worktree(root, path, identity)

    _require_index_unchanged(raw_index, _run_git(root, *index_query))
    _terminal_revalidate_worktree(root, fingerprints)

    if _git_text(root, "rev-parse", "--verify", "HEAD^{commit}") != expected_head:
        raise CompatError("checkout_head_changed_terminal")
    if _git_text(root, "rev-parse", SOURCE_BASE_HEAD + "^{tree}") != SOURCE_BASE_TREE:
        raise CompatError("source_base_tree_changed_terminal")

    # Repeat both barriers after the terminal Git observations so drift during
    # the terminal phase cannot be reported as a stable GREEN generation.
    _require_index_unchanged(raw_index, _run_git(root, *index_query))
    _terminal_revalidate_worktree(root, fingerprints)

    return {
        "runtime_head": RUNTIME_HEAD,
        "runtime_tree": RUNTIME_TREE,
        "source_base_head": SOURCE_BASE_HEAD,
        "source_base_tree": SOURCE_BASE_TREE,
        "source_head": expected_head,
        "base_added_path_count": len(BASE_ADDITIONS),
        "base_modified_path_count": len(BASE_MODIFICATIONS),
        "compatibility_self_added_path_count": len(SELF_ADDITIONS),
        "runtime_sensitive_equal_path_count": len(RUNTIME_SENSITIVE_EQUAL),
        "tracked_source_checkout_exact": True,
        "runtime_source_exact_reviewed_delta": True,
        "canonical_checkout_mutation_performed": False,
        "filesystem_write_performed": False,
        "service_mutation": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "transaction_submission": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_or_liquidity_action": False,
        "funds_movement": False,
    }


def build_plan() -> dict[str, object]:
    body = {
        "schema": SCHEMA,
        "version": VERSION,
        "runtime_head": RUNTIME_HEAD,
        "runtime_tree": RUNTIME_TREE,
        "source_base_head": SOURCE_BASE_HEAD,
        "source_base_tree": SOURCE_BASE_TREE,
        "base_added_path_count": len(BASE_ADDITIONS),
        "base_modified_path_count": len(BASE_MODIFICATIONS),
        "base_modified_paths": sorted(BASE_MODIFICATIONS),
        "compatibility_self_added_paths": list(SELF_ADDITIONS),
        "runtime_sensitive_equal_paths": sorted(RUNTIME_SENSITIVE_EQUAL),
        "tracked_source_checkout_exact_required": True,
        "runtime_source_exact_reviewed_delta_required": True,
        "canonical_checkout_mutation_authorized": False,
        "filesystem_write_authorized": False,
        "service_mutation_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
    }
    return {
        "plan_id": "voidv7postmergecompat1_" + hashlib.sha256(canonical(body)).hexdigest(),
        "body": body,
    }


def self_test() -> None:
    assert len(BASE_ADDITIONS) == 21
    assert len(BASE_MODIFICATIONS) == 3
    assert len(SELF_ADDITIONS) == 4
    assert len(RUNTIME_SENSITIVE_EQUAL) == 5
    runtime = {
        "stable": ("100644", "a" * 40, 1),
        "modified": ("100644", "b" * 40, 2),
        "sensitive": ("100644", "c" * 40, 3),
    }
    saved_add = BASE_ADDITIONS.copy()
    saved_mod = BASE_MODIFICATIONS.copy()
    saved_sensitive = RUNTIME_SENSITIVE_EQUAL.copy()
    try:
        BASE_ADDITIONS.clear()
        BASE_ADDITIONS["added"] = ("100644", "d" * 40, 4)
        BASE_MODIFICATIONS.clear()
        BASE_MODIFICATIONS["modified"] = (("100644", "b" * 40, 2), ("100644", "e" * 40, 2))
        RUNTIME_SENSITIVE_EQUAL.clear()
        RUNTIME_SENSITIVE_EQUAL["sensitive"] = "c" * 40
        base = dict(runtime)
        base["added"] = ("100644", "d" * 40, 4)
        base["modified"] = ("100644", "e" * 40, 2)
        _verify_base_delta(runtime, base)
        current = dict(base)
        for index, path in enumerate(SELF_ADDITIONS):
            current[path] = ("100644", str(index) * 40, index + 5)
        _verify_current_delta(base, current)
        _verify_sensitive(runtime, base, current)
        bad = dict(current)
        bad["unexpected"] = ("100644", "f" * 40, 1)
        try:
            _verify_current_delta(base, bad)
        except CompatError:
            pass
        else:
            raise AssertionError("unexpected_current_path_not_rejected")
        bad_base = dict(base)
        bad_base["modified"] = ("100644", "f" * 40, 2)
        try:
            _verify_base_delta(runtime, bad_base)
        except CompatError:
            pass
        else:
            raise AssertionError("modified_path_drift_not_rejected")

        try:
            _require_index_unchanged(b"index-generation-a", b"index-generation-b")
        except CompatError:
            pass
        else:
            raise AssertionError("index_generation_drift_not_rejected")

        original_subprocess_run = subprocess.run
        try:
            def _timeout_run(*_args: object, **_kwargs: object) -> object:
                raise subprocess.TimeoutExpired(cmd=["git"], timeout=1)
            subprocess.run = _timeout_run  # type: ignore[assignment]
            try:
                _run_git(Path("/tmp"), "status")
            except CompatError as exc:
                assert str(exc) == "git_timeout:status"
            else:
                raise AssertionError("git_timeout_not_normalized_to_hold")
            try:
                _is_ancestor(Path("/tmp"), "a" * 40, "b" * 40)
            except CompatError as exc:
                assert str(exc) == "git_ancestor_probe_timeout"
            else:
                raise AssertionError("git_ancestor_timeout_not_normalized_to_hold")

            def _oserror_run(*_args: object, **_kwargs: object) -> object:
                raise OSError(5, "self-test git exec failure")
            subprocess.run = _oserror_run  # type: ignore[assignment]
            try:
                _run_git(Path("/tmp"), "status")
            except CompatError as exc:
                assert str(exc) == "git_exec_failed:status:errno_5"
            else:
                raise AssertionError("git_exec_error_not_normalized_to_hold")
            try:
                _is_ancestor(Path("/tmp"), "a" * 40, "b" * 40)
            except CompatError as exc:
                assert str(exc) == "git_ancestor_probe_exec_failed:errno_5"
            else:
                raise AssertionError("git_ancestor_exec_error_not_normalized_to_hold")
        finally:
            subprocess.run = original_subprocess_run  # type: ignore[assignment]

        import tempfile
        with tempfile.TemporaryDirectory(prefix="void-v7-postmerge-worktree-") as td:
            fixture_root = Path(td)
            tracked = fixture_root / "tracked.txt"
            tracked.write_bytes(b"A")
            tracked_identity = ("100644", git_blob(b"A"), 1)
            fingerprint = _read_exact_worktree(fixture_root, "tracked.txt", tracked_identity)
            tracked.write_bytes(b"B")
            try:
                _terminal_revalidate_worktree(
                    fixture_root, {"tracked.txt": fingerprint}
                )
            except CompatError:
                pass
            else:
                raise AssertionError("worktree_terminal_drift_not_rejected")

            missing = fixture_root / "missing.txt"
            try:
                _read_exact_worktree(
                    fixture_root,
                    "missing.txt",
                    ("100644", git_blob(b"M"), 1),
                )
            except CompatError as exc:
                assert str(exc).startswith("worktree_observation_failed:missing.txt:")
            else:
                raise AssertionError("missing_tracked_path_not_normalized_to_hold")
    finally:
        BASE_ADDITIONS.clear()
        BASE_ADDITIONS.update(saved_add)
        BASE_MODIFICATIONS.clear()
        BASE_MODIFICATIONS.update(saved_mod)
        RUNTIME_SENSITIVE_EQUAL.clear()
        RUNTIME_SENSITIVE_EQUAL.update(saved_sensitive)
    print(MARKER + "_SELF_TEST_GREEN")
    print("runtime_to_source_base_exact_21_add_3_modify_required=true")
    print("compatibility_self_scope_exact_four_additions_required=true")
    print("runtime_sensitive_five_path_identity_equality_required=true")
    print("tracked_source_checkout_exact_required=true")
    print("terminal_index_generation_revalidation_required=true")
    print("terminal_worktree_generation_revalidation_required=true")
    print("worktree_filesystem_errors_normalized_to_hold=true")
    print("git_timeout_normalized_to_hold=true")
    print("git_exec_errors_normalized_to_hold=true")
    print("git_ancestor_timeout_normalized_to_hold=true")
    print("git_ancestor_exec_errors_normalized_to_hold=true")
    print("canonical_checkout_mutation_authorized=false")
    print("filesystem_write_authorized=false")
    print("service_mutation_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("funds_movement_authorized=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--verify", action="store_true")
    parser.add_argument("--checkout", type=Path, default=Path.cwd())
    parser.add_argument("--expected-head", default="")
    parser.add_argument("--require-main", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.plan:
        print(MARKER)
        print("mode=plan")
        print("source_only=true")
        print("plan_json=" + canonical(build_plan()).decode("ascii"))
        return 0
    if not args.expected_head:
        raise CompatError("expected_head_required")
    result = verify_repository(args.checkout, args.expected_head, args.require_main)
    print(MARKER)
    print("status=GREEN")
    print("evidence_json=" + canonical(result).decode("ascii"))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CompatError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + re.sub(r"[^A-Za-z0-9_:./-]", "_", str(exc)[:1000]))
        print("canonical_checkout_mutation_performed=false")
        print("filesystem_write_performed=false")
        print("service_mutation=false")
        print("credential_access=false")
        print("signing=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
