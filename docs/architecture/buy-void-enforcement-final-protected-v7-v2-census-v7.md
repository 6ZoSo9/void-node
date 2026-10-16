# Buy VOID — protected V7/V2 source census V7 (range + receipt custody)

Status: **source/CI-only, unaccepted. No production permission.**

## Parent and security boundary

This census is stacked on the composed receipt-custody source of PR #3388
at `5a4e1611d6590e0525eb24a34737e9af9783cc8e`. That parent contains both the range-generation changes from
#3368 and the reviewed deployment-receipt custody repair from #3386.

The census independently derives a new 49-path protected source identity from
the frozen V2 baseline, which must have **exactly three source changes**:

| Source path | Frozen baseline blob | Reviewed current blob | Mode |
| --- | --- | --- | --- |
| `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts` | `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0` | `72dec8920c1a7177d353400c33b71c2de2562aba` | 100644 |
| `ops/run-void-node-live-v1.sh` | `6fb040de128ce0df16e848d61ea5f4acb62794da` | `d7d7aede7fcd764a6182bd31f12338c5d3674ecb` | 100755 |
| `src/index.ts` | `123ec1792a027f93d4c9030749a0e7e136a75a44` | `7df1f21c730b554c414c88c550a4475234485370` | 100644 |

The other 46 protected paths must remain byte- and mode-identical. The
reviewed custody source, proof, and operator documentation are pinned to
their original Git blobs; the frozen V2 candidate/lock and historical V5/V6
census source evidence are not rewritten or repinned.

Each hosted Node 22/24/26 lane builds and checks 28 economic artifacts and
28 economic sources against accepted digests. Hosted JSON must be byte
identical across all three nodes. A fourth independent Node 24 build and
rederivation must match the hosted bytes.

The custody fixture **source is bound**, but this census does not re-execute
the privileged root fixture. Its separate review/qualification remains
required.

## Explicit HOLD

Even if the census passes, it carries no enforcement acceptance:

- `census_only=true`
- `complete_executable_closure_verified=false`
- `candidate_enforcement_identity_accepted=false`
- `deployed_artifact_generation_verified=false`
- `runtime_mount_authority=false`
- `production_source_finality_authority_ready=false`
- `public_presale_activation=false`
- `funds_movement=false`

No host installation, runtime/service action, credentials, keys/signing,
customer payment acceptance, presale/WC activation, treasury or funds action.

Next gate: a **new versioned protected candidate** bound to this exact
hosted V7 census, then a separately reviewed acceptance lock.

**PROTECT THE CORE.**
