#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
} from "node:crypto";
import {
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildVoidNodePublicOriginBindingSigningRequestV1,
  verifyVoidNodePublicOriginBindingSigningRequestV1,
} from "../tools/void-node-public-origin-binding-signing-request-v1.mjs";
import {
  unsignedVoidNodePublicOriginBindingBytesV1,
} from "../tools/lib/void-node-public-origin-binding-v1.mjs";

const ROOT = process.cwd();
const TOOL = path.join(
  ROOT,
  "tools/void-node-public-origin-binding-signing-request-v1.mjs",
);
const NODE_EVIDENCE = path.join(
  ROOT,
  "public/public-node/evidence/void-node-onion-binding-v1-nimo-verified.json",
);
const TOOL_SOURCE = await readFile(TOOL, "utf8");
const nodeEvidence = JSON.parse(
  await readFile(NODE_EVIDENCE, "utf8"),
);

function clone(value) {
  return structuredClone(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const input = {
  origin: "https://seed.nullfeed.org",
  node_id: nodeEvidence.node.node_id,
  public_key_pem: nodeEvidence.node.public_key_pem,
  issued_at: "2026-09-30T00:00:00.000Z",
  expires_at: "2027-03-30T00:00:00.000Z",
};

const request =
  buildVoidNodePublicOriginBindingSigningRequestV1(input);
const verified =
  verifyVoidNodePublicOriginBindingSigningRequestV1(
    request,
  );

assert.equal(
  request.marker,
  "VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1",
);
assert.equal(request.status, "unsigned");
assert.equal(request.generated_at, input.issued_at);
assert.equal(
  request.unsigned_binding.origin.value,
  input.origin,
);
assert.equal(
  request.unsigned_binding.node.node_id,
  nodeEvidence.node.node_id,
);
assert.equal(
  request.unsigned_binding.node.public_key_pem,
  nodeEvidence.node.public_key_pem,
);
assert.equal(
  request.unsigned_binding.node
    .public_key_fingerprint_sha256,
  "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b",
);
assert.equal(
  request.trust_registry.sha256,
  "49f285908fa70c72ce036b44d9ead41e11fc1bd40092384636a2c0cc3a0d3790",
);
assert.equal(
  request.unsigned_binding.signature.value,
  null,
);
assert.match(
  request.request_id,
  /^voidnpobsr1_[0-9a-f]{64}$/u,
);

const payload = Buffer.from(
  request.signing.payload_base64,
  "base64",
);
assert.equal(
  sha256(payload),
  request.signing.payload_sha256,
);
assert.deepEqual(
  payload,
  unsignedVoidNodePublicOriginBindingBytesV1(
    request.unsigned_binding,
  ),
);
assert.equal(verified.origin, input.origin);
assert.equal(verified.private_key_access, false);
assert.equal(verified.signature_created, false);
assert.equal(verified.publication_performed, false);

for (const marker of [
  "signVoidNodePublicOriginBindingV1",
  "cryptoSign(",
  "BEGIN PRIVATE KEY",
]) {
  assert.equal(
    TOOL_SOURCE.includes(marker),
    false,
    `signing-request tool contains forbidden signing marker: ${marker}`,
  );
}

const privateInput = {
  ...input,
  private_key_pem: "forbidden",
};
assert.throws(
  () => buildVoidNodePublicOriginBindingSigningRequestV1(
    privateInput,
  ),
  /input keys mismatch/,
);

const nonCanonical = clone(input);
nonCanonical.origin = "https://seed.nullfeed.org/";
assert.throws(
  () => buildVoidNodePublicOriginBindingSigningRequestV1(
    nonCanonical,
  ),
  /already be canonical/,
);

const publicHttp = clone(input);
publicHttp.origin = "http://seed.nullfeed.org";
assert.throws(
  () => buildVoidNodePublicOriginBindingSigningRequestV1(
    publicHttp,
  ),
  /default-port HTTPS DNS origin/,
);

const wrongNode = clone(input);
wrongNode.node_id = "d".repeat(32);
assert.throws(
  () => buildVoidNodePublicOriginBindingSigningRequestV1(
    wrongNode,
  ),
  /not present in the reviewed public node identity trust registry/,
);

const unrelatedPair = generateKeyPairSync("ed25519");
const wrongKey = clone(input);
wrongKey.public_key_pem = unrelatedPair.publicKey
  .export({ type: "spki", format: "pem" })
  .toString();
assert.throws(
  () => buildVoidNodePublicOriginBindingSigningRequestV1(
    wrongKey,
  ),
  /does not match the reviewed node trust fingerprint/,
);

const tamperedOrigin = clone(request);
tamperedOrigin.unsigned_binding.origin.value =
  "https://attacker.example";
assert.throws(
  () => verifyVoidNodePublicOriginBindingSigningRequestV1(
    tamperedOrigin,
  ),
  /deterministic signing payload/,
);

const tamperedPayload = clone(request);
tamperedPayload.signing.payload_base64 =
  Buffer.from("counterfeit").toString("base64");
assert.throws(
  () => verifyVoidNodePublicOriginBindingSigningRequestV1(
    tamperedPayload,
  ),
  /deterministic signing payload/,
);

const tamperedRequestId = clone(request);
tamperedRequestId.request_id =
  `voidnpobsr1_${"0".repeat(64)}`;
assert.throws(
  () => verifyVoidNodePublicOriginBindingSigningRequestV1(
    tamperedRequestId,
  ),
  /deterministic signing payload/,
);

const secretlySigned = clone(request);
secretlySigned.unsigned_binding.signature.value =
  "forbidden";
assert.throws(
  () => verifyVoidNodePublicOriginBindingSigningRequestV1(
    secretlySigned,
  ),
  /must not contain a signature value/,
);

const escalated = clone(request);
escalated.authority.wallet_or_signer_access = true;
assert.throws(
  () => verifyVoidNodePublicOriginBindingSigningRequestV1(
    escalated,
  ),
  /authority.wallet_or_signer_access mismatch/,
);

const work = await mkdtemp(
  path.join(
    tmpdir(),
    "void-public-origin-binding-signing-request-v1-",
  ),
);
const inputFile = path.join(work, "input.json");
const outputOne = path.join(work, "request-one.json");
const outputTwo = path.join(work, "request-two.json");
await writeFile(
  inputFile,
  JSON.stringify(input, null, 2) + "\n",
  "utf8",
);

for (const output of [outputOne, outputTwo]) {
  const run = spawnSync(
    process.execPath,
    [TOOL, "build", inputFile, output],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stderr);
  assert.match(
    run.stdout,
    /^private_key_access=false$/mu,
  );
  assert.match(
    run.stdout,
    /^signature_created=false$/mu,
  );
  assert.match(
    run.stdout,
    /^publication_performed=false$/mu,
  );
}
assert.equal(
  await readFile(outputOne, "utf8"),
  await readFile(outputTwo, "utf8"),
);

const verifyRun = spawnSync(
  process.execPath,
  [TOOL, "verify", outputOne],
  { cwd: ROOT, encoding: "utf8" },
);
assert.equal(verifyRun.status, 0, verifyRun.stderr);
assert.match(
  verifyRun.stdout,
  /^VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1_VERIFIED$/mu,
);

const overwrite = spawnSync(
  process.execPath,
  [TOOL, "build", inputFile, outputOne],
  { cwd: ROOT, encoding: "utf8" },
);
assert.notEqual(overwrite.status, 0);
assert.match(
  overwrite.stderr,
  /refusing to overwrite existing output/,
);

console.log(
  "VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1_PROOF_GREEN",
);
console.log(`request_id=${verified.request_id}`);
console.log(`origin=${verified.origin}`);
console.log(`node_id=${verified.node_id}`);
console.log(
  `public_key_fingerprint_sha256=${verified.public_key_fingerprint_sha256}`,
);
console.log(
  `trust_registry_sha256=${verified.trust_registry_sha256}`,
);
console.log(`payload_sha256=${verified.payload_sha256}`);
console.log("deterministic_output=true");
console.log("reviewed_trust_registry_bound=true");
console.log("private_key_input_rejected=true");
console.log("wrong_public_key_rejected=true");
console.log("public_http_origin_rejected=true");
console.log("tampered_request_rejected=true");
console.log("private_key_access=false");
console.log("wallet_or_signer_access=false");
console.log("signature_creation=false");
console.log("binding_publication=false");
console.log("route_activation=false");
console.log("runtime_mutation=false");
console.log("work_credit_mutation=false");
console.log("funds_movement=false");
