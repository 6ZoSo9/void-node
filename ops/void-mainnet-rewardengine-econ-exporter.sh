#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
PARAMS_PATH="${PARAMS_PATH:-$REPO/config/void-mainnet-rewardengine-params.json}"

OUT_TMP="${TEXTFILE_DIR}/void_mainnet_rewardengine_econ.prom.tmp"
OUT_FINAL="${TEXTFILE_DIR}/void_mainnet_rewardengine_econ.prom"

echo "[econ-exporter] REPO        = ${REPO}"
echo "[econ-exporter] PARAMS_PATH = ${PARAMS_PATH}"
echo "[econ-exporter] TEXTFILE_DIR= ${TEXTFILE_DIR}"

if [ ! -f "${PARAMS_PATH}" ]; then
  echo "[econ-exporter] ERROR: params JSON not found: ${PARAMS_PATH}" >&2
  ECON_HEALTH=0
  SELF_CONSISTENT=0
  JSON_OK=0
else
  if jq -e . "${PARAMS_PATH}" >/dev/null 2>&1; then
    echo "[econ-exporter] params JSON parses OK"
    JSON_OK=1
    ECON_HEALTH=1
    SELF_CONSISTENT=1

    HAS_TRIPLET="$(jq -r '
      if (has("perEpochVoid") and has("epochsPerYear") and has("annualVoidToValidators")) then
        "yes"
      else
        "no"
      end
    ' "${PARAMS_PATH}" 2>/dev/null || echo "no")"

    if [ "${HAS_TRIPLET}" = "yes" ]; then
      echo "[econ-exporter] found perEpochVoid / epochsPerYear / annualVoidToValidators triplet"

      DIFF="$(jq -r '
        if ((.perEpochVoid | type) == "number")
           and ((.epochsPerYear | type) == "number")
           and ((.annualVoidToValidators | type) == "number")
        then
          (.perEpochVoid * .epochsPerYear) - .annualVoidToValidators
        else
          "type_error"
        end
      ' "${PARAMS_PATH}" 2>/dev/null || echo "type_error")"

      if [ "${DIFF}" = "type_error" ]; then
        echo "[econ-exporter] WARN: triplet present but values are not numeric; skipping self-consistency check"
      else
        if [ "${DIFF}" != "0" ]; then
          echo "[econ-exporter] WARN: perEpochVoid * epochsPerYear != annualVoidToValidators (diff=${DIFF})"
          ECON_HEALTH=0
          SELF_CONSISTENT=0
        else
          echo "[econ-exporter] self-consistency OK: perEpochVoid * epochsPerYear == annualVoidToValidators"
        fi
      fi
    else
      echo "[econ-exporter] NOTE: expected triplet keys not present; treating econ config as JSON-OK only"
    fi
  else
    echo "[econ-exporter] ERROR: params JSON failed to parse" >&2
    JSON_OK=0
    ECON_HEALTH=0
    SELF_CONSISTENT=0
  fi
fi

mkdir -p "${TEXTFILE_DIR}"

{
  echo "# HELP void_mainnet_rewardengine_econ_health VOID mainnet RewardEngine econ params health (1=ok,0=bad)"
  echo "# TYPE void_mainnet_rewardengine_econ_health gauge"
  echo "void_mainnet_rewardengine_econ_health ${ECON_HEALTH}"

  echo "# HELP void_mainnet_rewardengine_econ_json_ok Is RewardEngine econ params JSON present and parseable (1=yes,0=no)"
  echo "# TYPE void_mainnet_rewardengine_econ_json_ok gauge"
  echo "void_mainnet_rewardengine_econ_json_ok ${JSON_OK}"

  echo "# HELP void_mainnet_rewardengine_econ_self_consistent Is perEpochVoid * epochsPerYear == annualVoidToValidators when triplet is present (1=yes/NA,0=bad)"
  echo "# TYPE void_mainnet_rewardengine_econ_self_consistent gauge"
  echo "void_mainnet_rewardengine_econ_self_consistent ${SELF_CONSISTENT}"

  echo "# HELP void_mainnet_rewardengine_econ_meta Static metadata for RewardEngine econ params"
  echo "# TYPE void_mainnet_rewardengine_econ_meta gauge"
  echo "void_mainnet_rewardengine_econ_meta{params_path=\"${PARAMS_PATH}\"} 1"
} > "${OUT_TMP}"

mv "${OUT_TMP}" "${OUT_FINAL}"

echo "[econ-exporter] wrote ${OUT_FINAL}"
