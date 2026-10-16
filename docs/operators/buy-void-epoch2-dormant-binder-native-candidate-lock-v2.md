# Buy VOID Epoch-2 dormant binder native candidate lock V2

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V2`.

Status: **candidate identity acceptance only; not installed and not authorized for live execution**.

## Purpose

Accept exactly the finalized-input dormant-binder native candidate derived by
merged #3362 without broadening its authority.

The accepted candidate is the sealed-source V2 successor to merged #3360 and
the monotonic failure-truth repair in #3358. The lock does not reinterpret the
older V1 reproducibility evidence as final build authority.

## Accepted hosted candidate

Candidate source head:

`f34d495e99e4b9af576cf3c1f57c0d849594bc79`

Candidate merge on main:

`f036dbcf98ba032b701a0e35721d22bec4f09735`

Candidate ID:

`voidbuye2dormantbindercand2_342712bbfdc6c999ca3c4bb132b02531df94356ffd1e5bb0b21d40c8f82d33ce`

Canonical candidate report:

- bytes: `7626`;
- SHA-256:
  `eff80dfa0fc19455fa46cb5db2db6b49a467bd473ad11057b834a5c511f87559`;
- Git blob:
  `1692d67d966f5ff61c5e5fd0e34cb579d1a4c990`.

Native ELF:

- bytes: `726976`;
- SHA-256:
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`;
- static ELF64 x86-64;
- no `PT_INTERP`;
- hostile `LD_PRELOAD` blocked before native main.

## Build provenance

The accepted report binds:

- finalized native source Git blob
  `4fdf3f627f407335b9d50800fbbc913d1edae523`;
- dormant V3R binder Git blob
  `9c29eb4716077e459b9154f39d0f30cf2e56729f`;
- merged V1 candidate proof
  `5ac4264d7f9bdb394cf5be4490aa1eadd1f929ee`;
- V2 sealed-source candidate proof
  `f74716fd81c234ba1f97951f765b4683821ad856`;
- V2 candidate workflow
  `b23372fc59b035e1d5d5e05bd09d4bac527125f7`.

The V2 build copies the reviewed source bytes into a sealable Linux memfd,
applies WRITE/GROW/SHRINK/SEAL seals, and preprocesses/compiles only through
the inherited sealed descriptor. The mutable checkout pathname is not build
authority.

The complete compiler/linker/static-input toolchain is root-owned,
non-group/world-writable under protected ancestry, and is independently
revalidated after the build.

The substitute/restore adversary proves a visible source-path replacement
cannot alter the sealed build input or its ELF output.

The exact repaired native self-test remains bound, including:

`failure_truth_boundary_test_modes=true`.

## Hosted evidence

Workflow run:

`38952316827`

Jobs:

- source proof: `117146480477`;
- derive A: `117146626692`;
- derive B: `117146626778`;
- derive C: `117146626682`;
- independent compare: `117146811585`.

Artifacts:

- A: `12069362117`;
- B: `12068953235`;
- C: `12069362105`.

All three hosted candidate reports and ELFs were byte-identical. The compare
job independently rederived both again.

## Lock identity

`voidbuye2dormantbinderlock2_ff414ad8704f0a4fc487bae78a3938d5b7312205c084a0ae9fe0cbafcc80b96a`

The suffix is SHA-256 over canonical JSON of the complete lock body excluding
`lock_id`.

## Authority boundary

The lock changes candidate identity acceptance only:

```text
candidate_accepted=true
native_binary_identity_accepted=true
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

No Precision installation, service mutation, credential/private-key access,
signature, RPC/transaction, payment acceptance, presale/WC activation,
treasury/liquidity action, or funds movement is authorized.

## Next gate

The next separately versioned source gate is:

`void_buy_void_epoch2_dormant_binder_native_candidate_materializer_v1`

It may materialize the exact accepted report/ELF as install inputs, but must
not install or execute them.

PROTECT THE CORE.
