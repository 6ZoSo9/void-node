#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-first-external-receipt-packet-archive-$STAMP}"

mkdir -p "$OUT"

EXPORT_OUT="$OUT/export"
LOCAL_BASE="$LOCAL_BASE" OUT="$EXPORT_OUT" ops/mainnet0/public-node-first-external-receipt-packet-export.sh > "$OUT/packet-export.log"

PACKET_DIR="$EXPORT_OUT/first-external-receipt-packet"
ARCHIVE="$OUT/first-external-receipt-packet.tar.gz"
SHA256_FILE="$OUT/first-external-receipt-packet.tar.gz.sha256"

test -d "$PACKET_DIR"
test -s "$PACKET_DIR/README.txt"
test -s "$PACKET_DIR/packet-manifest.json"

tar -C "$EXPORT_OUT" -czf "$ARCHIVE" first-external-receipt-packet
sha256sum "$ARCHIVE" > "$SHA256_FILE"

python3 - "$PACKET_DIR" "$ARCHIVE" "$SHA256_FILE" <<'PY'
import json
import sys
from pathlib import Path

packet_dir = Path(sys.argv[1])
archive = Path(sys.argv[2])
sha256_file = Path(sys.argv[3])

manifest = json.loads((packet_dir / "packet-manifest.json").read_text())
ask = json.loads((packet_dir / "first-external-receipt-ask.json").read_text())

assert manifest["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1"
assert manifest["status"] == "first_external_receipt_packet_ready"
assert ask["expected_receipt_file"] == "tester-receipt.json"
assert ask["expected_green_marker"] == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert manifest["closeout_status"] == ask["closeout_status"]
assert not manifest["closeout_status"].startswith("http://127.0.0.1:4100")
assert archive.exists() and archive.stat().st_size > 0
assert sha256_file.exists() and sha256_file.stat().st_size > 0

digest_line = sha256_file.read_text().strip()
digest, name = digest_line.split(maxsplit=1)
assert len(digest) == 64
assert all(c in "0123456789abcdef" for c in digest.lower())
assert name.endswith("first-external-receipt-packet.tar.gz")

archive_manifest = {
    "marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_V1",
    "purpose": "public_node_first_external_receipt_packet_archive",
    "status": "first_external_receipt_packet_archive_ready",
    "archive": str(archive),
    "sha256_file": str(sha256_file),
    "sha256": digest,
    "packet_manifest": str(packet_dir / "packet-manifest.json"),
    "tester_share_page": manifest["tester_share_page"],
    "closeout_status": manifest["closeout_status"],
    "expected_green_marker": "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN",
    "expected_receipt_file": "tester-receipt.json",
    "public_upload": False,
    "operator_local_import_only": True,
    "trusted_as_network_truth": False,
}

(packet_dir / "archive-manifest.json").write_text(json.dumps(archive_manifest, indent=2, sort_keys=True) + "\n")

print("marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_V1")
print("status=first_external_receipt_packet_archive_ready")
print(f"archive={archive}")
print(f"sha256_file={sha256_file}")
print(f"sha256={digest}")
print(f"tester_share_page={manifest['tester_share_page']}")
print(f"closeout_status={manifest['closeout_status']}")
print("expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN")
print("expected_receipt_file=tester-receipt.json")
print("public_upload=false")
print("operator_local_import_only=true")
print("trusted_as_network_truth=false")
PY

echo "out=$OUT"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_V1_GREEN"
