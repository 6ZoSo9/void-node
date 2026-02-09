#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/home/zoso/dev/void-node}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${TEXTFILE_DIR%/}/void_mainnet_keys.prom"
TMP="${TEXTFILE_DIR%/}/.void_mainnet_keys.prom.tmp.$$"

LIVE_GLOB="*live*.json"
LIVE_FILE="config/void-mainnet-bootstrap-mainnet.live.json"
ROLES_MAP="/mnt/voidkey/meta/mainnet-roles-mapping.txt"

install -d "$TEXTFILE_DIR"
cd "$REPO_ROOT" || { echo "[keys] missing repo: $REPO_ROOT" >&2; exit 1; }

# Use per-invocation safe.directory so root can run git in zoso-owned repo without global config edits.
GIT=(git -c "safe.directory=$REPO_ROOT" -C "$REPO_ROOT")

repo_present=0
livejson_present=0
livejson_tracked=0
roles_ok=0
dev_key_present=0
health=0

[ -d "$REPO_ROOT/.git" ] && repo_present=1 || true

# any live json exists?
if find "$REPO_ROOT" -maxdepth 4 -type f -name "$LIVE_GLOB" -print -quit | grep -q .; then
  livejson_present=1
fi

# tracked live json? (prefer canonical file)
if [ -f "$LIVE_FILE" ] && "${GIT[@]}" ls-files --error-unmatch "$LIVE_FILE" >/dev/null 2>&1; then
  livejson_tracked=1
else
  # fallback: any tracked live json
  if "${GIT[@]}" ls-files "$LIVE_GLOB" | head -n 1 | grep -q .; then
    livejson_tracked=1
  fi
fi

[ -e "$ROLES_MAP" ] && dev_key_present=1 || true

# keep roles_ok lenient (same as you already had)
if [ "$repo_present" = "1" ] && [ "$livejson_present" = "1" ] && [ -e "$ROLES_MAP" ]; then
  roles_ok=1
fi

# health: exporter ran + repo exists + roles_ok
if [ "$repo_present" = "1" ] && [ "$roles_ok" = "1" ]; then
  health=1
fi

ts="$(date +%s)"

cat >"$TMP" <<EOF
# HELP void_mainnet_keys_exporter_up Exporter ran successfully (1=yes).
# TYPE void_mainnet_keys_exporter_up gauge
void_mainnet_keys_exporter_up 1
# HELP void_mainnet_keys_exporter_ts_seconds Exporter timestamp (unix seconds).
# TYPE void_mainnet_keys_exporter_ts_seconds gauge
void_mainnet_keys_exporter_ts_seconds $ts
# HELP void_mainnet_keys_health Keys pillar health (1=healthy).
# TYPE void_mainnet_keys_health gauge
void_mainnet_keys_health $health
# HELP void_mainnet_keys_repo_present Repo present (1=yes).
# TYPE void_mainnet_keys_repo_present gauge
void_mainnet_keys_repo_present $repo_present
# HELP void_mainnet_keys_livejson_present Any *live*.json exists under repo (1=yes). (Informational)
# TYPE void_mainnet_keys_livejson_present gauge
void_mainnet_keys_livejson_present $livejson_present
# HELP void_mainnet_keys_livejson_tracked Any *live*.json is TRACKED by git (1=yes). (Hard fail)
# TYPE void_mainnet_keys_livejson_tracked gauge
void_mainnet_keys_livejson_tracked $livejson_tracked
# HELP void_mainnet_keys_dev_key_present Dev key / roles mapping present (1=yes).
# TYPE void_mainnet_keys_dev_key_present gauge
void_mainnet_keys_dev_key_present $dev_key_present
# HELP void_mainnet_keys_roles_ok Keys pillar gating (1=ok).
# TYPE void_mainnet_keys_roles_ok gauge
void_mainnet_keys_roles_ok $roles_ok
EOF

mv -f "$TMP" "$OUT"
