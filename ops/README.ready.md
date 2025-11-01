# VOID Ready: Smoke, Self-Heal, and Alerting

- `scripts/smoke_ready.sh` — local readiness probe (head delta, txroot setter freshness, triad).
- `scripts/void-heal-ready.sh` — self-heal (idempotent nudge) used by systemd timer.
- `ops/prometheus/rules/void-ready-alert.yml` — reference alert rule:
  - Fires if `void_ready == 0` or head doesn't advance for 2m.
- `ops/systemd/*.service|*.timer` — example units; copy into `~/.config/systemd/user/`.

**Deployed locations (not committed):**
- Service/timer: `~/.config/systemd/user/`
- Live Prom rule: `/etc/prometheus/rules/void-ready-alert.yml` (systemd service `prometheus`)

**Runbook (deploy/update locally):**
- `systemctl --user daemon-reload && systemctl --user enable --now void-ready-heal.timer`
- `curl -fsS -X POST http://127.0.0.1:9090/-/reload`  # reload Prometheus rules
