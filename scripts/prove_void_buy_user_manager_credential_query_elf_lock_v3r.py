#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
from typing import Any

ROOT = Path(__file__).resolve().parents[1]

LOCK_BASE_MAIN = "3d6f40ddb57f1ca56167b893da6cda5f16f5a9b6"
SOURCE_PARENT = "6d8d0725a36d7907e4620371952aa71fd64696df"
CANDIDATE_HEAD = "a8f133c7542491af1e48018e917f0cbcd73cf15f"

PEER_SOURCE = "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c"
QUERY_SOURCE = "ops/precision/void_buy_void_user_manager_private_credential_unit_query_v3.c"
QUERY_PROOF = "scripts/prove_void_buy_user_manager_private_credential_unit_query_v3.mjs"
PREEXEC_SOURCE = "ops/precision/void_buy_void_user_manager_private_credential_unit_query_preexec_v1.c"
PREEXEC_PROOF = "scripts/prove_void_buy_void_user_manager_private_credential_unit_query_preexec_v1.mjs"
V2_LOCK = "ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json"

CANDIDATE_WORKFLOW = ".github/workflows/buy-void-user-manager-credential-query-elf-candidate-v3.yml"
CANDIDATE_DOC = "docs/operators/buy-void-user-manager-credential-query-elf-candidate-v3.md"
CANDIDATE_PROOF = "scripts/prove_void_buy_user_manager_credential_query_elf_candidate_v3.py"

LOCK_FILE = "ops/security/buy-void-user-manager-credential-query-elf-lock-v3r.json"
SELF = "scripts/prove_void_buy_user_manager_credential_query_elf_lock_v3r.py"
WORKFLOW = ".github/workflows/buy-void-user-manager-credential-query-elf-lock-v3r.yml"
DOC = "docs/operators/buy-void-user-manager-credential-query-elf-lock-v3r.md"

EXPECTED_SCOPE = tuple(sorted((LOCK_FILE, SELF, WORKFLOW, DOC)))
EXPECTED_CURRENT_BLOBS = {
    PEER_SOURCE: "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
    QUERY_SOURCE: "0d0e9546aea6e7346f5b35559bcdd8e7788900fe",
    QUERY_PROOF: "f640e7fc19b33513360b2247ac1bdc705f848f4f",
    PREEXEC_SOURCE: "0ccd2d07a951389d85a9fc56ec892a774d9dd681",
    PREEXEC_PROOF: "58df08ca966f4629893c3885f1df37c837762520",
    V2_LOCK: "b73415ce8fc95ff2d49cbde97a15d701ad5b7937",
}
EXPECTED_CANDIDATE_BLOBS = {
    CANDIDATE_WORKFLOW: "c0e00a0efe5b34a4b9637647194a3cb236d8e160",
    CANDIDATE_DOC: "52cd83978f00153274e7510035058c7719aa6318",
    CANDIDATE_PROOF: "4caf5efbcf750e8ab8d687c75e26948f53662a99",
    PEER_SOURCE: EXPECTED_CURRENT_BLOBS[PEER_SOURCE],
    QUERY_SOURCE: EXPECTED_CURRENT_BLOBS[QUERY_SOURCE],
    QUERY_PROOF: EXPECTED_CURRENT_BLOBS[QUERY_PROOF],
    PREEXEC_SOURCE: EXPECTED_CURRENT_BLOBS[PREEXEC_SOURCE],
    PREEXEC_PROOF: EXPECTED_CURRENT_BLOBS[PREEXEC_PROOF],
}

V2_LOCK_ID = (
    "voidbuyumqcredelflock2_"
    "c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54"
)
LOCK_ID = (
    "voidbuyumqcredelflock3r_"
    "8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34"
)
CANDIDATE_ID = (
    "voidbuyumqcredelfcand3_"
    "b5c405437bd40582908e097a6f021bd575315d018a9d8457af6549458cbe0922"
)

METADATA_BYTES = 62948
METADATA_SHA256 = "4ec781f2fb9a8e6c84246c12d7634f895f93b1c5cbc7cda07ce655a4475b55b2"
METADATA_GIT_BLOB = "8892892149203a027872034cbe4521c147d03e46"
PREEXEC_BYTES = 706504
PREEXEC_SHA256 = "67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c"
QUERY_BYTES = 47160
QUERY_SHA256 = "d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923"

CLEAN_ENV = {
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

def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(raw)}\0".encode("ascii"))
    h.update(raw)
    return h.hexdigest()

def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

def run(
    argv: list[str],
    *,
    cwd: Path = ROOT,
    timeout: int = 180,
    input_bytes: bytes | None = None,
) -> subprocess.CompletedProcess[bytes]:
    result = subprocess.run(
        argv,
        cwd=cwd,
        env=CLEAN_ENV,
        stdin=subprocess.PIPE if input_bytes is not None else subprocess.DEVNULL,
        input=input_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise AssertionError(
            "command failed: "
            + repr(argv)
            + " stderr="
            + result.stderr.decode("utf-8", "replace")[-4000:]
        )
    return result

def git(args: list[str], *, cwd: Path = ROOT) -> str:
    return run(
        ["/usr/bin/git", "--no-replace-objects", "-C", os.fspath(cwd), *args],
        cwd=cwd,
        timeout=60,
    ).stdout.decode("utf-8", "strict").strip()

def read_file(path: Path, max_bytes: int = 4 * 1024 * 1024) -> bytes:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > max_bytes
    ):
        raise AssertionError("invalid file metadata: " + str(path))
    raw = path.read_bytes()
    after = path.lstat()
    if (
        before.st_dev,
        before.st_ino,
        before.st_size,
        before.st_mtime_ns,
        before.st_ctime_ns,
    ) != (
        after.st_dev,
        after.st_ino,
        after.st_size,
        after.st_mtime_ns,
        after.st_ctime_ns,
    ):
        raise AssertionError("file changed while reading: " + str(path))
    if len(raw) != before.st_size:
        raise AssertionError("file size drift: " + str(path))
    return raw

def expected_lock_body() -> dict[str, Any]:
    return {
        "schema": "void_buy_void_user_manager_credential_query_elf_lock_v3_repaired",
        "marker": "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V3_REPAIRED",
        "version": 3,
        "repository": "6ZoSo9/void-node",
        "source_parent": SOURCE_PARENT,
        "candidate_head": CANDIDATE_HEAD,
        "lock_base_main": LOCK_BASE_MAIN,
        "candidate_hosted_evidence": {
            "workflow_run": 38852664866,
            "artifact_a": 12025587886,
            "artifact_a_digest": "sha256:00cffbe37139a597d9d74f729a8c1e5169ab3df69344c015963af761fd486e69",
            "artifact_b": 12025533003,
            "artifact_b_digest": "sha256:a8e90b3f570420f8c755975415cf3cd18acf0a7a606baf7ff42159708de20c32",
            "artifact_c": 12025933150,
            "artifact_c_digest": "sha256:ce5d6a2c398a69b3e1c0545b5ebdef501b41e4d4e13941e8756fa4fcf353a285",
            "cross_job_byte_identity_verified": True,
            "independent_toolchain_rederivation_verified": True,
            "exact_v2_preexec_identity_verified": True,
        },
        "candidate_evidence": {
            "metadata_bytes": METADATA_BYTES,
            "metadata_sha256": METADATA_SHA256,
            "metadata_git_blob_sha1": METADATA_GIT_BLOB,
            "candidate_id": CANDIDATE_ID,
            "workflow_path": CANDIDATE_WORKFLOW,
            "workflow_git_blob_sha1": EXPECTED_CANDIDATE_BLOBS[CANDIDATE_WORKFLOW],
            "candidate_proof_path": CANDIDATE_PROOF,
            "candidate_proof_git_blob_sha1": EXPECTED_CANDIDATE_BLOBS[CANDIDATE_PROOF],
            "credential_query_source_git_blob_sha1": EXPECTED_CANDIDATE_BLOBS[QUERY_SOURCE],
            "credential_query_proof_git_blob_sha1": EXPECTED_CANDIDATE_BLOBS[QUERY_PROOF],
            "credential_preexec_source_git_blob_sha1": EXPECTED_CANDIDATE_BLOBS[PREEXEC_SOURCE],
            "credential_preexec_proof_git_blob_sha1": EXPECTED_CANDIDATE_BLOBS[PREEXEC_PROOF],
            "preexec_binary_sha256": PREEXEC_SHA256,
            "preexec_binary_bytes": PREEXEC_BYTES,
            "query_binary_sha256": QUERY_SHA256,
            "query_binary_bytes": QUERY_BYTES,
            "complete_native_toolchain_closure_bound": True,
            "candidate_metadata_exact_rederivation_required": True,
        },
        "lock_tree_source_identity": {
            "peer_source_git_blob_sha1": EXPECTED_CURRENT_BLOBS[PEER_SOURCE],
            "credential_query_source_git_blob_sha1": EXPECTED_CURRENT_BLOBS[QUERY_SOURCE],
            "credential_query_proof_git_blob_sha1": EXPECTED_CURRENT_BLOBS[QUERY_PROOF],
            "credential_preexec_source_git_blob_sha1": EXPECTED_CURRENT_BLOBS[PREEXEC_SOURCE],
            "credential_preexec_proof_git_blob_sha1": EXPECTED_CURRENT_BLOBS[PREEXEC_PROOF],
        },
        "v2_predecessor_lock_id": V2_LOCK_ID,
        "v2_predecessor_lock_git_blob_sha1": EXPECTED_CURRENT_BLOBS[V2_LOCK],
        "authenticated_private_manager_peer_required": True,
        "retained_private_connection_required": True,
        "bounded_complete_dropin_set_required": True,
        "bounded_complete_loadcredential_set_required": True,
        "unique_credential_ids_required": True,
        "exactly_one_epoch2_credential_required": True,
        "unrelated_credentials_allowed": True,
        "complete_credential_set_generation_stability_required": True,
        "complete_dropin_set_sha256_emitted": True,
        "complete_credential_set_sha256_emitted": True,
        "cross_query_complete_set_binding_enabled": True,
        "credential_query_preexec_pair_execution_proven": True,
        "candidate_accepted": True,
        "replacement_authorized": False,
        "live_query_authorized": False,
        "credential_contents_read": False,
        "complete_host_evidence_collector": False,
        "production_host_evidence_authority": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "transaction": False,
        "funds_movement": False,
    }

def expected_lock() -> dict[str, Any]:
    body = expected_lock_body()
    lock_id = "voidbuyumqcredelflock3r_" + sha256(canonical(body).encode("utf-8"))
    if lock_id != LOCK_ID:
        raise AssertionError("lock id derivation drift")
    return {**body, "lock_id": lock_id}

def verify_acceptance_scope() -> None:
    git(["merge-base", "--is-ancestor", LOCK_BASE_MAIN, "HEAD"])
    changed = tuple(
        sorted(
            line
            for line in git(["diff", "--name-only", LOCK_BASE_MAIN, "HEAD", "--"]).splitlines()
            if line
        )
    )
    if changed != EXPECTED_SCOPE:
        raise AssertionError("lock scope drift: " + repr(changed))
    if git(["status", "--porcelain=v1", "--untracked-files=all"]):
        raise AssertionError("lock checkout not clean")

def verify_current_tree_sources() -> None:
    for relative, expected_blob in EXPECTED_CURRENT_BLOBS.items():
        if git(["rev-parse", "HEAD:" + relative]) != expected_blob:
            raise AssertionError("current source blob drift: " + relative)
    predecessor = json.loads(read_file(ROOT / V2_LOCK, 64 * 1024))
    if predecessor.get("lock_id") != V2_LOCK_ID:
        raise AssertionError("V2 predecessor lock ID drift")

def verify_candidate_head_and_rederive() -> None:
    git(["merge-base", "--is-ancestor", SOURCE_PARENT, CANDIDATE_HEAD])
    changed = tuple(
        sorted(
            line
            for line in git(
                ["diff", "--name-only", SOURCE_PARENT, CANDIDATE_HEAD, "--"]
            ).splitlines()
            if line
        )
    )
    expected_candidate_scope = tuple(
        sorted((CANDIDATE_WORKFLOW, CANDIDATE_DOC, CANDIDATE_PROOF))
    )
    if changed != expected_candidate_scope:
        raise AssertionError("historical candidate scope drift")

    for relative, expected_blob in EXPECTED_CANDIDATE_BLOBS.items():
        if git(["rev-parse", CANDIDATE_HEAD + ":" + relative]) != expected_blob:
            raise AssertionError("historical candidate blob drift: " + relative)

    with tempfile.TemporaryDirectory(prefix="void-cred-v3r-lock-") as td:
        root = Path(td)
        worktree = root / "candidate"
        output = root / "derived"
        added = False
        try:
            run(
                [
                    "/usr/bin/git",
                    "--no-replace-objects",
                    "-C",
                    os.fspath(ROOT),
                    "worktree",
                    "add",
                    "--detach",
                    os.fspath(worktree),
                    CANDIDATE_HEAD,
                ],
                timeout=60,
            )
            added = True
            candidate_proof = worktree / CANDIDATE_PROOF
            run(
                [
                    "/usr/bin/python3",
                    "-I",
                    "-B",
                    os.fspath(candidate_proof),
                    "--derive-dir",
                    os.fspath(output),
                ],
                cwd=worktree,
                timeout=180,
            )

            metadata = read_file(
                output / "credential-query-elf-candidate-v3.json",
                512 * 1024,
            )
            if len(metadata) != METADATA_BYTES:
                raise AssertionError("candidate metadata byte count drift")
            if sha256(metadata) != METADATA_SHA256:
                raise AssertionError("candidate metadata SHA-256 drift")
            if git_blob(metadata) != METADATA_GIT_BLOB:
                raise AssertionError("candidate metadata Git blob drift")

            report = json.loads(metadata)
            if report.get("candidate_id") != CANDIDATE_ID:
                raise AssertionError("candidate ID drift")
            if report.get("preexec_predecessor_identity_required") is not True:
                raise AssertionError("preexec predecessor gate absent")
            if report.get("preexec_predecessor_bytes") != PREEXEC_BYTES:
                raise AssertionError("preexec predecessor byte drift")
            if report.get("preexec_predecessor_sha256") != PREEXEC_SHA256:
                raise AssertionError("preexec predecessor SHA drift")
            if report.get("source_parent") != SOURCE_PARENT:
                raise AssertionError("candidate source parent drift")
            if report.get("v2_predecessor_lock_id") != V2_LOCK_ID:
                raise AssertionError("candidate predecessor lock drift")
            if report.get("candidate_accepted") is not False:
                raise AssertionError("candidate overclaims acceptance")
            if report.get("replacement_authorized") is not False:
                raise AssertionError("candidate overclaims replacement")
            if report.get("live_query_authorized") is not False:
                raise AssertionError("candidate overclaims live query")
            if report.get("complete_host_evidence_collector") is not False:
                raise AssertionError("candidate overclaims host evidence")

            preexec = read_file(output / "credential-query-preexec", 4 * 1024 * 1024)
            query = read_file(output / "credential-query", 4 * 1024 * 1024)
            if len(preexec) != PREEXEC_BYTES or sha256(preexec) != PREEXEC_SHA256:
                raise AssertionError("rederived preexec identity drift")
            if len(query) != QUERY_BYTES or sha256(query) != QUERY_SHA256:
                raise AssertionError("rederived query identity drift")
        finally:
            if added:
                subprocess.run(
                    [
                        "/usr/bin/git",
                        "--no-replace-objects",
                        "-C",
                        os.fspath(ROOT),
                        "worktree",
                        "remove",
                        "--force",
                        os.fspath(worktree),
                    ],
                    cwd=ROOT,
                    env=CLEAN_ENV,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                    timeout=60,
                )
                subprocess.run(
                    [
                        "/usr/bin/git",
                        "--no-replace-objects",
                        "-C",
                        os.fspath(ROOT),
                        "worktree",
                        "prune",
                    ],
                    cwd=ROOT,
                    env=CLEAN_ENV,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                    timeout=60,
                )

def verify_lock_bytes() -> None:
    expected = (json.dumps(expected_lock(), indent=2) + "\n").encode("utf-8")
    committed = read_file(ROOT / LOCK_FILE, 64 * 1024)
    if committed != expected:
        raise AssertionError("committed repaired V3 lock bytes drift")

def verify() -> None:
    verify_acceptance_scope()
    verify_current_tree_sources()
    verify_candidate_head_and_rederive()
    verify_lock_bytes()

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--derive-lock", action="store_true")
    args = parser.parse_args()
    if args.derive_lock:
        print(json.dumps(expected_lock(), indent=2))
        return 0
    if not args.verify:
        raise SystemExit("usage: proof --verify | --derive-lock")

    verify()
    lock = expected_lock()
    print("VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V3_REPAIRED_GREEN")
    print("lock_id=" + lock["lock_id"])
    print("candidate_id=" + CANDIDATE_ID)
    print("candidate_head=" + CANDIDATE_HEAD)
    print("historical_candidate_scope_preserved=true")
    print("candidate_metadata_exact_rederivation=true")
    print("complete_native_toolchain_closure_bound=true")
    print("preexec_predecessor_identity_exact=true")
    print("preexec_binary_sha256=" + PREEXEC_SHA256)
    print("query_binary_sha256=" + QUERY_SHA256)
    print("candidate_accepted=true")
    print("replacement_authorized=false")
    print("live_query_authorized=false")
    print("credential_contents_read=false")
    print("production_host_evidence_authority=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("transaction=false")
    print("funds_movement=false")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
