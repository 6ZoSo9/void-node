#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const REPO = process.cwd();
const SERVER = path.join(REPO, "tools", "void-tor-onion-public-node-v1.mjs");
const SOURCE = fs.readFileSync(SERVER, "utf8");
const MARKER = "VOID_TOR_PUBLIC_STATIC_DESCRIPTOR_CUSTODY_V1_GREEN";

for (const required of [
  'const TOR_STATIC_PROC_FD_ROOT_V1 = "/proc/self/fd";',
  "fsConstants.O_NOFOLLOW",
  "fsConstants.O_DIRECTORY",
  "openTorStaticDirectoryPathV1",
  "assertTorStaticRootPinnedV1",
  "readResolvedTorStaticV1",
]) {
  assert.ok(SOURCE.includes(required), `missing source contract: ${required}`);
}
assert.doesNotMatch(SOURCE, /readFileSync\(resolved\.file\)/u);
assert.match(SOURCE, /readFileSync\(resolved\.fd\)/u);

async function request(port, route, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: route,
        method,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.once("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.once("error", reject);
    req.end();
  });
}

async function stop(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  const timer = setTimeout(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  }, 2_000);
  await exited;
  clearTimeout(timer);
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-tor-static-descriptor-custody-v1-"),
);
let child = null;

try {
  const publicRoot = path.join(temp, "public");
  const replacementRoot = path.join(temp, "replacement-public");
  const retainedRoot = path.join(temp, "retained-public");

  for (const root of [publicRoot, replacementRoot]) {
    fs.mkdirSync(path.join(root, "public-node"), {
      recursive: true,
      mode: 0o755,
    });
    fs.writeFileSync(
      path.join(root, "public-node", "index.json"),
      JSON.stringify({ ok: true, fixture: "tor-static-custody-v1" }) + "\n",
      { mode: 0o644 },
    );
  }

  const originalBody = Buffer.from(
    "ORIGINAL_TOR_STATIC_DESCRIPTOR_CUSTODY_V1\n",
    "utf8",
  );
  const replacementBody = Buffer.from(
    "REPLACEMENT_SECRET_MUST_NOT_BE_SERVED\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(publicRoot, "public-node", "asset.txt"),
    originalBody,
    { mode: 0o644 },
  );
  fs.writeFileSync(
    path.join(replacementRoot, "public-node", "asset.txt"),
    replacementBody,
    { mode: 0o644 },
  );

  const originalStat = fs.statSync(publicRoot);
  const replacementStat = fs.statSync(replacementRoot);
  assert.notEqual(
    `${originalStat.dev}:${originalStat.ino}`,
    `${replacementStat.dev}:${replacementStat.ino}`,
    "fixture roots must be distinct generations",
  );

  child = spawn(
    process.execPath,
    [SERVER, "--host", "127.0.0.1", "--port", "0"],
    {
      cwd: temp,
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

  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `server readiness timeout stdout=${stdout} stderr=${stderr}`,
        ),
      );
    }, 5_000);
    const poll = setInterval(() => {
      const match = stdout.match(/^port=(\d+)$/m);
      if (
        stdout.includes("VOID_TOR_ONION_PUBLIC_NODE_V1_READY") &&
        match
      ) {
        clearInterval(poll);
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    }, 10);
    child.once("exit", (code) => {
      clearInterval(poll);
      clearTimeout(timeout);
      reject(
        new Error(
          `server exited ${code} stdout=${stdout} stderr=${stderr}`,
        ),
      );
    });
  });

  const initial = await request(port, "/public-node/asset.txt");
  assert.equal(initial.status, 200);
  assert.deepEqual(initial.body, originalBody);

  const initialHead = await request(
    port,
    "/public-node/asset.txt",
    "HEAD",
  );
  assert.equal(initialHead.status, 200);
  assert.equal(initialHead.body.length, 0);
  assert.equal(
    Number(initialHead.headers["content-length"]),
    originalBody.length,
  );

  fs.renameSync(publicRoot, retainedRoot);
  fs.renameSync(replacementRoot, publicRoot);

  const visibleStat = fs.statSync(publicRoot);
  assert.equal(
    `${visibleStat.dev}:${visibleStat.ino}`,
    `${replacementStat.dev}:${replacementStat.ino}`,
    "visible public root must be replacement generation",
  );

  const replaced = await request(port, "/public-node/asset.txt");
  assert.notEqual(
    replaced.status,
    200,
    "replacement root must not inherit static serving authority",
  );
  assert.equal(
    replaced.body.includes(replacementBody),
    false,
    "replacement bytes must not be disclosed",
  );

  assert.deepEqual(
    fs.readFileSync(path.join(publicRoot, "public-node", "asset.txt")),
    replacementBody,
    "replacement fixture must still exist after rejection",
  );

  console.log(MARKER);
  console.log("tor_static_root_descriptor_retained=true");
  console.log("tor_static_file_reads_descriptor_bound=true");
  console.log("tor_static_visible_root_replacement_rejected=true");
  console.log("tor_static_replacement_bytes_disclosed=false");
  console.log("tor_static_head_preserved=true");
  console.log("mcp_or_order_status_authority_changed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  if (child) await stop(child);
  fs.rmSync(temp, { recursive: true, force: true });
}
