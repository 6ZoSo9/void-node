#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
LOCK_REL = "ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
LOCK = ROOT / LOCK_REL
CANDIDATE_REL = "scripts/prove_buy_void_epoch2_dormant_first_entry_bootstrap_v6_candidate_v1.py"
CANDIDATE = ROOT / CANDIDATE_REL
WORKFLOW_REL = ".github/workflows/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-v1.yml"
DOC_REL = "docs/operators/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-v1.md"
SOURCE_REL = "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6.c"
MANIFEST_REL = "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
INSTALLER_REL = "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v5.py"
OLD_V5_LOCK_REL = "ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v5-candidate-lock-v1.json"
OLD_V4_LOCK_REL = "ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v4-candidate-lock-v1.json"

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CANDIDATE_LOCK_V1"
LOCK_ID = "voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
CANDIDATE_HEAD = "404367eb982fa92a40f3c2fe51d5f172a1e9fac0"
CANDIDATE_TREE = "724f501caeb7fa888b3b93f55ff5da08a577088a"
SUPERSEDED_V5_LOCK = "voidbuye2dormantbootstraplock2_f2e419eb1643989a4b881b2d817ff097eff9d68d6d763a933d624301a93930e3"
SUPERSEDED_V4_LOCK = "voidbuye2dormantbootstraplock1_ffd5e877b4bf594b7af4eac3f03fd7b846686949febcae54318ef08ee5793796"

EXPECTED_REPORT_BYTES = 2745
EXPECTED_REPORT_SHA256 = "14a8c9b60440f81d906070d3efee3248ac60b2a4ae43783fe5c1484ff0847c3d"
EXPECTED_REPORT_GIT_BLOB = "d0302cf5a1b7af91b46458585784c70e0d37432f"
EXPECTED_CANDIDATE_ID = "voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
EXPECTED_BINARY_BYTES = 874608
EXPECTED_BINARY_SHA256 = "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
EXPECTED_BINARY_GIT_BLOB = "b577d70666f98ac59a75b84b3dab741fe7b93a4b"

ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/tmp",
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

def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")

def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()

def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
        env=ENV,
    )
    if cp.returncode != 0 or cp.stderr:
        raise AssertionError("git_failed:" + ":".join(args))
    return cp.stdout.strip()

lock = json.loads(LOCK.read_bytes())
assert lock["schema"] == "void_buy_void_epoch2_dormant_first_entry_bootstrap_v6_candidate_lock_v1"
assert lock["marker"] == MARKER
assert lock["version"] == 1
assert lock["repository"] == "6ZoSo9/void-node"
assert lock["lock_id"] == LOCK_ID
body = dict(lock)
body.pop("lock_id")
assert LOCK_ID == "voidbuye2dormantbootstraplock3_" + sha256(canonical(body))

assert lock["candidate_source_head"] == CANDIDATE_HEAD
assert lock["candidate_source_tree"] == CANDIDATE_TREE
assert lock["candidate_merge"] == CANDIDATE_HEAD
assert git("rev-parse", CANDIDATE_HEAD + "^{tree}") == CANDIDATE_TREE
assert subprocess.run(
    ["/usr/bin/git", "-C", str(ROOT), "merge-base", "--is-ancestor", CANDIDATE_HEAD, "HEAD"],
    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    check=False, timeout=20,
    env={"PATH":"/usr/bin:/bin","HOME":"/tmp","LANG":"C","LC_ALL":"C",
         "GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null",
         "GIT_CONFIG_SYSTEM":"/dev/null","GIT_NO_REPLACE_OBJECTS":"1",
         "GIT_OPTIONAL_LOCKS":"0"},
).returncode == 0

assert lock["source_generation"] == {
    "id": "voidbuye2dormantsourcegen3_8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9",
    "manifest_git_blob_sha1": "de56bacb30bea0adc418e240cf3fb8d900b061ef",
    "manifest_bytes": 2382,
    "manifest_sha256": "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9",
    "bootstrap_source_git_blob_sha1": "560726bcae6ea0738502cb5e74b65f9116bd447d",
    "bootstrap_source_bytes": 106792,
    "bootstrap_source_sha256": "ac8673f51e4325e3ed1912a4f628cc3715c7199cda1c3cbdacbbcb710ae6b145",
    "inner_installer_git_blob_sha1": "ce6930bc1be8239a3171d4922c44b96a50f5778b",
    "inner_installer_bytes": 127528,
    "inner_installer_sha256": "c9fbb7ce1c1788b52837635243c6393fc731ef12a7217cc9155d6ff86bd97bfb",
}

assert lock["candidate_hosted_evidence"] == {
    "workflow_run": 39077019801,
    "source_proof_job": 117526163023,
    "derive_job_a": 117526232018,
    "derive_job_b": 117526232033,
    "derive_job_c": 117526232057,
    "compare_job": 117526492254,
    "artifact_a": 12116918415,
    "artifact_b": 12117740915,
    "artifact_c": 12117910498,
    "three_report_byte_identity_verified": True,
    "three_binary_byte_identity_verified": True,
    "independent_rederivation_verified": True,
}

assert lock["candidate_report"] == {
    "candidate_id": "voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2",
    "bytes": 2745,
    "sha256": "14a8c9b60440f81d906070d3efee3248ac60b2a4ae43783fe5c1484ff0847c3d",
    "git_blob_sha1": "d0302cf5a1b7af91b46458585784c70e0d37432f",
    "candidate_script_git_blob_sha1": "e4e8ca7f5ca3fbc935821ce6d607751fcd653658",
    "candidate_workflow_git_blob_sha1": "cfc99617fb69f6cb945b806c6b3b153086eeb159",
    "candidate_doc_git_blob_sha1": "e5f4023f0b60ce5ef144f91b8f95bb9094a1dfce",
    "sealed_source_snapshot": True,
    "checkout_path_is_not_build_authority": True,
    "compiler_logical_source_name": "stdin",
    "distinct_source_fd_numbers_exercised": True,
    "descriptor_number_not_candidate_identity": True,
    "toolchain_revalidated_after_build": True,
}

assert lock["native_binary"] == {
    "bytes": 874608,
    "sha256": "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c",
    "static_no_interp": True,
    "two_builds_byte_identical": True,
    "distinct_source_fd_builds_byte_identical": True,
    "hosted_three_way_byte_identical": True,
    "independent_rederivation_verified": True,
}

assert lock["superseded_sourcegen3_lock"] == "voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
assert lock["superseded_sourcegen3_lock_git_blob_sha1"] == "f5b03c6b81016edf21f605099e0ef8976f40e107"
assert lock["superseded_sourcegen3_lock_install_authority"] is False
assert lock["superseded_sourcegen2_lock"] == SUPERSEDED_V5_LOCK
assert lock["superseded_sourcegen2_lock_git_blob_sha1"] == "46f8512395936f5fc81423ce31a5c9b88928a21f"
assert lock["superseded_sourcegen2_lock_install_authority"] is False
assert lock["superseded_sourcegen1_lock"] == SUPERSEDED_V4_LOCK
assert lock["superseded_sourcegen1_lock_git_blob_sha1"] == "471a52641135ee3ce31d521980e6ea37af18ce58"
assert lock["superseded_sourcegen1_lock_install_authority"] is False

expected_blobs = {
    CANDIDATE_REL: "e4e8ca7f5ca3fbc935821ce6d607751fcd653658",
    WORKFLOW_REL: "cfc99617fb69f6cb945b806c6b3b153086eeb159",
    DOC_REL: "e5f4023f0b60ce5ef144f91b8f95bb9094a1dfce",
    SOURCE_REL: "560726bcae6ea0738502cb5e74b65f9116bd447d",
    MANIFEST_REL: "de56bacb30bea0adc418e240cf3fb8d900b061ef",
    INSTALLER_REL: "ce6930bc1be8239a3171d4922c44b96a50f5778b",
    OLD_V5_LOCK_REL: "46f8512395936f5fc81423ce31a5c9b88928a21f",
    OLD_V4_LOCK_REL: "471a52641135ee3ce31d521980e6ea37af18ce58",
}
for rel, expected in expected_blobs.items():
    if rel == WORKFLOW_REL:
        # Hosted candidate evidence binds the exact workflow at CANDIDATE_HEAD.
        # The current workflow may broaden CI scope without rewriting that evidence.
        assert git("rev-parse", CANDIDATE_HEAD + ":" + rel) == expected, rel
        continue
    raw=(ROOT/rel).read_bytes()
    assert git_blob(raw) == expected, (rel, git_blob(raw))
    assert git("rev-parse", "HEAD:" + rel) == expected, rel

for key in ("candidate_accepted","native_binary_identity_accepted","source_generation_identity_accepted"):
    assert lock[key] is True
for key in (
    "protected_install_authorized","live_execution_authorized",
    "credential_access_authorized","private_key_access_authorized",
    "signing_authorized","transaction_authorized","rpc_call_authorized",
    "payment_acceptance_authorized","public_presale_activation_authorized",
    "wc_void_market_activation_authorized","treasury_liquidity_action_authorized",
    "funds_movement_authorized","production_host_evidence_authority",
):
    assert lock[key] is False, key

assert lock["next_gate"] == "void_buy_void_epoch2_dormant_first_entry_bootstrap_v6_materializer_v1"


def direct_file(path: Path, maximum: int) -> bytes:
    st = path.lstat()
    if not path.is_file():
        raise AssertionError("candidate_output_not_regular:" + path.name)
    raw = path.read_bytes()
    if len(raw) < 1 or len(raw) > maximum or len(raw) != st.st_size:
        raise AssertionError("candidate_output_size_invalid:" + path.name)
    return raw


def rederive_candidate_at_merge() -> None:
    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v6-lock-") as td:
        temp = Path(td)
        worktree = temp / "candidate-worktree"
        output = temp / "candidate-output"
        added = False
        try:
            add = subprocess.run(
                [
                    "/usr/bin/git", "-C", str(ROOT), "worktree", "add",
                    "--detach", str(worktree), CANDIDATE_HEAD,
                ],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=ENV,
                check=False,
                timeout=60,
            )
            if add.returncode != 0:
                raise AssertionError(
                    "candidate_worktree_add_failed:"
                    + add.stderr.decode("utf-8", "replace")[-2000:]
                )
            added = True
            candidate = worktree / CANDIDATE_REL
            derive = subprocess.run(
                [
                    "/usr/bin/python3", "-I", "-B", str(candidate),
                    "--derive-dir", str(output),
                ],
                cwd=worktree,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=ENV,
                check=False,
                timeout=180,
            )
            if derive.returncode != 0:
                raise AssertionError(
                    "canonical_candidate_rederive_failed:"
                    + derive.stderr.decode("utf-8", "replace")[-3000:]
                )

            report_raw = direct_file(output / "candidate-v1.json", 128 * 1024)
            binary_raw = direct_file(output / "bootstrap-v6", 2 * 1024 * 1024)
            if (
                len(report_raw) != EXPECTED_REPORT_BYTES
                or sha256(report_raw) != EXPECTED_REPORT_SHA256
                or git_blob(report_raw) != EXPECTED_REPORT_GIT_BLOB
            ):
                raise AssertionError("canonical_candidate_report_identity_mismatch")
            if (
                len(binary_raw) != EXPECTED_BINARY_BYTES
                or sha256(binary_raw) != EXPECTED_BINARY_SHA256
                or git_blob(binary_raw) != EXPECTED_BINARY_GIT_BLOB
            ):
                raise AssertionError("canonical_candidate_binary_identity_mismatch")

            report_value = json.loads(report_raw)
            if report_value.get("candidate_id") != EXPECTED_CANDIDATE_ID:
                raise AssertionError("canonical_candidate_id_mismatch")
            build_input = report_value.get("build_input")
            binary = report_value.get("binary")
            if (
                not isinstance(build_input, dict)
                or build_input.get("compiler_logical_source_name") != "stdin"
                or build_input.get("distinct_source_fd_numbers_exercised") is not True
                or build_input.get("descriptor_number_not_candidate_identity") is not True
                or not isinstance(binary, dict)
                or binary.get("distinct_source_fd_builds_byte_identical") is not True
            ):
                raise AssertionError("descriptor_independent_candidate_contract_missing")
        finally:
            if added:
                cleanup = subprocess.run(
                    [
                        "/usr/bin/git", "-C", str(ROOT), "worktree", "remove",
                        "--force", str(worktree),
                    ],
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    env=ENV,
                    check=False,
                    timeout=60,
                )
                if cleanup.returncode != 0:
                    raise AssertionError("candidate_worktree_cleanup_failed")


rederive_candidate_at_merge()

cp=subprocess.run(
    ["/usr/bin/python3","-I","-B",str(CANDIDATE),"--self-test"],
    cwd=ROOT, stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    text=True, check=False, timeout=30,
)
assert cp.returncode == 0, cp.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CANDIDATE_V1_SELF_TEST_GREEN",
    "exact_source_generation_bound=true",
    "sealed_source_snapshot_required=true",
    "checkout_path_is_not_build_authority=true",
    "compiler_logical_source_name=stdin",
    "distinct_source_fd_numbers_required=true",
    "descriptor_number_not_candidate_identity=true",
    "three_hosted_derivations_required=true",
    "independent_rederivation_required=true",
    "candidate_accepted=false",
    "protected_install_authorized=false",
):
    assert line in cp.stdout.splitlines(), line

print(MARKER + "_PROOF_GREEN")
print("lock_id=" + LOCK_ID)
print("exact_pr_head_candidate_evidence_bound=true")
print("canonical_candidate_merge_rederived=true")
print("descriptor_independent_candidate_rederived=true")
print("hosted_three_way_candidate_identity_bound=true")
print("independent_rederivation_bound=true")
print("candidate_report_content_address_bound=true")
print("source_generation_identity_accepted=true")
print("candidate_accepted=true")
print("native_binary_identity_accepted=true")
print("superseded_sourcegen3_lock_install_authority=false")
print("superseded_sourcegen2_lock_install_authority=false")
print("superseded_sourcegen1_lock_install_authority=false")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement_authorized=false")
print("next_gate=void_buy_void_epoch2_dormant_first_entry_bootstrap_v6_materializer_v1")
