#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createVoidPublicParticipantSessionHttpV1,
} from "../ops/public/void-public-participant-session-http-v1.mjs";
import {
  VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1,
  createVoidPublicParticipantAccountReadHttpEdgeV1,
} from "../ops/public/void-public-participant-account-read-http-edge-v1.mjs";

const MARKER =
  "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-account-read-http-edge-proof-"),
);
const registryDir = path.join(temp, "registry");
const registryFile = path.join(
  registryDir,
  "participant-login-bindings-v1.json",
);
let clock = 1_800_000_000_000;
let randomCounter = 0;
let sourceFetches = 0;

function deterministicBytes(size) {
  randomCounter += 1;
  const a = crypto.createHash("sha256")
    .update("void-account-read-edge-proof-a-" + randomCounter)
    .digest();
  if (size <= a.length) return a.subarray(0, size);
  const b = crypto.createHash("sha256")
    .update("void-account-read-edge-proof-b-" + randomCounter)
    .digest();
  return Buffer.concat([a, b]).subarray(0, size);
}

function fingerprint(publicKey) {
  return crypto.createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
}

function jsonRequest(url, value) {
  return {
    url,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  };
}

function signChallenge(challenge, privateKey) {
  return crypto.sign(
    null,
    Buffer.from(challenge.signing_payload_base64url, "base64url"),
    privateKey,
  ).toString("base64url");
}

function walletSource(account) {
  return {
    marker: "VOID_UI_WAVE3_WALLET_READONLY_V1",
    read_only: true,
    account: { selected: true, id: account },
    wallet: {
      source_available: true,
      has_wallet: true,
      address: "0x" + "12".repeat(20),
      native_gas_available: true,
      native_gas_display: "0.5",
    },
    balances: {
      ledger_wc: { available: true, balance: 17, entries: 3 },
      production_wc: { available: true, balance: 5, entries: 1 },
    },
    boundaries: {
      browser_wallet_connection: false,
      wallet_create: false,
      wallet_import: false,
      wallet_unlock: false,
      wallet_export: false,
      wallet_send: false,
      wc_to_void: false,
      ledger_write: false,
      validator_mutation: false,
      operator_mutation: false,
      money_movement: false,
    },
  };
}

function earnSource(account) {
  return {
    marker: "VOID_UI_WAVE4_EARN_READONLY_V1",
    read_only: true,
    account: { selected: true, id: account },
    earning: {
      status: "manual_only",
      status_label: "Manual only",
      manual_only: true,
      automatic_background: false,
      safe_mode: true,
      jobs_last_hour: 2,
      max_jobs_per_hour: 8,
    },
    accounting: {
      legacy_wc: {
        available: true,
        earned: 21,
        redeemed: 4,
        redeemable: 17,
        debited: 0,
      },
      production_wc: {
        available: true,
        balance: 5,
        entries: 1,
      },
      rewards_last_hour: {
        total: 3,
        publish: 3,
        verify: 0,
        redundancy: 0,
      },
    },
    recent_jobs: { count: 1 },
    verification_receipts: { count: 1 },
    datanet: {
      source_available: true,
      status: "available",
      receipt_store_records: 9,
      account_wc_events: 4,
    },
    boundaries: {
      job_execution: false,
      job_submission: false,
      reward_award: false,
      runner_activation: false,
      runner_tick: false,
      runner_config: false,
      wc_redeem: false,
      wc_send: false,
      wc_to_void: false,
      ledger_write: false,
      browser_wallet_connection: false,
      validator_mutation: false,
      operator_mutation: false,
      money_movement: false,
    },
  };
}

async function fakeFetch(input, init = {}) {
  sourceFetches += 1;
  const url = new URL(String(input));
  assert.equal(url.origin, "http://127.0.0.1:4100");
  assert.equal(init.method, "GET");
  assert.equal(init.credentials, "omit");
  assert.equal(init.redirect, "error");
  const headers = Object.fromEntries(
    Object.entries(init.headers || {}).map(
      ([key, value]) => [
        String(key).toLowerCase(),
        String(value),
      ],
    ),
  );
  assert.equal(headers.authorization, undefined);
  assert.equal(headers.cookie, undefined);

  const account = url.searchParams.get("account");
  const body = url.pathname.endsWith("/wallet.json")
    ? walletSource(account)
    : earnSource(account);
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
  Object.defineProperty(response, "url", {
    value: url.href,
  });
  return response;
}

function edgeRequest(url, authorization, extra = {}) {
  return {
    url,
    method: extra.method || "GET",
    headers: {
      ...(authorization
        ? { authorization }
        : {}),
      ...(extra.headers || {}),
    },
    body: extra.body ?? null,
  };
}

try {
  fs.mkdirSync(registryDir, { mode: 0o700 });
  fs.chmodSync(registryDir, 0o700);

  const account = "participant-a";
  const otherAccount = "participant-b";
  const login = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(
    registryFile,
    JSON.stringify({
      marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
      version: 1,
      bindings: [{
        account,
        status: "active",
        key_type: "ed25519",
        public_key_pem: String(
          login.publicKey.export({
            type: "spki",
            format: "pem",
          }),
        ),
        public_key_fingerprint_sha256:
          fingerprint(login.publicKey),
        capabilities: ["participant.account.read.v1"],
      }],
    }, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(registryFile, 0o600);

  const sessionHttp =
    createVoidPublicParticipantSessionHttpV1({
      bindingRegistryFile: registryFile,
      now: () => clock,
      randomBytes: deterministicBytes,
    });

  const challenge = await sessionHttp.handle(
    jsonRequest(
      sessionHttp.authority.challenge_path,
      { account },
    ),
  );
  const loginResponse = await sessionHttp.handle(
    jsonRequest(
      sessionHttp.authority.login_path,
      {
        challenge_id: challenge.body.challenge_id,
        nonce: challenge.body.nonce,
        account,
        signature_base64url: signChallenge(
          challenge.body,
          login.privateKey,
        ),
      },
    ),
  );
  assert.equal(loginResponse.status, 200);
  const authorization =
    "Bearer " + loginResponse.body.session_token;

  const edge =
    createVoidPublicParticipantAccountReadHttpEdgeV1({
      sessionHttp,
      sourceBase: "http://127.0.0.1:4100",
      fetchImpl: fakeFetch,
    });

  for (const key of [
    "cookie_authentication",
    "cors_wildcard",
    "raw_wallet_route_forwarding",
    "raw_work_credit_route_forwarding",
    "authorization_forwarded_upstream",
    "wallet_private_key_access",
    "wallet_unlock_authority",
    "wallet_send_authority",
    "work_credit_mutation_authority",
    "validator_mutation_authority",
    "generic_rpc_authority",
    "transaction_signing",
    "money_movement_authority",
    "listener_created",
    "production_route_mounted",
  ]) {
    assert.equal(
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1[key],
      false,
      key,
    );
  }

  const status = await edge.handle({
    url: edge.authority.status_path,
    method: "GET",
  });
  assert.equal(status.status, 200);
  assert.equal(status.body.production_route_mounted, false);
  assert.equal(status.body.listener_created, false);

  const wallet = await edge.handle(edgeRequest(
    edge.authority.wallet_path + "?account=" + account,
    authorization,
  ));
  assert.equal(wallet.status, 200);
  assert.equal(wallet.body.view, "wallet");
  assert.equal(wallet.body.account, account);
  assert.equal(wallet.body.balances.ledger_wc.balance, 17);

  const earn = await edge.handle(edgeRequest(
    edge.authority.earn_path + "?account=" + account,
    authorization,
  ));
  assert.equal(earn.status, 200);
  assert.equal(earn.body.view, "earn");
  assert.equal(earn.body.account, account);
  assert.equal(earn.body.accounting.legacy_wc.redeemable, 17);

  assert.equal(sourceFetches, 2);
  const beforeRejected = sourceFetches;

  const missingAuth = await edge.handle(edgeRequest(
    edge.authority.wallet_path + "?account=" + account,
    "",
  ));
  assert.equal(missingAuth.status, 401);
  assert.equal(sourceFetches, beforeRejected);

  const wrongAccount = await edge.handle(edgeRequest(
    edge.authority.wallet_path + "?account=" + otherAccount,
    authorization,
  ));
  assert.equal(wrongAccount.status, 401);
  assert.equal(sourceFetches, beforeRejected);

  const duplicateAccount = await edge.handle(edgeRequest(
    edge.authority.wallet_path +
      "?account=" + account +
      "&account=" + account,
    authorization,
  ));
  assert.equal(duplicateAccount.status, 400);
  assert.equal(sourceFetches, beforeRejected);

  const extraQuery = await edge.handle(edgeRequest(
    edge.authority.earn_path +
      "?account=" + account +
      "&view=wallet",
    authorization,
  ));
  assert.equal(extraQuery.status, 400);
  assert.equal(sourceFetches, beforeRejected);

  const cookie = await edge.handle(edgeRequest(
    edge.authority.wallet_path + "?account=" + account,
    authorization,
    { headers: { cookie: "ambient=true" } },
  ));
  assert.equal(cookie.status, 400);
  assert.equal(sourceFetches, beforeRejected);

  const post = await edge.handle(edgeRequest(
    edge.authority.wallet_path + "?account=" + account,
    authorization,
    { method: "POST" },
  ));
  assert.equal(post.status, 405);
  assert.equal(sourceFetches, beforeRejected);

  const bodyRejected = await edge.handle(edgeRequest(
    edge.authority.wallet_path + "?account=" + account,
    authorization,
    { body: "{}" },
  ));
  assert.equal(bodyRejected.status, 400);
  assert.equal(sourceFetches, beforeRejected);

  const unknown = await edge.handle(edgeRequest(
    "/__void/participant/wallet/status?account=" + account,
    authorization,
  ));
  assert.equal(unknown.status, 404);
  assert.equal(sourceFetches, beforeRejected);

  assert.throws(
    () => createVoidPublicParticipantAccountReadHttpEdgeV1({
      sessionHttp: {
        ...sessionHttp,
        authority: {
          ...sessionHttp.authority,
          money_movement_authority: true,
        },
      },
      sourceBase: "http://127.0.0.1:4100",
      fetchImpl: fakeFetch,
    }),
    /session_http_authority_invalid/,
  );

  const source = fs.readFileSync(
    new URL(
      "../ops/public/void-public-participant-account-read-http-edge-v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  for (const forbidden of [
    "createServer(",
    ".listen(",
    "sendTransaction",
    "privateKey",
    "mnemonic",
    "ciphertext",
    "/__void/participant/wallet/",
    "/wc/",
    "/jobs",
    "/receipts",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "forbidden edge marker: " + forbidden,
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
  console.log("session_http_composed=true");
  console.log("session_http_authority_bound=true");
  console.log("account_read_projection_instantiated_internally=true");
  console.log("exact_account_query_required=true");
  console.log("duplicate_account_query_rejected=true");
  console.log("extra_query_rejected=true");
  console.log("bearer_session_required=true");
  console.log("cookie_authentication=false");
  console.log("wrong_account_source_fetch=false");
  console.log("missing_authorization_source_fetch=false");
  console.log("raw_route_forwarding=false");
  console.log("authorization_forwarded_upstream=false");
  console.log("wallet_mutation_authority=false");
  console.log("work_credit_mutation_authority=false");
  console.log("money_movement_authority=false");
  console.log("listener_created=false");
  console.log("production_route_mounted=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
