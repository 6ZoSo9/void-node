# Buy VOID protected V7/V2 candidate v5 — combined range + receipt custody

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V5`.

Status: **source/CI-only candidate; unaccepted and not deployable**.

## Purpose

V5 is the candidate successor for the combined protected-source generation
recorded by #3392's V7 census. It does not rewrite historical V3/V4 evidence.

The accepted predecessor remains V3 lock:

- lock Git blob:
  `92054f19fed9e8c243eb23321dbcf53fc9227a99`;
- accepted enforcement set:
  `bf158923831b21dd1e907c91cd4889afbe9fd8bce221e12b0fa1a2bb0896943d`.

V4 remains the historical range-only candidate and is not repurposed.

## Hosted V7 census

The candidate binds hosted V7 census run `38978991081`:

- Node 22 artifact: `12079778991`;
- Node 24 artifact: `12079957745`;
- Node 26 artifact: `12080546165`;
- census ID:
  `voidbefv7c7_1a85dcb768ab6d5348024cec816d82b7f3ac5cc53e738ec2169e78d4021a73a8`;
- JSON bytes: `26911`;
- JSON SHA-256:
  `326b81bf51fa4efa449b01b6b53e244b1d08dd7ea0d859cafd04954f6f4aa1fb`;
- JSON Git blob:
  `92ca40eb9b7bb79f6b56ad87807dc3586a3ce6ec`;
- protected inventory SHA-256:
  `e7e0625ff47dc4b4c7e0f93e4b75be30d04d9538acc233174c0abc18198b38e3`.

V7 proves exactly 49 protected paths, with exactly three changed identities and
46 unchanged identities.

## Exact protected delta

The only protected paths allowed to differ from the frozen V2 inventory are:

1. `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
   - before: `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`
   - current: `72dec8920c1a7177d353400c33b71c2de2562aba`;

2. `ops/run-void-node-live-v1.sh`
   - before: `6fb040de128ce0df16e848d61ea5f4acb62794da`
   - current: `d7d7aede7fcd764a6182bd31f12338c5d3674ecb`;

3. `src/index.ts`
   - before: `123ec1792a027f93d4c9030749a0e7e136a75a44`
   - current: `7df1f21c730b554c414c88c550a4475234485370`.

## Semantic requalification

Inventory equality is not sufficient for candidate acceptance. V5 re-executes
the reviewed current proofs for every changed protected path.

### Range/index generation

V5 pins and executes:

- `scripts/prove_void_index_block_range_bounds_v1.mjs`
  at `e478c71c730b554c414c88c550a4475234485370`? No: the proof's Git blob is
  `e478c71c564c4cf7349353a7936a9e8f56f97da1`;
- `scripts/prove_void_attach_block_range_bounds_v1.mjs`
  at `814e858bf8c326f7ea61341a60dd53269e75f7f3`;
- `src/http/api_attach.ts`
  at `350088d64b797951aa30306d5c40752c9f901563`;
- `src/http/api_attach.js`
  at `810e9c099e3fa8c8bd9d995a507bf921227a19df`.

This requalifies the canonical parser, aliases, bounded range behavior and
fail-closed invalid-bound classification on the exact candidate head.

### Canonical-producer generation

V5 pins and executes:

- runner `ops/run-void-node-live-v1.sh`
  at `d7d7aede7fcd764a6182bd31f12338c5d3674ecb`;
- current guard
  `runtime/canonical-producer-self-http-guard-v5.cjs`
  at `8f9ab041e23c7519621b4d6a4573c4fa8b302ab6`;
- source-generation dispatcher
  `66aea5ea3dc296d4648750ba0d74cf7b2efed072`;
- current observer proof
  `95687a9691b7eec93c028c82e81000cc214d065e`.

The dispatcher must prove current positive selection and obsolete-generation
refusal.

### Deployment-receipt custody

V5 pins and re-executes:

- installer
  `72dec8920c1a7177d353400c33b71c2de2562aba`;
- proof
  `d74aa53bc8ee87581de748d7d0fc57ffa0b13944`;
- operator contract
  `32dbc7a69187a09c5cd7fe27ed5481463a157a8f`.

The candidate therefore does not infer custody correctness merely from the V7
source census.

## Executable closure

V7 independently rebuilds the reviewed economic closure on Node 22/24/26 and
requires the four historical economic inventory digests to remain unchanged.
V5 combines that preserved executable closure with the accepted V3 predecessor
and fresh semantic proofs for all three changed protected paths.

Hosted V5 derivation must itself be byte-identical across Node 22, 24 and 26.
A fourth Node 24 job independently rederives the candidate and byte-compares it.

## Authority

V5 remains candidate evidence only:

```text
complete_executable_closure_verified=true
candidate_enforcement_identity_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

No Precision mutation, runtime/service change, RPC, credential/key/signing
access, payment acceptance, presale/WC activation, treasury action, or funds
movement is authorized.

A separately versioned acceptance lock is required after exact hosted V5
identity is known.

**PROTECT THE CORE.**
