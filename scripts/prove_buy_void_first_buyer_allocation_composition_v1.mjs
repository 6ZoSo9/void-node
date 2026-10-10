#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCKED = Object.freeze([
  ["src/economic/buy_void_verified_allocation_replay_binding_v1.ts",
    "895a429ec7a2ef554552cdaa821731d7a645a701"],
  ["src/economic/buy_void_allocation_reservation_ledger_v1.ts",
    "66617a89d5ad9f81b5a21d98cca55fcda6902a80"],
  ["scripts/prove_buy_void_verified_allocation_replay_binding_v1.mjs",
    "5d82d77996ba5d94e3d01c953f7493d1f4401ab2"],
  ["scripts/prove_buy_void_allocation_reservation_plain_data_v1.ts",
    "b54025d4e5cbbe8e45d487a6b32c69dc7650fcfc"],
  ["scripts/prove_buy_void_allocation_reservation_ledger_v1.ts",
    "4483e3a1e66365fcb541ad4025cb10f0bf10c582"],
  ["ops/mainnet0/usdc-to-void-presale-allocation-reservation-record-v1-proof.sh",
    "6f220e3c468277cc4e8eb88e3ba3d9a46ca62e2f"],
]);
function gitBlobSha1(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}
for (const [file, expected] of LOCKED) {
  const absolute = path.join(ROOT, file);
  const actual = gitBlobSha1(fs.readFileSync(absolute));
  assert.equal(actual, expected, "composed_source_or_proof_drift:" + file);
}
// The test harness executes existing read-only, purely synthetic proofs.
const testEnv = {
  PATH: "/usr/bin:/bin",
  HOME: "/nonexistent",
  LANG: "C",
  TZ: "UTC",
};
function prove(label, args, markers) {
  const stdout = execFileSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: testEnv,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const lines = new Set(stdout.split(/\r?\n/u));
  for (const marker of markers) {
    assert.ok(lines.has(marker), label + "_missing_marker:" + marker);
  }
}
prove("original_ledger_contract", [
  "--import", "tsx", "scripts/prove_buy_void_allocation_reservation_ledger_v1.ts"
], [
  "allocation_reservation_write=false",
  "production_gate_ready=false",
  "funds_movement=false",
]);
prove("callback_free_allocation", [
  "--import", "tsx", "scripts/prove_buy_void_allocation_reservation_plain_data_v1.ts"
], [
  "VOID_BUY_VOID_ALLOCATION_LEDGER_PLAIN_DATA_V1_GREEN",
  "canonical_record_jsonl_unchanged=true",
  "idempotent_buffer_replay_unchanged=true",
  "ambient_Object_toJSON_executed=false",
  "native_buffer_hook_calls=0",
  "detached_buffer_rejected=true",
  "production_allocation_mutation_ready=false",
  "funds_moved=false",
]);
prove("first_original_wallet_verified_replay", [
  "scripts/prove_buy_void_verified_allocation_replay_binding_v1.mjs"
], [
  "VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1_SOURCE_GREEN",
  "first_original_buyer_delivery_wallet_required=true",
  "later_buyer_wallet_backfill_cannot_authorize_verified_payment=true",
  "exact_canonical_allocation_history_replay_idempotent=true",
  "caller_buffer_length_override_cannot_hide_prior_payment=true",
  "buffer_proxy_getter_shared_and_detached_intake_held=true",
  "allocation_write_or_runtime_activation=false",
  "funds_movement=false",
]);

const receipt = [
  "VOID_BUY_VOID_FIRST_BUYER_ALLOCATION_PLAIN_COMPOSITION_V1_GREEN",
  "verified_replay_source_blob=895a429ec7a2ef554552cdaa821731d7a645a701",
  "allocation_ledger_source_blob=66617a89d5ad9f81b5a21d98cca55fcda6902a80",
  "original_first_buyer_wallet_required=true",
  "caller_buffer_length_override_cannot_hide_prior_payment=true",
  "allocation_callback_free_snapshot=true",
  "allocation_idempotent_replay_preserved=true",
  "customer_ledger_mutation=false",
  "production_allocation_mutation_ready=false",
  "custody_service_reserve_or_recover=false",
  "deployed_artifact_generation_verified=false",
  "production_payment_to_allocation_ready=false",
  "presale_activation=false",
  "funds_movement=false",
];
process.stdout.write(receipt.join("\n") + "\n");
