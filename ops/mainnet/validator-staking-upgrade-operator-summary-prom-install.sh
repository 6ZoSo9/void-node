#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="${REPO:-$HOME/dev/void-node}"
RUN_AS_USER="${RUN_AS_USER:-$(stat -c '%U' "$REPO")}"
RUN_AS_HOME="${RUN_AS_HOME:-$(getent passwd "$RUN_AS_USER" | cut -d: -f6)}"

SERVICE_NAME="void-validator-operator-summary-export.service"
TIMER_NAME="void-validator-operator-summary-export.timer"
UNIT_DIR="/etc/systemd/system"
PROM_RULES_DIR="${PROM_RULES_DIR:-}"
WRAPPER="/usr/local/bin/void-validator-operator-summary-export.sh"

detect_prom_rules_dir() {
  python3 - <<'PY2'
from pathlib import Path
import re

text = Path('/etc/prometheus/prometheus.yml').read_text(encoding='utf-8', errors='ignore')
m = re.findall(r'^\s*-\s*[\'\"]?(/etc/prometheus/[^\'\"\n*]+)', text, flags=re.M)
prefs = ['/etc/prometheus/rules.d', '/etc/prometheus/alerts.d']
for pref in prefs:
    for x in m:
        if x.startswith(pref):
            print(pref)
            raise SystemExit
print('/etc/prometheus/alerts.d')
PY2
}

if [ -z "$PROM_RULES_DIR" ]; then
  PROM_RULES_DIR="$(detect_prom_rules_dir)"
fi

RULE_FILE="$PROM_RULES_DIR/void-validator-operator-summary-rules.yml"

detect_textfile_dir() {
  local x=""
  x="$(systemctl cat node_exporter.service 2>/dev/null | tr ' ' '\n' | sed -n 's/^--collector\.textfile\.directory=\(.*\)$/\1/p' | tail -n 1 || true)"
  if [ -n "$x" ]; then
    printf '%s\n' "$x"
    return
  fi
  x="$(ps -eo args 2>/dev/null | grep '[n]ode_exporter' | tr ' ' '\n' | sed -n 's/^--collector\.textfile\.directory=\(.*\)$/\1/p' | tail -n 1 || true)"
  if [ -n "$x" ]; then
    printf '%s\n' "$x"
    return
  fi
  printf '%s\n' "/var/lib/node_exporter/textfile_collector"
}

TEXTFILE_DIR="${TEXTFILE_DIR:-$(detect_textfile_dir)}"
OUT_FILE="$TEXTFILE_DIR/void_validator_operator_summary.prom"

echo "=== [install] paths ==="
echo "repo=$REPO"
echo "run_as_user=$RUN_AS_USER"
echo "run_as_home=$RUN_AS_HOME"
echo "textfile_dir=$TEXTFILE_DIR"
echo "out_file=$OUT_FILE"
echo "rule_file=$RULE_FILE"

sudo mkdir -p "$TEXTFILE_DIR" "$PROM_RULES_DIR"

sudo tee "$WRAPPER" >/dev/null <<EOFWRAP
#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$REPO"
RUN_AS_USER="$RUN_AS_USER"
RUN_AS_HOME="$RUN_AS_HOME"
OUT_FILE="$OUT_FILE"

TMP_PARENT="\${TMPDIR:-/tmp}"
TMP_FILE="\$(runuser -u "\$RUN_AS_USER" -- env HOME="\$RUN_AS_HOME" TMPDIR="\$TMP_PARENT" mktemp "\$TMP_PARENT/void-validator-operator-summary.XXXXXX")"

cleanup() {
  rm -f "\$TMP_FILE"
}
trap cleanup EXIT

cd "\$REPO"

runuser -u "\$RUN_AS_USER" -- env HOME="\$RUN_AS_HOME" \
  "\$REPO/ops/mainnet/validator-staking-upgrade-operator-summary.sh"

runuser -u "\$RUN_AS_USER" -- env HOME="\$RUN_AS_HOME" OUT_FILE="\$TMP_FILE" \
  "\$REPO/ops/mainnet/validator-staking-upgrade-operator-summary-exporter.sh"

install -o root -g root -m 0644 "\$TMP_FILE" "\$OUT_FILE"
EOFWRAP
sudo chmod +x "$WRAPPER"

sudo tee "$UNIT_DIR/$SERVICE_NAME" >/dev/null <<EOFSVC
[Unit]
Description=Export VOID validator operator summary metrics
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=$WRAPPER
EOFSVC

sudo tee "$UNIT_DIR/$TIMER_NAME" >/dev/null <<EOFTIMER
[Unit]
Description=Run VOID validator operator summary export every minute

[Timer]
OnBootSec=30s
OnUnitActiveSec=1m
AccuracySec=5s
Unit=$SERVICE_NAME

[Install]
WantedBy=timers.target
EOFTIMER

sudo tee "$RULE_FILE" >/dev/null <<'EOFRULES'
groups:
  - name: void-validator-operator-summary
    rules:
      - record: void_validator_operator:overall_green:last_5m
        expr: max_over_time(void_validator_operator_overall_green[5m])

      - alert: VoidValidatorOperatorOverallNotGreen
        expr: void_validator_operator_overall_green != 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: VOID validator operator summary is not green
          description: overall_green has been non-green for 2 minutes.

      - alert: VoidValidatorOperatorShadowMismatch
        expr: void_validator_operator_shadow_mismatch_count > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: VOID validator shadow mismatch detected
          description: shadow mismatch count is greater than zero.

      - alert: VoidValidatorOperatorCompareCoreMismatch
        expr: void_validator_operator_compare_core_mismatch_count > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: VOID validator compare core mismatch detected
          description: compare core mismatch count is greater than zero.

      - alert: VoidValidatorOperatorValidatorCountBelowExpected
        expr: void_validator_operator_validator_count < void_validator_operator_expected_validator_count
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: VOID validator count below expected
          description: current validator count is below expected validator count.

      - alert: VoidValidatorOperatorLatestEpochBehindTarget
        expr: void_validator_operator_latest_epoch < void_validator_operator_target_epoch
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: VOID validator latest epoch is behind target
          description: latest epoch is behind the operator summary target epoch.
EOFRULES

if command -v promtool >/dev/null 2>&1; then
  echo
  echo "=== [install] promtool check rules ==="
  promtool check rules "$RULE_FILE"
fi

echo
echo "=== [install] systemd reload + start ==="
sudo systemctl daemon-reload
sudo systemctl enable --now "$TIMER_NAME"
sudo systemctl restart "$SERVICE_NAME"
sleep 3

echo
echo "=== [install] collector file truth ==="
sudo ls -l "$OUT_FILE"
sudo sed -n '1,160p' "$OUT_FILE"

echo
echo "=== [install] prometheus reload ==="
if [ -x /usr/local/bin/prom-safe-reload.sh ]; then
  sudo /usr/local/bin/prom-safe-reload.sh
else
  sudo systemctl reload prometheus
fi

echo
echo "[ok] Prometheus/operator-summary install complete"
