#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
from typing import Any, Iterable

MARKER = "VOID_APOLLYON_TRAINING_MATERIALS_CREATE_ONLY_INSTALL_V1"
PLAN_PREFIX = "void_apollyon_training_materials_create_only_plan_v1:"
RECEIPT_PREFIX = "void_apollyon_training_materials_create_only_receipt_v1:"
TARGET_HOST = "Xiphos"
ACCOUNT = "voidapollyontrain"
HOME = Path("/var/lib/void-apollyon-training-v1")
INPUT_DIR = HOME / "input"
OUTPUT_DIR = HOME / "output"
UNIT_TARGET = Path("/etc/systemd/system/void-apollyon-training-bus-isolation-v1.service")
PREENTRY_TARGET = Path(
    "/opt/void-apollyon-training-bus-isolation-v1/"
    "apollyon_training_bus_isolation_preentry_v1"
)
ENTRYPOINT_TARGET = Path(
    "/opt/void-apollyon-training-v1/"
    "apollyon_candidate_training_entrypoint_v1"
)
UNIT_NAME = UNIT_TARGET.name
ROOT = Path(__file__).resolve().parents[2]
UNIT_SOURCE = ROOT / "ops/xiphos/void-apollyon-training-bus-isolation-v1.service"
PREENTRY_SOURCE = ROOT / "ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c"
ENTRYPOINT_SOURCE = ROOT / "ops/xiphos/apollyon_candidate_training_entrypoint_v1.c"
PREENTRY_LOCK = (
    ROOT / "fixtures/security/apollyon-training-preentry-binary-candidate-lock-v1.json"
)
ENTRYPOINT_LOCK = (
    ROOT / "ops/security/apollyon-candidate-training-entrypoint-binary-lock-v1.json"
)

EXPECTED_UNIT_BLOB = "62fbabe1cf7ae0d940f5d96e19b06282f841267b"
EXPECTED_PREENTRY_SOURCE_BLOB = "9503d19c8bc0b4f073ba117f6a547d339b7623d0"
EXPECTED_ENTRYPOINT_SOURCE_BLOB = "bfeff81f3eab98988a9be9600a05c696674c49d6"
EXPECTED_PREENTRY_LOCK_BLOB = "ddff9c18153aa37e7e8b3faa3a43eb1dde921a3d"
EXPECTED_ENTRYPOINT_LOCK_BLOB = "014957fbe9cceae6d3bfa4ee1c360917309213f5"
EXPECTED_PREENTRY_BYTES = 17352
EXPECTED_PREENTRY_SHA256 = (
    "6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47"
)
EXPECTED_ENTRYPOINT_BYTES = 17384
EXPECTED_ENTRYPOINT_SHA256 = (
    "7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a"
)
EXPECTED_PREENTRY_SELF_TEST_SHA256 = (
    "c3d4cc0884e2ebc368c1803624f4064867d5f6c4d23df1185b22fd018188c327"
)
EXPECTED_ENTRYPOINT_SELF_TEST_SHA256 = (
    "f6b49a70391202157ac02d5c45c71d1e1952693a7afa758ffb9798056c015b0a"
)
EXPECTED_PREENTRY_LOCK_ID = (
    "apollyon_training_preentry_binary_candidate_lock_v1:"
    "d5acb7184059f2690120374f990968f0a041872e8119c555d3da21671c6d49a5"
)
EXPECTED_ENTRYPOINT_LOCK_ID = (
    "apollyon_candidate_training_entrypoint_binary_lock_v1:"
    "f63b6018e752ec685ed427a1badacae1799896f859dea8bb447a6fc271fd8a7a"
)
EXPECTED_COMPILER = {
    "requested_path": "/usr/bin/cc",
    "realpath": "/usr/bin/x86_64-linux-gnu-gcc-13",
    "version_line": "cc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0",
    "dumpmachine": "x86_64-linux-gnu",
    "dumpversion": "13.3.0",
}
EXPECTED_SYSTEMD_MAJOR = 255
COMPILE_FLAGS = (
    "-std=c11",
    "-O2",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-D_FORTIFY_SOURCE=2",
    "-fstack-protector-strong",
    "-Wl,-z,relro,-z,now",
    "-Wl,--build-id=none",
)
BUILD_ENV = {
    "PATH": "/usr/bin:/bin",
    "LC_ALL": "C",
    "TZ": "UTC",
    "SOURCE_DATE_EPOCH": "0",
}
MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_LOCK_BYTES = 256 * 1024


class Hold(RuntimeError):
    pass


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data: bytes) -> str:
    digest = hashlib.sha1()
    digest.update(f"blob {len(data)}\0".encode("ascii"))
    digest.update(data)
    return digest.hexdigest()


def same_identity(left: os.stat_result, right: os.stat_result) -> bool:
    return (
        left.st_dev == right.st_dev
        and left.st_ino == right.st_ino
        and left.st_uid == right.st_uid
        and left.st_gid == right.st_gid
        and left.st_mode == right.st_mode
        and left.st_nlink == right.st_nlink
        and left.st_size == right.st_size
        and getattr(left, "st_mtime_ns", None) == getattr(right, "st_mtime_ns", None)
        and getattr(left, "st_ctime_ns", None) == getattr(right, "st_ctime_ns", None)
    )


def bounded_regular_bytes(path: Path, maximum: int, label: str) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise Hold(label + "_unreadable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise Hold(label + "_metadata_invalid")
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_CLOEXEC", 0)
    try:
        fd = os.open(path, flags)
    except OSError as exc:
        raise Hold(label + "_open_failed") from exc
    try:
        opened = os.fstat(fd)
        if not same_identity(before, opened):
            raise Hold(label + "_open_identity_drift")
        chunks: list[bytes] = []
        remaining = before.st_size
        while remaining:
            chunk = os.read(fd, min(remaining, 64 * 1024))
            if not chunk:
                raise Hold(label + "_short_read")
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise Hold(label + "_oversize_read")
        after_fd = os.fstat(fd)
        after_path = path.lstat()
        if not same_identity(opened, after_fd) or not same_identity(after_fd, after_path):
            raise Hold(label + "_read_identity_drift")
        data = b"".join(chunks)
        if len(data) != before.st_size:
            raise Hold(label + "_size_drift")
        return data
    except OSError as exc:
        raise Hold(label + "_descriptor_io_failed") from exc
    finally:
        os.close(fd)


def require_blob(path: Path, expected: str, maximum: int, label: str) -> bytes:
    data = bounded_regular_bytes(path, maximum, label)
    if git_blob_sha1(data) != expected:
        raise Hold(label + "_git_blob_mismatch")
    return data


def exact_keys(value: dict[str, Any], expected: Iterable[str], label: str) -> None:
    if set(value) != set(expected):
        raise Hold(label + "_schema_invalid")


def parse_json_bytes(data: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise Hold(label + "_json_invalid") from exc
    if not isinstance(value, dict):
        raise Hold(label + "_schema_invalid")
    return value


def validate_preentry_lock(value: dict[str, Any]) -> None:
    exact_keys(
        value,
        (
            "authority",
            "candidate",
            "lock_id",
            "marker",
            "next_gate",
            "reviewed_candidate_head_sha",
            "reviewed_candidate_validator_git_blob_sha1",
            "status",
            "version",
        ),
        "preentry_lock",
    )
    if (
        type(value["version"]) is not int
        or value["version"] != 1
        or value["lock_id"] != EXPECTED_PREENTRY_LOCK_ID
        or value["next_gate"]
        != "installed_apollyon_training_bus_isolation_qualification_v1"
        or value["status"] != "candidate_binary_identity_locked_repository_evidence"
    ):
        raise Hold("preentry_lock_identity_invalid")
    candidate = value.get("candidate")
    authority = value.get("authority")
    if not isinstance(candidate, dict) or not isinstance(authority, dict):
        raise Hold("preentry_lock_schema_invalid")
    if (
        candidate.get("binary_bytes") != EXPECTED_PREENTRY_BYTES
        or candidate.get("binary_sha256") != EXPECTED_PREENTRY_SHA256
        or candidate.get("source_git_blob_sha1") != EXPECTED_PREENTRY_SOURCE_BLOB
        or authority.get("candidate_binary_identity_accepted") is not True
        or authority.get("host_installation") is not False
        or authority.get("service_action") is not False
        or authority.get("training_execution") is not False
        or authority.get("funds_movement") is not False
    ):
        raise Hold("preentry_lock_contract_invalid")


def validate_entrypoint_lock(value: dict[str, Any]) -> None:
    required = {
        "schema",
        "marker",
        "version",
        "repository",
        "candidate_parent_head",
        "source",
        "candidate_proof",
        "candidate_workflow",
        "compiler",
        "compile_recipe",
        "binary",
        "self_test",
        "candidate_id",
        "hosted_evidence",
        "candidate_binary_identity_accepted",
        "installed_training_entrypoint_identity_proven",
        "live_systemd_enforcement_proven",
        "durable_attempt_claim_proven",
        "candidate_weight_mutation",
        "training_execution",
        "attempt_claim",
        "service_action",
        "wallet_access",
        "transaction_signing",
        "funds_movement",
        "next_gate",
        "lock_id",
    }
    if set(value) != required:
        raise Hold("entrypoint_lock_schema_invalid")
    source = value.get("source")
    binary = value.get("binary")
    compiler = value.get("compiler")
    recipe = value.get("compile_recipe")
    self_test = value.get("self_test")
    if not all(isinstance(item, dict) for item in (source, binary, compiler, recipe, self_test)):
        raise Hold("entrypoint_lock_schema_invalid")
    if (
        type(value["version"]) is not int
        or value["version"] != 1
        or value["lock_id"] != EXPECTED_ENTRYPOINT_LOCK_ID
        or source.get("git_blob_sha1") != EXPECTED_ENTRYPOINT_SOURCE_BLOB
        or binary.get("bytes") != EXPECTED_ENTRYPOINT_BYTES
        or binary.get("sha256") != EXPECTED_ENTRYPOINT_SHA256
        or self_test.get("stdout_sha256") != EXPECTED_ENTRYPOINT_SELF_TEST_SHA256
        or compiler != EXPECTED_COMPILER
        or recipe.get("argv_prefix") != ["/usr/bin/cc", *COMPILE_FLAGS]
        or recipe.get("source_date_epoch") != "0"
        or value.get("candidate_binary_identity_accepted") is not True
        or value.get("installed_training_entrypoint_identity_proven") is not False
        or value.get("live_systemd_enforcement_proven") is not False
        or value.get("training_execution") is not False
        or value.get("service_action") is not False
        or value.get("funds_movement") is not False
    ):
        raise Hold("entrypoint_lock_contract_invalid")


def verify_repository_contract() -> dict[str, bytes]:
    unit = require_blob(UNIT_SOURCE, EXPECTED_UNIT_BLOB, MAX_SOURCE_BYTES, "unit_source")
    preentry_source = require_blob(
        PREENTRY_SOURCE,
        EXPECTED_PREENTRY_SOURCE_BLOB,
        MAX_SOURCE_BYTES,
        "preentry_source",
    )
    entrypoint_source = require_blob(
        ENTRYPOINT_SOURCE,
        EXPECTED_ENTRYPOINT_SOURCE_BLOB,
        MAX_SOURCE_BYTES,
        "entrypoint_source",
    )
    preentry_lock_bytes = require_blob(
        PREENTRY_LOCK,
        EXPECTED_PREENTRY_LOCK_BLOB,
        MAX_LOCK_BYTES,
        "preentry_lock",
    )
    entrypoint_lock_bytes = require_blob(
        ENTRYPOINT_LOCK,
        EXPECTED_ENTRYPOINT_LOCK_BLOB,
        MAX_LOCK_BYTES,
        "entrypoint_lock",
    )
    validate_preentry_lock(parse_json_bytes(preentry_lock_bytes, "preentry_lock"))
    validate_entrypoint_lock(parse_json_bytes(entrypoint_lock_bytes, "entrypoint_lock"))
    return {
        "unit": unit,
        "preentry_source": preentry_source,
        "entrypoint_source": entrypoint_source,
    }


