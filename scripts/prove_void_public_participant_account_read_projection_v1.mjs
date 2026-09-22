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
  VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1,
  createVoidPublicParticipantAccountReadProjectionV1,
} from "../ops/public/void-public-participant-account-read-projection-v1.mjs";

const MARKER =
  "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1_PROOF_GREEN";
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-account-read-projection-proof-"),
);
const registryDir = path.join(temp, "registry");
const registryFile = path.join(
  registryDir,
  "participant-login-bindings-v1.json",
);
let clock = 1_800_000_000_000;
let randomCounter = 0;
let sourceMode = "normal";
const calls = [];

function deterministicBytes(size) {
  randomCounter += 1;
  const first = crypto.createHash("sha256")
    .update("void-account-read-proof-a-" + randomCounter)
    .digest();
  if (size <= first.length) return first.subarray(0, size);
  const second = crypto.createHash("sha256")
    .update("void-account-read-proof-b-" + randomCounter)
    .digest();
  return Buffer.concat([first, second]).subarray(0, size);
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
    ok: true,
    marker: "VOID_UI_WAVE3_WALLET_READONLY_V1",
    read_only: true,
    source_base: "http://127.0.0.1:4100",
    node: {
      hostname: "precision-secret-hostname",
      label: "Precision",
      role: "precision",
    },
    account: { selected: true, id: account, label: account },
    wallet: {
      source_available: true,
      has_wallet: true,
      address: "0x" + "12".repeat(20),
      unlocked: true,
      unlocked_address: "0x" + "12".repeat(20),
      native_gas_available: true,
      native_gas_display: "0.500000000",
      source: "participant_wallet_native_v1",
    },
    balances: {
      void: {
        available: false,
        display: "—",
      },
      ledger_wc: {
        available: true,
        balance: 17,
        display: "17",
        entries: 3,
        label: "Ledger WC",
      },
      production_wc: {
        available: true,
        balance: 5,
        display: "5",
        entries: 1,
        label: "Production WC",
        ledger_version: "v1",
      },
    },
    sources: {
      wallet_status: {
        route: "/__void/participant/wallet/status",
        ok: true,
        status: 200,
      },
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
    ok: true,
    marker: "VOID_UI_WAVE4_EARN_READONLY_V1",
    read_only: true,
    account: { selected: true, id: account, label: account },
    earning: {
      status: "manual_only",
      status_label: "Manual only",
      enabled: true,
      manual_only: true,
      automatic_background: false,
      safe_mode: true,
      jobs_last_hour: 2,
      max_jobs_per_hour: 8,
      available_work: {
        available: true,
        secret_dataset_id: "must-not-escape",
      },
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
      last_credit: {
        available: true,
        secret_receipt_reference: "must-not-escape",
      },
    },
    recent_jobs: {
      available: true,
      count: 1,
      limit: 5,
      items: [{
        reference: "secret-job-reference",
        job_input: "must-not-escape",
      }],
    },
    verification_receipts: {
      available: true,
      count: 1,
      limit: 5,
      items: [{
        reference: "secret-receipt-reference",
        receipt_root: "must-not-escape",
      }],
    },
    datanet: {
      source_available: true,
      status: "available",
      receipt_store_records: 9,
      account_wc_events: 4,
    },
    sources: {
      runner_status: {
        route: "/wc/runner/status",
        ok: true,
        status: 200,
      },
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
  const url = new URL(String(input));
  const headers = Object.fromEntries(
    Object.entries(init.headers || {})
      .map(([key, value]) => [String(key).toLowerCase(), String(value)]),
  );
  calls.push({
    url: url.href,
    method: init.method,
    headers,
    credentials: init.credentials,
    redirect: init.redirect,
  });

  assert.equal(url.origin, "http://127.0.0.1:4100");
  assert.equal(init.method, "GET");
  assert.equal(headers.authorization, undefined);
  assert.equal(headers.cookie, undefined);
  assert.equal(init.credentials, "omit");
  assert.equal(init.redirect, "error");

  const account = url.searchParams.get("account");
  let body;
  if (
    url.pathname ===
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1
      .wallet_source_path
  ) {
    body = walletSource(account);
  } else if (
    url.pathname ===
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1
      .earn_source_path
  ) {
    body = earnSource(account);
  } else {
    throw new Error("unexpected source route");
  }

  if (sourceMode === "wrong_marker") {
    body.marker = "WRONG";
  }
  if (sourceMode === "wrong_account") {
    body.account.id = "other-account";
  }

  const text = JSON.stringify(body);
  const headersOut = {
    "content-type": "application/json; charset=utf-8",
  };
  if (sourceMode === "oversize") {
    headersOut["content-length"] = String(
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1
        .max_source_response_bytes + 1,
    );
  }

  return new Response(text, {
    status: 200,
    headers: headersOut,
  });
}

try {
  fs.mkdirSync(registryDir, { mode: 0o700 });
  fs.chmodSync(registryDir, 0o700);

  const account = "participant-a";
  const otherAccount = "participant-b";
  const login = crypto.generateKeyPairSync("ed25519");
  const registry = {
    marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
    version: 1,
    bindings: [{
      account,
      status: "active",
      key_type: "ed25519",
      public_key_pem: String(
        login.publicKey.export({ type: "spki", format: "pem" }),
      ),
      public_key_fingerprint_sha256: fingerprint(login.publicKey),
      capabilities: ["participant.account.read.v1"],
    }],
  };
  fs.writeFileSync(
    registryFile,
    JSON.stringify(registry, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(registryFile, 0o600);

  const sessionHttp = createVoidPublicParticipantSessionHttpV1({
    bindingRegistryFile: registryFile,
    now: () => clock,
    randomBytes: deterministicBytes,
  });

  const challenge = await sessionHttp.handle(jsonRequest(
    sessionHttp.authority.challenge_path,
    { account },
  ));
  const loggedIn = await sessionHttp.handle(jsonRequest(
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
  ));
  assert.equal(loggedIn.status, 200);
  const authorization = "Bearer " + loggedIn.body.session_token;

  assert.throws(
    () => createVoidPublicParticipantAccountReadProjectionV1({
      sessionHttp,
      sourceBase: "https://voidchain.org",
      fetchImpl: fakeFetch,
    }),
    /source_base_invalid/,
  );
  assert.throws(
    () => createVoidPublicParticipantAccountReadProjectionV1({
      sessionHttp,
      sourceBase: "http://127.0.0.1:4100/private",
      fetchImpl: fakeFetch,
    }),
    /source_base_invalid/,
  );

  const projection =
    createVoidPublicParticipantAccountReadProjectionV1({
      sessionHttp,
      sourceBase: "http://127.0.0.1:4100",
      fetchImpl: fakeFetch,
    });

  for (const key of [
    "raw_source_forwarding",
    "authorization_forwarded_upstream",
    "cookie_forwarding",
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
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1[key],
      false,
      key,
    );
  }

  const wallet = await projection.read({
    authorization,
    account,
    view: "wallet",
  });
  assert.equal(wallet.view, "wallet");
  assert.equal(wallet.account, account);
  assert.equal(wallet.wallet.has_wallet, true);
  assert.equal(wallet.wallet.address, "0x" + "12".repeat(20));
  assert.equal(wallet.balances.ledger_wc.balance, 17);
  assert.equal(wallet.balances.production_wc.balance, 5);
  const walletText = JSON.stringify(wallet);
  for (const secret of [
    "precision-secret-hostname",
    "source_base",
    "unlocked_address",
    "wallet_status",
    "participant_wallet_native_v1",
  ]) {
    assert.equal(walletText.includes(secret), false, secret);
  }

  const earn = await projection.read({
    authorization,
    account,
    view: "earn",
  });
  assert.equal(earn.view, "earn");
  assert.equal(earn.account, account);
  assert.equal(earn.earning.status, "manual_only");
  assert.equal(earn.accounting.legacy_wc.redeemable, 17);
  assert.equal(earn.accounting.production_wc.balance, 5);
  assert.equal(earn.activity.recent_jobs_count, 1);
  assert.equal(earn.activity.verification_receipts_count, 1);
  const earnText = JSON.stringify(earn);
  for (const secret of [
    "must-not-escape",
    "secret-job-reference",
    "secret-receipt-reference",
    "runner_status",
    "/wc/",
    "available_work",
    "last_credit",
  ]) {
    assert.equal(earnText.includes(secret), false, secret);
  }

  assert.equal(calls.length, 2);
  const callsBeforeWrongAccount = calls.length;
  await assert.rejects(
    projection.read({
      authorization,
      account: otherAccount,
      view: "wallet",
    }),
    /session_account_mismatch/,
  );
  assert.equal(
    calls.length,
    callsBeforeWrongAccount,
    "wrong-account request reached source fetch",
  );

  await assert.rejects(
    projection.read({
      authorization: "Bearer vps1." +
        "0".repeat(32) + "." + "A".repeat(43),
      account,
      view: "wallet",
    }),
    /session_unavailable/,
  );
  assert.equal(
    calls.length,
    callsBeforeWrongAccount,
    "invalid session reached source fetch",
  );

  sourceMode = "wrong_marker";
  await assert.rejects(
    projection.read({
      authorization,
      account,
      view: "wallet",
    }),
    /wallet_source_contract_invalid/,
  );

  sourceMode = "wrong_account";
  await assert.rejects(
    projection.read({
      authorization,
      account,
      view: "earn",
    }),
    /earn_source_account_mismatch/,
  );

  sourceMode = "oversize";
  await assert.rejects(
    projection.read({
      authorization,
      account,
      view: "wallet",
    }),
    /source_response_too_large/,
  );

  sourceMode = "normal";

  const source = fs.readFileSync(
    new URL(
      "../ops/public/void-public-participant-account-read-projection-v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );

  for (const forbidden of [
    "/__void/participant/wallet/",
    "/wc/",
    "/jobs",
    "/receipts",
    "sendTransaction",
    "privateKey",
    "mnemonic",
    "ciphertext",
    "createServer(",
    ".listen(",
    "set-cookie",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "forbidden raw/mutation marker: " + forbidden,
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
  console.log("exact_account_session_required=true");
  console.log("authorization_forwarded_upstream=false");
  console.log("cookie_forwarding=false");
  console.log("loopback_source_only=true");
  console.log("wallet_sanitized_summary=true");
  console.log("earn_sanitized_summary=true");
  console.log("raw_source_forwarding=false");
  console.log("cross_account_source_fetch=false");
  console.log("invalid_session_source_fetch=false");
  console.log("source_marker_validated=true");
  console.log("source_account_validated=true");
  console.log("source_response_bounded=true");
  console.log("wallet_mutation_authority=false");
  console.log("work_credit_mutation_authority=false");
  console.log("money_movement_authority=false");
  console.log("listener_created=false");
  console.log("production_route_mounted=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
