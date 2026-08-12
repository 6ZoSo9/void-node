#!/usr/bin/env bash
set -euo pipefail

marker="VOID_PUBLIC_REPO_HYGIENE_V1_GREEN"
bad=0

is_allowed_env_template() {
  case "$1" in
    .env.example|.env.template|.env.sample|*.env.example|*.env.template|*.env.sample|example.env|sample.env|template.env)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

while IFS= read -r -d '' path; do
  base="${path##*/}"
  reason=""

  case "$base" in
    *.bak|*.bak.*|*.bak-*|*.backup|*.backup.*|*.broken|*.broken.*|*.BROKEN|*.BROKEN.*|*.orig|*.prepatch|*.prepatch.*|*.rej|*~)
      reason="backup/patch artifact"
      ;;
    .nodeid|.nodeid.*|.nodeid-*|.nodeid_*|.nodekey|.nodekey.*|.nodekey-*|.nodekey_*)
      reason="node identity/key artifact"
      ;;
    .peerstore.json|peerstore.json|*.peerstore.json)
      reason="peerstore artifact"
      ;;
    .env|.env.*|*.env|*.env.*)
      if ! is_allowed_env_template "$base"; then
        reason="environment/secret artifact"
      fi
      ;;
    backup_*.tgz|backup_*.tar|backup_*.tar.gz|backup_*.zip)
      reason="backup archive artifact"
      ;;
    catchup_*.ndjson|export_*.ndjson)
      reason="runtime export/catchup dump"
      ;;
    journal-txroot-*.txt)
      reason="runtime txroot journal"
      ;;
  esac

  case "$path" in
    void-node@*)
      reason="root local service/runtime artifact"
      ;;
  esac

  if [[ -n "$reason" ]]; then
    printf 'public repo hygiene violation: %s: %s\n' "$reason" "$path" >&2
    bad=1
  fi
done < <(git ls-files -z)

if [[ "$bad" -ne 0 ]]; then
  printf 'VOID_PUBLIC_REPO_HYGIENE_V1_FAIL\n' >&2
  exit 1
fi

printf '%s\n' "$marker"
