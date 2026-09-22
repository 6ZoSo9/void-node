#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1,
  createVoidPublicParticipantAccountHttpV1,
} from "../ops/public/void-public-participant-account-http-v1.mjs";

const MARKER =
  "VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1_PROOF_GREEN";
const account = "participant-a";
const authorization =
  "Bearer vps1." + "1".repeat(32) + "." + "A".repeat(43);
const calls = [];
let mode = "ok";

const projection = Object.freeze({
  authority: Object.freeze({
    marker: "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1",
    capability: "participant.account.read.v1",
    raw_source_forwarding: false,
    authorization_forwarded_upstream: false,
    money_movement_authority: false,
    listener_created: false,
    production_route_mounted: false,
  }),
  async read(input) {
    calls.push({ ...input });

    if (mode === "session_unavailable") {
      throw new Error("session_unavailable");
    }
    if (mode === "scope_mismatch") {
      throw new Error("session_account_mismatch");
    }
    if (mode === "source_failure") {
      throw new Error("source_unavailable");
    }
    const boundaries = input.view === "wallet"
      ? {
          wallet_unlock: false,
          wallet_export: false,
          wallet_send: false,
          wc_to_void: false,
          ledger_write: false,
          money_movement: false,
        }
      : {
          job_execution: false,
          job_submission: false,
          reward_award: false,
          runner_activation: false,
          wc_redeem: false,
          wc_send: false,
          wc_to_void: false,
          ledger_write: false,
          money_movement: false,
        };

    if (mode === "bad_contract") {
      return {
        ok: true,
        marker: "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1",
        account: input.account,
        view: input.view,
        read_only: false,
        capability: "participant.account.read.v1",
        boundaries,
      };
    }

    if (mode === "bad_boundary") {
      boundaries.money_movement = true;
    }

    return Object.freeze({
      ok: true,
      marker: "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1",
      account: input.account,
      view: input.view,
      read_only: true,
      capability: "participant.account.read.v1",
      boundaries: Object.freeze(boundaries),
    });
  },
});

function request(url, {
  method = "GET",
  headers = {},
  body = null,
} = {}) {
  return { url, method, headers, body };
}

try {
  for (const key of [
    "bearer_cookie_authentication",
    "cors_wildcard",
    "raw_source_proxy",
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
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1[key],
      false,
      key,
    );
  }

  assert.throws(
    () => createVoidPublicParticipantAccountHttpV1({
      accountProjection: {
        ...projection,
        authority: {
          ...projection.authority,
          money_movement_authority: true,
        },
      },
    }),
    /account_projection_required/,
    "projection with authority admitted",
  );

  const http = createVoidPublicParticipantAccountHttpV1({
    accountProjection: projection,
  });

  const status = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.status_path,
  ));
  assert.equal(status.status, 200);
  assert.equal(status.body.ok, true);
  assert.equal(status.body.bearer_session_required, true);
  assert.equal(status.headers["cache-control"], "no-store");

  const headStatus = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.status_path,
    { method: "HEAD" },
  ));
  assert.equal(headStatus.status, 200);
  assert.equal(headStatus.body, null);

  const smuggled = await http.handle(request(
    "//attacker.invalid" +
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account,
    { headers: { authorization } },
  ));
  assert.equal(smuggled.status, 404);

  const noAuth = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account,
  ));
  assert.equal(noAuth.status, 401);
  assert.equal(calls.length, 0);

  const duplicateAuth = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account,
    {
      headers: {
        authorization: [authorization, authorization],
      },
    },
  ));
  assert.equal(duplicateAuth.status, 401);
  assert.equal(calls.length, 0);

  for (const invalidTarget of [
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path,
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account + "&account=" + account,
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account + "&extra=1",
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=../private",
  ]) {
    const before = calls.length;
    const result = await http.handle(request(
      invalidTarget,
      { headers: { authorization } },
    ));
    assert.equal(result.status, 400);
    assert.equal(calls.length, before);
  }

  const withBody = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account,
    {
      headers: { authorization },
      body: "{}",
    },
  ));
  assert.equal(withBody.status, 400);
  assert.equal(calls.length, 0);

  const wrongMethod = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account,
    {
      method: "POST",
      headers: { authorization },
    },
  ));
  assert.equal(wrongMethod.status, 405);
  assert.equal(calls.length, 0);

  const wallet = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account,
    { headers: { authorization } },
  ));
  assert.equal(wallet.status, 200);
  assert.equal(wallet.body.account, account);
  assert.equal(wallet.body.view, "wallet");
  assert.deepEqual(calls.at(-1), {
    authorization,
    account,
    view: "wallet",
  });

  const earn = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.earn_path +
      "?account=" + account,
    { headers: { authorization } },
  ));
  assert.equal(earn.status, 200);
  assert.equal(earn.body.account, account);
  assert.equal(earn.body.view, "earn");
  assert.deepEqual(calls.at(-1), {
    authorization,
    account,
    view: "earn",
  });

  mode = "session_unavailable";
  const expired = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account,
    { headers: { authorization } },
  ));
  assert.equal(expired.status, 401);
  assert.deepEqual(expired.body, {
    ok: false,
    error: "session_authorization_failed",
  });

  mode = "scope_mismatch";
  const mismatch = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=participant-b",
    { headers: { authorization } },
  ));
  assert.equal(mismatch.status, 403);
  assert.deepEqual(mismatch.body, {
    ok: false,
    error: "account_scope_mismatch",
  });

  mode = "source_failure";
  const unavailable = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.earn_path +
      "?account=" + account,
    { headers: { authorization } },
  ));
  assert.equal(unavailable.status, 503);
  assert.deepEqual(unavailable.body, {
    ok: false,
    error: "account_read_unavailable",
  });

  mode = "bad_boundary";
  const invalidBoundary = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account,
    { headers: { authorization } },
  ));
  assert.equal(invalidBoundary.status, 503);
  assert.deepEqual(invalidBoundary.body, {
    ok: false,
    error: "account_read_unavailable",
  });

  mode = "bad_contract";
  const invalidProjection = await http.handle(request(
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path +
      "?account=" + account,
    { headers: { authorization } },
  ));
  assert.equal(invalidProjection.status, 503);
  assert.deepEqual(invalidProjection.body, {
    ok: false,
    error: "account_read_unavailable",
  });

  const serialized = JSON.stringify([
    wallet,
    earn,
    expired,
    mismatch,
    unavailable,
  ]);
  assert.equal(
    serialized.includes(authorization),
    false,
    "bearer token reflected into response",
  );

  const source = fs.readFileSync(
    new URL(
      "../ops/public/void-public-participant-account-http-v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );

  for (const forbidden of [
    "fetch(",
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
  console.log("exact_wallet_earn_routes=true");
  console.log("exact_account_query=true");
  console.log("bearer_session_required=true");
  console.log("duplicate_authorization_rejected=true");
  console.log("invalid_request_does_not_reach_projection=true");
  console.log("projection_authority_revalidated=true");
  console.log("projection_contract_revalidated=true");
  console.log("projection_false_boundaries_revalidated=true");
  console.log("session_error_normalized=true");
  console.log("scope_mismatch_normalized=true");
  console.log("source_error_normalized=true");
  console.log("bearer_token_reflected=false");
  console.log("raw_source_proxy=false");
  console.log("wallet_mutation_authority=false");
  console.log("work_credit_mutation_authority=false");
  console.log("money_movement_authority=false");
  console.log("listener_created=false");
  console.log("production_route_mounted=false");
} catch (error) {
  console.error(MARKER.replace("_GREEN", "_HOLD"));
  throw error;
}
