# Authenticated paid-work production activation credential reference metadata v1

This record explicitly replaces the expired credential reference with the
separately issued fresh credential while preserving the fail-closed runtime
boundary.

## Fresh credential reference

- credential/reference ID: `voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1`
- agent ID: `void-external-agent-e2e-fulfillment-canary-agent-v1`
- scope: `agent_paid_work_submit`
- registry ID: `voidapwcr1_d5dafad265dc38237b11654142b9690c967f06e106e931d47dba2cf1eec996e5`
- registry SHA-256: `5eda9121fbf72bac5d28289b41314f30a6164b50f636aed0f1198bde7d769cb9`
- registry credential count: `8`
- normalized private token-path fingerprint SHA-256:
  `7e350b1c58a25d41317953fce4958eb07ca33810b6546e2021cebd110400d454`
- not before: `2026-08-03T15:02:30Z`
- expires: `2026-08-05T00:00:00Z`
- validity duration: `118650` seconds
- sanitized credential response: `voidapwcires1_e5324ce89c4d7a20322c7804eec86706d24458c4981d8465a56132db1c62cdf0`

No raw token, token digest, private path, Authorization header, or private key
is embedded in source.

## Active Work Credit binding

- binding ID: `voidapwcb1_77b02c3c54223062915d1d6b4d9ee0464c575899c164c52502391fff492abf56`
- binding registry ID: `voidapwcbr1_f27a463089e3d00154963b699e39085e9ea08ce321f257270f4e5aa5be0925c2`
- binding registry SHA-256: `e620f323b8b00fe0bdd5dcbdbed945c4166bf0cf904ed07af1f5ac6be1fccbaa`
- destination WC account: `void-external-agent-e2e-fulfillment-canary-v1`
- review decision ID: `voidapwcird1_11a2eea2b2831d3c72aa37f1a72a4799a7b02a7d8056b7a24d08eca8b08f688a`
- issuance preparation ID: `voidapwcip1_9b02794b68fbc4a25b816fa95cab022bdc5c35039109b0095d99553832cd28e6`
- valid from: `2026-08-03T15:02:30.000Z`
- valid until: `2026-08-05T00:00:00.000Z`

The binding is active and unique for both the credential and destination. It
does not authorize payment, WC ledger mutation, settlement, wallet access, or
fund movement.

## Receiver honesty boundary

The active receiver is classified as `RECEIVER_ACTIVE_STALE_REGISTRY`. It has
not loaded the reviewed target registry. The source metadata therefore records:

- receiver loaded target registry: `false`
- receiver restart required: `true`
- receiver configuration revalidation required: `true`
- live authentication observed: `false`
- live HTTP status: `null`

Receiver reconfiguration or restart remains a separate operator-confirmed
operation. This source patch performs neither.

## Rotation and readiness

The prior record referenced expired credential `voidapwc1_4930d236de11a88f7d856c6b6396bc5139095ef9eaa5aabdc6490a041903a426` and
obsolete registry `voidapwcr1_89002fa57d804ced69cc48e832496c131ba460c67fdac34f9664921cc1b01415` with SHA-256
`e2d6a292ef506f9fd4616b36feb9767929a184f6e35e18e3ff1378ec5983d852`. That lineage remains in Git history.

This record satisfies only `credential_reference_metadata`. Readiness remains
**HOLD**. Bounded replay snapshot, activation-execution confirmation, live-canary
scope, execution-packet refresh, and a separate receiver decision still remain.

## Proof and authority

Run:

```bash
node --check scripts/prove_authenticated_paid_work_production_activation_credential_reference_metadata_v1.mjs
node scripts/prove_authenticated_paid_work_production_activation_credential_reference_metadata_v1.mjs
```

The proof validates the exact closed schema, fresh credential and binding,
stale receiver observation, absence of private material, and complete
no-activation authority boundary.
