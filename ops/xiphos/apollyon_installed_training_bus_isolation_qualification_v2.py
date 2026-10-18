#!/usr/bin/env python3
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import socket
import stat
import subprocess
import time
import types
from typing import Any

MARKER = "VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V2"
V1_REL = "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py"
V1_BLOB = "1fdb495aafa136119d50f41410b015930d9fc90d"
LOCK_AWARE_LAUNCHER_REL = "ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py"
LOCK_AWARE_LAUNCHER_BLOB = "2496644ecc13b425c0885d9e38887d845a5824ef"
FIXED_LIVE_LAUNCHER_PATH = Path(
    "/opt/void-apollyon-live-custody-binding-v2-preentry-v1/"
    "apollyon_live_custody_source_session_launcher_v2.py"
)
TRAINING_LIFECYCLE_LOCK_PATH = (
    FIXED_LIVE_LAUNCHER_PATH.parent / ".void-apollyon-training-lifecycle-lock-v1"
)
ROOT = Path(__file__).resolve().parents[2]
MAX_SOURCE_BYTES = 512 * 1024
REVIEWED_SYSTEMD_UNIT_ROOTS = (
    "/etc/systemd/system.control",
    "/run/systemd/system.control",
    "/run/systemd/transient",
    "/run/systemd/generator.early",
    "/etc/systemd/system",
    "/etc/systemd/system.attached",
    "/run/systemd/system",
    "/run/systemd/system.attached",
    "/run/systemd/generator",
    "/usr/local/lib/systemd/system",
    "/usr/lib/systemd/system",
    "/run/systemd/generator.late",
)

AUTHORITY = {
    "source_successor_only": True,
    "standalone_live_qualification_requires_explicit_flag": True,
    "standalone_service_start_stop_required": True,
    "stop_command_success_required": True,
    "inactive_dead_mainpid_zero_required": True,
    "observed_process_generation_disappearance_required": True,
    "same_process_composition_receipt_changed": False,
    "service_enable": False,
    "training_execution": False,
    "attempt_claim": False,
    "candidate_weight_mutation": False,
    "credential_access": False,
    "wallet_or_signer_access": False,
    "transaction": False,
    "funds_movement": False,
}


class Hold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise Hold(reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(("blob " + str(len(raw)) + "\0").encode("ascii"))
    h.update(raw)
    return h.hexdigest()


def canonical(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def _stable_source(relative: str) -> bytes:
    path = ROOT / relative
    try:
        before = path.lstat()
    except OSError as exc:
        raise Hold("v1_source_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > MAX_SOURCE_BYTES
    ):
        hold("v1_source_metadata_invalid")
    try:
        raw = path.read_bytes()
        after = path.lstat()
    except OSError as exc:
        raise Hold("v1_source_read_failed") from exc
    for field in (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
        "st_size", "st_mtime_ns", "st_ctime_ns",
    ):
        if getattr(before, field) != getattr(after, field):
            hold("v1_source_generation_changed")
    if len(raw) != before.st_size or git_blob(raw) != V1_BLOB:
        hold("v1_source_identity_mismatch")
    return raw


def _load_v1() -> types.ModuleType:
    raw = _stable_source(V1_REL)
    module = types.ModuleType("void_apollyon_training_isolation_v1_verified")
    module.__file__ = os.fspath(ROOT / V1_REL)
    module.__package__ = None
    try:
        exec(
            compile(
                raw.decode("utf-8", "strict"),
                V1_REL,
                "exec",
                dont_inherit=True,
                optimize=0,
            ),
            module.__dict__,
        )
    except Exception as exc:
        raise Hold("v1_verified_execution_failed") from exc
    if (
        getattr(module, "MARKER", "")
        != "VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V1"
    ):
        hold("v1_marker_mismatch")
    return module


_V1_CACHE: types.ModuleType | None = None


def _v1() -> types.ModuleType:
    global _V1_CACHE
    if _V1_CACHE is None:
        _V1_CACHE = _load_v1()
    return _V1_CACHE


def _verify_lock_aware_live_launcher_installed(
    path: Path = FIXED_LIVE_LAUNCHER_PATH,
    *,
    expected_blob: str = LOCK_AWARE_LAUNCHER_BLOB,
    expected_uid: int = 0,
    expected_gid: int = 0,
    expected_mode: int = 0o444,
) -> dict[str, object]:
    try:
        before = path.lstat()
    except OSError as exc:
        raise Hold("lock_aware_live_launcher_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != expected_uid
        or before.st_gid != expected_gid
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_size < 1
        or before.st_size > MAX_SOURCE_BYTES
    ):
        hold("lock_aware_live_launcher_metadata_invalid")
    flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(path, flags)
    except OSError as exc:
        raise Hold("lock_aware_live_launcher_open_failed") from exc
    try:
        opened = os.fstat(fd)
        if any(
            getattr(before, field) != getattr(opened, field)
            for field in (
                "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
                "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
            )
        ):
            hold("lock_aware_live_launcher_open_drift")
        raw = os.pread(fd, before.st_size, 0)
        after = os.fstat(fd)
        try:
            visible = path.lstat()
        except OSError as exc:
            raise Hold(
                "lock_aware_live_launcher_revalidation_failed"
            ) from exc
        for field in (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
            "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
        ):
            if (
                getattr(opened, field) != getattr(after, field)
                or getattr(after, field) != getattr(visible, field)
            ):
                hold("lock_aware_live_launcher_generation_drift")
        if len(raw) != before.st_size or git_blob(raw) != expected_blob:
            hold("lock_aware_live_launcher_identity_mismatch")
    finally:
        os.close(fd)
    return {
        "path": os.fspath(path),
        "git_blob_sha1": expected_blob,
        "root_owned": expected_uid == 0 and expected_gid == 0,
        "mode": format(expected_mode, "04o"),
        "single_link": True,
    }


def _reason(exc: BaseException) -> str:
    value = str(exc).replace("\n", "_").replace("\r", "_")
    return value[:160] if value else type(exc).__name__


def _run_systemctl(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    v1 = _v1()
    try:
        return v1.run_systemctl(*args, check=check)
    except (OSError, subprocess.SubprocessError, v1.Hold) as exc:
        raise Hold(
            "systemctl_execution_failed:" + (args[0] if args else "unknown")
        ) from exc


def _systemd_properties(
    unit: str, names: tuple[str, ...]
) -> dict[str, str]:
    argv: list[str] = ["show", unit, "--no-pager"]
    for name in names:
        argv.extend(("-p", name))
    result = _run_systemctl(*argv)
    values: dict[str, str] = {}
    for line in result.stdout.splitlines():
        key, separator, value = line.partition("=")
        if separator != "=" or key not in names or key in values:
            hold("effective_unit_property_snapshot_invalid")
        values[key] = value
    if set(values) != set(names):
        hold("effective_unit_property_snapshot_incomplete")
    return values


def _manager_value(property_name: str) -> str:
    result = _run_systemctl(
        "show", "--property=" + property_name, "--value"
    )
    return result.stdout.strip()


def _parse_exec_property(raw: str) -> list[list[str]]:
    value = str(raw).strip()
    if not value:
        return []
    bodies: list[str] = []
    depth = 0
    start: int | None = None
    for index, char in enumerate(value):
        if char == "{":
            if depth == 0:
                start = index + 1
            depth += 1
        elif char == "}":
            if depth == 0:
                hold("effective_unit_exec_shape_invalid")
            depth -= 1
            if depth == 0:
                if start is None:
                    hold("effective_unit_exec_shape_invalid")
                bodies.append(value[start:index])
                start = None
        elif depth == 0 and not char.isspace():
            hold("effective_unit_exec_shape_invalid")
    if depth != 0 or start is not None or not bodies:
        hold("effective_unit_exec_shape_invalid")

    commands: list[list[str]] = []
    for body in bodies:
        fields: dict[str, str] = {}
        for raw_part in body.split(" ; "):
            part = raw_part.strip()
            key, separator, field = part.partition("=")
            key = key.strip()
            field = field.strip()
            if separator != "=" or not key or key in fields:
                hold("effective_unit_exec_field_invalid")
            fields[key] = field
        if (
            not fields.get("path")
            or "argv[]" not in fields
            or fields.get("ignore_errors") != "no"
        ):
            hold("effective_unit_exec_field_invalid")
        argv = fields["argv[]"].split()
        if len(argv) != 1 or argv[0] != fields["path"]:
            hold("effective_unit_exec_argv_invalid")
        commands.append(argv)
    return commands


def _effective_systemd_unit_roots() -> tuple[str, ...]:
    raw = _manager_value("UnitPath")
    tokens = tuple(token for token in raw.split() if token)
    if not tokens:
        hold("effective_unit_path_invalid")
    reviewed = {
        root: index for index, root in enumerate(REVIEWED_SYSTEMD_UNIT_ROOTS)
    }
    indexes: list[int] = []
    seen: set[str] = set()
    for token in tokens:
        if token not in reviewed:
            hold("effective_unit_path_unreviewed")
        if (
            not os.path.isabs(token)
            or os.path.normpath(token) != token
            or token in seen
        ):
            hold("effective_unit_path_invalid")
        seen.add(token)
        indexes.append(reviewed[token])
    if any(
        indexes[index] <= indexes[index - 1]
        for index in range(1, len(indexes))
    ):
        hold("effective_unit_path_precedence_invalid")
    return tokens


def _assert_no_training_dependency_directories(
    roots: tuple[str, ...]
) -> None:
    unit = _v1().UNIT
    for root in roots:
        root_path = Path(root)
        try:
            root_meta = root_path.lstat()
        except FileNotFoundError:
            continue
        except OSError as exc:
            raise Hold("effective_unit_root_observation_failed") from exc
        if (
            not stat.S_ISDIR(root_meta.st_mode)
            or stat.S_ISLNK(root_meta.st_mode)
        ):
            hold("effective_unit_root_invalid")
        for suffix in (".wants", ".requires"):
            directory = root_path / (unit + suffix)
            try:
                metadata = directory.lstat()
            except FileNotFoundError:
                continue
            except OSError as exc:
                raise Hold(
                    "effective_unit_dependency_observation_failed"
                ) from exc
            if (
                not stat.S_ISDIR(metadata.st_mode)
                or stat.S_ISLNK(metadata.st_mode)
            ):
                hold("effective_unit_dependency_directory_invalid")
            try:
                entries = tuple(directory.iterdir())
            except OSError as exc:
                raise Hold(
                    "effective_unit_dependency_observation_failed"
                ) from exc
            if entries:
                hold("effective_unit_unreviewed_dependency_entry")


def _verify_effective_unit_contract() -> dict[str, object]:
    v1 = _v1()
    names = (
        "FragmentPath",
        "DropInPaths",
        "NeedDaemonReload",
        "ExecStart",
    )
    props = _systemd_properties(v1.UNIT, names)
    if props["FragmentPath"] != os.fspath(v1.UNIT_PATH):
        hold("effective_unit_fragment_invalid")
    if props["DropInPaths"] != "":
        hold("effective_unit_dropins_present")
    if props["NeedDaemonReload"] != "no":
        hold("effective_unit_needs_daemon_reload")
    commands = _parse_exec_property(props["ExecStart"])
    expected_exec = os.fspath(v1.PREENTRY_PATH)
    if commands != [[expected_exec]]:
        hold("effective_unit_execstart_invalid")
    roots = _effective_systemd_unit_roots()
    _assert_no_training_dependency_directories(roots)
    return {
        "fragment_path": props["FragmentPath"],
        "drop_in_paths_empty": True,
        "need_daemon_reload": False,
        "exec_start": expected_exec,
        "reviewed_unit_path": list(roots),
        "dependency_directories_empty": True,
    }


def _acquire_training_lifecycle_lock(
    path: Path = TRAINING_LIFECYCLE_LOCK_PATH,
    *,
    expected_uid: int = 0,
    expected_gid: int = 0,
    expected_mode: int = 0o600,
) -> int:
    absolute = Path(os.path.abspath(os.fspath(path)))
    if absolute != path or Path(os.path.realpath(absolute)) != absolute:
        hold("training_service_lifecycle_lock_path_invalid")
    try:
        before = os.lstat(absolute)
    except OSError as exc:
        raise Hold("training_service_lifecycle_lock_open_failed") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != expected_uid
        or before.st_gid != expected_gid
        or before.st_nlink != 1
        or before.st_size != 0
        or stat.S_IMODE(before.st_mode) != expected_mode
    ):
        hold("training_service_lifecycle_lock_inode_invalid")
    flags = os.O_RDONLY
    flags |= getattr(os, "O_CLOEXEC", 0)
    flags |= getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(absolute, flags)
    except OSError as exc:
        raise Hold("training_service_lifecycle_lock_open_failed") from exc
    try:
        opened = os.fstat(fd)
        visible = os.lstat(absolute)
        for field in (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
            "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
        ):
            if (
                getattr(before, field) != getattr(opened, field)
                or getattr(opened, field) != getattr(visible, field)
            ):
                hold("training_service_lifecycle_lock_inode_drift")
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise Hold("training_service_lifecycle_busy") from exc
        except OSError as exc:
            raise Hold("training_service_lifecycle_lock_failed") from exc
        after = os.fstat(fd)
        visible_after = os.lstat(absolute)
        for field in (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
            "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
        ):
            if (
                getattr(opened, field) != getattr(after, field)
                or getattr(after, field) != getattr(visible_after, field)
            ):
                hold("training_service_lifecycle_lock_inode_drift")
        return fd
    except BaseException:
        try:
            os.close(fd)
        except OSError:
            pass
        raise


def _release_training_lifecycle_lock(fd: int) -> None:
    try:
        os.close(fd)
    except OSError as exc:
        raise Hold("training_service_lifecycle_lock_close_failed") from exc


def _service_state() -> dict[str, object]:
    v1 = _v1()
    names = (
        "LoadState",
        "ActiveState",
        "SubState",
        "MainPID",
        "UnitFileState",
    )
    argv: list[str] = ["show", v1.UNIT]
    for name in names:
        argv.extend(("-p", name))
    try:
        result = _run_systemctl(*argv)
    except Hold as exc:
        raise Hold("service_state_observation_failed") from exc

    values: dict[str, str] = {}
    for line in result.stdout.splitlines():
        key, separator, value = line.partition("=")
        if separator != "=" or key not in names or key in values:
            hold("service_state_snapshot_invalid")
        values[key] = value
    if set(values) != set(names):
        hold("service_state_snapshot_incomplete")
    try:
        mainpid = int(values["MainPID"])
    except ValueError as exc:
        raise Hold("service_mainpid_invalid") from exc
    if mainpid < 0:
        hold("service_mainpid_invalid")
    return {
        "load_state": values["LoadState"],
        "active_state": values["ActiveState"],
        "sub_state": values["SubState"],
        "mainpid": mainpid,
        "unit_file_state": values["UnitFileState"],
    }


def _process_generation_present(pid: int, expected_start_ticks: int) -> bool:
    if pid <= 0 or expected_start_ticks <= 0:
        hold("observed_generation_identity_invalid")
    v1 = _v1()
    try:
        current = v1.process_start_time_ticks(pid)
    except (FileNotFoundError, ProcessLookupError):
        return False
    except (OSError, v1.Hold) as exc:
        raise Hold("observed_generation_recheck_failed") from exc
    return current == expected_start_ticks


def _shutdown_state_green(
    state: dict[str, object], generation_present: bool
) -> bool:
    return (
        state.get("load_state") == "loaded"
        and state.get("active_state") == "inactive"
        and state.get("sub_state") == "dead"
        and state.get("mainpid") == 0
        and state.get("unit_file_state") == "static"
        and generation_present is False
    )


def _wait_for_shutdown(
    observed_pid: int | None,
    observed_start_ticks: int | None,
    *,
    timeout_seconds: float = 5.0,
) -> dict[str, object]:
    if timeout_seconds < 0:
        hold("shutdown_timeout_invalid")
    deadline = time.monotonic() + timeout_seconds
    while True:
        state = _service_state()
        generation_present = False
        if observed_pid is not None or observed_start_ticks is not None:
            if observed_pid is None or observed_start_ticks is None:
                hold("observed_generation_identity_incomplete")
            generation_present = _process_generation_present(
                observed_pid, observed_start_ticks
            )
        if _shutdown_state_green(state, generation_present):
            final_state = _service_state()
            final_generation_present = False
            if observed_pid is not None and observed_start_ticks is not None:
                final_generation_present = _process_generation_present(
                    observed_pid, observed_start_ticks
                )
            if (
                final_state == state
                and _shutdown_state_green(
                    final_state, final_generation_present
                )
            ):
                return {
                    **final_state,
                    "observed_process_generation_absent": True,
                    "service_state_snapshot_stable": True,
                }
        if time.monotonic() >= deadline:
            hold("service_shutdown_not_proven")
        time.sleep(0.05)


def _stop_and_verify(
    observed_pid: int | None,
    observed_start_ticks: int | None,
    *,
    timeout_seconds: float = 5.0,
) -> dict[str, object]:
    result = _run_systemctl("stop", _v1().UNIT, check=False)
    if result.returncode != 0:
        hold("service_stop_command_failed")
    shutdown = _wait_for_shutdown(
        observed_pid,
        observed_start_ticks,
        timeout_seconds=timeout_seconds,
    )
    return {
        **shutdown,
        "stop_command_succeeded": True,
        "service_enabled": False,
    }


def _initial_state_required() -> None:
    state = _service_state()
    if not (
        state["load_state"] == "loaded"
        and state["active_state"] in ("inactive", "failed")
        and state["sub_state"] == "dead"
        and state["mainpid"] == 0
        and state["unit_file_state"] == "static"
    ):
        hold("service_not_initially_quiescent_static")


def _wait_for_reviewed_entrypoint() -> int:
    v1 = _v1()
    deadline = time.monotonic() + 5.0
    while time.monotonic() < deadline:
        state = _service_state()
        candidate = int(state["mainpid"])
        if candidate > 0:
            try:
                exe = os.path.realpath(Path(f"/proc/{candidate}/exe"))
            except OSError:
                exe = ""
            if exe == os.fspath(v1.ENTRYPOINT_PATH):
                return candidate
        time.sleep(0.05)
    hold("reviewed_entrypoint_exec_transition_unproven")


def _emit_live_authority() -> None:
    rows = (
        MARKER,
        "mode=live-qualify",
        "host_filesystem_mutation=false",
        "git_mutation=false",
        "git_fetch=false",
        "service_process_action=true",
        "service_start_stop=true",
        "credential_access=false",
        "wallet_or_signer_access=false",
        "transaction_construction=false",
        "transaction_signing=false",
        "transaction_broadcast=false",
        "chain_mutation=false",
        "economic_activation=false",
        "funds_movement=false",
        "authority_receipt_before_service_action=true",
    )
    try:
        for row in rows:
            print(row)
        os.sys.stdout.flush()
    except (OSError, BrokenPipeError) as exc:
        raise Hold("authority_receipt_emit_failed") from exc


def live_qualify() -> dict[str, Any]:
    v1 = _v1()
    target_host = str(v1.TARGET_HOST)
    if socket.gethostname().casefold() != target_host.casefold():
        hold("wrong_host")
    if os.geteuid() != 0:
        hold("root_required")
    lifecycle_lock_fd = _acquire_training_lifecycle_lock()
    try:
        launcher_identity = _verify_lock_aware_live_launcher_installed()
        return _live_qualify_locked(v1, target_host, launcher_identity)
    finally:
        _release_training_lifecycle_lock(lifecycle_lock_fd)


def _live_qualify_locked(
    v1: types.ModuleType,
    target_host: str,
    launcher_identity: dict[str, object],
) -> dict[str, Any]:
    try:
        materials = v1.verify_installed_materials()
        v1.account_ids()
    except (OSError, subprocess.SubprocessError, v1.Hold) as exc:
        raise Hold("v1_host_preflight_failed") from exc
    effective_unit = _verify_effective_unit_contract()
    _initial_state_required()

    start_attempted = False
    observed_pid: int | None = None
    observed_start_ticks: int | None = None
    live: dict[str, Any] = {}
    primary: BaseException | None = None
    shutdown: dict[str, object] | None = None
    shutdown_failure: BaseException | None = None

    _emit_live_authority()

    try:
        before_start_launcher = _verify_lock_aware_live_launcher_installed()
        if before_start_launcher != launcher_identity:
            hold("lock_aware_live_launcher_changed_before_start")
        before_start_effective_unit = _verify_effective_unit_contract()
        if before_start_effective_unit != effective_unit:
            hold("effective_unit_contract_changed_before_start")
        start_attempted = True
        _run_systemctl("start", v1.UNIT)
        observed_pid = _wait_for_reviewed_entrypoint()
        observed = v1.observe_live_generation(observed_pid)
        live = dict(observed["live"])
        observed_start_ticks = int(live["process_start_time_ticks"])
    except BaseException as exc:
        primary = exc
    finally:
        if start_attempted:
            try:
                shutdown = _stop_and_verify(
                    observed_pid, observed_start_ticks
                )
            except BaseException as exc:
                shutdown_failure = exc

    if shutdown_failure is not None:
        if primary is not None:
            raise Hold(
                "qualification_failed_and_shutdown_unproven:primary="
                + _reason(primary)
                + ":shutdown="
                + _reason(shutdown_failure)
            ) from shutdown_failure
        if isinstance(shutdown_failure, Hold):
            raise shutdown_failure
        raise Hold("service_shutdown_unexpected_failure") from shutdown_failure

    if primary is not None:
        if isinstance(primary, KeyboardInterrupt):
            raise primary
        if isinstance(primary, Hold):
            raise primary
        if isinstance(primary, v1.Hold):
            raise Hold(
                "v1_live_observation_failed:" + _reason(primary)
            ) from primary
        if isinstance(primary, (OSError, subprocess.SubprocessError)):
            raise Hold(
                "live_qualification_primary_failed:" + _reason(primary)
            ) from primary
        raise primary

    if shutdown is None or observed_pid is None or observed_start_ticks is None:
        hold("live_qualification_result_incomplete")

    final_launcher = _verify_lock_aware_live_launcher_installed()
    if final_launcher != launcher_identity:
        hold("lock_aware_live_launcher_changed_after_qualification")
    final_effective_unit = _verify_effective_unit_contract()
    if final_effective_unit != effective_unit:
        hold("effective_unit_contract_changed_after_qualification")

    material = {
        "marker": MARKER,
        "version": 2,
        "status": "installed_training_bus_isolation_shutdown_qualified",
        "target_host": target_host,
        "v1_source_git_blob_sha1": V1_BLOB,
        "materials": materials,
        "live": live,
        "shutdown": shutdown,
        "installed_unit_identity_proven": True,
        "installed_preentry_binary_identity_proven": True,
        "installed_training_entrypoint_identity_proven": True,
        "live_systemd_enforcement_proven": True,
        "effective_systemd_unit_contract": effective_unit,
        "effective_systemd_unit_contract_stable": True,
        "standalone_shutdown_proven": True,
        "shared_training_service_lifecycle_lock_proven": True,
        "lock_aware_live_launcher_identity_proven": True,
        "lock_aware_live_launcher_identity_stable": True,
        "lock_aware_live_launcher": launcher_identity,
        "service_action_performed": True,
        "service_enabled": False,
        "service_active_after_qualification": False,
        "service_substate_after_qualification": "dead",
        "service_mainpid_after_qualification": 0,
        "service_unit_file_state_after_qualification": "static",
        "service_state_snapshot_stable": True,
        "observed_process_generation_absent_after_qualification": True,
        "training_execution": False,
        "attempt_claim": False,
        "candidate_weight_mutation": False,
        "next_gate": "apollyon_candidate_training_preclaim_v2",
        "authority": AUTHORITY,
    }
    return {
        **material,
        "qualification_id":
            "apollyon_training_isolation_shutdown_v2:"
            + sha256(canonical(material).encode("utf-8")),
    }


def self_test() -> None:
    _v1()
    assert _shutdown_state_green(
        {
            "load_state": "loaded",
            "active_state": "inactive",
            "sub_state": "dead",
            "mainpid": 0,
            "unit_file_state": "static",
        },
        False,
    )
    assert not _shutdown_state_green(
        {
            "load_state": "loaded",
            "active_state": "active",
            "sub_state": "running",
            "mainpid": 42,
            "unit_file_state": "static",
        },
        True,
    )
    assert not _shutdown_state_green(
        {
            "load_state": "loaded",
            "active_state": "inactive",
            "sub_state": "dead",
            "mainpid": 0,
            "unit_file_state": "static",
        },
        True,
    )
    assert not _shutdown_state_green(
        {
            "load_state": "loaded",
            "active_state": "inactive",
            "sub_state": "exited",
            "mainpid": 0,
            "unit_file_state": "static",
        },
        False,
    )
    assert AUTHORITY["training_execution"] is False
    assert AUTHORITY["attempt_claim"] is False
    assert AUTHORITY["same_process_composition_receipt_changed"] is False
    print(MARKER + "_SELF_TEST_GREEN")
    print("v1_source_blob_bound=true")
    print("stop_command_success_required=true")
    print("inactive_dead_mainpid_zero_required=true")
    print("observed_process_generation_disappearance_required=true")
    print("static_unit_file_state_required=true")
    print("single_systemctl_state_snapshot_required=true")
    print("final_service_state_revalidation_required=true")
    print("effective_systemd_unit_contract_required=true")
    print("effective_systemd_unit_contract_revalidation_required=true")
    print("shared_training_service_lifecycle_lock_required=true")
    print("root_only_lifecycle_lock_inode_required=true")
    print("replacement_stable_lifecycle_lock_inode_required=true")
    print("lock_aware_live_launcher_required=true")
    print("lock_aware_live_launcher_revalidation_required=true")
    print("v1_observe_live_pid_receipt_unchanged=true")
    print("training_execution=false")
    print("attempt_claim=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--live-qualify", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
            return 0
        result = live_qualify()
    except Hold as exc:
        print("HOLD=" + str(exc), file=os.sys.stderr)
        print("host_filesystem_mutation=false", file=os.sys.stderr)
        print("git_mutation=false", file=os.sys.stderr)
        print("git_fetch=false", file=os.sys.stderr)
        print("service_enable=false", file=os.sys.stderr)
        print("credential_access=false", file=os.sys.stderr)
        print("wallet_or_signer_access=false", file=os.sys.stderr)
        print("transaction_construction=false", file=os.sys.stderr)
        print("transaction_signing=false", file=os.sys.stderr)
        print("transaction_broadcast=false", file=os.sys.stderr)
        print("chain_mutation=false", file=os.sys.stderr)
        print("economic_activation=false", file=os.sys.stderr)
        print("training_execution=false", file=os.sys.stderr)
        print("attempt_claim=false", file=os.sys.stderr)
        print("funds_movement=false", file=os.sys.stderr)
        return 2
    print(canonical(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
