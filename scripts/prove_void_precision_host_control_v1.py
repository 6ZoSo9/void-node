#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
import os
import socket
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / "ops/precision/void_precision_host_control_v1.py"
HOST_WORKFLOW = ROOT / ".github/workflows/void-precision-host-control-v1.yml"
REMOVED_HOSTED_PROOF_WORKFLOW = (
    ROOT / ".github/workflows/void-precision-host-control-proof-v1.yml"
)
SUDOERS = ROOT / "ops/precision/void-gh-runner-precision-control-v1.sudoers.example"

MARKER = "VOID_PRECISION_HOST_CONTROL_V1_PROOF_GREEN"
EXPECTED_HELPER_SHA = "63b69bf29ac8ac1b82ee144c579fa5dfeb49555634e53f3b4d9ae67c6f21a4a2"
EXPECTED_BINDING_SHA = "b8b7d98c76a59dc6f78e7c421475206795074b91a15dd317f8fb582269493b8a"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load_helper():
    spec = importlib.util.spec_from_file_location(
        "void_precision_host_control_v1", HELPER
    )
    require(spec is not None and spec.loader is not None, "helper import spec")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class FakeBackend:
    def __init__(self, module, dropin: Path, gate_file: Path, *, pid_after=None):
        self.module = module
        self.operator_uid = os.getuid()
        self.dropin = dropin
        self.gate_file = gate_file
        self.reload_calls = 0
        self.pid_before = 424242
        self.pid_after = pid_after if pid_after is not None else self.pid_before

    def git(self, *args: str) -> str:
        key = tuple(args)
        if key == ("symbolic-ref", "--quiet", "--short", "HEAD"):
            return "main"
        if key == ("rev-parse", "HEAD"):
            return "a" * 40
        if key == ("status", "--porcelain=v1", "-uall"):
            return ""
        raise AssertionError(f"unexpected git call: {key}")

    def systemctl(self, *args: str) -> str:
        require(args[0] == "show", f"unexpected systemctl call: {args}")
        pid = self.pid_after if self.reload_calls else self.pid_before
        return "\n".join(
            [
                "LoadState=loaded",
                "ActiveState=active",
                "SubState=running",
                f"MainPID={pid}",
                "NeedDaemonReload=no",
                f"DropInPaths={self.dropin} {self.gate_file}",
            ]
        )

    def daemon_reload(self) -> None:
        self.reload_calls += 1


def write_binding(module, path: Path) -> str:
    path.write_text(
        "\n".join(
            [
                "# VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_OPERATOR_BINDING_V1",
                f"# custody_store_dir={module.CUSTODY_STORE}",
                "[Service]",
                f"Environment={module.CUSTODIAN_SOCKET_ENV}={module.CUSTODIAN_SOCKET}",
                f"Environment={module.CUSTODIAN_FP_ENV}={'d9' * 32}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    path.chmod(0o600)
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_dynamic_proof(module) -> None:
    with tempfile.TemporaryDirectory(
        prefix="void-precision-host-control-v1-"
    ) as raw:
        temp = Path(raw)
        dropin = temp / "binding.conf"
        gate = temp / "gates.conf"
        store = temp / "custody-store"
        sock = temp / "custodian.sock"

        gate.write_text(
            "Environment="
            "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_"
            "RUNTIME_SUBMISSION_ENABLED=0\n",
            encoding="utf-8",
        )
        gate.chmod(0o600)

        original = {
            "EXPECTED_HOST": module.EXPECTED_HOST,
            "EXPECTED_OPERATOR_UID": module.EXPECTED_OPERATOR_UID,
            "BINDING_DROPIN": module.BINDING_DROPIN,
            "CUSTODY_STORE": module.CUSTODY_STORE,
            "CUSTODIAN_SOCKET": module.CUSTODIAN_SOCKET,
        }
        module.EXPECTED_HOST = socket.gethostname()
        module.EXPECTED_OPERATOR_UID = os.getuid()
        module.BINDING_DROPIN = dropin
        module.CUSTODY_STORE = store
        module.CUSTODIAN_SOCKET = sock

        try:
            binding_sha = write_binding(module, dropin)

            backend = FakeBackend(module, dropin, gate)
            inspect = module.run_operation(
                backend,
                operation=module.OP_INSPECT,
                confirmation=module.CONFIRMATIONS[module.OP_INSPECT],
                expected_main_sha="a" * 40,
                expected_binding_sha256=binding_sha,
            )
            require(inspect["status"] == "green", "inspect green")
            require(backend.reload_calls == 0, "inspect must not reload")

            backend = FakeBackend(module, dropin, gate)
            reload_result = module.run_operation(
                backend,
                operation=module.OP_RELOAD,
                confirmation=module.CONFIRMATIONS[module.OP_RELOAD],
                expected_main_sha="a" * 40,
                expected_binding_sha256=binding_sha,
            )
            require(backend.reload_calls == 1, "reload exactly once")
            require(
                reload_result["main_pid_before"]
                == reload_result["main_pid_after"],
                "pid stable",
            )
            require(
                reload_result["service_restart"] is False,
                "restart remains false",
            )
            require(
                reload_result["credential_read"] is False,
                "credential authority zero",
            )
            require(
                reload_result["transaction_broadcast"] is False,
                "broadcast authority zero",
            )
            require(
                reload_result["money_movement"] is False,
                "money authority zero",
            )

            backend = FakeBackend(module, dropin, gate)
            try:
                module.run_operation(
                    backend,
                    operation=module.OP_RELOAD,
                    confirmation="wrong",
                    expected_main_sha="a" * 40,
                    expected_binding_sha256=binding_sha,
                )
                raise AssertionError("wrong confirmation accepted")
            except module.Hold as error:
                require(
                    str(error) == "confirmation_mismatch",
                    "wrong confirmation reason",
                )
            require(
                backend.reload_calls == 0,
                "wrong confirmation blocks before reload",
            )

            backend = FakeBackend(module, dropin, gate, pid_after=424243)
            try:
                module.run_operation(
                    backend,
                    operation=module.OP_RELOAD,
                    confirmation=module.CONFIRMATIONS[module.OP_RELOAD],
                    expected_main_sha="a" * 40,
                    expected_binding_sha256=binding_sha,
                )
                raise AssertionError("PID change accepted")
            except module.Hold as error:
                require(
                    str(error) == "void_node_main_pid_changed",
                    "PID change fails closed",
                )
        finally:
            for key, value in original.items():
                setattr(module, key, value)


def run_static_proof() -> None:
    helper_bytes = HELPER.read_bytes()
    require(
        hashlib.sha256(helper_bytes).hexdigest() == EXPECTED_HELPER_SHA,
        "helper SHA pinned",
    )

    tree = ast.parse(helper_bytes.decode("utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(
            node.func, ast.Attribute
        ):
            require(
                node.func.attr not in {"system", "popen"},
                "no shell execution primitives",
            )
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "eval"
        ):
            raise AssertionError("eval forbidden")

    host = HOST_WORKFLOW.read_text(encoding="utf-8")
    require("workflow_dispatch:" in host, "dispatch trigger")
    require(
        "pull_request:" not in host and "push:" not in host,
        "host workflow dispatch-only",
    )
    require("permissions: {}" in host, "no token permissions")
    require(
        "runs-on: [self-hosted, Linux, X64, void-precision-control-v1]"
        in host,
        "exact self-hosted runner labels",
    )
    require("actions/checkout" not in host, "no checkout on control runner")
    require("refs/heads/main" in host, "main ref lock")
    require(EXPECTED_HELPER_SHA in host, "workflow pins helper SHA")
    require(EXPECTED_BINDING_SHA in host, "workflow pins binding SHA")
    require('sudo -n "$HELPER"' in host, "installed helper only")
    require(
        not REMOVED_HOSTED_PROOF_WORKFLOW.exists(),
        "GitHub-hosted proof workflow must stay absent",
    )

    sudoers = SUDOERS.read_text(encoding="utf-8")
    require(
        "void-gh-runner ALL=(root) NOPASSWD: "
        "VOID_PRECISION_HOST_CONTROL_V1" in sudoers,
        "narrow sudo alias",
    )
    for forbidden in ("ALL=(ALL)", "/bin/bash", "/bin/sh", "systemctl"):
        require(forbidden not in sudoers, f"sudoers forbids {forbidden}")


def main() -> None:
    module = load_helper()
    require(
        module.CONFIRMATIONS
        == {
            "inspect_custodian_binding":
                "voidPrecisionInspectCustodianBindingV1",
            "daemon_reload_custodian_binding":
                "voidPrecisionDaemonReloadCustodianBindingV1",
        },
        "closed confirmations",
    )
    require(module.AUTHORITY["credential_read"] is False, "credential zero")
    require(module.AUTHORITY["service_restart"] is False, "restart zero")
    require(
        module.AUTHORITY["transaction_broadcast"] is False,
        "broadcast zero",
    )
    require(module.AUTHORITY["money_movement"] is False, "money zero")

    run_static_proof()
    run_dynamic_proof(module)

    print(MARKER)
    print("github_hosted_compute_required=false")
    print("github_hosted_proof_workflow=false")
    print("workflow_dispatch_only=true")
    print("main_ref_only=true")
    print("self_hosted_control_runner_only=true")
    print("self_hosted_checkout=false")
    print("github_token_permissions=none")
    print("dedicated_runner_user_required=true")
    print("installed_helper_sha_pinned=true")
    print("closed_operation_count=2")
    print("daemon_reload_only_mutation=true")
    print("service_restart=false")
    print("credential_read=false")
    print("rpc_call=false")
    print("transaction_broadcast=false")
    print("money_movement=false")
    print("runner_installation_performed=false")


if __name__ == "__main__":
    main()
