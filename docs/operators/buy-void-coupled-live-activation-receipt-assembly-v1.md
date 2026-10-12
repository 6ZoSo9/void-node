# Buy VOID coupled live activation receipt assembly v1

Marker: `VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_V1_GREEN`

## Purpose

Verify two already-produced EIP-712 signatures over the exact signing request
from the parent lane and deterministically derive the final private live
activation receipt bytes, SHA-256, and operator confirmation string.

This lane does not sign anything and does not install the receipt.

## Production verification

The assembler first re-verifies the complete content-addressed signing request.
It then recovers both signatures over that request's exact typed data and
requires the fixed identities from the coupled-launch gate:

- launch controller:
  `0x2f1e0005e865b772b268bd8c797bf3eaa901d97e`;
- Sovereign co-signer:
  `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`.

Callers cannot override those identities in the production assembly function.

Production assembly is permitted only while the frozen lease is already active
and not expired against the process wall clock sampled inside the production
assembler. Callers cannot supply or backdate the production assembly time.

The resulting artifact records exact `assembled_at_ms`. Historical verification
rebuilds the canonical assembly at that already-recorded time only to verify the
content-addressed artifact; that verification path does not mint a new production
assembly. Deterministic clock injection is exposed only through an explicitly
test-only proof helper.

The final receipt is serialized exactly as pretty JSON plus one terminal newline.
The assembler derives:

- `receipt_sha256`;
- exact byte length; and
- operator confirmation:
  `activate-coupled-public-buy-v1:<generation>:<generation_tip>:<receipt_id>:<receipt_sha256>`.

The assembly object is itself content-addressed as
`voidbclara1_<sha256(canonical-assembly-body)>`. Its verifier does not trust
selected fields from that body: it reruns the production assembler from the
embedded canonical signing request, embedded signatures, and recorded
`assembled_at_ms`, then requires canonical equality with the supplied
assembly.

## Deliberate CI limitation

CI does not possess either production key. The focused proof therefore:

1. proves generic EIP-712 recovery with synthetic keys;
2. proves the production assembler rejects those same synthetic signatures;
3. statically binds the production assembler to the two fixed identities; and
4. proves this lane exposes no key, signer, filesystem-write, runtime, market,
   presale, transaction, or funds authority.

There is intentionally no production-positive signature fixture in the
repository.

## Final boundary

Even a successfully assembled production receipt is still
`HOLD_PENDING_PRIVATE_RECEIPT_INSTALLATION_AND_LIVE_REVALIDATION`.

This lane does not prove current generation authority, external high-water
state, publication-intent clearance, receipt-file custody, source readiness, or
runtime activation. Those remain mandatory final checks in the coupled-launch
runtime gate.

Authority: private-key access false, signature creation false, filesystem write
false, runtime/service mutation false, transaction action false,
market/presale activation false, and funds movement false.
