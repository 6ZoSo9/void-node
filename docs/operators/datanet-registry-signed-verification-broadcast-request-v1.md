# DataNet registry signed verification + broadcast request v1

Markers:

- `VOID_DATANET_REGISTRY_SIGNED_TRANSACTION_VERIFICATION_V1`
- `VOID_DATANET_REGISTRY_BROADCAST_AUTHORIZATION_REQUEST_V1`

Status: signed-transaction verification plus broadcast **request only**.
Broadcast remains separately authorized.

## Purpose

After the exact Nimo signing gate has produced one private signed registry
transaction artifact, this lane independently verifies that artifact and
compiles the exact request that a later broadcast-authorization gate must name.

It does not broadcast.

## Signed artifact verification

The verifier rebuilds the public/evidence lineage for:

- the unsigned transaction candidate;
- the exact signing request; and
- the exact single-transaction signing authorization.

It then validates the signed artifact through the canonical
`validateVoidDatanetRegistrySignedTransactionV1` contract and independently
parses the signed EIP-1559 transaction.

The signed transaction must match the unsigned candidate exactly for:

- chain ID 2050;
- contract-creation destination;
- deployer address;
- nonce;
- zero value;
- gas limit;
- max fee per gas;
- max priority fee per gas;
- deployment data;
- unsigned transaction hash; and
- transaction fingerprint lineage.

The verifier also recomputes the signed serialized-transaction SHA-256 and
recovers the sender from the actual signature.

## Verification artifact boundary

The signed-verification receipt contains hashes and public transaction facts
only.

It explicitly does **not** copy the signed serialized transaction bytes into the
verification receipt.

The private signed artifact remains a separate input.

## Exact broadcast request

The request binds:

- signed-transaction verification ID;
- signed transaction ID and hash;
- candidate ID;
- signing request ID;
- signing authorization ID;
- signing consumption/operation lineage;
- transaction fingerprint;
- deployer address;
- nonce;
- gas and fee caps;
- predicted contract address;
- deployment-data hashes; and
- SHA-256 of the signed serialized transaction bytes.

It still omits the signed serialized transaction itself.

The exact later confirmation string is:

```text
authorizeDatanetRegistryDeploymentBroadcastV1:<signed_transaction_id>:<signed_transaction_hash>:<candidate_id>:<transaction_fingerprint_sha256>
```

A generic instruction such as “continue” is not this confirmation.

## Request authority

The request records:

- `broadcast_authorized=false`;
- `transaction_submission=false`;
- `transaction_broadcast_authorized=false`;
- `transaction_broadcast_performed=false`;
- `deployment_authorized=false`;
- `chain2050_write_authorized=false`;
- `additional_value_transfer_authorized=false`;
- `replacement_transaction_authorized=false`; and
- `automatic_retry=false`.

The request asks for at most one later submission attempt of the exact signed
transaction.

## Precision runner

The Precision runner reads:

- public/evidence candidate/signing lineage artifacts; and
- one private mode-0600 signed transaction artifact.

It performs no RPC, SSH, Docker, systemd, credential, signer, or broadcaster
action.

It writes two mode-0600 JSON files:

1. signed-transaction verification receipt; and
2. broadcast-authorization request.

If writing the second file fails, the first file is removed so the pair cannot
be mistaken for a complete request package.

## CI

CI uses an ephemeral EIP-1559 signing key only.

The production wrapper remains hard-wired to the canonical candidate,
signing-request, signing-authorization, and signed-transaction validators.
Dependency injection exists only to let CI prove cryptographic signed-transaction
binding without requiring the production Nimo deployer credential.

## Next gate

A green request permits only:

`explicit_exact_registry_single_transaction_broadcast_authorization_v1`

That later gate must bind the exact request/signed hash, remain single-use, and
require durable consumption before broadcaster access.

No source merge or generic operator approval constitutes broadcast authority.
