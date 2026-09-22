import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_V1 =
  "VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_V1";

export const VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_RUNTIME_ROOT_V1 =
  "/home/zoso/dev/void-node/data_a/buy_void_v1/runtime-integration-v1";
export const VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1 =
  "buy-void-presale-v1";
export const VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_MAX_DIRECTORY_ENTRIES_V1 =
  4096;
export const VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_MAX_RECORD_BYTES_V1 =
  1024 * 1024;

export const VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_AUTHORITY_V1 = {
  source_only_observer: true,
  designated_host_metadata_observation: true,
  canonical_runtime_root_fixed: true,
  canonical_pool_id_fixed: true,
  file_content_read: false,
  credential_content_read: false,
  wallet_access: false,
  signer_access: false,
  rpc_call: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  history_mutation: false,
  carrier_page_publication: false,
  carrier_root_mutation: false,
  service_action: false,
  inventory_mutation: false,
  treasury_or_liquidity_action: false,
  funds_movement: false,
} as const;

const HEX_JSON = /^[0-9a-f]{64}\.json$/u;
const HEX_DIRECTORY = /^[0-9a-f]{64}$/u;
const SAFE_DIRECTORY = /^[A-Za-z0-9._:-]{1,200}$/u;

type ScanKind = "hex_json" | "hex_directory" | "safe_directory";

export type BuyVoidProductionHistoryCarrierCensusDirectoryV1 = {
  label: string;
  relative_path: string;
  exists: boolean;
  entry_count: number;
  entry_set_sha256: string;
};

export type BuyVoidProductionHistoryCarrierCensusV1 = {
  marker: typeof VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_V1;
  version: 1;
  runtime_root: string;
  pool_id: string;
  pool_key_sha256: string;
  history_state: "empty" | "materialization_required";
  carrier_root_sha256: null;
  total_history_entries: number;
  directories: BuyVoidProductionHistoryCarrierCensusDirectoryV1[];
  file_content_read_performed: false;
  mutation_performed: false;
  authority:
    typeof VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_AUTHORITY_V1;
};

function fail(code: string, detail: string): never {
  throw new Error(
    VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_V1 +
      ":" +
      code +
      ":" +
      detail,
  );
}

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function requirePrivateDirectory(
  directoryInput: string,
  label: string,
): string {
  const directory = path.resolve(directoryInput);
  if (
    directory === path.parse(directory).root ||
    directory.includes("\0")
  ) {
    fail(label + "_ROOT_INVALID", directory);
  }

  const filesystemRoot = path.parse(directory).root;
  const relative = path.relative(filesystemRoot, directory);
  let current = filesystemRoot;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let metadata: fs.Stats;
    try {
      metadata = fs.lstatSync(current);
    } catch (error) {
      fail(
        label + "_PATH_COMPONENT_MISSING",
        current +
          ":" +
          String((error as Error)?.message || error).slice(0, 160),
      );
    }
    if (metadata.isSymbolicLink()) {
      fail(label + "_SYMLINK_COMPONENT_FORBIDDEN", current);
    }
  }

  const metadata = fs.lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    fail(label + "_DIRECTORY_INVALID", directory);
  }
  if (
    (metadata.mode & 0o077) !== 0 ||
    (
      typeof process.getuid === "function" &&
      metadata.uid !== process.getuid()
    )
  ) {
    fail(label + "_DIRECTORY_AUTHORITY_MISMATCH", directory);
  }
  return directory;
}

function existingDirectDirectory(
  runtimeRoot: string,
  relativePath: string,
  label: string,
): string | null {
  const target = path.resolve(runtimeRoot, relativePath);
  const relative = path.relative(runtimeRoot, target);
  if (
    !relative ||
    relative.startsWith(".." + path.sep) ||
    relative === ".." ||
    path.isAbsolute(relative)
  ) {
    fail(label + "_PATH_INVALID", relativePath);
  }

  let current = runtimeRoot;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let metadata: fs.Stats;
    try {
      metadata = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
      fail(
        label + "_PATH_COMPONENT_READ_FAILED",
        current +
          ":" +
          String((error as Error)?.message || error).slice(0, 160),
      );
    }
    if (metadata.isSymbolicLink()) {
      fail(label + "_SYMLINK_COMPONENT_FORBIDDEN", current);
    }
  }

  const metadata = fs.lstatSync(target);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    fail(label + "_DIRECTORY_INVALID", target);
  }
  if (
    (metadata.mode & 0o077) !== 0 ||
    (
      typeof process.getuid === "function" &&
      metadata.uid !== process.getuid()
    )
  ) {
    fail(label + "_DIRECTORY_AUTHORITY_MISMATCH", target);
  }
  return target;
}

function scanDirectory(input: {
  runtime_root: string;
  relative_path: string;
  label: string;
  kind: ScanKind;
}): BuyVoidProductionHistoryCarrierCensusDirectoryV1 {
  const directory = existingDirectDirectory(
    input.runtime_root,
    input.relative_path,
    input.label,
  );
  if (!directory) {
    return {
      label: input.label,
      relative_path: input.relative_path,
      exists: false,
      entry_count: 0,
      entry_set_sha256: sha256(""),
    };
  }

  const admitted: string[] = [];
  const handle = fs.opendirSync(directory);
  let count = 0;
  try {
    for (;;) {
      const entry = handle.readSync();
      if (!entry) break;
      count += 1;
      if (
        count >
        VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_MAX_DIRECTORY_ENTRIES_V1
      ) {
        fail(input.label + "_ENTRY_COUNT_EXCEEDED", String(count));
      }

      const fullPath = path.join(directory, entry.name);
      const metadata = fs.lstatSync(fullPath);
      if (metadata.isSymbolicLink()) {
        fail(input.label + "_SYMLINK_ENTRY_FORBIDDEN", entry.name);
      }

      if (input.kind === "hex_json") {
        if (
          !HEX_JSON.test(entry.name) ||
          !entry.isFile() ||
          !metadata.isFile() ||
          metadata.size < 1 ||
          metadata.size >
            VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_MAX_RECORD_BYTES_V1 ||
          metadata.nlink !== 1
        ) {
          fail(input.label + "_ENTRY_INVALID", entry.name);
        }
      } else {
        const pattern =
          input.kind === "hex_directory"
            ? HEX_DIRECTORY
            : SAFE_DIRECTORY;
        if (
          !pattern.test(entry.name) ||
          !entry.isDirectory() ||
          !metadata.isDirectory() ||
          (metadata.mode & 0o077) !== 0 ||
          (
            typeof process.getuid === "function" &&
            metadata.uid !== process.getuid()
          )
        ) {
          fail(input.label + "_ENTRY_INVALID", entry.name);
        }
      }

      admitted.push(
        entry.name +
          "\0" +
          String(metadata.size) +
          "\0" +
          String(metadata.mode & 0o777),
      );
    }
  } finally {
    handle.closeSync();
  }

  admitted.sort();
  return {
    label: input.label,
    relative_path: input.relative_path,
    exists: true,
    entry_count: admitted.length,
    entry_set_sha256: sha256(admitted.join("\n")),
  };
}

export function observeBuyVoidProductionHistoryCarrierCensusFromRootV1(input: {
  runtime_root: string;
  pool_id: string;
}): BuyVoidProductionHistoryCarrierCensusV1 {
  const runtimeRoot = requirePrivateDirectory(
    input.runtime_root,
    "RUNTIME",
  );
  const poolId = String(input.pool_id || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,160}$/u.test(poolId)) {
    fail("POOL_ID_INVALID", poolId || "empty");
  }
  const poolKey = sha256(
    "void-buy-inventory-pool-v1\n" + poolId,
  );

  const directories = [
    scanDirectory({
      runtime_root: runtimeRoot,
      relative_path: path.join(
        "buy-void-auto-fulfillment-v1",
        "payments",
      ),
      label: "PAYMENTS",
      kind: "hex_json",
    }),
    scanDirectory({
      runtime_root: runtimeRoot,
      relative_path: path.join(
        "buy-void-inventory-reservation-v1",
        "pools",
        poolKey,
        "reservations",
      ),
      label: "RESERVATIONS",
      kind: "hex_json",
    }),
    scanDirectory({
      runtime_root: runtimeRoot,
      relative_path: path.join(
        "buy-void-inventory-reservation-v1",
        "pools",
        poolKey,
        "holds",
      ),
      label: "OBLIGATIONS",
      kind: "hex_json",
    }),
    scanDirectory({
      runtime_root: runtimeRoot,
      relative_path: path.join(
        "buy-void-execution-attempts-v1",
        "attempts",
      ),
      label: "EXECUTION_ATTEMPTS",
      kind: "hex_directory",
    }),
    scanDirectory({
      runtime_root: runtimeRoot,
      relative_path: path.join(
        "inventory-consumption-v1",
        "records",
      ),
      label: "INVENTORY_CONSUMPTIONS",
      kind: "hex_json",
    }),
    scanDirectory({
      runtime_root: runtimeRoot,
      relative_path: path.join(
        "buy-void-saga-terminal-closeout-v1",
        "attempts",
      ),
      label: "TERMINAL_CLOSEOUT_PLANS",
      kind: "hex_directory",
    }),
    scanDirectory({
      runtime_root: runtimeRoot,
      relative_path: path.join(
        "buy-void-crash-consistent-saga-runtime-v1",
        "sagas",
      ),
      label: "FULFILLMENT_SAGAS",
      kind: "safe_directory",
    }),
  ];

  const totalHistoryEntries = directories.reduce(
    (sum, directory) => sum + directory.entry_count,
    0,
  );

  return {
    marker:
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_V1,
    version: 1,
    runtime_root: runtimeRoot,
    pool_id: poolId,
    pool_key_sha256: poolKey,
    history_state:
      totalHistoryEntries === 0
        ? "empty"
        : "materialization_required",
    carrier_root_sha256: null,
    total_history_entries: totalHistoryEntries,
    directories,
    file_content_read_performed: false,
    mutation_performed: false,
    authority:
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_AUTHORITY_V1,
  };
}

export function observeBuyVoidProductionHistoryCarrierCensusV1():
  BuyVoidProductionHistoryCarrierCensusV1 {
  return observeBuyVoidProductionHistoryCarrierCensusFromRootV1({
    runtime_root:
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_RUNTIME_ROOT_V1,
    pool_id:
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
  });
}
