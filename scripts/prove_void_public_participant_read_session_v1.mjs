#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1,
  createVoidPublicParticipantReadSessionV1,
} from "../ops/public/void-public-participant-read-session-v1.mjs";

const MARKER = "VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-participant-session-"),
);
const registryFile = path.join(temp, "participant-login-bindings-v1.json");
let clock = 1_800_000_000_000;
let randomCounter = 0;

function deterministicBytes(size) {
  randomCounter += 1;
  return crypto.createHash("sha256")
    .update("void-session-proof-" + randomCounter)
    .digest()
    .subarray(0, size);
}

function fingerprint(publicKey) {
  return crypto.createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
}

function binding(account, publicKey) {
  return {
    account,
    status: "active",
    key_type: "ed25519",
    public_key_pem: publicKey.export({ type: "spki", format: "pem" }),
    public_key_fingerprint_sha256: fingerprint(publicKey),
    capabilities: ["participant.account.read.v1"],
  };
}

function writeRegistry(bindings) {
  fs.writeFileSync(
    registryFile,
    JSON.stringify({
      marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
      version: 1,
      bindings,
    }, null, 2) + "\n",
    { mode: 0o600 },
  );
}

function signatureFor(challenge, privateKey) {
  const payload = Buffer.from(
    challenge.signing_payload_base64url,
    "base64url",
  );
  return crypto.sign(null, payload, privateKey).toString("base64url");
}

function loginBody(challenge, privateKey) {
  return {
    challenge_id: challenge.challenge_id,
    nonce: challenge.nonce,
    account: challenge.account,
    signature_base64url: signatureFor(challenge, privateKey),
  };
}

const source = fs.readFileSync(
  new URL(
    "../ops/public/void-public-participant-read-session-v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

try {
  const account = "zoso";
  const other = "other-account";
  const primary = crypto.generateKeyPairSync("ed25519");
  const alternate = crypto.generateKeyPairSync("ed25519");
  writeRegistry([binding(account, primary.publicKey)]);

  const service = createVoidPublicParticipantReadSessionV1({
    bindingRegistryFile: registryFile,
    now: () => clock,
    randomBytes: deterministicBytes,
  });

  assert.equal(
    service.authority.marker,
    "VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1",
  );
  assert.equal(
    service.authority.login_domain,
    "VOID_PUBLIC_PARTICIPANT_READ_SESSION_LOGIN_V1",
  );
  assert.equal(
    service.authority.binding_registry_marker,
    "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
  );
  assert.equal(
    service.authority.capability,
    "participant.account.read.v1",
  );

  for (const key of [
    "wallet_passphrase_transport",
    "wallet_private_key_access",
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
  assert.equal(
    challenge.capability,
    "participant.account.read.v1",
  );
  assert.equal(
    challenge.signing_domain,
    "VOID_PUBLIC_PARTICIPANT_READ_SESSION_LOGIN_V1",
  );
  assert.match(challenge.challenge_id, /^[0-9a-f]{32}$/);
  assert.match(challenge.nonce, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(
    Buffer.from(
      challenge.signing_payload_base64url,
      "base64url",
    ).length > 64,
  );

  const login = service.login(loginBody(challenge, primary.privateKey));
  assert.equal(login.account, account);
  assert.equal(
    login.public_key_fingerprint_sha256,
    fingerprint(primary.publicKey),
  );
  assert.equal(login.wallet_unlocked, false);
  assert.equal(login.signing_authority, false);
  assert.equal(login.money_movement_authority, false);
  assert.match(
    login.session_token,
    /^vps1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/,
  );

  assert.throws(
    () => service.login(loginBody(challenge, primary.privateKey)),
    /challenge_unavailable/,
    "consumed challenge replay admitted",
  );

  const authorized = service.authorize(
    "Bearer " + login.session_token,
    account,
  );
  assert.deepEqual(authorized, {
    account,
    public_key_fingerprint_sha256:
      fingerprint(primary.publicKey),
    capability: "participant.account.read.v1",
    read_only: true,
    wallet_unlocked: false,
    signing_authority: false,
    money_movement_authority: false,
  });

  assert.throws(
    () => service.authorize(
      "Bearer " + login.session_token,
      other,
    ),
    /session_account_mismatch/,
  );

  const tampered = login.session_token.slice(0, -1) +
    (login.session_token.endsWith("A") ? "B" : "A");
  assert.throws(
    () => service.authorize("Bearer " + tampered, account),
    /session_token_invalid/,
  );

  const wrongSignatureChallenge = service.challenge(account);
  assert.throws(
    () => service.login(
      loginBody(wrongSignatureChallenge, alternate.privateKey),
    ),
    /account_authentication_failed/,
  );
  assert.throws(
    () => service.login(
      loginBody(wrongSignatureChallenge, primary.privateKey),
    ),
    /challenge_unavailable/,
    "failed signature challenge replay admitted",
  );

  const unboundChallenge = service.challenge(other);
  assert.equal(
    unboundChallenge.account,
    other,
    "challenge issuance must not enumerate binding existence",
  );
  assert.throws(
    () => service.login(
      loginBody(unboundChallenge, alternate.privateKey),
    ),
    /account_authentication_failed/,
    "unbound account authentication was distinguishable or admitted",
  );

  const substitutedAccountChallenge = service.challenge(account);
  const substitutedSignature = signatureFor(
    substitutedAccountChallenge,
    primary.privateKey,
  );
  assert.throws(
    () => service.login({
      challenge_id: substitutedAccountChallenge.challenge_id,
      nonce: substitutedAccountChallenge.nonce,
      account: other,
      signature_base64url: substitutedSignature,
    }),
    /account_authentication_failed/,
  );

  const expiredChallenge = service.challenge(account);
  clock +=
    VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.challenge_ttl_ms + 1;
  assert.throws(
    () => service.login(
      loginBody(expiredChallenge, primary.privateKey),
    ),
    /challenge_unavailable|account_authentication_failed/,
  );

  const fresh = service.challenge(account);
  const second = service.login(
    loginBody(fresh, primary.privateKey),
  );
  assert.equal(
    service.authorize(
      "Bearer " + second.session_token,
      account,
    ).account,
    account,
  );
  clock +=
    VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.session_ttl_ms + 1;
  assert.throws(
    () => service.authorize(
      "Bearer " + second.session_token,
      account,
    ),
    /session_unavailable/,
  );

  clock = 1_800_000_000_000;
  const logoutChallenge = service.challenge(account);
  const logoutSession = service.login(
    loginBody(logoutChallenge, primary.privateKey),
  );
  assert.equal(
    service.logout("Bearer " + logoutSession.session_token),
    true,
  );
  assert.throws(
    () => service.authorize(
      "Bearer " + logoutSession.session_token,
      account,
    ),
    /session_unavailable/,
  );

  const rotationChallenge = service.challenge(account);
  const rotationSession = service.login(
    loginBody(rotationChallenge, primary.privateKey),
  );
  writeRegistry([binding(account, alternate.publicKey)]);
  assert.throws(
    () => service.authorize(
      "Bearer " + rotationSession.session_token,
      account,
    ),
    /session_binding_stale/,
    "rotated login binding did not invalidate existing session",
  );

  const oldKeyChallenge = service.challenge(account);
  assert.throws(
    () => service.login(
      loginBody(oldKeyChallenge, primary.privateKey),
    ),
    /account_authentication_failed/,
    "retired login key remained usable",
  );

  const newKeyChallenge = service.challenge(account);
  const newKeySession = service.login(
    loginBody(newKeyChallenge, alternate.privateKey),
  );
  assert.equal(
    newKeySession.public_key_fingerprint_sha256,
    fingerprint(alternate.publicKey),
  );

  writeRegistry([]);
  assert.throws(
    () => service.authorize(
      "Bearer " + newKeySession.session_token,
      account,
    ),
    /session_binding_stale/,
    "binding revocation did not invalidate active session",
  );

  assert.equal(
    source.includes("passphrase"),
    false,
    "public session primitive must not accept wallet passphrases",
  );
  assert.equal(
    source.includes("private_key"),
    false,
    "public session primitive must not access wallet private keys",
  );
  assert.equal(
    source.includes("sendTransaction"),
    false,
    "public session primitive must not sign transactions",
  );
  assert.equal(
    source.includes("UNLOCKED"),
    false,
    "public session primitive must not touch wallet unlock cache",
  );

  assert.match(source, /crypto\.verify/);
  assert.match(source, /crypto\.timingSafeEqual/);
  assert.match(source, /session_account_mismatch/);
  assert.match(source, /session_binding_stale/);
  assert.match(source, /participant\.account\.read\.v1/);
  assert.match(source, /account_authentication_failed/);
  assert.match(source, /binding_registry_mode_invalid/);
  assert.match(source, /binding_registry_parent_mode_invalid/);
  assert.match(source, /binding_registry_owner_invalid/);
  assert.match(source, /wallet_passphrase_transport: false/);
  assert.match(source, /wallet_private_key_access: false/);
  assert.match(source, /wallet_unlocked: false/);
  assert.match(source, /signing_authority: false/);
  assert.match(source, /money_movement_authority: false/);

  console.log(MARKER);
  console.log("challenge_binding_enumeration=false");
  console.log("challenge_replay_rejected=true");
  console.log("wrong_signature_rejected=true");
  console.log("unbound_account_rejected=true");
  console.log("cross_account_session_rejected=true");
  console.log("tampered_token_rejected=true");
  console.log("challenge_expiry_rejected=true");
  console.log("session_expiry_rejected=true");
  console.log("logout_revokes=true");
  console.log("binding_rotation_invalidates_session=true");
  console.log("binding_revocation_invalidates_session=true");
  console.log("wallet_passphrase_transport=false");
  console.log("wallet_private_key_access=false");
  console.log("wallet_unlock_performed=false");
  console.log("signing_authority=false");
  console.log("money_movement_authority=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
