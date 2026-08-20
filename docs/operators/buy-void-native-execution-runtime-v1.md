# Buy VOID Native Execution Runtime V1

## Purpose

This lane connects the merged Buy VOID revenue pipeline to a final
disabled-by-default operator runtime boundary.

It does not activate automatic customer delivery. It makes the last pre-canary
source connection explicit and testable:

1. select exactly one existing execution attempt by server journal ID;
2. reconstruct the fulfillment intent, aggregate inventory reservation, and
   bounded execution plan from server-owned journals;
3. read the chain-2050 pending nonce, gas price, and fulfillment-wallet balance
   through a server-controlled loopback JSON-RPC URL;
4. build a bounded type-2 native VOID transfer plan;
5. dry-run while execution remains disabled, without credentials, signing,
   journal mutation, or broadcast;
6. on a later explicitly confirmed applied call, use only the already existing
   injected systemd-credential signer and loopback chain-2050 broadcaster;
7. let the merged native execution worker apply the durable submission guard
   and record accepted, unknown, or definitive-not-broadcast outcomes.

## Files

- `src/economic/buy_void_native_execution_nonce_fee_planner_v1.ts`
- `src/economic/buy_void_native_execution_runtime_v1.ts`
- `src/economic/buy_void_runtime_integration_v1.ts`
- `scripts/prove_buy_void_native_execution_nonce_fee_planner_v1.ts`
- `scripts/prove_buy_void_native_execution_runtime_v1.ts`
- `scripts/prove_buy_void_native_execution_runtime_guard_v1.ts`
- `ops/systemd/void-node-live.service.d/81-buy-void-native-execution-runtime-v1.conf.example`
- `.github/workflows/buy-void-native-execution-runtime-v1.yml`

## Runtime routes

Loopback operator routes:

- `GET /__void/operator/buy-void-native-execution-v1/status`
- `POST /__void/operator/buy-void-native-execution-v1/command`

The command body accepts only:

```json
{
  "attempt_id": "<64 lowercase hex characters>",
  "apply": false,
  "confirmation": "",
  "submission_idempotency_key": ""
}
```

The client cannot provide:

- root directory;
- policy;
- RPC URL;
- wallet or signer;
- private key or mnemonic;
- raw transaction;
- unsigned transaction plan;
- fulfillment intent;
- inventory reservation;
- bounded execution plan;
- dependencies.

## Disabled deployment posture

The runtime is disabled unless:

```text
VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED=1
```

The existing systemd credential signer/broadcaster injector remains separately
disabled unless:

```text
VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED=1
```

The example systemd drop-in leaves both values at `0`.

When the runtime is disabled, an `apply=true` command returns before journal
reads, RPC calls, credential access, signing, or broadcast. An `apply=false`
dry-run remains available so an operator can verify one exact candidate's
journal bindings, pending nonce, fee bounds, and fulfillment-wallet balance
without first enabling money movement. The dry-run cannot receive dependencies,
read the credential, sign, broadcast, mutate a journal, or move funds.

For an applied command, the exact confirmation is checked before journal reads,
RPC calls, or dependency use:

```text
buyVoidNativeExecuteReservedPlan
```

Applied execution also requires the existing injected signer and broadcaster
before any journal or RPC work begins.

## Read-only nonce and fee planning

The planner permits only four JSON-RPC methods:

- `eth_chainId`
- `eth_getTransactionCount` with block tag `pending`
- `eth_gasPrice`
- `eth_getBalance` with block tag `latest`

The RPC URL is server controlled and must be loopback HTTP. Redirects, proxies,
credentials in URLs, non-loopback hosts, and arbitrary methods are rejected.

The type-2 transaction fee plan is:

```text
computed max fee = ceil(observed gas price × fee multiplier bps / 10,000)
```

The planner holds when:

- the observed chain is not 2050;
- pending nonce or fee responses are malformed;
- the computed max fee exceeds the server cap;
- priority fee exceeds computed max fee;
- gas limit exceeds its cap;
- wallet balance cannot cover the VOID value plus maximum gas cost.

The raw RPC URL is not returned. Only its SHA-256 fingerprint is exposed.

## Server journal reconstruction

The operator supplies only one execution-attempt ID.

The runtime reads:

- the existing execution-attempt journal;
- the existing fulfillment-claim journal;
- the existing inventory-reservation journal.

It requires exactly one claim and exactly one reservation bound to the attempt's
canonical payment identity, request ID, and instruction ID.

The bounded execution plan is reconstructed deterministically from:

```text
sha256(
  "void-buy-bounded-execution-plan-v1\n" +
  inventory_reservation_id + "\n" +
  execution_attempt_id
)
```

The runtime accepts only clean `reserved` or `prepared` attempts. Broadcast,
failed, post-broadcast-failed, or confirmed attempts are held.

## Authority boundary

This lane has source capability to perform money movement only after a future
operator explicitly:

1. installs a dedicated balance-capped fulfillment credential outside the repo;
2. configures the server-owned policy and loopback RPC URL;
3. enables the existing dependency injector;
4. enables this runtime;
5. selects one exact attempt;
6. supplies `apply=true`;
7. supplies the exact confirmation and idempotency key.

This lane itself:

- never embeds or creates a production private key;
- never reads a credential while disabled;
- never performs startup execution;
- never starts a background loop;
- never retries automatically;
- never waits for a receipt;
- never persists or returns the raw signed transaction;
- never decrements or releases inventory;
- never writes the public Buy VOID request journal;
- never changes a service or Tailscale;
- never accesses another machine or Nimo.

## Remaining work before a live customer path

After this lane is merged:

1. deploy the merged source on Precision with the runtime and dependency
   injector still disabled;
2. prove loopback status, route containment, and zero wallet/chain mutation;
3. configure a dedicated balance-capped fulfillment wallet credential and
   bounded server policy;
4. execute a separately reviewed dry-run while execution remains disabled
   against one synthetic reserved request;
5. execute one separately confirmed live canary;
6. add receipt confirmation, inventory decrement, and public request-state
   closeout before broad automatic customer fulfillment is enabled.
