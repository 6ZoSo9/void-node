import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Wallet } from "ethers";

import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
} from "../src/economic/buy_void_prepared_transaction_broadcaster_submission_activation_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
} from "../src/economic/buy_void_prepared_transaction_custodian_credential_activation_v1.js";
import {
  buyVoidPreparedTransactionCredentialSignerFingerprintV1,
} from "../src/economic/buy_void_prepared_transaction_credential_signer_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
} from "../src/economic/buy_void_prepared_transaction_broadcast_custody_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1,
  createBuyVoidProductionActivationPlanV1,
} from "../src/economic/buy_void_production_activation_plan_v1.js";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

const wallet = new Wallet(`0x${"1".repeat(64)}`).address.toLowerCase();
const signerFingerprint =
  buyVoidPreparedTransactionCredentialSignerFingerprintV1(wallet);

const validPolicy = {
  custodian: {
    socket_path: "/run/void/buy-void/custodian.sock",
    custody_store_dir: "/var/lib/void/buy-void/custody",
    credentials_directory: "/run/credentials/void-buy-void",
    expected_wallet_address: wallet,
  },
  broadcaster: {
    socket_path: "/run/void/buy-void/broadcaster.sock",
    custody_store_dir: "/var/lib/void/buy-void/custody",
    state_dir: "/var/lib/void/buy-void/broadcaster",
    expected_signer_fingerprint_sha256: signerFingerprint,
    rpc: {
      rpc_url: "http://127.0.0.1:8545/",
      expected_chain_id: 2050,
    },
  },
} as const;

const ready = createBuyVoidProductionActivationPlanV1(validPolicy);
assert.equal(ready.ok, true);
if (!ready.ok) throw new Error("production_activation_plan_expected_ready");

assert.equal(ready.status, "ready");
assert.match(ready.plan_id_sha256, /^[0-9a-f]{64}$/);
assert.equal(ready.expected_chain_id, "2050");
assert.equal(ready.expected_wallet_address, wallet);
assert.equal(ready.expected_signer_fingerprint_sha256, signerFingerprint);
assert.equal(
  ready.custody_store_dir,
  "/var/lib/void/buy-void/custody",
);
assert.equal(
  ready.required_custodian_activation_confirmation,
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(
  ready.required_broadcaster_activation_confirmation,
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(
  ready.required_real_broadcast_confirmation,
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
);
assert.equal(ready.rpc_url, "http://127.0.0.1:8545/");
assert.equal(
  ready.rpc_url_fingerprint_sha256,
  sha256("http://127.0.0.1:8545/"),
);
assert.equal(ready.production_activation_performed, false);
assert.equal(ready.credential_read_performed, false);
assert.equal(ready.signing_performed, false);
assert.equal(ready.rpc_call_performed, false);
assert.equal(ready.transaction_broadcast_performed, false);
assert.equal(ready.money_movement_performed, false);

const repeated = createBuyVoidProductionActivationPlanV1(validPolicy);
assert.equal(repeated.ok, true);
if (!repeated.ok) throw new Error("production_activation_plan_repeat_not_ready");
assert.equal(repeated.plan_id_sha256, ready.plan_id_sha256);

const ipv6Policy = {
  ...validPolicy,
  broadcaster: {
    ...validPolicy.broadcaster,
    rpc: {
      rpc_url: "http://[::1]:9545/rpc",
      expected_chain_id: "0x802",
    },
  },
};
const ipv6Ready = createBuyVoidProductionActivationPlanV1(ipv6Policy);
assert.equal(ipv6Ready.ok, true);
if (!ipv6Ready.ok) throw new Error("production_activation_plan_ipv6_not_ready");
assert.equal(ipv6Ready.rpc_url, "http://[::1]:9545/rpc");
assert.notEqual(ipv6Ready.plan_id_sha256, ready.plan_id_sha256);

const storeMismatch = createBuyVoidProductionActivationPlanV1({
  ...validPolicy,
  broadcaster: {
    ...validPolicy.broadcaster,
    custody_store_dir: "/var/lib/void/buy-void/other-custody",
  },
});
assert.equal(storeMismatch.ok, false);
if (storeMismatch.ok) throw new Error("store_mismatch_should_hold");
assert.equal(
  storeMismatch.reason,
  "production_activation_plan_custody_store_mismatch",
);

const signerMismatch = createBuyVoidProductionActivationPlanV1({
  ...validPolicy,
  broadcaster: {
    ...validPolicy.broadcaster,
    expected_signer_fingerprint_sha256: "f".repeat(64),
  },
});
assert.equal(signerMismatch.ok, false);
if (signerMismatch.ok) throw new Error("signer_mismatch_should_hold");
assert.equal(
  signerMismatch.reason,
  "production_activation_plan_signer_fingerprint_mismatch",
);

const wrongChain = createBuyVoidProductionActivationPlanV1({
  ...validPolicy,
  broadcaster: {
    ...validPolicy.broadcaster,
    rpc: {
      ...validPolicy.broadcaster.rpc,
      expected_chain_id: 1,
    },
  },
});
assert.equal(wrongChain.ok, false);
if (wrongChain.ok) throw new Error("wrong_chain_should_hold");
assert.equal(
  wrongChain.reason,
  "production_activation_plan_chain_id_must_be_2050",
);

for (const rpcUrl of [
  "https://127.0.0.1:8545/",
  "http://localhost:8545/",
  "http://192.168.1.5:8545/",
  "http://127.0.0.1/",
  "http://user:pass@127.0.0.1:8545/",
  "http://127.0.0.1:8545/?token=x",
  "http://127.0.0.1:8545/#fragment",
]) {
  const invalidRpc = createBuyVoidProductionActivationPlanV1({
    ...validPolicy,
    broadcaster: {
      ...validPolicy.broadcaster,
      rpc: {
        ...validPolicy.broadcaster.rpc,
        rpc_url: rpcUrl,
      },
    },
  });
  assert.equal(invalidRpc.ok, false, rpcUrl);
  if (invalidRpc.ok) throw new Error(`invalid_rpc_should_hold:${rpcUrl}`);
  assert.equal(
    invalidRpc.reason,
    "production_activation_plan_rpc_policy_invalid",
    rpcUrl,
  );
}

const sameSockets = createBuyVoidProductionActivationPlanV1({
  ...validPolicy,
  broadcaster: {
    ...validPolicy.broadcaster,
    socket_path: validPolicy.custodian.socket_path,
  },
});
assert.equal(sameSockets.ok, false);
if (sameSockets.ok) throw new Error("same_sockets_should_hold");
assert.equal(
  sameSockets.reason,
  "production_activation_plan_paths_must_be_distinct",
);

const invalidWallet = createBuyVoidProductionActivationPlanV1({
  ...validPolicy,
  custodian: {
    ...validPolicy.custodian,
    expected_wallet_address: "not-a-wallet",
  },
});
assert.equal(invalidWallet.ok, false);
if (invalidWallet.ok) throw new Error("invalid_wallet_should_hold");
assert.equal(
  invalidWallet.reason,
  "production_activation_plan_policy_invalid",
);

const relativePath = createBuyVoidProductionActivationPlanV1({
  ...validPolicy,
  custodian: {
    ...validPolicy.custodian,
    credentials_directory: "relative/credentials",
  },
});
assert.equal(relativePath.ok, false);
if (relativePath.ok) throw new Error("relative_path_should_hold");
assert.equal(
  relativePath.reason,
  "production_activation_plan_policy_invalid",
);

assert.equal(
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1
    .pure_policy_validation_only,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1.service_start,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1.credential_read,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1.rpc_call,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1.transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1.money_movement,
  false,
);

console.log("VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1_PROOF_GREEN");
console.log("same_custody_store_required=true");
console.log("wallet_derived_signer_fingerprint_required=true");
console.log("chain_id_2050_required=true");
console.log("loopback_http_rpc_policy_required=true");
console.log("distinct_private_service_sockets_required=true");
console.log("plan_id_deterministic=true");
console.log("custodian_activation_confirmation_separate=true");
console.log("broadcaster_activation_confirmation_separate=true");
console.log("real_broadcast_confirmation_separate=true");
console.log("service_start_performed=false");
console.log("credential_read_performed=false");
console.log("signing_performed=false");
console.log("rpc_call_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement_performed=false");
