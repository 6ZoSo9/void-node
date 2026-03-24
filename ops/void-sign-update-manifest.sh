#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="${REPO:-$HOME/dev/void-node}"
MANIFEST="${1:-$REPO/config/update-manifest.v0.json}"
PRIVKEY="${2:-$REPO/.secrets/update-ed25519.v1.pem}"

if [ ! -f "$MANIFEST" ]; then
  echo "[err] manifest not found: $MANIFEST" >&2
  exit 1
fi

if [ ! -f "$PRIVKEY" ]; then
  echo "[err] signing key not found: $PRIVKEY" >&2
  exit 1
fi

python3 - "$MANIFEST" "$PRIVKEY" <<'PY'
import base64, json, sys
from pathlib import Path

manifest_path = Path(sys.argv[1])
privkey_path = Path(sys.argv[2])

m = json.loads(manifest_path.read_text())

payload = {
    "version": str(m.get("version", "")),
    "protocol_version": int(m.get("protocol_version", 0)),
    "min_protocol_version": int(m.get("min_protocol_version", 0)),
    "channel": str(m.get("channel", "")),
    "published_at": str(m.get("published_at", "")),
    "notes": str(m.get("notes", "")),
}
payload_json = json.dumps(payload, separators=(",", ":")).encode()

sig_b64 = base64.b64encode(
    __import__("subprocess").check_output(
        [
            "openssl", "pkeyutl",
            "-sign",
            "-rawin",
            "-inkey", str(privkey_path),
        ],
        input=payload_json,
    )
).decode()

m.setdefault("signature", {})
m["signature"]["alg"] = "ed25519"
m["signature"]["key_id"] = m.get("signature", {}).get("key_id", "dev-ed25519-local-v1")
m["signature"]["sig"] = sig_b64

manifest_path.write_text(json.dumps(m, indent=2) + "\n")
print("[ok] signed", manifest_path)
print("[ok] payload", json.dumps(payload, separators=(",", ":")))
print("[ok] sig_b64_len", len(sig_b64))
PY
