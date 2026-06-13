#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-tester-ask-export-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_TESTER_ASK_EXPORT_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

curl -fsS "$LOCAL_BASE/public-node/first-tester-request-copy-pack.json" > "$OUT/first-tester-request-copy-pack.json"

python3 - "$OUT/first-tester-request-copy-pack.json" "$OUT" <<'PY'
import json, sys
from pathlib import Path

pack_path = Path(sys.argv[1])
out = Path(sys.argv[2])

pack = json.loads(pack_path.read_text())

assert pack.get("marker") == "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1"
assert pack.get("status") == "first_tester_request_copy_ready"
assert pack.get("expected_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert pack.get("expected_receipt_file") == "tester-receipt.json"

base = pack.get("effective_base_url")
assert base and base != "http://127.0.0.1:4100", "effective_base_url is still localhost"

links = pack.get("tester_links", {})
copy = pack.get("copy", {})

required_copy = ["reddit_title", "reddit_post", "x_post", "short_dm", "github_blurb"]
for key in required_copy:
    assert copy.get(key), f"missing copy.{key}"

assert links.get("tester_share_page", "").startswith(base)
assert "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" in copy["reddit_post"]
assert "tester-receipt.json" in copy["reddit_post"]

(out / "reddit-title.txt").write_text(copy["reddit_title"] + "\n")
(out / "reddit-post.txt").write_text(copy["reddit_post"].replace("\\n", "\n") + "\n")
(out / "x-post.txt").write_text(copy["x_post"] + "\n")
(out / "short-dm.txt").write_text(copy["short_dm"] + "\n")
(out / "github-blurb.txt").write_text(copy["github_blurb"] + "\n")
(out / "tester-share-url.txt").write_text(links["tester_share_page"] + "\n")
(out / "expected-green-marker.txt").write_text(pack["expected_green_marker"] + "\n")

print("copy_export_checks=green")
print(f"effective_base_url={base}")
print(f"tester_share_page={links['tester_share_page']}")
PY

echo "reddit_title=$OUT/reddit-title.txt"
echo "reddit_post=$OUT/reddit-post.txt"
echo "x_post=$OUT/x-post.txt"
echo "short_dm=$OUT/short-dm.txt"
echo "github_blurb=$OUT/github-blurb.txt"
echo "tester_share_url=$OUT/tester-share-url.txt"
echo "VOID_PUBLIC_NODE_FIRST_TESTER_ASK_EXPORT_V1_GREEN"
