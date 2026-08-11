# VOID multipath public bootstrap supervisor v1

Status: source-only launcher composition. This lane does not activate a public seed, install or start Tor, publish a signed manifest, bind production release keys, provision infrastructure, change DNS/router/firewall state, deploy, restart an operator node, or exercise wallet/signer/validator/Work Credit/money authority.

## Purpose

Issue #1005 requires the ordinary fresh-node path to discover independently usable bootstrap transports and fail over instead of treating one unavailable transport as network failure.

The repository already contains reviewed HTTPS and Tor synchronization transports, but `run-void-node.sh` previously selected only the HTTPS v1 path. This lane composes the existing transports without replacing either trust contract.

```text
./run-void-node.sh
  -> HTTPS manifest trust verification
  -> HTTPS live seed probe
  -> optional Tor release-root + signed-manifest verification
  -> Tor live seed probe through local SOCKS
  -> one local adapter per healthy transport class
  -> existing follower receives one or two numeric-loopback origins
  -> bounded follower failover remains the scheduler
```

## Trust versus availability

Multipath failover must not turn a second transport into a way to ignore invalid trust material.

HTTPS therefore gains a verification-only mode with classified exit status:

- `0`: trust material is valid (stable or allowed hold);
- `2`: trust/material is invalid and the launcher must fail closed;
- `3`: the HTTPS transport is unavailable.

The launcher verifies the HTTPS manifest before live seed probing. If live resolution later reports transport unavailability, it re-verifies the same manifest identity and endpoint set before allowing fallthrough. Invalid, changed, expired, redirected, wrong-media, oversized, private-address, or otherwise nonconforming published material is never converted into an availability result.

Tor uses the already-merged release-root resolver. A signed Tor manifest is considered only when either:

- `VOID_TOR_BOOTSTRAP_SIGNED_MANIFEST_FILE` names the signed envelope; or
- the canonical source/release path `public/bootstrap/tor-signed-v1.json` exists.

The signed envelope is verified against the embedded/configured release root before any live Tor probe. If live Tor resolution fails, the same signed material and exact manifest ID are re-verified before the launcher may classify Tor as unavailable.

The committed Tor release root remains inert until separately authorized production public-key binding and signed-manifest publication occur. This lane does not weaken that hold boundary.

## Runtime composition

When only HTTPS is healthy, the existing HTTPS supervisor remains the runtime path.

When only Tor is healthy, the existing Tor supervisor remains the runtime path.

When both are healthy, `scripts/run_void_multipath_public_bootstrap_supervisor_v1.mjs` creates one HTTPS adapter and one Tor adapter. Both bind only numeric loopback HTTP. The node receives their local origins through `VOID_FOLLOWER_AUTOSTART_PEERS` and never receives remote HTTPS/onion addresses as direct follower origins.

The existing follower already rotates across configured origins after failure with bounded backoff. The multipath supervisor deliberately reuses that behavior instead of introducing another network scheduler.

## Acceptance-only strict mode

Set:

```bash
VOID_PUBLIC_BOOTSTRAP_REQUIRE=1 \
VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH=1 \
./run-void-node.sh
```

for the #1005 acceptance run.

`VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH=1` requires both HTTPS and Tor transport classes to be verified and live before the node process starts. It proves transport-class eligibility only. It does **not** by itself prove independent infrastructure/failure domains; the final external acceptance receipt must still bind the actual topology and N-1 removal evidence.

Normal users do not need this strict acceptance flag. If one verified transport class is healthy and the other is merely unavailable, normal startup may use the healthy class. If published trust material is invalid, startup fails closed even when another transport is healthy.

## Compatibility boundary

The checked-in HTTPS hold manifest remains supported. An explicit HTTP 404 at the default canonical manifest location may still fall back only to the checked-in verified hold artifact.

This lane intentionally does not wire bootstrap-record v2 into the launcher yet. The record-v2 release-root/locator contracts remain the next distribution-trust migration after live signed record material and locator transport exist. Mixing that migration into the HTTPS/Tor runtime composition would create two independent trust migrations in one change.

No `BOOTSTRAP_ADDRS` value is generated or required by this lane.

## Proof

Run:

```bash
bash -n run-void-node.sh
node --check scripts/resolve_void_public_bootstrap_v1.mjs
node --check scripts/lib/void_multipath_public_bootstrap_supervisor_v1.mjs
node --check scripts/run_void_multipath_public_bootstrap_supervisor_v1.mjs
node scripts/prove_void_multipath_public_bootstrap_supervisor_v1.mjs
```

Expected marker:

```text
VOID_MULTIPATH_PUBLIC_BOOTSTRAP_SUPERVISOR_V1_PROOF_GREEN
```

The focused proof checks dual/single transport planning, acceptance-mode rejection of one-class startup, numeric-loopback adapter composition, duplicate/remote adapter rejection, launcher trust re-verification hooks, resolver trust-versus-availability classification, and the no-manual-bootstrap/authority boundaries.

## Remaining operational gates

This source lane does not satisfy #1005 by itself. Remaining real gates include:

1. activate and qualify at least one real HTTPS introduction path;
2. activate and qualify a real Tor v3 seed and publish a release-root-authorized signed Tor manifest;
3. ensure the resulting topology has independent failure domains rather than merely two transports on one host;
4. run a fresh outside-operator-network Linux node through the ordinary launcher;
5. prove nonzero head, `gap=0`, `txroot_live=1`, learned verified peers, and continued connectivity after first-contact removal;
6. repeat with a fresh second node while a different bootstrap component is unavailable; and
7. bind the sanitized environment/observation/final-acceptance receipts already merged for #1005.

## Authority boundary

This lane grants no private route, wallet, signer, validator, treasury, Work Credit, transaction, broadcast, deployment, service, credential, or money-moving authority.
