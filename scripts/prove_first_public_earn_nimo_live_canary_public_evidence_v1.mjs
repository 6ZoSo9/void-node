#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "docs/public/evidence/first-public-earn-nimo-live-canary-v1");
const jsonPath = path.join(dir, "public-evidence-v1.json");
const markdownPath = path.join(dir, "operator-verification-v1.md");
const checksumsPath = path.join(dir, "PUBLIC-SHA256SUMS.txt");
const milestoneId = "voidpearnmil1_7ea5c19116369eeaeba7bf5f44ad3a5bd09476e872805128f29011d678907b9d";
const ticketId = "0f4f906e7c4836e2b16fa2bdf6bcbc60";
const token = /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/;
const privateHome = /\/home\/[^/\s]+\//;
const privateKey = /BEGIN (?:OPENSSH )?PRIVATE KEY/;

function fail(message) { throw new Error(message); }
function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

for (const file of [jsonPath, markdownPath, checksumsPath]) {
  const st = fs.lstatSync(file);
  if (!st.isFile() || st.isSymbolicLink()) fail(`unsafe evidence file: ${file}`);
  const text = fs.readFileSync(file, "utf8");
  if (token.test(text)) fail(`capability token found: ${file}`);
  if (privateHome.test(text)) fail(`private home path found: ${file}`);
  if (privateKey.test(text)) fail(`private key material found: ${file}`);
}

const entries = fs.readFileSync(checksumsPath, "utf8").trim().split(/\\r?\\n/).map((line) => {
  const m = /^([0-9a-f]{64})  (.+)$/.exec(line);
  if (!m) fail(`invalid checksum line: ${line}`);
  return { expected: m[1], name: m[2] };
});
if (JSON.stringify(entries.map(x => x.name).sort()) !==
    JSON.stringify(["operator-verification-v1.md","public-evidence-v1.json"].sort())) {
  fail("checksum member set mismatch");
}
for (const e of entries) if (sha256(path.join(dir, e.name)) !== e.expected) fail(`checksum mismatch: ${e.name}`);

const x = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (
  x.marker !== "VOID_FIRST_PUBLIC_EARN_NIMO_LIVE_CANARY_PUBLIC_EVIDENCE_V1" ||
  x.version !== 1 || x.milestone_id !== milestoneId || x.chain_id !== 2050 ||
  x.participant?.account !== "nimo-first-public-earn-v1" ||
  x.participant?.executor_node_id !== "b1f0484e430d17d6220ec72612bb2760" ||
  x.coordinator?.node_id !== "9d89483769e469e0473b489dc50dba96" ||
  x.ticket?.ticket_id !== ticketId ||
  x.ticket?.resumed_pending_ticket !== true ||
  x.ticket?.ticket_deleted_after_success !== true ||
  x.result?.job_id !== "job_no_node_v1_8fef6bd23f8632e9059cbee6" ||
  x.result?.receipt_id !== "rcpt_no_node_v1_696a68f8b783d42b689d0d87" ||
  x.result?.receipt_exact_green !== true || x.result?.recovered_terminal !== false ||
  x.wc?.before_quanta !== "0" || x.wc?.after_quanta !== "3000000000" ||
  x.wc?.delta !== 3 || x.wc?.numeric_authority !== "nano_wc_fixed_point_v1" ||
  x.repository?.execution_client_source_commit !== "61ffc590a83d50b2da894888559cc4d6a4b08ff9" ||
  x.repository?.execution_client_git_blob_sha1 !== "f68fd0f4afed303c8583ba3b87a2351054bbe578" ||
  x.repository?.recovery_fix_merge_commit !== "2707b29ec67053b894e396f63501151cd30e45fc" ||
  x.repository?.coordinator_runtime_commit_known !== false ||
  x.security?.capability_token_in_public_evidence !== false ||
  x.security?.private_key_material_in_public_evidence !== false ||
  x.security?.private_state_paths_in_public_evidence !== false ||
  x.security?.private_receipt_published !== false
) fail("public evidence semantic contract mismatch");

for (const [k,v] of Object.entries({
  live_work_execution:true, wc_ledger_write:true, wallet_or_signer_access:false,
  void_transfer:false, wc_to_void_settlement:false, payment_transfer:false,
  validator_mutation:false, treasury_movement:false
})) if (x.authority?.[k] !== v) fail(`authority mismatch: ${k}`);

const md = fs.readFileSync(markdownPath, "utf8");
for (const literal of [milestoneId, ticketId, "WC transition: \`0 → 3\`", "WC quanta: \`0 → 3000000000\`"]) {
  if (!md.includes(literal)) fail(`markdown missing: ${literal}`);
}
console.log(JSON.stringify({
  marker:"VOID_FIRST_PUBLIC_EARN_NIMO_LIVE_CANARY_PUBLIC_EVIDENCE_PROOF_V1",
  exact_green:true, milestone_id:milestoneId, ticket_id:ticketId, wc_delta:3,
  capability_token_present:false, private_key_material_present:false, private_home_path_present:false
}, null, 2));
