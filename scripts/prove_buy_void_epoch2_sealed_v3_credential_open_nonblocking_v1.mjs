#!/usr/bin/env node
// Inert, disposable-only regression for a regular-file -> FIFO swap between
// credential lstat and open. Never reads installed credentials or runs a probe.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_BUY_VOID_EPOCH2_SEALED_V3_CREDENTIAL_OPEN_NONBLOCKING_V1";
const CREDENTIAL_ID = "buy-void-epoch2-fulfiller-v1";
const CHILD_ENV = "VOID_SEALED_V3_FIFO_FIXTURE_CHILD_V1";

async function childProof() {
  // Imported, never direct-executed: this must not reach the live --probe path.
  const { openCredentialGeneration } = await import(
    "./void_buy_void_epoch2_credential_attestation_sealed_v3.mjs"
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-sealed-v3-fifo-v1-"));
  const credentialPath = path.join(root, CREDENTIAL_ID);
  const fixture = Buffer.from("SYNTHETIC_NONSECRET_CREDENTIAL_V1", "utf8");
  const originalOpen = fs.openSync;
  let raceInjected = 0;
  try {
    fs.chmodSync(root, 0o700);
    fs.writeFileSync(credentialPath, fixture, { mode: 0o600, flag: "wx" });
    fs.chmodSync(credentialPath, 0o600);

    // Positive control. The ordinary regular file still opens and revalidates.
    const generation = openCredentialGeneration(root);
    assert.deepEqual(generation.bytes, fixture);
    assert.equal(generation.revalidate(), true);
    generation.close();
    assert.ok(generation.bytes.every((byte) => byte === 0), "fixture buffer not zeroed");

    // Deterministic swap immediately before production's pinned descriptor open.
    fs.openSync = function interceptedOpen(candidate, flags, ...rest) {
      const name = typeof candidate === "string" ? candidate : "";
      if (name.startsWith("/proc/self/fd/") && name.endsWith("/" + CREDENTIAL_ID)) {
        raceInjected += 1;
        assert.equal(raceInjected, 1, "credential file opened more than once");
        fs.unlinkSync(credentialPath);
        execFileSync("/usr/bin/mkfifo", ["-m", "600", credentialPath], {
          timeout: 1000, stdio: "ignore", env: { PATH: "/usr/bin:/bin", LANG: "C" },
        });
      }
      return originalOpen.call(fs, candidate, flags, ...rest);
    };
    let rejected = false;
    try {
      openCredentialGeneration(root);
    } catch (error) {
      rejected = /epoch2_sealed_credential_file_(opened_type_invalid|replaced)/u
        .test(String(error?.message || error));
      if (!rejected) throw error;
    } finally {
      fs.openSync = originalOpen;
    }
    assert.equal(raceInjected, 1, "FIFO swap did not occur");
    assert.equal(rejected, true, "FIFO replacement did not fail closed");
    console.log(MARKER + "_CHILD_GREEN");
  } finally {
    fs.openSync = originalOpen;
    fixture.fill(0);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

if (process.env[CHILD_ENV] === "1") {
  await childProof();
} else {
  const env = {
    PATH: "/usr/bin:/bin", HOME: "/nonexistent", LANG: "C", LC_ALL: "C", TZ: "UTC",
    [CHILD_ENV]: "1",
  };
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    encoding: "utf8", timeout: 4000, maxBuffer: 8192, env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(result.error, undefined,
    "subprocess exceeded timeout (possible blocking FIFO open): " +
    String(result.error?.code || "unknown"));
  assert.equal(result.status, 0,
    "FIFO regression child failed: " + String(result.stderr || result.stdout).slice(0, 2048));
  assert.match(result.stdout, /VOID_BUY_VOID_EPOCH2_SEALED_V3_CREDENTIAL_OPEN_NONBLOCKING_V1_CHILD_GREEN/u);
  console.log(MARKER + "_GREEN");
  console.log("fixture_only=true");
  console.log("real_credentials_accessed=false");
  console.log("regular_file_to_fifo_race_rejected=true");
  console.log("hang_timeout_fails_closed=true");
  console.log("transaction=false");
  console.log("funds_movement=false");
}
