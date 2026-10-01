# Precision web recovery host observer v1

Marker: `VOID_PRECISION_WEB_RECOVERY_HOST_OBSERVER_V1`

Status: reviewed read-only host-observation source. Source merge alone is **not**
a live-host acceptance event.

## Purpose

Merged #2273 defines the exact current-source recovery plan and the strict
`VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1` receipt schema, but deliberately
does not inspect Precision.

This observer is the next #1618 layer. When run locally on Precision, it gathers
the runtime facts needed to construct that exact receipt and immediately passes
the receipt through the merged #2273 verifier.

The collector never starts, stops, restarts, enables, disables, reloads, writes
a unit, changes a listener, changes Tailscale Serve/Funnel, changes DNS, reads
wallet/signer material, constructs a transaction, or moves value.

## Default host and units

Pinned host identity:

```text
zoso-Precision-Tower-7810
```

The hostname is not a CLI override. A different hostname requires a reviewed
successor contract rather than redefining what this observer calls Precision.

Default user units:

```text
adapter      void-public-seed-adapter.service
composition  void-public-app-composition-gateway-v1.service
frontdoor    void-public-frontdoor-v1.service
node         void-node-live.service
```

The three web-service unit names may be overridden explicitly at invocation
time because the historical Precision recovery did not retain their exact names
in checked-in evidence. Overrides remain bounded to syntactically valid
`.service` unit names and each observed systemd snapshot must match the exact
unit selected for that role.

The node unit is not overrideable: node restart stability is always bound to
`void-node-live.service`. No unit name is inferred from process text or
historical Alienware state.

## Read-only observation wall

The operational collector performs only these classes of reads:

1. prepare the exact current #2273 source plan from a clean repository;
2. read `systemctl --user show` for the three web services;
3. read the live node service `InvocationID` before and after observation;
4. read `ss -H -ltnp` and prove exact listener/PID ownership;
5. read the running service `/proc/<pid>/exe`, `cmdline`, cwd, and exact
   Node entry-script bytes; require the executable basename to be `node` or
   `nodejs`, require argv[1] to resolve to the actual entry script, and require
   that exact file's SHA-256 to match the source digest in the plan;
6. GET three loopback JSON endpoints with a 5-second total request deadline and
   256 KiB response ceiling;
7. read Tailscale Serve and Funnel status JSON before and after the observation.

All external commands use fixed absolute executable paths and are checked for
filesystem-identity stability before/after each read. The observer also strips
dynamic-loader overrides and Tailscale socket/debug overrides, fixes
`PATH=/usr/bin:/bin`, and pins user-systemd reads to the current UID's
`/run/user/<uid>/bus` rather than trusting inherited D-Bus/runtime-directory
coordinates.

## Runtime facts required

### Adapter

```text
active/running
127.0.0.1:8080
listener PID == systemd MainPID
running Node argv[1] source SHA-256 == current plan adapter source
/__void/adapter.json:
  adapter=void_public_seed_adapter
  version=1
  upstream_private=true
  private_rpc_public=false
```

### Composition

```text
active/running
127.0.0.1:8082
listener PID == systemd MainPID
running Node argv[1] source SHA-256 == current plan composition source
/__void/public-app/network.json:
  ok=true
  marker=VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1
  runtime_truth_marker=VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1
  strict_ready=true
  ready=true
  network_name=Mainnet-0
  node.label=Precision public seed
  node.role=public-seed
  node.public=true
```

### Frontdoor

```text
active/running
127.0.0.1:8083
listener PID == systemd MainPID
running Node argv[1] source SHA-256 == current plan frontdoor source
/__void/frontdoor/status.json:
  marker=VOID_PUBLIC_FRONTDOOR_V1
  ready=true
  upstream_strict_ready=true
  upstream_marker=VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1
  upstream_runtime_truth_marker=VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1
```

## Precision service-hardening profile

Every observed web unit must report:

```text
NoNewPrivileges=yes
RestrictSUIDSGID=yes
LockPersonality=yes
PrivateTmp=no
ProtectHome=no
ProtectSystem=no
```

This is the exact Precision descriptor-walk-compatible recovery profile defined
by #2273, not a general recommendation for unrelated services.

## Observation stability

The collector refuses acceptance if any of these change across the observation
window:

- `void-node-live.service` InvocationID;
- canonical Tailscale Serve status JSON;
- canonical Tailscale Funnel status JSON.

This proves the observer did not silently accept a moving local recovery/routing
generation.

The observer does **not** claim that no historical mutation occurred before its
collection window. Its output states:

```text
negative_action_scope=observer_process_only
historical_mutation_absence_not_inferred=true
```

## Freshness

Host observations are accepted only when:

- the timestamp is canonical UTC at whole-second precision;
- age is at most 5 minutes;
- future clock skew is at most 5 seconds.

The operational collector creates the timestamp itself after all before/after
reads.

## Output

A successful live run emits:

```text
status=PRECISION_WEB_RECOVERY_HOST_OBSERVATION_ACCEPTED
live_host_observation_performed=true
independent_host_acceptance=true
ingress_activation_authorized=false
service_mutation_authorized=false
routing_mutation_authorized=false
dns_mutation_authorized=false
tailscale_mutation_authorized=false
node_restart_authorized=false
funds_moved=false
```

It embeds the exact #2273 recovery receipt and verifier status and is
content-addressed as:

```text
voidpwro1_<sha256>
```

`independent_host_acceptance=true` is reachable only through the module-private
live finalizer called by the operational collector after it has gathered the
host facts itself. The exported pure evaluator deliberately returns:

```text
status=PRECISION_WEB_RECOVERY_HOST_OBSERVATION_STRUCTURALLY_VERIFIED_LIVE_RUN_REQUIRED
live_host_observation_performed=false
independent_host_acceptance=false
```

This prevents fabricated fixture JSON from being promoted to a live acceptance
through a library call. Hosted CI tests that structural evaluator and its
parsers; it does not set live production state.

## Run on Precision

From a clean, current checkout:

```bash
node tools/void-precision-web-recovery-host-observer-v1.mjs \
  --pretty \
  --output "$HOME/Downloads/void-precision-web-recovery-host-observation-v1.json"
```

If the installed unit names differ from the defaults, pass them explicitly:

```bash
node tools/void-precision-web-recovery-host-observer-v1.mjs \
  --adapter-unit '<exact-adapter.service>' \
  --composition-unit '<exact-composition.service>' \
  --frontdoor-unit '<exact-frontdoor.service>' \
  --pretty
```

The output path is create-only and mode `0600`.

## Proof

```bash
node scripts/prove_void_precision_web_recovery_host_observer_v1.mjs
```

The proof imports and executes the real merged #2273 plan/verifier, proves the
systemd and `ss` parsers, binds the actual Node argv[1] entry-script bytes by
SHA-256, proves command-environment isolation and local user-bus pinning, and
falsifies host, service-unit, pinned node-unit, listener, process-entry,
executable, hardening, runtime-marker, stability, stale-time, and future-time
failures.

## Relationship to #1614

A successful **live Precision run** closes the read-only host-observation gate
defined by #1618. It still does not authorize path-preserving
`voidchain.org` ingress mutation. #1614 remains a separate source/deployment
and acceptance boundary.

## Authority boundary

```text
source_merge_is_live_acceptance=false
collector_is_read_only=true
service_mutation_authorized=false
routing_mutation_authorized=false
dns_mutation_authorized=false
tailscale_mutation_authorized=false
node_restart_authorized=false
credential_access=false
wallet_or_signer_access=false
transaction_performed=false
validator_mutation=false
work_credit_mutation=false
funds_moved=false
ingress_activation_authorized=false
```
