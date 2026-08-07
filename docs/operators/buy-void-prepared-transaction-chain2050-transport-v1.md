# Buy VOID prepared-transaction chain-2050 transport v1

Marker:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1
```

Decision:

`SOURCE_ONLY_PRIVATE_BROADCASTER_SERVICE_CHAIN2050_TRANSPORT_REUSE_EXISTING_SEND_PATH_RUNTIME_UNMOUNTED`

## Purpose

The prepared-transaction broadcaster service requires an injected private
transport with two operations:

```text
submit_once(...)
inspect_submission(...)
```

VOID already has a hardened chain-2050 broadcaster for the mutation path. It
restricts the RPC endpoint to loopback HTTP, probes chain identity, validates
the signed transaction, and permits only `eth_sendRawTransaction` as the RPC
mutation.

This lane reuses that existing sender rather than implementing a second
raw-transaction submission path.

It adds only the missing private-service adaptation and read-only transaction
inspection.

## Submission path

`submit_once` receives raw signed bytes only inside the private broadcaster
service boundary.

The transport:

1. parses the signed transaction again;
2. requires EIP-1559 type 2 and chain ID 2050;
3. binds its hash to the expected prepared transaction hash;
4. delegates submission to the existing
   `buy_void_native_chain2050_broadcaster_v1`;
5. normalizes its result into the prepared broadcaster decision contract.

A definite failure before `eth_sendRawTransaction` becomes
`not_submitted`.

Any failure after submission may have occurred becomes `unknown`.

A successful exact-hash submission becomes `accepted`.

## Stable provider identity

The private broadcaster service requires a durable accepted provider identity
to remain monotonic across later inspection.

This adapter therefore derives one stable provider submission identity from the
normalized loopback RPC URL fingerprint and the prepared transaction hash. The
same identity is returned for accepted, unknown, confirmed, and reverted
observations.

The lower-level request sequence number is never exposed as durable provider
identity.

## Inspection path

Inspection is read-only and permits exactly:

```text
eth_chainId
eth_getTransactionReceipt
eth_getTransactionByHash
eth_blockNumber
```

The interpretation is:

- receipt absent + transaction absent -> `unknown`;
- receipt absent + exact transaction present -> `accepted`;
- exact receipt status `0x1` -> `confirmed`;
- exact receipt status `0x0` -> `reverted`.

An absent transaction is not treated as definitive not-submitted after a
durable broadcaster-service intent exists because a single node's current view
cannot safely prove that the transaction was never submitted.

Terminal receipt evidence is self-consistent with the exact observed
transaction hash and is bound to:

- chain ID 2050;
- exact transaction hash;
- the from/to addresses reported for that same observed transaction;
- block number and block hash;
- current block and derived confirmation count; and
- native VOID amount units derived from that observed transaction value using
  the canonical `1 VOID unit = 10^12 wei-like native subunits` multiplier.

This transport intentionally does not carry the prepared attempt's expected
recipient or amount in its public inspection request. The downstream
crash-consistent broadcast/reconciliation coordinator performs the
attempt-specific binding of receipt `from`, `to`, and `amount_units` to the
prepared execution attempt before any terminal projection or saga closeout.

## Network boundary

The default HTTP inspector:

- accepts only `http://127.0.0.1:<port>/...` or
  `http://[::1]:<port>/...`;
- requires an explicit port;
- rejects userinfo, query strings, and fragments;
- disables connection reuse;
- follows no redirects;
- uses no proxy;
- bounds request time and response size.

## Activation boundary

This is a source-only transport contract.

No runtime route mounts it.
No broadcaster service is started.
No production policy is supplied.
No live RPC is called by the proof.
No real transaction is broadcast by the proof.

A later private service composition must separately inject this transport and
a server-controlled loopback RPC policy.

## Focused proof

Expected marker:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1_PROOF_GREEN
```

The proof uses synthetic signing and injected fake RPC transports only. It
proves the existing sender is reused for the mutation path, provider identity
is stable across submission and inspection, pending/unknown/confirmed/reverted
states are distinguished, terminal receipt bindings are exact, wrong-chain and
transaction-binding conflicts hold, and no real RPC or transaction broadcast
occurs.

## Authority boundary

Source, proof, documentation, and CI only.

No branch publication, runtime mount, private broadcaster service activation,
production RPC, production signer use, credential access, real transaction
broadcast, deployment, restart, inventory decrement, public fulfilled closeout,
Work Credit or validator mutation, or money movement is performed by this
lane.
