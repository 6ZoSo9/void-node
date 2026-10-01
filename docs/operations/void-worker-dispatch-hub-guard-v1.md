# VOID Worker Dispatch Hub Guard V1

Marker: `VOID_WORKER_DISPATCH_HUB_GUARD_V1`

## Purpose

The successor-chain resolver and live-dispatch evaluator answer different questions:

- `VOID_COORDINATION_SUCCESSOR_CHAIN_V1` identifies the structurally valid current coordination hub and whether rotation is overdue.
- `VOID_WORKER_LIVE_DISPATCH_V1` produces one bounded dispatch recommendation for each scheduled worker from a specific `plan_issue`.

Neither artifact alone proves that the dispatch plan is using the current coordination hub. This guard composes both artifacts and makes that relationship fail-closed.

It is evidence-only. A green/aligned result means the dispatch artifact references the same valid current hub resolved by the successor chain. It does **not** grant source, runtime, scheduler, issue, merge, deployment, transaction, or financial authority.

## Inputs

Read one JSON object from standard input. The operational CLI requires authenticated/read-capable `gh api` access because it independently re-resolves the chain before producing output:

```json
{
  "marker": "VOID_WORKER_DISPATCH_HUB_GUARD_EVIDENCE_V1",
  "version": 1,
  "chain": { "...": "VOID_COORDINATION_SUCCESSOR_CHAIN_V1 output" },
  "dispatch": { "...": "VOID_WORKER_LIVE_DISPATCH_V1 output" },
  "dispatch_evidence": {
    "...": "exact VOID_WORKER_LIVE_DISPATCH_EVIDENCE_V1 input used to derive dispatch"
  }
}
```

The guard validates the relevant V1 markers, repository identity, plan/current issue relationship, content-addressed dispatch evaluation identity, the dispatch `evaluated_at` / 30-minute `next_reevaluation_at` window, and the negative authority fields of both upstream artifacts.

For operational CLI use, the repository is pinned to canonical `6ZoSo9/void-node`. Before policy replay, the guard performs a noninteractive read-only `git ls-remote --heads https://github.com/6ZoSo9/void-node.git refs/heads/main` with a 15-second timeout, requires exactly one well-formed lowercase SHA-1 record, and requires the local reviewed `HEAD` commit to equal that live canonical-main SHA. The canonical remote query runs outside the repository working directory with repository/global/system Git-config influence disabled, Git config injection variables removed, a fixed system Git/PATH, and TLS verification forced on, so `url.*.insteadOf` or local/global config cannot silently redirect the canonical URL. It then loads the dispatch policy from that exact live-main commit object, not from an unverified local branch tip. After dispatch re-evaluation and live successor-chain resolution, the guard queries canonical main again and requires the final SHA to equal the initial SHA; a main change anywhere inside the evaluation window therefore fails closed. No fetch, checkout, reset, or ref mutation is performed.

After the main-generation gate, the operational CLI runs the merged `resolveCoordinationSuccessorChainLiveV1(...)` and requires canonical JSON equality with the supplied chain artifact. It re-runs `evaluateWorkerLiveDispatchV1(...)` against the supplied `dispatch_evidence` packet and requires canonical JSON equality with the supplied dispatch artifact. The dispatch `evaluation_id` is independently recomputed from the dispatch body. A stale local checkout, chain change, stale predecessor policy, modified dispatch body, or fabricated successor-aligned dispatch therefore fails closed.

The exported `evaluateWorkerDispatchHubGuardV1(...)` function is deliberately retained-evidence-only. It accepts exactly the evidence object and cannot accept caller-supplied live-chain, live-dispatch, or reviewed-main claims. Supplying a second argument is rejected. The module's liveness-capable evaluator and its `Symbol` capability are private and are used only by the operational CLI after the canonical live checks above have completed.

## Outcomes

### `DISPATCH_HUB_ALIGNED`

This outcome is operational-CLI-only. The exported pure evaluator cannot produce it.

Requires all of the following:

- successor chain is structurally valid;
- chain outcome is not `ROTATION_REQUIRED`;
- the chain identifies a non-null `dispatch_plan_issue_should_be`;
- `dispatch.plan_issue` equals that exact issue;
- the supplied successor-chain artifact has just been re-resolved from live GitHub and is byte-semantically identical to that fresh resolution;
- local `HEAD` has been proved equal to the freshly queried canonical public `main` SHA;
- the dispatch policy loaded from that exact live-main commit has freshly re-evaluated the supplied worker-evidence packet; and
- the supplied dispatch is byte-semantically identical to that fresh dispatch evaluation.

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

### `HOLD_DISPATCH_EVIDENCE_EXPIRED`

A live-dispatch output is only current until its declared 30-minute reevaluation deadline. Even with a matching fresh hub, an expired dispatch artifact cannot unlock normal dispatch and must be regenerated from fresh worker/collision evidence.

### `HOLD_CHAIN_LIVENESS_UNPROVEN`

Structurally aligned retained artifacts are not enough to unlock normal dispatch. The exported pure evaluator returns this HOLD for an otherwise-current retained packet because it has no liveness capability. Callers cannot supply or synthesize that capability. This prevents an old pre-threshold `CURRENT` chain artifact from remaining usable after new coordination comments push the live hub across the rotation boundary.

### `HOLD_DISPATCH_LIVENESS_UNPROVEN`

Even a structurally valid, unexpired dispatch cannot unlock normal routing unless the operational CLI has just re-evaluated it from the reviewed dispatch policy and the supplied `dispatch_evidence` packet. The private live capability is not exported, so a library caller cannot turn retained dispatch equality into liveness authority.

### `HOLD_MAIN_PROVENANCE_UNPROVEN`

A caller cannot unlock aligned routing by supplying a SHA-shaped value or matching chain/dispatch objects. Operational use must prove that the local reviewed `HEAD` equals a fresh canonical public `main` query and replay policy from that exact commit. The exported pure evaluator accepts no reviewed-main liveness argument.

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
  --slurpfile dispatch_evidence /path/to/live-worker-evidence.json \
  '{
    marker: "VOID_WORKER_DISPATCH_HUB_GUARD_EVIDENCE_V1",
    version: 1,
    chain: $chain[0],
    dispatch: $dispatch[0],
    dispatch_evidence: $dispatch_evidence[0]
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

Exit status is `0` only for `DISPATCH_HUB_ALIGNED`, `3` for a valid read-only HOLD outcome, and `2` for malformed/inconsistent evidence or a supplied chain that no longer equals the fresh live resolution.

## Proof

```bash
node scripts/prove_void_worker_dispatch_hub_guard_v1.mjs
```

The proof covers retained current-hub HOLD, expired-dispatch HOLD, exact 30-minute dispatch-window validation, rotation-required HOLD, stale-predecessor HOLD, retained successor HOLD, invalid-chain HOLD, live-chain mismatch rejection, exact dispatch content-ID rederivation, canonical repository pinning, fresh live-dispatch mismatch rejection, authority escalation, and deterministic guard identity. It explicitly replays the old bypass attempt—supplying retained chain/dispatch objects plus an arbitrary 40-hex reviewed-main SHA—and requires rejection. It also proves that the module-private live capability and liveness-capable evaluator are not exported and that only the operational `main()` path calls the private evaluator. The canonical Git URL/main parser and isolated Git environment remain independently covered. The focused workflow is triggered by changes to either upstream tool or that policy so interface drift cannot silently bypass composition proof.

## Relationship to #2258

This guard is the safe pre-rotation composition layer. It does not change the checked-in live-dispatch `plan_issue`. Once Ada creates the exact #1507 successor, #2258 remains responsible for rebinding live routing metadata to the resolved successor generation and proving stale predecessor policy cannot be treated as fresh.

## Authority boundary

No issue creation/comment/close, scheduler invocation or cadence mutation, source mutation authorization, branch/worktree mutation, Ready/merge action, deployment, runtime/network action, credential/key/wallet/signer access, transaction construction/signing/submission, validator or Work Credit mutation, treasury/liquidity action, or funds movement is authorized by this guard.
