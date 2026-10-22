# V7 V5 trusted root admission plan for create-only staging

## Purpose

Define the trust boundary that may eventually admit the already-reviewed V5
source-stage and receipt-stage installers to root execution.

This plan does **not** implement a launcher, accept a production payload
manifest, install anything under `/opt`, execute as root, or authorize either
stage apply.

Plan ID:

`voidv7v5stageadmissionplan1_8db770a16aae8dd961299d4c1dd2baa4b4cac9a2788e7480380a67aa80da06ef`

## Bound implementation

Exact source-authored implementation generation:

- commit `f171973a91056f9e0452cfbe06e760f411f62a72`;
- tree `c03fe5f85d4a1d372c001595ae19d822ce55e3b8`;
- source-stage installer blob
  `a3cb44b02606b49be2c678f4fb28e258cf765e3b`;
- receipt-stage installer blob
  `c4e7edfeda3196cdebc1ac4656cf514f77a53969`;
- implementation proof blob
  `cc65e21e22c2d424e853607fd5c817810ead7339`;
- staging plan blob
  `37c6f5bd5753f05e57dde3c95f9c2f89c0abdc4d`.

Focused #3712 workflow `39818193076` is GREEN.

## Reused closed-tree trust model

The plan reuses, rather than weakens, the accepted
`CREATE_ONLY_CLOSED_TREE_V1` model:

- persistent-seal plan
  `voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc`;
- plan blob `9dde5523dca6ab240626430ce1c2b82f1cfe7f20`;
- closed-tree acceptance
  `voidv7closedtreeaccept1_19ac8c5b09377162ff42048535352a15b5dc75020701c9402c1ebc6ba73fc4b3`;
- acceptance blob `919db72903a5fcff59dec7635a4288f41d1753d9`;
- reviewed bootstrap source
  `2a8397c85d698d168f2257ec801557281b73c04d`;
- reviewed full-history root-launcher V2 source
  `19b89e92df6f640c017cb9f544ddbf094d69f6eb`.

The future staging launcher gets a distinct fixed root:

`/opt/void-v7-v5-source-receipt-stage-closed-tree-v1`

containing a complete exact source snapshot plus receipt-bound static Python and
stdlib.

## Fixed closed-tree layout

Future payload contract:

- `bin/void_v7_v5_source_receipt_stage_root_launcher_v1`;
- `policy-v1.conf`;
- `install-receipt-v1.conf`;
- `runtime/bin/python3.12-static`;
- `runtime/lib/python312.zip`;
- complete exact `source/` snapshot.

The complete source snapshot must be the exact #3712 implementation generation,
not an arbitrary subset. This lets the source-stage installer's own
head/tree/dependency verification execute inside root custody without changing
its source authority model.

Before Python executes, the static launcher must rebind the closed-tree receipt
to the root, required directories, launcher, policy, Python, stdlib, both
installers, and source/Git authority files.

Python is entered via retained descriptor with `-I -B -S`, fixed minimal
environment and stdin `/dev/null`.

No caller environment or pathname may select trusted input.

## Narrow launcher request surface

The launcher supports exactly four operations:

- `source-stage-plan`;
- `source-stage-apply`;
- `receipt-stage-plan`;
- `receipt-stage-apply`.

Plan operations accept no caller arguments.

Apply operations accept only:

- a correctly shaped content-addressed plan ID;
- the operation's exact explicit confirmation token.

For source operations, the launcher itself supplies exact source-authority
arguments:

- expected implementation HEAD
  `f171973a91056f9e0452cfbe06e760f411f62a72`;
- expected implementation tree
  `c03fe5f85d4a1d372c001595ae19d822ce55e3b8`.

The launcher does not accept caller-supplied:

- filesystem paths;
- candidate path;
- receipt bytes;
- source commit/tree;
- target paths;
- exchange operations;
- transition-journal operations;
- consumer-fence operations;
- service operations.

The stage builders retain their own operation-specific fixed confirmation
tokens.

## Manifest self-hash boundary

The launcher may bind policy schema and known source identities, but it must not
hardcode the hash of a future manifest that includes the launcher itself.

As with the reviewed predecessor:

1. launcher source is reviewed first;
2. a production payload manifest candidate binds the complete launcher/runtime/
   source generation;
3. manifest acceptance is separate;
4. closed-tree bootstrap installation is separate;
5. launcher installation/root execution is separate;
6. each stage apply remains a distinct explicit authorization.

No step collapses review, installation and operation authorization into one
artifact.

## Read-only stage-pair qualification

A separate fixed-path qualifier is required after staging.

It must verify:

- exact V5 source stage;
- exact V5 receipt stage;
- current fixed V4 source unchanged;
- current fixed V4 receipt unchanged;
- both reserved V4 predecessor names absent;
- no transition journal created during staging;
- no consumer-fence mutation during staging.

A GREEN `pair_ready` result grants neither fixed-path exchange authority nor
runtime cutover authority.

## Authority

```text
plan_only=true
launcher_source_implementation_authorized=false
payload_manifest_candidate_generation_authorized=false
payload_manifest_accepted=false
bootstrap_install_authorized=false
launcher_install_authorized=false
root_execution_authorized=false
source_stage_apply_authorized=false
receipt_stage_apply_authorized=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
transition_journal_mutation=false
consumer_fence_mutation=false
service_mutation=false
systemd_mutation=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

Next gate:

`REVIEW_TRUSTED_ADMISSION_PLAN_THEN_IMPLEMENT_STATIC_STAGE_ROOT_LAUNCHER_AND_READ_ONLY_PAIR_QUALIFIER`

PROTECT THE CORE.
