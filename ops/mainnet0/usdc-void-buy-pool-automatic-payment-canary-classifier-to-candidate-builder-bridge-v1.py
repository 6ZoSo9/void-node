#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CLASSIFIER_TO_CANDIDATE_BUILDER_BRIDGE_V1"
CLASSIFIER = "ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1.py"
BUILDER = "ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1.py"

def emit(ok, bridge_state, reason, builder_ran=False, builder_output=None):
    payload = {
        "marker": MARKER,
        "ok": ok,
        "bridge": {
            "state": bridge_state,
            "reason": reason,
            "builder_ran": builder_ran
        },
        "builder_output": builder_output,
        "authority": {
            "candidate_builder_allowed": builder_ran,
            "candidate_built": bool(builder_output and builder_output.get("ok") is True),
            "ledger_write": False,
            "inventory_reserved": False,
            "fulfillment_executed": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False
        }
    }
    print(json.dumps(payload, indent=2))

def run_json(cmd, env):
    out = subprocess.check_output(cmd, env=env, text=True)
    return json.loads(out)

def main():
    rpc_input = os.environ.get("RPC_OUTCOME_INPUT_JSON")
    candidate_input = os.environ.get("CANARY_CANDIDATE_INPUT_JSON")

    if not rpc_input:
        emit(False, "blocked_missing_rpc_outcome_input", "RPC_OUTCOME_INPUT_JSON_required")
        raise SystemExit(1)

    classifier_env = os.environ.copy()
    classifier_env["RPC_OUTCOME_INPUT_JSON"] = rpc_input
    classifier_output = run_json([sys.executable, CLASSIFIER], classifier_env)
    classification = classifier_output.get("classification", {})
    state = classification.get("state")

    if state != "eligible_candidate_path":
        emit(True, "candidate_builder_blocked", f"classifier_state:{state}", False, None)
        return

    if not candidate_input:
        emit(False, "blocked_missing_candidate_input", "CANARY_CANDIDATE_INPUT_JSON_required_for_eligible_path")
        raise SystemExit(1)

    builder_env = os.environ.copy()
    builder_env["CANARY_CANDIDATE_INPUT_JSON"] = candidate_input
    builder_output = run_json([sys.executable, BUILDER], builder_env)

    if not builder_output.get("ok"):
        emit(False, "candidate_builder_failed", "builder_returned_not_ok", True, builder_output)
        raise SystemExit(1)

    emit(True, "candidate_builder_allowed_and_completed", "eligible_candidate_path", True, builder_output)

if __name__ == "__main__":
    main()
