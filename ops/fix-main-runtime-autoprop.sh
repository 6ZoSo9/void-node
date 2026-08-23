#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

UNIT="${UNIT:-void-node.service}"
D="${D:-$HOME/.config/systemd/user/void-node.service.d}"
TS="$(date +%Y%m%d-%H%M%S)"
BK="/tmp/void-node.service.d.cleanup.${TS}"
CANON="$D/~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~CANONICAL-RUNTIME-AUTOPROP-LAST.conf"
BASE="${BASE:-http://127.0.0.1:4100}"

mkdir -p "$BK" "$D"
cp -a "$D"/. "$BK"/ 2>/dev/null || true

export D BK CANON TS

python3 - <<'PY'
from pathlib import Path
import os

d = Path(os.environ["D"])
canon = Path(os.environ["CANON"])
ts = os.environ["TS"]

disable = [
    "99-mainnet0-readiness-proposer-off.conf",
    "zzzzzzzzzzzzzzzzzzzz-PROPOSER-AUTO-REAL-LAST.conf",
    "zzzzzzzzzzzzzzzzzzzz-TAILSCALE-P2P-LAST.conf",
    "zzzzzzzzzzzzzzzzzzzzzzzz-QUARANTINE-HOT-RUNTIME-LAST.conf",
    "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz-PROPOSER-AUTO-NO-AUTOPROP-LAST.conf",
    "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz-TAILSCALE-FINAL-LAST.conf",
    "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz-UNQUARANTINE-V2FS-LAST.conf",
    "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz-HTTP-BIND-FINAL-LAST.conf",
    "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz-LASTSEAL-REAL-LAST.conf",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~PROPOSER-AUTO-CLEAN-LAST.conf",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~PROPOSER-AUTO-ENABLE-LAST.conf",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~zzzz-MAINNET0-FOLLOWER-WORKER-LAST.conf",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz-EMPTY-BLOCKS-ABSOLUTE-LAST.conf",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~TAILSCALE-REAL-LAST.conf",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~zzzzzzzzzzzz-HTTP-BIND-REAL-LAST.conf",
    "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~AUTOPROP-REAL-FINAL-LAST.conf",
]

for name in disable:
    p = d / name
    if p.exists() and not p.name.endswith(f".DISABLED.{ts}"):
        p.rename(d / f"{name}.DISABLED.{ts}")

canon.write_text("""[Service]
Environment=HTTP_HOST=0.0.0.0
Environment=VOID_HTTP_HOST=0.0.0.0
Environment=HOST=0.0.0.0
Environment=P2P_HOST=0.0.0.0
Environment=P2P_BIND_HOST=0.0.0.0
Environment=VOID_P2P_BIND_HOST=0.0.0.0
Environment=P2P_ADVERTISE_HOST=100.93.2.116
Environment=VOID_P2P_ADVERTISE_HOST=100.93.2.116
Environment=PROPOSER_AUTO=1
Environment=VOID_PROPOSER_AUTO=1
Environment=VOID_AUTOPROP=1
Environment=VOID_AUTOPROP_ENABLED=1
Environment=VOID_COMMIT_DIRECT_AUTOPROP=1
Environment=VOID_COMMIT_DIRECT_AUTOPROP_ENABLED=1
Environment=VOID_COMMIT_DIRECT_AUTOPROP_V1=1
Environment=VOID_AUTOPROP_FORCE_OFF=0
Environment=VOID_DISABLE_COMMIT_DIRECT_AUTOPROP=0
Environment=VOID_DISABLE_COMMIT_DIRECT_AUTOPROP_V1=0
Environment=VOID_COMMIT_DIRECT_V2FS_AUTORUN=1
Environment=VOID_DISABLE_COMMIT_DIRECT_V2FS_AUTORUN=0
Environment=PROPOSER_TICK_MS=2000
Environment=VOID_PROPOSER_TICK_MS=2000
Environment=VOID_COMMIT_DIRECT_V2FS_EMPTY=0
Environment=VOID_COMMIT_DIRECT_V2FS_AUTO_EMPTY=0
Environment=VOID_COMMIT_DIRECT_V2FS_ALLOW_EMPTY=0
Environment=ALLOW_EMPTY_BLOCKS=0
Environment=VOID_ALLOW_EMPTY=0
Environment=VOID_V2FS_AUTO_EMPTY=0
Environment=VOID_QUARANTINE_HOT_RUNTIME=0
Environment=VOID_DISABLE_FINALIZE_WAL_COMMIT=0
Environment=VOID_DISABLE_LASTSEAL_SELFHTTP_FALLBACK=0
Environment=VOID_DISABLE_LASTSEAL_TRUTH_SURFACES=0
""")

print("[ok] canonical runtime drop-in ensured")
PY

echo "=== daemon-reload + restart ==="
systemctl --user daemon-reload
systemctl --user restart "$UNIT"
sleep 4

echo
echo "=== env truth ==="
systemctl --user show "$UNIT" -p Environment \
| tr ' ' '\n' \
| grep -E 'HTTP_HOST=|VOID_HTTP_HOST=|HOST=|P2P_HOST=|P2P_BIND_HOST=|VOID_P2P_BIND_HOST=|P2P_ADVERTISE_HOST=|VOID_P2P_ADVERTISE_HOST=|PROPOSER_AUTO=|VOID_PROPOSER_AUTO=|VOID_AUTOPROP=|VOID_COMMIT_DIRECT_V2FS_AUTORUN=|VOID_COMMIT_DIRECT_V2FS_EMPTY=|VOID_COMMIT_DIRECT_V2FS_AUTO_EMPTY=|VOID_COMMIT_DIRECT_V2FS_ALLOW_EMPTY=|ALLOW_EMPTY_BLOCKS=|VOID_ALLOW_EMPTY=|VOID_V2FS_AUTO_EMPTY=|VOID_QUARANTINE_HOT_RUNTIME=|VOID_DISABLE_FINALIZE_WAL_COMMIT=|VOID_DISABLE_LASTSEAL_' || true

echo
echo "=== runtime proof ==="
H1="$(curl -fsS --max-time 5 "$BASE/head.txt" | tr -d '\r\n')"
printf 'head_before=%s\n' "$H1"
curl -fsS --max-time 5 "$BASE/__void/metrics/commit-direct-autoprop.v1/status.json" ; echo
sleep 12
H2="$(curl -fsS --max-time 5 "$BASE/head.txt" | tr -d '\r\n')"
printf 'head_after=%s\n' "$H2"
printf 'delta=%s\n' "$((H2-H1))"
curl -fsS --max-time 5 "$BASE/__void/metrics/commit-direct-autoprop.v1/status.json" ; echo
curl -fsS --max-time 5 "$BASE/__void/ready.json" ; echo
