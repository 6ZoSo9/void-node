#!/usr/bin/env bash
set -euo pipefail

SVC_DIR="${HOME}/.config/systemd/user/void-node.service.d"
ARCHIVE_DIR="${SVC_DIR}/.archive"
KEEP_EXEC="/home/${USER}/.local/bin/void-proposer-autostart-http.sh"
KEEP_FILE="99-proposer-autostart-http.conf"

# Drop-ins we explicitly allow to remain (non-autostart stuff)
ALLOWLIST=(
  "10-env-data.conf"
  "10-role.conf"
  "15-key-parse-check.conf"
  "15-key-path.conf"
  "16-key-verify.conf"
  "20-noop-sidecar.conf"
  "20-port-guard.conf"
  "20-proposer.conf"
  "95-proposer-auto.conf"         # env only; harmless if present
  "98-dev-routes.conf"
  "$KEEP_FILE"
)

ts() { date -u +'%Y%m%d-%H%M%S'; }

changed=0
mkdir -p "$ARCHIVE_DIR"

# 1) Ensure KEEP_FILE exists and is exact
KEEP_PATH="${SVC_DIR}/${KEEP_FILE}"
desired="[Service]
ExecStartPost=
ExecStartPost=%h/.local/bin/void-proposer-autostart-http.sh
"
if [ ! -f "$KEEP_PATH" ] || ! diff -q <(printf "%s" "$desired") "$KEEP_PATH" >/dev/null 2>&1; then
  printf "%s" "$desired" > "$KEEP_PATH"
  echo "[molt] wrote ${KEEP_FILE}"
  changed=1
fi

# 2) Archive any ExecStartPost drop-ins that aren't KEEP_FILE
shopt -s nullglob
for f in "$SVC_DIR"/*.conf; do
  base="$(basename "$f")"

  # Skip allowed
  allow=0
  for k in "${ALLOWLIST[@]}"; do [ "$base" = "$k" ] && allow=1 && break; done
  [ $allow -eq 1 ] && continue

  # If file touches ExecStartPost or looks like autostart, archive it
  if grep -Eq '^\s*ExecStartPost=' "$f" || echo "$base" | grep -Eq '(autostart|proposer|auto)'; then
    mv -f "$f" "${ARCHIVE_DIR}/$(ts)-${base}"
    echo "[molt] archived ${base}"
    changed=1
  fi
done

# 3) Prove the effective ExecStartPost is our script; fix if not
eff=$(systemctl --user show -p ExecStartPost void-node.service | sed 's/^ExecStartPost=//; s/\\n/\n/g')
if ! printf "%s\n" "$eff" | grep -q "$KEEP_EXEC"; then
  echo "[molt] effective ExecStartPost != ${KEEP_EXEC} (will reload)"
  changed=1
fi

# 4) If anything changed: reload + restart node
if [ $changed -eq 1 ]; then
  systemctl --user daemon-reload
  systemctl --user restart void-node.service
  echo "[molt] reloaded and restarted void-node.service"
else
  echo "[molt] no changes"
fi
