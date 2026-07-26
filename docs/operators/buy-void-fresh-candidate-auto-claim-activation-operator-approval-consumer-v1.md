# Buy VOID fresh-candidate activation operator approval consumer V1

## Purpose

This lane consumes one exact, private, short-lived operator approval envelope
and delegates the already sealed activation ceremony at most once.

The lane closes the handoff between operator approval and the ceremony without
granting standing authority or automatic retry.

## Execution authority

Execution requires all of the following:

- exactly one approval envelope in the private approval directory;
- a valid, unexpired approval fingerprint;
- exact binding to the current admission packet, activation plan, alert,
  persistent disabled config, and four release commits;
- `--execute`;
- confirmation
  `buyVoidConsumeFreshCandidateAutoClaimActivationOperatorApprovalOneShot`.

Without all requirements, the consumer remains `waiting`, `ready`, or `held`.

## One-shot consumption

Before any ceremony process is spawned, the consumer creates an exclusive
mode-`0600` consumption-intent file inside a mode-`0700` state directory.

The intent is the no-retry boundary. If execution is interrupted after intent
creation, a human recovery review is required. The consumer never retries
automatically.

After the single ceremony invocation returns, it writes one exclusive
consumption-result file. The original approval envelope is not modified.

## Delegated authority

The consumer has no direct RPC, claim, wallet, signing, transaction-broadcast,
or money-movement implementation.

A confirmed live invocation may delegate one ceremony invocation. The sealed
ceremony may then delegate one credential issuance, one credential-runner
execution, and one duplicate-safe claimant attempt under their existing
separate guards and bindings.

## Persistent authority boundary

The consumer does not:

- modify the persistent Buy VOID config;
- write the public request journal;
- reserve or decrement inventory directly;
- install or change systemd;
- restart a service;
- perform automatic retry.

Production remains disabled outside the bounded ephemeral executor chain.
