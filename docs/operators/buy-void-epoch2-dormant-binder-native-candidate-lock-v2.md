# Buy VOID Epoch-2 dormant binder native candidate lock V2

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V2`.

Status: **candidate/native identity acceptance only; not installed and not authorized for live execution**.

## Accepted candidate

Canonical candidate source head:

`0fa249522c955aff03d3eaa24b768381a32d987b`.

Final candidate PR head:

`f34d495e99e4b9af576cf3c1f57c0d849594bc79`.

Merged candidate generation:

`f036dbcf98ba032b701a0e35721d22bec4f09735`.

Candidate ID:

`voidbuye2dormantbindercand2_342712bbfdc6c999ca3c4bb132b02531df94356ffd1e5bb0b21d40c8f82d33ce`.

Candidate report:
- bytes: `7626`;
- SHA-256:
  `eff80dfa0fc19455fa46cb5db2db6b49a467bd473ad11057b834a5c511f87559`;
- Git blob:
  `1692d67d966f5ff61c5e5fd0e34cb579d1a4c990`.

Native static ELF:
- bytes: `726976`;
- SHA-256:
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`;
- ELF64 little-endian x86-64 executable;
- no `PT_INTERP`;
- static link required;
- hostile `LD_PRELOAD` positive control fires while the native preentry blocks it;
- two local builds byte-identical.

## Finalized build authority

The accepted V2 candidate does not use the mutable checkout source pathname as
compiler authority.

It binds exact reviewed native source blob:

`4fdf3f627f407335b9d50800fbbc913d1edae523`

and copies the verified bytes into a sealable Linux memfd before preprocessing
or compilation.

The source snapshot requires:
- `F_SEAL_WRITE`;
- `F_SEAL_GROW`;
- `F_SEAL_SHRINK`;
- `F_SEAL_SEAL`;
- write-after-seal rejection;
- preprocessing from the inherited sealed descriptor only;
- compilation from the inherited sealed descriptor only;
- visible checkout substitute/restore inability to alter candidate bytes;
- final visible-source revalidation.

The accepted report also binds root-owned, non-group/world-writable compiler,
assembler, linker, strip binary and static-link inputs beneath protected
ancestry. The complete toolchain identity is rederived after the build and must
match exactly.

## Binder source

The accepted native first-entry binds exact JavaScript binder source:

- Git blob:
  `9c29eb4716077e459b9154f39d0f30cf2e56729f`;
- SHA-256:
  `afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e`.

The merged V2 binding proof/workflow/doc remain exact:
- proof `4671d37fcdb43c2bee9d3de16402df0cd25257bb`;
- workflow `2742145ab88d721747f978927a6eb64a7c5f805f`;
- operator contract `cd90bafa39682284a6d9e87daebfe5966adac8d6`.

The accepted native self-test transcript also binds the repaired failure-truth
semantics, including `failure_truth_boundary_test_modes=true`.

## Hosted evidence

Workflow run:

`38952316827`.

Jobs:
- source proof: `117146480477`;
- derive A: `117146626692`;
- derive B: `117146626778`;
- derive C: `117146626682`;
- independent compare/rederivation: `117146811585`.

Artifacts:
- A: `12069362117`;
- B: `12068953235`;
- C: `12069362105`.

The three hosted candidate reports and three native ELFs were byte-identical.
The compare job independently rederived both once more.

## Lock identity

`voidbuye2dormantbinderlock2_34df85425460aa9fc5192cee326de4b711deefbcb195dc6b7b6c3ebd23eb5597`.

The suffix is SHA-256 over canonical JSON of the complete lock body excluding
the `lock_id` field.

## Authority boundary

This lock changes only candidate/native identity acceptance:

```text
candidate_accepted=true
native_binary_identity_accepted=true
binder_source_identity_bound=true
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

No Precision installation, live binder execution, credential/key access,
signature, RPC, transaction, payment acceptance, presale/WC activation,
treasury action, or funds movement is authorized here.

Next gate:

`void_buy_void_epoch2_dormant_binder_native_protected_install_v1`.

PROTECT THE CORE.
