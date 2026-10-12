# VOID Public Node Public Base Runtime v1

Marker: `VOID_PUBLIC_NODE_PUBLIC_BASE_RUNTIME_V1`

This records the first public-base runtime proof for the VOID public node tester lane.

Status:

- `void-node-live.service` active under `systemctl --user`
- public base URL configured through a user-systemd drop-in
- `/public-node/external-base-url.json` emits the configured public base
- `/public-node/first-tester-request-copy-pack.json` emits public tester links
- `/public-node/tester-share` loaded from cellphone on cellular data
- local public route probe passed for:
  - `/version`
  - `/public-node`
  - `/public-node/tester-share`
  - `/public-node/tester-lane-summary.json`
  - `/.well-known/void-public-node.json`
  - `/public-node/route-manifest.json`
  - `/public-node/self-check-snapshot.json`
  - Demo 003 folder manifest/file routes
  - `/proofs`

Proof marker emitted:

`VOID_PUBLIC_NODE_PUBLIC_BASE_RUNTIME_PROOF_V1_GREEN`

Boundary:

The exact public base URL is operator-runtime configuration and may be dynamic. Do not treat a home IP address as permanent protocol truth. This checkpoint proves the public-base runtime lane, not a permanent DNS name.
