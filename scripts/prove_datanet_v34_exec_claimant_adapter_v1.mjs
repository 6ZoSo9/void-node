// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { installV34Adapter } from "./datanet_v34_exec_claimant_adapter_support_v1.mjs";

const action = process.env.VOID_V34_ACTION;
assert.ok(["e0", "arm-h0", "close-s1"].includes(action));
const cfg = {
  action,
  target: process.env.VOID_V34_TARGET_PUBLISHER,
  python: process.env.VOID_V34_PYTHON,
  linkHelper: process.env.VOID_V34_LINK_GENERATION_HELPER,
  root: process.env.VOID_DATANET_EXT4_ROOT,
  k: process.env.VOID_V34_K,
  rootIdentity: process.env.VOID_DATANET_ADMISSION_ROOT_IDENTITY,
  lockIdentity: process.env.VOID_DATANET_ADMISSION_CAPABILITY_IDENTITY,
  recordSourceSha256: process.env.VOID_V34_RECORD_SOURCE_SHA256,
  claimantSourceSha256: process.env.VOID_V34_CLAIMANT_SOURCE_SHA256,
  generationSourceSha256: process.env.VOID_V34_GENERATION_SOURCE_SHA256,
  linkPath: process.env.VOID_V34_ACCEPTED_LINK_PATH,
  capFd: action === "close-s1" ? Number(process.env.VOID_V34_CLAIM_CAP_FD) : -1,
};
for (const key of ["target", "python", "root", "k", "rootIdentity", "lockIdentity", "recordSourceSha256", "claimantSourceSha256", "generationSourceSha256"]) {
  assert.equal(typeof cfg[key], "string", key);
  assert.ok(cfg[key].length > 0, key);
}
assert.match(cfg.k, /^[0-9a-f]{64}$/);
assert.match(cfg.rootIdentity, /^[0-9]+:[0-9]+$/);
assert.match(cfg.lockIdentity, /^[0-9]+:[0-9]+$/);
for (const key of ["recordSourceSha256", "claimantSourceSha256", "generationSourceSha256"]) assert.match(cfg[key], /^[0-9a-f]{64}$/);
if (action !== "e0") {
  assert.equal(typeof cfg.linkHelper, "string");
  assert.equal(typeof cfg.linkPath, "string");
}

const adapter = installV34Adapter(cfg);
const originalWrite = process.stdout.write.bind(process.stdout);
let intercepted = false;
if (action !== "e0") {
  process.stdout.write = function patchedStdoutWrite(chunk, encoding, callback) {
    const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    if (!intercepted && text.endsWith("\n")) {
      try {
        const obj = JSON.parse(text.trim());
        if (obj?.marker === "VOID_DATANET_H1_ADMITTED_S0_S1_PUBLICATION_EXT4_V1_GREEN" && obj?.status === "GREEN") {
          intercepted = true;
          return originalWrite(`${JSON.stringify(adapter.finalizeReceipt(obj))}\n`, encoding, callback);
        }
      } catch (error) {
        if (text.trim().startsWith("{")) throw error;
      }
    }
    return originalWrite(chunk, encoding, callback);
  };
}

await import(pathToFileURL(cfg.target).href);
if (action !== "e0") assert.equal(intercepted, true, "publisher receipt was not intercepted");
