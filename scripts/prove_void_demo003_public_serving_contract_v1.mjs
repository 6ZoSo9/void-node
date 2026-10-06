#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_DEMO003_CANONICAL_PAYLOADS_V1,
  VOID_DEMO003_PUBLIC_SERVING_AUTHORITY_V1,
  VOID_DEMO003_PUBLIC_SERVING_CONTRACT_V1,
  classifyVoidDemo003PublicServingSetV1,
} from "../src/http/void_demo003_public_serving_contract_v1.ts";
import {
  readDirectRegularFileV1,
  testOnlyReadDirectRegularFileWithAfterOpenHookV1,
} from "../src/http/public_node_local_data_drop_file_v1.ts";

const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-demo003-serving-bound-"),
  );
  fs.chmodSync(root, 0o700);
  const large = path.join(root, "large.bin");
  try {
    const fd = fs.openSync(large, "wx", 0o600);
    try {
      fs.ftruncateSync(fd, 3 * 1024 * 1024);
    } finally {
      fs.closeSync(fd);
    }
    assert.throws(
      () => readDirectRegularFileV1(large, 2 * 1024 * 1024),
      /VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UNSAFE_STORAGE_V1:final_file_too_large/u,
      "Demo003 serving reader must reject oversized files before allocation",
    );

    const growing = path.join(root, "growing.bin");
    fs.writeFileSync(growing, Buffer.alloc(64, 0x41), { mode: 0o600 });
    assert.throws(
      () =>
        testOnlyReadDirectRegularFileWithAfterOpenHookV1(
          growing,
          2 * 1024 * 1024,
          () => {
            fs.appendFileSync(growing, Buffer.alloc(64 * 1024, 0x42));
          },
        ),
      /VOID_PUBLIC_NODE_LOCAL_DATA_DROP_UNSAFE_STORAGE_V1:final_file_grew_during_read/u,
      "growth after opened-size validation must HOLD after at most one extra-byte probe",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const payloadBytes = {
  "README.txt": Buffer.from(
    "VOID Public Node Local Data Drop Demo 003\n\n" +
      "This is a folder-style local data-drop fixture.\n" +
      "It proves a multi-file payload can be packaged with per-file hashes,\n" +
      "a manifest, trust boundaries, and safety boundaries before public serving.\n",
    "utf8",
  ),
  "index.html": Buffer.from(
    "<!doctype html>\n" +
      "<html>\n" +
      "  <head>\n" +
      '    <meta charset="utf-8">\n' +
      "    <title>VOID Demo 003 Folder Fixture</title>\n" +
      "  </head>\n" +
      "  <body>\n" +
      "    <h1>VOID Demo 003</h1>\n" +
      "    <p>Folder-style local data-drop fixture.</p>\n" +
      "  </body>\n" +
      "</html>\n",
    "utf8",
  ),
  "metadata.json": Buffer.from(
    "{\n" +
      '  "name": "VOID Demo 003 Folder Fixture",\n' +
      '  "purpose": "folder-style local data-drop proof fixture",\n' +
      '  "public_routes_only": true,\n' +
      '  "read_only": true,\n' +
      '  "mutation": false,\n' +
      '  "money_movement": false,\n' +
      '  "wallet_send": false,\n' +
      '  "validator_mutation": false,\n' +
      '  "trusted_as_network_truth": false\n' +
      "}\n",
    "utf8",
  ),
};

for (const [name, spec] of Object.entries(
  VOID_DEMO003_CANONICAL_PAYLOADS_V1,
)) {
  assert.equal(payloadBytes[name].length, spec.bytes);
  assert.equal(sha256(payloadBytes[name]), spec.sha256);
}

function buildManifest(payloads) {
  const rows = ["README.txt", "index.html", "metadata.json"].map((name) => ({
    path: "files/" + name,
    sizeBytes: payloads[name].length,
    sha256: sha256(payloads[name]),
  }));
  return {
    marker:
      "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_MANIFEST_V1",
    fixture_marker:
      "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1",
    object_set_id: "demo003-folder-fixture-v1",
    created_at_utc: "2026-10-05T00:00:00.000Z",
    file_count: rows.length,
    files: rows,
    trust_boundary: {
      offline_verified: true,
      network_fetch: false,
      network_fetch_during_import: false,
      trusted_as_network_truth: false,
    },
    safety_boundary: {
      public_routes_only: true,
      read_only: true,
      mutation: false,
      money_movement: false,
      wallet_send: false,
      validator_mutation: false,
    },
  };
}

function buildFixture(payloads) {
  const manifest = buildManifest(payloads);
  const manifestBytes = Buffer.from(
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
  const observed = {
    "manifest.json": sha256(manifestBytes),
    "files/README.txt": sha256(payloads["README.txt"]),
    "files/index.html": sha256(payloads["index.html"]),
    "files/metadata.json": sha256(payloads["metadata.json"]),
  };
  const checksumBytes = Buffer.from(
    [
      observed["files/README.txt"] + "  ./files/README.txt",
      observed["files/index.html"] + "  ./files/index.html",
      observed["files/metadata.json"] + "  ./files/metadata.json",
      observed["manifest.json"] + "  ./manifest.json",
    ].join("\n") + "\n",
    "ascii",
  );
  observed["sha256sums.txt"] = sha256(checksumBytes);
  const order = [
    "manifest.json",
    "sha256sums.txt",
    "files/README.txt",
    "files/index.html",
    "files/metadata.json",
  ];
  const sealedSet = sha256(
    Buffer.from(
      order.map((name) => name + "=" + observed[name] + "\n").join(""),
      "ascii",
    ),
  );
  const intake = {
    marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1",
    object_set_id: "demo003-folder-fixture-v1",
    file_count: 3,
    offline_verified: true,
    network_fetch_during_import: false,
    trusted_as_network_truth: false,
    verified_content_authority: "sealed_memfd_snapshot",
    visible_extraction_tree_trusted: false,
    sealed_snapshot_set_sha256: sealedSet,
    sealed_snapshot_sha256: {
      "manifest.json": observed["manifest.json"],
      "sha256sums.txt": observed["sha256sums.txt"],
      "files/README.txt": observed["files/README.txt"],
      "files/index.html": observed["files/index.html"],
      "files/metadata.json": observed["files/metadata.json"],
    },
    public_routes_only: true,
    read_only: true,
    mutation: false,
    money_movement: false,
    wallet_send: false,
    validator_mutation: false,
    imported_at_utc: "20261005-000000",
    source_manifest: manifest,
  };
  return {
    manifest,
    manifestBytes,
    checksumBytes,
    intake,
    intakeBytes: Buffer.from(JSON.stringify(intake, null, 2) + "\n", "utf8"),
    payloadBytes: payloads,
  };
}

const canonical = buildFixture(payloadBytes);
const result = classifyVoidDemo003PublicServingSetV1(canonical);
assert.equal(result.ok, true);
assert.equal(result.marker, VOID_DEMO003_PUBLIC_SERVING_CONTRACT_V1);
assert.equal(
  result.serving_authority,
  VOID_DEMO003_PUBLIC_SERVING_AUTHORITY_V1,
);
assert.equal(
  result.verified_content_authority,
  "canonical_demo003_source_contract_v1",
);
assert.equal(
  result.intake_verified_content_authority,
  "sealed_memfd_snapshot",
);
assert.equal(result.visible_extraction_tree_trusted, false);
assert.equal(result.offline_verified, true);
assert.equal(result.network_fetch_during_import, false);
assert.equal(result.trusted_as_network_truth, false);
assert.match(result.source_contract_sha256, /^sha256:[0-9a-f]{64}$/u);

const forgedPayloads = {
  ...payloadBytes,
  "README.txt": Buffer.from(
    payloadBytes["README.txt"].toString("utf8") +
      "coherent mutable forgery\n",
    "utf8",
  ),
};
const forged = buildFixture(forgedPayloads);
assert.throws(
  () => classifyVoidDemo003PublicServingSetV1(forged),
  /demo003_manifest_source_contract_mismatch:files\/README\.txt|demo003_payload_source_contract_mismatch:README\.txt/u,
  "coherently rewritten manifest/checksum/intake must not authorize changed payload bytes",
);

const forgedIntake = structuredClone(canonical.intake);
forgedIntake.visible_extraction_tree_trusted = true;
assert.throws(
  () =>
    classifyVoidDemo003PublicServingSetV1({
      ...canonical,
      intakeBytes: Buffer.from(
        JSON.stringify(forgedIntake, null, 2) + "\n",
        "utf8",
      ),
    }),
  /demo003_intake_contract_invalid/u,
);

const checksumDrift = Buffer.from(
  canonical.checksumBytes.toString("ascii").replace(
    VOID_DEMO003_CANONICAL_PAYLOADS_V1["index.html"].sha256,
    "0".repeat(64),
  ),
  "ascii",
);
assert.throws(
  () =>
    classifyVoidDemo003PublicServingSetV1({
      ...canonical,
      checksumBytes: checksumDrift,
    }),
  /demo003_checksum_digest_mismatch|demo003_intake_sealed_snapshot_mismatch/u,
);

const indexSource = fs.readFileSync("src/index.ts", "utf8");
assert.match(
  indexSource,
  /classifyVoidDemo003PublicServingSetV1/u,
  "index must import the Demo003 source-contract classifier",
);
const manifestStart = indexSource.indexOf(
  'APP.get("/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json"',
);
const fileStart = indexSource.indexOf(
  'APP.get("/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/:fileName"',
  manifestStart,
);
const fileEnd = indexSource.indexOf(
  'APP.get("/public-node/local-data-drop.json"',
  fileStart,
);
assert.ok(manifestStart >= 0 && fileStart > manifestStart && fileEnd > fileStart);
const manifestRoute = indexSource.slice(manifestStart, fileStart);
const fileRoute = indexSource.slice(fileStart, fileEnd);
for (const route of [manifestRoute, fileRoute]) {
  assert.match(route, /classifyVoidDemo003PublicServingSetV1/u);
  assert.match(route, /canonical_demo003_source_contract_v1/u);
  assert.match(route, /visible_extraction_tree_trusted/u);
  assert.match(route, /sealed_snapshot_set_sha256/u);
  assert.doesNotMatch(
    route,
    /verified_content_authority:\s*"sealed_memfd_snapshot"/u,
    "public serving must not promote mutable intake provenance into current serving authority",
  );
}
assert.match(
  manifestRoute,
  /intake_verified_content_authority:contract\.intake_verified_content_authority/u,
  "manifest route must label memfd only as intake provenance",
);
assert.match(
  fileRoute,
  /X-VOID-Demo003-Intake-Verified-Content-Authority/u,
  "file route must expose intake provenance separately from serving authority",
);
assert.doesNotMatch(
  manifestRoute,
  /offline_verified:\s*!!\(intake/u,
  "manifest route must not trust a mutable intake boolean directly",
);
assert.match(
  fileRoute,
  /demo003_folder_file_source_contract_hold/u,
  "file route must fail closed on source-contract drift",
);

console.log("VOID_DEMO003_PUBLIC_SERVING_CONTRACT_V1_GREEN");
console.log("canonical_payload_hashes_and_sizes_bound=true");
console.log("pre_read_file_size_bound=true");
console.log("descriptor_opened_size_read_bound=true");
console.log("grow_after_open_rejected=true");
console.log("manifest_and_checksum_bytes_bound_to_sealed_intake=true");
console.log("coherent_mutable_record_forgery_rejected=true");
console.log("public_routes_use_source_contract_classifier=true");
console.log("verified_content_authority=canonical_demo003_source_contract_v1");
console.log("intake_verified_content_authority=sealed_memfd_snapshot");
console.log("serving_authority=canonical_demo003_source_contract_v1");
console.log("visible_extraction_tree_trusted=false");
