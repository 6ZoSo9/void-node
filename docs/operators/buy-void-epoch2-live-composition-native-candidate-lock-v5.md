# Buy VOID Epoch-2 live-composition native candidate lock v5

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V5`.

Status: **stacked Draft acceptance contract for the reviewed V5 native/runner candidate; not installed and not authorized for live execution**.

## Candidate proposed for acceptance

Source head:

`cfbdf2d40382be1a32b6ba08be61385b5cfeaadd`

Candidate head:

`3d84bdb417f45e3bab450f7a90c5e4c64130f4f1`

Candidate ID:

`voidbuye2nativecand5_a377212ff699fb3463d2bfeecc61a16416a98ed5a291771c4a8a73aa003e6308`

Candidate report:
- bytes: `59709`;
- SHA-256: `327de6a4e56aa3a677f66ee04b5342d8923a19ab09d3e16ed3f82ef8cda2fcb2`;
- Git blob: `cb53a777b51c990b3f34223d20242c04a047f1bf`.

Native ELF:
- bytes: `726976`;
- SHA-256: `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- static ELF64 x86-64 executable;
- no `PT_INTERP`;
- hostile `LD_PRELOAD` blocked before native main;
- two local builds byte-identical.

Runner:
- Git blob: `baab733e43c030d24f8d4abd1644f3c4ae55c3b2`;
- bytes: `40616`;
- SHA-256: `f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889`;
- future install mode: `0444`.

## Hosted evidence

Workflow run:

`38899596489`

Jobs:
- source proof: `116968267827`;
- derive A: `116968416516`;
- derive B: `116968416479`;
- derive C: `116968416566`;
- independent compare: `116968592392`.

Artifacts:
- A: `12045477538`;
- B: `12045312506`;
- C: `12045492448`.

The three hosted V5 candidate reports are byte-identical. The compare job independently
re-preprocessed, recompiled, relinked and stripped the exact source and required the
rederived ELF and complete static toolchain/linker closure to match.

## Bound derivation generation

The lock binds:
- candidate proof blob
  `bc1b7575e8a77d98b81252da39b6e2d3c10760d9`;
- candidate workflow blob
  `9a2999cf36c3665109632762317b1aa094baf921`;
- V3 native source blob
  `5021727f1def1ec11f870d735cab65acc1701a5e`;
- repaired V3 runner blob
  `baab733e43c030d24f8d4abd1644f3c4ae55c3b2`;
- reconciled native-source proof blob
  `3918e59fa7393824f2c98d129dfbead3d3867d99`;
- reconciled native-source workflow blob
  `43e791da6b7513bf945731f888f0590fc99c7773`;
- sealed credential V2 blob
  `14cbe81e27d04fee77cbe75225ce308bf8561a7b`.

## Lock identity

`voidbuye2nativecandlock5_650ae9975eeb898279649e48115cdfec242052c0853b0ce5af19244d4d304126`

The suffix is SHA-256 over canonical JSON of the complete lock body excluding the
`lock_id` field.

## Authority boundary

This lock changes only candidate identity acceptance:

```text
candidate_accepted=true
native_binary_identity_accepted=true
runner_identity_accepted=true
protected_install_authorized=false
live_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
funds_movement_authorized=false
production_host_evidence_authority=false
```

No Precision installation, policy publication, credential read, signature,
transaction/RPC, service/systemd mutation, payment acceptance, presale/WC
activation, treasury action, or funds movement is authorized here.

Next gate:

`void_buy_void_epoch2_live_composition_native_protected_install_v3`.

PROTECT THE CORE.
