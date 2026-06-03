# GitHub branch cleanup current status

status: green
date: 2026-06-03
cleanup_type: remote_branch_hygiene
archive_prefix: archive/branch-cleanup-20260603-071740
source_cleanup_log: /tmp/void-archive-unmerged-branches-20260603-071740.log

## Result

GitHub remote branch bloat was cleaned.

Remote branches other than `origin/main`: 0.

The unmerged branch tips were preserved before deletion as archive tags under:

```
archive/branch-cleanup-20260603-071740/*
```

## Archived branch heads

Expected archived branch tags: 13.

- archive/branch-cleanup-20260603-071740/feat/agents-v0
- archive/branch-cleanup-20260603-071740/feat/mainnet-core-20251120
- archive/branch-cleanup-20260603-071740/feat/node-user-units-20251109-084419
- archive/branch-cleanup-20260603-071740/feat/ops-proposer-kickbrake-20251109-084114
- archive/branch-cleanup-20260603-071740/feat/p2p-metrics-step-001
- archive/branch-cleanup-20260603-071740/feat/safeboot-canary-20251110-151531
- archive/branch-cleanup-20260603-071740/feat/wal-v1-mount
- archive/branch-cleanup-20260603-071740/new-main-2025-10-29
- archive/branch-cleanup-20260603-071740/public-sync-20251110-180841
- archive/branch-cleanup-20260603-071740/restore-2025-10-28-before-rewrite-20251029-165712
- archive/branch-cleanup-20260603-071740/txrestore-work
- archive/branch-cleanup-20260603-071740/wip/maxstack-1762378033
- archive/branch-cleanup-20260603-071740/z_golden_2025-11-06_agent-allow-receipts

## Safety

- Branch cleanup did not mutate chain/runtime state.
- Branch cleanup did not perform Buy VOID fulfillment.
- Branch cleanup did not perform validator mutation.
- Branch cleanup preserved recoverability through archive tags before deleting remote branch refs.

## Current runtime expectation

The local node must remain:

- ready: true
- gap: 0
- txroot_live: 1
