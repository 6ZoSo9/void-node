#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_MAX_BYTES,
  MARKER,
  VERSION,
  canonicalJson,
  resolveOrderStatusSource,
  sha256Hex,
  validateSubmissionId,
} from "../tools/void-public-agent-service-order-status-readonly-source-resolver-v1.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const toolPath = path.join(
  repoRoot,
  "tools/void-public-agent-service-order-status-readonly-source-resolver-v1.mjs",
);
const examplePath = path.join(
  repoRoot,
  "examples/public-agent-service-order-status-readonly-source-resolver-v1.example.json",
);
const schemaPath = path.join(
  repoRoot,
  "schemas/public-agent-service-order-status-readonly-source-resolver-v1.schema.json",
);

const submissionId = "void-order-status-source-resolver-example-v1";
const exampleSource = {
  submission_id: submissionId,
  operation_id:
    "voidmcpac1_569a21df18f7029e5143bd41076104e69984975230722da2b5ba7ae3fa4ea590",
  accepted_for_review: true,
  provider_selected: false,
  provider_authenticated: false,
  quote_available: false,
  requester_accepted: false,
  payment_authorized: false,
  payment_confirmed: false,
  execution_authorized: false,
  dispatched: false,
  completed: false,
  rejected: false,
  failed: false,
  updated_at: "2026-07-30T23:50:00Z",
};

function allAuthorityFalse(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).length === 14 &&
    Object.values(value).every((entry) => entry === false)
  );
}

async function expectReject(label, action, pattern) {
  await assert.rejects(action, pattern, label);
}

function hash(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const root = await mkdtemp(
  path.join(os.tmpdir(), "void-order-status-source-resolver-v1-"),
);

try {
  const sourcePath = path.join(root, `${submissionId}.json`);
  const sourceBytes = Buffer.from(canonicalJson(exampleSource), "utf8");
  await writeFile(sourcePath, sourceBytes, { mode: 0o600 });
  await chmod(sourcePath, 0o600);

  const entriesBefore = (await readdir(root)).sort();
  const bytesBefore = await readFile(sourcePath);
  const metadataBefore = await stat(sourcePath);

  const foundA = await resolveOrderStatusSource({
    root,
    submissionId,
  });
  const foundB = await resolveOrderStatusSource({
    root,
    submissionId,
  });

  assert.equal(foundA.marker, MARKER);
  assert.equal(foundA.version, VERSION);
  assert.equal(foundA.found, true);
  assert.equal(foundA.submission_id, submissionId);
  assert.equal(foundA.source_filename, `${submissionId}.json`);
  assert.equal(foundA.source_sha256, sha256Hex(sourceBytes));
  assert.equal(foundA.source_size_bytes, sourceBytes.length);
  assert.deepEqual(foundA.source, exampleSource);
  assert.equal(foundA.reason, null);
  assert.equal(allAuthorityFalse(foundA.authority), true);
  assert.equal(canonicalJson(foundA), canonicalJson(foundB));

  const example = JSON.parse(await readFile(examplePath, "utf8"));
  assert.deepEqual(example, foundA);
  console.log("example_exact_green=true");
  console.log("found_source_resolution_green=true");
  console.log("deterministic_found_result_green=true");

  const missingId = "void-order-status-source-resolver-missing-v1";
  const missingA = await resolveOrderStatusSource({
    root,
    submissionId: missingId,
  });
  const missingB = await resolveOrderStatusSource({
    root,
    submissionId: missingId,
  });
  assert.equal(missingA.found, false);
  assert.equal(missingA.submission_id, missingId);
  assert.equal(missingA.source_filename, `${missingId}.json`);
  assert.equal(missingA.source_sha256, null);
  assert.equal(missingA.source_size_bytes, 0);
  assert.equal(missingA.source, null);
  assert.equal(missingA.reason, "order_status_source_not_found");
  assert.equal(allAuthorityFalse(missingA.authority), true);
  assert.equal(canonicalJson(missingA), canonicalJson(missingB));
  console.log("deterministic_not_found_green=true");

  for (const invalid of [
    "",
    ".",
    "..",
    "../escape",
    "nested/path",
    "nested\\path",
    "%2e%2e",
    "id?query",
    "id#fragment",
    "a".repeat(129),
  ]) {
    assert.throws(() => validateSubmissionId(invalid), /invalid_submission_id/);
  }
  console.log("submission_id_and_traversal_refusal_green=true");

  const mismatchId = "void-order-status-source-resolver-mismatch-v1";
  await writeFile(
    path.join(root, `${mismatchId}.json`),
    canonicalJson({ submission_id: "different-id" }),
  );
  await expectReject(
    "mismatched source identity",
    () => resolveOrderStatusSource({ root, submissionId: mismatchId }),
    /source_submission_id_mismatch/,
  );

  const malformedId = "void-order-status-source-resolver-malformed-v1";
  await writeFile(path.join(root, `${malformedId}.json`), "{not-json");
  await expectReject(
    "malformed JSON",
    () => resolveOrderStatusSource({ root, submissionId: malformedId }),
    /source_json_invalid/,
  );

  const arrayId = "void-order-status-source-resolver-array-v1";
  await writeFile(
    path.join(root, `${arrayId}.json`),
    canonicalJson([{ submission_id: arrayId }]),
  );
  await expectReject(
    "non-object JSON",
    () => resolveOrderStatusSource({ root, submissionId: arrayId }),
    /source_json_must_be_object/,
  );

  const utf8Id = "void-order-status-source-resolver-utf8-v1";
  await writeFile(
    path.join(root, `${utf8Id}.json`),
    Buffer.from([0xc3, 0x28]),
  );
  await expectReject(
    "invalid UTF-8",
    () => resolveOrderStatusSource({ root, submissionId: utf8Id }),
    /source_utf8_invalid/,
  );

  const directoryId = "void-order-status-source-resolver-directory-v1";
  await mkdir(path.join(root, `${directoryId}.json`));
  await expectReject(
    "directory candidate",
    () => resolveOrderStatusSource({ root, submissionId: directoryId }),
    /source_not_regular_file/,
  );

  const targetId = "void-order-status-source-resolver-target-v1";
  const linkId = "void-order-status-source-resolver-link-v1";
  await writeFile(
    path.join(root, `${targetId}.json`),
    canonicalJson({ submission_id: targetId }),
  );
  await symlink(
    path.join(root, `${targetId}.json`),
    path.join(root, `${linkId}.json`),
  );
  await expectReject(
    "candidate symlink",
    () => resolveOrderStatusSource({ root, submissionId: linkId }),
    /source_symlink_refused/,
  );

  const rootLink = `${root}-link`;
  await symlink(root, rootLink);
  await expectReject(
    "root symlink",
    () => resolveOrderStatusSource({ root: rootLink, submissionId }),
    /source_root_must_be_real_directory|source_root_contains_symlink/,
  );
  await rm(rootLink);

  const oversizedId = "void-order-status-source-resolver-oversized-v1";
  await writeFile(
    path.join(root, `${oversizedId}.json`),
    Buffer.alloc(DEFAULT_MAX_BYTES + 1, 0x20),
  );
  await expectReject(
    "oversized source",
    () => resolveOrderStatusSource({ root, submissionId: oversizedId }),
    /source_size_refused/,
  );
  console.log("unsafe_source_refusal_green=true");

  const cli = spawnSync(
    process.execPath,
    [
      toolPath,
      "resolve",
      "--root",
      root,
      "--submission-id",
      submissionId,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout), foundA);
  console.log("cli_resolve_green=true");

  const entriesAfter = (await readdir(root)).sort();
  const bytesAfter = await readFile(sourcePath);
  const metadataAfter = await stat(sourcePath);
  assert.deepEqual(entriesAfter, entriesBefore.concat([
    `${mismatchId}.json`,
    `${malformedId}.json`,
    `${arrayId}.json`,
    `${utf8Id}.json`,
    `${directoryId}.json`,
    `${targetId}.json`,
    `${linkId}.json`,
    `${oversizedId}.json`,
  ]).sort());
  assert.equal(hash(bytesAfter), hash(bytesBefore));
  assert.equal(metadataAfter.size, metadataBefore.size);
  assert.equal(metadataAfter.mode, metadataBefore.mode);
  console.log("source_bytes_unchanged_green=true");

  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  assert.equal(schema.properties.marker.const, MARKER);
  assert.equal(schema.properties.version.const, VERSION);
  assert.equal(
    schema.properties.source_size_bytes.maximum,
    DEFAULT_MAX_BYTES,
  );
  assert.equal(
    schema.properties.authority.properties.source_write.const,
    false,
  );
  console.log("schema_contract_green=true");

  const toolText = await readFile(toolPath, "utf8");
  for (const prohibited of [
    "writeFile",
    "appendFile",
    "truncate",
    "rename",
    "unlink",
    "createWriteStream",
    "node:http",
    "node:https",
    ".listen(",
  ]) {
    assert.equal(
      toolText.includes(prohibited),
      false,
      `prohibited resolver capability: ${prohibited}`,
    );
  }
  assert.equal(toolText.includes("O_RDONLY"), true);
  assert.equal(toolText.includes("O_NOFOLLOW"), true);
  console.log("read_only_capability_surface_green=true");
  console.log("all_authority_false_green=true");
  console.log("http_route_registered=false");
  console.log("server_mount_modified=false");
  console.log("source_write=false");
  console.log(
    "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_SOURCE_RESOLVER_V1_PROOF_GREEN=true",
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
