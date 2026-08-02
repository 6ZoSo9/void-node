# Authenticated paid-work production activation credential reference metadata v1

This lane defines and semantically proves the non-secret
`credential_reference_metadata` required by the authenticated paid-work
production activation-readiness HOLD decision.

It creates one source-controlled reference record. It does not read the
operator-owned credential registry or bearer credential, disclose either
private path, embed a raw credential or token digest, invoke a credential
provider, or materialize an Authorization header.

## Canonical source record

The source record is:

`config/activation-candidates/authenticated-paid-work-production-activation-credential-reference-metadata-v1.json`

It uses the existing `credential_registry` reference contract from:

`scripts/external_agent_paid_work_authenticated_submission_activation_prerequisite_v1.ts`

The bound credential reference contains only opaque identity and fingerprint
metadata:

- registry ID: `voidapwcr1_89002fa57d804ced69cc48e832496c131ba460c67fdac34f9664921cc1b01415`;
- reviewed registry snapshot SHA-256: `e2d6a292ef506f9fd4616b36feb9767929a184f6e35e18e3ff1378ec5983d852`;
- registry credential count: `6`;
- credential ID and reference ID: `voidapwc1_4930d236de11a88f7d856c6b6396bc5139095ef9eaa5aabdc6490a041903a426`;
- agent ID: `void-external-agent-e2e-fulfillment-canary-agent-v1`;
- expected scope: `agent_paid_work_submit`;
- normalized private token-path fingerprint SHA-256:
  `b5a7679f1189583f4cccc01ac58c5ca1de8334b86870639df2faf58626306f16`;
- observed not-before time: `2026-08-01T17:11:15Z`;
- observed expiration time: `2026-08-02T17:11:15Z`.

The normalized private token path and registry path are intentionally absent
from Git. The raw bearer credential and its digest are also absent.

## Reconciled service-unit design

Current `main` also contains the separately reviewed source-only service-unit
design:

- artifact: `ops/mainnet0/authenticated-paid-work-production-activation-service-unit-design-v1.json`;
- artifact SHA-256: `f37bcf3931579e13a76e7ab2d03e9d961260fa0e9ec95ca4507bd06e3df38b07`;
- marker: `VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_SERVICE_UNIT_DESIGN_V1`;
- proof: `scripts/prove_authenticated_paid_work_production_activation_service_unit_design_v1.mjs`.

That artifact closes `service_unit_design` while materializing no unit, installing
no unit, reloading no systemd manager, and starting no service. This
credential-reference lane therefore reconciles both parallel source blockers
without broadening either lane's authority.


## Observed evidence

The source record binds the operator-owned credential lifecycle receipt by
SHA-256:

`5cdcff499a6dbbbe3ac3f897d1625812177f42f341d5d56fa4d186f93d151e11`

It also records that the receiver loaded registry `voidapwcr1_89002fa57d804ced69cc48e832496c131ba460c67fdac34f9664921cc1b01415` with six
credentials and that the bound credential successfully authenticated one
HTTP `202` paid-work intake:

- receipt ID: `voidawsi1_e5b27649672c70d3463fc371768b1d37e7a6ea578a7ddade123f5cb55febf7bd`;
- work-order ID: `voidawo1_46c6e6510b7d11e698fdc8bca56cc3cf9c33844588a2ea73c58de55216ec2fe0`;
- canonical request SHA-256: `06fe4e782076679fe5b05821bc5f0fdae46be7ea2c2d731321967c636f8e3432`.

These values are provenance metadata, not execution authority. That observed
intake did not itself prove or authorize payment execution, work dispatch,
Work Credit mutation, wallet or signer access, settlement, or fund movement.

## Validity and rotation boundary

The observed credential window is exactly 24 hours and ends at
`2026-08-02T17:11:15Z`. Publication does not extend that lifetime and the repository proof
does not compare the current clock with the window.

A separately confirmed activation-execution lane must privately revalidate all
of the following immediately before any credential use:

1. the normalized private source path hashes to the reviewed source-locator
   fingerprint;
2. the private registry bytes hash to the reviewed registry snapshot;
3. the registry ID, credential ID, and agent ID are exact;
4. the credential has scope `agent_paid_work_submit`;
5. the current time is within the credential validity window;
6. the credential is not revoked or superseded;
7. the receiver has loaded the exact reviewed registry state.

An expired, revoked, missing, rotated, or drifted reference fails closed.
Replacement requires separately reviewed source metadata; this record cannot
silently follow a new credential.

## Existing registry contract

The metadata binds these merged source contracts:

- `scripts/agent_paid_work_credential_registry_v1.ts`;
- `schemas/agent-paid-work-credential-registry-v1.schema.json`;
- `scripts/agent_paid_work_submission_receiver_v1.ts`;
- `scripts/external_agent_paid_work_authenticated_submission_activation_prerequisite_v1.ts`;
- `schemas/external-agent-paid-work-authenticated-submission-activation-prerequisite-v1.schema.json`.

The registry contract stores SHA-256 credential digests rather than raw bearer
credentials. Registry authentication uses
`VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_FILE`; the legacy
`VOID_AGENT_PAID_WORK_SUBMISSION_TOKEN_FILE` remains a compatibility fallback.
When the registry is configured, registry authentication takes precedence.

## Readiness effect

This record closes only `credential_reference_metadata`.

Six source requirements are then known satisfied:

1. activation configuration schema;
2. activation configuration instance;
3. rollback plan;
4. trusted-context reference metadata;
5. service unit design;
6. credential reference metadata.

Three requirements remain:

1. bounded replay snapshot;
2. activation-execution confirmation;
3. live-canary scope.

Readiness remains **HOLD**. Publication does not authorize activation.

## Proof

Run:

```bash
node --check scripts/prove_authenticated_paid_work_production_activation_credential_reference_metadata_v1.mjs
node scripts/prove_authenticated_paid_work_production_activation_credential_reference_metadata_v1.mjs
```

The proof validates the closed schema and exact metadata digest, binds the
merged credential-reference, credential-registry, and service-unit-design
contracts, rejects private
path and credential leakage, verifies the observed identity and validity
metadata, and proves the complete non-activation authority boundary.

The proof reads only tracked repository files. It does not open the private
registry or credential and does not prove current runtime freshness.

## Authority boundary

This lane does not read a registry, credential, or token; invoke a credential
provider; materialize an Authorization header; write installed configuration;
deploy; install or restart a service; create a listener; mount a runtime; accept
a quote; authorize or execute payment; construct or broadcast a transaction;
dispatch work; issue a live ticket; write Work Credits; access a wallet or
signer; sign; settle VOID; or move funds.

A separate operator-confirmed activation-execution lane remains required.
