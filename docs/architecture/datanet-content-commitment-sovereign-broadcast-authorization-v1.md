# DataNet Content Commitment Sovereign Broadcast Authorization v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_BROADCAST_AUTHORIZATION_V1`

Status: source-only Sovereign authorization request construction and Ed25519 signature verification for one exact opaque signed transaction receipt. No broadcaster exists in this lane.

## Purpose

The signing authorization in #1704 deliberately set broadcast authority to false.

A verified signed receipt therefore cannot be broadcast merely because signing succeeded.

This gate creates a **new Sovereign decision** for one exact signed transaction.

## Reverification before authorization

Before constructing a broadcast-authorization body, V1 reruns the complete #1708 opaque receipt verifier.

The authorization binds:

- exact opaque signed-receipt verification ID;
- exact opaque signed-receipt ID;
- exact signing-request ID;
- original signing authorization ID;
- durable signing-consumption record ID;
- final-review ID;
- external-signing idempotency key;
- original unsigned transaction fingerprint;
- publisher identity;
- exact signed-transaction hash;
- custody-handle fingerprint; and
- external signing timestamp.

## Authorization window

The maximum issue-to-expiry window is 300 seconds.

The issue timestamp cannot precede the externally attested signing timestamp.

The downstream broadcaster gate must re-check expiry immediately before broadcaster access.

## Single-use / replay boundary

The signed body requires single-use behavior.

This pure verifier does not mutate state, so it reports:

- authorization consumed = false;
- consumption record present = false;
- replay prevention enforced by this verifier = false.

A later durable gate must atomically consume the broadcast authorization before any broadcaster is allowed to see the opaque custody handle or raw signed transaction.

## Sovereign identity

The production wrapper pins the existing Phase-0 Sovereign primary Ed25519 DER fingerprint.

The module verifies signatures only.

It has no Sovereign private-key creation, import, storage, or signing API.

## Authority boundary

A GREEN artifact proves that the Sovereign approved broadcast of exactly one signed-transaction hash under one exact custody fingerprint.

GREEN still performs:

- no raw signed-transaction access;
- no broadcaster access;
- no RPC;
- no broadcast;
- no Chain-2050 write;
- no filesystem mutation.

## Next gate

`durable_single_use_broadcast_authorization_consumption_before_broadcaster_access_v1`

That later gate must atomically consume the exact broadcast-authorization ID, re-check expiry, bind the canonical broadcast state store, and still stop before broadcaster execution.
