# Buy VOID Epoch-2 dormant first-entry bootstrap V4 candidate lock V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V4_CANDIDATE_LOCK_V1`.

Status: **candidate/source-generation identity acceptance only; not installed and not authorized for live execution**.

## Accepted generation

Source generation:

`voidbuye2dormantsourcegen1_435345cd442c4d59760984c3445d178461cbbf163a0a53e760a392ca2d0bae77`

Candidate:

`voidbuye2dormantbootstrapcand1_721cfebf78478734cd99a8bee2c669793fafdd76f435d7e47dd4d4f3e9f54713`

Accepted V4 static ELF:

- bytes: `839416`;
- SHA-256:
  `a4605ab39da0a37afe8ef7f6084b93f542a57dcbe8c3c9433c47481cb21c7ce3`.

Canonical hosted report:

- bytes: `2566`;
- SHA-256:
  `5be29b62f029c02e589057df91fb10f23e4aabc1aa87b6c14d22fd13ad7b6e7a`;
- Git-blob form:
  `e4bb1005f10f9047b6e1d6e16cb114ef94dcf110`.

Hosted derivation run `39017210026` produced three byte-identical reports and three byte-identical ELFs. Compare job `117351844719` independently rederived both a fourth time.

## Lock

Lock ID:

`voidbuye2dormantbootstraplock1_ffd5e877b4bf594b7af4eac3f03fd7b846686949febcae54318ef08ee5793796`

The suffix is SHA-256 over canonical JSON of the complete lock body excluding `lock_id`.

The lock binds the exact #3440 candidate source generation and the merged #3439 V4/V3 source-generation inputs.

## Authority boundary

This lock grants only identity acceptance:

```text
source_generation_identity_accepted=true
candidate_accepted=true
native_binary_identity_accepted=true
protected_install_authorized=false
live_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
rpc_call_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
funds_movement_authorized=false
production_host_evidence_authority=false
```

No Precision mutation or execution is authorized by this lock.

Next gate:

`void_buy_void_epoch2_dormant_first_entry_bootstrap_v4_materializer_v1`.

PROTECT THE CORE.
