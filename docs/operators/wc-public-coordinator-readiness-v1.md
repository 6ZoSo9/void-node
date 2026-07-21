# WC public coordinator readiness v1

<!-- VOID_WC_PUBLIC_COORDINATOR_READINESS_V1 -->

This read-only gate determines whether a public Work Credit coordinator satisfies the exact bounded-enablement contract.

It does **not** enable the coordinator or execute a claim.

## Usage

```bash
node tools/wc-public-coordinator-readiness-v1.mjs \
  --base https://PUBLIC-EARN-GATEWAY
```

Require a ready verdict:

```bash
node tools/wc-public-coordinator-readiness-v1.mjs \
  --base https://PUBLIC-EARN-GATEWAY \
  --require-ready
```

Gateway and pilot status requests use a 15-second per-attempt timeout and retry
transient network errors and HTTP `5xx` responses up to three times by default.
Configure the timeout with `--timeout-ms 250..30000` and bounded retries with
`--status-retries 1..5`. Boundary probes are never retried.

The two authoritative status reads are performed sequentially: gateway status
first, then pilot status. Only after both complete are the four containment
probes run concurrently. This prevents boundary probes from competing with the
upstream-backed pilot status request.

## Read-only routes

The tool uses `GET` only:

- `/__void/public-earn-gateway-v1/status.json`
- `/wc/public-earning-pilot-v1/status?account=...`
- `/wc/public-earning-pilot-v1/claim-ticket`
- `/wc/public-earning-pilot-v1/submit-result`
- `/wc/public-earning-pilot-v1/operator/issue`
- `/wc/public-earning-pilot-v1/sign-claim`

The claim and submit routes must reject `GET` with `405`. The operator issue and loopback sign-claim routes must remain hidden with `404`.

## Required checks

A `ready` verdict requires:

- Gateway and pilot markers present.
- Coordinator enabled and executor role disabled.
- Fixed award exactly `3 WC`.
- Public claim enabled and available.
- Server-selected work only.
- Participant cannot select dataset, input hash, or award.
- Executor key-possession proof required.
- Money movement disabled.
- Per-account, global, active, consumed, and daily caps exposed.
- Account, executor, dataset, and input-hash binding.
- Expiring, single-use capabilities.
- SHA-256-only token storage.
- Ed25519 signatures and replay protection.
- Explicit `public_routes_award_wc=false`.
- Claim and submit routes POST-only.
- Private operator/helper routes hidden.
- No private paths, secrets, tokens, wallet keys, or seed phrases in status.

## Result states

- `ready`: every check passed; `ready_for_bounded_enablement=true`.
- `hold`: status is readable but at least one check failed.
- `unavailable`: public status could not be read or the input URL was invalid.

A readiness result is evidence, not authorization.

## Safety

The tool never:

- Enables a coordinator.
- Sends `POST`.
- Issues or consumes a ticket.
- Submits a result.
- Writes or settles WC.
- Accesses a wallet.
- Touches Buy VOID, validators, or treasury state.
- Restarts a service.
- Mutates runtime or repository data.

## Proof

```bash
node scripts/prove_wc_public_coordinator_readiness_v1.mjs
```

Expected:

```text
VOID_WC_PUBLIC_COORDINATOR_READINESS_V1_PROOF_GREEN
```
