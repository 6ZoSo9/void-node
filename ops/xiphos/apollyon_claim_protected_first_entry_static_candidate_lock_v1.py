#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import types
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

AUTHORITY = {
    "source_only_acceptance_lock": True,
    "historical_parent_candidate_rederived": True,
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


def _load_parent() -> types.ModuleType:
    for relative, expected in PARENT_BLOBS.items():
        stable_file(relative, expected)

    raw = stable_file(PARENT_TOOL_REL, PARENT_BLOBS[PARENT_TOOL_REL])
    module = types.ModuleType("apollyon_static_candidate_v1_historical")
    module.__file__ = os.fspath(ROOT / PARENT_TOOL_REL)
    module.__package__ = None
    try:
        exec(
            compile(
                raw.decode("utf-8", "strict"),
                PARENT_TOOL_REL,
                "exec",
                dont_inherit=True,
                optimize=0,
            ),
            module.__dict__,
        )
    except Exception as exc:
        raise LockError("parent_candidate_verified_execution_failed") from exc
    if getattr(module, "MARKER", "") != (
        "VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_V1"
    ):
        hold("parent_candidate_marker_invalid")
    if getattr(module, "PARENT_HEAD", "") != PARENT_ACCEPTED_BASE:
        hold("parent_candidate_accepted_base_invalid")

    # The accepted candidate report is intentionally head-addressed. A
    # descendant acceptance-lock branch must reproduce the exact historical
    # report, not silently mint a different candidate merely because this lock
    # adds files. This override is permitted only after repository_lineage()
    # proves the accepted parent head is an ancestor and every parent-owned
    # file above is still the exact accepted blob.
    module.repository_lineage = lambda: {
        "head": PARENT_HEAD,
        "accepted_parent": PARENT_ACCEPTED_BASE,
    }
    return module


def derive_parent_candidate() -> tuple[types.ModuleType, dict[str, Any], bytes]:
    repository_lineage()
    parent = _load_parent()
    report, binary = parent.derive()
    parent.validate(report, binary)

    if report.get("candidate_id") != EXPECTED_CANDIDATE_ID:
        hold("parent_candidate_id_invalid")
    if (
        len(binary) != EXPECTED_BINARY_BYTES
        or sha256(binary) != EXPECTED_BINARY_SHA256
        or git_blob(binary) != EXPECTED_BINARY_GIT_BLOB_SHA1
    ):
        hold("parent_candidate_binary_identity_invalid")

    parent_binary = report.get("binary")
    if not isinstance(parent_binary, dict):
        hold("parent_candidate_binary_report_invalid")
    if (
        parent_binary.get("bytes") != EXPECTED_BINARY_BYTES
        or parent_binary.get("sha256") != EXPECTED_BINARY_SHA256
        or parent_binary.get("git_blob_sha1") != EXPECTED_BINARY_GIT_BLOB_SHA1
    ):
        hold("parent_candidate_binary_report_invalid")

    parent_authority = report.get("authority")
    if not isinstance(parent_authority, dict):
        hold("parent_candidate_authority_invalid")
    for key in (
        "candidate_accepted",
        "binary_identity_accepted",
        "protected_install_authorized",
        "xiphos_host_qualification_performed",
        "protected_expected_source_origin_proven",
        "durable_attempt_claim_authorized",
        "trainer_release_authorized",
        "training_execution_authorized",
        "credential_access",
        "private_key_access",
        "signing",
        "wallet_access",
        "transaction",
        "funds_movement",
    ):
        if parent_authority.get(key) is not False:
            hold("parent_candidate_authority_invalid:" + key)
    return parent, report, binary


def lock_material(lock: dict[str, Any]) -> dict[str, Any]:
    value = json.loads(json.dumps(lock))
    value.pop("lock_id", None)
    return value


def validate_lock(
    lock: dict[str, Any],
    parent: types.ModuleType,
    parent_report: dict[str, Any],
    binary: bytes,
) -> None:
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

    expected_parent = {
        "head": PARENT_HEAD,
        "accepted_base": PARENT_ACCEPTED_BASE,
        "tool_git_blob_sha1": PARENT_BLOBS[PARENT_TOOL_REL],
        "proof_git_blob_sha1": PARENT_BLOBS[PARENT_PROOF_REL],
        "doc_git_blob_sha1": PARENT_BLOBS[PARENT_DOC_REL],
        "workflow_git_blob_sha1": PARENT_BLOBS[PARENT_WORKFLOW_REL],
        "candidate_id": EXPECTED_CANDIDATE_ID,
        "candidate_report_sha256": sha256(parent.canonical(parent_report)),
    }
    if lock.get("parent_candidate") != expected_parent:
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
    if (
        len(binary) != EXPECTED_BINARY_BYTES
        or sha256(binary) != EXPECTED_BINARY_SHA256
        or git_blob(binary) != EXPECTED_BINARY_GIT_BLOB_SHA1
    ):
        hold("candidate_lock_supplied_binary_invalid")

    if lock.get("authority") != AUTHORITY:
        hold("candidate_lock_authority_invalid")
    if lock.get("next_gate") != NEXT_GATE:
        hold("candidate_lock_next_gate_invalid")


def derive_lock() -> tuple[dict[str, Any], bytes]:
    parent, parent_report, binary = derive_parent_candidate()
    parent_binary = parent_report["binary"]
    lock: dict[str, Any] = {
        "marker": MARKER,
        "version": 1,
        "repository": repository_lineage(),
        "parent_candidate": {
            "head": PARENT_HEAD,
            "accepted_base": PARENT_ACCEPTED_BASE,
            "tool_git_blob_sha1": PARENT_BLOBS[PARENT_TOOL_REL],
            "proof_git_blob_sha1": PARENT_BLOBS[PARENT_PROOF_REL],
            "doc_git_blob_sha1": PARENT_BLOBS[PARENT_DOC_REL],
            "workflow_git_blob_sha1": PARENT_BLOBS[PARENT_WORKFLOW_REL],
            "candidate_id": parent_report["candidate_id"],
            "candidate_report_sha256": sha256(parent.canonical(parent_report)),
        },
        "binary": {
            "bytes": parent_binary["bytes"],
            "sha256": parent_binary["sha256"],
            "git_blob_sha1": parent_binary["git_blob_sha1"],
            "expected_install_mode": EXPECTED_INSTALL_MODE,
            "elf_static_no_interp": parent_binary["elf_static_no_interp"],
            "elf_dynamic_needed_absent": parent_binary[
                "elf_dynamic_needed_absent"
            ],
            "elf_type_exec": parent_binary["elf_type_exec"],
            "elf_machine_x86_64": parent_binary["elf_machine_x86_64"],
            "production_fixed_self_embedded": parent_binary[
                "production_fixed_self_embedded"
            ],
        },
        "authority": AUTHORITY,
        "next_gate": NEXT_GATE,
    }
    lock["lock_id"] = (
        "apollyon_claim_protected_first_entry_static_candidate_lock_v1:"
        + sha256(canonical(lock_material(lock)))
    )
    validate_lock(lock, parent, parent_report, binary)
    return lock, binary


def self_test() -> None:
    lock, binary = derive_lock()
    if lock["authority"]["candidate_accepted"] is not True:
        hold("candidate_lock_self_test_acceptance_missing")
    if lock["authority"]["binary_identity_accepted"] is not True:
        hold("candidate_lock_self_test_binary_acceptance_missing")
    if lock["authority"]["protected_install_authorized"] is not False:
        hold("candidate_lock_self_test_install_authority")
    if lock["parent_candidate"]["candidate_id"] != EXPECTED_CANDIDATE_ID:
        hold("candidate_lock_self_test_candidate_identity")
    if sha256(binary) != EXPECTED_BINARY_SHA256:
        hold("candidate_lock_self_test_binary_identity")
    print(MARKER + "_SELF_TEST_GREEN")
    print("historical_parent_candidate_rederived=true")
    print("parent_candidate_id_bound=true")
    print("parent_candidate_report_bound=true")
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
            lock, _ = derive_lock()
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
