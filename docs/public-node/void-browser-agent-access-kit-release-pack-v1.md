# VOID Browser Agent Access Kit Release Pack V1

Marker: `VOID_BROWSER_AGENT_ACCESS_KIT_RELEASE_PACK_V1`

This lane creates a deterministic, checksum-bearing unsigned review artifact for
the already merged VOID Browser Agent Access Kit v1.2.0. The archive packages
the exact eight reviewed extension files, the VOID Community License, and a
content-addressed source manifest. The set includes the canonical public trust
pins and the reviewed clearweb-origin binding verifier source; neither expands
the manifest permission boundary.

The extension verifies VOID's signed onion identity, follows the reviewed
same-origin discovery chain, derives resources only from capabilities that pass
the live anonymous read-only intersection, and fetches one user-selected
verified `GET` resource. The pack does not widen that authority.

The archive is deterministic: entries are sorted, uncompressed, fixed to one
timestamp and explicit Unix modes, and stripped of comments and platform
metadata. Rebuilding from the same source commit produces identical bytes.

The packager also enforces the popup's complete read-only authority profile:
exactly two mutation-denial fields, exactly two payment-denial fields, one
wallet-or-signer denial field, and no corresponding `true` authority value.

## Artifacts

- `void-browser-agent-access-kit-v1.zip`
- `void-browser-agent-access-kit-v1.release.json`
- `VOID_BROWSER_AGENT_ACCESS_KIT_RELEASE_PACK_V1_SHA256SUMS.txt`

## Current installation boundary

This is an unsigned review artifact, not a browser-store release.

- Firefox: extract the archive and load `manifest.json` as a temporary add-on
  from `about:debugging`.
- Chromium-family browsers: extract the archive and use **Load unpacked** in
  the extensions developer page.
- Direct `.onion` requests still require a browser environment that already
  routes onion traffic through Tor.

The extension requests one onion-origin permission only after explicit user
action. It installs no content script or background worker and accepts no
arbitrary resource path.

## Local verification

```bash
python3 scripts/prove_void_browser_agent_access_kit_release_pack_v1.py
python3 scripts/build_void_browser_agent_access_kit_release_pack_v1.py \
  --source-commit "$(git rev-parse HEAD)" \
  --output-dir out
sha256sum --check --strict \
  out/VOID_BROWSER_AGENT_ACCESS_KIT_RELEASE_PACK_V1_SHA256SUMS.txt
```

## Authority boundary

The packager reads the eight extension files and repository license and writes
only the selected output directory. It does not install or publish the
extension, request a live browser permission, connect to a VOID origin, follow
a redirect, send credentials, access a wallet or signer, submit a transaction,
authorize or execute payment, write Work Credits, settle VOID, mutate a node or
service, deploy software, or move funds.
