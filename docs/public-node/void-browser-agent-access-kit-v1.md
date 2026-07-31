# VOID Browser Agent Access Kit V1

Marker: `VOID_BROWSER_AGENT_ACCESS_KIT_V1`

This source-and-CI-only lane establishes the first browser-native VOID access
surface. It is a Manifest V3 WebExtension with no content scripts and no
background service. A user supplies a VOID origin and explicitly grants that
origin before any request occurs.

The kit verifies the existing `VOID_NODE_ONION_BINDING_V1` Ed25519 signature,
node public-key fingerprint, signed onion hostname, validity interval, and
read-only authority declaration. Verification is anchored to the canonical
node ID, Ed25519 fingerprint, onion hostname, exact binding digest, and expiry
from the reviewed Tor agent-access profile; self-signed counterfeit endpoints
therefore fail closed. It then fetches the same-origin public
capability catalog and grants only entries that are explicitly enabled, live,
anonymous, read-only, limited to `GET`/`HEAD`, and bound to canonical
same-origin paths. Everything else fails closed as `not_granted`.

Direct `.onion` access depends on the browser already having Tor transport.
This lane does not install, configure, or bypass a proxy. A later local-guardian
lane may provide browser-native messaging without placing sovereign keys in the
extension.

## Explicitly absent

- wallet or signer access;
- sovereign, validator, governance, treasury, or operator keys;
- transaction submission or broadcast;
- payment authorization or execution;
- Buy VOID fulfillment;
- Work Credit award or ledger mutation;
- VOID settlement;
- paid-work submission;
- MCP mutation;
- node, Tor, listener, service, or runtime mutation;
- deployment or public-store publication.

## Verification

```bash
node --check integrations/browser/void-browser-agent-access-kit-v1/core.mjs
node --check integrations/browser/void-browser-agent-access-kit-v1/popup.mjs
python3 -m json.tool integrations/browser/void-browser-agent-access-kit-v1/manifest.json >/dev/null
node scripts/prove_void_browser_agent_access_kit_v1.mjs
```
