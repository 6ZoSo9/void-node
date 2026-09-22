#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1,
  createVoidPublicParticipantSessionHttpV1,
} from "../ops/public/void-public-participant-session-http-v1.mjs";

const MARKER = "VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-participant-session-http-proof-"),
);
const registryDir = path.join(temp, "registry");
const registryFile = path.join(
  registryDir,
  "participant-login-bindings-v1.json",
);
let clock = 1_800_000_000_000;
let randomCounter = 0;

function deterministicBytes(size) {
  randomCounter += 1;
  const first = crypto.createHash("sha256")
    .update("void-session-http-proof-a-" + randomCounter)
    .digest();
  if (size <= first.length) return first.subarray(0, size);
  const second = crypto.createHash("sha256")
    .update("void-session-http-proof-b-" + randomCounter)
    .digest();
  return Buffer.concat([first, second]).subarray(0, size);
}

function fingerprint(publicKey) {
  return crypto.createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
}

function request(url, {
  method = "POST",
  headers = {},
  body = null,
} = {}) {
  return { url, method, headers, body };
}

function jsonRequest(url, value) {
  return request(url, {
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
}

function signChallenge(challenge, privateKey) {
  return crypto.sign(
    null,
    Buffer.from(challenge.signing_payload_base64url, "base64url"),
    privateKey,
  ).toString("base64url");
}

try {
  fs.mkdirSync(registryDir, { mode: 0o700 });
  fs.chmodSync(registryDir, 0o700);

  const loginA = crypto.generateKeyPairSync("ed25519");
  const loginB = crypto.generateKeyPairSync("ed25519");
  const accountA = "participant-a";
  const accountB = "participant-b";

  const registry = {
    marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
    version: 1,
    bindings: [
      {
        account: accountA,
        status: "active",
        key_type: "ed25519",
        public_key_pem: String(
          loginA.publicKey.export({ type: "spki", format: "pem" }),
        ),
        public_key_fingerprint_sha256: fingerprint(loginA.publicKey),
        capabilities: ["participant.account.read.v1"],
      },
    ],
  };
  fs.writeFileSync(
    registryFile,
    JSON.stringify(registry, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(registryFile, 0o600);

  const adapter = createVoidPublicParticipantSessionHttpV1({
    bindingRegistryFile: registryFile,
    now: () => clock,
    randomBytes: deterministicBytes,
  });

  for (const key of [
    "cookie_authentication",
    "cors_wildcard",
    "wallet_passphrase_transport",
    "wallet_private_key_access",
    "wallet_unlock_performed",
    "signer_cache_written",
    "transaction_signing",
    "wallet_send_authority",
    "work_credit_mutation_authority",
    "validator_mutation_authority",
    "generic_rpc_authority",
    "money_movement_authority",
    "listener_created",
    "production_route_mounted",
  ]) {
    assert.equal(VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1[key], false, key);
  }

  const status = await adapter.handle(request(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.status_path,
    { method: "GET" },
  ));
  assert.equal(status.status, 200);
  assert.equal(status.body.ok, true);
  assert.equal(status.body.login_key_type, "ed25519");
  assert.equal(status.body.account_enumeration, false);
  assert.equal(status.headers["cache-control"], "no-store");

  const smuggledAuthority = await adapter.handle(jsonRequest(
    "//attacker.invalid" +
      VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.challenge_path,
    { account: accountA },
  ));
  assert.equal(smuggledAuthority.status, 404);

  const extraFieldChallenge = await adapter.handle(jsonRequest(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.challenge_path,
    { account: accountA, extra: true },
  ));
  assert.equal(extraFieldChallenge.status, 400);
  assert.equal(
    extraFieldChallenge.body.error,
    "invalid_challenge_request",
  );

  const unknownChallenge = await adapter.handle(jsonRequest(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.challenge_path,
    { account: accountB },
  ));
  assert.equal(unknownChallenge.status, 200);
  assert.equal(unknownChallenge.body.account, accountB);

  const unknownLogin = await adapter.handle(jsonRequest(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.login_path,
    {
      challenge_id: unknownChallenge.body.challenge_id,
      nonce: unknownChallenge.body.nonce,
      account: accountB,
      signature_base64url: signChallenge(
        unknownChallenge.body,
        loginB.privateKey,
      ),
    },
  ));
  assert.equal(unknownLogin.status, 401);
  assert.deepEqual(unknownLogin.body, {
    ok: false,
    error: "account_authentication_failed",
  });

  const wrongSignatureChallenge = await adapter.handle(jsonRequest(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.challenge_path,
    { account: accountA },
  ));
  const wrongSignatureLogin = await adapter.handle(jsonRequest(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.login_path,
    {
      challenge_id: wrongSignatureChallenge.body.challenge_id,
      nonce: wrongSignatureChallenge.body.nonce,
      account: accountA,
      signature_base64url: signChallenge(
        wrongSignatureChallenge.body,
        loginB.privateKey,
      ),
    },
  ));
  assert.equal(wrongSignatureLogin.status, 401);
  assert.deepEqual(wrongSignatureLogin.body, {
    ok: false,
    error: "account_authentication_failed",
  });

  const challenge = await adapter.handle(jsonRequest(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.challenge_path,
    { account: accountA },
  ));
  assert.equal(challenge.status, 200);
  assert.equal(challenge.body.account, accountA);
  assert.equal(challenge.body.capability, "participant.account.read.v1");

  const signature = signChallenge(challenge.body, loginA.privateKey);
  const login = await adapter.handle(jsonRequest(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.login_path,
    {
      challenge_id: challenge.body.challenge_id,
      nonce: challenge.body.nonce,
      account: accountA,
      signature_base64url: signature,
    },
  ));
  assert.equal(login.status, 200);
  assert.equal(login.body.account, accountA);
  assert.match(
    login.body.session_token,
    /^vps1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/,
  );
  assert.equal(login.body.signing_authority, false);
  assert.equal(login.body.money_movement_authority, false);

  const authorization = "Bearer " + login.body.session_token;
  const authorized = adapter.authorizeAccountRead(
    authorization,
    accountA,
  );
  assert.equal(authorized.account, accountA);
  assert.equal(authorized.read_only, true);
  assert.equal(authorized.signing_authority, false);
  assert.equal(authorized.money_movement_authority, false);

  assert.throws(
    () => adapter.authorizeAccountRead(authorization, accountB),
    /session_account_mismatch/,
    "session crossed account boundary",
  );

  const replay = await adapter.handle(jsonRequest(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.login_path,
    {
      challenge_id: challenge.body.challenge_id,
      nonce: challenge.body.nonce,
      account: accountA,
      signature_base64url: signature,
    },
  ));
  assert.equal(replay.status, 401);
  assert.equal(replay.body.error, "account_authentication_failed");

  const malformed = await adapter.handle(request(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.challenge_path,
    {
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ account: accountA }),
    },
  ));
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error, "invalid_challenge_request");

  const withQuery = await adapter.handle(jsonRequest(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.challenge_path + "?account=x",
    { account: accountA },
  ));
  assert.equal(withQuery.status, 404);

  const authOnLogin = await adapter.handle(request(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.login_path,
    {
      headers: {
        "content-type": "application/json",
        authorization,
      },
      body: JSON.stringify({
        challenge_id: "0".repeat(32),
        nonce: "x",
        account: accountA,
        signature_base64url: "A".repeat(86),
      }),
    },
  ));
  assert.equal(authOnLogin.status, 400);
  assert.equal(authOnLogin.body.error, "authorization_not_accepted");

  registry.bindings[0] = {
    account: accountA,
    status: "active",
    key_type: "ed25519",
    public_key_pem: String(
      loginB.publicKey.export({ type: "spki", format: "pem" }),
    ),
    public_key_fingerprint_sha256: fingerprint(loginB.publicKey),
    capabilities: ["participant.account.read.v1"],
  };
  fs.writeFileSync(
    registryFile,
    JSON.stringify(registry, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(registryFile, 0o600);

  assert.throws(
    () => adapter.authorizeAccountRead(authorization, accountA),
    /session_binding_stale/,
    "binding rotation did not invalidate active session",
  );

  const logout = await adapter.handle(request(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.logout_path,
    {
      headers: { authorization },
      body: null,
    },
  ));
  assert.equal(logout.status, 204);
  assert.equal(logout.body, null);

  assert.throws(
    () => adapter.authorizeAccountRead(authorization, accountA),
    /session_unavailable/,
    "logged-out session remained authorized",
  );

  const logoutReplay = await adapter.handle(request(
    VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.logout_path,
    {
      headers: { authorization },
      body: null,
    },
  ));
  assert.equal(logoutReplay.status, 204);

  const source = fs.readFileSync(
    new URL(
      "../ops/public/void-public-participant-session-http-v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );

  for (const forbidden of [
    "createServer(",
    ".listen(",
    "app.get(",
    "app.post(",
    "/__void/participant/wallet/",
    "/wc/",
    "/jobs",
    "/receipts",
    "sendTransaction",
    "privateKey",
    "mnemonic",
    "ciphertext",
    "document.cookie",
    "set-cookie",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "forbidden authority/integration marker: " + forbidden,
    );
  }

  const rawEmptyCatch =
    /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
  assert.equal(
    Array.from(source.matchAll(rawEmptyCatch)).length,
    0,
    "raw empty catch introduced",
  );

  console.log(MARKER);
  console.log("unknown_account_challenge_indistinguishable=true");
  console.log("unknown_account_login_generic_failure=true");
  console.log("ed25519_login_success=true");
  console.log("exact_account_authorization=true");
  console.log("cross_account_authorization_rejected=true");
  console.log("binding_rotation_invalidates_active_session=true");
  console.log("route_authority_smuggling_rejected=true");
  console.log("extra_request_fields_rejected=true");
  console.log("wrong_signature_generic_failure=true");
  console.log("challenge_replay_rejected=true");
  console.log("logout_idempotent=true");
  console.log("logged_out_session_rejected=true");
  console.log("wallet_passphrase_transport=false");
  console.log("wallet_private_key_access=false");
  console.log("wallet_unlock_performed=false");
  console.log("transaction_signing=false");
  console.log("work_credit_mutation=false");
  console.log("money_movement_authority=false");
  console.log("listener_created=false");
  console.log("production_route_mounted=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
