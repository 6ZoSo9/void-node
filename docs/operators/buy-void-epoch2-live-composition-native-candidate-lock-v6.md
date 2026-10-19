# Buy VOID Epoch-2 live-composition native candidate lock v6

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V6`.

Status: **final-integration acceptance contract for the reviewed V6 native/runner candidate; not installed and not authorized for live execution**.

## Candidate proposed for acceptance

Source head:

`d85f1a7c65ff5997009bfaf3357b6cbf09b9569e`

Candidate head:

`9fff4238090e861b5bd766478999771f42341fcf`

Candidate ID:

`voidbuye2nativecand6_06aa80d52c84e6e466dc4c43ed21dcf1de79e1d69f0280ba9e3ffb8212404a53`

Candidate report:
- bytes: `59709`;
- SHA-256: `7cbaa48b6b7aab75555fd9d55e1f1f1600a4653df35feed6b709c621256784fb`;
- Git blob: `00534c145fd07fbd4c5adafb404a6928c9e8ee20`.

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

`38912148111`

Jobs:
- source proof: `117010396036`;
- derive A: `117010548739`;
- derive B: `117010548620`;
- derive C: `117010548525`;
- independent compare: `117011425585`.

Artifacts:
- A: `12050572961`;
- B: `12051066274`;
- C: `12051071169`.

The three hosted V6 candidate reports are byte-identical. The compare job independently
re-preprocessed, recompiled, relinked and stripped the exact source and required the
rederived ELF and complete static toolchain/linker closure to match.

## Bound derivation generation

The lock binds:
- candidate proof blob
  `8abbe3956d6b2a6f5599e3efa18010f622569e61`;
- candidate workflow blob
  `8e3879df85e6cb40e96b5905b6a72ca771f735de`;
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

`voidbuye2nativecandlock6_016c2764d5d33c9078fd5120addd2ff7ef25c8d6bf30d5d6741b05a5036a1f22`

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
