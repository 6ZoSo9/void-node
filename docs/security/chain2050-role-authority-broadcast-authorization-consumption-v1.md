# Chain-2050 role-authority single-transaction broadcast authorization and consumption v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_BROADCAST_AUTHORIZATION_CONSUMPTION_V1`

## Exact Sovereign authorization

The Sovereign explicitly authorized exact broadcast request:

`voidcrabr1_661c57638e7c9904df997da50841811f509239495891a965aebd46fece405a51`

bound to signed transaction:

`0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4`

and signed-file SHA-256:

`96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d`

The deterministic authorization ID is:

`voidcraba1_66779fab9c8657d7f038585525dfc2ac688adfe33cf10a5d5827abb140e04c85`

This authorization is for exactly one submission attempt of exactly that signed
transaction.

The transaction has value `0 wei`. The authorization includes only the gas
expenditure intrinsically required by that exact signed transaction and the
contract-creation consequence already bound to predicted address:

`0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49`

It does not authorize a replacement transaction, a different nonce, a different
payload, a value transfer, an unrelated deployment, an unrelated treasury/funds
action, or an automatic retry.

## Consume-before-broadcast ordering

The authorization may not be exposed to a broadcaster directly.

The required ordering is:

1. reverify the exact authorization record;
2. perform a new live read-only Chain-2050 execution preflight;
3. require that preflight to be no more than 120 seconds old;
4. require chain ID 2050, latest nonce 0, pending nonce 0, no pending conflict,
   exact predicted address still vacant, exact signed transaction/receipt still
   unseen, sufficient deployer gas balance, gas estimate within signed gas
   limit, and current fee observations within the signed fee envelope;
5. validate the canonical private state root;
6. atomically publish the immutable authorization-consumption record;
7. only then may a later exact broadcaster gate access the raw signed
   transaction and perform one submission attempt.

A crash after durable consumption burns the authorization. It does not create a
retry entitlement.

## Durable state boundary

The consumption state root must be:

- absolute;
- pre-existing;
- a direct directory;
- free of symlink ancestors;
- owned by the current UID where supported;
- mode `0700`; and
- equal to its canonical realpath.

The gate creates only `broadcast-consumed/` below that root, mode `0700`.
The immutable record is mode `0600` and keyed by the exact authorization ID.

Replay prevention is scoped to that exact state-store realpath. Production
composition must therefore bind one canonical broadcast-consumption state store.

## Source-gate authority

This source gate can record the authorization and prove/perform durable
consumption when supplied a fresh execution preflight.

It does not:

- read the raw signed transaction;
- access a private key, wallet, or signer;
- access a broadcaster;
- perform an RPC call itself;
- submit a transaction;
- write Chain-2050;
- perform an additional funds action; or
- retry automatically.

## Next gate

`exact_broadcaster_access_and_single_submission_from_consumed_authorization_v1`

That gate must rederive and verify the immutable consumption record, bind the
canonical state-store fingerprint and exact signed transaction bytes, and submit
at most once. Ambiguous submission outcomes must be reconciled by transaction
hash, nonce, and receipt rather than retried.
