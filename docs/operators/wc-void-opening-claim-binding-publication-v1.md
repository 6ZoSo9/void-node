# WC/VOID opening claim-binding publication v1

Marker: `VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_V1`

Status: source mechanism for explicit, create-once persistence of the exact
opening transfer-or-refund binding. This source does not execute transfers or
refunds and does not make the production launch gate green by itself.

## Purpose

The existing claim-binding verifier can prove that one exact derived binding is
present under the canonical WC data directory, but it is deliberately read-only.

This publisher closes the missing write mechanism while preserving the launch
replay boundary.

Publication requires the exact confirmation:

`persistWcVoidOpeningClaimBinding`

The confirmation is checked before filesystem access.

## Replay-terminal prerequisite

A binding cannot be published merely because its inputs are structurally valid.

Before any binding write, the publisher invokes the canonical read-only replay
terminal inspector against the same:

- coupled launch ID;
- commitment set;
- canonical opening ledger-debit set;
- finalize/abort mode; and
- disposition set.

The replay terminal must already be durably present and must bind the same
claim-binding ID.

Because the replay terminal is create-once per coupled launch, an alternate
finalize/abort outcome for the same launch cannot be published through this
path.

## Canonical path

For binding ID `sha256:<64 lowercase hex>`, the canonical binding file is:

`<data_dir>/wc_v1/opening-claim-bindings-v1/<64 lowercase hex>.json`

The persisted value is the independently derived canonical binding object.

## Publication semantics

The publisher:

1. derives the claim binding from the supplied launch inputs;
2. verifies the matching create-once replay terminal;
3. requires direct private `data_dir` and `wc_v1` custody;
4. creates the private binding store when absent;
5. rejects stale pending or unexpected store entries;
6. writes complete canonical bytes to an exclusive `0600` pending file;
7. fsyncs the pending file;
8. publishes with a create-only hardlink, never overwrite;
9. fsyncs the binding directory;
10. removes the pending link and fsyncs again;
11. invokes the existing independent read-only binding verifier; and
12. rechecks the replay terminal and parent-directory custody before success.

An exact retry is idempotent and returns `status=duplicate` without replacing
the canonical binding inode.

A missing, changed, or conflicting replay terminal fails closed.

## Success boundary

A successful source invocation reports:

```text
replay_terminal_required=true
replay_terminal_binding_match_verified=true
create_once_binding_file=true
atomic_complete_file_publication=true
binding_persistence_verified=true
opening_claim_transfer_or_refund_binding_persistence_verified=true
production_opening_claim_binding_gate_updated=false
runtime_execution_ready=false
```

The final two false values are deliberate. The durable production gate may
become true only when an authorized launch/canary uses this mechanism and the
resulting execution/custody evidence is accepted.

## Authority

This mechanism has narrowly bounded filesystem read/write authority for the
claim-binding file only.

It has no authority for:

- WC-ledger writes or balance mutation;
- WC issuance;
- `VoidToken` transfer;
- WC refund execution;
- wallet, signer, or private-key access;
- RPC;
- transaction construction, signing, or broadcast;
- Chain-2050 writes;
- inventory funding or liquidity movement;
- market activation;
- public presale activation; or
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_opening_claim_binding_publication_v1.mjs
```
