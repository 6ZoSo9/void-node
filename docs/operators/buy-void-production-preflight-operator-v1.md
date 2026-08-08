# Buy VOID production preflight operator v1

Marker:

`VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1`

Tracks blocker #1115 and depends on merged PR #1109.

## Purpose

Provide the missing operator entrypoint above the merged production live-canary
preflight without bypassing its production-plan and deterministic preflight-plan
bindings.

The existing native-execution HTTP route remains useful for its own bounded
runtime contract, but it is **not** the production canary-preflight entrypoint.
This lane invokes `runBuyVoidProductionLiveCanaryPreflightV1(...)` directly from
server-owned configuration so a production inspection cannot substitute an
unbound direct native-runtime request.

## One native-runtime policy source

The existing environment-derived policy parser in
`buy_void_native_execution_runtime_v1.ts` is exported as
`buyVoidNativeExecutionRuntimePolicyStateV1()`.

The existing status/command route continues to use that same function. The new
operator resolver imports it rather than duplicating its environment parsing.

The canonical native runtime policy therefore remains authoritative for:

- runtime root;
- inventory pool ID;
- dedicated fulfillment wallet;
- chain ID 2050;
- loopback Chain-2050 RPC URL;
- native amount cap;
- gas limit and gas cap;
- max fee and priority-fee caps;
- fee multiplier;
- exactly one execution attempt per payment; and
- exactly one fulfillment-wallet allowlist entry.

The native execution runtime must remain disabled for this preflight lane.

## Explicit private-service path configuration

The production private-service paths were not previously pinned. This lane does
not copy synthetic proof paths into production and provides no path defaults.

All five server-owned values are required explicitly:

```text
VOID_BUY_VOID_PRODUCTION_CUSTODIAN_SOCKET_PATH
VOID_BUY_VOID_PRODUCTION_CUSTODY_STORE_DIR
VOID_BUY_VOID_PRODUCTION_BROADCASTER_SOCKET_PATH
VOID_BUY_VOID_PRODUCTION_BROADCASTER_STATE_DIR
VOID_BUY_VOID_PRODUCTION_CREDENTIALS_DIRECTORY
```

They must be distinct absolute non-root paths, except that the custody-store
path is intentionally shared by the custodian and broadcaster inside the
production activation policy.

The fulfillment wallet and RPC URL are not accepted from these new variables or
from CLI arguments. They come from the existing native runtime policy.

The expected prepared-transaction signer fingerprint is derived internally from
the server-owned fulfillment wallet by the existing
`buyVoidPreparedTransactionCredentialSignerFingerprintV1(...)` function. There
is no caller-supplied signer fingerprint.

Resolving this policy is synchronous and performs no filesystem read, journal
read, credential read, RPC call, service start, signing, broadcast, or money
movement.

## Planning mode

The CLI is:

```bash
npx tsx scripts/buy_void_production_preflight_operator_v1.ts \
  --attempt-id <exact-lowercase-64-hex-attempt-id>
```

Planning is the default. It requires one explicit attempt ID but does not look up
that attempt yet. It derives and returns the exact production activation-plan ID
and deterministic preflight-plan ID while performing zero journal and RPC I/O.

The CLI exposes no argument for wallet, RPC URL, runtime root, fee policy,
signer fingerprint, credential directory, or private-service paths.

## Read-only inspection gate

A later real inspection requires all three exact operator echoes:

```text
--inspect
--confirm buyVoidInspectProductionLiveCanaryPreflightV1
--expected-production-activation-plan-id-sha256 <exact planning result>
--expected-preflight-plan-id-sha256 <exact planning result>
```

The inspection path delegates only to the merged #1109 preflight. The preflight
then reconstructs the selected server-owned journals and may perform the
existing read-only Chain-2050 nonce/fee/balance planning.

The native execution command remains:

```text
apply=false
```

No signer or broadcaster dependency is supplied by this operator lane.

## Candidate boundary

This operator does not create, reserve, clone, reset, or repair an execution
attempt.

A real inspection can succeed only for an already-existing clean attempt
accepted by the merged native-runtime reconstruction boundary. That boundary
accepts only `reserved` or `prepared` attempts and rejects attempts with
broadcast, failure, post-broadcast failure, or confirmation state.

Historical completed deliveries and synthetic canary fixtures are therefore not
production candidates merely because their attempt IDs are known.

Creating or reserving a fresh clean candidate remains a separate operational
authorization.

## Proof

```bash
npx tsx scripts/prove_buy_void_production_preflight_operator_v1.ts
```

The focused proof verifies:

- the native runtime route and operator resolver use one exported policy parser;
- planning performs zero journal and RPC calls;
- missing private path configuration fails closed;
- no synthetic private path is a default;
- an enabled native runtime fails closed;
- wallet and RPC values come from the canonical native runtime policy;
- signer fingerprint is derived internally;
- unexpected caller policy inputs are rejected before policy resolution;
- the CLI has no wallet/RPC/root/fee/signer/private-path override flags;
- wrong confirmation, wrong production-plan ID, and wrong preflight-plan ID cause
  zero native runtime calls;
- exact inspection invokes the native runtime exactly once with `apply=false`;
- no signer/broadcaster dependency is supplied; and
- mutation, signing, broadcast, and money-movement flags remain false.

Hosted CI runs the focused proof on Node.js 22, 24, and 26 and preserves the
merged #1109 preflight, #1106 private-services activation, native-execution
runtime, synthetic end-to-end rehearsal, repository typecheck/build, and diff
hygiene.

## Authority boundary

Publication, review, or merge of this source lane performs no production I/O.

It does not:

- reserve or create a production execution attempt;
- read production journals;
- call production RPC;
- start the custodian or broadcaster;
- read the fulfillment credential;
- sign a transaction;
- submit or broadcast a transaction;
- mutate inventory;
- emit a public fulfilled closeout;
- deploy or restart a service; or
- move funds.

A fresh candidate reservation, a real `--inspect` invocation, private-service
activation, and any value-bearing live canary remain separate explicit
operational authorization gates.
