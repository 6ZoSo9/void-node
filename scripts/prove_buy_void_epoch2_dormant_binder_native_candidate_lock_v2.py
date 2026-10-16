#!/usr/bin/env python3
from __future__ import annotations

import argparse
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess

ROOT = Path(__file__).resolve().parents[1]

LOCK_REL = "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v2.json"
LOCK = ROOT / LOCK_REL
CANDIDATE_REL = "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v2.py"
CANDIDATE = ROOT / CANDIDATE_REL

LOCK_BASE = "f036dbcf98ba032b701a0e35721d22bec4f09735"
CANDIDATE_HEAD = "f34d495e99e4b9af576cf3c1f57c0d849594bc79"

EXPECTED_LOCK_ID = (
    "voidbuye2dormantbinderlock2_"
    "ff414ad8704f0a4fc487bae78a3938d5b7312205c084a0ae9fe0cbafcc80b96a"
)
EXPECTED_CANDIDATE_ID = (
    "voidbuye2dormantbindercand2_"
    "342712bbfdc6c999ca3c4bb132b02531df94356ffd1e5bb0b21d40c8f82d33ce"
)
EXPECTED_REPORT_BYTES = 7626
EXPECTED_REPORT_SHA256 = (
    "eff80dfa0fc19455fa46cb5db2db6b49a467bd473ad11057b834a5c511f87559"
)
EXPECTED_REPORT_GIT_BLOB_SHA1 = "1692d67d966f5ff61c5e5fd0e34cb579d1a4c990"
EXPECTED_BINARY_BYTES = 726_976
EXPECTED_BINARY_SHA256 = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)

EXPECTED_BLOBS = {
    CANDIDATE_REL: "f74716fd81c234ba1f97951f765b4683821ad856",
    ".github/workflows/buy-void-epoch2-dormant-binder-native-candidate-v2.yml":
        "b23372fc59b035e1d5d5e05bd09d4bac527125f7",
    "docs/operators/buy-void-epoch2-dormant-binder-native-candidate-v2.md":
        "d40f3aaf988204084e53d0ec60c629401b6ccc08",
    "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v1.py":
        "5ac4264d7f9bdb394cf5be4490aa1eadd1f929ee",
    "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c":
        "4fdf3f627f407335b9d50800fbbc913d1edae523",
    "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs":
        "9c29eb4716077e459b9154f39d0f30cf2e56729f",
    "scripts/prove_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs":
        "4671d37fcdb43c2bee9d3de16402df0cd25257bb",
    "docs/operators/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.md":
        "cd90bafa39682284a6d9e87daebfe5966adac8d6",
    ".github/workflows/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.yml":
        "2742145ab88d721747f978927a6eb64a7c5f805f",
}

EXPECTED_SCOPE = tuple(sorted((
    ".github/workflows/buy-void-epoch2-dormant-binder-native-candidate-lock-v2.yml",
    "docs/operators/buy-void-epoch2-dormant-binder-native-candidate-lock-v2.md",
    LOCK_REL,
    proofPath if False else "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_lock_v2.py",
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


def run(argv: list[str], *, timeout: int = 240) -> subprocess.CompletedProcess:
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
            "command_failed:"
            + repr(argv)
            + ":"
            + cp.stderr.decode("utf-8", "replace")[-4000:]
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


def load_candidate():
    raw = direct_file(CANDIDATE, 2 * 1024 * 1024)
    if git_blob_sha1(raw) != EXPECTED_BLOBS[CANDIDATE_REL]:
        raise AssertionError("candidate_proof_blob_mismatch")
    spec = importlib.util.spec_from_file_location(
        "void_buy_void_epoch2_dormant_binder_native_candidate_v2",
        CANDIDATE,
    )
    if spec is None or spec.loader is None:
        raise AssertionError("candidate_import_spec_unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verify_repository() -> None:
    if git(["rev-parse", LOCK_BASE + "^{commit}"]) != LOCK_BASE:
        raise AssertionError("lock_base_missing")
    if git(["rev-parse", CANDIDATE_HEAD + "^{commit}"]) != CANDIDATE_HEAD:
        raise AssertionError("candidate_head_missing")
    git(["merge-base", "--is-ancestor", CANDIDATE_HEAD, LOCK_BASE])
    git(["merge-base", "--is-ancestor", LOCK_BASE, "HEAD"])

    for relative, expected in EXPECTED_BLOBS.items():
        actual = git(["rev-parse", "HEAD:" + relative])
        if actual != expected:
            raise AssertionError("dependency_blob_drift:" + relative)

    changed = tuple(sorted(
        line
        for line in git(["diff", "--name-only", LOCK_BASE, "HEAD", "--"]).splitlines()
        if line
    ))
    if changed != EXPECTED_SCOPE:
        raise AssertionError(
            "lock_branch_scope_drift:"
            + json.dumps(changed, separators=(",", ":"))
        )
    if git(["status", "--porcelain=v1", "--untracked-files=all"]) != "":
        raise AssertionError("worktree_dirty")


def rederive_candidate() -> tuple[bytes, dict, bytes]:
    module = load_candidate()
    nested = io.StringIO()
    with contextlib.redirect_stdout(nested):
        module.self_test()
    nested_lines = set(nested.getvalue().splitlines())
    for required in (
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V2_SELF_TEST_GREEN",
        "sealed_source_snapshot=true",
        "checkout_path_is_not_build_authority=true",
        "toolchain_root_custody_verified=true",
        "toolchain_revalidated_after_build=true",
        "substitute_restore_adversary_green=true",
        "candidate_accepted=false",
        "protected_install_authorized=false",
        "live_execution_authorized=false",
        "funds_movement=false",
    ):
        if required not in nested_lines:
            raise AssertionError("nested_candidate_self_test_marker_missing:" + required)
    report, binary = module.derive()
    module.validate(report)

    report_bytes = (module.canonical(report) + "\n").encode("utf-8")
    if len(report_bytes) != EXPECTED_REPORT_BYTES:
        raise AssertionError("candidate_report_bytes_mismatch")
    if sha256(report_bytes) != EXPECTED_REPORT_SHA256:
        raise AssertionError("candidate_report_sha256_mismatch")
    if git_blob_sha1(report_bytes) != EXPECTED_REPORT_GIT_BLOB_SHA1:
        raise AssertionError("candidate_report_git_blob_mismatch")
    if report.get("candidate_id") != EXPECTED_CANDIDATE_ID:
        raise AssertionError("candidate_id_mismatch")

    if len(binary) != EXPECTED_BINARY_BYTES:
        raise AssertionError("candidate_binary_bytes_mismatch")
    if sha256(binary) != EXPECTED_BINARY_SHA256:
        raise AssertionError("candidate_binary_sha256_mismatch")

    binding = report.get("binding_generation")
    if not isinstance(binding, dict):
        raise AssertionError("binding_generation_missing")
    expected_binding = {
        "canonical_main_parent": "b9d44332fc3119ec7a534829502efcff364b1b00",
        "head": "e602fa5b4b6961e9c24d4bbdb60a6d006a2783b2",
        "binder_git_blob_sha1": EXPECTED_BLOBS[
            "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
        ],
        "source_git_blob_sha1": EXPECTED_BLOBS[
            "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
        ],
        "binding_proof_git_blob_sha1": EXPECTED_BLOBS[
            "scripts/prove_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
        ],
        "binding_doc_git_blob_sha1": EXPECTED_BLOBS[
            "docs/operators/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.md"
        ],
        "binding_workflow_git_blob_sha1": EXPECTED_BLOBS[
            ".github/workflows/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.yml"
        ],
    }
    if binding != expected_binding:
        raise AssertionError("binding_generation_identity_mismatch")

    snapshot = report.get("source_snapshot")
    if not isinstance(snapshot, dict):
        raise AssertionError("source_snapshot_missing")
    for key in (
        "checkout_substitute_after_snapshot_cannot_change_build_input",
        "checkout_restore_cannot_rewrite_snapshot_history",
        "snapshot_elf_stable_across_substitute_restore",
        "sealed_write_rejected",
        "write_after_seal_rejected",
        "visible_source_revalidated_after_build",
    ):
        if snapshot.get(key) is not True:
            raise AssertionError("source_snapshot_evidence_missing:" + key)
    if snapshot.get("kind") != "sealed_memfd":
        raise AssertionError("source_snapshot_kind_invalid")
    if snapshot.get("build_input_is_checkout_path") is not False:
        raise AssertionError("checkout_path_build_authority_invalid")

    if report.get("toolchain_revalidated_after_build") is not True:
        raise AssertionError("toolchain_post_build_revalidation_missing")
    if report.get("toolchain", {}).get("root_owned_protected") is not True:
        raise AssertionError("toolchain_root_custody_missing")

    native = report.get("native_source", {})
    binder = report.get("binder_source", {})
    if native.get("git_blob_sha1") != EXPECTED_BLOBS[
        "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
    ]:
        raise AssertionError("native_source_blob_mismatch")
    if native.get("sha256") != (
        "2b9a36da580adaab1e97eca4c5bd730eac7328f1ff9ba6a897d28580395c39d4"
    ):
        raise AssertionError("native_source_sha256_mismatch")
    if binder.get("git_blob_sha1") != EXPECTED_BLOBS[
        "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
    ]:
        raise AssertionError("binder_source_blob_mismatch")
    if binder.get("sha256") != (
        "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e"
    ):
        raise AssertionError("binder_source_sha256_mismatch")

    if (
        "failure_truth_boundary_test_modes=true\n"
        not in module.V1.EXPECTED_SELF_TEST
    ):
        raise AssertionError("failure_truth_self_test_marker_missing")

    authority = report.get("authority")
    if not isinstance(authority, dict):
        raise AssertionError("candidate_authority_missing")
    if authority.get("source_only_candidate") is not True:
        raise AssertionError("candidate_source_only_missing")
    for key in (
        "candidate_accepted",
        "native_binary_identity_accepted",
        "protected_install_authorized",
        "live_execution_authorized",
        "credential_access",
        "private_key_access",
        "signing_authorized",
        "transaction",
        "payment_acceptance",
        "public_presale_activation",
        "wc_void_market_activation",
        "funds_movement",
        "production_host_evidence_authority",
    ):
        if authority.get(key) is not False:
            raise AssertionError("candidate_authority_overclaim:" + key)

    return report_bytes, report, binary


def verify_lock() -> bytes:
    verify_repository()
    report_bytes, report, binary = rederive_candidate()

    raw = direct_file(LOCK, 128 * 1024)
    try:
        lock = json.loads(raw)
    except Exception as exc:
        raise AssertionError("lock_json_invalid") from exc
    if not isinstance(lock, dict):
        raise AssertionError("lock_not_object")

    lock_id = lock.get("lock_id")
    if lock_id != EXPECTED_LOCK_ID:
        raise AssertionError("lock_id_mismatch")
    body = dict(lock)
    body.pop("lock_id", None)
    derived = "voidbuye2dormantbinderlock2_" + sha256(canonical(body))
    if derived != EXPECTED_LOCK_ID:
        raise AssertionError("lock_content_address_mismatch")

    if lock.get("schema") != "void_buy_void_epoch2_dormant_binder_native_candidate_lock_v2":
        raise AssertionError("lock_schema_invalid")
    if lock.get("marker") != "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V2":
        raise AssertionError("lock_marker_invalid")
    if lock.get("version") != 2 or lock.get("repository") != "6ZoSo9/void-node":
        raise AssertionError("lock_version_or_repository_invalid")
    if lock.get("candidate_source_head") != CANDIDATE_HEAD:
        raise AssertionError("candidate_source_head_invalid")
    if lock.get("candidate_merge_head") != LOCK_BASE:
        raise AssertionError("candidate_merge_head_invalid")

    for key, expected in (
        ("candidate_proof_git_blob_sha1", EXPECTED_BLOBS[CANDIDATE_REL]),
        (
            "candidate_workflow_git_blob_sha1",
            EXPECTED_BLOBS[
                ".github/workflows/buy-void-epoch2-dormant-binder-native-candidate-v2.yml"
            ],
        ),
        (
            "merged_v1_proof_git_blob_sha1",
            EXPECTED_BLOBS[
                "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v1.py"
            ],
        ),
        (
            "native_source_git_blob_sha1",
            EXPECTED_BLOBS[
                "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
            ],
        ),
        (
            "binder_source_git_blob_sha1",
            EXPECTED_BLOBS[
                "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
            ],
        ),
    ):
        if lock.get(key) != expected:
            raise AssertionError("lock_dependency_identity_invalid:" + key)

    hosted = lock.get("candidate_hosted_evidence")
    expected_hosted = {
        "workflow_run": 38952316827,
        "source_proof_job": 117146480477,
        "derive_job_a": 117146626692,
        "derive_job_b": 117146626778,
        "derive_job_c": 117146626682,
        "artifact_a": 12069362117,
        "artifact_b": 12068953235,
        "artifact_c": 12069362105,
        "compare_job": 117146811585,
        "three_report_byte_identity_verified": True,
        "three_binary_byte_identity_verified": True,
        "independent_rederivation_verified": True,
        "sealed_source_snapshot_verified": True,
        "toolchain_revalidated_after_build": True,
    }
    if hosted != expected_hosted:
        raise AssertionError("hosted_evidence_identity_invalid")

    candidate = lock.get("candidate_report")
    expected_candidate = {
        "bytes": EXPECTED_REPORT_BYTES,
        "sha256": EXPECTED_REPORT_SHA256,
        "git_blob_sha1": EXPECTED_REPORT_GIT_BLOB_SHA1,
        "candidate_id": EXPECTED_CANDIDATE_ID,
        "binding_generation_head": "e602fa5b4b6961e9c24d4bbdb60a6d006a2783b2",
        "binding_generation_parent": "b9d44332fc3119ec7a534829502efcff364b1b00",
        "native_binary_sha256": EXPECTED_BINARY_SHA256,
        "native_binary_bytes": EXPECTED_BINARY_BYTES,
        "native_source_sha256": "2b9a36da580adaab1e97eca4c5bd730eac7328f1ff9ba6a897d28580395c39d4",
        "binder_source_sha256": "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e",
        "sealed_source_snapshot": True,
        "checkout_path_is_not_build_authority": True,
        "toolchain_root_custody_verified": True,
        "toolchain_revalidated_after_build": True,
        "substitute_restore_adversary_green": True,
        "failure_truth_boundary_test_modes": True,
    }
    if candidate != expected_candidate:
        raise AssertionError("lock_candidate_report_identity_invalid")

    if sha256(report_bytes) != candidate["sha256"]:
        raise AssertionError("rederived_report_not_lock_bound")
    if git_blob_sha1(report_bytes) != candidate["git_blob_sha1"]:
        raise AssertionError("rederived_report_git_blob_not_lock_bound")
    if report.get("candidate_id") != candidate["candidate_id"]:
        raise AssertionError("rederived_candidate_id_not_lock_bound")
    if sha256(binary) != candidate["native_binary_sha256"]:
        raise AssertionError("rederived_binary_not_lock_bound")

    for key in (
        "candidate_accepted",
        "native_binary_identity_accepted",
    ):
        if lock.get(key) is not True:
            raise AssertionError("accepted_identity_missing:" + key)
    for key in (
        "protected_install_authorized",
        "live_execution_authorized",
        "credential_access_authorized",
        "private_key_access_authorized",
        "signing_authorized",
        "transaction_authorized",
        "payment_acceptance_authorized",
        "public_presale_activation_authorized",
        "wc_void_market_activation_authorized",
        "treasury_liquidity_action_authorized",
        "funds_movement_authorized",
        "production_host_evidence_authority",
    ):
        if lock.get(key) is not False:
            raise AssertionError("lock_authority_overclaim:" + key)

    if lock.get("next_gate") != (
        "void_buy_void_epoch2_dormant_binder_native_candidate_materializer_v1"
    ):
        raise AssertionError("lock_next_gate_invalid")

    return raw


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--derive", action="store_true")
    args = parser.parse_args()

    raw = verify_lock()

    if args.derive:
        os.write(1, raw)
        return

    print("VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V2_GREEN")
    print("lock_id=" + EXPECTED_LOCK_ID)
    print("candidate_report_bytes=" + str(EXPECTED_REPORT_BYTES))
    print("candidate_report_sha256=" + EXPECTED_REPORT_SHA256)
    print("candidate_report_git_blob_sha1=" + EXPECTED_REPORT_GIT_BLOB_SHA1)
    print("candidate_id=" + EXPECTED_CANDIDATE_ID)
    print("native_binary_sha256=" + EXPECTED_BINARY_SHA256)
    print("native_binary_bytes=" + str(EXPECTED_BINARY_BYTES))
    print("hosted_three_report_identity_bound=true")
    print("hosted_three_binary_identity_bound=true")
    print("hosted_independent_rederivation_bound=true")
    print("sealed_source_snapshot_bound=true")
    print("checkout_path_is_not_build_authority=true")
    print("toolchain_root_custody_bound=true")
    print("toolchain_revalidated_after_build=true")
    print("substitute_restore_adversary_bound=true")
    print("failure_truth_boundary_test_modes=true")
    print("candidate_accepted=true")
    print("native_binary_identity_accepted=true")
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
    print(
        "next_gate="
        "void_buy_void_epoch2_dormant_binder_native_candidate_materializer_v1"
    )


if __name__ == "__main__":
    main()
