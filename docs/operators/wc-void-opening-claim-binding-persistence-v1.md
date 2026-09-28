# WC/VOID opening claim-binding persistence v1

Marker: `VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1`

Status: source-only read-only persistence verifier. This verifier does not create
or update a claim binding, write the WC ledger, transfer `VoidToken`, refund WC,
access a signer, activate WC/VOID or the presale, or move funds.

## Purpose

`VOID_WC_VOID_OPENING_CLAIM_BINDING_V1` derives a content-addressed,
cohort-atomic finalize-or-abort binding. Source derivation alone is not durable
state.

This verifier closes the missing source mechanism for proving that one exact
derived binding has been persisted under the canonical WC data directory.

## Canonical path

For binding ID:

`sha256:<64 lowercase hex>`

the canonical file is:

```text
<data_dir>/wc_v1/opening-claim-bindings-v1/<64 lowercase hex>.json
```

The verifier derives the expected binding itself from the supplied launch,
commitment, ledger-debit, mode and disposition inputs. The caller cannot provide
a separate trusted binding ID or trusted persisted object.

## Custody and stability checks

A successful inspection requires:

- absolute direct `data_dir`;
- direct non-symlink `wc_v1`;
- direct non-symlink `opening-claim-bindings-v1`;
- direct non-symlink binding file;
- current-process ownership when UID inspection is available;
- no group/world write permission on the custody path or file;
- a bounded file size of at most 64 MiB;
- the object opened for reading to be the same inode/device/size/time identity
  that passed the path preflight;
- stable file identity during the read;
- valid JSON object content; and
- canonical parsed content exactly equal to the independently re-derived
  binding.

Tamper, extra fields, a wrong binding, symlink substitution, writable custody,
missing persistence, or binding-input drift fail closed.

## What success proves

A successful result reports:

```text
status=PERSISTENCE_VERIFIED
exact_binding_rederivation_verified=true
binding_persistence_verified=true
opening_claim_transfer_or_refund_binding_persistence_verified=true
canonical_binding_direct_file=true
stable_file_identity_during_read=true
```

It also reports the content-addressed binding ID, opening-state ID, mode,
disposition count, persisted byte count and SHA-256 of the persisted file.

## What success does not prove

Persistence is not execution. This verifier deliberately keeps false:

- runtime execution readiness;
- live WC refund write;
- live `VoidToken` transfer;
- WC balance mutation;
- market-vault custody;
- participant wallet/control usability;
- market activation;
- presale activation; and
- funds movement.

Therefore this source verifier alone does **not** set the durable coupled
candidate's `opening_claim_transfer_or_refund_binding_ready` gate. That later
gate still requires the actual launch/canary binding to exist and the relevant
execution/custody evidence to be accepted.

## Authority boundary

The verifier is read-only and grants no filesystem write, WC issuance, WC
balance mutation, token transfer, wallet/signer/private-key access, transaction
construction/signing/broadcast, Chain-2050 write, inventory funding, liquidity
movement, activation, or funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_opening_claim_binding_persistence_v1.mjs
```
