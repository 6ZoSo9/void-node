# Buy VOID Epoch-2 live-composition native candidate lock v3

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V3`.

Status: **accepted native/runner candidate identity only; not installed and not
authorized for live execution**.

## Accepted source generation

Canonical source merge:

`e7c5e20493e453053bc8c3d2c4fa85fbb994475b`

Qualified candidate head:

`ba8ecda0fe8051c7a18095b2488104761d783561`

The accepted V3 candidate report was produced by hosted workflow run
`38827587341`.

Hosted evidence:
- source-proof job `116738544687`;
- artifact A `12014924905`;
- artifact B `12015966807`;
- artifact C `12015976558`;
- independent compare job `116739451385`.

The three candidate reports were byte-identical and the compare job independently
re-preprocessed, recompiled, relinked and restripped the source while verifying
the complete recorded toolchain/link-input closure.

## Full candidate-report identity

The complete canonical V3 report is not duplicated into the repository. The
lock binds it by all three of:

- bytes: `59709`;
- SHA-256:
  `d17e765afaca21cbd980804dda51f5cd3886883fb628b2843bc5d72268b9769e`;
- Git-blob SHA-1:
  `35f341d6fb1e1ef2c43bb9a0d73dbe89ec14c649`.

Candidate ID:

`voidbuye2nativecand3_0132a4cc390000f28fb2d2ed8071a1593d184f754d5e9700a2ff8f1cb620ab27`

## Accepted binary identities

Native preentry:
- bytes: `726976`;
- SHA-256:
  `78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589`;
- static ELF64 x86-64;
- no `PT_INTERP`;
- hostile `LD_PRELOAD` constructor blocked before native `main()`.

V2 runner:
- bytes: `30103`;
- SHA-256:
  `2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73`;
- future install mode `0444`.

## Trust root

Implementation/source ancestry remains:

`b5a00bb7b2bb9fad046993971b7ead887feb0260`.

Exact source objects:
- native source:
  `4aa091e7835b32aa5c4e7b8e4059651c69a64eb3`;
- runner:
  `92e8c8696ea7e2bb81b6ef089db8baa657188935`;
- repaired privileged proof:
  `73062194b5b5ed304ff820d7fa33e66c5c8da436`;
- privileged-source workflow:
  `85c28fdf03345240332cbf41d46fbda065958ec7`;
- sealed credential V2:
  `14cbe81e27d04fee77cbe75225ce308bf8561a7b`;
- candidate verifier:
  `3b779a27cfd071c2569c438e3319b756b46c85c9`.

## Lock identity

`voidbuye2nativecandlock3_024c9e3818a40616fc8b198f605721bf76ed43d6d4f186bf02a202d46860a659`

The lock ID is SHA-256 over canonical JSON of the complete lock body excluding
the `lock_id` field.

## Fresh lock proof

Hosted lock CI:
1. re-runs the repaired native privileged-source proof;
2. verifies the exact four-file lock branch scope;
3. runs the V3 candidate verifier self-test;
4. rederives the complete candidate report from current source;
5. requires exact report bytes/SHA/Git-blob/candidate ID;
6. validates source, proof, runner, sealed-V2 and native binary identities;
7. recomputes the lock ID;
8. derives the complete lock JSON and requires byte equality with the committed
   lock file.

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
funds_movement_authorized=false
production_host_evidence_authority=false
```

No Precision installation, policy publication, root Node binding, live
credential access, signing, transaction, payment acceptance, presale/WC
activation, service mutation, or funds movement occurs.

Next gate:

`void_buy_void_epoch2_live_composition_native_protected_install_v1`.

PROTECT THE CORE.
