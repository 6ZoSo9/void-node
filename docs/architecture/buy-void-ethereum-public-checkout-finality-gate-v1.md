# Buy VOID Ethereum public checkout finality gate v1

Marker: `VOID_BUY_VOID_ETHEREUM_PUBLIC_CHECKOUT_FINALITY_GATE_V1`

## Outcome

Provide one fail-closed prerequisite for the Ethereum public Buy VOID checkout
without touching the currently owned `src/index.ts` integration surface.

This module answers two separate questions:

1. **May Ethereum payment instructions be exposed?**
2. **May this exact Ethereum payment become eligible for a
   `payment_verified` transition?**

Those questions have deliberately different gates.

## Payment-instruction readiness

`readBuyVoidEthereumPublicCheckoutReadinessV1(...)` requires all of:

- `VOID_BUY_REQUESTS_ENABLED=1`;
- `VOID_BUY_ETHEREUM_REQUESTS_ENABLED=1`; and
- the existing server-controlled dual-rail source-finality policy to pass
  `readBuyVoidSourceFinalityExecutionPolicyV1(...)`.

The canonical policy loader already requires the reviewed Base + Ethereum RPC
identity, URL fingerprint inputs, canonical USDC/receive-address policy,
minimum-confirmation policy, and total timeout policy.

Configuration is still not sufficient. Payment-instruction readiness also
requires the same immutable process-source identity used by the execution
preflight (marker, commit-shaped SHA, tree-shaped SHA, and branch exactly
`main`) before any Ethereum payment instructions can become ready. This keeps
an identity-misconfigured process from accepting a payment that the later
pre-attempt bridge would necessarily HOLD.

Payment-instruction readiness and the pre-attempt bridge share one strict
classifier over the canonical V5 finality capability authority. The classifier
requires the full reviewed-success contract, not a hand-picked subset:
reviewed-source verification, authenticated transport identity, total deadline,
in-composition observation, source/deployed generation, remote-provider
identity, ancestry, quorum, production authority, read-only RPC, and every
forbidden wallet/signing/transaction/inventory/Chain-2050/presale/money
authority remaining false. A partial future promotion therefore cannot expose
Ethereum payment instructions while the later bridge would still be forced to
HOLD.

Current V5 deliberately reports:

```text
source_generation_verified_on_success=false
deployed_artifact_generation_verified=false
remote_provider_identity_verified=false
ancestry_verified=false
provider_quorum_verified=false
production_source_finality_authority_ready=false
```

Therefore current Ethereum payment instructions remain HOLD even with every RPC
environment value configured. A future source-finality generation must promote
those canonical capability facts before this readiness gate can turn GREEN.

A missing/invalid finality policy **or** non-production-ready canonical finality
capability therefore keeps Ethereum payment instructions HOLD even if the
generic and Ethereum intake toggles are both enabled.

The intake toggles are deliberately **not** re-required when verifying an
already-created payment attempt. Turning intake off must stop new instructions,
but must not strand a buyer who already sent funds. Existing-payment
reconciliation still requires the same server-controlled finality policy and the
full canonical source-finality execution preflight.

This gate does not alter Base behavior.

A GREEN result here is only a **finality prerequisite**. It does not mean the
overall checkout may open. The separate coupled-launch gate tracked by #2394
must also be composed before route integration can expose payment instructions.

## Pre-attempt payment-finality bridge

The public checkout route cannot use the execution-attempt preflight before
`payment_verified`: execution attempts are created downstream from a
fulfillment claim, and that claim itself is derived from a canonical verified
payment. Treating a public request ID as an execution-attempt ID would therefore
invent authority and create a circular dependency.

`runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1(...)` closes that
abstraction gap without writing any state. The bridge accepts a
`BuyVoidRequestV1` object but does **not** itself establish filesystem/server
provenance for that object. The later runtime composition must resolve the
request through the existing server-owned request reader/snapshot boundary by
request ID and must not forward a client-supplied request object. The bridge does
**not** accept a caller-supplied verified-payment event. After
process/policy/capability checks, it uses the canonical read-only payment
observer to fetch the exact Ethereum receipt plus latest block, rebuilds V2
internally with
`buildBuyVoidVerifiedPaymentEventV2(...)`, derives the exact
`voidpay1:ethereum:<tx_hash>:<log_index>` identity from that rebuilt event,
and then invokes
`observeBuyVoidSourceFinalityGenerationProvenanceV5(...)` directly for the
separate finalized-head authority.

A production-ready result additionally requires the same complete V5
capability classifier used by payment-instruction readiness, plus the exact
runtime observation bindings below:

- immutable process-source marker, commit, tree, and `main` branch identity,
  matching the same process-source boundary used by the execution preflight;
- source chain exactly `ethereum` and chain ID exactly `1`;
- the exact request transaction hash and canonical `voidpay1` identity;
- canonical V2 receipt/log/payment metadata built internally from the
  server-controlled latest-head observation; caller-supplied V2 event authority
  is exactly false;
- the internally rebuilt V2 event's transaction/log/block, token, payer,
  receiver, delivery and amount fields re-bound to the independently generated
  V5 finality observation;
- the V2 latest-head confirmation count comes only from the internal canonical
  rebuild, while V5 finalized-head confirmations remain a distinct clock; the
  two counts are not required to be numerically equal;
- the finalized-head count must meet the exact server-controlled Ethereum rail
  `min_confirmations` policy that was passed into the canonical V5 observer;
- freshly rebound payment-key SHA-256;
- reviewed source files;
- authenticated transport identity;
- observation generated inside the reviewed composition;
- same-provider consistency and provider consistency;
- one end-to-end total operation deadline spanning both the latest-head payment
  observation and the V5 finalized-head observation; the latest-head transport
  recomputes the remaining budget before every RPC call, each call timeout is
  capped by that remaining budget, and V5 receives only the still-remaining
  total budget;
- source generation;
- deployed artifact generation;
- remote provider identity;
- ancestry;
- provider quorum;
- `production_source_finality_authority_ready=true`; and
- no wallet/signing/transaction-construction/broadcast/inventory-mutation/
  money-movement side effects.

The production function exposes no caller-supplied observer/finality or
verified-payment-event injection dependency. Its internal latest-head transport
is constructed from the same server-controlled Ethereum rail policy and is
deadline-bound: before each RPC it refreshes the monotonic remaining budget and
sets that call's timeout to the smaller of the reviewed per-request timeout and
the remaining end-to-end budget. After the latest-head stage, only the remaining
budget is passed into V5, and the bridge rechecks the outer deadline before any
ready result. Thus the sequential latest-head and finalized-head stages cannot
each consume a fresh full `total_timeout_ms`.

It also returns the exact internally rebuilt canonical V2 event for any later
reviewed persistence composition. The function refuses
before any RPC when the current process source identity, server policy, or V5
capability is unavailable/not production-ready. Current V5 authority deliberately keeps
source/deployed generation, remote provider identity, ancestry, quorum, and
production authority false, so a correctly identified current process still
returns HOLD **before making RPC calls**.

The test-only classifier can exercise a synthetic future-ready observation, but
it always returns `production_transition_authority=false` and cannot mint the
production bridge result.

## Payment verification / inventory readiness

`runBuyVoidEthereumPublicCheckoutPaymentFinalityV1(...)` never accepts a
caller-provided finality decision or observer dependency.

It invokes the existing
`runBuyVoidSourceFinalityExecutionPreflightV1(...)` directly.

The result is transition-ready only when that canonical preflight proves, for
the exact persisted attempt:

- source chain is exactly `ethereum`;
- reviewed source files are verified;
- authenticated transport identity is verified;
- the total operation deadline is verified;
- source generation is verified;
- deployed artifact generation is verified;
- ancestry is verified;
- provider quorum is verified;
- `production_source_finality_authority_ready=true`;
- canonical payment identity and payment-key binding revalidate; and
- wallet/signing/broadcast/money-movement side effects remain false.

Only then does this helper return:

```text
status=ethereum_payment_source_finality_gate_ready
payment_verified_finality_gate_ready=true
inventory_reservation_authorized=false
coupled_launch_gate_composed=false
overall_checkout_activation_authorized=false
```

The helper itself does **not** write either event or inventory state. It never
reports inventory-reservation readiness; `inventory_reservation_authorized=false`
remains explicit even when payment finality is GREEN. The separate coupled-launch
gate must authorize any later `payment_verified` write / reservation transition.

A receipt/log match by itself cannot produce this status.

## Test-only surface

The focused proof needs to exercise rejection of forged finality results without
granting production callers an injectable finality dependency.

`testOnlyClassifyBuyVoidEthereumPublicCheckoutFinalityV1(...)` therefore
returns a distinct test-only marker and always reports:

```text
production_transition_authority=false
payment_verified_event_write_performed=false
inventory_reservation_write_performed=false
```

It can prove whether a synthetic object *would* satisfy the strict structural
checks, but cannot mint the production gate marker/status.

## Deferred runtime integration

The old `src/index.ts` ownership collision is gone, but runtime wiring must not
skip the newly exposed pre-attempt boundary.

A later integration step must:

- require `readBuyVoidEthereumPublicCheckoutReadinessV1(...)` before returning
  any new Ethereum payment instructions;
- resolve the exact request ID through the existing server-owned request
  reader/snapshot boundary and pass only that server-derived request into
  `runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1(...)`; client request
  objects are not authoritative; if it becomes ready, any later
  `payment_verified` persistence must use its returned
  `canonical_verified_payment_event`, not caller-supplied payment evidence;
- keep the execution-attempt
  `runBuyVoidEthereumPublicCheckoutPaymentFinalityV1(...)` check for later
  attempt-bound fulfillment/execution authority;
- keep reorg/stale/non-finalized outcomes unreserved;
- expose the same Ethereum HOLD/readiness state through config/API/browser and
  legacy participant copy; and
- preserve Base behavior.

Until that runtime composition lands, Ethereum public intake remains HOLD.

## Authority boundary

This module may cause read-only RPC activity through the canonical payment
observer and V5 request-level finality composition or, after an execution attempt
exists, through the existing canonical source-finality execution preflight.
Current pre-attempt production authority is false, so the bridge fails before
either production RPC observation.

It does not:

- mutate runtime configuration;
- activate request intake;
- create a purchase request;
- write `payment_verified`;
- reserve inventory;
- access a wallet, signer, or private key;
- construct, sign, submit, or broadcast a transaction;
- mutate Chain-2050 or the WC ledger;
- activate presale or WC/VOID;
- move token inventory, liquidity, treasury assets, or funds.
