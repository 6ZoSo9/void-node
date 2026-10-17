# Buy VOID Epoch-2 live-composition native candidate lock v4

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V4`.

Status: **accepted native/runner candidate identity only; not installed and not authorized for live execution**.

## Accepted candidate

Source head:

`c79f00af941dac094bf71f0d6c5c68ba64380b1f`

Candidate head:

`04e4eb0ade8f496e5cd1d714e372aac85fc2cfe8`

Candidate ID:

`voidbuye2nativecand4_2c987bafa2a70d4c2b60d85a6ab73fb1e39fda8e9f99b064114c123d7ae25527`

Candidate report:
- bytes: `59708`;
- SHA-256: `7c82a83de737e4bd8e0ea10b26c94ff4baca48838c1ff865b9a21fd93e8c95e8`;
- Git blob: `31305a36bf92647db0787c282b811d19c44c4514`.

Native ELF:
- bytes: `722880`;
- SHA-256: `09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4`;
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

`38888229142`

Jobs:
- source proof: `116931110943`;
- derive A: `116933095369`;
- derive B: `116933095489`;
- derive C: `116933095460`;
- independent compare: `116933749788`.

Artifacts:
- A: `12041062668`;
- B: `12041107587`;
- C: `12040228657`.

The three hosted candidate reports are byte-identical. The compare job independently
re-preprocessed, recompiled, relinked and stripped the exact source and required the
rederived ELF and complete static toolchain/linker closure to match.

## Bound derivation generation

The lock binds:
- candidate proof blob
  `9d0f3740d12e136e0a47d13451a83ae1c99b112a`;
- candidate workflow blob
  `8552d69778f3b913862c423ee3afa6822a8e54e7`;
- V3 native source blob
  `2e75b8a6fa5ecc36ce2ca05d920001a16abcf5b7`;
- repaired V3 runner blob
  `baab733e43c030d24f8d4abd1644f3c4ae55c3b2`;
- reconciled native-source proof blob
  `5eaa10bebca7cd1c3a8220b2e901900bc95e39f8`;
- reconciled native-source workflow blob
  `40b533a594bfa2b9d5c5624a653aa1901cd7a92a`;
- sealed credential V2 blob
  `14cbe81e27d04fee77cbe75225ce308bf8561a7b`.

## Lock identity

`voidbuye2nativecandlock4_3e6f7806914c54c55ee6658616a3a1590dc4ba29c60dc4cc764c60390d517418`

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

`void_buy_void_epoch2_live_composition_native_protected_install_v2`.

PROTECT THE CORE.
