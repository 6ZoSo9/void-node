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
    "BOOTSTRAP_CANDIDATE_LOCK_V1"
)
LOCK_PREFIX = "voidbuye2bootstraplock1_"

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v1.json"
)
CANDIDATE_PROOF_REL = (
    "scripts/"
    "prove_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_candidate_v1.py"
)
CANDIDATE_WORKFLOW_REL = (
    ".github/workflows/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-v1.yml"
)
CANDIDATE_DOC_REL = (
    "docs/operators/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-v1.md"
)
BOOTSTRAP_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v1.c"
)
INSTALLER_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "protected_install_v1.py"
)

EXPECTED = {
    "candidate_source_head": "0ea097a3fa43dc95a1a0a5272c61afe570361fc7",
    "candidate_source_tree": "681e9387826f2c0fe8c0336604dfd6e57ff16d93",
    "candidate_id": (
        "voidbuye2bootstrapcand1_"
        "24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851"
    ),
    "candidate_report_bytes": 4705,
    "candidate_report_sha256": (
        "b3f909c391ce617b7a8e796749bb57ce69f95b27259dd9da1c0fae849d6e74f7"
    ),
    "candidate_report_git_blob": "0675dbcc993171edb2bbbbc7fd9481e4ed0ef006",
    "bootstrap_bytes": 731072,
    "bootstrap_sha256": (
        "1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189"
    ),
    "bootstrap_git_blob": "5d35e762fa4b510baeb89b2840d5287cc4fd6716",
    "candidate_proof_blob": "d1417455330837c4d584f7bf36f932a869c903cb",
    "candidate_workflow_blob": "a4ef30d41a2a950c12db63f6a013cf5bc2b8abcf",
    "candidate_doc_blob": "a7d4af84c6c21f5d6e4d894c130f7d4965885a96",
    "bootstrap_source_blob": "243583d4ed0522796b2bbf448abd4e9c28958f50",
    "installer_source_blob": "383b84e71b371de65579e4113469e86a59b807ab",
    "bootstrap_source_bytes": 19271,
    "bootstrap_source_sha256": (
        "e462c78c11af34ce1b6cd6ce9ab10d16080a4ade436c4cc7514749fd16740444"
    ),
    "installer_source_bytes": 42054,
    "installer_source_sha256": (
        "e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef"
    ),
    "lock_id": (
        "voidbuye2bootstraplock1_"
        "4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23"
    ),
}

HOSTED = {
    "workflow_run": 38986855724,
    "source_proof_job": 117260218054,
    "derive_job_a": 117260304902,
    "derive_job_b": 117260304907,
    "derive_job_c": 117260304895,
    "artifact_a": 12083705966,
    "artifact_b": 12083357954,
    "artifact_c": 12083014356,
    "compare_job": 117260613658,
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
            "bootstrap_candidate_lock_v1"
        ),
        "marker": MARKER,
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "candidate_source_head": EXPECTED["candidate_source_head"],
        "candidate_source_tree": EXPECTED["candidate_source_tree"],
        "candidate_accepted": True,
        "bootstrap_binary_identity_accepted": True,
        "bootstrap_source_identity_bound": True,
        "installer_source_identity_bound": True,
        "next_gate": (
            "void_buy_void_epoch2_dormant_first_entry_protected_install_"
            "bootstrap_install_v1"
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
            "protected-install-bootstrap-v1"
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
    if entries != ["candidate-v1.json", "protected-install-bootstrap-v1"]:
        raise AssertionError("candidate_dir_entries_invalid")

    report_path = root / "candidate-v1.json"
    binary_path = root / "protected-install-bootstrap-v1"
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
