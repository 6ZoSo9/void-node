# Buy VOID Epoch-2 dormant first-entry bootstrap V6 candidate lock V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CANDIDATE_LOCK_V1`.

Status: **candidate/source-generation identity acceptance only; not installed and not authorized for live execution**.

## Accepted source generation

Source generation:

`voidbuye2dormantsourcegen3_8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`

Canonical candidate merge:

`404367eb982fa92a40f3c2fe51d5f172a1e9fac0`

Tree:

`3d77c814e8dbde6d88e824f1b90667d69a39eeaf`

The source-generation manifest binds bootstrap V6 source blob
`560726bcae6ea0738502cb5e74b65f9116bd447d` and inner installer V5 blob
`ce6930bc1be8239a3171d4922c44b96a50f5778b`.

## Canonical hosted evidence

The acceptance lock uses the exact reviewed **PR-head hosted derivation** run. It does not claim post-merge main-push evidence:

- workflow run: `39077019801`;
- source proof: `117526163023`;
- derive A: `117526232018`;
- derive B: `117526232033`;
- derive C: `117526232057`;
- compare/rederive: `117526492254`;
- artifacts A/B/C:
  `12116918415`, `12117740915`, `12117910498`.

All three hosted reports and ELFs are byte-identical. The compare job independently
rederived the report and ELF.

The lock proof also creates a disposable detached worktree at exact canonical
candidate merge `404367eb982fa92a40f3c2fe51d5f172a1e9fac0`, reruns the
V6 candidate derivation there, and requires the exact report/ELF byte, SHA-256,
Git-blob and candidate-ID identities below. This prevents the newer lock branch
HEAD from becoming implicit candidate build authority.

## Accepted V6 candidate

Candidate:

`voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`

Candidate report:

- bytes: `2745`;
- SHA-256:
  `14a8c9b60440f81d906070d3efee3248ac60b2a4ae43783fe5c1484ff0847c3d`;
- Git blob:
  `d0302cf5a1b7af91b46458585784c70e0d37432f`.

Accepted static bootstrap V6 ELF:

- bytes: `874608`;
- SHA-256:
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`.

The report additionally binds a sealed memfd build input, compiler logical source
`stdin`, distinct source descriptor numbers, descriptor-number-independent
candidate identity, and post-build toolchain revalidation. The lock proof
rechecks those descriptor-independent fields on the freshly rederived canonical
report before acceptance.

## Lock lineage

Lock ID:

`voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`

The suffix is SHA-256 over canonical JSON of the lock body excluding `lock_id`.

Superseded prior V6 source-generation V3 lock:

`voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`

Its lock blob `f5b03c6b81016edf21f605099e0ef8976f40e107` remains immutable historical evidence and has zero install authority for the repaired generation.

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

## Git cruft-pack compatibility

The accepted V6 generation treats `pack-<oid>.mtimes` as non-authoritative cruft-pack metadata under the same regular-file/single-link shape checks as other pack auxiliaries. It is not copied into the private object view and does not grant object authority.
