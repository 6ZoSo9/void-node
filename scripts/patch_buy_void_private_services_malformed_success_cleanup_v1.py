#!/usr/bin/env python3
from pathlib import Path

path = Path("src/economic/buy_void_production_private_services_operator_v1.ts")
text = path.read_text(encoding="utf-8")
old = '''  if (!startedValid) {
    const cleanup = raw.status === "started"
      ? await cleanupUnexpectedActivationResult(raw)
      : {
          custodian_active: flags.custodian_active,
          broadcaster_active: flags.broadcaster_active,
        };
'''
new = '''  if (!startedValid) {
    const unexpectedLiveServiceState =
      typeof services?.custodian?.stop === "function" ||
      typeof services?.broadcaster?.stop === "function" ||
      flags.custodian_active ||
      flags.broadcaster_active;
    const cleanup = unexpectedLiveServiceState
      ? await cleanupUnexpectedActivationResult(raw)
      : {
          custodian_active: flags.custodian_active,
          broadcaster_active: flags.broadcaster_active,
        };
'''
count = text.count(old)
if count != 1:
    raise SystemExit(f"expected_exact_anchor_once: found={count}")
path.write_text(text.replace(old, new), encoding="utf-8")
print("VOID_BUY_VOID_PRIVATE_SERVICES_MALFORMED_SUCCESS_CLEANUP_V1_PATCH_APPLIED")
