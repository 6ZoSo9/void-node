#!/usr/bin/env bash
set -euo pipefail

MAIN_URL="${MAIN_URL:-http://127.0.0.1:4100}"
SAFE_URL="${SAFE_URL:-http://127.0.0.1:4104}"

# fallback: metrics/void/head when /head.txt is missing (404) or empty
safe_head_from_headtxt() {
  curl -fsS --max-time 2 "$SAFE_URL/head.txt" 2>/dev/null || true
}
safe_head_from_metrics() {
  curl -fsS --max-time 2 "$SAFE_URL/metrics/void/head" 2>/dev/null | rg -n '^void_head_number ' | tail -n 1 | awk '{print $2}' || true
}

echo "[safeboot-head-compare] MAIN_URL=${MAIN_URL} SAFE_URL=${SAFE_URL}"
echo

get_head() {
  local url="$1"
  curl -fsS "${url}/head.txt" 2>/dev/null \
    | awk 'NR==1 {print $1}' \
    || echo "NaN"
}

main_head=$(get_head "${MAIN_URL}")
safe_head=$(get_head "${SAFE_URL}")

printf "  %-30s = %s\n" "main_head (4100)" "${main_head}"
printf "  %-30s = %s\n" "safeboot_head (4104)" "${safe_head}"

gap="NaN"
if [[ "${main_head}" != "NaN" && "${safe_head}" != "NaN" ]]; then
  gap=$(( main_head - safe_head ))
fi

printf "  %-30s = %s\n" "gap(main - safeboot)" "${gap}"

# --- not comparable guard v2 (safeboot may use a different store than main) ---
SAFE_AHEAD_THRESHOLD="${SAFE_AHEAD_THRESHOLD:-5000}"

_main_guard="${MAIN_HEAD:-}"
_safe_guard="${SAFE_HEAD:-}"

# best-effort re-fetch if vars are missing/odd (don’t trust internal naming)
if [[ ! "${_main_guard:-}" =~ ^-?[0-9]+$ ]]; then
  _main_guard="$(curl -fsS --max-time 2 "$MAIN_URL/metrics/void/head" 2>/dev/null | rg '^void_head_number ' | tail -n 1 | awk '{print $2}' || true)"
  [[ "${_main_guard:-}" =~ ^-?[0-9]+$ ]] || _main_guard="$(curl -fsS --max-time 2 "$MAIN_URL/head.txt" 2>/dev/null || true)"
fi

if [[ ! "${_safe_guard:-}" =~ ^-?[0-9]+$ ]]; then
  # these helpers exist on your current head-compare (previous patch)
  _safe_guard="$(safe_head_from_headtxt 2>/dev/null || true)"
  [[ "${_safe_guard:-}" =~ ^-?[0-9]+$ ]] || _safe_guard="$(safe_head_from_metrics 2>/dev/null || true)"
fi

if [[ "${_main_guard:-}" =~ ^-?[0-9]+$ && "${_safe_guard:-}" =~ ^-?[0-9]+$ ]]; then
  if (( _safe_guard - _main_guard > SAFE_AHEAD_THRESHOLD )); then
    echo
    echo "[safeboot-head-compare] NOT COMPARABLE:"
    echo "  safeboot head (${_safe_guard}) is ahead of main (${_main_guard}) by > ${SAFE_AHEAD_THRESHOLD}."
    echo "  likely comparing different data dirs (e.g. safewt vs main)."
    echo "  treating compare as informational only."
    echo
    exit 0
  fi
fi
# --- end not comparable guard v2 ---

echo

echo "[safeboot-head-compare] NOTES:"
if [[ "${main_head}" == "NaN" ]]; then
  echo "  - main node /head.txt not reachable; check 4100."
fi

if [[ "${safe_head}" == "NaN" ]]; then
  echo "  - safeboot /head.txt not reachable; check 4104."
fi

if [[ "${main_head}" != "NaN" && "${safe_head}" != "NaN" ]]; then
  if [[ "${safe_head}" == "0" ]]; then
    echo "  - safeboot head==0: expected right now (empty DATA_DIR on safeboot)."
    echo "    Later, once we mirror data/last-mile into safeboot, this should track main."
  else
    echo "  - safeboot has non-zero head; once wired fully it should stay close to main."
  fi
fi

echo

# --- NOT COMPARABLE GUARD (safeboot may be pointed at a different store than main) ---
SAFE_AHEAD_THRESHOLD="${SAFE_AHEAD_THRESHOLD:-5000}"
if [[ "${SAFE_HEAD:-}" =~ ^-?[0-9]+$ && "${MAIN_HEAD:-}" =~ ^-?[0-9]+$ ]]; then
  if (( SAFE_HEAD - MAIN_HEAD > SAFE_AHEAD_THRESHOLD )); then
    echo
    echo "[safeboot-head-compare] NOT COMPARABLE:"
    echo "  safeboot head (${SAFE_HEAD}) is ahead of main (${MAIN_HEAD}) by > ${SAFE_AHEAD_THRESHOLD}."
    echo "  likely comparing different data dirs (e.g. safewt vs main)."
    echo "  treating compare as informational only."
    echo
    exit 0
  fi
fi
# --- end NOT COMPARABLE GUARD ---
echo "[safeboot-head-compare] DONE"
