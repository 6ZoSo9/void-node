#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  echo "run this qualifier with bash; do not source it" >&2
  return 2
fi

MARKER="VOID_PRECISION_POST_REBOOT_QUALIFICATION_V1"
ROOT="${VOID_NODE_ROOT:-$HOME/dev/void-node}"
EXPECTED_HOST="zoso-Precision-Tower-7810"
VOID_UNIT="void-node-live.service"
APOLLYON_UNIT="void-apollyon-v3-v13-promoted.service"
APOLLYON_PORT="11435"
APOLLYON_READY_MARKER="VOID_APOLLYON_V3_V13_PROMOTED_V14_OPENAI_BRIDGE_V1_READY"
NVIDIA_PACKAGE="nvidia-driver-595-open"
KNOWN_NONBLOCKING_FAILED_SYSTEM_UNIT="openipmi.service"

say(){ printf '%s\n' "$*"; }
die(){ say "HOLD: $*" >&2; exit 1; }

say "$MARKER"
say "read_only=true"
say "package_mutation=false"
say "systemd_mutation=false"
say "service_restart=false"
say "transaction_submission=false"
say "validator_mutation=false"
say "funds_movement=false"

for cmd in git hostname uname nvidia-smi modinfo dpkg-query systemctl journalctl loginctl ss awk grep sed; do
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
case "$kernel" in
  *-generic) ;;
  *) die "unexpected_kernel_flavor:$kernel" ;;
esac

if [[ -e /var/run/reboot-required ]]; then
  die "reboot_required"
fi

test -r /proc/driver/nvidia/version || die "nvidia_loaded_version_unavailable"
loaded_nvidia="$(awk 'match($0,/[0-9]+\.[0-9]+\.[0-9]+/){print substr($0,RSTART,RLENGTH); exit}' /proc/driver/nvidia/version)"
on_disk_nvidia="$(modinfo -F version nvidia 2>/dev/null | sed -n '1p')"
package_full="$(dpkg-query -W -f='${Version}' "$NVIDIA_PACKAGE" 2>/dev/null || true)"
package_nvidia="${package_full%%-*}"
kernel_nvidia_package="linux-modules-nvidia-595-open-$kernel"
kernel_nvidia_status="$(dpkg-query -W -f='${Status}' "$kernel_nvidia_package" 2>/dev/null || true)"
smi_nvidia="$(nvidia-smi --query-gpu=driver_version --format=csv,noheader,nounits 2>/dev/null | sed -n '1p')"

for row in \
  "loaded:$loaded_nvidia" \
  "on_disk:$on_disk_nvidia" \
  "package:$package_nvidia" \
  "nvidia_smi:$smi_nvidia"
do
  name="${row%%:*}"
  value="${row#*:}"
  [[ "$value" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
    die "nvidia_version_invalid:$name:$value"
done

test "$loaded_nvidia" = "$on_disk_nvidia" || die "nvidia_loaded_on_disk_mismatch"
test "$loaded_nvidia" = "$package_nvidia" || die "nvidia_loaded_package_mismatch"
test "$loaded_nvidia" = "$smi_nvidia" || die "nvidia_loaded_smi_mismatch"
test "$kernel_nvidia_status" = "install ok installed" || die "kernel_nvidia_package_not_installed:$kernel_nvidia_package"

linger="$(loginctl show-user "$USER" -p Linger --value 2>/dev/null || true)"
test "$linger" = "yes" || die "user_linger_not_enabled"

for unit in "$VOID_UNIT" "$APOLLYON_UNIT"; do
  systemctl --user is-enabled --quiet "$unit" || die "service_not_enabled:$unit"
  systemctl --user is-active --quiet "$unit" || die "service_not_active:$unit"
  pid="$(systemctl --user show "$unit" -p MainPID --value)"
  [[ "$pid" =~ ^[0-9]+$ ]] || die "service_main_pid_invalid:$unit"
  test "$pid" -gt 1 || die "service_main_pid_invalid:$unit"
done

grep -Fq "$APOLLYON_READY_MARKER" < <(
  journalctl --user -u "$APOLLYON_UNIT" -b -o cat --no-pager
) || die "apollyon_ready_marker_missing"

listener_lines="$(ss -ltnH "sport = :$APOLLYON_PORT" 2>/dev/null || true)"
test -n "$listener_lines" || die "apollyon_listener_missing"

listener_addresses="$(printf '%s\n' "$listener_lines" | awk '{print $4}')"
printf '%s\n' "$listener_addresses" |
  grep -Fxq "127.0.0.1:$APOLLYON_PORT" || die "apollyon_ipv4_loopback_listener_missing"
while IFS= read -r address; do
  test -n "$address" || continue
  test "$address" = "127.0.0.1:$APOLLYON_PORT" ||
    die "apollyon_non_loopback_listener:$address"
done <<<"$listener_addresses"

unexpected_failed=""
known_failed=""
while IFS= read -r unit; do
  test -n "$unit" || continue
  if test "$unit" = "$KNOWN_NONBLOCKING_FAILED_SYSTEM_UNIT"; then
    known_failed="${known_failed:+$known_failed,}$unit"
  else
    unexpected_failed="${unexpected_failed:+$unexpected_failed,}$unit"
  fi
done < <(
  systemctl --failed --no-legend --plain --no-pager 2>/dev/null |
    awk 'NF >= 4 && $2 == "loaded" && $3 == "failed" {print $1}'
)

test -z "$unexpected_failed" || die "unexpected_failed_system_units:$unexpected_failed"

void_pid="$(systemctl --user show "$VOID_UNIT" -p MainPID --value)"
apollyon_pid="$(systemctl --user show "$APOLLYON_UNIT" -p MainPID --value)"
session_type="${XDG_SESSION_TYPE:-unknown}"

say "hostname=$EXPECTED_HOST"
say "source_commit=$source_commit"
say "kernel=$kernel"
say "reboot_required=false"
say "nvidia_version=$loaded_nvidia"
say "nvidia_versions_consistent=true"
say "kernel_nvidia_package=$kernel_nvidia_package"
say "kernel_nvidia_package_installed=true"
say "user_linger=yes"
say "void_unit=$VOID_UNIT"
say "void_active=true"
say "void_enabled=true"
say "void_main_pid=$void_pid"
say "apollyon_unit=$APOLLYON_UNIT"
say "apollyon_active=true"
say "apollyon_enabled=true"
say "apollyon_main_pid=$apollyon_pid"
say "apollyon_ready=true"
say "apollyon_listener=127.0.0.1:$APOLLYON_PORT"
say "apollyon_loopback_only=true"
say "session_type=$session_type"
say "known_nonblocking_failed_system_units=${known_failed:-none}"
say "unexpected_failed_system_units=none"
say "${MARKER}_GREEN"
