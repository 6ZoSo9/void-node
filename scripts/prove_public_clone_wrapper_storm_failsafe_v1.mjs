import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const envSourcePath = path.join(root, "src", "util", "env.ts");
const indexSourcePath = path.join(root, "src", "index.ts");
const launcherPath = path.join(root, "run-void-node.sh");
const envExamplePath = path.join(root, ".env.example");
const builtEnvPath = path.join(root, "dist", "util", "env.js");

for (const file of [envSourcePath, indexSourcePath, launcherPath, envExamplePath, builtEnvPath]) {
  assert.equal(fs.existsSync(file), true, `required file missing: ${path.relative(root, file)}`);
}

const envSource = fs.readFileSync(envSourcePath, "utf8");
const indexSource = fs.readFileSync(indexSourcePath, "utf8");
const launcher = fs.readFileSync(launcherPath, "utf8");
const envExample = fs.readFileSync(envExamplePath, "utf8");

assert.match(
  envSource,
  /export function normalizeWrapperStormDisableFlagV1\(raw: string \| undefined\): "0" \| "1" \{\s*return raw === "0" \? "0" : "1";\s*\}/,
  "production wrapper-storm normalization must preserve only exact explicit 0"
);
assert.match(
  envSource,
  /process\.env\.VOID_DISABLE_WRAPPER_STORM = normalizeWrapperStormDisableFlagV1\(\s*process\.env\.VOID_DISABLE_WRAPPER_STORM\s*\);/,
  "production environment module must normalize the live process flag at module evaluation"
);
assert.match(
  indexSource,
  /import \{ loadEnv \} from ["']\.\/util\/env\.js["'];/,
  "src/index.ts must statically compose the production environment module"
);

const representativeProductionWrapperGates = [
  {
    name: "attachTxrootSaveHook",
    pattern: /VOID_DISABLE_WRAPPER_STORM !== ["']1["'][^\n]*attachTxrootSaveHook\(/,
  },
  {
    name: "txrootCoreStickyWrapper",
    pattern: /VOID_DISABLE_WRAPPER_STORM !== ["']1["'][^\n]*txrootCoreStickyWrapper\(/,
  },
  {
    name: "txrootForensicsStickyV2",
    pattern: /VOID_DISABLE_WRAPPER_STORM !== ["']1["'][^\n]*txrootForensicsStickyV2\(/,
  },
];
for (const gate of representativeProductionWrapperGates) {
  assert.match(
    indexSource,
    gate.pattern,
    `production index must retain the ${gate.name} wrapper-family disable gate`
  );
}
assert.match(
  envExample,
  /^VOID_DISABLE_WRAPPER_STORM=1$/m,
  "fresh public-clone configuration must disable wrapper storm families"
);

const runCaseStart = launcher.indexOf('case "$COMMAND" in');
assert.ok(runCaseStart >= 0, "clone-and-run command dispatch missing");
const runCase = launcher.slice(runCaseStart);
const loadIndex = runCase.indexOf("    load_env_file\n");
const directExecIndex = runCase.indexOf('    exec "$NODE_BIN" "$ROOT/dist/index.js"');
assert.ok(loadIndex >= 0, "clone-and-run run path must load .env");
assert.ok(directExecIndex > loadIndex, "clone-and-run must load .env before the production node process starts");
assert.match(
  launcher,
  /if \[\[ -v \$name \]\]; then\s*continue\s*fi\s*printf -v "\$name" '%s' "\$value"\s*export "\$name"/,
  "clone-and-run must export .env values without overwriting an already explicit process environment"
);

const moduleUrl = pathToFileURL(builtEnvPath).href;

function executeProductionEnv({ value, envFile = "" }) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-wrapper-failsafe-v1-"));
  try {
    if (envFile !== null) fs.writeFileSync(path.join(temp, ".env"), envFile, "utf8");
    const childEnv = { ...process.env };
    delete childEnv.VOID_DISABLE_WRAPPER_STORM;
    if (value !== undefined) childEnv.VOID_DISABLE_WRAPPER_STORM = value;

    const code = `
      import { loadEnv } from ${JSON.stringify(moduleUrl)};
      const snapshot = loadEnv();
      process.stdout.write(JSON.stringify({
        processValue: process.env.VOID_DISABLE_WRAPPER_STORM,
        snapshotValue: snapshot.VOID_DISABLE_WRAPPER_STORM
      }));
    `;
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
      cwd: temp,
      env: childEnv,
      encoding: "utf8",
      timeout: 15000,
    });
    assert.equal(child.status, 0, `production env subprocess failed: ${child.stderr || child.stdout}`);
    return JSON.parse(child.stdout);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

const cases = [
  { name: "stale-env-missing-flag", value: undefined, envFile: "HTTP_PORT=4100\n", expected: "1" },
  { name: "missing-process-flag", value: undefined, envFile: null, expected: "1" },
  { name: "blank", value: "", envFile: null, expected: "1" },
  { name: "explicit-disabled", value: "1", envFile: null, expected: "1" },
  { name: "malformed", value: "garbage", envFile: null, expected: "1" },
  { name: "whitespace-zero-is-not-opt-in", value: " 0 ", envFile: null, expected: "1" },
  { name: "exact-explicit-opt-in", value: "0", envFile: null, expected: "0" },
];

for (const scenario of cases) {
  const actual = executeProductionEnv(scenario);
  assert.equal(actual.processValue, scenario.expected, `${scenario.name}: process flag mismatch`);
  assert.equal(actual.snapshotValue, scenario.expected, `${scenario.name}: loadEnv snapshot mismatch`);
}

console.log("VOID_PUBLIC_CLONE_WRAPPER_STORM_FAILSAFE_V1_GREEN");
console.log("production_env_module_executed=true");
console.log("fresh_clone_default_disabled=true");
console.log("stale_env_missing_flag_disabled=true");
console.log("blank_or_malformed_disabled=true");
console.log("exact_zero_opt_in_only=true");
console.log("representative_wrapper_gates_bound=true");
console.log("live_node_started=false");
console.log("runtime_mutation=false");
