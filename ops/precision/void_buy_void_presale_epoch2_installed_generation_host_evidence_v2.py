#!/usr/bin/env python3

# Enforce isolation before any shadowable standard-library import.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = (
    "VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V2"
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
import stat
import sys
import types
from typing import Any

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_presale_epoch2_installed_generation_host_evidence_v2"
VERSION = 2
PARENT_PLAN_ID = (
    "voidbuyhostevplan1_"
    "665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab"
)
BASE_NAME = "void_buy_void_presale_epoch2_installed_generation_host_evidence_v1.py"
BASE_GIT_BLOB_SHA1 = "6b2bf387bff5e5cd6ada048fd5c8fe4d28d66577"
BASE_MARKER = "VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V1"
BASE_SCHEMA = "void_buy_void_presale_epoch2_installed_generation_host_evidence_v1"
FIXED_CHECKOUT = Path("/home/zoso/dev/void-node")
MAX_BASE_SOURCE_BYTES = 2 * 1024 * 1024
HEX40 = re.compile(r"^[0-9a-f]{40}$")


class EvidenceError(RuntimeError):
    pass


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return all(
        getattr(a, field) == getattr(b, field)
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
        )
    )


def _require_isolated_python() -> None:
    if sys.flags.isolated != 1 or not getattr(sys.flags, "safe_path", False):
        raise EvidenceError("python_isolated_mode_required")
    source_checkout = Path(__file__).resolve(strict=False).parents[2]
    protected_roots = (
        source_checkout,
        FIXED_CHECKOUT.resolve(strict=False),
    )
    for entry in sys.path:
        if not isinstance(entry, str) or entry == "":
            raise EvidenceError("python_path_not_isolated")
        candidate = Path(entry).resolve(strict=False)
        if any(
            candidate == protected or protected in candidate.parents
            for protected in protected_roots
        ):
            raise EvidenceError("python_path_source_checkout_exposure")


def _open_parent_nofollow(path: Path) -> int:
    if not path.is_absolute() or not path.name or ".." in path.parts:
        raise EvidenceError("base_source_path_invalid")
    flags = os.O_PATH | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
    fd = os.open("/", flags)
    try:
        for component in path.parts[1:-1]:
            child = os.open(component, flags, dir_fd=fd)
            os.close(fd)
            fd = child
            metadata = os.fstat(fd)
            if not stat.S_ISDIR(metadata.st_mode) or stat.S_ISLNK(metadata.st_mode):
                raise EvidenceError("base_source_ancestor_invalid")
        return fd
    except BaseException:
        os.close(fd)
        raise


def _read_exact_base_source(path: Path) -> bytes:
    parent_fd = file_fd = visible_parent_fd = -1
    try:
        parent_fd = _open_parent_nofollow(path)
        parent_before = os.fstat(parent_fd)
        file_fd = os.open(
            path.name,
            os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
            dir_fd=parent_fd,
        )
        before = os.fstat(file_fd)
        if (
            not stat.S_ISREG(before.st_mode)
            or before.st_nlink != 1
            or before.st_size < 1
            or before.st_size > MAX_BASE_SOURCE_BYTES
        ):
            raise EvidenceError("base_source_metadata_invalid")
        chunks: list[bytes] = []
        remaining = before.st_size + 1
        while remaining > 0:
            chunk = os.read(file_fd, min(64 * 1024, remaining))
            if not chunk:
                break
            chunks.append(chunk)
            remaining -= len(chunk)
        raw = b"".join(chunks)
        if len(raw) != before.st_size:
            raise EvidenceError("base_source_size_changed")
        after = os.fstat(file_fd)
        if not _same_stat(before, after):
            raise EvidenceError("base_source_generation_changed")
        visible_parent_fd = _open_parent_nofollow(path)
        if not _same_stat(parent_before, os.fstat(visible_parent_fd)):
            raise EvidenceError("base_source_parent_changed")
        visible = os.stat(path.name, dir_fd=visible_parent_fd, follow_symlinks=False)
        if not _same_stat(after, visible) or stat.S_ISLNK(visible.st_mode):
            raise EvidenceError("base_source_visible_generation_changed")
        if git_blob(raw) != BASE_GIT_BLOB_SHA1:
            raise EvidenceError("base_source_blob_mismatch")
        return raw
    except OSError as exc:
        raise EvidenceError("base_source_unavailable") from exc
    finally:
        for fd in (visible_parent_fd, file_fd, parent_fd):
            if fd >= 0:
                os.close(fd)


def _verify_tracked_checkout_bytes(base: types.ModuleType, expected_head: str) -> None:
    """Authenticate only tracked source bytes; untracked host data is not authority."""
    if HEX40.fullmatch(expected_head) is None:
        raise EvidenceError("expected_head_invalid")
    tree_query = ["ls-tree", "-r", "-l", "-z", "--full-tree", expected_head]
    index_query = ["ls-files", "--stage", "--full-name", "-z"]
    raw_tree = base._git(tree_query)
    raw_index = base._git(index_query)
    entries: dict[str, tuple[str, str, int]] = {}
    total = 0
    try:
        for record in base._checkout_records(raw_tree):
            header, name = record.split(b"\t", 1)
            mode, kind, blob, size_raw = header.decode("ascii").split()
            relative = base._checkout_path(name)
            if mode not in ("100644", "100755") or kind != "blob":
                raise EvidenceError("checkout_entry_type_unsupported")
            if HEX40.fullmatch(blob) is None or not size_raw.isdecimal():
                raise EvidenceError("checkout_tree_record_invalid")
            size = int(size_raw)
            total += size
            if (
                size > base.MAX_CHECKOUT_FILE_BYTES
                or total > base.MAX_CHECKOUT_TOTAL_BYTES
            ):
                raise EvidenceError("checkout_content_limit")
            if relative in entries:
                raise EvidenceError("checkout_duplicate_path")
            entries[relative] = (mode, blob, size)

        index: dict[str, tuple[str, str]] = {}
        for record in base._checkout_records(raw_index):
            header, name = record.split(b"\t", 1)
            mode, blob, stage = header.decode("ascii").split()
            relative = base._checkout_path(name)
            if stage != "0" or relative in index:
                raise EvidenceError("checkout_index_unmerged_or_duplicate")
            index[relative] = (mode, blob)
    except (ValueError, UnicodeError) as exc:
        raise EvidenceError("checkout_listing_invalid") from exc

    expected_index = {
        relative: (entry[0], entry[1]) for relative, entry in entries.items()
    }
    if not entries or index != expected_index:
        raise EvidenceError("checkout_index_differs_from_head")

    for relative, (mode, blob, size) in entries.items():
        raw = base._read_visible_file(
            base.FIXED_CHECKOUT / relative,
            size,
            base.MAX_CHECKOUT_FILE_BYTES,
            mode,
        )
        if base.git_blob(raw) != blob:
            raise EvidenceError("checkout_worktree_bytes_mismatch")

    if (
        base._git_text(["rev-parse", "--verify", "HEAD^{commit}"]).removesuffix("\n")
        != expected_head
        or base._main_branch() != "main"
        or base._git(index_query) != raw_index
    ):
        raise EvidenceError("checkout_generation_changed")


def _load_patched_base_module() -> types.ModuleType:
    _require_isolated_python()
    source_path = Path(__file__).absolute().with_name(BASE_NAME)
    raw = _read_exact_base_source(source_path)
    module = types.ModuleType("void_presale_epoch2_installed_generation_host_evidence_v1_exact")
    module.__file__ = str(source_path)
    module.__package__ = ""
    try:
        exec(
            compile(raw.decode("utf-8", "strict"), str(source_path), "exec", dont_inherit=True),
            module.__dict__,
        )
    except Exception as exc:
        raise EvidenceError("base_source_execution_failed") from exc

    if (
        getattr(module, "MARKER", None) != BASE_MARKER
        or getattr(module, "SCHEMA", None) != BASE_SCHEMA
        or getattr(module, "PARENT_PLAN_ID", None) != PARENT_PLAN_ID
        or getattr(module, "FIXED_CHECKOUT", None) != FIXED_CHECKOUT
        or not callable(getattr(module, "_verify_checkout_bytes", None))
        or not callable(getattr(module, "checkout_snapshot", None))
        or not callable(getattr(module, "collect", None))
    ):
        raise EvidenceError("base_source_contract_invalid")

    original_checkout_snapshot = module.checkout_snapshot

    def tracked_verifier(expected_head: str) -> None:
        _verify_tracked_checkout_bytes(module, expected_head)

    def tracked_snapshot(expected_head: str) -> dict[str, Any]:
        observed = original_checkout_snapshot(expected_head)
        if (
            not isinstance(observed, dict)
            or observed.get("head") != expected_head
            or observed.get("branch") != "main"
            or HEX40.fullmatch(str(observed.get("tree", ""))) is None
        ):
            raise EvidenceError("base_checkout_snapshot_invalid")
        return {
            "head": observed["head"],
            "tree": observed["tree"],
            "branch": observed["branch"],
            "tracked_source_exact": True,
            "untracked_paths_enumerated": False,
            "untracked_paths_source_authority": False,
        }

    module._verify_checkout_bytes = tracked_verifier
    module.checkout_snapshot = tracked_snapshot
    return module


def _validate_base_result(result: object, expected_head: str) -> dict[str, Any]:
    if not isinstance(result, dict):
        raise EvidenceError("base_result_not_object")
    if (
        result.get("marker") != BASE_MARKER
        or result.get("schema") != BASE_SCHEMA
        or result.get("version") != 1
        or result.get("expected_head") != expected_head
        or result.get("epoch2_installed_generation_qualified") is not True
        or result.get("filesystem_write_performed") is not False
        or result.get("runner_execution") is not False
        or result.get("live_composition_execution") is not False
        or result.get("service_mutation") is not False
        or result.get("network_contact") is not False
        or result.get("credential_access") is not False
        or result.get("private_key_access") is not False
        or result.get("wallet_or_signer_access") is not False
        or result.get("signing") is not False
        or result.get("transaction_submission") is not False
        or result.get("payment_acceptance") is not False
        or result.get("public_presale_activation") is not False
        or result.get("wc_void_market_activation") is not False
        or result.get("treasury_or_liquidity_action") is not False
        or result.get("funds_movement") is not False
        or result.get("production_host_evidence_authority") is not False
    ):
        raise EvidenceError("base_result_contract_invalid")
    return result


def collect(expected_head: str) -> dict[str, Any]:
    _require_isolated_python()
    if HEX40.fullmatch(expected_head) is None:
        raise EvidenceError("expected_head_invalid")
    if os.geteuid() != 0:
        raise EvidenceError("root_required_for_epoch2_host_evidence")
    base = _load_patched_base_module()
    try:
        base_result = base.collect(expected_head)
    except Exception as exc:
        raise EvidenceError("base_v1_collection_failed:" + str(exc)) from exc
    result = dict(_validate_base_result(base_result, expected_head))
    result.update(
        {
            "schema": SCHEMA,
            "marker": MARKER,
            "version": VERSION,
            "status": (
                "EPOCH2_INSTALLED_GENERATION_EVIDENCE_V2_GREEN_"
                "PRODUCTION_AUTHORITY_STILL_HOLD"
            ),
            "base_v1_source_git_blob_sha1": BASE_GIT_BLOB_SHA1,
            "tracked_source_checkout_exact": True,
            "untracked_paths_enumerated": False,
            "untracked_paths_source_authority": False,
            "checkout_clean_claimed": False,
        }
    )
    return result


def self_test() -> None:
    _require_isolated_python()
    base = _load_patched_base_module()
    if base.PARENT_PLAN_ID != PARENT_PLAN_ID:
        raise EvidenceError("parent_plan_mismatch")
    print(MARKER + "_SELF_TEST_GREEN")
    print("parent_host_evidence_plan_bound=true")
    print("exact_base_v1_source_blob_bound=true")
    print("base_v1_source_descriptor_bound=true")
    print("base_v1_source_ancestor_symlinks_rejected=true")
    print("tracked_tree_index_worktree_equality_required=true")
    print("delegated_original_status_bypassed=true")
    print("untracked_paths_enumerated=false")
    print("untracked_paths_source_authority=false")
    print("checkout_clean_claimed=false")
    print("isolated_loader_blocks_checkout_shadow_modules=true")
    print("checkout_root_sys_path_guard_enabled=true")
    print("fixed_checkout_sys_path_guard_enabled=true")
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
    print(
        json.dumps(
            collect(args.expected_head),
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
        )
    )
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
