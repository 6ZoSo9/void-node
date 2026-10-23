# V7 V5 trusted root admission plan V2

## Purpose

Define the trusted-root admission contract for the canonical create-only V5
stage installers proven in Draft #3715.

V2 exists because the earlier trusted-admission/launcher lineage in #3713/#3714
was built against a different staging implementation. Its architecture is
useful, but two generation assumptions are not valid for the canonical
#3715 installer:

- predecessor source-stage root mode: `0555`;
- predecessor internal source-build path:
  `/opt/.void-buy-void-v7-reviewed-v1.stage-v5.tmp-v1`.

The canonical #3715 implementation requires:

- source-stage root mode: `0755`;
- internal source-build path:
  `/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1`.

V2 reuses the closed-tree/static-launcher **architecture**, not the predecessor
generation identity.

## Exact canonical installer generation

Trusted launcher V2 must bind the exact #3715 source snapshot:

- commit: `ea2193709dab86ea3eb3c2235d08e8a6858a23c6`;
- tree: `07c2dd960c047d56d0c017825e4e389bcdc99342`;
- source installer:
  `d88a9548ea34b8209ed7dcd53732fd25dd1371bf`;
- receipt installer:
  `b462696826b4f90fdf5f4938cd5467e5711addab`;
- source proof:
  `5b8e98eec6712efd4846a564f689161fb054338f`;
- receipt proof:
  `7d968740c9e0c787c57bd493e5c51f5ed385eed1`;
- focused workflow:
  `af1a9afad2a39b96ee4022ba1b36ebf7534c818b`;
- stage plan:
  `1ce5de6d4ffa0a89ead32ca734d43f0da72fed59`.

Focused run `40025337175` is GREEN on both Python 3.12 and 3.13 for the hardened exact #3715 generation.

## Future closed tree

The successor trusted root is versioned separately:

`/opt/void-v7-v5-source-receipt-stage-closed-tree-v2`

It must contain:

- static launcher:
  `bin/void_v7_v5_source_receipt_stage_root_launcher_v2`;
- policy:
  `policy-v2.conf`;
- install receipt:
  `install-receipt-v2.conf`;
- static Python runtime;
- complete exact source snapshot at #3715 commit/tree.

The entire tree remains create-only, content-addressed, root-custodied, and
independently accepted before installation.

## Launcher request surface

Allowed operations remain deliberately narrow:

- `source-stage-plan`;
- `source-stage-apply`;
- `receipt-stage-plan`;
- `receipt-stage-apply`.

The caller may never choose:

- filesystem paths;
- candidate paths;
- receipt bytes;
- source commit/tree;
- exchange operations;
- transition-journal operations;
- consumer-fence operations;
- service/systemd operations.

Launcher V2 itself supplies the installer source generation
`ea2193709dab86ea3eb3c2235d08e8a6858a23c6 / 07c2dd960c047d56d0c017825e4e389bcdc99342`.

Apply calls still require the installer's exact content-addressed plan ID plus
the exact installer confirmation token.

## Read-only pair qualifier V2

A separately installed read-only qualifier must authenticate the fixed stage
paths after staging:

- source:
  `/opt/.void-buy-void-v7-reviewed-v1.stage-v5`;
- receipt:
  `/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5`.

Qualifier V2 must require:

- source root root:root mode `0755`;
- internal source build path
  `/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1` absent;
- exact V5 commit/tree/parent and 18,357 reachable commits;
- clean, non-shallow, complete Git object graph;
- exact V5 receipt ID/SHA-256/bytes with root:root `0444`, nlink 1;
- fixed V4 source and receipt unchanged;
- predecessor paths absent;
- staging transition journal absent;
- consumer fence unchanged.

A GREEN pair qualification grants neither exchange authority nor runtime-cutover
authority.

## Predecessor architecture

The V1 launcher/qualifier from #3714 remains a reviewed architectural
precedent. Its static C launcher, fixed request surface, content-addressed
closed-tree policy, static Python descriptor execution, minimal environment,
stdin `/dev/null`, and production-disabled authority model may be reused.

Its old `0555/.tmp-v1` stage assumptions must not be inherited.

## Authority

This plan authorizes no implementation, install, or root execution:

```text
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

Plan ID:

`voidv7v5stageadmissionplan2_b85c582a6da03b80396ac58734d6634961df70d0ec76a0bafc52931dbb13fdbf`

Next gate:

`REVIEW_TRUSTED_ADMISSION_PLAN_V2_THEN_IMPLEMENT_STATIC_STAGE_ROOT_LAUNCHER_V2_AND_READ_ONLY_PAIR_QUALIFIER_V2`

PROTECT THE CORE.
