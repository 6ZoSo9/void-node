#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
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

const adapterSource = fs.readFileSync(ADAPTER, "utf8");
assert.equal(
  adapterSource.includes("const body = await handle.readFile();"),
  false,
  "static reader must not prebuffer the whole file after its initial stat",
);
assert.match(
  adapterSource,
  /Buffer\.allocUnsafe\(PUBLIC_DATANET_STATIC_MAX_BYTES \+ 1\)/,
  "static reader must retain at most the reviewed ceiling plus one sentinel byte",
);
assert.match(
  adapterSource,
  /await handle\.read\(/,
  "static reader must use descriptor-bound bounded reads",
);
assert.match(
  adapterSource,
  /bodyLength > PUBLIC_DATANET_STATIC_MAX_BYTES/,
  "static reader must reject the limit-plus-one sentinel before publication",
);
assert.match(
  adapterSource,
  /\/proc\/self\/fd\/\$\{parentHandle\.fd\}/,
  "static namespace traversal must be descriptor-relative",
);
assert.match(
  adapterSource,
  /O_DIRECTORY/,
  "static root traversal must require directory descriptors",
);
assert.match(
  adapterSource,
  /O_NOFOLLOW/,
  "static root and leaf acquisition must reject final symlinks",
);
assert.match(
  adapterSource,
  /O_NONBLOCK/,
  "static leaf acquisition must not block on FIFO or other nonregular leaves",
);
assert.match(
  adapterSource,
  /before\.ctimeNs !== after\.ctimeNs/,
  "static leaf generation must bind ctimeNs",
);
assert.match(
  adapterSource,
  /const PUBLIC_DATANET_STATIC_ROOT_AUTHORITY =\s*\n\s*await openPublicDataNetStaticRootV1\(\);/,
  "static root must be pinned before the listener is admitted",
);
assert.match(
  adapterSource,
  /await assertPublicDataNetStaticRootPathPinnedV1\(\);/,
  "static reads must revalidate the configured root against the pinned authority",
);

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
    } catch (_error) {
      // Expected while the local adapter process is still starting.
    }
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

async function within(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label}_timeout`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
  fs.writeFileSync(statusFile, statusBody);
  const symlinkRecovered = await request(origin, STATUS_PATH);
  assert.equal(symlinkRecovered.response.status, 200);
  assert.deepEqual(symlinkRecovered.body, statusBody);

  const pinnedRoot = `${staticRoot}.pinned`;
  const foreignRoot = `${staticRoot}.foreign`;
  const forgedBody = Buffer.from("FORGED_STATIC_ROOT_BYTES\n");
  fs.renameSync(staticRoot, pinnedRoot);
  fs.mkdirSync(foreignRoot);
  fs.writeFileSync(
    path.join(foreignRoot, path.basename(statusFile)),
    forgedBody,
  );
  fs.symlinkSync(foreignRoot, staticRoot, "dir");

  const rootSwapped = await request(origin, STATUS_PATH);
  assert.equal(rootSwapped.response.status, 503);
  assert.equal(rootSwapped.body.includes(forgedBody), false);

  fs.unlinkSync(staticRoot);
  fs.renameSync(pinnedRoot, staticRoot);
  fs.rmSync(foreignRoot, { recursive: true, force: true });

  const rootRecovered = await request(origin, STATUS_PATH);
  assert.equal(rootRecovered.response.status, 200);
  assert.deepEqual(rootRecovered.body, statusBody);

  fs.unlinkSync(statusFile);
  const mkfifo = spawnSync("mkfifo", [statusFile], {
    stdio: "pipe",
    encoding: "utf8",
  });
  assert.equal(
    mkfifo.status,
    0,
    `mkfifo failed: ${mkfifo.stderr || mkfifo.stdout}`,
  );

  const fifoResponses = await within(
    Promise.all(
      Array.from({ length: 8 }, () => request(origin, STATUS_PATH)),
    ),
    1500,
    "fifo_static_requests",
  );
  for (const fifoResponse of fifoResponses) {
    assert.equal(fifoResponse.response.status, 503);
  }

  fs.unlinkSync(statusFile);
  fs.writeFileSync(statusFile, statusBody);
  const fifoRecovered = await request(origin, STATUS_PATH);
  assert.equal(fifoRecovered.response.status, 200);
  assert.deepEqual(fifoRecovered.body, statusBody);

  const exactLimitBody = Buffer.alloc(MAX, 0x62);
  fs.writeFileSync(statusFile, exactLimitBody);

  const exactLimit = await request(origin, STATUS_PATH);
  assert.equal(exactLimit.response.status, 200);
  assert.deepEqual(exactLimit.body, exactLimitBody);

  fs.writeFileSync(statusFile, Buffer.alloc(MAX + 1, 0x61));

  const oversized = await request(origin, STATUS_PATH);
  assert.equal(oversized.response.status, 503);

  const rewriteBase = Buffer.alloc(MAX, 0x31);
  fs.writeFileSync(statusFile, rewriteBase);
  const preservedTimes = fs.statSync(statusFile);
  const rewriteHandle = await fs.promises.open(statusFile, "r+");
  let stopRewrite = false;
  let rewriteCount = 0;
  const rewriteChunkA = Buffer.alloc(4096, 0x41);
  const rewriteChunkB = Buffer.alloc(4096, 0x42);
  const rewriteTask = (async () => {
    while (!stopRewrite) {
      const rewriteChunk = rewriteCount % 2 === 0
        ? rewriteChunkA
        : rewriteChunkB;
      await rewriteHandle.write(
        rewriteChunk,
        0,
        rewriteChunk.length,
        0,
      );
      await fs.promises.utimes(
        statusFile,
        preservedTimes.atime,
        preservedTimes.mtime,
      );
      rewriteCount += 1;
    }
  })();

  while (rewriteCount === 0) {
    await new Promise((resolve) => setImmediate(resolve));
  }

  let rewritten;
  try {
    rewritten = await within(
      request(origin, STATUS_PATH),
      2500,
      "same_inode_rewrite",
    );
  } finally {
    stopRewrite = true;
    await rewriteTask;
    await rewriteHandle.close();
  }
  assert.ok(rewriteCount >= 2, "rewrite adversary did not overlap long enough");
  assert.equal(rewritten.response.status, 503);
  assert.equal(rewritten.body.includes(rewriteChunkA), false);
  assert.equal(rewritten.body.includes(rewriteChunkB), false);

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
  console.log("root_namespace_pinned=true");
  console.log("fifo_nonblocking_rejected=true");
  console.log("same_inode_rewrite_mtime_restore_rejected=true");
  console.log(`max_bytes=${MAX}`);
  console.log("exact_limit_accepted=true");
  console.log("limit_plus_one_retention=true");
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
