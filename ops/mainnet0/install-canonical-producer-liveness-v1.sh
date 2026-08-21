#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_MAINNET0_CANONICAL_PRODUCER_LIVENESS_INSTALL_V1"
SERVICE="${SERVICE:-void-node-live.service}"

if [ "$SERVICE" != "void-node-live.service" ]; then
  echo "${MARKER}_HOLD unsupported service=${SERVICE}" >&2
  exit 1
fi

DROPIN_DIR="${HOME}/.config/systemd/user/${SERVICE}.d"
DROPIN="${DROPIN_DIR}/~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~CANONICAL-PRODUCER-LIVENESS-V1.conf"

mkdir -p "$DROPIN_DIR"

cat > "$DROPIN" <<'CONF'
[Service]
Environment=VOID_CANONICAL_PRODUCER_ROLE=1
Environment=VOID_QUARANTINE_HOT_RUNTIME=0
Environment=VOID_DISABLE_FINALIZE_WAL_COMMIT=0
Environment=PROPOSER_AUTO=1
Environment=VOID_PROPOSER_AUTO=1
Environment=VOID_COMMIT_DIRECT_AUTOPROP=1
Environment=VOID_COMMIT_DIRECT_AUTOPROP_V1=1
Environment=VOID_AUTOPROP=1
Environment=VOID_COMMIT_DIRECT_V2FS_AUTORUN=1
Environment=VOID_DISABLE_COMMIT_DIRECT_AUTOPROP=0
Environment=VOID_DISABLE_PROPOSER_AUTOPROP=0
Environment=VOID_DISABLE_COMMIT_DIRECT_V2FS_AUTORUN=0
Environment=VOID_CANONICAL_SELF_HTTP_GUARD=1
Environment=VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS=1
Environment=VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT=8
Environment=VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS=1500
CONF

systemctl --user daemon-reload

echo "service=${SERVICE}"
echo "dropin=${DROPIN}"
echo "restart_performed=false"
echo "${MARKER}_GREEN"
