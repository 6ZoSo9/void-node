# Buy VOID Epoch-2 dormant candidate V3R live binding v1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V1`.

Status: **source/test/CI only**. Live execution remains separately authorized.

## Purpose

Dormant candidate V3 already contains accepted public signer-control evidence for
the immutable Epoch-2 fulfiller, but deliberately keeps installed credential
identity and runtime-source binding false.

This successor defines the live evidence binding operation for the accepted V3R
credential/V3 live-composition generation.

It does not accept a caller-provided live receipt.

## Exact source inputs

Dormant candidate V3:

- path:
  `ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v3.json`;
- Git blob:
  `04061934a537a1d91213cdd1f9110b46faca4cc7`;
- signer-control proof remains true;
- systemd credential identity remains false before this gate;
- runtime/apply enable flags remain `0`.

V6R2 installed qualification:

- source:
  `ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v4.py`;
- Git blob:
  `767e088d1383a8cecf4d5daa7bf6779f368db56e`;
- accepted V6R2 lock:
  `voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417`.

Fixed installed native live entry:

`/opt/void-buy-void-epoch2-live-composition-v3/void_buy_void_epoch2_live_composition_native_preentry_v3`.

The native preentry owns the privileged first instruction and executes the
accepted fixed V3 runner. The binder never executes the V3 runner directly.

## Future live sequence

A future separately authorized root run:

1. requires this binder from its exact Git object on stdin;
2. verifies clean exact `main`;
3. loads exact dormant candidate V3 from Git;
4. executes exact V6R2 installed qualification from its Git object;
5. invokes the fixed installed native V3 preentry with `/dev/null` stdin;
6. validates the directly returned `voide2livecomp3_...` receipt and its
   content-addressed receipt ID;
7. executes V6R2 installed qualification again;
8. requires the before/after qualification records to be identical;
9. revalidates clean exact `main`;
10. emits one content-addressed dormant-candidate binding receipt.

No caller-supplied receipt path, stdin receipt, CLI receipt, or environment
receipt is accepted.

## Facts promoted by a GREEN future receipt

Dormant candidate V3 already proves:

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

1. zero-fee envelope + exact chain receipt, or separately proven per-payment native-gas funding for any nonzero-fee path;
2. current Chain-2050 one-payment/one-fulfillment canary;
3. coupled presale + WC/VOID Sovereign activation.

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

Hosted CI executes only syntax, self-test, inert plan, static/adversarial proof,
and diff hygiene.

PROTECT THE CORE.

## Fee-funding truth preserved from dormant candidate V3

This binder must not restore the predecessor V2 wording that could be read as
allowing a nonzero-fee path from a standing fulfiller native balance.

The first remaining gate is exactly:

`qualify_live_zero_fee_envelope_and_exact_chain_receipt_or_prove_per_payment_native_gas_funding`.

A zero-fee path may advance on exact zero-fee/receipt evidence. Any nonzero fee
path still requires a separately reviewed payment-specific native-gas funding or
reservation proof. A standing wallet balance is not funding authority.
