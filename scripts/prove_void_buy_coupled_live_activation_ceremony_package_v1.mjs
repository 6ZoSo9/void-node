#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Wallet, verifyTypedData } from "ethers";

import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";

import {
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_AUTHORITY_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_V1,
  assembleVoidBuyCoupledLiveActivationReceiptCandidateV1,
  buildVoidBuyCoupledLiveActivationCeremonyPackageV1,
  finalizeVoidBuyCoupledLiveActivationReceiptV1,
  readVoidBuyCoupledLiveActivationCeremonyPackageFileV1,
  validateVoidBuyCoupledLiveActivationCeremonyPackageV1,
} from "../tools/void-buy-coupled-live-activation-ceremony-package-v1.mjs";

const input = {
  source_composition_id: "sha256:" + "1".repeat(64),
  activation_generation: "0x" + "2".repeat(64),
  generation_tip_sha256: "sha256:" + "3".repeat(64),
  activation_nonce: "0x" + "4".repeat(64),
  activated_at_ms: 1791014400000,
  expires_at_ms: 1791014700000,
  evaluated_at_ms: 1791014401000,
};

const pkg = buildVoidBuyCoupledLiveActivationCeremonyPackageV1(input);

assert.equal(
  pkg.marker,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_V1,
);
assert.equal(pkg.coupled_launch_id, VOID_BUY_COUPLED_LAUNCH_ID_V1);
assert.equal(
  pkg.activation_signing_request.expected_signer,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
);
assert.equal(
  pkg.sovereign_signing_request.expected_signer,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
);
assert.equal(
  pkg.activation_signing_request.typed_data_json_sha256,
  pkg.sovereign_signing_request.typed_data_json_sha256,
);
assert.equal(
  pkg.activation_signing_request.eip712_digest,
  pkg.sovereign_signing_request.eip712_digest,
);
assert.match(
  pkg.activation_signing_request.eip712_digest,
  /^0x[0-9a-f]{64}$/u,
);
assert.deepEqual(
  validateVoidBuyCoupledLiveActivationCeremonyPackageV1(pkg),
  pkg,
);

for (const key of [
  "buy_void_private_runtime_active",
  "wc_void_market_active",
  "public_presale_active",
  "same_launch_ceremony",
  "public_buy_request_intake_authorized",
  "runtime_or_launch_evidence",
]) {
  assert.equal(pkg.unsigned_receipt[key], true, key);
}
assert.equal(pkg.unsigned_receipt.source_ready_only, false);

for (const [key, value] of Object.entries(
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_AUTHORITY_V1,
)) {
  const allowed = new Set([
    "source_only_unsigned_package_creation",
    "public_signature_assembly",
    "fixed_production_signer_verification",
    "filesystem_read",
  ]);
  assert.equal(value, allowed.has(key), key);
}

assert.doesNotThrow(
  () => buildVoidBuyCoupledLiveActivationCeremonyPackageV1({
    ...input,
    expires_at_ms: input.activated_at_ms + 300000,
  }),
);
assert.throws(
  () => buildVoidBuyCoupledLiveActivationCeremonyPackageV1({
    ...input,
    expires_at_ms: input.activated_at_ms + 300001,
  }),
  /activation_ceremony_lease_invalid/u,
);
assert.throws(
  () => buildVoidBuyCoupledLiveActivationCeremonyPackageV1({
    ...input,
    activated_at_ms: input.evaluated_at_ms + 1,
  }),
  /activation_ceremony_lease_invalid/u,
);
assert.throws(
  () => buildVoidBuyCoupledLiveActivationCeremonyPackageV1({
    ...input,
    evaluated_at_ms: input.expires_at_ms,
  }),
  /activation_ceremony_lease_invalid/u,
);

for (const patch of [
  { source_composition_id: "sha256:" + "x".repeat(64) },
  { activation_generation: "0x1234" },
  { generation_tip_sha256: "sha256:" + "z".repeat(64) },
  { activation_nonce: "0x1234" },
]) {
  assert.throws(
    () => buildVoidBuyCoupledLiveActivationCeremonyPackageV1({
      ...input,
      ...patch,
    }),
  );
}

const activationWallet = new Wallet(
  "0x1111111111111111111111111111111111111111111111111111111111111111",
);
const sovereignWallet = new Wallet(
  "0x2222222222222222222222222222222222222222222222222222222222222222",
);

const typed = pkg.activation_signing_request.typed_data;
const activationSignature = await activationWallet.signTypedData(
  typed.domain,
  typed.types,
  typed.value,
);
const sovereignSignature = await sovereignWallet.signTypedData(
  typed.domain,
  typed.types,
  typed.value,
);

const candidate = assembleVoidBuyCoupledLiveActivationReceiptCandidateV1({
  ceremony_package: pkg,
  activation_signature: activationSignature,
  sovereign_signature: sovereignSignature,
});

assert.equal(candidate.signatures_verified, false);
assert.equal(candidate.fixed_signer_pair_verified, false);
assert.equal(candidate.live_source_state_verified, false);
assert.equal(candidate.generation_authority_verified, false);
assert.equal(candidate.runtime_activation_performed, false);
assert.equal(candidate.funds_movement, false);
assert.match(candidate.receipt_sha256, /^[0-9a-f]{64}$/u);
assert.equal(
  candidate.activation_confirmation,
  "activate-coupled-public-buy-v1:" +
    input.activation_generation + ":" +
    input.generation_tip_sha256 + ":" +
    pkg.unsigned_receipt.activation_receipt_id + ":" +
    candidate.receipt_sha256,
);

const recoveredActivation = verifyTypedData(
  typed.domain,
  typed.types,
  typed.value,
  activationSignature,
);
const recoveredSovereign = verifyTypedData(
  typed.domain,
  typed.types,
  typed.value,
  sovereignSignature,
);
assert.equal(
  recoveredActivation.toLowerCase(),
  activationWallet.address.toLowerCase(),
);
assert.equal(
  recoveredSovereign.toLowerCase(),
  sovereignWallet.address.toLowerCase(),
);
assert.notEqual(
  recoveredActivation.toLowerCase(),
  sovereignWallet.address.toLowerCase(),
);
assert.notEqual(
  recoveredSovereign.toLowerCase(),
  activationWallet.address.toLowerCase(),
);

assert.throws(
  () => finalizeVoidBuyCoupledLiveActivationReceiptV1({
    ceremony_package: pkg,
    activation_signature: activationSignature,
    sovereign_signature: sovereignSignature,
  }),
  /activation_ceremony_activation_signature_mismatch/u,
);

const tampered = structuredClone(pkg);
tampered.source_composition_id = "sha256:" + "5".repeat(64);
assert.throws(
  () => validateVoidBuyCoupledLiveActivationCeremonyPackageV1(tampered),
  /activation_ceremony_package_binding_mismatch/u,
);

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-live-activation-ceremony-file-"),
);
try {
  const packagePath = path.join(tempRoot, "package.json");
  fs.writeFileSync(
    packagePath,
    JSON.stringify(pkg) + "\n",
    { mode: 0o600 },
  );
  assert.deepEqual(
    readVoidBuyCoupledLiveActivationCeremonyPackageFileV1(packagePath),
    pkg,
  );

  const symlinkPath = path.join(tempRoot, "package-link.json");
  fs.symlinkSync(packagePath, symlinkPath);
  assert.throws(
    () =>
      readVoidBuyCoupledLiveActivationCeremonyPackageFileV1(
        symlinkPath,
      ),
    /activation_ceremony_package_file_size_invalid/u,
  );

  const growthPath = path.join(tempRoot, "package-growth.json");
  fs.writeFileSync(
    growthPath,
    JSON.stringify(pkg) + "\n",
    { mode: 0o600 },
  );
  const originalReadSync = fs.readSync;
  let injected = false;
  fs.readSync = function (...args) {
    const count = originalReadSync.apply(fs, args);
    if (!injected && count > 0) {
      injected = true;
      fs.appendFileSync(
        growthPath,
        Buffer.alloc(128 * 1024, 0x20),
      );
    }
    return count;
  };
  try {
    assert.throws(
      () =>
        readVoidBuyCoupledLiveActivationCeremonyPackageFileV1(
          growthPath,
        ),
      /activation_ceremony_package_stream_size_exceeded/u,
    );
  } finally {
    fs.readSync = originalReadSync;
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}


const source = fs.readFileSync(
  "tools/void-buy-coupled-live-activation-ceremony-package-v1.mjs",
  "utf8",
);
assert.equal(
  source.includes("verifyVoidBuyCoupledLiveActivationCeremonySignaturesV1"),
  false,
  "production tool must not expose arbitrary expected-signer verification",
);

assert.equal(source.includes("fs.readFileSync(filePath"), false);
assert.match(source, /fs\.constants\.O_NOFOLLOW/);
assert.match(source, /activation_ceremony_package_stream_size_exceeded/);

for (const forbidden of [
  "new Wallet(",
  ".signTypedData(",
  "private_key_path",
  "PRIVATE_KEY",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "JsonRpcProvider(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_V1_PROOF_GREEN",
);
console.log(
  "fixed_activation_signer=" +
    VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
);
console.log(
  "fixed_sovereign_signer=" +
    VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
);
console.log("typed_payload_shared_by_both_signers=true");
console.log("receipt_candidate_content_addressed=true");
console.log("package_file_nofollow=true");
console.log("package_file_stream_bound_128k=true");
console.log("same_file_growth_overflow_rejected=true");
console.log("synthetic_signatures_cannot_finalize_production_receipt=true");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("signing=false");
console.log("runtime_activation=false");
console.log("funds_movement=false");
