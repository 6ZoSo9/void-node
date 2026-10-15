#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import io
import pathlib
from contextlib import redirect_stdout

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_user_manager_query_protected_replace_v2.py"

spec = importlib.util.spec_from_file_location(
    "void_buy_void_user_manager_query_protected_replace_v2",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()
lock = module.accepted_lock()
assert lock["lock_id"] == module.LOCK_ID
assert lock["candidate_accepted"] is True
assert lock["kernel_capability_state_bound"] is True
assert lock["private_users_false_required"] is True
assert lock["install_authorized"] is False
assert module.PREEXEC_SHA256 == "8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11"
assert module.V1_QUERY_SHA256 == "98fb0de18c7e2acc133db38f15036acc8345f503b2dd196cc07193523dd0a435"
assert module.V2_QUERY_SHA256 == "d11304cb35be20dd4775677a2d5bf41c09f0f0b7a747ec7a8fea952e4bc8639c"
assert module.CONFIRM_APPLY != module.CONFIRM_ROLLBACK

buf = io.StringIO()
with redirect_stdout(buf):
    module.source_plan()
plan = buf.getvalue()
for exact in (
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "preexec_replacement=false",
    "query_atomic_exchange_required=true",
    "v1_predecessor_retained_after_success=true",
    "query_execution=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
):
    assert exact in plan, exact

text = TARGET.read_text("utf-8")
for required in (
    "RENAME_EXCHANGE = 2",
    "RENAME_NOREPLACE = 1",
    "renameat2_unavailable",
    "protected_query_state_invalid",
    "ATOMIC_EXCHANGE_ACCEPTED_USER_MANAGER_QUERY_V1_TO_V2",
    "ATOMIC_EXCHANGE_ROLLBACK_USER_MANAGER_QUERY_V2_TO_V1",
    "automatic_rollback_green=",
    "protected_query_replacement_performed=true",
    "v1_predecessor_retained=true",
    "V2_AUTHENTICATED_LIVE_QUERY_READ_ONLY_QUALIFICATION",
):
    assert required in text, required

for forbidden in (
    "subprocess.",
    "systemctl",
    "journalctl",
    "service restart",
    "os.unlink(QUERY_NAME",
    "os.unlink(PREEXEC_NAME",
):
    assert forbidden not in text, forbidden

assert text.count("RENAME_EXCHANGE") >= 4
assert "PREEXEC_NAME = \"void_buy_void_user_manager_private_unit_query_preexec_v1\"" in text
assert "QUERY_NAME = \"void_buy_void_user_manager_private_unit_query_v1\"" in text

print("VOID_BUY_VOID_USER_MANAGER_QUERY_PROTECTED_REPLACE_V2_PROOF_GREEN")
print("accepted_v2_lock_bound=true")
print("fixed_preexec_unchanged=true")
print("atomic_query_exchange_required=true")
print("v1_predecessor_retained=true")
print("automatic_failure_rollback=true")
print("query_execution=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
