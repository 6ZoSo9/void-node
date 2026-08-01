# VOID Browser Clearweb Origin Binding Contract V1

Marker: `VOID_BROWSER_CLEARWEB_ORIGIN_BINDING_V1`

This is a contract-only source lane for eventually authenticating one exact
HTTPS origin to the existing VOID node identity.
It does not activate clearweb access. It does not broaden the browser
extension's host permissions, publish a binding, change routing, or deploy a
service.

PR #909 correctly made the current browser kit onion-only because the public
signed onion document can be copied to an unrelated HTTPS server. Possession of
that public document does not prove control of the server presenting it. The
clearweb contract closes that gap by requiring a new Ed25519 signature from the
existing VOID node identity over the exact HTTPS origin and its complete
read-only discovery boundary.

## Binding route

A future reviewed activation may serve the signed document at:

- `/.well-known/void-browser-clearweb-origin-binding-v1.json`

Until a real document is signed and reviewed, that route is not activated and
the extension remains restricted to `http://*.onion/*`.

## Cryptographic binding

Signature bytes are domain-separated as:

`VOID_BROWSER_CLEARWEB_ORIGIN_BINDING_V1\0<void-canonical-json-v1>`

The verifier requires all of the following:

- VOID Mainnet-0 and chain ID `2050`;
- one canonical default-port HTTPS origin with a public ASCII DNS hostname;
- the exact trusted VOID node ID and Ed25519 public-key fingerprint;
- the exact pinned onion hostname, onion-binding digest, and onion-binding
  expiration;
- a clearweb-binding expiration that does not outlive the pinned onion identity;
- the well-known, canonical discovery, and capability-negotiation paths;
- `GET` and `HEAD` only, with same-origin resolution;
- the complete read-only authority boundary;
- a valid Ed25519 signature from the pinned public key.

Changing the hostname, presenting the binding from another origin, adding a
path or credentials, changing a discovery path, enabling payment or mutation,
changing the onion identity, extending expiry, or modifying any signed field
fails closed.

## Authority boundary

The contract grants verification only. It grants no wallet or signer access,
transaction submission, payment authority, Work Credit write, VOID settlement,
validator authority, governance authority, treasury authority, operator
control, or node runtime mutation.

No private key is present, read, copied, logged, committed, or served by this
lane. The proof uses only an ephemeral test key generated in a temporary
process. Production signing remains a separate explicit operator action after
the exact origin and serving path are independently reviewed.

There is no deployment, DNS change, TLS change, proxy change, service restart,
public route registration, live signature, fund movement, or activation in this
lane.

## Verification

```bash
node --check integrations/browser/void-browser-agent-access-kit-v1/clearweb-origin-binding-v1.mjs
python3 -m json.tool schemas/void-browser-clearweb-origin-binding-v1.schema.json >/dev/null
node scripts/prove_void_browser_clearweb_origin_binding_contract_v1.mjs
```
