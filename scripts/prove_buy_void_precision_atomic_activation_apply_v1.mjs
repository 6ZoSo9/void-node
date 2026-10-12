#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1,
  renderVoidBuyVoidPrecisionAtomicActivationDropinV1,
} from "../tools/void-buy-void-precision-atomic-activation-preflight-v1.mjs";

const ROOT = process.cwd();
const APPLY_WRAPPER = path.join(
  ROOT,
  "ops/precision/void_precision_buy_void_atomic_activation_apply_v1.sh",
);
const STAGE_WRAPPER = path.join(
  ROOT,
  "ops/precision/void_precision_buy_void_atomic_activation_stage_v1.sh",
);

const LIVE_CONFIGURATION_SHA256 =
  "88513c7982057b95380b9029157df9414203033d463aba9534d96bfc2854c14f";
const LIVE_DROPIN_SHA256 =
  "2772e133833575e1ed9042ff3a4f114eccfb378c6a5655dcfaeb16823c068bb9";
const DORMANT_CONFIGURATION_SHA256 =
  "f5366e8f24d664b7dbfebba5d39b04d2ee7ac9e1a98064190a1e133b6c2a5e87";
const DORMANT_DROPIN_SHA256 =
  "13e1571f1278809527a629812631e4c0413a1066ff000dc4befa341c7b17ebf7";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const live = renderVoidBuyVoidPrecisionAtomicActivationDropinV1({
  generation_id: "voidbvpcg1_" + LIVE_CONFIGURATION_SHA256,
  configuration_sha256: LIVE_CONFIGURATION_SHA256,
  mode: "live_apply",
});
const dormant = renderVoidBuyVoidPrecisionAtomicActivationDropinV1({
  generation_id: "voidbvpcg1_" + DORMANT_CONFIGURATION_SHA256,
  configuration_sha256: DORMANT_CONFIGURATION_SHA256,
  mode: "dormant_rollback",
});

assert.equal(
  live.basename,
  VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_DROPIN_BASENAME_V1,
);
assert.equal(live.sha256, LIVE_DROPIN_SHA256);
assert.equal(dormant.sha256, DORMANT_DROPIN_SHA256);
assert.equal(sha256(Buffer.from(live.bytes, "utf8")), LIVE_DROPIN_SHA256);
assert.equal(sha256(Buffer.from(dormant.bytes, "utf8")), DORMANT_DROPIN_SHA256);
for (const gate of [
  "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
]) {
  assert(live.bytes.includes(`Environment=${gate}=1`), gate + " live");
}
assert(dormant.bytes.includes(
  "Environment=VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=1",
));
for (const gate of [
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
]) {
  assert(dormant.bytes.includes(`Environment=${gate}=0`), gate + " dormant");
}

const source = fs.readFileSync(APPLY_WRAPPER, "utf8");
const stageSource = fs.readFileSync(STAGE_WRAPPER, "utf8");

for (const required of [
  'APPLY="${APPLY:-0}"',
  'CONFIRM="${CONFIRM:-}"',
  'EXPECTED_HOST="zoso-Precision-Tower-7810"',
  'CANONICAL_REMOTE_URL="https://github.com/6ZoSo9/void-node.git"',
  'test "$head" = "$remote_main"',
  'test ! -e "$ACTIVE_DROPIN" && test ! -L "$ACTIVE_DROPIN"',
  'exec "$BASH_BIN" --noprofile --norc "$STAGE_WRAPPER"',
  "fresh_atomic_preflight_green=true",
  "stage_binds_exact_fresh_preflight_log=true",
  "wrapper_fresh_preflight_execution_proven=true",
  "stage_manifest_preflight_authority=false",
  'status") != "ATOMIC_ACTIVATION_PREFLIGHT_GREEN_NOT_AUTHORIZED"',
  'expected_confirmation="activate-buy-void-precision-atomic-v1:${live_configuration_sha256}:${live_dropin_sha256}"',
  'test "$CONFIRM" = "$expected_confirmation"',
  'if [ "$APPLY" = "0" ]; then',
  'status=PLAN_GREEN_NO_MUTATION',
  'atomic_install "$live_path" "$ACTIVE_DROPIN" "$live_dropin_sha256"',
  'systemctl --user daemon-reload',
  'configured_gate_check live',
  'systemctl --user restart "$UNIT"',
  'wait_for_private_runtime live',
  'env.get("VOID_BUY_REQUESTS_ENABLED") == "1"',
  'raise SystemExit("public_buy_request_intake_unexpectedly_enabled")',
  'atomic_install "$ROLLBACK_PATH" "$ACTIVE_DROPIN" "$EXPECTED_ROLLBACK_SHA256"',
  'configured_gate_check dormant',
  'wait_for_private_runtime dormant',
  'automatic_rollback_on_failure=true',
  'public_buy_request_intake_activation=false',
  'transaction_command_invocation=false',
  'transaction_signing=false',
  'transaction_broadcast=false',
  'funds_movement=false',
  'status=PRIVATE_BUY_VOID_RUNTIME_ACTIVATION_GREEN_PUBLIC_INTAKE_HOLD',
  'public_presale_activation=false',
  'wc_void_public_activation=false',
  'canary_required=true',
  'os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)',
  'os.replace(temp, destination)',
  'os.fsync(fd)',
  'os.fsync(dirfd)',
  'ensure_private_direct_dir "$HOME/.local/state" "local_state_dir"',
  'active_dropin_dir_owner_mismatch',
]) {
  assert(source.includes(required), required);
}

assert(stageSource.includes("FRESH ATOMIC PREFLIGHT"));
assert(stageSource.includes('exec "$bash_bin" --noprofile --norc'));
assert(stageSource.includes("fresh_atomic_preflight_green=true"));

const stageInvokeAt = source.indexOf(
  'exec "$BASH_BIN" --noprofile --norc "$STAGE_WRAPPER"',
);
const confirmationAt = source.indexOf(
  'test "$CONFIRM" = "$expected_confirmation"',
);
const evidenceAt = source.indexOf(
  'ensure_private_direct_dir "$HOME/.local/state" "local_state_dir"',
);
const liveInstallAt = source.indexOf(
  'atomic_install "$live_path" "$ACTIVE_DROPIN" "$live_dropin_sha256"',
);
const daemonReloadAt = source.indexOf("systemctl --user daemon-reload", liveInstallAt);
const restartAt = source.indexOf('systemctl --user restart "$UNIT"', daemonReloadAt);
const liveWaitAt = source.indexOf("wait_for_private_runtime live", restartAt);
const successAt = source.indexOf(
  "status=PRIVATE_BUY_VOID_RUNTIME_ACTIVATION_GREEN_PUBLIC_INTAKE_HOLD",
  liveWaitAt,
);

assert(stageInvokeAt >= 0);
assert(confirmationAt > stageInvokeAt);
assert(evidenceAt > confirmationAt);
assert(liveInstallAt > evidenceAt);
assert(daemonReloadAt > liveInstallAt);
assert(restartAt > daemonReloadAt);
assert(liveWaitAt > restartAt);
assert(successAt > liveWaitAt);

const planAt = source.indexOf('if [ "$APPLY" = "0" ]; then');
const planExitAt = source.indexOf("exit 0", planAt);
assert(planAt >= 0);
assert(planExitAt > planAt);
assert(planExitAt < evidenceAt);
assert(planExitAt < liveInstallAt);

const rollbackAt = source.indexOf("rollback(){");
const rollbackInstallAt = source.indexOf(
  'atomic_install "$ROLLBACK_PATH" "$ACTIVE_DROPIN" "$EXPECTED_ROLLBACK_SHA256"',
  rollbackAt,
);
const rollbackReloadAt = source.indexOf("systemctl --user daemon-reload", rollbackInstallAt);
const rollbackGateAt = source.indexOf("configured_gate_check dormant", rollbackReloadAt);
const rollbackRestartAt = source.indexOf('systemctl --user restart "$UNIT"', rollbackGateAt);
const rollbackWaitAt = source.indexOf("wait_for_private_runtime dormant", rollbackRestartAt);
assert(rollbackAt >= 0);
assert(rollbackInstallAt > rollbackAt);
assert(rollbackReloadAt > rollbackInstallAt);
assert(rollbackGateAt > rollbackReloadAt);
assert(rollbackRestartAt > rollbackGateAt);
assert(rollbackWaitAt > rollbackRestartAt);

assert.equal(source.includes("/__void/operator/buy-void-payment-keyed-full-runtime-v1/command"), false);
assert.equal(source.includes("eth_sendRawTransaction"), false);
assert.equal(source.includes("VOID_BUY_REQUESTS_ENABLED=1"), false);
assert.equal(source.includes("WCVoidMarketVault"), false);
assert.equal(source.includes("VOID_WC_"), false);
assert.equal(source.includes("git push"), false);

const workflow = fs.readFileSync(
  ".github/workflows/buy-void-precision-atomic-activation-apply-v1.yml",
  "utf8",
);
assert(workflow.includes('ref: ${{ github.event.pull_request.head.sha || github.sha }}'));
assert.match(workflow, /persist-credentials:\s*false/u);
assert(workflow.includes("bash -n ops/precision/void_precision_buy_void_atomic_activation_apply_v1.sh"));
assert(workflow.includes("node scripts/prove_buy_void_precision_atomic_activation_apply_v1.mjs"));

console.log("VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_APPLY_V1_PROOF");
console.log("live_dropin_sha256=" + LIVE_DROPIN_SHA256);
console.log("rollback_dropin_sha256=" + DORMANT_DROPIN_SHA256);
console.log("fresh_stage_wrapper_required=true");
console.log("stage_manifest_not_authority=true");
console.log("dynamic_exact_confirmation_bound=true");
console.log("plan_mode_precedes_mutation=true");
console.log("atomic_dropin_install_fsync_bound=true");
console.log("single_controlled_restart_path_bound=true");
console.log("live_runtime_requalification_bound=true");
console.log("automatic_dormant_rollback_bound=true");
console.log("public_buy_request_intake_forbidden=true");
console.log("transaction_command_invocation=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
console.log("VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_APPLY_V1_GREEN");
