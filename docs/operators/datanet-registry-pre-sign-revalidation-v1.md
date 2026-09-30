# DataNet registry pre-sign revalidation v1

Marker: `VOID_DATANET_REGISTRY_PRE_SIGN_REVALIDATION_V1`

Status: fresh read-only eligibility gate. No signable transaction exists.

## Purpose

Re-run the complete deployment fee/gas/funding observation immediately before
any later source lane is allowed to construct a signable registry-deployment
transaction.

This gate consumes:

- the activation plan and activation receipt;
- the activation-bound deployer-resolution packet;
- the source-only registry deployment-input plan; and
- a previously green fee/gas/funding packet.

It then performs a new read-only observation against the private Precision RPC.

## Freshness

A successful receipt is valid for exactly five minutes.

The fresh observation must:

- be at a block height at least as high as the previous fee/funding packet;
- preserve the exact deployer pending nonce;
- preserve the predicted CREATE address;
- preserve address vacancy;
- preserve the exact creation-data Keccak;
- remain within the reviewed fee caps; and
- prove the deployer still has enough balance for the conservative maximum gas
  cost.

A chain-head regression is rejected rather than treated as fresh evidence.

## Funding shortfall

If the fresh observation detects a fee or balance shortfall, the result is:

`FRESH_PRE_SIGN_REVALIDATION_HOLD`

No signable transaction construction is authorized. The caller must resolve the
separate funding/fee issue and repeat the read-only observation.

## Green meaning

A green result records:

`FRESH_PRE_SIGN_REVALIDATION_GREEN_SIGNABLE_PLAN_CONFIRMATION_REQUIRED`

It includes the fresh observation's:

- block number and hash;
- deployer pending nonce and balance;
- predicted registry address;
- gas estimate and 120%-padded gas limit;
- reviewed max-fee and max-priority caps; and
- conservative maximum deployment gas cost.

These are eligibility facts only. The receipt does not contain serialized
transaction bytes or an unsigned transaction hash.

## Authority boundary

Even when green:

- `signable_transaction_construction_authorized=false`;
- no credential, wallet, or private key is accessed;
- no deployer funding occurs;
- no signing, submission, or broadcast occurs;
- no deployment or Chain-2050 mutation occurs; and
- no funds move.

The next confirmation string is:

`constructDatanetRegistryDeploymentTransactionV1`

That future gate is separate from this read-only observation and must recheck
the five-minute validity window before constructing any signable transaction.
