#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

LOCK_REL = "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
LOCK = ROOT / LOCK_REL
CANDIDATE_REL = "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v2.py"
CANDIDATE = ROOT / CANDIDATE_REL
CANDIDATE_WORKFLOW_REL = ".github/workflows/buy-void-epoch2-dormant-binder-native-candidate-v2.yml"
CANDIDATE_DOC_REL = "docs/operators/buy-void-epoch2-dormant-binder-native-candidate-v2.md"

CANDIDATE_SOURCE_HEAD = "f5e92afdf392230ca41de77d2542dcd2c1365a33"
CANDIDATE_MERGE = "2b76758851d550e8cbd5fc71412e4b85cfaa8791"
LOCK_BASE = CANDIDATE_MERGE

EXPECTED_LOCK_ID = (
    "voidbuye2dormantbinderlock3_"
    "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a"
)
EXPECTED_REPORT_BYTES = 7870
EXPECTED_REPORT_SHA256 = (
    "f21445a333a2c05d132692c29aa929a1de727d6f6f35ce2edac600a7cccfa4a2"
)
EXPECTED_REPORT_GIT_BLOB_SHA1 = "4ba13c0b8a471d36c7644754e27ec0b8c07481ca"
EXPECTED_CANDIDATE_ID = (
    "voidbuye2dormantbindercand2_"
    "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"
)
EXPECTED_BINARY_SHA256 = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)
EXPECTED_BINARY_BYTES = 726976
EXPECTED_SELF_TEST_SHA256 = (
    "671bfd72914021d43ed59571a4db749a1a686071ebe0329878dcb70bde67d233"
)

SUPERSEDED_LOCKS = [
    "voidbuye2dormantbinderlock2_34df85425460aa9fc5192cee326de4b711deefbcb195dc6b7b6c3ebd23eb5597",
    "voidbuye2dormantbinderlock2_ff414ad8704f0a4fc487bae78a3938d5b7312205c084a0ae9fe0cbafcc80b96a",
]

EXPECTED_BLOBS = {
    CANDIDATE_REL: "f97cb8aff642f2f3e138fe8e087eece22223b934",
    CANDIDATE_WORKFLOW_REL: "2a7fea5dfde6fb010c3d2049041553dbcbb04236",
    CANDIDATE_DOC_REL: "23d1871bf9f8ac9ea7363242eb7832a96fdf0273",
    "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v1.py":
        "5ac4264d7f9bdb394cf5be4490aa1eadd1f929ee",
    "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c":
        "4fdf3f627f407335b9d50800fbbc913d1edae523",
    "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs":
        "9c29eb4716077e459b9154f39d0f30cf2e56729f",
    "scripts/prove_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs":
        "4671d37fcdb43c2bee9d3de16402df0cd25257bb",
    ".github/workflows/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.yml":
        "2742145ab88d721747f978927a6eb64a7c5f805f",
    "docs/operators/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.md":
        "cd90bafa39682284a6d9e87daebfe5966adac8d6",
}

EXPECTED_SCOPE = tuple(sorted((
    ".github/workflows/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.yml",
    "docs/operators/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.md",
    LOCK_REL,
    "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_lock_v3.py",
)))

ENV = {
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


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(raw)}\0".encode("ascii"))
    h.update(raw)
    return h.hexdigest()


def canonical(value) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("utf-8")


def run(argv: list[str], *, timeout: int = 300) -> subprocess.CompletedProcess:
    cp = subprocess.run(
        argv,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=ENV,
        check=False,
        timeout=timeout,
    )
    if cp.returncode != 0:
        raise AssertionError(
            "command_failed:" + repr(argv) + ":" +
            cp.stderr.decode("utf-8", "replace")[-5000:]
        )
    return cp


def git(args: list[str]) -> str:
    return run(
        ["/usr/bin/git", "--no-replace-objects", "-C", os.fspath(ROOT), *args],
        timeout=30,
    ).stdout.decode("utf-8", "strict").strip()


def direct_file(path: Path, maximum: int) -> bytes:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise AssertionError("file_metadata_invalid:" + str(path))
    raw = path.read_bytes()
    after = path.lstat()
    for field in (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
        "st_size", "st_mtime_ns", "st_ctime_ns",
    ):
        if getattr(before, field) != getattr(after, field):
            raise AssertionError("file_changed:" + str(path) + ":" + field)
    if len(raw) != before.st_size:
        raise AssertionError("file_read_drift:" + str(path))
    return raw


def verify_repository() -> None:
    git(["merge-base", "--is-ancestor", CANDIDATE_SOURCE_HEAD, CANDIDATE_MERGE])
    git(["merge-base", "--is-ancestor", LOCK_BASE, "HEAD"])
    for relative, expected in EXPECTED_BLOBS.items():
        actual = git(["rev-parse", "HEAD:" + relative])
        if actual != expected:
            raise AssertionError("dependency_blob_drift:" + relative)

    changed = tuple(sorted(
        line for line in
        git(["diff", "--name-only", LOCK_BASE, "HEAD", "--"]).splitlines()
        if line
    ))
    if changed != EXPECTED_SCOPE:
        raise AssertionError(
            "lock_branch_scope_drift:" +
            json.dumps(changed, separators=(",", ":"))
        )
    if git(["status", "--porcelain=v1", "--untracked-files=all"]) != "":
        raise AssertionError("worktree_dirty")


def derive_candidate() -> tuple[bytes, bytes, dict]:
    run(["/usr/bin/python3", "-I", "-B", os.fspath(CANDIDATE), "--self-test"])
    with tempfile.TemporaryDirectory(prefix="void-e2-dormant-lock-v3-") as td:
        out = Path(td) / "candidate"
        run([
            "/usr/bin/python3", "-I", "-B", os.fspath(CANDIDATE),
            "--derive-dir", os.fspath(out),
        ])
        report = direct_file(out / "candidate-v2.json", 128 * 1024)
        binary = direct_file(out / "native-preentry-v2", 2 * 1024 * 1024)

    if len(report) != EXPECTED_REPORT_BYTES:
        raise AssertionError("candidate_report_bytes_mismatch")
    if sha256(report) != EXPECTED_REPORT_SHA256:
        raise AssertionError("candidate_report_sha256_mismatch")
    if git_blob_sha1(report) != EXPECTED_REPORT_GIT_BLOB_SHA1:
        raise AssertionError("candidate_report_git_blob_mismatch")
    if len(binary) != EXPECTED_BINARY_BYTES:
        raise AssertionError("candidate_binary_bytes_mismatch")
    if sha256(binary) != EXPECTED_BINARY_SHA256:
        raise AssertionError("candidate_binary_sha256_mismatch")

    value = json.loads(report)
    if not isinstance(value, dict):
        raise AssertionError("candidate_report_not_object")
    return report, binary, value


def verify_candidate(value: dict) -> None:
    if value.get("marker") != "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V2":
        raise AssertionError("candidate_marker_invalid")
    if value.get("version") != 2:
        raise AssertionError("candidate_version_invalid")
    if value.get("candidate_id") != EXPECTED_CANDIDATE_ID:
        raise AssertionError("candidate_id_invalid")

    helper = value.get("merged_v1_helper_execution")
    if (
        not isinstance(helper, dict)
        or helper.get("git_blob_sha1") != EXPECTED_BLOBS[
            "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v1.py"
        ]
        or helper.get("bytes") != 29870
        or helper.get("sha256")
        != "ee796b5e32267d61b877bd934818bf0318ca810cd222626dc66a7958ad538f71"
        or helper.get("executed_from_verified_bytes") is not True
        or helper.get("mutable_path_import") is not False
    ):
        raise AssertionError("verified_helper_execution_invalid")

    native = value.get("native_source")
    binder = value.get("binder_source")
    snapshot = value.get("source_snapshot")
    binary = value.get("binary")
    self_test = value.get("self_test")
    authority = value.get("authority")
    if not all(isinstance(x, dict) for x in (
        native, binder, snapshot, binary, self_test, authority
    )):
        raise AssertionError("candidate_sections_missing")

    if native.get("git_blob_sha1") != EXPECTED_BLOBS[
        "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
    ]:
        raise AssertionError("native_source_blob_invalid")
    if native.get("sha256") != "2b9a36da580adaab1e97eca4c5bd730eac7328f1ff9ba6a897d28580395c39d4":
        raise AssertionError("native_source_sha_invalid")
    if binder.get("git_blob_sha1") != EXPECTED_BLOBS[
        "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
    ]:
        raise AssertionError("binder_source_blob_invalid")
    if binder.get("sha256") != "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e":
        raise AssertionError("binder_sha_invalid")

    for key, want in {
        "kind": "sealed_memfd",
        "build_input_is_checkout_path": False,
        "preprocess_from_snapshot_only": True,
        "compile_from_snapshot_only": True,
        "checkout_substitute_after_snapshot_cannot_change_build_input": True,
        "checkout_restore_cannot_rewrite_snapshot_history": True,
        "snapshot_elf_stable_across_substitute_restore": True,
        "visible_source_revalidated_after_build": True,
        "sealed_write_rejected": True,
        "write_after_seal_rejected": True,
    }.items():
        if snapshot.get(key) != want:
            raise AssertionError("source_snapshot_invalid:" + key)

    if value.get("toolchain_revalidated_after_build") is not True:
        raise AssertionError("toolchain_revalidation_missing")
    if binary.get("sha256") != EXPECTED_BINARY_SHA256:
        raise AssertionError("binary_sha_invalid")
    if binary.get("bytes") != EXPECTED_BINARY_BYTES:
        raise AssertionError("binary_bytes_invalid")
    for key in (
        "two_builds_byte_identical",
        "elf_magic_verified",
        "elf64_little_endian",
        "machine_x86_64",
        "executable_type",
        "pt_interp_absent",
        "static_link_required",
        "hostile_ld_preload_positive_control",
        "hostile_ld_preload_preentry_blocked",
    ):
        if binary.get(key) is not True:
            raise AssertionError("binary_property_invalid:" + key)

    if self_test.get("exact_transcript_verified") is not True:
        raise AssertionError("self_test_transcript_not_exact")
    if self_test.get("stderr_empty") is not True:
        raise AssertionError("self_test_stderr_not_empty")
    if self_test.get("stdout_sha256") != EXPECTED_SELF_TEST_SHA256:
        raise AssertionError("self_test_sha_invalid")

    if authority.get("source_only_candidate") is not True:
        raise AssertionError("source_only_candidate_missing")
    if authority.get("candidate_report_filesystem_write") is not True:
        raise AssertionError("candidate_report_write_truth_missing")
    for key, value_ in authority.items():
        if key in ("source_only_candidate", "candidate_report_filesystem_write"):
            continue
        if value_ is not False:
            raise AssertionError("candidate_authority_overclaim:" + key)


def lock_body() -> dict:
    return {
        "schema": "void_buy_void_epoch2_dormant_binder_native_candidate_lock_v3",
        "marker": "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V3",
        "version": 3,
        "repository": "6ZoSo9/void-node",
        "candidate_source_head": CANDIDATE_SOURCE_HEAD,
        "candidate_merge": CANDIDATE_MERGE,
        "candidate_hosted_evidence": {
            "workflow_run": 38953341680,
            "source_proof_job": 117149942343,
            "derive_job_a": 117150120811,
            "derive_job_b": 117150120884,
            "derive_job_c": 117150120735,
            "artifact_a": 12069128951,
            "artifact_b": 12069029721,
            "artifact_c": 12069029667,
            "compare_job": 117150690661,
            "three_report_byte_identity_verified": True,
            "three_binary_byte_identity_verified": True,
            "independent_rederivation_verified": True,
        },
        "candidate_report": {
            "bytes": EXPECTED_REPORT_BYTES,
            "sha256": EXPECTED_REPORT_SHA256,
            "git_blob_sha1": EXPECTED_REPORT_GIT_BLOB_SHA1,
            "candidate_id": EXPECTED_CANDIDATE_ID,
            "candidate_script_git_blob_sha1": EXPECTED_BLOBS[CANDIDATE_REL],
            "candidate_workflow_git_blob_sha1": EXPECTED_BLOBS[CANDIDATE_WORKFLOW_REL],
            "candidate_doc_git_blob_sha1": EXPECTED_BLOBS[CANDIDATE_DOC_REL],
            "merged_v1_proof_git_blob_sha1": EXPECTED_BLOBS[
                "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v1.py"
            ],
            "merged_v1_helper_execution": {
                "git_blob_sha1": EXPECTED_BLOBS[
                    "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v1.py"
                ],
                "bytes": 29870,
                "sha256": "ee796b5e32267d61b877bd934818bf0318ca810cd222626dc66a7958ad538f71",
                "executed_from_verified_bytes": True,
                "mutable_path_import": False,
            },
            "native_source_git_blob_sha1": EXPECTED_BLOBS[
                "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
            ],
            "native_source_sha256":
                "2b9a36da580adaab1e97eca4c5bd730eac7328f1ff9ba6a897d28580395c39d4",
            "binder_source_git_blob_sha1": EXPECTED_BLOBS[
                "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
            ],
            "binder_sha256":
                "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e",
            "binding_proof_git_blob_sha1": EXPECTED_BLOBS[
                "scripts/prove_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
            ],
            "binding_workflow_git_blob_sha1": EXPECTED_BLOBS[
                ".github/workflows/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.yml"
            ],
            "binding_doc_git_blob_sha1": EXPECTED_BLOBS[
                "docs/operators/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.md"
            ],
            "native_binary_sha256": EXPECTED_BINARY_SHA256,
            "native_binary_bytes": EXPECTED_BINARY_BYTES,
            "sealed_source_snapshot": True,
            "checkout_path_is_not_build_authority": True,
            "toolchain_root_custody_verified": True,
            "toolchain_revalidated_after_build": True,
            "static_no_interp": True,
            "hostile_ld_preload_blocked": True,
            "failure_truth_boundary_semantics_bound": True,
            "verified_helper_execution_bound": True,
        },
        "superseded_pre_3363_locks": SUPERSEDED_LOCKS,
        "superseded_pre_3363_locks_install_authority": False,
        "native_binary_byte_identity_preserved_across_3363": True,
        "candidate_evidence_identity_changed_after_3363": True,
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "binder_source_identity_bound": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
        "next_gate": "void_buy_void_epoch2_dormant_binder_native_protected_install_v2",
    }


def derive_lock() -> bytes:
    verify_repository()
    _, _, candidate = derive_candidate()
    verify_candidate(candidate)
    body = lock_body()
    lock_id = "voidbuye2dormantbinderlock3_" + sha256(canonical(body))
    if lock_id != EXPECTED_LOCK_ID:
        raise AssertionError("lock_id_derivation_mismatch")
    value = {**body, "lock_id": lock_id}
    return (json.dumps(value, indent=2, ensure_ascii=True) + "\n").encode("utf-8")


def verify_committed_lock() -> None:
    expected = derive_lock()
    committed = direct_file(LOCK, 128 * 1024)
    if committed != expected:
        raise AssertionError("committed_lock_bytes_mismatch")
    parsed = json.loads(committed)
    if parsed.get("lock_id") != EXPECTED_LOCK_ID:
        raise AssertionError("committed_lock_id_mismatch")


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--derive", action="store_true")
    args = parser.parse_args()

    if args.derive:
        os.write(1, derive_lock())
        return

    verify_committed_lock()
    print("VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V3_GREEN")
    print("lock_id=" + EXPECTED_LOCK_ID)
    print("candidate_report_sha256=" + EXPECTED_REPORT_SHA256)
    print("candidate_report_git_blob_sha1=" + EXPECTED_REPORT_GIT_BLOB_SHA1)
    print("candidate_id=" + EXPECTED_CANDIDATE_ID)
    print("native_binary_sha256=" + EXPECTED_BINARY_SHA256)
    print("native_binary_bytes=" + str(EXPECTED_BINARY_BYTES))
    print("verified_helper_execution_bound=true")
    print("mutable_helper_path_import_forbidden=true")
    print("superseded_pre_3363_locks_install_authority=false")
    print("native_binary_byte_identity_preserved_across_3363=true")
    print("candidate_evidence_identity_changed_after_3363=true")
    print("sealed_source_snapshot_bound=true")
    print("checkout_path_is_not_build_authority=true")
    print("toolchain_root_custody_bound=true")
    print("toolchain_revalidated_after_build=true")
    print("hosted_three_report_identity_bound=true")
    print("hosted_three_binary_identity_bound=true")
    print("hosted_independent_rederivation_bound=true")
    print("candidate_accepted=true")
    print("native_binary_identity_accepted=true")
    print("binder_source_identity_bound=true")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")
    print("production_host_evidence_authority=false")
    print("next_gate=void_buy_void_epoch2_dormant_binder_native_protected_install_v2")


if __name__ == "__main__":
    main()
