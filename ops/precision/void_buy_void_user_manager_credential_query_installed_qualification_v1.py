#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import stat
import subprocess
import types
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]

INSTALLER_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_user_manager_credential_query_protected_install_v1.py"
)
INSTALLER_SOURCE_GIT_BLOB_SHA1 = "e497ee1239865888303db56d0ff0ffeceb583516"

V6_QUALIFIER_SOURCE = (
    ROOT / "ops/precision/void_buy_void_user_manager_query_live_qualification_v6.py"
)
V6_QUALIFIER_SOURCE_GIT_BLOB_SHA1 = "83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc"

MARKER = "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V1"
NATIVE_MARKER = "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V1_GREEN"

RUNTIME_UID = 1000
RUNTIME_UNIT = "void-node-live.service"
E2_CREDENTIAL_ID = "buy-void-epoch2-fulfiller-v1"
E2_DROPIN_BASENAME = "97-buy-void-epoch2-fulfiller-credential-v1.conf"
MAX_NATIVE_OUTPUT_BYTES = 64 * 1024
QUERY_TIMEOUT_SECONDS = 10

LOCK_ID = (
    "voidbuyumqcredelflock1_"
    "65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c"
)

EXACT_KEYS = (
    "runtime_uid",
    "unit",
    "manager_pid",
    "manager_start_ticks",
    "private_socket_peer_authenticated",
    "same_retained_private_connection",
    "public_user_bus_used",
    "LoadState",
    "ActiveState",
    "SubState",
    "MainPID",
    "service_start_ticks",
    "NeedDaemonReload",
    "FragmentPath",
    "DropInPathCount",
    "CredentialDropInMatchCount",
    "DropInPathsCanonicalBytes",
    "DropInPath",
    "LoadCredentialCount",
    "LoadCredentialId",
    "LoadCredentialSource",
    "credential_contents_read",
    "service_pidfd_retained",
    "manager_pidfd_retained",
    "manager_generation_reverified",
    "service_generation_reverified",
    "credential_properties_requeried_same_connection",
    "host_mutation",
    "service_mutation",
    "payment_acceptance",
    "public_presale_activation",
    "funds_movement",
)

TRUE_KEYS = frozenset(
    {
        "private_socket_peer_authenticated",
        "same_retained_private_connection",
        "service_pidfd_retained",
        "manager_pidfd_retained",
        "manager_generation_reverified",
        "service_generation_reverified",
        "credential_properties_requeried_same_connection",
    }
)
FALSE_KEYS = frozenset(
    {
        "public_user_bus_used",
        "credential_contents_read",
        "host_mutation",
        "service_mutation",
        "payment_acceptance",
        "public_presale_activation",
        "funds_movement",
    }
)
INTEGER_KEYS = (
    "runtime_uid",
    "manager_pid",
    "manager_start_ticks",
    "MainPID",
    "service_start_ticks",
    "DropInPathCount",
    "CredentialDropInMatchCount",
    "DropInPathsCanonicalBytes",
    "LoadCredentialCount",
)


class QualificationError(RuntimeError):
    pass


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _direct_source_bytes(path: pathlib.Path) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise QualificationError("dependency_source_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
    ):
        raise QualificationError("dependency_source_not_direct_single_link")
    raw = path.read_bytes()
    after = path.lstat()
    if (
        before.st_dev != after.st_dev
        or before.st_ino != after.st_ino
        or before.st_mode != after.st_mode
        or before.st_uid != after.st_uid
        or before.st_gid != after.st_gid
        or before.st_nlink != after.st_nlink
        or before.st_size != after.st_size
        or before.st_mtime_ns != after.st_mtime_ns
        or before.st_ctime_ns != after.st_ctime_ns
    ):
        raise QualificationError("dependency_source_changed")
    return raw


def _module_from_source(name: str, raw: bytes, source_path: pathlib.Path):
    module = types.ModuleType(name)
    module.__file__ = str(source_path)
    module.__package__ = ""
    code = compile(raw, str(source_path), "exec", dont_inherit=True)
    exec(code, module.__dict__)
    return module


def _load_dependencies():
    installer_raw = _direct_source_bytes(INSTALLER_SOURCE)
    if git_blob_sha1(installer_raw) != INSTALLER_SOURCE_GIT_BLOB_SHA1:
        raise QualificationError("installer_source_blob_mismatch")
    installer = _module_from_source(
        "void_buy_void_user_manager_credential_query_protected_install_v1",
        installer_raw,
        INSTALLER_SOURCE,
    )
    lock = installer.accepted_lock()
    if lock.get("lock_id") != LOCK_ID:
        raise QualificationError("credential_lock_id_mismatch")

    v6_raw = _direct_source_bytes(V6_QUALIFIER_SOURCE)
    if git_blob_sha1(v6_raw) != V6_QUALIFIER_SOURCE_GIT_BLOB_SHA1:
        raise QualificationError("v6_qualifier_source_blob_mismatch")
    v6 = _module_from_source(
        "void_buy_void_user_manager_query_live_qualification_v6",
        v6_raw,
        V6_QUALIFIER_SOURCE,
    )
    return installer, v6


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_mode == b.st_mode
        and a.st_nlink == b.st_nlink
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
    )


def _installed_file_snapshot(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
) -> dict[str, Any]:
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise QualificationError("installed_file_unavailable:" + path.name) from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_uid != 0
        or visible_before.st_gid != 0
        or stat.S_IMODE(visible_before.st_mode) != 0o555
        or visible_before.st_nlink != 1
        or visible_before.st_size != expected_bytes
    ):
        raise QualificationError("installed_file_metadata_invalid:" + path.name)

    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(visible_before, opened_before):
            raise QualificationError("installed_file_rebound:" + path.name)
        digest = hashlib.sha256()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise QualificationError("installed_file_short_read:" + path.name)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise QualificationError("installed_file_grew:" + path.name)
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise QualificationError("installed_file_changed:" + path.name)
    finally:
        os.close(fd)

    if digest.hexdigest() != expected_sha256:
        raise QualificationError("installed_file_sha256_mismatch:" + path.name)

    return {
        "dev": visible_after.st_dev,
        "ino": visible_after.st_ino,
        "uid": visible_after.st_uid,
        "gid": visible_after.st_gid,
        "mode": format(stat.S_IMODE(visible_after.st_mode), "04o"),
        "nlink": visible_after.st_nlink,
        "size": visible_after.st_size,
        "mtime_ns": visible_after.st_mtime_ns,
        "ctime_ns": visible_after.st_ctime_ns,
        "sha256": "sha256:" + expected_sha256,
    }


def installed_pair_snapshot(installer: Any) -> dict[str, Any]:
    try:
        state = installer.protected_state()
    except Exception as exc:
        raise QualificationError("credential_installed_pair_invalid") from exc
    if state != installer.GREEN_STATE:
        raise QualificationError("credential_installed_pair_not_green")

    return {
        "install_root": str(installer.INSTALL_ROOT),
        "protected_state": state,
        "preexec": _installed_file_snapshot(
            installer.PREEXEC_TARGET,
            expected_bytes=installer.PREEXEC_BYTES,
            expected_sha256=installer.PREEXEC_SHA256,
        ),
        "query": _installed_file_snapshot(
            installer.QUERY_TARGET,
            expected_bytes=installer.QUERY_BYTES,
            expected_sha256=installer.QUERY_SHA256,
        ),
    }


def _positive_integer(raw: str, key: str, *, allow_zero: bool = False) -> int:
    if not raw or not raw.isascii() or not raw.isdigit():
        raise QualificationError("native_integer_invalid:" + key)
    if len(raw) > 1 and raw.startswith("0"):
        raise QualificationError("native_integer_invalid:" + key)
    value = int(raw)
    if (value < 0 if allow_zero else value <= 0) or value > 0x7FFF_FFFF_FFFF_FFFF:
        raise QualificationError("native_integer_invalid:" + key)
    return value


def _canonical_absolute_path(raw: str, key: str) -> str:
    if (
        not raw
        or not raw.startswith("/")
        or len(raw) < 2
        or len(raw) >= 4096
        or "\n" in raw
        or "\r" in raw
        or "//" in raw
    ):
        raise QualificationError("native_path_invalid:" + key)
    parts = raw[1:].split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise QualificationError("native_path_invalid:" + key)
    return raw


def parse_native_output(text: str) -> dict[str, str]:
    encoded = text.encode("utf-8")
    if (
        len(encoded) < 2
        or len(encoded) > MAX_NATIVE_OUTPUT_BYTES
        or "\x00" in text
    ):
        raise QualificationError("native_output_invalid")
    lines = text.split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    if not lines or lines.pop(0) != NATIVE_MARKER:
        raise QualificationError("native_marker_invalid")

    out: dict[str, str] = {}
    allowed = set(EXACT_KEYS)
    for line in lines:
        at = line.find("=")
        if at <= 0:
            raise QualificationError("native_output_invalid")
        key = line[:at]
        value = line[at + 1 :]
        if key not in allowed or key in out:
            raise QualificationError("native_output_shape_invalid")
        out[key] = value
    if set(out) != allowed or len(out) != len(EXACT_KEYS):
        raise QualificationError("native_output_shape_invalid")

    for key in TRUE_KEYS:
        if out[key] != "true":
            raise QualificationError("native_truth_invalid:" + key)
    for key in FALSE_KEYS:
        if out[key] != "false":
            raise QualificationError("native_non_authority_invalid:" + key)

    for key in INTEGER_KEYS:
        _positive_integer(out[key], key)

    if int(out["runtime_uid"]) != RUNTIME_UID:
        raise QualificationError("runtime_uid_mismatch")
    if out["unit"] != RUNTIME_UNIT:
        raise QualificationError("runtime_unit_mismatch")
    if (
        out["LoadState"] != "loaded"
        or out["ActiveState"] != "active"
        or out["SubState"] != "running"
    ):
        raise QualificationError("runtime_service_state_invalid")
    if out["NeedDaemonReload"] != "no":
        raise QualificationError("runtime_need_daemon_reload")
    if int(out["DropInPathCount"]) > 32:
        raise QualificationError("dropin_count_unbounded")
    if int(out["CredentialDropInMatchCount"]) != 1:
        raise QualificationError("credential_dropin_match_count_invalid")
    if int(out["DropInPathsCanonicalBytes"]) > 16 * 1024:
        raise QualificationError("dropin_bytes_unbounded")
    if int(out["LoadCredentialCount"]) != 1:
        raise QualificationError("load_credential_count_invalid")
    if out["LoadCredentialId"] != E2_CREDENTIAL_ID:
        raise QualificationError("load_credential_id_invalid")

    fragment = _canonical_absolute_path(out["FragmentPath"], "FragmentPath")
    dropin = _canonical_absolute_path(out["DropInPath"], "DropInPath")
    source = _canonical_absolute_path(
        out["LoadCredentialSource"],
        "LoadCredentialSource",
    )
    if pathlib.PurePosixPath(dropin).name != E2_DROPIN_BASENAME:
        raise QualificationError("credential_dropin_basename_invalid")
    if fragment == dropin or source == dropin:
        raise QualificationError("credential_path_relation_invalid")

    return out


def run_credential_query(installer: Any) -> tuple[dict[str, str], str]:
    if os.geteuid() != 0:
        raise QualificationError("root_required_for_live_query")
    env = {"PATH": "/usr/bin:/bin", "LANG": "C", "LC_ALL": "C"}
    try:
        completed = subprocess.run(
            [
                str(installer.PREEXEC_TARGET),
                "--uid",
                str(RUNTIME_UID),
                "--unit",
                RUNTIME_UNIT,
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
            env=env,
            cwd="/",
            timeout=QUERY_TIMEOUT_SECONDS,
            check=False,
            close_fds=True,
        )
    except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
        raise QualificationError("credential_query_execution_failed") from exc

    if completed.returncode != 0:
        raise QualificationError(
            "credential_query_nonzero_exit:" + str(completed.returncode)
        )
    if completed.stderr != "":
        raise QualificationError("credential_query_unexpected_stderr")
    parsed = parse_native_output(completed.stdout)
    return parsed, "sha256:" + sha256(completed.stdout.encode("utf-8"))


def _credential_identity(native: dict[str, str]) -> dict[str, Any]:
    return {
        "runtime_uid": int(native["runtime_uid"]),
        "manager_pid": int(native["manager_pid"]),
        "manager_start_ticks": native["manager_start_ticks"],
        "main_pid": int(native["MainPID"]),
        "service_start_ticks": native["service_start_ticks"],
        "fragment_path": native["FragmentPath"],
        "dropin_path_count": int(native["DropInPathCount"]),
        "credential_dropin_path": native["DropInPath"],
        "credential_source": native["LoadCredentialSource"],
    }


def _require_security_composition(
    credential: dict[str, str],
    security: dict[str, Any],
) -> None:
    checks = (
        (int(credential["runtime_uid"]), security["runtime_uid"], "runtime_uid"),
        (int(credential["manager_pid"]), security["manager_pid"], "manager_pid"),
        (
            credential["manager_start_ticks"],
            security["manager_start_ticks"],
            "manager_start_ticks",
        ),
        (int(credential["MainPID"]), security["main_pid"], "main_pid"),
        (
            credential["service_start_ticks"],
            security["service_start_ticks"],
            "service_start_ticks",
        ),
    )
    for left, right, key in checks:
        if left != right:
            raise QualificationError("v6_security_generation_mismatch:" + key)

    for key in (
        "protected_v6_generation_verified",
        "installed_generation_stable",
        "authenticated_private_manager_peer",
        "same_authenticated_connection_unit_query",
        "runtime_main_pid_kernel_bound",
        "private_users_false_verified",
        "kernel_active_capabilities_zero_verified",
        "cap_last_cap_projection_contract_verified",
        "kernel_cap_last_cap_stable",
        "configured_kernel_bounding_set_equal_verified",
        "double_authenticated_query_stable",
    ):
        if security.get(key) is not True:
            raise QualificationError("v6_security_evidence_not_green:" + key)
    if security.get("production_host_evidence_authority") is not False:
        raise QualificationError("v6_security_authority_invalid")


def collect() -> dict[str, Any]:
    if os.geteuid() != 0:
        raise QualificationError("root_required_for_live_query")

    installer, v6 = _load_dependencies()

    before = installed_pair_snapshot(installer)
    first, first_sha = run_credential_query(installer)
    middle_before_security = installed_pair_snapshot(installer)

    security = v6.collect()

    middle_after_security = installed_pair_snapshot(installer)
    second, second_sha = run_credential_query(installer)
    after = installed_pair_snapshot(installer)

    if not (
        before
        == middle_before_security
        == middle_after_security
        == after
    ):
        raise QualificationError("credential_installed_generation_changed")

    if first != second:
        raise QualificationError("credential_native_evidence_changed")
    if _credential_identity(first) != _credential_identity(second):
        raise QualificationError("credential_runtime_generation_changed")

    _require_security_composition(first, security)
    _require_security_composition(second, security)

    identity = _credential_identity(first)
    return {
        "marker": MARKER,
        "version": 1,
        "read_only": True,
        "root_execution_required": True,
        "credential_lock_id": LOCK_ID,
        "credential_installed_pair_verified": True,
        "credential_installed_generation_stable": True,
        "credential_query_preexec_path_verified": True,
        "double_credential_query_stable": True,
        "credential_metadata_same_generation_as_v6_security": True,
        "v6_security_qualification_composed": True,
        "credential_contents_read": False,
        "native_output_sha256_first": first_sha,
        "native_output_sha256_second": second_sha,
        **identity,
        "dropin_paths_canonical_bytes": int(first["DropInPathsCanonicalBytes"]),
        "load_credential_count": int(first["LoadCredentialCount"]),
        "load_credential_id": first["LoadCredentialId"],
        "v6_kernel_cap_last_cap": security["kernel_cap_last_cap"],
        "v6_kernel_supported_capability_mask":
            security["kernel_supported_capability_mask"],
        "v6_capability_bounding_set": security["capability_bounding_set"],
        "v6_kernel_cap_bnd": security["kernel_cap_bnd"],
        "query_execution": True,
        "host_mutation": False,
        "filesystem_write": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "external_network_calls": False,
        "private_key_access": False,
        "wallet_or_signer_access": False,
        "request_or_payment_contents_read": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "transaction": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
        "next_action":
            "BIND_AUTHENTICATED_CREDENTIAL_METADATA_IN_EPOCH2_ATTESTATION_SUCCESSOR",
    }


def synthetic_native_output() -> str:
    values = {
        "runtime_uid": "1000",
        "unit": RUNTIME_UNIT,
        "manager_pid": "2693",
        "manager_start_ticks": "1409",
        "private_socket_peer_authenticated": "true",
        "same_retained_private_connection": "true",
        "public_user_bus_used": "false",
        "LoadState": "loaded",
        "ActiveState": "active",
        "SubState": "running",
        "MainPID": "4053759",
        "service_start_ticks": "20191741",
        "NeedDaemonReload": "no",
        "FragmentPath": "/usr/lib/systemd/user/void-node-live.service",
        "DropInPathCount": "2",
        "CredentialDropInMatchCount": "1",
        "DropInPathsCanonicalBytes": "211",
        "DropInPath": (
            "/home/zoso/.config/systemd/user/void-node-live.service.d/"
            + E2_DROPIN_BASENAME
        ),
        "LoadCredentialCount": "1",
        "LoadCredentialId": E2_CREDENTIAL_ID,
        "LoadCredentialSource": "/home/zoso/.local/share/void-epoch2/credential",
        "credential_contents_read": "false",
        "service_pidfd_retained": "true",
        "manager_pidfd_retained": "true",
        "manager_generation_reverified": "true",
        "service_generation_reverified": "true",
        "credential_properties_requeried_same_connection": "true",
        "host_mutation": "false",
        "service_mutation": "false",
        "payment_acceptance": "false",
        "public_presale_activation": "false",
        "funds_movement": "false",
    }
    return NATIVE_MARKER + "\n" + "".join(
        key + "=" + values[key] + "\n" for key in EXACT_KEYS
    )


def self_test() -> None:
    installer, _v6 = _load_dependencies()
    assert installer.LOCK_ID == LOCK_ID
    parsed = parse_native_output(synthetic_native_output())
    assert parsed["credential_contents_read"] == "false"
    assert parsed["LoadCredentialId"] == E2_CREDENTIAL_ID

    adversaries = (
        ("CredentialDropInMatchCount=1", "CredentialDropInMatchCount=2"),
        ("LoadCredentialCount=1", "LoadCredentialCount=2"),
        ("NeedDaemonReload=no", "NeedDaemonReload=yes"),
        (
            "LoadCredentialId=" + E2_CREDENTIAL_ID,
            "LoadCredentialId=wrong",
        ),
        ("credential_contents_read=false", "credential_contents_read=true"),
        (
            "private_socket_peer_authenticated=true",
            "private_socket_peer_authenticated=false",
        ),
    )
    for old, new in adversaries:
        bad = synthetic_native_output().replace(old, new)
        try:
            parse_native_output(bad)
        except QualificationError:
            pass
        else:
            raise AssertionError("native adversary accepted:" + old)


def plan() -> None:
    installer, v6 = _load_dependencies()
    replacement = v6._load_replacement()

    print(MARKER)
    print("mode=plan")
    print("root_required_for_run=true")
    print("credential_install_root=" + str(installer.INSTALL_ROOT))
    print("credential_preexec=" + str(installer.PREEXEC_TARGET))
    print("credential_query=" + str(installer.QUERY_TARGET))
    print("credential_lock_id=" + LOCK_ID)
    print("credential_installed_pair_verification_required=true")
    print("credential_installed_generation_stability_required=true")
    print("double_credential_query_required=true")
    print("v6_security_qualification_required=true")
    print("v6_protected_query=" + str(replacement.QUERY_TARGET))
    print("same_manager_mainpid_generation_composition_required=true")
    print("credential_contents_read=false")
    print("query_execution=false")
    print("host_mutation=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("external_network_calls=false")
    print("private_key_access=false")
    print("wallet_or_signer_access=false")
    print("request_or_payment_contents_read=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("transaction=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_action=SEPARATELY_AUTHORIZE_CREDENTIAL_QUERY_READ_ONLY_QUALIFICATION")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--run", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        print(MARKER + "_SELF_TEST_GREEN")
        return 0
    if args.plan:
        plan()
        return 0

    result = collect()
    print(MARKER)
    for key in (
        "read_only",
        "root_execution_required",
        "credential_lock_id",
        "credential_installed_pair_verified",
        "credential_installed_generation_stable",
        "credential_query_preexec_path_verified",
        "double_credential_query_stable",
        "credential_metadata_same_generation_as_v6_security",
        "v6_security_qualification_composed",
        "credential_contents_read",
        "manager_pid",
        "manager_start_ticks",
        "main_pid",
        "service_start_ticks",
        "fragment_path",
        "dropin_path_count",
        "credential_dropin_path",
        "credential_source",
        "dropin_paths_canonical_bytes",
        "load_credential_count",
        "load_credential_id",
        "v6_kernel_cap_last_cap",
        "v6_kernel_supported_capability_mask",
        "v6_capability_bounding_set",
        "v6_kernel_cap_bnd",
        "query_execution",
        "host_mutation",
        "filesystem_write",
        "service_mutation",
        "systemd_mutation",
        "external_network_calls",
        "private_key_access",
        "wallet_or_signer_access",
        "request_or_payment_contents_read",
        "payment_acceptance",
        "public_presale_activation",
        "transaction",
        "funds_movement",
        "production_host_evidence_authority",
        "next_action",
    ):
        value = result[key]
        print(f"{key}={str(value).lower() if isinstance(value, bool) else value}")

    print(
        "result_json="
        + json.dumps(result, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except QualificationError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("query_execution_state=unknown_or_partial")
        print("credential_contents_read=false")
        print("host_mutation=false")
        print("filesystem_write=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("transaction=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)
