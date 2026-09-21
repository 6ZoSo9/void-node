#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import {
  VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1,
  createVoidPublicParticipantReadSessionV1,
} from "../ops/public/void-public-participant-read-session-v1.mjs";

const MARKER = "VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-participant-session-"));
let clock = 1_800_000_000_000;
let randomCounter = 0;

function deterministicBytes(size) {
  randomCounter += 1;
  return crypto.createHash("sha256")
    .update("void-session-proof-" + randomCounter)
    .digest()
    .subarray(0, size);
}

function writeWallet(dataDir, account, privateKey, passphrase, { address } = {}) {
  const wallet = new Wallet(privateKey);
  const salt = Buffer.from("00112233445566778899aabbccddeeff", "hex");
  const iv = Buffer.from("00112233445566778899aabb", "hex");
  const key = crypto.scryptSync(passphrase, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final(),
  ]);
  const dir = path.join(dataDir, "participant_wallets_v1");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, account + ".json"), JSON.stringify({
    version: 1,
    kind: "void_participant_wallet",
    cipher: "aes-256-gcm",
    kdf: "scrypt",
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    ciphertext: ciphertext.toString("hex"),
    address: address || wallet.address,
    created_at: 1,
    exported_at: 0,
  }));
  return wallet.address;
}

const source = fs.readFileSync(
  new URL("../ops/public/void-public-participant-read-session-v1.mjs", import.meta.url),
  "utf8",
);

try {
  const account = "zoso";
  const other = "other-account";
  const passphrase = "correct horse battery staple";
  const privateKey = "0x" + "11".repeat(32);
  const address = writeWallet(temp, account, privateKey, passphrase);

  const service = createVoidPublicParticipantReadSessionV1({
    dataDir: temp,
    now: () => clock,
    randomBytes: deterministicBytes,
  });

  assert.equal(service.authority.marker, "VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1");
  assert.equal(service.authority.capability, "participant.account.read.v1");
  for (const key of [
    "wallet_unlock_performed",
    "signer_cache_written",
    "signing_authority",
    "wallet_send_authority",
    "work_credit_mutation_authority",
    "validator_mutation_authority",
    "generic_rpc_authority",
  ]) {
    assert.equal(service.authority[key], false, key);
  }

  const challenge = service.challenge(account);
  assert.equal(challenge.account, account);
  assert.equal(challenge.capability, "participant.account.read.v1");
  assert.match(challenge.challenge_id, /^[0-9a-f]{32}$/);
  assert.match(challenge.nonce, /^[A-Za-z0-9_-]{43}$/);

  const login = service.login({
    challenge_id: challenge.challenge_id,
    nonce: challenge.nonce,
    account,
    passphrase,
  });
  assert.equal(login.account, account);
  assert.equal(login.address.toLowerCase(), address.toLowerCase());
  assert.equal(login.wallet_unlocked, false);
  assert.equal(login.signing_authority, false);
  assert.equal(login.money_movement_authority, false);
  assert.match(login.session_token, /^vps1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/);

  assert.throws(
    () => service.login({
      challenge_id: challenge.challenge_id,
      nonce: challenge.nonce,
      account,
      passphrase,
    }),
    /challenge_unavailable/,
    "consumed challenge replay admitted",
  );

  const authorized = service.authorize("Bearer " + login.session_token, account);
  assert.deepEqual(authorized, {
    account,
    address,
    capability: "participant.account.read.v1",
    read_only: true,
    wallet_unlocked: false,
    signing_authority: false,
    money_movement_authority: false,
  });
  assert.throws(
    () => service.authorize("Bearer " + login.session_token, other),
    /session_account_mismatch/,
  );

  const tampered = login.session_token.slice(0, -1) +
    (login.session_token.endsWith("A") ? "B" : "A");
  assert.throws(
    () => service.authorize("Bearer " + tampered, account),
    /session_token_invalid/,
  );

  const wrongPasswordChallenge = service.challenge(account);
  assert.throws(
    () => service.login({
      challenge_id: wrongPasswordChallenge.challenge_id,
      nonce: wrongPasswordChallenge.nonce,
      account,
      passphrase: "definitely-wrong-password",
    }),
    /account_authentication_failed/,
  );
  assert.throws(
    () => service.login({
      challenge_id: wrongPasswordChallenge.challenge_id,
      nonce: wrongPasswordChallenge.nonce,
      account,
      passphrase,
    }),
    /challenge_unavailable/,
    "failed password challenge replay admitted",
  );

  const wrongAccountChallenge = service.challenge(account);
  assert.throws(
    () => service.login({
      challenge_id: wrongAccountChallenge.challenge_id,
      nonce: wrongAccountChallenge.nonce,
      account: other,
      passphrase,
    }),
    /challenge_mismatch/,
  );

  const expiredChallenge = service.challenge(account);
  clock += VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.challenge_ttl_ms + 1;
  assert.throws(
    () => service.login({
      challenge_id: expiredChallenge.challenge_id,
      nonce: expiredChallenge.nonce,
      account,
      passphrase,
    }),
    /challenge_unavailable|challenge_mismatch/,
  );

  const fresh = service.challenge(account);
  const second = service.login({
    challenge_id: fresh.challenge_id,
    nonce: fresh.nonce,
    account,
    passphrase,
  });
  assert.equal(service.authorize("Bearer " + second.session_token, account).account, account);
  clock += VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.session_ttl_ms + 1;
  assert.throws(
    () => service.authorize("Bearer " + second.session_token, account),
    /session_unavailable/,
  );

  clock = 1_800_000_000_000;
  const logoutChallenge = service.challenge(account);
  const logoutSession = service.login({
    challenge_id: logoutChallenge.challenge_id,
    nonce: logoutChallenge.nonce,
    account,
    passphrase,
  });
  assert.equal(service.logout("Bearer " + logoutSession.session_token), true);
  assert.throws(
    () => service.authorize("Bearer " + logoutSession.session_token, account),
    /session_unavailable/,
  );

  const malformedDir = path.join(temp, "bad");
  writeWallet(
    malformedDir,
    account,
    privateKey,
    passphrase,
    { address: "0x" + "22".repeat(20) },
  );
  const malformed = createVoidPublicParticipantReadSessionV1({
    dataDir: malformedDir,
    now: () => clock,
    randomBytes: deterministicBytes,
  });
  const malformedChallenge = malformed.challenge(account);
  assert.throws(
    () => malformed.login({
      challenge_id: malformedChallenge.challenge_id,
      nonce: malformedChallenge.nonce,
      account,
      passphrase,
    }),
    /wallet_address_binding_mismatch/,
  );

  for (const forbidden of [
    "UNLOCKED",
    "sendTransaction",
    "privateKey, provider",
    "wallet\/send",
    "wc\/redeem",
    "validator\/submit",
  ]) {
    assert.equal(new RegExp(forbidden).test(source), false, "forbidden authority token: " + forbidden);
  }

  assert.match(source, /crypto\.timingSafeEqual/);
  assert.match(source, /session_account_mismatch/);
  assert.match(source, /participant\.account\.read\.v1/);
  assert.match(source, /account_authentication_failed/);
  assert.match(source, /wallet_unlocked: false/);
  assert.match(source, /signing_authority: false/);
  assert.match(source, /money_movement_authority: false/);

  console.log(MARKER);
  console.log("challenge_replay_rejected=true");
  console.log("wrong_password_rejected=true");
  console.log("cross_account_session_rejected=true");
  console.log("tampered_token_rejected=true");
  console.log("challenge_expiry_rejected=true");
  console.log("session_expiry_rejected=true");
  console.log("logout_revokes=true");
  console.log("wallet_address_binding_verified=true");
  console.log("wallet_unlock_performed=false");
  console.log("signing_authority=false");
  console.log("money_movement_authority=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
