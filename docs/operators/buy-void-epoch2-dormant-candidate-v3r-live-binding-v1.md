# Buy VOID Epoch-2 dormant candidate V3R live binding v1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V1`.

Status: **source/test/CI only**. Live execution remains separately authorized.

## Purpose

Dormant candidate V4 already contains accepted public signer-control evidence
for the immutable Epoch-2 fulfiller, but deliberately keeps installed credential
identity and runtime-source binding false.

This successor defines the live evidence binding operation for the accepted
V3R credential/V3 live-composition generation and closes the binder's
privileged first-instruction boundary with a separate native preentry source.

It does not accept a caller-provided live receipt or caller-provided JavaScript
as live binding authority.

## Exact source inputs

Dormant candidate V4:

- path:
  `ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v4.json`;
- Git blob:
  `e569c9211e01f14c7c00dd1c5041d4dfb0817609`;
- signer-control proof remains true;
- systemd credential identity remains false before this gate;
- runtime/apply enable flags remain `0`.

V6R2 installed qualification V5:

- source:
  `ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py`;
- Git blob:
  `a04c2e7665294cdd142426e9eb01ee27c5292b8d`;
- accepted V6R2 lock:
  `voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417`.

Fixed installed credential-composition native live entry:

`/opt/void-buy-void-epoch2-live-composition-v3/void_buy_void_epoch2_live_composition_native_preentry_v3`.

The credential-composition native preentry owns the privileged first
instruction for the child signing-capability sequence and executes the accepted
fixed V3 runner. The binder never executes that runner directly.

The outer dormant-candidate binder now has its own source-only native first-entry
candidate:

`ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v1.c`.

Future reviewed installed paths are fixed under:

`/opt/void-buy-void-epoch2-dormant-v3r-binding-v1`.

The native candidate binds the exact reviewed binder Git object
`714f44387606ec54ecc3d7bd2cb1f7ed2209e6fe`, exact binder bytes
(39391) and SHA-256
`60294169a7fa6ccf3c82988eb6e564ec3ec94e040021e9776686395fc9c9bdb4`.
It also verifies the fixed Node executable against the already protected V3
policy before Node evaluates the binder.

This PR defines the native source only. It does not install, materialize or
accept a native binder-preentry binary.

## Future live sequence

A future separately authorized root run, only after a separately reviewed
native-binder candidate/install/qualification generation exists:

1. invokes the fixed installed binder native preentry with `/dev/null` stdin,
   exact confirmation and exact expected HEAD;
2. the native preentry proves its fixed root-owned generation, opens the fixed
   root-owned binder source and fixed Node with `O_NOFOLLOW`, verifies the
   exact binder digest and Node digest/size from the protected V3 policy, then
   forks;
3. the child enters the retained Node descriptor with `fexecve()`; the parent
   supplies only the already-verified binder bytes over a private source pipe
   and a separate private parent-proof pipe binding parent/child start ticks and
   preentry/binder/Node inode generations;
4. the binder validates that private proof and the live parent process
   generation before any checkout/qualification/live-binding action;
5. the binder verifies clean exact `main` and loads dormant candidate V4 from
   Git;
6. it executes exact V6R2 installed qualification from its Git object;
7. it invokes the fixed installed credential-composition native V3 preentry
   with `/dev/null` stdin;
8. it validates the directly returned `voide2livecomp3_...` receipt and its
   content-addressed receipt ID;
9. it executes V6R2 installed qualification again, requires identical
   before/after qualification records, revalidates clean exact `main`, and
   revalidates the outer native-parent proof before emitting the binding
   receipt.

A caller-set environment marker is insufficient. Direct worktree or arbitrary
stdin JavaScript `--run` has no live authority and fails before the live
binding sequence.

No caller-supplied receipt path, stdin receipt, CLI receipt, or environment
receipt is accepted.

## Facts promoted by a GREEN future receipt

Dormant candidate V4 already proves:

- `signer_offchain_control_proven=true`.

Only after the fixed native live composition returns a valid V3 receipt may the
binding receipt add:

- `systemd_credential_identity_proven=true`;
- `active_signing_capability_proven=true`;
- `runtime_source_generation_bound=true`;
- `authenticated_private_manager_generation_bound=true`;
- `protected_v6r2_generation_verified=true`;
- `retained_v4_predecessor_verified=true`.

The complete public V3 live-composition receipt is retained inside the binding
receipt.

## Remaining gates

Exactly three gates remain after a GREEN binding receipt:

1. `qualify_live_exact_chain_receipt_and_either_zero_fee_envelope_or_per_payment_native_gas_funding`;
2. current Chain-2050 one-payment/one-fulfillment canary;
3. coupled presale + WC/VOID Sovereign activation.

The exact chain receipt is mandatory in **both** fee branches. After that,
fee admissibility is either:

- a reviewed live zero-fee envelope; or
- separately reviewed payment-specific native-gas funding/reservation.

A standing fulfiller native balance is not funding authority.

The result still says:

- `customer_safe_to_pay=false`;
- `transaction_signing_proven=false`;
- `transaction_signing=false`;
- `transaction_broadcast=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `funds_movement=false`;
- `production_host_evidence_authority=false`.

## Sensitive boundary

The binder itself does not read credential contents. Its fixed-native child
eventually performs the separately reviewed V3 live composition, whose sealed
child reads the systemd credential and performs one non-transaction signature.

Therefore live binding is separately authorized.

Hosted CI executes only syntax, native-source compilation/self-test, binder
self-test, inert plan, direct-invocation negatives, static/adversarial proof and
diff hygiene. It does not place anything under `/opt`.

The current binder source consumes installed qualification V5, Git blob
`a04c2e7665294cdd142426e9eb01ee27c5292b8d`. Historical V4/V4R
qualification generations remain evidence only and are not silently repinned
or imported by this restack.

Even GREEN source CI leaves
`production_host_evidence_authority=false`; an exact native candidate,
acceptance lock/materializer, protected installation and installed qualification
remain required before any live binder handoff.

PROTECT THE CORE.
