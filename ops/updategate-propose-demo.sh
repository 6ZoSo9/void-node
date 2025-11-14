#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <protocolVersion> <minCompat> [--emergency]" >&2
  exit 1
fi

PV="$1"
MC="$2"
shift 2

EMERGENCY=false
if [ "${1:-}" = "--emergency" ]; then
  EMERGENCY=true
fi

tmp_manifest="$(mktemp /tmp/update-manifest-v${PV}.XXXXXX.json)"

echo "[1] generating manifest -> $tmp_manifest"
node ops/new-update-manifest.mjs "$PV" "$MC" > "$tmp_manifest"

echo
echo "[1] manifest (head):"
sed -n '1,40p' "$tmp_manifest"

echo
echo "[2] manifest hash:"
node ops/update-manifest-hash.mjs "$tmp_manifest"

manifest_hash="$(node ops/update-manifest-hash.mjs "$tmp_manifest" \
  | awk '/manifestHash:/ {print $2}' | tail -n1)"

if [ -z "$manifest_hash" ]; then
  echo "[ERR] could not parse manifestHash" >&2
  exit 1
fi

echo
echo "[2] parsed manifestHash: $manifest_hash"

echo
echo "[3] EIP-712 ticket for signers:"
if [ "$EMERGENCY" = true ]; then
  node ops/update-ticket-print.mjs "$tmp_manifest" --emergency
else
  node ops/update-ticket-print.mjs "$tmp_manifest"
fi

echo
echo "[4] sample cast send (fill RPC, contract, key):"
echo
cat <<EOF
# Fill these before sending:
CONTRACT=0xYourUpdateGateAddress
RPC_URL=https://your.rpc

cast send \\
  --rpc-url "\$RPC_URL" \\
  --private-key "<SIGNER_KEY>" \\
  "\$CONTRACT" \\
  "proposeUpdate(bytes32,string,uint32,uint32,bool)" \\
  "$manifest_hash" "void-node" $PV $MC $([ "$EMERGENCY" = true ] && echo true || echo false)
EOF

echo
echo "[done] tmp manifest left at: $tmp_manifest"
