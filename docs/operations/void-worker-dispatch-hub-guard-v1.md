# VOID Worker Dispatch Hub Guard V1

Marker: `VOID_WORKER_DISPATCH_HUB_GUARD_V1`

## Purpose

The successor-chain resolver and live-dispatch evaluator answer different questions:

- `VOID_COORDINATION_SUCCESSOR_CHAIN_V1` identifies the structurally valid current coordination hub and whether rotation is overdue.
- `VOID_WORKER_LIVE_DISPATCH_V1` produces one bounded dispatch recommendation for each scheduled worker from a specific `plan_issue`.

Neither artifact alone proves that the dispatch plan is using the current coordination hub. This guard composes both artifacts and makes that relationship fail-closed.

It is evidence-only. A green/aligned result means the dispatch artifact references the same valid current hub resolved by the successor chain. It does **not** grant source, runtime, scheduler, issue, merge, deployment, transaction, or financial authority.

## Inputs

Read one JSON object from standard input:

```json
{
  "marker": "VOID_WORKER_DISPATCH_HUB_GUARD_EVIDENCE_V1",
  "version": 1,
  "chain": { "...": "VOID_COORDINATION_SUCCESSOR_CHAIN_V1 output" },
  "dispatch": { "...": "VOID_WORKER_LIVE_DISPATCH_V1 output" }
}
```

The guard validates the relevant V1 markers, repository identity, plan/current issue relationship, content-addressed dispatch evaluation identity, and the negative authority fields of both upstream artifacts.

## Outcomes

### `DISPATCH_HUB_ALIGNED`

Requires all of the following:

- successor chain is structurally valid;
- chain outcome is not `ROTATION_REQUIRED`;
- the chain identifies a non-null `dispatch_plan_issue_should_be`;
- `dispatch.plan_issue` equals that exact issue.

`normal_dispatch_allowed=true` means only that normal live-dispatch interpretation may continue under its existing separate authority and collision gates.

The guard still emits:

```text
source_mutation_authorized=false
runtime_mutation_authorized=false
scheduler_mutation_authorized=false
automatic_merge_authorized=false
authority_granted=false
mutation_performed=false
```

### `HOLD_ROTATION_REQUIRED`

The current hub is still structurally valid but has reached or exceeded the control-plane rotation boundary without a successor. Only read-only coordination/evidence refresh should proceed until the designated rollover writer establishes the successor.

This is the current expected outcome while #1507 remains open beyond its 250-total-message boundary with no successor pointer.

### `HOLD_PLAN_ISSUE_MISMATCH`

The chain has resolved a current hub but the live-dispatch artifact still references a different issue, including the common stale-predecessor case immediately after rotation.

### `HOLD_INVALID_SUCCESSOR_CHAIN`

The upstream chain is structurally invalid. Invalid chains suppress dispatch-plan issue output and cannot become routing authority.

## Run

```bash
jq -n \
  --slurpfile chain /path/to/successor-chain.json \
  --slurpfile dispatch /path/to/live-dispatch.json \
  '{
    marker: "VOID_WORKER_DISPATCH_HUB_GUARD_EVIDENCE_V1",
    version: 1,
    chain: $chain[0],
    dispatch: $dispatch[0]
  }' |
node tools/void-worker-dispatch-hub-guard-v1.mjs --pretty
```

Optional create-only output:

```bash
... |
node tools/void-worker-dispatch-hub-guard-v1.mjs \
  --output "$HOME/Downloads/void-worker-dispatch-hub-guard-v1.json" \
  --pretty
```

Input is bounded to 2 MiB. Output files are create-only and mode `0600`.

Exit status is `0` only for `DISPATCH_HUB_ALIGNED`, `3` for a valid read-only HOLD outcome, and `2` for malformed/inconsistent evidence.

## Proof

```bash
node scripts/prove_void_worker_dispatch_hub_guard_v1.mjs
```

The proof covers current-hub alignment, rotation-required HOLD, stale-predecessor HOLD, resolved-successor alignment, invalid-chain HOLD, repository mismatch, authority escalation, and deterministic guard identity. It also imports the upstream successor-chain and live-dispatch marker exports, and the focused workflow is triggered by changes to either upstream tool so interface drift cannot silently bypass this proof.

## Relationship to #2258

This guard is the safe pre-rotation composition layer. It does not change the checked-in live-dispatch `plan_issue`. Once Ada creates the exact #1507 successor, #2258 remains responsible for rebinding live routing metadata to the resolved successor generation and proving stale predecessor policy cannot be treated as fresh.

## Authority boundary

No issue creation/comment/close, scheduler invocation or cadence mutation, source mutation authorization, branch/worktree mutation, Ready/merge action, deployment, runtime/network action, credential/key/wallet/signer access, transaction construction/signing/submission, validator or Work Credit mutation, treasury/liquidity action, or funds movement is authorized by this guard.
