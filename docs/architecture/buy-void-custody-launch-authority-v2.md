# Buy VOID custody launch authority V2 — source-only classifier

## Purpose

Draft #2680 proves a real cross-UID boundary in the current Buy VOID launch
authority: the public-node process and the protected allocation-custody service
derive their external launch-generation anchor from each process's own
`os.userInfo().homedir`. Sharing `DATA_DIR` or overriding `HOME` therefore
cannot establish that two different Linux identities are observing the same
external anti-rollback anchor.

This V2 source candidate does **not** weaken that boundary and does not copy the
public-node home into the custody account. Instead it stages a custody-side,
path-independent authority classifier built from three independently useful
facts:

1. the shared coupled-launch generation journal validates as one exact hash
   chain ending in an active generation;
2. the live activation receipt is dual-signed by the reviewed activation
   controller and Sovereign cosigner and binds that exact generation and journal
   tip;
3. a custody-private high-water record proves the shared journal has not rolled
   back or forked relative to the last generation previously accepted by the
   custody domain, including an exact SHA-256 binding to the raw historical
   journal prefix bytes.

The operator-home external anchor remains authoritative for the existing public
launch gate. This candidate gives the **custody UID its own anti-rollback
memory**, rather than pretending it can safely inherit another UID's home path.

## Added source

`src/economic/buy_void_custody_launch_authority_v2.mjs` is a pure classifier.
It imports the reviewed coupled-launch journal and dual-signature verification
functions, but performs no filesystem or service mutation.

The production-facing source classifier
`classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2(...)` derives the source
gate internally through `readBuyLaunchSourceGateV1()`; a caller cannot provide
a green `source_gate` boolean to this entry point. The journal, receipt and
high-water byte arguments are still only **observations** at this layer. Policy
explicitly requires them to be obtained by separately reviewed server-side
descriptor-bound reads before any runtime use; caller-supplied observed bytes
carry no authority by themselves.

The source checks:

- exact active generation-journal chain semantics;
- exact newline-terminated canonical JSONL bytes for every generation event,
  matching the existing publisher's `JSON.stringify(event)` representation;
- exact source-composition identity;
- exact live activation receipt schema and receipt ID;
- activation-controller EIP-712 signature;
- Sovereign EIP-712 cosignature;
- receipt generation/tip equality with the journal's current active state;
- finite activation lease;
- canonical custody high-water bytes;
- high-water sequence cannot be ahead of the observed journal;
- the prior custody high-water event must still be present at the exact
  historical journal sequence with the same generation and event hash;
- the exact raw journal prefix through that sequence must match the
  custody-private `journal_prefix_sha256`;
- a same-sequence fork therefore HOLDs;
- a journal rollback below custody high-water HOLDs;
- a newer valid journal generation returns
  `custody_launch_high_water_advance_required`, not production-ready;
- missing high-water returns
  `custody_launch_high_water_bootstrap_required`, not production-ready.

A candidate high-water body is returned for later review, but this module
**never writes it**.

## Why the high-water write is intentionally absent

Accepting a newer generation and persisting custody anti-rollback state is a
mutation of protected authority. It must eventually be atomic with the
custody-service admission model and independently qualified for owner/mode,
descriptor identity, crash recovery, rollback and replay.

Therefore this Draft truthfully reports:

- `custody_high_water_writer_implemented=false`;
- `custody_high_water_write_performed=false`;
- `custody_reserve_method_enabled=false`;
- `custody_recover_method_enabled=false`;
- `production_allocation_mutation_ready=false`.

A green classifier does **not** authorize manually copying a high-water file,
changing ownership/permissions, adding broad read access to the public UID's
home, or enabling allocation mutation.

## Deterministic proof

`scripts/prove_buy_void_custody_launch_authority_v2.mjs` uses only fixed
synthetic fixtures.

It creates two deterministic test wallets whose private keys are explicit test
constants and are **not VOID production keys**. The proof generates real EIP-712
signatures using those fixture keys and uses the classifier's test-only signer
override solely to exercise the same signature-verification code path.

It proves:

- a valid signed generation without custody high-water is still HOLD;
- the exact candidate high-water makes the same generation classifier-ready;
- rotating through revoke → new active generation requires high-water advance;
- applying the returned candidate high-water makes the new generation
  classifier-ready;
- journal rollback below that high-water fails;
- an alternate same-sequence branch fails;
- noncanonical raw journal bytes fail before bootstrap/high-water evaluation;
- a custody high-water carrying the wrong raw-prefix digest fails even when
  its sequence/generation/event-tip fields otherwise match;
- an old signed receipt cannot authorize a new active generation;
- a forged activation signature fails;
- the production entry point remains HOLD on the current source generation
  because the canonical source gate itself is still not production-ready.

Node 22/24/26 must produce byte-identical evidence.

## Remaining production bridge

This is still only one component of a future custody-service successor.

Before `reserve` or `recover` can be enabled, the protected service still
needs independently reviewed server-side descriptor reads for the shared
generation journal, activation receipt and custody high-water; an atomic
high-water writer; original buyer/payment provenance; current source-chain
finality; capacity and duplicate admission; protected allocation high-water;
crash-after-payment-fsync recovery; and exact request/response IPC binding.

The existing `tools/void-buy-allocation-custody-service-v1.mjs` stays
unchanged and continues to reject both reserve and recovery.

No route is mounted. No service is started or restarted. No UID, socket,
permission, credential, wallet, signer, customer ledger, transaction,
Chain-2050/WC, presale/market, inventory, treasury, liquidity or funds state is
changed.

**PROTECT THE CORE.**
