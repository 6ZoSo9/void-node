#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path
import json

paths = [
    Path("public/public-node/datanet/field-replication-proof-bundle-public-summary-v1.json"),
    Path("public/public-node/datanet/field-replication-status-card-v1.json"),
    Path("public/public-node/datanet/index.json"),
]

for p in paths:
    text = p.read_text()
    obj = json.loads(text)
    expected = json.dumps(obj, indent=2, sort_keys=True) + "\n"
    if text != expected:
        raise SystemExit(f"not pretty-formatted canonical JSON: {p}")
    if len(text.splitlines()) < 10:
        raise SystemExit(f"unexpected compact JSON remains: {p}")

summary = json.loads(paths[0].read_text())
assert summary["proof_sha256"] == "3bb7aa11db647ad9fc7dee0daba17f8a1339c007be5a5b6a23618a22d5bcb7da"
assert summary["source_bundle_sha256"] == "03bf18824fee9baacc3d63c0fbe2e75b8f89d5f5bc1d15731d1f5459890634f2"
assert summary["bounded_report"]["artifacts_observed"] == 500
assert summary["bounded_report"]["total_candidates_observed"] == 688
assert summary["bounded_report"]["truncated"] is True
assert summary["public_safe"] is True

print("VOID_DATANET_PUBLIC_JSON_PRETTY_FORMAT_V1_GREEN")
PY
