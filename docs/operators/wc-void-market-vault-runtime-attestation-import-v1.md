# WC/VOID market-vault runtime attestation import v1

Marker: `VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_V1`

Status: source-only verifier for importing a future real
`VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1` receipt.

This lane does not contact production RPC, deploy/fund the vault, write the
production candidate, activate the market/presale, access a signer, submit a
transaction, or move funds.

## Why an importer is required

The runtime attestor can prove one observed deployment/runtime/inventory-lock
state. That receipt should not become production-candidate truth merely because
it is structurally valid.

The importer independently binds the receipt to a reviewed expected deployment
descriptor and explicit minimum head/finality thresholds.

## Expected deployment binding

The caller must provide exact expected values for:

- market-vault address;
- deployment transaction hash;
- deployment deployer;
- launch controller;
- settlement executor;
- closeout controller;
- coupled launch ID;
- minimum accepted observed head block; and
- minimum accepted confirmation count.

These inputs are content-addressed into a
`voidwcmvrb1_<sha256>` binding ID.

A valid attestation against another otherwise-correct deployment is rejected.

## Receipt verification

The importer independently requires:

- marker/version/status for the runtime attestation;
- Chain 2050 / execution epoch 2;
- exact corrected current compiled-identity binding and retained identity IDs;
- exact runtime byte length from the corrected current compiled identity;
- recomputed `voidwcmvre1_<sha256>` evidence ID;
- canonical Epoch-2 `VoidToken`
  `0x470075b85352eb86f7d089fb9ba88945f12aad94`;
- canonical token runtime SHA-256
  `7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb`;
- exact 10,000,000-VOID opening inventory through opening inventory,
  current reserve, and token balance;
- exact pre-activation lock state;
- deployment block/head/finality arithmetic consistency;
- head and confirmation observations at or above the reviewed thresholds;
- explicit classification that these thresholds are historical/static evidence,
  not an indefinite freshness proof;
- deployment/runtime/role/inventory proof booleans true;
- market/presale/funds authority false;
- exact read-only attestation authority; and
- only the attestor's bounded RPC method set.

## Derived candidate fields

A successful import derives exactly:

```text
market_vault_address=<verified address>
market_vault_runtime_code_sha256=<verified runtime SHA-256>
market_vault_independently_verified=true
inventory_funded=true
inventory_lock_proven=true
```

The importer deliberately reports:

```text
production_candidate_binding_ready=false
freshness_revalidation_required=true
production_candidate_binding_hold_reason=fresh_live_head_and_preactivation_state_revalidation_required
production_candidate_updated=false
```

The receipt is still useful as exact historical/static deployment evidence and
the five candidate fields remain derived from it. But minimum head/finality
thresholds do not prove the observation is still current: the vault could have
activated, changed reserve state, or otherwise advanced after the attestation.

A later promotion/composition lane must therefore perform a fresh live-head and
preactivation-state revalidation before those derived fields may become
production-candidate truth. Content addressing proves what was observed; it
does not grant indefinite freshness.

This source-only repair performs no live revalidation itself and does not update
the production candidate.

## Authority boundary

The importer is pure evidence validation and candidate-field derivation. It has
no filesystem write, RPC, credential, wallet/signer, private-key, transaction,
Chain-2050 write, inventory funding/movement, market activation, presale
activation, or funds-movement authority.

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_runtime_attestation_import_v1.mjs
```
