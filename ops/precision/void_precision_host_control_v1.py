#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pwd
import re
import socket
import stat
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

MARKER = "VOID_PRECISION_HOST_CONTROL_V1"
VERSION = 1

EXPECTED_HOST = "zoso-Precision-Tower-7810"
OPERATOR_USER = "zoso"
EXPECTED_OPERATOR_UID = 1000
EXPECTED_SUDO_USER = "void-gh-runner"

CANONICAL_REPO = Path("/home/zoso/dev/void-node")
UNIT = "void-node-live.service"
BINDING_DROPIN = Path(
    "/home/zoso/.config/systemd/user/void-node-live.service.d/"
    "84-buy-void-prepared-transaction-custodian-binding-v1.conf"
)
CUSTODY_STORE = Path(
    "/home/zoso/.local/state/"
    "void-buy-void-prepared-transaction-custodian-v1"
)
CUSTODIAN_SOCKET = Path(
    "/run/user/1000/"
    "void-buy-void-prepared-transaction-custodian-v1.sock"
)

CUSTODIAN_SOCKET_ENV = (
    "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_SOCKET_PATH"
)
CUSTODIAN_FP_ENV = (
    "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SIGNER_FINGERPRINT_SHA256"
)

GATE_ENVS = (
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PREPARATION_ENABLED",
    "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ENABLED",
    "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_APPLY_ENABLED",
    "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_SUBMISSION_ENABLED",
)

OP_INSPECT = "inspect_custodian_binding"
OP_RELOAD = "daemon_reload_custodian_binding"
CONFIRMATIONS = {
    OP_INSPECT: "voidPrecisionInspectCustodianBindingV1",
    OP_RELOAD: "voidPrecisionDaemonReloadCustodianBindingV1",
}

SHA1 = re.compile(r"^[0-9a-f]{40}$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")
TRUTHY = {"1", "true", "yes", "on"}

AUTHORITY = {
    "closed_operation_allowlist": True,
    "operations": [OP_INSPECT, OP_RELOAD],
    "exact_confirmation_required": True,
    "main_ref_source_sha_required": True,
    "binding_sha_required": True,
    "dedicated_runner_user_required": True,
    "root_owned_installed_helper_required": True,
    "repository_checkout_required": False,
    "arbitrary_shell_input": False,
    "credential_read": False,
    "signer_access": False,
    "wallet_access": False,
    "rpc_call": False,
    "service_start": False,
    "service_stop": False,
    "service_restart": False,
    "daemon_reload_only_mutation": True,
    "custody_store_write": False,
    "custodian_socket_create": False,
    "transaction_submission": False,
    "transaction_broadcast": False,
    "money_movement": False,
}


class Hold(RuntimeError):
    pass


@dataclass(frozen=True)
class ServiceSnapshot:
    load_state: str
    active_state: str
    sub_state: str
    main_pid: int
    need_daemon_reload: str
    dropin_paths: tuple[str, ...]


class Backend:
    """Minimal host boundary. Production CLI uses this exact implementation."""

    def __init__(self, operator_user: str = OPERATOR_USER) -> None:
        self.operator_user = operator_user
        operator = pwd.getpwnam(operator_user)
        self.operator_uid = operator.pw_uid
        self.operator_gid = operator.pw_gid
        self.runtime_dir = f"/run/user/{self.operator_uid}"
        self.bus = f"unix:path={self.runtime_dir}/bus"

    def _run_as_operator(
        self,
        argv: Sequence[str],
        *,
        check: bool = True,
    ) -> subprocess.CompletedProcess[str]:
        command = [
            "/usr/sbin/runuser",
            "-u",
            self.operator_user,
            "--",
            "/usr/bin/env",
            f"XDG_RUNTIME_DIR={self.runtime_dir}",
            f"DBUS_SESSION_BUS_ADDRESS={self.bus}",
            *argv,
        ]
        return subprocess.run(
            command,
            check=check,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env={"PATH": "/usr/sbin:/usr/bin:/sbin:/bin"},
        )

    def git(self, *args: str) -> str:
        completed = self._run_as_operator(
            ["/usr/bin/git", "-C", str(CANONICAL_REPO), *args]
        )
        return completed.stdout.strip()

    def systemctl(self, *args: str) -> str:
        completed = self._run_as_operator(
            ["/usr/bin/systemctl", "--user", *args]
        )
        return completed.stdout.strip()

    def daemon_reload(self) -> None:
        self.systemctl("daemon-reload")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_direct_regular(
    path: Path,
    *,
    owner_uid: int,
    exact_mode: int,
    label: str,
) -> None:
    try:
        metadata = path.lstat()
    except FileNotFoundError as error:
        raise Hold(f"{label}_missing") from error
    if not stat.S_ISREG(metadata.st_mode) or path.is_symlink():
        raise Hold(f"{label}_must_be_direct_regular_file")
    if metadata.st_uid != owner_uid:
        raise Hold(f"{label}_owner_mismatch")
    if stat.S_IMODE(metadata.st_mode) != exact_mode:
        raise Hold(f"{label}_mode_mismatch")


def assert_absent(path: Path, label: str) -> None:
    if os.path.lexists(path):
        raise Hold(f"{label}_must_remain_absent")


def parse_dropin_binding(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("# custody_store_dir="):
            result["custody_store_dir"] = line.split("=", 1)[1]
        elif line.startswith(f"Environment={CUSTODIAN_SOCKET_ENV}="):
            result["custodian_socket"] = line.split("=", 2)[2]
        elif line.startswith(f"Environment={CUSTODIAN_FP_ENV}="):
            result["signer_fingerprint_sha256"] = line.split("=", 2)[2].lower()
    expected_keys = {
        "custody_store_dir",
        "custodian_socket",
        "signer_fingerprint_sha256",
    }
    if set(result) != expected_keys:
        raise Hold("custodian_binding_schema_invalid")
    if result["custody_store_dir"] != str(CUSTODY_STORE):
        raise Hold("custody_store_binding_mismatch")
    if result["custodian_socket"] != str(CUSTODIAN_SOCKET):
        raise Hold("custodian_socket_binding_mismatch")
    if not SHA256.fullmatch(result["signer_fingerprint_sha256"]):
        raise Hold("custodian_signer_fingerprint_invalid")
    return result


def parse_systemctl_show(raw: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in raw.splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        result[key] = value
    return result


def service_snapshot(backend: Backend) -> ServiceSnapshot:
    raw = backend.systemctl(
        "show",
        UNIT,
        "-p",
        "LoadState",
        "-p",
        "ActiveState",
        "-p",
        "SubState",
        "-p",
        "MainPID",
        "-p",
        "NeedDaemonReload",
        "-p",
        "DropInPaths",
    )
    fields = parse_systemctl_show(raw)
    required = {
        "LoadState",
        "ActiveState",
        "SubState",
        "MainPID",
        "NeedDaemonReload",
        "DropInPaths",
    }
    if not required.issubset(fields):
        raise Hold("systemd_snapshot_incomplete")
    try:
        pid = int(fields["MainPID"])
    except ValueError as error:
        raise Hold("systemd_main_pid_invalid") from error
    if pid <= 0:
        raise Hold("systemd_main_pid_not_running")
    return ServiceSnapshot(
        load_state=fields["LoadState"],
        active_state=fields["ActiveState"],
        sub_state=fields["SubState"],
        main_pid=pid,
        need_daemon_reload=fields["NeedDaemonReload"],
        dropin_paths=tuple(fields["DropInPaths"].split()),
    )


def exact_gate_values(paths: Iterable[str]) -> dict[str, list[str]]:
    values = {key: [] for key in GATE_ENVS}
    for raw_path in paths:
        path = Path(raw_path)
        try:
            metadata = path.lstat()
        except FileNotFoundError as error:
            raise Hold("systemd_dropin_disappeared") from error
        if not stat.S_ISREG(metadata.st_mode) or path.is_symlink():
            raise Hold("systemd_dropin_not_direct_regular")
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line.startswith("Environment="):
                continue
            payload = line[len("Environment="):].strip().strip('"')
            for key in GATE_ENVS:
                prefix = f"{key}="
                if payload.startswith(prefix):
                    value = payload[len(prefix):].strip().strip('"')
                    if value not in values[key]:
                        values[key].append(value)
    return values


def assert_money_gates_disabled(snapshot: ServiceSnapshot) -> dict[str, list[str]]:
    values = exact_gate_values(snapshot.dropin_paths)
    for key, observed in values.items():
        if any(value.lower() in TRUTHY for value in observed):
            raise Hold(f"money_or_preparation_gate_enabled:{key}")
    return values


def assert_repo_source(backend: Backend, expected_main_sha: str) -> None:
    if not SHA1.fullmatch(expected_main_sha):
        raise Hold("expected_main_sha_invalid")
    branch = backend.git("symbolic-ref", "--quiet", "--short", "HEAD")
    if branch != "main":
        raise Hold("canonical_repo_not_on_main")
    head = backend.git("rev-parse", "HEAD")
    if head != expected_main_sha:
        raise Hold("canonical_repo_head_mismatch")
    if backend.git("status", "--porcelain=v1", "-uall"):
        raise Hold("canonical_repo_dirty")


def preflight(
    backend: Backend,
    *,
    expected_main_sha: str,
    expected_binding_sha256: str,
) -> tuple[ServiceSnapshot, dict[str, str], dict[str, list[str]]]:
    if socket.gethostname() != EXPECTED_HOST:
        raise Hold("host_mismatch")
    if backend.operator_uid != EXPECTED_OPERATOR_UID:
        raise Hold("operator_uid_mismatch")
    if not SHA256.fullmatch(expected_binding_sha256):
        raise Hold("expected_binding_sha256_invalid")
    assert_repo_source(backend, expected_main_sha)
    assert_direct_regular(
        BINDING_DROPIN,
        owner_uid=backend.operator_uid,
        exact_mode=0o600,
        label="custodian_binding_dropin",
    )
    actual_binding_sha = sha256_file(BINDING_DROPIN)
    if actual_binding_sha != expected_binding_sha256:
        raise Hold("custodian_binding_sha256_mismatch")
    binding = parse_dropin_binding(BINDING_DROPIN)
    assert_absent(CUSTODY_STORE, "custody_store")
    assert_absent(CUSTODIAN_SOCKET, "custodian_socket")
    snapshot = service_snapshot(backend)
    if snapshot.load_state != "loaded":
        raise Hold("void_node_unit_not_loaded")
    if snapshot.active_state != "active" or snapshot.sub_state != "running":
        raise Hold("void_node_unit_not_running")
    gates = assert_money_gates_disabled(snapshot)
    return snapshot, binding, gates


def run_operation(
    backend: Backend,
    *,
    operation: str,
    confirmation: str,
    expected_main_sha: str,
    expected_binding_sha256: str,
) -> dict[str, object]:
    if operation not in CONFIRMATIONS:
        raise Hold("operation_not_allowlisted")
    if confirmation != CONFIRMATIONS[operation]:
        raise Hold("confirmation_mismatch")

    before, binding, gates_before = preflight(
        backend,
        expected_main_sha=expected_main_sha,
        expected_binding_sha256=expected_binding_sha256,
    )

    reload_performed = False
    if operation == OP_RELOAD:
        backend.daemon_reload()
        reload_performed = True

    after, binding_after, gates_after = preflight(
        backend,
        expected_main_sha=expected_main_sha,
        expected_binding_sha256=expected_binding_sha256,
    )

    if binding_after != binding:
        raise Hold("custodian_binding_changed_during_operation")
    if gates_after != gates_before:
        raise Hold("money_gate_metadata_changed_during_operation")
    if after.main_pid != before.main_pid:
        raise Hold("void_node_main_pid_changed")
    if after.load_state != before.load_state:
        raise Hold("void_node_load_state_changed")
    if after.active_state != before.active_state:
        raise Hold("void_node_active_state_changed")
    if after.sub_state != before.sub_state:
        raise Hold("void_node_sub_state_changed")
    if operation == OP_RELOAD and after.need_daemon_reload != "no":
        raise Hold("daemon_reload_not_recognized")
    if operation == OP_RELOAD and str(BINDING_DROPIN) not in after.dropin_paths:
        raise Hold("custodian_binding_dropin_not_recognized")

    return {
        "marker": MARKER,
        "version": VERSION,
        "status": "green",
        "operation": operation,
        "host": EXPECTED_HOST,
        "source_main_sha": expected_main_sha,
        "binding_sha256": expected_binding_sha256,
        "binding": binding,
        "main_pid_before": before.main_pid,
        "main_pid_after": after.main_pid,
        "active_state": after.active_state,
        "sub_state": after.sub_state,
        "need_daemon_reload": after.need_daemon_reload,
        "dropin_recognized": str(BINDING_DROPIN) in after.dropin_paths,
        "daemon_reload_performed": reload_performed,
        "service_start": False,
        "service_stop": False,
        "service_restart": False,
        "credential_read": False,
        "signer_access": False,
        "wallet_access": False,
        "rpc_call": False,
        "custody_store_created": False,
        "custodian_socket_created": False,
        "submit_once": False,
        "transaction_broadcast": False,
        "money_movement": False,
        "authority": AUTHORITY,
    }


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Restricted Precision host-control helper v1"
    )
    parser.add_argument("operation", choices=tuple(CONFIRMATIONS))
    parser.add_argument("confirmation")
    parser.add_argument("expected_main_sha")
    parser.add_argument("expected_binding_sha256")
    return parser.parse_args(argv)


def production_entry(argv: Sequence[str]) -> int:
    if os.geteuid() != 0:
        print("HOLD: root helper execution required", file=sys.stderr)
        return 64
    if os.environ.get("SUDO_USER") != EXPECTED_SUDO_USER:
        print("HOLD: dedicated runner sudo caller required", file=sys.stderr)
        return 64
    try:
        args = parse_args(argv)
        result = run_operation(
            Backend(),
            operation=args.operation,
            confirmation=args.confirmation,
            expected_main_sha=args.expected_main_sha,
            expected_binding_sha256=args.expected_binding_sha256,
        )
    except (Hold, KeyError, OSError, subprocess.SubprocessError) as error:
        reason = re.sub(r"[^A-Za-z0-9_.:-]", "_", str(error))[:240]
        print(f"HOLD: {reason}", file=sys.stderr)
        return 75
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(production_entry(sys.argv[1:]))
