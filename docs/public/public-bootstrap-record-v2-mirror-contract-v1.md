# VOID public bootstrap record v2 mirror contract v1

Status: source-only, path-disjoint groundwork for issue #1005. This lane does not alter the native P2P address parser, runtime dialing, the current v1 bootstrap resolver, Tor release-root source, Buy VOID, deployment, or network services.

## Purpose

Issue #1005 requires bootstrap records to be retrievable through multiple replaceable mirrors and transports without making any one host, DNS name, repository, cloud account, or operator endpoint a permanent network authority.

This lane defines the immutable distribution contract only. It deliberately does **not** define the final P2P introduction-address grammar owned by issue #1040, and it does not activate a new runtime resolver.

The record is a content-addressed pointer from one exact validated `void_public_bootstrap_v1` manifest to a bounded mirror set. The same manifest bytes can be served from any mirror at a path derived from the manifest content ID.

## Closed record schema

A `void_public_bootstrap_record_v2` record binds:

- network `VOID Network`;
- numeric chain ID `2050`;
- generation and expiry timestamps with one-hour through seven-day validity;
- exact bootstrap manifest schema, `voidpbm1_...` content ID, raw-byte SHA-256, and byte length;
- three through sixteen canonical mirror roots;
- unique mirror hostnames and declared failure-domain labels;
- both HTTPS and Tor mirror transports;
- immutable content-derived manifest and record paths;
- `minimum_successes=1` so any healthy mirror can satisfy retrieval;
- an explicit N−1 requirement;
- no mutable `latest` alias; and
- every private/economic authority flag exactly false.

The record itself is content-addressed as `voidpbr2_<sha256(canonical-json-without-record_id)>`.

The manifest reference validator in this lane accepts only the **currently merged v1 states**: `hold_no_stable_seed` or `stable_https_seed`. A stable HTTPS manifest must still be live at record generation time, have one through eight synchronization endpoints, contain no onion endpoints, and retain the merged one-hour through seven-day validity bound. Tor is used here as an independent **mirror transport**, not as a new seed-manifest schema; the separate Tor signed-manifest files remain untouched.

## Mirror roots

The only canonical mirror root path in this contract version is:

```text
/void/bootstrap/v2
```

HTTPS mirror example:

```text
https://mirror-a.example/void/bootstrap/v2
```

Tor mirror example:

```text
http://<checksum-valid-v3-onion>.onion/void/bootstrap/v2
```

The contract rejects credentials, query strings, fragments, noncanonical ports, local hostnames, IP-literal HTTPS roots in this version, malformed Tor identities, duplicate mirror roots, duplicate hostnames, and duplicate failure-domain labels.

A manifest URL is derived, never supplied by the record:

```text
<mirror-root>/manifests/<voidpbm1_manifest_id>.json
```

A record URL is similarly derived:

```text
<mirror-root>/records/<voidpbr2_record_id>.json
```

No `latest` alias is part of the contract.

## N−1 behavior

The focused proof constructs two HTTPS mirrors and one Tor mirror, then removes each mirror in turn. Retrieval must still succeed from one of the remaining mirrors while preserving the exact manifest byte hash and `voidpbm1_...` content ID.

The proof also forces:

1. a tampered first mirror;
2. a transport failure on the second mirror; and
3. a valid third mirror.

The resolver must reject the tampered bytes, fail over after the transport error, and accept only the exact content-addressed bytes from the third mirror.

Declared `failure_domain` values are cryptographically bound into the record, but source validation cannot prove that two operators or providers are truly independent. Real N−1 acceptance still requires operational evidence from separate failure domains.

## Authentication and anti-rollback boundary

A content ID proves integrity, not that a record is the authorized current record.

Therefore this record must **not** be used as a production bootstrap authority merely because its hash is valid. Before runtime activation, a separate reviewed lane must bind the expected `voidpbr2_...` record ID into a trusted release-root/pointer mechanism, such as the threshold-signed release-root work being developed for the Tor bootstrap stack or a generic successor.

Until that binding exists:

```text
runtime_activation_authorized=false
record_integrity_proven=true
authorized_current_record_proven=false
```

This avoids turning a mirror, GitHub, DNS, or an unsigned mutable pointer into network authority.

## Relationship to issue #1040

Issue #1040 owns canonical P2P peer-address parsing, IPv6 bracket rules, learned-peer filtering, dedupe, and independent bootstrap dialing.

This mirror-contract lane intentionally does not edit:

```text
src/node_core.ts
src/index.ts
```

and does not define the final P2P introduction endpoint schema. After #1040 is exact-green, a follow-on record payload can bind its canonical peer-address form without reconciling this lane's files.

## Verification

Run:

```bash
node --check scripts/lib/void_public_bootstrap_record_v2_mirror_contract_v1.mjs
node --check scripts/verify_void_public_bootstrap_record_v2_mirror_contract_v1.mjs
node --check scripts/prove_void_public_bootstrap_record_v2_mirror_contract_v1.mjs
node scripts/prove_void_public_bootstrap_record_v2_mirror_contract_v1.mjs
```

Expected markers:

```text
VOID_PUBLIC_BOOTSTRAP_RECORD_V2_MIRROR_CONTRACT_V1_PROOF_GREEN
mirror_count=3
https_mirror_count=2
tor_mirror_count=1
n_minus_one_each_mirror=true
tampered_first_mirror_accepted=false
failover_after_tamper_and_transport_failure=true
immutable_content_paths=true
mutable_latest_alias_allowed=false
transport_diversity_required=true
merged_v1_manifest_status_contract_enforced=true
manifest_record_time_binding_enforced=true
release_root_binding_required_before_runtime_activation=true
runtime_integration_performed=false
network_calls_performed=false
wallet_signer_validator_wc_money_authority=0
```

## Authority boundary

This lane is source, proof, documentation, and CI only. It does not publish a bootstrap record or manifest, make a network request, alter the current bootstrap resolver, create or access Tor identity material, change DNS/TLS, provision infrastructure, open a firewall, deploy or restart a service, access credentials, wallets, keys, or signers, mutate validators or Work Credits, submit a transaction, or move funds.
