#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  echo "run this admission check with bash; do not source it" >&2
  return 2
fi

MARKER="VOID_PRECISION_AUTOREMOVE_ADMISSION_V1"
ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_HOST="zoso-Precision-Tower-7810"

say(){ printf '%s\n' "$*"; }
die(){ say "HOLD: $*" >&2; exit 1; }

say "$MARKER"
say "read_only=true"
say "apt_simulation_only=true"
say "package_mutation=false"
say "systemd_mutation=false"
say "service_restart=false"
say "transaction_submission=false"
say "validator_mutation=false"
say "funds_movement=false"

for cmd in git hostname uname apt-get dpkg-query nvidia-smi awk grep sort comm mktemp sed; do
  command -v "$cmd" >/dev/null || die "required_command_missing:$cmd"
done

test "$(hostname)" = "$EXPECTED_HOST" || die "wrong_host"
test -d "$ROOT/.git" || die "repo_missing"
cd "$ROOT"
test "$(git branch --show-current)" = "main" || die "main_branch_required"
test -z "$(git status --porcelain=v1 --untracked-files=all)" ||
  die "clean_worktree_required"

source_commit="$(git rev-parse HEAD)"
kernel="$(uname -r)"

if [[ -e /var/run/reboot-required ]]; then
  die "reboot_required_before_autoremove_review"
fi

test -r /proc/driver/nvidia/version || die "nvidia_loaded_version_unavailable"
loaded_nvidia="$(awk 'match($0,/[0-9]+\.[0-9]+\.[0-9]+/){print substr($0,RSTART,RLENGTH); exit}' /proc/driver/nvidia/version)"
[[ "$loaded_nvidia" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
  die "nvidia_loaded_version_invalid:$loaded_nvidia"
nvidia_major="${loaded_nvidia%%.*}"

smi_nvidia="$(nvidia-smi --query-gpu=driver_version --format=csv,noheader,nounits 2>/dev/null | sed -n '1p')"
test "$smi_nvidia" = "$loaded_nvidia" ||
  die "nvidia_loaded_smi_mismatch:$loaded_nvidia:$smi_nvidia"

work="$(mktemp -d "${TMPDIR:-/tmp}/void-precision-autoremove-admission.XXXXXX")"
cleanup(){ rm -rf "$work"; }
trap cleanup EXIT INT TERM

simulation="$work/apt-autoremove-simulation.txt"
simulation_err="$work/apt-autoremove-simulation.err"
if ! LC_ALL=C apt-get -o Debug::NoLocking=1 -s autoremove >"$simulation" 2>"$simulation_err"; then
  tail -n 20 "$simulation_err" >&2 || true
  die "apt_autoremove_simulation_failed"
fi

candidates="$work/candidates.txt"
awk '$1 == "Remv" {print $2}' "$simulation" | sort -u >"$candidates"

protected="$work/protected.txt"
: >"$protected"

# Protect every installed NVIDIA userspace/firmware package whose installed
# version is the exact loaded driver generation. Superseded firmware versions
# are intentionally not protected by this rule.
dpkg-query -W -f='${binary:Package}\t${Version}\t${Status}\n' \
  'nvidia-*' 'libnvidia-*' 2>/dev/null |
awk -F '\t' -v v="$loaded_nvidia" '
  $3 == "install ok installed" && index($2, v) == 1 {print $1}
' >>"$protected" || true

# Protect the active running kernel generation and its matching modules.
dpkg-query -W -f='${binary:Package}\t${Status}\n' 2>/dev/null |
awk -F '\t' -v k="$kernel" '
  $2 == "install ok installed" && index($1, k) > 0 {print $1}
' >>"$protected"

# Protect meta-packages that keep the supported kernel/NVIDIA upgrade path
# attached even though their package version does not equal the driver version.
for package in \
  "nvidia-driver-${nvidia_major}-open" \
  "nvidia-kernel-common-${nvidia_major}" \
  "nvidia-kernel-source-${nvidia_major}-open" \
  "nvidia-compute-utils-${nvidia_major}" \
  "nvidia-utils-${nvidia_major}" \
  "linux-modules-nvidia-${nvidia_major}-open-generic-hwe-24.04" \
  "linux-generic-hwe-24.04" \
  "linux-image-generic-hwe-24.04" \
  "linux-headers-generic-hwe-24.04"
do
  status="$(dpkg-query -W -f='${Status}' "$package" 2>/dev/null || true)"
  if [[ "$status" == "install ok installed" ]]; then
    printf '%s\n' "$package" >>"$protected"
  fi
done

sort -u -o "$protected" "$protected"

protected_overlap="$work/protected-overlap.txt"
comm -12 "$candidates" "$protected" >"$protected_overlap"

superseded_firmware="$work/superseded-firmware.txt"
current_firmware="nvidia-firmware-${nvidia_major}-${loaded_nvidia}"
awk -v prefix="nvidia-firmware-${nvidia_major}-" -v current="$current_firmware" '
  index($0, prefix) == 1 && $0 != current {print}
' "$candidates" >"$superseded_firmware"

candidate_count="$(wc -l <"$candidates" | tr -d ' ')"
protected_count="$(wc -l <"$protected" | tr -d ' ')"
overlap_count="$(wc -l <"$protected_overlap" | tr -d ' ')"
superseded_count="$(wc -l <"$superseded_firmware" | tr -d ' ')"

csv_or_none(){
  local file="$1"
  if [[ ! -s "$file" ]]; then
    printf 'none'
  else
    awk 'BEGIN{first=1} {if(!first) printf ","; printf "%s",$0; first=0} END{printf ""}' "$file"
  fi
}

candidate_csv="$(csv_or_none "$candidates")"
protected_overlap_csv="$(csv_or_none "$protected_overlap")"
superseded_csv="$(csv_or_none "$superseded_firmware")"

say "hostname=$EXPECTED_HOST"
say "source_commit=$source_commit"
say "kernel=$kernel"
say "reboot_required=false"
say "nvidia_version=$loaded_nvidia"
say "nvidia_major=$nvidia_major"
say "nvidia_loaded_smi_consistent=true"
say "autoremove_candidate_count=$candidate_count"
say "autoremove_candidates=$candidate_csv"
say "protected_installed_package_count=$protected_count"
say "protected_overlap_count=$overlap_count"
say "protected_overlap=$protected_overlap_csv"
say "superseded_nvidia_firmware_candidate_count=$superseded_count"
say "superseded_nvidia_firmware_candidates=$superseded_csv"

if [[ "$overlap_count" != "0" ]]; then
  die "autoremove_would_remove_protected_packages:$protected_overlap_csv"
fi

say "autoremove_protected_overlap=false"
say "autoremove_admission=green"
say "${MARKER}_GREEN"
