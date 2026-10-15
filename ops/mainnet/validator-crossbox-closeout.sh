#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

MARKER="VOID_VALIDATOR_CROSSBOX_CLOSEOUT_V1"
EPOCH="${1:?usage: validator-crossbox-closeout.sh <epoch> <vaultName>}"
VAULT="${2:?usage: validator-crossbox-closeout.sh <epoch> <vaultName>}"
CROSSBOX_SSH_TARGET="${CROSSBOX_SSH_TARGET:-${ALIEN:-}}"
CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT="${CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT:-}"
ROOT="${VOID_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
JOURNAL_EXECUTOR="$ROOT/tools/void-validator-crossbox-transaction-executor-v1.mjs"

hold(){
  echo "$MARKER HOLD: $*" >&2
  exit 2
}

valid_ssh_target(){
  local target="$1"
  [[ "$target" =~ ^([A-Za-z0-9][A-Za-z0-9._-]*@)?[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
}

[ -n "$CROSSBOX_SSH_TARGET" ] ||
  hold "missing explicit CROSSBOX_SSH_TARGET (or legacy ALIEN)"
valid_ssh_target "$CROSSBOX_SSH_TARGET" ||
  hold "invalid explicit CROSSBOX_SSH_TARGET"
[[ "$EPOCH" =~ ^[1-9][0-9]{0,5}$ ]] ||
  hold "epoch must be a canonical positive integer <= 6 digits"
[[ "$VAULT" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$ ]] ||
  hold "vault name is unsafe"

target_guard="$(printf '%s' "$CROSSBOX_SSH_TARGET" | tr '[:upper:]' '[:lower:]')"
case "$target_guard" in
  *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
    hold "retired Alienware target is forbidden"
    ;;
esac

[ "$CONFIRM_VALIDATOR_CROSSBOX_CLOSEOUT" = "publishValidatorCrossboxCloseoutV1" ] ||
  hold "confirmation token required"

[ -f "$JOURNAL_EXECUTOR" ] ||
  hold "reviewed validator transaction journal unavailable"

echo "$MARKER"
echo "legacy_sequential_mutation_retired=true"
echo "epoch=$EPOCH"
echo "vault=$VAULT"
echo "explicit_remote_target_validated=true"
echo "reviewed_transaction_journal_present=true"
echo "transaction_journal_marker=VOID_VALIDATOR_CROSSBOX_TRANSACTION_EXECUTOR_V1"
echo "two_participant_prepare_required=true"
echo "durable_publish_intent_required=true"
echo "observation_first_recovery_required=true"
echo "checkpoint_after_two_party_commit_only=true"
echo "ssh_execution=false"
echo "systemd_mutation=false"
echo "validator_publication=false"
echo "git_tag_or_push=false"
echo "runtime_mutation=false"
echo "credential_or_key_access=false"
echo "transaction_broadcast=false"
echo "funds_movement=false"

hold "validator transaction live integration required; legacy sequential closeout is retired"
