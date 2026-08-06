import fs from "node:fs";
import path from "node:path";
import {
  BOOTSTRAP_SCHEMA,
  CHAIN_ID,
  NETWORK,
  assertPlainObject,
  canonicalJson,
  objectWithId,
} from "./void_public_seed_common_v1.mjs";
import {
  buildBootstrapManifest,
  validateQualificationReceipt,
} from "./void_public_seed_receipt_v1.mjs";
import {
  ARTIFACT_FILES,
  AUTHORITY_KEYS,
  HOLD_KEYS,
  MAX_JSON_BYTES,
  MAX_TEXT_BYTES,
  PUBLICATION_DESTINATION,
  PUBLICATION_PACKET_SCHEMA,
  assertAuthorityFalse,
  assertCleanExactRepository,
  assertHex,
  assertOutsideRepository,
  exactKeys,
  fileSha256,
  git,
  parseTime,
  readBytes,
} from "./void_public_bootstrap_manifest_publication_contract_v1.mjs";

function parseArtifactSums(bytes) {
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) throw new Error("artifact SHA256SUMS must end with one newline");
  const lines = text.trimEnd().split("\n");
  if (lines.length !== ARTIFACT_FILES.length) {
    throw new Error(`artifact SHA256SUMS must contain exactly ${ARTIFACT_FILES.length} entries`);
  }
  const entries = new Map();
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  ([A-Za-z0-9._-]+)$/.exec(line);
    if (!match) throw new Error("artifact SHA256SUMS contains a malformed entry");
    const [, sha, name] = match;
    if (!ARTIFACT_FILES.includes(name)) {
      throw new Error(`artifact SHA256SUMS contains unexpected file ${name}`);
    }
    if (entries.has(name)) throw new Error(`artifact SHA256SUMS duplicates ${name}`);
    entries.set(name, sha);
  }
  for (const name of ARTIFACT_FILES) {
    if (!entries.has(name)) throw new Error(`artifact SHA256SUMS is missing ${name}`);
  }
  return entries;
}

function sourceShaFromBytes(bytes) {
  const text = bytes.toString("utf8");
  const match = /^source_sha=([0-9a-f]{40})\n$/.exec(text);
  if (!match) throw new Error("artifact source.txt must contain one exact source_sha line");
  return match[1];
}

function validateManifestId(manifest, label) {
  if (!/^voidpbm1_[0-9a-f]{64}$/.test(String(manifest.manifest_id || ""))) {
    throw new Error(`${label} manifest ID is malformed`);
  }
  const expected = objectWithId("voidpbm1_", manifest, "manifest_id").manifest_id;
  if (manifest.manifest_id !== expected) {
    throw new Error(`${label} manifest ID does not match its content`);
  }
}

export function validatePredecessorHold(rawManifest) {
  const manifest = exactKeys(structuredClone(rawManifest), HOLD_KEYS, "predecessor manifest");
  if (manifest.schema !== BOOTSTRAP_SCHEMA) throw new Error("predecessor schema mismatch");
  if (manifest.network !== NETWORK || Number(manifest.chain_id) !== CHAIN_ID) {
    throw new Error("predecessor network or chain mismatch");
  }
  if (manifest.status !== "hold_no_stable_seed") {
    throw new Error("predecessor must be the explicit hold manifest");
  }
  validateManifestId(manifest, "predecessor");
  parseTime(manifest.generated_at, "predecessor generated_at");
  if (!Array.isArray(manifest.sync_endpoints) || manifest.sync_endpoints.length !== 0) {
    throw new Error("predecessor hold must not publish sync endpoints");
  }
  if (!Array.isArray(manifest.onion_endpoints) || manifest.onion_endpoints.length !== 0) {
    throw new Error("predecessor hold must not publish onion endpoints");
  }
  if (manifest.private_tailnet_endpoints_published !== false) {
    throw new Error("predecessor violates the private Tailnet boundary");
  }
  assertAuthorityFalse(manifest.authority, "predecessor authority");
  if (typeof manifest.notes !== "string" || manifest.notes.length > 4096) {
    throw new Error("predecessor notes must be a bounded string");
  }
  return manifest;
}

function validateCandidateExact(rawCandidate, rawReceipt) {
  const candidate = assertPlainObject(structuredClone(rawCandidate), "candidate manifest");
  if (candidate.status !== "stable_https_seed") {
    throw new Error("candidate manifest status must be stable_https_seed");
  }
  validateManifestId(candidate, "candidate");
  const generatedAt = parseTime(candidate.generated_at, "candidate generated_at");
  const expiresAt = parseTime(candidate.expires_at, "candidate expires_at");
  const validityMs = expiresAt - generatedAt;
  const rebuilt = buildBootstrapManifest([rawReceipt], {
    nowMs: generatedAt,
    validityMs,
  });
  if (canonicalJson(candidate) !== canonicalJson(rebuilt)) {
    throw new Error("candidate manifest is not exact builder output for its receipt");
  }
  const validated = validateQualificationReceipt(rawReceipt, { nowMs: generatedAt });
  if (candidate.sync_endpoints.length !== 1) {
    throw new Error("publication packet v1 requires exactly one qualified endpoint");
  }
  const endpoint = candidate.sync_endpoints[0];
  if (
    endpoint.qualification_id !== validated.receipt.qualification_id ||
    endpoint.base !== validated.endpoint
  ) {
    throw new Error("candidate endpoint is not bound to its qualification receipt");
  }
  return { candidate, validated, generatedAt, expiresAt };
}

function authorityFalse() {
  return {
    private_routes_exposed: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    treasury_authority: false,
    work_credit_authority: false,
    money_movement_authority: false,
  };
}

export function buildRollbackHold(candidate) {
  const body = {
    schema: BOOTSTRAP_SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    status: "hold_no_stable_seed",
    generated_at: candidate.generated_at,
    sync_endpoints: [],
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
    authority: authorityFalse(),
    notes:
      `Emergency rollback hold for candidate ${candidate.manifest_id}. ` +
      "No stable public HTTPS seed is published after this file replaces the candidate.",
  };
  return objectWithId("voidpbm1_", body, "manifest_id");
}

function readQualificationArtifact(artifactDir, expectedSourceSha) {
  const dir = fs.realpathSync(String(artifactDir));
  const stat = fs.lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("qualification artifact must be one real directory");
  }
  const sumsBytes = readBytes(path.join(dir, "SHA256SUMS"), "artifact SHA256SUMS", MAX_TEXT_BYTES);
  const sums = parseArtifactSums(sumsBytes);
  const files = {};
  for (const name of ARTIFACT_FILES) {
    const bytes = readBytes(
      path.join(dir, name),
      `artifact ${name}`,
      name.endsWith(".json") ? MAX_JSON_BYTES : MAX_TEXT_BYTES,
    );
    const actual = fileSha256(bytes);
    if (actual !== sums.get(name)) throw new Error(`artifact checksum mismatch for ${name}`);
    files[name] = { bytes, sha256: actual };
  }
  const artifactSource = sourceShaFromBytes(files["source.txt"].bytes);
  if (artifactSource !== expectedSourceSha) {
    throw new Error("qualification artifact source SHA does not match expected source");
  }
  let receipt;
  let candidate;
  try {
    receipt = JSON.parse(files["qualification.json"].bytes.toString("utf8"));
    candidate = JSON.parse(files["public-bootstrap-v1.json"].bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`qualification artifact JSON is invalid: ${error.message}`);
  }
  return {
    dir,
    sumsBytes,
    sumsSha256: fileSha256(sumsBytes),
    files,
    receipt,
    candidate,
    sourceSha: artifactSource,
  };
}

function predecessorState(repoRoot, expectedPredecessorBlob) {
  const destination = path.join(repoRoot, PUBLICATION_DESTINATION);
  const bytes = readBytes(destination, "tracked predecessor manifest", MAX_JSON_BYTES);
  const actualBlob = git(
    repoRoot,
    ["rev-parse", `HEAD:${PUBLICATION_DESTINATION}`],
    "read predecessor Git blob",
  );
  const expectedBlob = assertHex(expectedPredecessorBlob, 40, "expected predecessor blob");
  if (actualBlob !== expectedBlob) {
    throw new Error(`predecessor Git blob ${actualBlob} does not match expected ${expectedBlob}`);
  }
  const worktreeBlob = git(
    repoRoot,
    ["hash-object", "--", PUBLICATION_DESTINATION],
    "hash predecessor worktree file",
  );
  if (worktreeBlob !== actualBlob) {
    throw new Error("predecessor worktree bytes do not match the tracked Git blob");
  }
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`predecessor manifest is invalid JSON: ${error.message}`);
  }
  return {
    bytes,
    sha256: fileSha256(bytes),
    gitBlob: actualBlob,
    manifest: validatePredecessorHold(manifest),
  };
}

export function reviewText(packet) {
  return [
    "VOID PUBLIC BOOTSTRAP MANIFEST PUBLICATION / ROLLBACK PACKET V1",
    "",
    `source_sha=${packet.source_sha}`,
    `destination=${packet.destination}`,
    `predecessor_git_blob=${packet.predecessor.git_blob_sha}`,
    `predecessor_manifest_id=${packet.predecessor.manifest_id}`,
    `candidate_manifest_id=${packet.candidate.manifest_id}`,
    `rollback_manifest_id=${packet.rollback.manifest_id}`,
    "",
    "PUBLICATION REVIEW GATE",
    "1. Start a new branch from source_sha exactly.",
    "2. Confirm the tracked destination blob equals predecessor_git_blob.",
    "3. Replace exactly public/bootstrap/v1.json with candidate/public/bootstrap/v1.json.",
    "4. Require a one-file diff and rerun repository/client/outside-machine proofs.",
    "5. Do not publish if the qualification receipt or candidate is expired.",
    "",
    "ROLLBACK REVIEW GATE",
    "1. Rollback is valid only while the tracked manifest ID equals candidate_manifest_id.",
    "2. Replace exactly public/bootstrap/v1.json with rollback/public/bootstrap/v1.json.",
    "3. Require a one-file diff and verify the resolver reports hold_no_stable_seed.",
    "",
    "This packet does not commit, push, open a PR, publish, deploy, restart, or mutate authority.",
    "",
  ].join("\n");
}

export function packetWithoutId({
  sourceSha,
  predecessor,
  artifact,
  candidateState,
  rollback,
  fileHashes,
}) {
  return {
    schema: PUBLICATION_PACKET_SCHEMA,
    version: 1,
    prepared_at: candidateState.candidate.generated_at,
    source_sha: sourceSha,
    destination: PUBLICATION_DESTINATION,
    predecessor: {
      source_sha: sourceSha,
      git_blob_sha: predecessor.gitBlob,
      sha256: predecessor.sha256,
      manifest_id: predecessor.manifest.manifest_id,
      status: predecessor.manifest.status,
    },
    qualification: {
      qualification_id: candidateState.validated.receipt.qualification_id,
      artifact_sha256s_sha256: artifact.sumsSha256,
      qualification_sha256: artifact.files["qualification.json"].sha256,
      candidate_sha256: artifact.files["public-bootstrap-v1.json"].sha256,
      source_sha256: artifact.files["source.txt"].sha256,
    },
    candidate: {
      manifest_id: candidateState.candidate.manifest_id,
      sha256: artifact.files["public-bootstrap-v1.json"].sha256,
      generated_at: candidateState.candidate.generated_at,
      expires_at: candidateState.candidate.expires_at,
      endpoint: candidateState.candidate.sync_endpoints[0].base,
      qualification_id: candidateState.validated.receipt.qualification_id,
      precondition_manifest_id: predecessor.manifest.manifest_id,
    },
    rollback: {
      manifest_id: rollback.manifest_id,
      sha256: fileHashes["rollback/public/bootstrap/v1.json"],
      generated_at: rollback.generated_at,
      status: rollback.status,
      precondition_manifest_id: candidateState.candidate.manifest_id,
    },
    authority: authorityFalse(),
    files: fileHashes,
    publication_authorized: false,
  };
}

export function writeExclusive(filePath, bytes, mode = 0o600) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, bytes, { flag: "wx", mode });
}

export function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

export function topLevelSums(entries) {
  return Buffer.from(
    `${Object.keys(entries)
      .sort()
      .map((name) => `${entries[name]}  ${name}`)
      .join("\n")}\n`,
  );
}

export function preparePublicationState({
  repoRoot,
  artifactDir,
  expectedSourceSha,
  expectedPredecessorBlob,
}) {
  const repository = assertCleanExactRepository(repoRoot, expectedSourceSha);
  assertOutsideRepository(repository.root, artifactDir, "qualification artifact");
  const artifact = readQualificationArtifact(artifactDir, repository.sourceSha);
  const predecessor = predecessorState(repository.root, expectedPredecessorBlob);
  const candidateState = validateCandidateExact(artifact.candidate, artifact.receipt);
  const rollback = buildRollbackHold(candidateState.candidate);
  return { repository, artifact, predecessor, candidateState, rollback };
}
