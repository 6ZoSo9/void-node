#!/usr/bin/env node
import crypto from "node:crypto";
import { keccak256 } from "ethers";

import {
  CONTRACT_NAME,
  CONTRACT_PATH,
  EVM_VERSION,
  SOLC_RELEASE,
  SOLC_VERSION,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILER_PROFILE_V1,
  buildStandardJsonInput,
  canonicalJson,
  sha256,
  validateSourceText,
} from "./buy-void-presale-fulfillment-compiler-profile-v1.mjs";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_DUAL_COMPILER_IDENTITY_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_DUAL_COMPILER_IDENTITY_V1";
export const PROTOCOL =
  "void-buy-void-presale-fulfillment-dual-compiler-identity/1";
export const ENVIRONMENT_MARKER =
  "VOID_SOLC_COMPILER_ENVIRONMENT_V1";
export const DECISION =
  "HOLD_PENDING_COMPILED_IDENTITY_COMMIT_AND_EXACT_CHAIN2050_DEPLOYMENT_ATTESTATION";

export const AUTHORITY = {
  credential_access: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  inventory_funding: false,
  runtime_enablement_change: false,
  public_activation: false,
  money_movement: false,
};

function fail(code, detail = undefined) {
  const error = new Error(code);
  error.code = code;
  if (detail !== undefined) error.detail = detail;
  throw error;
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeHex(raw, code) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (
    !value ||
    !/^[0-9a-f]+$/.test(value) ||
    value.length % 2 !== 0
  ) {
    fail(code);
  }
  return value;
}

function metadataStripped(bytecodeHex, code) {
  const bytes = Buffer.from(bytecodeHex, "hex");
  if (bytes.length < 3) fail(code);
  const metadataLength = bytes.readUInt16BE(bytes.length - 2);
  const start = bytes.length - 2 - metadataLength;
  if (
    metadataLength <= 0 ||
    start <= 0 ||
    start >= bytes.length - 2
  ) {
    fail(code);
  }
  return bytes.subarray(0, start).toString("hex");
}

function assertNoPush0(bytecodeHex, label) {
  const executable = metadataStripped(
    bytecodeHex,
    label + "_metadata_invalid",
  );
  const bytes = Buffer.from(executable, "hex");
  for (let i = 0; i < bytes.length; i += 1) {
    const opcode = bytes[i];
    if (opcode === 0x5f) {
      fail(
        "push0_opcode_forbidden_for_paris_profile",
        { label, byte_offset: i },
      );
    }
    if (opcode >= 0x60 && opcode <= 0x7f) {
      i += opcode - 0x5f;
      if (i >= bytes.length) {
        fail(label + "_truncated_push_immediate");
      }
    }
  }
}

function diagnostics(output, label) {
  const values =
    output.errors === undefined ? [] : output.errors;
  if (!Array.isArray(values)) {
    fail(label + "_diagnostics_invalid");
  }
  const errors = values.filter(
    (entry) => entry?.severity === "error",
  );
  if (errors.length) {
    fail("compiler_reported_errors", {
      label,
      errors: errors.map((entry) => ({
        type: entry?.type,
        message: entry?.message,
      })),
    });
  }
  return {
    warning_count: values.filter(
      (entry) => entry?.severity === "warning",
    ).length,
  };
}

function containsReferences(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (plain(value)) {
    return Object.values(value).some(containsReferences);
  }
  return Boolean(value);
}

function immutableDeclarations(ast) {
  const found = new Map();
  function walk(value) {
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry);
      return;
    }
    if (!plain(value)) return;
    if (
      value.nodeType === "VariableDeclaration" &&
      value.stateVariable === true &&
      value.mutability === "immutable" &&
      ["token", "fulfiller", "predecessor"].includes(
        value.name,
      )
    ) {
      found.set(String(value.id), value.name);
    }
    for (const entry of Object.values(value)) walk(entry);
  }
  walk(ast);
  if (
    found.size !== 3 ||
    ![...found.values()].includes("token") ||
    ![...found.values()].includes("fulfiller") ||
    ![...found.values()].includes("predecessor")
  ) {
    fail("immutable_declaration_map_invalid", {
      found: Object.fromEntries(found),
    });
  }
  return found;
}

function normalizeImmutableReferences(
  refs,
  ast,
  runtimeBytes,
) {
  if (!plain(refs)) {
    fail("immutable_references_invalid");
  }
  const declarations = immutableDeclarations(ast);
  const layout = {};
  const occupied = [];
  for (const [astId, name] of declarations.entries()) {
    const entries = refs[astId];
    if (!Array.isArray(entries) || entries.length < 1) {
      fail("immutable_reference_missing", {
        ast_id: astId,
        name,
      });
    }
    const normalized = entries.map((entry) => {
      if (
        !plain(entry) ||
        !Number.isSafeInteger(entry.start) ||
        !Number.isSafeInteger(entry.length) ||
        entry.start < 0 ||
        entry.length !== 32 ||
        entry.start + entry.length > runtimeBytes
      ) {
        fail("immutable_reference_invalid", {
          ast_id: astId,
          name,
          entry,
        });
      }
      for (
        let offset = entry.start;
        offset < entry.start + entry.length;
        offset += 1
      ) {
        if (occupied[offset]) {
          fail("immutable_reference_overlap", {
            offset,
          });
        }
        occupied[offset] = true;
      }
      return {
        start: entry.start,
        length: entry.length,
      };
    });
    layout[name] = {
      ast_id: Number(astId),
      references: normalized,
    };
  }
  const referencedIds = Object.keys(refs).sort();
  const expectedIds = [...declarations.keys()].sort();
  if (
    JSON.stringify(referencedIds) !==
      JSON.stringify(expectedIds)
  ) {
    fail("unexpected_immutable_reference_ids", {
      referenced_ids: referencedIds,
      expected_ids: expectedIds,
    });
  }
  return layout;
}

function parseMetadata(raw, label) {
  const value = String(raw ?? "").trim();
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    fail(label + "_metadata_json_invalid");
  }
  if (
    parsed?.compiler?.version !== SOLC_RELEASE ||
    parsed?.language !== "Solidity" ||
    parsed?.settings?.evmVersion !== EVM_VERSION ||
    parsed?.settings?.optimizer?.enabled !== false ||
    Number(parsed?.settings?.optimizer?.runs) !== 200 ||
    parsed?.settings?.metadata?.bytecodeHash !== "ipfs"
  ) {
    fail("compiler_metadata_profile_mismatch", {
      label,
      compiler_version: parsed?.compiler?.version ?? null,
      language: parsed?.language ?? null,
      evm_version: parsed?.settings?.evmVersion ?? null,
      optimizer_enabled:
        parsed?.settings?.optimizer?.enabled ?? null,
      optimizer_runs:
        parsed?.settings?.optimizer?.runs ?? null,
      metadata_bytecode_hash:
        parsed?.settings?.metadata?.bytecodeHash ?? null,
    });
  }
  if (
    parsed?.settings?.viaIR !== undefined &&
    parsed.settings.viaIR !== false
  ) {
    fail("compiler_metadata_via_ir_mismatch", {
      label,
      via_ir: parsed.settings.viaIR,
    });
  }
  if (
    parsed?.settings?.metadata?.appendCBOR !== undefined &&
    parsed.settings.metadata.appendCBOR !== true
  ) {
    fail("compiler_metadata_append_cbor_mismatch", {
      label,
      append_cbor:
        parsed.settings.metadata.appendCBOR,
    });
  }
  if (
    parsed?.settings?.metadata?.useLiteralContent !== undefined &&
    parsed.settings.metadata.useLiteralContent !== true
  ) {
    fail("compiler_metadata_literal_content_mismatch", {
      label,
      use_literal_content:
        parsed.settings.metadata.useLiteralContent,
    });
  }
  return {
    text: value,
    parsed,
  };
}

export function parseCompilerOutput(
  raw,
  label = "compiler",
) {
  const bytes = Buffer.isBuffer(raw)
    ? raw
    : Buffer.from(String(raw), "utf8");
  let text = bytes.toString("utf8").trim();
  if (!text.startsWith("{")) {
    const index = text.indexOf("{");
    if (index < 0) fail(label + "_output_json_invalid");
    text = text.slice(index);
  }
  let output;
  try {
    output = JSON.parse(text);
  } catch {
    fail(label + "_output_json_invalid");
  }
  diagnostics(output, label);

  const source = output?.sources?.[CONTRACT_PATH];
  const ast = source?.ast;
  if (!plain(source) || !plain(ast)) {
    fail(label + "_source_ast_missing");
  }
  const contract =
    output?.contracts?.[CONTRACT_PATH]?.[CONTRACT_NAME];
  if (!plain(contract)) {
    fail(label + "_contract_missing");
  }
  const bytecode = contract?.evm?.bytecode;
  const runtime = contract?.evm?.deployedBytecode;
  if (
    !plain(bytecode) ||
    !plain(runtime) ||
    !Array.isArray(contract.abi) ||
    !plain(contract.storageLayout) ||
    !plain(contract?.evm?.methodIdentifiers)
  ) {
    fail(label + "_compiler_contract_shape_invalid");
  }
  if (
    containsReferences(bytecode.linkReferences) ||
    containsReferences(runtime.linkReferences)
  ) {
    fail("link_references_present");
  }

  const creationObject = normalizeHex(
    bytecode.object,
    label + "_creation_bytecode_invalid",
  );
  const runtimeObject = normalizeHex(
    runtime.object,
    label + "_runtime_bytecode_invalid",
  );
  assertNoPush0(creationObject, label + "_creation");
  assertNoPush0(runtimeObject, label + "_runtime");
  const metadata = parseMetadata(
    contract.metadata,
    label,
  );
  const immutableLayout =
    normalizeImmutableReferences(
      runtime.immutableReferences ?? {},
      ast,
      runtimeObject.length / 2,
    );

  return {
    raw_sha256: sha256(bytes),
    canonical_output_sha256:
      sha256(canonicalJson(output)),
    source_ast: ast,
    abi: contract.abi,
    metadata: metadata.text,
    storage_layout: contract.storageLayout,
    method_identifiers:
      contract.evm.methodIdentifiers,
    creation: {
      object: creationObject,
      bytes: creationObject.length / 2,
      sha256:
        sha256(Buffer.from(creationObject, "hex")),
      keccak256: keccak256("0x" + creationObject),
      source_map: String(bytecode.sourceMap ?? ""),
    },
    runtime_template: {
      object: runtimeObject,
      bytes: runtimeObject.length / 2,
      sha256:
        sha256(Buffer.from(runtimeObject, "hex")),
      keccak256: keccak256("0x" + runtimeObject),
      source_map: String(runtime.sourceMap ?? ""),
    },
    immutable_layout: immutableLayout,
  };
}

export function validateCompilerEnvironment(
  value,
  label,
) {
  if (!plain(value)) {
    fail(label + "_environment_invalid");
  }
  for (const key of Object.keys(value)) {
    if (
      /(secret|private.?key|mnemonic|seed|password|credential|api.?token)/i
        .test(key)
    ) {
      fail(
        "compiler_environment_sensitive_field_forbidden",
        { label, key },
      );
    }
  }
  if (
    value.marker !== ENVIRONMENT_MARKER ||
    value.compiler_release !== SOLC_RELEASE ||
    typeof value.kind !== "string" ||
    !value.kind ||
    typeof value.implementation !== "string" ||
    !value.implementation ||
    typeof value.version_output !== "string" ||
    !value.version_output.includes(SOLC_RELEASE) ||
    typeof value.artifact_identity !== "string" ||
    !value.artifact_identity
  ) {
    fail(label + "_environment_contract_mismatch");
  }
  return {
    descriptor: structuredClone(value),
    fingerprint_sha256:
      sha256(canonicalJson(value)),
  };
}

function canonicalEqual(left, right, code) {
  if (canonicalJson(left) !== canonicalJson(right)) {
    fail(code);
  }
}

function exact(left, right, code) {
  if (left !== right) fail(code);
}

function timestamp(raw) {
  const value = String(raw ?? "").trim();
  const parsed = Date.parse(value);
  if (!value || !Number.isFinite(parsed)) {
    fail("reviewed_at_invalid");
  }
  return new Date(parsed).toISOString();
}

export function reviewBuyVoidPresaleFulfillmentDualCompilerV1({
  sourceBytes,
  inputBytes,
  outputABytes,
  outputBBytes,
  environmentA,
  environmentB,
  sourceCommit,
  sourceRef,
  reviewedAt,
}) {
  if (!Buffer.isBuffer(sourceBytes)) {
    fail("source_bytes_invalid");
  }
  const sourceText = validateSourceText(
    sourceBytes.toString("utf8"),
  );
  const expectedInput =
    buildStandardJsonInput(sourceText);
  let actualInput;
  try {
    actualInput = JSON.parse(
      Buffer.from(inputBytes).toString("utf8"),
    );
  } catch {
    fail("compiler_input_json_invalid");
  }
  if (
    canonicalJson(actualInput) !==
      canonicalJson(expectedInput)
  ) {
    fail("compiler_input_profile_mismatch");
  }

  const a = parseCompilerOutput(
    outputABytes,
    "compiler_a",
  );
  const b = parseCompilerOutput(
    outputBBytes,
    "compiler_b",
  );
  const envA = validateCompilerEnvironment(
    environmentA,
    "compiler_a",
  );
  const envB = validateCompilerEnvironment(
    environmentB,
    "compiler_b",
  );
  if (
    envA.fingerprint_sha256 ===
      envB.fingerprint_sha256 ||
    envA.descriptor.kind === envB.descriptor.kind ||
    envA.descriptor.implementation ===
      envB.descriptor.implementation
  ) {
    fail("compiler_environments_not_independent");
  }

  exact(
    a.creation.object,
    b.creation.object,
    "creation_bytecode_mismatch",
  );
  exact(
    a.runtime_template.object,
    b.runtime_template.object,
    "runtime_template_mismatch",
  );
  canonicalEqual(a.abi, b.abi, "abi_mismatch");
  exact(a.metadata, b.metadata, "metadata_mismatch");
  canonicalEqual(
    a.storage_layout,
    b.storage_layout,
    "storage_layout_mismatch",
  );
  canonicalEqual(
    a.method_identifiers,
    b.method_identifiers,
    "method_identifiers_mismatch",
  );
  canonicalEqual(
    a.immutable_layout,
    b.immutable_layout,
    "immutable_layout_mismatch",
  );
  exact(
    a.creation.source_map,
    b.creation.source_map,
    "creation_source_map_mismatch",
  );
  exact(
    a.runtime_template.source_map,
    b.runtime_template.source_map,
    "runtime_source_map_mismatch",
  );

  const commit = String(sourceCommit ?? "").trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    fail("source_commit_invalid");
  }
  const ref = String(sourceRef ?? "").trim();
  if (!ref || ref.length > 256) {
    fail("source_ref_invalid");
  }

  const body = {
    marker:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_DUAL_COMPILER_IDENTITY_V1,
    protocol: PROTOCOL,
    version: 1,
    reviewed_at_utc: timestamp(reviewedAt),
    source: {
      repository: "6ZoSo9/void-node",
      source_commit: commit,
      source_ref: ref,
      contract_path: CONTRACT_PATH,
      contract_name: CONTRACT_NAME,
      contract_source_sha256:
        sha256(sourceBytes),
      contract_source_bytes: sourceBytes.length,
      compiler_profile_marker:
        VOID_BUY_VOID_PRESALE_FULFILLMENT_COMPILER_PROFILE_V1,
      standard_json_input_canonical_sha256:
        sha256(canonicalJson(expectedInput)),
    },
    compiler_profile: {
      compiler: "solc",
      semantic_version: SOLC_VERSION,
      release: SOLC_RELEASE,
      evm_version: EVM_VERSION,
      optimizer_enabled: false,
      optimizer_runs: 200,
      via_ir: false,
      metadata_append_cbor: true,
      metadata_use_literal_content: true,
      metadata_bytecode_hash: "ipfs",
    },
    environments: {
      compiler_a: {
        ...envA.descriptor,
        fingerprint_sha256:
          envA.fingerprint_sha256,
        output_raw_sha256: a.raw_sha256,
        output_canonical_sha256:
          a.canonical_output_sha256,
      },
      compiler_b: {
        ...envB.descriptor,
        fingerprint_sha256:
          envB.fingerprint_sha256,
        output_raw_sha256: b.raw_sha256,
        output_canonical_sha256:
          b.canonical_output_sha256,
      },
    },
    comparison: {
      compiler_environments_independent: true,
      exact_compiler_release: true,
      exact_standard_json_input: true,
      zero_compiler_errors: true,
      zero_link_references: true,
      paris_push0_absent: true,
      creation_bytecode_exact_match: true,
      runtime_template_exact_match: true,
      abi_exact_match: true,
      metadata_exact_match: true,
      storage_layout_exact_match: true,
      method_identifiers_exact_match: true,
      immutable_layout_exact_match: true,
      source_maps_exact_match: true,
    },
    artifacts: {
      creation_bytecode_hex:
        "0x" + a.creation.object,
      creation_bytecode_bytes:
        a.creation.bytes,
      creation_bytecode_sha256:
        a.creation.sha256,
      creation_bytecode_keccak256:
        a.creation.keccak256,
      runtime_template_hex:
        "0x" + a.runtime_template.object,
      runtime_template_bytes:
        a.runtime_template.bytes,
      runtime_template_sha256:
        a.runtime_template.sha256,
      runtime_template_keccak256:
        a.runtime_template.keccak256,
      abi_sha256:
        sha256(canonicalJson(a.abi)),
      metadata_sha256:
        sha256(a.metadata),
      storage_layout_sha256:
        sha256(
          canonicalJson(a.storage_layout),
        ),
      method_identifiers_sha256:
        sha256(
          canonicalJson(a.method_identifiers),
        ),
      immutable_layout:
        a.immutable_layout,
      immutable_layout_sha256:
        sha256(
          canonicalJson(a.immutable_layout),
        ),
    },
    deployment_identity_requirements: {
      constructor_signature:
        "constructor(address,address,address)",
      constructor_order: [
        "void_token",
        "fulfiller",
        "predecessor",
      ],
      deployed_runtime_must_patch_exact_immutable_layout:
        true,
      deployed_runtime_keccak256_must_match_reconstructed_runtime:
        true,
      live_void_token_view_must_match_constructor: true,
      live_max_inventory_atoms_must_equal:
        "10000000000000000000000000",
      live_predecessor_lineage_must_be_attested: true,
    },
    unresolved: {
      compiled_identity_committed: false,
      fulfillment_contract_address: null,
      deployment_transaction_hash: null,
      deployment_block_hash: null,
      void_token_address: null,
      fulfiller_address: null,
      predecessor_address: null,
      predecessor_lineage_attested: false,
      deployed_runtime_code_observed: false,
      inventory_funding_verified: false,
      runtime_activation_authorized: false,
      public_activation_authorized: false,
    },
    authority: AUTHORITY,
    decision: {
      status: DECISION,
      compiler_outputs_reproduced: true,
      compiler_outputs_compared: true,
      compiled_identity_committed: false,
      deployment_attested: false,
      predecessor_lineage_attested: false,
      inventory_funding_verified: false,
      runtime_activation_authorized: false,
      public_activation_authorized: false,
      next_gate:
        "commit_exact_compiled_identity_then_verify_explicit_chain2050_deployment_observation",
    },
  };

  return {
    identity_id:
      "voidbvpfci1_" +
      sha256(canonicalJson(body)),
    ...body,
  };
}
