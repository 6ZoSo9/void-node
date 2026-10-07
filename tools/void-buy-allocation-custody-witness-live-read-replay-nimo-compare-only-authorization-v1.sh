#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

marker=VOID_REPLAY_NIMO_COMPARE_ONLY_AUTHORIZATION_V1
stage=/home/zoso/.local/state/void-replay-compare-only-nimo-auth-v1
wrapper_source="$stage/wrapper.mjs"
compare_pub="$stage/id_ed25519.pub"

handler=/usr/local/libexec/void-replay-witness-v1/void/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs
wrapper=/usr/local/libexec/void-replay-witness-v1/void/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs
config=/etc/void/buy-void-allocation-custody-witness-live-read-replay-external-forced-command-v1.json
witness=/var/lib/void-replay-external-witness-v1/buy-void-allocation-custody-witness-live-read-replay-external-v1.jsonl
intent=/var/lib/void-replay-external-witness-v1/buy-void-allocation-custody-witness-live-read-replay-external-append-intent-v1.json
auth=/etc/ssh/authorized_keys/voidwitness
authdir=/etc/ssh/authorized_keys
runtime=/usr/local/libexec/void-replay-witness-v1/void

handler_sha=511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831
wrapper_blob=309b4de7c40c5b8a21bbc956cc445f6600a33215
config_sha=ab71fa8af4f91529010cf22f219f616460efb9390eaaefe368b18df3ae9292a6
witness_sha=b1d6cb7d55fb97b48a388b19e230ed272a654f7b924ed786c050d8028c9f761e
compare_fpr='SHA256:8NrrP3xxlMTcJEDYgNE+8DWMm1Z6zxFW5FpHWdk0EGI'

hold() {
  printf 'hold_reason=%s\n%s_HOLD\n' "$1" "$marker" >&2
  exit 2
}

if [[ "$#" -eq 1 && "$1" == --help ]]; then
  echo "$marker"
  echo "Nimo-only: install exact compare wrapper and third restricted public key."
  echo "No replay, witness, config, sshd, signer, transaction or funds mutation."
  exit 0
fi
[[ "$#" -eq 0 ]] || hold invalid_arguments

echo "$marker"
echo "compare_only_authorized_key_install=bounded"
echo "witness_mutation=false"
echo "replay_mutation=false"
echo "config_mutation=false"
echo "sshd_mutation=false"
echo "wallet_or_signer=false"
echo "transaction=false"
echo "funds_moved=false"

[[ "$(id -u)" -eq 0 && "$(hostname)" == Nimo ]] ||
  hold root_nimo_required
for cmd in git node ssh-keygen stat sha256sum getent awk grep sed head cat \
  chown chmod install mktemp mv realpath; do
  command -v "$cmd" >/dev/null 2>&1 || hold "missing_command:$cmd"
done
[[ "$(getent passwd 997 | awk -F: '{print $1 ":" $4}')" == "voidwitness:984" ]] ||
  hold voidwitness_identity_changed

for p in "$runtime" "$handler" "$config" "$witness" "$authdir" "$auth" \
  "$stage" "$wrapper_source" "$compare_pub"; do
  [[ -e "$p" && ! -L "$p" ]] || hold "missing_or_symlink:$p"
  [[ "$(realpath -e -- "$p")" == "$p" ]] ||
    hold "symlink_ancestor:$p"
done
[[ ! -e "$intent" && ! -L "$intent" ]] || hold pending_append_intent
[[ ! -L "$wrapper" ]] || hold wrapper_symlink

for d in "$runtime" "$authdir"; do
  [[ "$(stat -c '%u:%g:%F' "$d")" == "0:0:directory" ]] ||
    hold "parent_owner_changed:$d"
  mode="$(stat -c '%a' "$d")"
  (( (8#$mode & 0022) == 0 )) || hold "parent_writable:$d"
done
[[ "$(stat -c '%u:%g:%a:%h:%F' "$config")" == "0:0:444:1:regular file" ]] ||
  hold config_metadata_changed
[[ "$(stat -c '%u:%g:%a:%h:%F' "$witness")" == "997:984:600:1:regular file" ]] ||
  hold witness_metadata_changed
[[ "$(stat -c '%u:%g:%a:%h:%F' "$auth")" == "0:0:444:1:regular file" ]] ||
  hold authorized_keys_metadata_changed

[[ "$(sha256sum "$handler" | awk '{print $1}')" == "$handler_sha" ]] ||
  hold compare_handler_upgrade_required
[[ "$(sha256sum "$config" | awk '{print $1}')" == "$config_sha" ]] ||
  hold config_changed
[[ "$(sha256sum "$witness" | awk '{print $1}')" == "$witness_sha" ]] ||
  hold witness_changed
[[ "$(git hash-object "$wrapper_source")" == "$wrapper_blob" ]] ||
  hold compare_wrapper_source_changed
/usr/bin/node --check "$wrapper_source" || hold wrapper_syntax_invalid

for f in "$wrapper_source" "$compare_pub"; do
  [[ "$(stat -c '%h:%F' "$f")" == "1:regular file" ]] ||
    hold staged_file_metadata_invalid
done
[[ "$(awk 'END {print NR}' "$compare_pub")" == 1 ]] ||
  hold compare_pub_line_count_invalid
[[ "$(ssh-keygen -lf "$compare_pub" | awk 'NR==1 {print $2}')" == "$compare_fpr" ]] ||
  hold compare_public_fingerprint_mismatch
read -r algorithm public comment < "$compare_pub"
[[ "$algorithm" == ssh-ed25519 &&
   "$public" =~ ^[A-Za-z0-9+/]+={0,2}$ &&
   "$comment" == void-replay-compare-only-v1 ]] ||
  hold compare_pub_noncanonical

forced_command="/usr/bin/env VOID_BUY_VOID_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1=1 /usr/bin/node $wrapper"
third="restrict,command=\"$forced_command\" ssh-ed25519 $public void-replay-compare-only-v1"

count="$(awk 'END {print NR}' "$auth")"
[[ "$count" == 2 || "$count" == 3 ]] || hold authorized_key_count_changed
if [[ "$count" == 2 ]]; then
  [[ "$(grep -cF "$public" "$auth" || true)" == 0 ]] ||
    hold compare_public_key_already_used
else
  [[ "$(sed -n '3p' "$auth")" == "$third" ]] ||
    hold existing_third_key_unrecognized
  [[ "$(grep -cF "$public" "$auth")" == 1 ]] ||
    hold compare_key_duplicate
fi

original_auth_sha="$(sha256sum "$auth" | awk '{print $1}')"
old_two_sha="$(head -n 2 "$auth" | sha256sum | awk '{print $1}')"
tmpwrapper=''
tmpauth=''
backup=''
committed=false
finished=false
cleanup() {
  if [[ "$finished" != true && "$committed" == true &&
        -n "$backup" && -e "$backup" ]]; then
    if [[ "$(head -n 2 "$backup" | sha256sum | awk '{print $1}')" == "$old_two_sha" ]]; then
      mv -T -- "$backup" "$auth" ||
        echo "URGENT_AUTHORIZED_KEYS_MANUAL_RESTORE_REQUIRED=true" >&2
      backup=''
      echo "authorized_keys_rollback_attempted=true" >&2
    else
      echo "URGENT_AUTHORIZED_KEYS_MANUAL_RESTORE_REQUIRED=true" >&2
    fi
  fi
  for p in "$tmpwrapper" "$tmpauth" "$backup"; do
    if [[ -n "$p" && -e "$p" ]]; then rm -f -- "$p"; fi
  done
}
trap cleanup EXIT

echo "=== install or verify fixed compare-only wrapper ==="
if [[ -e "$wrapper" ]]; then
  [[ "$(stat -c '%u:%g:%a:%h:%F' "$wrapper")" == "0:0:555:1:regular file" ]] ||
    hold installed_wrapper_metadata_changed
  [[ "$(git hash-object "$wrapper")" == "$wrapper_blob" ]] ||
    hold installed_wrapper_source_unknown
  /usr/bin/node --check "$wrapper" || hold installed_wrapper_invalid
  echo "compare_wrapper_already_installed=true"
else
  tmpwrapper="$(mktemp "$runtime/.compare-only.XXXXXXXX.mjs")" ||
    hold wrapper_tmp_creation_failed
  install -o 0 -g 0 -m 0555 "$wrapper_source" "$tmpwrapper" ||
    hold wrapper_copy_failed
  [[ "$(git hash-object "$tmpwrapper")" == "$wrapper_blob" ]] ||
    hold wrapper_temp_source_changed
  /usr/bin/node --check "$tmpwrapper" || hold wrapper_temp_invalid
  [[ "$(sha256sum "$handler" | awk '{print $1}')" == "$handler_sha" ]] ||
    hold handler_changed_before_wrapper_install
  [[ "$(sha256sum "$witness" | awk '{print $1}')" == "$witness_sha" ]] ||
    hold witness_changed_before_wrapper_install
  [[ ! -e "$wrapper" && ! -L "$wrapper" ]] || hold wrapper_race
  mv -T -- "$tmpwrapper" "$wrapper"
  tmpwrapper=''
  echo "compare_wrapper_installed=true"
fi

echo "=== preserve both old keys and install third authorization ==="
if [[ "$count" == 2 ]]; then
  backup="$(mktemp "$authdir/.voidwitness.compare.backup.XXXXXXXX")" ||
    hold auth_backup_creation_failed
  install -o 0 -g 0 -m 0444 "$auth" "$backup" ||
    hold auth_backup_copy_failed
  tmpauth="$(mktemp "$authdir/.voidwitness.compare.new.XXXXXXXX")" ||
    hold auth_temp_creation_failed
  { cat "$auth"; printf '%s\n' "$third"; } > "$tmpauth"
  chown 0:0 "$tmpauth"
  chmod 0444 "$tmpauth"

  [[ "$(head -n 2 "$tmpauth" | sha256sum | awk '{print $1}')" == "$old_two_sha" ]] ||
    hold old_keys_not_preserved
  [[ "$(awk 'END {print NR}' "$tmpauth")" == 3 ]] ||
    hold expected_three_entries
  [[ "$(sed -n '3p' "$tmpauth")" == "$third" ]] ||
    hold third_key_invalid
  [[ "$(sha256sum "$auth" | awk '{print $1}')" == "$original_auth_sha" ]] ||
    hold original_authorized_keys_changed
  [[ ! -e "$intent" && ! -L "$intent" ]] || hold intent_appeared
  mv -T -- "$tmpauth" "$auth"
  tmpauth=''
  committed=true
  echo "third_key_atomically_installed=true"
else
  echo "third_key_already_installed=true"
fi

echo "=== exact postchecks ==="
[[ "$(git hash-object "$wrapper")" == "$wrapper_blob" ]] ||
  hold wrapper_postchange
[[ "$(stat -c '%u:%g:%a:%h:%F' "$wrapper")" == "0:0:555:1:regular file" ]] ||
  hold wrapper_meta_postchange
[[ "$(sha256sum "$handler" | awk '{print $1}')" == "$handler_sha" ]] ||
  hold handler_postchange
[[ "$(sha256sum "$config" | awk '{print $1}')" == "$config_sha" ]] ||
  hold config_postchange
[[ "$(sha256sum "$witness" | awk '{print $1}')" == "$witness_sha" ]] ||
  hold witness_postchange
[[ ! -e "$intent" && ! -L "$intent" ]] || hold intent_postchange
[[ "$(stat -c '%u:%g:%a:%h:%F' "$auth")" == "0:0:444:1:regular file" ]] ||
  hold authorized_keys_meta_postchange
[[ "$(awk 'END {print NR}' "$auth")" == 3 ]] ||
  hold authorized_key_count_postchange
[[ "$(head -n 2 "$auth" | sha256sum | awk '{print $1}')" == "$old_two_sha" ]] ||
  hold old_keys_changed
[[ "$(sed -n '3p' "$auth")" == "$third" ]] ||
  hold third_key_changed
[[ "$(grep -cF "$public" "$auth")" == 1 ]] ||
  hold compare_key_reused_or_missing

finished=true
echo "prior_two_authorized_keys_preserved=true"
echo "authorized_key_entries=3"
echo "compare_public_key_fingerprint=$compare_fpr"
echo "handler_unchanged=true"
echo "config_unchanged=true"
echo "witness_unchanged=true"
echo "pending_intent=false"
echo "server_compare_only_authorization_proven=false"
echo "live_authenticated_compare_proven=false"
echo "live_policy_enforcement_proven=false"
echo "rollback_resistance_proven=false"
echo "protected_high_water_custody_proven=false"
echo "independent_custody_proven=false"
echo "production_gate_ready=false"
echo "funds_moved=false"
echo "$marker""_GREEN"
