# Buy VOID fresh-candidate auto-claim activation credential runner V1

## Purpose

This lane adds the one-use capability boundary between an exact activation plan
and the merged one-shot executor.

A credential is not a private key. It is a short-lived authority document that
binds:

- one request;
- one activation-plan fingerprint;
- one candidate-alert fingerprint;
- one immutable executor release commit;
- one persistent disabled-config hash;
- one issue and expiration window;
- one maximum executor invocation.

## Execution boundary

The runner writes an exclusive operator-local consumption intent before calling
the one-shot executor. A credential that is already consumed or inflight cannot
run again.

The maximum credential lifetime is 15 minutes. The runner never retries
automatically.

## Authority

A valid credential may authorize:

- one Base RPC read through the existing claimant;
- one duplicate-safe fulfillment claim-journal write.

It never authorizes:

- rewriting the persistent config;
- writing the public request journal;
- reserving or decrementing inventory;
- changing systemd or restarting services;
- accessing a wallet;
- signing or broadcasting;
- moving VOID.

## Production status

This source lane does not create a credential, consume a credential, install a
service, or invoke the executor. Current production remains `waiting`.
