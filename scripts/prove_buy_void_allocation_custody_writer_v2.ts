import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRITER =
  "src/economic/buy_void_allocation_reservation_publication_writer_v1.ts";
const V1_SOURCE =
  "src/economic/buy_void_allocation_custody_qualification_v1.ts";
const V1_PROOF =
  "scripts/prove_buy_void_allocation_custody_qualification_v1.ts";
const V1_DOC =
  "docs/architecture/buy-void-allocation-custody-qualification-v1.md";

const PREDECESSOR_WRITER_BLOB =
  "59b336eb82222bf0f5bcfe37060ec520c54e9b62";
const PREDECESSOR_WRITER_SHA256 =
  "84ba3aa4fd77fdcf6cc12b8707014a9698a4f2b04808e3179a4d016435c9fd4b";
const CURRENT_WRITER_BLOB =
  "b460963c25a87153551090ed97e9c716aad0b727";
const CURRENT_WRITER_SHA256 =
  "41e4f975c7926ddd082fd26f5e1ee936de06a1fdbe081b308daa4849c069d06d";

const HISTORICAL_V1 = Object.freeze({
  source: "4adae871f2938840e2ec936e743d0b650b5f1a00",
  proof: "756cc52119e78150e6cc251454e1a79d75ade9f9",
  doc: "b52f32ff343f7fd340c7782d0c68cde3bb54693d",
});

function sha256(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlob(bytes: Buffer): string {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + String(bytes.length) + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function read(relative: string): Buffer {
  return fs.readFileSync(path.join(ROOT, relative));
}

const current = read(WRITER);
assert.equal(gitBlob(current), CURRENT_WRITER_BLOB);
assert.equal(sha256(current), CURRENT_WRITER_SHA256);

const predecessor = execFileSync(
  "/usr/bin/git",
  ["cat-file", "blob", PREDECESSOR_WRITER_BLOB],
  {
    cwd: ROOT,
    maxBuffer: 512 * 1024,
  },
);
assert.equal(gitBlob(predecessor), PREDECESSOR_WRITER_BLOB);
assert.equal(sha256(predecessor), PREDECESSOR_WRITER_SHA256);

for (const [relative, expected] of [
  [V1_SOURCE, HISTORICAL_V1.source],
  [V1_PROOF, HISTORICAL_V1.proof],
  [V1_DOC, HISTORICAL_V1.doc],
] as const) {
  assert.equal(
    gitBlob(read(relative)),
    expected,
    "historical V1 custody contract drifted: " + relative,
  );
}

const currentText = current.toString("utf8");
const additionStart = currentText.indexOf(
  "export type BuyVoidAllocationReservationPublicationSnapshotV1",
);
const additionEnd = currentText.indexOf(
  "export function recoverBuyVoidAllocationReservationPublicationWriterV1",
  additionStart,
);
assert.ok(additionStart > 0 && additionEnd > additionStart);
assert.equal(
  currentText.indexOf(
    "export type BuyVoidAllocationReservationPublicationSnapshotV1",
    additionStart + 1,
  ),
  -1,
);
assert.equal(
  currentText.indexOf(
    "export function snapshotBuyVoidAllocationReservationPublicationWriterV1",
    additionStart + 1,
  ),
  currentText.indexOf(
    "export function snapshotBuyVoidAllocationReservationPublicationWriterV1",
  ),
);

const addition = currentText.slice(additionStart, additionEnd);
const reconstructedPredecessor = Buffer.from(
  currentText.slice(0, additionStart) +
    currentText.slice(additionEnd),
  "utf8",
);
assert.equal(
  reconstructedPredecessor.equals(predecessor),
  true,
  "current writer must equal V1 predecessor plus exactly one additive block",
);

for (const token of [
  "snapshotBuyVoidAllocationReservationPublicationWriterV1",
  "withWriterRoots(",
  "recoverUnderLock(",
  "requireCurrentBinding(",
  "currentLedgerSummary(",
  "assertWriterRootsVisible(",
  "operation_performed: recovered.recovered",
  "runtime_integration: false",
  "production_gate_ready: false",
  "funds_movement: false",
]) {
  assert.ok(addition.includes(token), "snapshot addition missing: " + token);
}

for (const forbidden of [
  "planBuyVoidAllocationReservationV1",
  "persistBuyVoidAllocationReservationPublicationWriterV1",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "linkSync",
  "transaction_broadcast",
  "wallet_access",
  "production_gate_ready: true",
]) {
  assert.equal(
    addition.includes(forbidden),
    false,
    "snapshot addition introduced mutation/authority token: " + forbidden,
  );
}

const report = Object.freeze({
  marker: "VOID_BUY_VOID_ALLOCATION_CUSTODY_WRITER_V2",
  schema: "void_buy_void_allocation_custody_writer_v2",
  version: 2,
  predecessor_writer_blob_sha1: PREDECESSOR_WRITER_BLOB,
  predecessor_writer_source_sha256:
    "sha256:" + PREDECESSOR_WRITER_SHA256,
  current_writer_blob_sha1: CURRENT_WRITER_BLOB,
  current_writer_source_sha256: "sha256:" + CURRENT_WRITER_SHA256,
  historical_custody_v1_preserved: true,
  current_writer_equals_v1_plus_additive_snapshot_block: true,
  snapshot_recovers_already_started_publication_only: true,
  snapshot_new_allocation_planning: false,
  snapshot_new_allocation_persistence: false,
  source_requalification_only: true,
  live_host_qualification_performed: false,
  prior_receipt_external_trust_proven: false,
  independent_custody_proven: false,
  runtime_integration: false,
  production_gate_ready: false,
  wallet_or_signer_access: false,
  transaction_broadcast: false,
  funds_movement: false,
});

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_WRITER_V2_GREEN");
console.log(JSON.stringify(report));
