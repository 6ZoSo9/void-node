# Buy VOID fulfillment deployer selection v1

Marker: `VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_SELECTION_V1`

This gate exists because the frozen Mainnet-0 records do not identify a
dedicated deployment payer for the new presale fulfillment contract.

The repository contains historical dev/test deployer scripts, validator
operation deployers, canonical admin/validator EOAs, and the dedicated Buy VOID
fulfillment wallet. None of those are automatically promoted into the new
deployment-payer role.

## What this gate does

It reviews one explicit candidate address for collisions with known VOID roles.

It performs no RPC, credential access, wallet access, signing, transaction
construction, broadcast, deployment, Chain-2050 mutation, funding, production
configuration mutation, runtime enablement, or public activation.

A structurally valid address with no known role collision returns:

```text
candidate_shape_eligible_human_selection_required
candidate_selected=false
human_selection_required=true
```

This is not an approval.

## Hard role collisions

The candidate is held if it equals any frozen canonical contract address:

- VoidToken
- VoidTreasury
- OpsTreasury
- AdminGate
- ConfigGate
- ValidatorSet
- EmissionsController
- RewardEngine
- UpgradeStaking

The dedicated Buy VOID fulfillment wallet is also rejected for automatic reuse:

```text
0xc884f631c3881b8b672bfcbf019c856146cd7f73
```

Deployment gas payment and fulfillment signing are intentionally separate
roles.

## Privileged EOA reuse

The frozen handoff records also name:

- validator admin: `0x8dc0d4abc9ecd40b5e8f6b4c2fe1370822e52bc4`
- AdminGate master-key address:
  `0x5730ca2ac38f0e39bf46c121fbdf581638fa72bc`
- validator-0 reward address:
  `0xd2571d5d471d6574f7d57d0a3aca5b34d0c8da6f`

Version 1 does not silently reuse those identities.

They HOLD on a separate-explicit-exception result instead of being accepted as
deployment payer candidates.

## Why an unknown address still is not selected

Static repository review cannot establish that an unknown address:

- is an EOA rather than a deployed contract;
- has enough native Chain-2050 gas;
- has a stable pending nonce;
- is controlled by the intended operator; or
- is the address the operator actually wants to use.

Therefore an unknown collision-free address remains only shape-eligible.

## Next gate after explicit human selection

After the operator explicitly selects one candidate, the already-merged
read-only deployment-resolution observer can check:

- exact Chain ID 2050;
- no deployment-policy mutation;
- pending nonce and revalidation;
- native balance;
- current fee conditions;
- exact creation-data gas estimate; and
- the future CREATE address.

That observation still performs no signing or broadcast.

## Current blocker

The payment-keyed activation contract now truthfully records:

```text
deployer_selection_source_ready=true
deployer_candidate_selected=false
human_deployer_selection_required=true
deployer_address_resolved=false
```

No deployer address is invented by source code.

## Authority boundary

Merging this source does not authorize:

- RPC;
- credential/private-key access;
- wallet access;
- transaction construction;
- signing or broadcast;
- deployment;
- Chain-2050 mutation;
- inventory funding;
- production configuration mutation;
- runtime enablement;
- public activation; or
- funds movement.
