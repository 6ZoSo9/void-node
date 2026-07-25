#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const BOUNDARY = [
  ".github/workflows/void-ai-agent-first-contact-v1.yml",
  "docs/public/ai-agent-first-contact-v1.md",
  "public/public-node/agents/first-contact-v1.json",
  "public/public-node/agents/join-v1.html",
  "scripts/prove_void_ai_agent_first_contact_v1.mjs",
  "tools/void-ai-agent-first-contact-v1.mjs"
];
const AUTHENTICITY_ROUTE = "/.well-known/void-network-authenticity.json";
const MANIFEST_PATH = join(
  ROOT,
  "public/public-node/agents/first-contact-v1.json",
);
const JOIN_PATH = join(
  ROOT,
  "public/public-node/agents/join-v1.html",
);
const CLIENT_PATH = join(
  ROOT,
  "tools/void-ai-agent-first-contact-v1.mjs",
);

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
assert.equal(manifest.marker, "VOID_AI_AGENT_FIRST_CONTACT_V1");
assert.equal(manifest.protocol, "void-ai-agent-first-contact");
assert.equal(manifest.version, "1");
assert.equal(manifest.status, "public_read_only");
assert.equal(manifest.network.name, "VOID Mainnet-0");
assert.equal(manifest.network.chain_id, 2050);
assert.equal(manifest.connection_mode, "read_only");
assert.equal(manifest.entrypoints.official_authenticity, AUTHENTICITY_ROUTE);
assert.equal(manifest.honesty.paid_work_promised, false);
assert.equal(manifest.honesty.work_credit_earning_promised, false);
assert.equal(manifest.honesty.mutation_authority_granted, false);
assert.deepEqual(manifest.client.http_methods, ["GET"]);

const clientSource = await readFile(CLIENT_PATH, "utf8");
for (const forbidden of [
  'method: "POST"',
  'method: "PUT"',
  'method: "PATCH"',
  'method: "DELETE"',
  "writeFile",
  "appendFile",
  "createWriteStream",
  "privateKey",
]) {
  assert.equal(
    clientSource.includes(forbidden),
    false,
    `client contains forbidden token: ${forbidden}`,
  );
}

const joinHtml = await readFile(JOIN_PATH, "utf8");
for (const required of [
  "VOID AI Agent First Contact",
  manifest.entrypoints.first_contact,
  manifest.entrypoints.well_known_discovery,
  manifest.entrypoints.authentication,
  manifest.entrypoints.capabilities,
  manifest.entrypoints.agent_intake,
]) {
  assert.equal(
    joinHtml.includes(required),
    true,
    `join page missing: ${required}`,
  );
}
assert.equal(
  /<script|<img|<link[^>]+href=["']https?:/i.test(joinHtml),
  false,
  "join page must not load active external resources",
);

const fixtures = new Map([
  [manifest.entrypoints.first_contact, manifest],
  [
    manifest.entrypoints.well_known_discovery,
    {
      marker: "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
      network: "VOID Mainnet-0",
      chain_id: 2050,
      canonical: "/public-node/agents/discovery-v1.json",
    },
  ],
  [
    manifest.entrypoints.official_authenticity,
    {
      marker: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1",
      status: "official",
      network: "VOID Mainnet-0",
      chain_id: 2050,
      identity: "mainnet0",
      mutation_authority_granted: false,
    },
  ],
  [
    manifest.entrypoints.authentication,
    {
      marker: "VOID_AI_AGENT_AUTHENTICATION_V1",
      status: "public_read_only",
      network: "VOID Mainnet-0",
      chain_id: 2050,
    },
  ],
  [
    manifest.entrypoints.capabilities,
    {
      marker: "VOID_AI_AGENT_CAPABILITIES_V1",
      status: "public_read_only",
      network: "VOID Mainnet-0",
      chain_id: 2050,
      paid_work_promised: false,
      work_credit_earning_promised: false,
    },
  ],
  [
    manifest.entrypoints.agent_intake,
    {
      marker: "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1",
      status: "public_read_only",
      network: "VOID Mainnet-0",
      chain_id: 2050,
    },
  ],
]);

const server = createServer((request, response) => {
  if (request.method !== "GET") {
    response.writeHead(405, {
      "content-type": "application/json; charset=utf-8",
      allow: "GET",
    });
    response.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }
  const route = new URL(
    request.url ?? "/",
    "http://127.0.0.1",
  ).pathname;
  const fixture = fixtures.get(route);
  if (!fixture) {
    response.writeHead(404, {
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ error: "not_found" }));
    return;
  }
  const body = `${JSON.stringify(fixture)}\n`;
  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const address = server.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const result = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [CLIENT_PATH, "--base-url", baseUrl],
      {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });

  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(
    report.marker,
    "VOID_AI_AGENT_FIRST_CONTACT_CLIENT_V1",
  );
  assert.equal(report.status, "ready_read_only");
  assert.equal(report.connection_mode, "read_only");
  assert.equal(report.official_network_verified, true);
  assert.equal(Object.values(report.checks).every(Boolean), true);
  assert.equal(report.authority.mutation_authority_granted, false);
  assert.equal(report.authority.wallet_accessed, false);
  assert.equal(report.authority.credentials_accessed, false);
  assert.equal(report.authority.transaction_submitted, false);
  assert.equal(report.authority.paid_work_submitted, false);
  assert.equal(report.authority.work_credits_earned, false);
  assert.equal(
    report.next_actions.some((action) =>
      action.id.includes("paid_work"),
    ),
    false,
  );
  assert.equal(
    report.next_actions.some((action) =>
      action.id.includes("work_credit"),
    ),
    false,
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}

async function gitLines(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "git",
      args,
      {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr));
        return;
      }
      resolve(
        stdout
          .replace(/\n$/, "")
          .split("\n")
          .filter((line) => line.length > 0),
      );
    });
  });
}

const workingBoundary = [
  ...new Set(
    (
      await gitLines([
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
      ])
    ).map((line) => line.slice(3)),
  ),
].sort();
const expectedBoundary = [...BOUNDARY].sort();
const outsideBoundary = workingBoundary.filter(
  (path) => !BOUNDARY.includes(path),
);
assert.deepEqual(
  outsideBoundary,
  [],
  "working tree contains a change outside the six-file lane",
);

let boundaryVerificationMode = "working_tree";
let boundaryIntroductionCommit = null;

if (
  workingBoundary.length === expectedBoundary.length &&
  workingBoundary.every(
    (path, index) => path === expectedBoundary[index],
  )
) {
  assert.deepEqual(workingBoundary, expectedBoundary);
} else {
  const introductionCommits = await gitLines([
    "log",
    "--diff-filter=A",
    "--format=%H",
    "-n",
    "1",
    "--",
    "public/public-node/agents/first-contact-v1.json",
  ]);
  assert.equal(
    introductionCommits.length,
    1,
    "first-contact introduction commit was not found",
  );
  boundaryIntroductionCommit = introductionCommits[0];

  const introducedBoundary = [
    ...new Set(
      await gitLines([
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        boundaryIntroductionCommit,
      ]),
    ),
  ].sort();

  assert.deepEqual(
    introducedBoundary,
    expectedBoundary,
    "the introduction commit did not add the exact six-file lane",
  );
  boundaryVerificationMode =
    workingBoundary.length === 0
      ? "clean_checkout_introduction_commit"
      : "in_boundary_repair_plus_introduction_commit";
}

console.log(
  `boundary_verification_mode=${boundaryVerificationMode}`,
);
if (boundaryIntroductionCommit !== null) {
  console.log(
    `boundary_introduction_commit=${boundaryIntroductionCommit}`,
  );
}

console.log("first_contact_marker=VOID_AI_AGENT_FIRST_CONTACT_V1");
console.log("client_marker=VOID_AI_AGENT_FIRST_CONTACT_CLIENT_V1");
console.log("official_network_verified=true");
console.log("connection_mode=read_only");
console.log("get_only_client=true");
console.log("paid_work_promised=false");
console.log("work_credit_earning_promised=false");
console.log("mutation_authority_granted=false");
console.log("boundary_file_count=6");
console.log("VOID_AI_AGENT_FIRST_CONTACT_KIT_V1_PROOF_EXACT_GREEN");
