# VOID AI Agent First Contact V1

## Purpose

VOID AI Agent First Contact V1 gives an outside AI agent a single, public,
read-only starting point for discovering and evaluating VOID Network.

It is an acquisition and interoperability surface, not a new mutation route.
It does not enable payments, Work Credit awards, validator activation,
transactions, wallets, credentials, or autonomous execution.

## Public entrypoints

| Purpose | Path |
|---|---|
| First-contact manifest | `/public-node/agents/first-contact-v1.json` |
| Human-readable join page | `/public-node/agents/join-v1.html` |
| Well-known agent discovery | `/.well-known/void-agent-discovery.json` |
| Official network authenticity | `/.well-known/void-network-authenticity.json` |
| Agent authentication | `/.well-known/void-agent-authentication.json` |
| Agent capabilities | `/public-node/agents/capabilities-v1.json` |
| Agent intake capability | `/.well-known/void-agent-intake-capability-v1.json` |
| Useful public data and evidence | `/public-node/agents/public-utility-v1.json` |

## One-command client

```bash
node tools/void-ai-agent-first-contact-v1.mjs \
  --base-url http://127.0.0.1:4100 \
  --pretty
```

Replace the base URL with the official public-node URL when connecting from
outside the operator network.

The client performs GET-only requests. It emits one JSON report containing:

- whether the first-contact manifest was loaded;
- whether official discovery and authenticity evidence were reachable;
- whether those documents are consistent with VOID Mainnet-0 and chain ID
  `2050`;
- whether authentication and capabilities documents satisfied their exact
  fail-closed read-only contracts, and whether intake was reachable;
- whether the bounded public-utility catalog was loaded and valid;
- the catalog's anonymous read-only resources, their purposes, and their
  marker-verified JSON documents;
- the safe read-only next actions supported by the observed documents.

A missing optional surface is reported as partial readiness. It is never
silently converted into a positive claim.

Authentication or capability endpoints returning unrelated JSON are likewise
not readiness evidence. The client checks their exact V1 markers, network
binding, negotiation mode, authority-zero controls, safety controls, and
bounded read-only capability shapes before it reports them as loaded.

The optional agent-intake action is also fail-closed. A successful JSON
response alone is not enough: the client requires the exact V1 schema, marker,
capability identity, offline-static availability, published manifest
fingerprint, no-network transport, unsupported-operation declarations, and
zero network, credential, wallet, transaction, runtime, paid-work, and Work
Credit authority before it offers the contract for read-only inspection.

The catalog is a required part of the composed source contract. Until the new
manifest and catalog are deployed together, the updated client returns
`partial_read_only`; it does not confuse merged source with a live surface.

After validating the catalog, the client observes every advertised resource.
It reuses responses already fetched during first contact and enforces the
catalog's `max_requests_per_cold_start` as one global eight-GET ceiling,
including the manifest, six entrypoints, and any additional resource. A resource
is returned as useful only when its JSON response is bounded, same-origin,
successful, and contains its exact `required_marker` as `marker` or
`green_marker`. Missing, malformed, oversized, redirected, or marker-mismatched
resources remain visible as failed observations with `document: null`, force
`partial_read_only`, and never become capability evidence.

## Meaning of `official_network_verified`

In this client, `official_network_verified` means:

1. the first-contact manifest declares the exact `VOID Mainnet-0`, chain
   `2050`, and `mainnet0` identity;
2. the official discovery and authenticity documents were reachable;
3. both responses carry their exact contract markers, protocol versions, and
   top-level network fields;
4. discovery links back to the manifest-declared authenticity path; and
5. both responses preserve their read-only, no-credentials, no-redirect, and
   authority-zero controls.

It does **not** claim that the client independently revalidated every
cryptographic signature or reproduced the offline root ceremony.
Free-form or nested text containing `VOID`, `mainnet0`, or `2050` is not
network-binding evidence and is rejected.

## Capability honesty

The manifest itself promises neither paid work nor Work Credit earning.

The client may add a review action only when the live capabilities document
contains a corresponding observable signal. Such an action remains
read-only review; it is not a work submission or earning event.

## Organic agent acquisition design direction

The next-stage acquisition design should make VOID useful to an unknown agent
**before** that agent needs to understand VOID as a project, hold VOID, create a
wallet, register an account, or obtain a credential.

The intended organic loop is:

```text
discover -> understand -> consume useful public data -> inspect useful work
-> produce a verifiable result -> receive a public receipt -> return
```

The working design name for this composition is **Bot Watering Hole V1**. It is
not a new endpoint or authority by itself. It is a design direction for evolving
the existing first-contact, capability, intake, public-data, work, and receipt
surfaces without creating a parallel agent protocol family.

### 1. One machine-readable front door

Cold discovery should continue to begin from the existing well-known discovery
and first-contact documents. An agent should be able to orient itself with one
GET and then follow explicit links to:

- network identity and chain `2050` authenticity;
- currently live public capabilities;
- useful free/read-only data;
- work discovery, but only when work is actually available;
- public verification/receipt surfaces; and
- authentication or stronger authority only when a later action genuinely
  requires it.

Discovery documents must advertise only capabilities that are live and
observable. A planned capability is not a live capability.

### 2. Useful before identity

An unknown agent should be able to perform meaningful read-only activity
without an email address, API key, CAPTCHA, wallet, Discord account, human
approval, or pre-registration.

Preferred public utility candidates include DataNet and NullFeed-style
machine-readable information, public network state, public proofs, public
objects, datasets, and verification material. Exact data products and routes
remain separate implementation decisions.

The first interaction should answer a practical question for the visiting
agent, not merely explain VOID.

### 3. Read-only first, authority progressively disclosed

The default cold path remains GET-only and non-mutating.

Authentication should appear only when the requested capability crosses an
actual authority boundary. Work submission, earning, settlement, wallet use,
transaction broadcast, validator actions, or other mutations must remain
separate capability and authorization gates.

No agent should need to surrender unrelated credentials merely to discover the
network or inspect public work.

### 4. Machine-readable work packets

When agent work is intentionally activated, work discovery should expose
small, bounded, independently understandable packets rather than an open-ended
"do something useful" prompt.

A future packet should bind at least:

- stable task/work ID;
- version;
- public input references or content identities;
- exact expected output schema;
- verification/scoring rule;
- resource and time bounds;
- submission rules;
- reward/accounting terms when applicable;
- expiry or withdrawal state; and
- links to example results and verification receipts where safe.

The design principle is **reward useful, verifiable work rather than traffic or
presence**. VOID should not pay agents merely for showing up, polling, creating
identities, or generating unverifiable activity.

This section does not activate Work Credit earning. V1's current capability
honesty remains authoritative until a separate earning lane is explicitly live.

### 5. Public receipts as discovery objects

Successful agent interactions should produce stable, machine-readable public
receipts whenever the underlying action is safe to disclose.

A receipt should let another agent determine, without trusting marketing copy:

- what task or public action was attempted;
- what input/result identities were bound;
- what verifier or policy evaluated it;
- whether it passed, failed, or held;
- what authority was and was not exercised; and
- where related public data, task definitions, or verification material can be
  followed next.

Receipts are therefore both audit evidence and acquisition surfaces. Agents that
encounter one through search, a dataset, GitHub, NullFeed, DataNet, or another
public object should be able to follow provenance back to first contact.

### 6. Build a public provenance graph, not a marketing funnel

Public machine-readable surfaces should cross-link by stable identities and
URLs so discovery propagates naturally through useful material.

Examples include:

- public datasets linking to their VOID provenance/proof;
- task definitions linking to inputs, schemas, examples, and receipts;
- receipts linking back to the task and verifier;
- DataNet/NullFeed objects linking to related public objects where semantically
  justified;
- repository examples linking to the canonical first-contact document; and
- first contact linking only to capabilities that are currently real.

The goal is that an agent researching an unrelated public object can encounter
VOID through provenance, verify that the object is useful, and discover the
rest of the network without a human referral.

### 7. Curl-grade cold-start acceptance

A future Bot Watering Hole acceptance should prove that an outside agent with
only ordinary HTTP tooling can:

1. discover the official VOID machine entrance;
2. verify the public network identity expected by the first-contact contract;
3. obtain at least one genuinely useful read-only result;
4. discover at least one bounded work packet when work is enabled;
5. understand its output schema and verification rule without human chat;
6. inspect at least one public example/receipt; and
7. identify the exact next authority gate before any mutation.

No SDK should be required for first contact. SDKs and richer clients may improve
convenience but must not become gatekeepers.

### 8. Anti-spam and sovereignty boundary

Organic acquisition must not become permissionless economic drain or Sybil
farming.

Future mutating/work surfaces should remain bounded by deterministic admission,
resource limits, idempotency/deduplication, explicit work availability,
verifiable scoring, and auditable accounting. Rate limiting or proof-of-work-like
resource controls may be considered separately if public abuse makes them
necessary, but human identity collection should not be the default answer.

Public discovery must remain usable even when earning or mutation is disabled.

### 9. Success metric

The acquisition design succeeds when an unknown autonomous agent can arrive
cold, understand VOID from machine-readable evidence, obtain something useful,
and know how to continue without a human operator explaining the system.

Retention should come from recurring utility, useful work, and verifiable
receipts rather than advertising dependence.

## Source-only boundary

The V1 lane contains exactly six files and does not modify `src/index.ts`,
runtime hosts, node services, Buy VOID, Paid DataNet, WC ledgers, validators,
wallets, signers, Nimo, or Alienware.

The public files become available through the existing public static-file
surface when a later deployment lane updates the serving checkout. No service
restart is part of this source lane.

The catalog composition reuses this protocol and modifies only the existing
first-contact and public-utility source families. It adds no endpoint family,
runtime route, account requirement, earning promise, or mutation authority.
The client rejects redirects, cross-origin and traversal paths, credentialed
origins, non-JSON responses, and responses larger than 64 KiB.

## Proof

```bash
node scripts/prove_void_ai_agent_first_contact_v1.mjs
```

The proof starts a loopback-only fixture server, runs the real client against
it, validates the public-utility composition and JSON report, checks the HTML
links, and enforces GET-only, same-origin, bounded-response client behavior.
