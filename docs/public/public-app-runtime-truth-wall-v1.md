# Public runtime status

VOID's public node distinguishes strict readiness from a synchronized safety
quarantine.

A public status of `restricted_ready` means:

- the reported chain head is synchronized;
- the expected public peer mesh is connected;
- sanitized telemetry sources are responding;
- txroot persistence is intentionally quarantined;
- strict `ready` remains false.

This status is not a claim of full validator or transaction-root readiness.
It communicates that the public node and read-only app are available while a
specific safety restriction remains active.

Participant Wallet, Work Credit balances, job history, receipt history, and
mutation controls remain private.
