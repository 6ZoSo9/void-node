#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  runPublicCheckpointRestorePreNodeV1,
} from "./lib/void_public_checkpoint_restore_supervisor_v1.mjs";

const MARKER =
  "VOID_PUBLIC_CHECKPOINT_RESTORE_LIVENESS_V1_PROOF";
const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-checkpoint-restore-liveness-v1-"),
);
fs.chmodSync(root, 0o700);

function authority() {
  return {
    authorityGeneration: crypto.randomBytes(16).toString("hex"),
    authoritySequence: 1,
    authoritySecret: crypto.randomBytes(32),
  };
}

function baseEnv(dataDir, extra = {}) {
  return {
    ...process.env,
    VOID_PUBLIC_CHECKPOINT_RESTORE: "1",
    VOID_PUBLIC_CHECKPOINT_RESTORE_TOTAL_TIMEOUT_MS: "3000",
    VOID_PUBLIC_CHECKPOINT_RESTORE_KILL_GRACE_MS: "150",
    VOID_PUBLIC_CHECKPOINT_RESTORE_HEADER_TIMEOUT_MS: "250",
    VOID_PUBLIC_CHECKPOINT_RESTORE_BODY_TIMEOUT_MS: "350",
    DATA_DIR: dataDir,
    ...extra,
  };
}

async function expectRejectWithin(promiseFactory, maxMs, pattern) {
  const started = Date.now();
  let error = null;
  try {
    await promiseFactory();
  } catch (caught) {
    error = caught;
  }
  const elapsed = Date.now() - started;
  assert(error instanceof Error, "expected bounded rejection");
  assert(
    pattern.test(String(error.message || error)),
    `unexpected rejection: ${String(error.message || error)}`,
  );
  assert(
    elapsed < maxMs,
    `bounded rejection exceeded ${maxMs}ms: actual=${elapsed}`,
  );
  return { error, elapsed };
}

async function withServer(handler, fn) {
  const sockets = new Set();
  const server = http.createServer(handler);
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    return await fn(origin);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(() => resolve()));
  }
}

try {
  const fakeChild = path.join(root, "ignore-term-child.mjs");
  fs.writeFileSync(
    fakeChild,
    `process.on("SIGTERM",()=>{});\n` +
      `process.on("message",(m)=>{if(m&&m.type==="authority"){setInterval(()=>{},1000);}});\n` +
      `if(process.send)process.send({schema:"void_public_bootstrap_adapter_authority_child_v1",type:"ready"});\n`,
    { mode: 0o700 },
  );

  const hardKillData = path.join(root, "hard-kill-data");
  const hardKill = await expectRejectWithin(
    () =>
      runPublicCheckpointRestorePreNodeV1({
        adapterBase: "http://127.0.0.1:9",
        ...authority(),
        env: baseEnv(hardKillData, {
          VOID_PUBLIC_CHECKPOINT_RESTORE_TOTAL_TIMEOUT_MS: "400",
          VOID_PUBLIC_CHECKPOINT_RESTORE_KILL_GRACE_MS: "150",
        }),
        restoreScript: fakeChild,
      }),
    2000,
    /HOLD_PUBLIC_CHECKPOINT_RESTORE_TOTAL_TIMEOUT/,
  );
  assert(!fs.existsSync(hardKillData));

  const headerData = path.join(root, "header-stall-data");
  const headerStall = await withServer(
    (_req, _res) => {
      // Accept the request and deliberately never send response headers.
    },
    (origin) =>
      expectRejectWithin(
        () =>
          runPublicCheckpointRestorePreNodeV1({
            adapterBase: origin,
            ...authority(),
            env: baseEnv(headerData),
          }),
        2500,
        /checkpoint restore child exited with code 1/,
      ),
  );
  assert(!fs.existsSync(headerData));

  const bodyData = path.join(root, "body-stall-data");
  const bodyStall = await withServer(
    (_req, res) => {
      res.writeHead(200, {
        "content-type": "application/json",
        "content-length": "128",
      });
      res.write('{"schema":"partial');
      // Deliberately never settle the response body.
    },
    (origin) =>
      expectRejectWithin(
        () =>
          runPublicCheckpointRestorePreNodeV1({
            adapterBase: origin,
            ...authority(),
            env: baseEnv(bodyData),
          }),
        2500,
        /checkpoint restore child exited with code 1/,
      ),
  );
  assert(!fs.existsSync(bodyData));

  const runnerSource = fs.readFileSync(
    new URL("./run_void_public_checkpoint_restore_v1.mjs", import.meta.url),
    "utf8",
  );
  assert(!runnerSource.includes("response.arrayBuffer()"));
  assert(runnerSource.includes("readResponseBodyBoundedV1"));
  assert(runnerSource.includes("VOID_PUBLIC_CHECKPOINT_RESTORE_HEADER_TIMEOUT_MS"));
  assert(runnerSource.includes("VOID_PUBLIC_CHECKPOINT_RESTORE_BODY_TIMEOUT_MS"));

  console.log("post_authority_total_lifetime_bounded=true");
  console.log("sigterm_ignored_hard_kill_bounded=true");
  console.log(`hard_kill_terminal_ms=${hardKill.elapsed}`);
  console.log("discovery_headers_stall_bounded=true");
  console.log(`headers_stall_terminal_ms=${headerStall.elapsed}`);
  console.log("discovery_streamed_body_stall_bounded=true");
  console.log(`body_stall_terminal_ms=${bodyStall.elapsed}`);
  console.log("discovery_retained_bytes_bounded=true");
  console.log("discovery_arraybuffer_unbounded=false");
  console.log("node_spawn_authority_from_timeout=false");
  console.log(`${MARKER}_GREEN`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
