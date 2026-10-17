#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import types
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V2R"
)
PLAN_SCHEMA = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v2r"
)
PLAN_PREFIX = "voidbuye2protectedbootstrapplan2r_"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_installed_qualification_v2r.py"
)
QUALIFIER_BLOB = "c6b1236de5eac88dd29ea84ef8b66ccd6e71a043"

BOOTSTRAP_PATH = Path(
    "/opt/void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v2/bin/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v2"
)
BOOTSTRAP_BYTES = 731_072
BOOTSTRAP_SHA256 = (
    "37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276"
)
BOOTSTRAP_GIT_BLOB = "45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62"

LAUNCHER_LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-"
    "candidate-lock-v1.json"
)
LAUNCHER_LOCK_BLOB = "f8ff6fbb855aecafc329cd60622cf3af782745a3"
LAUNCHER_MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_v1.py"
)
LAUNCHER_MATERIALIZER_BLOB = "50e8e7ba06740af830cc3c9df34d0ef7739a7e67"
LAUNCHER_BYTES = 731_072
LAUNCHER_SHA256 = (
    "4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a"
)
LAUNCHER_GIT_BLOB = "eb66ce5313a8c0b01639ebec79564111d55163c4"

NATIVE_LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
)
NATIVE_LOCK_BLOB = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
NATIVE_MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_native_v2.py"
)
NATIVE_MATERIALIZER_BLOB = "557eb68453d517d78bb3b6c6d8427df9ed36316f"
NATIVE_BYTES = 726_976
NATIVE_SHA256 = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)

HEX40 = re.compile(r"^[0-9a-f]{40}$")
MAX_READ = 2 * 1024 * 1024

GIT_ENV = {
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


class PlanError(RuntimeError):
    pass


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
        text=True,
        check=False,
        timeout=20,
        env=GIT_ENV,
    )
    if cp.returncode != 0 or cp.stderr:
        raise PlanError("git_failed:" + ":".join(args))
    return cp.stdout.strip()


def repository_blob(relative: str, expected: str) -> bytes:
    path = ROOT / relative
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > MAX_READ
    ):
        raise PlanError("repository_file_metadata_invalid:" + relative)
    raw = path.read_bytes()
    after = path.lstat()
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
            raise PlanError("repository_file_changed:" + relative)
    if git_blob(raw) != expected:
        raise PlanError("repository_blob_mismatch:" + relative)
    if git("rev-parse", "HEAD:" + relative) != expected:
        raise PlanError("repository_head_blob_mismatch:" + relative)
    return raw


def stable_artifact(
    path: Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str | None,
    label: str,
) -> dict[str, Any]:
    raw_path = str(path)
    if (
        not path.is_absolute()
        or os.path.normpath(raw_path) != raw_path
        or "\n" in raw_path
        or "\r" in raw_path
    ):
        raise PlanError(label + "_path_invalid")

    try:
        before = path.lstat()
    except OSError as exc:
        raise PlanError(label + "_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != 0o555
        or before.st_size != expected_bytes
    ):
        raise PlanError(label + "_metadata_invalid")

    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if (
            opened.st_dev != before.st_dev
            or opened.st_ino != before.st_ino
            or opened.st_size != before.st_size
            or opened.st_mtime_ns != before.st_mtime_ns
            or opened.st_ctime_ns != before.st_ctime_ns
        ):
            raise PlanError(label + "_rebound")

        digest = hashlib.sha256()
        raw = bytearray()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise PlanError(label + "_short_read")
            digest.update(chunk)
            raw.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise PlanError(label + "_grew")

        after = os.fstat(fd)
        visible = path.lstat()
        if (
            after.st_dev != opened.st_dev
            or after.st_ino != opened.st_ino
            or after.st_size != opened.st_size
            or visible.st_dev != opened.st_dev
            or visible.st_ino != opened.st_ino
            or visible.st_size != opened.st_size
            or visible.st_mtime_ns != opened.st_mtime_ns
            or visible.st_ctime_ns != opened.st_ctime_ns
        ):
            raise PlanError(label + "_changed")
    finally:
        os.close(fd)

    data = bytes(raw)
    if digest.hexdigest() != expected_sha256:
        raise PlanError(label + "_sha256_mismatch")
    observed_blob = git_blob(data)
    if expected_git_blob is not None and observed_blob != expected_git_blob:
        raise PlanError(label + "_git_blob_mismatch")
    if not data.startswith(b"\x7fELF"):
        raise PlanError(label + "_not_elf")

    return {
        "path": raw_path,
        "bytes": len(data),
        "sha256": expected_sha256,
        "git_blob_sha1": observed_blob,
        "mode": "0555",
        "uid": before.st_uid,
        "gid": before.st_gid,
        "dev": before.st_dev,
        "ino": before.st_ino,
    }


def load_qualifier():
    raw = repository_blob(QUALIFIER_REL, QUALIFIER_BLOB)
    module = types.ModuleType("void_e2_v2r_installed_qualifier_verified")
    module.__file__ = str(ROOT / QUALIFIER_REL)
    module.__package__ = None
    try:
        code = compile(
            raw.decode("utf-8", "strict"),
            QUALIFIER_REL,
            "exec",
            dont_inherit=True,
            optimize=0,
        )
        exec(code, module.__dict__)
    except Exception as exc:
        raise PlanError("qualifier_verified_execution_failed") from exc
    collect = getattr(module, "collect", None)
    if not callable(collect):
        raise PlanError("qualifier_collect_missing")
    return module


def source_dependencies() -> None:
    repository_blob(LAUNCHER_LOCK_REL, LAUNCHER_LOCK_BLOB)
    repository_blob(LAUNCHER_MATERIALIZER_REL, LAUNCHER_MATERIALIZER_BLOB)
    repository_blob(NATIVE_LOCK_REL, NATIVE_LOCK_BLOB)
    repository_blob(NATIVE_MATERIALIZER_REL, NATIVE_MATERIALIZER_BLOB)


def collect_plan(
    launcher: Path,
    native: Path,
    expected_head: str,
) -> dict[str, Any]:
    if os.geteuid() == 0:
        raise PlanError("nonroot_plan_required")
    if HEX40.fullmatch(expected_head) is None:
        raise PlanError("expected_head_invalid")

    source_dependencies()
    qualifier = load_qualifier()
    try:
        qualification = qualifier.collect(expected_head)
    except Exception as exc:
        raise PlanError("installed_qualification_hold:" + type(exc).__name__ + ":" + str(exc)) from exc

    required_qualification = {
        "expected_head": expected_head,
        "accepted_lock_id": (
            "voidbuye2bootstraplock3_"
            "690d119c90f5c8c20f429fcc14919b62691f9a1b3bfe2226476267ede993197f"
        ),
        "candidate_id": (
            "voidbuye2bootstrapcand2_"
            "b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def"
        ),
        "bootstrap_runtime_head_compile_bound": False,
        "runtime_expected_head_strict_lowercase_hex": True,
        "runtime_expected_head_forwarded_unchanged": True,
        "canonical_main_candidate_authority": True,
        "superseded_v2_lock_install_authority": False,
        "installed_identity_green": True,
        "policy_generation_green": True,
        "protected_installer_source_identity_green": True,
        "runtime_head_contract_green": True,
        "bootstrap_execution_performed": False,
        "protected_installer_apply_performed": False,
        "filesystem_write": False,
        "protected_installer_execution_readiness": True,
    }
    for key, value in required_qualification.items():
        if qualification.get(key) != value:
            raise PlanError("installed_qualification_field_mismatch:" + key)

    installed = qualification.get("installed")
    if not isinstance(installed, dict):
        raise PlanError("installed_qualification_root_missing")
    if installed.get("bootstrap_path") != str(BOOTSTRAP_PATH):
        raise PlanError("installed_bootstrap_path_mismatch")
    if (
        installed.get("bootstrap_bytes") != BOOTSTRAP_BYTES
        or installed.get("bootstrap_sha256") != BOOTSTRAP_SHA256
        or installed.get("bootstrap_git_blob_sha1") != BOOTSTRAP_GIT_BLOB
    ):
        raise PlanError("installed_bootstrap_identity_mismatch")

    launcher_info = stable_artifact(
        launcher,
        expected_bytes=LAUNCHER_BYTES,
        expected_sha256=LAUNCHER_SHA256,
        expected_git_blob=LAUNCHER_GIT_BLOB,
        label="accepted_launcher",
    )
    native_info = stable_artifact(
        native,
        expected_bytes=NATIVE_BYTES,
        expected_sha256=NATIVE_SHA256,
        expected_git_blob=None,
        label="accepted_native",
    )

    argv = [
        str(BOOTSTRAP_PATH),
        "--installer-plan",
        "--launcher",
        str(launcher),
        "--native",
        str(native),
        "--expected-head",
        expected_head,
    ]

    body = {
        "schema": PLAN_SCHEMA,
        "version": 1,
        "expected_head": expected_head,
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "installed_bootstrap": installed,
        "accepted_launcher": launcher_info,
        "accepted_native": native_info,
        "bootstrap_argv": argv,
        "bootstrap_execution_performed": False,
        "protected_installer_apply_performed": False,
        "filesystem_write": False,
        "service_mutation": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "transaction": False,
        "rpc_call": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_liquidity_action": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
    }
    plan_id = PLAN_PREFIX + sha256(canonical(body))
    return {"plan_id": plan_id, "body": body}


def emit_plan(result: dict[str, Any]) -> None:
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("nonroot_required=true")
    print("plan_id=" + result["plan_id"])
    print("expected_head=" + body["expected_head"])
    print("qualifier_git_blob_sha1=" + QUALIFIER_BLOB)
    print("installed_bootstrap_identity_green=true")
    print("accepted_launcher_identity_green=true")
    print("accepted_native_identity_green=true")
    print("bootstrap_runtime_head_compile_bound=false")
    print("runtime_expected_head_forwarded_unchanged=true")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print(
        "bootstrap_argv_json="
        + json.dumps(body["bootstrap_argv"], separators=(",", ":"))
    )
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALLER_BOOTSTRAP_EXECUTE_PLAN_V2R"
    )


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("qualifier_git_blob_sha1=" + QUALIFIER_BLOB)
    print("launcher_lock_git_blob_sha1=" + LAUNCHER_LOCK_BLOB)
    print("native_lock_git_blob_sha1=" + NATIVE_LOCK_BLOB)
    print("bootstrap_path=" + str(BOOTSTRAP_PATH))
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")


def self_test() -> None:
    assert HEX40.fullmatch("a" * 40)
    assert HEX40.fullmatch("A" * 40) is None
    assert HEX40.fullmatch("a" * 39) is None
    assert PLAN_PREFIX == "voidbuye2protectedbootstrapplan2r_"
    sample = {
        "expected_head": "a" * 40,
        "launcher": LAUNCHER_SHA256,
        "native": NATIVE_SHA256,
    }
    assert len(sha256(canonical(sample))) == 64
    assert str(BOOTSTRAP_PATH).endswith("protected_install_bootstrap_v2")
    print(MARKER + "_SELF_TEST_GREEN")
    print("nonroot_plan_required=true")
    print("merged_v2r_qualifier_bound=true")
    print("accepted_launcher_materializer_bound=true")
    print("accepted_native_materializer_bound=true")
    print("strict_runtime_head_required=true")
    print("operation_bound_plan_id=true")
    print("structured_bootstrap_argv_only=true")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    parser.add_argument("--launcher", default="")
    parser.add_argument("--native", default="")
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0

    if not args.launcher or not args.native or not args.expected_head:
        raise PlanError("launcher_native_expected_head_required")
    result = collect_plan(
        Path(args.launcher),
        Path(args.native),
        args.expected_head,
    )
    emit_plan(result)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PlanError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("read_only=true")
        print("bootstrap_execution_performed=false")
        print("protected_installer_apply_performed=false")
        print("filesystem_write=false")
        print("service_mutation=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("treasury_liquidity_action=false")
        print("funds_movement=false")
        raise SystemExit(2)
