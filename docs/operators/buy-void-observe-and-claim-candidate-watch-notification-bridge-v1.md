# Buy VOID observe-and-claim candidate-watch notification bridge V1

This lane turns operator-local candidate-watch alerts into append-once operator notification receipts and a bounded machine-readable health receipt.

It does not arm, apply, reserve, sign, broadcast, mutate the network, or move money. A notification tells the operator that an exact-one candidate exists and preserves the exact request ID, plan fingerprint, readiness hash, and required confirmations for a separate reviewed arming lane.

## Outputs

- `current-state.json`: duplicate-suppression state for alert fingerprints.
- `notifications/<notification-id>.json`: immutable append-once notification receipts.
- `health.json`: latest bridge and candidate-watch systemd health receipt.
- stdout: a `VOID_OPERATOR_NOTIFICATION` line captured by journald when a new alert is surfaced.

## Health rules

The candidate-watch timer must be loaded, enabled, and active. `waiting` is healthy only with a finite next-elapse. `running` is accepted as a transient healthy state while the one-shot candidate-watch service is executing. `elapsed`, disabled, failed, missing, or infinite-next-elapse states are degraded.

## Example units

The example service is `Type=oneshot`. A path unit triggers it when the candidate-watch output changes. A five-minute timer provides a periodic health heartbeat. These units remain examples and are not installed or enabled by this source lane. Installation belongs to a separate explicit installation lane.

## Authority boundary

The bridge writes only operator-local notification state and health receipts. It has no runtime import, apply, activation, reservation, credential, wallet, signing, broadcast, RPC mutation, or money authority.
