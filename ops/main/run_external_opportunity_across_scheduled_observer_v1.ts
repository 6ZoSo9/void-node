import {
  constants,
} from "node:fs";
import {
  access,
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  resolve,
} from "node:path";

import {
  ingestAcrossSwapApprovalQuoteV1,
} from "../../src/external_opportunity/across_swap_api_quote_ingestion_v1.js";
import {
  executeAcrossScheduledObserverRuntimeV1,
} from "../../src/external_opportunity/across_scheduled_observer_runtime_v1.js";

const STATE_FILE = "state-v1.json";
const PENDING_FILE = "pending-v1.json";
const LOCK_FILE = "runtime-v1.lock";
const RECORD_DIRECTORY = "records-v1";
const CREDENTIAL_NAME = "void-across-api-key";
const MAX_STATE_BYTES = 1_048_576;
const MAX_PENDING_BYTES = 2_097_152;
const MAX_RECORD_FILE_BYTES = 4_194_304;

type AcrossRuntimePublicConfigurationV1 = Readonly<{
  amount: string;
  input_token: string;
  output_token: string;
  origin_chain_id: number;
  destination_chain_id: number;
  depositor: string;
  integrator_id: string;
  app_fee: string;
  app_fee_recipient: string;
  capital_at_risk_usd: string;
  capital_lock_seconds: number;
  annual_capital_cost_bps: number;
  risk_haircut_bps: number;
  safety_buffer_usd: string;
  timeout_ms: number;
}>;

function hold(message: string): never {
  throw new Error(`HOLD: ${message}`);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];

  if (
    value === undefined ||
    value.length < 1 ||
    value.length > 2_048 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    hold(`required public environment differs: ${name}`);
  }

  return value;
}

function safeIntegerEnvironment(
  name: string,
  minimum: number,
  maximum: number,
): number {
  const text = requiredEnvironment(name);

  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    hold(`public integer environment differs: ${name}`);
  }

  const value = Number(text);

  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    hold(`public integer environment range differs: ${name}`);
  }

  return value;
}

function publicConfiguration(): AcrossRuntimePublicConfigurationV1 {
  return Object.freeze({
    amount: requiredEnvironment("VOID_ACROSS_AMOUNT"),
    input_token: requiredEnvironment("VOID_ACROSS_INPUT_TOKEN"),
    output_token: requiredEnvironment("VOID_ACROSS_OUTPUT_TOKEN"),
    origin_chain_id: safeIntegerEnvironment(
      "VOID_ACROSS_ORIGIN_CHAIN_ID",
      1,
      10_000_000,
    ),
    destination_chain_id: safeIntegerEnvironment(
      "VOID_ACROSS_DESTINATION_CHAIN_ID",
      1,
      10_000_000,
    ),
    depositor: requiredEnvironment("VOID_ACROSS_DEPOSITOR"),
    integrator_id: requiredEnvironment("VOID_ACROSS_INTEGRATOR_ID"),
    app_fee: requiredEnvironment("VOID_ACROSS_APP_FEE"),
    app_fee_recipient: requiredEnvironment(
      "VOID_ACROSS_APP_FEE_RECIPIENT",
    ),
    capital_at_risk_usd: requiredEnvironment(
      "VOID_ACROSS_CAPITAL_AT_RISK_USD",
    ),
    capital_lock_seconds: safeIntegerEnvironment(
      "VOID_ACROSS_CAPITAL_LOCK_SECONDS",
      1,
      31_536_000,
    ),
    annual_capital_cost_bps: safeIntegerEnvironment(
      "VOID_ACROSS_ANNUAL_CAPITAL_COST_BPS",
      0,
      1_000_000,
    ),
    risk_haircut_bps: safeIntegerEnvironment(
      "VOID_ACROSS_RISK_HAIRCUT_BPS",
      0,
      10_000,
    ),
    safety_buffer_usd: requiredEnvironment(
      "VOID_ACROSS_SAFETY_BUFFER_USD",
    ),
    timeout_ms: safeIntegerEnvironment(
      "VOID_ACROSS_TIMEOUT_MS",
      1_000,
      60_000,
    ),
  });
}

function stateDirectory(): string {
  const value = requiredEnvironment("STATE_DIRECTORY");

  if (
    value.includes(":") ||
    !isAbsolute(value) ||
    resolve(value) !== value ||
    basename(value) !==
      "void-external-opportunity-across-scheduled-observer-v1"
  ) {
    hold("STATE_DIRECTORY boundary differs");
  }

  return value;
}

async function secureDirectory(
  path: string,
  expectedMode: number,
): Promise<void> {
  const metadata = await lstat(path);

  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    metadata.uid !== process.getuid?.() ||
    (metadata.mode & 0o777) !== expectedMode
  ) {
    hold(`secure directory boundary differs: ${path}`);
  }
}

async function secureRegularFile(
  path: string,
  expectedMode: number,
): Promise<void> {
  const metadata = await lstat(path);

  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o777) !== expectedMode
  ) {
    hold(`secure file boundary differs: ${path}`);
  }
}

async function readOptionalText(
  path: string,
  maximumBytes: number,
): Promise<string | null> {
  try {
    await secureRegularFile(path, 0o600);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }

  const value = await readFile(path, "utf8");

  if (Buffer.byteLength(value, "utf8") > maximumBytes) {
    hold(`runtime file byte boundary differs: ${path}`);
  }

  return value;
}

async function fsyncDirectory(path: string): Promise<void> {
  const directory = await open(
    path,
    constants.O_RDONLY | constants.O_DIRECTORY,
  );

  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

async function atomicWrite(
  path: string,
  value: string,
): Promise<void> {
  const parent = dirname(path);
  const temporary = join(
    parent,
    `.${basename(path)}.tmp-${process.pid}-${Date.now()}`,
  );
  const handle = await open(
    temporary,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_WRONLY |
      constants.O_NOFOLLOW,
    0o600,
  );
  let renamed = false;

  try {
    await handle.writeFile(value, "utf8");
    await handle.sync();
    await handle.close();
    await rename(temporary, path);
    renamed = true;
    await fsyncDirectory(parent);
  } finally {
    if (!renamed) {
      await handle.close().catch(() => undefined);
      await unlink(temporary).catch(() => undefined);
    }
  }

  await secureRegularFile(path, 0o600);
}

async function removeFileAndSync(path: string): Promise<void> {
  try {
    await unlink(path);
    await fsyncDirectory(dirname(path));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }

    throw error;
  }
}

async function ensureRecordDirectory(path: string): Promise<void> {
  try {
    await mkdir(path, { mode: 0o700 });
    await fsyncDirectory(dirname(path));
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "EEXIST"
    ) {
      throw error;
    }
  }

  await secureDirectory(path, 0o700);
}

async function appendRecordIdempotent(
  recordDirectory: string,
  dayUtc: string,
  recordSha256: string,
  appendJsonl: string,
): Promise<"appended" | "already_present"> {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dayUtc)) {
    hold("record UTC day differs");
  }

  if (!/^[0-9a-f]{64}$/.test(recordSha256)) {
    hold("record SHA-256 differs");
  }

  if (
    !appendJsonl.endsWith("\n") ||
    appendJsonl.endsWith("\n\n") ||
    Buffer.byteLength(appendJsonl, "utf8") >
      MAX_PENDING_BYTES
  ) {
    hold("append JSONL boundary differs");
  }

  await ensureRecordDirectory(recordDirectory);

  const path = join(recordDirectory, `${dayUtc}.jsonl`);
  const existing = await readOptionalText(
    path,
    MAX_RECORD_FILE_BYTES,
  );

  if (existing !== null) {
    const lines = existing.split("\n");

    for (const line of lines) {
      if (line.length === 0) {
        continue;
      }

      let value: unknown;

      try {
        value = JSON.parse(line) as unknown;
      } catch {
        hold("existing record JSONL is malformed");
      }

      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        (value as Record<string, unknown>).record_sha256 ===
          recordSha256
      ) {
        return "already_present";
      }
    }
  }

  const handle = await open(
    path,
    constants.O_CREAT |
      constants.O_APPEND |
      constants.O_WRONLY |
      constants.O_NOFOLLOW,
    0o600,
  );

  try {
    await handle.writeFile(appendJsonl, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }

  await secureRegularFile(path, 0o600);
  await fsyncDirectory(recordDirectory);

  return "appended";
}

async function readApiKey(): Promise<string> {
  const directoryValue = requiredEnvironment(
    "CREDENTIALS_DIRECTORY",
  );

  if (
    directoryValue.includes(":") ||
    !isAbsolute(directoryValue) ||
    resolve(directoryValue) !== directoryValue
  ) {
    hold("CREDENTIALS_DIRECTORY boundary differs");
  }

  const directoryMetadata = await lstat(directoryValue);

  if (
    !directoryMetadata.isDirectory() ||
    directoryMetadata.isSymbolicLink()
  ) {
    hold("credential directory boundary differs");
  }

  const path = join(directoryValue, CREDENTIAL_NAME);
  const metadata = await lstat(path);

  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o007) !== 0 ||
    (metadata.mode & 0o222) !== 0
  ) {
    hold("credential file boundary differs");
  }

  await access(path, constants.R_OK);

  const value = await readFile(path, "utf8");

  if (
    value.length < 1 ||
    value.length > 1_024 ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    hold("Across API credential boundary differs");
  }

  return value;
}

async function acquireLock(path: string): Promise<() => Promise<void>> {
  let handle;

  try {
    handle = await open(
      path,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      hold("scheduled observer runtime lock already exists");
    }

    throw error;
  }

  await handle.writeFile(
    JSON.stringify({
      schema: "void-across-scheduled-observer-runtime-lock-v1",
      pid: process.pid,
      created_at: new Date().toISOString(),
    }) + "\n",
    "utf8",
  );
  await handle.sync();
  await handle.close();
  await fsyncDirectory(dirname(path));

  return async (): Promise<void> => {
    await removeFileAndSync(path);
  };
}

async function main(): Promise<void> {
  if (process.argv.length !== 2) {
    hold("runtime arguments differ");
  }

  const root = stateDirectory();
  const configuration = publicConfiguration();
  await secureDirectory(root, 0o700);

  const releaseLock = await acquireLock(join(root, LOCK_FILE));

  try {
    const result = await executeAcrossScheduledObserverRuntimeV1(
      Object.freeze({
        now: (): string => new Date().toISOString(),
        load_state_text: async (): Promise<string | null> =>
          readOptionalText(
            join(root, STATE_FILE),
            MAX_STATE_BYTES,
          ),
        persist_state_atomic: async (
          serialized: string,
        ): Promise<void> =>
          atomicWrite(join(root, STATE_FILE), serialized),
        load_pending_text: async (): Promise<string | null> =>
          readOptionalText(
            join(root, PENDING_FILE),
            MAX_PENDING_BYTES,
          ),
        persist_pending_atomic: async (
          serialized: string,
        ): Promise<void> =>
          atomicWrite(join(root, PENDING_FILE), serialized),
        remove_pending: async (): Promise<void> =>
          removeFileAndSync(join(root, PENDING_FILE)),
        append_record_idempotent: async (
          dayUtc: string,
          recordSha256: string,
          appendJsonl: string,
        ): Promise<"appended" | "already_present"> =>
          appendRecordIdempotent(
            join(root, RECORD_DIRECTORY),
            dayUtc,
            recordSha256,
            appendJsonl,
          ),
        read_api_key: readApiKey,
        ingest: async (apiKey: string) =>
          ingestAcrossSwapApprovalQuoteV1(
            Object.freeze({
              api_key: apiKey,
              query: Object.freeze({
                trade_type: "exactInput",
                amount: configuration.amount,
                input_token: configuration.input_token,
                output_token: configuration.output_token,
                origin_chain_id:
                  configuration.origin_chain_id,
                destination_chain_id:
                  configuration.destination_chain_id,
                depositor: configuration.depositor,
                integrator_id: configuration.integrator_id,
                app_fee: configuration.app_fee,
                app_fee_recipient:
                  configuration.app_fee_recipient,
              }),
              policy: Object.freeze({
                capital_at_risk_usd:
                  configuration.capital_at_risk_usd,
                capital_lock_seconds:
                  configuration.capital_lock_seconds,
                annual_capital_cost_bps:
                  configuration.annual_capital_cost_bps,
                risk_haircut_bps:
                  configuration.risk_haircut_bps,
                safety_buffer_usd:
                  configuration.safety_buffer_usd,
              }),
              timeout_ms: configuration.timeout_ms,
            }),
          ),
      }),
    );

    console.log(JSON.stringify(result));
    console.log(
      "VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_RUN_V1_EXACT_GREEN",
    );
  } finally {
    await releaseLock();
  }
}

void main().catch(() => {
  console.error("HOLD: scheduled observer runtime failed");
  process.exitCode = 78;
});
