# Buy VOID Epoch-2 dormant first-entry bootstrap V6 candidate lock V2

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CANDIDATE_LOCK_V2`.

Status: **repaired source-generation identity acceptance only; not installed and not authorized for live execution**.

## Purpose

V2 accepts the repaired V6 bootstrap candidate that adds compatibility for
standard Git cruft-pack `.mtimes` metadata.

The repair does not grant `.mtimes` any source or object authority. The file
is admitted only as a root checkout Git auxiliary metadata shape:
- regular file;
- single link;
- never copied into the private object view;
- never used as candidate identity.

Historical V6 lock V1 remains byte-frozen evidence and has zero install
authority for this repaired generation.

## Repaired source generation

Candidate source head:

`404367eb982fa92a40f3c2fe51d5f172a1e9fac0`

Tree:

`724f501caeb7fa888b3b93f55ff5da08a577088a`

Source generation:

`voidbuye2dormantsourcegen3_8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`

Bound source identities:
- V6 bootstrap source Git blob
  `560726bcae6ea0738502cb5e74b65f9116bd447d`;
- V6 source SHA-256
  `ac8673f51e4325e3ed1912a4f628cc3715c7199cda1c3cbdacbbcb710ae6b145`;
- V3 manifest Git blob
  `de56bacb30bea0adc418e240cf3fb8d900b061ef`;
- V3 manifest SHA-256
  `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`;
- inner installer V5 Git blob
  `ce6930bc1be8239a3171d4922c44b96a50f5778b`.

## Hosted evidence

Run `39077019801`:
- source proof job `117526163023`;
- derive A `117526232018`;
- derive B `117526232033`;
- derive C `117526232057`;
- compare/rederive `117526492254`.

Artifacts:
- A `12116918415`;
- B `12117740915`;
- C `12117910498`.

All three hosted reports are byte-identical. All three hosted ELFs are
byte-identical. The compare job independently rederived both again.

## Accepted repaired candidate

Candidate ID:

`voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`

Candidate report:
- bytes: `2745`;
- SHA-256:
  `14a8c9b60440f81d906070d3efee3248ac60b2a4ae43783fe5c1484ff0847c3d`;
- Git blob:
  `d0302cf5a1b7af91b46458585784c70e0d37432f`.

Static V6 ELF:
- bytes: `874608`;
- SHA-256:
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`;
- Git blob:
  `b577d70666f98ac59a75b84b3dab741fe7b93a4b`.

## Lock lineage

V2 lock ID:

`voidbuye2dormantbootstraplock3r_9025557c46c1b5ba8ece40f89808616a0b099de887234a2f151d0c57ad9734c8`

Historical pre-cruft V6 lock:

`voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`

Historical lock Git blob:

`f5b03c6b81016edf21f605099e0ef8976f40e107`

Its install authority for this repaired generation is false.

## Acceptance proof

The lock proof:
1. re-hashes the lock body and lock ID;
2. requires the repaired candidate head/tree to be an ancestor;
3. binds exact repaired source/manifest/candidate/proof/docs/workflow blobs;
4. verifies the historical lock remains accepted historical evidence but
   non-authoritative for repaired install;
5. asserts the exact `.mtimes` auxiliary clause in the reviewed V6 source;
6. creates a disposable detached worktree at the repaired candidate head;
7. independently rederives the report and ELF;
8. requires exact report/ELF bytes, SHA-256 and Git-blob identities;
9. requires candidate authority in the report itself to remain false.

## Authority

This lock accepts identity only:

```text
candidate_accepted=true
native_binary_identity_accepted=true
source_generation_identity_accepted=true
cruft_mtimes_compatibility_accepted=true
cruft_mtimes_non_authoritative=true
cruft_mtimes_private_object_view_copy=false
superseded_pre_cruft_lock_install_authority=false
protected_install_authorized=false
live_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
rpc_call_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
funds_movement_authorized=false
production_host_evidence_authority=false
```

No Precision mutation, materialization, protected install, bootstrap execution,
credential/key access, signing, transaction, payment, presale/WC activation,
treasury action, or funds movement is authorized.

Next gate:

`void_buy_void_epoch2_dormant_first_entry_bootstrap_v6_materializer_v2`.

**PROTECT THE CORE.**
