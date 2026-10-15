#!/usr/bin/env python3
from __future__ import annotations

import grp
import os
from pathlib import Path
import pwd
import socket
import stat
import subprocess
from typing import Any

from apollyon_training_materials_install_contract_v1 import (
    ACCOUNT,
    BUILD_ENV,
    ENTRYPOINT_TARGET,
    EXPECTED_COMPILER,
    EXPECTED_ENTRYPOINT_BYTES,
    EXPECTED_ENTRYPOINT_SHA256,
    EXPECTED_PREENTRY_BYTES,
    EXPECTED_PREENTRY_SHA256,
    EXPECTED_SYSTEMD_MAJOR,
    HOME,
    INPUT_DIR,
    MARKER,
    OUTPUT_DIR,
    PLAN_PREFIX,
    PREENTRY_TARGET,
    TARGET_HOST,
    UNIT_NAME,
    UNIT_TARGET,
    Hold,
    bounded_regular_bytes,
    canonical,
    sha256,
    verify_repository_contract,
)

def run_command(argv: list[str], *, timeout: int = 30, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            argv,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=timeout,
            env=env,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Hold("command_execution_failed:" + argv[0]) from exc


def compiler_identity() -> dict[str, str]:
    requested = Path(EXPECTED_COMPILER["requested_path"])
    if not requested.is_file():
        raise Hold("compiler_missing")
    real = Path(os.path.realpath(requested))
    version = run_command([os.fspath(requested), "--version"], env=BUILD_ENV)
    machine = run_command([os.fspath(requested), "-dumpmachine"], env=BUILD_ENV)
    dumpversion = run_command(
        [os.fspath(requested), "-dumpfullversion", "-dumpversion"], env=BUILD_ENV
    )
    if any(result.returncode != 0 for result in (version, machine, dumpversion)):
        raise Hold("compiler_identity_command_failed")
    first = version.stdout.splitlines()
    observed = {
        "requested_path": os.fspath(requested),
        "realpath": os.fspath(real),
        "version_line": first[0] if first else "",
        "dumpmachine": machine.stdout.strip(),
        "dumpversion": dumpversion.stdout.strip(),
    }
    if observed != EXPECTED_COMPILER:
        raise Hold("compiler_identity_mismatch")
    return observed


def systemd_major() -> int:
    result = run_command(["/usr/bin/systemctl", "--version"], timeout=10)
    if result.returncode != 0 or not result.stdout.splitlines():
        raise Hold("systemd_version_unavailable")
    fields = result.stdout.splitlines()[0].split()
    if len(fields) < 2 or fields[0] != "systemd" or not fields[1].isdigit():
        raise Hold("systemd_version_invalid")
    major = int(fields[1])
    if major != EXPECTED_SYSTEMD_MAJOR:
        raise Hold("systemd_major_mismatch")
    return major


def require_trusted_ancestor(path: Path) -> None:
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise Hold("trusted_ancestor_unreadable:" + os.fspath(path)) from exc
    if (
        not stat.S_ISDIR(metadata.st_mode)
        or stat.S_ISLNK(metadata.st_mode)
        or metadata.st_uid != 0
        or metadata.st_gid != 0
        or stat.S_IMODE(metadata.st_mode) & 0o022
    ):
        raise Hold("trusted_ancestor_invalid:" + os.fspath(path))


def account_state() -> dict[str, Any]:
    try:
        user = pwd.getpwnam(ACCOUNT)
    except KeyError:
        user = None
    try:
        group = grp.getgrnam(ACCOUNT)
    except KeyError:
        group = None
    if user is None and group is None:
        return {"state": "absent", "action": "create_system_user_group"}
    if user is None or group is None:
        raise Hold("dedicated_account_partial_state")
    if (
        user.pw_uid == 0
        or user.pw_gid != group.gr_gid
        or user.pw_dir != os.fspath(HOME)
        or user.pw_shell != "/usr/sbin/nologin"
        or user.pw_uid >= 1000
        or group.gr_gid >= 1000
    ):
        raise Hold("dedicated_account_identity_invalid")
    return {
        "state": "exact",
        "action": "preserve",
        "uid": user.pw_uid,
        "gid": group.gr_gid,
        "home": user.pw_dir,
        "shell": user.pw_shell,
    }


def expected_file_state(
    path: Path,
    *,
    mode: int,
    expected_bytes: int,
    expected_sha256: str,
) -> dict[str, Any]:
    try:
        metadata = path.lstat()
    except FileNotFoundError:
        return {"state": "absent", "action": "create"}
    except OSError as exc:
        raise Hold("installed_file_observation_failed:" + os.fspath(path)) from exc
    if (
        not stat.S_ISREG(metadata.st_mode)
        or stat.S_ISLNK(metadata.st_mode)
        or metadata.st_uid != 0
        or metadata.st_gid != 0
        or metadata.st_nlink != 1
        or stat.S_IMODE(metadata.st_mode) != mode
        or metadata.st_size != expected_bytes
    ):
        raise Hold("installed_file_metadata_drift:" + os.fspath(path))
    data = bounded_regular_bytes(path, expected_bytes, "installed_file")
    if sha256(data) != expected_sha256:
        raise Hold("installed_file_content_drift:" + os.fspath(path))
    return {
        "state": "exact",
        "action": "preserve",
        "bytes": expected_bytes,
        "sha256": expected_sha256,
        "mode": f"{mode:04o}",
    }


def expected_unit_state(unit_bytes: bytes) -> dict[str, Any]:
    return expected_file_state(
        UNIT_TARGET,
        mode=0o644,
        expected_bytes=len(unit_bytes),
        expected_sha256=sha256(unit_bytes),
    )


def systemd_unit_state() -> dict[str, str]:
    result = run_command(
        [
            "/usr/bin/systemctl",
            "show",
            UNIT_NAME,
            "--property=LoadState,ActiveState,SubState,UnitFileState,MainPID",
            "--no-pager",
        ],
        timeout=10,
    )
    if result.returncode != 0:
        raise Hold("systemd_unit_state_unavailable")
    values: dict[str, str] = {}
    for line in result.stdout.splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value
    required = {"LoadState", "ActiveState", "SubState", "UnitFileState", "MainPID"}
    if set(values) != required:
        raise Hold("systemd_unit_state_schema_invalid")
    if (
        values["ActiveState"] != "inactive"
        or values["SubState"] != "dead"
        or values["MainPID"] != "0"
        or values["UnitFileState"]
        in {"enabled", "enabled-runtime", "linked", "linked-runtime"}
    ):
        raise Hold("training_service_not_inert")
    return values


def directory_plan(account: dict[str, Any]) -> list[dict[str, Any]]:
    uid = account.get("uid")
    gid = account.get("gid")
    specifications: list[tuple[Path, int, int | None, int | None]] = [
        (PREENTRY_TARGET.parent, 0o755, 0, 0),
        (ENTRYPOINT_TARGET.parent, 0o755, 0, 0),
        (HOME, 0o755, 0, 0),
        (INPUT_DIR, 0o755, 0, 0),
        (OUTPUT_DIR, 0o700, uid, gid),
    ]
    result: list[dict[str, Any]] = []
    for path, mode, expected_uid, expected_gid in specifications:
        try:
            metadata = path.lstat()
        except FileNotFoundError:
            result.append(
                {
                    "path": os.fspath(path),
                    "state": "absent",
                    "action": "create",
                    "mode": f"{mode:04o}",
                    "owner": "root:root" if expected_uid == 0 else ACCOUNT + ":" + ACCOUNT,
                }
            )
            continue
        except OSError as exc:
            raise Hold("directory_observation_failed:" + os.fspath(path)) from exc
        if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISDIR(metadata.st_mode):
            raise Hold("directory_type_invalid:" + os.fspath(path))
        if expected_uid is None or expected_gid is None:
            raise Hold("output_directory_exists_before_account")
        if (
            metadata.st_uid != expected_uid
            or metadata.st_gid != expected_gid
            or stat.S_IMODE(metadata.st_mode) != mode
        ):
            raise Hold("directory_metadata_drift:" + os.fspath(path))
        result.append(
            {
                "path": os.fspath(path),
                "state": "exact",
                "action": "preserve",
                "mode": f"{mode:04o}",
                "owner_uid": expected_uid,
                "owner_gid": expected_gid,
            }
        )
    return result


def build_plan() -> dict[str, Any]:
    materials = verify_repository_contract()
    if socket.gethostname().casefold() != TARGET_HOST.casefold():
        raise Hold("wrong_designated_host")
    for ancestor in (
        Path("/"),
        Path("/etc"),
        Path("/etc/systemd"),
        Path("/etc/systemd/system"),
        Path("/opt"),
        Path("/var"),
        Path("/var/lib"),
        Path("/usr"),
        Path("/usr/bin"),
        Path("/usr/sbin"),
    ):
        require_trusted_ancestor(ancestor)
    compiler = compiler_identity()
    systemd = systemd_major()
    account = account_state()
    directories = directory_plan(account)
    files = {
        "unit": expected_unit_state(materials["unit"]),
        "preentry": expected_file_state(
            PREENTRY_TARGET,
            mode=0o755,
            expected_bytes=EXPECTED_PREENTRY_BYTES,
            expected_sha256=EXPECTED_PREENTRY_SHA256,
        ),
        "entrypoint": expected_file_state(
            ENTRYPOINT_TARGET,
            mode=0o755,
            expected_bytes=EXPECTED_ENTRYPOINT_BYTES,
            expected_sha256=EXPECTED_ENTRYPOINT_SHA256,
        ),
    }
    service = systemd_unit_state()
    material = {
        "marker": MARKER,
        "version": 1,
        "mode": "plan",
        "target_host": TARGET_HOST,
        "observed_hostname": socket.gethostname(),
        "source_contract_verified": True,
        "compiler": compiler,
        "systemd_major": systemd,
        "account": account,
        "directories": directories,
        "files": files,
        "service": service,
        "authority": {
            "create_only_install": True,
            "daemon_reload": False,
            "service_enable": False,
            "service_start": False,
            "service_restart": False,
            "attempt_claim": False,
            "training_execution": False,
            "candidate_weight_mutation": False,
            "credential_access": False,
            "wallet_or_signer_access": False,
            "transaction": False,
            "funds_movement": False,
        },
    }
    return {**material, "plan_id": PLAN_PREFIX + sha256(canonical(material).encode("utf-8"))}



