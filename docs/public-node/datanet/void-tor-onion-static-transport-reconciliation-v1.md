# VOID Tor onion static transport reconciliation V1

Marker: `VOID_TOR_STATIC_TRANSPORT_COMPATIBILITY_V1`

## Collision context

The preserved static-transport repair was based on
`f67a1256b9c8352b967457d33df6b51c33685de0`.

Current main `c382b9ced970bab3b6f5399144aaa38647ef06c2` changed the same Tor-router
request-dispatch region. A normal three-way merge produced textual conflicts,
invalid JavaScript, and a failed proof.

## Reconciliation

Current main is the source of truth.

The reconciliation preserves its complete asynchronous request handler and MCP
bridge. It adds a synchronous gate before the existing asynchronous wrapper.

The synchronous gate handles static files, discovery, Tor and MCP descriptors,
signed binding reads, paid-read JSON, strict query rejection, HEAD behavior,
and static-method denial. Generated JSON and text responses use ordinary
newline bytes rather than literal backslash-plus-`n` suffixes.

The exact `/mcp` path, both order-status descriptor paths, and the dynamic
order-status route return `false` from the synchronous gate and enter the
current-main asynchronous handlers unchanged.

## Proof

Before creating a branch, the builder reconstructs the exact current-main router
from the SHA-bound collision packet, applies this reconciliation in memory, and
requires Node syntax plus the 45-assertion signed-binding proof.
