# VOID Sovereign Name Signing Request V1

Marker: `VOID_SOVEREIGN_NAME_SIGNING_REQUEST_V1`

Status: offline unsigned-request builder and verifier. This lane creates no
production signature and no live sovereign-name record.

## Purpose

This contract turns reviewed public facts into the exact bytes that the VOID
namespace root would sign. It separates record construction from private-key
use so the online workstation can prepare and audit a request without gaining
signer authority.

The first intended request binds the stable name `void://zoso/precision` to the
existing Precision node identity and two replaceable transports:

1. the free Tailscale Funnel HTTPS origin;
2. the independently verified Tor v3 origin.

Neither Tailscale, Tor, DNS, a registrar, nor the machine hostname becomes the
naming authority. The signed namespace record remains the authority.

## Request identity

The request schema identifier is:

`urn:void:schema:sovereign-name-signing-request:1`

The tool constructs the unsigned sovereign-name record defined by
`urn:void:schema:sovereign-name-record:1`, replaces only the signature value
with JSON `null`, and derives the exact signing bytes using:

`VOID_SOVEREIGN_NAME_RECORD_V1\0<void-canonical-json-v1>`

The request ID is:

`voidsnsr1_<signing-payload-sha256>`

The request embeds both the exact payload as canonical base64 and its SHA-256.
The verifier reconstructs the complete request from its public inputs and
requires byte-for-byte equality. Editing a name, endpoint, priority, expiry,
subject, authority boundary, payload, or request ID invalidates the request.

## Input

The `build` command accepts exactly these public fields:

```json
{
  "name": "void://zoso/precision",
  "sequence": 1,
  "previous_record_sha256": null,
  "issued_at": "2026-08-01T20:00:00.000Z",
  "expires_at": "2027-01-26T08:39:09.089Z",
  "subject": {
    "node_id": "9d89483769e469e0473b489dc50dba96",
    "public_key_pem": "<existing Precision Ed25519 public key PEM>"
  },
  "transports": [
    {
      "kind": "https",
      "endpoint": "https://zoso-precision-tower-7810.taila47fd.ts.net",
      "priority": 0,
      "expires_at": "2027-01-26T08:39:09.089Z"
    },
    {
      "kind": "tor-v3",
      "endpoint": "http://r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion",
      "priority": 10,
      "expires_at": "2027-01-26T08:39:09.089Z"
    }
  ],
  "namespace_authority": {
    "key_id": "ed25519:00e7609bf643b41c7cae625c3ae51f5d55c06ec1adba35e8eb80300c64e77a7c",
    "public_key_pem": "<admitted VOID namespace-root public key PEM>"
  }
}
```

Input keys are exact. A private-key field, signature, unknown authority, or
extra metadata is rejected. The V1 command pins the admitted official-network
root key ID; substituting another namespace public key is rejected.

## Commands

Build a new request without overwriting any existing output:

```bash
node tools/void-sovereign-name-signing-request-v1.mjs \
  build input.json signing-request.json
```

Independently reconstruct and verify it:

```bash
node tools/void-sovereign-name-signing-request-v1.mjs \
  verify signing-request.json
```

The builder deliberately refuses to overwrite an existing output. Rebuilding
from identical input at another path produces identical bytes.

## Safety and authority boundary

This lane permits deterministic unsigned-request creation only. It does not:

- accept, discover, read, copy, log, or transmit a private key;
- create a production signature;
- create or publish a live sovereign-name record;
- trust a source origin merely because it supplied request bytes;
- mutate DNS, TLS, Tailscale, Tor, the node runtime, or a service;
- deploy or restart anything;
- submit transactions, write Work Credit, settle VOID, or move funds.

The proof uses an ephemeral in-process test key solely to demonstrate that the
generated payload can later produce a record accepted by the V1 verifier. That
ephemeral signature is never written, published, or usable on VOID Mainnet-0.
The Precision request produced in the proof remains unsigned.

## Proof

```bash
node --check tools/void-sovereign-name-signing-request-v1.mjs
python3 -m json.tool \
  schemas/void-sovereign-name-signing-request-v1.schema.json >/dev/null
node scripts/prove_void_sovereign_name_signing_request_v1.mjs
```

The proof establishes:

- deterministic CLI and library output;
- exact request reconstruction and payload digest verification;
- the admitted official-network namespace pin;
- the existing Precision self-certifying subject identity;
- ordered Tailscale and Tor carriers;
- rejection of tampered transports, payloads, request IDs, and authority;
- refusal to overwrite an existing request;
- refusal to accept private-key input;
- successful verification of a separately completed ephemeral test record;
- no live signing, publication, deployment, or runtime authority.

## Deliberately deferred

The following require separate reviewed lanes:

1. generation of a current operator-selected request with final validity dates;
2. physical-presence inspection and namespace-root signing;
3. signed-record verification before any publication;
4. publication over at least two independent carriers;
5. read-only resolver and browser integration.

Merging this tool does not authorize any of those actions.
