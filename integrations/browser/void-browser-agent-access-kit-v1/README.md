# VOID Browser Agent Access Kit V1

Read-only WebExtension source for verifying VOID's signed Ed25519 node-to-onion
binding and computing a fail-closed intersection of public capabilities.
The canonical node ID, Ed25519 fingerprint, onion hostname, binding digest,
and expiry are pinned from the reviewed repository profile at main
`3c5ae398366a959c198096f2051ae37cd64e4e7e`.

## Local loading

- Firefox: open `about:debugging`, select **This Firefox**, then **Load Temporary
  Add-on** and select `manifest.json`.
- Chromium: open `chrome://extensions`, enable **Developer mode**, select **Load
  unpacked**, and choose this directory.

The extension asks for access only to the exact origin entered by the user. An
onion origin requires a browser environment that already routes `.onion`
requests through Tor. The extension does not configure a proxy or access any
private key.

## Authority boundary

No content scripts or background worker are installed. The kit sends only
anonymous `GET` requests with credentials omitted, rejects redirects, bounds
response sizes and time, verifies the signed binding locally, and grants only
capabilities that are explicitly live, anonymous, and read-only.

It has no wallet, signer, payment, Work Credit, validator, governance, node
runtime, transaction, settlement, or operator authority.
