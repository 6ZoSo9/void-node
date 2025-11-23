#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

TEXTDIR="/var/lib/node_exporter/textfile_collector"
SCRIPT_DIR="${HOME}/.local/bin"
SCRIPT_PATH="${SCRIPT_DIR}/void-mainnet-lastmile.sh"

echo "[lastmile] repo root: ${REPO_ROOT}"
echo "[lastmile] textfile dir: ${TEXTDIR}"
echo "[lastmile] script: ${SCRIPT_PATH}"

if [ ! -d "${TEXTDIR}" ]; then
  echo "[lastmile] ERROR: ${TEXTDIR} does not exist."
  echo "[lastmile] Create it and set perms (we've done this before), then rerun:"
  echo "  sudo mkdir -p ${TEXTDIR}"
  echo "  sudo chown ${USER}:${USER} ${TEXTDIR}"
  echo "  sudo chmod 777 ${TEXTDIR}"
  exit 1
fi

mkdir -p "${SCRIPT_DIR}"

cat > "${SCRIPT_PATH}" <<'EOS'
#!/usr/bin/env bash
set -euo pipefail

TEXTDIR="/var/lib/node_exporter/textfile_collector"
OUTFILE="${TEXTDIR}/void_mainnet_lastmile.prom"

NODE_HOST="${VOID_MAINNET_NODE_HOST:-127.0.0.1}"
NODE_PORT="${VOID_MAINNET_NODE_PORT:-4100}"
WINDOW="${VOID_LASTMILE_WINDOW:-128}"
EXPECT_NONEMPTY="${VOID_LASTMILE_EXPECT_NONEMPTY:-0}"

if [ ! -d "${TEXTDIR}" ]; then
  echo "[lastmile] ERROR: textfile dir ${TEXTDIR} missing" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[lastmile] ERROR: curl not found" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[lastmile] ERROR: jq not found" >&2
  exit 1
fi

HEAD_JSON="$(curl -fsS --max-time 2 "http://${NODE_HOST}:${NODE_PORT}/blocks/latest/number2.json" || true)"

if [ -z "${HEAD_JSON}" ]; then
  echo "[lastmile] ERROR: failed to fetch latest block number from node" >&2
  exit 1
fi

HEAD_NUM="$(printf '%s\n' "${HEAD_JSON}" | jq -r '.number // .height // .head // 0')" || HEAD_NUM=0

if ! [[ "${HEAD_NUM}" =~ ^[0-9]+$ ]]; then
  echo "[lastmile] WARN: non-numeric head '${HEAD_NUM}', treating as 0" >&2
  HEAD_NUM=0
fi

if [ "${WINDOW}" -lt 1 ]; then
  WINDOW=1
fi

START_NUM=$(( HEAD_NUM - WINDOW + 1 ))
if [ "${START_NUM}" -lt 0 ]; then
  START_NUM=0
fi

nonempty_count=0
last_nonempty=-1
checked=0

n="${HEAD_NUM}"
while [ "${n}" -ge "${START_NUM}" ]; do
  checked=$((checked + 1))

  TXS_JSON="$(curl -fsS --max-time 2 "http://${NODE_HOST}:${NODE_PORT}/dev/blocks/${n}/txs/persisted" || true)"
  if [ -n "${TXS_JSON}" ]; then
    txcount="$(printf '%s\n' "${TXS_JSON}" | jq 'length' 2>/dev/null || echo 0)"
  else
    txcount=0
  fi

  if ! [[ "${txcount}" =~ ^[0-9]+$ ]]; then
    txcount=0
  fi

  if [ "${txcount}" -gt 0 ]; then
    nonempty_count=$((nonempty_count + 1))
    last_nonempty="${n}"
  fi

  if [ "${n}" -eq 0 ]; then
    break
  fi
  n=$((n - 1))
done

window_size="${checked}"
ratio="0"

if [ "${window_size}" -gt 0 ]; then
  ratio="$(awk -v a="${nonempty_count}" -v b="${window_size}" 'BEGIN { if (b>0) printf "%.6f", a/b; else print "0"; }')"
fi

# Write to a temp file we own, then sudo-move into the textfile dir and fix perms so node_exporter can read it.
tmpfile="$(mktemp)"

{
  echo "# HELP void_mainnet_lastmile_window_size Number of recent blocks inspected for last-mile health (mainnet core)"
  echo "# TYPE void_mainnet_lastmile_window_size gauge"
  echo "void_mainnet_lastmile_window_size{chain=\"mainnet-core\"} ${window_size}"

  echo
  echo "# HELP void_mainnet_lastmile_nonempty_count Number of non-empty blocks in the last-mile window (mainnet core)"
  echo "# TYPE void_mainnet_lastmile_nonempty_count gauge"
  echo "void_mainnet_lastmile_nonempty_count{chain=\"mainnet-core\"} ${nonempty_count}"

  echo
  echo "# HELP void_mainnet_lastmile_nonempty_ratio Ratio (0..1) of non-empty blocks in the window (mainnet core)"
  echo "# TYPE void_mainnet_lastmile_nonempty_ratio gauge"
  echo "void_mainnet_lastmile_nonempty_ratio{chain=\"mainnet-core\"} ${ratio}"

  echo
  echo "# HELP void_mainnet_lastmile_last_checked_number Highest block number inspected in last-mile window (mainnet core)"
  echo "# TYPE void_mainnet_lastmile_last_checked_number gauge"
  echo "void_mainnet_lastmile_last_checked_number{chain=\"mainnet-core\"} ${HEAD_NUM}"

  echo
  echo "# HELP void_mainnet_lastmile_last_nonempty_number Last non-empty block number in the last-mile window (-1 if none) (mainnet core)"
  echo "# TYPE void_mainnet_lastmile_last_nonempty_number gauge"
  echo "void_mainnet_lastmile_last_nonempty_number{chain=\"mainnet-core\"} ${last_nonempty}"

  echo
  echo "# HELP void_mainnet_lastmile_expect_nonempty Whether we EXPECT non-empty blocks in this window (0=no,1=yes)"
  echo "# TYPE void_mainnet_lastmile_expect_nonempty gauge"
  echo "void_mainnet_lastmile_expect_nonempty{chain=\"mainnet-core\"} ${EXPECT_NONEMPTY}"
} > "${tmpfile}"

sudo mv "${tmpfile}" "${OUTFILE}"
sudo chmod 644 "${OUTFILE}"
EOS

chmod +x "${SCRIPT_PATH}"

echo "[lastmile] Running once to generate ${TEXTDIR}/void_mainnet_lastmile.prom ..."
"${SCRIPT_PATH}"

echo "[lastmile] Done. You can inspect the metrics with:"
echo "  sed -n '1,80p' ${TEXTDIR}/void_mainnet_lastmile.prom"
echo
echo "[lastmile] To run periodically, add a systemd user timer later; for now this is manual."
