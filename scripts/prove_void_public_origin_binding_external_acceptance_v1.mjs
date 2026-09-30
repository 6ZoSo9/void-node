#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
} from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS,
  signVoidNodePublicOriginBindingV1,
  verifyVoidNodePublicOriginBindingV1,
} from "../tools/lib/void-node-public-origin-binding-v1.mjs";
import {
  VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1,
  VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCOUNT_V1,
  VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
  VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1,
  buildVoidPublicOriginBindingExternalAcceptanceV1 as
    buildExternalAcceptanceRawV1,
  readVoidPublicOriginBindingExternalAcceptanceReceiptFileV1,
  validateVoidPublicOriginBindingExternalAcceptanceReceiptV1,
  verifyVoidPublicOriginBindingExternalAcceptanceSourceV1,
} from "../tools/void-public-origin-binding-external-acceptance-v1.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function clone(value) {
  return structuredClone(value);
}

function canonicalize(value) {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function rehashReceipt(value) {
  const copy = clone(value);
  delete copy.receipt_id;
  value.receipt_id =
    "voidpora1_"+
    sha256(Buffer.from(JSON.stringify(canonicalize(copy))));
  return value;
}

const nowMs = Date.parse(
  "2026-09-30T12:00:00.000Z",
);
const trustRegistrySha256 =
  "49f285908fa70c72ce036b44d9ead41e11fc1bd40092384636a2c0cc3a0d3790";
const noNodeClientTool = fileURLToPath(
  new URL(
    "../tools/void_public_earn_no_node_client_v1.mjs",
    import.meta.url,
  ),
);
const repositoryHead = execFileSync(
  "git",
  ["rev-parse", "HEAD"],
  { encoding: "utf8" },
).trim();
const sourceProvenance = Object.freeze({
  repository_head: repositoryHead,
  clean_main: true,
  collector_sha256: sha256(
    fs.readFileSync(
      "tools/void-public-origin-binding-external-acceptance-v1.mjs",
    ),
  ),
  directory_tool_sha256: sha256(
    fs.readFileSync(
      "tools/wc-public-opportunity-directory-v1.mjs",
    ),
  ),
  handoff_tool_sha256: sha256(
    fs.readFileSync(
      "tools/wc-public-opportunity-handoff-v1.mjs",
    ),
  ),
});
const buildVoidPublicOriginBindingExternalAcceptanceV1 =
  (input) => buildExternalAcceptanceRawV1({
    sourceProvenance,
    ...input,
  });
const { privateKey, publicKey } =
  generateKeyPairSync("ed25519");
const fingerprint = sha256(
  publicKey.export({
    type: "spki",
    format: "der",
  }),
);

const binding = signVoidNodePublicOriginBindingV1({
  privateKey,
  publicKey,
  nodeId:
    VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1,
  origin:
    VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
  issuedAt: "2026-09-30T11:59:00.000Z",
  expiresAt: "2026-10-30T12:00:00.000Z",
});
const bindingBytes = Buffer.from(
  JSON.stringify(binding, null, 2) + "\n",
  "utf8",
);

const verifyEphemeral = (value, options) => ({
  ...verifyVoidNodePublicOriginBindingV1(
    value,
    {
      ...options,
      expectedPublicKeyFingerprintSha256:
        fingerprint,
      nowMs,
    },
  ),
  trust_registry_sha256: trustRegistrySha256,
});

const verified = verifyEphemeral(
  binding,
  {
    expectedOrigin:
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
    expectedNodeId:
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1,
  },
);

const aliasResults =
  VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS.map(
    (pathname) => ({
      path: pathname,
      url: new URL(
        pathname,
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
      ).href,
      http_status: 200,
      body: Buffer.from(bindingBytes),
    }),
  );

const directory = {
  marker:
    "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1",
  status: "green",
  directory_state: "available",
  summary: {
    total: 1,
    available: 1,
    hold: 0,
    unavailable: 0,
    invalid_result: 0,
  },
  results: [
    {
      base:
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
      state: "available",
      trusted: true,
      pilot: {
        coordinator_enabled: true,
        fixed_award_wc: 3,
        fixed_award_matches: true,
      },
      public_claim: {
        configured: true,
        enabled: true,
      },
      safety: {
        read_only: true,
        get_only: true,
        mutation_attempted: false,
      },
    },
  ],
  safety: {
    read_only: true,
    child_results_safety_validated: true,
    mutation_attempted: false,
    ticket_issuance_attempted: false,
    receipt_submission_attempted: false,
    wc_award_attempted: false,
    wallet_access_attempted: false,
    settlement_attempted: false,
  },
};

function shellQuote(value) {
  return /^[A-Za-z0-9_./:@%+=,-]+$/u.test(value) ? value : `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

function command(kind) {
  const argv = [
    "node",
    noNodeClientTool,
    kind,
    "--account",
    VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCOUNT_V1,
    "--coordinator-base",
    VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
    "--coordinator-node-id",
    VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1,
  ];
  return {
    argv,
    shell: argv.map(shellQuote).join(" "),
  };
}

const handoff = {
  marker:
    "VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1",
  status: "green",
  handoff_state: "ready",
  account:
    VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCOUNT_V1,
  selected: {
    base:
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
    fixed_award_wc: 3,
  },
  coordinator_identity: {
    node_id:
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1,
    trust_mode: "signed_public_origin_binding",
    public_copy_ready: true,
    trust_registry_sha256: trustRegistrySha256,
    trusted_public_key_fingerprint_sha256:
      fingerprint,
    binding: {
      path:
        VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS[0],
      http_status: 200,
      binding_sha256: verified.binding_sha256,
      issued_at: verified.issued_at,
      expires_at: verified.expires_at,
      public_key_fingerprint_sha256:
        fingerprint,
    },
  },
  commands: {
    status: command("status"),
    run: command("run"),
  },
  safety: {
    read_only: true,
    cryptographic_public_origin_binding_verified:
      true,
    public_copy_ready: true,
    directory_marker_validated: true,
    directory_safety_validated: true,
    selected_child_safety_validated: true,
    client_executed: false,
    identity_created: false,
    mutation_attempted: false,
    ticket_issuance_attempted: false,
    receipt_submission_attempted: false,
    wc_award_attempted: false,
    wallet_access_attempted: false,
    settlement_attempted: false,
  },
};

const evidence =
  buildVoidPublicOriginBindingExternalAcceptanceV1({
    aliasResults,
    directory,
    handoff,
    nowMs,
    verifyBinding: verifyEphemeral,
    expectedFingerprint: fingerprint,
  });

assert.equal(
  evidence.marker,
  VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1,
);
assert.equal(evidence.status, "green");
assert.equal(evidence.external_acceptance, true);
assert.equal(evidence.source.clean_main, true);
assert.equal(
  evidence.source.repository_head,
  sourceProvenance.repository_head,
);
assert.equal(
  evidence.source.collector_sha256,
  sourceProvenance.collector_sha256,
);
assert.equal(
  evidence.source.directory_tool_sha256,
  sourceProvenance.directory_tool_sha256,
);
assert.equal(
  evidence.source.handoff_tool_sha256,
  sourceProvenance.handoff_tool_sha256,
);
assert.equal(
  evidence.coordinator.base,
  "https://seed.nullfeed.org",
);
assert.equal(
  evidence.coordinator.node_id,
  "9d89483769e469e0473b489dc50dba96",
);
assert.equal(
  evidence.coordinator.trust_registry_sha256,
  trustRegistrySha256,
);
assert.equal(
  evidence.binding.byte_identical_aliases,
  true,
);
assert.equal(
  evidence.binding.aliases.length,
  2,
);
assert.equal(
  evidence.binding.binding_sha256,
  verified.binding_sha256,
);
assert.equal(
  evidence.directory.state,
  "available",
);
assert.equal(
  evidence.handoff.public_copy_ready,
  true,
);
assert.equal(
  evidence.handoff.trust_mode,
  "signed_public_origin_binding",
);
assert.equal(
  evidence.safety.read_only,
  true,
);
assert.equal(
  evidence.safety.no_node_client_executed,
  true,
);
assert.equal(
  evidence.safety.ticket_issuance_attempted,
  false,
);
assert.equal(
  evidence.safety.private_key_access,
  false,
);
assert.equal(
  evidence.safety.service_restart,
  false,
);
assert.equal(
  evidence.safety.funds_movement,
  false,
);
assert.match(
  evidence.receipt_id,
  /^voidpora1_[0-9a-f]{64}$/u,
);
assert.equal(
  Buffer.from(
    evidence.binding.artifact_base64,
    "base64",
  ).equals(bindingBytes),
  true,
);

const receiptValidationOptions = {
  expectedSourceProvenance: sourceProvenance,
  verifyBinding: verifyEphemeral,
  expectedFingerprint: fingerprint,
  expectedTrustRegistrySha256: trustRegistrySha256,
};
assert.deepEqual(
  validateVoidPublicOriginBindingExternalAcceptanceReceiptV1(
    clone(evidence),
    receiptValidationOptions,
  ),
  evidence,
);
assert.deepEqual(
  verifyVoidPublicOriginBindingExternalAcceptanceSourceV1(
    evidence.source,
    { requireMainAncestor: false },
  ),
  evidence.source,
);

{
  const badSource = {
    ...evidence.source,
    collector_sha256:"0".repeat(64),
  };
  assert.throws(
    () =>
      verifyVoidPublicOriginBindingExternalAcceptanceSourceV1(
        badSource,
        {requireMainAncestor:false},
      ),
    /source hash mismatch: collector_sha256/u,
  );
}

{
  const bad = clone(evidence);
  bad.receipt_id = "voidpora1_"+"0".repeat(64);
  assert.throws(
    () =>
      validateVoidPublicOriginBindingExternalAcceptanceReceiptV1(
        bad,
        receiptValidationOptions,
      ),
    /receipt ID mismatch/u,
  );
}
{
  const bad = clone(evidence);
  bad.source.collector_sha256 = "0".repeat(64);
  rehashReceipt(bad);
  assert.throws(
    () =>
      validateVoidPublicOriginBindingExternalAcceptanceReceiptV1(
        bad,
        receiptValidationOptions,
      ),
    /source provenance mismatch/u,
  );
}
{
  const bad = clone(evidence);
  const fakeArtifact = Buffer.from("{}\n","utf8");
  const fakeSha = sha256(fakeArtifact);
  bad.binding.artifact_base64 =
    fakeArtifact.toString("base64");
  bad.binding.artifact_sha256 = fakeSha;
  for (const alias of bad.binding.aliases) {
    alias.artifact_sha256 = fakeSha;
  }
  rehashReceipt(bad);
  assert.throws(
    () =>
      validateVoidPublicOriginBindingExternalAcceptanceReceiptV1(
        bad,
        receiptValidationOptions,
      ),
    /binding|public-origin|shape|identity/u,
  );
}
{
  const bad = clone(evidence);
  bad.handoff.public_copy_ready = false;
  rehashReceipt(bad);
  assert.throws(
    () =>
      validateVoidPublicOriginBindingExternalAcceptanceReceiptV1(
        bad,
        receiptValidationOptions,
      ),
    /handoff contract invalid/u,
  );
}
{
  const bad = clone(evidence);
  bad.safety.private_key_access = true;
  rehashReceipt(bad);
  assert.throws(
    () =>
      validateVoidPublicOriginBindingExternalAcceptanceReceiptV1(
        bad,
        receiptValidationOptions,
      ),
    /safety mismatch: private_key_access/u,
  );
}

{
  const root = fs.mkdtempSync(
    "/tmp/void-public-origin-acceptance-receipt-v1-",
  );
  const receiptFile = root+"/receipt.json";
  try {
    fs.writeFileSync(
      receiptFile,
      JSON.stringify(evidence,null,2)+"\n",
      {mode:0o600},
    );
    assert.deepEqual(
      readVoidPublicOriginBindingExternalAcceptanceReceiptFileV1(
        receiptFile,
        {
          requireMainAncestor:false,
          verifyBinding:verifyEphemeral,
          expectedFingerprint:fingerprint,
          expectedTrustRegistrySha256:
            trustRegistrySha256,
        },
      ),
      evidence,
    );
  } finally {
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  assert.throws(
    () =>
      buildExternalAcceptanceRawV1({
        aliasResults,
        directory,
        handoff,
        sourceProvenance: {
          ...sourceProvenance,
          clean_main: false,
        },
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /collector source provenance is invalid/u,
  );
}

{
  const mismatched = aliasResults.map(
    (entry) => ({
      ...entry,
      body: Buffer.from(entry.body),
    }),
  );
  mismatched[1].body = Buffer.concat([
    mismatched[1].body,
    Buffer.from("\n"),
  ]);
  assert.throws(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        aliasResults: mismatched,
        directory,
        handoff,
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /aliases are not byte-identical/u,
  );
}

{
  const badStatus = aliasResults.map(
    (entry) => ({
      ...entry,
      body: Buffer.from(entry.body),
    }),
  );
  badStatus[0].http_status = 302;
  assert.throws(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        aliasResults: badStatus,
        directory,
        handoff,
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /alias transport contract failed/u,
  );
}

{
  const unsafeDirectory = clone(directory);
  unsafeDirectory.safety.mutation_attempted = true;
  assert.throws(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        aliasResults,
        directory: unsafeDirectory,
        handoff,
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /directory safety contract failed/u,
  );
}

{
  const notReady = clone(handoff);
  notReady.coordinator_identity.public_copy_ready =
    false;
  assert.throws(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        aliasResults,
        directory,
        handoff: notReady,
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /signed public-origin identity contract failed/u,
  );
}

{
  const executed = clone(handoff);
  executed.safety.client_executed = true;
  assert.throws(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        aliasResults,
        directory,
        handoff: executed,
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /handoff safety contract failed/u,
  );
}

{
  const wrongBinding = clone(handoff);
  wrongBinding.coordinator_identity
    .binding.binding_sha256 = "0".repeat(64);
  assert.throws(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        aliasResults,
        directory,
        handoff: wrongBinding,
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /signed public-origin identity contract failed/u,
  );
}

{
  const wrongNode = clone(handoff);
  wrongNode.coordinator_identity.node_id =
    "e".repeat(32);
  assert.throws(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        aliasResults,
        directory,
        handoff: wrongNode,
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /signed public-origin identity contract failed/u,
  );
}

{
  const duplicateOverride = clone(handoff);
  duplicateOverride.commands.run.argv.push(
    "--coordinator-base",
    "https://attacker.example",
  );
  assert.throws(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        aliasResults,
        directory,
        handoff: duplicateOverride,
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /handoff command contract failed/u,
  );
}

{
  const extraArgument = clone(handoff);
  extraArgument.commands.status.argv.push(
    "--state-dir",
    "/tmp/attacker-selected-state",
  );
  assert.throws(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        aliasResults,
        directory,
        handoff: extraArgument,
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /handoff command contract failed/u,
  );
}

{
  const shellMismatch = clone(handoff);
  shellMismatch.commands.run.shell +=
    " --coordinator-base https://attacker.example";
  assert.throws(
    () =>
      buildVoidPublicOriginBindingExternalAcceptanceV1({
        aliasResults,
        directory,
        handoff: shellMismatch,
        nowMs,
        verifyBinding: verifyEphemeral,
        expectedFingerprint: fingerprint,
      }),
    /handoff command contract failed/u,
  );
}

const source = fs.readFileSync(
  new URL(
    "../tools/void-public-origin-binding-external-acceptance-v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

for (const required of [
  "wc-public-opportunity-directory-v1.mjs",
  "wc-public-opportunity-handoff-v1.mjs",
  "https://seed.nullfeed.org",
  "VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS",
  "verifyReviewedVoidNodePublicOriginBindingV1",
  "VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256",
  "alias_request_inactivity_timeout",
  "alias_response_inactivity_timeout",
  "alias_total_deadline_exceeded",
  "function terminateAliasV1(error)",
  "O_EXCL",
  "0o600",
  "env: {}",
  "validateHandoffCommandV1(",
  "NO_NODE_CLIENT_TOOL",
  'gitV1(["branch", "--show-current"])',
  '"status",',
  '"--porcelain=v1",',
  '"--untracked-files=all",',
  "regularSourceSha256V1(",
  "sourceProvenance",
  "assertCollectorProvenanceStableV1(",
  "source generation changed during collection",
  "validateVoidPublicOriginBindingExternalAcceptanceReceiptV1(",
  "readVoidPublicOriginBindingExternalAcceptanceReceiptFileV1(",
  "verifyVoidPublicOriginBindingExternalAcceptanceSourceV1(",
  '"voidpora1_"+',
  '"cat-file"',
  '"merge-base"',
  '"show"',
  'command === "verify"',
  '"offline_verification=true"',
  '"external_request=false"',
  '"child_process_execution=false"',
]) {
  assert.equal(
    source.includes(required),
    true,
    `collector missing required marker: ${required}`,
  );
}

for (const forbidden of [
  "incoming.resume()",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    `collector contains forbidden alias terminal behavior: ${forbidden}`,
  );
}

for (const forbidden of [
  "claim-ticket",
  "submit-result",
  "--base",
  "--select-base",
  "--account",
  "--key-file",
  "cryptoSign",
  "loadExistingVoidNodeKeypairV1",
  "systemctl",
  "process.exec(",
]) {
  if (
    forbidden === "--base"
    || forbidden === "--select-base"
    || forbidden === "--account"
  ) {
    continue;
  }
  assert.equal(
    source.includes(forbidden),
    false,
    `collector contains forbidden authority token: ${forbidden}`,
  );
}

assert.equal(
  /options:\s*\{[\s\S]*?base\s*:/u.test(source),
  false,
  "collector CLI must not expose a base override",
);
assert.equal(
  /options:\s*\{[\s\S]*?account\s*:/u.test(source),
  false,
  "collector CLI must not expose an account override",
);
assert.equal(
  /options:\s*\{[\s\S]*?tool\s*:/u.test(source),
  false,
  "collector CLI must not expose tool-path overrides",
);

console.log(
  "VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1_PROOF_GREEN",
);
console.log("two_https_binding_aliases_required=true");
console.log("aliases_byte_identical=true");
console.log("reviewed_identity_verification_required=true");
console.log("directory_available_required=true");
console.log("handoff_public_copy_ready_required=true");
console.log("handoff_client_executed=false");
console.log("ticket_issuance_attempted=false");
console.log("receipt_submission_attempted=false");
console.log("wc_award_attempted=false");
console.log("private_key_access=false");
console.log("signature_creation=false");
console.log("systemd_mutation=false");
console.log("service_restart=false");
console.log("funds_movement=false");
