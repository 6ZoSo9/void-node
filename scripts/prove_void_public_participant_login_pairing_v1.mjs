#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import {
  VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1,
  issueVoidPublicParticipantLoginPairingV1,
  consumeVoidPublicParticipantLoginPairingV1,
} from "../tools/void-public-participant-login-pairing-v1.mjs";

const MARKER =
  "VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-participant-pairing-proof-"),
);
const dataDir = path.join(temp, "data");
const stateDir = path.join(temp, "pairing-state");
const passphraseFile = path.join(temp, "wallet-passphrase.txt");
const account = "zoso";
const passphrase = "correct horse battery staple";
const privateKey = "0x" + "11".repeat(32);
let clock = 1_800_000_000_000;
let randomCounter = 0;

function deterministicBytes(size) {
  randomCounter += 1;
  return crypto.createHash("sha256")
    .update("void-pairing-proof-" + randomCounter)
    .digest()
    .subarray(0, size);
}

function writeWallet(
  root,
  accountId,
  pk,
  password,
  { address } = {},
) {
  const wallet = new Wallet(pk);
  const salt = Buffer.from(
    "00112233445566778899aabbccddeeff",
    "hex",
  );
  const iv = Buffer.from("00112233445566778899aabb", "hex");
  const key = crypto.scryptSync(password, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(pk, "utf8"),
    cipher.final(),
  ]);
  const walletDir = path.join(root, "participant_wallets_v1");
  fs.mkdirSync(walletDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(walletDir, accountId + ".json"),
    JSON.stringify({
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
    }, null, 2) + "\n",
    { mode: 0o600 },
  );
  return wallet.address;
}

function readAllState(root) {
  if (!fs.existsSync(root)) return "";
  const chunks = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const stat = fs.lstatSync(p);
      if (stat.isDirectory()) walk(p);
      else if (stat.isFile()) chunks.push(fs.readFileSync(p, "utf8"));
    }
  };
  walk(root);
  return chunks.join("\n");
}

const source = fs.readFileSync(
  new URL(
    "../tools/void-public-participant-login-pairing-v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

try {
  const address = writeWallet(
    dataDir,
    account,
    privateKey,
    passphrase,
  );
  fs.writeFileSync(passphraseFile, passphrase + "\n", {
    mode: 0o600,
  });
  fs.chmodSync(passphraseFile, 0o600);

  assert.equal(
    VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.capability,
    "participant.login_key.bind.v1",
  );
  for (const key of [
    "wallet_passphrase_public_transport",
    "wallet_unlock_performed",
    "signer_cache_written",
    "transaction_signing",
    "wallet_send_authority",
    "work_credit_mutation_authority",
    "validator_mutation_authority",
    "money_movement_authority",
    "binding_registry_mutation_authority",
  ]) {
    assert.equal(
      VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1[key],
      false,
      key,
    );
  }

  const issued = issueVoidPublicParticipantLoginPairingV1({
    account,
    dataDir,
    passphraseFile,
    stateDir,
    now: () => clock,
    randomBytes: deterministicBytes,
  });

  assert.equal(issued.account, account);
  assert.equal(
    issued.wallet_address.toLowerCase(),
    address.toLowerCase(),
  );
  assert.equal(
    issued.capability,
    "participant.login_key.bind.v1",
  );
  assert.match(
    issued.pairing_token,
    /^vpp1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/,
  );
  assert.equal(issued.wallet_unlocked, false);
  assert.equal(issued.signing_authority, false);
  assert.equal(issued.money_movement_authority, false);

  const stateText = readAllState(stateDir);
  assert.equal(
    stateText.includes(issued.pairing_token),
    false,
    "raw pairing token persisted",
  );
  assert.equal(
    stateText.includes(passphrase),
    false,
    "wallet passphrase persisted",
  );
  assert.equal(
    stateText.includes(privateKey),
    false,
    "wallet private key persisted",
  );

  assert.throws(
    () => issueVoidPublicParticipantLoginPairingV1({
      account,
      dataDir,
      passphraseFile,
      stateDir,
      now: () => clock,
      randomBytes: deterministicBytes,
    }),
    /pairing_ticket_already_active/,
    "duplicate active pairing ticket admitted",
  );

  const tampered = issued.pairing_token.slice(0, -1) +
    (issued.pairing_token.endsWith("A") ? "B" : "A");
  assert.throws(
    () => consumeVoidPublicParticipantLoginPairingV1({
      account,
      pairingToken: tampered,
      stateDir,
      now: () => clock,
    }),
    /pairing_ticket_unavailable/,
    "tampered token admitted",
  );

  assert.throws(
    () => consumeVoidPublicParticipantLoginPairingV1({
      account: "other-account",
      pairingToken: issued.pairing_token,
      stateDir,
      now: () => clock,
    }),
    /pairing_ticket_unavailable/,
    "cross-account consume admitted",
  );

  const consumed = consumeVoidPublicParticipantLoginPairingV1({
    account,
    pairingToken: issued.pairing_token,
    stateDir,
    now: () => clock,
  });
  assert.equal(consumed.consumed, true);
  assert.equal(consumed.account, account);
  assert.equal(
    consumed.wallet_address.toLowerCase(),
    address.toLowerCase(),
  );
  assert.equal(consumed.binding_registry_mutated, false);
  assert.equal(consumed.wallet_unlocked, false);
  assert.equal(consumed.signing_authority, false);
  assert.equal(consumed.money_movement_authority, false);

  assert.throws(
    () => consumeVoidPublicParticipantLoginPairingV1({
      account,
      pairingToken: issued.pairing_token,
      stateDir,
      now: () => clock,
    }),
    /pairing_ticket_unavailable/,
    "consumed pairing ticket replay admitted",
  );

  const second = issueVoidPublicParticipantLoginPairingV1({
    account,
    dataDir,
    passphraseFile,
    stateDir,
    now: () => clock,
    randomBytes: deterministicBytes,
  });
  clock += VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.ticket_ttl_ms + 1;
  assert.throws(
    () => consumeVoidPublicParticipantLoginPairingV1({
      account,
      pairingToken: second.pairing_token,
      stateDir,
      now: () => clock,
    }),
    /pairing_ticket_unavailable/,
    "expired ticket admitted",
  );

  const wrongPassFile = path.join(temp, "wrong-passphrase.txt");
  fs.writeFileSync(
    wrongPassFile,
    "definitely-wrong-password\n",
    { mode: 0o600 },
  );
  fs.chmodSync(wrongPassFile, 0o600);
  assert.throws(
    () => issueVoidPublicParticipantLoginPairingV1({
      account,
      dataDir,
      passphraseFile: wrongPassFile,
      stateDir: path.join(temp, "wrong-pass-state"),
      now: () => clock,
      randomBytes: deterministicBytes,
    }),
    /account_authentication_failed/,
  );

  const badModePassFile = path.join(temp, "bad-mode-passphrase.txt");
  fs.writeFileSync(badModePassFile, passphrase + "\n", {
    mode: 0o600,
  });
  fs.chmodSync(badModePassFile, 0o644);
  assert.throws(
    () => issueVoidPublicParticipantLoginPairingV1({
      account,
      dataDir,
      passphraseFile: badModePassFile,
      stateDir: path.join(temp, "bad-mode-state"),
      now: () => clock,
      randomBytes: deterministicBytes,
    }),
    /account_authentication_failed/,
  );

  const badDataDir = path.join(temp, "bad-data");
  writeWallet(
    badDataDir,
    account,
    privateKey,
    passphrase,
    { address: "0x" + "22".repeat(20) },
  );
  assert.throws(
    () => issueVoidPublicParticipantLoginPairingV1({
      account,
      dataDir: badDataDir,
      passphraseFile,
      stateDir: path.join(temp, "bad-wallet-state"),
      now: () => clock,
      randomBytes: deterministicBytes,
    }),
    /wallet_address_binding_mismatch/,
  );

  assert.equal(
    source.includes("UNLOCKED"),
    false,
    "pairing tool must not touch wallet unlock cache",
  );
  assert.equal(
    source.includes("sendTransaction"),
    false,
    "pairing tool must not sign transactions",
  );
  assert.equal(
    source.includes("binding_registry_mutated: true"),
    false,
    "pairing tool must not mutate login binding registry",
  );
  assert.match(source, /crypto\.timingSafeEqual/);
  assert.match(source, /pairing_ticket_already_active/);
  assert.match(source, /wallet_passphrase_public_transport: false/);
  assert.match(source, /wallet_unlock_performed: false/);
  assert.match(source, /binding_registry_mutation_authority: false/);

  console.log(MARKER);
  console.log("local_wallet_ownership_verified=true");
  console.log("passphrase_file_mode_0600_required=true");
  console.log("raw_pairing_token_persisted=false");
  console.log("wallet_passphrase_persisted=false");
  console.log("wallet_private_key_persisted=false");
  console.log("duplicate_active_ticket_rejected=true");
  console.log("tampered_ticket_rejected=true");
  console.log("cross_account_consume_rejected=true");
  console.log("single_use_consumption=true");
  console.log("expired_ticket_rejected=true");
  console.log("wallet_unlock_performed=false");
  console.log("binding_registry_mutated=false");
  console.log("signing_authority=false");
  console.log("money_movement_authority=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
