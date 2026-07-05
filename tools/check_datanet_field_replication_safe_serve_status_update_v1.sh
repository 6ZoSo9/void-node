#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path
import json
import re

md = Path("docs/public/datanet-field-replication-status-card-v1.md")
html = Path("public/public-node/datanet/field-replication-status-card-v1.html")
js = Path("public/public-node/datanet/field-replication-status-card-v1.json")

for p in [md, html, js]:
    if not p.exists():
        raise SystemExit(f"missing file: {p}")

for p in [md, html, js]:
    text = p.read_text()
    for forbidden in [
        "100.122.245.125",
        "100.111.171.116",
        "zoso-Precision-Tower-7810",
        "zoso-N153B",
    ]:
        if forbidden in text:
            raise SystemExit(f"public status leaked forbidden private detail in {p}: {forbidden}")
    if re.search(r"http://100\.", text):
        raise SystemExit(f"public status leaked tailnet URL in {p}")

data = json.loads(js.read_text())
u = data.get("safe_serve_update_v1")
if not isinstance(u, dict):
    raise SystemExit("missing safe_serve_update_v1")

assert u["status"] == "green"
assert u["source_serve_command"] == "npm run public-node:serve -- --port 8088"
assert u["field_mirror_serve_command"] == "npm run public-node:serve -- --port 8089"
assert u["safe_serve_marker"] == "VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY"
assert u["field_runner_marker"] == "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN"
assert u["roundtrip_verifier_marker"] == "VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN"
assert u["verified_mirror_sha256"] == "feed57f0441871cc0a27153025808becf3f9d3a9c264a54189d0de88a2ec33cb"
assert u["serves_public_directory_only"] is True
assert u["dangerous_paths_touched"] is False
assert u["tailnet_addresses_redacted"] is True

auth = u["enabled_authorities"]
for k, v in auth.items():
    if v is not False:
        raise SystemExit(f"authority must remain false: {k}")
PY

grep -q 'VOID_DATANET_FIELD_REPLICATION_SAFE_SERVE_STATUS_UPDATE_V1' docs/public/datanet-field-replication-status-card-v1.md
grep -q 'public-node:serve -- --port 8088' docs/public/datanet-field-replication-status-card-v1.md
grep -q 'safe-serve-update-v1' public/public-node/datanet/field-replication-status-card-v1.html
grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' public/public-node/datanet/field-replication-status-card-v1.json

echo "VOID_DATANET_FIELD_REPLICATION_SAFE_SERVE_STATUS_UPDATE_V1_GREEN"
