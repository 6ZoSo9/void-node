# Buy VOID candidate-watch operator webhook delivery V1

This lane delivers append-once candidate notification receipts to an operator-controlled HTTPS webhook. It is transport-only. It does not arm a candidate, apply an orchestrator stage, reserve inventory, access a wallet, sign, broadcast, mutate the network, or move money.

## Safety contract

- Dry-run is the CLI default.
- Applied delivery requires the exact confirmation `sendBuyVoidCandidateOperatorNotification`.
- The operator-local config must be enabled and bind an exact HTTPS hostname allowlist.
- URL userinfo, fragments, localhost names, and IP-literal endpoints are rejected.
- Redirects are not followed.
- At most one previously unattempted notification is selected per run.
- Every applied attempt receives an append-once local delivery receipt.
- Every outcome is terminal for automatic processing, including `possible_delivery`.
- There is no automatic retry. A separate reviewed retry lane would be required.

## Operator-local paths

Default config:

`~/.config/void/buy-void-candidate-operator-webhook-delivery-v1.json`

Default state:

`~/.local/state/void-buy-void-candidate-operator-webhook-delivery-v1/`

Default source notifications:

`~/.local/state/void-buy-void-observe-and-claim-candidate-watch-notification-bridge-v1/notifications/`

The bearer token, when used, is read from a separate regular non-symlink file with no group or other permissions. The token and endpoint URL are never written to delivery receipts or stdout.

## Example units

The example service is `Type=oneshot` and uses applied mode with the exact confirmation. A path unit triggers it when the bridge notification directory changes. A ten-minute timer provides a bounded pending-delivery and health heartbeat. The source lane does not install, configure, or enable these units.

## Delivery outcomes

- `delivered`: the endpoint returned HTTP 2xx.
- `http_rejected`: the endpoint returned a known non-2xx response.
- `possible_delivery`: request bytes were submitted but the final response was ambiguous.
- `transport_failed`: the request failed before bytes were confirmed submitted.

All four outcomes suppress automatic retry for the same notification. The operator reviews the append-once receipt before any separate manual retry workflow.
