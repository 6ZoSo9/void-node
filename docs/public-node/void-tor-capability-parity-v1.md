# VOID Tor Capability Parity V1

Marker: `VOID_TOR_CAPABILITY_PARITY_V1`

## Doctrine

Tor is a first-class, policy-selectable VOID transport.

VOID does not require Tor for node survival, and Tor does not inherit every
VOID authority merely because an endpoint can be reached through an onion
service. Safe agent-visible capabilities target functional parity. Sensitive
capabilities require a separate threat model. Private operator authority stays
private.

The machine-readable contract is:

```text
config/void-tor-capability-parity-v1.json
```

This contract reports source policy only. It does not claim that a capability
is deployed, reachable, healthy, or independently verified on a live host.

Validate the contract against its checked-in JSON Schema with:

```bash
python3 scripts/validate_void_tor_capability_parity_v1.py
```

## Three policy classes

### Required

Safe discovery, read, and bounded agent-commerce workflows should work over Tor
without requiring clearnet DNS, a clearnet callback, a caller-selected upstream,
or a generic reverse proxy.

### Separate review

P2P-over-Tor and incentives for contributing Tor capacity require their own
threat models. Latency, peer identity correlation, Sybil resistance, eclipse
resistance, diversity, measurement integrity, and operator safety cannot be
inherited from an HTTP onion-service proof.

### Forbidden

The following never become direct onion surfaces:

- wallet files, seeds, signing keys, or unrestricted signing;
- operator shell, restart, validator, treasury, or release controls;
- generic caller-selected reverse proxying.

Higher-level bounded workflows may eventually cause authorized state changes,
but the transport must not expose their underlying private authority.

## Current source-level assessment

Stage 1 is represented in source by:

- the Tor v3 public-node transport;
- signed VOID-node-to-onion binding;
- signature-bound read-only MCP through the exact `/mcp` path.

Stage 2 gaps are:

- authenticated paid-work submission over Tor;
- public quote-contract and schema retrieval over Tor;
- accepted-request-bound deterministic quote retrieval;
- read-only order-status retrieval over Tor;
- signed receipt retrieval;
- dynamic DataNet public reads;
- bounded Work Credit earning through the existing ticket-and-receipt model;
- VOID-native service settlement without exposing signer custody.

Source progress merged after the initial assessment is recorded conservatively:

- PR #864 added explicit public-node quote and schema routes, but onion mapping
  has not been proven;
- PR #867 added the bounded read-only order-status source resolver, but onion
  route parity has not been proven;
- PR #865 closed one post-admission provider-quote proof path, but it did not
  add a general quote-retrieval route, payment authorization, or Tor exposure;
- PR #868 bound acceptance persistence to a trusted runtime context provider,
  but it did not add or prove an onion route and therefore does not promote the
  authenticated paid-work submission capability beyond `guarded_disabled`.

Stage 3 is reserved for:

- separately reviewed P2P-over-Tor;
- independently verified Tor-capacity contribution work.

## Generate the report

```bash
node tools/void-tor-capability-parity-v1.mjs --format pretty
```

The report is deterministic and includes explicit non-authority statements.

## Proof

```bash
node scripts/prove_void_tor_capability_parity_v1.mjs
```

The proof first validates the contract against the checked-in JSON Schema, then
validates deterministic output, policy classification, explicit Stage 2 gaps,
evidence-file presence, and absence of runtime mutation behavior.

## Authority boundary

This lane is source and CI only. It does not install Tor, alter `torrc`, create
or purge an onion identity, start or restart a service, expose a listener,
contact a network endpoint, access credentials, submit paid work, fetch DataNet
objects, write Work Credits, sign a transaction, settle VOID, or mutate a node,
validator, wallet, treasury, release, or operator state.

## Next implementation lane

The first Stage 2 implementation should close the lowest-risk read-only
parity gaps: exact public quote-contract/schema retrieval and exact
request-scoped order-status retrieval through the existing signature-bound
onion origin. The next bounded action is authenticated paid-work submission,
followed by accepted-request-bound quote and signed-receipt retrieval.

Every route must preserve fixed loopback upstreams; exact path and method
allowlists; bounded body, response, timeout, and concurrency limits; credential
secrecy; replay and duplicate protection; no caller-selected upstream; no
wallet or signer exposure; and no automatic execution or settlement until each
preceding proof is exact green.

## Reconciliation through PR #869

Main now includes the pure read-only order-status request handler introduced by
PR #869. It composes strict GET/path validation, bounded source resolution,
lifecycle materialization, and deterministic route-response materialization.

The handler does not register or mount an HTTP route, create a listener, deploy,
restart a service, submit authenticated work, authorize payment, dispatch work,
or write Work Credits. The reviewed source also contains no explicit Tor or
onion binding. Therefore `commerce.order_status_retrieval` remains
`not_mapped`; PR #869 is additional source evidence, not transport-parity
evidence.
