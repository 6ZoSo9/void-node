#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ACCOUNTING, AUTHORITY, EVIDENCE_PROOF, MEMBERS, PLANNER, ROOT, RUNNER, SOURCE_PATHS, WORKFLOWS,
  artifactName, caseManifest, commandRecord, commandSet, decode, digest, encode,
  makeBundle, makeReceipt, readMembers, validateReceipts, verifyBundle,
} from "./void_datanet_reconstruction_evidence_v1.mjs";

assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === "--case-manifest"));
const caseNames = [];
function check(name, fn) { fn(); caseNames.push(name); }
const clone = value => structuredClone(value);
const source = { head: "a".repeat(40), tree: "b".repeat(40), entries: SOURCE_PATHS.map(path => ({
  path, mode: path.startsWith("scripts/") && !path.includes("/lib/") ? "100755" : "100644", blob: "c".repeat(40),
})) };
const run = { repository: "6ZoSo9/void-node", id: "123", attempt: "1", event: "pull_request", workflow_sha: "d".repeat(40) };
const runtime = major => ({ major, version: `v${major}.0.0`, platform: "linux", arch: "x64" });
function output(suite) {
  return `cases=1\ncase_manifest_json=${JSON.stringify({ schema: "VOID_DATANET_CASE_MANIFEST_V1", suite, case_names: ["synthetic receipt validation control"] })}\n`;
}
const commands = Object.fromEntries(["planner", "accounting"].map(lane => [lane, commandSet(lane).map(c => {
  const suite = { [PLANNER]: "planner", [ACCOUNTING]: "accounting", [EVIDENCE_PROOF]: "evidence" }[c.args[0]];
  return commandRecord(c, suite ? output(suite) : "");
})]));
const expected = { source, run, commands };
const receipts = MEMBERS.map(m => makeReceipt(source, run, m.lane, runtime(m.major), commands[m.lane]));
const texts = receipts.map(encode);

check("complete six-member matrix accepted", () => assert.equal(validateReceipts(texts, expected).length, 6));
check("member arrival order is immaterial", () => assert.deepEqual(validateReceipts([...texts].reverse(), expected), receipts));
check("bundle is portable and preserves full receipts", () => {
  const bundle = makeBundle(texts, expected, runtime(24));
  assert.deepEqual(verifyBundle(encode(bundle), expected), bundle);
  assert.equal(bundle.members.length, 6);
  assert.deepEqual(bundle.authority, AUTHORITY);
  assert.equal(bundle.authority.source_green, false);
  assert.equal(bundle.authority.runtime_canary_green, false);
});
check("missing runtime rejected", () => assert.throws(() => validateReceipts(texts.slice(0, 5), expected)));
check("extra receipt rejected", () => assert.throws(() => validateReceipts([...texts, texts[0]], expected)));
check("duplicate Node 24 cannot replace Node 26", () => {
  const altered = [...texts]; altered[2] = texts[1]; assert.throws(() => validateReceipts(altered, expected));
});

for (const [name, mutate] of [
  ["mixed source head", r => { r.source.head = "e".repeat(40); }],
  ["mixed source tree", r => { r.source.tree = "e".repeat(40); }],
  ["substituted proof blob", r => { r.source.entries.find(e => e.path === PLANNER).blob = "e".repeat(40); }],
  ["substituted file mode", r => { r.source.entries.find(e => e.path === PLANNER).mode = "100644"; }],
  ["missing source entry", r => { r.source.entries.pop(); }],
  ["substituted workflow blob", r => { r.job.workflow.blob = "e".repeat(40); }],
  ["substituted workflow path", r => { r.job.workflow.path = WORKFLOWS.accounting; }],
  ["stale run", r => { r.run.id = "122"; }],
  ["stale attempt", r => { r.run.attempt = "2"; }],
  ["different repository", r => { r.run.repository = "other/repository"; }],
  ["different workflow definition", r => { r.run.workflow_sha = "e".repeat(40); }],
  ["wrong event", r => { r.run.event = "workflow_dispatch"; }],
  ["wrong logical job", r => { r.job.logical_id = "aggregate"; }],
  ["wrong matrix key", r => { r.job.matrix_key = "planner-node-26"; }],
  ["unsupported runtime", r => { r.runtime.version = "v25.0.0"; r.runtime.major = 25; }],
  ["mislabeled runtime", r => { r.runtime.version = "v26.0.0"; }],
  ["mismatched runtime patch", r => { r.runtime.version = "v22.1.0"; }],
  ["wrong runtime platform", r => { r.runtime.platform = "darwin"; }],
  ["wrong runtime architecture", r => { r.runtime.arch = "arm64"; }],
  ["missing command", r => { r.commands.pop(); }],
  ["duplicate command", r => { r.commands[1] = r.commands[0]; }],
  ["failed command", r => { r.commands[0].exit_code = 1; }],
  ["substituted command", r => { r.commands[0].args = ["--version"]; }],
  ["modified stdout with recomputed digest", r => {
    const c = r.commands.find(c => c.case_manifest);
    c.stdout = "forged\n" + c.stdout; c.output_sha256 = digest(JSON.stringify({ stdout: c.stdout, stderr: "" }));
  }],
  ["modified case count", r => { r.commands.find(c => c.case_manifest).case_manifest.count = 999; }],
  ["modified case identity", r => { r.commands.find(c => c.case_manifest).case_manifest.case_names[0] = "substituted"; }],
  ["unknown nested field", r => { r.job.extra = true; }],
  ["unknown top-level field", r => { r.approved = true; }],
  ["promoted terminal", r => { r.terminal = "AVAILABLE"; }],
  ["promoted operational authority", r => { r.authority.publication_authority = true; }],
  ["promoted source acceptance", r => { r.authority.source_green = true; }],
  ["Nimo primitive substitution", r => { r.schema = "NIMO_STORAGE_PRIMITIVES_11_OF_11"; }],
]) {
  check(`${name} rejected`, () => {
    const altered = receipts.map(clone); mutate(altered[0]);
    assert.throws(() => validateReceipts(altered.map(encode), expected));
  });
}

check("duplicate JSON keys rejected", () => {
  const altered = texts[0].replace('"schema":"VOID_DATANET_JOB_RECEIPT_V1"', '"schema":"forged","schema":"VOID_DATANET_JOB_RECEIPT_V1"');
  assert.throws(() => validateReceipts([altered, ...texts.slice(1)], expected));
});
check("truncated JSON rejected", () => assert.throws(() => decode(texts[0].slice(0, -10))));
check("oversized receipt rejected", () => assert.throws(() => decode(" ".repeat(262145))));
check("noncanonical JSON rejected", () => assert.throws(() => decode(JSON.stringify(receipts[0], null, 2) + "\n")));
check("command failure cannot mint a receipt", () => assert.throws(() => commandRecord(commandSet("planner")[0], "", "", 1)));
check("unexpected stderr rejected", () => assert.throws(() => commandRecord(commandSet("planner")[0], "", "warning", 0)));
check("missing case manifest rejected", () => assert.throws(() => caseManifest("cases=1\n", "planner")));
check("duplicate case names rejected", () => {
  const manifest = { schema: "VOID_DATANET_CASE_MANIFEST_V1", suite: "planner", case_names: ["same", "same"] };
  assert.throws(() => caseManifest(`cases=2\ncase_manifest_json=${JSON.stringify(manifest)}\n`, "planner"));
});
check("bundle member digest substitution rejected", () => {
  const bundle = makeBundle(texts, expected, runtime(24)); bundle.members[0].sha256 = "0".repeat(64);
  assert.throws(() => verifyBundle(encode(bundle), expected));
});
check("bundle extra field rejected", () => {
  const bundle = makeBundle(texts, expected, runtime(24)); bundle.accepted = true;
  assert.throws(() => verifyBundle(encode(bundle), expected));
});

const directory = mkdtempSync(join(tmpdir(), "void-datanet-evidence-proof-"));
try {
  for (let i = 0; i < MEMBERS.length; i += 1) {
    const member = MEMBERS[i], folder = join(directory, artifactName(member.lane, member.major, expected));
    mkdirSync(folder); writeFileSync(join(folder, "receipt.json"), texts[i]);
  }
  check("six exact artifact directories accepted", () => assert.deepEqual(readMembers(directory, expected), texts));
  check("extra artifact directory rejected", () => {
    mkdirSync(join(directory, "unexpected"));
    try { assert.throws(() => readMembers(directory, expected)); } finally { rmSync(join(directory, "unexpected"), { recursive: true }); }
  });
  const member = MEMBERS[0], folder = join(directory, artifactName(member.lane, member.major, expected)), file = join(folder, "receipt.json");
  check("missing artifact file rejected", () => {
    renameSync(file, file + ".moved");
    try { assert.throws(() => readMembers(directory, expected)); } finally { renameSync(file + ".moved", file); }
  });
  check("symbolic-link receipt rejected", () => {
    const saved = directory + "-saved-receipt"; renameSync(file, saved); symlinkSync(saved, file);
    try { assert.throws(() => readMembers(directory, expected), /artifact_not_regular/); } finally { rmSync(file); renameSync(saved, file); }
  });
  check("symbolic-link member directory rejected", () => {
    const saved = directory + "-saved-folder"; renameSync(folder, saved); symlinkSync(saved, folder);
    try { assert.throws(() => readMembers(directory, expected), /artifact_directory_type/); } finally { rmSync(folder); renameSync(saved, folder); }
  });
  check("oversized artifact file rejected before parsing", () => {
    writeFileSync(file, " ".repeat(262145));
    try { assert.throws(() => readMembers(directory, expected), /artifact_file_bound/); } finally { writeFileSync(file, texts[0]); }
  });
  check("valid receipt under another member name rejected", () => {
    writeFileSync(file, texts[5]);
    try { assert.throws(() => readMembers(directory, expected), /artifact_member_binding/); } finally { writeFileSync(file, texts[0]); }
  });
  for (const lane of ["planner", "accounting"]) {
    check(`failed ${lane} dependency cannot produce a bundle`, () => {
      const out = join(directory, "must-not-exist");
      const result = spawnSync(process.execPath, [join(ROOT, RUNNER), "aggregate", directory, out], {
        encoding: "utf8", timeout: 3000, maxBuffer: 4096,
        env: { ...process.env, PLANNER_RESULT: lane === "planner" ? "failure" : "success", ACCOUNTING_RESULT: lane === "accounting" ? "failure" : "success" },
      });
      assert.equal(result.status, 1); assert.equal(result.stdout, "");
      assert.ok(result.stderr.includes(`${lane}_dependency_failed`));
    });
  }
} finally { rmSync(directory, { recursive: true, force: true }); }

check("all source and evidence inputs trigger the parent workflow", () => {
  const workflow = readFileSync(join(ROOT, WORKFLOWS.planner), "utf8");
  for (const path of SOURCE_PATHS) assert.equal(workflow.split(`- "${path}"`).length - 1, 2, path);
  for (const text of ["needs: [planner, accounting]", "if: ${{ always() }}", "merge-multiple: false", "if-no-files-found: error", `uses: ./${WORKFLOWS.accounting}`]) assert.ok(workflow.includes(text), text);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/download-artifact@[0-9a-f]{40}/);
});
check("accounting matrix is a same-run reusable workflow", () => {
  const workflow = readFileSync(join(ROOT, WORKFLOWS.accounting), "utf8");
  assert.ok(workflow.includes("workflow_call:"));
  assert.ok(!workflow.includes("pull_request:") && !workflow.includes("push:"));
  assert.ok(workflow.includes("node: [22, 24, 26]"));
  assert.ok(workflow.includes(`node ${RUNNER} emit accounting`));
  assert.ok(workflow.includes("persist-credentials: false"));
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);
});
check("all command vectors preserve syntax and accounting coverage", () => {
  for (const lane of ["planner", "accounting"]) {
    const vector = commandSet(lane);
    for (const path of SOURCE_PATHS.filter(p => p.endsWith(".mjs"))) assert.ok(vector.some(c => c.program === "node" && c.args[0] === "--check" && c.args[1] === path));
    assert.ok(vector.some(c => c.args[0] === PLANNER));
    assert.ok(vector.some(c => c.args[0] === EVIDENCE_PROOF));
    assert.ok(vector.some(c => c.program === "git" && c.args.join(" ") === "diff --check HEAD"));
  }
  assert.ok(commandSet("accounting").some(c => c.args[0] === ACCOUNTING));
});

assert.equal(new Set(caseNames).size, caseNames.length);
console.log("VOID_DATANET_EVIDENCE_PROOF_V1_GREEN");
console.log("exact_six_member_matrix_required=true");
console.log("mixed_stale_substituted_evidence_rejected=true");
console.log("portable_evidence_grants_operational_authority=false");
console.log(`cases=${caseNames.length}`);
if (process.argv[2] === "--case-manifest") console.log("case_manifest_json=" + JSON.stringify({
  schema: "VOID_DATANET_CASE_MANIFEST_V1", suite: "evidence", case_names: caseNames,
}));
