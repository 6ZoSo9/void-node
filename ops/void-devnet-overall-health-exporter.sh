#!/usr/bin/env bash
set -euo pipefail

# Where node_exporter actually reads from
SYS_TEXTFILE_DIR="/var/lib/node_exporter/textfile_collector"

# Where we stage as the unprivileged user
HOME_TEXTFILE_DIR="$HOME/.cache/node-exporter-textfile"
mkdir -p "${HOME_TEXTFILE_DIR}"

HOME_OUT="${HOME_TEXTFILE_DIR}/void_devnet_overall.prom"
HOME_TMP="${HOME_OUT}.$$"

# Get a metric value from a textfile; default to 0 if missing
get_metric() {
  local name="$1"
  local file="$2"

  if [[ ! -f "$file" ]]; then
    echo "0"
    return 0
  fi

  # Expect lines like: name{chain="devnet"} 1
  local val
  val="$(awk -v m="$name" '$1 ~ ("^"m"\\{") { print $2; exit }' "$file" 2>/dev/null || true)"
  if [[ -z "$val" ]]; then
    echo "0"
  else
    echo "$val"
  fi
}

models_file="${SYS_TEXTFILE_DIR}/void_models_devnet.prom"
datasets_file="${SYS_TEXTFILE_DIR}/void_datasets_devnet.prom"
agentreg_file="${SYS_TEXTFILE_DIR}/void_agentreg_devnet.prom"
coverage_file="${SYS_TEXTFILE_DIR}/void_devnet_coverage.prom"

models_health="$(get_metric "void_models_devnet_health" "$models_file")"
datasets_health="$(get_metric "void_datasets_devnet_health" "$datasets_file")"
agentreg_health="$(get_metric "void_agentreg_devnet_health" "$agentreg_file")"
coverage_health="$(get_metric "void_devnet_coverage_health" "$coverage_file")"
receipts_health_v2="$(get_metric "void_devnet_receipts_health_v2" "$coverage_file")"

overall=1
for v in "$models_health" "$datasets_health" "$agentreg_health" "$coverage_health" "$receipts_health_v2"; do
  if [[ "$v" != "1" ]]; then
    overall=0
  fi
done

{
  echo "# HELP void_devnet_overall_health Overall VOID devnet health (1=ok,0=bad)"
  echo "# TYPE void_devnet_overall_health gauge"
  printf 'void_devnet_overall_health{chain="devnet"} %d\n' "$overall"
} > "$HOME_TMP"

mv "$HOME_TMP" "$HOME_OUT"

echo "[overall] wrote home textfile: $HOME_OUT"
echo "[overall] models=${models_health} datasets=${datasets_health} agentreg=${agentreg_health} coverage=${coverage_health} receipts_health_v2=${receipts_health_v2} overall=${overall}"

# Now sync into the real node_exporter dir as root
if [[ ! -d "$SYS_TEXTFILE_DIR" ]]; then
  echo "[overall] SYS_TEXTFILE_DIR does not exist: $SYS_TEXTFILE_DIR" >&2
  exit 1
fi

echo "[overall] syncing to $SYS_TEXTFILE_DIR via sudo cp ..."
sudo cp "$HOME_OUT" "$SYS_TEXTFILE_DIR/"

echo "[overall] done."
