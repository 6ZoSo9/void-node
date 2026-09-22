#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import {
  issueVoidPublicParticipantLoginPairingV1,
  consumeVoidPublicParticipantLoginPairingV1,
} from "../tools/void-public-participant-login-pairing-v1.mjs";
import {
  VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1,
  bindVoidPublicParticipantLoginKeyV1,
} from "../tools/void-public-participant-login-binding-v1.mjs";
import {
  createVoidPublicParticipantReadSessionV1,
} from "../ops/public/void-public-participant-read-session-v1.mjs";

const MARKER =
  "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-participant-binding-proof-"),
);
const dataDir = path.join(temp, "data");
const stateDir = path.join(temp, "pairing-state");
const registryDir = path.join(temp, "registry");
const registryFile = path.join(
  registryDir,
  "participant-login-bindings-v1.json",
);
const passphraseFile = path.join(temp, "wallet-passphrase.txt");
const passphrase = "correct horse battery staple";
let clock = 1_800_000_000_000;
let randomCounter = 0;

function deterministicBytes(size) {
  randomCounter += 1;
  return crypto.createHash("sha256")
    .update("void-binding-proof-" + randomCounter)
    .digest()
    .subarray(0, size);
}

function writeWallet(root, account, privateKey, password) {
  const wallet = new Wallet(privateKey);
  const salt = Buffer.from(
    "00112233445566778899aabbccddeeff",
    "hex",
  );
  const iv = Buffer.from("00112233445566778899aabb", "hex");
  const key = crypto.scryptSync(password, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final(),
  ]);
  const walletDir = path.join(root, "participant_wallets_v1");
  fs.mkdirSync(walletDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(walletDir, account + ".json"),
    JSON.stringify({
      version: 1,
      kind: "void_participant_wallet",
      cipher: "aes-256-gcm",
      kdf: "scrypt",
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
      tag: cipher.getAuthTag().toString("hex"),
      ciphertext: ciphertext.toString("hex"),
      address: wallet.address,
      created_at: 1,
      exported_at: 0,
    }, null, 2) + "\n",
    { mode: 0o600 },
  );
  return wallet.address;
}

function spkiBase64url(publicKey) {
  return publicKey.export({
    type: "spki",
    format: "der",
  }).toString("base64url");
}

function fingerprint(publicKey) {
  return crypto.createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
}

function sessionSignature(challenge, privateKey) {
  return crypto.sign(
    null,
    Buffer.from(challenge.signing_payload_base64url, "base64url"),
    privateKey,
  ).toString("base64url");
}

function issue(account) {
  return issueVoidPublicParticipantLoginPairingV1({
    account,
    dataDir,
    passphraseFile,
    stateDir,
    now: () => clock,
    randomBytes: deterministicBytes,
  });
}

function bind(account, ticket, keyPair) {
  return bindVoidPublicParticipantLoginKeyV1({
    account,
    pairingToken: ticket,
    loginPublicKeySpkiBase64url: spkiBase64url(keyPair.publicKey),
    pairingStateDir: stateDir,
    bindingRegistryFile: registryFile,
    now: () => clock,
  });
}

try {
  fs.mkdirSync(registryDir, { mode: 0o700 });
  fs.writeFileSync(passphraseFile, passphrase + "\n", {
    mode: 0o600,
  });
  fs.chmodSync(passphraseFile, 0o600);

  const accountA = "zoso";
  const accountB = "participant-b";
  const accountC = "participant-c";
  const accountD = "participant-d";
  writeWallet(dataDir, accountA, "0x" + "11".repeat(32), passphrase);
  writeWallet(dataDir, accountB, "0x" + "22".repeat(32), passphrase);
  writeWallet(dataDir, accountC, "0x" + "33".repeat(32), passphrase);

  const loginA = crypto.generateKeyPairSync("ed25519");
  const loginB = crypto.generateKeyPairSync("ed25519");
  const loginC = crypto.generateKeyPairSync("ed25519");

  for (const key of [
    "wallet_passphrase_transport",
    "wallet_private_key_access",
    "login_private_key_access",
    "session_authority_created",
    "wallet_unlock_performed",
    "transaction_signing",
    "wallet_send_authority",
    "work_credit_mutation_authority",
    "validator_mutation_authority",
    "money_movement_authority",
  ]) {
    assert.equal(
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1[key],
      false,
      key,
    );
  }

  const pairA = issue(accountA);
  const boundA = bind(accountA, pairA.pairing_token, loginA);
  assert.equal(boundA.binding_created, true);
  assert.equal(boundA.pairing_consumed, true);
  assert.equal(boundA.account, accountA);
  assert.equal(
    boundA.public_key_fingerprint_sha256,
    fingerprint(loginA.publicKey),
  );
  assert.equal(boundA.wallet_unlocked, false);
  assert.equal(boundA.signing_authority, false);
  assert.equal(boundA.money_movement_authority, false);

  const registry = JSON.parse(fs.readFileSync(registryFile, "utf8"));
  assert.equal(registry.marker, "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1");
  assert.equal(registry.version, 1);
  assert.equal(registry.bindings.length, 1);
  assert.equal(registry.bindings[0].account, accountA);
  assert.equal(registry.bindings[0].status, "active");
  assert.equal(registry.bindings[0].key_type, "ed25519");
  assert.equal(
    registry.bindings[0].public_key_fingerprint_sha256,
    fingerprint(loginA.publicKey),
  );
  assert.deepEqual(
    registry.bindings[0].capabilities,
    ["participant.account.read.v1"],
  );
  assert.equal(
    registry.bindings[0].public_key_pem.includes("PRIVATE KEY"),
    false,
  );
  assert.equal(
    fs.readFileSync(registryFile, "utf8").includes(pairA.pairing_token),
    false,
  );

  const session = createVoidPublicParticipantReadSessionV1({
    bindingRegistryFile: registryFile,
    now: () => clock,
    randomBytes: deterministicBytes,
  });
  const challenge = session.challenge(accountA);
  const loggedIn = session.login({
    challenge_id: challenge.challenge_id,
    nonce: challenge.nonce,
    account: accountA,
    signature_base64url: sessionSignature(
      challenge,
      loginA.privateKey,
    ),
  });
  assert.equal(loggedIn.account, accountA);
  assert.equal(
    session.authorize(
      "Bearer " + loggedIn.session_token,
      accountA,
    ).account,
    accountA,
  );

  const pairB = issue(accountB);
  const p256 = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  assert.throws(
    () => bindVoidPublicParticipantLoginKeyV1({
      account: accountB,
      pairingToken: pairB.pairing_token,
      loginPublicKeySpkiBase64url:
        spkiBase64url(p256.publicKey),
      pairingStateDir: stateDir,
      bindingRegistryFile: registryFile,
      now: () => clock,
    }),
    /login_public_key_type_invalid/,
    "non-Ed25519 key type admitted",
  );
  const boundB = bind(accountB, pairB.pairing_token, loginB);
  assert.equal(boundB.account, accountB);

  const rotationPair = issue(accountA);
  const replacement = crypto.generateKeyPairSync("ed25519");
  assert.throws(
    () => bind(accountA, rotationPair.pairing_token, replacement),
    /binding_account_exists/,
    "first-bind path silently rotated existing account",
  );
  const stillConsumable =
    consumeVoidPublicParticipantLoginPairingV1({
      account: accountA,
      pairingToken: rotationPair.pairing_token,
      stateDir,
      now: () => clock,
    });
  assert.equal(
    stillConsumable.consumed,
    true,
    "existing-account collision consumed pairing ticket",
  );

  const pairC = issue(accountC);
  assert.throws(
    () => bindVoidPublicParticipantLoginKeyV1({
      account: accountD,
      pairingToken: pairC.pairing_token,
      loginPublicKeySpkiBase64url:
        spkiBase64url(loginC.publicKey),
      pairingStateDir: stateDir,
      bindingRegistryFile: registryFile,
      now: () => clock,
    }),
    /pairing_ticket_unavailable/,
    "cross-account pairing token admitted",
  );
  const consumedC =
    consumeVoidPublicParticipantLoginPairingV1({
      account: accountC,
      pairingToken: pairC.pairing_token,
      stateDir,
      now: () => clock,
    });
  assert.equal(consumedC.consumed, true);

  assert.throws(
    () => bind(
      accountA,
      pairA.pairing_token,
      loginA,
    ),
    /binding_account_exists/,
    "existing binding unexpectedly accepted replay",
  );

  const finalRegistry =
    JSON.parse(fs.readFileSync(registryFile, "utf8"));
  assert.deepEqual(
    finalRegistry.bindings.map((row) => row.account),
    [accountB, accountA].sort(),
  );

  const bindingSource = fs.readFileSync(
    new URL(
      "../tools/void-public-participant-login-binding-v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  for (const forbidden of [
    "participant_wallets_v1",
    "scryptSync",
    "createDecipheriv",
    "privateKey",
    "sendTransaction",
  ]) {
    assert.equal(
      bindingSource.includes(forbidden),
      false,
      "public binding stage contains secret/signing primitive: " + forbidden,
    );
  }
  assert.match(bindingSource, /consumeVoidPublicParticipantLoginPairingV1/);
  assert.match(bindingSource, /binding_account_exists/);
  assert.match(bindingSource, /participant\.account\.read\.v1/);
  assert.match(bindingSource, /login_public_key_type_invalid/);

  console.log(MARKER);
  console.log("local_pairing_to_binding_composed=true");
  console.log("binding_to_session_composed=true");
  console.log("ed25519_only=true");
  console.log("public_key_fingerprint_bound=true");
  console.log("raw_pairing_token_persisted=false");
  console.log("login_private_key_persisted=false");
  console.log("invalid_key_does_not_consume_ticket=true");
  console.log("existing_account_does_not_consume_ticket=true");
  console.log("silent_rotation=false");
  console.log("wallet_passphrase_transport=false");
  console.log("wallet_private_key_access=false");
  console.log("wallet_unlock_performed=false");
  console.log("transaction_signing=false");
  console.log("money_movement_authority=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
