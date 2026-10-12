# WC public opportunity discovery v1

<!-- VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1 -->

WC public opportunity discovery lets a participant determine whether a bounded Work Credit earning opportunity is currently available without installing or running a VOID node.

The command is read-only. It does not issue a ticket, execute work, submit a receipt, write a ledger entry, settle WC, access a wallet, or award WC.

## What it checks

The tool uses HTTP `GET` only.

It checks:

- The public-node discovery document.
- Public earning gateway/status routes advertised by that document.
- Pilot marker `VOID_WC_PUBLIC_EARNING_PILOT_V1`.
- Whether the coordinator role is enabled.
- Whether the current fixed award matches the expected policy.
- Whether a public ticket-claim path is configured and not explicitly disabled.
- Whether public routes explicitly report that they cannot award WC directly.

A missing public-award assertion is not treated as safe. Discovery remains on `hold`
with `public_award_boundary_unconfirmed` until the status response explicitly
reports `public_routes_award_wc: false` or
`public_route_can_award_wc: false`.

The current expected fixed award is `3 WC`.

The canonical merged read-only status routes are:

- `/__void/public-earn-gateway-v1/status.json`
- `/wc/public-earning-pilot-v1/status`

The first route reports the sanitized public gateway boundary. The second reports the sanitized pilot and public-claim status.

## Usage

```bash
node tools/wc-public-opportunity-discovery-v1.mjs \
  --base https://your-public-node.example
```

Require an immediately claimable opportunity:

```bash
node tools/wc-public-opportunity-discovery-v1.mjs \
  --base https://your-public-node.example \
  --require-available
```

Provide a known read-only status path when discovery does not advertise it:

```bash
node tools/wc-public-opportunity-discovery-v1.mjs \
  --base https://your-public-node.example \
  --path /public/earn/status-v1
```

## Result states

### `available`

The compatible pilot marker is present, the coordinator is enabled, the fixed award is exactly the expected value, a public claim path is configured, and the public route does not claim direct WC-award authority.

Discovery exits `0`.

### `hold`

A compatible gateway was found, but at least one availability requirement is not met.

Examples:

- Coordinator disabled.
- Public claim disabled.
- Fixed award missing or different.
- Pilot status missing.
- Unsafe public-award boundary reported.

Discovery exits `0` by default so scripts can inspect the result. With `--require-available`, it exits `2`.

### `unavailable`

No compatible public earning gateway could be discovered, the base URL is invalid, or the public status surface could not be read.

Discovery exits `2`.

## Participant next step

Discovery does not claim a ticket.

When the result is `available`, continue with the existing participant claim workflow:

- Script: `ops/mainnet0/wc-public-ticket-claim-v1.sh`
- Guide: `docs/public/wc-public-ticket-claim-v1.md`

The claim flow remains capability-bound and separate from WC award acceptance. A public claim route may issue a bounded ticket; it must not directly award WC.

## Safety boundary

The discovery tool:

- Uses `GET` only.
- Ignores discovered private or mutating paths.
- Does not request the advertised claim endpoint.
- Does not contact off-origin URLs from discovery data.
- Does not print response bodies.
- Does not access keys, wallets, services, or local node data.
- Does not mutate chain, DataNet, Work Credit, Buy VOID, validator, or treasury state.

## Focused proof

```bash
node scripts/prove_wc_public_opportunity_discovery_v1.mjs
```

Expected marker:

```text
VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1_PROOF_GREEN
```
