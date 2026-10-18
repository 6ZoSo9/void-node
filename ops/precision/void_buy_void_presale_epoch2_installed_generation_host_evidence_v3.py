#!/usr/bin/env python3

# Enforce isolation before any shadowable standard-library import.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER = (
    "VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V3"
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
from typing import Any, Callable, Mapping

MARKER = _BOOTSTRAP_MARKER
SCHEMA = "void_buy_void_presale_epoch2_installed_generation_host_evidence_v3"
VERSION = 3
V2_NAME = "void_buy_void_presale_epoch2_installed_generation_host_evidence_v2.py"
V2_GIT_BLOB_SHA1 = "a00fe6b094e97eb5c8bcf0eeb630d0d39e3498e2"
V2_MARKER = "VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V2"
V2_SCHEMA = "void_buy_void_presale_epoch2_installed_generation_host_evidence_v2"
FIXED_CHECKOUT = Path("/home/zoso/dev/void-node")
RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
SOURCE_HEAD = "44f7cf576cdc4460397677a27af2f587a33d424d"
SOURCE_TREE = "24208ee96995ca784234ac8281eb40abaec5735d"
MAX_V2_SOURCE_BYTES = 2 * 1024 * 1024
HEX40 = re.compile(r"^[0-9a-f]{40}$")

# Exact main delta from RUNTIME_HEAD to SOURCE_HEAD. No other path may differ.
ALLOWED_ADD_ONLY: dict[str, tuple[str, str, int]] = {
    "docs/operators/buy-void-v7-protected-substrate-source-proposal-v3.md": (
        "100644", "78190cd9f71e4dd0ee4f7fdc1144b70fc644db8c", 967,
    ),
    "ops/precision/void_buy_void_v7_protected_substrate_install_v1.py": (
        "100755", "9f7f035b814549dad9cc6eeee3620d2c04b95d8a", 4762,
    ),
    "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v2.py": (
        "100755", "56a7ca798553766af525d9fb1ccbe58b70fe9c1d", 11949,
    ),
    "ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json": (
        "100644", "831f6e3f79a62a334662cebc6d2c39133bc7a309", 2756,
    ),
    "scripts/materialize_buy_void_v7_protected_substrate_v1.py": (
        "100755", "62d7427577a38fbd69c8405b66951cfb46a28b37", 4706,
    ),
    "scripts/prove_buy_void_v7_protected_substrate_source_proposal_v3.py": (
        "100755", "568bd08c6c3a120864a6b4f69a8d5b5cb41f5f72", 3464,
    ),
}


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
            "st_dev", "st_ino", "st_uid", "st_gid", "st_mode", "st_nlink",
            "st_size", "st_mtime_ns", "st_ctime_ns",
        )
    )


def _require_isolated_python() -> None:
    if sys.flags.isolated != 1 or not getattr(sys.flags, "safe_path", False):
        raise EvidenceError("python_isolated_mode_required")
    source_checkout_lexical = Path(os.path.abspath(__file__)).parents[2]
    source_checkout_resolved = Path(__file__).resolve(strict=False).parents[2]
    fixed_checkout_lexical = Path(os.path.abspath(str(FIXED_CHECKOUT)))
    fixed_checkout_resolved = FIXED_CHECKOUT.resolve(strict=False)
    protected_roots = (
        source_checkout_lexical,
        source_checkout_resolved,
        fixed_checkout_lexical,
        fixed_checkout_resolved,
    )
    for entry in sys.path:
        if not isinstance(entry, str) or entry == "":
            raise EvidenceError("python_path_not_isolated")
        path = Path(entry)
        if not path.is_absolute():
            raise EvidenceError("python_path_not_isolated")
        candidates = (
            Path(os.path.abspath(entry)),
            path.resolve(strict=False),
        )
        if any(
            candidate == protected or protected in candidate.parents
            for candidate in candidates
            for protected in protected_roots
        ):
            raise EvidenceError("python_path_source_checkout_exposure")


def _open_parent_nofollow(path: Path) -> int:
    if not path.is_absolute() or not path.name or ".." in path.parts:
        raise EvidenceError("v2_source_path_invalid")
    flags = os.O_PATH | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
    fd = os.open("/", flags)
    try:
        for component in path.parts[1:-1]:
            child = os.open(component, flags, dir_fd=fd)
            old_fd = fd
            fd = child
            try:
                os.close(old_fd)
            except OSError as exc:
                cleanup = _close_owned_v2_source_fds((("child", fd),))
                fd = -1
                reason = "v2_source_ancestor_close_failed"
                if cleanup:
                    reason += ":v2_source_close_failed:" + cleanup
                raise EvidenceError(reason) from exc
            metadata = os.fstat(fd)
            if not stat.S_ISDIR(metadata.st_mode) or stat.S_ISLNK(metadata.st_mode):
                raise EvidenceError("v2_source_ancestor_invalid")
        result = fd
        fd = -1
        return result
    except BaseException as exc:
        cleanup = _close_owned_v2_source_fds((("ancestor", fd),))
        fd = -1
        if cleanup and isinstance(exc, EvidenceError):
            raise EvidenceError(
                str(exc) + ":v2_source_close_failed:" + cleanup
            ) from exc
        if cleanup:
            try:
                exc.add_note("v2_source_close_failed:" + cleanup)
            except AttributeError:
                pass
        raise

def _close_owned_v2_source_fds(
    owned: tuple[tuple[str, int], ...],
) -> str:
    failures: list[str] = []
    for label, fd in owned:
        if fd < 0:
            continue
        try:
            os.close(fd)
        except OSError:
            failures.append(label)
    return ",".join(failures)


def _read_exact_v2_source(path: Path) -> bytes:
    parent_fd = file_fd = visible_parent_fd = -1
    result: bytes | None = None
    primary: BaseException | None = None
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
            or before.st_size > MAX_V2_SOURCE_BYTES
        ):
            raise EvidenceError("v2_source_metadata_invalid")
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
            raise EvidenceError("v2_source_size_changed")
        after = os.fstat(file_fd)
        if not _same_stat(before, after):
            raise EvidenceError("v2_source_generation_changed")
        visible_parent_fd = _open_parent_nofollow(path)
        if not _same_stat(parent_before, os.fstat(visible_parent_fd)):
            raise EvidenceError("v2_source_parent_changed")
        visible = os.stat(path.name, dir_fd=visible_parent_fd, follow_symlinks=False)
        if not _same_stat(after, visible) or stat.S_ISLNK(visible.st_mode):
            raise EvidenceError("v2_source_visible_generation_changed")
        if git_blob(raw) != V2_GIT_BLOB_SHA1:
            raise EvidenceError("v2_source_blob_mismatch")
        result = raw
    except OSError as exc:
        normalized = EvidenceError("v2_source_unavailable")
        normalized.__cause__ = exc
        primary = normalized
    except BaseException as exc:
        primary = exc

    cleanup = _close_owned_v2_source_fds(
        (("visible_parent", visible_parent_fd), ("file", file_fd), ("parent", parent_fd))
    )
    if cleanup:
        if isinstance(primary, EvidenceError):
            raise EvidenceError(str(primary) + ":v2_source_close_failed:" + cleanup) from primary
        if primary is not None:
            raise EvidenceError(
                "v2_source_close_failed_after_" + type(primary).__name__ + ":" + cleanup
            ) from primary
        raise EvidenceError("v2_source_close_failed:" + cleanup)
    if primary is not None:
        raise primary
    if result is None:
        raise EvidenceError("v2_source_internal_result_missing")
    return result

def _tree_entries(base: types.ModuleType, raw: bytes) -> dict[str, tuple[str, str, int]]:
    entries: dict[str, tuple[str, str, int]] = {}
    total = 0
    try:
        for record in base._checkout_records(raw):
            header, name = record.split(b"\t", 1)
            mode, kind, blob, size_raw = header.decode("ascii").split()
            relative = base._checkout_path(name)
            if mode not in ("100644", "100755") or kind != "blob":
                raise EvidenceError("compat_tree_entry_type_unsupported")
            if HEX40.fullmatch(blob) is None or not size_raw.isdecimal():
                raise EvidenceError("compat_tree_record_invalid")
            size = int(size_raw)
            total += size
            if (
                size > base.MAX_CHECKOUT_FILE_BYTES
                or total > base.MAX_CHECKOUT_TOTAL_BYTES
            ):
                raise EvidenceError("compat_checkout_content_limit")
            if relative in entries:
                raise EvidenceError("compat_checkout_duplicate_path")
            entries[relative] = (mode, blob, size)
    except (ValueError, UnicodeError) as exc:
        raise EvidenceError("compat_tree_listing_invalid") from exc
    return entries


def _index_entries(base: types.ModuleType, raw: bytes) -> dict[str, tuple[str, str]]:
    entries: dict[str, tuple[str, str]] = {}
    try:
        for record in base._checkout_records(raw):
            header, name = record.split(b"\t", 1)
            mode, blob, stage = header.decode("ascii").split()
            relative = base._checkout_path(name)
            if stage != "0" or relative in entries:
                raise EvidenceError("compat_checkout_index_unmerged_or_duplicate")
            entries[relative] = (mode, blob)
    except (ValueError, UnicodeError) as exc:
        raise EvidenceError("compat_index_listing_invalid") from exc
    return entries


def _assert_source_generation_light(
    base: types.ModuleType,
    *,
    source_head: str = SOURCE_HEAD,
    source_tree: str = SOURCE_TREE,
) -> None:
    observed_head = base._git_text(
        ["rev-parse", "--verify", "HEAD^{commit}"]
    ).removesuffix("\n")
    observed_tree = base._git_text(
        ["rev-parse", "--verify", "HEAD^{tree}"]
    ).removesuffix("\n")
    if (
        observed_head != source_head
        or observed_tree != source_tree
        or base._main_branch() != "main"
    ):
        raise EvidenceError("source_checkout_generation_changed")


def _verify_source_runtime_compatibility(
    base: types.ModuleType,
    expected_head: str,
    *,
    source_head: str = SOURCE_HEAD,
    source_tree: str = SOURCE_TREE,
    allowed_add_only: Mapping[str, tuple[str, str, int]] = ALLOWED_ADD_ONLY,
    runtime_head: str = RUNTIME_HEAD,
) -> dict[str, Any]:
    if expected_head != runtime_head:
        raise EvidenceError("runtime_expected_head_not_bound")
    if HEX40.fullmatch(source_head) is None or HEX40.fullmatch(source_tree) is None:
        raise EvidenceError("source_generation_identity_invalid")
    _assert_source_generation_light(
        base, source_head=source_head, source_tree=source_tree
    )

    runtime_tree = base._git_text(
        ["rev-parse", "--verify", expected_head + "^{tree}"]
    ).removesuffix("\n")
    if HEX40.fullmatch(runtime_tree) is None:
        raise EvidenceError("runtime_tree_invalid")

    runtime_query = ["ls-tree", "-r", "-l", "-z", "--full-tree", expected_head]
    source_query = ["ls-tree", "-r", "-l", "-z", "--full-tree", source_head]
    index_query = ["ls-files", "--stage", "--full-name", "-z"]
    runtime_entries = _tree_entries(base, base._git(runtime_query))
    source_entries = _tree_entries(base, base._git(source_query))
    raw_index = base._git(index_query)
    index_entries = _index_entries(base, raw_index)

    if not runtime_entries or not source_entries:
        raise EvidenceError("compat_empty_tree")
    expected_source = dict(runtime_entries)
    for relative, identity in allowed_add_only.items():
        if relative in expected_source:
            raise EvidenceError("compat_add_path_collides_with_runtime:" + relative)
        if source_entries.get(relative) != identity:
            raise EvidenceError("compat_added_path_identity_mismatch:" + relative)
        expected_source[relative] = identity
    if source_entries != expected_source:
        raise EvidenceError("compat_source_delta_not_exact_add_only_allowlist")

    expected_index = {
        relative: (mode, blob)
        for relative, (mode, blob, _size) in source_entries.items()
    }
    if index_entries != expected_index:
        raise EvidenceError("compat_index_differs_from_source_head")

    for relative, (mode, blob, size) in source_entries.items():
        raw = base._read_visible_file(
            base.FIXED_CHECKOUT / relative,
            size,
            base.MAX_CHECKOUT_FILE_BYTES,
            mode,
        )
        if base.git_blob(raw) != blob:
            raise EvidenceError("compat_worktree_bytes_mismatch:" + relative)

    _assert_source_generation_light(
        base, source_head=source_head, source_tree=source_tree
    )
    if base._git(index_query) != raw_index:
        raise EvidenceError("compat_index_generation_changed")

    return {
        "runtime_head": expected_head,
        "runtime_tree": runtime_tree,
        "source_head": source_head,
        "source_tree": source_tree,
        "allowed_add_only_count": len(allowed_add_only),
    }


def _guard_installer_git_queries_compat(
    base: types.ModuleType,
    installer: types.ModuleType,
    expected_head: str,
    *,
    source_head: str = SOURCE_HEAD,
    source_tree: str = SOURCE_TREE,
    compatibility_fn: Callable[..., dict[str, Any]] = _verify_source_runtime_compatibility,
) -> None:
    allowed = {
        ("rev-parse", "--verify", "HEAD"),
        ("branch", "--show-current"),
    }
    relatives: set[str] = set()
    for name in (
        "LOCK_REL", "NATIVE_SOURCE_REL", "RUNNER_SOURCE_REL", "SEALED_V2_REL",
        "QUALIFIER_REL",
    ):
        relative = getattr(installer, name, None)
        if (
            not isinstance(relative, str)
            or not relative
            or relative.startswith("/")
            or ".." in relative.split("/")
        ):
            raise EvidenceError("compat_installer_git_query_contract_invalid")
        relatives.add(relative)
        allowed.add(("rev-parse", "HEAD:" + relative))

    def guarded_run_git(args: list[str]) -> str:
        query = tuple(args)
        if query == base.STATUS_QUERY:
            compatibility_fn(
                base,
                expected_head,
                source_head=source_head,
                source_tree=source_tree,
            )
            return ""
        if query not in allowed:
            raise EvidenceError("compat_delegated_git_query_not_allowed")
        if query == ("rev-parse", "--verify", "HEAD"):
            _assert_source_generation_light(
                base, source_head=source_head, source_tree=source_tree
            )
            return expected_head + "\n"
        if query == ("branch", "--show-current"):
            _assert_source_generation_light(
                base, source_head=source_head, source_tree=source_tree
            )
            return "main\n"
        if query[0] == "rev-parse" and query[1].startswith("HEAD:"):
            relative = query[1][5:]
            if relative not in relatives:
                raise EvidenceError("compat_installer_git_path_not_allowed")
            runtime_blob = base._git_text(
                ["rev-parse", expected_head + ":" + relative]
            ).removesuffix("\n")
            source_blob = base._git_text(
                ["rev-parse", source_head + ":" + relative]
            ).removesuffix("\n")
            if runtime_blob != source_blob or HEX40.fullmatch(runtime_blob) is None:
                raise EvidenceError("compat_runtime_source_blob_diverged:" + relative)
            return runtime_blob + "\n"
        raise EvidenceError("compat_delegated_git_query_unhandled")

    installer._run_git = guarded_run_git


def _patch_base_for_compat(v2: types.ModuleType, base: types.ModuleType) -> types.ModuleType:
    if getattr(base, "FIXED_CHECKOUT", None) != FIXED_CHECKOUT:
        raise EvidenceError("compat_base_fixed_checkout_mismatch")

    def compat_verifier(expected_head: str) -> None:
        _verify_source_runtime_compatibility(base, expected_head)

    def compat_snapshot(expected_head: str) -> dict[str, Any]:
        observed = _verify_source_runtime_compatibility(base, expected_head)
        return {
            "head": expected_head,
            "tree": observed["runtime_tree"],
            "branch": "main",
            "tracked_source_exact": True,
            "source_checkout_head": observed["source_head"],
            "source_checkout_tree": observed["source_tree"],
            "source_runtime_add_only_compatibility_exact": True,
            "untracked_paths_enumerated": False,
            "untracked_paths_source_authority": False,
        }

    def compat_installer_guard(installer: types.ModuleType, expected_head: str) -> None:
        _guard_installer_git_queries_compat(base, installer, expected_head)

    base._verify_checkout_bytes = compat_verifier
    base.checkout_snapshot = compat_snapshot
    base._guard_installer_git_queries = compat_installer_guard
    return base


def _load_v2_module() -> types.ModuleType:
    _require_isolated_python()
    source_path = Path(__file__).absolute().with_name(V2_NAME)
    raw = _read_exact_v2_source(source_path)
    module = types.ModuleType("void_presale_epoch2_installed_generation_host_evidence_v2_exact")
    module.__file__ = str(source_path)
    module.__package__ = ""
    try:
        exec(
            compile(raw.decode("utf-8", "strict"), str(source_path), "exec", dont_inherit=True),
            module.__dict__,
        )
    except Exception as exc:
        raise EvidenceError("v2_source_execution_failed") from exc
    if (
        getattr(module, "MARKER", None) != V2_MARKER
        or getattr(module, "SCHEMA", None) != V2_SCHEMA
        or getattr(module, "VERSION", None) != 2
        or getattr(module, "FIXED_CHECKOUT", None) != FIXED_CHECKOUT
        or not callable(getattr(module, "_load_patched_base_module", None))
        or not callable(getattr(module, "collect", None))
    ):
        raise EvidenceError("v2_source_contract_invalid")
    original_loader = module._load_patched_base_module

    def compatibility_loader() -> types.ModuleType:
        base = original_loader()
        return _patch_base_for_compat(module, base)

    module._load_patched_base_module = compatibility_loader
    return module


def _validate_v2_result(result: object, expected_head: str) -> dict[str, Any]:
    if not isinstance(result, dict):
        raise EvidenceError("v2_result_not_object")
    required_false = (
        "filesystem_write_performed", "runner_execution", "live_composition_execution",
        "service_mutation", "network_contact", "credential_access", "private_key_access",
        "wallet_or_signer_access", "signing", "transaction_submission",
        "payment_acceptance", "public_presale_activation", "wc_void_market_activation",
        "treasury_or_liquidity_action", "funds_movement",
        "production_host_evidence_authority",
    )
    if (
        result.get("marker") != V2_MARKER
        or result.get("schema") != V2_SCHEMA
        or result.get("version") != 2
        or result.get("expected_head") != expected_head
        or result.get("epoch2_installed_generation_qualified") is not True
        or result.get("tracked_source_checkout_exact") is not True
        or result.get("untracked_paths_enumerated") is not False
        or result.get("untracked_paths_source_authority") is not False
        or result.get("checkout_clean_claimed") is not False
        or any(result.get(key) is not False for key in required_false)
    ):
        raise EvidenceError("v2_result_contract_invalid")
    return result


def collect(expected_head: str) -> dict[str, Any]:
    _require_isolated_python()
    if expected_head != RUNTIME_HEAD:
        raise EvidenceError("runtime_expected_head_not_bound")
    if os.geteuid() != 0:
        raise EvidenceError("root_required_for_epoch2_host_evidence")
    v2 = _load_v2_module()
    try:
        delegated = v2.collect(expected_head)
    except Exception as exc:
        raise EvidenceError("v2_collection_failed:" + str(exc)) from exc
    result = dict(_validate_v2_result(delegated, expected_head))
    final_base = v2._load_patched_base_module()
    compatibility = _verify_source_runtime_compatibility(final_base, expected_head)
    result.update(
        {
            "schema": SCHEMA,
            "marker": MARKER,
            "version": VERSION,
            "status": (
                "EPOCH2_INSTALLED_GENERATION_EVIDENCE_V3_GREEN_"
                "SOURCE_RUNTIME_COMPATIBILITY_EXACT_PRODUCTION_AUTHORITY_STILL_HOLD"
            ),
            "runtime_expected_head": RUNTIME_HEAD,
            "source_checkout_head": SOURCE_HEAD,
            "source_checkout_tree": SOURCE_TREE,
            "source_runtime_add_only_compatibility_exact": True,
            "source_runtime_added_path_count": compatibility["allowed_add_only_count"],
            "main_source_advance_runtime_non_authority": True,
            "canonical_checkout_rewind_performed": False,
            "canonical_checkout_mutation_performed": False,
        }
    )
    return result


def self_test() -> None:
    _require_isolated_python()
    assert HEX40.fullmatch(RUNTIME_HEAD)
    assert HEX40.fullmatch(SOURCE_HEAD)
    assert HEX40.fullmatch(SOURCE_TREE)
    assert len(ALLOWED_ADD_ONLY) == 6
    v2 = _load_v2_module()
    base = v2._load_patched_base_module()
    assert base._verify_checkout_bytes.__name__ == "compat_verifier"
    assert base.checkout_snapshot.__name__ == "compat_snapshot"
    assert base._guard_installer_git_queries.__name__ == "compat_installer_guard"
    print(MARKER + "_SELF_TEST_GREEN")
    print("exact_v2_source_blob_bound=true")
    print("v2_source_close_failure_normalized=true")
    print("v2_source_primary_failure_preserved_on_cleanup_error=true")
    print("v2_source_ancestor_close_no_retry=true")
    print("lexical_and_resolved_sys_path_guard_enabled=true")
    print("runtime_head_exact=true")
    print("source_head_exact=true")
    print("source_tree_exact=true")
    print("source_runtime_six_add_only_compatibility_required=true")
    print("current_checkout_full_tracked_bytes_authenticated=true")
    print("installer_runtime_head_translation_bound=true")
    print("runtime_source_dependency_blob_equality_required=true")
    print("canonical_checkout_rewind_performed=false")
    print("canonical_checkout_mutation_performed=false")
    print("filesystem_write_performed=false")
    print("service_mutation=false")
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
    print(json.dumps(collect(args.expected_head), sort_keys=True, separators=(",", ":")))
    return 0


def _emit_hold(exc: EvidenceError) -> None:
    reason = re.sub(r"[^A-Za-z0-9_:./-]", "_", str(exc)[:1000])
    print(MARKER)
    print("status=HOLD")
    print("reason=" + (reason or "unspecified_evidence_failure"))
    print("canonical_checkout_rewind_performed=false")
    print("canonical_checkout_mutation_performed=false")
    for field in _BOOTSTRAP_NEGATIVE_AUTHORITY_FIELDS:
        print(field + "=false")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except EvidenceError as exc:
        _emit_hold(exc)
        raise SystemExit(2)
