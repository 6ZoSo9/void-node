#!/usr/bin/env node
// Current combined Nimo witness runtime V3 candidate: source-only and unaccepted.
// Preserve original frozen V1 and proposed V2; never attest installed hosts.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK = "docs/architecture/buy-void-nimo-witness-v2-proposed-lock-v1.json";
const LOCK_BLOB = "73c7f88348a1d6b208336df8779940657607bd7d";
const ORIGINAL_V1_CONTRACT =
  "src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts";
const ORIGINAL_V1_REF = "f627cad6bc07a6ad3ebe7cbd946723316fcd0567";
const ORIGINAL_V1_BLOB = "d2e84643c9f4d76c642c7e07d4ea2bf1634035e4";
const LEDGER_SOURCE = "src/economic/buy_void_allocation_reservation_ledger_v1.ts";
const OLD_LEDGER_SOURCE_BLOB = "c3fc204710a9189723651cfeb6ffc52b1aa049db";
const CURRENT_LEDGER_SOURCE_BLOB = "66617a89d5ad9f81b5a21d98cca55fcda6902a80";
const CURRENT_LEDGER_DIST_SHA256 =
  "97a1cb675fec65558aa823b94f049815345fbaed4ac69c9dfae4e1416950cec0";
const SOURCE_AND_BUILD = Object.freeze([
  ["tools/void-buy-allocation-custody-witness-forced-command-v2.mjs","742cf489d8a785aa155a0e1bd12b65e94e07d1f1"],
  ["src/economic/buy_void_allocation_custody_external_witness_v1.ts","5d24f3fb3e94611c653a0e3e1319afa7d0f4db72"],
  ["src/economic/buy_void_allocation_custody_witness_transport_v1.ts","a5163272f08d6d96a9c2387fa6db344018e09694"],
  ["src/economic/buy_void_allocation_reservation_high_water_v1.ts","9383c94cf848efb9a0112f1b741df4e10f790ac6"],
  [LEDGER_SOURCE,CURRENT_LEDGER_SOURCE_BLOB],
  ["src/economic/buy_void_auto_fulfillment_v1.ts","b7c963b1d55f000d82ad82289b31107b432503de"],
  ["src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts","e284a38a4b7f3d498b07e77c661d6eef3b742e7a"],
  ["src/economic/buy_void_filesystem_bakery_lock_v1.ts","03376ad9853c1ca37c5be4d7f36d9daccab25078"],
  ["package.json","f28c3e9446c7623ef203da36a9642d046e5f34ee"],
  ["package-lock.json","b2671f0149f522b2489247016df0a5ec4bb72b8b"],
  ["tsconfig.json","c970faf406a0fa95638ce0b1ac0c63f8d8e96120"],
  ["tsconfig.build.json","d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb"],
  ["scripts/copy_void_runtime_js_v1.mjs","d1c4b3735ca2d3a9aa392ec1173cf7b123e0f9d9"],
  ["scripts/retire_saveblock_periodic_rewriters_v1.mjs","3786dbc03de4be29b6e42059e46dbe1b95d8aa04"],
  ["Dockerfile","2acd9bcf0416eeb0f9fd72c1a556696863ff1607"],
]);
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob = bytes => crypto.createHash("sha1")
  .update("blob " + bytes.length + "\0").update(bytes).digest("hex");
function readPinned(file) {
  assert.match(file, /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/u);
  assert.ok(!file.split("/").some(piece => piece === "." || piece === ".."));
  const full = path.join(ROOT, file);
  const st = fs.lstatSync(full);
  assert.ok(st.isFile() && !st.isSymbolicLink() && st.nlink === 1 &&
    st.size > 0 && st.size <= 16 * 1024 * 1024, "unexpected file: " + file);
  const bytes = fs.readFileSync(full, { flag: "r" });
  const after = fs.lstatSync(full);
  assert.equal(bytes.length, st.size, "file size drift: " + file);
  assert.equal(after.dev, st.dev, "file device drift: " + file);
  assert.equal(after.ino, st.ino, "file inode drift: " + file);
  assert.equal(after.size, st.size, "file length drift: " + file);
  return bytes;
}
function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort()
      .map(key => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") + "}";
  }
  throw Error("nimo_v3_noncanonical_record");
}
function requireCandidate(raw, original) {
  assert.equal(raw.schema, "void_buy_void_nimo_witness_v3_unaccepted_candidate_v1");
  assert.equal(raw.marker, "VOID_BUY_VOID_NIMO_WITNESS_V3_UNACCEPTED_CANDIDATE_V1");
  assert.equal(raw.status, "HOLD_UNACCEPTED_SOURCE_CANDIDATE");
  assert.equal(raw.historical_v1_manifest_id, original.historical_v1_manifest_id);
  assert.equal(raw.proposed_v2_manifest_id, original.candidate_manifest_id);
  assert.equal(raw.original_v1_contract_git_blob, ORIGINAL_V1_BLOB);
  assert.equal(raw.proposed_v2_lock_git_blob, LOCK_BLOB);
  assert.equal(raw.candidate_generation, 3);
  assert.equal(raw.source_build_input_count, 15);
  assert.equal(raw.source_build_unchanged_since_v2, 14);
  assert.equal(raw.changed_source.path, LEDGER_SOURCE);
  assert.equal(raw.changed_source.original_v2_git_blob, OLD_LEDGER_SOURCE_BLOB);
  assert.equal(raw.changed_source.current_git_blob, CURRENT_LEDGER_SOURCE_BLOB);
  assert.equal(raw.runtime_file_count, 8);
  assert.ok(Array.isArray(raw.runtime_files) && raw.runtime_files.length === 8);
  for (let i = 0; i < 8; ++i) {
    assert.equal(raw.runtime_files[i].path, original.runtime_files[i].path);
    assert.equal(raw.runtime_files[i].installed_path,
      original.runtime_files[i].installed_path);
    assert.ok(Number.isSafeInteger(raw.runtime_files[i].bytes) &&
      raw.runtime_files[i].bytes > 0 && raw.runtime_files[i].bytes <= 16 * 1024 * 1024);
    assert.match(raw.runtime_files[i].sha256, /^[a-f0-9]{64}$/u);
    if (i === 4) {
      assert.equal(raw.runtime_files[i].sha256, CURRENT_LEDGER_DIST_SHA256);
      assert.notEqual(raw.runtime_files[i].sha256, original.runtime_files[i].sha256);
    } else {
      assert.equal(raw.runtime_files[i].sha256, original.runtime_files[i].sha256);
      assert.equal(raw.runtime_files[i].bytes, original.runtime_files[i].bytes);
    }
  }
  assert.deepEqual(raw.authority, {
    derived_in_disposable_ci_only: true,
    historical_v1_attestation_reissued: false,
    proposed_v2_identity_reissued: false,
    combined_v3_installed_on_nimo: false,
    combined_v3_accepted_by_remote_witness: false,
    authenticated_custody_principal_verified: false,
    runtime_lease_or_dispatcher_mounted: false,
    customer_payment_or_allocation_written: false,
    protected_rollback_high_water_accepted: false,
    production_gate_ready: false,
    coupled_wc_void_presale_activated: false,
    signer_or_wallet_used: false,
    funds_moved: false,
  });
}
function main() {
  assert.deepEqual(process.argv.slice(2), ["--prove"]);
  assert.equal(process.platform, "linux");
  assert.ok([22, 24, 26].includes(Number(process.versions.node.split(".")[0])));
  const lockBytes = readPinned(LOCK);
  assert.equal(gitBlob(lockBytes), LOCK_BLOB, "proposed V2 lock MUST remain unchanged");
  const lock = JSON.parse(lockBytes.toString("utf8"));
  assert.equal(lock.schema, "void_buy_void_nimo_witness_v2_proposed_lock_v1");
  assert.equal(lock.candidate_manifest_id,
    "voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d");
  assert.equal(lock.historical_v1_manifest_id,
    "voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7");
  assert.equal(lock.runtime_file_count, 8);
  assert.equal(lock.authority.v2_runtime_bundle_identity_accepted, false);
  assert.equal(lock.authority.v2_host_installed, false);
  assert.equal(lock.authority.presale_activation, false);
  assert.equal(gitBlob(readPinned(ORIGINAL_V1_CONTRACT)), ORIGINAL_V1_BLOB,
    "original V1 contract must remain exactly historical");
  const historical = execFileSync("git",
    ["show", ORIGINAL_V1_REF + ":" + ORIGINAL_V1_CONTRACT], {
      cwd: ROOT, maxBuffer: 2 * 1024 * 1024, stdio: ["ignore","pipe","pipe"],
    });
  assert.equal(gitBlob(historical), ORIGINAL_V1_BLOB);
  const oldV2 = execFileSync("git",
    ["show", lock.exact_source_generation_commit + ":" + LEDGER_SOURCE], {
      cwd: ROOT, maxBuffer: 2 * 1024 * 1024, stdio: ["ignore","pipe","pipe"],
    });
  assert.equal(gitBlob(oldV2), OLD_LEDGER_SOURCE_BLOB);
  const actualInputs = SOURCE_AND_BUILD.map(([file, gitBlobExpected]) => {
    const bytes = readPinned(file);
    assert.equal(gitBlob(bytes), gitBlobExpected,
      "source/build input changed: " + file);
    return {path:file,git_blob:gitBlobExpected};
  });
  assert.equal(actualInputs.length, 15);
  const reviewedRuntime = lock.runtime_files.map((r, index) => {
    const bytes = readPinned(r.path);
    const digest = sha256(bytes);
    if (index === 4) {
      assert.equal(digest, CURRENT_LEDGER_DIST_SHA256,
        "new ledger runtime source is NOT reproducible");
      assert.notEqual(digest, r.sha256);
    } else {
      assert.equal(digest, r.sha256, "V2 other runtime byte drift: " + r.path);
      assert.equal(bytes.length, r.bytes, "V2 other runtime length drift: " + r.path);
    }
    return {path:r.path,installed_path:r.installed_path,bytes:bytes.length,sha256:digest};
  });
  const body = {
    schema:"void_buy_void_nimo_witness_v3_unaccepted_candidate_v1",
    marker:"VOID_BUY_VOID_NIMO_WITNESS_V3_UNACCEPTED_CANDIDATE_V1",
    candidate_generation:3,
    status:"HOLD_UNACCEPTED_SOURCE_CANDIDATE",
    historical_v1_manifest_id:lock.historical_v1_manifest_id,
    original_v1_contract_git_blob:ORIGINAL_V1_BLOB,
    proposed_v2_manifest_id:lock.candidate_manifest_id,
    proposed_v2_lock_git_blob:LOCK_BLOB,
    source_build_input_count:15,
    source_build_unchanged_since_v2:14,
    changed_source:{
      path:LEDGER_SOURCE,
      original_v2_git_blob:OLD_LEDGER_SOURCE_BLOB,
      current_git_blob:CURRENT_LEDGER_SOURCE_BLOB,
    },
    source_build_inputs:actualInputs,
    runtime_file_count:8,
    runtime_files:reviewedRuntime,
    authority:{
      derived_in_disposable_ci_only:true,
      historical_v1_attestation_reissued:false,
      proposed_v2_identity_reissued:false,
      combined_v3_installed_on_nimo:false,
      combined_v3_accepted_by_remote_witness:false,
      authenticated_custody_principal_verified:false,
      runtime_lease_or_dispatcher_mounted:false,
      customer_payment_or_allocation_written:false,
      protected_rollback_high_water_accepted:false,
      production_gate_ready:false,
      coupled_wc_void_presale_activated:false,
      signer_or_wallet_used:false,
      funds_moved:false,
    },
  };
  requireCandidate(body, lock);
  let negatives=0;
  for(const mutation of [
    x => {x.runtime_files[4].sha256="0".repeat(64);},
    x => {x.runtime_files[5].sha256="0".repeat(64);},
    x => {x.runtime_files.pop();},
    x => {x.changed_source.current_git_blob="0".repeat(40);},
    x => {x.authority.combined_v3_installed_on_nimo=true;},
    x => {x.authority.funds_moved=true;},
  ]) {
    const tampered=JSON.parse(JSON.stringify(body));
    mutation(tampered);
    assert.throws(()=>requireCandidate(tampered,lock));
    negatives++;
  }
  assert.equal(negatives,6);
  const candidateId="voidwfb3_"+sha256(Buffer.from(canonical(body),"utf8"));
  assert.notEqual(candidateId,lock.candidate_manifest_id);
  assert.notEqual(candidateId,lock.historical_v1_manifest_id);
  console.log("VOID_BUY_VOID_NIMO_COMBINED_V3_UNACCEPTED_SOURCE_GREEN");
  console.log("source_build_unchanged_since_v2=14/15");
  console.log("changed_ledger_git_blob="+CURRENT_LEDGER_SOURCE_BLOB);
  console.log("changed_ledger_runtime_sha256="+CURRENT_LEDGER_DIST_SHA256);
  console.log("other_v2_runtime_files_unchanged=7/7");
  console.log("six_candidate_mutation_controls_hold=true");
  console.log("candidate_manifest_id="+candidateId);
  console.log("original_frozen_v1_identity_preserved=true");
  console.log("reviewed_v2_source_lock_preserved=true");
  console.log("candidate_v3_installed_on_nimo=false");
  console.log("authenticated_custody_principal_verified=false");
  console.log("verified_payment_to_allocation_mounted=false");
  console.log("production_gate_ready=false");
  console.log("presale_activation=false");
  console.log("funds_moved=false");
  console.log("candidate_record="+canonical({...body,candidate_manifest_id:candidateId}));
}
main();
