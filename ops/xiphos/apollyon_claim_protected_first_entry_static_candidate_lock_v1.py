#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
from typing import Any

MARKER = "VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_LOCK_V1"
ROOT = Path(__file__).resolve().parents[2]

PARENT_HEAD = "2aec1d7a30e9c6b20b7d1cf0831f34c240674727"
PARENT_ACCEPTED_BASE = "a149fe2fbac4cb8bb11ed049dfb12a1d0110bfae"
PARENT_TOOL_REL = (
    "ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_v1.py"
)
PARENT_PROOF_REL = (
    "scripts/prove_apollyon_claim_protected_first_entry_static_candidate_v1.py"
)
PARENT_DOC_REL = (
    "docs/security/apollyon-claim-protected-first-entry-static-candidate-v1.md"
)
PARENT_WORKFLOW_REL = (
    ".github/workflows/apollyon-claim-protected-first-entry-static-candidate-v1.yml"
)
PARENT_BLOBS = {
    PARENT_TOOL_REL: "2ff81973b10c176523b0bf172a14fe1495a83986",
    PARENT_PROOF_REL: "4d31e52fe32a7ca9567bf7c2f0f8e6228caf9bea",
    PARENT_DOC_REL: "fc7cf98be5b907729f95021d16139e455413d787",
    PARENT_WORKFLOW_REL: "a38a8c2d70d77be554af32f225e4d9d8491aea7e",
}

EXPECTED_CANDIDATE_ID = (
    "apollyon_claim_protected_first_entry_static_candidate_v1:"
    "2a1fde88ced23606a3e0b6b10bb1205217915b36a0332ee89b5ec81181b32e23"
)
EXPECTED_BINARY_BYTES = 808472
EXPECTED_BINARY_SHA256 = (
    "9c414a6aac9bbfc1b07175908e130993141255b132359ccae23ae49ecf5f7b6d"
)
EXPECTED_BINARY_GIT_BLOB_SHA1 = "0eaedceb79f39829fbde9f06e454f45b9aeb8912"
EXPECTED_INSTALL_MODE = "0555"
EXPECTED_PARENT_REPORT_CANONICAL_SHA256 = (
    "8e96b53161b0b5447e5b02499537803ffd680b5f01d6520ec1653fee52c75649"
)
EXPECTED_PARENT_REPORT_RAW_SHA256 = (
    "dffdd2ce32fcf9dee765f8a6d17b455e100022012c7cd17d9cec1f5d436b484a"
)
EXPECTED_PARENT_ARTIFACT_INNER_TAR_SHA256 = (
    "ca21d9f28b66c408f857ee00480a63585080025a6a76a84efca472e188390944"
)
EXPECTED_PARENT_ARTIFACT_WRAPPER_SHA256 = (
    "ae1a062c6bd6a74d446a4cc7bf25242e11f2638f2c17c30dc1b2ae08017fc417"
)
EXPECTED_PARENT_BUILD_EVIDENCE = {
    "runner_image": "ubuntu24/20261012.334",
    "gcc": {
        "alias": "/usr/bin/gcc",
        "realpath": "/usr/bin/x86_64-linux-gnu-gcc-13",
        "bytes": 1023032,
        "sha256": (
            "1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26"
        ),
    },
    "gcc_dumpmachine": "x86_64-linux-gnu",
    "gcc_dumpversion": "13.3.0",
    "gcc_version_line": "gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0",
    "readelf": {
        "alias": "/usr/bin/readelf",
        "realpath": "/usr/bin/x86_64-linux-gnu-readelf",
        "bytes": 789280,
        "sha256": (
            "64c58e15274bbbb5153f31078e455e9e77ee5f51489e709bba5bb788ce9df2b0"
        ),
    },
    "toolchain_revalidated_after_build": True,
}
NEXT_GATE = "apollyon_claim_protected_first_entry_static_candidate_install_v1"

MAX_SOURCE_BYTES = 2 * 1024 * 1024
ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/nonexistent",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
    "SOURCE_DATE_EPOCH": "0",
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_NO_REPLACE_OBJECTS": "1",
    "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
    "GIT_NO_LAZY_FETCH": "1",
    "GIT_ALLOW_PROTOCOL": "",
}

def expected_authority() -> dict[str, bool]:
    return {
    "source_only_acceptance_lock": True,
    "historical_parent_candidate_rederived": False,
    "accepted_parent_evidence_identity_bound": True,
    "accepted_parent_toolchain_identity_bound": True,
    "mutable_runner_toolchain_used": False,
    "candidate_accepted": True,
    "binary_identity_accepted": True,
    "static_first_instruction_candidate_evidence_accepted": True,
    "protected_install_authorized": False,
    "xiphos_host_qualification_performed": False,
    "protected_expected_source_origin_proven": False,
    "durable_attempt_claim_authorized": False,
    "durable_attempt_claim_performed": False,
    "trainer_release_authorized": False,
    "training_execution_authorized": False,
    "training_execution_performed": False,
    "credential_access": False,
    "private_key_access": False,
    "signing": False,
    "wallet_access": False,
    "transaction": False,
    "funds_movement": False,
}


# Compatibility snapshot only. Derivation and validation deliberately use a
# fresh expected_authority() value so callers cannot mutate the validation
# oracle through an aliased derived lock.
AUTHORITY = expected_authority()


class LockError(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise LockError(reason)


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
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def run(
    argv: list[str],
    *,
    timeout: int = 120,
) -> subprocess.CompletedProcess[bytes]:
    try:
        return subprocess.run(
            argv,
            cwd=ROOT,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=ENV,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise LockError("command_execution_failed:" + argv[0]) from exc


def git(*args: str) -> str:
    cp = run(["/usr/bin/git", "-C", os.fspath(ROOT), *args], timeout=30)
    if cp.returncode != 0 or cp.stderr:
        hold("git_command_failed:" + args[0])
    try:
        return cp.stdout.decode("utf-8", "strict").strip()
    except UnicodeError as exc:
        raise LockError("git_output_invalid") from exc


def stable_file(relative: str, expected_blob: str) -> bytes:
    path = ROOT / relative
    try:
        before = path.lstat()
        raw = path.read_bytes()
        after = path.lstat()
    except OSError as exc:
        raise LockError("parent_source_unavailable:" + relative) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > MAX_SOURCE_BYTES
    ):
        hold("parent_source_metadata_invalid:" + relative)
    for field in (
        "st_dev",
        "st_ino",
        "st_mode",
        "st_uid",
        "st_gid",
        "st_nlink",
        "st_size",
        "st_mtime_ns",
        "st_ctime_ns",
    ):
        if getattr(before, field) != getattr(after, field):
            hold("parent_source_generation_changed:" + relative)
    if len(raw) != before.st_size or git_blob(raw) != expected_blob:
        hold("parent_source_blob_invalid:" + relative)
    if git("rev-parse", "HEAD:" + relative) != expected_blob:
        hold("parent_source_not_exact_head:" + relative)
    return raw


def repository_lineage() -> dict[str, str]:
    head = git("rev-parse", "--verify", "HEAD^{commit}")
    for ancestor, descendant, reason in (
        (PARENT_ACCEPTED_BASE, PARENT_HEAD, "parent_candidate_base_not_ancestor"),
        (PARENT_HEAD, head, "parent_candidate_head_not_ancestor"),
    ):
        cp = run(
            [
                "/usr/bin/git",
                "-C",
                os.fspath(ROOT),
                "merge-base",
                "--is-ancestor",
                ancestor,
                descendant,
            ],
            timeout=30,
        )
        if cp.returncode != 0 or cp.stdout or cp.stderr:
            hold(reason)
    return {
        "head": head,
        "parent_candidate_head": PARENT_HEAD,
        "parent_accepted_base": PARENT_ACCEPTED_BASE,
    }


def accepted_parent_evidence() -> dict[str, Any]:
    repository_lineage()
    for relative, expected in PARENT_BLOBS.items():
        stable_file(relative, expected)
    return {
        "head": PARENT_HEAD,
        "accepted_base": PARENT_ACCEPTED_BASE,
        "tool_git_blob_sha1": PARENT_BLOBS[PARENT_TOOL_REL],
        "proof_git_blob_sha1": PARENT_BLOBS[PARENT_PROOF_REL],
        "doc_git_blob_sha1": PARENT_BLOBS[PARENT_DOC_REL],
        "workflow_git_blob_sha1": PARENT_BLOBS[PARENT_WORKFLOW_REL],
        "candidate_id": EXPECTED_CANDIDATE_ID,
        "candidate_report_canonical_sha256": (
            EXPECTED_PARENT_REPORT_CANONICAL_SHA256
        ),
        "candidate_report_raw_sha256": EXPECTED_PARENT_REPORT_RAW_SHA256,
        "artifact_inner_tar_sha256": (
            EXPECTED_PARENT_ARTIFACT_INNER_TAR_SHA256
        ),
        "artifact_wrapper_sha256": EXPECTED_PARENT_ARTIFACT_WRAPPER_SHA256,
        "accepted_build_evidence": EXPECTED_PARENT_BUILD_EVIDENCE,
    }


def lock_material(lock: dict[str, Any]) -> dict[str, Any]:
    value = json.loads(json.dumps(lock))
    value.pop("lock_id", None)
    return value


def validate_lock(lock: dict[str, Any]) -> None:
    expected_keys = {
        "marker",
        "version",
        "repository",
        "parent_candidate",
        "binary",
        "authority",
        "next_gate",
        "lock_id",
    }
    if set(lock) != expected_keys:
        hold("candidate_lock_keys_invalid")
    if lock.get("marker") != MARKER or lock.get("version") != 1:
        hold("candidate_lock_identity_invalid")

    expected_lock_id = (
        "apollyon_claim_protected_first_entry_static_candidate_lock_v1:"
        + sha256(canonical(lock_material(lock)))
    )
    if lock.get("lock_id") != expected_lock_id:
        hold("candidate_lock_id_invalid")

    if lock.get("repository") != repository_lineage():
        hold("candidate_lock_repository_invalid")

    if lock.get("parent_candidate") != accepted_parent_evidence():
        hold("candidate_lock_parent_identity_invalid")

    observed_binary = lock.get("binary")
    expected_binary_keys = {
        "bytes",
        "sha256",
        "git_blob_sha1",
        "expected_install_mode",
        "elf_static_no_interp",
        "elf_dynamic_needed_absent",
        "elf_type_exec",
        "elf_machine_x86_64",
        "production_fixed_self_embedded",
    }
    if (
        not isinstance(observed_binary, dict)
        or set(observed_binary) != expected_binary_keys
    ):
        hold("candidate_lock_binary_keys_invalid")
    expected_binary = {
        "bytes": EXPECTED_BINARY_BYTES,
        "sha256": EXPECTED_BINARY_SHA256,
        "git_blob_sha1": EXPECTED_BINARY_GIT_BLOB_SHA1,
        "expected_install_mode": EXPECTED_INSTALL_MODE,
        "elf_static_no_interp": True,
        "elf_dynamic_needed_absent": True,
        "elf_type_exec": True,
        "elf_machine_x86_64": True,
        "production_fixed_self_embedded": True,
    }
    if observed_binary != expected_binary:
        hold("candidate_lock_binary_identity_invalid")

    if lock.get("authority") != expected_authority():
        hold("candidate_lock_authority_invalid")
    if lock.get("next_gate") != NEXT_GATE:
        hold("candidate_lock_next_gate_invalid")


def derive_lock() -> dict[str, Any]:
    parent = accepted_parent_evidence()
    lock: dict[str, Any] = {
        "marker": MARKER,
        "version": 1,
        "repository": repository_lineage(),
        "parent_candidate": parent,
        "binary": {
            "bytes": EXPECTED_BINARY_BYTES,
            "sha256": EXPECTED_BINARY_SHA256,
            "git_blob_sha1": EXPECTED_BINARY_GIT_BLOB_SHA1,
            "expected_install_mode": EXPECTED_INSTALL_MODE,
            "elf_static_no_interp": True,
            "elf_dynamic_needed_absent": True,
            "elf_type_exec": True,
            "elf_machine_x86_64": True,
            "production_fixed_self_embedded": True,
        },
        "authority": expected_authority(),
        "next_gate": NEXT_GATE,
    }
    lock["lock_id"] = (
        "apollyon_claim_protected_first_entry_static_candidate_lock_v1:"
        + sha256(canonical(lock_material(lock)))
    )
    validate_lock(lock)
    return lock


def self_test() -> None:
    lock = derive_lock()
    if lock["authority"]["candidate_accepted"] is not True:
        hold("candidate_lock_self_test_acceptance_missing")
    if lock["authority"]["binary_identity_accepted"] is not True:
        hold("candidate_lock_self_test_binary_acceptance_missing")
    if lock["authority"]["historical_parent_candidate_rederived"] is not False:
        hold("candidate_lock_self_test_rederivation_overclaim")
    if lock["authority"]["mutable_runner_toolchain_used"] is not False:
        hold("candidate_lock_self_test_mutable_toolchain")
    if lock["authority"]["protected_install_authorized"] is not False:
        hold("candidate_lock_self_test_install_authority")
    if lock["parent_candidate"]["candidate_id"] != EXPECTED_CANDIDATE_ID:
        hold("candidate_lock_self_test_candidate_identity")
    if lock["binary"]["sha256"] != EXPECTED_BINARY_SHA256:
        hold("candidate_lock_self_test_binary_identity")
    print(MARKER + "_SELF_TEST_GREEN")
    print("historical_parent_candidate_rederived=false")
    print("accepted_parent_evidence_identity_bound=true")
    print("accepted_parent_toolchain_identity_bound=true")
    print("mutable_runner_toolchain_used=false")
    print("parent_candidate_id_bound=true")
    print("parent_candidate_report_bound=true")
    print("parent_candidate_artifact_bound=true")
    print("binary_identity_bound=true")
    print("expected_install_mode=0555")
    print("candidate_accepted=true")
    print("binary_identity_accepted=true")
    print("protected_install_authorized=false")
    print("xiphos_host_qualification_performed=false")
    print("protected_expected_source_origin_proven=false")
    print("durable_attempt_claim_authorized=false")
    print("trainer_release_authorized=false")
    print("training_execution_authorized=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--derive-json", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            lock = derive_lock()
            os.sys.stdout.buffer.write(canonical(lock) + b"\n")
    except LockError as exc:
        print(MARKER, file=os.sys.stderr)
        print("status=HOLD", file=os.sys.stderr)
        print("reason=" + str(exc), file=os.sys.stderr)
        print("candidate_accepted=false", file=os.sys.stderr)
        print("binary_identity_accepted=false", file=os.sys.stderr)
        print("protected_install_authorized=false", file=os.sys.stderr)
        print("xiphos_host_qualification_performed=false", file=os.sys.stderr)
        print("training_execution_authorized=false", file=os.sys.stderr)
        print("funds_movement=false", file=os.sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
