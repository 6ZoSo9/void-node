# VOID bootstrap acceptance observation sanitizer v1

## Purpose

The final external bootstrap acceptance proof for issue #1005 must use real
runtime observations without publishing transport addresses, operator-private
fields, or incidental runtime metadata.

This source-only adapter defines the privacy/truth boundary between current
runtime diagnostics and the future content-addressed external acceptance
receipt.

It performs no network calls and does not claim external acceptance.

## Ready observation

The current readiness surface includes `head`, `gap`, `txroot_live`, `ready`,
and ready-bridge metadata.

A sanitized acceptance-ready observation requires:

- integer `head > 0`;
- integer `gap = 0`;
- integer `txroot_live = 1`;
- `ready = true`;
- no boot-grace acceptance;
- `__ready_bridge.txroot3_seen_ok = 1`;
- `__ready_bridge.txroot3_ok = 1`;
- `__ready_bridge.txroot3_age_ms` from `0` through `5000`; and
- positive `__ready_bridge.txroot3_latest`.

The boot-grace rejection is deliberate. The runtime bridge may temporarily
assume `txroot_live=1` during early startup before a real txroot3 success has
been observed. That state must never satisfy the final bootstrap acceptance
proof.

The sanitized output retains only readiness facts. Reasons, private notes, and
other incidental fields are discarded before canonical hashing.

## Peer observation

The current `/p2p/peers` snapshot exposes:

- connected peers with `id`, `addr`, `listens`, and `outbound`;
- `knownAddrs`;
- durable verified peers with `node_id`, `addresses`, and
  `last_authenticated_at_ms`.

The sanitizer retains only:

- observation phase;
- the expected cryptographic first-contact node ID;
- sorted connected 32-hex VOID node IDs; and
- sorted verified 32-hex VOID node IDs.

It discards:

- `addr`;
- `listens`;
- `knownAddrs`;
- verified-peer `addresses`;
- authentication timestamps; and
- any unrelated extra fields.

Changing only transport addresses or timestamps therefore does not change the
sanitized evidence hash.

## Acceptance phases

`first_node_after_sync`

- first-contact peer must still be connected;
- at least one additional verified peer must exist.

`first_node_after_first_contact_removal`

- at least one peer other than the original first-contact peer must remain
  connected; and
- at least one such surviving connection must also be a verified peer.

`second_node_after_sync`

- first-contact peer must be connected;
- at least one additional verified peer must exist.

## Canonical evidence hashing

`sha256CanonicalObservationV1()` hashes only the sanitized canonical object.

This prevents IP-address changes, listen-address order, known-address
inventory, timestamps, or unrelated endpoint fields from becoming part of VOID
network identity or the external acceptance receipt.

## Authority boundary

This lane performs no:

- live HTTP or P2P requests;
- external-machine acceptance run;
- runtime integration;
- bootstrap or relay activation;
- deployment or restart;
- firewall/router/DNS mutation;
- credential access;
- wallet/signer/validator/treasury/Work Credit action;
- transaction broadcast; or
- money movement.

It does not close issue #1005.
