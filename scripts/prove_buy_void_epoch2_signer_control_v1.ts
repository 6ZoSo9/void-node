#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Wallet, verifyMessage } from "ethers";

import {
  VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_V1,
  VOID_BUY_VOID_EPOCH2_CONTROL_MAX_AGE_MS_V1,
  buildBuyVoidEpoch2SignerControlChallengeV1,
  verifyBuyVoidEpoch2SignerControlV1,
} from "../src/economic/buy_void_epoch2_signer_control_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
} from "../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js";

const NOW = 1_798_000_000_000;
const HEAD = "a".repeat(40);
const fixtureKey = "0x" + "11".repeat(32); // Publicly known inert test key ONLY
const witness = new Wallet(fixtureKey);
const compiled = buildBuyVoidEpoch2SignerControlChallengeV1({
  source_head: HEAD,
  nonce: "0x" + "b".repeat(64),
  issued_at_ms: NOW,
  expires_at_ms: NOW + 120_000,
});
assert.equal(compiled.ok, true);
if (!compiled.ok) throw Error("fixture_challenge_not_ready");
assert.equal(compiled.challenge.marker, VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_V1);
assert.equal(compiled.challenge.immutable_fulfiller,
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1);
assert.equal(compiled.challenge.presale_contract,
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1);
assert.ok(compiled.signing_message.includes(
  "purpose=OFFCHAIN_PROOF_OF_CONTROL_ONLY"));
assert.ok(compiled.signing_message.includes(
  "presale_contract=" + VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1));
assert.ok(compiled.signing_message.includes(
  "immutable_fulfiller=" + VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1));
assert.match(compiled.signing_message_sha256, /^[0-9a-f]{64}$/);

const signature = await witness.signMessage(compiled.signing_message);
assert.equal(verifyMessage(compiled.signing_message, signature).toLowerCase(),
  witness.address.toLowerCase(),
  "inert EIP-191 challenge round trip failed");
const run = (challenge: unknown, sig: unknown, sourceHead = HEAD,
             now = NOW + 10_000) =>
  verifyBuyVoidEpoch2SignerControlV1({
    challenge, signature: sig, expected_source_head: sourceHead, now_ms: now,
  });
const wrongSigner = run(compiled.challenge, signature);
assert.equal(wrongSigner.ok, false);
assert.equal(wrongSigner.reason, "epoch2_signer_control_wrong_fulfiller");
assert.equal(wrongSigner.runtime_credential_installed_verified, false);
assert.equal(wrongSigner.live_payment_signing_authorized, false);
assert.equal(wrongSigner.transaction_sign_or_broadcast, false);
assert.equal(wrongSigner.funds_movement, false);

const held = (label: string, challenge: unknown, sig: unknown,
              reason: string, head = HEAD, now = NOW + 10_000) => {
  const result = run(challenge, sig, head, now);
  assert.equal(result.ok, false, label);
  assert.equal(result.reason, reason, label);
  assert.equal(result.live_payment_signing_authorized, false, label);
  assert.equal(result.service_change_authorized, false, label);
  assert.equal(result.presale_activation_authorized, false, label);
};

held("expired", compiled.challenge, signature,
  "epoch2_signer_control_challenge_invalid", HEAD, NOW + 121_000);
held("before_issue", compiled.challenge, signature,
  "epoch2_signer_control_challenge_invalid", HEAD, NOW - 1);
held("different_head", compiled.challenge, signature,
  "epoch2_signer_control_challenge_invalid", "c".repeat(40));
held("tampered_contract", {
  ...compiled.challenge,
  presale_contract: "0x" + "3".repeat(40),
}, signature, "epoch2_signer_control_challenge_invalid");
held("tampered_rpc", {
  ...compiled.challenge,
  production_rpc_url: "http://127.0.0.1:8545/",
}, signature, "epoch2_signer_control_challenge_invalid");
held("tampered_fulfiller", {
  ...compiled.challenge,
  immutable_fulfiller: witness.address.toLowerCase(),
}, signature, "epoch2_signer_control_challenge_invalid");
held("tampered_nonce", {
  ...compiled.challenge,
  nonce: "0x" + "d".repeat(64),
}, signature, "epoch2_signer_control_wrong_fulfiller");
held("empty_nonce", {
  ...compiled.challenge,
  nonce: "0x" + "0".repeat(64),
}, signature, "epoch2_signer_control_challenge_invalid");
held("unknown_field", {
  ...compiled.challenge,
  unsafe: true,
}, signature, "epoch2_signer_control_challenge_invalid");
held("wrong_type", {
  ...compiled.challenge,
  issued_at_ms: "1798000000000",
}, signature, "epoch2_signer_control_challenge_invalid");
held("truncated_sig", compiled.challenge, "0xdead",
  "epoch2_signer_control_signature_invalid");
held("null_sig", compiled.challenge, null,
  "epoch2_signer_control_signature_invalid");
held("overlong_expiry", {
  ...compiled.challenge,
  expires_at_ms: NOW + VOID_BUY_VOID_EPOCH2_CONTROL_MAX_AGE_MS_V1 + 1,
}, signature, "epoch2_signer_control_challenge_invalid");
held("future_signed", {
  ...compiled.challenge,
  issued_at_ms: NOW + 100_000,
  expires_at_ms: NOW + 200_000,
}, signature, "epoch2_signer_control_challenge_invalid");

const hostile = Object.create(null);
for (const [key, value] of Object.entries(compiled.challenge)) {
  Object.defineProperty(hostile, key, {
    configurable: true, enumerable: true, get() {
      throw Error("HOSTILE_GETTER_EXECUTED");
    },
  });
}
held("getter", hostile, signature, "epoch2_signer_control_challenge_invalid");
assert.deepEqual(buildBuyVoidEpoch2SignerControlChallengeV1({
  source_head: HEAD,
  nonce: "0x" + "0".repeat(64),
  issued_at_ms: NOW,
  expires_at_ms: NOW + 60_000,
}), { ok: false, status: "HOLD", reason: "challenge_invalid" });

// Exercise the real operator CLI's no-file, no-private-key interactive path
// with a deliberately INVALID PUBLIC signature. The child may not claim
// signer control or runtime authority; it never reads a credential or key.
const interactive = await new Promise<{
  code: number | null; stdout: string; stderr: string; signature_sent: boolean;
}>((resolve, reject) => {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/void_buy_void_epoch2_signer_control_cli_v1.ts",
      "--interactive"],
    { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] },
  );
  let stdout = "";
  let stderr = "";
  let signatureSent = false;
  const deadline = setTimeout(() => {
    child.kill();
    reject(new Error("interactive_challenge_deadline_exceeded"));
  }, 20_000);
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (data: string) => {
    stdout += data;
    if (!signatureSent &&
        stdout.includes("Paste PUBLIC EIP-191 signature")) {
      signatureSent = true;
      child.stdin.end("0x" + "0".repeat(130) + "\n");
    }
  });
  child.stderr.on("data", (data: string) => { stderr += data; });
  child.on("error", error => { clearTimeout(deadline); reject(error); });
  child.on("close", code => {
    clearTimeout(deadline);
    resolve({ code, stdout, stderr, signature_sent: signatureSent });
  });
});
assert.equal(interactive.signature_sent, true);
assert.equal(interactive.code, 2);
assert.match(interactive.stdout, /OFFCHAIN_PROOF_OF_CONTROL_ONLY/u);
assert.match(interactive.stdout, /signer_control_proven=false/u);
assert.match(interactive.stdout, /runtime_credential_installed_verified=false/u);
assert.match(interactive.stdout, /live_payment_signing_authorized=false/u);
assert.match(interactive.stdout, /presale_activation_authorized=false/u);
assert.equal(interactive.stderr.includes("PRIVATE_KEY"), false);

console.log("VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_V1_PROOF_GREEN");
console.log("offchain_challenge_fixed_epoch2_contract_and_production_rpc=true");
console.log("synthetic_eip191_signature_recovered=true");
console.log("synthetic_signer_not_accepted_as_live_epoch2_fulfiller=true");
console.log("expired_wrong_head_wrong_target_tampered_payload_hold=true");
console.log("interactive_public_signature_invalid_holds_without_files=true");
console.log("production_epoch2_signer_signature_present=false");
console.log("runtime_credential_installed_verified=false");
console.log("public_payment_or_presale_authority=false");
