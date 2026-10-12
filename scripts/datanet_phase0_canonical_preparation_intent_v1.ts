import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
} from "../src/security/void_sovereign_emergency_control_v1.js";
import {
  admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1,
  hashDatanetPhase0SovereignReviewDecisionV1,
  verifyDatanetPromotionPacketDirectoryV1,
} from "./datanet_phase0_sovereign_review_decision_v1.js";
import {
  datanetPromotionCanonicalJsonV1,
} from "./datanet_promotion_independent_attestation_set_v1.js";

export const DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_MARKER_V1 =
  "VOID_DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_V1" as const;
export const DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_ID_PREFIX_V1 =
  "voiddcpi1_" as const;

type RecordValue = Record<string, unknown>;

const SHA256 = /^[0-9a-f]{64}$/;
const ASSEMBLY_ID = /^voiddppa1_[0-9a-f]{64}$/;
const CANDIDATE_ID = /^voiddcp1_[0-9a-f]{32}$/;
const DECISION_ID = /^voiddpsr1_[0-9a-f]{64}$/;
const INTENT_ID = /^voiddcpi1_[0-9a-f]{64}$/;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_OBJECT_BYTES = 268435456;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(SCRIPT_DIR);
const CONTRACT_RELATIVE_PATH =
  "contracts/mainnet/DatanetContentCommitmentRegistryV1.sol";
const CONTRACT_PATH = path.join(ROOT, CONTRACT_RELATIVE_PATH);

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function record(value: unknown, label: string): RecordValue {
  assertCondition(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as RecordValue;
}

function sha256Hex(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function shaJson(value: unknown): string {
  return sha256Hex(datanetPromotionCanonicalJsonV1(value));
}

function readJsonFile(file: string, label: string): unknown {
  const resolved = path.resolve(file);
  const stat = fs.lstatSync(resolved);
  assertCondition(!stat.isSymbolicLink(), `${label} symlink forbidden`);
  assertCondition(stat.isFile(), `${label} must be a regular file`);
  assertCondition(stat.size <= MAX_JSON_BYTES, `${label} exceeds size bound`);
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function readContractSource(): {
  source_sha256: string;
  source_bytes: number;
} {
  const stat = fs.lstatSync(CONTRACT_PATH);
  assertCondition(!stat.isSymbolicLink(), "contract source symlink forbidden");
  assertCondition(stat.isFile(), "contract source must be a regular file");
  assertCondition(stat.size > 0 && stat.size <= 1024 * 1024, "contract source size invalid");
  const source = fs.readFileSync(CONTRACT_PATH, "utf8");

  for (const required of [
    "contract DatanetContentCommitmentRegistryV1",
    "uint64 internal constant _MAX_OBJECT_BYTES = 268_435_456;",
    "function registryVersion() external pure override returns (uint256)",
    "function maxObjectBytes() external pure override returns (uint64)",
    "function isCommitted(bytes32 objectIdSha256) public view override returns (bool)",
    "function commit(",
    "bytes32 objectIdSha256",
    "bytes32 contentSha256",
    "uint64 byteLength",
    "if (msg.sender != publisher) revert NotPublisher();",
    "if (isCommitted(objectIdSha256))",
    "event ContentCommitted(",
  ]) {
    assertCondition(
      source.includes(required),
      `commitment contract source missing required semantic: ${required}`,
    );
  }

  return {
    source_sha256: sha256Hex(source),
    source_bytes: Buffer.byteLength(source, "utf8"),
  };
}

function reviewDecisionId(decision: RecordValue): string {
  const id = String(decision.decision_id ?? "");
  assertCondition(DECISION_ID.test(id), "review decision_id invalid");
  return id;
}

function manifestObject(packetDir: string): {
  object_id_sha256: string;
  content_sha256: string;
  byte_length: number;
} {
  const manifest = record(
    readJsonFile(path.join(packetDir, "assembly-manifest.json"), "assembly manifest"),
    "assembly manifest",
  );
  const object = record(manifest.object, "assembly manifest object");
  const objectId = String(object.object_id_sha256 ?? "");
  const content = String(object.content_sha256 ?? "");
  const byteLength = object.byte_length;
  assertCondition(SHA256.test(objectId) && objectId !== "0".repeat(64), "object_id_sha256 invalid");
  assertCondition(SHA256.test(content) && content !== "0".repeat(64), "content_sha256 invalid");
  assertCondition(
    Number.isSafeInteger(byteLength)
      && (byteLength as number) >= 1
      && (byteLength as number) <= MAX_OBJECT_BYTES,
    "byte_length invalid",
  );

  const candidate = record(
    readJsonFile(path.join(packetDir, "promotion-candidate.json"), "promotion candidate"),
    "promotion candidate",
  );
  const candidateObject = record(candidate.candidate, "promotion candidate object");
  assertCondition(
    candidateObject.object_id_sha256 === objectId,
    "manifest/candidate object_id_sha256 mismatch",
  );
  assertCondition(
    candidateObject.content_sha256 === content,
    "manifest/candidate content_sha256 mismatch",
  );
  assertCondition(
    candidateObject.byte_length === byteLength,
    "manifest/candidate byte_length mismatch",
  );

  return {
    object_id_sha256: objectId,
    content_sha256: content,
    byte_length: byteLength as number,
  };
}

export function buildDatanetPhase0CanonicalPreparationIntentAgainstFingerprintV1(
  input: {
    packet_dir: string;
    review_state_before: unknown;
    approval_decision: unknown;
    sovereign_public_key_pem: string | Buffer;
    expected_sovereign_der_sha256: string;
  },
): RecordValue {
  const packet = verifyDatanetPromotionPacketDirectoryV1(input.packet_dir);
  assertCondition(ASSEMBLY_ID.test(packet.assembly_id), "packet assembly_id invalid");
  assertCondition(CANDIDATE_ID.test(packet.candidate_id), "packet candidate_id invalid");

  const decision = record(input.approval_decision, "approval decision");
  assertCondition(
    decision.decision === "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION",
    "canonical preparation requires explicit approval decision",
  );

  const nextState =
    admitDatanetPhase0SovereignReviewDecisionAgainstFingerprintV1({
      state: input.review_state_before,
      packet_dir: input.packet_dir,
      decision,
      public_key_pem: input.sovereign_public_key_pem,
      expected_signer_der_sha256: input.expected_sovereign_der_sha256,
    });

  assertCondition(
    nextState.status === "APPROVED_FOR_SEPARATE_CANONICAL_PREPARATION",
    "review state did not become approved for preparation",
  );
  assertCondition(nextState.terminal === true, "approved review state must be terminal");
  assertCondition(
    nextState.separate_canonical_preparation_eligible === true,
    "approved review state must enable separate preparation eligibility",
  );
  assertCondition(
    nextState.chain2050_write_authorized === false
      && nextState.automatic_promotion === false,
    "review state authority widened unexpectedly",
  );

  const commitment = manifestObject(input.packet_dir);
  const contract = readContractSource();
  const decisionId = reviewDecisionId(decision);
  const decisionSha = hashDatanetPhase0SovereignReviewDecisionV1(decision);
  assertCondition(SHA256.test(decisionSha), "review decision hash invalid");

  const body: RecordValue = {
    marker: DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_MARKER_V1,
    version: 1,
    status: "PREPARATION_INTENT_ONLY",
    chain_id: 2050,
    phase: 0,
    authority_mode: "PHASE0_OPERATOR_ROOTED",
    assembly: {
      assembly_id: packet.assembly_id,
      assembly_manifest_sha256: packet.assembly_manifest_sha256,
      candidate_id: packet.candidate_id,
      promotion_candidate_sha256: packet.promotion_candidate_sha256,
    },
    sovereign_review: {
      decision_id: decisionId,
      decision_sha256: decisionSha,
      sequence: decision.sequence,
      signer_role: decision.signer_role,
      signer_public_key_der_sha256: decision.signer_public_key_der_sha256,
      decision: decision.decision,
      separate_canonical_preparation_eligible: true,
    },
    target_contract_source: {
      contract_name: "DatanetContentCommitmentRegistryV1",
      source_path: CONTRACT_RELATIVE_PATH,
      source_sha256: contract.source_sha256,
      source_bytes: contract.source_bytes,
      registry_version: 1,
      max_object_bytes: MAX_OBJECT_BYTES,
      function_signature: "commit(bytes32,bytes32,uint64)",
    },
    commitment,
    deployment_binding: {
      status: "UNBOUND_REQUIRED",
      registry_address: null,
      publisher_address: null,
      predecessor_address: null,
    },
    required_preflight: {
      exact_chain_id_verified: false,
      registry_deployment_verified: false,
      deployed_code_matches_reviewed_source: false,
      publisher_binding_verified: false,
      predecessor_lineage_verified: false,
      object_uncommitted_verified: false,
      fresh_read_only_is_committed_check_required: true,
    },
    post_commit_requirements: {
      content_committed_event_receipt_membership_required: true,
      receipt_revalidation_required: true,
      canonical_block_binding_required: true,
      accepted_checkpoint_membership_required: true,
      chain_finality_required: true,
    },
    authority: {
      preparation_intent_only: true,
      deployment_authorized: false,
      contract_selection_authorized: false,
      registry_address_selection_authorized: false,
      publisher_selection_authorized: false,
      predecessor_selection_authorized: false,
      transaction_construction_authorized: false,
      calldata_construction_authorized: false,
      transaction_signing_authorized: false,
      transaction_broadcast_authorized: false,
      chain2050_write_authorized: false,
      validator_authority_granted: false,
      governance_mutation_authorized: false,
      runtime_service_action: false,
      wallet_or_signer_access: false,
      work_credit_award_authorized: false,
      funds_action: false,
      automatic_promotion: false,
    },
    next_gate: "REVIEWED_DEPLOYMENT_AND_LINEAGE_BINDING_REQUIRED",
  };

  const intentId =
    DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_ID_PREFIX_V1 + shaJson(body);
  assertCondition(INTENT_ID.test(intentId), "preparation intent ID invalid");
  return {
    ...body,
    preparation_intent_id: intentId,
  };
}

export function buildDatanetPhase0CanonicalPreparationIntentV1(
  input: {
    packet_dir: string;
    review_state_before: unknown;
    approval_decision: unknown;
    sovereign_public_key_pem: string | Buffer;
  },
): RecordValue {
  return buildDatanetPhase0CanonicalPreparationIntentAgainstFingerprintV1({
    ...input,
    expected_sovereign_der_sha256:
      VOID_SOVEREIGN_PRIMARY_GOVERNANCE_DER_SHA256_V1,
  });
}

function main(): void {
  const [
    mode,
    packetDir,
    statePath,
    decisionPath,
    publicKeyPath,
    outputPath,
    ...extra
  ] = process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected extra arguments");
  assertCondition(
    mode === "materialize",
    "usage: materialize <packet-dir> <review-state-before.json> <approval-decision.json> <sovereign-public-key.pem> <preparation-intent.json>",
  );
  assertCondition(
    Boolean(packetDir && statePath && decisionPath && publicKeyPath && outputPath),
    "missing required arguments",
  );

  const output = path.resolve(outputPath!);
  assertCondition(!fs.existsSync(output), "refusing to overwrite preparation intent");
  const intent = buildDatanetPhase0CanonicalPreparationIntentV1({
    packet_dir: packetDir!,
    review_state_before: readJsonFile(statePath!, "review state before"),
    approval_decision: readJsonFile(decisionPath!, "approval decision"),
    sovereign_public_key_pem: fs.readFileSync(path.resolve(publicKeyPath!), "utf8"),
  });
  fs.writeFileSync(
    output,
    JSON.stringify(intent, null, 2) + "\n",
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );

  console.log("VOID_DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_V1_GREEN");
  console.log(`preparation_intent_id=${String(intent.preparation_intent_id)}`);
  console.log("deployment_binding_status=UNBOUND_REQUIRED");
  console.log("transaction_construction_authorized=false");
  console.log("calldata_construction_authorized=false");
  console.log("transaction_signing_authorized=false");
  console.log("transaction_broadcast_authorized=false");
  console.log("chain2050_write_authorized=false");
  console.log("automatic_promotion=false");
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (invokedUrl === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(
      "HOLD: " + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 1;
  }
}
