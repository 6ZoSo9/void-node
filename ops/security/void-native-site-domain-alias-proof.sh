#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/void-native-site-domain-alias-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== VOID-native site domain alias proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

grep -q 'domains_are_replaceable_aliases_not_identity' src/index.ts
grep -q 'VOID/DataNet site manifest and content root' src/index.ts
grep -q 'voidchain.void' src/index.ts
grep -q 'nullfeed.void' src/index.ts

npm run build --if-present

systemctl --user restart void-node.service
sleep 5

curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready.json"

for site in voidchain nullfeed; do
  curl -fsS --max-time 8 "$BASE/__void/site-manifest/$site.json" > "$OUT/$site.manifest.json"
done

python3 - "$OUT" <<'PY'
import json
import pathlib
import sys

out = pathlib.Path(sys.argv[1])

for site in ["voidchain", "nullfeed"]:
    j = json.load(open(out / f"{site}.manifest.json"))

    assert j["ok"] is True
    assert j["site"] == site
    assert j["canonical_site_id"] == site
    assert j["domain_alias_model"] == "domains_are_replaceable_aliases_not_identity"
    assert j["identity_authority"] == "VOID/DataNet site manifest and content root"
    assert j["datanet_backed"] is True
    assert j["google_cloud_required"] is False
    assert j["external_cloud_canonical"] is False

    aliases = j["public_aliases"]
    assert isinstance(aliases, list)
    assert len(aliases) >= 3

    if site == "voidchain":
        assert "voidchain.io" in aliases
        assert "voidchain.void" in aliases
    else:
        assert "nullfeed.io" in aliases
        assert "nullfeed.void" in aliases

print("[ok] domain aliases are replaceable and site identity remains VOID/DataNet rooted")
PY

make mainnet0-status-smoke

echo "=== VOID-native site domain alias proof OK ==="
