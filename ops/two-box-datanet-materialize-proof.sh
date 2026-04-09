#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
LIMIT="${LIMIT:-3}"
WHO="${WHO:-zoso}"
OUT="${OUT:-/tmp/two-box-datanet-materialize-proof-$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "=== [1] local + remote truth ==="
git branch --show-current | tee "$OUT/local.branch.txt"
git rev-parse --short HEAD | tee "$OUT/local.head.txt"
git describe --tags --abbrev=0 2>/dev/null | tee "$OUT/local.tag.txt" || true
ssh "$ALIEN" '
set -euo pipefail
cd "$HOME/dev/void-node"
echo "--- remote branch ---"
git branch --show-current
echo "--- remote head ---"
git rev-parse --short HEAD
echo "--- remote latest tag ---"
git describe --tags --abbrev=0 2>/dev/null || true
' | tee "$OUT/remote.truth.txt"

echo
echo "=== [2] provenance diff before ==="
LOCAL_BASE="${LOCAL_BASE:-${PUBLIC_HTTP_BASE:-http://127.0.0.1:4100}}" REMOTE_BASE="${REMOTE_BASE:-http://100.122.79.39:4100}" bash ops/two-box-datanet-provenance-diff.sh | tee "$OUT/provenance-diff-before.txt"

python3 - "$OUT/provenance-diff-before.txt" <<'PY' > "$OUT/before.json"
from pathlib import Path
import json, sys

lines = [x.rstrip("\n") for x in Path(sys.argv[1]).read_text().splitlines() if x.strip()]
start = None
for i, line in enumerate(lines):
    if line.strip() == "=== [5] diff summary ===":
        start = i + 1
        break
if start is None:
    raise SystemExit("before diff summary marker not found")

buf = []
depth = 0
started = False
for line in lines[start:]:
    if "{" in line and not started:
        started = True
    if started:
        buf.append(line)
        depth += line.count("{")
        depth -= line.count("}")
        if depth == 0:
            break

obj = json.loads("\n".join(buf))
print(json.dumps(obj))
PY

BEFORE_REMOTE_ONLY="$(python3 - "$OUT/before.json" <<'PY'
from pathlib import Path
import json, sys
obj = json.loads(Path(sys.argv[1]).read_text())
print(int(obj["remote_only_jobs_count"]))
PY
)"

echo
echo "=== [3] bounded materialize apply ==="
LOCAL_BASE="${LOCAL_BASE:-${PUBLIC_HTTP_BASE:-http://127.0.0.1:4100}}" REMOTE_BASE="${REMOTE_BASE:-http://100.122.79.39:4100}" APPLY=1 LIMIT="$LIMIT" WHO="$WHO" bash ops/two-box-datanet-materialize-from-peer.sh | tee "$OUT/materialize.txt"

python3 - "$OUT/materialize.txt" <<'PY' > "$OUT/materialize-summary.json"
from pathlib import Path
import json, sys

lines = [x.rstrip("\n") for x in Path(sys.argv[1]).read_text().splitlines() if x.strip()]

targets = []
capture_targets = False
for line in lines:
    if line.strip() == "=== [4] selected targets ===":
        capture_targets = True
        continue
    if capture_targets:
        if line.startswith("==="):
            break
        if line.startswith("ds_"):
            targets.append(line.strip())

before = after = None
start = None
for i, line in enumerate(lines):
    if line.strip() == "=== [6] provenance after materialization ===":
        start = i + 1
        break
if start is None:
    raise SystemExit("materialize after-summary marker not found")

buf = []
depth = 0
started = False
for line in lines[start:]:
    if "{" in line and not started:
        started = True
    if started:
        buf.append(line)
        depth += line.count("{")
        depth -= line.count("}")
        if depth == 0:
            break

obj = json.loads("\n".join(buf))
print(json.dumps({
    "targets": targets,
    "target_count": len(targets),
    "before": obj["before"],
    "after": obj["after"]
}))
PY

TARGET_COUNT="$(python3 - "$OUT/materialize-summary.json" <<'PY'
from pathlib import Path
import json, sys
obj = json.loads(Path(sys.argv[1]).read_text())
print(int(obj["target_count"]))
PY
)"

echo
echo "=== [4] provenance diff after ==="
LOCAL_BASE="${LOCAL_BASE:-${PUBLIC_HTTP_BASE:-http://127.0.0.1:4100}}" REMOTE_BASE="${REMOTE_BASE:-http://100.122.79.39:4100}" bash ops/two-box-datanet-provenance-diff.sh | tee "$OUT/provenance-diff-after.txt"

python3 - "$OUT/provenance-diff-after.txt" <<'PY' > "$OUT/after.json"
from pathlib import Path
import json, sys

lines = [x.rstrip("\n") for x in Path(sys.argv[1]).read_text().splitlines() if x.strip()]
start = None
for i, line in enumerate(lines):
    if line.strip() == "=== [5] diff summary ===":
        start = i + 1
        break
if start is None:
    raise SystemExit("after diff summary marker not found")

buf = []
depth = 0
started = False
for line in lines[start:]:
    if "{" in line and not started:
        started = True
    if started:
        buf.append(line)
        depth += line.count("{")
        depth -= line.count("}")
        if depth == 0:
            break

obj = json.loads("\n".join(buf))
print(json.dumps(obj))
PY

AFTER_REMOTE_ONLY="$(python3 - "$OUT/after.json" <<'PY'
from pathlib import Path
import json, sys
obj = json.loads(Path(sys.argv[1]).read_text())
print(int(obj["remote_only_jobs_count"]))
PY
)"

echo
echo "=== [5] assert count drop ==="
python3 - "$OUT/materialize-summary.json" "$BEFORE_REMOTE_ONLY" "$AFTER_REMOTE_ONLY" <<'PY' | tee "$OUT/assert.json"
from pathlib import Path
import json, sys

mat = json.loads(Path(sys.argv[1]).read_text())
before_remote_only = int(sys.argv[2])
after_remote_only = int(sys.argv[3])
target_count = int(mat["target_count"])

expected_after = before_remote_only - target_count
ok = (after_remote_only == expected_after)

summary = {
    "ok": ok,
    "before_remote_only_jobs_count": before_remote_only,
    "after_remote_only_jobs_count": after_remote_only,
    "target_count": target_count,
    "expected_after_remote_only_jobs_count": expected_after,
    "materialize_before": mat["before"],
    "materialize_after": mat["after"],
    "targets": mat["targets"],
}
print(json.dumps(summary, indent=2))
if not ok:
    raise SystemExit("remote_only count did not drop by target_count")
PY

echo
echo "=== [6] done ==="
echo "[ok] proof bundle: $OUT"
