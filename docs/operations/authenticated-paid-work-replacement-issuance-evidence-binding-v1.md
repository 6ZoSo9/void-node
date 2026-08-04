# Authenticated paid-work replacement issuance evidence binding v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_EVIDENCE_BINDING_V1`

## Problem

The replacement issuance preparation packet is closed and content-addressed, but its standalone validator can prove only the packet's own shape, constants, authority denials, and packet ID. A caller can construct a separately content-addressed packet that claims `contracts_validated=true` while substituting another well-formed runtime receipt ID, trusted-context binding ID, or observation time.

That is not a packet-hash failure. It is an evidence-linkage boundary: an unkeyed packet cannot prove that the evidence objects named inside it were actually supplied and validated.

## Registry-facing verification

Registry-facing and operator-review code must call:

```text
verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1
```

with the packet and one exact closed evidence input containing:

- the credential rotation plan;
- the rotation runtime-revalidation binding;
- the sanitized runtime-revalidation receipt; and
- the trusted-context binding.

The verifier re-runs all four existing source validators and both existing composition guards. It then requires exact linkage for:

- rotation plan ID;
- rotation runtime-binding ID;
- runtime receipt ID;
- trusted-context binding ID;
- runtime observation time;
- current credential ID;
- destination Work Credit account;
- rotation boundary;
- replacement agent, scope, and destination account; and
- runtime credential, agent, and scope.

Unknown evidence-input keys fail closed.

## Primitive versus composed verification

`validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(...)` remains the deterministic packet-shape and content-address primitive. It is useful for parsing, storage, and byte-integrity checks, but it is not sufficient evidence that the named source records were supplied or validated.

Only the composed evidence-binding verifier closes that registry-facing claim. A consumer must not interpret `contracts_validated=true` from a standalone packet as independently established runtime or rotation evidence.

## Adversarial proof

The focused proof constructs correctly resealed standalone packets with:

- a substituted runtime receipt ID;
- a substituted trusted-context binding ID; and
- a substituted observation time.

Each packet still satisfies the standalone packet validator, demonstrating the exact boundary. The composed verifier rejects every substitution against the supplied evidence objects. The proof also rejects additional evidence-input fields that could imply undeclared authority.

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_EVIDENCE_BINDING_V1_PROOF_GREEN
```

## Authority boundary

This verifier reads only caller-supplied source records. It does not authenticate their producer, inspect a host, read a private path or token, generate credential material, write a registry, restart a receiver, retire or create a Work Credit binding, authenticate a live request, acquire or accept a quote, authorize or execute payment, dispatch work, write Work Credits, access a wallet or signer, construct or broadcast a transaction, or move funds.

The preparation decision remains `HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION`, and all operational authority remains false.
