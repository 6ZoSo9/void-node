#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_service_quiescence_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "90358ef1df3ecfa3daeee39452ffd025e9a8d86e"

def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()

assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_service_quiescence_census_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_SERVICE_QUIESCENCE_CENSUS_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_service_quiescence_census_v1"
)
assert module.UNIT == "void-buy-allocation-custody-v1.service"
assert module.RUNTIME_DIR == Path("/run/void-allocation-custody-v1")
assert module.SOCKET_PATH == Path(
    "/run/void-allocation-custody-v1/custody.sock"
)
assert module.SERVICE_USER == "void-buy-custody"
assert module.SERVICE_GROUP == "void-buy-custody"
assert module.IPC_GROUP == "void-buy-custody-ipc"
assert module.ARCHIVE_LOCK_GIT_BLOB == (
    "edb4ea2b833373ab387762e45ba7da4032c860f3"
)
assert module.ARCHIVE_LOCK_SHA256 == (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)
assert module.BOOTSTRAP_POLICY_BLOB == (
    "63eb0aa4e4211869284d389839e71e23554d62b1"
)
assert module.SOCKET_POLICY_BLOB == (
    "9d4b97a822b50c525722f0decae9205a9aebeb4a"
)

lock = module.verify_inputs()
assert lock["archive_candidate_accepted"] is True
assert lock["immutable_root_install"] is False
assert lock["runtime_integration"] is False
assert lock["payment_acceptance"] is False
assert lock["public_presale_activation"] is False
assert lock["funds_movement"] is False

quiet = module.parse_systemctl_show(
    "\n".join([
        "Id=void-buy-allocation-custody-v1.service",
        "LoadState=not-found",
        "ActiveState=inactive",
        "SubState=dead",
        "UnitFileState=",
        "MainPID=0",
        "ControlPID=0",
        "FragmentPath=",
        "NeedDaemonReload=no",
        "",
    ])
)
absent_runtime = {
    "path": "/run/void-allocation-custody-v1",
    "state": "absent",
}
absent_socket = {
    "path": "/run/void-allocation-custody-v1/custody.sock",
    "state": "absent",
}
quiet_result = module.classify(quiet, absent_runtime, absent_socket)
assert quiet_result["unit_absent_observed"] is True
assert quiet_result["service_inactive_observed"] is True
assert quiet_result["socket_absent_observed"] is True
assert quiet_result["service_quiescence_candidate"] is True
assert quiet_result["service_quiescence_proven"] is False
assert quiet_result["live_process_binding_checked"] is False

loaded = dict(quiet)
loaded["LoadState"] = "loaded"
loaded["UnitFileState"] = "disabled"
loaded_result = module.classify(loaded, absent_runtime, absent_socket)
assert loaded_result["service_inactive_observed"] is True
assert loaded_result["service_quiescence_candidate"] is True
assert loaded_result["service_quiescence_proven"] is False
assert loaded_result["load_state_safe_observed"] is True

for unsafe_load_state in ("error", "bad-setting", "future-unknown"):
    unsafe = dict(loaded)
    unsafe["LoadState"] = unsafe_load_state
    try:
        module.classify(unsafe, absent_runtime, absent_socket)
    except module.CensusHold as exc:
        assert (
            "systemctl_load_state_unsafe:" + unsafe_load_state
            in str(exc)
        ), (unsafe_load_state, str(exc))
    else:
        raise AssertionError("unsafe_load_state_accepted:" + unsafe_load_state)

enabled = dict(loaded)
enabled["UnitFileState"] = "enabled"
assert module.classify(
    enabled,
    absent_runtime,
    absent_socket,
)["service_quiescence_candidate"] is False

reload_pending = dict(loaded)
reload_pending["NeedDaemonReload"] = "yes"
assert module.classify(
    reload_pending,
    absent_runtime,
    absent_socket,
)["service_quiescence_candidate"] is False

runtime_present = {
    "path": "/run/void-allocation-custody-v1",
    "state": "present",
    "kind": "directory",
    "uid": 994,
    "gid": 981,
    "mode": "0750",
    "dev": 1,
    "ino": 2,
}
assert module.classify(
    loaded,
    runtime_present,
    absent_socket,
)["service_quiescence_candidate"] is False

active = dict(loaded)
active["ActiveState"] = "active"
active["SubState"] = "running"
active["MainPID"] = "1234"
active_result = module.classify(active, absent_runtime, absent_socket)
assert active_result["service_quiescence_candidate"] is False

socket_present = {
    "path": "/run/void-allocation-custody-v1/custody.sock",
    "state": "present",
    "kind": "socket",
    "uid": 994,
    "gid": 981,
    "mode": "0660",
    "dev": 1,
    "ino": 2,
}
socket_result = module.classify(quiet, absent_runtime, socket_present)
assert socket_result["service_quiescence_candidate"] is False

module.self_test()

# The production write-free claim requires -B before normal module imports.
# Run the exact entrypoint with isolation but intentionally omit -B; bootstrap
# must HOLD before the ordinary imports/census path.
without_b = subprocess.run(
    [sys.executable, "-I", str(TARGET), "--self-test"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=10,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert without_b.returncode == 2, without_b
assert (
    "reason=python_isolated_unoptimized_nobytecode_mode_required"
    in without_b.stdout
), without_b.stdout
assert "production_filesystem_write=false" in without_b.stdout
assert "self_test_temporary_filesystem_write=false" in without_b.stdout

source = TARGET.read_text(encoding="utf-8")
assert 'print("read_only=true")' not in source
assert 'print("filesystem_write=false")' not in source
assert 'print("production_read_only=true")' in source
assert 'print("production_filesystem_write=false")' in source
assert 'self_test_temporary_filesystem_write=' in source
pre_self_test = source.split("def self_test()", 1)[0]
systemctl_block = pre_self_test.split("def systemctl_show()", 1)[1].split(
    "def observe_path(", 1
)[0]

assert "subprocess.run(" in systemctl_block
assert "check=False" in systemctl_block
assert '"--system"' in systemctl_block
assert '"show"' in systemctl_block
assert "SYSTEMCTL_PROPERTIES" in systemctl_block
assert "shell=True" not in systemctl_block
for forbidden_action in (
    '"start"',
    '"stop"',
    '"restart"',
    '"enable"',
    '"disable"',
    '"daemon-reload"',
    '"mask"',
    '"unmask"',
    '"kill"',
):
    assert forbidden_action not in systemctl_block, forbidden_action

assert pre_self_test.count("subprocess.run(") == 1
for forbidden in (
    "os.write(",
    "os.pwrite(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "socket.socket(",
    "connect(",
    "sudo ",
):
    assert forbidden not in pre_self_test, forbidden

for required in (
    "systemd_show_only",
    "service_quiescence_candidate",
    "service_quiescence_proven",
    "live_process_binding_checked",
    "process_environment_read",
    "process_arguments_read",
    "request_history_read",
    "custody_data_read",
    "credential_access",
    "wallet_or_signer_access",
    "install_target_selected",
    "existing_target_replaced",
    "runtime_integration",
    "payment_acceptance",
    "public_presale_activation",
    "funds_movement",
):
    assert required in source, required

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_SERVICE_QUIESCENCE_CENSUS_V1_PROOF_GREEN")
print("archive_lock_exact=true")
print("bootstrap_policy_exact=true")
print("socket_runtime_policy_exact=true")
print("canonical_system_unit_bound=true")
print("canonical_socket_path_bound=true")
print("systemctl_show_only=true")
print("systemctl_mutating_verbs_absent=true")
print("exact_source_blob_asserted=true")
print("inactive_service_candidate_classified=true")
print("unsafe_systemd_load_states_rejected=true")
print("python_no_bytecode_mode_required=true")
print("without_dash_b_bootstrap_hold=true")
print("enabled_unit_rejected=true")
print("pending_daemon_reload_rejected=true")
print("lingering_runtime_directory_rejected=true")
print("active_service_rejected=true")
print("present_socket_rejected=true")
print("service_quiescence_proven=false")
print("live_process_binding_checked=false")
print("host_census_not_executed_in_ci=true")
print("production_read_only=true")
print("production_filesystem_write=false")
print("test_fixture_filesystem_write=true")
print("systemd_mutation=false")
print("daemon_reload=false")
print("service_start=false")
print("service_stop=false")
print("service_restart=false")
print("socket_connect=false")
print("socket_unlink=false")
print("request_history_read=false")
print("custody_data_read=false")
print("credential_access=false")
print("wallet_or_signer_access=false")
print("install_target_selected=false")
print("existing_target_replaced=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
