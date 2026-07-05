#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path
import json

paths = [
    Path("docs/public/datanet-field-replication-safe-serve-runbook-v1.md"),
    Path("docs/public/datanet-field-replication-status-card-v1.md"),
    Path("public/public-node/datanet/field-replication-safe-serve-runbook-v1.html"),
    Path("public/public-node/datanet/field-replication-safe-serve-runbook-v1.json"),
    Path("public/public-node/datanet/field-replication-status-card-v1.html"),
    Path("public/public-node/datanet/field-replication-status-card-v1.json"),
    Path("public/public-node/datanet/index.json"),
]
for p in paths:
    if not p.exists():
        raise SystemExit(f"missing file: {p}")

for p in paths:
    text = p.read_text()
    for forbidden in [
        "100.122.245.125",
        "100.111.171.116",
        "zoso-Precision-Tower-7810",
        "zoso-N153B",
    ]:
        if forbidden in text:
            raise SystemExit(f"private detail leaked in {p}: {forbidden}")

runbook = json.loads(Path("public/public-node/datanet/field-replication-safe-serve-runbook-v1.json").read_text())
assert runbook["status"] == "green"
assert runbook["public_html_path"] == "/public-node/datanet/field-replication-safe-serve-runbook-v1.html"
assert runbook["private_tailnet_details_redacted"] is True
for key, value in runbook["dangerous_authorities_enabled"].items():
    if value is not False:
        raise SystemExit(f"runbook authority enabled unexpectedly: {key}")

status = json.loads(Path("public/public-node/datanet/field-replication-status-card-v1.json").read_text())
assert status["safe_serve_runbook_discovery_v1"]["public_html_path"] == "/public-node/datanet/field-replication-safe-serve-runbook-v1.html"

index = json.loads(Path("public/public-node/datanet/index.json").read_text())
assert index["field_replication_safe_serve_runbook_v1"]["public_html_path"] == "/public-node/datanet/field-replication-safe-serve-runbook-v1.html"
PY

grep -Fq 'VOID_DATANET_FIELD_REPLICATION_SAFE_SERVE_RUNBOOK_DISCOVERY_V1' docs/public/datanet-field-replication-status-card-v1.md
grep -Fq 'field-replication-safe-serve-runbook-v1.html' public/public-node/datanet/field-replication-status-card-v1.html
grep -Fq 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' public/public-node/datanet/field-replication-safe-serve-runbook-v1.html
grep -Fq 'field_replication_safe_serve_runbook_v1' public/public-node/datanet/index.json

echo "VOID_DATANET_FIELD_REPLICATION_SAFE_SERVE_RUNBOOK_DISCOVERY_V1_GREEN"
