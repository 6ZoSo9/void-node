#!/usr/bin/env python3
from __future__ import annotations

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
import stat
import subprocess
import sys
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
}


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


def _guard_qualifier_installer_loader(qualifier: types.ModuleType) -> None:
    original = getattr(qualifier, "_load_installer", None)
    if not callable(original):
        raise EvidenceError("qualifier_installer_loader_missing")

    def guarded_load_installer():
        installer = original()
        return _harden_installer_git_environment(installer)

    qualifier._load_installer = guarded_load_installer


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def _git(args: list[str]) -> bytes:
    try:
        cp = subprocess.run(
            [
                str(FIXED_GIT),
                "--no-replace-objects",
                "-C",
                str(FIXED_CHECKOUT),
                "-c",
                "safe.directory=" + str(FIXED_CHECKOUT),
                "-c",
                "core.fsmonitor=false",
                *args,
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=GIT_ENV,
            check=False,
            timeout=20,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise EvidenceError(
            "git_execution_failed:" + type(exc).__name__
        ) from exc
    if cp.returncode != 0:
        raise EvidenceError(
            "git_command_failed:"
            + str(cp.returncode)
            + ":"
            + cp.stderr.decode("utf-8", "replace")[-1000:]
        )
    if cp.stderr:
        raise EvidenceError("git_stderr")
    return cp.stdout


def checkout_snapshot(expected_head: str) -> dict[str, Any]:
    if HEX40.fullmatch(expected_head) is None:
        raise EvidenceError("expected_head_invalid")
    head = _git(["rev-parse", "--verify", "HEAD^{commit}"]).decode().strip()
    tree = _git(["rev-parse", "--verify", "HEAD^{tree}"]).decode().strip()
    branch = _git(["symbolic-ref", "--short", "-q", "HEAD"]).decode().strip()
    status = _git(["status", "--porcelain=v1", "--untracked-files=all"])
    if head != expected_head:
        raise EvidenceError("checkout_head_mismatch")
    if branch != "main":
        raise EvidenceError("checkout_branch_not_main")
    if status != b"":
        raise EvidenceError("checkout_not_clean")
    if HEX40.fullmatch(tree) is None:
        raise EvidenceError("checkout_tree_invalid")
    return {"head": head, "tree": tree, "branch": branch, "clean": True}


def exact_git_object(expected_head: str, relative: str, blob: str) -> bytes:
    tree_blob = _git(["rev-parse", expected_head + ":" + relative]).decode().strip()
    if tree_blob != blob:
        raise EvidenceError("git_tree_blob_mismatch:" + relative)
    raw = _git(["show", expected_head + ":" + relative])
    if git_blob(raw) != blob:
        raise EvidenceError("git_object_blob_mismatch:" + relative)
    return raw


def _read_visible_qualifier_exact(path: Path, expected: bytes) -> bytes:
    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
    try:
        fd = os.open(str(path), flags)
    except OSError as exc:
        raise EvidenceError("qualifier_source_unavailable") from exc
    try:
        before = os.fstat(fd)
        if (
            not stat.S_ISREG(before.st_mode)
            or before.st_nlink != 1
            or before.st_size != len(expected)
        ):
            raise EvidenceError("qualifier_source_metadata_invalid")

        chunks: list[bytes] = []
        remaining = len(expected) + 1
        while remaining > 0:
            try:
                chunk = os.read(fd, min(64 * 1024, remaining))
            except OSError as exc:
                raise EvidenceError("qualifier_source_read_failed") from exc
            if not chunk:
                break
            chunks.append(chunk)
            remaining -= len(chunk)
        after = os.fstat(fd)

        direct = b"".join(chunks)
        if len(direct) != len(expected):
            raise EvidenceError("qualifier_source_size_changed")
        for field in (
            "st_dev",
            "st_ino",
            "st_mode",
            "st_nlink",
            "st_size",
            "st_mtime_ns",
            "st_ctime_ns",
        ):
            if getattr(before, field) != getattr(after, field):
                raise EvidenceError("qualifier_source_generation_unstable:" + field)

        try:
            visible = path.lstat()
        except OSError as exc:
            raise EvidenceError("qualifier_source_visible_unavailable") from exc
        if (
            not stat.S_ISREG(visible.st_mode)
            or stat.S_ISLNK(visible.st_mode)
            or visible.st_nlink != 1
            or visible.st_dev != after.st_dev
            or visible.st_ino != after.st_ino
            or visible.st_mode != after.st_mode
            or visible.st_size != after.st_size
            or visible.st_mtime_ns != after.st_mtime_ns
            or visible.st_ctime_ns != after.st_ctime_ns
        ):
            raise EvidenceError("qualifier_source_visible_generation_changed")
        if direct != expected:
            raise EvidenceError("qualifier_source_bytes_mismatch")
        return direct
    finally:
        os.close(fd)


def load_qualifier(expected_head: str) -> types.ModuleType:
    raw = exact_git_object(expected_head, QUALIFIER_REL, QUALIFIER_BLOB)
    exact_git_object(expected_head, QUALIFIER_PROOF_REL, QUALIFIER_PROOF_BLOB)

    visible = FIXED_CHECKOUT / QUALIFIER_REL
    direct = _read_visible_qualifier_exact(visible, raw)

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
    _guard_qualifier_installer_loader(module)
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
        raise EvidenceError(
            "epoch2_installed_qualification_failed:" + str(exc)
        ) from exc
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
    assert HEX40.fullmatch("a" * 40)
    assert HEX40.fullmatch("A" * 40) is None
    print(MARKER + "_SELF_TEST_GREEN")
    print("parent_host_evidence_plan_bound=true")
    print("exact_qualifier_source_and_proof_bound=true")
    print("qualifier_source_descriptor_bound=true")
    print("qualifier_source_nofollow_bounded_read=true")
    print("root_required_for_future_run=true")
    print("python_isolated_mode_required_for_future_run=true")
    print("preimport_python_isolation_enforced=true")
    print("unisolated_shadow_module_blocked=true")
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


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except EvidenceError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("epoch2_installed_generation_qualified=false")
        print("filesystem_write_performed=false")
        print("runner_execution=false")
        print("live_composition_execution=false")
        print("service_mutation=false")
        print("network_contact=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("wallet_or_signer_access=false")
        print("signing=false")
        print("transaction_submission=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("treasury_or_liquidity_action=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
