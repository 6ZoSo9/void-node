#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";

import { Wallet } from "ethers";

import {
  buildVoidWcVoidLaunchControllerControlSignatureEnvelopeV1,
  prepareVoidWcVoidLaunchControllerControlChallengeV1,
  verifyVoidWcVoidLaunchControllerControlSignatureV1,
} from "../tools/void-wc-void-launch-controller-control-requalification-v1.mjs";
import {
  qualifyVoidWcVoidMarketVaultRoleDeploymentV1,
} from "../tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1,
  testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightWithControlEvidenceV1,
} from "../tools/void-wc-void-market-vault-live-deployment-observation-preflight-v1.mjs";

const PRIVATE_KEY =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
const NONCE =
  "0x3333333333333333333333333333333333333333333333333333333333333333";
const DEPLOYER = "0x2222222222222222222222222222222222222222";
const INVENTORY_SOURCE =
  "0x4444444444444444444444444444444444444444";
const ISSUED = 1_800_000_000;
const VERIFIED = 1_800_000_005;
const QUALIFIED = 1_800_000_010;
const OBSERVED = "1800000020";
const FINAL = "1800000021";
const OPENING_ATOMS = 10000000000000000000000000n;
const HEAD_HASH = "0x" + "a".repeat(64);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function qualificationId(value) {
  const material = structuredClone(value);
  delete material.qualification_id;
  return (
    "voidwcvrdq1_" +
    sha256(Buffer.from(canonicalJson(material), "utf8"))
  );
}

function balanceHex(value) {
  return "0x" + BigInt(value).toString(16).padStart(64, "0");
}

async function buildReviewedFixture() {
  const wallet = new Wallet(PRIVATE_KEY);
  const challenge =
    prepareVoidWcVoidLaunchControllerControlChallengeV1({
      candidateAddress: wallet.address,
      nowUnix: ISSUED,
      ttlSeconds: 600,
      nonce: NONCE,
    });
  const typed = challenge.typed_data;
  const signature = await wallet.signTypedData(
    typed.domain,
    typed.types,
    typed.value,
  );
  const signatureEnvelope =
    buildVoidWcVoidLaunchControllerControlSignatureEnvelopeV1({
      challengeId: challenge.challenge_id,
      signature,
    });
  const evidence =
    await verifyVoidWcVoidLaunchControllerControlSignatureV1({
      challengeEnvelope: challenge,
      signatureEnvelope,
      nowUnix: VERIFIED,
    });
  const evidenceBytes = prettyBytes(evidence);
  const evidenceSha256 = sha256(evidenceBytes);

  const qualification =
    await qualifyVoidWcVoidMarketVaultRoleDeploymentV1({
      launchControllerEvidenceBytes: evidenceBytes,
      launchControllerEvidenceFileSha256: evidenceSha256,
      evaluationTimeUnix: String(QUALIFIED),
    });
  const qualificationBytes = prettyBytes(qualification);

  return Object.freeze({
    wallet,
    evidence,
    evidenceBytes,
    evidenceSha256,
    qualification,
    qualificationBytes,
    qualificationSha256: sha256(qualificationBytes),
  });
}

async function withRpcFixture(callback) {
  let rpcCalls = 0;
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      rpcCalls += 1;
      let payload;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        response.writeHead(400, { "content-type": "application/json" });
        response.end("{}");
        return;
      }

      let result;
      switch (payload.method) {
        case "eth_chainId":
          result = "0x802";
          break;
        case "eth_blockNumber":
          result = "0x64";
          break;
        case "eth_getBlockByNumber":
          result = {
            number: "0x64",
            hash: HEAD_HASH,
            timestamp: "0x100",
          };
          break;
        case "eth_getTransactionCount":
          result = payload.params?.[1] === "pending" ? "0x7" : "0x6";
          break;
        case "eth_getBalance":
          result = "0x8ac7230489e80000";
          break;
        case "eth_gasPrice":
          result = "0x3b9aca00";
          break;
        case "eth_estimateGas":
          result = "0xf4240";
          break;
        case "eth_call":
          result = balanceHex(OPENING_ATOMS + 123n);
          break;
        default:
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({
            jsonrpc: "2.0",
            id: payload.id,
            error: { code: -32000, message: "unexpected_method" },
          }));
          return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        jsonrpc: "2.0",
        id: payload.id,
        result,
      }));
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    return await callback({
      rpc_url: "http://127.0.0.1:" + String(address.port) + "/",
      rpcCalls: () => rpcCalls,
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function strictInput(fixture, rpcUrl, override = {}) {
  return {
    qualification_bytes: fixture.qualificationBytes,
    qualification_file_sha256: fixture.qualificationSha256,
    launch_controller_evidence_bytes: fixture.evidenceBytes,
    launch_controller_evidence_file_sha256: fixture.evidenceSha256,
    deployer_address: DEPLOYER,
    inventory_source_address: INVENTORY_SOURCE,
    rpc_url: rpcUrl,
    request_timeout_ms: 1000,
    max_response_bytes: 65536,
    evaluation_time_unix: OBSERVED,
    final_evaluation_time_unix: FINAL,
    ...override,
  };
}

const fixture = await buildReviewedFixture();

assert.equal(
  fixture.qualification.launch_controller.address,
  fixture.wallet.address.toLowerCase(),
);
assert.equal(
  fixture.qualification.launch_controller.evidence_id,
  fixture.evidence.evidence_id,
);
assert.equal(
  fixture.qualification.launch_controller.evidence_file_sha256,
  fixture.evidenceSha256,
);
assert.equal(
  fixture.qualification.launch_controller.verified_at_unix,
  String(VERIFIED),
);
assert.equal(
  fixture.qualification.launch_controller.reverified_at_unix,
  String(QUALIFIED),
);

await withRpcFixture(async (rpc) => {
  const result =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightWithControlEvidenceV1(
      strictInput(fixture, rpc.rpc_url),
    );
  assert.equal(result.ok, true, result.ok ? "" : result.reason);
  assert.equal(result.launch_controller_evidence_reverified, true);
  assert.equal(
    result.launch_controller_evidence_id,
    fixture.evidence.evidence_id,
  );
  assert.equal(
    result.launch_controller_evidence_file_sha256,
    fixture.evidenceSha256,
  );
  assert.equal(result.launch_controller_evidence_reviewed_execution, true);
  assert.ok(rpc.rpcCalls() > 0, "valid signed evidence did not reach RPC");
});

await withRpcFixture(async (rpc) => {
  const missing =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightWithControlEvidenceV1(
      strictInput(fixture, rpc.rpc_url, {
        launch_controller_evidence_bytes: undefined,
        launch_controller_evidence_file_sha256: undefined,
      }),
    );
  assert.equal(missing.ok, false);
  assert.equal(
    missing.reason,
    "live_deployment_preflight_control_evidence_sha256_mismatch",
  );
  assert.equal(rpc.rpcCalls(), 0, "missing control evidence reached RPC");
});

await withRpcFixture(async (rpc) => {
  const badHash =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightWithControlEvidenceV1(
      strictInput(fixture, rpc.rpc_url, {
        launch_controller_evidence_file_sha256: "0".repeat(64),
      }),
    );
  assert.equal(badHash.ok, false);
  assert.equal(
    badHash.reason,
    "live_deployment_preflight_control_evidence_sha256_mismatch",
  );
  assert.equal(rpc.rpcCalls(), 0, "bad control evidence hash reached RPC");
});

await withRpcFixture(async (rpc) => {
  const forgedEvidence = structuredClone(fixture.evidence);
  forgedEvidence.candidate_address =
    "0x5555555555555555555555555555555555555555";
  forgedEvidence.evidence_id = "voidwlcce1_" + "5".repeat(64);
  const forgedEvidenceBytes = prettyBytes(forgedEvidence);
  const forgedEvidenceSha = sha256(forgedEvidenceBytes);

  const forgedQualification = structuredClone(fixture.qualification);
  forgedQualification.launch_controller.address =
    forgedEvidence.candidate_address;
  forgedQualification.launch_controller.evidence_id =
    forgedEvidence.evidence_id;
  forgedQualification.launch_controller.evidence_file_sha256 =
    forgedEvidenceSha;
  forgedQualification.deployment_preparation.constructor.values
    .launch_controller = forgedEvidence.candidate_address;
  forgedQualification.qualification_id =
    qualificationId(forgedQualification);

  const forgedQualificationBytes = prettyBytes(forgedQualification);
  const forged =
    await testOnlyObserveVoidWcVoidMarketVaultLiveDeploymentPreflightWithControlEvidenceV1({
      qualification_bytes: forgedQualificationBytes,
      qualification_file_sha256: sha256(forgedQualificationBytes),
      launch_controller_evidence_bytes: forgedEvidenceBytes,
      launch_controller_evidence_file_sha256: forgedEvidenceSha,
      deployer_address: DEPLOYER,
      inventory_source_address: INVENTORY_SOURCE,
      rpc_url: rpc.rpc_url,
      request_timeout_ms: 1000,
      max_response_bytes: 65536,
      evaluation_time_unix: OBSERVED,
      final_evaluation_time_unix: FINAL,
    });
  assert.equal(forged.ok, false);
  assert.match(
    forged.reason,
    /control_evidence_(?:identity_invalid|reverification_mismatch)/u,
  );
  assert.equal(
    rpc.rpcCalls(),
    0,
    "forged self-consistent control qualification reached RPC",
  );
});

const authority =
  VOID_WC_VOID_MARKET_VAULT_LIVE_DEPLOYMENT_OBSERVATION_PREFLIGHT_AUTHORITY_V1;
assert.equal(authority.launch_controller_signed_evidence_required, true);
assert.equal(
  authority.launch_controller_signed_evidence_sha256_required,
  true,
);
assert.equal(
  authority.launch_controller_signed_evidence_reverification_required,
  true,
);
assert.equal(
  authority.launch_controller_signed_evidence_reviewed_runtime_required,
  true,
);
assert.equal(
  authority.launch_controller_signed_evidence_required_before_rpc,
  true,
);
assert.equal(authority.transaction_envelope_construction, false);
assert.equal(authority.transaction_signing, false);
assert.equal(authority.transaction_broadcast, false);
assert.equal(authority.deployment, false);
assert.equal(authority.inventory_funding, false);
assert.equal(authority.market_activation, false);
assert.equal(authority.public_presale_activation, false);
assert.equal(authority.funds_movement, false);

console.log(
  "VOID_WC_VOID_MARKET_VAULT_LIVE_PREFLIGHT_CONTROL_EVIDENCE_REPLAY_V1_PROOF_GREEN",
);
console.log("signed_launch_controller_evidence_required=true");
console.log("independent_control_evidence_sha256_required=true");
console.log("reviewed_control_reverification_before_rpc=true");
console.log("reviewed_ethers_package_bytes_required=true");
console.log("valid_signed_evidence_reaches_rpc=true");
console.log("missing_control_evidence_zero_rpc_calls=true");
console.log("bad_control_evidence_hash_zero_rpc_calls=true");
console.log("forged_self_consistent_qualification_zero_rpc_calls=true");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
