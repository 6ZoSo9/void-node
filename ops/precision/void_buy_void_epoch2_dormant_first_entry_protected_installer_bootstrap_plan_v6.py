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
    "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V6"
)
PLAN_SCHEMA = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v6"
)
PLAN_PREFIX = "voidbuye2protectedbootstrapplan6_"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_installed_qualification_v6.py"
)
QUALIFIER_BLOB = "e16b0ce71a4522b21762fa824c96aefb58e3a25b"

BOOTSTRAP_PATH = Path(
    "/opt/void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v6/bin/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v6"
)
BOOTSTRAP_BYTES = 874_608
BOOTSTRAP_SHA256 = (
    "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
)
BOOTSTRAP_GIT_BLOB = "a91707c3e5803071fc73c3451c9bcb3b774f8b48"

LAUNCHER_LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-"
    "candidate-lock-v2.json"
)
LAUNCHER_LOCK_BLOB = "227c2fa449abf1387925373c706ecd07775d5898"
LAUNCHER_MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_v2.py"
)
LAUNCHER_MATERIALIZER_BLOB = "609cde180490f4f5f53ed7e34d73b95f22313bcd"
LAUNCHER_BYTES = 731_072
LAUNCHER_SHA256 = (
    "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
)
LAUNCHER_GIT_BLOB = "798907b18c73ee2cc1dea0fe05b36f27ab4137a7"

LAUNCHER_LOCK_ID = (
    "voidbuye2dormantfirstentrylock2_"
    "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543"
)
LAUNCHER_CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand2_"
    "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b"
)

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


def _safe_tool(path: Path, label: str, maximum: int) -> dict[str, Any]:
    raw_path = str(path)
    if not path.is_absolute() or os.path.normpath(raw_path) != raw_path:
        raise PlanError(label + "_path_invalid")
    try:
        alias = path.lstat()
    except OSError as exc:
        raise PlanError(label + "_unavailable") from exc
    if alias.st_uid != 0:
        raise PlanError(label + "_alias_not_root_owned")
    if stat.S_ISREG(alias.st_mode):
        if stat.S_IMODE(alias.st_mode) & 0o022:
            raise PlanError(label + "_alias_writable")
    elif not stat.S_ISLNK(alias.st_mode):
        raise PlanError(label + "_alias_type_invalid")

    real = Path(os.path.realpath(path))
    current = Path("/")
    for part in real.parent.parts[1:]:
        current = current / part
        st = current.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise PlanError(label + "_ancestry_invalid:" + str(current))
    st = real.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
        or st.st_size < 1
        or st.st_size > maximum
    ):
        raise PlanError(label + "_target_invalid")
    fd = os.open(real, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if (
            opened.st_dev != st.st_dev
            or opened.st_ino != st.st_ino
            or opened.st_size != st.st_size
            or opened.st_mtime_ns != st.st_mtime_ns
            or opened.st_ctime_ns != st.st_ctime_ns
        ):
            raise PlanError(label + "_rebound")
        h = hashlib.sha256()
        remaining = st.st_size
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise PlanError(label + "_short_read")
            h.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise PlanError(label + "_grew")
        after = os.fstat(fd)
        visible = real.lstat()
        if (
            after.st_dev != opened.st_dev
            or after.st_ino != opened.st_ino
            or visible.st_dev != opened.st_dev
            or visible.st_ino != opened.st_ino
            or visible.st_size != opened.st_size
            or visible.st_mtime_ns != opened.st_mtime_ns
            or visible.st_ctime_ns != opened.st_ctime_ns
        ):
            raise PlanError(label + "_changed")
    finally:
        os.close(fd)
    return {
        "path": raw_path,
        "resolved_path": str(real),
        "bytes": st.st_size,
        "sha256": h.hexdigest(),
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "uid": st.st_uid,
        "gid": st.st_gid,
        "dev": st.st_dev,
        "ino": st.st_ino,
    }


def checkout_snapshot(expected_head: str) -> dict[str, str]:
    if HEX40.fullmatch(expected_head) is None:
        raise PlanError("expected_head_invalid")
    head = git("rev-parse", "--verify", "HEAD^{commit}")
    tree = git("rev-parse", "--verify", "HEAD^{tree}")
    branch = git("symbolic-ref", "--short", "-q", "HEAD")
    status = git("status", "--porcelain=v1", "--untracked-files=all")
    top = git("rev-parse", "--show-toplevel")
    if head != expected_head:
        raise PlanError("checkout_head_mismatch")
    if branch != "main":
        raise PlanError("checkout_branch_not_main")
    if status != "":
        raise PlanError("checkout_not_clean")
    if Path(top).resolve() != ROOT.resolve():
        raise PlanError("checkout_root_invalid")
    return {"head": head, "tree": tree, "branch": branch}


def load_qualifier():
    raw = repository_blob(QUALIFIER_REL, QUALIFIER_BLOB)
    module = types.ModuleType("void_e2_v6_installed_qualifier_verified")
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
    if getattr(module, "MARKER", "") != (
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6"
    ):
        raise PlanError("qualifier_marker_mismatch")
    if getattr(module, "INSTALLER_SOURCE_GIT_BLOB_SHA1", "") != (
        "c9dd842b620f2ed7c3fdd5876c222a419b6b0c68"
    ):
        raise PlanError("qualifier_installer_blob_mismatch")
    return module


def source_dependencies() -> dict[str, Any]:
    launcher_lock_raw = repository_blob(LAUNCHER_LOCK_REL, LAUNCHER_LOCK_BLOB)
    repository_blob(LAUNCHER_MATERIALIZER_REL, LAUNCHER_MATERIALIZER_BLOB)
    native_lock_raw = repository_blob(NATIVE_LOCK_REL, NATIVE_LOCK_BLOB)
    repository_blob(NATIVE_MATERIALIZER_REL, NATIVE_MATERIALIZER_BLOB)

    try:
        launcher_lock = json.loads(launcher_lock_raw.decode("utf-8", "strict"))
        native_lock = json.loads(native_lock_raw.decode("utf-8", "strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PlanError("accepted_lock_json_invalid") from exc
    if not isinstance(launcher_lock, dict) or not isinstance(native_lock, dict):
        raise PlanError("accepted_lock_shape_invalid")

    launcher_required = {
        "lock_id": LAUNCHER_LOCK_ID,
        "candidate_accepted": True,
        "launcher_binary_identity_accepted": True,
        "runtime_head_contract_accepted": True,
        "canonical_main_candidate_authority": True,
        "superseded_v1_lock_install_authority": False,
        "protected_install_authorized": False,
        "precision_install_authorized": False,
        "native_or_binder_live_execution_authorized": False,
        "funds_movement_authorized": False,
    }
    for key, expected in launcher_required.items():
        if launcher_lock.get(key) != expected:
            raise PlanError("launcher_lock_field_mismatch:" + key)
    launcher_report = launcher_lock.get("candidate_report")
    if (
        not isinstance(launcher_report, dict)
        or launcher_report.get("candidate_id") != LAUNCHER_CANDIDATE_ID
        or launcher_report.get("launcher_binary_bytes") != LAUNCHER_BYTES
        or launcher_report.get("launcher_binary_sha256") != LAUNCHER_SHA256
        or launcher_report.get("launcher_binary_git_blob_sha1") != LAUNCHER_GIT_BLOB
        or launcher_report.get("runtime_expected_head_compile_bound") is not False
        or launcher_report.get("runtime_expected_head_strict_lowercase_hex") is not True
        or launcher_report.get("runtime_expected_head_forwarded_unchanged") is not True
        or launcher_report.get("repository_head_not_embedded_in_launcher") is not True
    ):
        raise PlanError("launcher_lock_candidate_report_invalid")

    native_required = {
        "lock_id":
            "voidbuye2dormantbinderlock3_"
            "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a",
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
        "funds_movement_authorized": False,
    }
    for key, expected in native_required.items():
        if native_lock.get(key) != expected:
            raise PlanError("native_lock_field_mismatch:" + key)
    native_report = native_lock.get("candidate_report")
    if (
        not isinstance(native_report, dict)
        or native_report.get("candidate_id") != (
            "voidbuye2dormantbindercand2_"
            "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"
        )
        or native_report.get("native_binary_bytes") != NATIVE_BYTES
        or native_report.get("native_binary_sha256") != NATIVE_SHA256
    ):
        raise PlanError("native_lock_candidate_report_invalid")

    return {"launcher_lock": launcher_lock, "native_lock": native_lock}


def collect_plan(
    launcher: Path,
    native: Path,
    expected_head: str,
) -> dict[str, Any]:
    if os.geteuid() == 0:
        raise PlanError("nonroot_plan_required")
    checkout = checkout_snapshot(expected_head)
    source_dependencies()

    qualifier = load_qualifier()
    installer = qualifier._load_installer()
    expected_bootstrap = {
        "lock_id":
            "voidbuye2dormantbootstraplock3_"
            "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b",
        "candidate_id":
            "voidbuye2dormantbootstrapcand3_"
            "13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062",
        "bytes": BOOTSTRAP_BYTES,
        "sha256": BOOTSTRAP_SHA256,
        "git_blob_sha1": BOOTSTRAP_GIT_BLOB,
        "manifest_bytes": 2382,
        "manifest_sha256":
            "aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662",
        "manifest_git_blob_sha1":
            "6e0630af72111bd9976dcc38cdcdada1904dd067",
        "policy_schema":
            "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
            "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6",
    }
    observed_bootstrap = {
        "lock_id": installer.LOCK_ID,
        "candidate_id": installer.CANDIDATE_ID,
        "bytes": installer.BOOTSTRAP_BYTES,
        "sha256": installer.BOOTSTRAP_SHA256,
        "git_blob_sha1": installer.BOOTSTRAP_GIT_BLOB_SHA1,
        "manifest_bytes": installer.MANIFEST_BYTES,
        "manifest_sha256": installer.MANIFEST_SHA256,
        "manifest_git_blob_sha1": installer.MANIFEST_GIT_BLOB_SHA1,
        "policy_schema": installer.POLICY_SCHEMA,
    }
    if observed_bootstrap != expected_bootstrap:
        raise PlanError("qualifier_bootstrap_generation_mismatch")
    installed_path = (
        installer.INSTALL_ROOT / installer.BIN_DIR / installer.BOOTSTRAP_NAME
    )
    if installed_path != BOOTSTRAP_PATH:
        raise PlanError("qualifier_bootstrap_path_mismatch")

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
    python_info = _safe_tool(Path("/usr/bin/python3"), "qualification_python", 512 * 1024 * 1024)
    git_info = _safe_tool(Path("/usr/bin/git"), "qualification_git", 64 * 1024 * 1024)

    qualification_contract = {
        "qualifier_source_path": str(ROOT / QUALIFIER_REL),
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "qualifier_installer_git_blob_sha1":
            "c9dd842b620f2ed7c3fdd5876c222a419b6b0c68",
        "expected_head": expected_head,
        "root_execution_required": True,
        "read_only_required": True,
        "descriptor_bound_source_execution_required": True,
        "interpreter": python_info,
        "git_tool": git_info,
        "required_result": {
            "version": 6,
            "read_only": True,
            "expected_head": expected_head,
            "accepted_lock_id": expected_bootstrap["lock_id"],
            "candidate_id": expected_bootstrap["candidate_id"],
            "installed_identity_green": True,
            "policy_generation_green": True,
            "python_generation_bound": True,
            "git_generation_bound": True,
            "checkout_generation_bound": True,
            "installed_generation_stable": True,
            "bootstrap_descriptor_bound_self_test": True,
            "bootstrap_self_test_execution": True,
            "bootstrap_self_test_count": 2,
            "bootstrap_self_test_stable": True,
            "bootstrap_sha256": BOOTSTRAP_SHA256,
            "bootstrap_bytes": BOOTSTRAP_BYTES,
            "bootstrap_git_blob_sha1": BOOTSTRAP_GIT_BLOB,
            "manifest_sha256": expected_bootstrap["manifest_sha256"],
            "manifest_bytes": expected_bootstrap["manifest_bytes"],
            "manifest_git_blob_sha1": expected_bootstrap["manifest_git_blob_sha1"],
            "bootstrap_execution_beyond_self_test": False,
            "inner_installer_execution": False,
            "protected_installer_apply": False,
            "filesystem_write": False,
            "service_mutation": False,
            "systemd_mutation": False,
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
        },
    }

    bootstrap_argv = [
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
        "version": 6,
        "checkout": checkout,
        "expected_head": expected_head,
        "qualifier_git_blob_sha1": QUALIFIER_BLOB,
        "qualification_contract": qualification_contract,
        "installed_qualification_performed": False,
        "installed_qualification_required_before_bootstrap_plan": True,
        "expected_installed_bootstrap": expected_bootstrap,
        "accepted_launcher": launcher_info,
        "accepted_launcher_lock_id": LAUNCHER_LOCK_ID,
        "accepted_launcher_candidate_id": LAUNCHER_CANDIDATE_ID,
        "launcher_runtime_head_contract_accepted": True,
        "launcher_superseded_v1_lock_install_authority": False,
        "accepted_native": native_info,
        "bootstrap_argv": bootstrap_argv,
        "bootstrap_execution_performed": False,
        "protected_installer_apply_performed": False,
        "filesystem_write": False,
        "service_mutation": False,
        "systemd_mutation": False,
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
    print("installed_qualification_performed=false")
    print("installed_qualification_required_before_bootstrap_plan=true")
    print("qualification_root_execution_required=true")
    print("qualification_descriptor_bound_source_execution_required=true")
    print("expected_installed_bootstrap_identity_bound=true")
    print("accepted_launcher_identity_green=true")
    print("accepted_launcher_lock_id=" + LAUNCHER_LOCK_ID)
    print("accepted_launcher_candidate_id=" + LAUNCHER_CANDIDATE_ID)
    print("launcher_runtime_head_contract_accepted=true")
    print("launcher_superseded_v1_lock_install_authority=false")
    print("accepted_native_identity_green=true")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
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
        "qualification_contract_json="
        + json.dumps(body["qualification_contract"], sort_keys=True, separators=(",", ":"))
    )
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALLER_BOOTSTRAP_V6_QUALIFY_AND_EXECUTE_PLAN"
    )


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("qualifier_git_blob_sha1=" + QUALIFIER_BLOB)
    print("launcher_lock_git_blob_sha1=" + LAUNCHER_LOCK_BLOB)
    print("launcher_materializer_git_blob_sha1=" + LAUNCHER_MATERIALIZER_BLOB)
    print("accepted_launcher_lock_id=" + LAUNCHER_LOCK_ID)
    print("accepted_launcher_candidate_id=" + LAUNCHER_CANDIDATE_ID)
    print("launcher_runtime_head_contract_accepted=true")
    print("launcher_superseded_v1_lock_install_authority=false")
    print("native_lock_git_blob_sha1=" + NATIVE_LOCK_BLOB)
    print("native_materializer_git_blob_sha1=" + NATIVE_MATERIALIZER_BLOB)
    print("bootstrap_path=" + str(BOOTSTRAP_PATH))
    print("installed_qualification_performed=false")
    print("qualification_descriptor_bound_source_execution_required=true")
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
    assert PLAN_PREFIX == "voidbuye2protectedbootstrapplan6_"
    assert BOOTSTRAP_BYTES == 874_608
    assert BOOTSTRAP_SHA256 == (
        "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
    )
    assert BOOTSTRAP_GIT_BLOB == "a91707c3e5803071fc73c3451c9bcb3b774f8b48"
    assert str(BOOTSTRAP_PATH).endswith("protected_install_bootstrap_v6")
    print(MARKER + "_SELF_TEST_GREEN")
    print("nonroot_plan_required=true")
    print("merged_v6_qualifier_bound=true")
    print("accepted_launcher_materializer_bound=true")
    print("accepted_launcher_lock_v2_bound=true")
    print("launcher_runtime_head_contract_accepted=true")
    print("launcher_superseded_v1_lock_install_authority=false")
    print("accepted_native_materializer_bound=true")
    print("strict_runtime_head_required=true")
    print("qualification_root_execution_separate=true")
    print("qualification_descriptor_bound_source_execution_required=true")
    print("installed_qualification_performed=false")
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
        raise PlanError("plan_arguments_required")
    result = collect_plan(Path(args.launcher), Path(args.native), args.expected_head)
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
        print("installed_qualification_performed=false")
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
        raise SystemExit(2)
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
