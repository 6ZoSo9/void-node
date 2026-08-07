import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import express from "express";

import { merkleRoot } from "../dist/datanet/merkle.js";
import { registerDataNetRoutes } from "../dist/http/datanet_routes.js";

const MARKER = "VOID_DATANET_MANIFEST_ROOT_INTEGRITY_V1_GREEN";
const rootDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-datanet-manifest-root-integrity-v1-"),
);
const dataDir = path.join(rootDir, "data");
const manifestsDir = path.join(dataDir, "datanet", "manifests");
const receiptsFile = path.join(dataDir, "datanet", "receipts", "datanet.jsonl");
const previousDataDir = process.env.DATA_DIR;

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest();
}

function hex(buffer) {
  return Buffer.from(buffer).toString("hex");
}

function receiptCount() {
  if (!fs.existsSync(receiptsFile)) return 0;
  return fs.readFileSync(receiptsFile, "utf8").split(/\n/).filter(Boolean).length;
}

function manifestForDuplicateLeaf(leafHex, rootHex) {
  return {
    version: 1,
    createdAt: new Date(0).toISOString(),
    sourcePath: "/proof/repeated.bin",
    sizeBytes: 20,
    chunkBytes: 10,
    chunks: [
      {
        index: 0,
        offset: 0,
        size: 10,
        leafHashHex: leafHex,
        file: "chunk_000000.bin",
      },
      {
        index: 1,
        offset: 10,
        size: 10,
        leafHashHex: leafHex,
        file: "chunk_000001.bin",
      },
    ],
    merkleRootHex: rootHex,
  };
}

async function jsonRequest(base, pathname, init = {}) {
  const response = await fetch(`${base}${pathname}`, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

let server;
try {
  delete process.env.DATANET_STRICT_MANIFEST;
  process.env.DATA_DIR = dataDir;
  fs.mkdirSync(dataDir, { recursive: true });

  const app = express();
  registerDataNetRoutes(app, { dataDir });
  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    instance.once("error", reject);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  const repeatedChunk = Buffer.from("same-chunk", "utf8");
  const leaf = sha256(repeatedChunk);
  const leafHex = hex(leaf);
  const duplicateRootHex = hex(merkleRoot([leaf, leaf]));
  assert.notEqual(duplicateRootHex, leafHex);

  const validManifest = manifestForDuplicateLeaf(leafHex, duplicateRootHex);

  const chunkPut = await jsonRequest(base, `/datanet/v1/chunks/${leafHex}`, {
    method: "PUT",
    headers: { "content-type": "application/octet-stream" },
    body: repeatedChunk,
  });
  assert.equal(chunkPut.response.status, 200, JSON.stringify(chunkPut.body));
  assert.equal(chunkPut.body?.ok, true);

  const validPut = await jsonRequest(
    base,
    `/datanet/v1/manifests/${duplicateRootHex}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validManifest),
    },
  );
  assert.equal(validPut.response.status, 200, JSON.stringify(validPut.body));
  assert.equal(validPut.body?.ok, true);
  assert.equal(validPut.body?.leaves, 2);

  const validGet = await jsonRequest(
    base,
    `/datanet/v1/manifests/${duplicateRootHex}`,
  );
  assert.equal(validGet.response.status, 200, JSON.stringify(validGet.body));
  assert.equal(validGet.body?.ok, true);

  const duplicateProof = await jsonRequest(
    base,
    `/datanet/v1/proof/${duplicateRootHex}/1`,
  );
  assert.equal(
    duplicateProof.response.status,
    200,
    JSON.stringify(duplicateProof.body),
  );
  assert.equal(duplicateProof.body?.ok, true);
  assert.equal(duplicateProof.body?.leaves, 2);
  assert.equal(duplicateProof.body?.index, 1);
  assert.equal(duplicateProof.body?.leaf, leafHex);

  const receiptsBeforeValid = receiptCount();
  const validReceipt = await jsonRequest(base, "/datanet/v1/receipt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "1".repeat(32),
      root: duplicateRootHex,
      leaf: leafHex,
      index: 1,
      bytes: repeatedChunk.length,
      who: "manifest-root-proof",
      ok: true,
    }),
  });
  assert.equal(validReceipt.response.status, 200, JSON.stringify(validReceipt.body));
  assert.equal(validReceipt.body?.ok, true);
  assert.equal(receiptCount(), receiptsBeforeValid + 1);

  const validFetch = await jsonRequest(
    base,
    `/datanet/v1/fetch2/${duplicateRootHex}?who=manifest-root-proof`,
  );
  assert.equal(validFetch.response.status, 200, JSON.stringify(validFetch.body));
  assert.equal(validFetch.body?.ok, true);
  assert.equal(validFetch.body?.verify_ok, true);
  assert.equal(validFetch.body?.source, "manifest_chunks");
  assert.equal(
    Buffer.from(validFetch.body?.cipher_b64 || "", "base64").toString("utf8"),
    "same-chunksame-chunk",
  );

  const arbitraryRoot = "f".repeat(64);
  assert.notEqual(arbitraryRoot, duplicateRootHex);
  const arbitraryManifest = manifestForDuplicateLeaf(leafHex, arbitraryRoot);
  const arbitraryPut = await jsonRequest(
    base,
    `/datanet/v1/manifests/${arbitraryRoot}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(arbitraryManifest),
    },
  );
  assert.equal(arbitraryPut.response.status, 400, JSON.stringify(arbitraryPut.body));
  assert.equal(arbitraryPut.body?.ok, false);
  assert.equal(
    fs.existsSync(path.join(manifestsDir, `${arbitraryRoot}.json`)),
    false,
  );

  const conflictRoot = leafHex;
  const conflictingManifest = {
    ...manifestForDuplicateLeaf(leafHex, conflictRoot),
    leaves: [leafHex],
  };
  const conflictingPut = await jsonRequest(
    base,
    `/datanet/v1/manifests/${conflictRoot}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(conflictingManifest),
    },
  );
  assert.equal(
    conflictingPut.response.status,
    400,
    JSON.stringify(conflictingPut.body),
  );
  assert.equal(conflictingPut.body?.ok, false);
  assert.match(
    String(conflictingPut.body?.reason || ""),
    /manifest_leaf_representations_conflict/,
  );
  assert.equal(
    fs.existsSync(path.join(manifestsDir, `${conflictRoot}.json`)),
    false,
  );

  const historicalRoot = "e".repeat(64);
  assert.notEqual(historicalRoot, duplicateRootHex);
  fs.mkdirSync(manifestsDir, { recursive: true });
  fs.writeFileSync(
    path.join(manifestsDir, `${historicalRoot}.json`),
    JSON.stringify(manifestForDuplicateLeaf(leafHex, historicalRoot), null, 2) + "\n",
  );

  const corruptGet = await jsonRequest(
    base,
    `/datanet/v1/manifests/${historicalRoot}`,
  );
  assert.equal(corruptGet.response.status, 409, JSON.stringify(corruptGet.body));
  assert.equal(corruptGet.body?.ok, false);
  assert.equal(corruptGet.body?.err, "stored_manifest_invalid");

  const corruptProof = await jsonRequest(
    base,
    `/datanet/v1/proof/${historicalRoot}/0`,
  );
  assert.equal(
    corruptProof.response.status,
    409,
    JSON.stringify(corruptProof.body),
  );
  assert.equal(corruptProof.body?.ok, false);

  const receiptsBeforeCorrupt = receiptCount();
  const corruptReceipt = await jsonRequest(base, "/datanet/v1/receipt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "2".repeat(32),
      root: historicalRoot,
      leaf: leafHex,
      index: 0,
      bytes: repeatedChunk.length,
      who: "manifest-root-proof",
      ok: true,
    }),
  });
  assert.equal(
    corruptReceipt.response.status,
    400,
    JSON.stringify(corruptReceipt.body),
  );
  assert.equal(corruptReceipt.body?.ok, false);
  assert.equal(corruptReceipt.body?.err, "manifest_root_invalid");
  assert.equal(receiptCount(), receiptsBeforeCorrupt);

  const corruptFetch = await jsonRequest(
    base,
    `/datanet/v1/fetch2/${historicalRoot}?who=manifest-root-proof`,
  );
  assert.equal(
    corruptFetch.response.status,
    409,
    JSON.stringify(corruptFetch.body),
  );
  assert.equal(corruptFetch.body?.ok, false);
  assert.equal(corruptFetch.body?.error, "manifest_root_invalid");

  const source = fs.readFileSync(
    new URL("../src/http/datanet_routes.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /root_mismatch_stored_anyway/);
  assert.doesNotMatch(source, /root_mismatch_non_strict/);
  assert.doesNotMatch(source, /strictManifest/);
  assert.match(source, /orderedLeavesFromManifest/);
  assert.match(source, /validateManifestRoot/);
  assert.match(source, /source === "manifest_chunks" && !verify_ok/);

  console.log(MARKER);
  console.log("arbitrary_root_manifest_stored=false");
  console.log("duplicate_leaf_multiplicity_preserved=true");
  console.log("conflicting_manifest_representations_accepted=false");
  console.log("historical_mismatched_manifest_served=false");
  console.log("mismatched_manifest_proof_ok=false");
  console.log("mismatched_manifest_receipt_appended=false");
  console.log("mismatched_manifest_fetch_ok=false");
  console.log("manifest_root_validation_unconditional=true");
  console.log("runtime_live_datanet_mutation_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  if (server) {
    await new Promise((resolve) => server.close(() => resolve()));
  }
  delete process.env.DATANET_STRICT_MANIFEST;
  if (previousDataDir === undefined) {
    delete process.env.DATA_DIR;
  } else {
    process.env.DATA_DIR = previousDataDir;
  }
  fs.rmSync(rootDir, { recursive: true, force: true });
}
