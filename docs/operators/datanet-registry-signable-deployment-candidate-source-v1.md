# DataNet registry signable deployment candidate source v1

Marker: `VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_V1`

Status: confirmation-gated source implementation. The confirmed construction
path has **not** been executed by this source lane.

## Purpose

Implement the next gate after
`VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_ADMISSION_V1` without
implicitly consuming that admission.

The source defines the exact EIP-1559 contract-creation candidate that may be
materialized only after the operation-bound confirmation:

`constructDatanetRegistryDeploymentTransactionV1`

## Required upstream evidence

Before construction, the tool independently validates and cross-binds:

- the source-only deployment-input plan;
- the detailed fresh fee/funding packet;
- the unexpired pre-sign revalidation receipt; and
- the transaction-construction admission plus its evidence rebuild.

It then requires:

- chain ID 2050;
- type-2 transaction;
- deployment `to=null`;
- value zero;
- exact deployer pending nonce;
- exact creation data and Keccak-256 identity;
- exact predicted CREATE address;
- fresh proposed gas limit;
- fresh max fee and max priority fee;
- sufficient fee caps;
- sufficient deployer gas balance; and
- zero additional funding requirement.

## Default Precision behavior

The Precision runner defaults to plan-only mode.

It validates the complete evidence set and writes a HOLD artifact containing
only IDs, expiration, authority facts, and the exact required confirmation.

It does **not** materialize unsigned serialized transaction bytes in default
mode.

## Confirmed construction path

The constructor checks the exact confirmation string **before** evidence
processing:

`constructDatanetRegistryDeploymentTransactionV1`

Only that exact confirmation permits the source path to call
`ethers.Transaction.from` and materialize the unsigned type-2 transaction.

The resulting candidate may contain:

- nonce;
- exact deployment creation data;
- gas limit;
- max fee per gas;
- max priority fee per gas;
- unsigned serialized transaction bytes; and
- unsigned transaction hash.

It contains no signature.

## CI boundary

CI deliberately does not execute the confirmed construction path.

The focused proof:

- validates the exact confirmation token in isolation;
- proves missing and incorrect confirmations HOLD before evidence processing;
- re-runs the upstream construction-admission proof;
- statically proves the exact EIP-1559 field wiring; and
- rejects signer, wallet, broadcast, systemd, Docker, SSH, and network primitives
  from this lane.

This means source-green proves the gate and field wiring exist. It does **not**
prove that a production signable transaction was constructed.

## Authority boundary after construction

Even a confirmed constructed candidate records:

- transaction construction: true;
- signable transaction materialized: true;
- credential access: false;
- wallet access: false;
- private-key access: false;
- transaction signing: false;
- transaction submission: false;
- transaction broadcast: false;
- deployment: false;
- Chain-2050 mutation: false;
- funds movement: false;
- migration authorization: false; and
- public activation authorization: false.

Construction confirmation therefore does not imply signing authority.

## Next gate

After a real candidate is constructed under the exact confirmation, the next
gate is a separate single-transaction signing authorization bound to the exact
unsigned transaction hash.

No signing or broadcast should be implemented as an automatic continuation of
candidate construction.
