# Buy VOID fresh-candidate activation operator approval envelope V1

## Purpose

This lane converts one exact admitted activation packet into a private,
short-lived operator approval envelope.

It formalizes the operator decision without executing the activation ceremony.

## Approval authority

Creating an envelope requires both:

- `--approve`;
- confirmation
  `buyVoidApproveFreshCandidateAutoClaimActivationOneShot`.

Without both inputs, the tool remains dry and writes no approval file.

## Exact binding

The envelope binds:

- the complete admission-packet SHA-256;
- the request ID;
- source-plan, activation-plan, and alert fingerprints;
- the persistent disabled-config SHA-256;
- the ceremony, issuer, runner, and executor release commits;
- a lifetime no longer than 15 minutes;
- maximum one ceremony, issuer, and runner invocation.

## Private one-shot artifact

The approval directory is mode `0700`. The approval file is created
exclusively with mode `0600` and cannot overwrite an existing approval for the
same admission packet.

The file itself is the bounded approval capability. Its contents are never
printed by the CLI.

## Authority boundary

This lane does not:

- spawn a process or invoke the ceremony;
- issue or consume a credential;
- call an RPC endpoint;
- write persistent config, claim, request, or inventory state;
- change systemd or restart a service;
- access a wallet;
- sign or broadcast a transaction;
- move money.

A later consumption lane must verify expiry, exact bindings, one-use
consumption, and the separately required issuer and execution confirmations.
