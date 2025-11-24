#!/usr/bin/env bash
set -euo pipefail

MAIN_URL="${MAIN_URL:-http://127.0.0.1:4100}"
SAFE_URL="${SAFE_URL:-http://127.0.0.1:4104}"

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
echo "[safeboot-head-compare] DONE"
