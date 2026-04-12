#!/usr/bin/env bash
# Canonical participant-facing two-box user journey proof.
# Verifies publish/open/materialize/share flows across Precision <-> Alienware
# from the participant UI perspective, including both-way share/open behavior.
set -euo pipefail
set +H
set +o histexpand

OUT_DIR="${OUT_DIR:-/tmp/two-box-participant-share-open-e2e-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

step() {
  echo
  echo "=== $1 ==="
}

run_step() {
  local name="$1"
  shift
  step "$name"
  "$@" | tee "$OUT_DIR/$name.log"
}

cd "$(dirname "$0")/.."

run_step participant_share_open_flow bash ops/two-box-remote-participant-share-open-flow-proof.sh
run_step participant_open_by_id bash ops/two-box-remote-participant-open-by-id-proof.sh
run_step participant_consume_view bash ops/two-box-remote-participant-consume-view-proof.sh
run_step participant_share_open_both_ways bash ops/two-box-ui-share-open-both-ways-proof.sh

python3 - "$OUT_DIR" <<'PY'
import json, pathlib, sys

out = pathlib.Path(sys.argv[1])

checks = {
    "participant_share_open_flow": "[ok] two-box remote participant share/open flow proof green",
    "participant_open_by_id": "[ok] two-box remote participant open-by-id proof green",
    "participant_consume_view": "[ok] two-box remote participant consume-view proof green",
    "participant_share_open_both_ways": "[ok] two-box UI share/open both ways proof green",
}

summary = {}
all_ok = True

for name, marker in checks.items():
    p = out / f"{name}.log"
    txt = p.read_text(encoding="utf-8", errors="replace") if p.exists() else ""
    ok = marker in txt
    summary[name] = {
        "ok": ok,
        "log": str(p),
    }
    all_ok = all_ok and ok

(summary_path := out / "summary.json").write_text(
    json.dumps({
        "ok": all_ok,
        "summary": summary,
    }, indent=2),
    encoding="utf-8",
)

print(json.dumps({
    "ok": all_ok,
    "summary_path": str(summary_path),
    "summary": summary,
}, indent=2))

if not all_ok:
    raise SystemExit("FAIL: participant share/open e2e proof did not pass cleanly")
PY

echo
echo "[ok] two-box participant share/open e2e proof green"
echo "[info] out_dir=$OUT_DIR"
