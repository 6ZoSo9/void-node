import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_MATERIAL_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";

function canonicalJson(value: unknown): string {
  const visit = (candidate: unknown): unknown => {
    if (Array.isArray(candidate)) return candidate.map(visit);
    if (candidate && typeof candidate === "object") {
      return Object.fromEntries(
        Object.entries(candidate as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, visit(nested)]),
      );
    }
    return candidate;
  };
  return JSON.stringify(visit(value));
}

const record =
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1;
assert.equal(record.observed_source_head, "c4a8a0c5129f4d771f3fb21b4e0a05041bb1735e");
assert.equal(record.credential_id, "buy-void-native-fulfillment-wallet-v1");
assert.equal(record.expected_wallet_address, "0xc884f631c3881b8b672bfcbf019c856146cd7f73");
assert.equal(record.derived_wallet_address, "0xc884f631c3881b8b672bfcbf019c856146cd7f73");
assert.equal(record.wallet_address_fingerprint_sha256, "68dd42774ebc792bb79b509ec651a9d560005d9ac0a54f7b50ce2e288ee3e498");
assert.equal(record.credential_source_mode, "600");
assert.equal(record.credential_source_size_bytes, 67);
assert.equal(record.fixed_loadcredential_binding_count, 2);
assert.equal(record.exact_wallet_binding, true);
assert.equal(record.credential_read_performed, true);
assert.equal(record.wallet_address_derivation_performed, true);
assert.equal(record.private_key_output, false);
assert.equal(record.signing_performed, false);
assert.equal(record.rpc_call_performed, false);
assert.equal(record.transaction_broadcast_performed, false);
assert.equal(record.inventory_funding_performed, false);
assert.equal(record.money_movement_performed, false);
assert.equal(record.interpretation.canonical_production_scope_only, true);
assert.equal(record.interpretation.clone_local_credential_binding_inferred, false);
assert.equal(record.interpretation.dependency_injection_authorized, false);
assert.equal(record.interpretation.delivery_runtime_enable_authorized, false);
assert.equal(record.interpretation.transaction_authorized, false);
assert.equal(record.interpretation.inventory_funding_authorized, false);

const recomputed = crypto
  .createHash("sha256")
  .update(
    canonicalJson(
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_MATERIAL_V1,
    ),
    "utf8",
  )
  .digest("hex");
assert.equal(
  recomputed,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
);

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts",
  ),
  "utf8",
);
assert.equal(source.includes("private_key:"), false);
assert.equal(source.includes("PRIVATE_KEY"), false);
assert.equal(source.includes("/home/"), false);

console.log("VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_V1_PROOF_GREEN");
console.log("canonical_production_scope_only=1");
console.log("exact_wallet_binding=1");
console.log("clone_local_credential_binding_inferred=0");
console.log("private_key_output=0");
console.log("signing=0");
console.log("rpc_call=0");
console.log("transaction_broadcast=0");
console.log("inventory_funding=0");
console.log("money_movement=0");
