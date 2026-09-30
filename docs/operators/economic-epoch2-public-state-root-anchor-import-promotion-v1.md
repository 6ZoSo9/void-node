# Economic Epoch-2 public state-root anchor import promotion v1

Marker:
`VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_PROMOTION_V1`

Status: **source-only import/promotion mechanism**. The checked-in canonical
migration candidate is not modified by this lane.

## Purpose

The existing state-root anchor admission composition proves that an exact
finalized event-membership object can be re-admitted as canonical Chain-2050
commitment truth for the exact Epoch-2 successor state-root payload. Its hosted
proof intentionally uses a synthetic membership fixture and therefore retains:

```text
real_finalized_membership_import_verified=false
successor_state_root_public_void_anchor_ready=false
```

This lane closes the missing source mechanism between that composition and a
future real finalized-membership artifact.

## Reviewed artifact boundary

The importer accepts a finalized event-membership JSON file only when the
operator supplies:

- the independently reviewed SHA-256 of the exact file;
- the exact reviewed commitment-registry address;
- the exact reviewed publisher address; and
- the literal confirmation
  `importReviewedRealFinalizedStateRootMembershipV1`.

The SHA-256 is admission authority for the exact reviewed file. It is not an
identity signature and it does not manufacture chain evidence.

The importer then independently re-runs
`verifyEconomicEpoch2PublicStateRootAnchorAdmissionCandidateV1`, which in turn
re-runs the generic canonical-truth admission. The reviewed membership must bind
the exact state-root object ID, object digest, payload digest, byte length,
transaction, registry, publisher, accepted checkpoint, and finality policy.

A structurally valid but differently hashed file, wrong registry, wrong
publisher, wrong anchor payload, or already-promoted canonical start state fails
closed.

## Promotion result

For the current canonical migration candidate, a valid reviewed real membership
produces a **derived candidate copy** with only:

```text
successor_state_root_public_void_anchor_ready=true
```

changed.

The tool immediately re-runs
`classifyVoidEconomicEvmSuccessorMigrationV1`. With current `main`, the only
remaining migration gate must then be:

```text
public_economic_verification_path_required
```

If the public-read gate has already been independently promoted, the derived
candidate may classify `SOURCE_READY`. That classification still grants no
migration, activation, write, wallet, signer, token, or funds authority.

The canonical file
`ops/mainnet0/economic-evm-successor-migration-candidate-v1.json` is never
edited automatically. Applying any derived candidate to source remains a
separate reviewed source transition.

## Operator usage

After a real finalized membership artifact has been independently reviewed:

```bash
node tools/void-economic-epoch2-public-state-root-anchor-import-promotion-v1.mjs \
  --membership /path/to/real-finalized-event-membership.json \
  --expected-membership-sha256 <reviewed-sha256> \
  --expected-registry-address 0x... \
  --expected-publisher-address 0x... \
  --confirmation importReviewedRealFinalizedStateRootMembershipV1 \
  --output-dir /tmp/void-epoch2-state-root-anchor-import-promotion-v1
```

The output directory is create-only and contains:

- `economic-epoch2-public-state-root-anchor-import-promotion-v1.json`; and
- a derived `economic-evm-successor-migration-candidate-v1.json`.

## Authority boundary

This lane may read the reviewed membership and write derived JSON outputs. It
does not:

- call RPC or any network endpoint;
- access credentials, a wallet, signer, or private key;
- construct, sign, submit, or broadcast a transaction;
- write Chain 2050;
- mutate validators, governance, or Work Credits;
- move tokens or funds;
- mutate the repository;
- authorize migration; or
- authorize public activation.

A real state-root commitment transaction and its finalized event-membership
evidence remain separate operational actions.

Verification:

```bash
node scripts/prove_void_economic_epoch2_public_state_root_anchor_import_promotion_v1.mjs
```
