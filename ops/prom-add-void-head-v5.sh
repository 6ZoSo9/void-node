#!/usr/bin/env bash
set -euo pipefail

PROM_YML="/etc/prometheus/prometheus.yml"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/prom-add-void-head-v5.$TS.out.txt"
exec > >(tee -a "$OUT") 2>&1
echo "[saved] $OUT"
echo

echo "=== [0] require root ==="
if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "[ERR] run as root: sudo bash $0"
  exit 2
fi

echo
echo "=== [1] backup ==="
tar -C /etc -czf "/root/prometheus-config-OK.$TS.tgz" prometheus
echo "[bak] /root/prometheus-config-OK.$TS.tgz"

echo
echo "=== [2] pre-check: file exists ==="
test -f "$PROM_YML"
echo "[ok] $PROM_YML present"

echo
echo "=== [3] insert job if missing ==="
if rg -n 'job_name:\s*void-head-v5\b' "$PROM_YML" >/dev/null 2>&1; then
  echo "[ok] job already present (skip)"
else
  python3 - <<'PY'
from pathlib import Path
p = Path("/etc/prometheus/prometheus.yml")
s = p.read_text()

needle = "scrape_configs:"
i = s.find(needle)
if i < 0:
    raise SystemExit("[ERR] scrape_configs: not found")

# Insert immediately after the scrape_configs: line (keeps it simple and stable).
line_end = s.find("\n", i)
if line_end < 0:
    raise SystemExit("[ERR] could not locate end of scrape_configs: line")

block = """
  - job_name: void-head-v5
    metrics_path: /metrics/void/head
    scrape_interval: 5s
    scrape_timeout: 4s
    static_configs:
      - targets: ['127.0.0.1:4100']
        labels:
          env: dev
"""

s2 = s[:line_end+1] + block + s[line_end+1:]
p.write_text(s2)
print("[ok] inserted void-head-v5 job")
PY
fi

echo
echo "=== [4] show inserted snippet ==="
rg -n 'job_name:\s*void-head-v5\b' -n "$PROM_YML" -n || true
python3 - <<'PY'
from pathlib import Path
p = Path("/etc/prometheus/prometheus.yml")
lines = p.read_text().splitlines()
for idx, ln in enumerate(lines):
    if "job_name: void-head-v5" in ln:
        a = max(0, idx-2)
        b = min(len(lines), idx+18)
        for j in range(a, b):
            print(f"{j+1:6d} {lines[j]}")
        break
PY

echo
echo "=== [5] promtool check ==="
promtool check config "$PROM_YML"

echo
echo "=== [6] safe reload (guarded) ==="
systemctl reload prometheus

echo
echo "=== [7] verify target shows up ==="
TMP="/tmp/prom_targets.check.408240\.json"\ncurl -fsS "http://127.0.0.1:9090/api/v1/targets?state=active" > ""\npython3 - <<'PY'\nimport json\nfrom pathlib import Path\n\nj=json.loads(Path(""TMP""").read_text())
hits=[]
for t in j.get("data",{}).get("activeTargets",[]):
    if t.get("labels",{}).get("job")=="void-head-v5":
        hits.append((t.get("discoveredLabels",{}).get("__address__"), t.get("health"), t.get("lastError","")))
print("hits=",len(hits))
for h in hits[:10]:
    print(" -",h)
PY

echo
echo "=== [8] curl the endpoint raw (sanity) ==="
curl -fsS http://127.0.0.1:4100/metrics/void/head | sed -n '1,40p'
echo
echo "=== [done] ==="
