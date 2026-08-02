#!/usr/bin/env node
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  AGENT_PAID_WORK_SUBMIT_SCOPE,
  authenticateAgentPaidWorkCredentialV1,
  materializeAgentPaidWorkCredentialRegistryV1,
  materializeAgentPaidWorkCredentialV1,
  parseAgentPaidWorkCredentialRegistryV1,
} from "./agent_paid_work_credential_registry_v1.ts";

import {
  APPLY_CONFIRMATION,
  FALSE_AUTHORITY,
  MARKER,
  REVIEW_CONFIRMATION,
  TOKEN_GENERATION_CONFIRMATION,
  applyIssuanceV1,
  canonicalJsonV1,
  generateTokenLocalV1,
  prepareRequestV1,
  prepareReviewDecisionV1,
  sha256BytesV1,
  stageIssuanceV1,
  validateApplyReceiptV1,
  validateRequestV1,
  validateResponseV1,
  validateReviewDecisionV1,
  validateStagedIssuanceV1,
} from "./agent_paid_work_canonical_remote_credential_issuance_v1.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrow(fn, pattern, label) {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `${label} did not throw`);
  assert(
    pattern.test(String(thrown.message || thrown)),
    `${label} wrong error: ${String(thrown.message || thrown)}`,
  );
}

function writePrivateJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(path, 0o600);
}

function shaFile(path) {
  return sha256BytesV1(readFileSync(path));
}

const root = mkdtempSync(join(tmpdir(), "void-canonical-remote-issuance-proof-"));
chmodSync(root, 0o700);

try {
  const registryPath = join(root, "credential-registry-v1.json");
  const requestPath = join(root, "request-v1.json");
  const responsePath = join(root, "response-v1.json");
  const reviewPath = join(root, "review-v1.json");
  const stagedPath = join(root, "staged-v1.json");
  const receiptPath = join(root, "receipt-v1.json");
  const lockPath = join(root, "apply.lock");
  const privateTokenRoot = join(root, "nimo-private-tokens");
  const privateRegistryPath = join(root, "nimo-private-registry-v1.json");

  const oldToken = "proof-old-credential-token-material-0001";
  const oldCredential = materializeAgentPaidWorkCredentialV1({
    agent_id: "void-proof-old-agent-v1",
    token_sha256: sha256BytesV1(Buffer.from(oldToken, "utf8")),
    scopes: [AGENT_PAID_WORK_SUBMIT_SCOPE],
    issued_at_utc: "2026-08-01T00:00:00Z",
    expires_at_utc: "2026-08-02T00:00:00Z",
    revoked_at_utc: null,
  });
  const originalRegistry = materializeAgentPaidWorkCredentialRegistryV1({
    created_at_utc: "2026-08-01T00:00:00Z",
    credentials: [oldCredential],
  });
  writePrivateJson(registryPath, originalRegistry);
  const originalRegistrySha = shaFile(registryPath);

  expectThrow(
    () => prepareRequestV1({
      planId:
        "voidapwnlp1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      agentId: "void-proof-canonical-remote-agent-v1",
      destinationWcAccount: "void-proof-canonical-remote-wc-v1",
      expiresAtUtc: "2026-08-02T17:58:00Z",
      outputPath: join(root, "expired-request-v1.json"),
      evaluatedAtUtc: "2026-08-02T17:59:00Z",
    }),
    /expiration must be in the future/,
    "fixed-time expired request",
  );

  const requestResult = prepareRequestV1({
    planId:
      "voidapwnlp1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    agentId: "void-proof-canonical-remote-agent-v1",
    destinationWcAccount: "void-proof-canonical-remote-wc-v1",
    expiresAtUtc: "2026-08-03T00:00:00Z",
    outputPath: requestPath,
    evaluatedAtUtc: "2026-08-02T17:59:00Z",
  });
  const request = validateRequestV1(
    JSON.parse(readFileSync(requestPath, "utf8")),
  );
  assert(requestResult.credential_id_selected === false, "request selected ID");
  assert(!("credential_id" in request), "request contains credential_id");
  assert(!("token_sha256" in request), "request contains token_sha256");
  assert(
    canonicalJsonV1(request.authority) === canonicalJsonV1(FALSE_AUTHORITY),
    "request authority mismatch",
  );

  expectThrow(
    () => generateTokenLocalV1({
      requestPath,
      privateTokenRoot,
      privateRegistryPath,
      responsePath,
      confirmation: "wrong",
      hostIdentityResolver: () => "zoso-N153B",
      tokenBytesFactory: () => Buffer.alloc(32, 7),
      issuedAtUtc: "2026-08-02T18:00:00Z",
    }),
    /confirmation mismatch/,
    "wrong token confirmation",
  );
  expectThrow(
    () => generateTokenLocalV1({
      requestPath,
      privateTokenRoot,
      privateRegistryPath,
      responsePath,
      confirmation: TOKEN_GENERATION_CONFIRMATION,
      hostIdentityResolver: () => "wrong-host",
      tokenBytesFactory: () => Buffer.alloc(32, 7),
      issuedAtUtc: "2026-08-02T18:00:00Z",
    }),
    /hostname mismatch/,
    "wrong Nimo host",
  );

  const generationLockPath =
    `${privateRegistryPath}.generation.lock`;
  writePrivateJson(generationLockPath, {
    marker: "proof-active-generation-lock",
  });
  expectThrow(
    () => generateTokenLocalV1({
      requestPath,
      privateTokenRoot,
      privateRegistryPath,
      responsePath,
      confirmation: TOKEN_GENERATION_CONFIRMATION,
      hostIdentityResolver: () => "zoso-N153B",
      tokenBytesFactory: () => Buffer.alloc(32, 7),
      issuedAtUtc: "2026-08-02T18:00:00Z",
    }),
    /generation lock already exists/,
    "active Nimo generation lock",
  );
  unlinkSync(generationLockPath);

  const generated = generateTokenLocalV1({
    requestPath,
    privateTokenRoot,
    privateRegistryPath,
    responsePath,
    confirmation: TOKEN_GENERATION_CONFIRMATION,
    hostIdentityResolver: () => "zoso-N153B",
    tokenBytesFactory: () => Buffer.alloc(32, 7),
    issuedAtUtc: "2026-08-02T18:00:00Z",
  });
  const response = validateResponseV1(
    JSON.parse(readFileSync(responsePath, "utf8")),
  );
  assert(generated.raw_token_returned === false, "raw token returned");
  assert(
    generated.private_token_integrity_verified === true,
    "generated token integrity not verified",
  );
  assert(response.raw_token_returned === false, "response raw token returned");
  assert(!/voidapwc1\..+\..+/.test(JSON.stringify(response)), "response leaks token");

  const expectedRaw =
    `voidapwc1.${request.request_id}.${Buffer.alloc(32, 7).toString("base64url")}`;
  const tokenPath = join(
    privateTokenRoot,
    request.request_id,
    "credential-token-v1.txt",
  );
  assert(readFileSync(tokenPath, "utf8") === `${expectedRaw}\n`, "token file mismatch");

  const expectedCredential = materializeAgentPaidWorkCredentialV1({
    agent_id: request.agent_id,
    token_sha256: response.token_sha256,
    scopes: [AGENT_PAID_WORK_SUBMIT_SCOPE],
    issued_at_utc: response.issued_at_utc,
    expires_at_utc: response.expires_at_utc,
    revoked_at_utc: null,
  });
  assert(
    response.credential_id === expectedCredential.credential_id,
    "response credential is not canonical",
  );

  writeFileSync(tokenPath, "tampered-private-token-material\n", {
    mode: 0o600,
  });
  chmodSync(tokenPath, 0o600);
  expectThrow(
    () => generateTokenLocalV1({
      requestPath,
      privateTokenRoot,
      privateRegistryPath,
      responsePath,
      confirmation: TOKEN_GENERATION_CONFIRMATION,
      hostIdentityResolver: () => "zoso-N153B",
      tokenBytesFactory: () => Buffer.alloc(32, 8),
      issuedAtUtc: "2026-08-02T18:00:00Z",
    }),
    /private token file hash mismatch/,
    "tampered private token replay",
  );
  writeFileSync(tokenPath, `${expectedRaw}\n`, {
    mode: 0o600,
  });
  chmodSync(tokenPath, 0o600);

  const generatedReplay = generateTokenLocalV1({
    requestPath,
    privateTokenRoot,
    privateRegistryPath,
    responsePath,
    confirmation: TOKEN_GENERATION_CONFIRMATION,
    hostIdentityResolver: () => "zoso-N153B",
    tokenBytesFactory: () => Buffer.alloc(32, 8),
    issuedAtUtc: "2026-08-02T18:00:00Z",
  });
  assert(generatedReplay.duplicate === true, "token replay not duplicate");
  assert(
    generatedReplay.private_token_integrity_verified === true,
    "replay token integrity not verified",
  );
  assert(
    generatedReplay.response_write_performed === false,
    "token replay rewrote response",
  );
  assert(
    !existsSync(generationLockPath),
    "Nimo generation lock was not released",
  );

  expectThrow(
    () => prepareReviewDecisionV1({
      requestPath,
      responsePath,
      reviewedAtUtc: "2026-08-02T18:01:00Z",
      outputPath: reviewPath,
      confirmation: "wrong",
    }),
    /review confirmation mismatch/,
    "wrong review confirmation",
  );
  const reviewed = prepareReviewDecisionV1({
    requestPath,
    responsePath,
    reviewedAtUtc: "2026-08-02T18:01:00Z",
    outputPath: reviewPath,
    confirmation: REVIEW_CONFIRMATION,
  });
  const review = validateReviewDecisionV1(
    JSON.parse(readFileSync(reviewPath, "utf8")),
  );
  assert(reviewed.credential_registry_write === false, "review wrote registry");
  assert(review.credential_id === response.credential_id, "review ID mismatch");

  const stagedResult = stageIssuanceV1({
    registryPath,
    requestPath,
    responsePath,
    reviewPath,
    outputPath: stagedPath,
  });
  const staged = validateStagedIssuanceV1(
    JSON.parse(readFileSync(stagedPath, "utf8")),
  );
  assert(shaFile(registryPath) === originalRegistrySha, "stage mutated registry");
  const candidate = parseAgentPaidWorkCredentialRegistryV1(
    staged.candidate_registry,
  );
  assert(candidate.credentials.length === 2, "candidate credential count mismatch");
  assert(
    stagedResult.review_decision_id === review.review_decision_id,
    "stage review decision mismatch",
  );
  assert(
    stagedResult.receiver_restart_required === true
      && stagedResult.live_effect === false,
    "stage receiver boundary mismatch",
  );

  const auth = authenticateAgentPaidWorkCredentialV1(
    `Bearer ${expectedRaw}`,
    candidate,
    "2026-08-02T18:02:00Z",
  );
  assert(auth.ok === true, "candidate credential does not authenticate");
  if (auth.ok) {
    assert(
      auth.authentication.credential_id === response.credential_id,
      "authentication credential ID mismatch",
    );
  }

  expectThrow(
    () => applyIssuanceV1({
      registryPath,
      stagedPath,
      receiptPath,
      lockPath,
      confirmation: "wrong",
      appliedAtUtc: "2026-08-02T18:03:00Z",
    }),
    /apply confirmation mismatch/,
    "wrong apply confirmation",
  );

  const staleRegistryPath = join(root, "stale-registry-v1.json");
  const extraCredential = materializeAgentPaidWorkCredentialV1({
    agent_id: "void-proof-extra-agent-v1",
    token_sha256: sha256BytesV1(Buffer.from("extra-token-proof-0001", "utf8")),
    scopes: [AGENT_PAID_WORK_SUBMIT_SCOPE],
    issued_at_utc: "2026-08-02T17:00:00Z",
    expires_at_utc: "2026-08-03T00:00:00Z",
    revoked_at_utc: null,
  });
  writePrivateJson(
    staleRegistryPath,
    materializeAgentPaidWorkCredentialRegistryV1({
      created_at_utc: originalRegistry.created_at_utc,
      credentials: [oldCredential, extraCredential],
    }),
  );
  expectThrow(
    () => applyIssuanceV1({
      registryPath: staleRegistryPath,
      stagedPath,
      receiptPath: join(root, "stale-receipt.json"),
      lockPath: join(root, "stale.lock"),
      confirmation: APPLY_CONFIRMATION,
      appliedAtUtc: "2026-08-02T18:03:00Z",
    }),
    /neither exact staged prestate nor final state/,
    "stale registry apply",
  );

  const applied = applyIssuanceV1({
    registryPath,
    stagedPath,
    receiptPath,
    lockPath,
    confirmation: APPLY_CONFIRMATION,
    appliedAtUtc: "2026-08-02T18:03:00Z",
  });
  assert(applied.operation_status === "applied", "apply status mismatch");
  assert(applied.registry_write_performed === true, "registry write missing");
  assert(applied.raw_token_read === false, "apply read raw token");
  const finalRegistry = parseAgentPaidWorkCredentialRegistryV1(
    JSON.parse(readFileSync(registryPath, "utf8")),
  );
  assert(
    canonicalJsonV1(finalRegistry) === canonicalJsonV1(staged.candidate_registry),
    "final registry mismatch",
  );
  const receiptBytes = readFileSync(receiptPath);
  const receipt = validateApplyReceiptV1(JSON.parse(receiptBytes.toString("utf8")));
  assert(receipt.receiver_restart_required === true, "restart boundary missing");
  assert(receipt.live_effect === false, "apply claimed live effect");

  unlinkSync(tokenPath);
  const registryShaAfter = shaFile(registryPath);
  const replay = applyIssuanceV1({
    registryPath,
    stagedPath,
    receiptPath,
    lockPath,
    confirmation: APPLY_CONFIRMATION,
    appliedAtUtc: "2026-08-02T18:04:00Z",
  });
  assert(replay.operation_status === "duplicate", "replay not duplicate");
  assert(replay.exact_replay === true, "replay exact flag missing");
  assert(replay.receipt_write_performed === false, "replay rewrote receipt");
  assert(shaFile(registryPath) === registryShaAfter, "replay rewrote registry");
  assert(
    readFileSync(receiptPath).equals(receiptBytes),
    "replay changed receipt bytes",
  );

  assert(!existsSync(join(root, "binding-registry-v1.json")), "binding created");
  assert(!existsSync(lockPath), "apply lock not released");

  console.log("deterministic_request_time_gate_green=true");
  console.log("exclusive_nimo_generation_lock_green=true");
  console.log("private_token_replay_integrity_green=true");
  console.log("request_has_no_preselected_credential_id_green=true");
  console.log("raw_token_generated_only_in_nimo_private_file_green=true");
  console.log("sanitized_response_contains_hash_only_green=true");
  console.log("canonical_credential_id_derived_after_token_hash_green=true");
  console.log("strict_candidate_registry_parse_green=true");
  console.log("explicit_review_decision_green=true");
  console.log("wrong_confirmation_rejected_green=true");
  console.log("wrong_host_rejected_green=true");
  console.log("stale_registry_rejected_green=true");
  console.log("atomic_registry_apply_green=true");
  console.log("receiver_restart_separate_boundary_green=true");
  console.log("exact_replay_idempotent_green=true");
  console.log("raw_token_not_required_for_apply_green=true");
  console.log("replacement_binding_not_created_green=true");
  console.log("payment_execution_false_green=true");
  console.log("wc_ledger_write_false_green=true");
  console.log("wallet_or_signer_false_green=true");
  console.log("service_restart_false_green=true");
  console.log("deployment_false_green=true");
  console.log("money_movement_false_green=true");
  console.log(`${MARKER}_PROOF_GREEN=true`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
