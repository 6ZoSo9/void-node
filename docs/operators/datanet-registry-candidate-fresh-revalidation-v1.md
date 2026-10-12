# DataNet registry candidate fresh revalidation v1

Marker: `VOID_DATANET_REGISTRY_CANDIDATE_FRESH_REVALIDATION_V1`

Status: fresh read-only candidate-state check. Credential rebinding and signing
remain separate later gates.

## Purpose

After the exact unsigned EIP-1559 deployment candidate has been constructed and
the dedicated deployer credential has been identity-bound once on Nimo, recheck
the live private successor before any signing review can proceed.

This gate treats the prior credential binding as lineage only. It does not reuse
that binding as signing authority.

## Inputs

The revalidation consumes:

- the exact unsigned transaction candidate;
- its deployment-plan, fee-packet, pre-sign, and construction-admission
  evidence;
- the prior Nimo deployer-credential identity binding;
- the private activation plan/receipt;
- the activation-bound deployer-resolution packet; and
- the canonical deployer, publisher, predecessor, and compiled contract
  identity.

The candidate and prior credential binding are rebuilt through their canonical
validators before any RPC call.

## Fresh live observation

The gate performs the reviewed eleven-call read-only fee/funding observation on
Precision loopback `127.0.0.1:18553`.

A green result requires:

- fresh head not older than the candidate's prior pre-sign observation;
- exact deployer pending nonce unchanged;
- predicted CREATE address unchanged and still vacant;
- creation-data identity unchanged;
- activation-height continuity still true;
- candidate gas limit greater than or equal to the newly proposed 120%-buffered
  gas limit;
- candidate max fee and max priority fee still equal the reviewed policy caps;
- current deployer balance sufficient for the **existing candidate's** maximum
  gas cost, not merely sufficient for the new estimate; and
- pending nonce and observation block hash revalidated.

The stricter candidate-cost check prevents a newer lower gas estimate from
making an older, larger candidate appear funded when it is not.

## Freshness window

The receipt is valid for at most 60 seconds and never beyond the candidate's own
expiry.

The gate refuses to begin the live RPC observation if fewer than 30 seconds
remain on the candidate.

## Credential boundary

No credential is opened in this lane.

The prior credential binding must validate exactly, but it is recorded only as
lineage. The green receipt explicitly requires:

`fresh_credential_rebinding_required=true`

The next Nimo gate must re-read the dedicated deployer credential under the
existing exact confirmation:

`bindDatanetRegistryDeployerCredentialIdentityV1`

and bind it again to the still-unexpired same candidate.

## Authority boundary

This lane does not:

- access a credential or private key;
- create a wallet or signer;
- fund the deployer;
- construct or alter the transaction;
- sign, submit, or broadcast;
- deploy a contract;
- mutate Chain-2050 or validators;
- move tokens or funds;
- authorize migration; or
- authorize public activation.

The detailed fresh fee/funding packet is written separately from the short
candidate-revalidation receipt.

## Next gate

A green unexpired receipt permits only fresh Nimo deployer-identity rebinding.

After that rebinding, a separate exact single-transaction signing-authorization
gate is still required. Neither this receipt nor the prior credential binding
authorizes signing.
