#!/usr/bin/env bash
set -euo pipefail

# Exports DataNet receipts JSONL -> node_exporter textfile metrics (atomic write).
# Intended to run as root (systemd oneshot).

REPO="${REPO:-/home/zoso/dev/void-node}"
DATA_DIR="${DATA_DIR:-$REPO/data_a}"
RECEIPTS_FILE="${RECEIPTS_FILE:-$DATA_DIR/datanet/receipts/datanet.jsonl}"

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
PROM_OUT_NAME="${PROM_OUT_NAME:-void_datanet_receipts.prom}"

STATE_DIR="${STATE_DIR:-/var/lib/void-node}"
PARSE_ERR_FILE="$STATE_DIR/datanet_receipts_parse_errors_total.txt"

mkdir -p "$STATE_DIR" "$TEXTFILE_DIR"

# python3 is baseline on Ubuntu; keep it simple and robust.
py='import json,sys,os,time
p=sys.argv[1]
total=0
last=0
last_ok=0
wc_total=0
errs=0
if os.path.exists(p):
  with open(p,"r",encoding="utf-8",errors="replace") as f:
    for line in f:
      line=line.strip()
      if not line: continue
      total += 1
      try:
        j=json.loads(line)
        t=int(j.get("ts_ms") or 0)
        ok=int(j.get("ok") or 0)
        wc=int(j.get("wc_award") or 0)
        if t>last: last=t
        if ok==1 and t>last_ok: last_ok=t
        if wc>0: wc_total += wc
      except Exception:
        errs += 1
now=int(time.time())
print(total, int(last/1000), int(last_ok/1000), wc_total, errs, now)'
read -r total last_ts last_ok_ts wc_awarded errs now_epoch < <(python3 -c "$py" "$RECEIPTS_FILE")

# persist parse errors monotonic-ish (best effort)
cur="0"
if [[ -f "$PARSE_ERR_FILE" ]]; then cur="$(cat "$PARSE_ERR_FILE" 2>/dev/null || echo 0)"; fi
[[ "$cur" =~ ^[0-9]+$ ]] || cur="0"
new="$cur"
if [[ "$errs" -gt 0 ]]; then new=$((cur+errs)); fi
echo "$new" > "$PARSE_ERR_FILE"

tmp="$(mktemp)"
cat > "$tmp" <<EOF
# HELP void_datanet_receipts_total Total DataNet receipts observed (count of lines)
# TYPE void_datanet_receipts_total gauge
void_datanet_receipts_total $total

# HELP void_datanet_receipts_last_ts_seconds Last receipt timestamp (epoch seconds; 0 if none)
# TYPE void_datanet_receipts_last_ts_seconds gauge
void_datanet_receipts_last_ts_seconds $last_ts

# HELP void_datanet_receipts_last_ok_ts_seconds Last OK receipt timestamp (epoch seconds; 0 if none)
# TYPE void_datanet_receipts_last_ok_ts_seconds gauge
void_datanet_receipts_last_ok_ts_seconds $last_ok_ts

# HELP void_datanet_receipts_wc_awarded_total Sum of wc_award values in receipts (best-effort, non-authoritative)
# TYPE void_datanet_receipts_wc_awarded_total gauge
void_datanet_receipts_wc_awarded_total $wc_awarded

# HELP void_datanet_receipts_parse_errors_total Total parse errors (monotonic-ish)
# TYPE void_datanet_receipts_parse_errors_total counter
void_datanet_receipts_parse_errors_total $(cat "$PARSE_ERR_FILE" 2>/dev/null || echo 0)

# HELP void_datanet_receipts_export_last_run_ts_seconds Exporter last run timestamp
# TYPE void_datanet_receipts_export_last_run_ts_seconds gauge
void_datanet_receipts_export_last_run_ts_seconds $now_epoch
EOF

mv "$tmp" "$TEXTFILE_DIR/$PROM_OUT_NAME"
chmod 0644 "$TEXTFILE_DIR/$PROM_OUT_NAME"
echo "[ok] exported receipts metrics -> $TEXTFILE_DIR/$PROM_OUT_NAME"
