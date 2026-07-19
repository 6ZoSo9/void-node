import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const TOOL = path.resolve("tools/public-node-operator-evidence-pack-v1.mjs");
const DOC = path.resolve(
  "docs/public-node/public-node-operator-evidence-pack-v1.md",
);
const PROOF_MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1_PROOF_GREEN";

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
      nodeId: "fixture-node-operator-evidence-pack-v1",
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
        route_index:
          "http://canonical.example/public-node/route-index.json",
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
  extra: string[] = [],
): Promise<{ status: number; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        TOOL,
        "--base",
        `http://127.0.0.1:${port}`,
        "--output-dir",
        outputDir,
        "--expected-peer-count",
        "2",
        "--observed-at",
        "2026-07-19T17:30:00Z",
        "--reviewed-at",
        "2026-07-19T17:30:01Z",
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
      resolve({
        status: code ?? -1,
        stdout,
        stderr,
      });
    });
  });
}

function load(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function verifyChecksums(packDir: string): void {
  const lines = fs
    .readFileSync(path.join(packDir, "SHA256SUMS.txt"), "utf8")
    .trim()
    .split("\n");
  assert.equal(lines.length, 3);
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  ([A-Za-z0-9._-]+)$/.exec(line);
    assert(match, `invalid checksum line: ${line}`);
    assert.equal(sha256(path.join(packDir, match[2])), match[1]);
  }
}

async function main(): Promise<void> {
  assert(fs.existsSync(TOOL), "evidence pack tool missing");
  assert(fs.existsSync(DOC), "evidence pack documentation missing");

  const source = fs.readFileSync(TOOL, "utf8");
  const doc = fs.readFileSync(DOC, "utf8");
  assert(source.includes("VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1"));
  assert(
    source.includes("public-node-operator-self-check-v1.mjs"),
    "self-check composition missing",
  );
  assert(
    source.includes(
      "public-node-operator-self-check-receipt-review-v1.mjs",
    ),
    "review composition missing",
  );
  assert(doc.includes("atomic"));
  assert(doc.includes("mode `0700`"));
  assert(doc.includes("mode `0600`"));

  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-operator-evidence-pack-proof-"),
  );

  try {
    const port = await listen();

    const greenDir = path.join(temp, "green-pack");
    mode = "green";
    const green = await run(port, greenDir);
    assert.equal(green.status, 0, green.stderr || green.stdout);
    assert.equal(fs.statSync(greenDir).mode & 0o777, 0o700);

    const expectedNames = [
      "SHA256SUMS.txt",
      "operator-evidence-pack-v1.json",
      "operator-self-check-receipt-review-v1.json",
      "operator-self-check-v1.json",
    ];
    assert.deepEqual(fs.readdirSync(greenDir).sort(), expectedNames);

    for (const name of expectedNames) {
      assert.equal(fs.statSync(path.join(greenDir, name)).mode & 0o777, 0o600);
    }

    const greenManifest = load(
      path.join(greenDir, "operator-evidence-pack-v1.json"),
    );
    const greenReceipt = load(path.join(greenDir, "operator-self-check-v1.json"));
    const greenReview = load(
      path.join(greenDir, "operator-self-check-receipt-review-v1.json"),
    );

    assert.equal(
      greenManifest.marker,
      "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1",
    );
    assert.equal(greenManifest.status, "green");
    assert.equal(greenManifest.gate, "passed");
    assert.equal(greenManifest.safety.raw_target_included, false);
    assert.equal(greenManifest.safety.raw_output_path_included, false);
    assert.equal(greenManifest.safety.mutation_attempted, false);
    assert.equal(greenReceipt.summary.status, "green");
    assert.equal(greenReview.accepted, true);
    assert.equal(greenReview.receipt_status, "green");
    assert.equal(
      greenReview.receipt_sha256,
      sha256(path.join(greenDir, "operator-self-check-v1.json")),
    );
    assert(!JSON.stringify(greenManifest).includes("127.0.0.1"));
    assert(!JSON.stringify(greenManifest).includes(greenDir));
    verifyChecksums(greenDir);

    const holdDir = path.join(temp, "hold-pack");
    mode = "hold";
    const hold = await run(port, holdDir);
    assert.equal(hold.status, 2, hold.stderr || hold.stdout);
    const holdManifest = load(
      path.join(holdDir, "operator-evidence-pack-v1.json"),
    );
    assert.equal(holdManifest.status, "hold");
    assert.equal(holdManifest.gate, "hold");
    verifyChecksums(holdDir);

    const allowedHoldDir = path.join(temp, "allowed-hold-pack");
    const allowedHold = await run(port, allowedHoldDir, ["--allow-hold"]);
    assert.equal(allowedHold.status, 0, allowedHold.stderr || allowedHold.stdout);
    const allowedManifest = load(
      path.join(allowedHoldDir, "operator-evidence-pack-v1.json"),
    );
    assert.equal(allowedManifest.status, "hold");
    assert.equal(allowedManifest.gate, "passed_with_hold");

    const collision = await run(port, greenDir);
    assert.equal(collision.status, 1);
    assert.equal(
      load(path.join(greenDir, "operator-evidence-pack-v1.json")).status,
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
