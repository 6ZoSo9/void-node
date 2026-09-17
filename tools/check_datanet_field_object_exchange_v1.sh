#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const repo = process.cwd();
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const required = {
  "datanet:field-object:create": "node tools/datanet-field-object-create-v1.mjs",
  "datanet:field-object:pull": "node tools/datanet-field-object-pull-v1.mjs",
};
for (const [k, v] of Object.entries(required)) {
  assert.equal(pkg.scripts?.[k], v, `missing package script ${k}`);
}
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "void-field-exchange-"));
try {
  // Trusted, disposable proof setup; the pull CLI never provisions directories.
  const root = path.join(fixture, ".void-field-trial");
  fs.mkdirSync(root, { mode: 0o700 });
  fs.mkdirSync(path.join(root, "datanet-field-object-pull"), { mode: 0o700 });
  const run = (tool, args = []) => execFileSync(
    process.execPath, [path.join(repo, "tools", tool), ...args],
    { cwd: fixture, encoding: "utf8", timeout: 10000 },
  );
  assert.match(run("datanet-field-object-create-v1.mjs"),
    /VOID_DATANET_FIELD_OBJECT_CREATE_V1_GREEN/);
  const latest = JSON.parse(fs.readFileSync(path.join(fixture,
    "public/public-node/datanet/field-objects/latest.json"), "utf8"));
  const source = require("node:url").pathToFileURL(path.join(fixture, latest.object_path));
  assert.match(run("datanet-field-object-pull-v1.mjs", [String(source), latest.sha256]),
    /VOID_DATANET_FIELD_OBJECT_PULL_V1_GREEN/);
  console.log("VOID_DATANET_FIELD_OBJECT_EXCHANGE_V1_GREEN");
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
NODE
