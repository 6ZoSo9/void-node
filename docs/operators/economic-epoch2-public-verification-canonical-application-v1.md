# Epoch-2 public verification canonical application v1

## Status

Source-only prepare/verify-applied contract for issue #2270.

This mechanism does **not** mutate the canonical successor candidate itself. It prepares the exact reviewed target bytes and a content-addressed application plan, then separately verifies a later reviewed Git application.

## Purpose

Merged #2260 can re-execute the reviewed public-read runtime promotion and canonical finalized state-root import and derive a successor migration candidate that classifies `SOURCE_READY`.

The canonical source file:

`ops/mainnet0/economic-evm-successor-migration-candidate-v1.json`

still carries both public-verification gates false until an independently reviewed source transition applies #2260's exact result.

This contract keeps that source application separate from #2200 final WC/VOID coupled activation.

## Required inputs

Prepare consumes exact bytes plus independent SHA-256 values for:

- fresh public-read evidence;
- finalized state-root membership;
- the #2260 composition receipt;
- the #2260 derived successor candidate.

It also consumes the exact public-read evidence ID, evaluation time, registry address, publisher address, and #2260 review confirmation token. Those reviewed inputs and the exact #2260 composition receipt object are retained in the application plan so post-application replay can require equality rather than trusting summary IDs.

Self-consistent caller-created receipt/candidate bytes are insufficient. Prepare re-executes #2260 from the upstream evidence set and requires exact semantic equality with both supplied artifacts.

## Reviewed execution boundary

The application tool binds:

- a clean Git HEAD/tree;
- canonical `6ZoSo9/void-node` origin;
- the current canonical successor-candidate Git blob;
- the application tool Git blob;
- the merged #2260 composition-tool Git blob; and
- the canonical successor migration classifier Git blob.

Git replacement-object semantics are disabled. Authority Git reads use the reviewed absolute Git executable with PATH/locale bounded, global/system Git config disabled, repository/worktree/object/config-injection environment removed, and local execution-capable options such as fsmonitor/hooks plus ambient attributes disabled. The canonical origin is read explicitly from local config with includes disabled. Focused pull-request CI checks out the exact PR head rather than GitHub's synthetic merge ref.

To avoid "verified blob, mutable executed file" races, prepare materializes the exact reviewed HEAD tree through `git archive` and executes #2260 plus the migration classifier from that reviewed tree. The materialization contains a private detached Git metadata view whose `HEAD` and index are pinned to the reviewed commit/tree and whose object database is read-only-linked through Git alternates to the canonical repository objects. It does **not** point its `.git` metadata at the moving canonical checkout.

That distinction matters after application: current `main` may already contain the promoted successor candidate, while semantic replay must still execute #2260 against the original false-gate base generation. The detached base Git view makes that replay deterministic without checking out, resetting, or mutating the canonical repository.

#2260 then performs its own exact reviewed-object execution for the public-read and state-root promotion dependencies.

## Exact source delta

The target successor candidate may differ from the canonical source only by the #2260-reviewed public-verification changes:

- `public_verification.successor_state_root_public_void_anchor_ready: false -> true`;
- `public_verification.public_balance_receipt_code_verification_ready: false -> true`;
- add the exact `public_balance_receipt_code_verification_evidence` reference produced by #2260;
- add the exact `public_balance_receipt_code_verification_promotion` reference produced by #2260.

Resetting those four properties must reproduce the exact canonical source candidate.

No other successor field may change.

## Classifier result

Before application, the canonical successor migration classifier must HOLD only on:

- `successor_state_root_public_void_anchor_required`;
- `public_economic_verification_path_required`.

The prepared target must classify:

`SOURCE_READY`

while still reporting:

`migration_authorized=false`

`public_activation_authorized=false`

`money_movement_authorized=false`

All `launch_authority` values other than `source_only=true` remain false.

## Prepare / apply / verify

Prepare creates a private, create-only plan outside the repository. It does not edit source.

Example shape:

```bash
node tools/void-economic-epoch2-public-verification-canonical-application-v1.mjs prepare \
  --public-read-evidence /absolute/public-read.json \
  --public-read-sha256 <64hex> \
  --public-read-evidence-id voide2pre1_<64hex> \
  --evaluation-time-utc <UTC> \
  --state-root-membership /absolute/membership.json \
  --membership-sha256 <64hex> \
  --registry 0x... \
  --publisher 0x... \
  --confirmation importReviewedRealFinalizedStateRootMembershipV1 \
  --composition-receipt /absolute/composition.json \
  --composition-receipt-sha256 <64hex> \
  --derived-candidate /absolute/derived-candidate.json \
  --derived-candidate-sha256 <64hex> \
  --output /absolute/application-plan.json
```

A later Git source change must be reviewed separately and set the canonical successor file to the plan's exact target bytes.

After that reviewed commit is on canonical `main`, verify-applied must be given the original reviewed upstream evidence again:

```bash
node tools/void-economic-epoch2-public-verification-canonical-application-v1.mjs verify-applied \
  --plan /absolute/application-plan.json \
  --plan-sha256 <64hex> \
  --public-read-evidence /absolute/public-read.json \
  --public-read-sha256 <64hex> \
  --public-read-evidence-id voide2pre1_<64hex> \
  --evaluation-time-utc <same-reviewed-UTC> \
  --state-root-membership /absolute/membership.json \
  --membership-sha256 <64hex> \
  --registry 0x... \
  --publisher 0x... \
  --confirmation importReviewedRealFinalizedStateRootMembershipV1
```

A plan is content-addressed for integrity, but its self-hash is **not semantic authority**. Verify-applied therefore:

1. reopens the plan's exact base commit/tree in a private detached Git view;
2. re-executes merged #2260 from the exact public-read evidence, finalized-membership bytes, evaluation time, registry, publisher, and review confirmation;
3. requires the rederived composition receipt, composition ID, state-root promotion ID, and final successor candidate to equal the plan exactly;
4. only then checks that canonical current `main` contains that exact target successor blob and that the application/composition/classifier source lineage has not drifted.

A caller-created self-consistent plan cannot substitute for the upstream semantic evidence.

## Evidence size boundary

The finalized membership input is bounded to 1 MiB, matching the canonical #2193/#2260 state-root import path. The application layer cannot widen that ceiling.

## Authority

This lane is repository-source preparation and verification only.

It performs no canonical source write, service/runtime mutation, production RPC call, network call for economic execution, credential/key/wallet/signer access, transaction construction/signing/submission/broadcast, Chain-2050 write, validator/governance/WC mutation, migration activation, public activation, token movement, or funds movement.

A green prepare result is not an applied source change. A green verify-applied result is still only `SOURCE_READY` source truth; it is not runtime activation.
