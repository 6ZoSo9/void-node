# Buy VOID fresh-candidate auto-claim activation credential issuer V1

## Purpose

This lane creates the private, short-lived capability document accepted by the
activation credential runner.

The issuer binds one credential to:

- one request;
- one source-plan fingerprint;
- one activation-plan fingerprint;
- one candidate-alert fingerprint;
- one immutable executor release commit;
- one persistent disabled-config hash;
- one issue and expiration window;
- one executor invocation maximum.

## Issuance boundary

Issuance requires both:

- `--issue`;
- `buyVoidIssueFreshCandidateAutoClaimCredentialOneShot`.

The maximum lifetime is 15 minutes. The credential file is stored with mode
`0600` inside a mode-`0700` directory. The filename is keyed by the activation
plan fingerprint and is created with exclusive `wx` semantics, so V1 will not
overwrite or issue a second credential for the same activation plan.

The credential body is never printed.

## Authority

Issuance writes only the private credential file. It does not:

- invoke the credential runner or one-shot executor;
- call Base RPC;
- write a claim or request journal;
- reserve or decrement inventory;
- change systemd or restart services;
- access a wallet;
- sign or broadcast;
- move VOID.

## Production status

This source lane does not issue a credential. The production rehearsal uses the
current `waiting` plan and creates no file.
