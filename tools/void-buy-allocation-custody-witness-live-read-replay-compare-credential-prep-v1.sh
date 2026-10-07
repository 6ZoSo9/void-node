#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

marker=VOID_REPLAY_COMPARE_ONLY_CREDENTIAL_PREP_V1
repo="$HOME/dev/void-node"
keydir=/var/lib/void-replay-compare-transport-v1
key="$keydir/id_ed25519"
pub="$key.pub"
hostdir=/etc/void/replay-compare-transport-v1
hostfile="$hostdir/known_hosts"
uid=994
gid=981
user=void-buy-custody
precision_hostname=zoso-Precision-Tower-7810
precision_machine_id_sha256=sha256:11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2

hold() {
  echo "hold_reason=$1" >&2
  echo "$marker""_HOLD" >&2
  exit 2
}
if [[ "$#" -eq 1 && "$1" == "--help" ]]; then
  echo "$marker"
  echo "Precision-only compare SSH key and pinned Nimo host-key preparation."
  echo "No Nimo or replay/witness mutation."
  exit 0
fi
[[ "$#" -eq 0 ]] || hold bad_arguments

echo "$marker"
echo "compare_key_provisioning=true"
echo "nimo_authorization_mutation=false"
echo "replay_mutation=false"
echo "witness_mutation=false"
echo "wallet_or_signer=false"
echo "transaction=false"
echo "funds_moved=false"

for cmd in git ssh-keyscan ssh-keygen sudo install stat awk getent id sort hostname sha256sum; do
  command -v "$cmd" >/dev/null 2>&1 || hold "missing_command:$cmd"
done
[[ -d "$repo/.git" ]] || hold source_repository_missing
[[ "$(id -u)" != "0" ]] || hold must_run_as_unprivileged_operator
[[ "$(id -u "$user")" == "$uid" && "$(id -g "$user")" == "$gid" ]] ||
  hold custody_identity_mismatch
[[ "$(getent passwd "$uid" | awk -F: '{print $1}')" == "$user" ]] ||
  hold custody_account_mismatch

[[ "$(hostname)" == "$precision_hostname" ]] ||
  hold precision_hostname_mismatch
[[ -r /etc/machine-id ]] || hold precision_machine_id_unreadable
machine_id="$(< /etc/machine-id)"
[[ "$machine_id" =~ ^[0-9a-f]{32}$ ]] ||
  hold precision_machine_id_invalid
machine_id_sha256="sha256:$(
  printf '%s' "$machine_id" |
    sha256sum |
    awk 'NR==1 {print $1}'
)"
[[ "$machine_id_sha256" == "$precision_machine_id_sha256" ]] ||
  hold precision_machine_id_mismatch
echo "precision_hostname=$precision_hostname"
echo "precision_machine_id_sha256=$machine_id_sha256"
echo "precision_host_identity_bound=true"

git -C "$repo" fetch --quiet origin main
[[ "$(git -C "$repo" rev-parse origin/main:tools/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs)" == "309b4de7c40c5b8a21bbc956cc445f6600a33215" ]] ||
  hold compare_wrapper_source_changed
[[ "$(git -C "$repo" rev-parse origin/main:src/economic/buy_void_allocation_custody_witness_live_read_replay_ssh_compare_adapter_v1.ts)" == "c59f603ac5755a4b4021e7c5d5feaad386e23643" ]] ||
  hold compare_adapter_source_changed
echo "source_binding_green=true"

echo "=== independently verify Nimo host public key ==="
pubkey="$(
  ssh-keyscan -T 8 -t ed25519 100.91.79.112 2>/dev/null |
    awk 'NF==3 && $2=="ssh-ed25519" {print $3}' | LC_ALL=C sort -u
)" || hold ssh_keyscan_failed
[[ "$pubkey" =~ ^[A-Za-z0-9+/]+={0,2}$ ]] || hold ssh_keyscan_ambiguous
hostline="nimo ssh-ed25519 $pubkey"
fpr="$(
  printf '%s\n' "$hostline" | ssh-keygen -lf - 2>/dev/null |
    awk 'NR==1 {print $2}'
)" || hold nimo_fingerprint_unreadable
[[ "$fpr" == "SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk" ]] ||
  hold nimo_host_fingerprint_mismatch
echo "nimo_host_fingerprint=$fpr"
echo "nimo_host_identity_bound=true"

echo "=== provision or verify new custody-owned key ==="
sudo -v
sudo -n -u "$user" true || hold custody_sudo_unavailable
if sudo -n test -L "$keydir"; then hold key_parent_symlink; fi
if sudo -n test -e "$keydir"; then
  [[ "$(sudo -n stat -c '%u:%g:%a:%F' "$keydir")" == "994:981:700:directory" ]] ||
    hold key_parent_identity_invalid
else
  sudo -n install -d -o "$uid" -g "$gid" -m 0700 "$keydir"
fi
for p in "$key" "$pub"; do
  if sudo -n test -L "$p"; then hold key_path_symlink; fi
done
private_exists=false
public_exists=false
if sudo -n test -e "$key"; then private_exists=true; fi
if sudo -n test -e "$pub"; then public_exists=true; fi
[[ "$private_exists" == "$public_exists" ]] ||
  hold partial_key_pair_manual_review_required
if [[ "$private_exists" == "false" ]]; then
  sudo -n -u "$user" /usr/bin/ssh-keygen -q -t ed25519 -a 64 \
    -N '' -f "$key" -C "void-replay-compare-only-v1" ||
    hold keygen_failed
  echo "new_compare_key_generated=true"
else
  echo "existing_compare_key_reused_after_identity_check=true"
fi
[[ "$(sudo -n stat -c '%u:%g:%a:%F' "$key")" == "994:981:600:regular file" ]] || hold private_key_identity_invalid
[[ "$(sudo -n stat -c '%u:%g:%F' "$pub")" == "994:981:regular file" ]] || hold public_key_identity_invalid
pubmode="$(sudo -n stat -c '%a' "$pub")"
[[ "$pubmode" == "600" || "$pubmode" == "644" ]] ||
  hold public_key_permissions_invalid
derived="$(
  sudo -n -u "$user" ssh-keygen -y -f "$key" |
    awk 'NR==1 {print $1 " " $2}'
)" || hold key_derivation_failed
stored="$(
  sudo -n -u "$user" awk 'NR==1 {print $1 " " $2}' "$pub"
)" || hold public_key_read_failed
[[ -n "$derived" && "$derived" == "$stored" ]] || hold keypair_mismatch
keyfpr="$(
  sudo -n -u "$user" ssh-keygen -lf "$pub" |
    awk 'NR==1 {print $2}'
)" || hold key_fingerprint_failed
[[ "$keyfpr" =~ ^SHA256:[A-Za-z0-9+/]+$ ]] || hold key_fingerprint_invalid
[[ "$keyfpr" != "SHA256:ljAGCFvjfW4MWnOT2FD2TML5JuyvzvVpwMnK9wDMQ4o" &&
   "$keyfpr" != "SHA256:1VXibMOmQpJBi4lQixEAdTAsGdigHIV0wrXdnWDYSPg" ]] ||
  hold reused_append_or_generic_credential
echo "compare_key_fingerprint=$keyfpr"
echo "separate_credential_proven=true"

echo "=== install or verify root-owned known_hosts pin ==="
if sudo -n test -L "$hostdir"; then hold known_hosts_parent_symlink; fi
if sudo -n test -e "$hostdir"; then
  [[ "$(sudo -n stat -c '%u:%g:%a:%F' "$hostdir")" == "0:0:755:directory" ]] ||
    hold known_hosts_parent_identity_invalid
else
  sudo -n install -d -o 0 -g 0 -m 0755 "$hostdir"
fi
if sudo -n test -L "$hostfile"; then hold known_hosts_symlink; fi
if sudo -n test -e "$hostfile"; then
  [[ "$(sudo -n stat -c '%u:%g:%a:%F' "$hostfile")" == "0:0:444:regular file" ]] ||
    hold known_hosts_identity_invalid
  [[ "$(sudo -n cat "$hostfile")" == "$hostline" ]] ||
    hold known_hosts_pin_mismatch
  echo "existing_host_pin_reused=true"
else
  printf '%s\n' "$hostline" |
    sudo -n install -m 0444 -o 0 -g 0 /dev/stdin "$hostfile" ||
    hold known_hosts_install_failed
  echo "new_host_pin_installed=true"
fi
[[ "$(sudo -n stat -c '%u:%g:%a:%F' "$hostfile")" == "0:0:444:regular file" ]] ||
  hold known_hosts_postcheck_failed
[[ "$(sudo -n cat "$hostfile")" == "$hostline" ]] ||
  hold host_pin_postcheck_failed

echo "key_file=$key"
echo "key_owner=994:981"
echo "key_mode=600"
echo "known_hosts_file=$hostfile"
echo "known_hosts_owner=0:0"
echo "known_hosts_mode=444"
echo "nimo_authorization_mutation=false"
echo "server_compare_only_authorization_proven=false"
echo "live_authenticated_compare_proven=false"
echo "live_policy_enforcement_proven=false"
echo "rollback_resistance_proven=false"
echo "protected_high_water_custody_proven=false"
echo "independent_custody_proven=false"
echo "production_gate_ready=false"
echo "funds_moved=false"
echo "$marker""_GREEN"
