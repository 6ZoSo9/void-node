import crypto from "node:crypto";
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import type { BuyVoidRequestV1 } from "./buy_void_auto_fulfillment_v1.js";
import type {
  BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3,
  BuyVoidSourceFinalityAuthenticatedReadyV3,
} from "./buy_void_source_finality_authenticated_composition_v3.js";

export const VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6 =
  "VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6";

const EXPECTED_V3_MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3";

export const VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V6 =
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

type SourceGenerationRecordV6 = {
  readonly path: string;
  readonly source_commit_sha: string;
  readonly git_blob_sha1: string;
};

export const VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V6 =
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
      source_commit_sha: "5cc9022571269bd08176aec8c96cc20884bd4021",
      git_blob_sha1: "32133e441ccb02bb4786d29e36932fb31399ec87",
    }),
  ] as const satisfies readonly SourceGenerationRecordV6[]);

const MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_TIMEOUT_MS = 120_000;
const GIT_OBJECT_ID = /^[0-9a-f]{40}$/;
const SOURCE_MODULE_SUFFIX =
  "/src/economic/buy_void_source_finality_generation_provenance_v6.ts";
const COMPILED_MODULE_SUFFIX =
  "/dist/economic/buy_void_source_finality_generation_provenance_v6.js";

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

function parseTotalTimeoutMsV6(value: unknown): number | null {
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

function remainingTotalTimeoutMsV6(deadlineAtMonotonicMs: number): number {
  const remaining = Math.floor(deadlineAtMonotonicMs - performance.now());
  return Number.isSafeInteger(remaining) && remaining > 0 ? remaining : 0;
}

function sourceFilename(record: SourceGenerationRecordV6): string | null {
  const prefix = "src/economic/";
  if (!record.path.startsWith(prefix)) return null;
  const name = record.path.slice(prefix.length);
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
    return null;
  }
  return name;
}

function reviewedSourceDirectoryUrlV6(): URL | null {
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

export const VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_SOURCE_FILES_SHA256_V6 =
  sha256Canonical({
    marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6,
    version: 6,
    repository: "6ZoSo9/void-node",
    sources: VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V6,
  });

export type BuyVoidSourceFinalityRuntimeFilesVerifiedV6 = {
  ok: true;
  reviewed_source_files_verified: true;
  reviewed_source_files_sha256: string;
  verified_source_file_count: "5";
  verification_mode: "runtime_git_blob_identity_v1";
};

export type BuyVoidSourceFinalityRuntimeFilesHeldV6 = {
  ok: false;
  reviewed_source_files_verified: false;
  reason: string;
};

export type BuyVoidSourceFinalityRuntimeFilesDecisionV6 =
  | BuyVoidSourceFinalityRuntimeFilesVerifiedV6
  | BuyVoidSourceFinalityRuntimeFilesHeldV6;

export function verifyBuyVoidSourceFinalityRuntimeSourceFilesV6():
  BuyVoidSourceFinalityRuntimeFilesDecisionV6 {
  const sourceDirectoryUrl = reviewedSourceDirectoryUrlV6();
  if (!sourceDirectoryUrl) {
    return {
      ok: false,
      reviewed_source_files_verified: false,
      reason: "source_files_module_location_invalid",
    };
  }

  const seen = new Set<string>();
  // This reviewed generation is Linux-only: no silent symlink-follow fallback.
  const noFollow = fs.constants.O_NOFOLLOW;
  if (typeof noFollow !== "number" || noFollow <= 0) {
    return {
      ok: false,
      reviewed_source_files_verified: false,
      reason: "source_files_nofollow_unavailable",
    };
  }

  for (const record of VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V6) {
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

      // Bind initially visible source path to the opened descriptor.
      if (
        before.dev !== pathname.dev ||
        before.ino !== pathname.ino ||
        before.nlink !== pathname.nlink ||
        before.size !== pathname.size ||
        before.mtimeMs !== pathname.mtimeMs ||
        before.ctimeMs !== pathname.ctimeMs
      ) {
        return {
          ok: false,
          reviewed_source_files_verified: false,
          reason: "source_files_path_not_bound_before_read",
        };
      }

      // Read at most the preflight size plus one sentinel byte. A source
      // that grows after the pre-read stat must HOLD without unbounded buffering.
      const readBuffer = Buffer.alloc(before.size + 1);
      let bytesRead = 0;
      while (bytesRead < readBuffer.length) {
        const read = fs.readSync(
          descriptor,
          readBuffer,
          bytesRead,
          readBuffer.length - bytesRead,
          bytesRead,
        );
        if (read === 0) break;
        bytesRead += read;
      }
      if (bytesRead > before.size) {
        return {
          ok: false,
          reviewed_source_files_verified: false,
          reason: "source_files_exceeded_read_bound",
        };
      }
      const bytes = readBuffer.subarray(0, bytesRead);
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
      // Even a valid open descriptor may outlive a swap of its
      // visible pathname: rebind the path after the pinned-byte digest.
      const visible = fs.lstatSync(sourcePath);
      if (
        !visible.isFile() ||
        visible.isSymbolicLink() ||
        visible.dev !== after.dev ||
        visible.ino !== after.ino ||
        visible.nlink !== after.nlink ||
        visible.size !== after.size ||
        visible.mtimeMs !== after.mtimeMs ||
        visible.ctimeMs !== after.ctimeMs
      ) {
        return {
          ok: false,
          reviewed_source_files_verified: false,
          reason: "source_files_path_rebound_after_read",
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

  if (seen.size !== VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V6.length) {
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
      VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_SOURCE_FILES_SHA256_V6,
    verified_source_file_count: "5",
    verification_mode: "runtime_git_blob_identity_v1",
  };
}

export type BuyVoidSourceFinalityGenerationReadyV6 = Omit<
  BuyVoidSourceFinalityAuthenticatedReadyV3,
  | "schema"
  | "marker"
  | "version"
  | "status"
  | "source_generation_verified"
  | "production_source_finality_authority_ready"
> & {
  schema: "void_buy_void_source_finality_generation_provenance_v6";
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6;
  version: 6;
  status: "source_finality_reviewed_source_files_verified";
  reviewed_source_files_verified: true;
  source_generation_verified: false;
  deployed_artifact_generation_verified: false;
  production_source_finality_authority_ready: false;
  reviewed_source_files_sha256: string;
  verified_source_file_count: "5";
  source_file_verification_mode: "runtime_git_blob_identity_v1";
};

export type BuyVoidSourceFinalityGenerationHeldV6 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6;
  reason: string;
};

export type BuyVoidSourceFinalityGenerationDecisionV6 =
  | BuyVoidSourceFinalityGenerationReadyV6
  | BuyVoidSourceFinalityGenerationHeldV6;

function held(reason: string): BuyVoidSourceFinalityGenerationHeldV6 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6,
    reason,
  };
}

export async function observeBuyVoidSourceFinalityGenerationProvenanceV6(
  input: {
    request: BuyVoidRequestV1;
    policy: BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3;
  },
): Promise<BuyVoidSourceFinalityGenerationDecisionV6> {
  const totalTimeoutMs = parseTotalTimeoutMsV6(
    (input as any)?.policy?.total_timeout_ms,
  );
  if (totalTimeoutMs === null) {
    return held("source_finality_total_timeout_invalid");
  }
  const deadlineAtMonotonicMs = performance.now() + totalTimeoutMs;

  const sourceFiles = verifyBuyVoidSourceFinalityRuntimeSourceFilesV6();
  if (sourceFiles.ok === false) {
    return held(sourceFiles.reason);
  }

  let remainingTimeoutMs = remainingTotalTimeoutMsV6(deadlineAtMonotonicMs);
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
      remainingTotalTimeoutMsV6(deadlineAtMonotonicMs) === 0
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

  remainingTimeoutMs = remainingTotalTimeoutMsV6(deadlineAtMonotonicMs);
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

  if (remainingTotalTimeoutMsV6(deadlineAtMonotonicMs) === 0) {
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
    schema: "void_buy_void_source_finality_generation_provenance_v6",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6,
    version: 6,
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
