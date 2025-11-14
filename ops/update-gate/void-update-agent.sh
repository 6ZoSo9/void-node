#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
VALIDATOR="$REPO/ops/update-gate/void-update-validate.sh"

if [[ ! -x "$VALIDATOR" ]]; then
  echo "[ERR] missing validator: $VALIDATOR" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <manifest.json>" >&2
  exit 1
fi

MANIFEST="$1"

if [[ ! -f "$MANIFEST" ]]; then
  echo "[ERR] manifest not found: $MANIFEST" >&2
  exit 1
fi

# Normalize to absolute path for logging
MANIFEST="$(realpath "$MANIFEST")"

echo "[update-agent] manifest: $MANIFEST"

# 1) Structural validation
"$VALIDATOR" "$MANIFEST"

# 2) Extract relevant fields
app=$(jq -r '.app' "$MANIFEST")
network=$(jq -r '.network' "$MANIFEST")
chainId=$(jq -r '.chainId' "$MANIFEST")
version=$(jq -r '.version' "$MANIFEST")
proto=$(jq -r '.protocolVersion' "$MANIFEST")
minProto=$(jq -r '.minProtocolCompatible' "$MANIFEST")
height=$(jq -r '.activationHeight' "$MANIFEST")
start=$(jq -r '.rolloutStartTime' "$MANIFEST")
deadline=$(jq -r '.deadline' "$MANIFEST")
url=$(jq -r '.binaryUrl' "$MANIFEST")
sha=$(jq -r '.binarySha256' "$MANIFEST")
notes=$(jq -r '.notesHash' "$MANIFEST")
emergency=$(jq -r '.emergency' "$MANIFEST")

echo
echo "[update-agent] Parsed manifest:"
echo "  app:                 $app"
echo "  network:             $network"
echo "  chainId:             $chainId"
echo "  version:             $version"
echo "  protocolVersion:     $proto"
echo "  minProtocolCompat:   $minProto"
echo "  activationHeight:    $height"
echo "  rolloutStartTime:    $start"
echo "  deadline:            $deadline"
echo "  binaryUrl:           $url"
echo "  binarySha256:        $sha"
echo "  notesHash:           $notes"
echo "  emergency:           $emergency"

echo
echo "[update-agent] Dry-run plan (no changes applied):"
echo "  1) BEFORE rolloutStartTime:"
echo "     - Operator fetches binary from:"
echo "         $url"
echo "     - Verifies SHA256 matches:"
echo "         $sha"
echo "     - Places binary under a versioned dir, e.g.:"
echo "         /opt/void-node/releases/$version/"
echo
echo "  2) BETWEEN rolloutStartTime and deadline:"
echo "     - Node-local updater (future) will:"
echo "         - Check on-chain UpdateGate policy"
echo "         - Confirm this manifest is approved & signed"
echo "         - Confirm protocolVersion/minProtocolCompatible are sane"
echo
echo "  3) AT activationHeight=$height:"
echo "     - Node SHOULD restart into the new binary IF:"
echo "         - Local integrity checks pass"
echo "         - Policy (UpdateGate) gives the green light"
echo "     - If the new binary fails, node MUST rollback and keep running old version."
echo
echo "  4) EMERGENCY=$emergency:"
echo "     - If true, future policy may allow shorter timelocks but still:"
echo "         - NO global stop"
echo "         - Only coordinated forward movement to a fixed version."
echo
echo "[update-agent] NOTE: This script is read-only. It does NOT stop or restart the node."
