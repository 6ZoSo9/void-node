# Buy VOID coupled live activation signing request v1

Marker: `VOID_BUY_COUPLED_LIVE_ACTIVATION_SIGNING_REQUEST_V1_GREEN`

## Purpose

Freeze the one exact EIP-712 `CoupledPublicLaunchActivation` statement that
both the reviewed launch-controller identity and the Sovereign co-signer must
sign for the live Buy VOID/WC-VOID coupled-opening lease.

This is a source-only preparation contract. It does not access either signer,
create a signature, install a live receipt, publish generation state, enable
request intake, activate WC/VOID, activate the presale, or move funds.

## Fixed identities

The compiler inherits the identities and typed-data contract directly from the
reviewed coupled-launch gate:

- launch controller:
  `0x2f1e0005e865b772b268bd8c797bf3eaa901d97e`;
- Sovereign/closeout controller:
  `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`;
- coupled launch ID:
  `sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d`.

Callers cannot substitute either signing identity.

The superseded `sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26` generation must not be signed or reused.
The corrected generation requires a fresh control/signing ceremony.

## Exact input

The builder accepts only six fields:

- `activated_at_ms`;
- `activation_generation`;
- `activation_nonce`;
- `expires_at_ms`;
- `generation_tip_sha256`;
- `source_composition_id`.

It rejects extra fields, malformed identities, expired requests, a lease longer
than five minutes, or an activation timestamp more than 30 seconds ahead of the
compiler clock.

Production preparation samples that compiler clock internally; callers cannot
supply or backdate the production preparation time. The content-addressed request
records `prepared_at_ms`. Verification may rederive an already-existing request
at that recorded time to check its historical bytes, but that verification path
does not mint a new production request. Deterministic time injection exists only
through an explicitly test-only proof helper.

The activation booleans, signer addresses, receipt marker/status, coupled launch
ID, and `source_ready_only=false` are fixed by source rather than caller input.

## Output

The output is content-addressed as
`voidbclasr1_<sha256(canonical-request-body)>` and contains:

- the unsigned receipt body and exact `voidbclive1_...` receipt ID;
- the exact EIP-712 domain, type set, primary type, and JSON-safe value;
- the exact EIP-712 typed-data digest;
- the two required signer identities and destination signature fields;
- an explicit authority boundary with all key/signing/runtime/funds authority
  false; and
- a mandatory next gate:
  `dual_offline_signatures_then_content_addressed_receipt_assembly_and_live_gate_revalidation`.

Both signatures must be made over the same typed-data digest. A control-
requalification signature, transaction signature, or signature over a
reconstructed/different payload is not interchangeable with this lease
signature.

## Negative evidence

This request does **not** prove that the supplied generation/tip is still live,
that the external high-water mirror is current, that no publication intent is
pending, that source readiness is green, or that receipt custody is acceptable.
Those remain final runtime-gate checks in the parent coupled-launch contract.

The proof uses synthetic keys only to demonstrate EIP-712 interoperability.
Synthetic signatures are explicitly not production authority.

## Verification

```bash
node scripts/prove_void_buy_coupled_live_activation_signing_request_v1.mjs
```

Authority remains source/proof only: private-key access false, signer access
false, signature creation false, transaction action false, runtime mutation
false, market/presale activation false, and funds movement false.
