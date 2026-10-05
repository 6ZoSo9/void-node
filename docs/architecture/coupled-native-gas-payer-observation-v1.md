# Coupled native-gas payer observation v1

Marker:

`VOID_COUPLED_NATIVE_GAS_PAYER_OBSERVER_V1`

## Purpose

This source capability closes the live-read side of the payer observation
required by the coupled native-gas liability classifier. It does not admit,
persist, reconcile, release, schedule, sign, broadcast, or spend anything.

The observer deliberately reuses two existing authorities:

1. the hardened loopback HTTP transport exported by
   `buy_void_native_execution_nonce_fee_planner_v1.ts`; and
2. the content-addressed `CoupledNativeGasPayerObservationV1` packet built by
   `buildCoupledNativeGasPayerObservationV1(...)`.

It does not create a second RPC client or a second payer-observation schema.

## Read set

The exact RPC sequence is:

```text
eth_chainId
eth_gasPrice
eth_getBalance(payer, "pending")
```

The observer never calls `eth_getTransactionCount`. Nonce observation and the
cross-lane nonce scheduler remain separate reviewed gates.

The RPC URL must use a numeric loopback HTTP literal—`127.0.0.1` or
`[::1]`—and is expected to come from server-controlled policy. Hostnames such
as `localhost` are rejected so hosts-file or DNS changes cannot widen the RPC
authority. Chain ID must equal `2050`.

## Fee requirement

The required maximum fee per gas uses the same ceiling calculation as the
existing Buy VOID native planner:

```text
required_max_fee_per_gas =
  ceil(observed_gas_price * fee_multiplier_bps / 10_000)
```

`fee_multiplier_bps` is limited to `10_000..50_000`. The result must not
exceed the server policy's `max_fee_per_gas_wei`.

This is an observation requirement used by later gas-liability admission. It is
not a fee payment and does not reserve or spend gas.

## Freshness

The observer takes a clock provider, records a start time, performs the exact
three RPC reads, then records the observation time. The elapsed observation
window must fit `max_observation_duration_ms`. The emitted packet expires after
the bounded `observation_ttl_ms`.

The source authority intentionally reports
`trusted_time_source_proven=false`. A later runtime composition must bind the
clock source and runtime policy before these timestamps may be treated as
production freshness authority.

The source identity content-addresses:

- normalized loopback RPC URL fingerprint;
- exact RPC method set;
- Chain-2050 identity;
- pending-state tag;
- fee multiplier and fee cap;
- TTL and maximum observation duration; and
- transport response/time bounds.

The payer, observed balance, required fee, timestamps, and source identity are
then bound by the existing `observation_sha256`.

## Fail-closed conditions

The observer HOLDS on:

- malformed or non-loopback RPC URL;
- wrong expected chain policy;
- invalid payer address;
- invalid fee multiplier/cap or transport/freshness bounds;
- RPC transport failure/exception;
- wrong or malformed chain ID;
- malformed or zero gas price;
- required fee above the policy cap;
- malformed pending balance;
- invalid/regressing clock values;
- observation duration above policy; or
- timestamp/expiry overflow.

## Authority boundary

This lane permits read-only Chain-2050 RPC observation when explicitly invoked.
It grants no:

- filesystem mutation;
- nonce observation or allocation;
- cross-lane scheduling;
- trusted-time qualification;
- runtime route/mount;
- wallet/private-key/signer access;
- transaction construction/signing/broadcast;
- Chain-2050 write;
- native-gas spend;
- inventory movement;
- presale/market activation;
- treasury/liquidity action; or
- funds movement.

A later runtime composition must combine this observation with the durable
payer-scoped liability census under the reviewed gas-liability serialization
domain. The current source does not itself make #2460 production-ready.

## Focused proof

```bash
npx tsx scripts/prove_coupled_native_gas_payer_observation_v1.ts
npm run build
git diff --check
```

The proof covers exact method order, pending-balance params, content-address
rebuild, source-identity change, wrong chain, fee-cap excess, malformed balance,
transport failure/exception, time regression, overlong observation, expiry
overflow, and explicit no-nonce/no-mutation authority.
