#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
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

function createCase(name) {
  const dir = join(scratch, name);
  mkdirSync(dir, { recursive: false, mode: 0o700 });
  return dir;
}

function parseLines(stdout) {
  const result = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index > 0) result.set(line.slice(0, index), line.slice(index + 1));
  }
  return result;
}

function runCli(cwd, source, expected, extraEnv = {}) {
  return new Promise((resolveRun, rejectRun) => {
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
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", rejectRun);
    child.on("close", (code, signal) => {
      resolveRun({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

function readReceipt(cwd, run) {
  const lines = parseLines(run.stdout);
  const relative = lines.get("receipt");
  assert.ok(relative, `receipt missing from stdout: ${run.stdout}`);
  const path = resolve(cwd, relative);
  const receipt = JSON.parse(readFileSync(path, "utf8"));
  return { lines, path, receipt };
}

function assertGreen(run) {
  assert.equal(run.signal, null);
  assert.equal(run.code, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /VOID_DATANET_FIELD_OBJECT_PULL_V1_GREEN/);
}

function assertFail(run, code) {
  assert.equal(run.signal, null);
  assert.equal(run.code, 1, run.stderr || run.stdout);
  assert.match(run.stdout, /VOID_DATANET_FIELD_OBJECT_PULL_V1_FAIL/);
  const lines = parseLines(run.stdout);
  assert.equal(lines.get("code"), code);
  assert.equal(lines.get("match"), "false");
}

const server = http.createServer((request, response) => {
  switch (request.url) {
    case "/ok":
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": String(SMALL.length),
      });
      response.end(SMALL);
      return;
    case "/redirect":
      response.writeHead(302, { location: "/ok" });
      response.end();
      return;
    case "/oversized-header":
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": "1025",
      });
      response.end();
      return;
    case "/oversized-stream":
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "transfer-encoding": "chunked",
      });
      response.write(Buffer.alloc(700, 0x61));
      response.end(Buffer.alloc(700, 0x62));
      return;
    case "/invalid-length":
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": "12x",
      });
      response.end(SMALL);
      return;
    case "/stall":
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "transfer-encoding": "chunked",
      });
      response.write("partial");
      return;
    default:
      response.writeHead(404);
      response.end();
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(0, "127.0.0.1", resolveListen);
});
const address = server.address();
assert.ok(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}`;

try {
  const localCase = createCase("local-control");
  const localPath = join(localCase, "object.txt");
  writeFileSync(localPath, SMALL, { mode: 0o600 });
  const local = await runCli(localCase, localPath, SMALL_HASH);
  assertGreen(local);
  const localReceipt = readReceipt(localCase, local).receipt;
  assert.equal(localReceipt.source_type, "file_path");
  assert.equal(localReceipt.bytes, SMALL.length);
  assert.deepEqual(localReceipt.limits, {
    max_bytes: 1024,
    inactivity_timeout_ms: 1000,
    total_timeout_ms: 2000,
  });

  const fileUrlCase = createCase("file-url-control");
  const fileUrlPath = join(fileUrlCase, "object.txt");
  writeFileSync(fileUrlPath, SMALL, { mode: 0o600 });
  const fileUrl = await runCli(
    fileUrlCase,
    pathToFileURL(fileUrlPath).toString(),
    SMALL_HASH,
  );
  assertGreen(fileUrl);
  assert.equal(readReceipt(fileUrlCase, fileUrl).receipt.source_type, "file");

  const largeLocalCase = createCase("local-too-large");
  const largeLocalPath = join(largeLocalCase, "large.bin");
  writeFileSync(largeLocalPath, Buffer.alloc(1025, 0x7a), { mode: 0o600 });
  const largeLocal = await runCli(
    largeLocalCase,
    largeLocalPath,
    EMPTY_HASH,
  );
  assertFail(largeLocal, "FILE_TOO_LARGE");
  const largeLocalReceipt = readReceipt(largeLocalCase, largeLocal).receipt;
  assert.equal(largeLocalReceipt.bytes, 0);
  assert.equal(lstatSync(resolve(largeLocalCase, largeLocalReceipt.object_path)).size, 0);

  const symlinkCase = createCase("local-symlink");
  const symlinkTarget = join(symlinkCase, "target.bin");
  const symlinkPath = join(symlinkCase, "link.bin");
  writeFileSync(symlinkTarget, SMALL, { mode: 0o600 });
  symlinkSync(symlinkTarget, symlinkPath);
  const symlink = await runCli(symlinkCase, symlinkPath, SMALL_HASH);
  assert.equal(symlink.code, 1);
  assert.match(symlink.stdout, /VOID_DATANET_FIELD_OBJECT_PULL_V1_FAIL/);
  assert.notEqual(parseLines(symlink.stdout).get("code"), "null");

  const httpCase = createCase("http-control");
  const httpControl = await runCli(httpCase, `${base}/ok`, SMALL_HASH);
  assertGreen(httpControl);
  const httpReceipt = readReceipt(httpCase, httpControl).receipt;
  assert.equal(httpReceipt.source_type, "http");
  assert.equal(httpReceipt.source, `${base}/ok`);
  assert.equal(httpReceipt.bytes, SMALL.length);

  const redirectCase = createCase("http-redirect");
  const redirect = await runCli(redirectCase, `${base}/redirect`, SMALL_HASH);
  assertFail(redirect, "HTTP_REDIRECT_REJECTED");

  const headerCase = createCase("http-oversized-header");
  const header = await runCli(
    headerCase,
    `${base}/oversized-header`,
    EMPTY_HASH,
  );
  assertFail(header, "RESPONSE_TOO_LARGE");
  assert.equal(readReceipt(headerCase, header).receipt.bytes, 0);

  const streamCase = createCase("http-oversized-stream");
  const stream = await runCli(
    streamCase,
    `${base}/oversized-stream`,
    EMPTY_HASH,
  );
  assertFail(stream, "RESPONSE_TOO_LARGE");
  assert.equal(readReceipt(streamCase, stream).receipt.bytes, 0);

  const invalidLengthCase = createCase("http-invalid-content-length");
  const invalidLength = await runCli(
    invalidLengthCase,
    `${base}/invalid-length`,
    EMPTY_HASH,
  );
  assertFail(invalidLength, "INVALID_CONTENT_LENGTH");

  const stallCase = createCase("http-total-timeout");
  const stall = await runCli(stallCase, `${base}/stall`, EMPTY_HASH, {
    VOID_PULL_TIMEOUT_MS: "5000",
    VOID_PULL_TOTAL_TIMEOUT_MS: "200",
  });
  assertFail(stall, "TOTAL_TIMEOUT");
  assert.equal(readReceipt(stallCase, stall).receipt.bytes, 0);

  const mismatchCase = createCase("hash-mismatch");
  const mismatch = await runCli(mismatchCase, `${base}/ok`, "f".repeat(64));
  assert.equal(mismatch.code, 1);
  assert.equal(parseLines(mismatch.stdout).get("code"), "null");
  assert.equal(parseLines(mismatch.stdout).get("match"), "false");

  const invalidLimitCase = createCase("invalid-limit");
  const invalidLimit = await runCli(
    invalidLimitCase,
    `${base}/ok`,
    SMALL_HASH,
    { VOID_PULL_MAX_BYTES: "0" },
  );
  assert.equal(invalidLimit.code, 2);
  assert.match(invalidLimit.stderr, /Invalid pull limit:/);
  assert.doesNotMatch(invalidLimit.stdout, /receipt=/);

  const credentialCase = createCase("credential-url");
  const credentialUrl = `http://user:secret@127.0.0.1:${address.port}/ok`;
  const credential = await runCli(
    credentialCase,
    credentialUrl,
    SMALL_HASH,
  );
  assertFail(credential, "INVALID_URL");
  const credentialReceipt = readReceipt(credentialCase, credential).receipt;
  assert.doesNotMatch(credentialReceipt.source, /user|secret|@/);
  assert.doesNotMatch(credential.stdout, /secret/);

  console.log("VOID_DATANET_FIELD_OBJECT_PULL_BOUNDS_V1_GREEN");
  console.log("local_pinned_read=true");
  console.log("local_symlink_rejected=true");
  console.log("local_oversize_zero_persisted_bytes=true");
  console.log("http_content_length_bound=true");
  console.log("http_stream_bound=true");
  console.log("http_redirect_rejected=true");
  console.log("http_total_deadline=true");
  console.log("credential_url_redacted=true");
  console.log("cases=12");
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
  rmSync(scratch, { recursive: true, force: true });
}
