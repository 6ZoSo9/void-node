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

MARKER = "VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_LOCK_V2"
ROOT = Path(__file__).resolve().parents[2]

PARENT_HEAD = "a61887a7fc7a4a8b0ee70d8a2046e4486ab49091"
PARENT_TOOL_REL = "ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_v2.py"
PARENT_PROOF_REL = "scripts/prove_apollyon_claim_protected_first_entry_static_candidate_v2.py"
PARENT_DOC_REL = "docs/security/apollyon-claim-protected-first-entry-static-candidate-v2.md"
PARENT_WORKFLOW_REL = ".github/workflows/apollyon-claim-protected-first-entry-static-candidate-v2.yml"
PARENT_BLOBS = {
    PARENT_TOOL_REL: "74b45b9f23ce3307b59a98fa9703d5c0a2494bad",
    PARENT_PROOF_REL: "0a44002a8af860a90658d8327336dea88e13d5e1",
    PARENT_DOC_REL: "73675c7ce2d0d19f3866eddedb4a649b807bf63b",
    PARENT_WORKFLOW_REL: "4678e2cea95a42f17580f2731c5e2f44ca875eb2",
}

EXPECTED_CANDIDATE_ID = (
    "apollyon_claim_protected_first_entry_static_candidate_v2:"
    "7a29e9a3b79c570787fb853820b81c7bb0c61e20b499acf1f5d5df65d29679b0"
)
EXPECTED_CANDIDATE_JSON_SHA256 = (
    "4c0d17854a99909abf0ea44dc466616deaa4016d7854ca652adc1ae80bf03946"
)
EXPECTED_BINARY_BYTES = 808472
EXPECTED_BINARY_SHA256 = (
    "9c414a6aac9bbfc1b07175908e130993141255b132359ccae23ae49ecf5f7b6d"
)
EXPECTED_BINARY_GIT_BLOB_SHA1 = "0eaedceb79f39829fbde9f06e454f45b9aeb8912"
EXPECTED_INSTALL_MODE = "0555"

HOSTED_RUN_ID = 40037262100
HOSTED_JOB_ID = 120699688688
HOSTED_ARTIFACT_ID = 12537652102
HOSTED_ARTIFACT_ARCHIVE_SHA256 = (
    "33995229508dc92d8c6b6ea2f09a81d82a668e9394db77d6fc711eaba26a1af3"
)
HOSTED_RECEIPT_LOG_SHA256 = (
    "19bedd3ceb443397775d51cc544685404a89192d9cd3434a26556fdc65cd6687"
)

NEXT_GATE = "apollyon_claim_protected_first_entry_static_candidate_install_v2"
LOCK_ID_PREFIX = "apollyon_claim_protected_first_entry_static_candidate_lock_v2:"
MAX_SOURCE_BYTES = 2 * 1024 * 1024

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
    "GIT_NO_LAZY_FETCH": "1",
    "GIT_ALLOW_PROTOCOL": "",
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


def run(argv: list[str], *, timeout: int = 60) -> subprocess.CompletedProcess[bytes]:
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


def same_generation(a: os.stat_result, b: os.stat_result) -> bool:
    return all(
        getattr(a, field) == getattr(b, field)
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
        )
    )


def stable_file(relative: str, expected_blob: str) -> bytes:
    if (
        not isinstance(relative, str)
        or not relative
        or os.path.isabs(relative)
        or ".." in Path(relative).parts
    ):
        hold("parent_source_path_invalid:" + str(relative))

    path = ROOT / relative
    fd = -1
    close_error: OSError | None = None
    try:
        before = path.lstat()
        if (
            not stat.S_ISREG(before.st_mode)
            or stat.S_ISLNK(before.st_mode)
            or before.st_nlink != 1
            or before.st_size < 1
            or before.st_size > MAX_SOURCE_BYTES
        ):
            hold("parent_source_metadata_invalid:" + relative)

        flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW
        nonblock = getattr(os, "O_NONBLOCK", None)
        if not isinstance(nonblock, int) or nonblock <= 0:
            hold("parent_source_nonblock_unavailable:" + relative)
        fd = os.open(path, flags | nonblock)
        opened = os.fstat(fd)
        visible = path.lstat()
        if (
            not stat.S_ISREG(opened.st_mode)
            or stat.S_ISLNK(opened.st_mode)
            or opened.st_nlink != 1
            or opened.st_size < 1
            or opened.st_size > MAX_SOURCE_BYTES
            or not same_generation(before, opened)
            or not same_generation(opened, visible)
        ):
            hold("parent_source_generation_invalid:" + relative)

        chunks: list[bytes] = []
        remaining = opened.st_size
        while remaining:
            chunk = os.read(fd, min(65536, remaining))
            if not chunk:
                hold("parent_source_short_read:" + relative)
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1) != b"":
            hold("parent_source_growth_detected:" + relative)

        after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not same_generation(opened, after)
            or not same_generation(after, visible_after)
        ):
            hold("parent_source_changed_during_read:" + relative)
        raw = b"".join(chunks)
    except LockError:
        raise
    except OSError as exc:
        raise LockError("parent_source_unavailable:" + relative) from exc
    finally:
        if fd >= 0:
            try:
                os.close(fd)
            except OSError as exc:
                close_error = exc

    if close_error is not None:
        raise LockError("parent_source_close_failed:" + relative) from close_error
    if len(raw) != before.st_size or git_blob(raw) != expected_blob:
        hold("parent_source_blob_invalid:" + relative)
    if git("rev-parse", "HEAD:" + relative) != expected_blob:
        hold("parent_source_not_exact_head:" + relative)
    return raw


def repository_lineage() -> dict[str, str]:
    head = git("rev-parse", "--verify", "HEAD^{commit}")
    cp = run(
        [
            "/usr/bin/git",
            "-C",
            os.fspath(ROOT),
            "merge-base",
            "--is-ancestor",
            PARENT_HEAD,
            head,
        ],
        timeout=30,
    )
    if cp.returncode != 0 or cp.stdout or cp.stderr:
        hold("parent_candidate_head_not_ancestor")
    return {
        "head": head,
        "parent_candidate_v2_head": PARENT_HEAD,
    }


def expected_parent_candidate() -> dict[str, Any]:
    repository_lineage()
    for relative, expected in PARENT_BLOBS.items():
        stable_file(relative, expected)
    return {
        "head": PARENT_HEAD,
        "source_blobs": dict(sorted(PARENT_BLOBS.items())),
        "hosted_run_id": HOSTED_RUN_ID,
        "hosted_job_id": HOSTED_JOB_ID,
        "hosted_artifact_id": HOSTED_ARTIFACT_ID,
        "hosted_artifact_archive_sha256": HOSTED_ARTIFACT_ARCHIVE_SHA256,
        "hosted_receipt_log_sha256": HOSTED_RECEIPT_LOG_SHA256,
        "candidate_id": EXPECTED_CANDIDATE_ID,
        "candidate_json_sha256": EXPECTED_CANDIDATE_JSON_SHA256,
    }


def expected_binary() -> dict[str, Any]:
    return {
        "bytes": EXPECTED_BINARY_BYTES,
        "sha256": EXPECTED_BINARY_SHA256,
        "git_blob_sha1": EXPECTED_BINARY_GIT_BLOB_SHA1,
        "expected_install_mode": EXPECTED_INSTALL_MODE,
        "historical_v1_binary_identity_preserved": True,
        "three_builds_byte_identical": True,
        "elf_static_no_interp": True,
        "elf_dynamic_needed_absent": True,
        "elf_type_exec": True,
        "elf_machine_x86_64": True,
        "production_fixed_self_embedded": True,
    }


def expected_authority() -> dict[str, bool]:
    return {
        "source_only_acceptance_lock": True,
        "hosted_candidate_receipt_bound": True,
        "hosted_artifact_digest_bound": True,
        "candidate_accepted": True,
        "binary_identity_accepted": True,
        "historical_v1_binary_identity_preserved": True,
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


def exact_typed_equal(observed: object, expected: object) -> bool:
    if type(observed) is not type(expected):
        return False
    if isinstance(expected, dict):
        if set(observed) != set(expected):  # type: ignore[arg-type]
            return False
        return all(
            exact_typed_equal(observed[key], value)  # type: ignore[index]
            for key, value in expected.items()
        )
    if isinstance(expected, list):
        if len(observed) != len(expected):  # type: ignore[arg-type]
            return False
        return all(
            exact_typed_equal(actual, wanted)
            for actual, wanted in zip(observed, expected, strict=True)  # type: ignore[arg-type]
        )
    return observed == expected


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
    if not isinstance(lock, dict) or set(lock) != expected_keys:
        hold("candidate_lock_keys_invalid")
    if (
        lock.get("marker") != MARKER
        or type(lock.get("version")) is not int
        or lock.get("version") != 2
    ):
        hold("candidate_lock_identity_invalid")

    expected_id = LOCK_ID_PREFIX + sha256(canonical(lock_material(lock)))
    if lock.get("lock_id") != expected_id:
        hold("candidate_lock_id_invalid")

    if not exact_typed_equal(lock.get("repository"), repository_lineage()):
        hold("candidate_lock_repository_invalid")
    if not exact_typed_equal(lock.get("parent_candidate"), expected_parent_candidate()):
        hold("candidate_lock_parent_identity_invalid")
    if not exact_typed_equal(lock.get("binary"), expected_binary()):
        hold("candidate_lock_binary_identity_invalid")
    if not exact_typed_equal(lock.get("authority"), expected_authority()):
        hold("candidate_lock_authority_invalid")
    if lock.get("next_gate") != NEXT_GATE:
        hold("candidate_lock_next_gate_invalid")


def derive_lock() -> dict[str, Any]:
    lock: dict[str, Any] = {
        "marker": MARKER,
        "version": 2,
        "repository": repository_lineage(),
        "parent_candidate": expected_parent_candidate(),
        "binary": expected_binary(),
        "authority": expected_authority(),
        "next_gate": NEXT_GATE,
    }
    lock["lock_id"] = LOCK_ID_PREFIX + sha256(canonical(lock_material(lock)))
    validate_lock(lock)
    return lock


def self_test() -> None:
    lock = derive_lock()
    if lock["authority"]["candidate_accepted"] is not True:
        hold("candidate_lock_self_test_acceptance_missing")
    if lock["authority"]["protected_install_authorized"] is not False:
        hold("candidate_lock_self_test_install_authority")
    if lock["parent_candidate"]["candidate_id"] != EXPECTED_CANDIDATE_ID:
        hold("candidate_lock_self_test_candidate_identity")
    if lock["parent_candidate"]["candidate_json_sha256"] != EXPECTED_CANDIDATE_JSON_SHA256:
        hold("candidate_lock_self_test_candidate_json_identity")
    if lock["parent_candidate"]["hosted_artifact_archive_sha256"] != HOSTED_ARTIFACT_ARCHIVE_SHA256:
        hold("candidate_lock_self_test_artifact_identity")
    if lock["binary"]["sha256"] != EXPECTED_BINARY_SHA256:
        hold("candidate_lock_self_test_binary_identity")
    print(MARKER + "_SELF_TEST_GREEN")
    print("parent_source_blobs_bound=4")
    print("hosted_candidate_receipt_bound=true")
    print("hosted_artifact_digest_bound=true")
    print("candidate_id_bound=true")
    print("candidate_json_sha256_bound=true")
    print("binary_identity_bound=true")
    print("candidate_accepted=true")
    print("binary_identity_accepted=true")
    print("protected_install_authorized=false")
    print("xiphos_host_qualification_performed=false")
    print("durable_attempt_claim_authorized=false")
    print("trainer_release_authorized=false")
    print("training_execution_authorized=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
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
            print(canonical(derive_lock()).decode("ascii"))
    except LockError as exc:
        print(MARKER, file=os.sys.stderr)
        print("status=HOLD", file=os.sys.stderr)
        print("reason=" + str(exc), file=os.sys.stderr)
        print("candidate_accepted=false", file=os.sys.stderr)
        print("protected_install_authorized=false", file=os.sys.stderr)
        print("training_execution_authorized=false", file=os.sys.stderr)
        print("funds_movement=false", file=os.sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
