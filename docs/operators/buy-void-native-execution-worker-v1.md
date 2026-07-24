# Buy VOID Native Execution Worker V1

## Purpose

This worker is the first bounded component that can turn a committed Buy VOID
inventory reservation and execution-attempt reservation into a native chain
2050 signing and broadcast attempt.

It is source-only and not mounted or started by this lane.

## Required inputs

The caller supplies server-controlled objects and policy:

- the claimed fulfillment intent;
- the committed bounded execution plan;
- the exact execution-attempt and inventory journals under one root;
- a fixed native VOID transaction plan;
- an injected fulfillment signer;
- an injected chain-2050 broadcaster;
- a 64-character submission idempotency key.

The buyer cannot supply a private key, mnemonic, RPC URL, raw signed
transaction, wallet policy, journal root, or broadcaster configuration through
this module.

## Dry run

Dry run is the default. It verifies all bindings and returns the native
transaction preview without calling the signer, broadcaster, or journals.

## Apply wall

Apply requires the exact confirmation:

`buyVoidNativeExecuteReservedPlan`

Apply performs, in order:

1. validates the inventory reservation, bounded plan, fulfillment intent, and
   reserved execution attempt;
2. reads and verifies the injected signer address;
3. signs one native type-2 chain-2050 transaction in memory;
4. validates the signed transaction against every bound field;
5. prepares the existing execution-attempt journal with the derived hash;
6. claims the durable submission guard;
7. calls the existing native sign/broadcast adapter using an in-memory replay
   signer so the underlying credential signs only once;
8. records accepted, unknown, or definitive-not-broadcast outcomes through the
   existing pipeline coordinator;
9. clears the in-memory raw signed transaction reference.

## Safety boundary

- one request per invocation;
- disabled by policy default;
- no automatic retry;
- no receipt wait;
- no raw signed transaction persistence or output;
- no public request-journal write;
- no inventory decrement or release;
- no runtime route;
- no background loop or startup execution;
- no service, Tailscale, remote-machine, or Nimo changes.

When fully applied with real injected dependencies, this worker has wallet,
signing, transaction-broadcast, and money-movement authority for exactly one
validated reservation and transaction plan. It remains inactive until a later
runtime activation lane explicitly configures and calls it.

## Remaining path to paid fulfillment

After this source lane is merged, the remaining work is:

1. bind server-controlled fee/nonce planning to the live chain-2050 RPC;
2. connect the existing systemd credential signer and loopback broadcaster;
3. add receipt reconciliation and confirmation processing;
4. decrement committed inventory only after confirmed delivery;
5. update the public request journal and buyer-visible status;
6. deploy disabled and execute one bounded live purchase canary;
7. activate the one-request worker under strict operational caps.
