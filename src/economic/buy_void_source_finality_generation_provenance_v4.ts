import crypto from "node:crypto";
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import type { BuyVoidRequestV1 } from "./buy_void_auto_fulfillment_v1.js";
import type {
  BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3,
  BuyVoidSourceFinalityAuthenticatedReadyV3,
} from "./buy_void_source_finality_authenticated_composition_v3.js";

export const VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4 =
  "VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4";

const EXPECTED_V3_MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3";

export const VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4 =
  Object.freeze({
    source_only_candidate: true,
    runtime_source_filesystem_read: true,
    runtime_source_filesystem_write: false,
    caller_generation_assertion_accepted: false,
    reviewed_source_files_verification_required: true,
    reviewed_source_files_verified_on_success: true,
    source_generation_verified_on_success: false,
    deployed_artifact_generation_verified: false,
    authenticated_transport_identity_verified: true,
    remote_provider_identity_verified: false,
    total_operation_deadline_verified: true,
    observation_generated_in_composition: true,
    ancestry_verified: false,
    provider_quorum_verified: false,
    production_source_finality_authority_ready: false,
    rpc_read: true,
    rpc_write: false,
    wallet_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    runtime_route_mount: false,
    background_loop: false,
    inventory_mutation: false,
    chain2050_mutation: false,
    public_presale_activation: false,
    money_movement: false,
  });

type SourceGenerationRecordV4 = {
  readonly path: string;
  readonly source_commit_sha: string;
  readonly git_blob_sha1: string;
};

export const VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V4 =
  Object.freeze([
    Object.freeze({
      path: "src/economic/buy_void_source_finality_authenticated_composition_v3.ts",
      source_commit_sha: "3ab4b2ace3f3cf5a8d6f33ef9a0b21926be46962",
      git_blob_sha1: "a3dbe4d0fed3034d3ca2c0b3704a758d7c776090",
    }),
    Object.freeze({
      path: "src/economic/buy_void_source_finality_authority_v2.ts",
      source_commit_sha: "70a12eeb30c5beb2f05e789bab9e75b57cc50e4d",
      git_blob_sha1: "64953050d74bc0bc6d1e6948ae992d6143edca99",
    }),
    Object.freeze({
      path: "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts",
      source_commit_sha: "036c34a479d8dacbfd663fcb610adabbd0008428",
      git_blob_sha1: "419054e00f4d96015cd066be81e8719ee71ac00c",
    }),
    Object.freeze({
      path: "src/economic/buy_void_payment_rpc_observer_v1.ts",
      source_commit_sha: "036c34a479d8dacbfd663fcb610adabbd0008428",
      git_blob_sha1: "eb924f8e5376d0ed62c11456b46f1915eccd32fc",
    }),
    Object.freeze({
      path: "src/economic/buy_void_verified_payment_v2.ts",
      source_commit_sha: "036c34a479d8dacbfd663fcb610adabbd0008428",
      git_blob_sha1: "f90ff7a28e91d15c006f97ca75699cdf0fa7a555",
    }),
  ] as const satisfies readonly SourceGenerationRecordV4[]);

const MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_TIMEOUT_MS = 120_000;
const GIT_OBJECT_ID = /^[0-9a-f]{40}$/;
const SOURCE_MODULE_SUFFIX =
  "/src/economic/buy_void_source_finality_generation_provenance_v4.ts";
const COMPILED_MODULE_SUFFIX =
  "/dist/economic/buy_void_source_finality_generation_provenance_v4.js";

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("non_canonical_number");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`;
  }
  throw new Error("non_canonical_value");
}

function sha256Canonical(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function gitBlobSha1(bytes: Buffer): string {
  const header = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

function parseTotalTimeoutMsV4(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const parsed = Number(raw);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed <= 0 ||
    parsed > MAX_TOTAL_TIMEOUT_MS
  ) {
    return null;
  }
  return parsed;
}

function remainingTotalTimeoutMsV4(deadlineAtMonotonicMs: number): number {
  const remaining = Math.floor(deadlineAtMonotonicMs - performance.now());
  return Number.isSafeInteger(remaining) && remaining > 0 ? remaining : 0;
}

function sourceFilename(record: SourceGenerationRecordV4): string | null {
  const prefix = "src/economic/";
  if (!record.path.startsWith(prefix)) return null;
  const name = record.path.slice(prefix.length);
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
    return null;
  }
  return name;
}

function reviewedSourceDirectoryUrlV4(): URL | null {
  const moduleUrl = new URL(import.meta.url);
  const modulePath = fileURLToPath(moduleUrl).replace(/\\/g, "/");
  if (modulePath.endsWith(SOURCE_MODULE_SUFFIX)) {
    return new URL("./", moduleUrl);
  }
  if (modulePath.endsWith(COMPILED_MODULE_SUFFIX)) {
    return new URL("../../src/economic/", moduleUrl);
  }
  return null;
}

export const VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_SOURCE_FILES_SHA256_V4 =
  sha256Canonical({
    marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4,
    version: 4,
    repository: "6ZoSo9/void-node",
    sources: VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V4,
  });

export type BuyVoidSourceFinalityRuntimeFilesVerifiedV4 = {
  ok: true;
  reviewed_source_files_verified: true;
  reviewed_source_files_sha256: string;
  verified_source_file_count: "5";
  verification_mode: "runtime_git_blob_identity_v1";
};

export type BuyVoidSourceFinalityRuntimeFilesHeldV4 = {
  ok: false;
  reviewed_source_files_verified: false;
  reason: string;
};

export type BuyVoidSourceFinalityRuntimeFilesDecisionV4 =
  | BuyVoidSourceFinalityRuntimeFilesVerifiedV4
  | BuyVoidSourceFinalityRuntimeFilesHeldV4;

export function verifyBuyVoidSourceFinalityRuntimeSourceFilesV4():
  BuyVoidSourceFinalityRuntimeFilesDecisionV4 {
  const sourceDirectoryUrl = reviewedSourceDirectoryUrlV4();
  if (!sourceDirectoryUrl) {
    return {
      ok: false,
      reviewed_source_files_verified: false,
      reason: "source_files_module_location_invalid",
    };
  }

  const seen = new Set<string>();
  const noFollow =
    typeof fs.constants.O_NOFOLLOW === "number" ? fs.constants.O_NOFOLLOW : 0;

  for (const record of VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V4) {
    if (
      !GIT_OBJECT_ID.test(record.source_commit_sha) ||
      !GIT_OBJECT_ID.test(record.git_blob_sha1) ||
      seen.has(record.path)
    ) {
      return {
        ok: false,
        reviewed_source_files_verified: false,
        reason: "source_files_manifest_invalid",
      };
    }
    seen.add(record.path);

    const name = sourceFilename(record);
    if (!name) {
      return {
        ok: false,
        reviewed_source_files_verified: false,
        reason: "source_files_manifest_path_invalid",
      };
    }

    const sourceUrl = new URL(name, sourceDirectoryUrl);
    const sourcePath = fileURLToPath(sourceUrl);
    let descriptor: number | null = null;

    try {
      const pathname = fs.lstatSync(sourcePath);
      if (!pathname.isFile() || pathname.isSymbolicLink()) {
        return {
          ok: false,
          reviewed_source_files_verified: false,
          reason: "source_files_path_not_regular_file",
        };
      }

      descriptor = fs.openSync(sourcePath, fs.constants.O_RDONLY | noFollow);
      const before = fs.fstatSync(descriptor);
      if (
        !before.isFile() ||
        before.nlink !== 1 ||
        before.size <= 0 ||
        before.size > MAX_SOURCE_FILE_BYTES
      ) {
        return {
          ok: false,
          reviewed_source_files_verified: false,
          reason: "source_files_identity_invalid",
        };
      }

      const bytes = fs.readFileSync(descriptor);
      const after = fs.fstatSync(descriptor);
      if (
        before.dev !== after.dev ||
        before.ino !== after.ino ||
        before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs ||
        bytes.length !== after.size
      ) {
        return {
          ok: false,
          reviewed_source_files_verified: false,
          reason: "source_files_changed_during_verification",
        };
      }

      if (gitBlobSha1(bytes) !== record.git_blob_sha1) {
        return {
          ok: false,
          reviewed_source_files_verified: false,
          reason: "source_files_git_blob_mismatch",
        };
      }
    } catch {
      return {
        ok: false,
        reviewed_source_files_verified: false,
        reason: "source_files_unavailable",
      };
    } finally {
      if (descriptor !== null) {
        try {
          fs.closeSync(descriptor);
        } catch {
          // Read-only verification has already failed closed or completed.
        }
      }
    }
  }

  if (seen.size !== VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V4.length) {
    return {
      ok: false,
      reviewed_source_files_verified: false,
      reason: "source_files_manifest_cardinality_mismatch",
    };
  }

  return {
    ok: true,
    reviewed_source_files_verified: true,
    reviewed_source_files_sha256:
      VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_SOURCE_FILES_SHA256_V4,
    verified_source_file_count: "5",
    verification_mode: "runtime_git_blob_identity_v1",
  };
}

export type BuyVoidSourceFinalityGenerationReadyV4 = Omit<
  BuyVoidSourceFinalityAuthenticatedReadyV3,
  | "schema"
  | "marker"
  | "version"
  | "status"
  | "source_generation_verified"
  | "production_source_finality_authority_ready"
> & {
  schema: "void_buy_void_source_finality_generation_provenance_v4";
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4;
  version: 4;
  status: "source_finality_reviewed_source_files_verified";
  reviewed_source_files_verified: true;
  source_generation_verified: false;
  deployed_artifact_generation_verified: false;
  production_source_finality_authority_ready: false;
  reviewed_source_files_sha256: string;
  verified_source_file_count: "5";
  source_file_verification_mode: "runtime_git_blob_identity_v1";
};

export type BuyVoidSourceFinalityGenerationHeldV4 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4;
  reason: string;
};

export type BuyVoidSourceFinalityGenerationDecisionV4 =
  | BuyVoidSourceFinalityGenerationReadyV4
  | BuyVoidSourceFinalityGenerationHeldV4;

function held(reason: string): BuyVoidSourceFinalityGenerationHeldV4 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4,
    reason,
  };
}

export async function observeBuyVoidSourceFinalityGenerationProvenanceV4(
  input: {
    request: BuyVoidRequestV1;
    policy: BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3;
  },
): Promise<BuyVoidSourceFinalityGenerationDecisionV4> {
  const totalTimeoutMs = parseTotalTimeoutMsV4(
    (input as any)?.policy?.total_timeout_ms,
  );
  if (totalTimeoutMs === null) {
    return held("source_finality_total_timeout_invalid");
  }
  const deadlineAtMonotonicMs = performance.now() + totalTimeoutMs;

  const sourceFiles = verifyBuyVoidSourceFinalityRuntimeSourceFilesV4();
  if (sourceFiles.ok === false) {
    return held(sourceFiles.reason);
  }

  let remainingTimeoutMs = remainingTotalTimeoutMsV4(deadlineAtMonotonicMs);
  if (remainingTimeoutMs === 0) {
    return held("source_finality_total_deadline_exceeded");
  }

  let v3: typeof import("./buy_void_source_finality_authenticated_composition_v3.js");
  let importTimedOut = false;
  let importTimer: NodeJS.Timeout | null = null;
  try {
    v3 = await Promise.race([
      import("./buy_void_source_finality_authenticated_composition_v3.js"),
      new Promise<never>((_resolve, reject) => {
        importTimer = setTimeout(() => {
          importTimedOut = true;
          reject(new Error("source_finality_v3_import_deadline_exceeded"));
        }, remainingTimeoutMs);
      }),
    ]);
  } catch {
    if (
      importTimedOut ||
      remainingTotalTimeoutMsV4(deadlineAtMonotonicMs) === 0
    ) {
      return held("source_finality_total_deadline_exceeded");
    }
    return held("source_finality_v3_import_failed");
  } finally {
    if (importTimer) clearTimeout(importTimer);
  }

  if (v3.VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3 !== EXPECTED_V3_MARKER) {
    return held("source_finality_v3_marker_mismatch");
  }

  remainingTimeoutMs = remainingTotalTimeoutMsV4(deadlineAtMonotonicMs);
  if (remainingTimeoutMs === 0) {
    return held("source_finality_total_deadline_exceeded");
  }

  const composed =
    await v3.observeBuyVoidSourceFinalityAuthenticatedCompositionV3({
      ...input,
      policy: {
        ...input.policy,
        total_timeout_ms: String(remainingTimeoutMs),
      },
    });
  if (composed.ok === false) {
    return held(`source_finality_v3_${composed.reason}`);
  }

  if (remainingTotalTimeoutMsV4(deadlineAtMonotonicMs) === 0) {
    return held("source_finality_total_deadline_exceeded");
  }

  if (
    composed.marker !== EXPECTED_V3_MARKER ||
    composed.authenticated_transport_identity_verified !== true ||
    composed.total_operation_deadline_verified !== true ||
    composed.observation_generated_in_composition !== true ||
    composed.source_generation_verified !== false ||
    composed.production_source_finality_authority_ready !== false
  ) {
    return held("source_finality_v3_truth_boundary_mismatch");
  }

  return {
    ...composed,
    schema: "void_buy_void_source_finality_generation_provenance_v4",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4,
    version: 4,
    status: "source_finality_reviewed_source_files_verified",
    reviewed_source_files_verified: true,
    source_generation_verified: false,
    deployed_artifact_generation_verified: false as const,
    production_source_finality_authority_ready: false,
    reviewed_source_files_sha256: sourceFiles.reviewed_source_files_sha256,
    verified_source_file_count: sourceFiles.verified_source_file_count,
    source_file_verification_mode: sourceFiles.verification_mode,
    total_timeout_ms: String(totalTimeoutMs),
  };
}
