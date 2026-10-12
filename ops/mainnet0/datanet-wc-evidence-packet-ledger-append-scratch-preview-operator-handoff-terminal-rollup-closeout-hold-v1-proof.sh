#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

LANE="datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-terminal-rollup-closeout"
MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_TERMINAL_ROLLUP_CLOSEOUT_HOLD_V1"
SOURCE_MARKER="VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_TERMINAL_ROLLUP_HOLD_V1"
TOOL="tools/${LANE}.mjs"
DOC="docs/datanet/${LANE}-hold-v1.md"
PROOF="ops/mainnet0/${LANE}-hold-v1-proof.sh"
PREV_PROOF="ops/mainnet0/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-terminal-rollup-hold-v1-proof.sh"

printf '== tools exist / syntax ==\n'
test -f "${TOOL}"
test -x "${TOOL}"
node --check "${TOOL}"
test -f "${PREV_PROOF}"
bash -n "${PREV_PROOF}"
bash -n "${PROOF}"

printf '== operator handoff terminal rollup source proof ==\n'
bash "${PREV_PROOF}"

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT
SOURCE="${TMP}/operator-handoff-terminal-rollup.json"
OUT_A="${TMP}/closeout-a.json"
OUT_B="${TMP}/closeout-b.json"
BAD="${TMP}/bad-source.json"
BAD_OUT="${TMP}/bad-closeout.json"

printf '== create fixture operator handoff terminal rollup ==\n'
cat > "${SOURCE}" <<JSON
{
  "marker": "${SOURCE_MARKER}",
  "status": "operator_handoff_terminal_rollup_ready",
  "terminal_rollup_id": "operator-handoff-terminal-rollup-fixture-v1",
  "source": {
    "chain": "scratch-preview-operator-handoff",
    "review_surface": "manual-operator-review"
  },
  "checks": {
    "operator_handoff_terminal_rollup_binding_green": true,
    "public_safe_review_artifact_green": true,
    "no_canonical_ledger_append": true,
    "no_wc_issuance": true,
    "no_wc_claim": true,
    "no_wallet_transfer": true,
    "no_live_mutation_power": true
  },
  "boundary": {
    "public_safe": true,
    "read_only": true,
    "review_artifact_only": true,
    "canonical_ledger_append_authorized": false,
    "wc_issuance_authorized": false,
    "wc_claim_authorized": false,
    "wallet_transfer_authorized": false,
    "mutation_authority": false
  }
}
JSON

printf '== operator handoff terminal rollup closeout ==\n'
node "${TOOL}" --source "${SOURCE}" --out "${OUT_A}" --closed-at "2026-07-02T00:00:00.000Z" --closeout-id "operator-handoff-terminal-rollup-closeout-fixture-v1"
node "${TOOL}" --source "${SOURCE}" --out "${OUT_B}" --closed-at "2026-07-02T00:00:00.000Z" --closeout-id "operator-handoff-terminal-rollup-closeout-fixture-v1"

printf '== closeout deterministic / binding ==\n'
cmp "${OUT_A}" "${OUT_B}"
echo "operator_handoff_terminal_rollup_closeout_deterministic_green=true"
node --input-type=module - "${SOURCE}" "${OUT_A}" <<'NODE_BINDING_EOF'
import fs from 'node:fs';
import crypto from 'node:crypto';
const [sourcePath, outPath] = process.argv.slice(2);
const sourceRaw = fs.readFileSync(sourcePath);
const out = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const expectedMarker = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_TERMINAL_ROLLUP_CLOSEOUT_HOLD_V1';
const expectedSourceMarker = 'VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_TERMINAL_ROLLUP_HOLD_V1';
const sourceHash = crypto.createHash('sha256').update(sourceRaw).digest('hex');
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
assert(out.marker === expectedMarker, 'closeout marker mismatch');
assert(out.status === 'closed', 'closeout status mismatch');
assert(out.source?.marker === expectedSourceMarker, 'source marker mismatch');
assert(out.source?.sha256 === sourceHash, 'source hash binding mismatch');
assert(out.checks?.source_hash_bound_green === true, 'missing source hash bound check');
assert(out.boundary?.read_only === true, 'read-only boundary missing');
assert(out.boundary?.review_artifact_only === true, 'review artifact boundary missing');
assert(out.boundary?.canonical_ledger_append_authorized === false, 'canonical ledger append boundary changed');
assert(out.boundary?.wc_issuance_authorized === false, 'WC issuance boundary changed');
assert(out.boundary?.wc_claim_authorized === false, 'WC claim boundary changed');
assert(out.boundary?.wallet_transfer_authorized === false, 'wallet transfer boundary changed');
assert(out.boundary?.mutation_authority === false, 'mutation authority boundary changed');
NODE_BINDING_EOF
echo "operator_handoff_terminal_rollup_closeout_binding_green=true"

printf '== bad marker rejection ==\n'
cat > "${BAD}" <<JSON
{"marker":"VOID_BAD_MARKER"}
JSON
if node "${TOOL}" --source "${BAD}" --out "${BAD_OUT}" >/tmp/void-bad-closeout.log 2>&1; then
  cat /tmp/void-bad-closeout.log
  echo "bad_marker_rejection_failed=true"
  exit 1
fi
echo "bad_marker_rejection_green=true"

printf '== marker/source presence ==\n'
grep -R "${MARKER}" "${TOOL}" "${DOC}" "${PROOF}" >/dev/null
grep -R "${SOURCE_MARKER}" "${TOOL}" "${DOC}" "${PROOF}" >/dev/null
echo "marker_source_presence_green=true"

printf '== forbidden WC cap wording scan ==\n'
node --input-type=module - "${TOOL}" "${DOC}" "${PROOF}" <<'NODE_WORDING_EOF'
import fs from 'node:fs';
const files = process.argv.slice(2);
const banned = [
  /100,?000,?000\s*WC/i,
  /100m\s*WC/i,
  /capped\s+at/i,
  /lifetime\s+WC\s+cap/i
];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of banned) {
    if (pattern.test(text)) {
      throw new Error(`forbidden WC wording in ${file}`);
    }
  }
}
NODE_WORDING_EOF
echo "forbidden_wc_cap_wording_scan_green=true"

printf '== no mutation authority scan ==\n'
node --input-type=module - "${TOOL}" "${DOC}" "${PROOF}" <<'NODE_AUTH_EOF'
import fs from 'node:fs';
const files = process.argv.slice(2);
const banned = [
  /canonical_ledger_append_authorized['"]?\s*:\s*true/i,
  /wc_issuance_authorized['"]?\s*:\s*true/i,
  /wc_claim_authorized['"]?\s*:\s*true/i,
  /wallet_transfer_authorized['"]?\s*:\s*true/i,
  /\bmutation_authority['"]?\s*:\s*true/i
];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of banned) {
    if (pattern.test(text)) {
      throw new Error(`mutation authority wording in ${file}`);
    }
  }
}
NODE_AUTH_EOF
echo "no_mutation_authority_scan_green=true"

printf '== result ==\n'
echo "${MARKER}_GREEN"
