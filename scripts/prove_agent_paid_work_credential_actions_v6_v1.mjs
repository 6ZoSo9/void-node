#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const MARKER = "VOID_AGENT_PAID_WORK_CREDENTIAL_ACTIONS_V6_V1";

const workflows = Object.freeze([
  {
    path: ".github/workflows/external-agent-credential-request-packet-v1.yml",
    setupPython: true,
  },
  {
    path: ".github/workflows/agent-paid-work-credential-request-intake-v1.yml",
    setupPython: false,
  },
  {
    path: ".github/workflows/agent-paid-work-credential-request-gateway-v1.yml",
    setupPython: false,
  },
  {
    path: ".github/workflows/agent-paid-work-credential-request-review-queue-v1.yml",
    setupPython: false,
  },
  {
    path: ".github/workflows/agent-paid-work-credential-lifecycle-cli-v1.yml",
    setupPython: false,
  },
  {
    path: ".github/workflows/agent-paid-work-real-agent-handoff-v1.yml",
    setupPython: false,
  },
  {
    path: ".github/workflows/agent-paid-work-credential-registry-v1.yml",
    setupPython: false,
  },
  {
    path: ".github/workflows/agent-paid-work-credential-wc-account-binding-lifecycle-v1.yml",
    setupPython: false,
  },
  {
    path: ".github/workflows/agent-paid-work-credential-wc-account-binding-retirement-v1.yml",
    setupPython: false,
  },
  {
    path: ".github/workflows/agent-paid-work-credential-actions-v6-v1.yml",
    setupPython: false,
  },
]);

function count(source, needle) {
  return source.split(needle).length - 1;
}

function checkoutBlock(source, path) {
  const start = source.indexOf("- uses: actions/checkout@v6");
  assert.notEqual(start, -1, `${path}: checkout@v6 step missing`);

  const nextStep = source.indexOf("\n      - ", start + 1);
  return source.slice(start, nextStep === -1 ? source.length : nextStep);
}

for (const workflow of workflows) {
  const source = readFileSync(workflow.path, "utf8");

  assert.equal(
    count(source, "uses: actions/checkout@v6"),
    1,
    `${workflow.path}: expected exactly one checkout@v6 step`,
  );
  assert.equal(source.includes("actions/checkout@v4"), false, workflow.path);
  assert.equal(source.includes("actions/checkout@v5"), false, workflow.path);
  assert.match(
    checkoutBlock(source, workflow.path),
    /persist-credentials:\s*false/,
    `${workflow.path}: checkout must disable credential persistence`,
  );
  assert.equal(
    source.includes("persist-credentials: true"),
    false,
    `${workflow.path}: checkout credential persistence must remain disabled`,
  );

  assert.equal(
    count(source, "uses: actions/setup-node@v6"),
    1,
    `${workflow.path}: expected exactly one setup-node@v6 step`,
  );
  assert.equal(source.includes("actions/setup-node@v4"), false, workflow.path);
  assert.equal(source.includes("actions/setup-node@v5"), false, workflow.path);
  assert.match(
    source,
    /node-version:\s*["']?22["']?/,
    `${workflow.path}: lowest-supported Node.js proof baseline changed`,
  );

  assert.match(
    source,
    /permissions:\s*\n\s+contents:\s*read/,
    `${workflow.path}: explicit contents-read permission missing`,
  );
  assert.equal(source.includes("contents: write"), false, workflow.path);

  if (workflow.setupPython) {
    assert.equal(
      count(source, "uses: actions/setup-python@v6"),
      1,
      `${workflow.path}: expected exactly one setup-python@v6 step`,
    );
    assert.equal(source.includes("actions/setup-python@v4"), false, workflow.path);
    assert.equal(source.includes("actions/setup-python@v5"), false, workflow.path);
  } else {
    assert.equal(
      source.includes("actions/setup-python@"),
      false,
      `${workflow.path}: unexpected Python setup action`,
    );
  }
}

console.log(
  JSON.stringify(
    {
      marker: MARKER,
      workflow_count: workflows.length,
      checkout_generation: 6,
      setup_node_generation: 6,
      setup_python_generation: 6,
      setup_python_workflow_count: workflows.filter(
        (workflow) => workflow.setupPython,
      ).length,
      checkout_credentials_persisted: false,
      permissions: "contents_read",
      node_baseline_major: 22,
      status: "GREEN",
    },
    null,
    2,
  ),
);
