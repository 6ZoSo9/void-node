#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_SOURCE_MAIN_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3,
  classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV3,
} from "../dist/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v3.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V3 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V3";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_AUTHORITY_V3 =
  Object.freeze({
    source_collector: true,
    filesystem_read: true,
    descriptor_bound_reads: true,
    fixed_candidate_paths: true,
    exact_sha256_binding: true,
    root_owned_parent_chain_observed: true,
    double_census: true,
    canonical_v3_qualifier_required: true,
    content_addressed_receipt: true,
    filesystem_write: false,
    live_evidence_origin_proven: false,
    live_nimo_installed: false,
    live_ssh_execution_performed: false,
    installation_qualification_composed: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    runtime_integration: false,
    production_gate_ready: false,
    payment_acceptance: false,
    verified_payment_to_allocation_mounted: false,
    custody_reserve_or_recover_enabled: false,
    wallet_or_signer_access: false,
    transaction_signing: false,
    transaction_broadcast: false,
    presale_activation: false,
    funds_movement: false,
  });

const SCHEMA =
  "void_buy_void_allocation_custody_witness_runtime_bundle_evidence_v3";
const QUALIFICATION_SCHEMA =
  "void_buy_void_allocation_custody_witness_runtime_bundle_qualification_v3";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;

function fail(reason) {
  throw new Error(reason);
}

function sha256Id(bytes) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(bytes).digest("hex")
  );
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("witness_runtime_bundle_evidence_noncanonical_value");
}

function sameDirectory(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function validateRootOwnedDirectory(stat) {
  return (
    stat.isDirectory() &&
    !stat.isSymbolicLink() &&
    Number(stat.uid) === 0 &&
    Number(stat.gid) === 0 &&
    (Number(stat.mode) & 0o022) === 0
  );
}

function validateRuntimeFile(
  stat,
  {
    expectedUid = 0,
    expectedGid = 0,
    expectedMode = 0o444,
    maxBytes = MAX_FILE_BYTES,
  } = {},
) {
  return (
    stat.isFile() &&
    !stat.isSymbolicLink() &&
    Number(stat.uid) === expectedUid &&
    Number(stat.gid) === expectedGid &&
    (Number(stat.mode) & 0o7777) === expectedMode &&
    stat.nlink === 1n &&
    stat.size > 0n &&
    stat.size <= BigInt(maxBytes)
  );
}

function readDescriptorBound(
  rawPath,
  {
    expectedSha256 = null,
    expectedUid = 0,
    expectedGid = 0,
    expectedMode = 0o444,
    maxBytes = MAX_FILE_BYTES,
    enforceRootOwnedParents = true,
    testOnlyAfterOpenBeforeRead = null,
  } = {},
) {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("witness_runtime_bundle_evidence_descriptor_walk_unavailable");
  }
  const raw = String(rawPath ?? "");
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    fail("witness_runtime_bundle_evidence_path_invalid");
  }
  const resolved = path.resolve(raw);
  let visibleBefore;
  try {
    visibleBefore = fs.lstatSync(resolved, { bigint: true });
  } catch {
    fail("witness_runtime_bundle_evidence_file_invalid");
  }
  if (
    !validateRuntimeFile(visibleBefore, {
      expectedUid,
      expectedGid,
      expectedMode,
      maxBytes,
    })
  ) {
    fail("witness_runtime_bundle_evidence_file_invalid");
  }

  const parsed = path.parse(resolved);
  const parts = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  if (parts.length < 1) {
    fail("witness_runtime_bundle_evidence_path_invalid");
  }

  let directoryFd = -1;
  try {
    directoryFd = fs.openSync(
      parsed.root,
      fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
    );
  } catch {
    fail("witness_runtime_bundle_evidence_parent_chain_invalid");
  }
  let fileFd = -1;
  try {
    let current = parsed.root;
    const rootOpened = fs.fstatSync(directoryFd, { bigint: true });
    const rootVisible = fs.lstatSync(current, { bigint: true });
    if (
      !sameDirectory(rootOpened, rootVisible) ||
      (
        enforceRootOwnedParents &&
        !validateRootOwnedDirectory(rootOpened)
      )
    ) {
      fail("witness_runtime_bundle_evidence_parent_chain_invalid");
    }

    for (const component of parts.slice(0, -1)) {
      if (
        component === "." ||
        component === ".." ||
        component.includes("/") ||
        component.includes("\\")
      ) {
        fail("witness_runtime_bundle_evidence_parent_chain_invalid");
      }
      current = path.join(current, component);
      let visible;
      try {
        visible = fs.lstatSync(current, { bigint: true });
      } catch {
        fail("witness_runtime_bundle_evidence_parent_chain_invalid");
      }
      let nextFd = -1;
      try {
        nextFd = fs.openSync(
          path.join("/proc/self/fd", String(directoryFd), component),
          fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
        );
      } catch {
        fail("witness_runtime_bundle_evidence_parent_chain_invalid");
      }
      const opened = fs.fstatSync(nextFd, { bigint: true });
      if (
        !sameDirectory(opened, visible) ||
        (
          enforceRootOwnedParents &&
          !validateRootOwnedDirectory(opened)
        )
      ) {
        fs.closeSync(nextFd);
        fail("witness_runtime_bundle_evidence_parent_chain_invalid");
      }
      fs.closeSync(directoryFd);
      directoryFd = nextFd;
    }

    const basename = parts.at(-1);
    if (
      !basename ||
      basename === "." ||
      basename === ".." ||
      basename.includes("/") ||
      basename.includes("\\")
    ) {
      fail("witness_runtime_bundle_evidence_path_invalid");
    }
    try {
      fileFd = fs.openSync(
        path.join("/proc/self/fd", String(directoryFd), basename),
        fs.constants.O_RDONLY | O_NOFOLLOW,
      );
    } catch {
      fail("witness_runtime_bundle_evidence_file_path_not_bound");
    }

    const opened = fs.fstatSync(fileFd, { bigint: true });
    if (
      !validateRuntimeFile(opened, {
        expectedUid,
        expectedGid,
        expectedMode,
        maxBytes,
      }) ||
      !sameFile(visibleBefore, opened)
    ) {
      fail("witness_runtime_bundle_evidence_file_path_not_bound");
    }

    if (testOnlyAfterOpenBeforeRead !== null) {
      if (typeof testOnlyAfterOpenBeforeRead !== "function") {
        fail("witness_runtime_bundle_evidence_test_hook_invalid");
      }
      testOnlyAfterOpenBeforeRead();
    }

    const size = Number(opened.size);
    if (
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > maxBytes
    ) {
      fail("witness_runtime_bundle_evidence_file_invalid");
    }
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      let count = 0;
      try {
        count = fs.readSync(
          fileFd,
          bytes,
          offset,
          size - offset,
          offset,
        );
      } catch {
        fail("witness_runtime_bundle_evidence_file_read_failed");
      }
      if (count <= 0) {
        fail("witness_runtime_bundle_evidence_file_short_read");
      }
      offset += count;
    }

    const probe = Buffer.alloc(1);
    let probeCount = 0;
    try {
      probeCount = fs.readSync(fileFd, probe, 0, 1, size);
    } catch {
      fail("witness_runtime_bundle_evidence_file_read_failed");
    }
    if (probeCount !== 0) {
      fail("witness_runtime_bundle_evidence_file_grew_after_open");
    }

    const after = fs.fstatSync(fileFd, { bigint: true });
    let visibleAfter;
    try {
      visibleAfter = fs.lstatSync(resolved, { bigint: true });
    } catch {
      fail("witness_runtime_bundle_evidence_file_changed");
    }
    if (
      !validateRuntimeFile(after, {
        expectedUid,
        expectedGid,
        expectedMode,
        maxBytes,
      }) ||
      !validateRuntimeFile(visibleAfter, {
        expectedUid,
        expectedGid,
        expectedMode,
        maxBytes,
      }) ||
      !sameFile(opened, after) ||
      !sameFile(after, visibleAfter)
    ) {
      fail("witness_runtime_bundle_evidence_file_changed");
    }

    const digest = sha256Id(bytes);
    if (expectedSha256 !== null && digest !== expectedSha256) {
      fail("witness_runtime_bundle_evidence_file_sha256_mismatch");
    }

    return Object.freeze({
      path: resolved,
      sha256: digest,
      uid: Number(after.uid),
      gid: Number(after.gid),
      mode: Number(after.mode) & 0o7777,
      nlink: Number(after.nlink),
      regular_file: true,
      symlink: false,
      root_owned_parent_chain: enforceRootOwnedParents
        ? true
        : false,
    });
  } finally {
    if (fileFd >= 0) {
      try { fs.closeSync(fileFd); } catch (error) { void error; }
    }
    try { fs.closeSync(directoryFd); } catch (error) { void error; }
  }
}

function defaultIo() {
  return Object.freeze({
    inspect(expected) {
      return readDescriptorBound(expected.installed_path, {
        expectedSha256: expected.sha256,
        expectedUid: 0,
        expectedGid: 0,
        expectedMode: 0o444,
      });
    },
  });
}



function qualifierInput(files) {
  return Object.freeze({
    schema: QUALIFICATION_SCHEMA,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3,
    version: 3,
    candidate_manifest_id:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3,
    candidate_archive_sha256:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3,
    files,
  });
}

function collectOnce(io) {
  return Object.freeze(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3.map(
      (expected) => {
        const observed = io.inspect(expected);
        if (
          !observed ||
          typeof observed !== "object" ||
          Array.isArray(observed)
        ) {
          fail("witness_runtime_bundle_evidence_observation_invalid");
        }
        return Object.freeze({
          path: observed.path,
          sha256: observed.sha256,
          uid: observed.uid,
          gid: observed.gid,
          mode: observed.mode,
          nlink: observed.nlink,
          regular_file: observed.regular_file,
          symlink: observed.symlink,
          root_owned_parent_chain:
            observed.root_owned_parent_chain,
        });
      },
    ),
  );
}



export function collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV3(
  injectedIo = null,
) {
  const io = injectedIo || defaultIo();
  if (!io || typeof io.inspect !== "function") {
    fail("witness_runtime_bundle_v3_evidence_io_invalid");
  }

  const first = collectOnce(io);
  const second = collectOnce(io);
  if (canonicalJson(first) !== canonicalJson(second)) {
    fail("witness_runtime_bundle_v3_evidence_changed_during_collection");
  }

  const qualification =
    classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV3(
      qualifierInput(second),
    );
  if (qualification.ok !== true) {
    fail(
      "witness_runtime_bundle_v3_evidence_parent_" +
        String(qualification.reason || "hold"),
    );
  }

  const evidenceSha256 = sha256Id(
    Buffer.from(canonicalJson(second), "utf8"),
  );
  const body = Object.freeze({
    schema: SCHEMA,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V3,
    version: 3,
    candidate_manifest_id:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3,
    candidate_archive_sha256:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3,
    candidate_source_main:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_SOURCE_MAIN_V3,
    runtime_bundle_qualification_id: qualification.qualification_id,
    runtime_bundle_evidence_sha256: evidenceSha256,
    runtime_bundle_files: second,
    normalized_runtime_bundle_qualification: qualification.normalized,
    runtime_file_count: second.length,
    double_census_match: true,
    operation_performed: false,
    live_evidence_origin_proven: false,
    live_nimo_installed: false,
    live_ssh_execution_performed: false,
    installation_qualification_composed: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    runtime_integration: false,
    production_gate_ready: false,
    verified_payment_to_allocation_mounted: false,
    custody_reserve_or_recover_enabled: false,
    presale_activation: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_AUTHORITY_V3,
  });

  return Object.freeze({
    ...body,
    collector_receipt_sha256: sha256Id(
      Buffer.from(canonicalJson(body), "utf8"),
    ),
  });
}

export function testOnlyReadBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceFileV3(
  file,
  options = {},
) {
  return readDescriptorBound(file, {
    expectedSha256: options.expectedSha256 ?? null,
    expectedUid:
      options.expectedUid ??
      (typeof process.getuid === "function" ? process.getuid() : 0),
    expectedGid:
      options.expectedGid ??
      (typeof process.getgid === "function" ? process.getgid() : 0),
    expectedMode: options.expectedMode ?? 0o600,
    maxBytes: options.maxBytes ?? 4096,
    enforceRootOwnedParents: false,
    testOnlyAfterOpenBeforeRead:
      options.testOnlyAfterOpenBeforeRead ?? null,
  });
}

function main() {
  const result =
    collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV3();
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}

