#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

JSON_IN="${JSON_IN:-/tmp/void-two-box-proof-suite/result.json}"
OUT_FILE="${OUT_FILE:-/tmp/void-two-box-peer-proof-suite.prom}"

python3 - "$JSON_IN" "$OUT_FILE" <<'PY'
import json, sys, pathlib

json_in = pathlib.Path(sys.argv[1])
out_file = pathlib.Path(sys.argv[2])

payload = {}
if json_in.exists():
    try:
        payload = json.loads(json_in.read_text())
    except Exception:
        payload = {}

def as_bool(v):
    s = str(v).strip().lower()
    return 1 if s in ("1", "true", "yes", "ok") else 0

def as_int(v, default=0):
    try:
        return int(str(v).strip())
    except Exception:
        return default

dataset_id = str(payload.get("dataset_id", ""))
local_base = str(payload.get("local_base", ""))
remote_base = str(payload.get("remote_base", ""))
ok = as_bool(payload.get("ok", "false"))
quick_mode = as_bool(payload.get("quick_mode", "0"))
elapsed_ms = as_int(payload.get("elapsed_ms", 0))

def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

lines = []
lines.append("# HELP void_two_box_peer_suite_ok Last two-box peer suite result (1=ok).")
lines.append("# TYPE void_two_box_peer_suite_ok gauge")
lines.append(f'void_two_box_peer_suite_ok{{dataset_id="{esc(dataset_id)}",local_base="{esc(local_base)}",remote_base="{esc(remote_base)}"}} {ok}')

lines.append("# HELP void_two_box_peer_suite_quick_mode Last two-box peer suite quick-mode flag (1=quick).")
lines.append("# TYPE void_two_box_peer_suite_quick_mode gauge")
lines.append(f'void_two_box_peer_suite_quick_mode{{dataset_id="{esc(dataset_id)}"}} {quick_mode}')

lines.append("# HELP void_two_box_peer_suite_elapsed_ms Last two-box peer suite elapsed time in milliseconds.")
lines.append("# TYPE void_two_box_peer_suite_elapsed_ms gauge")
lines.append(f'void_two_box_peer_suite_elapsed_ms{{dataset_id="{esc(dataset_id)}"}} {elapsed_ms}')

out_file.parent.mkdir(parents=True, exist_ok=True)
out_file.write_text("\n".join(lines) + "\n")
print(out_file)
PY
