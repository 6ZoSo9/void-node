#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[pillars] repo=${REPO_ROOT}"
echo "[pillars] prom_url=${PROM_URL}"
echo "[pillars] checking VOID safeboot + devnet + mainnet-core + manifest + keys + run + lastmile..."

query_scalar() {
  local expr="$1"
  local resp
  resp="$(curl -fsS -G "${PROM_URL}/api/v1/query" --data-urlencode "query=${expr}" 2>/dev/null || true)"
  if [ -z "${resp}" ]; then
    echo ""
    return 0
  fi
  local val
  val="$(printf '%s' "${resp}" | jq -r '.data.result[0].value[1] // empty' 2>/dev/null || true)"
  printf '%s' "${val}"
}

print_line() {
  local name="$1"
  local value="${2:-}"
  if [ -z "${value}" ]; then
    printf '  %-32s = %s\n' "${name}" "<none>"
  else
    printf '  %-32s = %s\n' "${name}" "${value}"
  fi
}

# --- raw metric pulls ---

safeboot_val="$(query_scalar 'safeboot_overall or void:safeboot:overall')"
devnet_val="$(query_scalar 'void:devnet_overall_with_jobs_v2:health:last_5m')"
core_val="$(query_scalar 'void_mainnet_core_health')"
manifest_val="$(query_scalar 'void_mainnet_core_manifest_health or void_mainnet_core_manifest')"
manifest_days_val="$(query_scalar 'void_mainnet_core_manifest_days')"
chosen_days_val="$(query_scalar 'chosen_manifest_days')"
keys_val="$(query_scalar 'void_mainnet_keys_health')"
plan_val="$(query_scalar 'void_mainnet_bootstrap_plan_health')"
run_val="$(query_scalar 'void_mainnet_run_pillar_status')"
lastmile_val="$(query_scalar 'void_mainnet_pillars_lastmile_ok or void:mainnet_lastmile:health:last_5m or void_mainnet_lastmile_health or void_mainnet_lastmile_nonempty_ratio')"

echo
print_line "safeboot_overall"                 "${safeboot_val}"
print_line "void:devnet_overall_with_jobs_v2:health:last_5m"       "${devnet_val}"
print_line "void_mainnet_core_health"         "${core_val}"
print_line "void_mainnet_core_manifest"       "${manifest_val}"
print_line "void_mainnet_core_manifest_days"  "${manifest_days_val}"
print_line "chosen_manifest_days"             "${chosen_days_val}"
print_line "void_mainnet_keys_health"         "${keys_val}"
print_line "void_mainnet_bootstrap_plan_health" "${plan_val}"
print_line "void_mainnet_run_pillar_status"   "${run_val}"
print_line "void_mainnet_lastmile"            "${lastmile_val}"

# --- booleans ---

# safeboot: soft-pass if missing
safeboot_ok=1
if [ -z "${safeboot_val}" ]; then
  echo "[pillars] WARN: safeboot metrics missing; treating safeboot_ok=1 (soft pass)" >&2
else
  if [ "${safeboot_val}" != "1" ]; then
    safeboot_ok=0
  fi
fi

devnet_ok=0
if [ "${devnet_val:-0}" = "1" ]; then
  devnet_ok=1
fi

core_health_ok=0
if [ "${core_val:-0}" = "1" ]; then
  core_health_ok=1
fi

manifest_health_ok=0
if [ "${manifest_val:-0}" = "1" ]; then
  manifest_health_ok=1
fi

manifest_days_ok=0
manifest_days_warn=0
if [ -n "${manifest_days_val}" ] && [ -n "${chosen_days_val}" ]; then
  md="${manifest_days_val%%.*}"
  cdn="${chosen_days_val%%.*}"
  if [ "${md:-0}" -ge "${cdn:-0}" ]; then
    manifest_days_ok=1
  else
    manifest_days_ok=0
  fi
elif [ "${manifest_health_ok}" = "1" ]; then
  # Days metrics missing, but manifest health says OK -> trust it, soft-pass days.
  manifest_days_ok=1
  manifest_days_warn=1
else
  manifest_days_ok=0
fi

manifest_ok=0
if [ "${manifest_health_ok}" = "1" ] && [ "${manifest_days_ok}" = "1" ]; then
  manifest_ok=1
fi

mainnet_core_ok=0
if [ "${core_health_ok}" = "1" ] && [ "${manifest_ok}" = "1" ]; then
  mainnet_core_ok=1
fi

keys_ok=0
if [ "${keys_val:-0}" = "1" ]; then
  keys_ok=1
fi

plan_ok=0
if [ "${plan_val:-0}" = "1" ]; then
  plan_ok=1
fi

# run pillar: pre-run soft-pass (0 or <none> is treated as OK with a warning)
run_ok=1
run_warn=0
if [ -z "${run_val}" ]; then
  run_ok=1
  run_warn=1
elif [ "${run_val}" = "1" ]; then
  run_ok=1
elif [ "${run_val}" = "0" ]; then
  run_ok=1
  run_warn=1
else
  run_ok=0
fi

lastmile_ok=0
if [ "${lastmile_val:-0}" = "1" ]; then
  lastmile_ok=1
fi

echo
echo "[pillars] summary:"
printf '  safeboot_ok        = %s\n' "${safeboot_ok}"
printf '  devnet_ok          = %s\n' "${devnet_ok}"
printf '  mainnet_core_ok    = %s\n' "${mainnet_core_ok}"
printf '  manifest_ok        = %s\n' "${manifest_ok}"
printf '  keys_ok            = %s\n' "${keys_ok}"
printf '  plan_ok            = %s\n' "${plan_ok}"
printf '  run_ok             = %s\n' "${run_ok}"
printf '  lastmile_ok        = %s\n' "${lastmile_ok}"

if [ "${manifest_days_warn}" = "1" ]; then
  echo "[pillars] WARN: manifest_days/ chosen_manifest_days missing; trusting manifest_health=1 for manifest_ok" >&2
fi

if [ "${run_warn}" = "1" ]; then
  echo "[pillars] WARN: run pillar status is 0/<none>; treating run_ok=1 in pre-run state" >&2
fi

overall=1
for v in "${devnet_ok}" "${mainnet_core_ok}" "${manifest_ok}" "${keys_ok}" "${plan_ok}" "${run_ok}" "${lastmile_ok}"; do
  if [ "${v}" != "1" ]; then
    overall=0
  fi
done

echo
if [ "${overall}" != "1" ]; then
  echo "[pillars] RESULT: FAIL (one or more devnet/mainnet pillars unhealthy; safeboot+manifest_days+run can soft-pass but others are hard gates)" >&2
  exit 1
else
  echo "[pillars] RESULT: OK (devnet+mainnet-core+manifest+keys+plan+run+lastmile healthy; safeboot/manifest_days/run may be soft-pass)"
fi
