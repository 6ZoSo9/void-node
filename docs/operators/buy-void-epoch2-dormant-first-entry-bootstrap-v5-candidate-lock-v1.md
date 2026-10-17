# Buy VOID Epoch-2 dormant first-entry bootstrap V5 candidate lock V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V5_CANDIDATE_LOCK_V1`.

Status: **candidate/source-generation identity acceptance only; not installed and not authorized for live execution**.

## Accepted repaired generation

Source generation:

`voidbuye2dormantsourcegen2_3ab7f9b6e23c6fd2fe82486fd2a396c3bd207e335675e6c5bfe58776ab99d6ff`

Candidate:

`voidbuye2dormantbootstrapcand2_e256825988055133055605a8111fce96abdddc19ff890b483bfd5f341d6eccc2`

Accepted V5 static ELF:

- bytes: `874600`;
- SHA-256:
  `4392f1aa3e35edf4e347fd81c15c9b1ba0810c71111f4e96dafcbf2e1cb52374`.

Canonical hosted report:

- bytes: `2567`;
- SHA-256:
  `2d6343e40a8a97b22ccd49f48e056db62d26eb90eec883072c547deb9d985550`;
- Git-blob form:
  `06768084f59223f78330b8f7734d3ca03341eabb`.

Hosted derivation run `39039200493` produced three byte-identical reports and
three byte-identical V5 ELFs. Compare job `117415225295` independently
rederived both a fourth time.

## Lock

Lock ID:

`voidbuye2dormantbootstraplock2_f2e419eb1643989a4b881b2d817ff097eff9d68d6d763a933d624301a93930e3`

The suffix is SHA-256 over canonical JSON of the complete lock body excluding
`lock_id`.

The lock binds exact candidate source head
`6808a0fb094b8e466e4726d36189d21c8988aa0e`, merged candidate generation
`80011ca7fa4e39963ca58fb2409b85a203910fe9`, repaired V2 manifest, inner V4
installer source, and V5 bootstrap source.

The historical source-generation V1 lock

`voidbuye2dormantbootstraplock1_ffd5e877b4bf594b7af4eac3f03fd7b846686949febcae54318ef08ee5793796`

remains historical evidence and has zero install authority for this repaired
source generation.

## Authority boundary

This lock grants only identity acceptance:

```text
source_generation_identity_accepted=true
candidate_accepted=true
native_binary_identity_accepted=true
superseded_sourcegen1_lock_install_authority=false
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

`void_buy_void_epoch2_dormant_first_entry_bootstrap_v5_materializer_v1`.

PROTECT THE CORE.
