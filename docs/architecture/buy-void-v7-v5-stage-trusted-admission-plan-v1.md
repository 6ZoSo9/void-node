# V7 V5 trusted root admission plan for create-only staging

## Purpose

Define the trust boundary that may eventually admit the already-reviewed V5
source-stage and receipt-stage installers to root execution.

This plan does **not** implement a launcher, accept a production payload
manifest, install anything under `/opt`, execute as root, or authorize either
stage apply.

Plan ID:

`voidv7v5stageadmissionplan1_55bfe3c9e93159cefc69cb946dbb85e504fc225a93d832a8d13b21547328c9b2`

## Bound implementation

Exact source-authored implementation generation:

- commit `5489b50be1e5631a6958d78afeb290f9d1b444bb`;
- tree `3b12eed28fe11a2b20f95ef185f56bd5e37677a1`;
- source-stage installer blob
  `1f251a8489e0b2a69683d991785cb4f46fa6dff5`;
- receipt-stage installer blob
  `d719de6e8c4974a9356577ee16a9e68fa02b7ca0`;
- implementation proof blob
  `bba7841a9dea7082b05f03fccf90c7a0eeb3949e`;
- staging plan blob
  `37c6f5bd5753f05e57dde3c95f9c2f89c0abdc4d`.

The exact-head #3712 staging-builders workflow `39822339296` completed with **SUCCESS** on `5489b50be1e5631a6958d78afeb290f9d1b444bb`; `focused_workflow_success=true` records that verified upstream result. This is a new, content-addressed plan generation; the preceding conservative plan with `focused_workflow_success=false` remains historical evidence. Upstream full CI was 17 SUCCESS and one historic V4 protected-lock scope failure, so this does **not** assert complete CI green or grant host authority.

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

The source generation update incorporates FIFO-nonblocking candidate reads and the receipt installer pre-import guard; this plan remains source-only and grants no root execution. The complete updated trusted source tree must be independently qualified before manifest acceptance.

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
  `5489b50be1e5631a6958d78afeb290f9d1b444bb`;
- expected implementation tree
  `3b12eed28fe11a2b20f95ef185f56bd5e37677a1`.

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
