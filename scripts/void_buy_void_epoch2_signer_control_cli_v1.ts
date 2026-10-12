#!/usr/bin/env node
// Offline signer-control challenge. No credential, wallet or chain interaction.
import crypto from "node:crypto";
import fs from "node:fs";
import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";

import {
  buildBuyVoidEpoch2SignerControlChallengeV1,
  verifyBuyVoidEpoch2SignerControlV1,
} from "../src/economic/buy_void_epoch2_signer_control_v1.js";

function head(): string {
  const value = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 4000,
    maxBuffer: 4096,
    stdio: ["ignore", "pipe", "ignore"],
  }).trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/u.test(value)) throw Error("local_head_invalid");
  return value;
}
function receipt(file: string): unknown {
  if (!file || file.startsWith("-")) throw Error("receipt_path_invalid");
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink() ||
      info.size < 2 || info.size > 16_384) {
    throw Error("receipt_file_shape_invalid");
  }
  const fd = fs.openSync(file, fs.constants.O_RDONLY |
    (fs.constants.O_NOFOLLOW || 0));
  try {
    const after = fs.fstatSync(fd);
    if (!after.isFile() || after.dev !== info.dev ||
        after.ino !== info.ino || after.size !== info.size ||
        after.size > 16_384) throw Error("receipt_file_changed");
    const value = Buffer.alloc(Number(after.size));
    const bytes = fs.readSync(fd, value, 0, value.length, 0);
    if (bytes !== value.length) throw Error("receipt_file_short_read");
    if (fs.fstatSync(fd).size !== info.size) {
      throw Error("receipt_file_changed_after_read");
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(value));
  } finally {
    fs.closeSync(fd);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!(args.length === 1 && (args[0] === "--issue" ||
          args[0] === "--interactive")) &&
      !(args.length === 2 && args[0] === "--verify")) {
    throw Error("usage: --issue | --interactive | --verify <receipt.json>");
  }
  console.log("VOID_BUY_VOID_EPOCH2_SIGNER_CONTROL_OPERATOR_V1");
  console.log("credentials_or_key_read=false");
  console.log("wallet_or_signer_access=false");
  console.log("rpc_or_transaction=false");
  console.log("runtime_or_funds_mutation=false");
  console.log("public_payment_or_presale_activation=false");
  const sourceHead = head();
  if (args[0] === "--issue" || args[0] === "--interactive") {
    const now = Date.now();
    const challenge = buildBuyVoidEpoch2SignerControlChallengeV1({
      source_head: sourceHead,
      nonce: "0x" + crypto.randomBytes(32).toString("hex"),
      issued_at_ms: now,
      expires_at_ms: now + 300_000,
    });
    if (!challenge.ok) throw Error(challenge.reason);
    console.log(JSON.stringify({
      challenge: challenge.challenge,
      signing_message: challenge.signing_message,
      signing_message_sha256: challenge.signing_message_sha256,
      signing_performed: false,
      currently_authorized_to_pay: false,
    }, null, 2));
    if (args[0] === "--issue") return;

    // Give the human the byte-exact message with real LF bytes. JSON above
    // necessarily displays newlines as \\n escapes and must not be copied
    // literally into a wallet message field.
    console.log("EIP191_SIGNING_MESSAGE_BEGIN");
    console.log(challenge.signing_message);
    console.log("EIP191_SIGNING_MESSAGE_END");

    // One-shot public EIP-191 signature verification, with no on-disk
    // challenge/receipt writes and no key/credential access. The human's
    // trusted external signer is the only component allowed to sign.
    // The request is bounded by the original five-minute expiry.
    const reader = createInterface({
      input: process.stdin, output: process.stdout,
    });
    console.log("signature_expected_format=0x_plus_130_hex_chars");
    console.log("sign_exact_multiline_message_not_sha256=true");
    let signature = "";
    try {
      signature = (await reader.question(
        "Paste PUBLIC EIP-191 signature (0x + 130 hex; NOT signing_message_sha256): ",
        { signal: AbortSignal.timeout(300_000) },
      )).trim();
    } finally {
      reader.close();
    }
    const decision = verifyBuyVoidEpoch2SignerControlV1({
      challenge: challenge.challenge,
      signature,
      expected_source_head: sourceHead,
      now_ms: Date.now(),
    });
    signature = "";
    console.log("status=" + decision.status);
    console.log("reason=" + (decision.reason || "none"));
    console.log("signer_control_proven=" + String(decision.ok));
    console.log("proof_message_sha256=" +
      (decision.signing_message_sha256 || "none"));
    console.log("runtime_credential_installed_verified=false");
    console.log("live_payment_signing_authorized=false");
    console.log("presale_activation_authorized=false");
    if (!decision.ok) process.exitCode = 2;
    return;
  }
  const loaded = receipt(args[1]);
  if (!loaded || typeof loaded !== "object" || Array.isArray(loaded)) {
    throw Error("receipt_payload_invalid");
  }
  const outer = loaded as { challenge?: unknown; signature?: unknown };
  const decision = verifyBuyVoidEpoch2SignerControlV1({
    challenge: outer.challenge,
    signature: outer.signature,
    expected_source_head: sourceHead,
    now_ms: Date.now(),
  });
  console.log("status=" + decision.status);
  console.log("reason=" + (decision.reason || "none"));
  console.log("signer_control_proven=" + String(decision.ok));
  console.log("proof_message_sha256=" +
    (decision.signing_message_sha256 || "none"));
  console.log("runtime_credential_installed_verified=false");
  console.log("live_payment_signing_authorized=false");
  console.log("presale_activation_authorized=false");
  if (!decision.ok) process.exitCode = 2;
}
main().catch((error: unknown) => {
  console.error("HOLD=" + (
    error instanceof Error ? error.message : "unclassified_failure"
  ));
  process.exitCode = 2;
});
