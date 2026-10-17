# Buy VOID Epoch-2 dormant first-entry bootstrap V6 candidate lock V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CANDIDATE_LOCK_V1`.

Status: **candidate/source-generation identity acceptance only; not installed and not authorized for live execution**.

## Accepted source generation

Source generation:

`voidbuye2dormantsourcegen3_aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`

Canonical candidate merge:

`02e6e1f7f938d8d7331f32eaca8d2d07c7f7854b`

Tree:

`3d77c814e8dbde6d88e824f1b90667d69a39eeaf`

The source-generation manifest binds bootstrap V6 source blob
`a317d3dce324337f107909bd6e33e98622b3ef09` and inner installer V5 blob
`ce6930bc1be8239a3171d4922c44b96a50f5778b`.

## Canonical hosted evidence

The acceptance lock uses the **post-merge main-push** run, not PR-preview evidence:

- workflow run: `39052446979`;
- source proof: `117453594171`;
- derive A: `117453668048`;
- derive B: `117453668092`;
- derive C: `117453668080`;
- compare/rederive: `117453745953`;
- artifacts A/B/C:
  `12108395551`, `12108530851`, `12107734752`.

All three hosted reports and ELFs are byte-identical. The compare job independently
rederived the report and ELF.

The lock proof also creates a disposable detached worktree at exact canonical
candidate merge `02e6e1f7f938d8d7331f32eaca8d2d07c7f7854b`, reruns the
V6 candidate derivation there, and requires the exact report/ELF byte, SHA-256,
Git-blob and candidate-ID identities below. This prevents the newer lock branch
HEAD from becoming implicit candidate build authority.

## Accepted V6 candidate

Candidate:

`voidbuye2dormantbootstrapcand3_13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062`

Candidate report:

- bytes: `2745`;
- SHA-256:
  `f081e70836f9e6862c6ee207ff2ef1cbad6d36e043b70286443fc9101705912d`;
- Git blob:
  `1929d4ea5ba5b91f8330c9c8a86c368795245b3a`.

Accepted static bootstrap V6 ELF:

- bytes: `874608`;
- SHA-256:
  `c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b`.

The report additionally binds a sealed memfd build input, compiler logical source
`stdin`, distinct source descriptor numbers, descriptor-number-independent
candidate identity, and post-build toolchain revalidation. The lock proof
rechecks those descriptor-independent fields on the freshly rederived canonical
report before acceptance.

## Lock lineage

Lock ID:

`voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`

The suffix is SHA-256 over canonical JSON of the lock body excluding `lock_id`.

Historical source-generation V2 lock:

`voidbuye2dormantbootstraplock2_f2e419eb1643989a4b881b2d817ff097eff9d68d6d763a933d624301a93930e3`

Historical source-generation V1 lock:

`voidbuye2dormantbootstraplock1_ffd5e877b4bf594b7af4eac3f03fd7b846686949febcae54318ef08ee5793796`

Both remain immutable historical evidence and have zero install authority for V6.

## Authority boundary

This lock grants only identity acceptance:

```text
source_generation_identity_accepted=true
candidate_accepted=true
native_binary_identity_accepted=true
superseded_sourcegen2_lock_install_authority=false
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

No Precision mutation or bootstrap execution is authorized by this lock.

Next gate:

`void_buy_void_epoch2_dormant_first_entry_bootstrap_v6_materializer_v1`.

PROTECT THE CORE.
