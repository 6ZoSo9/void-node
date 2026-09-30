# DataNet registry unsigned transaction candidate v1

Marker: `VOID_DATANET_REGISTRY_UNSIGNED_TRANSACTION_CANDIDATE_V1`

Status: explicit-confirmation transaction construction. Signing and broadcast
remain HOLD.

## Purpose

Materialize the exact unsigned EIP-1559/type-2 deployment candidate only after
all earlier gates are present and a fresh operation-bound construction
confirmation is supplied.

The candidate consumes exactly:

- the reviewed registry deployment-input plan;
- the separately stored fresh green fee/funding packet;
- the short-lived pre-sign revalidation receipt; and
- the transaction-construction admission receipt.

Every artifact is independently validated and rebound before serialization.

## Required construction confirmation

The Precision runner refuses to construct or write a candidate unless the
operator supplies exactly:

`constructDatanetRegistryDeploymentTransactionV1`

This confirmation authorizes **transaction construction only**.

It does not authorize a wallet, signer, private key, signing, submission,
broadcast, deployment, Chain-2050 mutation, or funds movement.

## Candidate transaction

The compiler uses the repository's canonical ethers `Transaction.from`
unsigned type-2 pattern and binds:

- transaction type 2;
- chain ID 2050;
- the exact deployer pending nonce from the reviewed deployment plan;
- contract creation (`to=null`);
- value zero;
- the exact reviewed creation data;
- the fresh proposed gas limit;
- the fresh reviewed max-fee cap; and
- the fresh reviewed max-priority-fee cap.

The predicted CREATE address is independently re-derived from deployer + nonce
and must equal the reviewed predicted registry address.

The output records:

- unsigned serialized transaction bytes;
- ethers unsigned transaction hash;
- SHA-256 and Keccak-256 data identities;
- a transaction fingerprint SHA-256; and
- every upstream evidence ID.

No signature is present.

## Expiration

Construction must occur no earlier than the pre-sign observation and no later
than the construction admission's inherited `expires_at_utc`.

The candidate retains that same validity deadline.

A later signing gate must reject an expired candidate and perform its own fresh
read-only revalidation before allowing any signer access.

## Evidence rebuild

Candidate validation does not trust a recomputed candidate ID alone.

It rebuilds the entire candidate from:

- deployment-input plan;
- fresh fee/funding packet;
- pre-sign receipt; and
- construction admission.

A locally edited nonce, gas field, fee field, creation bytes, predicted address,
authority field, confirmation marker, or serialized transaction therefore fails
closed even if the candidate ID is recomputed.

## Authority boundary

A successful candidate truthfully records:

- `transaction_construction=true`;
- `signable_transaction_materialized=true`; and
- local candidate artifact writing by the operator runner.

It simultaneously records:

- `credential_access=false`;
- `wallet_access=false`;
- `private_key_access=false`;
- `deployer_funding=false`;
- `transaction_signing=false`;
- `transaction_submission=false`;
- `transaction_broadcast=false`;
- `deployment=false`;
- `chain2050_mutation=false`;
- `funds_movement=false`;
- `migration_authorized=false`; and
- `public_activation_authorized=false`.

## Next gate

A constructed candidate remains:

`UNSIGNED_SIGNABLE_TRANSACTION_CANDIDATE_READY_SIGNING_HOLD`

The next gate must bind the **exact deployer signer identity**, repeat fresh
read-only state checks, and require a separate signing authorization.

Construction confirmation must never be reused as signing or broadcast
authorization.
