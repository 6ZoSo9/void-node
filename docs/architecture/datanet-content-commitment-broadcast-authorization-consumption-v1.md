# DataNet Content Commitment Broadcast Authorization Consumption v1

Marker: \`VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_V1\`

Status: durable consume-first boundary for one exact Sovereign broadcast authorization.

This gate re-verifies the complete broadcast authorization from #1710, re-checks wall-clock validity, and atomically publishes one immutable consumption record before any broadcaster, raw signed transaction, or opaque custody handle is accessed.

It does not access the Sovereign private key, raw signed transaction, custody handle, broadcaster, or RPC. It does not broadcast and does not write Chain-2050.

## Why this gate exists

A verified Sovereign broadcast authorization is deliberately single-use.

The #1710 verifier is pure and therefore cannot prevent replay by itself. V1 adds the durable state transition required before any later broadcaster-access boundary.

The safe ordering is:

1. rerun the exact #1710 broadcast-authorization verifier;
2. re-check current wall-clock validity;
3. validate the private broadcast-consumption state root;
4. atomically publish one immutable consumption record keyed by the exact broadcast-authorization ID;
5. only a later gate may request broadcaster access.

A crash after step 4 burns the authorization. It does not restore or recycle authorization.

## Exact lineage

The durable record binds:

- exact broadcast-authorization ID;
- exact broadcast-authorization verification ID;
- exact opaque signed-receipt verification ID;
- exact opaque signed-receipt ID;
- exact signing-request ID;
- original signing authorization ID;
- original durable signing-consumption record ID;
- final signing-review preflight ID;
- external-signing idempotency key;
- original unsigned transaction fingerprint;
- publisher identity;
- exact signed-transaction hash;
- custody-handle fingerprint;
- external signing timestamp; and
- Sovereign public-key fingerprint.

No raw signed transaction or custody handle is included.

## Private state store

The caller supplies an existing absolute state root.

V1 requires:

- direct directory, not a symlink;
- no symlink ancestors;
- same UID where supported;
- exact mode \`0700\`;
- canonical realpath equality.

The gate creates only the \`broadcast-consumed/\` child when absent, also mode \`0700\`.

Consumption records are mode \`0600\`.

## Atomic publication

The record is written to a private temporary file with exclusive create and file \`fsync\`, then published to the final broadcast-authorization-ID path using an atomic hard link. The consumed directory is \`fsync\`ed after publication.

If the exact final path already exists, V1 HOLDs. Existing bytes are never overwritten or deleted.

There is no release, retry, reset, or reuse operation.

## Replay scope

Replay prevention is scoped to the exact state-store realpath.

The record carries the SHA-256 fingerprint of that realpath.

V1 does not claim global replay prevention across independently selected stores. Production composition must bind one canonical broadcast state store before any later broadcaster access.

## Expiry

The #1710 authorization window remains capped at 300 seconds.

This gate re-checks time immediately before consumption:

- before \`issued_at_utc\` => HOLD;
- at or after \`expires_at_utc\` => HOLD.

The production wrapper uses \`Date.now()\`. The explicit-clock entrypoint exists for deterministic proof.

## Authority boundary

A GREEN result means the exact broadcast authorization has been durably consumed inside the exact private state store.

GREEN still proves:

- Sovereign private-key access = false;
- raw signed-transaction access = false;
- opaque custody-handle access = false;
- broadcaster access = false;
- RPC = false;
- broadcast authorization by this gate = false;
- broadcast performed = false;
- Chain-2050 write authorization = false;
- Chain-2050 write performed = false;
- automatic retry = false.

The upstream Sovereign decision is preserved as verified lineage, but this gate itself does not expose or execute the broadcaster.

## Next gate

\`exact_broadcaster_access_from_consumed_broadcast_authorization_v1\`

That later boundary must independently rederive the exact consumption record, require the canonical broadcast-state-store fingerprint, bind the exact signed-transaction hash and custody-handle fingerprint, and still separate broadcaster access from actual transaction submission.
