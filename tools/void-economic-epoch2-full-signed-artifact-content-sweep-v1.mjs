#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Transaction } from "ethers";

import {
  inspectVoidEconomicEpoch2ExplicitRawTransactionV1,
} from "./void-economic-epoch2-explicit-raw-transaction-inspector-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1 =
  "VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1";
export const VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_CONFIRMATION_V1 =
  "scanApprovedVoidArtifactContentsForSignedTransactions";

const RECEIPT_MARKER =
  "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1";
const RECEIPT_STATUS = "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED";
const REGISTRY_PATH =
  "ops/mainnet0/economic-epoch2-known-signed-transaction-lineages-v1.json";
const NONCE_PATH =
  "ops/mainnet0/economic-epoch2-account-nonce-continuity-candidate-v1.json";
const REGISTRY_GIT_BLOB_SHA1 =
  "f96d7d4d5857a33bc292dce677678db026aabf2f";
const NONCE_GIT_BLOB_SHA1 =
  "83191d30131a2c99ef0cf51e43d2954fc34ffd06";
const GENERATED_DIR_NAMES = new Set([
  ".git", ".mypy_cache", ".pytest_cache", ".ruff_cache", ".tox",
  ".venv", "__pycache__", "node_modules", "venv",
]);
const MAX_RECEIPTS = 2048;
const MAX_REGULAR_FILES = 100_000;
const MAX_DEPTH_EXPANDED_FILES = 20_000;
const MAX_EXPANDED_DEPTH = 32;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_SAFETENSORS_FILE_BYTES = 64 * 1024 * 1024 * 1024;
const MAX_SAFETENSORS_HEADER_BYTES = 16 * 1024 * 1024;
const PR1352_EXT4_FIXTURE_BYTES = 384 * 1024 * 1024;
const PR1464_PORTABLE_NODE_MAX_BYTES = 256 * 1024 * 1024;
const PR1464_PORTABLE_NODE_EXECUTABLE_SHA256 = Object.freeze({
  "v24.20.0": "89af8424dd53e560b1933f87ba650d8bf57c83ca5a04600eefb31f416aabbae7",
  "v26.8.1": "19235a9b678f84729464c52623f92de130a165452747c6826d3fdc13df3abcc3",
});
const PR1464_PORTABLE_NODE_HASH_CHUNK_BYTES = 1024 * 1024;
const PR1505_PROM_SYMLINK_TARGET =
  "/usr/local/bin/prom-textfile-snap-age.sh";
const PR1505_PROM_SYMLINK_GIT_BLOB_SHA1 =
  "4d8b82d38eee4814462b9e21f21102361b35f7e5";
const PR1505_EXEC_DIGEST_CACHE_DIR =
  /^void-pr1505-exec-digest-cache-v(?:2|3)-[a-z0-9]{8}$/;
const WAR_COLLEGE_RUNTIME_VENV_BASENAME =
  "void-war-college-runtime-venv-v1";
const WAR_COLLEGE_RUNTIME_VENV_MANIFEST =
  ".void-war-college-runtime-venv-v1.json";
const WAR_COLLEGE_RUNTIME_VENV_SOURCE_HEAD =
  "ce0d29e5bcb91d0f3746d81905956410f13a55f5";
const WAR_COLLEGE_RUNTIME_VENV_PYPROJECT_BLOB =
  "6a32df4cab3e4198cee6ca426bea1e6ccb36533f";
const WAR_COLLEGE_RUNTIME_VENV_DEPENDENCIES = Object.freeze([
  "grpcio>=1.60.0",
  "grpcio-tools>=1.60.0",
  "protobuf>=4.25.0",
]);
const WAR_COLLEGE_RUNTIME_VENV_SYMLINK_TARGETS = Object.freeze({
  "bin/python": "python3.12",
  "bin/python3": "python3.12",
  "bin/python3.12": "/usr/bin/python3.12",
  "lib64": "lib",
});
const WAR_COLLEGE_RUNTIME_VENV_MANIFEST_MAX_BYTES = 1024 * 1024;
const ELF64_HEADER_BYTES = 64;
const ELF64_PROGRAM_HEADER_BYTES = 56;
const ELF_PT_INTERP = 3;
const ELF_MACHINE_X86_64 = 62;
const EXT4_SUPERBLOCK_OFFSET = 1024;
const EXT4_SUPERBLOCK_BYTES = 1024;
const EXT4_SUPERBLOCK_MAGIC_OFFSET = 56;
const EXT4_FEATURE_INCOMPAT_OFFSET = 96;
const EXT4_BLOCKS_COUNT_HI_OFFSET = 336;
const EXT4_FEATURE_INCOMPAT_64BIT = 0x80;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024;
const MAX_ASCII_HEX_TOKENS_PER_FILE = 8192;
const MAX_RAW_TRANSACTION_BYTES = 1024 * 1024;
const MIN_RAW_TRANSACTION_BYTES = 80;
const SAFETENSORS_DTYPE_BYTES = Object.freeze({
  BOOL: 1,
  U8: 1,
  I8: 1,
  F8_E4M3: 1,
  F8_E5M2: 1,
  I16: 2,
  U16: 2,
  F16: 2,
  BF16: 2,
  I32: 4,
  U32: 4,
  F32: 4,
  I64: 8,
  U64: 8,
  F64: 8,
});

class Hold extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.reason = reason;
    this.detail = detail;
  }
}
function hold(reason, detail = null) {
  throw new Hold(reason, detail);
}
function uid() {
  return typeof process.getuid === "function" ? process.getuid() : null;
}
function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
}
function receiptPattern(stamp) {
  const escaped = stamp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    "^void_epoch2_signed_artifact_metadata_census_precision_v1_" +
      escaped +
      "_(?:root_batch_[0-9]+|file_batch_[0-9]+)\\.json$",
  );
}
function sensitivePath(filePath) {
  const lower = filePath.toLowerCase();
  const base = path.basename(lower);
  const ext = path.extname(base);
  if ([
    ".pem", ".key", ".p12", ".pfx", ".jks", ".kdbx",
    ".wallet", ".seed", ".mnemonic", ".env",
  ].includes(ext)) return true;
  if (/^(?:id_rsa|id_ed25519)(?:\.|$)/.test(base)) return true;
  if (/(?:^|[-_.])(?:private[-_]?key|privkey|mnemonic|seed[-_]?phrase)(?:[-_.]|$)/.test(base)) {
    return true;
  }
  const segments = lower.split(path.sep);
  return segments.some((segment) =>
    ["keystore", "keystores", "wallet", "wallets", "credentials", "secrets"].includes(segment)
  );
}

const PUBLIC_PEM_TYPES = new Set([
  "PUBLIC KEY",
  "RSA PUBLIC KEY",
  "CERTIFICATE",
  "X509 CERTIFICATE",
  "TRUSTED CERTIFICATE",
]);
const SENSITIVE_ENV_BASENAME =
  "void-war-college-evidence-verifier.env";
const SENSITIVE_ENV_VARIABLE =
  /(?:^|_)(?:PRIVATE_KEY|PRIVKEY|MNEMONIC|SEED_PHRASE|PASSWORD|PASSWD|PASSPHRASE|SECRET|API_KEY|ACCESS_KEY|AUTH_TOKEN|BEARER_TOKEN|CREDENTIAL)(?:_|$)/i;

function generatedSensitiveDependencyClass(filePath) {
  const lower = filePath.toLowerCase();
  const ext = path.extname(lower);

  if (
    lower.includes("/site-packages/") &&
    lower.includes("/private_key_signing/") &&
    [".c", ".cc", ".cpp", ".h", ".hpp"].includes(ext)
  ) {
    return "GENERATED_DEPENDENCY_PRIVATE_KEY_SIGNING_SOURCE";
  }

  if (
    lower.includes("/site-packages/") &&
    ext === ".pem" &&
    (
      lower.includes("/certifi/") ||
      lower.includes("/_credentials/") ||
      path.basename(lower) === "roots.pem" ||
      path.basename(lower) === "cacert.pem"
    )
  ) {
    return "GENERATED_DEPENDENCY_TRUST_ROOT_PEM";
  }

  if (
    ext === ".pem" &&
    lower.includes("/sdk/") &&
    lower.includes("/trustedroots/")
  ) {
    return "GENERATED_SDK_TRUST_ROOT_PEM";
  }

  return null;
}

function readBoundedSensitiveFile(row) {
  if (row.size_bytes > MAX_FILE_BYTES) {
    hold("sensitive_review_file_above_bound", {
      path: row.absolute_path,
      size_bytes: row.size_bytes,
      maximum_bytes: MAX_FILE_BYTES,
    });
  }
  const stat = fs.lstatSync(row.absolute_path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== row.size_bytes) {
    hold("sensitive_review_file_identity_changed", {
      path: row.absolute_path,
    });
  }
  return fs.readFileSync(row.absolute_path);
}

function reviewPublicPem(row) {
  const bytes = readBoundedSensitiveFile(row);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes)) {
    hold("public_pem_not_valid_utf8", { path: row.absolute_path });
  }
  if (
    /-----BEGIN (?:ENCRYPTED |RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(text)
  ) {
    hold("private_pem_material_rejected", { path: row.absolute_path });
  }

  const blockPattern =
    /-----BEGIN ([A-Z0-9 ]+)-----\r?\n([A-Za-z0-9+/=\r\n]+)-----END \1-----/g;
  let cursor = 0;
  let count = 0;
  let match;
  while ((match = blockPattern.exec(text)) !== null) {
    if (text.slice(cursor, match.index).trim() !== "") {
      hold("public_pem_unrecognized_content", { path: row.absolute_path });
    }
    if (!PUBLIC_PEM_TYPES.has(match[1])) {
      hold("public_pem_block_type_not_allowlisted", {
        path: row.absolute_path,
        block_type: match[1],
      });
    }
    const decoded = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    if (decoded.length === 0) {
      hold("public_pem_block_empty", { path: row.absolute_path });
    }
    cursor = blockPattern.lastIndex;
    count += 1;
  }
  if (count === 0 || text.slice(cursor).trim() !== "") {
    hold("public_pem_structure_invalid", { path: row.absolute_path });
  }

  return Object.freeze({
    ...row,
    sensitive_review_class: "PUBLIC_PEM_OR_CERTIFICATE",
    sensitive_review_block_count: count,
    reviewed_bytes: bytes,
  });
}

function reviewWarCollegeVerifierEnv(row) {
  if (path.basename(row.absolute_path) !== SENSITIVE_ENV_BASENAME) {
    hold("sensitive_env_basename_not_allowlisted", {
      path: row.absolute_path,
    });
  }
  if (!row.absolute_path.includes("/ops/war-college/")) {
    hold("sensitive_env_path_not_allowlisted", {
      path: row.absolute_path,
    });
  }

  const bytes = readBoundedSensitiveFile(row);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes)) {
    hold("sensitive_env_not_valid_utf8", { path: row.absolute_path });
  }

  let assignmentCount = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/,
    );
    if (!match) {
      hold("sensitive_env_line_shape_invalid", {
        path: row.absolute_path,
      });
    }
    if (SENSITIVE_ENV_VARIABLE.test(match[1])) {
      hold("sensitive_env_secret_variable_rejected", {
        path: row.absolute_path,
        variable_name: match[1],
      });
    }
    assignmentCount += 1;
  }

  return Object.freeze({
    ...row,
    sensitive_review_class: "WAR_COLLEGE_VERIFIER_ENV",
    sensitive_review_assignment_count: assignmentCount,
    reviewed_bytes: bytes,
  });
}

function classifySensitiveRows(rows) {
  const publicPem = [];
  const verifierEnv = [];
  const generatedSource = [];
  const generatedTrustRoot = [];
  const unknown = [];

  for (const row of rows) {
    const lower = row.absolute_path.toLowerCase();
    const generatedClass =
      generatedSensitiveDependencyClass(row.absolute_path);

    if (generatedClass === "GENERATED_DEPENDENCY_PRIVATE_KEY_SIGNING_SOURCE") {
      generatedSource.push(Object.freeze({
        ...row,
        sensitive_review_class: generatedClass,
      }));
    } else if (
      generatedClass === "GENERATED_DEPENDENCY_TRUST_ROOT_PEM" ||
      generatedClass === "GENERATED_SDK_TRUST_ROOT_PEM"
    ) {
      hold("generated_trust_root_requires_bound_provenance", {
        path: row.absolute_path,
        candidate_class: generatedClass,
        content_read: false,
      });
    } else if (lower.endsWith(".pem")) {
      publicPem.push(reviewPublicPem(row));
    } else if (lower.endsWith(".env")) {
      verifierEnv.push(reviewWarCollegeVerifierEnv(row));
    } else {
      unknown.push(row);
    }
  }

  if (unknown.length > 0) {
    hold("credential_or_key_path_requires_separate_exclusion_review", {
      count: unknown.length,
      paths: unknown.slice(0, 50).map((row) => row.absolute_path),
    });
  }

  return Object.freeze({
    publicPem,
    verifierEnv,
    generatedSource,
    generatedTrustRoot,
  });
}
function readCanonicalJson(file, expectedBlob) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    hold("canonical_repository_evidence_not_direct_file", { path: file });
  }
  const bytes = fs.readFileSync(file);
  const observed = gitBlobSha1(bytes);
  if (observed !== expectedBlob) {
    hold("canonical_repository_evidence_identity_mismatch", {
      path: file,
      expected_git_blob_sha1: expectedBlob,
      observed_git_blob_sha1: observed,
    });
  }
  return JSON.parse(bytes.toString("utf8"));
}
function safeReceiptFiles(receiptDir, stamp) {
  if (!path.isAbsolute(receiptDir)) hold("receipt_dir_must_be_absolute");
  if (!/^\d{8}T\d{6}Z$/.test(stamp)) hold("stamp_invalid");
  const resolved = path.resolve(receiptDir);
  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink()) hold("receipt_dir_invalid");
  const currentUid = uid();
  if (currentUid !== null && stat.uid !== currentUid) hold("receipt_dir_owner_mismatch");
  const pattern = receiptPattern(stamp);
  const names = fs.readdirSync(resolved).filter((name) => pattern.test(name)).sort();
  if (names.length === 0) hold("receipt_set_empty");
  if (names.length > MAX_RECEIPTS) hold("receipt_count_exceeded");
  return names.map((name) => {
    const file = path.join(resolved, name);
    const item = fs.lstatSync(file);
    if (!item.isFile() || item.isSymbolicLink()) hold("receipt_not_direct_file", { file });
    if (currentUid !== null && item.uid !== currentUid) hold("receipt_owner_mismatch", { file });
    if ((item.mode & 0o777) !== 0o600) hold("receipt_mode_invalid", { file });
    return file;
  });
}
function collectReceiptScope(receiptFiles) {
  const files = new Map();
  const symlinks = new Map();
  const generated = new Map();
  const depth = new Map();
  for (const receiptFile of receiptFiles) {
    const value = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
    if (
      value?.marker !== RECEIPT_MARKER ||
      value?.status !== RECEIPT_STATUS ||
      value?.scanned_file_content_read !== false ||
      !Array.isArray(value.files) ||
      !Array.isArray(value.symlink_descendants) ||
      !Array.isArray(value.skipped_generated_subtrees) ||
      !Array.isArray(value.skipped_depth_subtrees)
    ) hold("receipt_contract_mismatch", { receipt: path.basename(receiptFile) });

    for (const row of value.files) {
      if (
        typeof row.absolute_path !== "string" ||
        typeof row.path_sha256 !== "string" ||
        typeof row.size_bytes !== "number" ||
        row.content_read !== false
      ) hold("regular_file_metadata_contract_mismatch");
      if (files.has(row.absolute_path)) hold("duplicate_regular_file_path");
      files.set(row.absolute_path, {
        absolute_path: row.absolute_path,
        path_sha256: row.path_sha256,
        size_bytes: row.size_bytes,
        source: "receipt_regular_file",
      });
    }
    for (const row of value.symlink_descendants) {
      if (typeof row.absolute_path !== "string" || row.followed !== false) {
        hold("symlink_metadata_contract_mismatch");
      }
      if (symlinks.has(row.absolute_path)) hold("duplicate_symlink_path");
      symlinks.set(row.absolute_path, row);
    }
    for (const row of value.skipped_generated_subtrees) {
      if (
        typeof row.absolute_path !== "string" ||
        row.skip_reason !== "generated_dependency_or_cache_directory" ||
        row.contents_enumerated !== false ||
        row.content_read !== false
      ) hold("generated_skip_contract_mismatch");
      if (generated.has(row.absolute_path)) hold("duplicate_generated_skip_path");
      generated.set(row.absolute_path, row);
    }
    for (const row of value.skipped_depth_subtrees) {
      if (
        typeof row.absolute_path !== "string" ||
        row.skip_reason !== "maximum_scan_depth_boundary" ||
        row.contents_enumerated !== false ||
        row.content_read !== false
      ) hold("depth_skip_contract_mismatch");
      if (depth.has(row.absolute_path)) hold("duplicate_depth_skip_path");
      depth.set(row.absolute_path, row);
    }
  }
  if (files.size > MAX_REGULAR_FILES) hold("regular_file_count_exceeded");
  return { files, symlinks, generated, depth };
}
function validateRegularFile(row) {
  const resolved = path.resolve(row.absolute_path);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    hold("regular_file_type_changed", { path: resolved });
  }
  const currentUid = uid();
  if (currentUid !== null && stat.uid !== currentUid) {
    hold("regular_file_owner_mismatch", { path: resolved });
  }
  if (stat.size !== row.size_bytes) {
    hold("regular_file_size_changed_since_census", {
      path: resolved,
      census_size_bytes: row.size_bytes,
      observed_size_bytes: stat.size,
    });
  }
  return { ...row, absolute_path: resolved, size_bytes: stat.size };
}
function validatePr1464PortableNodeRuntime(row) {
  if (path.basename(row.absolute_path) !== "node") return null;

  const runtimeDir = path.basename(path.dirname(row.absolute_path));
  const runtimeMatch =
    runtimeDir.match(/^node-(v(?:24\.20\.0|26\.8\.1))-linux-x64$/);
  if (!runtimeMatch) return null;

  const bundleDir =
    path.basename(path.dirname(path.dirname(row.absolute_path)));
  if (bundleDir !== "void-pr1464-portable-nodes-v1") return null;

  const runtimeVersion = runtimeMatch[1];
  const expectedExecutableSha256 =
    PR1464_PORTABLE_NODE_EXECUTABLE_SHA256[runtimeVersion];
  if (typeof expectedExecutableSha256 !== "string") return null;
  if (
    row.size_bytes <= MAX_FILE_BYTES ||
    row.size_bytes > PR1464_PORTABLE_NODE_MAX_BYTES
  ) {
    hold("pr1464_portable_node_size_out_of_bounds", {
      path: row.absolute_path,
      observed_bytes: row.size_bytes,
      minimum_exclusive_bytes: MAX_FILE_BYTES,
      maximum_bytes: PR1464_PORTABLE_NODE_MAX_BYTES,
    });
  }

  let fd;
  try {
    fd = fs.openSync(
      row.absolute_path,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
  } catch {
    hold("pr1464_portable_node_nofollow_open_failed", {
      path: row.absolute_path,
    });
  }

  try {
    const opened = fs.fstatSync(fd);
    if (
      !opened.isFile() ||
      opened.size !== row.size_bytes ||
      (opened.mode & 0o111) === 0
    ) {
      hold("pr1464_portable_node_identity_or_mode_invalid", {
        path: row.absolute_path,
      });
    }

    const header = Buffer.alloc(ELF64_HEADER_BYTES);
    if (
      fs.readSync(fd, header, 0, header.length, 0) !==
      header.length
    ) {
      hold("pr1464_portable_node_elf_header_read_failed", {
        path: row.absolute_path,
      });
    }

    if (
      header[0] !== 0x7f ||
      header[1] !== 0x45 ||
      header[2] !== 0x4c ||
      header[3] !== 0x46 ||
      header[4] !== 2 ||
      header[5] !== 1 ||
      header[6] !== 1
    ) {
      hold("pr1464_portable_node_elf_identity_invalid", {
        path: row.absolute_path,
      });
    }

    const elfType = header.readUInt16LE(16);
    const machine = header.readUInt16LE(18);
    const elfVersion = header.readUInt32LE(20);
    if (
      ![2, 3].includes(elfType) ||
      machine !== ELF_MACHINE_X86_64 ||
      elfVersion !== 1
    ) {
      hold("pr1464_portable_node_elf_platform_invalid", {
        path: row.absolute_path,
        elf_type: elfType,
        machine,
        elf_version: elfVersion,
      });
    }

    const programOffsetBig = header.readBigUInt64LE(32);
    const programEntrySize = header.readUInt16LE(54);
    const programCount = header.readUInt16LE(56);
    if (
      programOffsetBig > BigInt(Number.MAX_SAFE_INTEGER) ||
      programEntrySize !== ELF64_PROGRAM_HEADER_BYTES ||
      programCount < 1 ||
      programCount > 256
    ) {
      hold("pr1464_portable_node_program_header_contract_invalid", {
        path: row.absolute_path,
        program_entry_size: programEntrySize,
        program_count: programCount,
      });
    }

    const programOffset = Number(programOffsetBig);
    const programBytes =
      programEntrySize * programCount;
    if (
      programOffset < ELF64_HEADER_BYTES ||
      programOffset + programBytes > row.size_bytes ||
      programBytes > 256 * ELF64_PROGRAM_HEADER_BYTES
    ) {
      hold("pr1464_portable_node_program_header_bounds_invalid", {
        path: row.absolute_path,
      });
    }

    const programs = Buffer.alloc(programBytes);
    if (
      fs.readSync(
        fd,
        programs,
        0,
        programs.length,
        programOffset,
      ) !== programs.length
    ) {
      hold("pr1464_portable_node_program_header_read_failed", {
        path: row.absolute_path,
      });
    }

    let interpreter = null;
    for (let index = 0; index < programCount; index += 1) {
      const base = index * programEntrySize;
      if (programs.readUInt32LE(base) !== ELF_PT_INTERP) continue;
      if (interpreter !== null) {
        hold("pr1464_portable_node_multiple_interpreters", {
          path: row.absolute_path,
        });
      }

      const offsetBig = programs.readBigUInt64LE(base + 8);
      const sizeBig = programs.readBigUInt64LE(base + 32);
      if (
        offsetBig > BigInt(Number.MAX_SAFE_INTEGER) ||
        sizeBig < 2n ||
        sizeBig > 512n
      ) {
        hold("pr1464_portable_node_interpreter_bounds_invalid", {
          path: row.absolute_path,
        });
      }
      const offset = Number(offsetBig);
      const size = Number(sizeBig);
      if (offset + size > row.size_bytes) {
        hold("pr1464_portable_node_interpreter_bounds_invalid", {
          path: row.absolute_path,
        });
      }

      const bytes = Buffer.alloc(size);
      if (fs.readSync(fd, bytes, 0, size, offset) !== size) {
        hold("pr1464_portable_node_interpreter_read_failed", {
          path: row.absolute_path,
        });
      }
      if (bytes[bytes.length - 1] !== 0) {
        hold("pr1464_portable_node_interpreter_not_nul_terminated", {
          path: row.absolute_path,
        });
      }
      interpreter = bytes.subarray(0, -1).toString("utf8");
    }

    if (
      interpreter === null ||
      ![
        "/lib64/ld-linux-x86-64.so.2",
        "/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2",
      ].includes(interpreter)
    ) {
      hold("pr1464_portable_node_interpreter_invalid", {
        path: row.absolute_path,
        interpreter,
      });
    }

    const executableHasher = crypto.createHash("sha256");
    const hashBuffer = Buffer.alloc(PR1464_PORTABLE_NODE_HASH_CHUNK_BYTES);
    let hashOffset = 0;
    while (hashOffset < row.size_bytes) {
      const wanted = Math.min(
        hashBuffer.length,
        row.size_bytes - hashOffset,
      );
      const read = fs.readSync(
        fd,
        hashBuffer,
        0,
        wanted,
        hashOffset,
      );
      if (read !== wanted) {
        hold("pr1464_portable_node_identity_hash_read_failed", {
          path: row.absolute_path,
          offset: hashOffset,
          wanted_bytes: wanted,
          observed_bytes: read,
        });
      }
      executableHasher.update(hashBuffer.subarray(0, read));
      hashOffset += read;
    }
    const executableSha256 = executableHasher.digest("hex");
    if (executableSha256 !== expectedExecutableSha256) {
      hold("pr1464_portable_node_sha256_mismatch", {
        path: row.absolute_path,
        runtime_version: runtimeVersion,
        expected_sha256: expectedExecutableSha256,
        observed_sha256: executableSha256,
      });
    }

    return Object.freeze({
      ...row,
      classification: "VALIDATED_PR1464_PORTABLE_NODE_RUNTIME",
      runtime_version: runtimeVersion,
      platform: "linux-x64",
      elf_type: elfType,
      elf_machine: machine,
      interpreter,
      header_sha256: sha256Bytes(header),
      program_headers_sha256: sha256Bytes(programs),
      executable_sha256: executableSha256,
      identity_hash_full_file_read: true,
      payload_content_scanned: false,
      payload_content_printed: false,
    });
  } finally {
    fs.closeSync(fd);
  }
}

function validatePr1352Ext4SupportFixture(row) {
  if (path.basename(row.absolute_path) !== "support.ext4") return null;

  const parent = path.basename(path.dirname(row.absolute_path));
  if (!/^void-pr1352-ext4-restart-[a-z0-9]+$/.test(parent)) {
    return null;
  }

  if (row.size_bytes !== PR1352_EXT4_FIXTURE_BYTES) {
    hold("pr1352_ext4_fixture_size_mismatch", {
      path: row.absolute_path,
      observed_bytes: row.size_bytes,
      expected_bytes: PR1352_EXT4_FIXTURE_BYTES,
    });
  }

  let fd;
  try {
    fd = fs.openSync(
      row.absolute_path,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
  } catch {
    hold("pr1352_ext4_fixture_nofollow_open_failed", {
      path: row.absolute_path,
    });
  }

  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.size !== row.size_bytes) {
      hold("pr1352_ext4_fixture_identity_changed_during_open", {
        path: row.absolute_path,
      });
    }

    const superblock = Buffer.alloc(EXT4_SUPERBLOCK_BYTES);
    if (
      fs.readSync(
        fd,
        superblock,
        0,
        EXT4_SUPERBLOCK_BYTES,
        EXT4_SUPERBLOCK_OFFSET,
      ) !== EXT4_SUPERBLOCK_BYTES
    ) {
      hold("pr1352_ext4_fixture_superblock_read_failed", {
        path: row.absolute_path,
      });
    }

    const magic =
      superblock.readUInt16LE(EXT4_SUPERBLOCK_MAGIC_OFFSET);
    if (magic !== 0xef53) {
      hold("pr1352_ext4_fixture_magic_invalid", {
        path: row.absolute_path,
        observed_magic_hex: magic.toString(16).padStart(4, "0"),
      });
    }

    const logBlockSize = superblock.readUInt32LE(24);
    if (logBlockSize > 6) {
      hold("pr1352_ext4_fixture_block_size_invalid", {
        path: row.absolute_path,
        log_block_size: logBlockSize,
      });
    }
    const blockSize = 1024n << BigInt(logBlockSize);

    const blocksLow = BigInt(superblock.readUInt32LE(4));
    const incompat =
      superblock.readUInt32LE(EXT4_FEATURE_INCOMPAT_OFFSET);
    const has64Bit =
      (incompat & EXT4_FEATURE_INCOMPAT_64BIT) !== 0;
    const blocksHigh = has64Bit
      ? BigInt(superblock.readUInt32LE(EXT4_BLOCKS_COUNT_HI_OFFSET))
      : 0n;
    const blockCount = blocksLow + (blocksHigh << 32n);
    if (blockCount <= 0n) {
      hold("pr1352_ext4_fixture_block_count_invalid", {
        path: row.absolute_path,
      });
    }

    const declaredBytes = blockCount * blockSize;
    if (declaredBytes !== BigInt(row.size_bytes)) {
      hold("pr1352_ext4_fixture_filesystem_size_mismatch", {
        path: row.absolute_path,
        declared_bytes: declaredBytes.toString(),
        file_bytes: String(row.size_bytes),
      });
    }

    hold("pr1352_ext4_fixture_requires_bound_provenance", {
      path: row.absolute_path,
      size_bytes: row.size_bytes,
      filesystem_magic_hex: "ef53",
      block_size_bytes: blockSize.toString(),
      block_count: blockCount.toString(),
      superblock_sha256: sha256Bytes(superblock),
      payload_content_read: false,
    });
  } finally {
    fs.closeSync(fd);
  }
}

function validateLargeSafetensorsArtifact(row) {
  if (!row.absolute_path.toLowerCase().endsWith(".safetensors")) {
    hold("regular_file_above_content_scan_bound", {
      path: row.absolute_path,
      size_bytes: row.size_bytes,
      maximum_bytes: MAX_FILE_BYTES,
    });
  }
  if (row.size_bytes > MAX_SAFETENSORS_FILE_BYTES) {
    hold("safetensors_file_above_model_artifact_bound", {
      path: row.absolute_path,
      size_bytes: row.size_bytes,
      maximum_bytes: MAX_SAFETENSORS_FILE_BYTES,
    });
  }

  let fd;
  try {
    fd = fs.openSync(
      row.absolute_path,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
  } catch {
    hold("safetensors_nofollow_open_failed", { path: row.absolute_path });
  }

  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.size !== row.size_bytes) {
      hold("safetensors_identity_changed_during_open", {
        path: row.absolute_path,
      });
    }

    const prefix = Buffer.alloc(8);
    if (fs.readSync(fd, prefix, 0, 8, 0) !== 8) {
      hold("safetensors_header_length_read_failed", {
        path: row.absolute_path,
      });
    }
    const headerLengthBig = prefix.readBigUInt64LE(0);
    if (
      headerLengthBig < 2n ||
      headerLengthBig > BigInt(MAX_SAFETENSORS_HEADER_BYTES)
    ) {
      hold("safetensors_header_length_invalid", {
        path: row.absolute_path,
        header_length: headerLengthBig.toString(),
      });
    }
    const headerLength = Number(headerLengthBig);
    if (8 + headerLength > row.size_bytes) {
      hold("safetensors_header_out_of_bounds", {
        path: row.absolute_path,
      });
    }

    const headerBytes = Buffer.alloc(headerLength);
    if (fs.readSync(fd, headerBytes, 0, headerLength, 8) !== headerLength) {
      hold("safetensors_header_read_failed", {
        path: row.absolute_path,
      });
    }

    let header;
    try {
      header = JSON.parse(headerBytes.toString("utf8"));
    } catch {
      hold("safetensors_header_json_invalid", {
        path: row.absolute_path,
      });
    }
    if (!header || Array.isArray(header) || typeof header !== "object") {
      hold("safetensors_header_object_required", {
        path: row.absolute_path,
      });
    }

    const payloadBytes = row.size_bytes - 8 - headerLength;
    const intervals = [];
    let tensorCount = 0;
    for (const [name, value] of Object.entries(header)) {
      if (name === "__metadata__") {
        if (
          value !== null &&
          (!value || Array.isArray(value) || typeof value !== "object")
        ) {
          hold("safetensors_metadata_object_invalid", {
            path: row.absolute_path,
          });
        }
        if (
          value !== null &&
          Object.values(value).some((item) => typeof item !== "string")
        ) {
          hold("safetensors_metadata_value_invalid", {
            path: row.absolute_path,
          });
        }
        continue;
      }
      if (
        !value ||
        Array.isArray(value) ||
        typeof value !== "object" ||
        typeof value.dtype !== "string" ||
        !Array.isArray(value.shape) ||
        !Array.isArray(value.data_offsets) ||
        value.data_offsets.length !== 2
      ) {
        hold("safetensors_tensor_descriptor_invalid", {
          path: row.absolute_path,
          tensor: name,
        });
      }
      if (
        value.shape.some(
          (dimension) =>
            !Number.isSafeInteger(dimension) || dimension < 0,
        )
      ) {
        hold("safetensors_tensor_shape_invalid", {
          path: row.absolute_path,
          tensor: name,
        });
      }
      const dtypeBytes = SAFETENSORS_DTYPE_BYTES[value.dtype];
      if (!Number.isSafeInteger(dtypeBytes)) {
        hold("safetensors_tensor_dtype_unsupported", {
          path: row.absolute_path,
          tensor: name,
          dtype: value.dtype,
        });
      }
      const [start, end] = value.data_offsets;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        end < start ||
        end > payloadBytes
      ) {
        hold("safetensors_tensor_offsets_invalid", {
          path: row.absolute_path,
          tensor: name,
        });
      }
      let elementCount = 1n;
      for (const dimension of value.shape) {
        elementCount *= BigInt(dimension);
      }
      const expectedTensorBytes = elementCount * BigInt(dtypeBytes);
      if (BigInt(end - start) !== expectedTensorBytes) {
        hold("safetensors_tensor_byte_length_mismatch", {
          path: row.absolute_path,
          tensor: name,
          expected_bytes: expectedTensorBytes.toString(),
          observed_bytes: String(end - start),
        });
      }
      intervals.push([start, end]);
      tensorCount += 1;
    }
    if (tensorCount === 0) {
      hold("safetensors_tensor_set_empty", { path: row.absolute_path });
    }

    intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let cursor = 0;
    for (const [start, end] of intervals) {
      if (start !== cursor) {
        hold("safetensors_tensor_payload_not_contiguous", {
          path: row.absolute_path,
          expected_offset: cursor,
          observed_offset: start,
        });
      }
      cursor = end;
    }
    if (cursor !== payloadBytes) {
      hold("safetensors_tensor_payload_not_fully_described", {
        path: row.absolute_path,
        described_bytes: cursor,
        payload_bytes: payloadBytes,
      });
    }

    hold("safetensors_model_artifact_requires_bound_provenance", {
      path: row.absolute_path,
      size_bytes: row.size_bytes,
      tensor_count: tensorCount,
      header_bytes: headerLength,
      payload_bytes: payloadBytes,
      header_sha256: sha256Bytes(headerBytes),
      payload_content_read: false,
    });
  } finally {
    fs.closeSync(fd);
  }
}
function walkDepthSubtree(rootPath) {
  const root = path.resolve(rootPath);
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    hold("depth_subtree_not_direct_directory", { path: root });
  }
  const currentUid = uid();
  if (currentUid !== null && rootStat.uid !== currentUid) {
    hold("depth_subtree_owner_mismatch", { path: root });
  }
  const out = [];
  const generatedSkips = [];
  const visit = (dir, depth) => {
    if (depth > MAX_EXPANDED_DEPTH) {
      hold("expanded_depth_limit_exceeded", { path: dir, depth });
    }
    const names = fs.readdirSync(dir).sort();
    for (const name of names) {
      const child = path.join(dir, name);
      const stat = fs.lstatSync(child);
      if (stat.isSymbolicLink()) {
        hold("depth_subtree_symlink_requires_separate_review", { path: child });
      }
      if (currentUid !== null && stat.uid !== currentUid) {
        hold("depth_subtree_descendant_owner_mismatch", { path: child });
      }
      if (stat.isDirectory()) {
        if (GENERATED_DIR_NAMES.has(name.toLowerCase())) {
          generatedSkips.push(child);
          continue;
        }
        visit(child, depth + 1);
      } else if (stat.isFile()) {
        if (out.length >= MAX_DEPTH_EXPANDED_FILES) {
          hold("depth_expanded_file_count_exceeded");
        }
        out.push({
          absolute_path: child,
          path_sha256: sha256Text(child),
          size_bytes: stat.size,
          source: "depth_boundary_expansion",
        });
      } else {
        hold("depth_subtree_special_file_rejected", { path: child });
      }
    }
  };
  visit(root, 0);
  return { files: out, generatedSkips };
}
function validatePr1505RepositorySymlinkMetadata(row) {
  const linkPath = path.resolve(row.absolute_path);
  if (path.basename(linkPath) !== "prom-textfile-snap-age.sh") return null;

  const opsDir = path.dirname(linkPath);
  const worktreeDir = path.dirname(opsDir);
  const cacheDir = path.dirname(worktreeDir);
  if (
    path.basename(opsDir) !== "ops" ||
    path.basename(worktreeDir) !== "worktree" ||
    !PR1505_EXEC_DIGEST_CACHE_DIR.test(path.basename(cacheDir))
  ) {
    return null;
  }

  if (
    row.content_read !== false ||
    row.symlink_target_read !== false ||
    row.followed !== false ||
    row.path_sha256 !== sha256Text(row.absolute_path)
  ) {
    hold("pr1505_repository_symlink_census_contract_mismatch", {
      path: row.absolute_path,
    });
  }

  const before = fs.lstatSync(linkPath, { bigint: true });
  const currentUid = uid();
  if (
    !before.isSymbolicLink() ||
    (currentUid !== null && before.uid !== BigInt(currentUid))
  ) {
    hold("pr1505_repository_symlink_identity_invalid", {
      path: row.absolute_path,
    });
  }

  const target = fs.readlinkSync(linkPath, "utf8");
  const after = fs.lstatSync(linkPath, { bigint: true });
  const sameIdentity =
    before.dev === after.dev &&
    before.ino === after.ino &&
    before.mode === after.mode &&
    before.uid === after.uid &&
    before.gid === after.gid &&
    before.size === after.size &&
    before.mtimeNs === after.mtimeNs &&
    before.ctimeNs === after.ctimeNs;
  if (!after.isSymbolicLink() || !sameIdentity) {
    hold("pr1505_repository_symlink_changed_during_review", {
      path: row.absolute_path,
    });
  }

  const targetBytes = Buffer.from(target, "utf8");
  const gitBlob = gitBlobSha1(targetBytes);
  if (
    target !== PR1505_PROM_SYMLINK_TARGET ||
    Number(before.size) !== targetBytes.length ||
    row.size_bytes !== targetBytes.length ||
    gitBlob !== PR1505_PROM_SYMLINK_GIT_BLOB_SHA1
  ) {
    hold("pr1505_repository_symlink_target_identity_mismatch", {
      path: row.absolute_path,
      observed_size_bytes: targetBytes.length,
      observed_git_blob_sha1: gitBlob,
    });
  }

  return Object.freeze({
    symlink: linkPath,
    classification: "REVIEWED_PR1505_EXEC_DIGEST_CACHE_REPOSITORY_SYMLINK",
    cache_generation: path.basename(cacheDir).includes("-v2-") ? "v2" : "v3",
    target_sha256: sha256Bytes(targetBytes),
    target_git_blob_sha1: gitBlob,
    target_bytes: targetBytes.length,
    target_followed: false,
  });
}
function validateWarCollegeRuntimeVenvManifest(rootPath, manifestCache) {
  if (manifestCache.has(rootPath)) return manifestCache.get(rootPath);

  const manifestPath = path.join(rootPath, WAR_COLLEGE_RUNTIME_VENV_MANIFEST);
  const stat = fs.lstatSync(manifestPath);
  const currentUid = uid();
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size < 2 ||
    stat.size > WAR_COLLEGE_RUNTIME_VENV_MANIFEST_MAX_BYTES ||
    (currentUid !== null && stat.uid !== currentUid)
  ) {
    hold("war_college_runtime_venv_manifest_identity_invalid", {
      path: manifestPath,
    });
  }

  const bytes = fs.readFileSync(manifestPath);
  const value = JSON.parse(bytes.toString("utf8"));
  if (
    value?.marker !== "VOID_WAR_COLLEGE_RUNTIME_VENV_V1" ||
    value?.source_head !== WAR_COLLEGE_RUNTIME_VENV_SOURCE_HEAD ||
    value?.pyproject_blob !== WAR_COLLEGE_RUNTIME_VENV_PYPROJECT_BLOB ||
    JSON.stringify(value?.dependencies_requested) !==
      JSON.stringify(WAR_COLLEGE_RUNTIME_VENV_DEPENDENCIES) ||
    !Array.isArray(value?.pip_freeze) ||
    value.pip_freeze.some((row) => typeof row !== "string" || row.length > 4096) ||
    value?.sudo_used !== false ||
    value?.systemd_action !== false ||
    value?.runtime_execution !== false
  ) {
    hold("war_college_runtime_venv_manifest_contract_mismatch", {
      path: manifestPath,
    });
  }

  const result = Object.freeze({
    path: manifestPath,
    sha256: sha256Bytes(bytes),
    bytes: bytes.length,
  });
  manifestCache.set(rootPath, result);
  return result;
}
function validateWarCollegeRuntimeVenvSymlinkMetadata(row, manifestCache) {
  const linkPath = path.resolve(row.absolute_path);
  const segments = linkPath.split(path.sep);
  const rootIndex = segments.lastIndexOf(WAR_COLLEGE_RUNTIME_VENV_BASENAME);
  if (rootIndex < 0) return null;

  const rootPath = segments.slice(0, rootIndex + 1).join(path.sep) || path.sep;
  if (path.basename(path.dirname(rootPath)) !== "Downloads") return null;
  const relative = path.relative(rootPath, linkPath).split(path.sep).join("/");
  const expectedTarget = WAR_COLLEGE_RUNTIME_VENV_SYMLINK_TARGETS[relative];
  if (typeof expectedTarget !== "string") return null;

  if (
    row.content_read !== false ||
    row.symlink_target_read !== false ||
    row.followed !== false ||
    row.path_sha256 !== sha256Text(row.absolute_path)
  ) {
    hold("war_college_runtime_venv_symlink_census_contract_mismatch", {
      path: row.absolute_path,
    });
  }

  const rootStat = fs.lstatSync(rootPath);
  const currentUid = uid();
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    (currentUid !== null && rootStat.uid !== currentUid)
  ) {
    hold("war_college_runtime_venv_root_identity_invalid", {
      path: rootPath,
    });
  }

  for (const required of ["bin", "include", "lib"]) {
    const item = fs.lstatSync(path.join(rootPath, required));
    if (!item.isDirectory() || item.isSymbolicLink()) {
      hold("war_college_runtime_venv_required_directory_invalid", {
        path: path.join(rootPath, required),
      });
    }
  }

  const manifest = validateWarCollegeRuntimeVenvManifest(rootPath, manifestCache);

  const before = fs.lstatSync(linkPath, { bigint: true });
  if (
    !before.isSymbolicLink() ||
    (currentUid !== null && before.uid !== BigInt(currentUid))
  ) {
    hold("war_college_runtime_venv_symlink_identity_invalid", {
      path: row.absolute_path,
    });
  }

  const target = fs.readlinkSync(linkPath, "utf8");
  const after = fs.lstatSync(linkPath, { bigint: true });
  const sameIdentity =
    before.dev === after.dev &&
    before.ino === after.ino &&
    before.mode === after.mode &&
    before.uid === after.uid &&
    before.gid === after.gid &&
    before.size === after.size &&
    before.mtimeNs === after.mtimeNs &&
    before.ctimeNs === after.ctimeNs;
  if (!after.isSymbolicLink() || !sameIdentity) {
    hold("war_college_runtime_venv_symlink_changed_during_review", {
      path: row.absolute_path,
    });
  }

  const targetBytes = Buffer.from(target, "utf8");
  if (
    target !== expectedTarget ||
    Number(before.size) !== targetBytes.length ||
    row.size_bytes !== targetBytes.length
  ) {
    hold("war_college_runtime_venv_symlink_target_mismatch", {
      path: row.absolute_path,
      relative_path: relative,
      observed_target_sha256: sha256Bytes(targetBytes),
      observed_target_bytes: targetBytes.length,
    });
  }

  return Object.freeze({
    symlink: linkPath,
    classification: "REVIEWED_WAR_COLLEGE_RUNTIME_VENV_SYMLINK",
    relative_path: relative,
    target_sha256: sha256Bytes(targetBytes),
    target_bytes: targetBytes.length,
    manifest_sha256: manifest.sha256,
    target_followed: false,
  });
}
function resolveSymlinksInsideKnownFiles(symlinks, knownFilePaths) {
  const internal = [];
  const external = [];
  const broken = [];
  const reviewedRepositoryMetadata = [];
  const reviewedWarCollegeRuntimeVenv = [];
  const warCollegeManifestCache = new Map();
  for (const row of symlinks.values()) {
    const reviewed = validatePr1505RepositorySymlinkMetadata(row);
    if (reviewed !== null) {
      reviewedRepositoryMetadata.push(reviewed);
      continue;
    }

    const reviewedWarCollege =
      validateWarCollegeRuntimeVenvSymlinkMetadata(
        row,
        warCollegeManifestCache,
      );
    if (reviewedWarCollege !== null) {
      reviewedWarCollegeRuntimeVenv.push(reviewedWarCollege);
      continue;
    }

    let target;
    try {
      target = fs.realpathSync(row.absolute_path);
    } catch {
      broken.push(row.absolute_path);
      continue;
    }
    if (knownFilePaths.has(target)) {
      internal.push({ symlink: row.absolute_path, target });
    } else {
      external.push({ symlink: row.absolute_path, target });
    }
  }
  if (reviewedWarCollegeRuntimeVenv.length > 0) {
    const observed = reviewedWarCollegeRuntimeVenv
      .map((row) => row.relative_path)
      .sort();
    const expected = Object.keys(
      WAR_COLLEGE_RUNTIME_VENV_SYMLINK_TARGETS,
    ).sort();
    if (JSON.stringify(observed) !== JSON.stringify(expected)) {
      hold("war_college_runtime_venv_symlink_set_incomplete", {
        observed,
        expected,
      });
    }
  }

  return {
    internal,
    external,
    broken,
    reviewedRepositoryMetadata,
    reviewedWarCollegeRuntimeVenv,
  };
}
function rlpTotalLength(bytes, offset) {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  if (first <= 0x7f) return 1;
  if (first <= 0xb7) {
    const len = first - 0x80;
    return offset + 1 + len <= bytes.length ? 1 + len : null;
  }
  if (first <= 0xbf) {
    const lenOfLen = first - 0xb7;
    if (lenOfLen < 1 || lenOfLen > 6 || offset + 1 + lenOfLen > bytes.length) return null;
    let len = 0;
    for (let i = 0; i < lenOfLen; i += 1) len = len * 256 + bytes[offset + 1 + i];
    const total = 1 + lenOfLen + len;
    return offset + total <= bytes.length ? total : null;
  }
  if (first <= 0xf7) {
    const len = first - 0xc0;
    return offset + 1 + len <= bytes.length ? 1 + len : null;
  }
  const lenOfLen = first - 0xf7;
  if (lenOfLen < 1 || lenOfLen > 6 || offset + 1 + lenOfLen > bytes.length) return null;
  let len = 0;
  for (let i = 0; i < lenOfLen; i += 1) len = len * 256 + bytes[offset + 1 + i];
  const total = 1 + lenOfLen + len;
  return offset + total <= bytes.length ? total : null;
}
function classifyRawCandidate(rawHex, registry, nonceCandidate) {
  try {
    const tx = Transaction.from(rawHex);
    if (!tx.isSigned() || BigInt(tx.chainId) !== 2050n) return null;
  } catch {
    return null;
  }
  return inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
    rawTransaction: rawHex,
    registry,
    nonceCandidate,
  });
}
function asciiCandidates(bytes) {
  const text = bytes.toString("latin1");
  const matches = text.match(/0x[0-9a-fA-F]{160,}/g) ?? [];
  if (matches.length > MAX_ASCII_HEX_TOKENS_PER_FILE) {
    hold("ascii_hex_token_count_exceeded");
  }
  return [...new Set(matches)].filter((token) => {
    const byteLength = (token.length - 2) / 2;
    return (
      (token.length - 2) % 2 === 0 &&
      byteLength >= MIN_RAW_TRANSACTION_BYTES &&
      byteLength <= MAX_RAW_TRANSACTION_BYTES
    );
  });
}
function binaryCandidates(bytes) {
  const out = [];
  for (let offset = 0; offset < bytes.length; offset += 1) {
    const first = bytes[offset];
    let total = null;
    if (first >= 0xc0) {
      total = rlpTotalLength(bytes, offset);
    } else if ([1, 2, 3, 4].includes(first) && offset + 1 < bytes.length && bytes[offset + 1] >= 0xc0) {
      const payload = rlpTotalLength(bytes, offset + 1);
      if (payload !== null) total = 1 + payload;
    } else {
      continue;
    }
    if (
      total === null ||
      total < MIN_RAW_TRANSACTION_BYTES ||
      total > MAX_RAW_TRANSACTION_BYTES ||
      offset + total > bytes.length
    ) continue;
    out.push("0x" + bytes.subarray(offset, offset + total).toString("hex"));
    offset += total - 1;
  }
  return out;
}
function parseArgs(argv) {
  const out = { receiptDir: "", stamp: "", apply: false, confirmation: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--receipt-dir") out.receiptDir = argv[++i] ?? "";
    else if (key === "--stamp") out.stamp = argv[++i] ?? "";
    else if (key === "--apply") out.apply = true;
    else if (key === "--confirmation") out.confirmation = argv[++i] ?? "";
    else if (key === "--help") out.help = true;
    else hold("unknown_argument", { key });
  }
  return out;
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.apply) {
    console.log(JSON.stringify({
      marker: VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1,
      status: "PLAN_READY",
      receipt_bound_scope_only: true,
      scans_filename_hint_and_non_hint_regular_files: true,
      scans_ascii_and_binary_serialized_evm_transactions: true,
      private_key_or_secret_content_read: false,
      reviewed_sensitive_nonsecret_content_read_on_apply: true,
      sensitive_file_values_printed: false,
      generated_dependency_cache_content_read: false,
      validated_safetensors_tensor_payload_content_read: false,
      validated_pr1352_ext4_fixture_payload_content_read: false,
      validated_pr1464_portable_node_identity_hash_full_file_read_on_apply: true,
      validated_pr1464_portable_node_payload_content_scanned: false,
      validated_pr1464_portable_node_payload_content_printed: false,
      reviewed_pr1505_repository_symlink_target_metadata_read_on_apply: true,
      reviewed_pr1505_repository_symlink_target_followed: false,
      reviewed_war_college_runtime_venv_symlink_metadata_read_on_apply: true,
      reviewed_war_college_runtime_venv_symlink_target_followed: false,
      raw_transaction_printed: false,
      raw_transaction_persisted: false,
      required_confirmation:
        VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_CONFIRMATION_V1,
    }, null, 2));
    return;
  }
  if (
    args.confirmation !==
    VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_CONFIRMATION_V1
  ) hold("explicit_confirmation_required");

  const receiptFiles = safeReceiptFiles(args.receiptDir, args.stamp);
  const scope = collectReceiptScope(receiptFiles);

  const baseRows = [...scope.files.values()].map(validateRegularFile);
  const sensitiveBase = baseRows.filter((row) => sensitivePath(row.absolute_path));

  const expandedRows = [];
  const expandedGenerated = [];
  for (const row of scope.depth.values()) {
    const expanded = walkDepthSubtree(row.absolute_path);
    expandedRows.push(...expanded.files);
    expandedGenerated.push(...expanded.generatedSkips);
  }
  const validatedExpanded = expandedRows.map(validateRegularFile);
  const sensitiveExpanded = validatedExpanded.filter((row) =>
    sensitivePath(row.absolute_path)
  );
  const sensitive = [...sensitiveBase, ...sensitiveExpanded];
  const sensitiveReview = classifySensitiveRows(sensitive);
  // Generated C/C++ dependency source is non-secret source material and is
  // transaction-scanned normally. Path-shaped trust-root candidates HOLD above
  // until separately bound provenance exists, so no sensitive path is silently
  // removed from the receipt-bound content scan here.
  const generatedSensitivePaths = new Set();

  const allValidatedRows = [...baseRows, ...validatedExpanded];
  const modelArtifacts = [];
  const ext4Fixtures = [];
  const portableNodeRuntimes = [];
  const allRows = [];
  for (const row of allValidatedRows) {
    if (generatedSensitivePaths.has(row.absolute_path)) continue;
    if (row.size_bytes > MAX_FILE_BYTES) {
      const ext4Fixture = validatePr1352Ext4SupportFixture(row);
      if (ext4Fixture !== null) {
        ext4Fixtures.push(ext4Fixture);
        continue;
      }
      const portableNode =
        validatePr1464PortableNodeRuntime(row);
      if (portableNode !== null) {
        portableNodeRuntimes.push(portableNode);
        continue;
      }
      modelArtifacts.push(validateLargeSafetensorsArtifact(row));
    } else {
      allRows.push(row);
    }
  }

  const knownPaths = new Set(allValidatedRows.map((row) => row.absolute_path));
  if (knownPaths.size !== allValidatedRows.length) {
    hold("duplicate_path_after_depth_expansion");
  }

  const symlinkResolution = resolveSymlinksInsideKnownFiles(scope.symlinks, knownPaths);
  if (symlinkResolution.broken.length > 0) {
    hold("broken_symlink_requires_review", {
      count: symlinkResolution.broken.length,
      paths: symlinkResolution.broken,
    });
  }
  if (symlinkResolution.external.length > 0) {
    hold("external_symlink_target_requires_review", {
      count: symlinkResolution.external.length,
      rows: symlinkResolution.external,
    });
  }

  let totalBytes = 0;
  for (const row of allRows) {
    totalBytes += row.size_bytes;
    if (totalBytes > MAX_TOTAL_BYTES) {
      hold("content_scan_total_bytes_exceeded", {
        observed_bytes: totalBytes,
        maximum_bytes: MAX_TOTAL_BYTES,
      });
    }
  }

  const registry = readCanonicalJson(REGISTRY_PATH, REGISTRY_GIT_BLOB_SHA1);
  const nonceCandidate = readCanonicalJson(NONCE_PATH, NONCE_GIT_BLOB_SHA1);

  const manifestRows = [];
  const modelManifestRows = [];
  const discoveredByRawSha = new Map();
  let asciiHexTokenCount = 0;
  let binaryCandidateCount = 0;
  let modelHeaderHexTokenCount = 0;

  for (const row of allRows.sort((a, b) => a.absolute_path.localeCompare(b.absolute_path))) {
    const stat = fs.lstatSync(row.absolute_path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== row.size_bytes) {
      hold("file_changed_before_content_read", { path: row.absolute_path });
    }
    const bytes = fs.readFileSync(row.absolute_path);
    const fileSha = sha256Bytes(bytes);
    manifestRows.push(
      row.path_sha256 + "\t" + row.size_bytes + "\t" + fileSha + "\n",
    );

    const candidates = new Map();
    for (const token of asciiCandidates(bytes)) {
      asciiHexTokenCount += 1;
      candidates.set(sha256Text(token.toLowerCase()), token);
    }
    for (const token of binaryCandidates(bytes)) {
      binaryCandidateCount += 1;
      candidates.set(sha256Text(token.toLowerCase()), token);
    }

    for (const [rawSha, token] of candidates) {
      const inspected = classifyRawCandidate(token, registry, nonceCandidate);
      if (inspected === null) continue;
      if (!discoveredByRawSha.has(rawSha)) {
        discoveredByRawSha.set(rawSha, {
          raw_transaction_sha256: rawSha,
          raw_transaction_length: token.length,
          transaction_hash: inspected.transaction_hash,
          signer_address: inspected.signer_address,
          transaction_nonce: inspected.transaction_nonce,
          frozen_final_nonce: inspected.frozen_final_nonce,
          known_repository_lineage: inspected.known_repository_lineage,
          known_repository_lineage_id: inspected.known_repository_lineage_id,
          status: inspected.status,
          replay_staleness_proven: inspected.replay_staleness_proven,
          requires_operator_followup: inspected.requires_operator_followup,
          first_file_path_sha256: row.path_sha256,
          occurrence_count: 1,
        });
      } else {
        discoveredByRawSha.get(rawSha).occurrence_count += 1;
      }
    }
  }

  for (const row of modelArtifacts.sort((a, b) =>
    a.absolute_path.localeCompare(b.absolute_path)
  )) {
    modelManifestRows.push(
      row.path_sha256 + "\t" +
      row.size_bytes + "\t" +
      row.header_bytes + "\t" +
      row.payload_bytes + "\t" +
      row.tensor_count + "\t" +
      row.header_sha256 + "\n",
    );

    for (const token of asciiCandidates(row.header_content)) {
      modelHeaderHexTokenCount += 1;
      const rawSha = sha256Text(token.toLowerCase());
      const inspected = classifyRawCandidate(token, registry, nonceCandidate);
      if (inspected === null) continue;
      if (!discoveredByRawSha.has(rawSha)) {
        discoveredByRawSha.set(rawSha, {
          raw_transaction_sha256: rawSha,
          raw_transaction_length: token.length,
          transaction_hash: inspected.transaction_hash,
          signer_address: inspected.signer_address,
          transaction_nonce: inspected.transaction_nonce,
          frozen_final_nonce: inspected.frozen_final_nonce,
          known_repository_lineage: inspected.known_repository_lineage,
          known_repository_lineage_id: inspected.known_repository_lineage_id,
          status: inspected.status,
          replay_staleness_proven: inspected.replay_staleness_proven,
          requires_operator_followup: inspected.requires_operator_followup,
          first_file_path_sha256: row.path_sha256,
          occurrence_count: 1,
          occurrence_surface: "safetensors_header",
        });
      } else {
        discoveredByRawSha.get(rawSha).occurrence_count += 1;
      }
    }
  }

  const transactions = [...discoveredByRawSha.values()].sort((a, b) =>
    a.raw_transaction_sha256.localeCompare(b.raw_transaction_sha256)
  );
  const followup = transactions.filter((row) => row.requires_operator_followup);
  const stale = transactions.filter((row) => row.replay_staleness_proven);
  const generatedBasenameCounts = {};
  for (const row of scope.generated.values()) {
    generatedBasenameCounts[row.basename] =
      (generatedBasenameCounts[row.basename] ?? 0) + 1;
  }

  console.log(VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1);
  console.log("receipt_stamp=" + args.stamp);
  console.log("receipt_count=" + receiptFiles.length);
  console.log("receipt_regular_file_count=" + baseRows.length);
  console.log("depth_boundary_subtree_count=" + scope.depth.size);
  console.log("depth_expanded_file_count=" + validatedExpanded.length);
  console.log("generated_dependency_cache_subtree_count=" + scope.generated.size);
  console.log("generated_dependency_cache_basename_counts=" + JSON.stringify(generatedBasenameCounts));
  console.log("expanded_generated_dependency_cache_subtree_count=" + expandedGenerated.length);
  console.log("symlink_descendant_count=" + scope.symlinks.size);
  console.log("symlink_internal_alias_count=" + symlinkResolution.internal.length);
  console.log("reviewed_pr1505_repository_symlink_count=" +
    symlinkResolution.reviewedRepositoryMetadata.length);
  console.log("reviewed_pr1505_repository_symlink_target_bytes=" +
    symlinkResolution.reviewedRepositoryMetadata.reduce(
      (sum, row) => sum + row.target_bytes,
      0,
    ));
  console.log("reviewed_pr1505_repository_symlink_manifest_sha256=" +
    sha256Text(
      symlinkResolution.reviewedRepositoryMetadata
        .sort((a, b) => a.symlink.localeCompare(b.symlink))
        .map((row) =>
          sha256Text(row.symlink) + "\t" +
          row.cache_generation + "\t" +
          row.target_bytes + "\t" +
          row.target_git_blob_sha1 + "\t" +
          row.target_sha256 + "\n"
        )
        .join("")
    ));
  console.log("reviewed_pr1505_repository_symlink_target_followed=false");
  console.log("reviewed_war_college_runtime_venv_symlink_count=" +
    symlinkResolution.reviewedWarCollegeRuntimeVenv.length);
  console.log("reviewed_war_college_runtime_venv_symlink_target_bytes=" +
    symlinkResolution.reviewedWarCollegeRuntimeVenv.reduce(
      (sum, row) => sum + row.target_bytes,
      0,
    ));
  console.log("reviewed_war_college_runtime_venv_symlink_manifest_sha256=" +
    sha256Text(
      symlinkResolution.reviewedWarCollegeRuntimeVenv
        .sort((a, b) => a.symlink.localeCompare(b.symlink))
        .map((row) =>
          sha256Text(row.symlink) + "\t" +
          row.relative_path + "\t" +
          row.target_bytes + "\t" +
          row.target_sha256 + "\t" +
          row.manifest_sha256 + "\n"
        )
        .join("")
    ));
  console.log("reviewed_war_college_runtime_venv_symlink_target_followed=false");
  console.log("symlink_external_target_count=0");
  console.log("sensitive_path_count=" + sensitive.length);
  console.log("sensitive_public_pem_count=" + sensitiveReview.publicPem.length);
  console.log("sensitive_war_college_env_count=" + sensitiveReview.verifierEnv.length);
  console.log("sensitive_generated_dependency_source_count=" +
    sensitiveReview.generatedSource.length);
  console.log("sensitive_generated_trust_root_count=" +
    sensitiveReview.generatedTrustRoot.length);
  console.log("sensitive_unknown_path_count=0");
  console.log("sensitive_file_values_printed=false");
  console.log("private_key_or_secret_content_read=false");
  console.log("validated_pr1464_portable_node_runtime_count=" +
    portableNodeRuntimes.length);
  console.log("validated_pr1464_portable_node_runtime_bytes=" +
    portableNodeRuntimes.reduce((sum, row) => sum + row.size_bytes, 0));
  console.log("validated_pr1464_portable_node_runtime_versions=" +
    JSON.stringify(
      portableNodeRuntimes
        .map((row) => row.runtime_version)
        .sort()
    ));
  console.log("validated_pr1464_portable_node_manifest_sha256=" +
    sha256Text(
      portableNodeRuntimes
        .sort((a, b) => a.absolute_path.localeCompare(b.absolute_path))
        .map((row) =>
          row.path_sha256 + "\t" +
          row.size_bytes + "\t" +
          row.runtime_version + "\t" +
          row.interpreter + "\t" +
          row.header_sha256 + "\t" +
          row.program_headers_sha256 + "\t" +
          row.executable_sha256 + "\n"
        )
        .join("")
    ));
  console.log("pr1464_portable_node_identity_hash_full_file_read_count=" +
    portableNodeRuntimes.length);
  console.log("pr1464_portable_node_payload_content_scanned=false");
  console.log("pr1464_portable_node_payload_content_printed=false");
  console.log("validated_pr1352_ext4_support_fixture_count=" + ext4Fixtures.length);
  console.log("validated_pr1352_ext4_support_fixture_bytes=" +
    ext4Fixtures.reduce((sum, row) => sum + row.size_bytes, 0));
  console.log("validated_pr1352_ext4_superblock_manifest_sha256=" +
    sha256Text(
      ext4Fixtures
        .sort((a, b) => a.absolute_path.localeCompare(b.absolute_path))
        .map((row) =>
          row.path_sha256 + "\t" +
          row.size_bytes + "\t" +
          row.block_size_bytes + "\t" +
          row.block_count + "\t" +
          row.superblock_sha256 + "\n"
        )
        .join("")
    ));
  console.log("pr1352_ext4_fixture_payload_content_read=false");
  console.log("validated_safetensors_model_artifact_count=" + modelArtifacts.length);
  console.log("validated_safetensors_model_payload_bytes=" +
    modelArtifacts.reduce((sum, row) => sum + row.payload_bytes, 0));
  console.log("validated_safetensors_model_manifest_sha256=" +
    sha256Text(modelManifestRows.join("")));
  console.log("safetensors_tensor_payload_content_read=false");
  console.log("safetensors_header_hex_candidate_count=" + modelHeaderHexTokenCount);
  console.log("content_scanned_file_count=" + allRows.length);
  console.log("content_scanned_total_bytes=" + totalBytes);
  console.log("content_manifest_sha256=" + sha256Text(manifestRows.join("")));
  console.log("ascii_long_hex_candidate_count=" + asciiHexTokenCount);
  console.log("binary_rlp_candidate_count=" + binaryCandidateCount);
  console.log("signed_chain2050_transaction_count=" + transactions.length);
  console.log("stale_signed_chain2050_transaction_count=" + stale.length);
  console.log("requires_operator_followup_count=" + followup.length);
  console.log("signed_chain2050_transactions=" + JSON.stringify(transactions));
  console.log("generated_dependency_cache_content_read=false");
  console.log(
    "generated_sensitive_dependency_source_content_read=" +
      String(sensitiveReview.generatedSource.length > 0),
  );
  console.log("generated_sensitive_trust_root_content_read=false");
  console.log("pr1352_ext4_fixture_payload_content_read=false");
  console.log("pr1464_portable_node_identity_hash_full_file_read_count=" +
    portableNodeRuntimes.length);
  console.log("pr1464_portable_node_payload_content_scanned=false");
  console.log("pr1464_portable_node_payload_content_printed=false");
  console.log("private_key_or_secret_content_read=false");
  console.log("sensitive_file_values_printed=false");
  console.log("raw_transaction_printed=false");
  console.log("raw_transaction_persisted=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("full_receipt_bound_content_sweep_complete=true");
  console.log("pending_legacy_signed_transaction_census_complete=false");
  console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
  console.log("cross_epoch_replay_protection_proven=false");
  console.log(VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1 + "_GREEN");
}
try {
  main();
} catch (error) {
  const reason = error instanceof Hold
    ? error.reason
    : String(error?.reason || error?.message || error);
  const detail = error instanceof Hold && error.detail !== null
    ? " detail=" + JSON.stringify(error.detail)
    : "";
  console.error(
    VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1 +
      "_HOLD reason=" + reason + detail,
  );
  process.exitCode = 2;
}
