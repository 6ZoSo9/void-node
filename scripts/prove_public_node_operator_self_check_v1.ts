import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const TOOL = path.resolve("tools/public-node-operator-self-check-v1.mjs");
const DOC = path.resolve("docs/public-node/public-node-operator-self-check-v1.md");
const PROOF_MARKER = "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1_PROOF_GREEN";
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

type Mode = "green" | "unsafe_manifest" | "unsafe_well_known";
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
      nodeId: "fixture-node-operator-self-check-v1",
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
      effective_base_url: "https://public.example.invalid",
      links: {
        public_node: "https://public.example.invalid/public-node",
        route_index: "https://public.example.invalid/public-node/route-index.json",
        route_manifest: "https://public.example.invalid/public-node/route-manifest.json",
        self_check_snapshot:
          "https://public.example.invalid/public-node/self-check-snapshot.json",
        proofs: "https://public.example.invalid/proofs",
      },
      policy: {
        public_routes_only: true,
        read_only: true,
        mutation: mode === "unsafe_well_known",
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
        mode === "unsafe_manifest"
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
  output: string,
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        TOOL,
        "--base",
        `http://127.0.0.1:${port}`,
        "--output",
        output,
        "--expected-peer-count",
        "2",
        "--observed-at",
        "2026-07-19T16:00:00Z",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
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
    child.once("close", (status) => resolve({ status, stdout, stderr }));
  });
}

async function main(): Promise<void> {
  assert(fs.existsSync(TOOL), "tool missing");
  assert(fs.existsSync(DOC), "documentation missing");

  const source = fs.readFileSync(TOOL, "utf8");
  const doc = fs.readFileSync(DOC, "utf8");
  for (const marker of [
    "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1",
    "VOID_PUBLIC_NODE_ROUTE_INDEX_V1",
    "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1",
    "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1",
  ]) {
    assert(source.includes(marker), `source marker missing: ${marker}`);
  }
  assert(doc.includes("GET-only"));
  assert(doc.includes("mutation"));
  assert(doc.includes("exit code `2`"));

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-operator-self-check-proof-"));
  try {
    const port = await listen();

    const greenOutput = path.join(temp, "green.json");
    mode = "green";
    const green = await run(port, greenOutput);
    assert.equal(green.status, 0, green.stderr || green.stdout);
    const greenReceipt = JSON.parse(fs.readFileSync(greenOutput, "utf8"));
    assert.equal(greenReceipt.marker, "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1");
    assert.equal(greenReceipt.summary.status, "green");
    assert.equal(greenReceipt.summary.checks_failed, 0);
    assert.equal(greenReceipt.runtime.peer_count, 2);
    assert.equal(greenReceipt.runtime.chain_head, 1856587);
    assert.equal(greenReceipt.safety.mutation_attempted, false);
    assert.deepEqual(greenReceipt.safety.methods_used, ["GET"]);
    assert.equal(fs.statSync(greenOutput).mode & 0o777, 0o600);
    const greenWellKnown = greenReceipt.checks.find(
      (entry: { id?: string }) => entry.id === "well_known_discovery",
    );
    assert.equal(greenWellKnown?.ok, true);
    assert(greenWellKnown.observed.absolute_url_pointer_count >= 5);
    assert.equal(greenWellKnown.observed.missing_pointer_count, 0);

    const unsafeWellKnownOutput = path.join(temp, "unsafe-well-known.json");
    mode = "unsafe_well_known";
    const unsafeWellKnown = await run(port, unsafeWellKnownOutput);
    assert.equal(
      unsafeWellKnown.status,
      2,
      unsafeWellKnown.stderr || unsafeWellKnown.stdout,
    );
    const unsafeWellKnownReceipt = JSON.parse(
      fs.readFileSync(unsafeWellKnownOutput, "utf8"),
    );
    assert.equal(unsafeWellKnownReceipt.summary.status, "hold");
    assert(
      unsafeWellKnownReceipt.summary.failed_check_ids.includes(
        "well_known_discovery",
      ),
    );
    assert.equal(unsafeWellKnownReceipt.safety.mutation_attempted, false);

    const holdOutput = path.join(temp, "hold.json");
    mode = "unsafe_manifest";
    const hold = await run(port, holdOutput);
    assert.equal(hold.status, 2, hold.stderr || hold.stdout);
    const holdReceipt = JSON.parse(fs.readFileSync(holdOutput, "utf8"));
    assert.equal(holdReceipt.summary.status, "hold");
    assert(holdReceipt.summary.failed_check_ids.includes("route_manifest"));
    assert(holdReceipt.summary.failed_check_ids.includes("public_discovery_alignment"));
    assert.equal(holdReceipt.safety.mutation_attempted, false);

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
