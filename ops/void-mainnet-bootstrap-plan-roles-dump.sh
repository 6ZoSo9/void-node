#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

CONFIG_PATH="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [plan-roles] VOID mainnet bootstrap PLAN roles dump ==="
echo "[plan-roles] repo        = ${REPO_ROOT}"
echo "[plan-roles] config_path = ${CONFIG_PATH}"
echo

if [[ ! -f "${CONFIG_PATH}" ]]; then
  echo "[plan-roles] FATAL: config file not found: ${CONFIG_PATH}" >&2
  exit 1
fi

echo "=== [1] chainId ==="
jq -r '
  if has("chainId") then
    "chainId=\(.chainId)"
  else
    "chainId=<missing>"
  end
' "${CONFIG_PATH}"
echo

echo "=== [2] core roles (raw) ==="
jq -r '
  .roles as $r
  | [
      "deployer",
      "treasuryAdmin",
      "opsTreasury",
      "updateGateAdmin",
      "configGateAdmin",
      "rewardAdmin"
    ]
  | map({
      role: .,
      addr: ($r[.] // "0x0000000000000000000000000000000000000000")
    })
  | .[]
  | .role as $role
  | .addr as $addr
  | (
      if ($addr | ascii_downcase) == "0x0000000000000000000000000000000000000000" then
        "zero"
      elif ($addr | test("^0x[0-9a-fA-F]{40}$") | not) then
        "bad_format"
      else
        "ok"
      end
    ) as $status
  | "\($role)\t\($addr)\t\($status)"
' "${CONFIG_PATH}"
echo

echo "=== [3] hints ==="
echo "status=ok         => looks like a real 0x address (format-wise)."
echo "status=zero       => still 0x0000..0000 placeholder; PLAN should stay NOT_READY."
echo "status=bad_format => not a valid 40-hex-char 0x address; fix the JSON."
echo
echo "[plan-roles] done."
