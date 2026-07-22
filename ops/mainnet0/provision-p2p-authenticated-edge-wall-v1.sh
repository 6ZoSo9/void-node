#!/usr/bin/env bash
set -euo pipefail
umask 077

MARKER="VOID_P2P_AUTHENTICATED_EDGE_WALL_IDENTITY_V1_PROVISIONED"
TARGET_DIR="${1:-${VOID_P2P_EDGE_IDENTITY_DIR:-$HOME/.void/p2p-edge-wall-v1}}"

command -v openssl >/dev/null 2>&1 || {
  echo "HOLD: openssl is required" >&2
  exit 1
}
command -v sha256sum >/dev/null 2>&1 || {
  echo "HOLD: sha256sum is required" >&2
  exit 1
}

if [[ -L "$TARGET_DIR" ]]; then
  echo "HOLD: identity directory cannot be a symlink: $TARGET_DIR" >&2
  exit 1
fi
mkdir -p -- "$TARGET_DIR"
chmod 700 -- "$TARGET_DIR"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd -P)"

KEY_FILE="$TARGET_DIR/edge-identity-ed25519.key.pem"
CERT_FILE="$TARGET_DIR/edge-identity-ed25519.cert.pem"
META_FILE="$TARGET_DIR/edge-identity-v1.json"

for path in "$KEY_FILE" "$CERT_FILE" "$META_FILE"; do
  if [[ -e "$path" || -L "$path" ]]; then
    echo "HOLD: refusing to overwrite existing identity material: $path" >&2
    exit 1
  fi
done

TMP_DIR="$(mktemp -d "$TARGET_DIR/.provision.XXXXXX")"
cleanup() {
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

TMP_KEY="$TMP_DIR/key.pem"
TMP_CERT="$TMP_DIR/cert.pem"
TMP_META="$TMP_DIR/meta.json"

openssl genpkey -algorithm ED25519 -out "$TMP_KEY" >/dev/null 2>&1
openssl req \
  -new \
  -x509 \
  -key "$TMP_KEY" \
  -out "$TMP_CERT" \
  -days "${VOID_P2P_EDGE_WALL_CERT_DAYS:-3650}" \
  -subj "/CN=void-p2p-authenticated-edge-wall-v1" \
  >/dev/null 2>&1

chmod 600 "$TMP_KEY" "$TMP_CERT"

NODE_ID="$({ openssl x509 -in "$TMP_CERT" -pubkey -noout; } \
  | openssl pkey -pubin -outform DER 2>/dev/null \
  | sha256sum \
  | awk '{print $1}')"
FINGERPRINT256="$(openssl x509 -in "$TMP_CERT" -noout -fingerprint -sha256 \
  | cut -d= -f2 \
  | tr -d ':' \
  | tr '[:upper:]' '[:lower:]')"
NOT_BEFORE="$(openssl x509 -in "$TMP_CERT" -noout -startdate | cut -d= -f2-)"
NOT_AFTER="$(openssl x509 -in "$TMP_CERT" -noout -enddate | cut -d= -f2-)"

[[ "$NODE_ID" =~ ^[0-9a-f]{64}$ ]] || {
  echo "HOLD: generated node id is malformed" >&2
  exit 1
}
[[ "$FINGERPRINT256" =~ ^[0-9a-f]{64}$ ]] || {
  echo "HOLD: generated certificate fingerprint is malformed" >&2
  exit 1
}

python3 - "$TMP_META" "$NODE_ID" "$FINGERPRINT256" "$NOT_BEFORE" "$NOT_AFTER" <<'PY'
import json
import sys
from pathlib import Path

out, node_id, fingerprint, not_before, not_after = sys.argv[1:]
payload = {
    "marker": "VOID_P2P_AUTHENTICATED_EDGE_WALL_IDENTITY_V1",
    "algorithm": "Ed25519",
    "node_id_der_spki_sha256": node_id,
    "certificate_fingerprint_sha256": fingerprint,
    "certificate_not_before": not_before,
    "certificate_not_after": not_after,
    "private_key_exported": False,
}
Path(out).write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
chmod 600 "$TMP_META"

mv -- "$TMP_KEY" "$KEY_FILE"
mv -- "$TMP_CERT" "$CERT_FILE"
mv -- "$TMP_META" "$META_FILE"
trap - EXIT
rmdir -- "$TMP_DIR"

KEY_SHA256="$(sha256sum "$KEY_FILE" | awk '{print $1}')"
CERT_SHA256="$(sha256sum "$CERT_FILE" | awk '{print $1}')"
META_SHA256="$(sha256sum "$META_FILE" | awk '{print $1}')"

echo "=== VOID P2P AUTHENTICATED EDGE WALL IDENTITY V1 ==="
echo "identity_dir=$TARGET_DIR"
echo "key_file=$KEY_FILE"
echo "cert_file=$CERT_FILE"
echo "metadata_file=$META_FILE"
echo "node_id=$NODE_ID"
echo "fingerprint256=$FINGERPRINT256"
echo "key_sha256=$KEY_SHA256"
echo "cert_sha256=$CERT_SHA256"
echo "metadata_sha256=$META_SHA256"
echo "private_key_printed=false"
echo "private_key_exported=false"
echo "identity_overwritten=false"
echo "$MARKER"
