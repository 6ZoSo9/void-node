#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v2.json"
)
LOCK_BLOB = "a55acded2065e90286832da3e23edf8ab13827d8"

CANDIDATE_REL = (
    "scripts/"
    "prove_buy_void_epoch2_dormant_first_entry_bootstrap_v6_candidate_v1.py"
)
CANDIDATE_BLOB = "e4e8ca7f5ca3fbc935821ce6d607751fcd653658"
CANDIDATE_WORKFLOW_REL = (
    ".github/workflows/"
    "buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-v1.yml"
)
CANDIDATE_WORKFLOW_BLOB = "cfc99617fb69f6cb945b806c6b3b153086eeb159"
CANDIDATE_DOC_REL = (
    "docs/operators/"
    "buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-v1.md"
)
CANDIDATE_DOC_BLOB = "e5f4023f0b60ce5ef144f91b8f95bb9094a1dfce"

SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v6.c"
)
SOURCE_BLOB = "560726bcae6ea0738502cb5e74b65f9116bd447d"

MANIFEST_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
)
MANIFEST_BLOB = "de56bacb30bea0adc418e240cf3fb8d900b061ef"

INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_protected_install_v5.py"
)
INSTALLER_BLOB = "ce6930bc1be8239a3171d4922c44b96a50f5778b"

PREDECESSOR_LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
)
PREDECESSOR_LOCK_BLOB = "f5b03c6b81016edf21f605099e0ef8976f40e107"
PREDECESSOR_LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
)

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "BOOTSTRAP_V6_CANDIDATE_LOCK_V2"
)
LOCK_ID = (
    "voidbuye2dormantbootstraplock3r_"
    "9025557c46c1b5ba8ece40f89808616a0b099de887234a2f151d0c57ad9734c8"
)

CANDIDATE_HEAD = "404367eb982fa92a40f3c2fe51d5f172a1e9fac0"
CANDIDATE_TREE = "724f501caeb7fa888b3b93f55ff5da08a577088a"

SOURCE_GENERATION_ID = (
    "voidbuye2dormantsourcegen3_"
    "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9"
)

EXPECTED_REPORT_BYTES = 2745
EXPECTED_REPORT_SHA256 = (
    "14a8c9b60440f81d906070d3efee3248ac60b2a4ae43783fe5c1484ff0847c3d"
)
EXPECTED_REPORT_GIT_BLOB = "d0302cf5a1b7af91b46458585784c70e0d37432f"
EXPECTED_CANDIDATE_ID = (
    "voidbuye2dormantbootstrapcand3_"
    "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
)

EXPECTED_BINARY_BYTES = 874608
EXPECTED_BINARY_SHA256 = (
    "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
)
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
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
        env=ENV,
    )
    if cp.returncode != 0 or cp.stderr:
        raise AssertionError(
            "git_failed:"
            + ":".join(args)
            + ":"
            + cp.stderr[-1000:]
        )
    return cp.stdout.strip()


def require_head_blob(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    actual = git_blob(raw)
    if actual != expected:
        raise AssertionError(
            "blob_mismatch:" + relative + ":" + actual
        )
    if git("rev-parse", "HEAD:" + relative) != expected:
        raise AssertionError("head_blob_mismatch:" + relative)
    return raw


lock_raw = require_head_blob(LOCK_REL, LOCK_BLOB)
lock = json.loads(lock_raw)

assert lock["schema"] == (
    "void_buy_void_epoch2_dormant_first_entry_"
    "bootstrap_v6_candidate_lock_v2"
)
assert lock["marker"] == MARKER
assert lock["version"] == 2
assert lock["repository"] == "6ZoSo9/void-node"
assert lock["lock_id"] == LOCK_ID

lock_body = dict(lock)
lock_body.pop("lock_id")
assert LOCK_ID == (
    "voidbuye2dormantbootstraplock3r_"
    + sha256(canonical(lock_body))
)

assert lock["candidate_source_head"] == CANDIDATE_HEAD
assert lock["candidate_source_tree"] == CANDIDATE_TREE
assert lock["candidate_merge"] == CANDIDATE_HEAD
assert git("rev-parse", CANDIDATE_HEAD + "^{tree}") == CANDIDATE_TREE

ancestor = subprocess.run(
    [
        "/usr/bin/git",
        "-C",
        str(ROOT),
        "merge-base",
        "--is-ancestor",
        CANDIDATE_HEAD,
        "HEAD",
    ],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    check=False,
    timeout=30,
    env=ENV,
)
assert ancestor.returncode == 0

assert lock["source_generation"] == {
    "id": SOURCE_GENERATION_ID,
    "manifest_git_blob_sha1": MANIFEST_BLOB,
    "manifest_bytes": 2382,
    "manifest_sha256":
        "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9",
    "bootstrap_source_git_blob_sha1": SOURCE_BLOB,
    "bootstrap_source_bytes": 106792,
    "bootstrap_source_sha256":
        "ac8673f51e4325e3ed1912a4f628cc3715c7199cda1c3cbdacbbcb710ae6b145",
    "inner_installer_git_blob_sha1": INSTALLER_BLOB,
    "inner_installer_bytes": 127528,
    "inner_installer_sha256":
        "c9fbb7ce1c1788b52837635243c6393fc731ef12a7217cc9155d6ff86bd97bfb",
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
    "candidate_id": EXPECTED_CANDIDATE_ID,
    "bytes": EXPECTED_REPORT_BYTES,
    "sha256": EXPECTED_REPORT_SHA256,
    "git_blob_sha1": EXPECTED_REPORT_GIT_BLOB,
    "candidate_script_git_blob_sha1": CANDIDATE_BLOB,
    "candidate_workflow_git_blob_sha1": CANDIDATE_WORKFLOW_BLOB,
    "candidate_doc_git_blob_sha1": CANDIDATE_DOC_BLOB,
    "sealed_source_snapshot": True,
    "checkout_path_is_not_build_authority": True,
    "compiler_logical_source_name": "stdin",
    "distinct_source_fd_numbers_exercised": True,
    "descriptor_number_not_candidate_identity": True,
    "toolchain_revalidated_after_build": True,
}

assert lock["native_binary"] == {
    "bytes": EXPECTED_BINARY_BYTES,
    "sha256": EXPECTED_BINARY_SHA256,
    "git_blob_sha1": EXPECTED_BINARY_GIT_BLOB,
    "static_no_interp": True,
    "two_builds_byte_identical": True,
    "distinct_source_fd_builds_byte_identical": True,
    "hosted_three_way_byte_identical": True,
    "independent_rederivation_verified": True,
}

assert lock["cruft_mtimes_compatibility_accepted"] is True
assert lock["cruft_mtimes_non_authoritative"] is True
assert lock["cruft_mtimes_private_object_view_copy"] is False

assert lock["superseded_pre_cruft_lock"] == PREDECESSOR_LOCK_ID
assert (
    lock["superseded_pre_cruft_lock_git_blob_sha1"]
    == PREDECESSOR_LOCK_BLOB
)
assert lock["superseded_pre_cruft_lock_install_authority"] is False

for key in (
    "candidate_accepted",
    "native_binary_identity_accepted",
    "source_generation_identity_accepted",
):
    assert lock[key] is True

for key in (
    "protected_install_authorized",
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
):
    assert lock[key] is False, key

assert lock["next_gate"] == (
    "void_buy_void_epoch2_dormant_first_entry_"
    "bootstrap_v6_materializer_v2"
)

candidate_raw = require_head_blob(CANDIDATE_REL, CANDIDATE_BLOB)
require_head_blob(CANDIDATE_WORKFLOW_REL, CANDIDATE_WORKFLOW_BLOB)
require_head_blob(CANDIDATE_DOC_REL, CANDIDATE_DOC_BLOB)
source_raw = require_head_blob(SOURCE_REL, SOURCE_BLOB)
require_head_blob(MANIFEST_REL, MANIFEST_BLOB)
require_head_blob(INSTALLER_REL, INSTALLER_BLOB)

predecessor_raw = require_head_blob(
    PREDECESSOR_LOCK_REL,
    PREDECESSOR_LOCK_BLOB,
)
predecessor = json.loads(predecessor_raw)
assert predecessor["lock_id"] == PREDECESSOR_LOCK_ID
assert predecessor["candidate_accepted"] is True
assert predecessor["native_binary_identity_accepted"] is True
assert predecessor["source_generation_identity_accepted"] is True
assert predecessor["protected_install_authorized"] is False
assert predecessor["live_execution_authorized"] is False
assert predecessor["funds_movement_authorized"] is False
assert (
    predecessor["superseded_sourcegen2_lock_install_authority"]
    is False
)
assert (
    predecessor["superseded_sourcegen1_lock_install_authority"]
    is False
)

source_text = source_raw.decode("utf-8", "strict")
auxiliary_clause = (
    'strcmp(suffix,".rev") && '
    'strcmp(suffix,".bitmap") && '
    'strcmp(suffix,".keep") && '
    'strcmp(suffix,".mtimes")'
)
assert auxiliary_clause in source_text
assert source_text.count('strcmp(suffix,".mtimes")') == 1
assert 'if (!pack && !index) {' in source_text
assert 'pin_pack_file(reader,relative);' in source_text

candidate_text = candidate_raw.decode("utf-8", "strict")
for required in (
    '"source_generation_id"',
    '"bootstrap_source"',
    '"manifest"',
    '"candidate_id"',
    '"candidate_accepted": False',
    '"protected_install_authorized": False',
    '"funds_movement": False',
    "def derive(",
    "def compare_dir(",
):
    assert required in candidate_text, required


def direct_file(path: Path, maximum: int) -> bytes:
    st = path.lstat()
    if not path.is_file():
        raise AssertionError("candidate_output_not_regular:" + path.name)
    raw = path.read_bytes()
    if len(raw) < 1 or len(raw) > maximum or len(raw) != st.st_size:
        raise AssertionError("candidate_output_size_invalid:" + path.name)
    return raw


def rederive_candidate_at_source_head() -> None:
    with tempfile.TemporaryDirectory(
        prefix="void-e2-bootstrap-v6-cruft-lock-"
    ) as td:
        temp = Path(td)
        worktree = temp / "candidate-worktree"
        output = temp / "candidate-output"
        added = False
        try:
            add = subprocess.run(
                [
                    "/usr/bin/git",
                    "-C",
                    str(ROOT),
                    "worktree",
                    "add",
                    "--detach",
                    str(worktree),
                    CANDIDATE_HEAD,
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

            derive = subprocess.run(
                [
                    "/usr/bin/python3",
                    "-I",
                    "-B",
                    str(worktree / CANDIDATE_REL),
                    "--derive-dir",
                    str(output),
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
                    "candidate_rederive_failed:"
                    + derive.stderr.decode("utf-8", "replace")[-3000:]
                )

            report_raw = direct_file(
                output / "candidate-v1.json",
                128 * 1024,
            )
            binary_raw = direct_file(
                output / "bootstrap-v6",
                2 * 1024 * 1024,
            )
            if (
                len(report_raw) != EXPECTED_REPORT_BYTES
                or sha256(report_raw) != EXPECTED_REPORT_SHA256
                or git_blob(report_raw) != EXPECTED_REPORT_GIT_BLOB
            ):
                raise AssertionError(
                    "candidate_report_identity_mismatch"
                )
            if (
                len(binary_raw) != EXPECTED_BINARY_BYTES
                or sha256(binary_raw) != EXPECTED_BINARY_SHA256
                or git_blob(binary_raw) != EXPECTED_BINARY_GIT_BLOB
            ):
                raise AssertionError(
                    "candidate_binary_identity_mismatch"
                )

            report_value = json.loads(report_raw)
            assert report_value["candidate_id"] == EXPECTED_CANDIDATE_ID
            assert (
                report_value["source_generation_id"]
                == SOURCE_GENERATION_ID
            )
            assert (
                report_value["bootstrap_source"]["git_blob_sha1"]
                == SOURCE_BLOB
            )
            assert (
                report_value["manifest"]["git_blob_sha1"]
                == MANIFEST_BLOB
            )
            assert (
                report_value["authority"]["candidate_accepted"]
                is False
            )
            assert (
                report_value["authority"]["protected_install_authorized"]
                is False
            )
            assert (
                report_value["authority"]["funds_movement"]
                is False
            )
        finally:
            if added:
                cleanup = subprocess.run(
                    [
                        "/usr/bin/git",
                        "-C",
                        str(ROOT),
                        "worktree",
                        "remove",
                        "--force",
                        str(worktree),
                    ],
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    env=ENV,
                    check=False,
                    timeout=60,
                )
                if cleanup.returncode != 0:
                    raise AssertionError(
                        "candidate_worktree_cleanup_failed"
                    )


rederive_candidate_at_source_head()

cp = subprocess.run(
    [
        "/usr/bin/python3",
        "-I",
        "-B",
        str(ROOT / CANDIDATE_REL),
        "--self-test",
    ],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env=ENV,
)
assert cp.returncode == 0, cp.stderr

for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "BOOTSTRAP_V6_CANDIDATE_V1_SELF_TEST_GREEN",
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
print("repaired_source_generation_bound=true")
print("cruft_mtimes_compatibility_accepted=true")
print("cruft_mtimes_non_authoritative=true")
print("cruft_mtimes_private_object_view_copy=false")
print("candidate_source_head_rederived=true")
print("hosted_three_way_candidate_identity_bound=true")
print("independent_rederivation_bound=true")
print("candidate_report_content_address_bound=true")
print("candidate_accepted=true")
print("native_binary_identity_accepted=true")
print("source_generation_identity_accepted=true")
print("superseded_pre_cruft_lock_preserved=true")
print("superseded_pre_cruft_lock_install_authority=false")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement_authorized=false")
print(
    "next_gate="
    "void_buy_void_epoch2_dormant_first_entry_"
    "bootstrap_v6_materializer_v2"
)
