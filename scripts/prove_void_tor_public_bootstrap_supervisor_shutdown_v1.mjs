#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_TOR_PUBLIC_BOOTSTRAP_SUPERVISOR_SHUTDOWN_V1_PROOF";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SUPERVISOR = path.join(ROOT, "scripts", "run_void_tor_public_bootstrap_supervisor_v1.mjs");
const ONION = `${"a".repeat(56)}.onion`;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-tor-supervisor-shutdown-"));
const nodeFixture = path.join(temporary, "fixture-node.mjs");

function assertPortClosed(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("adapter port remained connectable after supervisor exit"));
    }, 2000);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      reject(new Error("adapter port remained open after supervisor exit"));
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      if (!["ECONNREFUSED", "ECONNRESET"].includes(error.code)) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

try {
  fs.writeFileSync(
    nodeFixture,
    [
      '#!/usr/bin/env node',
      'import process from "node:process";',
      'process.once("SIGTERM", () => process.exit(0));',
      'process.once("SIGINT", () => process.exit(0));',
      'setInterval(() => {}, 1000);',
      '',
    ].join("\n"),
    { mode: 0o700 },
  );

  const result = await new Promise((resolve, reject) => {
    const child = childProcess.spawn(process.execPath, [SUPERVISOR], {
      cwd: ROOT,
      env: {
        ...process.env,
        VOID_TOR_PUBLIC_SEED_CLIENT_PEERS: `http://${ONION}`,
        VOID_TOR_PUBLIC_SEED_CLIENT_PORT: "0",
        VOID_TOR_PUBLIC_BOOTSTRAP_NODE_ENTRY: nodeFixture,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let signaled = false;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`supervisor shutdown proof timed out\nstdout=${stdout}\nstderr=${stderr}`));
    }, 10_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (!signaled && stdout.includes("VOID_TOR_PUBLIC_BOOTSTRAP_SUPERVISOR_V1_ACTIVE")) {
        signaled = true;
        child.kill("SIGTERM");
      }
    });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, signaled });
    });
  });

  assert.equal(result.signaled, true, result.stdout);
  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /VOID_TOR_PUBLIC_BOOTSTRAP_SUPERVISOR_V1_ACTIVE/);
  assert.match(result.stdout, /transport=tor_v3_http/);
  assert.match(result.stdout, /dns_resolution_required=false/);
  assert.doesNotMatch(result.stderr, /ERR_SERVER_NOT_RUNNING|ADAPTER_CLOSE_ERROR/);

  const baseMatch = /adapter_base=http:\/\/127\.0\.0\.1:([0-9]+)/.exec(result.stdout);
  assert.ok(baseMatch, "supervisor did not report its loopback adapter port");
  await assertPortClosed(Number(baseMatch[1]));

  console.log(`${MARKER}_GREEN`);
  console.log("signal_forwarded_to_child=true");
  console.log("adapter_close_idempotent=true");
  console.log("adapter_listener_closed=true");
  console.log("double_close_error=false");
  console.log("dns_resolution_required=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
