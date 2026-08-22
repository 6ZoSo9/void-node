#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const ADAPTER = path.join(
  ROOT,
  "ops/public/public-seed-adapter-v1.mjs",
);
const STATUS_PATH =
  "/public-node/datanet/field-replication-status-card-v1.json";
const HTML_PATH =
  "/public-node/datanet/field-replication-status-card-v1.html";
const INDEX_PATH =
  "/public-node/datanet/index.json";
const MARKER = "VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1";
const GREEN =
  "VOID_DATANET_FIELD_REPLICATION_STATUS_CARD_V1_GREEN";
const MAX = 512 * 1024;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve(server.address().port);
    });
  });
}

async function waitReady(origin, child) {
  for (let i = 0; i < 80; i += 1) {
    if (child.exitCode !== null) {
      throw new Error(`adapter exited early: ${child.exitCode}`);
    }
    try {
      const response = await fetch(`${origin}${STATUS_PATH}`);
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("adapter did not become ready");
}

async function request(origin, pathname, init = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    redirect: "manual",
    ...init,
  });
  const body = Buffer.from(await response.arrayBuffer());
  return { response, body };
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-seed-datanet-static-"),
);
const staticRoot = path.join(temp, "datanet");
fs.mkdirSync(staticRoot);

const statusBody = Buffer.from(
  JSON.stringify({
    marker: MARKER,
    green_marker: GREEN,
    status: "green",
  }) + "\n",
);
const htmlBody = Buffer.from(
  "<!doctype html><title>DataNet</title>"
  + `<p>${MARKER}</p>\n`,
);
const indexBody = Buffer.from(
  JSON.stringify({
    marker: "VOID_DATANET_INDEX_V1",
    status: "green",
  }) + "\n",
);
const secretBody = Buffer.from("SHOULD_NOT_BE_PUBLIC\n");

const statusFile = path.join(
  staticRoot,
  "field-replication-status-card-v1.json",
);
fs.writeFileSync(statusFile, statusBody);
fs.writeFileSync(
  path.join(
    staticRoot,
    "field-replication-status-card-v1.html",
  ),
  htmlBody,
);
fs.writeFileSync(path.join(staticRoot, "index.json"), indexBody);
fs.writeFileSync(path.join(staticRoot, "secret.json"), secretBody);

const upstreamRequests = [];
const upstream = http.createServer((req, res) => {
  upstreamRequests.push({
    method: req.method,
    url: req.url,
  });
  res.writeHead(404, {
    "content-type": "text/plain; charset=utf-8",
  });
  res.end("upstream_not_found\n");
});

let child;
try {
  const upstreamPort = await listen(upstream);

  const portProbe = http.createServer();
  const adapterPort = await listen(portProbe);
  await new Promise((resolve) => portProbe.close(resolve));

  const origin = `http://127.0.0.1:${adapterPort}`;

  child = spawn(process.execPath, [ADAPTER], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      VOID_SEED_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
      VOID_ADAPTER_HOST: "127.0.0.1",
      VOID_ADAPTER_PORT: String(adapterPort),
      VOID_PUBLIC_DATANET_STATIC_ROOT: staticRoot,
      VOID_EARN_COORDINATOR_UPSTREAM: "",
    },
  });

  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });

  await waitReady(origin, child);

  const status = await request(origin, STATUS_PATH);
  assert.equal(status.response.status, 200);
  assert.equal(
    status.response.headers.get("x-void-public-datanet-static"),
    "v1",
  );
  assert.deepEqual(status.body, statusBody);
  assert.equal(upstreamRequests.length, 0);

  const head = await request(origin, STATUS_PATH, {
    method: "HEAD",
  });
  assert.equal(head.response.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(
    Number(head.response.headers.get("content-length")),
    statusBody.length,
  );
  assert.equal(upstreamRequests.length, 0);

  const html = await request(origin, HTML_PATH);
  assert.equal(html.response.status, 200);
  assert.deepEqual(html.body, htmlBody);

  const index = await request(origin, INDEX_PATH);
  assert.equal(index.response.status, 200);
  assert.deepEqual(index.body, indexBody);
  assert.equal(upstreamRequests.length, 0);

  const query = await request(origin, `${STATUS_PATH}?x=1`);
  assert.equal(query.response.status, 400);
  assert.equal(upstreamRequests.length, 0);

  const post = await request(origin, STATUS_PATH, {
    method: "POST",
    body: "x",
  });
  assert.equal(post.response.status, 405);
  assert.equal(upstreamRequests.length, 0);

  const secret = await request(
    origin,
    "/public-node/datanet/secret.json",
  );
  assert.equal(secret.response.status, 404);
  assert.equal(secret.body.includes(secretBody), false);
  assert.equal(upstreamRequests.length, 1);
  assert.equal(
    upstreamRequests[0].url,
    "/public-node/datanet/secret.json",
  );

  const outside = path.join(temp, "outside.json");
  fs.writeFileSync(outside, Buffer.from("EXTERNAL_SECRET\n"));
  fs.unlinkSync(statusFile);
  fs.symlinkSync(outside, statusFile);

  const symlinked = await request(origin, STATUS_PATH);
  assert.equal(symlinked.response.status, 503);
  assert.equal(
    symlinked.body.includes(Buffer.from("EXTERNAL_SECRET")),
    false,
  );

  fs.unlinkSync(statusFile);
  fs.writeFileSync(statusFile, Buffer.alloc(MAX + 1, 0x61));

  const oversized = await request(origin, STATUS_PATH);
  assert.equal(oversized.response.status, 503);

  fs.writeFileSync(statusFile, statusBody);
  const recovered = await request(origin, STATUS_PATH);
  assert.equal(recovered.response.status, 200);
  assert.deepEqual(recovered.body, statusBody);

  assert.match(logs, /void_public_seed_adapter_v1 host=/);

  console.log("VOID_PUBLIC_SEED_DATANET_STATIC_V1_GREEN");
  console.log("exact_static_routes=3");
  console.log("methods=GET,HEAD");
  console.log("query_rejected=true");
  console.log("post_rejected=true");
  console.log("arbitrary_sibling_not_static=true");
  console.log("final_symlink_rejected=true");
  console.log(`max_bytes=${MAX}`);
  console.log("oversize_rejected=true");
  console.log("node_runtime_mutation=false");
  console.log("wallet_wc_mutation=false");
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      child.once("exit", resolve);
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
        resolve();
      }, 1000).unref();
    });
  }
  await new Promise((resolve) => upstream.close(resolve));
  fs.rmSync(temp, { recursive: true, force: true });
}
