#!/usr/bin/env bash
set -euo pipefail

BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1"
MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1"

ROOT_INDEX="public/public-node/index.json"
SECTION_INDEX="public/public-node/validators/index.json"
AUDIT_JSON="public/public-node/validators/${BRICK}.json"
DOC="docs/public-node/validators/${BRICK}.md"

echo "== JSON parse =="
python3 -m json.tool "$ROOT_INDEX" >/dev/null
python3 -m json.tool "$SECTION_INDEX" >/dev/null
python3 -m json.tool "$AUDIT_JSON" >/dev/null
python3 - <<'PYCHECK'
import json
from pathlib import Path

records = [
  {
    "kind": "validator_candidate_visibility_index",
    "brick": "mainnet0-validator-candidate-public-visibility-index-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_html_card",
    "brick": "mainnet0-validator-candidate-public-visibility-html-card-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.html",
    "json_route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.html",
    "json_path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_HOLD_V1",
    "format": "html"
  },
  {
    "kind": "validator_candidate_visibility_html_runtime",
    "brick": "mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_closeout_rollup",
    "brick": "mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_closeout_rollup_html_card",
    "brick": "mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.html",
    "json_route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.html",
    "json_path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1",
    "format": "html"
  },
  {
    "kind": "validator_candidate_visibility_closeout_rollup_html_runtime",
    "brick": "mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_reviewer_final_seal",
    "brick": "mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_reviewer_final_seal_html_card",
    "brick": "mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.html",
    "json_route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.html",
    "json_path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1",
    "format": "html"
  },
  {
    "kind": "validator_candidate_visibility_reviewer_final_seal_html_runtime",
    "brick": "mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_chain_closeout_discovery_polish",
    "brick": "mainnet0-validator-candidate-public-visibility-chain-closeout-discovery-polish-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-chain-closeout-discovery-polish-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-chain-closeout-discovery-polish-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CHAIN_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_root_reviewer_entrypoint_polish",
    "brick": "mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_POLISH_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_root_reviewer_entrypoint_runtime_visibility",
    "brick": "mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  }
]
for record in records:
    path = Path(record["path"])
    assert path.exists(), path
    if record["format"] == "json":
        json.loads(path.read_text())
    if record.get("json_path"):
        json.loads(Path(record["json_path"]).read_text())
print("source_json_parse_green=true")
PYCHECK
echo "json_green=true"

echo "== source marker presence =="
python3 - <<'PYCHECK'
from pathlib import Path

records = [
  {
    "kind": "validator_candidate_visibility_index",
    "brick": "mainnet0-validator-candidate-public-visibility-index-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_html_card",
    "brick": "mainnet0-validator-candidate-public-visibility-html-card-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.html",
    "json_route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.html",
    "json_path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_HOLD_V1",
    "format": "html"
  },
  {
    "kind": "validator_candidate_visibility_html_runtime",
    "brick": "mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_closeout_rollup",
    "brick": "mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_closeout_rollup_html_card",
    "brick": "mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.html",
    "json_route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.html",
    "json_path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1",
    "format": "html"
  },
  {
    "kind": "validator_candidate_visibility_closeout_rollup_html_runtime",
    "brick": "mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_reviewer_final_seal",
    "brick": "mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_reviewer_final_seal_html_card",
    "brick": "mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.html",
    "json_route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.html",
    "json_path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1",
    "format": "html"
  },
  {
    "kind": "validator_candidate_visibility_reviewer_final_seal_html_runtime",
    "brick": "mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_chain_closeout_discovery_polish",
    "brick": "mainnet0-validator-candidate-public-visibility-chain-closeout-discovery-polish-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-chain-closeout-discovery-polish-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-chain-closeout-discovery-polish-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CHAIN_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_root_reviewer_entrypoint_polish",
    "brick": "mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_POLISH_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_root_reviewer_entrypoint_runtime_visibility",
    "brick": "mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  }
]
for record in records:
    text = Path(record["path"]).read_text()
    assert record["marker"] in text, (record["path"], record["marker"])
    if record.get("json_path"):
        json_text = Path(record["json_path"]).read_text()
        assert record["marker"] in json_text, (record["json_path"], record["marker"])
print("source_marker_presence_green=true")
PYCHECK

echo "== audit binding =="
python3 - <<'PYCHECK'
import json
from pathlib import Path

brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1"
records = [
  {
    "kind": "validator_candidate_visibility_index",
    "brick": "mainnet0-validator-candidate-public-visibility-index-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_html_card",
    "brick": "mainnet0-validator-candidate-public-visibility-html-card-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.html",
    "json_route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.html",
    "json_path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_HOLD_V1",
    "format": "html"
  },
  {
    "kind": "validator_candidate_visibility_html_runtime",
    "brick": "mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_closeout_rollup",
    "brick": "mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_closeout_rollup_html_card",
    "brick": "mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.html",
    "json_route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.html",
    "json_path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1",
    "format": "html"
  },
  {
    "kind": "validator_candidate_visibility_closeout_rollup_html_runtime",
    "brick": "mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_reviewer_final_seal",
    "brick": "mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_reviewer_final_seal_html_card",
    "brick": "mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.html",
    "json_route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.html",
    "json_path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1",
    "format": "html"
  },
  {
    "kind": "validator_candidate_visibility_reviewer_final_seal_html_runtime",
    "brick": "mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_candidate_visibility_chain_closeout_discovery_polish",
    "brick": "mainnet0-validator-candidate-public-visibility-chain-closeout-discovery-polish-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-candidate-public-visibility-chain-closeout-discovery-polish-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-candidate-public-visibility-chain-closeout-discovery-polish-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CHAIN_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_root_reviewer_entrypoint_polish",
    "brick": "mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_POLISH_HOLD_V1",
    "format": "json"
  },
  {
    "kind": "validator_root_reviewer_entrypoint_runtime_visibility",
    "brick": "mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1",
    "route": "/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1.json",
    "path": "public/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1.json",
    "marker": "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_RUNTIME_VISIBILITY_HOLD_V1",
    "format": "json"
  }
]

root = json.loads(Path("public/public-node/index.json").read_text())
section = json.loads(Path("public/public-node/validators/index.json").read_text())
audit = json.loads(Path(f"public/public-node/validators/{brick}.json").read_text())

preferred = "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.html"
audit_route = f"/public-node/validators/{brick}.json"

root_matches = [r for r in root.get("routes", []) if r.get("route") == preferred]
assert len(root_matches) == 1, root_matches
root_route = root_matches[0]
assert root_route["public_safe"] is True
assert root_route["read_only"] is True
assert root_route["browser_visible"] is True
assert root_route["static_index_only"] is True

section_audit_matches = [r for r in section.get("routes", []) if r.get("route") == audit_route]
assert len(section_audit_matches) == 1, section_audit_matches
section_audit = section_audit_matches[0]
assert section_audit["marker"] == marker
assert section_audit["preferred_reviewer_entrypoint"] == preferred
assert section_audit["public_safe"] is True
assert section_audit["read_only"] is True
assert section_audit["audit_rollup_only"] is True
assert section_audit["root_to_reviewer_chain_audit_only"] is True
assert section_audit["static_index_only"] is True

section_routes = {r.get("route") for r in section.get("routes", [])}
root_routes = {r.get("route") for r in root.get("routes", [])}
assert preferred in root_routes

for record in records:
    route = record["route"]
    if route.endswith(".json"):
        assert route in section_routes or route == audit_route, route

assert audit["marker"] == marker
assert audit["route"] == audit_route
assert audit["preferred_reviewer_entrypoint"] == preferred
assert audit["public_safe"] is True
assert audit["read_only"] is True
assert audit["audit_rollup_only"] is True
assert audit["root_to_reviewer_chain_audit_only"] is True
assert audit["static_index_only"] is True

expected = {(r["route"], r["marker"]) for r in records}
observed = {(r["route"], r["marker"]) for r in audit["source_records"]}
assert expected <= observed, expected - observed

for flag in [
    "public_submit_enabled",
    "stake_lock_enabled",
    "wallet_connect_enabled",
    "candidate_registration_enabled",
    "candidate_intake_enabled",
    "active_admission_enabled",
    "activation_enabled",
    "epoch_mutation_enabled",
    "validator_set_write_enabled",
    "validator_runtime_truth_write_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
    "signer_or_wallet_required",
]:
    assert audit["public_surface"][flag] is False, flag

for container in [root_route, section_audit]:
    for flag in [
        "public_submit_enabled",
        "stake_lock_enabled",
        "candidate_registration_enabled",
        "active_admission_enabled",
        "runtime_mutation_route_enabled",
        "mutation_handler_enabled",
    ]:
        assert container[flag] is False, (container.get("route"), flag)

print("validator_public_visibility_root_to_reviewer_chain_audit_binding_green=true")
PYCHECK

echo "== marker presence =="
grep -F "$MARKER" "$SECTION_INDEX" >/dev/null
grep -F "$MARKER" "$AUDIT_JSON" >/dev/null
grep -F "$MARKER" "$DOC" >/dev/null
grep -F "$MARKER" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PYCHECK'
from pathlib import Path

paths = [
    Path("public/public-node/validators/index.json"),
    Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1.json"),
]

needles = [
    '"public_submit_enabled": true',
    '"stake_lock_enabled": true',
    '"wallet_connect_enabled": true',
    '"candidate_registration_enabled": true',
    '"candidate_intake_enabled": true',
    '"active_admission_enabled": true',
    '"activation_enabled": true',
    '"epoch_mutation_enabled": true',
    '"validator_set_write_enabled": true',
    '"validator_runtime_truth_write_enabled": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"signer_or_wallet_required": true',
]

for path in paths:
    text = path.read_text()
    for needle in needles:
        assert needle not in text, (path, needle)

print("forbidden_enablement_scan_green=true")
PYCHECK

echo "== result =="
echo "${MARKER}_GREEN"
