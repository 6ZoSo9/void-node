# Buy VOID presale source-freeze host-install qualification V2

Marker: `VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_HOST_INSTALL_QUALIFICATION_V2`.

Status: **offline fail-closed evidence classifier; no host access and no activation authority**.

## Purpose

This gate consumes the JSON emitted by the accepted-freeze Precision metadata
census V3 and classifies what that metadata can and cannot prove.

It deliberately does **not** turn path presence, mountpoint presence, or local
Git-object presence into host-install qualification.

The current source lineage is:

- fixed freeze
  `voidbuypresalefreeze2_32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1`;
- current-source enforcement successor
  `voidbuypresaleenfsucc1_819fd2dbce9928145023d4077cffc34e2a9ab3a50e51428fc37dda6ca70a18ef`;
- source-freeze acceptance
  `voidbuypresalefreezeaccept2_88fa89a3fd3ea8151f69c5f133eca2965cf98576a245d7afbb7f6992f68fa1c4`.

## Input contract

The evaluator accepts one absolute, normalized, regular, single-link JSON file:

```bash
python3 -I -B scripts/void_buy_void_presale_source_freeze_host_install_qualification_v2.py \
  --census-json /absolute/path/to/census-v3.json
```

It opens no host path itself.

The input must be an exact
`VOID_BUY_VOID_PRECISION_SOURCE_FREEZE_HOST_METADATA_CENSUS_V3` report and
must retain all of the census's negative authority claims.

The evaluator rejects a census that attempts to claim receipt authenticity,
host qualification, live-generation verification, payment acceptance, presale
activation, WC/VOID activation, or funds authority.

## Metadata-alignment classification

A census can reach:

`metadata_alignment_green=true`

only when it reports:

- the designated Precision hostname;
- a local repository directory and a valid local HEAD;
- local presence of the fixed freeze/source/successor/acceptance generations;
- current-HEAD matches for the tracked freeze, enforcement successor,
  acceptance, historical enforcement lock, and repaired Epoch-2 bootstrap lock;
- regular-file metadata for the source-finality deployment receipt;
- directory + mountpoint metadata for allocation custody;
- directory metadata for the Epoch-2 live-composition root.

Those checks remain metadata observations only.

## Evidence metadata cannot prove

Even with perfect metadata alignment the terminal state is:

`HOST_INSTALL_QUALIFICATION_HOLD_INDEPENDENT_EVIDENCE_REQUIRED`.

The evaluator requires three separately reviewed evidence classes before any
future version can claim host-install qualification:

1. **Authenticated source-finality receipt evidence**
   - deployment receipt content is validated rather than merely present;
   - deployment receipt and live-process binding belong to the same reviewed
     generation;
   - accepted enforcement/source identities are cryptographically bound.

2. **Allocation-custody host/storage qualification**
   - a mountpoint existing is not enough;
   - the reviewed custody service/storage generation, rollback/anti-rollback
     controls, and required witness/storage evidence must be independently
     qualified.

3. **Epoch-2 installed/live-composition generation qualification**
   - an `/opt` directory existing is not enough;
   - the installed native/runner/policy generation must be independently
     qualified against its accepted lock/source generation.

Current source contains reviewed components for these lanes, but the metadata
census intentionally does not execute or authenticate them.

## Fail-closed statuses

The evaluator has no GREEN host-install terminal in V2.

Possible successful classifications are:

- `HOST_INSTALL_QUALIFICATION_HOLD_METADATA_NOT_ALIGNED`
- `HOST_INSTALL_QUALIFICATION_HOLD_INDEPENDENT_EVIDENCE_REQUIRED`

Invalid/untrusted input exits nonzero as:

- `HOST_INSTALL_QUALIFICATION_HOLD_INVALID_INPUT`.

This prevents a source-only evaluator from inventing production-host evidence.

## Exact source bindings

- census source:
  `scripts/void_buy_void_precision_source_freeze_host_metadata_census_v3.py`
  blob `266fe91ee8563efff6116be7f890f19340a0de4c`;
- census behavioral proof:
  `9a8446a3d1f02d94277606c2858ec7abd30b3b94`;
- accepted freeze manifest:
  `ca9c42e2d3ab4c50ac54badadb9efde6180ad241`;
- current enforcement-successor manifest:
  `774db38ccb771f393b44d589a455144b99d36f6b`;
- current freeze-acceptance manifest:
  `5d437a37703a83908a7fa78b78da92151aa1aa99`.

## Authority

V2 always keeps:

```text
installed_receipt_authenticity_verified=false
allocation_custody_qualified=false
epoch2_installed_generation_qualified=false
host_install_qualified=false
live_runtime_evidence_qualified=false
payment_rail_policy_accepted=false
customer_payment_acceptance_authorized=false
one_payment_one_fulfillment_verified=false
wc_void_launch_coupling_verified=false
public_presale_activation=false
wc_void_market_activation=false
wallet_or_signing_authority=false
transaction_submission_authorized=false
treasury_or_liquidity_action_authorized=false
funds_movement=false
production_host_evidence_authority=false
filesystem_write=false
service_mutation=false
network_contact=false
credential_access=false
```

Next evidence objective:

`COLLECT_AUTHENTICATED_RECEIPT_CUSTODY_AND_EPOCH2_INSTALLED_GENERATION_EVIDENCE`.

That collection remains separate from public presale activation.

**PROTECT THE CORE.**
