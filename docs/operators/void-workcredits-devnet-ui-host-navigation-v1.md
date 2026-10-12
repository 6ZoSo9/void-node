# Work Credits devnet UI host navigation v1

Marker: `VOID_WORKCREDITS_DEVNET_UI_HOST_NAVIGATION_V1`

## Problem

The Work Credits devnet helper still rendered three navigation links with the retired
Alienware Tailscale address `100.122.79.39`:

- Participant;
- DataNet; and
- Back to Wallet.

That made the UI route operators to a permanently retired host even though the rest of
the helper already derives local helper/node URLs from the browser hostname.

## Contract

The helper now derives the node base in the browser as:

```text
<current page protocol>//<current page hostname>:4100
```

The navigation routes are then:

```text
/participant
/datanet-demo
/participant#wallet
```

The Work Credits helper routes continue to use the same browser hostname on port
`4312`.

This preserves the existing direct-host devnet topology without pinning any machine IP
or introducing a new host-discovery mechanism.

## Boundary

This is source-only UI navigation repair. It does not:

- start or restart a service;
- alter Work Credit balances or issuance;
- submit a transaction;
- access a wallet, key, or signer;
- change validator state;
- change public bootstrap authority; or
- move funds.

The focused proof requires the retired Alienware IP to be absent from
`ops/void-workcredits-devnet-http.cjs` and pins the exact host-derived navigation
contract.
