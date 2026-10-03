import assert from "node:assert/strict";
import fs from "node:fs";
import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  classifyBuyLaunchGateV1,
  readBuyLaunchGateV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";

const production = JSON.parse(
  fs.readFileSync("ops/mainnet0/wc-void-production-candidate-v1.json", "utf8"),
);
const coupled = JSON.parse(
  fs.readFileSync("ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json", "utf8"),
);
const successor = JSON.parse(
  fs.readFileSync("ops/mainnet0/economic-evm-successor-migration-candidate-v1.json", "utf8"),
);
const current = classifyBuyLaunchGateV1({ production, coupled, successor });
assert.equal(current.ready, false);
assert.equal(current.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);
assert.deepEqual(readBuyLaunchGateV1(), current);

const readyProduction = structuredClone(production);
readyProduction.status = "source_ready";
readyProduction.coupled_activation_ready = true;
readyProduction.bounded_canary_green = true;
readyProduction.wc_ledger_persistence_verified = true;
readyProduction.quote_reserve_custody_verified = true;
readyProduction.participant_opening_claim_policy_ready = true;
readyProduction.duplicate_replay_protection_proven = true;
readyProduction.market_vault_independently_verified = true;
readyProduction.inventory_funded = true;
readyProduction.inventory_lock_proven = true;
readyProduction.market_vault_address = "0x1111111111111111111111111111111111111111";
readyProduction.market_vault_runtime_code_sha256 = "1".repeat(64);

const readyCoupled = structuredClone(coupled);
readyCoupled.status = "SOURCE_READY";
for (const key of Object.keys(readyCoupled.gates)) readyCoupled.gates[key] = true;

const ready = classifyBuyLaunchGateV1({
  production: readyProduction,
  coupled: readyCoupled,
  successor,
});
assert.equal(ready.ready, true);
assert.equal(ready.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);

for (const mutate of [
  (p, _c) => { p.status = "hold"; },
  (p, _c) => { p.coupled_activation_ready = false; },
  (_p, c) => { c.gates.bounded_canary_green = false; },
  (_p, c) => { c.shared_post_discovery_reconciliation.coupled_launch_id = "sha256:" + "0".repeat(64); },
  (_p, c) => { c.wc_void_opening.protocol_void_inventory_atoms = "1"; },
  (p, _c) => { p.authority.market_activation = true; },
]) {
  const p = structuredClone(readyProduction);
  const c = structuredClone(readyCoupled);
  mutate(p, c);
  assert.equal(
    classifyBuyLaunchGateV1({ production: p, coupled: c, successor }).ready,
    false,
  );
}

console.log("VOID_BUY_COUPLED_LAUNCH_GATE_V1_GREEN");
console.log("current_canonical_source_ready=false");
console.log("coupled_launch_id=" + VOID_BUY_COUPLED_LAUNCH_ID_V1);
console.log("source_gate_only=true");
console.log("activation_authority=false");
console.log("funds_movement=false");
