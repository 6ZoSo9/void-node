# VOID PR Exact-Head Actions Settlement Audit V1

## Purpose

VOID pull requests fan out across many GitHub Actions workflows. Manually polling
those runs is repetitive and error-prone, especially when the same workflow has
multiple runs for the same commit or a GitHub policy state such as
`action_required` creates no jobs at all.

This lane adds a read-only exact-head settlement audit. It answers:

> For one exact open PR head, are the **latest observed pull-request runs** for
> every observed workflow ID complete and successful?

It does not rerun workflows, approve Actions, change pull requests, or claim that
the repository's configured workflow set is complete.

## Exact-head binding

The audit reads the current open same-repository PR and binds its exact head SHA.
An optional `--expected-head` pin fails closed when the PR moved.

It then queries GitHub Actions only for:

- that exact `head_sha`; and
- `event=pull_request`.

Every returned run is independently required to carry the same head SHA and
`pull_request` event.

## Latest-run rule

Runs are grouped by immutable GitHub `workflow_id` rather than display name.
For each workflow, the latest run is selected by:

1. highest `run_number`;
2. then highest `run_attempt`;
3. then latest `updated_at`;
4. then run ID as a final deterministic tie-break.

Older runs remain counted as superseded evidence, but cannot override the latest
state. Therefore:

- old green + latest pending => pending;
- old green + latest failure => blocked;
- old failure + latest success => green.

## Settlement classification

Only `status=completed` plus `conclusion=success` is green.

Known nonterminal states (`requested`, `queued`, `pending`, `waiting`, and
`in_progress`) are pending.

The following completed conclusions are fail-closed blockers:

- `failure`
- `cancelled`
- `timed_out`
- `action_required`
- `startup_failure`
- `stale`
- `neutral`
- `skipped`

Unknown statuses/conclusions and completed runs without a conclusion also block.
This intentionally catches `action_required` runs that may contain zero jobs.

## Decisions

### `EXACT_HEAD_ACTIONS_SETTLED_GREEN`

Every latest observed workflow is completed/success, the exact-head binding
holds, and the minimum workflow floor is met.

### `EXACT_HEAD_ACTIONS_PENDING`

At least one latest observed workflow is still nonterminal and no stronger
blocker exists.

### `EXACT_HEAD_ACTIONS_FAILED_OR_BLOCKED`

Any latest workflow failed/blocked, the expected head mismatched, or fewer than
the requested minimum distinct workflow IDs were observed.

V1 defaults to a minimum of one workflow. Operators can use a higher floor when
they have a known lower bound. This audit does **not** prove that every workflow
that should exist is configured or was triggered; it proves settlement only for
the exact-head workflow runs GitHub returned.

## Why there is no pull-request self-audit

The workflow runs the pure proof on pull requests, but does not audit its own PR
settlement from inside the same run. Doing so would create a false perpetual
pending state because the settlement workflow itself would still be running.

The real settlement command is exposed through `workflow_dispatch` after this
capability reaches a branch where dispatch is available. A dispatch run queries
only `event=pull_request`, so the dispatch run cannot contaminate the result it
is measuring.

## Output

The create-only `0600` JSON evidence contains:

- exact PR/head binding;
- total observed runs;
- distinct observed workflow count;
- superseded run count;
- latest selected run for every workflow ID;
- green/pending/blocked counts and rows;
- decision/reasons; and
- explicit no-mutation authority flags.

## Authority boundary

Permissions are read-only:

- `actions: read`
- `contents: read`
- `pull-requests: read`

The tool reads PR and Actions metadata only. It does not read workflow job logs,
rereun jobs, approve Actions, mutate Git, update a PR, deploy/restart anything,
access wallet/signer/private-key material, create/broadcast a transaction, or
move funds.

A green settlement is point-in-time evidence only. Ready-for-review, merge,
reconciliation, deployment, runtime actions, and economic actions remain
separate authorization gates.
