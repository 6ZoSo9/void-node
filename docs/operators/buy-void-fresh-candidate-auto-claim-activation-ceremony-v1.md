# Buy VOID fresh-candidate auto-claim activation ceremony V1

## Purpose

This lane connects the sealed activation credential issuer to the sealed
credential runner for one exact Buy VOID claim candidate.

The ceremony is dry by default. It reports `waiting` when no candidate exists
and `ready` when an exact plan and alert bind but activation authority has not
been supplied.

## Activation authority

A live ceremony requires all three inputs:

- `--activate`;
- issuance confirmation
  `buyVoidIssueFreshCandidateAutoClaimCredentialOneShot`;
- execution confirmation
  `buyVoidExecuteFreshCandidateAutoClaimActivationCeremonyOneShot`.

The confirmations are distinct. Issuance authority alone cannot execute, and
execution authority alone cannot create a credential.

## One-shot sequence

After exact validation, the ceremony:

1. invokes the credential issuer once;
2. requires one private mode-`0600` credential;
3. invokes the credential runner once with `--execute`;
4. requires a terminal `claimed` or duplicate-safe `duplicate` result;
5. performs no retry.

The runner preserves the existing consumption-intent-before-execution rule and
delegates at most one one-shot executor invocation.

## Authority boundary

The ceremony may delegate one Base payment RPC read and one duplicate-safe claim
journal write through the sealed runner/executor/claimant chain.

The ceremony does not:

- write the persistent config;
- write the request journal;
- reserve or decrement inventory;
- install or modify systemd units;
- restart services;
- access a wallet;
- sign or broadcast a native transaction;
- deliver VOID or move money.

## Production status

This source lane does not activate a candidate. Its production rehearsal uses
the current `waiting` plan, invokes no child process, creates no credential, and
does not change production state.
