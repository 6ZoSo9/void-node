#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1,
  createVoidParticipantBrowserLoginKeyV1,
  createVoidParticipantLoginKeyIndexedDbStoreV1,
} from "../public/void-app-wave1-v1/assets/js/participant-login-key-v1.js";

const MARKER =
  "VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1_PROOF_GREEN";
const records = new Map();
let clock = 1_800_000_000_000;

const store = Object.freeze({
  async get(account) {
    return records.get(account);
  },
  async add(record) {
    if (records.has(record.account)) {
      throw new Error("duplicate");
    }
    records.set(record.account, record);
  },
});

function b64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function challenge(account, overrides = {}) {
  const issued = clock;
  const expires =
    issued +
    VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.challenge_ttl_ms;
  const challengeId = "a".repeat(32);
  const nonce = b64url(Buffer.alloc(32, 7));
  const payload = [
    VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.login_domain,
    account,
    challengeId,
    nonce,
    issued,
    expires,
    VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.capability,
  ];
  return {
    ok: true,
    marker:
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.challenge_marker,
    challenge_id: challengeId,
    nonce,
    account,
    capability:
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.capability,
    signing_domain:
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.login_domain,
    signing_payload_base64url:
      b64url(Buffer.from(JSON.stringify(payload), "utf8")),
    issued_at_ms: issued,
    expires_at_ms: expires,
    ...overrides,
  };
}

try {
  for (const key of [
    "private_key_extractable",
    "raw_private_key_export",
    "arbitrary_message_signing",
    "network_access",
    "local_storage_secret",
    "session_storage_secret",
    "cookie_secret",
    "wallet_secret_access",
    "wallet_signing_authority",
    "transaction_signing_authority",
    "money_movement_authority",
  ]) {
    assert.equal(
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1[key],
      false,
      key,
    );
  }

  const manager = createVoidParticipantBrowserLoginKeyV1({
    cryptoImpl: globalThis.crypto,
    store,
    now: () => clock,
  });

  const account = "participant-a";
  const descriptor = await manager.create(account);
  assert.equal(descriptor.account, account);
  assert.equal(descriptor.key_type, "ed25519");
  assert.equal(
    descriptor.capability,
    "participant.account.read.v1",
  );
  assert.match(
    descriptor.public_key_spki_base64url,
    /^[A-Za-z0-9_-]+$/,
  );
  assert.match(
    descriptor.public_key_fingerprint_sha256,
    /^[0-9a-f]{64}$/,
  );
  assert.equal(descriptor.private_key_extractable, false);
  assert.equal("private_key" in descriptor, false);

  const stored = records.get(account);
  assert.equal(stored.private_key.extractable, false);
  assert.deepEqual(stored.private_key.usages, ["sign"]);
  assert.equal(stored.public_key.extractable, true);
  assert.deepEqual(stored.public_key.usages, ["verify"]);

  await assert.rejects(
    globalThis.crypto.subtle.exportKey(
      "pkcs8",
      stored.private_key,
    ),
    (error) =>
      error &&
      (
        error.name === "InvalidAccessException" ||
        error.name === "InvalidAccessError"
      ),
    "non-extractable private key unexpectedly exported",
  );

  await assert.rejects(
    manager.create(account),
    /login_key_already_exists/,
    "duplicate local account key admitted",
  );

  const described = await manager.describe(account);
  assert.deepEqual(described, descriptor);

  const validChallenge = challenge(account);
  const loginBody = await manager.signChallenge(
    account,
    validChallenge,
  );
  assert.deepEqual(
    Object.keys(loginBody).sort(),
    [
      "challenge_id",
      "nonce",
      "account",
      "signature_base64url",
    ].sort(),
  );
  assert.equal(loginBody.account, account);
  assert.match(
    loginBody.signature_base64url,
    /^[A-Za-z0-9_-]{86}$/,
  );

  const verified = await globalThis.crypto.subtle.verify(
    { name: "Ed25519" },
    stored.public_key,
    Buffer.from(loginBody.signature_base64url, "base64url"),
    Buffer.from(
      validChallenge.signing_payload_base64url,
      "base64url",
    ),
  );
  assert.equal(verified, true);

  const foreignPair = await globalThis.crypto.subtle.generateKey(
    { name: "Ed25519" },
    false,
    ["sign", "verify"],
  );
  const originalPrivateKey = stored.private_key;
  stored.private_key = foreignPair.privateKey;
  await assert.rejects(
    manager.signChallenge(account, validChallenge),
    /login_signature_self_verify_failed/,
    "mismatched stored public/private keypair emitted login evidence",
  );
  stored.private_key = originalPrivateKey;

  await assert.rejects(
    manager.signChallenge(
      account,
      challenge("participant-b"),
    ),
    /login_challenge_invalid/,
    "cross-account challenge signed",
  );

  await assert.rejects(
    manager.signChallenge(
      account,
      challenge(account, {
        signing_domain: "ATTACKER_DOMAIN",
      }),
    ),
    /login_challenge_invalid/,
    "foreign signing domain admitted",
  );

  const tampered = challenge(account);
  tampered.signing_payload_base64url = b64url(
    Buffer.from(
      JSON.stringify([
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.login_domain,
        account,
        "b".repeat(32),
        tampered.nonce,
        tampered.issued_at_ms,
        tampered.expires_at_ms,
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.capability,
      ]),
      "utf8",
    ),
  );
  await assert.rejects(
    manager.signChallenge(account, tampered),
    /login_challenge_payload_mismatch/,
    "tampered challenge payload signed",
  );

  await assert.rejects(
    manager.signChallenge(
      account,
      {
        ...validChallenge,
        extra: "not-allowed",
      },
    ),
    /login_challenge_shape_invalid/,
    "extra challenge field admitted",
  );

  assert.throws(
    () => createVoidParticipantLoginKeyIndexedDbStoreV1({
      indexedDBImpl: { open() {} },
      secureContext: false,
    }),
    /secure_context_required/,
  );

  const serialized = JSON.stringify([
    descriptor,
    described,
    loginBody,
  ]);
  assert.equal(
    serialized.includes("PRIVATE KEY"),
    false,
    "private key text escaped public descriptors",
  );

  const source = fs.readFileSync(
    new URL(
      "../public/void-app-wave1-v1/assets/js/participant-login-key-v1.js",
      import.meta.url,
    ),
    "utf8",
  );

  for (const forbidden of [
    "fetch(",
    "XMLHttpRequest",
    "localStorage",
    "sessionStorage",
    "document.cookie",
    "sendTransaction",
    "eth_sendTransaction",
    "personal_sign",
    'exportKey("pkcs8"',
    "wallet_passphrase",
    "mnemonic",
    "seed_phrase",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "forbidden browser key capability: " + forbidden,
    );
  }

  assert.match(
    source,
    /generateKey\([\s\S]*?false,[\s\S]*?\["sign", "verify"\]/,
  );
  assert.match(source, /exportKey\("spki", publicKey\)/);
  assert.match(source, /store\.add\(record\)/);
  assert.match(source, /store\.get\(account\)/);
  assert.match(source, /store\.keyPath !== "account"/);
  assert.match(source, /store\.autoIncrement !== false/);
  assert.equal(source.includes("store.put("), false);
  assert.equal(source.includes("store.delete("), false);
  assert.equal(source.includes("store.clear("), false);
  assert.match(source, /login_challenge_payload_mismatch/);
  assert.match(source, /login_signature_self_verify_failed/);
  assert.match(source, /cryptoImpl\.subtle\.verify/);

  const rawEmptyCatch =
    /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
  assert.equal(
    Array.from(source.matchAll(rawEmptyCatch)).length,
    0,
    "raw empty catch introduced",
  );

  console.log(MARKER);
  console.log("ed25519_login_key_generated=true");
  console.log("private_key_extractable=false");
  console.log("public_spki_export_only=true");
  console.log("private_key_export_rejected=true");
  console.log("indexeddb_store_contract=true");
  console.log("indexeddb_exact_account_keypath=true");
  console.log("indexeddb_replace_delete_clear=false");
  console.log("secure_context_required=true");
  console.log("duplicate_local_key_rejected=true");
  console.log("arbitrary_message_signing=false");
  console.log("exact_void_login_challenge_required=true");
  console.log("signature_self_verified_before_return=true");
  console.log("mismatched_stored_keypair_rejected=true");
  console.log("cross_account_challenge_rejected=true");
  console.log("foreign_signing_domain_rejected=true");
  console.log("tampered_payload_rejected=true");
  console.log("wallet_secret_access=false");
  console.log("transaction_signing_authority=false");
  console.log("money_movement_authority=false");
} catch (error) {
  console.error(MARKER.replace("_GREEN", "_HOLD"));
  throw error;
}
