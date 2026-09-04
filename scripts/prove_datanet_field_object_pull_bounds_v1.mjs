#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = resolve(ROOT, "tools/datanet-field-object-pull-v1.mjs");
const scratch = mkdtempSync(
  join(tmpdir(), "void-datanet-field-object-pull-bounds-v1-"),
);
const SMALL = Buffer.from("VOID_DATANET_BOUNDED_PULL_CONTROL\n", "utf8");
const SMALL_HASH = createHash("sha256").update(SMALL).digest("hex");
const EMPTY_HASH = createHash("sha256").update(Buffer.alloc(0)).digest("hex");
const LEAK = "REN_FIELD_PULL_SECRET_MUST_NOT_APPEAR";
let cases = 0;
let requestCount = 0;
let gateResponse = null;
let releaseGate = null;
const activeIntervals = new Set();
const sockets = new Set();

function counted() {
  cases += 1;
}

function createCase(name) {
  const dir = join(scratch, name);
  mkdirSync(dir, { recursive: false, mode: 0o700 });
  return dir;
}

function parseLines(text) {
  const result = new Map();
  for (const line of text.split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index > 0) result.set(line.slice(0, index), line.slice(index + 1));
  }
  return result;
}

function spawnCli(cwd, source, expected, extraEnv = {}) {
  const stdout = [];
  const stderr = [];
  const child = spawn(process.execPath, [CLI, source, expected], {
    cwd,
    env: {
      ...process.env,
      VOID_NETWORK_HINT: "bounded-proof",
      VOID_PULL_MAX_BYTES: "1024",
      VOID_PULL_TIMEOUT_MS: "1000",
      VOID_PULL_TOTAL_TIMEOUT_MS: "2000",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  return {
    child,
    result: new Promise((resolveRun, rejectRun) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        rejectRun(new Error("CLI hard proof timeout"));
      }, 8_000);
      child.on("error", (error) => {
        clearTimeout(timer);
        rejectRun(error);
      });
      child.on("close", (code, signal) => {
        clearTimeout(timer);
        resolveRun({
          code,
          signal,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
        });
      });
    }),
  };
}

async function runCli(cwd, source, expected, extraEnv = {}) {
  return spawnCli(cwd, source, expected, extraEnv).result;
}

function receiptFromRun(cwd, run) {
  const lines = parseLines(run.stdout);
  const relative = lines.get("receipt");
  assert.ok(relative, `receipt missing from stdout:\n${run.stdout}\n${run.stderr}`);
  const path = resolve(cwd, relative);
  const text = readFileSync(path, "utf8");
  return { lines, path, text, receipt: JSON.parse(text) };
}

function assertGreen(run) {
  assert.equal(run.signal, null);
  assert.equal(run.code, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /VOID_DATANET_FIELD_OBJECT_PULL_V1_GREEN/);
  assert.match(run.stdout, /output_namespace_bound=true/);
}

function assertFail(run, code) {
  assert.equal(run.signal, null);
  assert.equal(run.code, 1, run.stderr || run.stdout);
  assert.match(run.stdout, /VOID_DATANET_FIELD_OBJECT_PULL_V1_FAIL/);
  const lines = parseLines(run.stdout);
  assert.equal(lines.get("code"), code);
  assert.equal(lines.get("match"), "false");
}

function assertHold(run, code) {
  assert.equal(run.signal, null);
  assert.equal(run.code, 2, run.stderr || run.stdout);
  assert.match(run.stderr, /VOID_DATANET_FIELD_OBJECT_PULL_V1_HOLD/);
  assert.equal(parseLines(run.stderr).get("code"), code);
  assert.doesNotMatch(run.stdout, /receipt=/);
}

function mode(path) {
  return Number(lstatSync(path).mode & 0o777);
}

function allChildren(path) {
  return readdirSync(path, { withFileTypes: true }).map((entry) => entry.name);
}

const server = http.createServer((request, response) => {
  requestCount += 1;
  const path = request.url || "/";
  if (path === "/ok" || path.startsWith("/ok?")) {
    response.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": String(SMALL.length),
    });
    response.end(SMALL);
    return;
  }
  if (path === "/redirect") {
    response.writeHead(302, { location: "/ok" });
    response.end();
    return;
  }
  if (path === "/not-found") {
    response.writeHead(404, { "content-length": "0" });
    response.end();
    return;
  }
  if (path === "/oversized-header") {
    response.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": "1025",
    });
    response.end();
    return;
  }
  if (path === "/oversized-stream") {
    response.writeHead(200, {
      "content-type": "application/octet-stream",
      "transfer-encoding": "chunked",
    });
    response.write(Buffer.alloc(700, 0x61));
    response.end(Buffer.alloc(700, 0x62));
    return;
  }
  if (path === "/invalid-length") {
    response.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": "12x",
    });
    response.end(SMALL);
    return;
  }
  if (path === "/stall") {
    response.writeHead(200, {
      "content-type": "application/octet-stream",
      "transfer-encoding": "chunked",
    });
    response.write("partial");
    return;
  }
  if (path === "/trickle") {
    response.writeHead(200, {
      "content-type": "application/octet-stream",
      "transfer-encoding": "chunked",
    });
    const timer = setInterval(() => response.write("x"), 40);
    activeIntervals.add(timer);
    response.on("close", () => {
      clearInterval(timer);
      activeIntervals.delete(timer);
    });
    return;
  }
  if (path === "/gate") {
    gateResponse = response;
    response.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": String(SMALL.length),
    });
    releaseGate = () => {
      if (gateResponse) gateResponse.end(SMALL);
      gateResponse = null;
    };
    return;
  }
  response.writeHead(500);
  response.end();
});

server.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
});

await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(0, "127.0.0.1", resolveListen);
});
const address = server.address();
assert.ok(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}`;

try {
  {
    const cwd = createCase("local-control");
    const source = join(cwd, "object.txt");
    writeFileSync(source, SMALL, { mode: 0o600 });
    const run = await runCli(cwd, source, SMALL_HASH);
    assertGreen(run);
    const { receipt, path } = receiptFromRun(cwd, run);
    assert.equal(receipt.source_type, "file_path");
    assert.equal(receipt.bytes, SMALL.length);
    assert.equal(receipt.output_namespace_bound, true);
    assert.equal(receipt.dangerous_paths_touched, false);
    assert.equal(mode(path), 0o600);
    assert.equal(mode(resolve(cwd, receipt.object_path)), 0o600);
    assert.equal(mode(dirname(path)), 0o700);
    assert.deepEqual(receipt.limits, {
      max_bytes: 1024,
      inactivity_timeout_ms: 1000,
      total_timeout_ms: 2000,
    });
    counted();
  }

  {
    const cwd = createCase("file-url-control");
    const source = join(cwd, "object.txt");
    writeFileSync(source, SMALL, { mode: 0o600 });
    const run = await runCli(cwd, pathToFileURL(source).toString(), SMALL_HASH);
    assertGreen(run);
    const { receipt } = receiptFromRun(cwd, run);
    assert.equal(receipt.source_type, "file");
    assert.equal(receipt.source, "file://<operator-local-path>");
    counted();
  }

  for (const [name, suffix] of [
    ["file-url-query-rejected", `?token=${LEAK}`],
    ["file-url-fragment-rejected", `#token=${LEAK}`],
  ]) {
    const cwd = createCase(name);
    const source = join(cwd, "object.txt");
    writeFileSync(source, SMALL, { mode: 0o600 });
    const raw = `${pathToFileURL(source)}${suffix}`;
    const run = await runCli(cwd, raw, SMALL_HASH);
    assertFail(run, "INVALID_FILE_URL");
    const evidence = receiptFromRun(cwd, run);
    assert.doesNotMatch(run.stdout, new RegExp(LEAK));
    assert.doesNotMatch(run.stderr, new RegExp(LEAK));
    assert.doesNotMatch(evidence.text, new RegExp(LEAK));
    assert.equal(evidence.receipt.source, "file://<rejected-local-path>");
    counted();
  }

  {
    const cwd = createCase("file-url-remote-host-rejected");
    const run = await runCli(
      cwd,
      "file://foreign.example/tmp/object",
      SMALL_HASH,
    );
    assertFail(run, "INVALID_FILE_URL");
    assert.doesNotMatch(run.stdout, /foreign\.example/);
    counted();
  }

  {
    const cwd = createCase("local-too-large");
    const source = join(cwd, "large.bin");
    writeFileSync(source, Buffer.alloc(1025, 0x7a), { mode: 0o600 });
    const run = await runCli(cwd, source, EMPTY_HASH);
    assertFail(run, "FILE_TOO_LARGE");
    const { receipt } = receiptFromRun(cwd, run);
    assert.equal(receipt.bytes, 0);
    assert.equal(lstatSync(resolve(cwd, receipt.object_path)).size, 0);
    counted();
  }

  {
    const cwd = createCase("local-symlink");
    const target = join(cwd, "target.bin");
    const link = join(cwd, "link.bin");
    writeFileSync(target, SMALL, { mode: 0o600 });
    symlinkSync(target, link);
    const run = await runCli(cwd, link, SMALL_HASH);
    assert.equal(run.code, 1);
    assert.match(run.stdout, /VOID_DATANET_FIELD_OBJECT_PULL_V1_FAIL/);
    assert.notEqual(parseLines(run.stdout).get("code"), "null");
    counted();
  }

  {
    const cwd = createCase("http-control");
    const run = await runCli(cwd, `${base}/ok`, SMALL_HASH);
    assertGreen(run);
    const { receipt } = receiptFromRun(cwd, run);
    assert.equal(receipt.source_type, "http");
    assert.equal(receipt.source, `${base}/ok`);
    assert.equal(receipt.bytes, SMALL.length);
    counted();
  }

  {
    const cwd = createCase("http-query-sanitized");
    const run = await runCli(cwd, `${base}/ok?token=${LEAK}`, SMALL_HASH);
    assertGreen(run);
    const evidence = receiptFromRun(cwd, run);
    assert.equal(evidence.receipt.source, `${base}/ok`);
    assert.doesNotMatch(run.stdout, new RegExp(LEAK));
    assert.doesNotMatch(evidence.text, new RegExp(LEAK));
    counted();
  }

  {
    const cwd = createCase("http-fragment-rejected");
    const run = await runCli(cwd, `${base}/ok#token=${LEAK}`, SMALL_HASH);
    assertFail(run, "INVALID_URL");
    const evidence = receiptFromRun(cwd, run);
    assert.doesNotMatch(run.stdout, new RegExp(LEAK));
    assert.doesNotMatch(evidence.text, new RegExp(LEAK));
    counted();
  }

  {
    const cwd = createCase("http-credentials-rejected");
    const raw = `http://user:${LEAK}@127.0.0.1:${address.port}/ok`;
    const run = await runCli(cwd, raw, SMALL_HASH);
    assertFail(run, "INVALID_URL");
    const evidence = receiptFromRun(cwd, run);
    assert.doesNotMatch(run.stdout, new RegExp(LEAK));
    assert.doesNotMatch(run.stderr, new RegExp(LEAK));
    assert.doesNotMatch(evidence.text, new RegExp(LEAK));
    assert.doesNotMatch(evidence.receipt.source, /user|@/);
    counted();
  }

  {
    const cwd = createCase("http-redirect");
    assertFail(
      await runCli(cwd, `${base}/redirect`, SMALL_HASH),
      "HTTP_REDIRECT_REJECTED",
    );
    counted();
  }

  {
    const cwd = createCase("http-non-2xx");
    assertFail(
      await runCli(cwd, `${base}/not-found`, EMPTY_HASH),
      "HTTP_STATUS_NOT_OK",
    );
    counted();
  }

  {
    const cwd = createCase("http-oversized-header");
    const run = await runCli(cwd, `${base}/oversized-header`, EMPTY_HASH);
    assertFail(run, "RESPONSE_TOO_LARGE");
    assert.equal(receiptFromRun(cwd, run).receipt.bytes, 0);
    counted();
  }

  {
    const cwd = createCase("http-oversized-stream");
    const run = await runCli(cwd, `${base}/oversized-stream`, EMPTY_HASH);
    assertFail(run, "RESPONSE_TOO_LARGE");
    assert.equal(receiptFromRun(cwd, run).receipt.bytes, 0);
    counted();
  }

  {
    const cwd = createCase("http-invalid-length");
    assertFail(
      await runCli(cwd, `${base}/invalid-length`, EMPTY_HASH),
      "INVALID_CONTENT_LENGTH",
    );
    counted();
  }

  {
    const cwd = createCase("http-inactivity-timeout");
    assertFail(
      await runCli(cwd, `${base}/stall`, EMPTY_HASH, {
        VOID_PULL_TIMEOUT_MS: "100",
        VOID_PULL_TOTAL_TIMEOUT_MS: "2000",
      }),
      "INACTIVITY_TIMEOUT",
    );
    counted();
  }

  {
    const cwd = createCase("http-total-timeout");
    assertFail(
      await runCli(cwd, `${base}/trickle`, EMPTY_HASH, {
        VOID_PULL_TIMEOUT_MS: "1000",
        VOID_PULL_TOTAL_TIMEOUT_MS: "200",
      }),
      "TOTAL_TIMEOUT",
    );
    counted();
  }

  {
    const cwd = createCase("hash-mismatch");
    const run = await runCli(cwd, `${base}/ok`, "f".repeat(64));
    assert.equal(run.code, 1);
    assert.equal(parseLines(run.stdout).get("code"), "null");
    assert.equal(parseLines(run.stdout).get("match"), "false");
    counted();
  }

  {
    const cwd = createCase("invalid-limit-before-output");
    const before = requestCount;
    const run = await runCli(cwd, `${base}/ok`, SMALL_HASH, {
      VOID_PULL_MAX_BYTES: "0",
    });
    assert.equal(run.code, 2);
    assert.match(run.stderr, /Invalid pull limit:/);
    assert.doesNotMatch(run.stdout, /receipt=/);
    assert.equal(requestCount, before);
    assert.equal(allChildren(cwd).length, 0);
    counted();
  }

  {
    const cwd = createCase("output-root-symlink");
    const foreign = join(cwd, "foreign");
    mkdirSync(foreign, { mode: 0o700 });
    symlinkSync(foreign, join(cwd, ".void-field-trial"));
    const before = requestCount;
    const run = await runCli(cwd, `${base}/ok`, SMALL_HASH);
    assertHold(run, "OUTPUT_PARENT_SYMLINK");
    assert.equal(requestCount, before);
    assert.deepEqual(allChildren(foreign), []);
    counted();
  }

  {
    const cwd = createCase("output-family-symlink");
    const root = join(cwd, ".void-field-trial");
    const foreign = join(cwd, "foreign");
    mkdirSync(root, { mode: 0o700 });
    mkdirSync(foreign, { mode: 0o700 });
    symlinkSync(foreign, join(root, "datanet-field-object-pull"));
    const before = requestCount;
    const run = await runCli(cwd, `${base}/ok`, SMALL_HASH);
    assertHold(run, "OUTPUT_PARENT_SYMLINK");
    assert.equal(requestCount, before);
    assert.deepEqual(allChildren(foreign), []);
    counted();
  }

  {
    const cwd = createCase("unsafe-output-root-mode");
    const root = join(cwd, ".void-field-trial");
    mkdirSync(root, { mode: 0o700 });
    chmodSync(root, 0o777);
    const before = requestCount;
    const run = await runCli(cwd, `${base}/ok`, SMALL_HASH);
    assertHold(run, "OUTPUT_PARENT_UNSAFE_MODE");
    assert.equal(requestCount, before);
    counted();
  }

  {
    const cwd = createCase("run-directory-replacement");
    const launched = spawnCli(cwd, `${base}/gate`, SMALL_HASH);
    const family = join(
      cwd,
      ".void-field-trial",
      "datanet-field-object-pull",
    );

    const deadline = Date.now() + 4_000;
    let names = [];
    while (Date.now() < deadline) {
      try {
        names = allChildren(family);
      } catch {
        names = [];
      }
      if (names.length === 1 && releaseGate) break;
      await new Promise((resolveWait) => setTimeout(resolveWait, 10));
    }
    assert.equal(names.length, 1, "run directory was not created");
    assert.ok(releaseGate, "gate request was not acquired");

    const selected = join(family, names[0]);
    const displaced = join(family, "displaced-original");
    renameSync(selected, displaced);
    mkdirSync(selected, { mode: 0o700 });
    releaseGate();

    const run = await launched.result;
    assertHold(run, "OUTPUT_NAMESPACE_CHANGED");
    assert.deepEqual(allChildren(selected), []);
    assert.deepEqual(allChildren(displaced), []);
    counted();
  }

  assert.equal(cases, 24);
  console.log("VOID_DATANET_FIELD_OBJECT_PULL_BOUNDS_V1_GREEN");
  console.log("local_pinned_read=true");
  console.log("local_symlink_rejected=true");
  console.log("local_oversize_zero_persisted_bytes=true");
  console.log("http_content_length_bound=true");
  console.log("http_stream_bound=true");
  console.log("http_redirect_rejected=true");
  console.log("http_inactivity_deadline=true");
  console.log("http_total_deadline=true");
  console.log("file_url_query_fragment_rejected_without_disclosure=true");
  console.log("http_query_evidence_sanitized=true");
  console.log("output_parent_descriptor_relative=true");
  console.log("output_parent_symlink_rejected_before_source_io=true");
  console.log("output_parent_replacement_zero_foreign_writes=true");
  console.log("unsafe_output_parent_rejected_before_source_io=true");
  console.log(`cases=${cases}`);
} finally {
  for (const timer of activeIntervals) clearInterval(timer);
  if (gateResponse) gateResponse.destroy();
  for (const socket of sockets) socket.destroy();
  await new Promise((resolveClose) => server.close(resolveClose));
  rmSync(scratch, { recursive: true, force: true });
}
