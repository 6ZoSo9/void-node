# Buy VOID fresh-candidate auto-claim one-shot executor V1

## Purpose

This lane executes one activation plan by creating a private ephemeral copy of
the disabled production config, enabling only the three claim gates inside that
copy, invoking the merged claimant exactly once, and deleting the ephemeral
config in a `finally` boundary.

The persistent production config is never rewritten.

## Preconditions

- current activation plan is `planned`;
- the plan permits exactly one claim;
- the alert matches the plan request and source-plan fingerprint;
- the persistent config remains disabled at the top-level, worker, and
  automatic-fulfillment gates;
- apply uses `buyVoidExecuteFreshCandidateAutoClaimOneShot`.

## One-shot authority

The only possible economic mutation is the existing duplicate-safe fulfillment
claim journal written by the merged claimant.

The executor has no authority to:

- rewrite or delete the persistent config;
- retry automatically;
- change systemd or restart a service;
- write the public request journal;
- reserve or decrement inventory;
- access a wallet;
- sign or broadcast;
- move VOID.

## Production status

This source lane does not install or run the executor. Production remains in
`waiting` state until a separately sealed exact-one candidate exists.
