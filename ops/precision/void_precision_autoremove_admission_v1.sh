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

for cmd in git hostname uname apt-get dpkg-query nvidia-smi modinfo awk grep sort comm mktemp sed tail wc tr rm; do
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

on_disk_nvidia="$(modinfo -F version nvidia 2>/dev/null | sed -n '1p')"
[[ "$on_disk_nvidia" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
  die "nvidia_on_disk_version_invalid:$on_disk_nvidia"

package_full="$(dpkg-query -W -f='${Version}' "nvidia-driver-${nvidia_major}-open" 2>/dev/null || true)"
package_nvidia="$(printf '%s\n' "$package_full" | awk 'match($0,/[0-9]+\.[0-9]+\.[0-9]+/){print substr($0,RSTART,RLENGTH); exit}')"
[[ "$package_nvidia" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ||
  die "nvidia_package_version_invalid:$package_full"

smi_nvidia="$(nvidia-smi --query-gpu=driver_version --format=csv,noheader,nounits 2>/dev/null | sed -n '1p')"
test "$smi_nvidia" = "$loaded_nvidia" ||
  die "nvidia_loaded_smi_mismatch:$loaded_nvidia:$smi_nvidia"
test "$on_disk_nvidia" = "$loaded_nvidia" ||
  die "nvidia_loaded_on_disk_mismatch:$loaded_nvidia:$on_disk_nvidia"
test "$package_nvidia" = "$loaded_nvidia" ||
  die "nvidia_loaded_package_mismatch:$loaded_nvidia:$package_nvidia"

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
dpkg-query -W -f='${binary:Package}\t${Status}\n' 2>/dev/nullð)Ý¬µqÐµØ¬ô­É¹°(Èôô¥¹ÍÑ±°½¬¥¹ÍÑ±±¥¹à Ä°¬¤øÀíÁÉ¥¹ÐÅô(øøÁÉ½ÑÑ((AÉ½ÑÐµÑµÁ­ÌÑ¡Ð­ÀÑ¡ÍÕÁÁ½ÉÑ­É¹°½9Y%%ÕÁÉÁÑ (ÑÑ¡Ù¸Ñ¡½Õ Ñ¡¥ÈÁ­ÙÉÍ¥½¸½Ì¹½ÐÅÕ°Ñ¡É¥ÙÈÙÉÍ¥½¸¸)½ÈÁ­¥¸p(¹Ù¥¥µÉ¥ÙÈ´í¹Ù¥¥}µ©½Éôµ½Á¸p(¹Ù¥¥µ­É¹°µ½µµ½¸´í¹Ù¥¥}µ©½Éôp(¹Ù¥¥µ­É¹°µÍ½ÕÉ´í¹Ù¥¥}µ©½Éôµ½Á¸p(¹Ù¥¥µ½µÁÕÑµÕÑ¥±Ì´í¹Ù¥¥}µ©½Éôp(¹Ù¥¥µÕÑ¥±Ì´í¹Ù¥¥}µ©½Éôp(±¥¹Õàµµ½Õ±Ìµ¹Ù¥¥´í¹Ù¥¥}µ©½Éôµ½Á¸µ¹É¥µ¡Ý´ÈÐ¸ÀÐp(±¥¹Õàµ¹É¥µ¡Ý´ÈÐ¸ÀÐp(±¥¹Õàµ¥µµ¹É¥µ¡Ý´ÈÐ¸ÀÐp(±¥¹Õàµ¡ÉÌµ¹É¥µ¡Ý´ÈÐ¸ÀÐ)¼(ÍÑÑÕÌô¡Á­µÅÕÉäµ\µôíMÑÑÕÍôÁ­Èø½Ø½¹Õ±°ñðÑÉÕ¤(¥mlÍÑÑÕÌôô¥¹ÍÑ±°½¬¥¹ÍÑ±±utìÑ¡¸(ÁÉ¥¹ÑÍq¸Á­øøÁÉ½ÑÑ(¤)½¹()Í½ÉÐµÔµ¼ÁÉ½ÑÑÁÉ½ÑÑ()ÁÉ½ÑÑ}½ÙÉ±ÀôÝ½É¬½ÁÉ½ÑÑµ½ÙÉ±À¹ÑáÐ)½µ´´ÄÈ¹¥ÑÌÁÉ½ÑÑøÁÉ½ÑÑ}½ÙÉ±À()ÍÕÁÉÍ}¥ÉµÝÉôÝ½É¬½ÍÕÁÉÍµ¥ÉµÝÉ¹ÑáÐ)ÕÉÉ¹Ñ}¥ÉµÝÉô¹Ù¥¥µ¥ÉµÝÉ´í¹Ù¥¥}µ©½Éô´í±½}¹Ù¥¥ô)Ý¬µØÁÉ¥àô¹Ù¥¥µ¥ÉµÝÉ´í¹Ù¥¥}µ©½Éô´µØÕÉÉ¹ÐôÕÉÉ¹Ñ}¥ÉµÝÉ(¥¹à À°ÁÉ¥à¤ôôÄÀôÕÉÉ¹ÐíÁÉ¥¹Ñô(¹¥ÑÌøÍÕÁÉÍ}¥ÉµÝÉ()¹¥Ñ}½Õ¹Ðô¡Ýµ°ð¹¥ÑÌðÑÈµ¤)ÁÉ½ÑÑ}½Õ¹Ðô¡Ýµ°ðÁÉ½ÑÑðÑÈµ¤)½ÙÉ±Á}½Õ¹Ðô¡Ýµ°ðÁÉ½ÑÑ}½ÙÉ±ÀðÑÈµ¤)ÍÕÁÉÍ}½Õ¹Ðô¡Ýµ°ðÍÕÁÉÍ}¥ÉµÝÉðÑÈµ¤()ÍÙ}½É}¹½¹ ¥ì(±½°¥±ôÄ(¥mlµÌ¥±utìÑ¡¸(ÁÉ¥¹Ñ¹½¹(±Í(Ý¬	%9í¥ÉÍÐôÅôí¥ ¥ÉÍÐ¤ÁÉ¥¹Ñ°ìÁÉ¥¹ÑÌ°Àì¥ÉÍÐôÁô9íÁÉ¥¹Ñô¥±(¤)ô()¹¥Ñ}ÍØô¡ÍÙ}½É}¹½¹¹¥ÑÌ¤)ÁÉ½ÑÑ}½ÙÉ±Á}ÍØô¡ÍÙ}½É}¹½¹ÁÉ½ÑÑ}½ÙÉ±À¤)ÍÕÁÉÍ}ÍØô¡ÍÙ}½É}¹½¹ÍÕÁÉÍ}¥ÉµÝÉ¤()Íä¡½ÍÑ¹µôaAQ}!=MP)ÍäÍ½ÕÉ}½µµ¥ÐôÍ½ÕÉ}½µµ¥Ð)Íä­É¹°ô­É¹°)ÍäÉ½½Ñ}ÉÅÕ¥Éõ±Í)Íä¹Ù¥¥}ÙÉÍ¥½¸ô±½}¹Ù¥¥)Íä¹Ù¥¥}µ©½Èô¹Ù¥¥}µ©½È)Íä¹Ù¥¥}½¹}¥Í­}ÙÉÍ¥½¸ô½¹}¥Í­}¹Ù¥¥)Íä¹Ù¥¥}Á­}ÙÉÍ¥½¸ôÁ­}¹Ù¥¥)Íä¹Ù¥¥}±½}½¹}¥Í­}Á­}Íµ¥}½¹Í¥ÍÑ¹ÐõÑÉÕ)ÍäÕÑ½Éµ½Ù}¹¥Ñ}½Õ¹Ðô¹¥Ñ}½Õ¹Ð)ÍäÕÑ½Éµ½Ù}¹¥ÑÌô¹¥Ñ}ÍØ)ÍäÁÉ½ÑÑ}¥¹ÍÑ±±}Á­}½Õ¹ÐôÁÉ½ÑÑ}½Õ¹Ð)ÍäÁÉ½ÑÑ}½ÙÉ±Á}½Õ¹Ðô½ÙÉ±Á}½Õ¹Ð)ÍäÁÉ½ÑÑ}½ÙÉ±ÀôÁÉ½ÑÑ}½ÙÉ±Á}ÍØ)ÍäÍÕÁÉÍ}¹Ù¥¥}¥ÉµÝÉ}¹¥Ñ}½Õ¹ÐôÍÕÁÉÍ}½Õ¹Ð)ÍäÍÕÁÉÍ}¹Ù¥¥}¥ÉµÝÉ}¹¥ÑÌôÍÕÁÉÍ}ÍØ()¥ml½ÙÉ±Á}½Õ¹ÐôÀutìÑ¡¸(¥ÕÑ½Éµ½Ù}Ý½Õ±}Éµ½Ù}ÁÉ½ÑÑ}Á­ÌèÁÉ½ÑÑ}½ÙÉ±Á}ÍØ)¤()ÍäÕÑ½Éµ½Ù}ÁÉ½ÑÑ}½ÙÉ±Àõ±Í)ÍäÕÑ½Éµ½Ù}µ¥ÍÍ¥½¸õÉ¸)Íäí5I-Iõ}I8(ÿÿÿ