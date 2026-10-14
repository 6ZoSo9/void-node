# Public Earn legacy cutover census v1

Marker: `VOID_PUBLIC_EARN_LEGACY_CUTOVER_CENSUS_V1`.

## Purpose

The repaired designated-host census shows the protected system-service topology
is not installed yet. Before staging it, this source-only observer determines
whether Precision still has the historical **user-service** Public Earn path
that must be preserved during migration.

It observes:

- `void-public-earn-gateway-v1.service` in the user manager;
- `void-public-seed-named-tunnel-v1.service` in the user manager;
- current listener ownership on loopback port 4122;
- whether the running gateway uses the Ready #2993 source blob;
- whether dedicated mutation mode is already configured;
- whether the active cloudflared config still sends Public Earn status and/or
  claim/submit directly to `127.0.0.1:4122`.

The collector never emits the cloudflared config path, tunnel ID,
credentials-file path, full process command line, or process environment.

## Process-generation binding

Both user services are bound to systemd MainPID plus Linux kernel start ticks
before observation and re-read afterward. A restart or PID reuse makes the
generation unstable.

## Interpretation

If `legacy_cutover_required=true`, the next deployment must be a guarded
migration rather than an independent system-service start.

If `mutation_route_removal_required=true`, claim/submit must be removed from
the old cloudflared direct-to-4122 route before protected public mutation ingress
can be considered live.

If `status_route_preservation_required=true`, the migration plan must preserve
the non-mutating Public Earn status/read surface while moving mutation traffic.

If `system_gateway_4122_conflict=true`, a new system gateway must not attempt
to bind 4122 until the legacy listener has been deliberately handed off.

## Modes

```bash
python3 -I -B ops/public/void_public_earn_legacy_cutover_census_v1.py --self-test
python3 -I -B ops/public/void_public_earn_legacy_cutover_census_v1.py --plan
python3 -I -B ops/public/void_public_earn_legacy_cutover_census_v1.py --run
```

Run this census as the ordinary `zoso` user, not through sudo, so it reads the
correct user-systemd manager.

## Authority boundary

Read-only only. No service start/stop/restart/enable/disable, no tunnel/config
write, no network mutation, no credential-content read, no WC mutation, no
presale activation and no funds movement.
