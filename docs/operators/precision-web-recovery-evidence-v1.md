# Precision web recovery evidence v1

Marker: `VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1`

Status: source-only recovery plan plus strict external-observation contract.
This lane does not install, start, stop, restart, route, or publish anything.

It is the compact current-main replacement for the stale multi-file recovery
packet referenced by #1618.

## Current source generation

The plan binds exact Git blobs and file SHA-256 values for:

- `ops/public/public-seed-adapter-v1.mjs`;
- `ops/public/run-public-seed-adapter-v1.sh`;
- `ops/public/void-public-app-composition-gateway-v1.mjs`;
- `ops/public/run-void-public-app-composition-gateway-v1.sh`;
- `ops/systemd/user/void-public-app-composition-gateway-v1.service.example`;
- `ops/public/void-public-frontdoor-v1.mjs`;
- `ops/public/void-public-frontdoor-cutover-v1.sh`; and
- `public/void-public-frontdoor-v1/index.html`.

Preparation requires a clean repository and exact reviewed source blobs.
The plan records the current repository HEAD/tree and this verifier's Git blob.

Unrelated later commits are not silently treated as the same plan. A new source
generation requires a new content-addressed plan.

## Reconstructed Precision topology

The reviewed recovery topology is:

```text
live node       127.0.0.1:4100
                    |
                    v
public adapter  127.0.0.1:8080
                    |
                    v
composition     127.0.0.1:8082
                    |
                    v
frontdoor       127.0.0.1:8083
```

This topology intentionally uses overrides rather than blindly inheriting every
current default:

- the generic adapter source defaults to port 4111, while the proven Precision
  recovery used loopback port 8080;
- the composition runner defaults to 8082 and upstream adapter 8080;
- current composition examples still contain the historical display label
  `Alienware public seed`, while the reviewed Precision recovery identity is
  `Precision public seed`;
- the frontdoor is loopback-only on 8083 with composition upstream 8082.

The plan binds those distinctions explicitly.

## Precision filesystem-namespace compatibility

The 2026-09-21 Precision recovery isolated a host-specific incompatibility
between the public adapter descriptor walk and mount-namespace hardening.

The adapter opens `/` read-only and walks the configured DataNet static root
through `/proc/self/fd/...` with no-follow semantics.

The Precision transient user-systemd matrix established:

```text
NoNewPrivileges=yes   GREEN
RestrictSUIDSGID=yes  GREEN
LockPersonality=yes   GREEN
PrivateTmp=yes        EACCES opening /
```

The earlier staged recovery had also removed `ProtectSystem=strict` and
`ProtectHome=read-only` before the final successful profile was established.

Therefore this recovery contract requires all three recovery units to report:

```text
no_new_privileges=true
restrict_suid_sgid=true
lock_personality=true
private_tmp=false
protect_home=false
protect_system=false
```

This does not claim that these settings are globally correct for every host or
every VOID service. It records the reviewed Precision recovery generation.

The current generic composition example and current generic frontdoor cutover
still contain mount-namespace settings including `PrivateTmp=true`. Those
generic templates are source-bound for provenance, but their mount-namespace
profile is explicitly **not** adopted as Precision recovery authority.

## Runtime observation contract

A later independently collected host receipt must bind this exact plan and
report all of the following:

### Adapter

```text
active=true
listener=127.0.0.1:8080
marker=void_public_seed_adapter
source_file_sha256=<current bound adapter source>
```

### Composition

```text
active=true
listener=127.0.0.1:8082
marker=VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1
runtime_truth_marker=VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1
strict_ready=true
network_name=Mainnet-0
node_label=Precision public seed
source_file_sha256=<current bound composition source>
```

### Frontdoor

```text
active=true
listener=127.0.0.1:8083
marker=VOID_PUBLIC_FRONTDOOR_V1
ready=true
upstream_strict_ready=true
upstream_marker=VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1
upstream_runtime_truth_marker=VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1
source_file_sha256=<current bound frontdoor source>
```

The receipt must also bind the reviewed service-hardening profile and report:

```text
node_service_restart_performed=false
tailscale_routing_mutated=false
dns_mutated=false
funnel_mutated=false
wallet_or_signer_accessed=false
transaction_performed=false
funds_moved=false
```

The receipt itself is content-addressed as:

```text
voidpwre1_<sha256>
```

## What the source verifier does not prove

`verifyVoidPrecisionWebRecoveryEvidenceV1(...)` checks a supplied receipt's
closed schema, source generation, topology, runtime markers, hardening profile,
negative-action boundary, timestamp syntax, and content identity.

It does **not** itself run `systemctl`, `ss`, `curl`, Tailscale, or any
other host-observation command.

A caller can always fabricate JSON. Therefore a structurally valid receipt is
not independent live-host acceptance by itself.

The verifier deliberately returns:

```text
PRECISION_WEB_RECOVERY_OBSERVATION_CONTRACT_VERIFIED_ACCEPTANCE_REQUIRED
live_host_observation_performed_by_this_verifier=false
independent_host_acceptance_required=true
installation_authorized=false
independent_acceptance=false
```

The next #1618 step is a separately reviewed read-only host collector or exact
operator receipt that produces these fields from Precision and is then checked
against this source plan.

## Relationship to #1614

#1614 path-preserving `voidchain.org` ingress depends on #1618.

This source contract is a prerequisite, not ingress authority.

Do not treat source merge as permission to change Funnel, Tailscale Serve, DNS,
Cloudflare, WordPress forwarding, or any other public route. Independent
Precision acceptance must be complete first, and ingress activation remains a
separate confirmed operation.

## Authority boundary

```text
source_only_plan=true
external_observation_verification=true
clean_repository_required=true
exact_source_blobs_required=true

host_execution=false
installation_authorized=false
service_mutation_authorized=false
routing_mutation_authorized=false
dns_mutation_authorized=false
tailscale_mutation_authorized=false
node_restart_authorized=false
credential_access=false
wallet_or_signer_access=false
transaction_construction=false
transaction_signing=false
transaction_broadcast=false
validator_mutation=false
work_credit_mutation=false
funds_movement=false
independent_acceptance=false
```

Focused proof:

```bash
node scripts/prove_void_precision_web_recovery_evidence_v1.mjs
```
