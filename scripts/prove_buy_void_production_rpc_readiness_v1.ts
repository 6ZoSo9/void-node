import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Wallet } from "ethers";

import {
  VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
  probeBuyVoidNativeChain2050BroadcasterV1,
  type BuyVoidNativeChain2050JsonRpcCallV1,
  type BuyVoidNativeChain2050JsonRpcTransportV1,
} from "../src/economic/buy_void_native_chain2050_broadcaster_v1.js";
import {
  buyVoidPreparedTransactionCredentialSignerFingerprintV1,
} from "../src/economic/buy_void_prepared_transaction_credential_signer_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
  runBuyVoidProductionRpcReadinessV1,
} from "../src/economic/buy_void_production_rpc_readiness_v1.js";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

const wallet = new Wallet(`0x${"1".repeat(64)}`).address.toLowerCase();
const signerFingerprint =
  buyVoidPreparedTransactionCredentialSignerFingerprintV1(wallet);

const policy = {
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

let fakeProbeCalls = 0;
const fakeProbe = async () => {
  fakeProbeCalls += 1;
  return {
    ok: true,
    marker: VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
    version: 1,
    status: "ready",
    chain_id: "2050",
    rpc_url_fingerprint_sha256: sha256("http://127.0.0.1:8545/"),
    provider_submission_id: "synthetic-readiness-provider",
    mutation_performed: false,
  } as const;
};

const dry = await runBuyVoidProductionRpcReadinessV1(
  { policy },
  { probe_chain2050: fakeProbe },
);
assert.equal(dry.ok, true);
assert.equal(dry.status, "dry_run");
if (!dry.ok || dry.status !== "dry_run") {
  throw new Error("production_rpc_readiness_dry_expected");
}
assert.match(dry.plan_id_sha256, /^[0-9a-f]{64}$/);
assert.equal(dry.required_plan_id_sha256, dry.plan_id_sha256);
assert.equal(
  dry.required_confirmation,
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
);
assert.equal(dry.rpc_probe_performed, false);
assert.equal(fakeProbeCalls, 0);

const wrongConfirmation = await runBuyVoidProductionRpcReadinessV1(
  {
    policy,
    apply: true,
    confirmation: "wrong",
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  { probe_chain2050: fakeProbe },
);
assert.equal(wrongConfirmation.ok, false);
if (wrongConfirmation.ok) {
  throw new Error("production_rpc_wrong_confirmation_should_hold");
}
assert.equal(
  wrongConfirmation.reason,
  "production_rpc_readiness_confirmation_required",
);
assert.equal(wrongConfirmation.rpc_probe_performed, false);
assert.equal(fakeProbeCalls, 0);

const wrongPlanId = await runBuyVoidProductionRpcReadinessV1(
  {
    policy,
    apply: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
    expected_plan_id_sha256: "f".repeat(64),
  },
  { probe_chain2050: fakeProbe },
);
assert.equal(wrongPlanId.ok, false);
if (wrongPlanId.ok) throw new Error("production_rpc_wrong_plan_should_hold");
assert.equal(
  wrongPlanId.reason,
  "production_rpc_readiness_plan_id_confirmation_required",
);
assert.equal(wrongPlanId.rpc_probe_performed, false);
assert.equal(fakeProbeCalls, 0);

const readyFake = await runBuyVoidProductionRpcReadinessV1(
  {
    policy,
    apply: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  { probe_chain2050: fakeProbe },
);
assert.equal(readyFake.ok, true);
assert.equal(readyFake.status, "ready");
if (!readyFake.ok || readyFake.status !== "ready") {
  throw new Error("production_rpc_fake_ready_expected");
}
assert.equal(fakeProbeCalls, 1);
assert.equal(readyFake.rpc_probe_performed, true);
assert.equal(readyFake.rpc_mutation_performed, false);
assert.equal(readyFake.service_started, false);
assert.equal(readyFake.credential_read_performed, false);
assert.equal(readyFake.signing_performed, false);
assert.equal(readyFake.submit_once_performed, false);
assert.equal(readyFake.transaction_broadcast_performed, false);
assert.equal(readyFake.money_movement_performed, false);

const badFingerprint = await runBuyVoidProductionRpcReadinessV1(
  {
    policy,
    apply: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  {
    probe_chain2050: async () => ({
      ok: true,
      marker: VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1,
      version: 1,
      status: "ready",
      chain_id: "2050",
      rpc_url_fingerprint_sha256: "a".repeat(64),
      provider_submission_id: "wrong-fingerprint",
      mutation_performed: false,
    }),
  },
);
assert.equal(badFingerprint.ok, false);
if (badFingerprint.ok) {
  throw new Error("production_rpc_bad_fingerprint_should_hold");
}
assert.equal(
  badFingerprint.reason,
  "production_rpc_readiness_probe_boundary_invalid",
);
assert.equal(badFingerprint.rpc_probe_performed, true);

const observedMethods: string[] = [];
const syntheticTransport: BuyVoidNativeChain2050JsonRpcTransportV1 = {
  async call(input: Readonly<BuyVoidNativeChain2050JsonRpcCallV1>) {
    observedMethods.push(input.method);
    assert.equal(input.method, "eth_chainId");
    assert.deepEqual(input.params, []);
    assert.equal(input.rpc_url, "http://127.0.0.1:8545/");
    return {
      ok: true,
      request_sent: true,
      response_received: true,
      http_status: 200,
      request_id: input.request_id,
      result: "0x802",
      provider_submission_id: "synthetic-real-probe",
    };
  },
};

const realProbeReady = await runBuyVoidProductionRpcReadinessV1(
  {
    policy,
    apply: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  {
    probe_chain2050: (probePolicy) =>
      probeBuyVoidNativeChain2050BroadcasterV1(
        probePolicy,
        syntheticTransport,
      ),
  },
);
assert.equal(realProbeReady.ok, true);
assert.equal(realProbeReady.status, "ready");
if (!realProbeReady.ok || realProbeReady.status !== "ready") {
  throw new Error("production_rpc_real_primitive_ready_expected");
}
assert.deepEqual(observedMethods, ["eth_chainId"]);
assert.equal(realProbeReady.rpc_probe_performed, true);
assert.equal(realProbeReady.rpc_mutation_performed, false);
assert.equal(realProbeReady.provider_submission_id, "synthetic-real-probe");

const mismatchMethods: string[] = [];
const mismatchTransport: BuyVoidNativeChain2050JsonRpcTransportV1 = {
  async call(input) {
    mismatchMethods.push(input.method);
    return {
      ok: true,
      request_sent: true,
      response_received: true,
      http_status: 200,
      request_id: input.request_id,
      result: "0x1",
      provider_submission_id: "synthetic-wrong-chain",
    };
  },
};

const wrongChain = await runBuyVoidProductionRpcReadinessV1(
  {
    policy,
    apply: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  {
    probe_chain2050: (probePolicy) =>
      probeBuyVoidNativeChain2050BroadcasterV1(
        probePolicy,
        mismatchTransport,
      ),
  },
);
assert.equal(wrongChain.ok, false);
if (wrongChain.ok) throw new Error("production_rpc_wrong_chain_should_hold");
assert.match(
  wrongChain.reason,
  /^production_rpc_readiness_probe_chain_identity_mismatch$/,
);
assert.deepEqual(mismatchMethods, ["eth_chainId"]);
assert.equal(wrongChain.rpc_probe_performed, true);

assert.equal(
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1.read_only_rpc_probe_only,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1.rpc_method,
  "eth_chainId",
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1.custodian_service_start,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1.broadcaster_service_start,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1.credential_read,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1.submit_once,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1.eth_send_raw_transaction,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1.money_movement,
  false,
);

console.log("VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1_PROOF_GREEN");
console.log("dry_run_rpc_probe_calls=0");
console.log("wrong_confirmation_rpc_probe_calls=0");
console.log("wrong_plan_id_rpc_probe_calls=0");
console.log("exact_plan_id_echo_required=true");
console.log("exact_rpc_probe_confirmation_required=true");
console.log("actual_probe_primitive_reused=true");
console.log("observed_rpc_methods=eth_chainId");
console.log("eth_send_raw_transaction_observed=false");
console.log("wrong_chain_held=true");
console.log("service_start_performed=false");
console.log("credential_read_performed=false");
console.log("signing_performed=false");
console.log("submit_once_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement_performed=false");
