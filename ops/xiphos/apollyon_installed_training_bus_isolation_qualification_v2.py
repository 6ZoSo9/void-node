#!/usr/bin/env python3
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import signal
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
LOCK_AWARE_LAUNCHER_BLOB = "352bd36f2b07091140b990de4170f708eb11fee6"
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
    "standalone_live_qualification_retired": True,
    "standalone_service_start_stop_required": False,
    "stop_command_success_required": False,
    "inactive_dead_mainpid_zero_required": False,
    "observed_process_generation_disappearance_required": False,
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


class TerminationLatch:
    def __init__(self) -> None:
        self.signum: int | None = None

    def handler(self, signum: int, _frame: object) -> None:
        if self.signum is None:
            self.signum = int(signum)


TERMINATION_SIGNALS = (signal.SIGHUP, signal.SIGTERM)


def _install_termination_handlers(
    latch: TerminationLatch,
) -> dict[int, object]:
    previous: dict[int, object] = {}
    try:
        for sig in TERMINATION_SIGNALS:
            key = int(sig)
            previous[key] = signal.getsignal(sig)
            signal.signal(sig, latch.handler)
    except (OSError, ValueError) as exc:
        for key, handler in previous.items():
            try:
                signal.signal(key, handler)
            except (OSError, ValueError):
                pass
        raise Hold("termination_handler_install_failed") from exc
    return previous


def _restore_termination_handlers(previous: dict[int, object]) -> None:
    failure: BaseException | None = None
    for key, handler in previous.items():
        try:
            signal.signal(key, handler)
        except (OSError, ValueError) as exc:
            if failure is None:
                failure = exc
    if failure is not None:
        raise Hold("termination_handler_restore_failed") from failure


def _termination_reason(latch: TerminationLatch | None) -> str | None:
    if latch is None or latch.signum is None:
        return None
    try:
        name = signal.Signals(latch.signum).name
    except ValueError:
        name = str(latch.signum)
    return "termination_signal_received:" + name


def _hold_if_termination_requested(
    latch: TerminationLatch | None,
) -> None:
    reason = _termination_reason(latch)
    if reason is not None:
        hold(reason)


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
    fields = (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
        "st_size", "st_mtime_ns", "st_ctime_ns",
    )
    fd: int | None = None
    try:
        fd = os.open(
            path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
        )
        opened = os.fstat(fd)
        if any(getattr(before, key) != getattr(opened, key) for key in fields):
            hold("v1_source_generation_changed")
        raw = os.pread(fd, before.st_size, 0)
        extra = os.pread(fd, 1, before.st_size)
        after = os.fstat(fd)
        visible = path.lstat()
        if extra or any(
            getattr(opened, key) != getattr(after, key)
            or getattr(after, key) != getattr(visible, key)
            for key in fields
        ):
            hold("v1_source_generation_changed")
        if len(raw) != before.st_size or git_blob(raw) != V1_BLOB:
            hold("v1_source_identity_mismatch")
        return raw
    except OSError as exc:
        raise Hold("v1_source_read_failed") from exc
    finally:
        if fd is not None:
            try:
                os.close(fd)
            except OSError as exc:
                raise Hold("v1_source_close_failed") from exc


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
    reverse_lifecycle_names = (
        "RequiredBy",
        "WantedBy",
        "UpheldBy",
        "BoundBy",
        "TriggeredBy",
        "ConflictedBy",
        "StopPropagatedFrom",
    )
    names = (
        "FragmentPath",
        "DropInPaths",
        "NeedDaemonReload",
        "ExecStart",
        *reverse_lifecycle_names,
    )
    props = _systemd_properties(v1.UNIT, names)
    if props["FragmentPath"] != os.fspath(v1.UNIT_PATH):
        hold("effective_unit_fragment_invalid")
    if props["DropInPaths"] != "":
        hold("effective_unit_dropins_present")
    if props["NeedDaemonReload"] != "no":
        hold("effective_unit_needs_daemon_reload")
    for name in reverse_lifecycle_names:
        if props[name].strip():
            hold(
                "effective_unit_reverse_lifecycle_dependency_present:" + name
            )
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
        "reverse_lifecycle_dependencies_empty": True,
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
        try:
            visible = os.lstat(absolute)
        except OSError as exc:
            raise Hold(
                "training_service_lifecycle_lock_revalidation_failed"
            ) from exc
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
        try:
            visible_after = os.lstat(absolute)
        except OSError as exc:
            raise Hold(
                "training_service_lifecycle_lock_revalidation_failed"
            ) from exc
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
        "mode=live-qualify-retired",
        "host_filesystem_mutation=false",
        "git_mutation=false",
        "git_fetch=false",
        "service_process_action=false",
        "service_start_stop=false",
        "credential_access=false",
        "wallet_or_signer_access=false",
        "transaction_construction=false",
        "transaction_signing=false",
        "transaction_broadcast=false",
        "chain_mutation=false",
        "economic_activation=false",
        "funds_movement=false",
        "authority_receipt_before_retired_hold=true",
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
    _emit_live_authority()
    hold("standalone_live_qualify_retired_use_lock_aware_launcher")


def _live_qualify_locked(
    v1: types.ModuleType,
    target_host: str,
    launcher_identity: dict[str, object],
    termination_latch: TerminationLatch | None = None,
) -> dict[str, Any]:
    del v1, target_host, launcher_identity, termination_latch
    hold("standalone_live_qualify_retired_use_lock_aware_launcher")


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
    assert AUTHORITY["standalone_live_qualification_retired"] is True
    assert AUTHORITY["standalone_service_start_stop_required"] is False
    assert AUTHORITY["stop_command_success_required"] is False
    assert AUTHORITY["inactive_dead_mainpid_zero_required"] is False
    assert AUTHORITY["observed_process_generation_disappearance_required"] is False
    print(MARKER + "_SELF_TEST_GREEN")
    print("v1_source_blob_bound=true")
    print("standalone_live_qualify_retired=true")
    print("standalone_service_start_stop_required=false")
    print("service_process_action=false")
    print("service_start_stop=false")
    print("launcher_live_activation_retired=true")
    print("no_reviewed_training_service_activator=true")
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
        print("service_process_action=false", file=os.sys.stderr)
        print("service_start_stop=false", file=os.sys.stderr)
        print("standalone_live_qualify_retired=true", file=os.sys.stderr)
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
