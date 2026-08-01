# VOID Sovereign Name Layer V1

Marker: `VOID_SOVEREIGN_NAME_RECORD_V1`

Status: contract-only architecture and verifier. There is no live name record,
no resolver route, no browser activation, and no deployment in this lane.

## Purpose

VOID must not lose its identity because a registrar, cloud account, DNS host,
repository, certificate provider, VPN vendor, or app store removes a name.
V1 separates the stable cryptographic name from every replaceable way of
reaching the named node.

The governing rule is: **transport is not identity**.

- The stable subject is `voidid:ed25519:<public-key-fingerprint>`.
- A human name such as `void://zoso/precision` is assigned by a signed VOID
  namespace record.
- HTTPS, Tor, Tailscale, Datanet, GitHub, removable media, and QR codes can
  carry or locate the same signed record. None becomes the naming authority.
- A transport endpoint can be replaced without changing either the human name
  or the self-certifying subject identity.

## Domain-independent contract

The schema identifier is:

`urn:void:schema:sovereign-name-record:1`

It is deliberately not an HTTP URL. Schema identity therefore does not depend
on ownership of `voidchain.io`, any future domain, or any hosting provider.
Copies of the schema can be verified by repository commit and file digest.

The canonical name syntax is:

`void://<label>/<label>/...`

Labels are lowercase ASCII letters, digits, and interior hyphens. A name has
one to eight labels. This is a VOID protocol identifier, not a DNS suffix and
not a claim that `.void` is registered in the public DNS root.

## Trust and ZoSo's constitutional authority

Friendly names require one collision authority. V1 defaults the `void`
namespace to the admitted VOID official-network authenticity root:

`ed25519:00e7609bf643b41c7cae625c3ae51f5d55c06ec1adba35e8eb80300c64e77a7c`

That preserves ZoSo's constitutional authority over the network's official
identity and foundational namespace. It does not give a transport provider,
registrar, outside operator, investor, validator, or software distributor the
power to rename VOID.

The root key assigns the friendly name by signing the complete record. The
record separately embeds a self-certifying subject identity derived from the
subject's Ed25519 public key. Clients verify both the pinned namespace root and
the subject fingerprint locally.

Future versions may add narrowly scoped, expiring namespace delegations for
routine record updates. Such delegation must not transfer root ownership,
constitutional authority, treasury authority, or irreversible policy control.

## Signed record

The signature is Ed25519 over:

`VOID_SOVEREIGN_NAME_RECORD_V1\0<void-canonical-json-v1>`

The signature value is omitted from the canonical JSON before signing. The
verifier requires:

- exact VOID Mainnet-0 identity, chain ID `2050`, and genesis digest;
- the `void` namespace and a pinned namespace-authority key;
- an exact canonical VOID name;
- a self-certifying Ed25519 subject identity, key ID, and fingerprint;
- one to eight ordered, unique, unexpired transport endpoints;
- a positive monotonic sequence number;
- `null` predecessor for sequence 1, or the previous full-record SHA-256 for
  later records;
- a validity period no longer than 366 days;
- the complete resolution-only authority boundary;
- a valid namespace-root Ed25519 signature.

V1 accepts only canonical default-port HTTPS origins and canonical HTTP Tor v3
origins as endpoints. Tailscale Funnel is represented as ordinary HTTPS. This
prevents a Tailscale-specific identifier from entering the stable identity.

## Resolver behavior

A conforming resolver receives a record from any untrusted carrier and then:

1. Parses exact keys and rejects unknown fields.
2. Verifies network, namespace, name, subject, time, and authority boundaries.
3. Recomputes both public-key fingerprints.
4. Verifies the namespace signature locally.
5. Rejects a sequence below its highest accepted sequence for that name.
6. For updates, requires the signed predecessor digest to match the previously
   accepted full record.
7. Tries unexpired transports in strictly increasing priority order.
8. Treats successful transport access only as connectivity; the signed record
   remains the source of naming truth.

The resolver never trusts the website, DNS response, Tor relay, Tailnet, repo,
or file location merely because it supplied the bytes. A counterfeit carrier
can withhold a record, but it cannot create a valid replacement, change the
subject, elevate authority, or redirect transports without the namespace key.

## Bootstrap without a mandatory vendor

New clients still need one authentic copy of the namespace-root trust pin.
That pin can ship in the VOID browser kit, an independently reproduced source
release, a signed offline pack, printed fingerprint, QR code, or a peer-to-peer
handoff. Multiple carriers should be offered so no single platform becomes a
mandatory bootstrap gate.

The existing official-network authenticity document is the V1 trust anchor.
The existing node-to-onion and clearweb-origin binding contracts remain
transport authentication layers below the sovereign name record.

## Update and recovery model

Sequence and predecessor hash prevent an old but validly signed record from
silently replacing a newer accepted record. Endpoint rotation therefore works
as a signed append-only chain:

- sequence 1: establishes `void://zoso/precision` and its subject identity;
- sequence 2: references sequence 1's full-record SHA-256 and replaces one or
  more transports;
- the subject identity and friendly name remain unchanged;
- clients that accepted sequence 2 reject replay of sequence 1.

Loss of one hostname is an endpoint update, not a network rename. Loss of every
online carrier can be recovered from an offline record and trust pin. Namespace
root-key recovery or rotation is constitutional work and is intentionally not
defined or automated by this contract-only lane.

## Authority boundary

The record authorizes name resolution only. It explicitly does not authorize:

- trusting the carrier origin;
- DNS ownership or registration;
- transport-provider control;
- transaction submission;
- payment or fund movement;
- wallet, signer, or private-key access;
- Work Credit writes or VOID settlement;
- node runtime mutation or operator control;
- validator, treasury, or governance mutation.

No private key is present, read, copied, generated for production, logged,
committed, or served by this lane. The proof uses ephemeral test keys held only
in its process. There is no signing request, live signature, public record,
route registration, service restart, DNS/TLS/Tailscale mutation, or activation.

## V1 verification

```bash
node --check tools/lib/void-sovereign-name-layer-v1.mjs
python3 -m json.tool schemas/void-sovereign-name-record-v1.schema.json >/dev/null
node scripts/prove_void_sovereign_name_layer_v1.mjs
```

## Deliberately deferred

Separate reviewed lanes are required for:

1. an offline unsigned record/signing-request builder;
2. physical-presence namespace signing;
3. publication over more than one independent carrier;
4. a read-only resolver and cache with sequence rollback protection;
5. browser-kit integration;
6. namespace delegation and root-key recovery policy.

None of those actions is implied or authorized by merging this architecture.
