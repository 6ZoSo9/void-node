# Buy VOID automatic claim worker v1

## Purpose

This lane removes the manual receipt-fetch step from the bounded Buy VOID path.
For one existing request in `payment_submitted_pending_manual_review`, the
worker can use a server-controlled read-only Base or Ethereum JSON-RPC endpoint
to observe the request's already-bound payment transaction, verify the exact
USDC transfer with the existing verifier, apply the existing fulfillment
admission policy, and create the existing duplicate-safe fulfillment claim.

This is a source-only component. It is disabled by default. It processes one request per invocation, performs a dry run unless `apply: true` is supplied,
and requires the exact confirmation `buyVoidAutoClaimPayment` before the claim
journal can be written.

## Authority boundary

The RPC observer permits only:

- `eth_chainId`
- `eth_getTransactionReceipt`
- `eth_blockNumber`

The RPC URL is supplied by server policy. HTTPS is required except for a
loopback HTTP endpoint. URL credentials and fragments are rejected. The worker
returns only a SHA-256 fingerprint of the RPC URL and does not return the URL.

The worker may read the existing fulfillment claim journal. On an applied,
confirmed invocation, it may create one claim through the existing crash-safe
journal. It does not write the Buy VOID request journal. It does not reserve aggregate inventory, does not decrement inventory, does not access a wallet,
does not sign or broadcast a transaction, and does not deliver VOID.

It mounts no route, starts no background loop, changes no service, and performs
no work at process startup. A later runtime lane must explicitly select a
request, supply server policy, and invoke this module.

## Required policies

The caller supplies:

- a worker policy with `enabled: true`, the exact accepted request status, and a
  maximum VOID amount in six-decimal units;
- a payment observer policy with the source chain, expected chain ID, and
  server-controlled RPC URL;
- the existing verified-payment policy;
- the existing automatic-fulfillment policy, including confirmation depth,
  USDC and receiver allowlists, deterministic rate, and bounded remaining pool
  value.

A request over the worker amount cap, on the wrong status, without a bound
transaction hash, on the wrong chain, without a final receipt, or outside any
existing payment or fulfillment policy is held without mutation.

## Result boundary

A dry run returns the observed receipt, verified payment event, unsigned
fulfillment admission, and required confirmation. It writes nothing.

An applied invocation returns either a new claim or an idempotent duplicate. It
also returns a proposed request-state patch containing the canonical payment
identity and instruction ID. The caller must handle any later request-journal
transition in a separate guarded lane.

The state patch explicitly records that automatic delivery has not started,
signing was not performed, and no transaction was broadcast.

## Next revenue step

After this source lane is merged, the next bounded step is an aggregate
inventory reservation and execution-planning coordinator. Only after those
walls are exact green should a disabled-by-default runtime select pending
requests and connect the existing native signer/broadcaster dependencies.
