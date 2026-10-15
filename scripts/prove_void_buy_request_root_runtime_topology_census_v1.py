#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_request_root_runtime_topology_census_v1.py"

spec = importlib.util.spec_from_file_location(
    "void_buy_request_root_runtime_topology_census_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()

assert module.METADATA_POLICY_ID == "current_private_request_root_0700_0600_v1"
assert module.FUTURE_CUSTODY_READABLE_PROFILE == "future_ipc_group_request_root_0750_0640"
assert module.EXPECTED_HOSTNAME == "zoso-Precision-Tower-7810"
assert module.EXPECTED_USER == "zoso"
assert module.RUNTIME_UNIT == "void-node-live.service"
assert module.NODE_HOST == "127.0.0.1"
assert module.NODE_PORT == 4100
assert str(module.DEFAULT_REQUEST_RELATIVE) == ".runtime/public-buy-void-requests-v1"
assert module.REQUESTS_NAME == "requests.jsonl"
assert module.OPERATOR_EVENTS_NAME == "operator-events.jsonl"
assert module.MAX_REQUESTS_BYTES == 64 * 1024 * 1024
assert module.MAX_OPERATOR_EVENTS_BYTES == 64 * 1024 * 1024

source = TARGET.read_text(encoding="utf-8")
for required in [
    "request_root_live_path_qualified",
    "request_root_override_absence_proven",
    "future_custody_readable_profile_accepted",
    "future_profile_requires_successor_census",
    "REQUEST_ROOT_QUALIFIED_FOR_CUSTODY_INSTALL_PLAN",
    "REQUEST_ROOT_STATUS_BINDING_REQUIRED",
    "metadata_qualified_candidate_count",
    "confirmed_closeout_status",
    "runtime_http_listener_binding",
    "owned_by_runtime_pid",
    "process_environment_access",
    "request_payment_contents_read",
]:
    assert required in source, required

for forbidden in [
    "/environ",
    "VOID_BUY_REQUEST_DIR=",
    "requests.jsonl\").read",
    "operator-events.jsonl\").read",
    "systemctl restart",
    "systemctl start",
    "systemctl stop",
    "systemctl enable",
    "systemctl disable",
    "sudo ",
]:
    assert forbidden not in source, forbidden

print("VOID_BUY_VOID_REQUEST_ROOT_RUNTIME_TOPOLOGY_CENSUS_V1_PROOF_GREEN")
print("process_environment_access=false")
print("request_payment_contents_read=false")
print("loopback_get_only=true")
print("service_mutation=false")
print("production_gate_ready=false")
