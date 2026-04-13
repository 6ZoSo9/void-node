#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="${BASE:-$REPO/ops/mainnet/void-mainnet.live.json}"
OVERRIDE="${OVERRIDE:-$REPO/ops/mainnet/void-mainnet.local-overrides.json}"
OUT="${1:-$REPO/ops/mainnet/void-mainnet.live.local.json}"

[[ -f "$BASE" ]] || { echo "[ERR] base live json missing: $BASE"; exit 1; }
[[ -f "$OVERRIDE" ]] || { echo "[ERR] local override missing: $OVERRIDE"; exit 1; }

python3 - "$BASE" "$OVERRIDE" "$OUT" <<'PY'
import json, sys
from pathlib import Path

base_p, ov_p, out_p = map(Path, sys.argv[1:4])
base = json.loads(base_p.read_text())
ov = json.loads(ov_p.read_text())

def deep_merge(a, b):
    if isinstance(a, dict) and isinstance(b, dict):
        out = dict(a)
        for k, v in b.items():
            out[k] = deep_merge(out[k], v) if k in out else v
        return out
    if isinstance(a, list) and isinstance(b, list):
        # For premine_vaults, overlay by id when possible; otherwise override whole list
        if all(isinstance(x, dict) and "id" in x for x in a) and all(isinstance(x, dict) and "id" in x for x in b):
            by_id = {x["id"]: dict(x) for x in a}
            for x in b:
                cur = by_id.get(x["id"], {})
                by_id[x["id"]] = deep_merge(cur, x)
            ordered_ids = [x["id"] for x in a] + [x["id"] for x in b if x["id"] not in {y["id"] for y in a}]
            return [by_id[i] for i in ordered_ids]
        return b
    return b

merged = deep_merge(base, ov)
merged.setdefault("metadata", {})
merged["metadata"]["materialized_from"] = {
    "base": str(base_p),
    "override": str(ov_p),
    "committed_stub": True,
    "local_overlay_applied": True
}

out_p.write_text(json.dumps(merged, indent=2) + "\n")
print(out_p)
PY

echo "[ok] wrote $OUT"
