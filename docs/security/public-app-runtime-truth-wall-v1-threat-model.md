# Public App Runtime Truth Wall v1 threat model

## Protected data

- participant account identifiers
- wallet addresses and balances
- Work Credit balances
- jobs and receipts
- peer IDs and addresses
- mutation and upgrade controls

## Controls

- the browser compatibility script fetches one sanitized endpoint;
- strict readiness remains authoritative and is never overwritten;
- restricted-ready requires synchronized head, expected peer mesh, all public
  telemetry sources, an active declared txroot quarantine, and only the
  `txroot_live!=1` readiness reason;
- account and mutation routes remain blocked by the composition gateway;
- deterministic VM-based browser logic proof verifies rendered labels and the
  exact request list.

## Failure posture

Unknown combinations are classified as `degraded`, not restricted-ready.
Missing sources are classified as `unavailable`. No condition silently becomes
full readiness.
