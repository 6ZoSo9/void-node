# Buy VOID fresh-candidate auto-claim activation admission packet V1

## Purpose

This lane produces a read-only operator-review packet before any activation
ceremony can be authorized.

The packet binds:

- one exact planned request;
- the source plan fingerprint;
- the activation-plan fingerprint;
- the exact candidate alert fingerprint;
- the persistent disabled-config SHA-256;
- the immutable ceremony, issuer, runner, and executor release commits.

## Statuses

`waiting` means no exact candidate is currently planned.

`admitted` means all read-only bindings are exact and the packet is ready for
operator review. It does not mean activation has occurred.

`held` means one or more required bindings failed.

## Operator authority

An admitted packet states the two confirmations required by the ceremony:

- the sealed issuer confirmation;
- the sealed execution confirmation.

The packet never supplies `--activate`, invokes the ceremony, creates a
credential, or consumes a credential.

## Authority boundary

The packet generator:

- spawns no process;
- performs no RPC call;
- writes no persistent config, claim, request, or inventory state;
- changes no systemd unit or service;
- accesses no wallet;
- signs or broadcasts no transaction;
- moves no money.

Its only optional write is the requested result JSON.
