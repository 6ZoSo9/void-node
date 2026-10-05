# Coupled native-gas reconciliation evidence resolver v1

Marker: `VOID_COUPLED_NATIVE_GAS_RECONCILIATION_EVIDENCE_RESOLVER_V1_GREEN`

## Purpose

Resolve one existing open **presale** native-gas liability into fresh,
content-addressed reconciliation evidence without publishing a reconciliation
record or releasing any reserved native-gas capacity.

This is the read-only gate after the reconciliation namespace added by #2490.
It deliberately stops before the durable writer.

## Exact authority lineage

The resolver follows the objects already bound by the native-gas classifiers:

1. one exact `CoupledNativeGasLiabilityRecordV1`;
2. one exact `BuyVoidPreparedTransactionPlanReservationV1` from
   `buy_void_prepared_transaction_plan_reservation_v1.ts`;
3. the plan's exact `attempt_id`;
4. the complete durable execution-attempt state;
5. the complete durable broadcast-outcome state;
6. fresh numeric-loopback Chain-2050 receipt/head observation;
7. `classifyCoupledNativeGasTerminalCostEvidenceV1(...)`;
8. `classifyCoupledNativeGasLiabilityReconciliationV1(...)`.

The payment-keyed plan namespace is not substituted for this lineage. The
liability and terminal-cost classifiers both bind the prepared-transaction plan
schema.

## Local state resolution

The liability must be:

- `lane=presale`;
- `source_evidence_kind=buy_void_prepared_plan_v1`;
- current V1 `attempt_limit=1`;
- `status=open`;
- bound to its transaction-plan fingerprint.

The prepared-plan namespace is derived from the liability payer:

`sha256("void-buy-wallet-v1\n2050\n" + payer_address)`

The resolver uses the existing read-only prepared-plan parser and requires
exactly one reservation whose `reservation_id` equals the liability
`obligation_id`. Payer, wallet key, nonce, native value, gas limit, admitted
max fee, plan fingerprint, and source-evidence ID must all agree.

The plan supplies the only accepted `attempt_id`. The resolver reads the
existing execution-attempt and broadcast-outcome journals and requires their
whole reconstructed attempt state to agree. Only a terminal `confirmed` or
`reverted` broadcast outcome proceeds to fresh receipt observation.

## Descriptor-bound snapshot

Before any RPC call, the resolver snapshots through `O_NOFOLLOW` descriptors:

- the prepared-plan nonce directory;
- the exact execution-attempt directory;
- the exact broadcast-outcome directory.

Directories and files must be private, direct, current-user-owned objects.
Unexpected filenames, symlinks, hard links, replacement, size drift, metadata
drift, or content drift fail closed.

The existing journal readers are pathname-oriented, so a stable before/after
directory digest is not sufficient by itself. Before RPC the resolver also
reserializes the parsed prepared-plan, execution-attempt, and broadcast-outcome
records in their durable pretty-JSON form and requires exact byte-length and
SHA-256 agreement with the descriptor-read snapshot entries. A swap-and-restore
that makes a pathname reader observe different JSON therefore HOLDs even if the
original directory is restored before the later snapshot.

After the RPC observation completes, all three snapshots are taken again.
Any change causes
`reconciliation_evidence_local_state_changed_during_resolution`.

Reader-to-snapshot binding plus the post-RPC snapshot equality tie the
read-only packet to one exact stable local evidence image. A future durable
writer must independently revalidate the same provenance at its own publication
boundary; this resolver grants no publication authority.

## RPC boundary

The production resolver always constructs its own HTTP transport from the
validated policy. Callers cannot inject or override the transport, so the
packet's RPC URL fingerprint cannot describe one loopback endpoint while the
resolver actually consumes evidence supplied by another transport.

The RPC policy is restricted to canonical numeric-loopback HTTP:

- `127.0.0.1` or `[::1]` only;
- no hostname aliases such as `localhost`;
- no credentials or URL fragment;
- bounded request timeout and response bytes;
- exactly these read methods:
  - `eth_chainId`;
  - `eth_getTransactionReceipt`;
  - `eth_blockNumber`.

The observed chain ID must be exactly 2050. The existing terminal-cost
classifier remains responsible for exact terminal transaction identity,
receipt block/hash/status/from/to, gas-used equality/ceiling, effective gas
price ceiling, current-block consistency, confirmation depth, native-value
consumption, and the reserved-envelope ceiling.

## Result

A confirmed terminal outcome that survives both existing pure classifiers
returns one content-addressed
`void_coupled_native_gas_reconciliation_evidence_packet_v1`.

A reverted outcome may produce valid terminal-cost evidence, but current V1
reconciliation policy still HOLDs it with
`coupled_native_gas_reconciliation_reverted_disposition_unresolved`.
No reserve is released.

## Authority boundary

Always false in this lane:

- reconciliation record publication;
- filesystem write;
- liability release/delete/mutation;
- retry execution;
- wallet/private-key/signer access;
- signing;
- transaction construction/broadcast;
- RPC write;
- Chain-2050 mutation;
- activation;
- inventory, treasury, or liquidity movement;
- funds movement.

The proof writes only temporary fixture state needed to exercise the existing
journal readers. Its RPC fixture is a real ephemeral numeric-loopback HTTP
JSON-RPC server; it does not bypass production transport construction.
Production resolver behavior is read-only.

## Verification

```bash
npx tsx scripts/prove_coupled_native_gas_reconciliation_evidence_resolver_v1.ts
npx tsx scripts/prove_coupled_native_gas_terminal_cost_evidence_v1.ts
npx tsx scripts/prove_coupled_native_gas_liability_reconciliation_v1.ts
npm run typecheck
npm run build
git diff --check
```
