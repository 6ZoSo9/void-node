# Authenticated paid-work production activation credential reference metadata v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_CREDENTIAL_REFERENCE_METADATA_V1`

This source-only record reconciles the selected activation credential with the
verified nine-record receiver state after the separately authorized receiver
restart. It contains no raw bearer token, token digest, private registry path,
private token path, Authorization header, private key, signature, payment
authority, or execution authority.

## Selected activation credential

The selected credential remains unchanged:

- credential and reference ID:
  `voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1`
- agent ID: `void-external-agent-e2e-fulfillment-canary-agent-v1`
- scope: `agent_paid_work_submit`
- not before: `2026-08-03T15:02:30Z`
- expires: `2026-08-05T00:00:00Z`
- normalized private token-path fingerprint SHA-256:
  `7e350b1c58a25d41317953fce4958eb07ca33810b6546e2021cebd110400d454`

The private token path and raw credential remain operator-owned and absent from
source.

## Verified nine-record registry

The receiver now loads the exact reviewed registry:

- registry ID: `voidapwcr1_ce24175f3144131773f730d4989113b949998d79c48c3ddbd9752390122aac4f`
- registry SHA-256: `92e3149e560f7fa159d8fb5c59cd680cb6547a8a8f8010036bc02c4aa8d6e00e`
- credential count: `9`
- receiver classification: `RECEIVER_ACTIVE_TARGET_REGISTRY`
- receiver loaded target registry: true
- receiver restart required: false
- receiver configuration revalidation required before later execution: true

The previously reviewed eight-record registry is preserved exactly as the prefix
of this registry. The ninth record is a safe append.

Credential `voidapwc1_1c0f4b2e47c6943bcf3bd1570b9650a332315639877dda2024550fffc9ec2dc3` remains installed but is not selected by
this activation metadata.

Fresh direct requester credential `voidapwc1_3e4068bf267d3e1625f87a27b0ef97a6c96ce5f279614f0f76c80961c65cd6dc` is also installed.
It is not substituted for the Work-Credit-bound selected activation credential.

## Restart evidence

The separately authorized restart is bound by sanitized evidence:

- receipt marker:
  `VOID_PAID_WORK_RECEIVER_NINE_RECORD_REGISTRY_RESTART_V1`
- receipt SHA-256: `d488a4f35a32b1ba8c8a0a955ce28b095af585391ae34e87c41a7f6837e48a49`
- receipt recorded at: `2026-08-03T23:08:43.343081Z`
- receiver PID: `1128846` to `1426443`
- PID changed: true
- health HTTP status: 200
- receipt count before and after: `27`
- submission-index count before and after: `27`
- stable unit configuration preserved: true
- process command identity preserved: true
- no registry write, token read, submission, payment, Work Credit write,
  deployment, transaction broadcast, or fund movement occurred.

The receipt path is not published.

## Receipt authenticity boundary

Source stores the sanitized receipt marker, digest, timestamp, and reported
outcome. The private receipt bytes and path are deliberately absent, so the
repository proof cannot reopen the receipt, recompute its digest from private
evidence, or authenticate who produced it.

The digest is useful for exact comparison with the independently retained
operator receipt. By itself, it does not prove the receipt's origin, prove that
the reported runtime observations were true, or establish current receiver
state. This metadata must therefore be treated as a content-addressed record of
reviewed operator evidence, not as an independently source-verifiable runtime
attestation.

## Freshness and execution boundary

The captured receiver state proves that the nine-record registry was loaded at
the evidence time. It does not make runtime state permanently fresh.

`current_runtime_freshness_proven_by_source` therefore remains false. Any later
activation lane must freshly revalidate the receiver, registry, selected
credential validity and revocation state, trusted context, replay state, quote,
signatures, execution-plan digest, and ZoSo confirmation.

Live authenticated paid-work submission remains unobserved in this source lane.
The readiness decision remains `HOLD`.

## Authority

This source lane does not authorize or perform:

- credential or token access;
- another receiver restart;
- activation, deployment, or listener creation;
- quote acceptance, payment, or work dispatch;
- Work Credit writes;
- wallet or signer access;
- signing or transaction broadcast;
- VOID settlement or fund movement.

## Canonical files

- `config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json`
- `schemas/authenticated-paid-work-production-activation-credential-reference-metadata-v1.schema.json`
- `scripts/prove_authenticated_paid_work_production_activation_credential_reference_metadata_v1.mjs`
- `docs/operations/authenticated-paid-work-production-activation-credential-reference-metadata-v1.md`