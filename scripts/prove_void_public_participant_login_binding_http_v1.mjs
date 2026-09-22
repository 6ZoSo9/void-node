#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1,
  createVoidPublicParticipantLoginBindingHttpV1,
} from "../ops/public/void-public-participant-login-binding-http-v1.mjs";

const MARKER =
  "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-binding-http-proof-"),
);
const pairingStateDir = path.join(temp, "pairing");
const activeDir = path.join(pairingStateDir, "active");
const consumedDir = path.join(pairingStateDir, "consumed");
const registryDir = path.join(temp, "registry");
const bindingRegistryFile = path.join(
  registryDir,
  "participant-login-bindings-v1.json",
);
const clock = 1_800_000_000_000;

function pairingToken(idByte, secretByte) {
  const id = Buffer.alloc(16, idByte).toString("hex");
  const secret = Buffer.alloc(32, secretByte).toString("base64url");
  return {
    id,
    token: `vpp1.${id}.${secret}`,
  };
}

function writeTicket({
  account,
  idByte,
  secretByte,
}) {
  const { id, token } = pairingToken(idByte, secretByte);
  const row = {
    marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1",
    version: 1,
    ticket_id: id,
    account,
    wallet_address: "0x" + "12".repeat(20),
    token_sha256: crypto
      .createHash("sha256")
      .update(token, "utf8")
      .digest("hex"),
    capability: "participant.login_key.bind.v1",
    issued_at_ms: clock,
    expires_at_ms: clock + 5 * 60_000,
  };
  const file = path.join(activeDir, id + ".json");
  fs.writeFileSync(
    file,
    JSON.stringify(row, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(file, 0o600);
  return { id, token, file };
}

function publicSpkiBase64url(keyPair) {
  return keyPair.publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64url");
}

function request(url, {
  method = "POST",
  headers = {},
  body = null,
} = {}) {
  return { url, method, headers, body };
}

function bindRequest(account, token, spki, extra = {}) {
  return request(
    VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.bind_path,
    {
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        account,
        pairing_token: token,
        login_public_key_spki_base64url: spki,
        ...extra,
      }),
    },
  );
}

try {
  fs.mkdirSync(activeDir, {
    recursive: true,
    mode: 0o700,
  });
  fs.mkdirSync(consumedDir, {
    recursive: true,
    mode: 0o700,
  });
  fs.mkdirSync(registryDir, {
    recursive: true,
    mode: 0o700,
  });
  fs.chmodSync(pairingStateDir, 0o700);
  fs.chmodSync(activeDir, 0o700);
  fs.chmodSync(consumedDir, 0o700);
  fs.chmodSync(registryDir, 0o700);

  for (const key of [
    "cookie_authentication",
    "authorization_header_authentication",
    "raw_pairing_token_persistence",
    "wallet_passphrase_transport",
    "wallet_private_key_access",
    "login_private_key_access",
    "wallet_unlock_authority",
    "signer_cache_write_authority",
    "transaction_signing_authority",
    "wallet_send_authority",
    "work_credit_mutation_authority",
    "validator_mutation_authority",
    "generic_rpc_authority",
    "money_movement_authority",
    "listener_created",
    "production_route_mounted",
  ]) {
    assert.equal(
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1[key],
      false,
      key,
    );
  }

  const http = createVoidPublicParticipantLoginBindingHttpV1({
    pairingStateDir,
    bindingRegistryFile,
    now: () => clock,
  });

  const status = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.status_path,
    { method: "GET" },
  ));
  assert.equal(status.status, 200);
  assert.equal(status.body.pairing_token_single_use, true);
  assert.equal(status.body.login_key_type, "ed25519");
  assert.equal(status.headers["cache-control"], "no-store");

  const account = "participant-a";
  const login = crypto.generateKeyPairSync("ed25519");
  const first = writeTicket({
    account,
    idByte: 0x11,
    secretByte: 0x21,
  });

  const success = await http.handle(
    bindRequest(
      account,
      first.token,
      publicSpkiBase64url(login),
    ),
  );
  assert.equal(success.status, 200);
  assert.equal(success.body.ok, true);
  assert.equal(success.body.account, account);
  assert.equal(success.body.key_type, "ed25519");
  assert.equal(success.body.binding_created, true);
  assert.equal(success.body.pairing_consumed, true);
  assert.equal(success.body.wallet_secret_transport, false);
  assert.equal(success.body.login_private_key_transport, false);
  assert.equal(success.body.signing_authority, false);
  assert.equal(success.body.money_movement_authority, false);
  assert.equal("pairing_token" in success.body, false);
  assert.equal("wallet_address" in success.body, false);

  const registryStat = fs.lstatSync(bindingRegistryFile);
  assert.equal(registryStat.mode & 0o777, 0o600);
  const registry = JSON.parse(
    fs.readFileSync(bindingRegistryFile, "utf8"),
  );
  assert.equal(
    registry.marker,
    "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
  );
  assert.equal(registry.bindings.length, 1);
  assert.equal(registry.bindings[0].account, account);
  assert.equal(registry.bindings[0].key_type, "ed25519");
  assert.deepEqual(
    registry.bindings[0].capabilities,
    ["participant.account.read.v1"],
  );
  assert.equal(
    registry.bindings[0].public_key_fingerprint_sha256,
    success.body.public_key_fingerprint_sha256,
  );

  assert.equal(fs.existsSync(first.file), false);
  const consumedFirst = path.join(
    consumedDir,
    first.id + ".json",
  );
  assert.equal(fs.existsSync(consumedFirst), true);
  assert.equal(
    fs.lstatSync(consumedFirst).mode & 0o777,
    0o600,
  );

  const replay = await http.handle(
    bindRequest(
      account,
      first.token,
      publicSpkiBase64url(login),
    ),
  );
  assert.equal(replay.status, 401);
  assert.deepEqual(replay.body, {
    ok: false,
    error: "enrollment_failed",
  });

  const replacement = crypto.generateKeyPairSync("ed25519");
  const collision = writeTicket({
    account,
    idByte: 0x22,
    secretByte: 0x32,
  });
  const collisionResponse = await http.handle(
    bindRequest(
      account,
      collision.token,
      publicSpkiBase64url(replacement),
    ),
  );
  assert.equal(collisionResponse.status, 401);
  assert.deepEqual(collisionResponse.body, {
    ok: false,
    error: "enrollment_failed",
  });
  assert.equal(
    fs.existsSync(collision.file),
    true,
    "existing binding collision consumed pairing ticket",
  );

  const otherAccount = "participant-b";
  const p256 = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const invalidKeyTicket = writeTicket({
    account: otherAccount,
    idByte: 0x33,
    secretByte: 0x43,
  });
  const invalidKey = await http.handle(
    bindRequest(
      otherAccount,
      invalidKeyTicket.token,
      publicSpkiBase64url(p256),
    ),
  );
  assert.equal(invalidKey.status, 401);
  assert.deepEqual(invalidKey.body, {
    ok: false,
    error: "enrollment_failed",
  });
  assert.equal(
    fs.existsSync(invalidKeyTicket.file),
    true,
    "invalid key type consumed pairing ticket",
  );

  const syntaxFailure = await http.handle(
    bindRequest(
      "participant-c",
      "vpp1.not-a-token",
      publicSpkiBase64url(
        crypto.generateKeyPairSync("ed25519"),
      ),
    ),
  );
  assert.equal(syntaxFailure.status, 400);
  assert.deepEqual(syntaxFailure.body, {
    ok: false,
    error: "invalid_enrollment_request",
  });

  const extraField = await http.handle(
    bindRequest(
      "participant-c",
      pairingToken(0x44, 0x54).token,
      publicSpkiBase64url(
        crypto.generateKeyPairSync("ed25519"),
      ),
      { extra: true },
    ),
  );
  assert.equal(extraField.status, 400);

  const withAuthorization = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.bind_path,
    {
      headers: {
        "content-type": "application/json",
        authorization: "Bearer ignored",
      },
      body: JSON.stringify({
        account: "participant-c",
        pairing_token: pairingToken(0x44, 0x54).token,
        login_public_key_spki_base64url:
          publicSpkiBase64url(
            crypto.generateKeyPairSync("ed25519"),
          ),
      }),
    },
  ));
  assert.equal(withAuthorization.status, 400);
  assert.equal(
    withAuthorization.body.error,
    "ambient_auth_not_accepted",
  );

  const withCookie = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.bind_path,
    {
      headers: {
        "content-type": "application/json",
        cookie: "session=ambient",
      },
      body: "{}",
    },
  ));
  assert.equal(withCookie.status, 400);
  assert.equal(
    withCookie.body.error,
    "ambient_auth_not_accepted",
  );

  const withQuery = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.bind_path +
      "?account=" + account,
    {
      headers: { "content-type": "application/json" },
      body: "{}",
    },
  ));
  assert.equal(withQuery.status, 404);

  const source = fs.readFileSync(
    new URL(
      "../ops/public/void-public-participant-login-binding-http-v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  for (const forbidden of [
    "createServer(",
    ".listen(",
    "readLocalPassphrase",
    "participant_wallets_v1",
    "scryptSync",
    "createDecipheriv",
    "privateKey",
    "sendTransaction",
    "eth_sendTransaction",
    "document.cookie",
    "set-cookie",
    "/wc/",
    "/jobs",
    "/receipts",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "forbidden authority/integration marker: " + forbidden,
    );
  }

  const serialized = JSON.stringify([
    success,
    replay,
    collisionResponse,
    invalidKey,
  ]);
  assert.equal(
    serialized.includes(first.token),
    false,
    "raw pairing token reflected in response",
  );

  const rawEmptyCatch =
    /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
  assert.equal(
    Array.from(source.matchAll(rawEmptyCatch)).length,
    0,
    "raw empty catch introduced",
  );

  console.log(MARKER);
  console.log("actual_binding_primitive_composed=true");
  console.log("pairing_ticket_single_use=true");
  console.log("binding_registry_mode_0600=true");
  console.log("successful_response_omits_pairing_token=true");
  console.log("successful_response_omits_wallet_address=true");
  console.log("replay_failure_normalized=true");
  console.log("existing_binding_failure_normalized=true");
  console.log("invalid_key_failure_normalized=true");
  console.log("existing_binding_does_not_consume_ticket=true");
  console.log("invalid_key_does_not_consume_ticket=true");
  console.log("authorization_header_rejected=true");
  console.log("cookie_header_rejected=true");
  console.log("raw_pairing_token_persisted=false");
  console.log("wallet_secret_transport=false");
  console.log("login_private_key_transport=false");
  console.log("transaction_signing_authority=false");
  console.log("money_movement_authority=false");
  console.log("listener_created=false");
  console.log("production_route_mounted=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
