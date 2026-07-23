# VOID Cross-Chat Lane Audit v1

This read-only control audits a standalone development lane against the shared VOID Network repository, all linked worktrees, open pull requests, and active repository processes.

## Purpose

A green result means the lane is using its exact standalone branch and repository, its remote-main reference is current, its dirty files are confined to its reserved paths, no shared worktree or open pull request owns those paths, and repeated process scans found no unapproved Git-capable worker.

It is a collision-prevention check, not a distributed lock. Run it directly before edits, commits, pushes, rebases, or merges.

## Reserved paths

- `tools/void_cross_chat_lane_audit_v1.mjs`
- `scripts/prove_void_cross_chat_lane_audit_v1.ts`
- `docs/operators/void-cross-chat-lane-audit-v1.md`

## Live invocation

```bash
cd "$HOME/dev/void-node-cross-chat-lane-audit-standalone-v1" || exit 1

node tools/void_cross_chat_lane_audit_v1.mjs \
  --shared-repo "$HOME/dev/void-node" \
  --lane-repo "$HOME/dev/void-node-cross-chat-lane-audit-standalone-v1" \
  --lane-branch parallel/cross-chat-lane-audit-standalone-v1 \
  --reserve tools/void_cross_chat_lane_audit_v1.mjs \
  --reserve scripts/prove_void_cross_chat_lane_audit_v1.ts \
  --reserve docs/operators/void-cross-chat-lane-audit-v1.md \
  --allow-runtime-script ops/wc-relayer-v1.cjs \
  --allow-runtime-script ops/void-workcredits-devnet-http.cjs
```

Success:

```text
VOID_CROSS_CHAT_LANE_AUDIT_V1_EXACT_GREEN
```

Any collision, stale remote state, incomplete inspection, or unknown process exits nonzero:

```text
VOID_CROSS_CHAT_LANE_AUDIT_V1_HOLD
```

## Deterministic proof

```bash
node --experimental-strip-types scripts/prove_void_cross_chat_lane_audit_v1.ts
```

The fixture proof covers one green case and six HOLD cases: shared-worktree overlap, pull-request overlap, stale remote main, a conflicting process, a dirty path outside the reservation, and a lane-branch mismatch.

## Mutation boundary

The auditor never fetches, edits, stages, commits, pushes, creates or updates pull requests, restarts services, writes runtime configuration, changes ledgers, registers validators, or mutates the active validator set.

Runtime allowlisting is exact. An allowed daemon must use `/usr/bin/node`, match one exact script path, run from the shared repository, have no children, be older than 120 seconds, be in a non-zombie state, and hold zero descriptors into either Git metadata directory.
