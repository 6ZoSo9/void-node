# Buy VOID fresh-candidate activation operator console V1

## Purpose

This is the single bounded operator surface for the already sealed
fresh-candidate activation stack.

It composes:

1. the read-only admission packet;
2. the private short-lived operator approval envelope;
3. the one-shot approval consumer;
4. the sealed ceremony, issuer, runner, executor, and claimant chain.

## Dry by default

When the activation planner is `waiting`, the console invokes no child process.

When a plan is ready, the console remains read-only unless every live input is
present.

## Live authority

A live invocation requires:

- one exact planned request;
- the exact candidate alert;
- `--activate`;
- operator approval confirmation
  `buyVoidApproveFreshCandidateAutoClaimActivationOneShot`;
- consumer confirmation
  `buyVoidConsumeFreshCandidateAutoClaimActivationOperatorApprovalOneShot`.

The issuer and execution confirmations remain separately bound inside the
approval envelope and are verified by the consumer and ceremony.

## Invocation bounds

A live console run permits at most:

- one admission-packet invocation;
- one approval-envelope invocation;
- one approval-consumer invocation;
- through the consumer, one ceremony invocation.

No component retries automatically.

## Authority boundary

The console has no direct RPC, claim, wallet, signing, transaction-broadcast,
native-delivery, or money-movement implementation.

It does not modify persistent Buy VOID config, the public request journal, or
inventory directly. Production remains disabled outside the bounded ephemeral
executor path.

## Recovery rule

If any child fails, the console stops. It does not retry or delete one-shot
intent, approval, credential, or result state. Human recovery review is
required before another attempt.
