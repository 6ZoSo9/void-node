# Buy VOID fulfillment deployer resolution evidence v1

Marker: `VOID_BUY_VOID_PRESALE_FULFILLMENT_DEPLOYER_RESOLUTION_EVIDENCE_V1`

This packet binds the explicit human-selected deployment gas payer to the
successful read-only Chain-2050 observation performed after PR #1556 merged.

## Selected deployment payer

```text
deployer_address=0x2b4d94ce678ec0bc17924b83236b714339c70b9d
operator_selected_candidate=true
known_role_collision=false
```

The deployer remains separate from the canonical fulfillment wallet,
validator/admin identities, reward identity, treasury contracts, and all frozen
Mainnet-0 contracts.

No keystore, private key, passphrase, or credential material is stored in this
repository.

## Stable deployment facts

The read-only observer established and revalidated:

```text
chain_id=2050
latest_nonce=0
pending_nonce=0
pending_transactions_present=false
future_contract_address=0xa40a43adfd174f88309173cb3daa6e09c10154a7
constructor_deployment_data_keccak256=0xe4cd757f84e62b03d05105e939c8b7ecd0eccee0d3dc91a9c9000bb8f732c0d6
```

The future contract address is therefore the CREATE address derived from the
selected deployer and nonce zero.

## Observed deployment gas envelope

At observation block 37371:

```text
deployment_gas_estimate=982843
deployment_gas_multiplier_bps=12000
proposed_deployment_gas_limit=1179412
max_fee_per_gas_wei=3000000000
max_priority_fee_per_gas_wei=1000000000
proposed_max_deployment_cost_wei=3538236000000000
deployer_balance_wei=0
deployer_balance_sufficient_for_max_cost=false
```

The inherited fee caps were sufficient at the observation block. The account
was intentionally unfunded, so balance sufficiency remained false.

## Runtime gas lifecycle

The local 320000 payment-keyed runtime gas candidate remains lower-bound
evidence only. Production runtime gas acceptance intentionally happens after:

1. fulfillment deployment;
2. exact deployment attestation; and
3. presale inventory funding.

Only then can the real canonical VOID-token path be measured with the merged
production gas observer.

This prevents the deployment flow from being blocked by a measurement that
requires the deployment to already exist.

## Authority boundary

This evidence packet performs no RPC itself and authorizes no:

- deployer funding;
- inventory funding;
- credential/private-key access;
- wallet access;
- transaction construction;
- signing;
- transaction broadcast;
- deployment;
- Chain-2050 mutation;
- production configuration mutation;
- runtime enablement;
- public activation; or
- funds movement.

The next gate is a separate authorization to fund the deployment-only EOA for
its bounded deployment gas requirement.
