#!/usr/bin/env node
// VOID Public App Composition Gateway v1
// Public-safe composition layer:
//   existing public earn gateway -> bounded no-node earning contract
//   loopback node -> public app assets and sanitized network truth
//   /participant -> fail-closed no-node handoff, never the local operator dashboard
// Account-scoped Wallet/Earn adapters and arbitrary mutations remain private.

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {
  createVoidPublicParticipantSessionHttpV1,
  VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1,
} from "./void-public-participant-session-http-v1.mjs";
import {
  createVoidPublicParticipantSessionStateFileV1,
} from "./void-public-participant-session-state-file-v1.mjs";
import {
  createVoidPublicParticipantAccountReadHttpEdgeV1,
  VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1,
} from "./void-public-participant-account-read-http-edge-v1.mjs";
import {
  VOID_PUBLIC_PARTICIPANT_ORIGIN_BINDING_PATH_V1,
  classifyVoidPublicParticipantCopyReadyV1,
} from "../../tools/lib/void-public-participant-copy-ready-v1.mjs";

// VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1
const VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_MAX_BODY_BYTES = 65536;
// The upstream's 8s deadline does NOT cover an unended client POST body.
// Independently bound this public, attacker-controlled upload lifetime.
const VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_UPLOAD_TIMEOUT_MS = 8000;
// An upstream request may be committed before this public edge observes
// its reply. Bound the full upstream response and never synthesize success.
const VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_MAX_RESPONSE_BYTES = 131072;
const VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_UPSTREAM_TIMEOUT_MS = 8000;
// Audited current-node money identities, independent of the untrusted
// upstream receipt. These constants mirror the native-USDC checkout
// source policy at src/index.ts (including the explicit Ethereum rail).
const VOID_BUY_VOID_PUBLIC_EDGE_RECEIVER_V1 =
  "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5";
const VOID_BUY_VOID_PUBLIC_EDGE_BASE_USDC_V1 =
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const VOID_BUY_VOID_PUBLIC_EDGE_ETH_USDC_V1 =
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

const VOID_BUY_VOID_PUBLIC_EDGE_ARRAY_IS_ARRAY_V1 = Array.isArray;
const VOID_BUY_VOID_PUBLIC_EDGE_OBJECT_KEYS_V1 = Object.keys;
const VOID_BUY_VOID_PUBLIC_EDGE_OBJECT_HAS_OWN_V1 = Object.hasOwn;

const VOID_BUY_VOID_PUBLIC_EDGE_OUTER_FIELDS_V1 = Object.freeze({
  schema: true,
  marker: true,
  ok: true,
  idempotent: true,
  one_active_request_cap_enforced: true,
  request: true,
});
const VOID_BUY_VOID_PUBLIC_EDGE_REQUEST_FIELDS_V1 = Object.freeze({
  schema: true,
  legacy_schema: true,
  marker: true,
  ok: true,
  request_id: true,
  created_at_ms: true,
  status: true,
  launch_authority: true,
  funding_model: true,
  account: true,
  source_chain: true,
  payment_chain: true,
  payment_chain_id: true,
  asset_in: true,
  usdc_contract: true,
  usdc_decimals: true,
  usdc_amount: true,
  requested_amount_usdc: true,
  rate_void_per_usdc: true,
  price_usdc_per_void: true,
  pool_void_total: true,
  quoted_void: true,
  sale_state_before_request: true,
  receive_address: true,
  receiver_binding_source: true,
  void_destination_address: true,
  delivery_address: true,
  delivery_wallet: true,
  delivery_chain: true,
  delivery_chain_id: true,
  tx_hash: true,
  note: true,
  acknowledgements: true,
  request_contract: true,
  payment_instructions: true,
  safety: true,
  persisted: true,
});
const VOID_BUY_VOID_PUBLIC_EDGE_PERSISTED_FIELDS_V1 = Object.freeze({
  ok: true,
  file: true,
});
const VOID_BUY_VOID_PUBLIC_EDGE_REQUEST_CONTRACT_FIELDS_V1 = Object.freeze({
  request_before_payment_required: true,
  one_active_request_per_void_destination: true,
  payment_sender_must_equal_void_destination: true,
  payment_tx_hash_bound_after_request_by_operator: true,
});
const VOID_BUY_VOID_PUBLIC_EDGE_SAFETY_FIELDS_V1 = Object.freeze({
  automatic_fulfillment: true,
  activation_required: true,
  manual_review_required: true,
  wallet_send_by_page: true,
  token_approval_by_page: true,
  no_investment_return_promised: true,
  no_automatic_token_delivery_promised: true,
  do_not_send_from_exchange: true,
  private_rpc_public: true,
});
const VOID_BUY_VOID_PUBLIC_EDGE_ACKNOWLEDGEMENT_FIELDS_V1 = Object.freeze({
  self_custody: true,
  native_usdc: true,
  request_before_payment: true,
  sender_equals_void_destination: true,
  no_automatic_fulfillment: true,
});
const VOID_BUY_VOID_PUBLIC_EDGE_LAUNCH_AUTHORITY_FIELDS_V1 = Object.freeze({
  expires_at_ms: true,
});
const VOID_BUY_VOID_PUBLIC_EDGE_INSTRUCTION_FIELDS_V1 = Object.freeze({
  request_id: true,
  send_asset: true,
  send_chain: true,
  send_chain_id: true,
  token_contract: true,
  token_decimals: true,
  send_to: true,
  send_from: true,
  amount: true,
  expires_at_ms: true,
  do_not_send_before_request: true,
  do_not_send_from_exchange_or_pooled_custody: true,
  keep_transaction_hash: true,
});

function voidBuyVoidPublicEdgeClosedOwnKeysV1(
  value,
  allowed,
  exactCount = null,
) {
  if (!value || typeof value !== "object" ||
      VOID_BUY_VOID_PUBLIC_EDGE_ARRAY_IS_ARRAY_V1(value)) {
    return false;
  }
  const keys = VOID_BUY_VOID_PUBLIC_EDGE_OBJECT_KEYS_V1(value);
  if (exactCount !== null && keys.length !== exactCount) {
    return false;
  }
  for (let index = 0; index < keys.length; index += 1) {
    if (!VOID_BUY_VOID_PUBLIC_EDGE_OBJECT_HAS_OWN_V1(
      allowed,
      keys[index],
    )) {
      return false;
    }
  }
  return true;
}

async function voidBuyVoidPublicEdgePostProxyV1(req, res) {
  let uploadExpired = false;
  try {
    const chunks = [];
    let totalBytes = 0;
    let receiveTimer;
    const uploadStartedAt = performance.now();
    if (!Number.isFinite(uploadStartedAt) || uploadStartedAt < 0) {
      throw new Error("buy_void_post_client_upload_monotonic_unavailable");
    }
    const uploadDeadlineAt = uploadStartedAt +
      VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_UPLOAD_TIMEOUT_MS;
    // Promise.race is necessary here. IncomingMessage's requestTimeout and
    // socket timeout are inactivity-based, and a custom async iterator might
    // ignore destruction. One absolute timer bounds this entire receive,
    // regardless of how often the requester sends another small chunk.
    const receiveUpload = (async () => {
    for await (const chunk of req) {
      const normalized = Buffer.from(chunk);
      totalBytes += normalized.length;

      if (
        totalBytes >
        VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_MAX_BODY_BYTES
      ) {
        // An oversized *unfinished* chunked upload has already consumed
        // its authority. Sending 413 must also terminate the transport:
        // otherwise clearing the upload deadline leaves the peer free to
        // trickle additional bytes indefinitely on its original socket.
        // Close only AFTER the small 413 body is flushed, to preserve the
        // client-visible rejection instead of replacing it with ECONNRESET.
        const oversizedSocket = req.socket;
        res.shouldKeepAlive = false;
        res.once("finish", () => {
          if (!oversizedSocket || oversizedSocket.destroyed) return;
          try {
            if (typeof oversizedSocket.destroySoon === "function") {
              oversizedSocket.destroySoon();
            } else {
              oversizedSocket.destroy();
            }
          } catch {
            // Transport teardown uncertainty cannot authorize a new
            // upstream checkout request or an HTTP 201 success.
            if (!oversizedSocket.destroyed) oversizedSocket.destroy();
          }
        });
        res.statusCode = 413;
        res.setHeader("connection", "close");
        res.setHeader(
          "content-type",
          "application/json; charset=utf-8",
        );
        res.setHeader("cache-control", "no-store");
        res.setHeader(
          "x-content-type-options",
          "nosniff",
        );
        res.setHeader(
          "x-void-public-buy-void-post-proxy",
          "v1",
        );
        res.end(
          JSON.stringify({
            ok: false,
            error: "request_body_too_large",
            max_bytes:
              VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_MAX_BODY_BYTES,
          }),
        );
        return;
      }

      chunks.push(normalized);
    }
    return true;
    })();
    try {
      const completed = await Promise.race([
        receiveUpload,
        new Promise((_, reject) => {
          receiveTimer = setTimeout(() => {
            uploadExpired = true;
            reject(new Error("buy_void_post_client_upload_total_deadline"));
            // Free the incomplete request/socket; do not leave an iterator
            // pinned, and do not dispatch any upstream purchase request.
            if (typeof req.destroy === "function") {
              try {
                req.destroy();
              } catch {
                // Promise.race already rejected. Never turn this into a
                // successful or retried upstream purchase operation.
              }
            }
          }, VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_UPLOAD_TIMEOUT_MS);
        }),
      ]);
      if (!completed) return;
    } finally {
      if (receiveTimer !== undefined) clearTimeout(receiveTimer);
    }
    // An event-loop stall may delay the upload timeout callback while a
    // later completion wins the race. Never forward after absolute expiry.
    const uploadCompletedAt = performance.now();
    if (!Number.isFinite(uploadCompletedAt) ||
        uploadCompletedAt < uploadStartedAt ||
        uploadCompletedAt >= uploadDeadlineAt) {
      uploadExpired = true;
      try { req.destroy(); } catch { /* never forward late upload */ }
      return;
    }

    // Retain the exact public request bytes so that a claimed HTTP 201
    // cannot substitute another buyer's destination, amount, or rail.
    const forwardedBody = Buffer.concat(chunks);
    const upstreamBase = String(
      process.env.VOID_NODE_UPSTREAM
        || "http://127.0.0.1:4100",
    );
    const upstreamUrl = new URL(
      "/__void/buy-void/request",
      upstreamBase,
    );
    const contentType = String(
      req.headers["content-type"]
        || "application/json",
    );

    // This is a total, not an inactivity timeout. It covers the upstream
    // headers AND its entire response stream, including endless trickles.
    const upstreamSignal = AbortSignal.timeout(
      VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_UPSTREAM_TIMEOUT_MS,
    );
    // Node 22 may leave an aborted reader.read() unsettled. Maintain one
    // monotonic absolute deadline, but use a *detached* timer for each await:
    // racing thousands of tiny chunks against one unresolved Promise leaks
    // thousands of registered reaction closures until that deadline fires.
    const upstreamStartedAt = performance.now();
    if (!Number.isFinite(upstreamStartedAt) || upstreamStartedAt < 0) {
      throw new Error("buy_void_post_upstream_monotonic_unavailable");
    }
    const upstreamDeadlineAt = upstreamStartedAt +
      VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_UPSTREAM_TIMEOUT_MS;
    const requireUpstreamBeforeDeadline = () => {
      const observedNow = performance.now();
      if (!Number.isFinite(observedNow) ||
          observedNow < upstreamStartedAt ||
          observedNow >= upstreamDeadlineAt) {
        throw new Error("buy_void_post_upstream_total_deadline");
      }
    };
    const awaitUpstream = async (operation) => {
      requireUpstreamBeforeDeadline();
      const leftMs = Math.floor(upstreamDeadlineAt - performance.now());
      if (leftMs <= 0) {
        throw new Error("buy_void_post_upstream_total_deadline");
      }
      let deadlineTimer;
      try {
        const outcome = await Promise.race([
          operation,
          new Promise((_, reject) => {
            deadlineTimer = setTimeout(
              () => reject(new Error("buy_void_post_upstream_total_deadline")),
              leftMs,
            );
          }),
        ]);
        // Timer dispatch can lag while a completion microtask wins the race.
        requireUpstreamBeforeDeadline();
        return outcome;
      } finally {
        if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
      }
    };
    const upstreamResponse = await awaitUpstream(fetch(
      upstreamUrl,
      {
        method: "POST",
        redirect: "error",
        signal: upstreamSignal,
        headers: {
          "content-type": contentType,
          "user-agent":
            "void-public-app-composition-gateway-buy-void-post-proxy-v1",
        },
        body: forwardedBody,
      },
    ));

    // A redirect/HTML page is never evidence of a created Buy VOID request.
    // Do not buffer a peer-controlled body through Response.arrayBuffer().
    const cancelRejectedBody = () => {
      try {
        const cancelResult = upstreamResponse.body?.cancel?.();
        if (cancelResult) void Promise.resolve(cancelResult).catch(() => {});
      } catch {
        // Cleanup is best-effort; a rejected checkout response is never success.
      }
    };
    const mediaType = String(
      upstreamResponse.headers.get("content-type") || "",
    ).split(";")[0].trim().toLowerCase();
    if (
      mediaType !== "application/json"
      || (upstreamResponse.status >= 300 && upstreamResponse.status < 400)
    ) {
      cancelRejectedBody();
      throw new Error("buy_void_post_upstream_response_unqualified");
    }
    const declaredLength = upstreamResponse.headers.get("content-length");
    if (
      declaredLength !== null
      && (
        !/^(?:0|[1-9][0-9]*)$/.test(declaredLength)
        || BigInt(declaredLength)
          > BigInt(VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_MAX_RESPONSE_BYTES)
      )
    ) {
      cancelRejectedBody();
      throw new Error("buy_void_post_upstream_declared_length_invalid");
    }
    const reader = upstreamResponse.body?.getReader?.();
    if (!reader) {
      throw new Error("buy_void_post_upstream_body_missing");
    }
    const responseChunks = [];
    let responseBytes = 0;
    let readComplete = false;
    try {
      while (true) {
        const { done, value } = await awaitUpstream(reader.read());
        if (done) {
          readComplete = true;
          break;
        }
        if (!(value instanceof Uint8Array) || value.byteLength === 0) {
          throw new Error("buy_void_post_upstream_stream_invalid");
        }
        responseBytes += value.byteLength;
        if (
          responseBytes
          > VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_MAX_RESPONSE_BYTES
        ) {
          throw new Error("buy_void_post_upstream_response_too_large");
        }
        responseChunks.push(Buffer.from(value));
      }
    } finally {
      if (!readComplete) {
        try {
          void Promise.resolve(reader.cancel()).catch(() => {});
        } catch {
          // The upstream is already untrusted; the public reply fails closed.
        }
      }
      try {
        reader.releaseLock();
      } catch {
        // A completed stream cannot claim successful checkout if its
        // owned reader cannot be released. On a failed stream, preserve
        // the original rejection and return only the generic 502.
        if (readComplete) {
          throw new Error("buy_void_post_reader_release_uncertain");
        }
      }
    }
    if (responseBytes === 0) {
      throw new Error("buy_void_post_upstream_empty_response");
    }
    let responseBody = Buffer.concat(responseChunks, responseBytes);
    // Content-Type is not proof of JSON validity. Never send a malformed
    // HTTP 201 checkout receipt through the public edge as an accepted order.
    let parsedBody;
    try {
      parsedBody = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(responseBody),
      );
      if (!parsedBody || typeof parsedBody !== "object" ||
          VOID_BUY_VOID_PUBLIC_EDGE_ARRAY_IS_ARRAY_V1(parsedBody)) {
        throw new Error("buy_void_post_upstream_json_object_required");
      }
    } catch {
      throw new Error("buy_void_post_upstream_json_invalid");
    }

    let admittedCheckoutExpiryMs = null;
    // This exact creation response is authoritative for whether a buyer
    // should believe a payment request was recorded. "application/json"
    // plus a nonarray object is NOT enough: an empty object, error envelope,
    // unrelated marker or idempotent reuse must never be exposed as HTTP 201.
    if (upstreamResponse.status === 201) {
      const checkout = parsedBody.request;
      // Binding only the upstream envelope to a schema is insufficient: a
      // misrouted node may return an otherwise-valid *different buyer* 201.
      // Compare public checkout intent to the actual returned request before
      // any client can treat its payment instructions as a fresh obligation.
      let submitted;
      try {
        submitted = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(forwardedBody),
        );
      } catch {
        throw new Error("buy_void_post_submitted_intent_invalid");
      }
      // Keep the exact public node's reviewed body-key precedence, including
      // valid legacy field aliases. A 201 must match the effective submitted
      // buyer intent, not arbitrarily require one spelling of its fields.
      const readSubmittedField = (...names) => {
        for (const name of names) {
          const value = submitted?.[name];
          if (value !== undefined && value !== null) return String(value).trim();
        }
        return "";
      };
      const intendedDestination = readSubmittedField(
        "void_destination_address", "delivery_address", "delivery_wallet",
        "wallet",
      ).toLowerCase();
      const returnedDestination = typeof checkout?.void_destination_address
        === "string" ? checkout.void_destination_address.toLowerCase() : "";
      const intendedChain = (readSubmittedField(
        "source_chain", "payment_chain", "chain",
      ) || "base").toLowerCase();
      const returnedChain = typeof checkout?.source_chain === "string"
        ? checkout.source_chain.toLowerCase() : "";
      const intendedAmount = Number(readSubmittedField(
        "requested_amount_usdc", "usdc_amount", "amount_usdc", "amount",
      ));
      const returnedAmount = Number(checkout?.requested_amount_usdc);
      const returnedUsdcAmount = Number(checkout?.usdc_amount);
      if (!/^0x[0-9a-f]{40}$/.test(intendedDestination) ||
          returnedDestination !== intendedDestination ||
          (intendedChain !== "base" && intendedChain !== "ethereum") ||
          returnedChain !== intendedChain ||
          !Number.isFinite(intendedAmount) || intendedAmount <= 0 ||
          !Number.isFinite(returnedAmount) ||
          !Number.isFinite(returnedUsdcAmount) ||
          returnedAmount !== intendedAmount ||
          returnedUsdcAmount !== intendedAmount) {
        throw new Error("buy_void_post_created_receipt_intent_mismatch");
      }
      // Canonical main may still emit {ok:true,file:<private disk path>},
      // whereas the next request-writer generation emits only {ok:true}.
      // Both are valid server receipts, but no internal file location may
      // cross the unauthenticated edge. Refuse any other persisted metadata.
      const persisted = checkout?.persisted;
      const hasLegacyFile =
        persisted && typeof persisted === "object" &&
        !VOID_BUY_VOID_PUBLIC_EDGE_ARRAY_IS_ARRAY_V1(persisted) &&
        VOID_BUY_VOID_PUBLIC_EDGE_OBJECT_HAS_OWN_V1(persisted, "file");
      if (parsedBody.schema !==
            "void_public_buy_void_checkout_request_result_v1" ||
          parsedBody.marker !==
            "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1" ||
          parsedBody.ok !== true ||
          parsedBody.idempotent !== false ||
          parsedBody.one_active_request_cap_enforced !== true ||
          !checkout || typeof checkout !== "object" ||
          VOID_BUY_VOID_PUBLIC_EDGE_ARRAY_IS_ARRAY_V1(checkout) ||
          checkout.schema !== "void_public_buy_void_checkout_request_v1" ||
          checkout.marker !== "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1" ||
          checkout.ok !== true ||
          typeof checkout.request_id !== "string" ||
          !/^[A-Za-z0-9_-]{1,128}$/.test(checkout.request_id) ||
          checkout.status !== "awaiting_payment_tx_hash" ||
          !persisted || typeof persisted !== "object" ||
          VOID_BUY_VOID_PUBLIC_EDGE_ARRAY_IS_ARRAY_V1(persisted) ||
          !VOID_BUY_VOID_PUBLIC_EDGE_OBJECT_HAS_OWN_V1(persisted, "ok") ||
          !voidBuyVoidPublicEdgeClosedOwnKeysV1(
            persisted,
            VOID_BUY_VOID_PUBLIC_EDGE_PERSISTED_FIELDS_V1,
            hasLegacyFile ? 2 : 1,
          ) ||
          (hasLegacyFile && (typeof persisted.file !== "string" ||
            persisted.file.length === 0)) ||
          persisted.ok !== true) {
        throw new Error("buy_void_post_upstream_created_receipt_invalid");
      }
      // The canonical node's request object defines exactly these public
      // top-level names (src/index.ts checkout request object + persisted).
      // Unknown fields may contain operator/private payment metadata. Never
      // spread them into a public HTTP 201 or a legacy redacted copy.
      if (!voidBuyVoidPublicEdgeClosedOwnKeysV1(
            parsedBody,
            VOID_BUY_VOID_PUBLIC_EDGE_OUTER_FIELDS_V1,
            6,
          ) ||
          !voidBuyVoidPublicEdgeClosedOwnKeysV1(
            checkout,
            VOID_BUY_VOID_PUBLIC_EDGE_REQUEST_FIELDS_V1,
          )) {
        throw new Error("buy_void_post_created_public_fields_invalid");
      }

      // Opaque nested additions can be private operational metadata even
      // when all checked fields and outer request keys are legitimate.
      // Use only module-load-captured own-key predicates: same-process
      // replacement of Object/Array/Set methods cannot authorize disclosure.
      if (!voidBuyVoidPublicEdgeClosedOwnKeysV1(
            checkout.request_contract,
            VOID_BUY_VOID_PUBLIC_EDGE_REQUEST_CONTRACT_FIELDS_V1,
          ) ||
          !voidBuyVoidPublicEdgeClosedOwnKeysV1(
            checkout.safety,
            VOID_BUY_VOID_PUBLIC_EDGE_SAFETY_FIELDS_V1,
          ) ||
          !voidBuyVoidPublicEdgeClosedOwnKeysV1(
            checkout.launch_authority,
            VOID_BUY_VOID_PUBLIC_EDGE_LAUNCH_AUTHORITY_FIELDS_V1,
          ) ||
          (VOID_BUY_VOID_PUBLIC_EDGE_OBJECT_HAS_OWN_V1(
              checkout,
              "acknowledgements",
            ) &&
            !voidBuyVoidPublicEdgeClosedOwnKeysV1(
              checkout.acknowledgements,
              VOID_BUY_VOID_PUBLIC_EDGE_ACKNOWLEDGEMENT_FIELDS_V1,
            ))) {
        throw new Error("buy_void_post_created_nested_public_fields_invalid");
      }

      // Payment instructions are displayed as actionable money movement.
      // A correct outer 201 plus buyer destination/amount is insufficient:
      // require independently source-bound USDC contract, rail, receiver and
      // exact agreement between top-level and nested payment instructions.
      const instruction = checkout.payment_instructions;
      const chainId = intendedChain === "ethereum" ? 1 : 8453;
      const tokenContract = intendedChain === "ethereum"
        ? VOID_BUY_VOID_PUBLIC_EDGE_ETH_USDC_V1
        : VOID_BUY_VOID_PUBLIC_EDGE_BASE_USDC_V1;
      const address = (value) =>
        typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)
          ? value.toLowerCase() : "";
      const instructionExpiry = instruction?.expires_at_ms;
      const launchExpiry = checkout.launch_authority?.expires_at_ms;
      if (!instruction || typeof instruction !== "object" ||
          VOID_BUY_VOID_PUBLIC_EDGE_ARRAY_IS_ARRAY_V1(instruction) ||
          checkout.tx_hash !== "" ||
          checkout.payment_chain !== intendedChain ||
          checkout.payment_chain_id !== chainId ||
          checkout.delivery_chain !== "void" ||
          checkout.delivery_chain_id !== 2050 ||
          checkout.asset_in !== "USDC" ||
          checkout.usdc_decimals !== 6 ||
          address(checkout.usdc_contract) !== tokenContract ||
          address(checkout.receive_address) !==
            VOID_BUY_VOID_PUBLIC_EDGE_RECEIVER_V1 ||
          address(checkout.delivery_address) !== intendedDestination ||
          address(checkout.delivery_wallet) !== intendedDestination ||
          instruction.request_id !== checkout.request_id ||
          instruction.send_asset !== "USDC" ||
          instruction.send_chain !== intendedChain ||
          instruction.send_chain_id !== chainId ||
          address(instruction.token_contract) !== tokenContract ||
          instruction.token_decimals !== 6 ||
          instruction.amount !== intendedAmount ||
          address(instruction.send_to) !==
            VOID_BUY_VOID_PUBLIC_EDGE_RECEIVER_V1 ||
          address(instruction.send_from) !== intendedDestination ||
          !Number.isSafeInteger(instructionExpiry) ||
          !Number.isSafeInteger(launchExpiry) ||
          instructionExpiry <= 0 || instructionExpiry !== launchExpiry ||
          instruction.do_not_send_before_request !== true ||
          instruction.do_not_send_from_exchange_or_pooled_custody !== true ||
          instruction.keep_transaction_hash !== true ||
          checkout.request_contract?.request_before_payment_required !== true ||
          checkout.request_contract?.one_active_request_per_void_destination !== true ||
          checkout.request_contract?.payment_sender_must_equal_void_destination !== true ||
          checkout.request_contract?.payment_tx_hash_bound_after_request_by_operator !== true ||
          checkout.safety?.automatic_fulfillment !== false ||
          checkout.safety?.manual_review_required !== true) {
        throw new Error("buy_void_post_created_payment_instructions_invalid");
      }


      // Real coupled launch authority is valid for at most five minutes
      // from activation. A newly created request cannot claim an expired,
      // overlong or future-dated actionable payment-instruction lease.
      const receiptCreatedAt = checkout.created_at_ms;
      const receiptNow = Date.now();
      const maxCheckoutLeaseMs = 5 * 60 * 1000;
      if (!Number.isSafeInteger(receiptCreatedAt) ||
          !Number.isSafeInteger(receiptNow) ||
          receiptCreatedAt <= 0 || receiptNow <= 0 ||
          receiptCreatedAt > receiptNow + 30_000 ||
          instructionExpiry <= receiptNow ||
          instructionExpiry <= receiptCreatedAt ||
          instructionExpiry - receiptCreatedAt > maxCheckoutLeaseMs) {
        throw new Error("buy_void_post_created_instruction_lease_invalid");
      }
      admittedCheckoutExpiryMs = instructionExpiry;

      // Public API clients need the same exact-amount and VOID quote
      // authentication as the Buy browser before HTTP 201 is published.
      const checkedMicro = (v) => {
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
        const raw=String(v);
        if (!/^(?:0|[1-9][0-9]*)(?:[.][0-9]{1,6})?$/.test(raw)) return null;
        const [whole, fraction=""]=raw.split(".");
        return BigInt(whole)*1000000n + BigInt(fraction.padEnd(6,"0")||"0");
      };
      const intendedMicro=checkedMicro(intendedAmount);
      if (intendedMicro===null || intendedMicro<=0n ||
          checkedMicro(checkout.usdc_amount)!==intendedMicro ||
          checkedMicro(checkout.requested_amount_usdc)!==intendedMicro ||
          checkout.rate_void_per_usdc!=="2" ||
          checkout.price_usdc_per_void!=="0.50" ||
          checkout.pool_void_total!==10000000 ||
          checkedMicro(checkout.quoted_void)!==intendedMicro*2n) {
        throw new Error("buy_void_post_created_void_quote_invalid");
      }
      // Unknown nested payment-instruction fields are not public receipts.
      if (!voidBuyVoidPublicEdgeClosedOwnKeysV1(
            instruction,
            VOID_BUY_VOID_PUBLIC_EDGE_INSTRUCTION_FIELDS_V1,
            13,
          )) {
        throw new Error("buy_void_post_created_instruction_keyset_invalid");
      }
      // Never publish the upstream wire bytes after validating only their
      // parsed JSON meaning. Duplicate JSON keys can hide a private first
      // value behind a safe last value that wins JSON.parse while the raw
      // bytes still disclose the private value to an unauthenticated caller.
      // Re-encode every accepted 201 from the validated object, and always
      // collapse the reviewed persistence receipt to {ok:true}.
      const publicReceipt = {
        ...parsedBody,
        request: { ...checkout, persisted: { ok: true } },
      };
      responseBody = Buffer.from(JSON.stringify(publicReceipt), "utf8");
    }

    // Privacy is independent of backend rollout order. The retired public
    // writer can return HTTP 200 with a previous buyer's full idempotent
    // request or 409 with the old request ID/status. NEVER forward arbitrary
    // non-201 checkout bytes or upstream headers to an unauthenticated
    // caller. Preserve only narrow HTTP refusal statuses and synthesize
    // a fixed body. A 502 is an UNCERTAIN submission outcome, not proof that
    // a purchase request was not recorded and not permission to retry.
    if (upstreamResponse.status !== 201) {
      const safeStatus = (
        upstreamResponse.status === 400 ||
        upstreamResponse.status === 409 ||
        upstreamResponse.status === 503
      ) ? upstreamResponse.status : 502;
      res.statusCode = safeStatus;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.setHeader("x-content-type-options", "nosniff");
      res.setHeader("x-void-public-buy-void-post-proxy", "v1");
      res.end(JSON.stringify({
        ok: false,
        error: "buy_void_request_upstream_unavailable",
        submission_outcome: "uncertain",
        automatic_retry_safe: false,
      }));
      return;
    }

    // ETag from an upstream is opaque, not a verified checkout artifact.
    // Never forward it, even when the response JSON was otherwise qualified.
    // Qualify permitted headers privately before publishing public HTTP 201;
    // a late deadline HOLD cannot inherit any upstream response identity.
    const acceptedHeaders = [];
    for (
      const headerName
      of [
        "content-type",
        "cache-control",
        "x-content-type-options",
      ]
    ) {
      const headerValue = upstreamResponse.headers.get(headerName);
      if (headerValue) acceptedHeaders.push([headerName, headerValue]);
    }
    // This is the final, immediate-at-publication monotonic authorization.
    // No await or untrusted upstream getter follows this check.
    requireUpstreamBeforeDeadline();
    const finalCheckoutNow = Date.now();
    if (admittedCheckoutExpiryMs === null ||
        !Number.isSafeInteger(finalCheckoutNow) || finalCheckoutNow <= 0 ||
        admittedCheckoutExpiryMs <= finalCheckoutNow) {
      throw new Error("buy_void_post_created_instruction_lease_expired");
    }
    res.statusCode = upstreamResponse.status;
    for (const [headerName, headerValue] of acceptedHeaders) {
      res.setHeader(headerName, headerValue);
    }
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-void-public-buy-void-post-proxy", "v1");
    res.setHeader("content-length", String(responseBody.length));
    res.end(responseBody);
  } catch (_error) {
    if (res.writableEnded || uploadExpired) {
      // The incomplete upload was torn down without any upstream POST.
      // A destroyed socket cannot be represented as a completed receipt.
      return;
    }

    res.statusCode = 502;
    res.setHeader(
      "content-type",
      "application/json; charset=utf-8",
    );
    res.setHeader("cache-control", "no-store");
    res.setHeader(
      "x-content-type-options",
      "nosniff",
    );
    res.setHeader(
      "x-void-public-buy-void-post-proxy",
      "v1",
    );
    res.end(
      JSON.stringify({
        ok: false,
        error: "buy_void_request_upstream_unavailable",
        submission_outcome: "uncertain",
        automatic_retry_safe: false,
      }),
    );
  }
}


const HOST = process.env.VOID_COMPOSITION_HOST || "127.0.0.1";
const PORT = Number(process.env.VOID_COMPOSITION_PORT || "8082");
const PUBLIC_UPSTREAM = (process.env.VOID_PUBLIC_GATEWAY_UPSTREAM || "http://127.0.0.1:8080").replace(/\/+$/, "");
const NODE_UPSTREAM = (process.env.VOID_NODE_UPSTREAM || "http://127.0.0.1:4100").replace(/\/+$/, "");

function normalizeEpoch2PublicReadUpstreamV1(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("invalid epoch2 public read upstream URL");
  }
  if (
    parsed.protocol !== "http:"
    || parsed.hostname !== "127.0.0.1"
    || !parsed.port
    || parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
  ) {
    throw new Error(
      "epoch2 public read upstream must be exact loopback HTTP origin",
    );
  }
  return parsed.origin;
}

const EPOCH2_PUBLIC_READ_UPSTREAM =
  normalizeEpoch2PublicReadUpstreamV1(
    process.env.VOID_EPOCH2_PUBLIC_READ_UPSTREAM || "",
  );
const EPOCH2_PUBLIC_READ_PATHS = new Set([
  "/public-node/economic/epoch2/read-status-v1.json",
  "/public-node/economic/epoch2/balance-v1",
  "/public-node/economic/epoch2/code-v1",
  "/public-node/economic/epoch2/receipt-v1",
]);
const EPOCH2_PUBLIC_READ_MAX_RESPONSE_BYTES = 512 * 1024;
const EPOCH2_PUBLIC_READ_TIMEOUT_MS = 5_000;

function epoch2PublicReadQueryAllowedV1(url) {
  if (
    url.pathname ===
    "/public-node/economic/epoch2/read-status-v1.json"
  ) {
    return !url.search;
  }

  const expected =
    url.pathname === "/public-node/economic/epoch2/receipt-v1"
      ? "tx"
      : "address";
  const keys = [...url.searchParams.keys()];
  if (
    keys.length !== 1
    || keys[0] !== expected
    || url.searchParams.getAll(expected).length !== 1
  ) {
    return false;
  }
  const value = String(url.searchParams.get(expected) || "").toLowerCase();
  return expected === "tx"
    ? /^0x[0-9a-f]{64}$/u.test(value)
    : /^0x[0-9a-f]{40}$/u.test(value);
}

async function proxyEpoch2PublicReadV1(req, res, url, method) {
  if (!EPOCH2_PUBLIC_READ_UPSTREAM) {
    return sendJson(
      res,
      503,
      { ok: false, error: "epoch2_public_read_runtime_unavailable" },
      method,
    );
  }
  if (!epoch2PublicReadQueryAllowedV1(url)) {
    return sendJson(
      res,
      400,
      { ok: false, error: "epoch2_public_read_query_invalid" },
      method,
    );
  }

  const response = await fetch(
    EPOCH2_PUBLIC_READ_UPSTREAM + url.pathname + url.search,
    {
      method,
      redirect: "manual",
      headers: {
        accept: "application/json",
        "user-agent":
          "void-public-app-composition-gateway-epoch2-read-v1",
      },
      signal: AbortSignal.timeout(EPOCH2_PUBLIC_READ_TIMEOUT_MS),
    },
  );

  const body =
    method === "HEAD"
      ? Buffer.alloc(0)
      : Buffer.from(await response.arrayBuffer());
  if (body.length > EPOCH2_PUBLIC_READ_MAX_RESPONSE_BYTES) {
    throw new Error("epoch2 public read response above bound");
  }

  const headers = {
    "content-type":
      response.headers.get("content-type")
      || "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-void-economic-epoch2-public-read-edge": "v1",
  };
  return send(res, response.status, headers, body, method);
}

// VOID_PUBLIC_PARTICIPANT_COMPOSITION_INTEGRATION_V1
const PARTICIPANT_COMPOSITION_MARKER =
  "VOID_PUBLIC_PARTICIPANT_COMPOSITION_INTEGRATION_V1";
const PARTICIPANT_COMPOSITION_ACTIVE =
  process.env.VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE === "1";
const PARTICIPANT_BINDING_REGISTRY_FILE = String(
  process.env.VOID_PUBLIC_PARTICIPANT_BINDING_REGISTRY_FILE || "",
).trim();
const PARTICIPANT_ROLE_RPC_URL = String(
  process.env.VOID_PUBLIC_PARTICIPANT_ROLE_RPC_URL || "",
).trim();
const PARTICIPANT_SESSION_STATE_FILE = String(
  process.env.VOID_PUBLIC_PARTICIPANT_SESSION_STATE_FILE || "",
).trim();
const PARTICIPANT_REQUEST_MAX_BODY_BYTES = 8 * 1024;

let PARTICIPANT_SESSION_HTTP = null;
let PARTICIPANT_ACCOUNT_READ_EDGE = null;

if (PARTICIPANT_COMPOSITION_ACTIVE) {
  if (
    !PARTICIPANT_BINDING_REGISTRY_FILE ||
    !PARTICIPANT_ROLE_RPC_URL ||
    !PARTICIPANT_SESSION_STATE_FILE
  ) {
    throw new Error(
      "participant composition requires binding registry, role RPC, and durable session state",
    );
  }

  const {
    createVoidPublicParticipantLiveRoleAuthorityV1,
  } = await import("./void-public-participant-live-role-authority-v1.mjs");
  const participantLiveRole =
    await createVoidPublicParticipantLiveRoleAuthorityV1({
      rpcUrl: PARTICIPANT_ROLE_RPC_URL,
    });
  const participantStateStore =
    createVoidPublicParticipantSessionStateFileV1({
      stateFile: PARTICIPANT_SESSION_STATE_FILE,
    });

  PARTICIPANT_SESSION_HTTP =
    createVoidPublicParticipantSessionHttpV1({
      bindingRegistryFile: PARTICIPANT_BINDING_REGISTRY_FILE,
      roleAuthority: participantLiveRole.roleAuthority,
      stateStore: participantStateStore,
    });
  PARTICIPANT_ACCOUNT_READ_EDGE =
    createVoidPublicParticipantAccountReadHttpEdgeV1({
      sessionHttp: PARTICIPANT_SESSION_HTTP,
      sourceBase: NODE_UPSTREAM,
      fetchImpl: fetch,
    });
}
const OPERATOR_WEBHOOK_RECEIVER_UPSTREAM = (
  process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM || ""
).replace(/\/+$/, "");
const OPERATOR_WEBHOOK_RECEIVER_PATH =
  "/__void/operator-notifications/v1/candidate";
const OPERATOR_WEBHOOK_RECEIVER_MAX_BODY_BYTES = Math.max(
  1024,
  Number(
    process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_MAX_BODY_BYTES ||
      String(64 * 1024)
  )
);
const OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS = Math.max(
  1000,
  Number(
    process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS || "15000"
  )
);

// VOID_NODE_HOSTED_PAID_WORK_ORIGIN_BRIDGE_V1
const AGENT_PAID_WORK_EDGE_MARKER =
  "VOID_NODE_HOSTED_PAID_WORK_ORIGIN_BRIDGE_V1";
const AGENT_PAID_WORK_SUBMISSION_PATH =
  "/__void/agents/paid-work/submissions/v1";
const AGENT_PAID_WORK_NAMESPACE_PREFIX =
  "/__void/agents";
const AGENT_PAID_WORK_GATEWAY_UPSTREAM =
  normalizeAgentPaidWorkLoopbackUpstream(
    process.env.VOID_AI_AGENT_GATEWAY_UPSTREAM || "",
  );
const AGENT_PAID_WORK_EDGE_MAX_BODY_BYTES = 64 * 1024;
const AGENT_PAID_WORK_EDGE_MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const AGENT_PAID_WORK_EDGE_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.VOID_AI_AGENT_GATEWAY_TIMEOUT_MS || "15000"),
);
if (
  !Number.isFinite(AGENT_PAID_WORK_EDGE_TIMEOUT_MS)
  || AGENT_PAID_WORK_EDGE_TIMEOUT_MS > 120000
) {
  throw new Error("invalid AI-agent gateway timeout");
}

const PUBLIC_NODE_WELL_KNOWN_PATHS = new Set([
  "/.well-known/void-agent-discovery.json",
  "/.well-known/void-agent-discovery.schema.json",
  "/.well-known/void-network-authenticity.json",
  "/.well-known/void-network-authenticity.schema.json",
  "/.well-known/void-public-node.json",
  "/.well-known/void-public-node.schema.json",
]);

// VOIDCHAIN_ORG_PUBLIC_READ_CORS_V1
const VOIDCHAIN_ORG_PUBLIC_READ_CORS_V1_ORIGIN =
  "https://voidchain.org";
const VOIDCHAIN_ORG_PUBLIC_READ_CORS_V1_PATHS = new Set([
  "/__void/ready.json",
  "/blocks/latest/number2.json",
  "/.well-known/void-public-node.json",
  "/public-node/route-index.json",
  "/version",
  "/public-node",
  "/public-node/",
]);

function bindVoidchainOrgPublicReadCorsV1(req, res) {
  const method = String(req.method || "").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return;
  }

  const origin = String(req.headers.origin || "");
  if (origin !== VOIDCHAIN_ORG_PUBLIC_READ_CORS_V1_ORIGIN) {
    return;
  }

  let pathname = "";
  try {
    pathname = new URL(
      req.url || "/",
      "http://voidchain-public-read-cors.local",
    ).pathname;
  } catch {
    return;
  }

  if (
    !VOIDCHAIN_ORG_PUBLIC_READ_CORS_V1_PATHS.has(pathname)
    && !EPOCH2_PUBLIC_READ_PATHS.has(pathname)
  ) {
    return;
  }

  res.__voidchainOrgPublicReadCorsV1 = true;
}

function applyVoidchainOrgPublicReadCorsV1(res, headers) {
  if (res.__voidchainOrgPublicReadCorsV1 !== true) {
    return;
  }

  headers["access-control-allow-origin"] =
    VOIDCHAIN_ORG_PUBLIC_READ_CORS_V1_ORIGIN;
  headers["x-void-public-read-cors"] = "voidchain-org-v1";

  const varyValues = String(headers.vary || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (
    !varyValues.some(
      (value) => value.toLowerCase() === "origin",
    )
  ) {
    varyValues.push("Origin");
  }

  headers.vary = varyValues.join(", ");
}

const PUBLIC_DISCOVERY_PACK_MARKER = "VOID_PUBLIC_DISCOVERY_PACK_V1";
const PUBLIC_DISCOVERY_ROOT = String(
  process.env.VOID_PUBLIC_DISCOVERY_ROOT || "",
).trim();
const PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME = String(
  process.env.VOID_PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME || "",
).trim();
const PUBLIC_DISCOVERY_MAX_FILE_BYTES = Number(
  process.env.VOID_PUBLIC_DISCOVERY_MAX_FILE_BYTES
    || String(1024 * 1024),
);
if (
  !Number.isSafeInteger(PUBLIC_DISCOVERY_MAX_FILE_BYTES)
  || PUBLIC_DISCOVERY_MAX_FILE_BYTES < 1024
  || PUBLIC_DISCOVERY_MAX_FILE_BYTES > 16 * 1024 * 1024
) {
  throw new Error("invalid public discovery maximum file size");
}

function loadPublicDiscoveryPack() {
  if (!PUBLIC_DISCOVERY_ROOT && !PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME) {
    return Object.freeze({
      configured: false,
      root: null,
      indexnowKeyName: null,
      entries: new Map(),
      fileCount: 0,
    });
  }

  if (!PUBLIC_DISCOVERY_ROOT || !PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME) {
    throw new Error(
      "public discovery root and IndexNow key name must be configured together",
    );
  }
  if (!path.isAbsolute(PUBLIC_DISCOVERY_ROOT)) {
    throw new Error("public discovery root must be absolute");
  }
  if (!/^[A-Fa-f0-9]{32}\.txt$/.test(PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME)) {
    throw new Error("invalid public discovery IndexNow key filename");
  }

  const root = fs.realpathSync(PUBLIC_DISCOVERY_ROOT);
  const rootStat = fs.statSync(root);
  if (!rootStat.isDirectory()) {
    throw new Error("public discovery root is not a directory");
  }
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;
  const indexnowKey = PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME.slice(0, -4);
  const specs = [
    {
      route: `/${PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME}`,
      relative: PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME,
      contentType: "text/plain; charset=utf-8",
      expectedText: indexnowKey,
    },
    {
      route: "/discovery/",
      relative: "discovery/index.html",
      contentType: "text/html; charset=utf-8",
    },
    {
      route: "/discovery/void-datanet-dataset-v1.jsonld",
      relative: "discovery/void-datanet-dataset-v1.jsonld",
      contentType: "application/ld+json; charset=utf-8",
    },
    {
      route: "/robots.txt",
      relative: "robots.txt",
      contentType: "text/plain; charset=utf-8",
    },
    {
      route: "/sitemap.xml",
      relative: "sitemap.xml",
      contentType: "application/xml; charset=utf-8",
    },
  ];
  const entries = new Map();

  for (const spec of specs) {
    const candidate = path.join(root, spec.relative);
    const candidateStat = fs.lstatSync(candidate);
    if (!candidateStat.isFile() || candidateStat.isSymbolicLink()) {
      throw new Error(`public discovery artifact is not a direct regular file: ${spec.relative}`);
    }
    const real = fs.realpathSync(candidate);
    if (!real.startsWith(rootPrefix)) {
      throw new Error(`public discovery artifact escaped its root: ${spec.relative}`);
    }
    const body = fs.readFileSync(real);
    if (body.length < 1 || body.length > PUBLIC_DISCOVERY_MAX_FILE_BYTES) {
      throw new Error(`public discovery artifact size refused: ${spec.relative}`);
    }
    if (
      spec.expectedText
      && body.toString("utf8").trim() !== spec.expectedText
    ) {
      throw new Error("public discovery IndexNow key body does not match its filename");
    }
    const sha256 = crypto.createHash("sha256").update(body).digest("hex");
    const headers = {
      "cache-control": "public, max-age=300",
      "content-type": spec.contentType,
      etag: `"${sha256}"`,
      "x-content-type-options": "nosniff",
      "x-void-marker": PUBLIC_DISCOVERY_PACK_MARKER,
      "x-void-public-discovery-pack": "v1",
    };
    if (spec.route === "/discovery/") {
      headers["content-security-policy"] =
        "default-src 'self'; style-src 'self' 'unsafe-inline'; "
        + "img-src 'self' data:; script-src 'self'; connect-src 'self'; "
        + "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; "
        + "form-action 'none'";
    }
    entries.set(spec.route, Object.freeze({
      ...spec,
      body,
      sha256,
      headers: Object.freeze(headers),
    }));
  }

  return Object.freeze({
    configured: true,
    root,
    indexnowKeyName: PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME,
    entries,
    fileCount: entries.size,
  });
}

const PUBLIC_DISCOVERY_PACK = loadPublicDiscoveryPack();
const ECONOMIC_EPOCH2_PUBLIC_STATE_ROUTE =
  "/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json";
const ECONOMIC_EPOCH2_PUBLIC_STATE_EXPECTED_SHA256 =
  "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9";
const ECONOMIC_EPOCH2_PUBLIC_STATE_EXPECTED_MATERIAL_SHA256 =
  "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f";

function loadEconomicEpoch2PublicStateManifestV1() {
  const publicRoot = fs.realpathSync(path.resolve(process.cwd(), "public"));
  const candidate = path.resolve(
    publicRoot,
    "public-node",
    "evidence",
    "economic-epoch2-client-neutral-state-manifest-v1.json",
  );
  const candidateStat = fs.lstatSync(candidate);
  if (!candidateStat.isFile() || candidateStat.isSymbolicLink()) {
    throw new Error("economic epoch2 public state manifest must be a direct regular file");
  }
  const real = fs.realpathSync(candidate);
  const publicRootPrefix =
    publicRoot.endsWith(path.sep) ? publicRoot : publicRoot + path.sep;
  if (!real.startsWith(publicRootPrefix)) {
    throw new Error("economic epoch2 public state manifest escaped public root");
  }

  const body = fs.readFileSync(real);
  const sha256 = crypto.createHash("sha256").update(body).digest("hex");
  if (sha256 !== ECONOMIC_EPOCH2_PUBLIC_STATE_EXPECTED_SHA256) {
    throw new Error("economic epoch2 public state manifest sha256 mismatch");
  }

  let value;
  try {
    value = JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error("economic epoch2 public state manifest json invalid");
  }
  if (
    value?.marker !== "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1"
    || value?.status !== "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN"
    || value?.manifest_material_sha256
      !== ECONOMIC_EPOCH2_PUBLIC_STATE_EXPECTED_MATERIAL_SHA256
    || value?.chain_id !== 2050
    || value?.execution_epoch !== 2
    || !Array.isArray(value?.accounts)
    || value.accounts.length !== 4
    || value?.gates?.migration_authorized !== false
    || value?.gates?.public_activation_authorized !== false
    || value?.authority?.authoritative_chain2050_write !== false
    || value?.authority?.wallet_access !== false
    || value?.authority?.private_key_access !== false
    || value?.authority?.transaction_construction !== false
    || value?.authority?.transaction_signing !== false
    || value?.authority?.transaction_broadcast !== false
    || value?.authority?.token_movement !== false
    || value?.authority?.funds_movement !== false
    || value?.authority?.public_activation !== false
  ) {
    throw new Error("economic epoch2 public state manifest identity or authority mismatch");
  }

  return Object.freeze({
    body,
    sha256,
    headers: Object.freeze({
      "content-type": "application/json; charset=utf-8",
      etag: `"${sha256}"`,
      "x-void-economic-epoch2-public-state-manifest": "v1",
    }),
  });
}

const ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST =
  loadEconomicEpoch2PublicStateManifestV1();
const ECONOMIC_EPOCH2_STATE_ROOT_ANCHOR_ROUTE =
  "/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json";
const ECONOMIC_EPOCH2_STATE_ROOT_ANCHOR_EXPECTED_SHA256 =
  "8bb02e6147096465a78f983d8b34e7420e3c5b69cde11e2bdb5018340557fb84";
const ECONOMIC_EPOCH2_STATE_ROOT_ANCHOR_EXPECTED_BYTES = 3204;

function loadEconomicEpoch2StateRootAnchorPayloadV1() {
  const publicRoot = fs.realpathSync(path.resolve(process.cwd(), "public"));
  const candidate = path.resolve(
    publicRoot,
    "public-node",
    "evidence",
    "economic-epoch2-public-void-state-root-anchor-v1.json",
  );
  const candidateStat = fs.lstatSync(candidate);
  if (!candidateStat.isFile() || candidateStat.isSymbolicLink()) {
    throw new Error(
      "economic epoch2 state-root anchor payload must be a direct regular file",
    );
  }
  const real = fs.realpathSync(candidate);
  const publicRootPrefix =
    publicRoot.endsWith(path.sep) ? publicRoot : publicRoot + path.sep;
  if (!real.startsWith(publicRootPrefix)) {
    throw new Error("economic epoch2 state-root anchor payload escaped public root");
  }

  const body = fs.readFileSync(real);
  const sha256 = crypto.createHash("sha256").update(body).digest("hex");
  if (
    sha256 !== ECONOMIC_EPOCH2_STATE_ROOT_ANCHOR_EXPECTED_SHA256 ||
    body.length !== ECONOMIC_EPOCH2_STATE_ROOT_ANCHOR_EXPECTED_BYTES
  ) {
    throw new Error("economic epoch2 state-root anchor payload exact bytes mismatch");
  }

  let value;
  try {
    value = JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error("economic epoch2 state-root anchor payload json invalid");
  }
  if (
    value?.marker !==
      "VOID_ECONOMIC_EPOCH2_PUBLIC_VOID_STATE_ROOT_ANCHOR_PAYLOAD_V1"
    || value?.version !== 1
    || value?.status !==
      "ANCHOR_PAYLOAD_SOURCE_READY_CHAIN2050_COMMITMENT_PENDING"
    || value?.chain_id !== 2050
    || value?.execution_epoch !== 2
    || value?.object_id !==
      "void:economic:epoch2:successor-state-root:v1"
    || value?.anchor?.genesis_state_root !==
      "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2"
    || value?.commitment?.registry_contract !==
      "DatanetContentCommitmentRegistryV1"
    || value?.commitment?.object_id_sha256 !==
      "fa6a4ff9a7a25b8ec1888c58d7eb49159a69d84a4021b1365fe1293e868f1f51"
    || value?.commitment?.accepted_checkpoint_policy_id !==
      "mainnet0-checkpoint-finality-v1"
    || value?.gates?.successor_genesis_or_state_manifest_public_evidence_ready
      !== true
    || value?.gates?.successor_state_root_public_void_anchor_ready !== false
    || value?.gates?.public_balance_receipt_code_verification_ready !== false
    || value?.authority?.authoritative_chain2050_write !== false
    || value?.authority?.wallet_access !== false
    || value?.authority?.private_key_access !== false
    || value?.authority?.transaction_construction !== false
    || value?.authority?.transaction_signing !== false
    || value?.authority?.transaction_submission !== false
    || value?.authority?.transaction_broadcast !== false
    || value?.authority?.token_movement !== false
    || value?.authority?.funds_movement !== false
    || value?.authority?.migration_authorized !== false
    || value?.authority?.public_activation_authorized !== false
  ) {
    throw new Error(
      "economic epoch2 state-root anchor payload identity or authority mismatch",
    );
  }

  return Object.freeze({
    body,
    sha256,
    headers: Object.freeze({
      "content-type": "application/json; charset=utf-8",
      etag: `"${sha256}"`,
      "x-void-economic-epoch2-state-root-anchor-payload": "v1",
    }),
  });
}

const ECONOMIC_EPOCH2_STATE_ROOT_ANCHOR_PAYLOAD =
  loadEconomicEpoch2StateRootAnchorPayloadV1();
const EXPECTED_PEERS = Math.max(0, Number(process.env.VOID_PUBLIC_EXPECTED_PEERS || "2"));
const NODE_LABEL = process.env.VOID_PUBLIC_NODE_LABEL || "Alienware public seed";
const NETWORK_NAME = process.env.VOID_PUBLIC_NETWORK_NAME || "Mainnet-0";
const TXROOT_QUARANTINED = process.env.VOID_TXROOT_QUARANTINED === "1";
const REQUEST_TIMEOUT_MS = Math.max(500, Number(process.env.VOID_COMPOSITION_FETCH_TIMEOUT_MS || "5000"));
const MAX_PROXY_BODY_BYTES = Number(
  process.env.VOID_COMPOSITION_MAX_BODY_BYTES
    || String(4 * 1024 * 1024),
);
if (
  !Number.isSafeInteger(MAX_PROXY_BODY_BYTES)
  || MAX_PROXY_BODY_BYTES < 1024
) {
  throw new Error("invalid composition maximum proxy body size");
}

const MARKER = "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1";
const HOME_MARKER = "VOID_UI_WAVE2_HOME_READONLY_V1";
const RUNTIME_TRUTH_MARKER = "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1";
const PUBLIC_PARTICIPANT_MARKER =
  "VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_V1";
const PUBLIC_EARN_HEALTH_PATH = "/health";
const PUBLIC_EARN_GATEWAY_STATUS_PATH =
  "/__void/public-earn-gateway-v1/status.json";
const PUBLIC_EARN_STATUS_PATH =
  "/wc/public-earning-pilot-v1/status";
const PUBLIC_EARN_CLAIM_PATH =
  "/wc/public-earning-pilot-v1/claim-ticket";
const PUBLIC_EARN_SUBMIT_PATH =
  "/wc/public-earning-pilot-v1/submit-result";
const PUBLIC_EARN_CLIENT_PATH =
  "/download/void-public-earn-no-node-client-v1.mjs";
const PUBLIC_PARTICIPANT_STATUS_PATH =
  "/__void/public-participant/status.json";
const PUBLIC_PARTICIPANT_BINDING_MAX_RESPONSE_BYTES =
  128 * 1024;
const PUBLIC_EARN_CLAIM_MAX_BODY_BYTES = 64 * 1024;
const PUBLIC_EARN_SUBMIT_MAX_BODY_BYTES = 512 * 1024;
const PUBLIC_EARN_MUTATION_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.VOID_PUBLIC_EARN_MUTATION_TIMEOUT_MS || "60000"),
);
const PUBLIC_DATANET_FETCH_RE =
  /^\/datanet\/v1\/fetch\/[A-Za-z0-9._:-]{1,180}$/;
const PUBLIC_DATANET_WHO_RE = /^[A-Za-z0-9._:-]{1,128}$/;

const blockedPrefixes = [
  "/rpc",
  "/admin",
  "/operator",
  "/__void/buy-void/operator",
  "/validator/admin",
  "/debug",
  "/.env",
  "/keys",
  "/wallet",
  "/secrets",
  "/dev",
  "/upgrade",
  "/__void/dev",
  "/__void/agent",
  "/__void/metrics",
  "/__void/ui/wave3",
  "/__void/ui/wave4",
  "/wc",
  "/jobs",
  "/receipts",
];

const publicModeScript = String.raw`(() => {
  'use strict';
  // VOID_PUBLIC_APP_PUBLIC_MODE_MUTATION_STABILITY_V1
  window.__VOID_PUBLIC_APP_MODE__ = true;

  try {
    sessionStorage.removeItem('void.ui.wave3.wallet.account.v1');
    sessionStorage.removeItem('void.ui.wave4.earn.account.v1');
  } catch (error) {
    window.__VOID_PUBLIC_APP_STORAGE_CLEAR_ERROR__ = true;
    console.warn(
      '[void-public-app] account context storage clear failed',
      String(error?.message || error),
    );
  }

  const setText = (selector, value) => {
    const next = String(value);
    document.querySelectorAll(selector).forEach((node) => {
      if (node.textContent !== next) {
        node.textContent = next;
      }
    });
  };

  const setChip = (selector, label) => {
    const nextClass = 'status-chip status-chip--info';
    const nextLabel = String(label);
    document.querySelectorAll(selector).forEach((node) => {
      if (node.className !== nextClass) {
        node.className = nextClass;
      }
      if (node.textContent !== nextLabel) {
        node.textContent = nextLabel;
      }
    });
  };

  const notice = (root, text) => {
    if (!root || root.querySelector('[data-public-session-boundary]')) return;
    const box = document.createElement('div');
    box.dataset.publicSessionBoundary = 'true';
    box.setAttribute('role', 'status');
    box.style.cssText =
      'margin:12px 0;padding:12px 14px;border:1px solid rgba(76,229,223,.35);' +
      'border-radius:10px;background:rgba(76,229,223,.08);line-height:1.45;';
    box.innerHTML =
      '<strong>Public-safe mode</strong><br><span>' +
      text.replace(/[&<>]/g, (value) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[value])) +
      '</span>';
    root.prepend(box);
  };

  const apply = () => {
    const walletForm = document.querySelector('[data-wallet-account-form]');
    if (walletForm) {
      walletForm.querySelectorAll('input, button').forEach((node) => {
        node.disabled = true;
        node.setAttribute('aria-disabled', 'true');
      });
      notice(
        walletForm.closest('[data-wallet-view]') || walletForm.parentElement,
        'Account-specific wallet identity and Work Credit balances remain available only through a local VOID node or an authorized participant session.'
      );
      setChip('[data-wallet-state-chip]', 'Local session required');
      setText('[data-wallet-message]', 'Public visitors cannot enumerate participant accounts or wallet records.');
    }

    const earnForm = document.querySelector('[data-earn-account-form]');
    if (earnForm) {
      earnForm.querySelectorAll('input, button').forEach((node) => {
        node.disabled = true;
        node.setAttribute('aria-disabled', 'true');
      });
      notice(
        earnForm.closest('[data-earn-view]') || earnForm.parentElement,
        'Account-specific earning history, jobs, receipts, and Work Credit accounting remain available only through a local VOID node or an authorized participant session.'
      );
      setChip('[data-earn-state-chip]', 'Local session required');
      setText('[data-earn-message]', 'Public visitors receive network truth without participant-account enumeration.');
    }

    document.querySelectorAll('button, a, span').forEach((node) => {
      const text = (node.textContent || '').trim();
      if (text === 'Select in Wallet') node.textContent = 'Local session required';
      if (text === 'No account') node.textContent = 'Public-safe';
    });
  };

  document.addEventListener('submit', (event) => {
    if (!window.__VOID_PUBLIC_APP_MODE__) return;
    if (event.target?.matches?.('[data-wallet-account-form], [data-earn-account-form]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      apply();
    }
  }, true);

  const observerConfig = { childList: true, subtree: true };
  const observer = new MutationObserver(() => {
    observer.disconnect();
    try {
      apply();
    } finally {
      observer.observe(document.body, observerConfig);
    }
  });
  const start = () => {
    apply();
    observer.observe(document.body, observerConfig);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();`;

const publicNodeCompatScript = String.raw`(() => {
  'use strict';

  const replaceExact = (before, after) => {
    document.querySelectorAll('body *').forEach((node) => {
      if (node.children.length === 0 && (node.textContent || '').trim() === before) {
        node.textContent = after;
      }
    });
  };

  const setChip = (key, tone, label) => {
    document.querySelectorAll('[data-route-chip="' + key + '"]').forEach((node) => {
      node.className = 'status-chip status-chip--' + tone;
      node.textContent = label;
    });
  };

  const run = async () => {
    try {
      const response = await fetch('/__void/public-app/network.json', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const snapshot = await response.json();
      if (!snapshot || snapshot.marker !== 'VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1') {
        throw new Error('unexpected marker');
      }

      const ready = snapshot.ready === true;
      const runtimeStatus = String(
        snapshot.status || (ready ? 'ready' : 'degraded')
      );
      const restrictedReady = runtimeStatus === 'restricted_ready';
      const unavailable = runtimeStatus === 'unavailable';
      const head = Number.isFinite(Number(snapshot.chain_head))
        ? Number(snapshot.chain_head).toLocaleString('en-US')
        : 'Unavailable';
      const peers = Number.isFinite(Number(snapshot.peer_count))
        ? Number(snapshot.peer_count)
        : 0;

      const readyTone = ready ? 'positive' : restrictedReady ? 'info' : 'warning';
      const readyLabel = ready
        ? 'Ready'
        : restrictedReady
          ? 'Synchronized'
          : unavailable
            ? 'Unavailable'
            : 'Degraded';

      setChip('ready', readyTone, readyLabel);
      setChip('head', head === 'Unavailable' ? 'warning' : 'positive', head === 'Unavailable' ? 'Unavailable' : 'Block ' + head);
      setChip('peers', peers > 0 ? 'positive' : 'warning', peers + ' peer' + (peers === 1 ? '' : 's'));
      setChip('route_index', 'positive', 'Available');

      const publicStatusText = ready
        ? 'Public status ready'
        : restrictedReady
          ? 'Public status synchronized · txroot safety quarantine active'
          : unavailable
            ? 'Public status unavailable'
            : 'Public status degraded';
      const readinessText = ready
        ? 'Ready'
        : restrictedReady
          ? 'Synchronized · quarantined'
          : unavailable
            ? 'Unavailable'
            : 'Degraded';
      const compactStatusText = ready
        ? 'Status ready'
        : restrictedReady
          ? 'Status synchronized · quarantined'
          : unavailable
            ? 'Status unavailable'
            : 'Status degraded';

      replaceExact('Loading public status…', publicStatusText);
      replaceExact('Loading readiness…', readinessText);
      replaceExact('Loading sanitized public status', 'Live sanitized public status');
      replaceExact(
        'No cached or invented telemetry is shown while the adapter is unavailable.',
        restrictedReady
          ? 'Chain and peer mesh are synchronized while txroot persistence remains intentionally quarantined.'
          : 'Fresh bounded telemetry is supplied by the public composition gateway.'
      );
      replaceExact('Loading mesh', peers + ' connected peer' + (peers === 1 ? '' : 's'));
      replaceExact('Waiting for explicit per-node runtime evidence.', 'Public seed reports block ' + head + '.');
      replaceExact('No node coverage published yet.', 'One public seed is currently observed.');
      replaceExact('Alignment unknown', restrictedReady ? 'Synchronized under safety quarantine' : 'Public seed snapshot');
      replaceExact('Waiting for nodes', snapshot.node?.label || 'Public seed');
      replaceExact('Selected node Unknown', 'Selected node ' + (snapshot.node?.label || 'Public seed'));
      replaceExact('Not published', head === 'Unavailable' ? 'Unavailable' : 'Block ' + head);
      replaceExact('Loading public proofs', 'Public proof routes available');
      replaceExact('Waiting for sanitized snapshot', 'Sanitized public-seed snapshot loaded');
      replaceExact('Loading public status', compactStatusText);

      document.documentElement.dataset.voidPublicComposition = 'ready';
      document.documentElement.dataset.voidPublicRuntimeStatus = runtimeStatus;
    } catch (error) {
      setChip('ready', 'warning', 'Unavailable');
      setChip('head', 'warning', 'Unavailable');
      setChip('peers', 'warning', 'Unavailable');
      document.documentElement.dataset.voidPublicComposition = 'error';
      console.warn('[void-public-composition]', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();`;

function escapePublicParticipantHtmlV1(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPublicParticipantHtmlV1(status) {
  const copyReady =
    status?.public_copy_ready === true
    && status?.commands?.status?.shell
    && status?.commands?.run?.shell;
  const identityText = copyReady
    ? "Signed public-origin identity verified. The commands below are bound to the reviewed coordinator origin and live health node ID."
    : "Identity HOLD: public earning may be available, but the signed public-origin identity is not verified yet. Do not substitute coordinator values manually.";
  const commandText = copyReady
    ? status.commands.status.shell + "\n\n" + status.commands.run.shell
    : "HOLD — copy-ready coordinator commands are unavailable until signed public-origin identity verification succeeds.";
  const copyState = copyReady ? "ready" : "hold";

  return String.raw`<!doctype html>
<html lang="en" data-public-copy-ready="${copyState}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VOID Public Earn</title>
  <style>
    :root{color-scheme:dark;background:#070a0f;color:#edf7ff;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#102335 0,#070a0f 52%);min-height:100vh}
    main{max-width:920px;margin:0 auto;padding:38px 20px 70px}
    .eyebrow{letter-spacing:.16em;text-transform:uppercase;color:#69e4dc;font-size:.75rem;font-weight:800}
    h1{font-size:clamp(2.1rem,6vw,4.7rem);line-height:.96;margin:.5rem 0 1rem}
    h2{margin-top:0}.lead{font-size:1.08rem;line-height:1.65;color:#c9d8e5;max-width:760px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin:26px 0}
    .card{border:1px solid rgba(105,228,220,.28);background:rgba(8,17,25,.84);border-radius:16px;padding:20px;box-shadow:0 18px 55px rgba(0,0,0,.22)}
    code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#03070b;border:1px solid #213443;padding:14px;border-radius:12px;color:#d8f8f5}
    a.button{display:inline-flex;align-items:center;justify-content:center;padding:11px 15px;border-radius:10px;text-decoration:none;font-weight:800;background:#69e4dc;color:#041014;margin:4px 8px 4px 0}
    a.secondary{background:transparent;color:#bfeeea;border:1px solid #35635f}
    ul,ol{line-height:1.65;color:#c9d8e5}.boundary{border-left:4px solid #f6c453;padding-left:14px;color:#f7e3ae}
    .identity-hold{border-left:4px solid #f6c453}
    .identity-ready{border-left:4px solid #69e4dc}
    footer{margin-top:32px;color:#8296a7;font-size:.9rem}
  </style>
</head>
<body>
<main>
  <div class="eyebrow">Mainnet-0 · Public Earn</div>
  <h1>Earn Work Credits without running a VOID node.</h1>
  <p class="lead">Use the one-shot no-node client. It creates a private local executor identity, claims one server-selected task, verifies the selected dataset, submits one signed result bundle, and checks the capability-bound canonical +3 WC acceptance response.</p>

  <div class="grid">
    <section class="card">
      <h2>1. Check availability and identity</h2>
      <p>The sanitized status separates service availability from cryptographic coordinator identity trust.</p>
      <a class="button secondary" href="${PUBLIC_PARTICIPANT_STATUS_PATH}">Open status JSON</a>
    </section>
    <section class="card">
      <h2>2. Download one file</h2>
      <p>This is not a node, wallet, miner, validator, or background daemon. Node.js is required to run the single client file.</p>
      <a class="button" href="${PUBLIC_EARN_CLIENT_PATH}">Download no-node client</a>
    </section>
  </div>

  <section class="card ${copyReady ? "identity-ready" : "identity-hold"}">
    <h2>3. Identity-bound handoff</h2>
    <p>${escapePublicParticipantHtmlV1(identityText)}</p>
    <pre>${escapePublicParticipantHtmlV1(commandText)}</pre>
    <p>The account remains user-supplied. Work, dataset, input hash, fixed award, and expiry remain coordinator-selected.</p>
  </section>

  <section class="card boundary">
    <h2>Public boundary</h2>
    <ul>
      <li>No participant account directory or arbitrary balance lookup.</li>
      <li>No manual coordinator-origin or coordinator-node substitution.</li>
      <li>No browser wallet, wallet send, WC→VOID swap, Buy VOID fulfillment, staking, or validator submit.</li>
      <li>No generic job submission or participant-selected award.</li>
      <li>The local operator dashboard is not served through this route.</li>
    </ul>
  </section>

  <p>
    <a class="button secondary" href="/public-node/">Network status</a>
    <a class="button secondary" href="/app/">Read-only app</a>
    <a class="button secondary" href="/docs/public/void-public-earn-no-node-client-v1.md">Client guide</a>
  </p>
  <footer>${PUBLIC_PARTICIPANT_MARKER}</footer>
</main>
</body>
</html>`;
}

function publicDataNetReadAllowed(url) {
  if (!PUBLIC_DATANET_FETCH_RE.test(url.pathname)) return false;
  if (!url.search) return true;
  const keys = Array.from(url.searchParams.keys());
  if (keys.some((key) => key !== "who")) return false;
  const values = url.searchParams.getAll("who");
  return (
    values.length <= 1 &&
    (values.length === 0 || PUBLIC_DATANET_WHO_RE.test(values[0] || ""))
  );
}

function publicEarnReadAllowed(url) {
  if (
    url.pathname === PUBLIC_EARN_HEALTH_PATH ||
    url.pathname === PUBLIC_EARN_GATEWAY_STATUS_PATH ||
    url.pathname === PUBLIC_EARN_CLIENT_PATH
  ) {
    return !url.search;
  }
  if (url.pathname === PUBLIC_EARN_STATUS_PATH) return !url.search;
  return publicDataNetReadAllowed(url);
}

async function fetchPublicJson(pathname) {
  try {
    const { response, body } = await fetchWithLimit(
      `${PUBLIC_UPSTREAM}${pathname}`,
      "GET"
    );
    let json = null;
    let jsonParseError = null;
    try {
      json = JSON.parse(body.toString("utf8"));
    } catch (error) {
      jsonParseError = String(error?.message || error);
    }
    return { status: response.status, json, jsonParseError };
  } catch (error) {
    return {
      status: 0,
      json: null,
      error: String(error?.message || error),
    };
  }
}

async function fetchPublicParticipantOriginBindingV1() {
  const target =
    `${PUBLIC_UPSTREAM}${VOID_PUBLIC_PARTICIPANT_ORIGIN_BINDING_PATH_V1}`;
  try {
    const response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "application/json",
        "user-agent":
          "void-public-app-composition-participant-copy-ready-v1",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (
      response.redirected
      || response.url !== target
      || (response.status >= 300 && response.status < 400)
    ) {
      try {
        await response.body?.cancel?.();
      } catch (error) {
        void error;
      }
      return { status: response.status, json: null };
    }
    const body = await readFetchResponseBodyBoundedV1(
      response,
      PUBLIC_PARTICIPANT_BINDING_MAX_RESPONSE_BYTES,
    );
    let json = null;
    try {
      json = JSON.parse(body.toString("utf8"));
    } catch (error) {
      void error;
    }
    return { status: response.status, json };
  } catch (error) {
    void error;
    return { status: 0, json: null };
  }
}

function publicParticipantCommandRecordV1(argv) {
  return Object.freeze({
    argv: Object.freeze([...argv]),
    shell: argv.join(" "),
  });
}

async function buildPublicParticipantStatus() {
  const [health, gateway, pilot] = await Promise.all([
    fetchPublicJson(PUBLIC_EARN_HEALTH_PATH),
    fetchPublicJson(PUBLIC_EARN_GATEWAY_STATUS_PATH),
    fetchPublicJson(PUBLIC_EARN_STATUS_PATH),
  ]);

  const healthBody =
    health.json && typeof health.json === "object" ? health.json : {};
  const gatewayBody =
    gateway.json && typeof gateway.json === "object" ? gateway.json : {};
  const pilotBody =
    pilot.json && typeof pilot.json === "object" ? pilot.json : {};
  const publicClaim =
    pilotBody.public_claim && typeof pilotBody.public_claim === "object"
      ? pilotBody.public_claim
      : {};

  const coordinatorNodeId =
    typeof healthBody.nodeId === "string" &&
    /^[0-9a-f]{32}$/.test(healthBody.nodeId)
      ? healthBody.nodeId
      : null;
  const fixedAward = Number(pilotBody.fixed_award_wc);
  const available =
    health.status === 200 &&
    gateway.status === 200 &&
    pilot.status === 200 &&
    healthBody.ok === true &&
    gatewayBody.ok === true &&
    gatewayBody.enabled === true &&
    pilotBody.ok === true &&
    pilotBody.coordinator_enabled === true &&
    pilotBody.executor_enabled === false &&
    fixedAward === 3 &&
    publicClaim.enabled === true &&
    publicClaim.available === true &&
    publicClaim.server_selected_work === true &&
    publicClaim.proof_of_executor_key_possession_required === true &&
    publicClaim.transport_mode === "outbound_bundle" &&
    publicClaim.participant_selected_dataset === false &&
    publicClaim.participant_selected_input_hash === false &&
    publicClaim.participant_selected_award === false &&
    coordinatorNodeId !== null;

  const originBinding = available
    ? await fetchPublicParticipantOriginBindingV1()
    : { status: 0, json: null };
  const identityTrust =
    classifyVoidPublicParticipantCopyReadyV1({
      available,
      healthNodeId: coordinatorNodeId,
      bindingHttpStatus: originBinding.status,
      bindingValue: originBinding.json,
    });
  const publicCopyReady =
    identityTrust.public_copy_ready === true;
  const commandBase = publicCopyReady
    ? [
        "node",
        "void-public-earn-no-node-client-v1.mjs",
      ]
    : null;
  const commands = publicCopyReady
    ? {
        status: publicParticipantCommandRecordV1([
          ...commandBase,
          "status",
          "--account",
          "YOUR_ACCOUNT",
          "--coordinator-base",
          identityTrust.coordinator_base,
          "--coordinator-node-id",
          identityTrust.coordinator_node_id,
        ]),
        run: publicParticipantCommandRecordV1([
          ...commandBase,
          "run",
          "--account",
          "YOUR_ACCOUNT",
          "--coordinator-base",
          identityTrust.coordinator_base,
          "--coordinator-node-id",
          identityTrust.coordinator_node_id,
        ]),
      }
    : null;

  return {
    ok: true,
    marker: PUBLIC_PARTICIPANT_MARKER,
    generated_at: new Date().toISOString(),
    available,
    public_copy_ready: publicCopyReady,
    status: publicCopyReady
      ? "copy_ready"
      : available
        ? "identity_hold"
        : "hold",
    no_node_required: true,
    background_service_started: false,
    coordinator_base:
      publicCopyReady ? identityTrust.coordinator_base : null,
    coordinator_node_id: coordinatorNodeId,
    coordinator_node_id_source: "live_health_self_report",
    coordinator_node_id_trusted: publicCopyReady,
    identity_trust: identityTrust,
    commands,
    task_class:
      typeof pilotBody.task_class === "string"
        ? pilotBody.task_class
        : "datanet_fetch_verify",
    fixed_award_wc: fixedAward === 3 ? 3 : null,
    accounting_proof: "capability_bound_submission_response_v1",
    routes: {
      participant: "/participant",
      health: PUBLIC_EARN_HEALTH_PATH,
      gateway_status: PUBLIC_EARN_GATEWAY_STATUS_PATH,
      earning_status: PUBLIC_EARN_STATUS_PATH,
      claim_ticket: PUBLIC_EARN_CLAIM_PATH,
      submit_result: PUBLIC_EARN_SUBMIT_PATH,
      client_download: PUBLIC_EARN_CLIENT_PATH,
    },
    methods: {
      health: ["GET", "HEAD"],
      gateway_status: ["GET", "HEAD"],
      earning_status: ["GET", "HEAD"],
      claim_ticket: ["POST"],
      submit_result: ["POST"],
      client_download: ["GET", "HEAD"],
    },
    sources: {
      health: { status: health.status, available: health.status === 200 },
      gateway: { status: gateway.status, available: gateway.status === 200 },
      pilot: { status: pilot.status, available: pilot.status === 200 },
      public_origin_binding: {
        status: originBinding.status,
        available: originBinding.status === 200,
      },
    },
    boundaries: {
      account_directory: false,
      arbitrary_balance_lookup: false,
      browser_account_state: false,
      local_operator_dashboard: false,
      generic_job_submit: false,
      participant_selected_work: false,
      participant_selected_award: false,
      manual_coordinator_substitution: false,
      wallet: false,
      money_movement: false,
      validator_mutation: false,
      operator_mutation: false,
    },
  };
}

function readBoundedRequestBody(req, maximum) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(declared) && declared > maximum) {
      req.resume();
      reject(new Error("request_body_too_large"));
      return;
    }

    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maximum) {
        reject(new Error("request_body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function validatedCapability(value) {
  if (typeof value !== "string") return null;
  const match =
    /^Bearer (wcep1\.([0-9a-f]{32})\.[A-Za-z0-9_-]{43})$/.exec(
      value.trim()
    );
  if (!match) return null;
  return { header: `Bearer ${match[1]}`, ticketId: match[2] };
}

async function proxyPublicEarnMutation(req, res, url) {
  if (url.search) {
    return send(
      res,
      400,
      { "content-type": "text/plain; charset=utf-8" },
      "post_query_not_allowed\n",
      "POST"
    );
  }

  const claim = url.pathname === PUBLIC_EARN_CLAIM_PATH;
  const submit = url.pathname === PUBLIC_EARN_SUBMIT_PATH;
  if (!claim && !submit) {
    return send(
      res,
      405,
      {
        "content-type": "text/plain; charset=utf-8",
        allow: "GET, HEAD",
      },
      "method_not_allowed\n",
      "POST"
    );
  }

  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    return sendJson(
      res,
      415,
      { ok: false, error: "application_json_required" },
      "POST"
    );
  }

  let capability = null;
  if (claim && req.headers.authorization) {
    return sendJson(
      res,
      400,
      { ok: false, error: "claim_authorization_header_not_allowed" },
      "POST"
    );
  }
  if (submit) {
    capability = validatedCapability(req.headers.authorization);
    if (!capability) {
      return sendJson(
        res,
        401,
        { ok: false, error: "earning_capability_authorization_required" },
        "POST"
      );
    }
  }

  const maximum = claim
    ? PUBLIC_EARN_CLAIM_MAX_BODY_BYTES
    : PUBLIC_EARN_SUBMIT_MAX_BODY_BYTES;

  let body;
  try {
    body = await readBoundedRequestBody(req, maximum);
  } catch (error) {
    if (String(error?.message || "") === "request_body_too_large") {
      return sendJson(
        res,
        413,
        { ok: false, error: "request_body_too_large" },
        "POST"
      );
    }
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch (error) {
    return sendJson(
      res,
      400,
      { ok: false, error: "invalid_json" },
      "POST"
    );
  }

  if (submit) {
    const bodyTicketId = String(parsed?.envelope?.ticket_id || "");
    if (bodyTicketId !== capability.ticketId) {
      return sendJson(
        res,
        401,
        { ok: false, error: "earning_capability_ticket_mismatch" },
        "POST"
      );
    }
  }

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "content-length": String(body.length),
    "user-agent": "void-public-participant-handoff-v1",
  };
  if (submit) headers.authorization = capability.header;

  const response = await fetch(`${PUBLIC_UPSTREAM}${url.pathname}`, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(PUBLIC_EARN_MUTATION_TIMEOUT_MS),
  });
  const responseBody = Buffer.from(await response.arrayBuffer());
  if (responseBody.length > MAX_PROXY_BODY_BYTES) {
    throw new Error(`upstream body exceeds ${MAX_PROXY_BODY_BYTES} bytes`);
  }

  const responseHeaders = copyHeaders(response);
  delete responseHeaders["set-cookie"];
  delete responseHeaders.location;
  responseHeaders["cache-control"] = "no-store";
  return send(
    res,
    response.status,
    responseHeaders,
    responseBody,
    "POST"
  );
}


async function proxyOperatorWebhookReceiver(req, res, url) {
  if (!OPERATOR_WEBHOOK_RECEIVER_UPSTREAM) {
    return sendJson(
      res,
      503,
      { ok: false, error: "operator_webhook_receiver_unavailable" },
      "POST"
    );
  }
  if (
    url.pathname !== OPERATOR_WEBHOOK_RECEIVER_PATH ||
    url.search
  ) {
    return sendJson(
      res,
      400,
      { ok: false, error: "query_not_allowed" },
      "POST"
    );
  }

  const contentType = String(
    req.headers["content-type"] || ""
  ).toLowerCase();
  if (!contentType.startsWith("application/json")) {
    return sendJson(
      res,
      415,
      { ok: false, error: "application_json_required" },
      "POST"
    );
  }

  const authorization = String(
    req.headers.authorization || ""
  ).trim();
  if (!/^Bearer [^\s]{16,8192}$/.test(authorization)) {
    return sendJson(
      res,
      401,
      { ok: false, error: "bearer_authorization_required" },
      "POST"
    );
  }

  let body;
  try {
    body = await readBoundedRequestBody(
      req,
      OPERATOR_WEBHOOK_RECEIVER_MAX_BODY_BYTES
    );
  } catch (error) {
    if (
      String(error?.message || "") ===
      "request_body_too_large"
    ) {
      return sendJson(
        res,
        413,
        { ok: false, error: "request_body_too_large" },
        "POST"
      );
    }
    throw error;
  }

  const bodySha = crypto
    .createHash("sha256")
    .update(body)
    .digest("hex");
  const declaredSha = String(
    req.headers["x-void-payload-sha256"] || ""
  ).toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(declaredSha)) {
    return sendJson(
      res,
      400,
      { ok: false, error: "payload_sha256_required" },
      "POST"
    );
  }
  if (declaredSha !== bodySha) {
    return sendJson(
      res,
      400,
      { ok: false, error: "payload_sha256_mismatch" },
      "POST"
    );
  }

  try {
    JSON.parse(body.toString("utf8"));
  } catch {
    return sendJson(
      res,
      400,
      { ok: false, error: "invalid_json" },
      "POST"
    );
  }

  const response = await fetch(
    `${OPERATOR_WEBHOOK_RECEIVER_UPSTREAM}${OPERATOR_WEBHOOK_RECEIVER_PATH}`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization,
        "content-type": "application/json",
        "content-length": String(body.length),
        "user-agent": "void-public-app-composition-gateway-v1",
        "x-void-payload-sha256": bodySha,
      },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(
        OPERATOR_WEBHOOK_RECEIVER_TIMEOUT_MS
      ),
    }
  );

  const responseBody = Buffer.from(
    await response.arrayBuffer()
  );
  if (responseBody.length > MAX_PROXY_BODY_BYTES) {
    throw new Error(
      `upstream body exceeds ${MAX_PROXY_BODY_BYTES} bytes`
    );
  }

  const responseHeaders = copyHeaders(response);
  delete responseHeaders["set-cookie"];
  delete responseHeaders.location;
  responseHeaders["cache-control"] = "no-store";
  responseHeaders["x-void-operator-webhook-route"] = "v1";

  return send(
    res,
    response.status,
    responseHeaders,
    responseBody,
    "POST"
  );
}


function normalizeAgentPaidWorkLoopbackUpstream(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("invalid AI-agent gateway upstream URL");
  }

  if (
    parsed.protocol !== "http:"
    || parsed.hostname !== "127.0.0.1"
    || !parsed.port
    || parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
  ) {
    throw new Error(
      "AI-agent gateway upstream must be exact loopback HTTP origin",
    );
  }

  return parsed.origin;
}

function agentPaidWorkEdgeHeaders(extra = {}) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-void-agent-paid-work-submission-route": "v1",
    "x-void-node-hosted-paid-work-origin-bridge": "v1",
    ...extra,
  };
}

function sendAgentPaidWorkEdgeJson(
  res,
  status,
  value,
  method = "GET",
  extra = {},
) {
  return send(
    res,
    status,
    agentPaidWorkEdgeHeaders({
      "content-type": "application/json; charset=utf-8",
      ...extra,
    }),
    JSON.stringify(value) + "\n",
    method,
  );
}

async function proxyAgentPaidWorkEdge(req, res, url, method) {
  if (url.search || url.hash) {
    return sendAgentPaidWorkEdgeJson(
      res,
      400,
      { ok: false, error: "query_not_allowed" },
      method,
    );
  }

  if (!AGENT_PAID_WORK_GATEWAY_UPSTREAM) {
    return sendAgentPaidWorkEdgeJson(
      res,
      503,
      {
        ok: false,
        error: "agent_paid_work_gateway_unavailable",
      },
      method,
    );
  }

  if (!["GET", "HEAD", "POST"].includes(method)) {
    return send(
      res,
      405,
      agentPaidWorkEdgeHeaders({
        "content-type": "text/plain; charset=utf-8",
        allow: "GET, HEAD, POST",
      }),
      "method_not_allowed\n",
      method,
    );
  }

  let body;
  const headers = {
    accept: "application/json",
    "user-agent":
      "void-public-app-composition-agent-paid-work-edge-v1",
  };

  if (method === "POST") {
    const contentType = String(
      req.headers["content-type"] || "",
    ).toLowerCase();
    if (!contentType.startsWith("application/json")) {
      return sendAgentPaidWorkEdgeJson(
        res,
        415,
        { ok: false, error: "application_json_required" },
        method,
      );
    }

    const authorization = String(
      req.headers.authorization || "",
    ).trim();
    if (!/^Bearer [^\s]{16,8192}$/.test(authorization)) {
      return sendAgentPaidWorkEdgeJson(
        res,
        401,
        { ok: false, error: "bearer_authorization_required" },
        method,
      );
    }

    try {
      body = await readBoundedRequestBody(
        req,
        AGENT_PAID_WORK_EDGE_MAX_BODY_BYTES,
      );
    } catch (error) {
      if (
        String(error?.message || "")
        === "request_body_too_large"
      ) {
        return sendAgentPaidWorkEdgeJson(
          res,
          413,
          { ok: false, error: "request_body_too_large" },
          method,
        );
      }
      throw error;
    }

    const bodySha = crypto
      .createHash("sha256")
      .update(body)
      .digest("hex");
    const declaredSha = String(
      req.headers["x-void-payload-sha256"] || "",
    ).toLowerCase();

    if (!/^[0-9a-f]{64}$/.test(declaredSha)) {
      return sendAgentPaidWorkEdgeJson(
        res,
        400,
        { ok: false, error: "payload_sha256_required" },
        method,
      );
    }
    if (declaredSha !== bodySha) {
      return sendAgentPaidWorkEdgeJson(
        res,
        400,
        { ok: false, error: "payload_sha256_mismatch" },
        method,
      );
    }

    try {
      JSON.parse(body.toString("utf8"));
    } catch {
      return sendAgentPaidWorkEdgeJson(
        res,
        400,
        { ok: false, error: "invalid_json" },
        method,
      );
    }

    headers.authorization = authorization;
    headers["content-type"] = "application/json";
    headers["content-length"] = String(body.length);
    headers["x-void-payload-sha256"] = bodySha;
  }

  try {
    const upstreamResponse = await fetch(
      `${AGENT_PAID_WORK_GATEWAY_UPSTREAM}${AGENT_PAID_WORK_SUBMISSION_PATH}`,
      {
        method,
        headers,
        body: method === "POST" ? body : undefined,
        redirect: "manual",
        signal: AbortSignal.timeout(
          AGENT_PAID_WORK_EDGE_TIMEOUT_MS,
        ),
      },
    );

    const responseBody =
      method === "HEAD"
        ? Buffer.alloc(0)
        : Buffer.from(await upstreamResponse.arrayBuffer());
    if (
      responseBody.length
      > AGENT_PAID_WORK_EDGE_MAX_RESPONSE_BYTES
    ) {
      throw new Error(
        "AI-agent gateway response exceeds maximum",
      );
    }

    const responseHeaders = copyHeaders(upstreamResponse);
    delete responseHeaders["set-cookie"];
    delete responseHeaders.location;
    delete responseHeaders["www-authenticate"];

    return send(
      res,
      upstreamResponse.status,
      agentPaidWorkEdgeHeaders(responseHeaders),
      responseBody,
      method,
    );
  } catch (error) {
    process.stderr.write(
      `${AGENT_PAID_WORK_EDGE_MARKER} upstream_error=${String(error)}\n`,
    );
    return sendAgentPaidWorkEdgeJson(
      res,
      502,
      {
        ok: false,
        error: "agent_paid_work_gateway_upstream_failed",
      },
      method,
    );
  }
}

function isBlocked(pathname) {
  // Normalize before any generic upstream fallback. Express route matching may
  // be case-insensitive; percent-encoded path segments cannot bypass the wall.
  let canonical;
  try {
    canonical = decodeURIComponent(pathname).toLowerCase();
  } catch {
    return true;
  }
  // Never forward nested percent escapes: a downstream hop may decode again.
  if (canonical.includes("%")) return true;
  return blockedPrefixes.some((prefix) => canonical === prefix || canonical.startsWith(prefix + "/"));
}

function copyHeaders(response) {
  const headers = {};
  for (const [key, value] of response.headers.entries()) {
    const lower = key.toLowerCase();
    if (
      [
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
        "content-length",
      ].includes(lower)
    ) {
      continue;
    }
    headers[key] = value;
  }
  headers["x-void-public-app-composition"] = "v1";
  return headers;
}

function send(res, status, headers, body, method = "GET") {
  const value = Buffer.isBuffer(body) ? body : Buffer.from(String(body ?? ""));
  const finalHeaders = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-void-public-app-composition": "v1",
    ...headers,
  };
  applyVoidchainOrgPublicReadCorsV1(res, finalHeaders);
  if (method !== "HEAD") finalHeaders["content-length"] = String(value.length);
  res.writeHead(status, finalHeaders);
  if (method === "HEAD") return res.end();
  res.end(value);
}

function sendJson(res, status, value, method = "GET") {
  send(
    res,
    status,
    { "content-type": "application/json; charset=utf-8" },
    JSON.stringify(value, null, 2) + "\n",
    method
  );
}

async function readFetchResponseBodyBoundedV1(
  response,
  maximum = MAX_PROXY_BODY_BYTES,
) {
  const declared = String(
    response.headers.get("content-length") || "",
  ).trim();
  if (declared) {
    if (!/^\d+$/.test(declared)) {
      try {
        await response.body?.cancel?.();
      } catch (error) {
        void error;
      }
      throw new Error("upstream content-length invalid");
    }
    if (BigInt(declared) > BigInt(maximum)) {
      try {
        await response.body?.cancel?.();
      } catch (error) {
        void error;
      }
      throw new Error(`upstream body exceeds ${maximum} bytes`);
    }
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    throw new Error("upstream body is not stream-readable");
  }

  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new Error("upstream body chunk invalid");
      }
      total += value.byteLength;
      if (total > maximum) {
        try {
          await reader.cancel("upstream body exceeds byte limit");
        } catch (error) {
          void error;
        }
        throw new Error(`upstream body exceeds ${maximum} bytes`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (error) {
      void error;
    }
  }

  return Buffer.concat(chunks, total);
}

async function fetchWithLimit(url, method = "GET") {
  const response = await fetch(url, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (method === "HEAD") return { response, body: Buffer.alloc(0) };
  const body = await readFetchResponseBodyBoundedV1(
    response,
    MAX_PROXY_BODY_BYTES,
  );
  return { response, body };
}

async function fetchJson(pathname) {
  try {
    const { response, body } = await fetchWithLimit(`${NODE_UPSTREAM}${pathname}`, "GET");
    let json = null;
    let jsonParseError = null;
    try {
      json = JSON.parse(body.toString("utf8"));
    } catch (error) {
      jsonParseError = String(error?.message || error);
    }
    return { status: response.status, json, body, jsonParseError };
  } catch (error) {
    return {
      status: 0,
      json: null,
      body: Buffer.alloc(0),
      error: String(error?.message || error),
    };
  }
}

function extractHead(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  if (!value || typeof value !== "object") return null;
  for (const key of ["number", "head", "height", "latest", "block", "chain_head"]) {
    if (Number.isFinite(Number(value[key]))) return Number(value[key]);
  }
  return null;
}

function extractPeerCount(value) {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value.connected)) return value.connected.length;
  if (Array.isArray(value.peers)) return value.peers.length;
  if (Number.isFinite(Number(value.count))) return Number(value.count);
  if (Number.isFinite(Number(value.peer_count))) return Number(value.peer_count);
  if (Number.isFinite(Number(value.peers))) return Number(value.peers);
  return 0;
}

let snapshotCache = { at: 0, value: null };

async function buildSnapshot() {
  const now = Date.now();
  if (snapshotCache.value && now - snapshotCache.at < 1500) return snapshotCache.value;

  const [readyResult, headResult, peersResult, versionResult] = await Promise.all([
    fetchJson("/__void/ready.json"),
    fetchJson("/blocks/latest/number2.json"),
    fetchJson("/p2p/peers"),
    fetchJson("/version"),
  ]);

  const readyBody =
    readyResult.json && typeof readyResult.json === "object" ? readyResult.json : {};
  const head =
    extractHead(headResult.json) ??
    extractHead(readyBody.head) ??
    extractHead(readyBody.lastmile_seen);
  const peerCount = extractPeerCount(peersResult.json);
  const reasons = Array.isArray(readyBody.reasons)
    ? readyBody.reasons.map((item) => String(item)).slice(0, 16)
    : [];
  const reportedReady = readyBody.ready === true;
  const gap = Number.isFinite(Number(readyBody.gap)) ? Number(readyBody.gap) : null;
  const txrootLive = Number.isFinite(Number(readyBody.txroot_live))
    ? Number(readyBody.txroot_live)
    : null;
  const operationalReady =
    reportedReady && gap === 0 && txrootLive === 1 && reasons.length === 0;
  const publicServiceAvailable =
    readyResult.status === 200 &&
    headResult.status === 200 &&
    peersResult.status === 200 &&
    versionResult.status === 200;
  const chainSynchronized =
    reportedReady && gap === 0 && Number.isFinite(Number(head));
  const meshConnected = Number.isFinite(Number(peerCount)) && peerCount > 0;
  const meshAligned =
    Number.isFinite(Number(peerCount)) && peerCount >= EXPECTED_PEERS;
  const txrootQuarantineActive =
    TXROOT_QUARANTINED && txrootLive !== 1;
  const quarantineReasonOnly =
    reasons.length > 0 &&
    reasons.every((reason) => reason === "txroot_live!=1");
  const restrictedReady =
    !operationalReady &&
    publicServiceAvailable &&
    chainSynchronized &&
    meshConnected &&
    meshAligned &&
    txrootQuarantineActive &&
    quarantineReasonOnly;
  const runtimeStatus = operationalReady
    ? "ready"
    : restrictedReady
      ? "restricted_ready"
      : publicServiceAvailable
        ? "degraded"
        : "unavailable";
  const runtimeStatusLabel = operationalReady
    ? "Ready"
    : restrictedReady
      ? "Synchronized under txroot safety quarantine"
      : runtimeStatus === "unavailable"
        ? "Unavailable"
        : "Degraded";
  const runtimeStatusDetail = operationalReady
    ? "Strict readiness checks are green."
    : restrictedReady
      ? "Chain head and expected peer mesh are synchronized; txroot persistence remains intentionally quarantined."
      : runtimeStatus === "unavailable"
        ? "One or more required public telemetry sources are unavailable."
        : "Public telemetry is available, but strict or restricted-ready conditions are not satisfied.";
  const versionBody =
    versionResult.json && typeof versionResult.json === "object"
      ? versionResult.json
      : {};

  const snapshot = {
    ok: true,
    marker: MARKER,
    runtime_truth_marker: RUNTIME_TRUTH_MARKER,
    generated_at: new Date().toISOString(),
    read_only: true,
    public_safe: true,
    status: runtimeStatus,
    status_label: runtimeStatusLabel,
    status_detail: runtimeStatusDetail,
    strict_ready: operationalReady,
    restricted_ready: restrictedReady,
    public_service_available: publicServiceAvailable,
    chain_synchronized: chainSynchronized,
    mesh_connected: meshConnected,
    mesh_aligned: meshAligned,
    security_mode: txrootQuarantineActive ? "txroot_quarantine" : "normal",
    network_name: NETWORK_NAME,
    node: {
      label: NODE_LABEL,
      role: "public-seed",
      public: true,
    },
    ready: operationalReady,
    operational_ready: operationalReady,
    reported_ready: reportedReady,
    chain_head: head,
    head,
    gap,
    txroot_live: txrootLive,
    txroot_quarantined: txrootQuarantineActive,
    reasons,
    peer_count: peerCount,
    expected_peer_count: EXPECTED_PEERS,
    version: {
      available: versionResult.status === 200,
      version:
        typeof versionBody.version === "string" ? versionBody.version : null,
      protocol_version: Number.isFinite(Number(versionBody.protocol_version))
        ? Number(versionBody.protocol_version)
        : null,
      channel:
        typeof versionBody.channel === "string" ? versionBody.channel : null,
      git_commit:
        typeof versionBody.git_commit === "string"
          ? versionBody.git_commit
          : null,
    },
    nodes: [
      {
        label: NODE_LABEL,
        role: "public-seed",
        head,
        peer_count: peerCount,
        ready: operationalReady,
        strict_ready: operationalReady,
        restricted_ready: restrictedReady,
        status: runtimeStatus,
        status_label: runtimeStatusLabel,
        reported_ready: reportedReady,
        gap,
        txroot_live: txrootLive,
        txroot_quarantined: txrootQuarantineActive,
        reasons,
      },
    ],
    sources: {
      readiness: {
        status: readyResult.status,
        available: readyResult.status === 200,
      },
      head: {
        status: headResult.status,
        available: headResult.status === 200,
      },
      peers: {
        status: peersResult.status,
        available: peersResult.status === 200,
      },
      version: {
        status: versionResult.status,
        available: versionResult.status === 200,
      },
    },
    boundaries: {
      account_enumeration: false,
      wallet_records: false,
      work_credit_balances: false,
      job_history: false,
      receipt_history: false,
      peer_ids: false,
      peer_addresses: false,
      mutation: false,
      money_movement: false,
      validator_mutation: false,
      operator_mutation: false,
    },
  };

  snapshotCache = { at: now, value: snapshot };
  return snapshot;
}

function toHomeSnapshot(snapshot) {
  return {
    ok: true,
    marker: HOME_MARKER,
    generated_at: snapshot.generated_at,
    read_only: true,
    public_safe: true,
    network_name: snapshot.network_name,
    node: snapshot.node,
    account: {
      selected: false,
      id: null,
      label: "Public-safe view",
    },
    balances: {
      available: false,
      void_display: "—",
      spendable_wc_display: "—",
      production_wc_display: "—",
      reason: "Account-scoped balances are not public.",
    },
    network: {
      health:
        snapshot.status === "ready"
          ? "healthy"
          : snapshot.status === "restricted_ready"
            ? "restricted"
            : snapshot.status,
      status: snapshot.status,
      status_label: snapshot.status_label,
      status_detail: snapshot.status_detail,
      ready: snapshot.ready,
      strict_ready: snapshot.strict_ready,
      restricted_ready: snapshot.restricted_ready,
      public_service_available: snapshot.public_service_available,
      chain_synchronized: snapshot.chain_synchronized,
      mesh_connected: snapshot.mesh_connected,
      mesh_aligned: snapshot.mesh_aligned,
      security_mode: snapshot.security_mode,
      reported_ready: snapshot.reported_ready,
      chain_head: snapshot.chain_head,
      gap: snapshot.gap,
      txroot_live: snapshot.txroot_live,
      txroot_quarantined: snapshot.txroot_quarantined,
      reasons: snapshot.reasons,
      peer_count: snapshot.peer_count,
      expected_peer_count: snapshot.expected_peer_count,
    },
    sources: {
      health: snapshot.sources.readiness,
      readiness: snapshot.sources.readiness,
      head: snapshot.sources.head,
      peers: snapshot.sources.peers,
    },
    boundaries: snapshot.boundaries,
  };
}

function injectBefore(html, needle, addition) {
  const index = html.toLowerCase().lastIndexOf(needle.toLowerCase());
  if (index < 0) return html + addition;
  return html.slice(0, index) + addition + html.slice(index);
}

async function proxy(
  req,
  res,
  upstream,
  { injectApp = false, injectPublicNode = false } = {}
) {
  const target = `${upstream}${req.url || "/"}`;
  const { response, body } = await fetchWithLimit(target, req.method);
  const headers = copyHeaders(response);
  let output = body;

  if (req.method !== "HEAD") {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      let html = body.toString("utf8");
      if (injectApp) {
        html = injectBefore(
          html,
          "</head>",
          '\n<script>window.__VOID_PUBLIC_APP_MODE__=true;</script>\n' +
            '<script src="/__void/public-app/public-mode.js"></script>\n'
        );
      }
      if (injectPublicNode) {
        html = injectBefore(
          html,
          "</body>",
          '\n<script src="/__void/public-app/public-node-compat.js" defer></script>\n'
        );
      }
      output = Buffer.from(html);
      headers["content-security-policy"] =
        "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
        "connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
    }
  }

  send(res, response.status, headers, output, req.method);
}


// VOID_PUBLIC_PARTICIPANT_COMPOSITION_INTEGRATION_V1_HELPERS
const PARTICIPANT_SESSION_PATHS = new Set([
  VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.status_path,
  VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.challenge_path,
  VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.login_path,
  VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.logout_path,
]);
const PARTICIPANT_ACCOUNT_READ_PATHS = new Set([
  VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.status_path,
  VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.wallet_path,
  VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.earn_path,
]);

function isParticipantCompositionPath(pathname) {
  return (
    PARTICIPANT_SESSION_PATHS.has(pathname) ||
    PARTICIPANT_ACCOUNT_READ_PATHS.has(pathname)
  );
}

async function participantRequestBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const value = Buffer.from(chunk);
    total += value.length;
    if (total > PARTICIPANT_REQUEST_MAX_BODY_BYTES) {
      throw new Error("participant_request_body_too_large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function participantRequestHeaders(req) {
  const headers = {};
  for (const [name, value] of Object.entries(req.headers || {})) {
    if (value === undefined) continue;
    headers[name] = value;
  }
  return headers;
}

function sendParticipantCompositionResponse(res, result, method) {
  const headers = {
    ...(result?.headers || {}),
    "x-void-public-participant-composition": "v1",
  };
  delete headers["set-cookie"];
  delete headers["content-length"];

  const body =
    result?.body === null || result?.body === undefined
      ? Buffer.alloc(0)
      : Buffer.from(JSON.stringify(result.body) + "\n", "utf8");

  return send(
    res,
    Number(result?.status || 500),
    headers,
    body,
    method,
  );
}

async function handleParticipantComposition(req, res, url, method) {
  if (!PARTICIPANT_COMPOSITION_ACTIVE) {
    return false;
  }

  const pathname = url.pathname;
  if (!isParticipantCompositionPath(pathname)) {
    return false;
  }

  let body;
  try {
    body = await participantRequestBody(req);
  } catch (error) {
    if (
      String(error?.message || error) ===
      "participant_request_body_too_large"
    ) {
      sendJson(
        res,
        413,
        {
          ok: false,
          marker: PARTICIPANT_COMPOSITION_MARKER,
          error: "request_body_too_large",
          max_bytes: PARTICIPANT_REQUEST_MAX_BODY_BYTES,
        },
        method,
      );
      return true;
    }
    throw error;
  }

  const request = {
    url: req.url || "/",
    method,
    headers: participantRequestHeaders(req),
    body,
  };

  const result = PARTICIPANT_SESSION_PATHS.has(pathname)
    ? await PARTICIPANT_SESSION_HTTP.handle(request)
    : await PARTICIPANT_ACCOUNT_READ_EDGE.handle(request);

  sendParticipantCompositionResponse(res, result, method);
  return true;
}

const server = http.createServer(async (req, res) => {
  bindVoidchainOrgPublicReadCorsV1(req, res);

  // VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_ROUTE
  try {
    const voidBuyVoidPublicEdgeUrlV1 = new URL(
      String(req.url || "/"),
      "http://127.0.0.1",
    );

    if (
      String(req.method || "").toUpperCase() === "POST"
      && voidBuyVoidPublicEdgeUrlV1.pathname
        === "/__void/buy-void/request"
    ) {
      voidBuyVoidPublicEdgePostProxyV1(
        req,
        res,
      );
      return;
    }
  } catch (_voidBuyVoidPublicEdgeRouteErrorV1) {
    // Existing composition-gateway routing remains authoritative
    // for malformed URLs and every non-allowlisted request.
  }

  try {
    const method = String(req.method || "GET").toUpperCase();
    const url = new URL(req.url || "/", "http://composition.local");
    const pathname = url.pathname;

    if (
      await handleParticipantComposition(
        req,
        res,
        url,
        method,
      )
    ) {
      return;
    }

    if (pathname === AGENT_PAID_WORK_SUBMISSION_PATH) {
      return await proxyAgentPaidWorkEdge(
        req,
        res,
        url,
        method,
      );
    }

    // agents_namespace_fail_closed
    if (
      pathname === AGENT_PAID_WORK_NAMESPACE_PREFIX
      || pathname.startsWith(
        `${AGENT_PAID_WORK_NAMESPACE_PREFIX}/`,
      )
    ) {
      return send(
        res,
        404,
        { "content-type": "text/plain; charset=utf-8" },
        "not_public\n",
        method,
      );
    }

    if (method === "POST") {
      if (pathname === OPERATOR_WEBHOOK_RECEIVER_PATH) {
        return await proxyOperatorWebhookReceiver(req, res, url);
      }
      if (
        pathname === PUBLIC_EARN_CLAIM_PATH ||
        pathname === PUBLIC_EARN_SUBMIT_PATH
      ) {
        return await proxyPublicEarnMutation(req, res, url);
      }
      return send(
        res,
        405,
        {
          "content-type": "text/plain; charset=utf-8",
          allow: "GET, HEAD",
        },
        "method_not_allowed\n",
        method
      );
    }

    if (pathname === OPERATOR_WEBHOOK_RECEIVER_PATH) {
      return send(
        res,
        405,
        {
          "content-type": "text/plain; charset=utf-8",
          allow: "POST",
        },
        "method_not_allowed\n",
        method
      );
    }

    if (method !== "GET" && method !== "HEAD") {
      return send(
        res,
        405,
        {
          "content-type": "text/plain; charset=utf-8",
          allow: "GET, HEAD",
        },
        "method_not_allowed\n",
        method
      );
    }

    if (EPOCH2_PUBLIC_READ_PATHS.has(pathname)) {
      return await proxyEpoch2PublicReadV1(
        req,
        res,
        url,
        method,
      );
    }

    if (
      PUBLIC_DISCOVERY_PACK.configured
      && pathname === "/discovery"
    ) {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "public_discovery_query_not_allowed" },
          method,
        );
      }
      return send(
        res,
        308,
        {
          "cache-control": "public, max-age=300",
          location: "/discovery/",
          "x-content-type-options": "nosniff",
          "x-void-marker": PUBLIC_DISCOVERY_PACK_MARKER,
          "x-void-public-discovery-pack": "v1",
        },
        "",
        method,
      );
    }

    const publicDiscoveryEntry =
      PUBLIC_DISCOVERY_PACK.entries.get(pathname);
    if (publicDiscoveryEntry) {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "public_discovery_query_not_allowed" },
          method,
        );
      }
      return send(
        res,
        200,
        publicDiscoveryEntry.headers,
        publicDiscoveryEntry.body,
        method,
      );
    }

    if (pathname === ECONOMIC_EPOCH2_PUBLIC_STATE_ROUTE) {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "economic_epoch2_public_state_query_not_allowed" },
          method,
        );
      }
      return send(
        res,
        200,
        ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST.headers,
        ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST.body,
        method,
      );
    }

    if (pathname === ECONOMIC_EPOCH2_STATE_ROOT_ANCHOR_ROUTE) {
      if (url.search) {
        return sendJson(
          res,
          400,
          {
            ok: false,
            error: "economic_epoch2_state_root_anchor_query_not_allowed",
          },
          method,
        );
      }
      return send(
        res,
        200,
        ECONOMIC_EPOCH2_STATE_ROOT_ANCHOR_PAYLOAD.headers,
        ECONOMIC_EPOCH2_STATE_ROOT_ANCHOR_PAYLOAD.body,
        method,
      );
    }

    if (pathname === "/participant" || pathname === "/participant/") {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "participant_query_not_allowed" },
          method
        );
      }
      const participantStatus =
        await buildPublicParticipantStatus();
      return send(
        res,
        200,
        {
          "content-type": "text/html; charset=utf-8",
          "content-security-policy":
            "default-src 'self'; style-src 'unsafe-inline'; " +
            "img-src 'self' data:; object-src 'none'; base-uri 'self'; " +
            "frame-ancestors 'none'; form-action 'none'",
        },
        renderPublicParticipantHtmlV1(participantStatus),
        method
      );
    }

    if (pathname === PUBLIC_PARTICIPANT_STATUS_PATH) {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "participant_status_query_not_allowed" },
          method
        );
      }
      return sendJson(
        res,
        200,
        await buildPublicParticipantStatus(),
        method
      );
    }

    if (
      pathname ===
      VOID_PUBLIC_PARTICIPANT_ORIGIN_BINDING_PATH_V1
    ) {
      if (url.search) {
        return sendJson(
          res,
          400,
          {
            ok: false,
            error:
              "public_origin_binding_query_not_allowed",
          },
          method,
        );
      }
      return await proxy(req, res, PUBLIC_UPSTREAM);
    }

    if (publicEarnReadAllowed(url)) {
      return await proxy(req, res, PUBLIC_UPSTREAM);
    }

    if (PUBLIC_NODE_WELL_KNOWN_PATHS.has(pathname)) {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "well_known_query_not_allowed" },
          method
        );
      }
      return await proxy(req, res, NODE_UPSTREAM);
    }

    if (isBlocked(pathname)) {
      return send(
        res,
        404,
        { "content-type": "text/plain; charset=utf-8" },
        "not_public\n",
        method
      );
    }

    if (pathname === "/__void/public-app/status.json") {
      return sendJson(
        res,
        200,
        {
          ok: true,
          marker: MARKER,
          runtime_truth_marker: RUNTIME_TRUTH_MARKER,
          mode: "public_safe_composition",
          host: HOST,
          port: PORT,
          public_upstream_private: true,
          node_upstream_private: true,
          methods: [
            "GET",
            "HEAD",
            "POST(exact public earn and operator notification routes only)",
          ],
          operator_webhook_receiver_route_configured:
            Boolean(OPERATOR_WEBHOOK_RECEIVER_UPSTREAM),
          operator_webhook_receiver_path:
            OPERATOR_WEBHOOK_RECEIVER_PATH,
          agent_paid_work_edge_marker:
            AGENT_PAID_WORK_EDGE_MARKER,
          agent_paid_work_edge_configured:
            Boolean(AGENT_PAID_WORK_GATEWAY_UPSTREAM),
          agent_paid_work_submission_path:
            AGENT_PAID_WORK_SUBMISSION_PATH,
          agent_paid_work_gateway_upstream_loopback_only: true,
          agent_paid_work_generic_proxy: false,
          app_public: true,
          participant_handoff_public: true,
          public_discovery_pack_configured:
            PUBLIC_DISCOVERY_PACK.configured,
          public_discovery_pack_marker:
            PUBLIC_DISCOVERY_PACK_MARKER,
          public_discovery_pack_file_count:
            PUBLIC_DISCOVERY_PACK.fileCount,
          public_discovery_pack_routes:
            Array.from(PUBLIC_DISCOVERY_PACK.entries.keys()),
          epoch2_public_economic_read_configured:
            Boolean(EPOCH2_PUBLIC_READ_UPSTREAM),
          epoch2_public_economic_read_upstream_loopback_only: true,
          epoch2_public_economic_read_raw_rpc_proxy: false,
          epoch2_public_economic_read_routes:
            Array.from(EPOCH2_PUBLIC_READ_PATHS),
          account_views_public: false,
          mutation: false,
          generic_mutation: false,
          bounded_public_earn_claim_submit: true,
          money_movement: false,
        },
        method
      );
    }

    if (pathname === "/__void/public-app/mode.json") {
      return sendJson(
        res,
        200,
        {
          ok: true,
          marker: MARKER,
          runtime_truth_marker: RUNTIME_TRUTH_MARKER,
          public_mode: true,
          account_views_public: false,
          local_or_authorized_session_required: true,
          read_only: true,
        },
        method
      );
    }

    if (pathname === "/__void/public-app/public-mode.js") {
      return send(
        res,
        200,
        { "content-type": "text/javascript; charset=utf-8" },
        publicModeScript + "\n",
        method
      );
    }

    if (pathname === "/__void/public-app/public-node-compat.js") {
      return send(
        res,
        200,
        { "content-type": "text/javascript; charset=utf-8" },
        publicNodeCompatScript + "\n",
        method
      );
    }

    if (
      pathname === "/__void/public-app/network.json" ||
      pathname === "/public-node/local-multibox-status-v1.json" ||
      pathname === "/__void/diag/local-multibox-runtime-route-v1.json" ||
      pathname === "/public-node/smoke-pack-v1.json"
    ) {
      const snapshot = await buildSnapshot();
      return sendJson(res, 200, snapshot, method);
    }

    if (pathname === "/__void/ui/wave2/home.json") {
      const snapshot = await buildSnapshot();
      return sendJson(res, 200, toHomeSnapshot(snapshot), method);
    }

    if (pathname === "/version") {
      const snapshot = await buildSnapshot();
      return sendJson(
        res,
        200,
        {
          ok: snapshot.version.available,
          version: snapshot.version.version,
          protocol_version: snapshot.version.protocol_version,
          channel: snapshot.version.channel,
          git_commit: snapshot.version.git_commit,
          public_safe: true,
        },
        method
      );
    }

    if (pathname === "/blocks/latest/number2.json") {
      const snapshot = await buildSnapshot();
      if (!Number.isFinite(Number(snapshot.chain_head))) {
        return sendJson(
          res,
          503,
          { ok: false, error: "head_unavailable" },
          method
        );
      }
      return sendJson(
        res,
        200,
        { number: Number(snapshot.chain_head) },
        method
      );
    }

    if (pathname === "/p2p/peers") {
      const snapshot = await buildSnapshot();
      const connected = Array.from(
        { length: Math.max(0, snapshot.peer_count) },
        () => ({ state: "connected" })
      );
      return sendJson(
        res,
        200,
        {
          ok: true,
          connected,
          knownAddrs: [],
          count: snapshot.peer_count,
          sanitized: true,
          peer_ids: false,
          peer_addresses: false,
        },
        method
      );
    }

    if (
      pathname === "/app" ||
      pathname === "/app/" ||
      pathname.startsWith("/app/")
    ) {
      return await proxy(req, res, NODE_UPSTREAM, {
        injectApp: pathname === "/app" || pathname === "/app/",
      });
    }

    return await proxy(req, res, PUBLIC_UPSTREAM, {
      injectPublicNode:
        pathname === "/public-node" || pathname === "/public-node/",
    });
  } catch (error) {
    return sendJson(
      res,
      502,
      {
        ok: false,
        marker: MARKER,
        error: "composition_upstream_error",
        detail: String(error?.message || error),
      },
      req.method || "GET"
    );
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `${MARKER} host=${HOST} port=${PORT} ` +
      `public_upstream=${PUBLIC_UPSTREAM} node_upstream=${NODE_UPSTREAM} `
      + `public_discovery_pack=${PUBLIC_DISCOVERY_PACK.configured} `
      + `participant_composition_active=${PARTICIPANT_COMPOSITION_ACTIVE} `
      + `epoch2_public_read=${Boolean(EPOCH2_PUBLIC_READ_UPSTREAM)}`
  );
});
