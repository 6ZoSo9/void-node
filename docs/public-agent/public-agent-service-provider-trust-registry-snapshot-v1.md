# VOID Public Agent Service Provider Trust Registry Snapshot V1

Marker:

`VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_V1`

Output marker:

`VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_PACKET_V1`

## Purpose

The provider quote-response authentication adapter verifies an Ed25519 signature
and an exact provider key binding, but its binding is a caller-supplied trust
anchor. This lane supplies the missing read-only trust-registry verification
layer.

V1 verifies an operator-signed snapshot against a pinned expected trust-root ID.
It then resolves one exact provider ID to one exact active provider key binding.
The snapshot is an input artifact; this lane does not write a registry.

## Trust model

A live consumer must pin the expected `voidaptr1_...` trust-root ID outside the
snapshot. The verifier rejects a snapshot when its embedded root differs from
that pinned expected trust-root ID.

The trust root:

- is Ed25519;
- has a content-derived key ID;
- has a content-derived trust-root ID;
- is limited to `provider_trust_registry_snapshot_verify`;
- has explicit activation, expiry, and optional revocation times.

The snapshot:

- is signed by the pinned trust root;
- has a content-derived snapshot ID;
- has a content-derived authentication ID;
- has an explicit monotonic sequence and previous-snapshot reference;
- has an explicit validity window;
- contains provider bindings sorted by `provider_id`;
- forbids duplicate provider IDs, binding IDs, and provider key IDs;
- requires every provider binding to remain active for the full snapshot window.

The verifier does not infer trust from a status string alone. A live result
requires all of the following:

- `evidence_mode=operator_signed_snapshot`;
- `trust_status=operator_pinned_trust_root`;
- `snapshot_status=operator_approved_snapshot`;
- every binding uses `binding_status=operator_approved_snapshot`;
- the caller supplies the pinned expected trust-root ID;
- IDs, time windows, canonical ordering, and the Ed25519 signature verify.

## Example fixture

The checked-in example is cryptographically valid but intentionally non-live:

- `status=example_only`
- `eligible_for_provider_authentication=false`
- `reason=example_fixture_not_live_trust`

Its trust root and provider binding are example fixtures. They must never be
treated as production approval.

## Live resolution

`resolveProviderKeyBindingFromTrustRegistrySnapshotV1` returns a binding only
when:

- the operator-signed snapshot is exact green;
- the expected trust-root ID matches;
- the resolution timestamp is inside the snapshot window;
- exactly one binding matches the provider ID;
- the binding is active and not revoked at that timestamp.

Resolution authenticates a provider key. It does not select a provider.

## Continuity boundary

The packet requires downstream consumers to enforce:

- snapshot replay protection;
- monotonic sequence progression;
- prior-snapshot continuity;
- the pinned expected trust-root ID.

This adapter verifies one snapshot. It does not maintain the accepted sequence
or consume snapshot IDs.

## Authority boundary

This lane does not approve providers. It does not:

- create, rotate, or revoke a trust root;
- create, rotate, revoke, or write provider key bindings;
- write a provider registry;
- select a provider;
- generate, submit, or publish a quote;
- publish or accept a quote;
- resolve a payment rail or payment destination;
- authorize payment or execution;
- execute payment;
- authorize or dispatch work;
- write or settle Work Credits;
- access a wallet or production signer;
- broadcast a transaction;
- submit HTTP;
- change credentials;
- mutate runtime;
- restart services;
- deploy code;
- move money.

The packet therefore grants no economic or execution authority.

It does not publish or accept a quote. It does not authorize payment or execution.

## CLI

Materialize an exact packet:

```bash
npx tsx \
  scripts/public_agent_service_provider_trust_registry_snapshot_v1.ts \
  materialize \
  examples/public-agent-service-provider-trust-registry-snapshot-v1.example.json \
  voidaptr1_ee742afbf732be7850d299322a273ab329cc4b30aa355bb8c204de5728f68185 \
  /tmp/provider-trust-registry-snapshot-v1.json
```

Verify an existing packet:

```bash
npx tsx \
  scripts/public_agent_service_provider_trust_registry_snapshot_v1.ts \
  verify \
  examples/public-agent-service-provider-trust-registry-snapshot-v1.example.json \
  voidaptr1_ee742afbf732be7850d299322a273ab329cc4b30aa355bb8c204de5728f68185 \
  /tmp/provider-trust-registry-snapshot-v1.json
```

The output is created exclusively with mode `0600`.

## Verification

```bash
npx tsx \
  scripts/prove_public_agent_service_provider_trust_registry_snapshot_v1.ts
```

The proof covers:

- the static cryptographic example;
- trust-root key and content IDs;
- snapshot and authentication IDs;
- pinned expected trust-root matching;
- Ed25519 signature verification;
- canonical key-order stability;
- duplicate provider rejection;
- provider binding identity;
- trust-root and provider-key tampering;
- revocation and expiry;
- snapshot and binding window containment;
- false live-status claims;
- an ephemeral operator-signed live path;
- exact provider resolution;
- unknown-provider and expired-snapshot rejection;
- the no-authority boundary.

The ephemeral keys exist only in memory during the proof. They are not
production signers.
