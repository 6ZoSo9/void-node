# VOID Coordination Successor Chain V1

Marker: `VOID_COORDINATION_SUCCESSOR_CHAIN_V1`

## Purpose

The coordination control plane rotates through issue successors rather than treating one historical issue number as permanent scheduler truth. This read-only resolver starts at the canonical root issue, follows only exact reviewed successor pointers, and reports the current terminal hub or an explicit rotation requirement.

The standing control-plane contract uses a natural rotation boundary of **250 total issue messages** (`issue body + comments`) and designates **Ada** as the single rollover writer. This resolver does not create, comment on, close, lock, or otherwise mutate issues; it only makes the chain state machine-readable.

## Exact successor contract

A predecessor successor pointer is recognized only when one comment contains the exact trimmed pointer line plus a rotation-marker line. The marker may be plain text or a Markdown heading, matching historical repository style:

```text
COORDINATION_SUCCESSOR=#<positive issue number>
CONTROL-PLANE ROTATION
```

The resolver rejects multiple pointers, self-pointers, cycles, pull-request targets masquerading as issues, duplicate comment IDs, incomplete comment capture, and chains where a predecessor has a successor pointer but remains open. The final resolved issue must be open. An invalid chain emits `dispatch_plan_issue_should_be=null` and cannot request a plan-issue update.

The issue body is deliberately not scanned for a successor pointer because the control-plane body documents example syntax and historical rules; only comments are eligible live pointer evidence.

## Outcomes

- `CURRENT`: the root issue remains the current open hub and is below the 250-message boundary.
- `ROTATION_REQUIRED`: the current open terminal hub has reached or exceeded 250 total issue messages and has no successor pointer. `rotation_writer_worker_id=ada` identifies the existing rollover owner, but the resolver grants no mutation authority.
- `SUCCESSOR_RESOLVED`: one or more valid closed predecessors point to an open current successor. `dispatch_plan_issue_should_be` is the issue workers should use for live coordination.
- `HOLD_INVALID_SUCCESSOR_CHAIN`: pointer/state relationships are inconsistent even though the individual records were parseable.

Malformed or incomplete GitHub evidence fails closed with exit status `2`. A structurally invalid resolved chain exits `3`. `CURRENT`, `ROTATION_REQUIRED`, and `SUCCESSOR_RESOLVED` are valid observations and exit `0`.

## Live use

```bash
node tools/void-coordination-successor-chain-v1.mjs \
  --repository 6ZoSo9/void-node \
  --root-issue 1507
```

Optional create-only evidence output:

```bash
node tools/void-coordination-successor-chain-v1.mjs \
  --repository 6ZoSo9/void-node \
  --root-issue 1507 \
  --output "$HOME/Downloads/void-coordination-successor-chain-v1.json"
```

The live command uses authenticated `gh api` reads. For each issue it captures the issue metadata, paginates every comment, then rereads the issue and refuses the capture if issue state/comment count/update identity changed during collection. The captured comment count must exactly equal GitHub's issue comment count.

## Current observed boundary

During 2026-10-01 PR preparation, read-only inspection of #1507 already found the hub beyond the 250-message boundary with no exact successor/rotation pointer. The comment count continued to increase while this branch was being built, so this contract deliberately does not freeze a volatile count: any open terminal hub with at least 250 total issue messages and no successor pointer is `ROTATION_REQUIRED`. This document does not itself perform the rotation.

## Deterministic proof

```bash
node scripts/prove_void_coordination_successor_chain_v1.mjs
```

The proof locks the 249-comment/250-message threshold, current 278-message classification shape, valid successor traversal, predecessor-close requirement, complete comment capture, ambiguity rejection, self-pointer rejection, and cycle rejection.

## Authority boundary

This resolver is evidence-only. It grants no issue creation/close authority, scheduler mutation, source mutation, merge, deployment, runtime/network action, credential/key/wallet/signer access, transaction authority, validator or Work Credit mutation, treasury/liquidity action, or funds movement.
