# Production Epoch-2 RPC target promotion compiler v1

Marker: `VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_COMPILER_V1`

## Purpose

This is the source-only evidence compiler for the production Chain-2050
Epoch-2 RPC target.

This compiler is the retained **pre-selection** evidence compiler. It does not
edit `ops/mainnet0/production-epoch2-rpc-target-v1.json`.

The canonical target is now selected through the separately reviewed promotion
manifest. Direct live compiler use therefore intentionally HOLDs once canonical
state is no longer the pre-selection HOLD descriptor.

It consumes three exact external evidence artifacts:

1. the private-QBFT activation plan;
2. the green private-QBFT activation receipt; and
3. the independent production host/RPC observation.

Each artifact is supplied with an independent SHA-256 value. The CLI reads the
exact bytes and rejects any mismatch before semantic evaluation.

## Activation lineage

Activation lineage is revalidated through
`validateVoidEconomicEpoch2PrivateActivationReceiptForDatanetV1(...)`.

That path supports both the current receipt schema and the one narrow,
content-addressed legacy production ceremony that predates the receipt-basis
migration. It does not provide generic legacy acceptance.

The host observation must bind the same activation plan ID, activation-plan
file SHA-256, activation receipt ID, and activation-receipt file SHA-256.

## Host observation requirements

The observation receipt must remain content-addressed by its
`voidpe2rpcobs1_<sha256>` ID and must report:

- canonical live `main` source binding;
- accepted independent Precision host observation;
- exact `http://127.0.0.1:18553/` RPC;
- exact `void-economic-epoch2-qbft-validator-v1.service`;
- active/running runtime and listener binding;
- reviewed Besu image identity;
- exact reviewed genesis hash and state root;
- at least two peers;
- exact validator-set verification;
- head at or above the activation floor;
- `write_capable_not_authorized`;
- exact genesis and production-validator bindings;
- independent host acceptance; and
- no transaction, migration, presale, funds, or target-promotion authority
  in the observation itself.

The compiler recomputes the observation ID after removing only
`observation_id`. A receipt whose content no longer hashes to its ID is
rejected.

## Output boundary

A green compile emits the existing selected-state descriptor schema:

```text
status=PRODUCTION_EPOCH2_RPC_TARGET_SELECTED_OBSERVATION_ONLY
production_rpc_target_selected=true
rpc_url=http://127.0.0.1:18553/
write_capability_classification=write_capable_not_authorized
independent_host_acceptance=true
```

The output is create-only mode 0600 and **must be outside the repository**.
This prevents the compiler from silently selecting the canonical target.

The resulting descriptor still grants no transaction, signing, submission,
broadcast, migration, market, presale, or funds authority.

## Live usage

```bash
node tools/void-production-epoch2-rpc-target-promotion-compiler-v1.mjs \
  --activation-plan /absolute/activation-plan.json \
  --activation-plan-sha256 <64hex> \
  --activation-receipt /absolute/activation-receipt.json \
  --activation-receipt-sha256 <64hex> \
  --runtime-observation /absolute/production-rpc-observation.json \
  --runtime-observation-sha256 <64hex> \
  --output /absolute/outside-repo/production-rpc-selected-candidate.json
```

The compiler itself makes no RPC call and performs no service or Docker action.
The runtime facts were already captured by the independent observer.

## Verification

```bash
node --check tools/void-production-epoch2-rpc-target-promotion-compiler-v1.mjs
node --check scripts/prove_void_production_epoch2_rpc_target_promotion_compiler_v1.mjs
node scripts/prove_void_production_epoch2_rpc_target_promotion_compiler_v1.mjs
```

The proof covers the green selected-descriptor build plus rejection of a
modified observation ID, activation-plan digest drift, alternate RPC,
missing independent acceptance, forged promotion authority, authority
escalation, and malformed evidence hashes.

## Authority boundary

```text
source_candidate_only=true
canonical_target_write=false
rpc_call=false
service_action=false
docker_mutation=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
validator_mutation=false
migration_authorized=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

## Next gate

The real production candidate was compiled and admitted before canonical
selection. This tool remains for regression/provenance proof of that transition;
downstream consumers should now use the canonical selected target and repeat
fresh read-only preflights rather than rerun promotion.
