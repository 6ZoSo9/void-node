#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_INSTALL_V1"
SERVICE="${SERVICE:-void-node-live.service}"
DROPIN_DIR="${HOME}/.config/systemd/user/${SERVICE}.d"
DROPIN="${DROPIN_DIR}/20-hot-runtime-quarantine.conf"

# Public-clone quarantine and canonical block production are mutually exclusive.
# Refuse before writing if the effective service or any already-installed drop-in
# marks this service as the canonical producer.
effective_env="$(systemctl --user show "$SERVICE" -p Environment --value 2>/dev/null || true)"
if printf '%s\n' "$effective_env" | tr ' ' '\n' | grep -Fxq 'VOID_CANONICAL_PRODUCER_ROLE=1'; then
  echo "${MARKER}_HOLD canonical producer role is active for ${SERVICE}" >&2
  exit 1
fi

if compgen -G "$DROPIN_DIR/*.conf" >/dev/null; then
  if grep -h -Fxq 'Environment=VOID_CANONICAL_PRODUCER_ROLE=1' "$DROPIN_DIR"/*.conf; then
    echo "${MARKER}_HOLD canonical producer drop-in is installed for ${SERVICE}" >&2
    exit 1
  fi
fi

mkdir -p "$DROPIN_DIR"

cat > "$DROPIN" <<'CONF'
[Service]
Environment=VOID_QUARANTINE_HOT_RUNTIME=1
Environment=VOID_DISABLE_WRAPPER_STORM=1
Environment=VOID_DISABLE_TERMINAL_SAVEBLOCK=1
Environment=VOID_DISABLE_TERMINAL_SAVEBLOCK_V2=1
Environment=VOID_DISABLE_TXROOT_CORE_BUCKET=1
Environment=VOID_DISABLE_TXROOT_HEADER_NOOP=1
Environment=VOID_DISABLE_EARLY_WRAPPER_FAMILY=1
Environment=VOID_DISABLE_DEDUPE_TRUTHFIX_FORENSICS=1
Environment=VOID_DISABLE_SAVEBLOCK_TAIL=1
Environment=VOID_DISABLE_FINALIZE_WAL_COMMIT=1
Environment=VOID_TXROOT_OBSERVER_DISABLE=1
Environment=VOID_TXROOT_FORENSICS_STICKY_DISABLE=1
Environment=VOID_DISABLE_DRIFT=1
Environment=VOID_DRIFT_DISABLE=1
CONF

systemctl --user daemon-reload

echo "service=${SERVICE}"
echo "dropin=${DROPIN}"
systemctl --user cat "$SERVICE" | grep -E 'VOID_QUARANTINE_HOT_RUNTIME|VOID_DISABLE_WRAPPER_STORM|VOID_DISABLE_SAVEBLOCK_TAIL' >/dev/null

echo "${MARKER}_GREEN"
