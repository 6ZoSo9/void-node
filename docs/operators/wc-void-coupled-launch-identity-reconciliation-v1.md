# WC/VOID coupled launch identity reconciliation v1

Marker:
`VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_V1`

Status: **source-only atomic reconciliation plan**. This lane does not modify
the canonical coupled candidate, classifier, market-vault deployment candidate,
roles, runtime, or funds.

## Problem

The current WC/VOID launch identity exists in two explicit encodings:

- opening/shared-state/claim/replay domain:
  `sha256:<64 hex>`;
- `WCVoidMarketVaultV2` constructor/storage domain:
  `0x<64 hex>` Solidity `bytes32`.

The current reviewed deployment commitment derives this digest:

```text
fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26
```

Therefore the two lossless views are:

```text
opening_domain_id=
sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26

vault_bytes32_id=
0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26
```

The canonical coupled candidate still uses the deliberate source-model fixture:

```text
sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

Those values must not be treated as the same launch until source reconciliation
has been reviewed and applied.

## Reviewed commitment

The reconciliation tool derives the digest from the same current source truths
used by the market-vault requalification work:

- current canonical presale economics;
- current WC/VOID opening inventory and discovery policy;
- current accepted `WCVoidMarketVaultV2` compiled identity;
- exact creation bytecode, runtime template, and immutable layout;
- simultaneous presale/WC-VOID launch ordering.

The source files and the opening/shared-state derivation modules are pinned by
exact Git blob identity. An unrelated future main advance is acceptable only
while those exact blobs remain unchanged.

## Why one JSON field is not enough

The canonical candidate's
`shared_post_discovery_reconciliation.reconciliation_id` and
`wc_opening_state_id` are content-addressed outputs that include the
`coupled_launch_id`.

Changing only:

```text
shared_post_discovery_reconciliation.coupled_launch_id
```

would leave both IDs stale.

The preparation therefore rebuilds the source-model opening commitments,
ledger-debit settlement IDs, opening state, and shared post-discovery
reconciliation from the reviewed launch ID. It emits the exact replacement
`shared_post_discovery_reconciliation` object as a **derived candidate copy**.

The deterministic reconciled identities are:

```text
wc_opening_state_id=
sha256:fb50857b791a59b1ea87eae348afbfb8e2f587d08596a55350c0ce2faf29b621

reconciliation_id=
sha256:522ff84c2fff69ef477085a253b666cb450a8dbd89d372633fdfe883e58851ba
```

Both are pinned by the preparation and proof, so any future policy/fixture drift
changes the IDs and fails the reviewed reconciliation generation.

## Atomic source transition

Current classifier source also hardcodes the old source-model launch ID.
Therefore the candidate and classifier must move in the same reviewed source
generation.

The preparation binds the exact classifier Git blob and verifies that its source
still derives canonical shared-state expectations from the
`sha256:aaaa...` constant and fails shared-state field mismatches. It does
**not** execute the classifier, because claiming execution provenance would
require independently binding the classifier's full transitive import graph.

This source binding is the atomicity guard: the proposed candidate must not be
applied while the classifier still derives the old fixture.

A later application must update these four existing source surfaces as one
reviewed generation:

1. `ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json`
2. `tools/void-coupled-economic-successor-gate-v1.mjs`
3. `scripts/prove_void_coupled_economic_successor_gate_v1.mjs`
4. `docs/operators/coupled-economic-successor-gate-v1.md`

The candidate must receive the rederived shared-state object; the classifier
must derive its source model from the reviewed
`sha256:fe02...` launch ID; and the proof/documented content-addressed IDs must
move to the rederived values from the same generation.

This lane does **not** perform that source application automatically.

## Downstream hold

Until the four-file source transition is reviewed and applied, the new launch
identity must not be used as authority for real:

- opening ledger/custody evidence;
- opening claim/replay evidence;
- bounded canary evidence;
- market-vault role authorization;
- market-vault deployment/attestation; or
- final coupled activation.

The reserved market-vault requalification lane may reference the raw
`0xfe02...` constructor identity as a candidate, but deployment compatibility
is not established until the canonical opening domain is reconciled to the same
32-byte digest.

## Authority boundary

The preparation may read exact repository source and derive an in-memory
candidate copy. It does not:

- edit the canonical candidate;
- edit the classifier;
- access Nimo keys, credentials, wallets, or signers;
- call RPC or a network endpoint;
- authorize roles;
- construct, sign, submit, or broadcast a transaction;
- deploy a contract;
- write Chain 2050;
- fund inventory or move liquidity;
- activate WC/VOID or the presale; or
- move funds.

Verification:

```bash
node scripts/prove_void_wc_void_coupled_launch_identity_reconciliation_v1.mjs
```
