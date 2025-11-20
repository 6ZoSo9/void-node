#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
cd "$REPO"

SPOOL_FILE="${JOB_SPOOL_FILE:-docs/VOID-DEVNET-JOB-SPOOL.txt}"

echo "[hardreset] repo=$REPO"
echo "[hardreset] spool_file=$SPOOL_FILE"

mkdir -p "$(dirname "$SPOOL_FILE")"

# These are the 4 canonical JobQueue jobIds currently on devnet,
# as seen in the jobs/receipts report (totalJobs=4).
cat > "$SPOOL_FILE" <<'EOF'
0x2ede8ff21de60bd974dc8580dff156262553f411ba0b1990c2f383e28be62c68
0x71a668df8b9c51d9c7ec541a07a60759d078f9fee2b5e778f1916bbf3e3bed52
0x8659cde494c1545ba2abe95349690e12160b1261c3abc6b09622160d26ed48b8
0xd88b6fbe1d0aef009942eb63cc19e40f874f5405d09d7f955d2ed39c498a6d9b
EOF

echo "[hardreset] wrote 4 jobIds to spool."
echo "[hardreset] preview:"
sed -n '1,10p' "$SPOOL_FILE"
