# VOID ops quickstart
- Install timer: `make prom-timer-install`
- Take snapshot now: `make prom-snap`
- Prune old snapshots: `make prom-prune` (keeps last 12)
- Verify & reload Prom: `make prom-verify`
Snapshots land in `ops/prom-snap/<timestamp>` with targets, rules, and key query JSONs.
