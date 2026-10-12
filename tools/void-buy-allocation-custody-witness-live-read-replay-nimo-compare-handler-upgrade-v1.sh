#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

marker=VOID_REPLAY_NIMO_COMPARE_HANDLER_UPGRADE_V1
parent=/usr/local/libexec/void-replay-witness-v1/void
target="$parent/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs"
stage=/home/zoso/.local/state/void-replay-compare-handler-upgrade-v1/handler.mjs
config=/etc/void/buy-void-allocation-custody-witness-live-read-replay-external-forced-command-v1.json
witness=/var/lib/void-replay-external-witness-v1/buy-void-allocation-custody-witness-live-read-replay-external-v1.jsonl
intent=/var/lib/void-replay-external-witness-v1/buy-void-allocation-custody-witness-live-read-replay-external-append-intent-v1.json
auth=/etc/ssh/authorized_keys/voidwitness

old_sha=65f8de9b659c151caf4d73a93d31da3d523a77cf5a7b6ced26c42b12b7d2d3f
new_sha=511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831
config_sha=ab71fa8af4f91529010cf22f219f616460efb9390eaaefe368b18df3ae9292a6
witness_sha=b1d6cb7d55fb97b48a388b19e230ed272a654f7b924ed786c050d8028c9f761e

hold() {
  printf 'hold_reason=%s\n%s_HOLD\n' "$1" "$marker" >&2
  exit 2
}
if [[ "${1:-}" == "--help" && "$#" -eq 1 ]]; then
  echo "$marker"
  echo "Nimo-only handler replacement; candidate must be pre-staged at the fixed path."
  echo "No config, witness, intent, authorized_keys, sshd, replay, signer or funds action."
  exit 0
fi
[[ "$#" -eq 0 ]] || hold invalid_arguments

echo "$marker"
echo "handler_only_update=true"
echo "replay_mutation=false"
echo "witness_mutation=false"
echo "config_mutation=false"
echo "authorized_keys_mutation=false"
echo "sshd_mutation=false"
echo "wallet_or_signer=false"
echo "funds_moved=false"

[[ "$(id -u)" -eq 0 ]] || hold requires_root
[[ "$(hostname)" == "Nimo" ]] || hold expected_nimo_hostname
for cmd in realpath stat sha256sum node install mktemp mv awk; do
  command -v "$cmd" >/dev/null 2>&1 || hold "missing_command:$cmd"
done

for p in "$parent" "$target" "$config" "$witness" "$auth"; do
  [[ -e "$p" && ! -L "$p" ]] || hold "missing_or_symlink:$p"
  [[ "$(realpath -e -- "$p")" == "$p" ]] || hold "symlink_ancestor:$p"
done
[[ "$(stat -c '%u:%F' "$parent")" == "0:directory" ]] || hold runtime_parent_not_root_owned
parent_mode="$(stat -c '%a' "$parent")"
(( (8#$parent_mode & 0022) == 0 )) || hold runtime_parent_writable
[[ "$(stat -c '%u:%g:%a:%h:%F' "$config")" == "0:0:444:1:regular file" ]] ||
  hold config_metadata_changed
[[ "$(stat -c '%u:%g:%a:%h:%F' "$witness")" == "997:984:600:1:regular file" ]] ||
  hold witness_metadata_changed
[[ "$(stat -c '%u:%g:%a:%h:%F' "$auth")" == "0:0:444:1:regular file" ]] ||
  hold authorized_keys_metadata_changed
[[ "$(awk 'END {print NR}' "$auth")" == "2" ]] || hold authorized_key_count_changed
[[ ! -e "$intent" && ! -L "$intent" ]] || hold pending_append_intent

[[ "$(sha256sum "$config" | awk '{print $1}')" == "$config_sha" ]] ||
  hold config_bytes_changed
[[ "$(sha256sum "$witness" | awk '{print $1}')" == "$witness_sha" ]] ||
  hold witness_bytes_changed
auth_before="$(sha256sum "$auth" | awk '{print $1}')"

current_sha="$(sha256sum "$target" | awk '{print $1}')"
[[ "$current_sha" == "$old_sha" || "$current_sha" == "$new_sha" ]] ||
  hold installed_handler_unknown
meta="$(stat -c '%u:%g:%a:%h:%F' "$target")"
IFS=: read -r owner group mode links type <<< "$meta"
[[ "$links" == 1 && "$type" == "regular file" ]] || hold handler_metadata_changed
[[ "$owner" == 0 || "$owner" == 997 ]] || hold handler_owner_changed
[[ "$group" == 0 || "$group" == 984 ]] || hold handler_group_changed
(( (8#$mode & 0022) == 0 )) || hold handler_mode_writable

tmp=''
cleanup() {
  if [[ -n "$tmp" && -e "$tmp" ]]; then rm -f -- "$tmp"; fi
}
trap cleanup EXIT

if [[ "$current_sha" == "$old_sha" ]]; then
  [[ -f "$stage" && ! -L "$stage" ]] || hold staged_handler_missing
  [[ "$(realpath -e -- "$stage")" == "$stage" ]] || hold staged_handler_symlink
  [[ "$(stat -c '%h:%F' "$stage")" == "1:regular file" ]] ||
    hold staged_handler_metadata_invalid
  [[ "$(sha256sum "$stage" | awk '{print $1}')" == "$new_sha" ]] ||
    hold staged_handler_sha_mismatch
  tmp="$(mktemp "$parent/.handler.compare-v1.new.XXXXXXXX.mjs")" ||
    hold temporary_handler_creation_failed
  install -o "$owner" -g "$group" -m "$mode" -- "$stage" "$tmp"
  [[ "$(sha256sum "$tmp" | awk '{print $1}')" == "$new_sha" ]] ||
    hold installed_temporary_sha_mismatch
  /usr/bin/node --check "$tmp" || hold staged_mjs_syntax_invalid
  [[ ! -e "$intent" && ! -L "$intent" ]] || hold intent_appeared
  [[ "$(sha256sum "$target" | awk '{print $1}')" == "$old_sha" ]] ||
    hold handler_changed_during_preflight
  [[ "$(sha256sum "$config" | awk '{print $1}')" == "$config_sha" ]] ||
    hold config_changed_during_preflight
  [[ "$(sha256sum "$witness" | awk '{print $1}')" == "$witness_sha" ]] ||
    hold witness_changed_during_preflight
  [[ "$(sha256sum "$auth" | awk '{print $1}')" == "$auth_before" ]] ||
    hold authorized_keys_changed_during_preflight
  mv -T -- "$tmp" "$target"
  tmp=''
  echo "handler_atomically_replaced=true"
else
  /usr/bin/node --check "$target" || hold installed_mjs_syntax_invalid
  echo "handler_already_current=true"
fi

[[ "$(sha256sum "$target" | awk '{print $1}')" == "$new_sha" ]] ||
  hold handler_post_sha_mismatch
[[ "$(stat -c '%u:%g:%a:%h:%F' "$target")" == "$meta" ]] ||
  hold handler_post_metadata_mismatch
[[ "$(sha256sum "$config" | awk '{print $1}')" == "$config_sha" ]] ||
  hold config_post_mutation
[[ "$(sha256sum "$witness" | awk '{print $1}')" == "$witness_sha" ]] ||
  hold witness_post_mutation
[[ "$(sha256sum "$auth" | awk '{print $1}')" == "$auth_before" ]] ||
  hold ssh_authorization_post_mutation
[[ ! -e "$intent" && ! -L "$intent" ]] || hold intent_post_mutation

echo "handler_sha256=$new_sha"
echo "handler_path=$target"
echo "config_unchanged=true"
echo "witness_unchanged=true"
echo "authorized_keys_unchanged=true"
echo "pending_intent=false"
echo "compare_only_key_installed=false"
echo "production_gate_ready=false"
echo "funds_moved=false"
echo "${marker}_GREEN"
