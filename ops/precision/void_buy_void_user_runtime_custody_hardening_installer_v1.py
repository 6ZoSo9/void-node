#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import pwd
import re
import socket
import stat
import subprocess
import sys
import time
from typing import Any

MARKER = "VOID_BUY_VOID_USER_RUNTIME_CUSTODY_HARDENING_INSTALLER_V1"
EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
EXPECTED_USER = "zoso"
UNIT = "void-node-live.service"
SOURCE_RELATIVE = (
    "ops/systemd/void-node-live.service.d/"
    "98-buy-void-allocation-custody-runtime-hardening-v1.conf.example"
)
EXPECTED_SOURCE_BLOB = "ddb9498bfbe12cc5952e82c6a8c5d0232425f32a"
TARGET_BASENAME = "98-buy-void-allocation-custody-runtime-hardening-v1.conf"
CONFIRM_APPLY = "install-and-restart-void-node-live-custody-hardening-v1"
CONFIRM_ROLLBACK = "rollback-void-node-live-custody-hardening-v1"
SYSTEMCTL = pathlib.Path("/usr/bin/systemctl")
SS = pathlib.Path("/usr/bin/ss")
MAX_COMMAND_BYTES = 2 * 1024 * 1024
MAX_DROPIN_BYTES = 16 * 1024
WAIT_SECONDS = 20

EXPECTED_DROPIN = (
    b"[Service]\n"
    b"NoNewPrivileges=yes\n"
    b"CapabilityBoundingSet=\n"
    b"AmbientCapabilities=\n"
)

class Hold(RuntimeError):
    pass

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("utf-8") + data).hexdigest()

def safe_env(uid: int, home: pathlib.Path) -> dict[str, str]:
    return {
        "PATH": "/usr/bin:/bin",
        "HOME": str(home),
        "LANG": "C",
        "LC_ALL": "C",
        "SYSTEMD_PAGER": "cat",
        "SYSTEMD_COLORS": "0",
        "PAGER": "cat",
        "NO_COLOR": "1",
        "XDG_RUNTIME_DIR": f"/run/user/{uid}",
        "DBUS_SESSION_BUS_ADDRESS": f"unix:path=/run/user/{uid}/bus",
    }

def command_identity(path: pathlib.Path) -> tuple[str, int, int, int, int]:
    resolved = path.resolve(strict=True)
    info = resolved.stat()
    if not stat.S_ISREG(info.st_mode) or not (info.st_mode & 0o111):
        raise Hold(f"command_not_executable:{path}")
    return (str(resolved), info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns)

def run_read_only(
    executable: pathlib.Path,
    args: list[str],
    *,
    env: dict[str, str],
    allow_failure: bool = False,
    timeout: int = 10,
) -> subprocess.CompletedProcess[bytes]:
    before = command_identity(executable)
    result = subprocess.run(
        [before[0], *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        timeout=timeout,
        check=False,
    )
    if len(result.stdout) > MAX_COMMAND_BYTES or len(result.stderr) > MAX_COMMAND_BYTES:
        raise Hold("command_output_too_large")
    after = command_identity(executable)
    if before != after:
        raise Hold(f"command_changed_during_read:{executable}")
    if result.returncode != 0 and not allow_failure:
        raise Hold(f"command_failed:{executable.name}")
    return result

def run_mutating(
    executable: pathlib.Path,
    args: list[str],
    *,
    env: dict[str, str],
    timeout: int = 30,
) -> subprocess.CompletedProcess[bytes]:
    before = command_identity(executable)
    result = subprocess.run(
        [before[0], *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        timeout=timeout,
        check=False,
    )
    if len(result.stdout) > MAX_COMMAND_BYTES or len(result.stderr) > MAX_COMMAND_BYTES:
        raise Hold("mutation_command_output_too_large")
    after = command_identity(executable)
    if before != after:
        raise Hold(f"command_changed_during_mutation:{executable}")
    if result.returncode != 0:
        raise Hold(f"mutation_command_failed:{executable.name}:{' '.join(args)}")
    return result

def parse_key_values(raw: bytes) -> dict[str, str]:
    values: dict[str, str] = {}
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise Hold("systemctl_output_not_utf8") from exc
    for line in text.splitlines():
        if not line:
            continue
        if "=" not in line:
            raise Hold("systemctl_row_malformed")
        key, value = line.split("=", 1)
        if not key or key in values:
            raise Hold("systemctl_row_duplicate")
        values[key] = value
    return values

def parse_proc_start_ticks(raw: bytes | str) -> int:
    text = raw.decode("utf-8", "strict") if isinstance(raw, bytes) else raw
    closing = text.rfind(")")
    if closing < 2:
        raise Hold("proc_stat_malformed")
    tail = text[closing + 2 :].split()
    if len(tail) < 20 or not re.fullmatch(r"[1-9][0-9]*", tail[19]):
        raise Hold("proc_stat_start_ticks_invalid")
    return int(tail[19])

def parse_proc_status(raw: bytes | str) -> dict[str, Any]:
    text = raw.decode("utf-8", "strict") if isinstance(raw, bytes) else raw
    rows: dict[str, str] = {}
    for line in text.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        rows[key] = value.strip()
    out: dict[str, Any] = {}
    for key in ("CapInh", "CapPrm", "CapEff", "CapAmb"):
        value = rows.get(key, "")
        if not re.fullmatch(r"[0-9a-fA-F]+", value):
            raise Hold("proc_status_capability_invalid")
        out[key] = int(value, 16)
    nnp = rows.get("NoNewPrivs")
    if nnp not in {"0", "1"}:
        raise Hold("proc_status_no_new_privileges_invalid")
    out["NoNewPrivs"] = int(nnp)
    return out

def process_snapshot(pid: int) -> dict[str, Any]:
    if pid < 1:
        raise Hold("runtime_pid_invalid")
    try:
        stat_bytes = pathlib.Path(f"/proc/{pid}/stat").read_bytes()
        status_bytes = pathlib.Path(f"/proc/{pid}/status").read_bytes()
    except OSError as exc:
        raise Hold("runtime_process_metadata_unavailable") from exc
    status = parse_proc_status(status_bytes)
    return {
        "pid": pid,
        "start_ticks": parse_proc_start_ticks(stat_bytes),
        "no_new_privileges": status["NoNewPrivs"] == 1,
        "capabilities_zero": all(status[key] == 0 for key in ("CapInh", "CapPrm", "CapEff", "CapAmb")),
    }

def normalized_list(value: str | None) -> list[str]:
    if not value or not value.strip():
        return []
    parts = value.strip().split()
    if len(set(parts)) != len(parts):
        raise Hold("systemd_list_duplicate")
    return sorted(parts)

def service_snapshot(env: dict[str, str]) -> dict[str, Any]:
    props = (
        "LoadState",
        "ActiveState",
        "SubState",
        "MainPID",
        "NoNewPrivileges",
        "CapabilityBoundingSet",
        "AmbientCapabilities",
        "FragmentPath",
        "DropInPaths",
        "NeedDaemonReload",
    )
    cp = run_read_only(
        SYSTEMCTL,
        ["--user", "show", UNIT, "--no-pager", *[f"--property={p}" for p in props]],
        env=env,
    )
    values = parse_key_values(cp.stdout)
    if values.get("LoadState") != "loaded":
        raise Hold("runtime_unit_not_loaded")
    if values.get("ActiveState") != "active" or values.get("SubState") != "running":
        raise Hold("runtime_unit_not_active_running")
    pid_text = values.get("MainPID", "")
    if not re.fullmatch(r"[1-9][0-9]*", pid_text):
        raise Hold("runtime_unit_mainpid_invalid")
    return {
        "main_pid": int(pid_text),
        "no_new_privileges": values.get("NoNewPrivileges") == "yes",
        "capability_bounding_set": normalized_list(values.get("CapabilityBoundingSet")),
        "ambient_capabilities": normalized_list(values.get("AmbientCapabilities")),
        "fragment_path": values.get("FragmentPath", ""),
        "dropin_paths": normalized_list(values.get("DropInPaths")),
        "need_daemon_reload": values.get("NeedDaemonReload") == "yes",
    }

def parse_ss_listeners(raw: bytes, pid: int) -> list[str]:
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise Hold("ss_output_not_utf8") from exc
    pid_pattern = re.compile(rf"(^|[^0-9])pid={pid}([^0-9]|$)")
    endpoints: set[str] = set()
    for line in text.splitlines():
        parts = line.split()
        if len(parts) < 5 or parts[0] != "LISTEN":
            continue
        process = " ".join(parts[5:]) if len(parts) > 5 else ""
        if pid_pattern.search(process):
            endpoints.add(parts[3])
    return sorted(endpoints)

def listener_snapshot(env: dict[str, str], pid: int) -> list[str]:
    cp = run_read_only(SS, ["-H", "-ltnp"], env=env)
    endpoints = parse_ss_listeners(cp.stdout, pid)
    if not endpoints:
        raise Hold("runtime_listener_set_empty")
    return endpoints

def file_state(path: pathlib.Path) -> dict[str, Any]:
    try:
        st = path.lstat()
    except FileNotFoundError:
        return {"exists": False}
    if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink != 1:
        raise Hold("target_dropin_not_direct_single_link_regular")
    if st.st_size < 1 or st.st_size > MAX_DROPIN_BYTES:
        raise Hold("target_dropin_size_invalid")
    data = path.read_bytes()
    return {
        "exists": True,
        "bytes": data,
        "sha256": sha256(data),
        "dev": st.st_dev,
        "ino": st.st_ino,
        "mode": stat.S_IMODE(st.st_mode),
        "uid": st.st_uid,
        "gid": st.st_gid,
    }

def source_bytes(root: pathlib.Path) -> bytes:
    source = root / SOURCE_RELATIVE
    st = source.lstat()
    if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink != 1:
        raise Hold("hardening_source_not_direct_regular")
    data = source.read_bytes()
    if data != EXPECTED_DROPIN or git_blob_sha1(data) != EXPECTED_SOURCE_BLOB:
        raise Hold("hardening_source_identity_mismatch")
    return data

def validate_user_path(path: pathlib.Path, uid: int) -> None:
    st = path.lstat()
    if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
        raise Hold("user_systemd_parent_not_direct_directory")
    if st.st_uid != uid:
        raise Hold("user_systemd_parent_not_owned_by_runtime_user")
    if stat.S_IMODE(st.st_mode) & 0o022:
        raise Hold("user_systemd_parent_group_world_writable")

def host_context(root: pathlib.Path) -> dict[str, Any]:
    if socket.gethostname() != EXPECTED_HOSTNAME:
        raise Hold("wrong_designated_host")
    uid = os.geteuid()
    if uid == 0:
        raise Hold("ordinary_user_required_no_sudo")
    try:
        account = pwd.getpwuid(uid)
    except KeyError as exc:
        raise Hold("runtime_user_identity_unavailable") from exc
    if account.pw_name != EXPECTED_USER:
        raise Hold("wrong_runtime_user")
    home = pathlib.Path(account.pw_dir).resolve(strict=True)
    service_dir = home / ".config" / "systemd" / "user"
    if not service_dir.is_dir():
        raise Hold("user_systemd_service_directory_missing")
    validate_user_path(home, uid)
    validate_user_path(home / ".config", uid)
    validate_user_path(home / ".config" / "systemd", uid)
    validate_user_path(service_dir, uid)
    source = source_bytes(root)
    dropin_dir = service_dir / f"{UNIT}.d"
    target = dropin_dir / TARGET_BASENAME
    state_dir = home / ".local" / "state" / "void" / "buy-void-user-runtime-hardening-v1"
    receipt = state_dir / "installation.json"
    env = safe_env(uid, home)
    service = service_snapshot(env)
    process = process_snapshot(service["main_pid"])
    listeners = listener_snapshot(env, service["main_pid"])
    target_state = file_state(target)
    if target_state.get("exists") and target_state.get("bytes") != source:
        raise Hold("target_dropin_exists_with_different_bytes")
    return {
        "uid": uid,
        "gid": account.pw_gid,
        "home": home,
        "service_dir": service_dir,
        "dropin_dir": dropin_dir,
        "target": target,
        "state_dir": state_dir,
        "receipt": receipt,
        "env": env,
        "source": source,
        "service": service,
        "process": process,
        "listeners": listeners,
        "target_state": target_state,
    }

def installed_policy_green(service: dict[str, Any], process: dict[str, Any]) -> bool:
    return (
        service["no_new_privileges"] is True
        and service["capability_bounding_set"] == []
        and service["ambient_capabilities"] == []
        and process["no_new_privileges"] is True
        and process["capabilities_zero"] is True
    )

def complete_write(fd: int, data: bytes) -> None:
    view = memoryview(data)
    offset = 0
    while offset < len(view):
        written = os.write(fd, view[offset:])
        if written <= 0:
            raise Hold("short_write")
        offset += written

def write_create_only(path: pathlib.Path, data: bytes, mode: int = 0o600) -> os.stat_result:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    try:
        complete_write(fd, data)
        os.fsync(fd)
        st = os.fstat(fd)
        if st.st_size != len(data):
            raise Hold("created_file_size_mismatch")
        return st
    finally:
        os.close(fd)

def fsync_dir(path: pathlib.Path) -> None:
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)

def wait_post_restart(
    env: dict[str, str],
    *,
    before_process: dict[str, Any],
    before_listeners: list[str],
) -> tuple[dict[str, Any], dict[str, Any], list[str]]:
    deadline = time.monotonic() + WAIT_SECONDS
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            service = service_snapshot(env)
            process = process_snapshot(service["main_pid"])
            listeners = listener_snapshot(env, service["main_pid"])
            generation_changed = (
                service["main_pid"] != before_process["pid"]
                or process["start_ticks"] != before_process["start_ticks"]
            )
            if (
                generation_changed
                and installed_policy_green(service, process)
                and listeners == before_listeners
            ):
                return service, process, listeners
        except Exception as exc:
            last_error = exc
        time.sleep(0.5)
    if last_error:
        raise Hold("post_restart_qualification_timeout:" + str(last_error))
    raise Hold("post_restart_qualification_timeout")

def remove_owned_target(target: pathlib.Path, expected_dev: int, expected_ino: int, expected_sha: str) -> None:
    state = file_state(target)
    if not state.get("exists"):
        return
    if state["dev"] != expected_dev or state["ino"] != expected_ino or state["sha256"] != expected_sha:
        raise Hold("rollback_target_identity_changed")
    target.unlink()
    fsync_dir(target.parent)

def receipt_bytes(payload: dict[str, Any]) -> bytes:
    return (json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")

def print_common(ctx: dict[str, Any], mode: str) -> None:
    print(MARKER)
    print("mode=" + mode)
    print("host=" + EXPECTED_HOSTNAME)
    print("runtime_user=" + EXPECTED_USER)
    print("target_manager=user")
    print("target_service=" + UNIT)
    print("source_git_blob=" + EXPECTED_SOURCE_BLOB)
    print("source_sha256=" + sha256(ctx["source"]))
    print("target_exists=" + str(bool(ctx["target_state"].get("exists"))).lower())
    print("pre_capabilities_zero=" + str(ctx["process"]["capabilities_zero"]).lower())
    print("pre_no_new_privileges=" + str(ctx["process"]["no_new_privileges"]).lower())
    print("pre_listener_count=" + str(len(ctx["listeners"])))
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

def source_plan() -> None:
    print(MARKER)
    print("mode=--source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("target_manager=user")
    print("target_service=" + UNIT)
    print("target_dropin=" + TARGET_BASENAME)
    print("success_path_restart_count=1")
    print("failure_rollback_restart_count_max=1")
    print("enable_disable=false")
    print("execstart_mutation=false")
    print("environment_mutation=false")
    print("user_group_mutation=false")
    print("storage_mutation=false")
    print("network_config_mutation=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

def plan(root: pathlib.Path) -> None:
    ctx = host_context(root)
    print_common(ctx, "--plan")
    already = bool(ctx["target_state"].get("exists")) and installed_policy_green(
        ctx["service"], ctx["process"]
    )
    if ctx["target_state"].get("exists") and not already:
        print("apply_candidate=false")
        print("hold=PREEXISTING_EXACT_DROPIN_NOT_LIVE_QUALIFIED")
        print("next_action=REVIEW_PREEXISTING_DROPIN_STATE")
        return
    if not ctx["process"]["capabilities_zero"]:
        print("apply_candidate=false")
        print("hold=LIVE_RUNTIME_CAPABILITIES_NONZERO")
        print("next_action=DO_NOT_APPLY")
        return
    print("apply_candidate=true")
    print("already_hardened=" + str(already).lower())
    print("service_restart_authorized=false")
    print("next_action=" + ("NO_MUTATION_REQUIRED" if already else "SEPARATE_APPLY_AUTHORIZATION_REQUIRED"))

def apply(root: pathlib.Path, confirm: str) -> None:
    if confirm != CONFIRM_APPLY:
        raise Hold("apply_confirmation_invalid")
    ctx = host_context(root)
    print_common(ctx, "--apply")
    if ctx["target_state"].get("exists"):
        if installed_policy_green(ctx["service"], ctx["process"]):
            print("already_hardened=true")
            print("filesystem_write=false")
            print("systemd_mutation=false")
            print("service_restart=false")
            print("status=ALREADY_GREEN")
            return
        raise Hold("preexisting_exact_dropin_not_live_qualified")
    if not ctx["process"]["capabilities_zero"]:
        raise Hold("live_runtime_capabilities_nonzero")

    created_dir = False
    target_stat: os.stat_result | None = None
    target_sha = sha256(ctx["source"])
    mutation_started = False
    rollback_green = False
    try:
        if not ctx["dropin_dir"].exists():
            os.mkdir(ctx["dropin_dir"], 0o700)
            created_dir = True
            fsync_dir(ctx["service_dir"])
        validate_user_path(ctx["dropin_dir"], ctx["uid"])
        target_stat = write_create_only(ctx["target"], ctx["source"], 0o600)
        mutation_started = True
        fsync_dir(ctx["dropin_dir"])

        run_mutating(SYSTEMCTL, ["--user", "daemon-reload"], env=ctx["env"])
        run_mutating(SYSTEMCTL, ["--user", "restart", UNIT], env=ctx["env"])
        post_service, post_process, post_listeners = wait_post_restart(
            ctx["env"],
            before_process=ctx["process"],
            before_listeners=ctx["listeners"],
        )
        if post_service["need_daemon_reload"]:
            raise Hold("post_restart_need_daemon_reload")
        if ctx["target"].read_bytes() != ctx["source"]:
            raise Hold("installed_dropin_bytes_changed")

        ctx["state_dir"].mkdir(parents=True, mode=0o700, exist_ok=True)
        receipt = {
            "marker": MARKER,
            "version": 1,
            "target": str(ctx["target"]),
            "target_sha256": target_sha,
            "target_dev": target_stat.st_dev,
            "target_ino": target_stat.st_ino,
            "dropin_dir_created": created_dir,
            "pre_start_ticks": ctx["process"]["start_ticks"],
            "post_start_ticks": post_process["start_ticks"],
            "listener_endpoints_sha256": sha256(
                ("\n".join(post_listeners) + "\n").encode("utf-8")
            ),
            "rollback_confirmation": CONFIRM_ROLLBACK,
        }
        write_create_only(ctx["receipt"], receipt_bytes(receipt), 0o600)
        fsync_dir(ctx["state_dir"])

        print("filesystem_write=true")
        print("systemd_daemon_reload=true")
        print("service_restart_count=1")
        print("post_no_new_privileges=true")
        print("post_capabilities_zero=true")
        print("listener_set_preserved=true")
        print("installation_receipt_created=true")
        print("rollback_available=true")
        print("status=HARDENING_INSTALLED_GREEN")
    except Exception:
        if mutation_started and target_stat is not None:
            try:
                remove_owned_target(
                    ctx["target"],
                    target_stat.st_dev,
                    target_stat.st_ino,
                    target_sha,
                )
                if created_dir:
                    try:
                        ctx["dropin_dir"].rmdir()
                        fsync_dir(ctx["service_dir"])
                    except OSError:
                        pass
                run_mutating(SYSTEMCTL, ["--user", "daemon-reload"], env=ctx["env"])
                run_mutating(SYSTEMCTL, ["--user", "restart", UNIT], env=ctx["env"])
                deadline = time.monotonic() + WAIT_SECONDS
                while time.monotonic() < deadline:
                    try:
                        recovered_service = service_snapshot(ctx["env"])
                        recovered_process = process_snapshot(recovered_service["main_pid"])
                        recovered_listeners = listener_snapshot(ctx["env"], recovered_service["main_pid"])
                        if recovered_listeners == ctx["listeners"]:
                            rollback_green = True
                            break
                    except Exception:
                        pass
                    time.sleep(0.5)
            except Exception:
                rollback_green = False
        print("automatic_rollback_attempted=" + str(mutation_started).lower())
        print("automatic_rollback_green=" + str(rollback_green).lower())
        raise

def rollback(root: pathlib.Path, confirm: str) -> None:
    if confirm != CONFIRM_ROLLBACK:
        raise Hold("rollback_confirmation_invalid")
    ctx = host_context(root)
    if not ctx["receipt"].exists():
        raise Hold("installation_receipt_missing")
    receipt_raw = ctx["receipt"].read_bytes()
    if len(receipt_raw) > 64 * 1024:
        raise Hold("installation_receipt_too_large")
    receipt = json.loads(receipt_raw.decode("utf-8", "strict"))
    if (
        receipt.get("marker") != MARKER
        or receipt.get("version") != 1
        or receipt.get("target") != str(ctx["target"])
        or receipt.get("rollback_confirmation") != CONFIRM_ROLLBACK
    ):
        raise Hold("installation_receipt_invalid")

    before_service = ctx["service"]
    before_process = ctx["process"]
    before_listeners = ctx["listeners"]
    remove_owned_target(
        ctx["target"],
        int(receipt["target_dev"]),
        int(receipt["target_ino"]),
        str(receipt["target_sha256"]),
    )
    if receipt.get("dropin_dir_created") is True:
        try:
            ctx["dropin_dir"].rmdir()
            fsync_dir(ctx["service_dir"])
        except OSError:
            pass
    run_mutating(SYSTEMCTL, ["--user", "daemon-reload"], env=ctx["env"])
    run_mutating(SYSTEMCTL, ["--user", "restart", UNIT], env=ctx["env"])

    deadline = time.monotonic() + WAIT_SECONDS
    restored = False
    while time.monotonic() < deadline:
        try:
            svc = service_snapshot(ctx["env"])
            proc = process_snapshot(svc["main_pid"])
            listeners = listener_snapshot(ctx["env"], svc["main_pid"])
            changed = (
                svc["main_pid"] != before_service["main_pid"]
                or proc["start_ticks"] != before_process["start_ticks"]
            )
            if changed and listeners == before_listeners:
                restored = True
                break
        except Exception:
            pass
        time.sleep(0.5)
    if not restored:
        raise Hold("rollback_runtime_recovery_failed")

    ctx["receipt"].unlink()
    fsync_dir(ctx["state_dir"])
    print(MARKER)
    print("mode=--rollback")
    print("dropin_removed=true")
    print("systemd_daemon_reload=true")
    print("service_restart_count=1")
    print("listener_set_preserved=true")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print("status=ROLLBACK_GREEN")

def self_test() -> None:
    stat_line = "7 (node worker) " + " ".join(["S", *(["0"] * 18), "424242"])
    assert parse_proc_start_ticks(stat_line) == 424242
    status = (
        "CapInh:\t0000000000000000\n"
        "CapPrm:\t0000000000000000\n"
        "CapEff:\t0000000000000000\n"
        "CapAmb:\t0000000000000000\n"
        "NoNewPrivs:\t1\n"
    )
    parsed = parse_proc_status(status)
    assert parsed["NoNewPrivs"] == 1
    assert all(parsed[key] == 0 for key in ("CapInh", "CapPrm", "CapEff", "CapAmb"))
    assert parse_ss_listeners(
        b'LISTEN 0 511 127.0.0.1:4100 0.0.0.0:* users:(("node",pid=7,fd=1))\n'
        b'LISTEN 0 511 0.0.0.0:4700 0.0.0.0:* users:(("node",pid=7,fd=2))\n',
        7,
    ) == ["0.0.0.0:4700", "127.0.0.1:4100"]
    assert git_blob_sha1(EXPECTED_DROPIN) == EXPECTED_SOURCE_BLOB
    assert installed_policy_green(
        {
            "no_new_privileges": True,
            "capability_bounding_set": [],
            "ambient_capabilities": [],
        },
        {"no_new_privileges": True, "capabilities_zero": True},
    )
    assert not installed_policy_green(
        {
            "no_new_privileges": False,
            "capability_bounding_set": [],
            "ambient_capabilities": [],
        },
        {"no_new_privileges": True, "capabilities_zero": True},
    )
    print(f"{MARKER}_SELF_TEST_GREEN")
    print("exact_merged_dropin_blob_bound=true")
    print("pre_live_capabilities_zero_required=true")
    print("success_path_restart_count=1")
    print("listener_set_equality_required=true")
    print("automatic_failure_rollback=true")
    print("apply_authorized=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

def main() -> int:
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--self-test", action="store_true")
    modes.add_argument("--source-plan", action="store_true")
    modes.add_argument("--plan", action="store_true")
    modes.add_argument("--apply", action="store_true")
    modes.add_argument("--rollback", action="store_true")
    parser.add_argument("--confirm")
    args = parser.parse_args()
    root = pathlib.Path(__file__).resolve().parents[2]
    if args.self_test:
        self_test()
    elif args.source_plan:
        source_plan()
    elif args.plan:
        plan(root)
    elif args.apply:
        apply(root, args.confirm or "")
    else:
        rollback(root, args.confirm or "")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Hold as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
