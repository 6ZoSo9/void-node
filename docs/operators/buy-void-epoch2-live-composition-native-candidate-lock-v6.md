# Buy VOID Epoch-2 live-composition native candidate lock v6

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V6`.

Status: **stacked Draft acceptance contract for the reviewed V6 native/runner candidate; not installed and not authorized for live execution**.

## Candidate proposed for acceptance

Source head:

`5deec4ea5126ef657e0ae0e4a212423f9438e0a2`

Candidate head:

`0d1a195b3098493b28e02bc1c7cd3b7829712168`

Candidate ID:

`voidbuye2nativecand6_24cfe5b3a38f57732ad76e8ec5d6c27edb55ed8c2067cbc83b6a871fd6b4eed2`

Candidate report:
- bytes: `59709`;
- SHA-256: `b27fac8d095df55ea66a9a20522ce452e7c861578117283df57c829aa8e81131`;
- Git blob: `71a09bf2a7dddcdda10a759eea4d6c0d338f266c`.

Native ELF:
- bytes: `726976`;
- SHA-256: `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- static ELF64 x86-64 executable;
- no `PT_INTERP`;
- hostile `LD_PRELOAD` blocked before native main;
- two local builds byte-identical.

Runner:
- Git blob: `499df9b94b5b89354837570da0c7e47ec280025d`;
- bytes: `45147`;
- SHA-256: `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`;
- future install mode: `0444`.

## Hosted evidence

Workflow run:

`38907707370`

Jobs:
- source proof: `116995380702`;
- derive A: `116995572746`;
- derive B: `116995572622`;
- derive C: `116995572620`;
- independent compare: `116995745825`.

Artifacts:
- A: `12048404718`;
- B: `12049405108`;
- C: `12048996525`.

The three hosted V6 candidate reports are byte-identical. The compare job independently
re-preprocessed, recompiled, relinked and stripped the exact source and required the
rederived ELF and complete static toolchain/linker closure to match.

## Bound derivation generation

The lock binds:
- candidate proof blob
  `696eacfd72ba31ae4b00a1ddf98e91b0cabb5134`;
- candidate workflow blob
  `c4651ce5b75baa752682ce82daac6229a030c3c6`;
- V3 native source blob
  `5021727f1def1ec11f870d735cab65acc1701a5e`;
- repaired V3 runner blob
  `499df9b94b5b89354837570da0c7e47ec280025d`;
- reconciled native-source proof blob
  `b48972c0f930f5a33754a390bd2289853fc93c93`;
- reconciled native-source workflow blob
  `428bd68439ab5b7251632107839346d6b18fc769`;
- sealed credential V2 blob
  `14cbe81e27d04fee77cbe75225ce308bf8561a7b`.

## Lock identity

`voidbuye2nativecandlock6_35ec4a132f0d2d4eeb53c65635788cda950f0071dd47f1bcb7f943d6c035d12c`

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

`void_buy_void_epoch2_live_composition_native_protected_install_v4`.

PROTECT THE CORE.
