# DataNet registry exact single broadcast execution v1

Marker: `VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_V1`

Status: final exact single-attempt Chain-2050 submission gate for the DataNet
content-commitment registry deployment.

## Purpose

Execute at most one `eth_sendRawTransaction` attempt for the already-signed
registry deployment transaction, and only after all earlier gates have completed:

1. signed transaction verification;
2. exact transaction-bound broadcast authorization;
3. fresh read-only pre-broadcast observation; and
4. durable single-use broadcast-authorization consumption.

The executor does not sign, fund, replace, or retry a transaction.

## Required inputs

The Precision runner requires:

- exact broadcast request;
- exact broadcast authorization;
- fresh pre-broadcast observation;
- the mode-0600 signed transaction artifact;
- the canonical private broadcast state root;
- the exact operation-bound broadcast confirmation; and
- a caller-selected mode-0600 execution receipt path.

The confirmation remains:

```text
authorizeDatanetRegistryDeploymentBroadcastV1:<signed_transaction_id>:<signed_transaction_hash>:<candidate_id>:<transaction_fingerprint_sha256>
```

The runner rejects a generic authorization or any confirmation that does not
exactly match the authorization artifact. The transaction-submitting API repeats
that exact comparison internally; library callers cannot bypass the
operation-bound confirmation by skipping the Precision CLI.

## Replay and crash boundary

The executor validates the immutable consumption record from:

`broadcast-consumed/<broadcast_operation_id>.json`

and requires the same state-root device/inode generation used by consumption.

Before broadcaster RPC access it exclusively publishes:

`broadcast-attempts/<broadcast_operation_id>.intent.json`

If that intent already exists, the executor refuses to call
`eth_sendRawTransaction`. This deliberately treats a crash after intent
publication as an already-spent submission opportunity rather than risking a
silent duplicate send.

The attempt directory itself is made durable by fsyncing the private state-root
directory before intent publication. The mode-0600 intent is then fsynced and its
attempt directory is fsynced before RPC. A power loss after submission therefore
cannot erase the attempt-directory entry and reopen a supposedly unused slot.

## Runtime boundary

Immediately before submission the executor rechecks:

- broadcast-authorization validity;
- pre-broadcast observation validity;
- exact state-root generation; and
- exact signed transaction/request/authorization/consumption lineage.

If that final pre-send recheck fails after the durable intent exists, the call
returns an explicit HOLD/error result with zero broadcaster/RPC-send access.
It does not continue through reconciliation as a successful broadcast attempt,
and the durable intent still prevents later replay.

The only mutating RPC method available to this gate is:

`eth_sendRawTransaction`

and it may be invoked at most once. The Precision HTTP client uses the pinned
loopback successor RPC with fetch redirects disabled; a 3xx redirect is an error
and signed raw bytes are never forwarded to a redirected authority.

No `eth_sendTransaction`, replacement transaction, automatic retry, signer,
wallet, credential, or private-key path exists in this gate.

## Post-attempt reconciliation

After the single send attempt the executor performs only read-only reconciliation:

- `eth_getTransactionByHash`;
- `eth_getTransactionReceipt`;
- `eth_getCode`; and
- `eth_getTransactionCount`.

It writes one mode-0600 terminal result under `broadcast-attempts/` and one
caller-selected execution receipt. A send error or ambiguous result does not
reopen the authorization.

Immediate classifications include:

- receipt success, requiring later runtime-bytecode verification;
- receipt failure, no retry;
- transaction seen with receipt pending, no retry;
- ambiguous/rejected send error, no retry; or
- submission returned without immediate confirmation, no retry.

## Authority boundary

A green execution proves one submission attempt occurred. It does not itself
prove contract deployment finality or runtime bytecode correctness.

The expected transaction is the exact signed DataNet registry deployment:

- Chain ID 2050;
- zero native value;
- bounded gas and fee fields already authorized;
- exact predicted CREATE address already authorized;
- exact signed transaction hash already authorized; and
- no replacement transaction.

Final deployment acceptance must be derived from a later receipt/runtime
verification lane rather than from the RPC send return alone.
