#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_"
    "BOOTSTRAP_CANDIDATE_LOCK_V2"
)
LOCK_PREFIX = "voidbuye2bootstraplock2_"

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v2.json"
)
CANDIDATE_PROOF_REL = (
    "scripts/"
    "prove_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_candidate_v2.py"
)
CANDIDATE_WORKFLOW_REL = (
    ".github/workflows/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-v2.yml"
)
CANDIDATE_DOC_REL = (
    "docs/operators/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-v2.md"
)
BOOTSTRAP_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2.c"
)
INSTALLER_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "protected_install_v1.py"
)

EXPECTED = {
    "candidate_source_head": "344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b",
    "candidate_source_tree": "4085987d856fa303b8bc81087e3b5a207bc8964f",
    "candidate_id": (
        "voidbuye2bootstrapcand2_"
        "b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def"
    ),
    "candidate_report_bytes": 4789,
    "candidate_report_sha256": (
        "2ca03a4d7e609076df740a7590abfae572101ef7bf78feacf11240e309a43ee4"
    ),
    "candidate_report_git_blob": "fbaab61d0e169516a49c5c07feeceba1a7204e83",
    "bootstrap_bytes": 731072,
    "bootstrap_sha256": (
        "37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276"
    ),
    "bootstrap_git_blob": "45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62",
    "candidate_proof_blob": "4f9b5a2ca77b3aebc9e70ea835c92155601a1a06",
    "candidate_workflow_blob": "46488e048565b79676de05732ee58a35badfd395",
    "candidate_doc_blob": "b5580a5be7d28ea915f16d0d2fd1e952ddb0018a",
    "bootstrap_source_blob": "19f9baf8d6d707da43dbd0e247667af1a10e46c5",
    "installer_source_blob": "383b84e71b371de65579e4113469e86a59b807ab",
    "bootstrap_source_bytes": 19450,
    "bootstrap_source_sha256": (
        "8f013230fc6a0874d8843ab895f22cec8f5baeceb6c15fb6b7d97fc5b50081e3"
    ),
    "installer_source_bytes": 42054,
    "installer_source_sha256": (
        "e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef"
    ),
    "lock_id": (
        "voidbuye2bootstraplock2_"
        "8524098b733e02451e307a8814fb593bbce9f6239f1e45ecda1563efb95e3ce7"
    ),
}

HOSTED = {
    "workflow_run": 38992362910,
    "source_proof_job": 117277316976,
    "derive_job_a": 117277390838,
    "derive_job_b": 117277390764,
    "derive_job_c": 117277390783,
    "artifact_a": 12086055391,
    "artifact_b": 12086105502,
    "artifact_c": 12086085720,
    "compare_job": 117277532037,
}

FALSE_AUTHORITY = (
    "protected_bootstrap_install_authorized",
    "protected_installer_apply_authorized",
    "live_execution_authorized",
    "credential_access_authorized",
    "private_key_access_authorized",
    "signing_authorized",
    "transaction_authorized",
    "rpc_call_authorized",
    "payment_acceptance_authorized",
    "public_presale_activation_authorized",
    "wc_void_market_activation_authorized",
    "treasury_liquidity_action_authorized",
    "funds_movement_authorized",
    "production_host_evidence_authority",
)


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


def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        text=True,
        timeout=20,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/tmp",
            "LANG": "C",
            "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
        },
    )
    if cp.returncode != 0 or cp.stderr:
        raise AssertionError("git_failed:" + ":".join(args))
    return cp.stdout.strip()


def stable_file(relative: str, maximum: int = 2 * 1024 * 1024) -> bytes:
    path = ROOT / relative
    before = path.stat()
    if not path.is_file() or before.st_size < 1 or before.st_size > maximum:
        raise AssertionError("file_metadata_invalid:" + relative)
    raw = path.read_bytes()
    after = path.stat()
    for name in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        if getattr(before, name) != getattr(after, name):
            raise AssertionError("file_changed:" + relative + ":" + name)
    return raw


def require_head_blob(relative: str, expected: str) -> None:
    raw = stable_file(relative)
    if git_blob(raw) != expected:
        raise AssertionError("working_blob_mismatch:" + relative)
    if git("rev-parse", "HEAD:" + relative) != expected:
        raise AssertionError("head_blob_mismatch:" + relative)


def validate_lock() -> dict:
    raw = stable_file(LOCK_REL)
    try:
        lock = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AssertionError("lock_json_invalid") from exc
    if not isinstance(lock, dict):
        raise AssertionError("lock_shape_invalid")

    lock_id = lock.get("lock_id")
    if lock_id != EXPECTED["lock_id"]:
        raise AssertionError("lock_id_value_invalid")
    body = dict(lock)
    body.pop("lock_id", None)
    derived = LOCK_PREFIX + sha256(canonical(body))
    if derived != lock_id:
        raise AssertionError("lock_id_content_binding_invalid")

    required = {
        "schema": (
            "void_buy_void_epoch2_dormant_first_entry_protected_install_"
            "bootstrap_candidate_lock_v2"
        ),
        "marker": MARKER,
        "version": 2,
        "repository": "6ZoSo9/void-node",
        "candidate_source_head": EXPECTED["candidate_source_head"],
        "candidate_source_tree": EXPECTED["candidate_source_tree"],
        "candidate_accepted": True,
        "bootstrap_binary_identity_accepted": True,
        "bootstrap_source_identity_bound": True,
        "installer_source_identity_bound": True,
        "runtime_expected_head_not_compile_bound": True,
        "runtime_expected_head_contract_accepted": True,
        "next_gate": (
            "void_buy_void_epoch2_dormant_first_entry_protected_install_"
            "bootstrap_install_v2"
        ),
    }
    for key, value in required.items():
        if lock.get(key) != value:
            raise AssertionError("lock_field_invalid:" + key)
    for key in FALSE_AUTHORITY:
        if lock.get(key) is not False:
            raise AssertionError("lock_authority_overclaim:" + key)

    hosted = lock.get("candidate_hosted_evidence")
    if not isinstance(hosted, dict):
        raise AssertionError("hosted_evidence_missing")
    for key, value in HOSTED.items():
        if hosted.get(key) != value:
            raise AssertionError("hosted_evidence_invalid:" + key)
    for key in (
        "three_report_byte_identity_verified",
        "three_binary_byte_identity_verified",
        "independent_report_rederived",
        "independent_bootstrap_rederived",
    ):
        if hosted.get(key) is not True:
            raise AssertionError("hosted_evidence_boolean_invalid:" + key)

    report = lock.get("candidate_report")
    if not isinstance(report, dict):
        raise AssertionError("candidate_report_binding_missing")
    report_required = {
        "bytes": EXPECTED["candidate_report_bytes"],
        "sha256": EXPECTED["candidate_report_sha256"],
        "git_blob_sha1": EXPECTED["candidate_report_git_blob"],
        "candidate_id": EXPECTED["candidate_id"],
        "candidate_proof_git_blob_sha1": EXPECTED["candidate_proof_blob"],
        "candidate_workflow_git_blob_sha1": EXPECTED["candidate_workflow_blob"],
        "candidate_doc_git_blob_sha1": EXPECTED["candidate_doc_blob"],
        "bootstrap_source_git_blob_sha1": EXPECTED["bootstrap_source_blob"],
        "bootstrap_source_bytes": EXPECTED["bootstrap_source_bytes"],
        "bootstrap_source_sha256": EXPECTED["bootstrap_source_sha256"],
        "installer_source_git_blob_sha1": EXPECTED["installer_source_blob"],
        "installer_source_bytes": EXPECTED["installer_source_bytes"],
        "installer_source_sha256": EXPECTED["installer_source_sha256"],
        "compile_confirmation": (
            "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY"
        ),
        "fixed_root": (
            "/opt/void-buy-void-epoch2-dormant-first-entry-"
            "protected-install-bootstrap-v2"
        ),
        "fixed_installer": (
            "/home/zoso/dev/void-node/ops/precision/"
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
            "protected_install_v1.py"
        ),
        "fixed_python": "/usr/bin/python3",
        "bootstrap_binary_git_blob_sha1": EXPECTED["bootstrap_git_blob"],
        "bootstrap_binary_sha256": EXPECTED["bootstrap_sha256"],
        "bootstrap_binary_bytes": EXPECTED["bootstrap_bytes"],
        "runtime_expected_head_compile_bound": False,
        "runtime_expected_head_strict_lowercase_hex": True,
        "runtime_expected_head_forwarded_unchanged": True,
        "repository_head_not_embedded_in_bootstrap": True,
    }
    for key, value in report_required.items():
        if report.get(key) != value:
            raise AssertionError("candidate_report_binding_invalid:" + key)
    for key in (
        "sealed_bootstrap_source_snapshot",
        "production_defaults_preserved",
        "toolchain_root_custody_verified",
        "toolchain_revalidated_after_build",
        "two_builds_byte_identical",
        "static_no_interp",
        "dynamic_needed_absent",
        "semantic_report_validation_fail_closed",
    ):
        if report.get(key) is not True:
            raise AssertionError("candidate_report_boolean_invalid:" + key)

    if git("rev-parse", EXPECTED["candidate_source_head"] + "^{tree}") != EXPECTED[
        "candidate_source_tree"
    ]:
        raise AssertionError("candidate_source_tree_invalid")
    ancestor = subprocess.run(
        [
            "/usr/bin/git",
            "-C",
            str(ROOT),
            "merge-base",
            "--is-ancestor",
            EXPECTED["candidate_source_head"],
            "HEAD",
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
        timeout=20,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/tmp",
            "LANG": "C",
            "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
        },
    )
    if ancestor.returncode != 0:
        raise AssertionError("candidate_source_not_ancestor")

    require_head_blob(CANDIDATE_PROOF_REL, EXPECTED["candidate_proof_blob"])
    require_head_blob(CANDIDATE_WORKFLOW_REL, EXPECTED["candidate_workflow_blob"])
    require_head_blob(CANDIDATE_DOC_REL, EXPECTED["candidate_doc_blob"])
    require_head_blob(BOOTSTRAP_SOURCE_REL, EXPECTED["bootstrap_source_blob"])
    require_head_blob(INSTALLER_SOURCE_REL, EXPECTED["installer_source_blob"])

    return lock


def validate_candidate_dir(root: Path) -> None:
    if not root.is_dir():
        raise AssertionError("candidate_dir_missing")
    entries = sorted(p.name for p in root.iterdir())
    if entries != ["candidate-v2.json", "protected-install-bootstrap-v2"]:
        raise AssertionError("candidate_dir_entries_invalid")

    report_path = root / "candidate-v2.json"
    binary_path = root / "protected-install-bootstrap-v2"
    report_raw = report_path.read_bytes()
    binary_raw = binary_path.read_bytes()

    if (
        len(report_raw) != EXPECTED["candidate_report_bytes"]
        or sha256(report_raw) != EXPECTED["candidate_report_sha256"]
        or git_blob(report_raw) != EXPECTED["candidate_report_git_blob"]
    ):
        raise AssertionError("candidate_report_bytes_invalid")
    if (
        len(binary_raw) != EXPECTED["bootstrap_bytes"]
        or sha256(binary_raw) != EXPECTED["bootstrap_sha256"]
        or git_blob(binary_raw) != EXPECTED["bootstrap_git_blob"]
    ):
        raise AssertionError("candidate_binary_bytes_invalid")

    report = json.loads(report_raw)
    if report.get("candidate_id") != EXPECTED["candidate_id"]:
        raise AssertionError("candidate_report_id_invalid")
    if report.get("repository_head") != EXPECTED["candidate_source_head"]:
        raise AssertionError("candidate_report_head_invalid")
    if report.get("repository_tree") != EXPECTED["candidate_source_tree"]:
        raise AssertionError("candidate_report_tree_invalid")

    compile_binding = report.get("compile_binding")
    if not isinstance(compile_binding, dict):
        raise AssertionError("candidate_report_compile_binding_missing")
    if (
        compile_binding.get("runtime_expected_head_compile_bound") is not False
        or compile_binding.get("runtime_expected_head_strict_lowercase_hex") is not True
        or compile_binding.get("runtime_expected_head_forwarded_unchanged") is not True
        or "expected_head" in compile_binding
    ):
        raise AssertionError("candidate_runtime_head_contract_invalid")
    if EXPECTED["candidate_source_head"].encode("ascii") in binary_raw:
        raise AssertionError("candidate_repository_head_embedded_in_binary")

    binary = report.get("binary")
    if not isinstance(binary, dict):
        raise AssertionError("candidate_report_binary_missing")
    if (
        binary.get("bytes") != EXPECTED["bootstrap_bytes"]
        or binary.get("sha256") != EXPECTED["bootstrap_sha256"]
        or binary.get("git_blob_sha1") != EXPECTED["bootstrap_git_blob"]
        or binary.get("two_builds_byte_identical") is not True
        or binary.get("static_no_interp") is not True
        or binary.get("dynamic_needed_absent") is not True
        or binary.get("self_test_green") is not True
    ):
        raise AssertionError("candidate_report_binary_invalid")

    authority = report.get("authority")
    if not isinstance(authority, dict) or authority.get("source_only_candidate") is not True:
        raise AssertionError("candidate_authority_invalid")
    for key, value in authority.items():
        if key == "source_only_candidate":
            continue
        if value is not False:
            raise AssertionError("candidate_authority_overclaim:" + key)


def self_test() -> None:
    validate_lock()
    source = stable_file(__file_relative()).decode("utf-8")
    for token in (
        "lock_id_content_binding_invalid",
        "candidate_report_bytes_invalid",
        "candidate_binary_bytes_invalid",
        "candidate_source_not_ancestor",
        "candidate_runtime_head_contract_invalid",
        "candidate_repository_head_embedded_in_binary",
        "lock_authority_overclaim",
    ):
        if token not in source:
            raise AssertionError("proof_invariant_missing:" + token)
    print(MARKER + "_SELF_TEST_GREEN")
    print("canonical_lock_id_verified=true")
    print("candidate_source_generation_bound=true")
    print("candidate_hosted_evidence_bound=true")
    print("candidate_report_identity_bound=true")
    print("bootstrap_binary_identity_bound=true")
    print("runtime_expected_head_not_compile_bound=true")
    print("runtime_expected_head_contract_accepted=true")
    print("candidate_source_blobs_bound=true")
    print("candidate_accepted=true")
    print("bootstrap_binary_identity_accepted=true")
    print("protected_bootstrap_install_authorized=false")
    print("protected_installer_apply_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("funds_movement_authorized=false")


def __file_relative() -> str:
    return str(Path(__file__).resolve().relative_to(ROOT))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--candidate-dir", type=Path)
    args = parser.parse_args()
    if args.self_test == (args.candidate_dir is not None):
        raise SystemExit("choose exactly one of --self-test or --candidate-dir")
    if args.self_test:
        self_test()
        return 0
    validate_lock()
    validate_candidate_dir(args.candidate_dir)
    print(MARKER + "_CANDIDATE_ACCEPTANCE_GREEN")
    print("canonical_lock_id_verified=true")
    print("frozen_candidate_rederived=true")
    print("candidate_report_bytes_exact=true")
    print("bootstrap_binary_bytes_exact=true")
    print("runtime_expected_head_not_compile_bound=true")
    print("runtime_expected_head_contract_accepted=true")
    print("candidate_accepted=true")
    print("bootstrap_binary_identity_accepted=true")
    print("protected_bootstrap_install_authorized=false")
    print("protected_installer_apply_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("funds_movement_authorized=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
