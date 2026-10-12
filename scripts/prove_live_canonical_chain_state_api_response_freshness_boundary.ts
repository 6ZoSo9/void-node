// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse,
  validatorLiveChainStateApiResponseSigningBody,
  validatorLiveChainStateApiResponseTimestampMs,
  validatorRuntimeTruthManifestBodyHash,
  verifyValidatorLiveChainStateApiResponseFreshness,
  verifyValidatorRuntimeTruthLiveChainApiEpochRoot,
} from "../src/chain/block.js";

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

function makeKp() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  return { privateKey, publicKey, pubPEM };
}

function signBytes(priv: crypto.KeyObject, bytes: Uint8Array): string {
  return crypto.sign(null, Buffer.from(bytes), priv).toString("hex");
}

function baseTruth(extra: Record<string, any> = {}) {
  return {
    marker: "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_FRESHNESS_RUNTIME_TRUTH_FIXTURE_V1",
    epoch: "0",
    schedule: [{ epoch: "0", slot: 0, proposer: "0".repeat(32) }],
    ...extra,
  };
}

function apiResponse(root: string, signedAtMs: number | string | null, extraRoot: Record<string, any> = {}) {
  const response: any = {
    ok: true,
    marker: "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_FRESHNESS_FIXTURE_V1",
    source: "live_canonical_chain_state_api",
    finalized: true,
    head: {
      number: 0,
      hash: "0".repeat(64),
      finalized: true,
    },
    validator_epoch_root_commitments: [
      {
        epoch: "0",
        root,
        finalized: true,
        block_number: 0,
        block_hash: "0".repeat(64),
      },
    ],
    ...extraRoot,
  };
  if (signedAtMs !== null) response.signed_at_ms = signedAtMs;
  return response;
}

function signedApiResponse(response: any, signer: ReturnType<typeof makeKp>, sigOverrides: Record<string, any> = {}) {
  const sig = signBytes(signer.privateKey, validatorLiveChainStateApiResponseSigningBody(response));
  return {
    ...response,
    signature: {
      alg: "ed25519",
      signer_pubkey: signer.pubPEM,
      sig,
      ...sigOverrides,
    },
  };
}

function writeJson(file: string, obj: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  return file;
}

function envFor(apiResponseFile: string, signer: ReturnType<typeof makeKp>, extra: Record<string, any> = {}) {
  return {
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FILE: apiResponseFile,
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNATURE_REQUIRED: "1",
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNER_PUBKEY: signer.pubPEM,
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FRESHNESS_REQUIRED: "1",
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_MAX_AGE_MS: "60000",
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_MAX_FUTURE_MS: "5000",
    VOID_BLOCK_PROPOSER_EPOCH: "0",
    ...extra,
  } as NodeJS.ProcessEnv;
}

function expectReason(result: any, reason: string) {
  assert(result && result.ok === false, `expected rejection ${reason}`);
  assert(result.reason === reason, `expected ${reason}, got ${JSON.stringify(result)}`);
}

async function main() {
  const blockSource = fs.readFileSync(path.join("src", "chain", "block.ts"), "utf8");
  assert(blockSource.includes("validatorLiveChainStateApiResponseFreshnessRequiredFromEnv"), "freshness required env gate must exist");
  assert(blockSource.includes("VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FRESHNESS_REQUIRED"), "freshness env alias must exist");
  assert(blockSource.includes("validatorLiveChainStateApiResponseTimestampMs"), "freshness timestamp parser must exist");
  assert(blockSource.includes("verifyValidatorLiveChainStateApiResponseFreshness(response, env)"), "freshness gate must run in live API response epoch-root path");
  assert(blockSource.includes("live_validator_chain_state_api_response_freshness_requires_signature"), "freshness must require signature gate");
  assert(blockSource.indexOf("verifyValidatorLiveChainStateApiResponseSignature(response, env)") < blockSource.indexOf("verifyValidatorLiveChainStateApiResponseFreshness(response, env)"), "signature gate must run before freshness gate");

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-response-freshness-boundary-"));
  const signer = makeKp();
  const truth = baseTruth();
  const root = validatorRuntimeTruthManifestBodyHash(truth);
  const now = Date.now();

  assert(validatorLiveChainStateApiResponseTimestampMs({ signed_at_ms: now }) === now, "millisecond timestamp should parse exactly");
  assert(validatorLiveChainStateApiResponseTimestampMs({ signed_at: Math.floor(now / 1000) }) === Math.floor(now / 1000) * 1000, "seconds timestamp should normalize to ms");
  assert(Number.isFinite(validatorLiveChainStateApiResponseTimestampMs({ signed_at: new Date(now).toISOString() }) as number), "ISO timestamp should parse");
  assert(Number.isNaN(validatorLiveChainStateApiResponseTimestampMs({ signed_at_ms: "not-a-time" }) as number), "invalid timestamp should be NaN");

  {
    const signed = signedApiResponse(apiResponse(root, now), signer);
    const apiFile = writeJson(path.join(tmp, "accepted", "finality.json"), signed);
    const result = expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer));
    assert(result.ok && result.root === root, "fresh signed live API response should provide matching finalized epoch root");
    const rootCheck = verifyValidatorRuntimeTruthLiveChainApiEpochRoot(truth, envFor(apiFile, signer));
    assert(rootCheck.ok && rootCheck.root === root, "fresh signed live API response root should bind to runtime truth body hash");
  }

  {
    const signed = signedApiResponse(apiResponse(root, null), signer);
    const apiFile = writeJson(path.join(tmp, "missing-timestamp", "finality.json"), signed);
    expectReason(
      expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer)),
      "live_validator_chain_state_api_response_timestamp_missing"
    );
  }

  {
    const signed = signedApiResponse(apiResponse(root, "not-a-time"), signer);
    const apiFile = writeJson(path.join(tmp, "bad-timestamp", "finality.json"), signed);
    expectReason(
      expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer)),
      "live_validator_chain_state_api_response_timestamp_invalid"
    );
  }

  {
    const signed = signedApiResponse(apiResponse(root, now - 70000), signer);
    const apiFile = writeJson(path.join(tmp, "stale", "finality.json"), signed);
    expectReason(
      expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer)),
      "live_validator_chain_state_api_response_stale"
    );
  }

  {
    const signed = signedApiResponse(apiResponse(root, now + 10000), signer);
    const apiFile = writeJson(path.join(tmp, "future", "finality.json"), signed);
    expectReason(
      expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer)),
      "live_validator_chain_state_api_response_from_future"
    );
  }

  {
    const signed = signedApiResponse(apiResponse(root, now), signer);
    expectReason(
      verifyValidatorLiveChainStateApiResponseFreshness(
        signed,
        envFor("unused", signer, { VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNATURE_REQUIRED: "" }),
        now
      ),
      "live_validator_chain_state_api_response_freshness_requires_signature"
    );
  }

  {
    const signed = signedApiResponse(apiResponse(root, now), signer);
    expectReason(
      verifyValidatorLiveChainStateApiResponseFreshness(
        signed,
        envFor("unused", signer, { VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_MAX_AGE_MS: "0" }),
        now
      ),
      "live_validator_chain_state_api_response_max_age_invalid"
    );
  }

  {
    const signed = signedApiResponse(apiResponse(root, now), signer);
    expectReason(
      verifyValidatorLiveChainStateApiResponseFreshness(
        signed,
        envFor("unused", signer, { VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_MAX_FUTURE_MS: "-1" }),
        now
      ),
      "live_validator_chain_state_api_response_max_future_invalid"
    );
  }

  {
    const signedStale = signedApiResponse(apiResponse(root, now - 70000), signer);
    const tamperedFresh = { ...signedStale, signed_at_ms: now };
    const apiFile = writeJson(path.join(tmp, "tampered-fresh-after-sign", "finality.json"), tamperedFresh);
    expectReason(
      expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer)),
      "live_validator_chain_state_api_response_signature_invalid"
    );
  }

  {
    const iso = new Date(now).toISOString();
    const signed = signedApiResponse(apiResponse(root, null, { signed_at: iso }), signer);
    const apiFile = writeJson(path.join(tmp, "iso-timestamp", "finality.json"), signed);
    const result = expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer));
    assert(result.ok && result.root === root, "ISO signed_at timestamp should be accepted when fresh");
  }

  console.log("VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_FRESHNESS_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
