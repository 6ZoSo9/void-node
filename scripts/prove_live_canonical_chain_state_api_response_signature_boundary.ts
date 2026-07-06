// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse,
  validatorLiveChainStateApiResponseBodyHash,
  validatorLiveChainStateApiResponseSigningBody,
  validatorRuntimeTruthManifestBodyHash,
  verifyValidatorLiveChainStateApiResponseSignature,
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
    marker: "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNATURE_RUNTIME_TRUTH_FIXTURE_V1",
    epoch: "0",
    schedule: [{ epoch: "0", slot: 0, proposer: "0".repeat(32) }],
    ...extra,
  };
}

function apiResponse(root: string, extraEntry: Record<string, any> = {}, extraRoot: Record<string, any> = {}) {
  return {
    ok: true,
    marker: "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNATURE_FIXTURE_V1",
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
        ...extraEntry,
      },
    ],
    ...extraRoot,
  };
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

function writeText(file: string, text: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

function envFor(apiResponseFile: string, signer: ReturnType<typeof makeKp>, extra: Record<string, any> = {}) {
  return {
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FILE: apiResponseFile,
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNATURE_REQUIRED: "1",
    VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNER_PUBKEY: signer.pubPEM,
    VOID_BLOCK_PROPOSER_EPOCH: "0",
    ...extra,
  } as NodeJS.ProcessEnv;
}

function expectReason(result: any, reason: string) {
  assert(result && result.ok === false, `expected rejection ${reason}`);
  assert(result.reason === reason, `expected ${reason}, got ${JSON.stringify(result)}`);
}

function flipHex64(h: string): string {
  assert(/^[0-9a-f]{64}$/.test(h), "test root must be lowercase 64 hex");
  const last = h[h.length - 1];
  return h.slice(0, -1) + (last === "0" ? "1" : "0");
}

async function main() {
  const blockSource = fs.readFileSync(path.join("src", "chain", "block.ts"), "utf8");
  assert(blockSource.includes("validatorLiveChainStateApiResponseSignatureRequiredFromEnv"), "signature required env gate must exist");
  assert(blockSource.includes("VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNATURE_REQUIRED"), "signature required env alias must exist");
  assert(blockSource.includes("trustedValidatorLiveChainStateApiResponseSignerPubkeyFromEnv"), "trusted signer source must exist");
  assert(blockSource.includes("verifyValidatorLiveChainStateApiResponseSignature(response, env)"), "live API response signature gate must run before epoch-root extraction");
  assert(blockSource.includes("live_validator_chain_state_api_response_signature_invalid"), "invalid signature rejection reason must exist");

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-api-response-signature-boundary-"));
  const signer = makeKp();
  const otherSigner = makeKp();
  const truth = baseTruth();
  const root = validatorRuntimeTruthManifestBodyHash(truth);

  const unsigned = apiResponse(root);
  const signed = signedApiResponse(unsigned, signer);

  assert(
    validatorLiveChainStateApiResponseBodyHash(unsigned) === validatorLiveChainStateApiResponseBodyHash(signed),
    "signature fields must be excluded from API response signing body"
  );

  {
    const result = verifyValidatorLiveChainStateApiResponseSignature(signed, envFor("unused", signer));
    assert(result.ok, "direct signed live API response verification should pass");
  }

  {
    const apiFile = writeJson(path.join(tmp, "accepted", "finality.json"), signed);
    const result = expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer));
    assert(result.ok && result.root === root, "signed live API response should provide matching finalized epoch root");
    const rootCheck = verifyValidatorRuntimeTruthLiveChainApiEpochRoot(truth, envFor(apiFile, signer));
    assert(rootCheck.ok && rootCheck.root === root, "signed live API response root should bind to runtime truth body hash");
  }

  {
    const apiFile = writeJson(path.join(tmp, "unsigned-required", "finality.json"), unsigned);
    expectReason(
      expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer)),
      "live_validator_chain_state_api_response_signature_missing"
    );
  }

  {
    const apiFile = writeJson(path.join(tmp, "unsigned-not-required", "finality.json"), unsigned);
    const result = expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(
      truth,
      envFor(apiFile, signer, { VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNATURE_REQUIRED: "" })
    );
    assert(result.ok && result.root === root, "unsigned response remains accepted when signature gate is not required");
  }

  {
    const apiFile = writeJson(path.join(tmp, "not-ok", "finality.json"), apiResponse(root, {}, { ok: false, error: "not_finalized" }));
    expectReason(
      expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer)),
      "live_validator_chain_state_api_response_not_ok"
    );
  }

  {
    const badAlg = signedApiResponse(unsigned, signer, { alg: "secp256k1" });
    expectReason(
      verifyValidatorLiveChainStateApiResponseSignature(badAlg, envFor("unused", signer)),
      "live_validator_chain_state_api_response_signature_alg_unsupported"
    );
  }

  {
    const badShape = signedApiResponse(unsigned, signer, { sig: "abc" });
    expectReason(
      verifyValidatorLiveChainStateApiResponseSignature(badShape, envFor("unused", signer)),
      "live_validator_chain_state_api_response_signature_shape_invalid"
    );
  }

  {
    const missingSigner = signedApiResponse(unsigned, signer, { signer_pubkey: "" });
    expectReason(
      verifyValidatorLiveChainStateApiResponseSignature(missingSigner, envFor("unused", signer)),
      "live_validator_chain_state_api_response_signer_pubkey_missing"
    );
  }

  {
    expectReason(
      verifyValidatorLiveChainStateApiResponseSignature(signed, {
        VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNATURE_REQUIRED: "1",
      } as NodeJS.ProcessEnv),
      "missing_live_validator_chain_state_api_response_trusted_signer"
    );
  }

  {
    const signedByOther = signedApiResponse(unsigned, otherSigner);
    expectReason(
      verifyValidatorLiveChainStateApiResponseSignature(signedByOther, envFor("unused", signer)),
      "live_validator_chain_state_api_response_signer_mismatch"
    );
  }

  {
    const invalidTrusted = {
      ...signed,
      signature: { ...signed.signature, signer_pubkey: "not-a-pem" },
    };
    expectReason(
      verifyValidatorLiveChainStateApiResponseSignature(
        invalidTrusted,
        envFor("unused", signer, { VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNER_PUBKEY: "not-a-pem" })
      ),
      "invalid_live_validator_chain_state_api_response_trusted_signer"
    );
  }

  {
    const trustedFile = writeText(path.join(tmp, "trusted", "api-response-signer.pem"), signer.pubPEM);
    const result = verifyValidatorLiveChainStateApiResponseSignature(
      signed,
      envFor("unused", signer, {
        VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNER_PUBKEY: "",
        VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNER_PUBKEY_FILE: trustedFile,
      })
    );
    assert(result.ok, "trusted API response signer PEM file should be accepted");
  }

  {
    const escapedPubkey = signer.pubPEM.replace(/\n/g, "\\n");
    const result = verifyValidatorLiveChainStateApiResponseSignature(
      signed,
      envFor("unused", signer, { VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNER_PUBKEY: escapedPubkey })
    );
    assert(result.ok, "escaped newline trusted signer env should be normalized");
  }

  {
    const tampered = {
      ...signed,
      validator_epoch_root_commitments: [
        { ...signed.validator_epoch_root_commitments[0], root: flipHex64(root) },
      ],
    };
    const apiFile = writeJson(path.join(tmp, "tampered-after-sign", "finality.json"), tampered);
    expectReason(
      expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, envFor(apiFile, signer)),
      "live_validator_chain_state_api_response_signature_invalid"
    );
  }

  {
    const wrongRootSigned = signedApiResponse(apiResponse(flipHex64(root)), signer);
    const apiFile = writeJson(path.join(tmp, "signed-wrong-root", "finality.json"), wrongRootSigned);
    expectReason(
      verifyValidatorRuntimeTruthLiveChainApiEpochRoot(truth, envFor(apiFile, signer)),
      "validator_runtime_truth_live_chain_api_epoch_root_mismatch"
    );
  }

  console.log("VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNATURE_BOUNDARY_AUDIT_V1_GREEN");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
