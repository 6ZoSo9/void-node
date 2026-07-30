#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_DATANET_PAID_READ_QUOTE_PUBLIC_DISCOVERY_V1"
RESULT="VOID_DATANET_PAID_READ_QUOTE_PUBLIC_DISCOVERY_V1_GREEN"

INDEX="public/public-node/datanet/index.json"
CARD="public/public-node/datanet/paid-read-quote-v1.json"
SCHEMA="public/public-node/datanet/paid-read-quote-v1.schema.json"
DOC="docs/public-node/datanet/datanet-paid-read-quote-public-discovery-v1.md"
PROOF="ops/mainnet0/void-datanet-paid-read-quote-public-discovery-v1-proof.sh"
WORKFLOW=".github/workflows/void-datanet-paid-read-quote-public-discovery-v1.yml"
TOOL="tools/void-datanet-paid-read-quote-v1.mjs"
TOOL_PROOF="scripts/prove_void_datanet_paid_read_quote_v1.mjs"
CATALOG="src/paid_services/datanet_service_catalog_v1.ts"

TOOL_SHA="526ea86e78b542a07139b49b79f091db5bf4f26e04ac459e2483e05e7da3c6d0"
TOOL_PROOF_SHA="331b73abe35c82c7f8696b111f95a204434039f2051a6cafe76f3cf536be6263"
CATALOG_SHA="452c777bd21f22cfb596276e1a75b923fc1cfb45371f2fbec6a5cde020eabdff"
CANONICAL_SAMPLE_SHA="d0343ce33cccdfd9f6de239c47d617fe9716570e8d24bb6edae3ffab897f96cf"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$SCHEMA" >/dev/null
echo "json_parse_green=true"

echo "== exact source contract =="
test "$(sha256sum "$TOOL" | awk '{print $1}')" = "$TOOL_SHA"
test "$(sha256sum "$TOOL_PROOF" | awk '{print $1}')" = "$TOOL_PROOF_SHA"
test "$(sha256sum "$CATALOG" | awk '{print $1}')" = "$CATALOG_SHA"
echo "source_contract_green=true"

echo "== file presence =="
test -f "$DOC"
test -f "$PROOF"
test -f "$WORKFLOW"
echo "files_green=true"

echo "== index, card, and schema binding =="
python3 - "$INDEX" "$CARD" "$SCHEMA" <<'PY'
import json
import re
import sys
from pathlib import Path

index_path, card_path, schema_path = map(Path, sys.argv[1:])
index = json.loads(index_path.read_text())
card = json.loads(card_path.read_text())
schema = json.loads(schema_path.read_text())

assert index["schema"] == "void.public_node.datanet.index.v1"
assert index["marker"] == "VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_CARD_HOLD_V1"
assert index["status"] == "hold"

entry_id = "datanet-paid-read-quote-public-discovery-v1"
entries = [item for item in index["entries"] if item.get("id") == entry_id]
assert len(entries) == 1
entry = entries[0]

expected_entry = {
    "automatic_execution_enabled": False,
    "customer_payment_required_before_work": True,
    "datanet_fetch_performed": False,
    "datanet_mutation_enabled": False,
    "discovery_only": True,
    "execution_authorized": False,
    "fund_movement": False,
    "id": entry_id,
    "json": "paid-read-quote-v1.json",
    "marker": "VOID_DATANET_PAID_READ_QUOTE_PUBLIC_DISCOVERY_V1",
    "mutation_handler_enabled": False,
    "operator_approval_required": True,
    "path": "/public-node/datanet/paid-read-quote-v1.json",
    "payment_collection_enabled": False,
    "payment_confirmation_performed": False,
    "public_intake_enabled": False,
    "public_safe": True,
    "quote_only": True,
    "read_only": True,
    "runtime_mutation_route_enabled": False,
    "runtime_route_enabled": False,
    "schema_json": "paid-read-quote-v1.schema.json",
    "scope": "datanet_paid_read_quote_public_discovery",
    "static_discovery_only": True,
    "status": "green",
    "title": "Paid DataNet Read Quote V1",
    "transaction_submission": False,
    "treasury_access_enabled": False,
    "upload_enabled": False,
    "void_settlement": False,
    "wallet_or_signer_access": False,
    "work_credit_write": False,
}
assert entry == expected_entry
assert len(index["entries"]) == 19

def type_ok(name, value):
    if name == "object":
        return isinstance(value, dict)
    if name == "array":
        return isinstance(value, list)
    if name == "string":
        return isinstance(value, str)
    if name == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if name == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if name == "boolean":
        return isinstance(value, bool)
    if name == "null":
        return value is None
    raise AssertionError(f"unsupported schema type: {name}")

def validate(node, value, location="$"):
    expected_type = node.get("type")
    if expected_type is not None:
        assert type_ok(expected_type, value), (location, expected_type, value)

    if "const" in node:
        assert value == node["const"], (location, node["const"], value)

    if "enum" in node:
        assert value in node["enum"], (location, node["enum"], value)

    if isinstance(value, dict):
        required = node.get("required", [])
        for key in required:
            assert key in value, (location, "missing", key)
        properties = node.get("properties", {})
        if node.get("additionalProperties") is False:
            assert set(value) <= set(properties), (
                location,
                "additionalProperties",
                sorted(set(value) - set(properties)),
            )
        for key, child in properties.items():
            if key in value:
                validate(child, value[key], f"{location}.{key}")

    if isinstance(value, list):
        if "minItems" in node:
            assert len(value) >= node["minItems"], (location, "minItems")
        if "maxItems" in node:
            assert len(value) <= node["maxItems"], (location, "maxItems")
        prefix = node.get("prefixItems", [])
        for offset, child in enumerate(prefix):
            assert offset < len(value), (location, "prefixItems", offset)
            validate(child, value[offset], f"{location}[{offset}]")
        if node.get("items") is False:
            assert len(value) <= len(prefix), (location, "items", len(value))

    if isinstance(value, str):
        if "minLength" in node:
            assert len(value) >= node["minLength"], (location, "minLength")
        if "pattern" in node:
            assert re.fullmatch(node["pattern"], value), (
                location,
                "pattern",
                node["pattern"],
                value,
            )

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in node:
            assert value >= node["minimum"], (location, "minimum")
        if "maximum" in node:
            assert value <= node["maximum"], (location, "maximum")

assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema"
assert schema["$id"] == "/public-node/datanet/paid-read-quote-v1.schema.json"
assert schema["title"] == "VOID Paid DataNet Read Quote Public Discovery V1"
validate(schema, card)

assert card["schema"] == "void.public_node.datanet.paid_read_quote_public_discovery.v1"
assert card["id"] == entry_id
assert card["marker"] == "VOID_DATANET_PAID_READ_QUOTE_PUBLIC_DISCOVERY_V1"
assert card["status"] == "green"
assert card["self_path"] == entry["path"]
assert card["schema_path"].endswith(entry["schema_json"])
assert card["index_path"] == "/public-node/datanet/index.json"

assert card["service"]["service_code"] == "datanet.public-retrieval-evidence.v1"
assert card["service"]["object_count"] == 1
assert card["service"]["pricing"] == {
    "base_cents": 400,
    "minimum_operator_margin_bps": 3000,
    "per_billable_mib_cents": 3,
    "per_object_cents": 50,
}

sample = card["canonical_sample"]
assert sample["quote_id"] == "60ac49dcefbf8f1ed7e4956f2ce83f6db09380e712ff41f7b3ad83d28e7c3615"
assert sample["read_quote_id"] == "58ab3b6103eb6e00392cbd6e540d22b07a705e7b2bdea18a233016f9c2b7fab5"
assert sample["quoted_total_cents"] == 453
assert sample["canonical_sample_sha256"] == "d0343ce33cccdfd9f6de239c47d617fe9716570e8d24bb6edae3ffab897f96cf"

for key in [
    "static_discovery_only",
    "public_safe",
    "read_only",
    "discovery_only",
]:
    assert card["publication"][key] is True, key

for key in [
    "runtime_route_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
    "public_intake_enabled",
    "upload_enabled",
]:
    assert card["publication"][key] is False, key

controls = card["controls"]
assert controls["operator_approval_required"] is True
assert controls["customer_payment_required_before_work"] is True
assert controls["quote_only"] is True
for key in [
    "payment_collection_enabled",
    "payment_confirmation_performed",
    "execution_authorized",
    "automatic_execution_enabled",
    "datanet_fetch_performed",
    "datanet_mutation_enabled",
    "wallet_or_signer_access",
    "transaction_submission",
    "work_credit_write",
    "void_settlement",
    "treasury_access_enabled",
    "fund_movement",
]:
    assert controls[key] is False, key

for key, value in card["public_safety"].items():
    assert value is False, key

print("index_card_schema_binding_green=true")
PY

echo "== sealed paid-read proof =="
PROOF_LOG="$(mktemp)"
SAMPLE_A="$(mktemp)"
SAMPLE_B="$(mktemp)"
PRETTY_SAMPLE="$(mktemp)"
trap 'rm -f "$PROOF_LOG" "$SAMPLE_A" "$SAMPLE_B" "$PRETTY_SAMPLE"' EXIT

node "$TOOL_PROOF" >"$PROOF_LOG"
grep -F '"marker": "VOID_DATANET_PAID_READ_QUOTE_V1_PROOF"' "$PROOF_LOG" >/dev/null
grep -F '"assertion_count": 492' "$PROOF_LOG" >/dev/null
grep -F '"status": "GREEN"' "$PROOF_LOG" >/dev/null
echo "sealed_paid_read_proof_green=true"

SAMPLE_ARGS=(
  --request-id request-read-001
  --requester-id customer-read-001
  --dataset-id ds_public_read_001
  --who customer-read-001
  --source-base https://public-node.example
  --total-bytes 42
  --operator-cost-basis-cents 0
  --requested-at-ms 1800000000000
)

node "$TOOL" "${SAMPLE_ARGS[@]}" >"$SAMPLE_A"
node "$TOOL" "${SAMPLE_ARGS[@]}" >"$SAMPLE_B"
cmp "$SAMPLE_A" "$SAMPLE_B"

node "$TOOL" "${SAMPLE_ARGS[@]}" --format pretty >"$PRETTY_SAMPLE"
python3 - "$CARD" "$SAMPLE_A" "$PRETTY_SAMPLE" "$CANONICAL_SAMPLE_SHA" <<'PY'
import json
import sys
from pathlib import Path

import hashlib

card = json.loads(Path(sys.argv[1]).read_text())
compact = json.loads(Path(sys.argv[2]).read_text())
pretty = json.loads(Path(sys.argv[3]).read_text())
canonical_sample_sha = sys.argv[4]
assert compact == pretty
canonical_bytes = (
    json.dumps(pretty, indent=2, sort_keys=True) + "\n"
).encode("utf-8")
assert hashlib.sha256(canonical_bytes).hexdigest() == canonical_sample_sha

sample = card["canonical_sample"]
assert compact["schema"] == "void-datanet-paid-read-quote-v1"
assert compact["marker"] == "VOID_DATANET_PAID_READ_QUOTE_V1"
assert compact["status"] == "QUOTE_GREEN"
assert compact["quote_only"] is True
assert compact["quote"]["quote_id"] == sample["quote_id"]
assert compact["read_quote_id"] == sample["read_quote_id"]
assert compact["binding"]["request_id"] == sample["request_id"]
assert compact["binding"]["requester_id"] == sample["requester_id"]
assert compact["binding"]["dataset_id"] == sample["dataset_id"]
assert compact["binding"]["who"] == sample["who"]
assert compact["binding"]["source_base"] == sample["source_base"]
assert compact["binding"]["fetch_url"] == sample["fetch_url"]
assert compact["binding"]["object_count"] == sample["object_count"]
assert compact["binding"]["total_bytes"] == sample["total_bytes"]
assert compact["quote"]["requested_at_ms"] == sample["requested_at_ms"]
assert compact["quote"]["expires_at_ms"] == sample["expires_at_ms"]
assert compact["quote"]["pricing"]["quoted_total_cents"] == sample["quoted_total_cents"]

for key in [
    "payment_collection_enabled",
    "payment_confirmation_performed",
    "execution_authorized",
    "automatic_execution_enabled",
    "datanet_fetch_performed",
    "datanet_mutation_enabled",
    "wallet_or_signer_access",
    "transaction_submission",
    "work_credit_write",
    "void_settlement",
    "treasury_access_enabled",
]:
    assert compact["controls"][key] is False, key

print("canonical_sample_binding_green=true")
PY

echo "== marker and forbidden enablement scan =="
grep -R -F "$MARKER" "$INDEX" "$CARD" "$SCHEMA" "$DOC" "$PROOF" >/dev/null

python3 - "$INDEX" "$CARD" "$SCHEMA" "$DOC" "$WORKFLOW" <<'PY'
import sys
from pathlib import Path

paths = [Path(value) for value in sys.argv[1:]]
forbidden = [
    '"payment_collection_enabled": true',
    '"payment_confirmation_performed": true',
    '"execution_authorized": true',
    '"automatic_execution_enabled": true',
    '"datanet_fetch_performed": true',
    '"datanet_mutation_enabled": true',
    '"runtime_route_enabled": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"public_intake_enabled": true',
    '"upload_enabled": true',
    '"wallet_or_signer_access": true',
    '"transaction_submission": true',
    '"work_credit_write": true',
    '"void_settlement": true',
    '"treasury_access_enabled": true',
    '"fund_movement": true',
    "private key",
    "seed phrase",
]
hits = []
for path in paths:
    text = path.read_text()
    lower = text.lower()
    for needle in forbidden:
        if needle.startswith('"'):
            if needle in text:
                hits.append(f"{path}:{needle}")
        elif needle in lower:
            hits.append(f"{path}:{needle}")
if hits:
    raise SystemExit("\n".join(hits))
print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "$RESULT"
