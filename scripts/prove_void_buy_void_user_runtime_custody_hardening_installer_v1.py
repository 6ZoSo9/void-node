#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_user_runtime_custody_hardening_installer_v1.py"
SOURCE = ROOT / "ops/systemd/void-node-live.service.d/98-buy-void-allocation-custody-runtime-hardening-v1.conf.example"

spec = importlib.util.spec_from_file_location("void_buy_void_user_runtime_custody_hardening_installer_v1", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()

source = SOURCE.read_bytes()
assert source == module.EXPECTED_DROPIN
assert module.git_blob_sha1(source) == module.EXPECTED_SOURCE_BLOB
assert module.UNIT == "void-node-live.service"
assert module.EXPECTED_HOSTNAME == "zoso-Precision-Tower-7810"
assert module.EXPECTED_USER == "zoso"

text = TARGET.read_text(encoding="utf-8")
for required in [
    "ordinary_user_required_no_sudo",
    "target_dropin_exists_with_different_bytes",
    "preexisting_exact_dropin_not_live_qualified",
    "live_runtime_capabilities_nonzero",
    "post_restart_qualification_timeout",
    "rollback_target_identity_changed",
    "runtime_state_parent_missing",
    "installation_receipt_custody_invalid",
    "STALE_INSTALLATION_RECEIPT",
    "installation_receipt_already_exists",
    "installation_receipt_identity_changed",
    "listener_set_preserved=true",
    "automatic_rollback_attempted=",
    "HARDENING_INSTALLED_GREEN",
    "ROLLBACK_GREEN",
]:
    assert required in text, required

for forbidden in [
    "systemctl --user enable",
    "systemctl --user disable",
    "systemctl --user stop",
    "sudo ",
    "User=",
    "Group=",
    "ExecStart=",
    "Environment=",
    "ReadWritePaths=",
    "SupplementaryGroups=",
    "parents=True",
]:
    assert forbidden not in text, forbidden

assert text.count('["--user", "restart", UNIT]') == 3
assert text.count('["--user", "daemon-reload"]') == 3
assert module.CONFIRM_APPLY != module.CONFIRM_ROLLBACK
assert re.fullmatch(r"[0-9a-f]{40}", module.EXPECTED_SOURCE_BLOB)

print("VOID_BUY_VOID_USER_RUNTIME_CUSTODY_HARDENING_INSTALLER_V1_PROOF_GREEN")
print("source_plan_default_inert=true")
print("exact_dropin_source_bound=true")
print("create_only_or_exact_idempotent=true")
print("differing_existing_target_holds=true")
print("pre_live_capabilities_zero_required=true")
print("success_path_restart_count=1")
print("failure_path_recovery_restart_count_max=1")
print("listener_set_equality_required=true")
print("rollback_receipt_required=true")
print("apply_authorized=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
