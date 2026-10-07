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
trusted_self=/root/.void-replay-compare-only-nimo-authorization-v1.sh

handler_sha=511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831
wrapper_blob=309b4de7c40c5b8a21bbc956cc445f6600a33215
config_sha=ab71fa8af4f91529010cf22f219f616460efb9390eaaefe368b18df3ae9292a6
witness_sha=b1d6cb7d55fb97b48a388b19e230ed272a654f7b924ed786c050d8028c9f761e
compare_fpr='SHA256:8NrrP3xxlMTcJEDYgNE+8DWMm1Z6zxFW5FpHWdk0EGI'

hold() {
  printf 'hold_reason=%s\n%s_HOLD\n' "$1" "$marker" >&2
  exit 2
}

compare_pub_snapshot=''
compare_public=''
tmpwrapper=''
tmpauth=''
backup=''
committed=false
finished=false
old_two_sha=''
original_auth_sha=''

snapshot_compare_public_key_v1() {
  local source="$1"
  local snapshot_dir="$2"
  local expected_fpr="$3"
  local force_source_swap="${4:-false}"
  local replacement_source="${5:-}"
  local uid gid algorithm public comment

  uid="$(id -u)"
  gid="$(id -g)"
  compare_pub_snapshot="$(mktemp "$snapshot_dir/.void-replay-compare-key.XXXXXXXX.pub")" ||
    return 1
  if [[ "$uid" == 0 ]]; then
    install -o 0 -g 0 -m 0400 -- "$source" "$compare_pub_snapshot" ||
      return 1
  else
    install -m 0400 -- "$source" "$compare_pub_snapshot" ||
      return 1
  fi

  if [[ "$force_source_swap" == true ]]; then
    [[ -n "$replacement_source" ]] || return 1
    cat -- "$replacement_source" > "$source" || return 1
  fi

  [[ "$(stat -c '%u:%g:%a:%h:%F' "$compare_pub_snapshot")" == "$uid:$gid:400:1:regular file" ]] || return 1
  [[ "$(awk 'END {print NR}' "$compare_pub_snapshot")" == 1 ]] || return 1
  [[ "$(ssh-keygen -lf "$compare_pub_snapshot" | awk 'NR==1 {print $2}')" == "$expected_fpr" ]] || return 1
  read -r algorithm public comment < "$compare_pub_snapshot"
  [[ "$algorithm" == ssh-ed25519 &&
     "$public" =~ ^[A-Za-z0-9+/]+={0,2}$ &&
     "$comment" == void-replay-compare-only-v1 ]] || return 1
  compare_public="$public"
}

attempt_authorized_keys_restore_v1() {
  local source_backup="$1"
  local target_auth="$2"
  local target_dir="$3"
  local expected_two_sha="$4"
  local expected_full_sha="$5"
  local force_rename_failure="${6:-false}"
  local uid gid restore_tmp=''

  uid="$(id -u)"
  gid="$(id -g)"
  [[ -f "$source_backup" && ! -L "$source_backup" ]] || return 1
  [[ "$(head -n 2 "$source_backup" | sha256sum | awk '{print $1}')" == "$expected_two_sha" ]] || return 1
  [[ "$(sha256sum "$source_backup" | awk '{print $1}')" == "$expected_full_sha" ]] || return 1

  restore_tmp="$(mktemp "$target_dir/.voidwitness.compare.restore.XXXXXXXX")" ||
    return 1
  if [[ "$uid" == 0 ]]; then
    install -o 0 -g 0 -m 0444 -- "$source_backup" "$restore_tmp" || {
      rm -f -- "$restore_tmp"
      return 1
    }
  else
    install -m 0444 -- "$source_backup" "$restore_tmp" || {
      rm -f -- "$restore_tmp"
      return 1
    }
  fi
  if [[ "$(sha256sum "$restore_tmp" | awk '{print $1}')" != "$expected_full_sha" ]]; then
    rm -f -- "$restore_tmp"
    return 1
  fi
  if [[ "$force_rename_failure" == true ]]; then
    rm -f -- "$restore_tmp"
    return 1
  fi
  if ! mv -T -- "$restore_tmp" "$target_auth"; then
    rm -f -- "$restore_tmp"
    return 1
  fi
  [[ "$(sha256sum "$target_auth" | awk '{print $1}')" == "$expected_full_sha" ]] || return 1
}

cleanup() {
  set +e
  local restore_ok=false

  if [[ "$finished" != true && "$committed" == true &&
        -n "$backup" && -e "$backup" ]]; then
    if attempt_authorized_keys_restore_v1       "$backup" "$auth" "$authdir" "$old_two_sha" "$original_auth_sha" false; then
      rm -f -- "$backup"
      backup=''
      restore_ok=true
      echo "authorized_keys_rollback_attempted=true" >&2
    else
      printf 'URGENT_AUTHORIZED_KEYS_MANUAL_RESTORE_REQUIRED=true\nAUTHORIZED_KEYS_RECOVERY_BACKUP=%s\n'         "$backup" >&2
    fi
  fi

  for p in "$tmpwrapper" "$tmpauth" "$compare_pub_snapshot"; do
    if [[ -n "$p" && -e "$p" ]]; then rm -f -- "$p"; fi
  done

  if [[ -n "$backup" && -e "$backup" ]]; then
    if [[ "$finished" == true || "$committed" != true || "$restore_ok" == true ]]; then
      rm -f -- "$backup"
      backup=''
    fi
  fi
}

run_source_self_test_v1() {
  local root='' trusted='' key_a='' key_b='' stage_key=''
  local expected_fpr='' expected_public='' auth_test=''
  local old_two='' full_before='' mismatch_backup='' rename_backup=''
  root="$(mktemp -d)"
  chmod 0700 "$root"
  trusted="$root/trusted"
  mkdir -m 0700 "$trusted"
  trap '
    rm -f -- \
      "$key_a" "$key_a.pub" "$key_b" "$key_b.pub" \
      "$stage_key" "$auth_test" "$mismatch_backup" "$rename_backup"
    rm -f -- "$trusted"/.void-replay-compare-key.*.pub
    rmdir -- "$trusted" "$root" 2>/dev/null || true
  ' RETURN

  key_a="$root/key-a"
  key_b="$root/key-b"
  ssh-keygen -q -t ed25519 -N '' -C void-replay-compare-only-v1 -f "$key_a"
  ssh-keygen -q -t ed25519 -N '' -C void-replay-compare-only-v1 -f "$key_b"
  stage_key="$root/id_ed25519.pub"
  cp -- "$key_a.pub" "$stage_key"
  expected_fpr="$(ssh-keygen -lf "$key_a.pub" | awk 'NR==1 {print $2}')"
  read -r _ expected_public _ < "$key_a.pub"

  compare_pub_snapshot=''
  compare_public=''
  snapshot_compare_public_key_v1     "$stage_key" "$trusted" "$expected_fpr" true "$key_b.pub" ||
    return 1
  [[ "$compare_public" == "$expected_public" ]] || return 1
  [[ "$(ssh-keygen -lf "$stage_key" | awk 'NR==1 {print $2}')" != "$expected_fpr" ]] ||
    return 1
  rm -f -- "$compare_pub_snapshot"
  compare_pub_snapshot=''

  auth_test="$root/authorized_keys"
  printf 'first-key\nsecond-key\nthird-key\n' > "$auth_test"
  old_two="$(head -n 2 "$auth_test" | sha256sum | awk '{print $1}')"
  full_before="$(sha256sum "$auth_test" | awk '{print $1}')"

  mismatch_backup="$root/mismatch.backup"
  cp -- "$auth_test" "$mismatch_backup"
  printf 'tampered\n' >> "$mismatch_backup"
  if attempt_authorized_keys_restore_v1     "$mismatch_backup" "$auth_test" "$root" "$old_two" "$full_before" false; then
    return 1
  fi
  [[ -f "$mismatch_backup" ]] || return 1

  rename_backup="$root/rename-failure.backup"
  cp -- "$auth_test" "$rename_backup"
  if attempt_authorized_keys_restore_v1     "$rename_backup" "$auth_test" "$root" "$old_two" "$full_before" true; then
    return 1
  fi
  [[ -f "$rename_backup" ]] || return 1
  [[ "$(sha256sum "$auth_test" | awk '{print $1}')" == "$full_before" ]] || return 1

  echo "staged_key_swap_bound_to_root_snapshot=true"
  echo "mismatched_recovery_backup_preserved=true"
  echo "failed_restore_rename_backup_preserved=true"
}

if [[ "$#" -eq 1 && "$1" == --help ]]; then
  echo "$marker"
  echo "Nimo-only: install exact compare wrapper and third restricted public key."
  echo "No replay, witness, config, sshd, signer, transaction or funds mutation."
  exit 0
fi
if [[ "$#" -eq 1 && "$1" == --self-test-cleanup ]]; then
  run_source_self_test_v1
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
  chown chmod install mktemp mv realpath rm; do
  command -v "$cmd" >/dev/null 2>&1 || hold "missing_command:$cmd"
done
[[ "$(realpath -e -- "$0")" == "$trusted_self" ]] ||
  hold installer_not_root_trusted_path
[[ "$(stat -c '%u:%g:%a:%h:%F' "$trusted_self")" == "0:0:500:1:regular file" ]] ||
  hold installer_trusted_metadata_changed
[[ "$(stat -c '%u:%g:%a:%F' /root)" == "0:0:700:directory" ]] ||
  hold root_directory_custody_changed
trap cleanup EXIT
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
snapshot_compare_public_key_v1   "$compare_pub" /root "$compare_fpr" false '' ||
  hold compare_public_snapshot_or_fingerprint_invalid
public="$compare_public"

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
