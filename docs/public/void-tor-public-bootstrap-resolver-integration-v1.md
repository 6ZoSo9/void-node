# VOID Tor public bootstrap resolver integration v1

Status: source-only stacked integration lane. This work does not install Tor, create an onion service, publish an onion address, access onion-service keys, alter the canonical bootstrap manifest, deploy, or start a service.

## Purpose

The earlier Tor-native transport lane proves that a canonical Tor v3 onion address can be reached through a numeric-loopback SOCKS5 proxy without clearnet DNS. This integration lane carries that transport through the complete client boundary:

```text
content-addressed local Tor manifest
  -> Tor resolver with exact manifest-ID pin
  -> qualified checksum-valid onion endpoint selection
  -> local SOCKS5 Tor transport
  -> numeric-loopback seed adapter
  -> existing follower HTTP contract
```

The result is a synchronization path whose runtime operation does not require a registrar, DNS provider, certificate authority, Cloudflare, public IP address, router port forwarding, Tailnet admission, or GitHub-hosted manifest retrieval.

## Trust-root boundary

The Tor resolver accepts a local manifest only when both of these are supplied:

- the canonical path of a regular non-symlink manifest file; and
- its exact expected `voidpbm1_<sha256>` manifest ID.

The resolver recomputes the manifest ID from canonical JSON and rejects any file whose content differs from the expected root. File presence alone does not establish trust.

The manifest contract is closed and requires:

- schema `void_public_bootstrap_v1`;
- network `VOID Network` and chain ID `2050`;
- status `stable_tor_seed`;
- zero clearnet `sync_endpoints`;
- one through eight qualified `tor_v3_http` onion endpoints;
- a bounded one-hour through seven-day validity interval;
- no private Tailnet publication; and
- every private and economic authority flag set to `false`.

This lane deliberately uses an explicit manifest-ID pin rather than pretending that a local pathname is a sovereign root. A later release-root lane can embed or sign this pin for reproducible distribution through multiple independent channels.

## Tor identity and transport boundary

Every onion identity must pass the repository's Tor v3 decoder, version check, and SHA3 checksum validation. A hostname that merely has 56 base32 characters and an `.onion` suffix is rejected if its version or checksum is invalid.

Every onion request:

- accepts only a checksum- and version-valid canonical Tor v3 hostname;
- uses virtual port `80` through Tor;
- sends the onion hostname to SOCKS5 using address type `DOMAINNAME`;
- requires the SOCKS proxy to bind to numeric loopback;
- performs no clearnet DNS resolution;
- permits only `GET` and `HEAD`;
- validates the exact public route before opening the SOCKS connection;
- rejects private, unknown, query-polluted, duplicate-bound, and overlarge range requests without transmitting them;
- rejects redirects, non-200 responses, transfer encoding, malformed or duplicate headers, oversized bodies, invalid content length, non-JSON responses, and missing gateway identity; and
- validates route-specific response semantics before returning bytes to the node.

The supported remote routes remain the restricted read-only seed-gateway contract:

```text
/__void/ready.json
/blocks/latest/number2.json
/head
/__void/demo/summary.json
/api/health
/blocks/range?from=<n>&to=<n>
```

Block ranges remain capped at 999 blocks and must contain exactly the requested contiguous block numbers.

The SOCKS handshake uses one persistent buffered reader so correctness does not depend on how TCP divides or coalesces greeting and connect-reply bytes.

## Loopback adapter

The Tor adapter binds only to `127.0.0.1` or `::1`. The node follows this local origin and never receives the onion address or SOCKS proxy as a direct remote peer.

The adapter preserves:

- exact read-route validation;
- mutation-method rejection;
- private-route rejection;
- qualified-peer failover;
- active-peer binding;
- two-second validated range retry caching;
- bounded integer listen, SOCKS, timeout, and response-size parameters;
- query rejection on its local diagnostic route; and
- bounded response sizes.

Its status endpoint explicitly reports that DNS, a domain registrar, a certificate authority, and a cloud provider are not required.

## Supervisor shutdown

The Tor bootstrap supervisor forwards termination signals to the node child and closes the loopback adapter through one idempotent promise shared by signal, child-error, and child-exit paths. The shutdown proof requires a clean child exit, a closed adapter listener, and no double-close error.

## Proof

Run:

```bash
node scripts/prove_void_tor_native_bootstrap_transport_v1.mjs
node scripts/prove_void_tor_public_bootstrap_integration_v1.mjs
node scripts/prove_void_tor_public_bootstrap_supervisor_shutdown_v1.mjs
```

The proofs build a fresh content-addressed Tor manifest, start in-process SOCKS5 fixtures, run the resolver as a separate process, compose its output into the loopback adapter, and verify:

- checksum- and version-valid Tor v3 identity requirements;
- checksum-invalid lookalike rejection;
- exact manifest-ID pinning;
- substituted trust-root rejection;
- fragmented SOCKS handshake framing;
- private and polluted routes rejected before connection;
- SOCKS domain-name routing to the onion address on virtual port 80;
- exact-green readiness;
- a contiguous three-block range;
- private-route rejection;
- mutation-method rejection;
- local diagnostic query rejection with zero additional SOCKS requests;
- bounded direct adapter parameters;
- idempotent supervisor shutdown and adapter listener closure; and
- zero clearnet DNS, registrar, certificate-authority, or cloud dependency.

Expected markers:

```text
VOID_TOR_NATIVE_BOOTSTRAP_TRANSPORT_V1_PROOF_GREEN
VOID_TOR_PUBLIC_BOOTSTRAP_INTEGRATION_V1_PROOF_GREEN
VOID_TOR_PUBLIC_BOOTSTRAP_SUPERVISOR_SHUTDOWN_V1_PROOF_GREEN
checksum_valid_onion_identity_required=true
socks_handshake_fragmentation_proven=true
remote_private_route_requested=false
local_manifest_id_pinned=true
manifest_substitution_rejected=true
adapter_numeric_parameters_bounded=true
local_status_query_rejected=true
resolver_adapter_composed=true
block_range_contiguous=true
adapter_close_idempotent=true
adapter_listener_closed=true
double_close_error=false
dns_resolution_required=false
domain_registrar_required=false
certificate_authority_required=false
cloud_provider_required=false
private_mutation_routes_exposed=false
wallet_signer_validator_wc_money_authority=0
```

## Remaining gates

This lane does not yet modify `run-void-node.sh`. Launcher integration remains separate so the transport and resolver can be reviewed before changing the default clone-and-run path.

A complete Tor-native public bootstrap still requires:

1. a persistent Tor v3 onion service mapped to the restricted gateway;
2. protected and recoverable onion-service identity custody;
3. a real qualification receipt for the onion endpoint;
4. a signed or embedded release trust root that removes manual manifest-ID entry;
5. launcher selection and failover policy;
6. a real ordinary-machine Tor-only synchronization proof; and
7. removal of centralized infrastructure from every canonical runtime dependency.

Issue #1005 remains open until those operational and outside-machine proofs exist.

## Authority boundary

This lane is source, proof, documentation, and CI only. It does not install Tor, create or access onion-service keys, publish an address, access credentials, change DNS, use Cloudflare, start or restart services, replace a manifest, deploy, access a wallet or signer, mutate validators or Work Credits, or move funds.
