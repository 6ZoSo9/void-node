#!/usr/bin/env bash
set -euo pipefail
KEY="${1:?key path required}"
[ -r "$KEY" ] || { echo "Key missing/unreadable: $KEY" >&2; exit 1; }
# Must be PKCS#8 PEM (BEGIN PRIVATE KEY). Ed25519 is fine; 'openssl pkey' will print info.
grep -q "BEGIN PRIVATE KEY" "$KEY" || { echo "Key is not PKCS#8 PEM: $KEY" >&2; exit 1; }
# OpenSSL parse check (silenced). Non-PKCS#8 will fail.
openssl pkey -in "$KEY" -noout >/dev/null 2>&1 || { echo "OpenSSL failed to parse key: $KEY" >&2; exit 1; }
exit 0
