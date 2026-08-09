#!/usr/bin/env python3
from pathlib import Path

path = Path("scripts/prove_buy_void_production_terminal_closeout_operator_v1.ts")
text = path.read_text()
old = '''  "policy_fingerprint_sha256",
  "saga_action_confirmation",
  "terminal_plan_fingerprint_sha256",
  "saga_confirmation",
  "saga_id",
  "terminal_closeout_confirmation",
'''
new = '''  "policy_fingerprint_sha256",
  "saga_action_confirmation",
  "saga_confirmation",
  "saga_id",
  "terminal_closeout_confirmation",
  "terminal_plan_fingerprint_sha256",
'''
if text.count(old) != 1:
    raise SystemExit(f"expected one operator-proof key-order anchor, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
print("VOID_BUY_VOID_TERMINAL_CLOSEOUT_PLAN_BINDING_V1_PROOF_FIXUP_APPLIED")
