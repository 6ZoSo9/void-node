#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1_PROOF_GREEN";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-handoff-v1.mjs");
const CANONICAL_CLIENT = resolve(ROOT, "tools/void_public_earn_no_node_client_v1.mjs");
const MAX_HEALTH_RESPONSE_BYTES = 64 * 1024;
const PILOT_MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1";
const CLAIM_MARKER = "VOID_WC_PUBLIC_TICKET_CLAIM_V1";
const STATUS_ROUTE = "/wc/public-earning-pilot-v1/status";

function run(args, stdin = "") {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [TOOL, ...args], { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c) => stdout += c); child.stderr.on("data", (c) => stderr += c);
    child.on("error", fail); child.on("close", (code) => done({ code, stdout, stderr }));
    child.stdin.end(stdin);
  });
}
function directory(results) {
  return {
    marker: "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1",
    status: "green",
    directory_state: results.some((r) => r.state === "available") ? "available" : "hold",
    results,
    safety: {
      read_only: true,
      composed_discovery_marker: "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1",
      child_results_safety_validated: true,
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false,
    },
  };
}
function available(base) {
  return {
    base, state: "available", trusted: true,
    source_path: "/wc/public-earning-pilot-v1/status",
    pilot: { coordinator_enabled: true, fixed_award_wc: 3, fixed_award_matches: true },
    public_claim: { configured: true, enabled: true, path: "/wc/public-earning-pilot-v1/claim-ticket" },
    safety: { read_only: true, get_only: true, public_award_boundary_confirmed: true, mutation_attempted: false },
  };
}
function held(base) { const r = available(base); r.state = "hold"; r.pilot.coordinator_enabled = false; r.public_claim.enabled = false; return r; }
function canonicalClientStatus() {
  return {
    ok: true,
    marker: PILOT_MARKER,
    coordinator_enabled: true,
    executor_enabled: false,
    fixed_award_wc: 3,
    public_claim: {
      marker: CLAIM_MARKER,
      enabled: true,
      available: true,
      server_selected_work: true,
      proof_of_executor_key_possession_required: true,
      transport_mode: "outbound_bundle",
      fixed_award_wc: 3,
      participant_selected_dataset: false,
      participant_selected_input_hash: false,
      participant_selected_award: false,
      money_movement: false,
    },
  };
}
function instrumentCanonicalClient(temp) {
  const source = readFileSync(CANONICAL_CLIENT, "utf8");
  const needle = "export const testOnly = {\n";
  assert.equal(source.split(needle).length, 2, "canonical client testOnly export shape changed");
  const instrumented = source.replace(
    needle,
    `${needle}  parseArgs,\n  inspectCoordinator,\n  safeBase,\n`,
  );
  const instrumentedPath = join(temp, "canonical-client-contract.mjs");
  writeFileSync(instrumentedPath, instrumented, "utf8");
  return import(`${pathToFileURL(instrumentedPath).href}?contract=${Date.now()}`);
}

const requests = [];
const nodeId = "0123456789abcdef0123456789abcdef";
let healthMode = "valid";
const server = createServer((req, res) => {
  requests.push({ method: req.method, url: req.url, mode: healthMode });
  if (req.method === "GET" && req.url === "/health") {
    if (healthMode === "declared_oversize") {
      res.writeHead(200, {
        "content-type": "application/json",
        "content-length": String(MAX_HEALTH_RESPONSE_BYTES + 1),
      });
      res.flushHeaders();
      return;
    }
    if (healthMode === "stream_oversize") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("x".repeat(MAX_HEALTH_RESPONSE_BYTES + 1));
      return;
    }
    if (healthMode === "interrupted") {
      res.writeHead(200, { "content-type": "application/json" });
      res.flushHeaders();
      res.write('{"ok":true,"nodeId":"');
      setTimeout(() => req.socket.destroy(), 10);
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, nodeId, peers: [] })); return;
  }
  if (req.method === "GET" && req.url === STATUS_ROUTE) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(canonicalClientStatus()));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" }); res.end(JSON.stringify({ error: "not_found" }));
});
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const address = server.address(); assert.ok(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}`;
const temp = mkdtempSync(join(tmpdir(), "void-wc-handoff-"));
const input = join(temp, "directory.json");
const client = join(temp, "client tool.mjs");
const stateDir = join(temp, "state dir");
const datasetTemplate = "https://data.example/open?id={dataset_id}";
writeFileSync(client, "#!/usr/bin/env node\n", { mode: 0o755 });
try {
  writeFileSync(input, JSON.stringify(directory([available(base), held("https://hold.example")])), "utf8");
  const ready = await run(["--directory-json", input, "--account", "outside-user-1", "--client-tool", client, "--state-dir", stateDir, "--dataset-url-template", datasetTemplate]);
  assert.equal(ready.code, 0, ready.stderr || ready.stdout);
  const body = JSON.parse(ready.stdout);
  assert.equal(body.marker, "VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1");
  assert.equal(body.handoff_state, "ready");
  assert.equal(body.selected.base, base);
  assert.equal(body.coordinator_identity.node_id, nodeId);
  assert.equal(body.commands.status.argv.includes("status"), true);
  assert.equal(body.commands.run.argv.includes("run"), true);
  assert.match(body.commands.status.shell, /'[^']*client tool\.mjs'/u);
  assert.match(body.commands.status.shell, /'[^']*state dir'/u);
  assert.equal(body.safety.health_response_max_bytes, MAX_HEALTH_RESPONSE_BYTES);
  assert.equal(body.safety.client_executed, false);
  assert.equal(body.safety.identity_created, false);
  assert.equal(body.safety.mutation_attempted, false);
  assert.deepEqual(requests, [{ method: "GET", url: "/health", mode: "valid" }]);

  const canonicalReady = await run(["--directory-json", input, "--account", "outside-user-1", "--state-dir", stateDir, "--dataset-url-template", datasetTemplate]);
  assert.equal(canonicalReady.code, 0, canonicalReady.stderr || canonicalReady.stdout);
  const canonicalBody = JSON.parse(canonicalReady.stdout);
  assert.equal(canonicalBody.commands.status.argv[0], "node");
  assert.equal(canonicalBody.commands.status.argv[1], CANONICAL_CLIENT);
  assert.equal(canonicalBody.commands.run.argv[1], CANONICAL_CLIENT);
  assert.equal(existsSync(stateDir), false, "handoff must not create participant client state");

  const { testOnly: canonicalClientContract } = await instrumentCanonicalClient(temp);
  assert.equal(typeof canonicalClientContract.parseArgs, "function");
  assert.equal(typeof canonicalClientContract.inspectCoordinator, "function");
  assert.equal(canonicalClientContract.safeBase(base), base);

  const parityCases = [
    ["https://public.example", true],
    ["http://127.0.0.1:4100", true],
    ["http://10.1.2.3:4100", true],
    ["http://172.16.1.2:4100", true],
    ["http://192.168.1.2:4100", true],
    ["http://100.64.1.2:4100", true],
    ["http://node.tailnet.ts.net:4100", true],
    ["http://172.32.0.1:4100", false],
    ["http://100.63.0.1:4100", false],
    ["http://100.128.0.1:4100", false],
    ["http://198.51.100.2:4100", false],
  ];
  for (const [origin, accepted] of parityCases) {
    assert.equal(Boolean(canonicalClientContract.safeBase(origin)), accepted, `canonical client origin policy mismatch for ${origin}`);
    writeFileSync(input, JSON.stringify(directory([available(origin), available("https://second.example")])), "utf8");
    const parity = await run(["--directory-json", input, "--account", "outside-user-1", "--client-tool", client]);
    assert.equal(parity.code, 2, parity.stderr || parity.stdout);
    const parityBody = JSON.parse(parity.stdout);
    if (accepted) {
      assert.equal(parityBody.reason, "multiple_available_coordinators_require_select_base", `handoff rejected canonical-client origin ${origin}`);
      assert.equal(parityBody.available_bases.includes(new URL(origin).origin), true, `handoff omitted accepted origin ${origin}`);
    } else {
      assert.match(parityBody.reason, /plain HTTP is allowed only/u, `handoff accepted canonical-client-rejected origin ${origin}`);
    }
  }
  writeFileSync(input, JSON.stringify(directory([available(base), held("https://hold.example")])), "utf8");

  const statusParsed = canonicalClientContract.parseArgs(canonicalBody.commands.status.argv.slice(2));
  assert.equal(statusParsed.command, "status");
  assert.equal(statusParsed.options.account, "outside-user-1");
  assert.equal(statusParsed.options["coordinator-base"], base);
  assert.equal(statusParsed.options["coordinator-node-id"], nodeId);
  assert.equal(statusParsed.options["state-dir"], stateDir);
  assert.deepEqual(statusParsed.options["dataset-url-template"], []);

  const runParsed = canonicalClientContract.parseArgs(canonicalBody.commands.run.argv.slice(2));
  assert.equal(runParsed.command, "run");
  assert.equal(runParsed.options.account, "outside-user-1");
  assert.equal(runParsed.options["coordinator-base"], base);
  assert.equal(runParsed.options["coordinator-node-id"], nodeId);
  assert.equal(runParsed.options["state-dir"], stateDir);
  assert.deepEqual(runParsed.options["dataset-url-template"], [datasetTemplate]);

  requests.length = 0;
  const syntheticIdentity = Object.freeze({ nodeId: "fedcba9876543210fedcba9876543210" });
  const statusContext = await canonicalClientContract.inspectCoordinator(statusParsed.options, syntheticIdentity);
  const runContext = await canonicalClientContract.inspectCoordinator(runParsed.options, syntheticIdentity);
  assert.equal(statusContext.account, "outside-user-1");
  assert.equal(statusContext.coordinatorBase, base);
  assert.equal(statusContext.trustedNodeId, nodeId);
  assert.equal(runContext.account, "outside-user-1");
  assert.equal(runContext.coordinatorBase, base);
  assert.equal(runContext.trustedNodeId, nodeId);
  assert.deepEqual(requests, [
    { method: "GET", url: "/health", mode: "valid" },
    { method: "GET", url: STATUS_ROUTE, mode: "valid" },
    { method: "GET", url: "/health", mode: "valid" },
    { method: "GET", url: STATUS_ROUTE, mode: "valid" },
  ]);
  assert.equal(existsSync(stateDir), false, "canonical preflight contract must not create participant state");

  healthMode = "declared_oversize";
  const declaredOversize = await run(["--directory-json", input, "--account", "outside-user-1", "--client-tool", client]);
  assert.equal(declaredOversize.code, 2, declaredOversize.stderr || declaredOversize.stdout);
  assert.equal(JSON.parse(declaredOversize.stdout).reason, "coordinator health response exceeds byte limit");

  healthMode = "stream_oversize";
  const streamedOversize = await run(["--directory-json", input, "--account", "outside-user-1", "--client-tool", client]);
  assert.equal(streamedOversize.code, 2, streamedOversize.stderr || streamedOversize.stdout);
  assert.equal(JSON.parse(streamedOversize.stdout).reason, "coordinator health response exceeds byte limit");

  healthMode = "interrupted";
  const interrupted = await run(["--directory-json", input, "--account", "outside-user-1", "--client-tool", client, "--health-timeout-ms", "1000"]);
  assert.equal(interrupted.code, 2, interrupted.stderr || interrupted.stdout);
  const interruptedBody = JSON.parse(interrupted.stdout);
  assert.equal(interruptedBody.handoff_state, "hold");
  assert.equal(interruptedBody.safety.mutation_attempted, false);

  healthMode = "valid";
  writeFileSync(input, JSON.stringify(directory([available(base), available("https://second.example")])), "utf8");
  const multiple = await run(["--directory-json", input, "--account", "outside-user-1", "--client-tool", client]);
  assert.equal(multiple.code, 2);
  assert.equal(JSON.parse(multiple.stdout).reason, "multiple_available_coordinators_require_select_base");

  writeFileSync(input, JSON.stringify(directory([held(base)])), "utf8");
  const none = await run(["--directory-json", input, "--account", "outside-user-1", "--client-tool", client]);
  assert.equal(none.code, 2);
  assert.equal(JSON.parse(none.stdout).reason, "no_trusted_available_coordinator");

  const unsafe = directory([available(base)]); unsafe.safety.mutation_attempted = true;
  const rejected = await run(["--directory-json", "-", "--account", "outside-user-1", "--client-tool", client], JSON.stringify(unsafe));
  assert.equal(rejected.code, 2);
  assert.equal(JSON.parse(rejected.stdout).reason, "directory safety contract failed");
} finally {
  await new Promise((done, fail) => server.close((error) => error ? fail(error) : done()));
  rmSync(temp, { recursive: true, force: true });
}
console.log(MARKER);
