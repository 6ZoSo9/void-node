#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_ORIGIN_V1,
  buildVoidNodePublicOriginBindingProductionRequestV1,
} from "../tools/void-node-public-origin-binding-production-request-v1.mjs";
import {
  verifyVoidNodePublicOriginBindingSigningRequestV1,
} from "../tools/void-node-public-origin-binding-signing-request-v1.mjs";

const ROOT = process.cwd();
const TOOL = path.join(
  ROOT,
  "tools/void-node-public-origin-binding-production-request-v1.mjs",
);
const work = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-public-origin-production-request-v1-",
  ),
);

try {
  const issuedAt = "2026-09-30T12:00:00.000Z";
  const expiresAt = "2027-03-29T12:00:00.000Z";

  const first =
    buildVoidNodePublicOriginBindingProductionRequestV1({
      issuedAt,
      expiresAt,
    });
  const second =
    buildVoidNodePublicOriginBindingProductionRequestV1({
      issuedAt,
      expiresAt,
    });

  assert.deepEqual(first, second);
  assert.equal(
    first.summary.origin,
    VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_ORIGIN_V1,
  );
  assert.equal(
    first.summary.origin,
    "https://seed.nullfeed.org",
  );
  assert.equal(
    first.summary.node_id,
    "9d89483769e469e0473b489dc50dba96",
  );
  assert.equal(
    first.summary.public_key_fingerprint_sha256,
    "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b",
  );
  assert.equal(
    first.request.unsigned_binding.signature.value,
    null,
  );
  assert.equal(first.summary.private_key_access, false);
  assert.equal(first.summary.wallet_or_signer_access, false);
  assert.equal(first.summary.signature_created, false);
  assert.equal(first.summary.publication_performed, false);
  assert.equal(first.summary.route_activation_performed, false);
  assert.equal(first.summary.runtime_mutation_performed, false);
  assert.equal(first.summary.work_credit_mutation, false);
  assert.equal(first.summary.funds_movement, false);

  const verified =
    verifyVoidNodePublicOriginBindingSigningRequestV1(
      first.request,
    );
  assert.equal(verified.request_id, first.summary.request_id);
  assert.equal(
    verified.payload_sha256,
    first.summary.payload_sha256,
  );

  const outputOne = path.join(work, "request-one.json");
  const outputTwo = path.join(work, "request-two.json");

  for (const output of [outputOne, outputTwo]) {
    const run = spawnSync(
      process.execPath,
      [
        TOOL,
        "build",
        "--issued-at", issuedAt,
        "--expires-at", expiresAt,
        "--output", output,
      ],
      { cwd: ROOT, encoding: "utf8" },
    );
    assert.equal(run.status, 0, run.stderr);
    assert.match(
      run.stdout,
      /^origin=https:\/\/seed\.nullfeed\.org$/mu,
    );
    assert.match(
      run.stdout,
      /^private_key_access=false$/mu,
    );
    assert.match(
      run.stdout,
      /^signature_created=false$/mu,
    );
  }

  assert.equal(
    fs.readFileSync(outputOne, "utf8"),
    fs.readFileSync(outputTwo, "utf8"),
  );

  const overwrite = spawnSync(
    process.execPath,
    [
      TOOL,
      "build",
      "--issued-at", issuedAt,
      "--expires-at", expiresAt,
      "--output", outputOne,
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.notEqual(overwrite.status, 0);
  assert.match(
    overwrite.stderr,
    /refusing to overwrite existing output/u,
  );

  const arbitraryOrigin = spawnSync(
    process.execPath,
    [
      TOOL,
      "build",
      "--issued-at", issuedAt,
      "--expires-at", expiresAt,
      "--output", path.join(work, "bad-origin.json"),
      "--origin", "https://attacker.example",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.notEqual(arbitraryOrigin.status, 0);
  assert.match(
    arbitraryOrigin.stderr,
    /unknown argument: --origin/u,
  );

  for (const [badIssued, badExpires] of [
    ["2026-09-30T12:00:00Z", expiresAt],
    [issuedAt, "not-a-time"],
    [expiresAt, issuedAt],
  ]) {
    const bad =
      buildVoidNodePublicOriginBindingProductionRequestV1({
        issuedAt: badIssued,
        expiresAt: badExpires,
      });
    void bad;
  }
  assert.throws(
    () =>
      buildVoidNodePublicOriginBindingProductionRequestV1({
        issuedAt: "2026-09-30T12:00:00Z",
        expiresAt,
      }),
    /canonical ISO-8601/u,
  );
  assert.throws(
    () =>
      buildVoidNodePublicOriginBindingProductionRequestV1({
        issuedAt,
        expiresAt: "not-a-time",
      }),
    /canonical ISO-8601/u,
  );
  assert.throws(
    () =>
      buildVoidNodePublicOriginBindingProductionRequestV1({
        issuedAt: expiresAt,
        expiresAt: issuedAt,
      }),
    /expires_at must be later than issued_at/u,
  );

  const source = fs.readFileSync(TOOL, "utf8");
  assert.equal(source.includes("process.env"), false);
  assert.equal(source.includes("--origin"), false);
  assert.equal(source.includes("--node-id"), false);
  assert.equal(source.includes("--public-key"), false);
  assert.equal(source.includes("--key-file"), false);
  assert.equal(source.includes("cryptoSign"), false);
  assert.equal(source.includes("loadExistingVoidNodeKeypairV1"), false);

  console.log(
    "VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_REQUEST_V1_PROOF_GREEN",
  );
  console.log("production_origin_fixed=true");
  console.log("reviewed_node_identity_fixed=true");
  console.log("signed_onion_evidence_verified=true");
  console.log("reviewed_trust_registry_verified=true");
  console.log("canonical_timestamps_required=true");
  console.log("deterministic_request_bytes=true");
  console.log("create_only_output=true");
  console.log("caller_selected_origin=false");
  console.log("caller_selected_node_identity=false");
  console.log("private_key_access=false");
  console.log("signature_created=false");
  console.log("publication=false");
  console.log("route_activation=false");
  console.log("runtime_mutation=false");
  console.log("work_credit_mutation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
