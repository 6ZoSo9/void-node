#!/usr/bin/env node
// Source-only E2 policy admission and actual dependency selector; no real
// credentials, source-chain payments, submissions, or live RPC calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Interface } from "ethers";
import {
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1,
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_MATERIAL_V1,
  buyVoidEpoch2CredentialSourceBindingMatchesV1,
} from "../src/economic/buy_void_epoch2_credential_source_binding_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1,
  buyVoidPresaleRequiredAccessListV1,
} from "../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1,
} from "../src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";
import {
  createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1,
} from "../src/economic/buy_void_payment_keyed_runtime_dependency_bootstrap_v1.js";

const E2 = VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1;
const FULFILLER = VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1;
const RPC = VOID_BUY_VOID_EPOCH2_PRODUCTION_RPC_URL_V1;
const BINDING = VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1;
assert.match(BINDING, /^[0-9a-f]{64}$/u);
assert.equal(VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_MATERIAL_V1.credential_id,
  VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1);
assert.equal(VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_MATERIAL_V1
  .installed_credential_verified, false);
assert.equal(VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_MATERIAL_V1
  .runtime_apply_authorized, false);
assert.equal(buyVoidEpoch2CredentialSourceBindingMatchesV1(
  BINDING, E2, RPC, FULFILLER,
), true);
assert.equal(buyVoidEpoch2CredentialSourceBindingMatchesV1(
  BINDING, E2, "http://127.0.0.1:8545/", FULFILLER,
), false);
assert.equal(buyVoidEpoch2CredentialSourceBindingMatchesV1(
  BINDING, E2, RPC, "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
), false);

const root = fs.mkdtempSync(path.join(os.tmpdir(),
  "void-e2-source-credential-binding-proof-"));
fs.chmodSync(root, 0o700);
try {
  const guardRoot = path.join(root, "guard");
  const missingCredentials = path.join(root, "unpopulated-systemd");
  const base = {
    enabled: true as const,
    credential_binding_evidence_id: "",
    epoch2_credential_source_binding_id: BINDING,
    credentials_directory: missingCredentials,
    fulfillment_wallet_address: FULFILLER,
    fulfillment_contract_address: E2,
    max_token_amount_atoms: "10000000000000000000000000",
    submission_guard_root_dir: guardRoot,
    rpc_url: RPC,
    request_timeout_ms: 5000,
    max_response_bytes: 65536,
  };
  function reject(name: string, override: Record<string, unknown>,
    expected: string) {
    const result = createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1({
      ...base, ...override,
    } as typeof base);
    assert.equal(result.ok, false, name);
    if (result.ok) throw Error(name + "_unexpected_signer_admission");
    assert.equal(result.reason, expected, name);
    assert.equal(result.credential_read_performed, false, name);
    assert.equal(result.submission_guard_write_performed, false, name);
    assert.equal(result.transaction_broadcast_performed, false, name);
    assert.equal(fs.existsSync(guardRoot), false, name);
  }
  reject("legacy_e1_evidence_forged_for_e2", {
    credential_binding_evidence_id:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  }, "payment_keyed_runtime_epoch2_legacy_credential_evidence_forbidden");
  reject("no_e2_source_id", { epoch2_credential_source_binding_id: "" },
    "payment_keyed_runtime_epoch2_source_binding_mismatch");
  reject("wrong_e2_source_id", {
    epoch2_credential_source_binding_id: "f".repeat(64),
  }, "payment_keyed_runtime_epoch2_source_binding_mismatch");
  reject("old_e1_wallet", {
    fulfillment_wallet_address:
      "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
  }, "payment_keyed_runtime_epoch2_fulfiller_mismatch");
  reject("retired_e1_contract", {
    fulfillment_contract_address:
      "0xa40a43adfd174f88309173cb3daa6e09c10154a7",
  }, "payment_keyed_runtime_current_epoch2_target_required");
  reject("retired_e1_rpc", {
    rpc_url: "http://127.0.0.1:8545/",
  }, "payment_keyed_runtime_epoch2_rpc_not_selected");
  reject("remote_rpc", {
    rpc_url: "http://198.51.100.1:18553/",
  }, "payment_keyed_runtime_epoch2_rpc_not_selected");
  reject("unexpected_contract", {
    fulfillment_contract_address:
      "0x1111111111111111111111111111111111111111",
  }, "payment_keyed_runtime_current_epoch2_target_required");

  const candidate = createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1(
    base,
  );
  if (!candidate.ok) throw Error(
    "source_valid_e2_bootstrap_held:" + candidate.reason,
  );
  assert.equal(candidate.status, "ready");
  assert.equal(candidate.credential_id,
    VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_ID_V1);
  assert.equal(candidate.credential_signer_marker,
    VOID_BUY_VOID_EPOCH2_FULFILLER_CREDENTIAL_SIGNER_V1);
  assert.equal(candidate.credential_binding_evidence_id, null);
  assert.equal(candidate.epoch2_credential_source_binding_id, BINDING);
  assert.equal(candidate.epoch2_credential_installed_verified, false);
  assert.equal(candidate.credential_read_performed, false);
  assert.equal(candidate.signing_performed, false);
  assert.equal(candidate.transaction_broadcast_performed, false);
  assert.equal(await candidate.dependencies.signer.get_address(), FULFILLER);

  const calldata = new Interface([
    "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
  ]).encodeFunctionData("fulfill", [
    "0x" + "1".repeat(64),
    "0x" + "2".repeat(40),
    2n * 10n ** 18n,
  ]);
  const tx = {
    type: 2 as const, chainId: 2050n, nonce: 0,
    gasLimit: 231582n, maxFeePerGas: 0n, maxPriorityFeePerGas: 0n,
    to: E2, value: 0n as const, data: calldata,
    accessList: buyVoidPresaleRequiredAccessListV1(E2),
  };
  await assert.rejects(
    () => candidate.dependencies.signer.sign_transaction(tx),
    /payment_keyed_runtime_credential_signer_not_ready:/u,
    "source binding must not authorize signing without a real separate E2 credential",
  );
  assert.equal(candidate.transaction_broadcast_performed, false);
  assert.equal(candidate.money_movement_performed, false);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log("VOID_BUY_VOID_EPOCH2_RUNTIME_CREDENTIAL_SOURCE_BINDING_V1_GREEN");
console.log("e2_source_selector_is_not_signer_custody_evidence=true");
console.log("e1_source_evidence_cannot_grant_e2=true");
console.log("distinct_e2_credential_is_selected_not_read_at_bootstrap=true");
console.log("missing_e2_credential_signing_hold_without_broadcast=true");
console.log("historical_e1_credential_unchanged=true");
console.log("runtime_or_sale_activation=false");
