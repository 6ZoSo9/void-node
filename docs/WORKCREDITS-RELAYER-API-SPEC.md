# Work Credits Relayer API Spec (V1)

This document defines the HTTP/JSON API between:

- Obelisk Wallet (or any client using WC-funded meta-txs), and
- A relayer service that:
  - Quotes WC fees using LLP + WorkCreditsQuoteLib / WorkCreditsRelayerQuoteHelper.
  - Submits signed RelayedCall payloads to WorkCreditsRelayerV1 on-chain.

On-chain protocol is defined in `WORKCREDITS-RELAYER-SPEC.md`. This file is about the off-chain HTTP surface.

---

## 0. Versioning

- API version: `v1`
- Base path (suggested): `/api/wc-relayer/v1`
- All responses are JSON.
- Errors use a stable `"code"` string plus `"message"`.

The relayer service is stateless per request; any persistence (logs, metrics) is internal.

---

## 1. Core objects

### 1.1 RelayedCallPayload

This mirrors the Solidity `RelayedCall` struct from the spec, with JSON-friendly types:

- `user` (string, hex address)
- `to` (string, hex address)
- `data` (string, hex bytes 0x…)
- `value` (string, uint256 decimal, usually "0")
- `nonce` (string, uint256 decimal)
- `maxWCFee` (string, uint256 decimal)
- `deadline` (string, unix timestamp as decimal string)

Example:

    {
      "user": "0xUserAddress",
      "to": "0xTargetContract",
      "data": "0xEncodedCalldata",
      "value": "0",
      "nonce": "3",
      "maxWCFee": "1000000000000000000000",
      "deadline": "1800000000"
    }

### 1.2 QuoteParams

Inputs that a client can pass to get a WC fee quote:

- `user` (string, hex address)
- `to` (string, hex address)
- `data` (string, hex bytes)
- `value` (string, uint256 decimal, usually "0")
- `gasLimitHint` (optional string) – client’s estimated gas limit for the inner call.
- `maxSlippageBps` (optional string) – e.g. "50" for 0.50%; default decided by relayer.
- `intent` (string) – free-form label: `"SEND_VOID"`, `"SEND_WC"`, `"COLLECT_WC"`, `"NFT_MINT"`, etc.

Example:

    {
      "user": "0xUserAddress",
      "to": "0xTargetContract",
      "data": "0xEncodedCalldata",
      "value": "0",
      "gasLimitHint": "120000",
      "maxSlippageBps": "50",
      "intent": "SEND_VOID"
    }

### 1.3 QuoteResult

Returned by quote endpoints:

- `voidNeeded` (string, uint256 decimal) – VOID required to execute.
- `wcFee` (string, uint256 decimal) – WC that covers voidNeeded + margin + slippage.
- `gasEstimate` (string, uint256 decimal) – effective gas used for inner + wrapper.
- `gasPrice` (string, uint256 decimal) – gas price assumed by the relayer (in VOID per gas).
- `marginBps` (string, uint256 decimal) – relayer’s fee margin in basis points.
- `expiresAt` (string, unix timestamp) – when this quote should be considered stale.
- `llpSnapshot` (object, optional) – high-level LLP info (for UI only, not relied on by protocol):
  - `reserveVOID` (string, uint256)
  - `reserveWC` (string, uint256)
  - `feeBps` (string, uint256)

Example:

    {
      "voidNeeded": "123456789000000000",
      "wcFee": "234567890000000000000",
      "gasEstimate": "150000",
      "gasPrice": "20000000000",
      "marginBps": "50",
      "expiresAt": "1800000300",
      "llpSnapshot": {
        "reserveVOID": "10000000000000000000000000",
        "reserveWC": "800000000000000000000000000",
        "feeBps": "30"
      }
    }

### 1.4 SubmissionResult

Returned by submission endpoint:

- `txHash` (string, hex) – on-chain tx hash.
- `status` (string) – `"PENDING"`, `"MINED"`, or `"UNKNOWN"`.
- `wcFeeCharged` (string, uint256) – actual WC fee used on-chain.
- `voidSpent` (string, uint256) – VOID cost the relayer actually paid (optional, informational).
- `blockNumber` (string, uint256, optional) – if known.

Example:

    {
      "txHash": "0xDeadBeef...",
      "status": "PENDING",
      "wcFeeCharged": "234567890000000000000",
      "voidSpent": "123456789000000000",
      "blockNumber": null
    }

---

## 2. Errors

Common error payload:

    {
      "error": {
        "code": "SOME_CODE",
        "message": "Human-readable explanation",
        "details": { "optional": "data" }
      }
    }

Example error codes:

- `INVALID_REQUEST`
- `DEADLINE_TOO_SOON`
- `QUOTE_EXCEEDS_MAX_WCFEE`
- `NONCE_MISMATCH`
- `SIGNATURE_INVALID`
- `CHAIN_UNHEALTHY`
- `POOL_INSUFFICIENT_LIQUIDITY`
- `INTERNAL_ERROR`

---

## 3. Endpoints

Base path (suggested):

- `http://<relayer-host>/api/wc-relayer/v1`

### 3.1 GET /status

Health + config probe for UI and monitoring.

Request:

- Method: `GET`
- Path: `/status`
- Query: none

Response 200:

    {
      "ok": true,
      "chainId": 2050,
      "relayerContract": "0xRelayerContractAddress",
      "version": "1",
      "uptimeSeconds": 12345,
      "llp": {
        "address": "0xLlpAddress",
        "reserveVOID": "10000000000000000000000000",
        "reserveWC": "800000000000000000000000000"
      }
    }

If unhealthy (e.g. can’t reach node or LLP), `ok` can be `false` with an error object.

### 3.2 POST /quote

Compute WC fee for a proposed call without requiring a signature yet.

Request:

- Method: `POST`
- Path: `/quote`
- Body: `QuoteParams` JSON

Response 200:

- Body: `QuoteResult` object.

Example:

    POST /api/wc-relayer/v1/quote
    {
      "user": "0xUserAddress",
      "to": "0xTargetContract",
      "data": "0xEncodedCalldata",
      "value": "0",
      "gasLimitHint": "120000",
      "maxSlippageBps": "50",
      "intent": "SEND_VOID"
    }

Response:

    {
      "voidNeeded": "123456789000000000",
      "wcFee": "234567890000000000000",
      "gasEstimate": "150000",
      "gasPrice": "20000000000",
      "marginBps": "50",
      "expiresAt": "1800000300",
      "llpSnapshot": {
        "reserveVOID": "10000000000000000000000000",
        "reserveWC": "800000000000000000000000000",
        "feeBps": "30"
      }
    }

If the quote cannot be satisfied (e.g. too much of pool, slippage, etc.), use an error code such as:

    {
      "error": {
        "code": "POOL_INSUFFICIENT_LIQUIDITY",
        "message": "Cannot fulfill this request without exceeding configured pool usage."
      }
    }

### 3.3 POST /build-relayed-call (optional helper)

Helper for Obelisk so it doesn’t have to fully encode calldata itself (we can decide later whether to use this, but spec is here).

Request:

    {
      "user": "0xUserAddress",
      "action": "SEND_VOID", // or SEND_WC, COLLECT_WC, NFT_MINT, etc.
      "params": {
        // action-specific fields, e.g. for SEND_VOID:
        "recipient": "0xRecipient",
        "amount": "5000000000000000000"
      },
      "maxWCFee": "234567890000000000000",
      "deadline": "1800000000"
    }

Response:

    {
      "relayedCall": { ...RelayedCallPayload... }
    }

This endpoint is entirely optional; it just standardizes how we’d build and return a `RelayedCallPayload` if we want the relayer service to do ABI encoding.

### 3.4 POST /submit

Submit a signed `RelayedCall` to be executed via `WorkCreditsRelayerV1`.

Request:

- Method: `POST`
- Path: `/submit`
- Body:

      {
        "relayedCall": { ...RelayedCallPayload... },
        "signature": "0xSignatureHex",
        "wcFee": "234567890000000000000",     // WC fee chosen by relayer based on quote
        "clientMetadata": { "optional": "fields" } // optional
      }

The `wcFee` must be:

- The value the relayer intends to pass into `executeRelayedCall(c, sig, wcFee)`.
- Less than or equal to `relayedCall.maxWCFee`, or the on-chain relayer will revert.

Response 200:

- Body: `SubmissionResult`.

Example:

    {
      "txHash": "0xDeadBeef...",
      "status": "PENDING",
      "wcFeeCharged": "234567890000000000000",
      "voidSpent": "123456789000000000",
      "blockNumber": null
    }

Common error cases:

- Signature invalid: `SIGNATURE_INVALID`
- maxWCFee too low for current quote: `QUOTE_EXCEEDS_MAX_WCFEE`
- Node/chain unavailable: `CHAIN_UNHEALTHY`
- Target call reverted: `TARGET_REVERTED`

---

## 4. Minimal Obelisk flow summary

For any WC-funded action:

1. Build target intent (send VOID/WC, collect WC, NFT action).
2. Call `/quote` with user, to, data (or `/build-relayed-call` then `/quote`).
3. Show `wcFee` and quote info to user; user sets/accepts `maxWCFee`.
4. Build `RelayedCall` message with:
   - nonce from on-chain `nonces[user]`.
   - maxWCFee >= quoted wcFee (plus any user cushion).
   - deadline a few minutes in the future.
5. Sign typed data per `WORKCREDITS-RELAYER-SPEC.md`.
6. Call `/submit` with `relayedCall`, `signature`, and chosen `wcFee`.
7. Poll wallet node or chain RPC for `txHash` status.

This API spec keeps Obelisk dumb about LLP internals while staying compatible with the on-chain WorkCreditsRelayerV1 and quote math we’ve already implemented.

