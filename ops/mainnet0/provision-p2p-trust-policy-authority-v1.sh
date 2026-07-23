#!/usr/bin/env bash
set -euo pipefail

umask 077

AUTHORITY_DIR="${1:-${VOID_P2P_TRUST_POLICY_AUTHORITY_DIR:-$HOME/.void/p2p-trust-policy-authority-v1}}"
NETWORK_ID="${2:-${VOID_P2P_TRUST_POLICY_NETWORK_ID:-void-mainnet0-chain2050}}"
KEY_FILE="$AUTHORITY_DIR/trust-authority-ed25519.key.pem"
PUBLIC_FILE="$AUTHORITY_DIR/trust-authority-ed25519.pub.pem"
ROOT_SET_FILE="$AUTHORITY_DIR/trust-root-set-v1.json"

[[ "$NETWORK_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$ ]] || {
  echo "HOLD: invalid VOID network ID" >&2
  exit 1
}

for target in "$KEY_FILE" "$PUBLIC_FILE" "$ROOT_SET_FILE"; do
  if [[ -e "$target" || -L "$target" ]]; then
    echo "HOLD: refusing to overwrite existing trust authority material: $target" >&2
    exit 1
  fi
done

command -v openssl >/dev/null 2>&1 || {
  echo "HOLD: openssl is required" >&2
  exit 1
}
command -v node >/dev/null 2>&1 || {
  echo "HOLD: node is required" >&2
  exit 1
}

mkdir -p "$AUTHORITY_DIR"
chmod 0700 "$AUTHORITY_DIR"

created=()
cleanup_on_error() {
  local status=$?
  if [[ $status -ne 0 ]]; then
    for target in "${created[@]:-}"; do
      rm -f -- "$target"
    done
  fi
  exit "$status"
}
trap cleanup_on_error EXIT

openssl genpkey -algorithm ED25519 -out "$KEY_FILE"
created+=("$KEY_FILE")
chmod 0600 "$KEY_FILE"

openssl pkey -in "$KEY_FILE" -pubout -out "$PUBLIC_FILE"
created+=("$PUBLIC_FILE")
chmod 0600 "$PUBLIC_FILE"

KEY_FILE="$KEY_FILE" PUBLIC_FILE="$PUBLIC_FILE" ROOT_SET_FILE="$ROOT_SET_FILE" NETWORK_ID="$NETWORK_ID" node <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");

const keyFile = process.env.KEY_FILE;
const publicFile = process.env.PUBLIC_FILE;
const rootSetFile = process.env.ROOT_SET_FILE;
const networkId = process.env.NETWORK_ID;
if (!keyFile || !publicFile || !rootSetFile || !networkId) {
  throw new Error("authority provisioning environment is incomplete");
}
const publicKeyPem = fs.readFileSync(publicFile, "utf8");
const key = crypto.createPublicKey(publicKeyPem);
if (key.asymmetricKeyType !== "ed25519") {
  throw new Error("generated authority key is not Ed25519");
}
const keyId = crypto
  .createHash("sha256")
  .update(key.export({ type: "spki", format: "der" }))
  .digest("hex");
const rootSet = {
  schema: "void-p2p-trust-root-set-v1",
  network_id: networkId,
  threshold: 1,
  keys: [{ key_id: keyId, public_key_pem: publicKeyPem }],
};
fs.writeFileSync(rootSetFile, `${JSON.stringify(rootSet, null, 2)}\n`, {
  flag: "wx",
  mode: 0o600,
});
console.log(JSON.stringify({ key_id: keyId, root_set_file: rootSetFile }));
NODE
created+=("$ROOT_SET_FILE")
chmod 0600 "$ROOT_SET_FILE"

trap - EXIT
printf '%s\n' "VOID_P2P_TRUST_POLICY_AUTHORITY_V1_PROVISIONED"
printf 'authority_dir=%s\n' "$AUTHORITY_DIR"
printf 'network_id=%s\n' "$NETWORK_ID"
printf 'private_key_file=%s\n' "$KEY_FILE"
printf 'public_key_file=%s\n' "$PUBLIC_FILE"
printf 'root_set_file=%s\n' "$ROOT_SET_FILE"
printf '%s\n' "OFFLINE_ONLY_DO_NOT_COPY_PRIVATE_KEY_TO_RUNTIME_NODE"
