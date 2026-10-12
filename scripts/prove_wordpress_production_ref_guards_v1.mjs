#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_WORDPRESS_PRODUCTION_REF_GUARDS_V1_PROOF_GREEN";
const ROOT = process.cwd();

const specs = [
  {
    label: "voidchain.org",
    workflow: ".github/workflows/voidchain-org-wordpress-home-v1.yml",
    environment: "voidchain-org-production",
    inspectError: "voidchain.org production inspect requires refs/heads/main",
    applyError: "voidchain.org production apply requires refs/heads/main",
  },
  {
    label: "nullfeed.org",
    workflow: ".github/workflows/nullfeed-org-wordpress-home-v1.yml",
    environment: "nullfeed-org-production",
    inspectError: "NullFeed production inspect requires refs/heads/main",
    applyError: "NullFeed production apply requires refs/heads/main",
  },
];

const jobBlock = (source, name) => {
  const marker = `\n  ${name}:\n`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${name} job`);
  const bodyStart = start + marker.length;
  const next = source.slice(bodyStart).search(/\n  [A-Za-z0-9_-]+:\n/);
  return next === -1
    ? source.slice(bodyStart)
    : source.slice(bodyStart, bodyStart + next);
};

const replaceJobIf = (source, name, replacement) => {
  const marker = `\n  ${name}:\n`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${name} job`);
  const bodyStart = start + marker.length;
  const next = source.slice(bodyStart).search(/\n  [A-Za-z0-9_-]+:\n/);
  const bodyEnd = next === -1 ? source.length : bodyStart + next;
  const body = source.slice(bodyStart, bodyEnd);
  const rewritten = body.replace(
    /^    if: .*$/m,
    `    if: ${replacement}`,
  );
  assert.notEqual(rewritten, body, `missing ${name} job-level if`);
  return source.slice(0, bodyStart) + rewritten + source.slice(bodyEnd);
};

const validateWorkflow = (source, spec) => {
  const proof = jobBlock(source, "proof");
  const inspectGuard = jobBlock(source, "inspect_ref_guard");
  const inspect = jobBlock(source, "inspect");
  const applyGuard = jobBlock(source, "apply_ref_guard");
  const apply = jobBlock(source, "apply");

  assert.match(
    inspectGuard,
    /if: github\.event_name == 'workflow_dispatch' && inputs\.operation == 'inspect'/,
    `${spec.label} inspect guard must be operation-bound`,
  );
  assert.match(
    applyGuard,
    /if: github\.event_name == 'workflow_dispatch' && inputs\.operation == 'apply'/,
    `${spec.label} apply guard must be operation-bound`,
  );
  for (const [label, block, expectedError] of [
    ["inspect", inspectGuard, spec.inspectError],
    ["apply", applyGuard, spec.applyError],
  ]) {
    assert.match(
      block,
      /if \[ "\$GITHUB_REF" != "refs\/heads\/main" \]; then/,
      `${spec.label} ${label} guard must require exact main`,
    );
    assert.ok(
      block.includes(expectedError),
      `${spec.label} ${label} guard must report the exact-main failure`,
    );
    assert.doesNotMatch(
      block,
      /\benvironment:\s|\bsecrets\./,
      `${spec.label} ${label} guard must not enter a production environment or use secrets`,
    );
  }

  assert.match(
    inspect,
    /^    if: github\.event_name == 'workflow_dispatch' && inputs\.operation == 'inspect'$/m,
    `${spec.label} inspect production job must remain exactly operation-bound`,
  );
  assert.match(
    apply,
    /^    if: github\.event_name == 'workflow_dispatch' && inputs\.operation == 'apply'$/m,
    `${spec.label} apply production job must remain exactly operation-bound`,
  );
  assert.ok(
    inspect.includes("needs: [proof, inspect_ref_guard]"),
    `${spec.label} inspect must depend on proof plus inspect guard`,
  );
  assert.ok(
    apply.includes("needs: [proof, apply_ref_guard]"),
    `${spec.label} apply must depend on proof plus apply guard`,
  );
  assert.ok(
    inspect.includes(`environment: ${spec.environment}`),
    `${spec.label} inspect must retain the reviewed production environment`,
  );
  assert.ok(
    apply.includes(`environment: ${spec.environment}`),
    `${spec.label} apply must retain the reviewed production environment`,
  );
  assert.doesNotMatch(
    proof,
    /\benvironment:\s|\bsecrets\./,
    `${spec.label} pull-request proof must not enter production environment or use secrets`,
  );
};

for (const spec of specs) {
  const source = readFileSync(path.join(ROOT, spec.workflow), "utf8");
  assert.doesNotThrow(
    () => validateWorkflow(source, spec),
    `${spec.label} canonical workflow must satisfy the production-ref contract`,
  );

  assert.throws(
    () => validateWorkflow(
      source.replace(
        "needs: [proof, inspect_ref_guard]",
        "needs: proof",
      ),
      spec,
    ),
    /inspect must depend on proof plus inspect guard/,
    `${spec.label} proof must reject an inspect job that bypasses its ref guard`,
  );

  assert.throws(
    () => validateWorkflow(
      source.replace(
        "needs: [proof, apply_ref_guard]",
        "needs: proof",
      ),
      spec,
    ),
    /apply must depend on proof plus apply guard/,
    `${spec.label} proof must reject an apply job that bypasses its ref guard`,
  );

  assert.throws(
    () => validateWorkflow(
      source.replace(
        'if [ "$GITHUB_REF" != "refs/heads/main" ]; then',
        'if [ "$GITHUB_REF" != "refs/heads/not-main" ]; then',
      ),
      spec,
    ),
    /guard must require exact main/,
    `${spec.label} proof must reject a weakened exact-main guard`,
  );

  assert.throws(
    () => validateWorkflow(
      source.replace(
        "runs-on: ubuntu-latest\n    timeout-minutes: 2\n    steps:",
        `runs-on: ubuntu-latest\n    timeout-minutes: 2\n    environment: ${spec.environment}\n    steps:`,
      ),
      spec,
    ),
    /guard must not enter a production environment or use secrets/,
    `${spec.label} proof must reject production-environment access in a guard job`,
  );

  for (const [job, operation] of [
    ["inspect", "inspect"],
    ["apply", "apply"],
  ]) {
    assert.throws(
      () => validateWorkflow(
        replaceJobIf(source, job, "always()"),
        spec,
      ),
      new RegExp(`${job} production job must remain exactly operation-bound`),
      `${spec.label} proof must reject status-function weakening on the ${job} production job`,
    );
    assert.throws(
      () => validateWorkflow(
        replaceJobIf(
          source,
          job,
          `github.event_name == 'workflow_dispatch' && inputs.operation != 'noop'`,
        ),
        spec,
      ),
      new RegExp(`${job} production job must remain exactly operation-bound`),
      `${spec.label} proof must reject operation broadening on the ${job} production job`,
    );
  }
}

process.stdout.write(`${MARKER}\n`);
