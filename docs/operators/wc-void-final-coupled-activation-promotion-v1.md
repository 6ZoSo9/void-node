# WC/VOID final coupled activation promotion v1

Marker: `VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1`

Status: source-only final readiness promotion for issue #2200.

This lane does not update a canonical candidate, enable Buy VOID process gates,
enable public intake, mutate a runtime/service, access a wallet/signer/key,
construct/sign/broadcast a transaction, activate WC/VOID or the presale, or move
funds.

## Purpose

The WC/VOID production candidate and coupled-economic successor candidate both
have an explicit final `coupled_activation_ready` gate. All upstream source and
live-evidence applications are intentionally required to stop with that final
gate false.

This contract defines the missing final source transition after every other
independent gate has already been applied to canonical Git.

It does not replace or weaken any upstream application contract.

## Required canonical prestate

The successor migration candidate must independently classify:

```text
SOURCE_READY
migration_authorized=false
public_activation_authorized=false
money_movement_authorized=false
```

The WC/VOID production classifier must be held on exactly:

```text
coupled_activation_ready_required
```

The coupled-economic successor classifier must also be held on exactly:

```text
coupled_activation_ready_required
```

Any other missing gate causes this promotion to HOLD.

That means the final promotion cannot be used to bypass:

- epoch-2 public economic verification;
- market-vault deployment/runtime/funding/lock application;
- WC-ledger persistence and quote-reserve custody application;
- durable opening claim/replay application;
- participant post-purchase VoidToken-control application; or
- bounded-canary application.

## Applied lineage requirement

The operator supplies one private lineage manifest with exactly six entries:

```text
economic_epoch2_public_verification
market_vault
ledger_custody
opening_durable
participant_postpurchase
bounded_canary
```

Every entry binds:

- a reviewed application plan ID;
- the Git commit that applied the canonical transition;
- a SHA-256 of the reviewed application receipt; and
- `verified_applied=true`.

The CLI requires each applied commit to be an ancestor of the current clean
repository HEAD.

It also inspects the exact first-parent commit delta and requires each lineage
to have touched its required canonical candidate file:

| lane | required canonical path(s) |
| --- | --- |
| epoch-2 public verification | `ops/mainnet0/economic-evm-successor-migration-candidate-v1.json` |
| market vault | `ops/mainnet0/wc-void-production-candidate-v1.json` |
| ledger custody | production + coupled candidates |
| durable opening | production + coupled candidates |
| participant post-purchase | coupled candidate |
| bounded canary | production + coupled candidates |

The lineage manifest cannot create readiness. Canonical candidate state remains
the authoritative input and must independently satisfy all non-final gates.

## Exact final source delta

Production candidate:

```text
status: hold -> source_ready
coupled_activation_ready: false -> true
```

Coupled-economic candidate:

```text
status: HOLD -> SOURCE_READY
gates.coupled_activation_ready: false -> true
```

The tool reconstructs each input candidate by reverting only those fields and
requires canonical equality. Any additional target mutation fails closed.

The successor candidate is copied without modification.

## Required poststate

The tool reruns:

- `classifyVoidWcVoidProductionReadinessV1`;
- `classifyVoidCoupledEconomicSuccessorGateV1`; and
- `classifyVoidWcVoidCoupledLaunchReadinessV1`.

All three required readiness decisions must be `SOURCE_READY`.

The composite result supplies the content-addressed coupled-launch
`composition_id`.

Even then, authority remains:

```text
activation_authority=false
funding_authority=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

## Private lineage manifest shape

Example shape only:

```json
[
  {
    "lane": "economic_epoch2_public_verification",
    "application_plan_id": "reviewed-plan-id",
    "applied_commit_sha": "40hex",
    "application_receipt_sha256": "64hex",
    "verified_applied": true
  }
]
```

The actual manifest must contain all six exact lanes and be a direct private
regular file with no group/other permissions.

## CLI

Once all upstream canonical applications are merged:

```bash
node tools/void-wc-void-final-coupled-activation-promotion-v1.mjs \
  --lineages /absolute/private/final-coupled-applied-lineages.json
```

On current main this command is expected to HOLD because upstream canonical
applications are not all complete yet.

A later GREEN result derives candidate copies only. Applying those copies to
canonical source remains a separate reviewed Git transition.

## Launch boundary

A green final source promotion or even later canonical `SOURCE_READY` state is
**not economic activation**.

These remain separate operator/runtime gates:

- claimed PostgreSQL selector;
- payment-keyed full runtime;
- admitted guarded runtime;
- full-runtime apply;
- `VOID_BUY_REQUESTS_ENABLED`;
- the coupled launch ceremony and its explicit operator authority.

No source-ready result may itself install a systemd drop-in, restart a service,
access signing credentials, submit a transaction, open public intake, or move
funds.

## Verification

```bash
node scripts/prove_void_wc_void_final_coupled_activation_promotion_v1.mjs
```
