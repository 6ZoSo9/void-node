import { strict as assert } from "node:assert";
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const TOOL = path.resolve(
  "tools/public-node-operator-evidence-workflow-v1.mjs",
);
const DOC = path.resolve(
  "docs/public-node/public-node-operator-evidence-workflow-v1.md",
);
const PROOF_MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_WORKFLOW_V1_PROOF_GREEN";

const REQUIRED_ROUTES = [
  "/public-node",
  "/public-node/route-index.json",
  "/public-node/route-manifest.json",
  "/public-node/self-check-snapshot.json",
  "/public-node/share-link.json",
  "/public-node/tester-bundle.json",
  "/public-node/outside-tester-smoke.json",
  "/proofs",
];

type Mode = "green" | "hold";
let mode: Mode = "green";
const observedMethods: string[] = [];

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function json(res: http.ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  observedMethods.push(req.method || "");
  if (req.method !== "GET") {
    json(res, 405, { error: "method_not_allowed" });
    return;
  }

  const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
  if (pathname === "/health") {
    json(res, 200, {
      ok: true,
      proto: 1,
      nodeId: "fixture-node-operator-evidence-workflow-v1",
      http: 4100,
      p2p: 4700,
      peers: ["fixture-peer-a", "fixture-peer-b"],
      listen: ["127.0.0.1:4700"],
    });
    return;
  }
  if (pathname === "/__void/ready.json") {
    json(res, 200, {
      ready: true,
      head: 1856587,
      lastmile_seen: 1856587,
      gap: 0,
      txroot_live: 1,
      reasons: [],
    });
    return;
  }
  if (pathname === "/blocks/latest/number2.json") {
    json(res, 200, { number: 1856587, __headfix: "fixture" });
    return;
  }
  if (pathname === "/p2p/peers") {
    json(res, 200, { peers: [{ id: "a" }, { id: "b" }] });
    return;
  }
  if (pathname === "/.well-known/void-public-node.json") {
    json(res, 200, {
      marker: "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1",
      links: {
        public_node: "http://canonical.example/public-node",
        route_manifest:
          "http://canonical.example/public-node/route-manifest.json",
        self_check_snapshot:
          "http://canonical.example/public-node/self-check-snapshot.json",
        proofs: "http://canonical.example/proofs",
      },
      policy: {
        public_routes_only: true,
        read_only: true,
        mutation: false,
      },
    });
    return;
  }
  if (pathname === "/public-node/route-index.json") {
    json(res, 200, {
      marker: "VOID_PUBLIC_NODE_ROUTE_INDEX_V1",
      routes: REQUIRED_ROUTES,
    });
    return;
  }
  if (pathname === "/public-node/route-manifest.json") {
    json(res, 200, {
      marker: "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1",
      routes:
        mode === "hold"
          ? [...REQUIRED_ROUTES, "/__void/admin/unsafe"]
          : REQUIRED_ROUTES,
    });
    return;
  }
  if (pathname === "/public-node/self-check-snapshot.json") {
    json(res, 200, {
      marker: "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1",
      routes: REQUIRED_ROUTES,
      policy: { public_post_endpoint: false },
    });
    return;
  }
  json(res, 404, { error: "not_found", pathname });
});

async function listen(): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert(address && typeof address === "object");
  return address.port;
}

async function run(
  port: number,
  outputDir: string,
  privateKey: string,
  extra: string[] = [],
): Promise<{ status: number; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        TOOL,
        "--base",
        `http://127.0.0.1:${port}`,
        "--expected-peer-count",
        "2",
        "--output-dir",
        outputDir,
        "--operator-id",
        "fixture-operator",
        "--node-key",
        "fixture-node",
        "--private-key",
        privateKey,
        "--observed-at",
        "2026-07-20T08:00:00Z",
        "--reviewed-at",
        "2026-07-20T08:00:01Z",
        ...extra,
      ],
      {
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
      resolve({ status: code ?? -1, stdout, stderr });
    });
  });
}

function load(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function verifyChecksums(workflowDir: string): void {
  const lines = fs
    .readFileSync(path.join(workflowDir, "SHA256SUMS.txt"), "utf8")
    .trim()
    .split("\n");
  assert(lines.length >= 6);
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  ([A-Za-z0-9._/-]+)$/.exec(line);
    assert(match, `invalid checksum line: ${line}`);
    assert.equal(sha256(path.join(workflowDir, match[2])), match[1]);
  }
}

function assertPrivateTree(root: string): void {
  assert.equal(fs.statSync(root).mode & 0o777, 0o700);
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        assert.equal(fs.statSync(absolute).mode & 0o777, 0o700);
        walk(absolute);
      } else {
        assert.equal(fs.statSync(absolute).mode & 0o777, 0o600);
      }
    }
  };
  walk(root);
}

async function main(): Promise<void> {
  assert(fs.existsSync(TOOL), "workflow tool missing");
  assert(fs.existsSync(DOC), "workflow documentation missing");

  const source = fs.readFileSync(TOOL, "utf8");
  const doc = fs.readFileSync(DOC, "utf8");
  assert(source.includes("VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_WORKFLOW_V1"));
  assert(source.includes("void-public-node-evidence-attestation-v1"));
  assert(doc.includes("one command"));
  assert(doc.includes("strict hold"));
  assert(doc.includes("mode `0700`"));
  assert(doc.includes("mode `0600`"));

  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-operator-evidence-workflow-proof-"),
  );

  try {
    const port = await listen();
    const key = path.join(temp, "operator.ed25519");
    const keygen = spawnSync(
      "ssh-keygen",
      ["-q", "-t", "ed25519", "-N", "", "-f", key],
      { encoding: "utf8" },
    );
    assert.equal(keygen.status, 0, keygen.stderr);
    fs.chmodSync(key, 0o600);

    mode = "green";
    const greenDir = path.join(temp, "green-workflow");
    const green = await run(port, greenDir, key);
    assert.equal(green.status, 0, green.stderr || green.stdout);
    assertPrivateTree(greenDir);

    const greenManifest = load(
      path.join(greenDir, "operator-evidence-workflow-v1.json"),
    );
    assert.equal(
      greenManifest.marker,
      "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_WORKFLOW_V1",
    );
    assert.equal(greenManifest.status, "green");
    assert.equal(greenManifest.gate, "passed");
    assert.equal(
      greenManifest.stages.evidence_attestation.created,
      true,
    );
    assert.equal(
      greenManifest.stages.evidence_attestation_review.verified,
      true,
    );
    assert.equal(
      greenManifest.stages.evidence_attestation_review.signature_valid,
      true,
    );
    assert.equal(
      greenManifest.stages.evidence_attestation_review.pack_hash_binding,
      true,
    );
    assert.equal(
      greenManifest.stages.evidence_attestation_review
        .separate_signature_domain,
      true,
    );
    assert.equal(greenManifest.safety.private_key_in_output, false);
    assert.equal(greenManifest.safety.mutation_attempted, false);
    assert(!JSON.stringify(greenManifest).includes("127.0.0.1"));
    assert(!JSON.stringify(greenManifest).includes(key));
    verifyChecksums(greenDir);

    mode = "hold";
    const holdDir = path.join(temp, "hold-workflow");
    const hold = await run(port, holdDir, key);
    assert.equal(hold.status, 2, hold.stderr || hold.stdout);
    assertPrivateTree(holdDir);
    const holdManifest = load(
      path.join(holdDir, "operator-evidence-workflow-v1.json"),
    );
    assert.equal(holdManifest.status, "hold");
    assert.equal(holdManifest.gate, "hold");
    assert.equal(
      holdManifest.stages.evidence_attestation.created,
      false,
    );
    assert.equal(
      fs.existsSync(path.join(holdDir, "evidence-attestation")),
      false,
    );
    verifyChecksums(holdDir);

    const allowedHoldDir = path.join(temp, "allowed-hold-workflow");
    const allowedHold = await run(
      port,
      allowedHoldDir,
      key,
      ["--allow-hold"],
    );
    assert.equal(
      allowedHold.status,
      0,
      allowedHold.stderr || allowedHold.stdout,
    );
    const allowedManifest = load(
      path.join(
        allowedHoldDir,
        "operator-evidence-workflow-v1.json",
      ),
    );
    assert.equal(allowedManifest.status, "hold");
    assert.equal(allowedManifest.gate, "passed_with_hold");
    assert.equal(
      allowedManifest.stages.evidence_attestation.created,
      true,
    );
    assert.equal(
      allowedManifest.stages.evidence_attestation_review.verified,
      true,
    );
    verifyChecksums(allowedHoldDir);

    const collision = await run(port, greenDir, key);
    assert.equal(collision.status, 1);
    assert.equal(
      load(path.join(greenDir, "operator-evidence-workflow-v1.json"))
        .status,
      "green",
    );

    assert(observedMethods.length > 0);
    assert(observedMethods.every((method) => method === "GET"));

    console.log(PROOF_MARKER);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
