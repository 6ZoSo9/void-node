# DataNet registry transaction-construction admission v1

Marker: `VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_ADMISSION_V1`

Status: source-only admission. No transaction is constructed.

## Purpose

Make the transaction-construction boundary explicit instead of allowing a green
pre-sign receipt to be interpreted as implicit permission to create a signable
deployment transaction.

The admission consumes exactly:

- the reviewed source-only deployment-input plan;
- the detailed **fresh** fee/funding packet produced by the merged pre-sign
  revalidation lane; and
- the unexpired short pre-sign revalidation receipt.

It performs no RPC call.

## Required bindings

The compiler independently requires:

- the deployment-input plan is valid;
- the fresh fee packet is content-addressed and independently rebuilt through
  the reviewed fee/funding packet builder;
- the fresh packet is green;
- fee caps remain sufficient;
- deployer gas balance remains sufficient;
- additional funding required is zero;
- the pre-sign receipt is valid and unexpired;
- the fresh fee packet ID exactly matches the pre-sign receipt;
- the fresh observation block number/hash exactly match the receipt;
- activation plan, activation receipt, and resolution-packet lineage match the
  deployment-input plan; and
- the pre-sign receipt still records no signable transaction materialization.

## Output

A green result is:

`TRANSACTION_CONSTRUCTION_CONFIRMATION_REQUIRED`

The content-addressed admission contains only evidence IDs, expiration, and
verification/authority facts. It does not copy nonce, calldata, gas limit, fee
caps, or serialized transaction fields into the admission.

The required next confirmation is exactly:

`constructDatanetRegistryDeploymentTransactionV1`

## Authority boundary

A green admission still records:

- `construction_authorized=false`;
- `signable_transaction_materialized=false`;
- `transaction_construction=false`;
- `transaction_signing=false`;
- `transaction_submission=false`;
- `transaction_broadcast=false`;
- `deployment=false`;
- `chain2050_mutation=false`;
- `funds_movement=false`.

It also performs no credential, wallet, private-key, deployer-funding, RPC,
systemd, Docker, or remote-host action.

## Next gate

Only a fresh explicit operation-bound confirmation

`constructDatanetRegistryDeploymentTransactionV1`

may permit the later lane to materialize the exact signable EIP-1559 deployment
candidate.

That confirmation is **construction only**. It must not implicitly authorize
credential access, signing, submission, broadcast, deployment, or funds
movement. Those remain later independent gates.
