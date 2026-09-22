# DataNet Content Commitment Signing Eligibility Preflight v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_SIGNING_ELIGIBILITY_PREFLIGHT_V1`

Status: live read-only Chain-2050 revalidation plus fixed publisher credential identity binding. This gate may read the fixed DataNet publisher credential and perform read-only loopback RPC. It cannot sign, broadcast, write Chain-2050, mutate validators/governance/Work Credits, restart services, or move funds.

## Purpose

The publisher credential binding merged in #1697 proves identity but deliberately does not prove that the dynamic transaction fields remain fresh after the credential read.

This gate closes that gap without granting signing authority.

The order is mandatory:

1. run the complete hardened pre-sign revalidation;
2. bind the fixed publisher credential to that exact fresh candidate;
3. run the complete hardened pre-sign revalidation again;
4. require the entire unsigned type-2 candidate to be byte-for-byte canonically identical across the credential-binding window;
5. require the fee-policy fingerprint and RPC-endpoint fingerprint to remain identical across both passes.

Any nonce, gas, fee, target, calldata, policy, RPC binding, or other candidate-context drift HOLDs.

The final revalidation therefore occurs after credential access and again proves the object is uncommitted, the pending nonce is stable, and the final nonce was reread after the hardened object preflight.

## Sovereign bottleneck

GREEN means only:

`eligible_for_separate_sovereign_one_shot_signing_authorization=true`

GREEN explicitly also means:

`transaction_signing_authorized=false`

`this_receipt_is_bearer_signing_authority=false`

No signing authorization is inferred from AI speed, a prior review, a credential match, or a green Chain-2050 observation.

The next gate remains an explicit Sovereign decision boundary:

`sovereign_one_shot_datanet_signing_authorization_without_broadcast_v1`

That later gate must bind one exact transaction candidate and one exact eligibility-preflight ID. It must not authorize broadcast.

Even a valid Sovereign authorization is not allowed to substitute for live signing-time freshness. The eventual signer gate must rerun the Chain-2050 freshness checks again immediately before it accesses a signer.

## Fail-closed cases

The gate HOLDs when:

- the first fresh pre-sign revalidation fails;
- the fixed publisher credential does not derive to the candidate publisher;
- the credential file violates the #1697 boundary;
- the final fresh revalidation fails;
- the unsigned call plan changes;
- any field of the unsigned type-2 candidate changes across the credential-binding window;
- the final freshness wall is weakened; or
- any upstream signing/broadcast/write authority bit is unexpectedly true.

## Production transport boundary

The production wrapper rejects any caller-injected transport.

The explicit fingerprint-parameterized proof/helper variant may use a synthetic transport only with a non-production Sovereign fingerprint. If the production Sovereign fingerprint is supplied, injected transport is rejected there as well.

Every GREEN receipt content-binds the exact Sovereign review fingerprint used for verification. Downstream production authorization must require the canonical production fingerprint.

This prevents a caller from substituting fabricated RPC responses while still receiving a production-trust freshness eligibility receipt.

## Authority boundary

A GREEN result records that read-only RPC and credential-address derivation occurred.

It does not expose the raw private key or a signer object and does not authorize or perform:

- transaction signing;
- transaction broadcast;
- Chain-2050 writes;
- validator mutation;
- governance mutation;
- Work Credit mutation;
- service actions;
- funds movement; or
- automatic retry.

CI uses only an ephemeral synthetic credential fixture and a synthetic RPC transport.
