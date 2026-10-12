#!/usr/bin/env bash
set -euo pipefail

json="public/public-node/datanet/field-replication-status-card-v1.json"
html="public/public-node/datanet/field-replication-status-card-v1.html"
doc="docs/public/datanet-field-replication-status-card-v1.md"

python3 -m json.tool "$json" >/dev/null
python3 -m json.tool public/public-node/index.json >/dev/null
python3 -m json.tool public/public-node/datanet/index.json >/dev/null

node - <<'NODE'
const fs = require("fs");
const card = JSON.parse(fs.readFileSync("public/public-node/datanet/field-replication-status-card-v1.json", "utf8"));

if (card.marker !== "VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1") throw new Error("bad marker");
if (card.green_marker !== "VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1_GREEN") throw new Error("bad green marker");
if (card.status !== "green") throw new Error("bad status");
if (card.field_result.verified_sha256 !== "5b4cbc3c4a26a7032ed951bbc17f8470d5e8c865d76817fbdad740562606ede7") throw new Error("bad verified sha");
if (card.field_result.roundtrip_match !== true) throw new Error("roundtrip not marked true");
if (card.safety_boundary.tailnet_ips_redacted !== true) throw new Error("tailnet redaction not marked true");
if (card.safety_boundary.no_wallet_movement !== true) throw new Error("wallet boundary missing");
if (card.safety_boundary.no_public_mutation_route !== true) throw new Error("mutation boundary missing");
if (card.safety_boundary.dangerous_paths_touched !== false) throw new Error("dangerous paths boundary bad");

for (const marker of [
  "VOID_DATANET_FIELD_OBJECT_TRIAL_V1_GREEN",
  "VOID_DATANET_FIELD_OBJECT_MIRROR_V1_GREEN",
  "VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN",
  "VOID_DATANET_PULL_TAILNET_DIAGNOSTICS_V1_GREEN",
]) {
  if (!card.proof_markers.includes(marker)) throw new Error(`missing proof marker ${marker}`);
}
NODE

grep -q "VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1" "$html"
grep -q "VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1_GREEN" "$doc"

if grep -RE '100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.' "$json" "$html" "$doc"; then
  echo "tailnet IP leaked into public status card"
  exit 1
fi

echo "VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1_GREEN"
