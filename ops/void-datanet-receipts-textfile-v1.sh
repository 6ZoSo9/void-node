#!/usr/bin/env bash
set -euo pipefail

R="${R:-$HOME/dev/void-node/receipts.jsonl}"
OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_datanet_receipts.prom}"
TMP="$(mktemp)"

# Only inspect a tail window to keep it cheap.
TAIL_N="${TAIL_N:-5000}"

# Parse and count.
# Metrics:
# - void_datanet_receipts_total{op,ok,status}
# - void_datanet_receipts_bytes_total{op,ok}
# - void_datanet_receipts_ms_sum{op,ok} + _count for avg
awk -v n="$TAIL_N" '
  BEGIN{ }
  { buf[NR % n] = $0 }
  END{
    for(i=1;i<=n;i++){
      line = buf[i]
      if(line=="") continue
      # very light JSON-ish extraction; tolerate missing keys
      op=""; ok=""; status=""; bytes="0"; ms="0"
      if(match(line,/"op":"[^"]+"/)){ op=substr(line,RSTART+6,RLENGTH-7) }
      if(match(line,/"ok":[0-9]+/)){ ok=substr(line,RSTART+5,RLENGTH-5) }
      if(match(line,/"status":[0-9]+/)){ status=substr(line,RSTART+9,RLENGTH-9) }
      if(match(line,/"bytes":[0-9]+/)){ bytes=substr(line,RSTART+8,RLENGTH-8) }
      if(match(line,/"ms":[0-9]+/)){ ms=substr(line,RSTART+5,RLENGTH-5) }

      if(op ~ /^datanet_mvp_(publish|fetch)$/){
        key=op "|" ok "|" status
        c[key]++
        b[op "|" ok]+=bytes+0
        ms_sum[op "|" ok]+=ms+0
        ms_cnt[op "|" ok]++
      }
    }
    # emit prom
    print "# HELP void_datanet_receipts_total Count of DataNet publish/fetch receipts in tail window"
    print "# TYPE void_datanet_receipts_total counter"
    for(k in c){
      split(k,a,"|")
      printf "void_datanet_receipts_total{op=\"%s\",ok=\"%s\",status=\"%s\"} %d\n", a[1], a[2], a[3], c[k]
    }

    print "# HELP void_datanet_receipts_bytes_total Sum of bytes field for DataNet publish/fetch receipts in tail window"
    print "# TYPE void_datanet_receipts_bytes_total counter"
    for(k in b){
      split(k,a,"|")
      printf "void_datanet_receipts_bytes_total{op=\"%s\",ok=\"%s\"} %.0f\n", a[1], a[2], b[k]
    }

    print "# HELP void_datanet_receipts_ms_sum Sum of ms for DataNet publish/fetch receipts in tail window"
    print "# TYPE void_datanet_receipts_ms_sum counter"
    for(k in ms_sum){
      split(k,a,"|")
      printf "void_datanet_receipts_ms_sum{op=\"%s\",ok=\"%s\"} %.0f\n", a[1], a[2], ms_sum[k]
    }

    print "# HELP void_datanet_receipts_ms_count Count of ms samples for DataNet publish/fetch receipts in tail window"
    print "# TYPE void_datanet_receipts_ms_count counter"
    for(k in ms_cnt){
      split(k,a,"|")
      printf "void_datanet_receipts_ms_count{op=\"%s\",ok=\"%s\"} %d\n", a[1], a[2], ms_cnt[k]
    }
  }
' < <(tail -n "$TAIL_N" "$R" 2>/dev/null || true) > "$TMP"

# atomic write
install -m 0644 "$TMP" "$OUT"
rm -f "$TMP"
