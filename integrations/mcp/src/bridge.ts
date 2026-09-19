import { chmod, lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { VoidMcpConfig } from "./config.js";
import {
  canonicalJson,
  isJsonObject,
  parseJsonObject,
  safeErrorMessage,
  sha256Text,
  type JsonValue,
} from "./json.js";
import {
  BoundedCommandRunner,
  cleanChildEnvironment,
  type CommandRunner,
  type CommandSpec,
} from "./process.js";

const SERVICE_ID = "void.datanet.fetch-verify.v1";
const CATALOG_RELATIVE =
  "ops/public/agent-services-v1/catalog.json";
const BOOTSTRAP_CLIENT_RELATIVE =
  "tools/void-ai-agent-bootstrap-client-v1.mjs";
const PAID_WORK_CLIENT_RELATIVE =
  "tools/void-ai-agent-paid-work-client-v1.mjs";
const MATERIALIZER_RELATIVE =
  "scripts/public_agent_service_order_submission_v1.ts";
const MAX_LOCAL_JSON_BYTES = 4 * 1024 * 1024;
const MAX_SUBMISSION_REQUEST_BYTES = 65_536;

const AUTHORITY_DENIED = Object.freeze({
  provider_selection: false,
  quote_generation: false,
  payment_execution: false,
  work_execution: false,
  work_dispatch: false,
  work_credit_award: false,
  work_credit_ledger_write: false,
  wallet_or_signer_access: false,
  signing: false,
  transaction_broadcast: false,
  buy_void_fulfillment: false,
  runtime_mutation: false,
  service_mutation: false,
});

export type PreparePaidWorkInput = Readonly<{
  service_id: typeof SERVICE_ID;
  created_at_utc: string;
  expires_at_utc: string;
  requester_agent_id: string;
  callback_uri: string;
  objective: string;
  input_refs: readonly string[];
  expected_outputs: readonly string[];
  quote_asset: string;
  max_total: string;
  max_runtime_seconds: number;
  max_output_bytes: number;
  order_nonce: string;
  submission_nonce: string;
}>;

export type SubmitPaidWorkInput = PreparePaidWorkInput & Readonly<{
  confirm: "submit-paid-work";
  expect_new: boolean;
}>;

export type BridgeJson = Record<string, JsonValue>;

export interface VoidMcpBridgeApi {
  bootstrapNetwork(): Promise<BridgeJson>;
  probePaidWork(): Promise<BridgeJson>;
  preparePaidWorkSubmission(
    input: PreparePaidWorkInput,
  ): Promise<BridgeJson>;
  submitPaidWork(
    input: SubmitPaidWorkInput,
  ): Promise<BridgeJson>;
  serviceCatalog(): Promise<BridgeJson>;
  capabilityStatus(): Promise<BridgeJson>;
}

type PreparedInternal = Readonly<{
  publicResult: BridgeJson;
  request: BridgeJson;
  canonicalRequest: string;
  requestSha256: string;
  workOrderId: string;
  submissionId: string;
}>;

type PrivateTempOutcome<T> = Readonly<{
  value: T;
  cleanupCompleted: boolean;
}>;

function requireString(
  value: JsonValue | undefined,
  label: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireBoolean(
  value: JsonValue | undefined,
  label: string,
): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function requireObject(
  value: JsonValue | undefined,
  label: string,
): BridgeJson {
  if (!isJsonObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function authorityAllFalse(value: JsonValue | undefined): boolean {
  if (!isJsonObject(value)) return false;
  const entries = Object.values(value);
  return entries.length > 0 && entries.every((entry) => entry === false);
}

function parseKeyValueOutput(text: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const separator = line.indexOf("=");
    if (separator < 1) {
      throw new Error("materializer returned malformed output");
    }
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);
    if (result.has(key)) {
      throw new Error(`materializer returned duplicate key: ${key}`);
    }
    result.set(key, value);
  }
  return result;
}

function subprocessEnvironment(): NodeJS.ProcessEnv {
  return cleanChildEnvironment();
}

async function requirePrivateRegularJson(
  file: string,
  maximumBytes: number,
  label: string,
): Promise<BridgeJson> {
  const metadata = await lstat(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
  if (metadata.size < 1 || metadata.size > maximumBytes) {
    throw new Error(`${label} size is outside bounds`);
  }
  if (process.platform !== "win32" && (metadata.mode & 0o077) !== 0) {
    throw new Error(`${label} must not grant group or other permissions`);
  }
  return parseJsonObject(await readFile(file, "utf8"), label);
}

async function removePrivateTempDirectory(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
}

async function withPrivateTempDirectory<T>(
  prefix: string,
  callback: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  await chmod(directory, 0o700);
  try {
    return await callback(directory);
  } finally {
    await removePrivateTempDirectory(directory);
  }
}

async function withPrivateTempDirectoryPreservingResult<T>(
  prefix: string,
  callback: (directory: string) => Promise<T>,
  cleanup: (directory: string) => Promise<void>,
): Promise<PrivateTempOutcome<T>> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  await chmod(directory, 0o700);
  let value: T;
  try {
    value = await callback(directory);
  } catch (error) {
    try {
      await cleanup(directory);
    } catch {
      // Preserve the primary pre-result failure rather than replacing it.
    }
    throw error;
  }
  try {
    await cleanup(directory);
    return Object.freeze({ value, cleanupCompleted: true });
  } catch {
    return Object.freeze({ value, cleanupCompleted: false });
  }
}

export class VoidMcpBridge implements VoidMcpBridgeApi {
  readonly #config: VoidMcpConfig;
  readonly #runner: CommandRunner;
  readonly #submissionTempDirectoryRemover: (
    directory: string,
  ) => Promise<void>;

  constructor(
    config: VoidMcpConfig,
    runner: CommandRunner = new BoundedCommandRunner(),
    submissionTempDirectoryRemover: (
      directory: string,
    ) => Promise<void> = removePrivateTempDirectory,
  ) {
    this.#config = config;
    this.#runner = runner;
    this.#submissionTempDirectoryRemover =
      submissionTempDirectoryRemover;
  }

  #path(relative: string): string {
    return path.join(this.#config.repoRoot, relative);
  }

  #spec(
    command: string,
    args: readonly string[],
    acceptedExitCodes: readonly number[] = [0],
  ): CommandSpec {
    return {
      command,
      args,
      cwd: this.#config.repoRoot,
      timeoutMs: this.#config.timeoutMs + 5_000,
      maxStdoutBytes: this.#config.maxResponseBytes,
      maxStderrBytes: 65_536,
      acceptedExitCodes,
      redactions:
        this.#config.tokenFile === null
          ? []
          : [this.#config.tokenFile],
      env: subprocessEnvironment(),
    };
  }

  async #runJson(
    command: string,
    args: readonly string[],
    label: string,
    acceptedExitCodes: readonly number[] = [0],
  ): Promise<BridgeJson> {
    try {
      const result = await this.#runner.run(
        this.#spec(command, args, acceptedExitCodes),
      );
      return parseJsonObject(result.stdout.trim(), label);
    } catch (error) {
      throw new Error(
        safeErrorMessage(
          error,
          this.#config.tokenFile === null
            ? []
            : [this.#config.tokenFile],
        ),
      );
    }
  }

  async #readCatalog(): Promise<BridgeJson> {
    const catalogPath = this.#path(CATALOG_RELATIVE);
    const metadata = await lstat(catalogPath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("VOID service catalog must be a regular file");
    }
    if (metadata.size < 1 || metadata.size > MAX_LOCAL_JSON_BYTES) {
      throw new Error("VOID service catalog size is outside bounds");
    }
    const catalog = parseJsonObject(
      await readFile(catalogPath, "utf8"),
      "VOID service catalog",
    );

    if (
      catalog.marker !== "VOID_PUBLIC_AGENT_SERVICES_CATALOG_V1"
      || catalog.schema !== "void.public-agent-services-catalog.v1"
      || catalog.catalog_id !== "void.public-agent-services.v1"
      || catalog.catalog_status !== "descriptive_only"
    ) {
      throw new Error("VOID service catalog identity or status mismatch");
    }

    const committedFingerprint = requireString(
      catalog.catalog_fingerprint_sha256,
      "catalog_fingerprint_sha256",
    );
    if (!/^[0-9a-f]{64}$/.test(committedFingerprint)) {
      throw new Error("catalog fingerprint must be lowercase SHA-256");
    }
    const fingerprintInput: BridgeJson = { ...catalog };
    delete fingerprintInput.catalog_fingerprint_sha256;
    if (
      sha256Text(canonicalJson(fingerprintInput))
      !== committedFingerprint
    ) {
      throw new Error("VOID service catalog fingerprint mismatch");
    }

    const honesty = requireObject(catalog.honesty, "catalog.honesty");
    for (const key of [
      "external_paid_work_execution_available",
      "automatic_payment_execution_available",
      "wallet_access",
      "credential_issuance",
      "signing",
      "transaction_broadcast",
      "money_movement",
      "runtime_mutation",
      "service_mutation",
    ]) {
      if (honesty[key] !== false) {
        throw new Error(`catalog authority must remain false: ${key}`);
      }
    }

    if (!Array.isArray(catalog.services)) {
      throw new Error("catalog.services must be an array");
    }
    const service = catalog.services.find(
      (candidate) =>
        isJsonObject(candidate)
        && candidate.service_id === SERVICE_ID,
    );
    if (!isJsonObject(service)) {
      throw new Error(`${SERVICE_ID} is absent from the catalog`);
    }
    if (
      service.category !== "verifiable_work"
      || service.maturity !== "contract_defined"
      || service.availability !== "contract_only"
    ) {
      throw new Error(`${SERVICE_ID} catalog boundary mismatch`);
    }
    const execution = requireObject(
      service.execution,
      "catalog service execution",
    );
    if (
      execution.external_available !== false
      || execution.mode !== "contract_only"
      || execution.mutation_authority !== false
    ) {
      throw new Error(`${SERVICE_ID} execution boundary mismatch`);
    }
    const pricing = requireObject(
      service.pricing,
      "catalog service pricing",
    );
    if (
      pricing.payment_execution_available !== false
      || pricing.amount !== null
      || pricing.currency !== null
    ) {
      throw new Error(`${SERVICE_ID} pricing boundary mismatch`);
    }
    return catalog;
  }

  async bootstrapNetwork(): Promise<BridgeJson> {
    const result = await this.#runJson(
      this.#config.nodeExecutable,
      [
        this.#path(BOOTSTRAP_CLIENT_RELATIVE),
        "--base-url",
        this.#config.baseUrl,
        "--timeout-ms",
        String(Math.min(this.#config.timeoutMs, 30_000)),
        "--max-bytes",
        String(this.#config.maxResponseBytes),
      ],
      "VOID bootstrap client",
    );
    return {
      marker: "VOID_AGENT_MCP_BOOTSTRAP_RESULT_V1",
      version: 1,
      source_client: "VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1",
      result,
      authority: { ...AUTHORITY_DENIED },
    };
  }

  async probePaidWork(): Promise<BridgeJson> {
    const result = await this.#runJson(
      this.#config.nodeExecutable,
      [
        this.#path(PAID_WORK_CLIENT_RELATIVE),
        "probe",
        "--base-url",
        this.#config.baseUrl,
        "--timeout-ms",
        String(this.#config.timeoutMs),
        "--max-response-bytes",
        String(this.#config.maxResponseBytes),
      ],
      "VOID paid-work probe",
    );
    if (!authorityAllFalse(result.authority)) {
      throw new Error("VOID paid-work probe granted forbidden authority");
    }
    return {
      marker: "VOID_AGENT_MCP_PAID_WORK_PROBE_RESULT_V1",
      version: 1,
      result,
      authority: { ...AUTHORITY_DENIED },
    };
  }

  async serviceCatalog(): Promise<BridgeJson> {
    return await this.#readCatalog();
  }

  async capabilityStatus(): Promise<BridgeJson> {
    const catalog = await this.#readCatalog();
    const honesty = requireObject(catalog.honesty, "catalog.honesty");
    return {
      marker: "VOID_AGENT_MCP_CAPABILITY_STATUS_V1",
      version: 1,
      connection_mode: "read_only_by_default",
      catalog_id: requireString(catalog.catalog_id, "catalog_id"),
      catalog_fingerprint_sha256: requireString(
        catalog.catalog_fingerprint_sha256,
        "catalog_fingerprint_sha256",
      ),
      catalog_status: requireString(
        catalog.catalog_status,
        "catalog_status",
      ),
      submission: {
        tool_registered: this.#config.allowSubmit,
        operator_gate: "VOID_MCP_ALLOW_SUBMIT=1",
        per_call_confirmation: "submit-paid-work",
        result_meaning: "accepted_for_review_only",
        token_configured: this.#config.tokenFile !== null,
      },
      capabilities: {
        automatic_payment:
          requireBoolean(
            honesty.automatic_payment_execution_available,
            "automatic payment honesty",
          ),
        external_paid_work_execution:
          requireBoolean(
            honesty.external_paid_work_execution_available,
            "external execution honesty",
          ),
        work_credit_earning_promised: false,
        wallet_access:
          requireBoolean(honesty.wallet_access, "wallet honesty"),
        credential_issuance:
          requireBoolean(
            honesty.credential_issuance,
            "credential honesty",
          ),
        signing:
          requireBoolean(honesty.signing, "signing honesty"),
        transaction_broadcast:
          requireBoolean(
            honesty.transaction_broadcast,
            "transaction honesty",
          ),
        money_movement:
          requireBoolean(
            honesty.money_movement,
            "money movement honesty",
          ),
        runtime_mutation:
          requireBoolean(
            honesty.runtime_mutation,
            "runtime mutation honesty",
          ),
        service_mutation:
          requireBoolean(
            honesty.service_mutation,
            "service mutation honesty",
          ),
      },
      authority: { ...AUTHORITY_DENIED },
    };
  }

  #materializerInput(
    input: PreparePaidWorkInput,
    catalog: BridgeJson,
  ): BridgeJson {
    if (input.service_id !== SERVICE_ID) {
      throw new Error(`service_id must be ${SERVICE_ID}`);
    }
    return {
      marker: "VOID_PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_V1",
      version: 1,
      submission_nonce: input.submission_nonce,
      order_request: {
        marker: "VOID_PUBLIC_AGENT_SERVICE_ORDER_REQUEST_V1",
        version: 1,
        catalog_id: requireString(catalog.catalog_id, "catalog_id"),
        catalog_fingerprint_sha256: requireString(
          catalog.catalog_fingerprint_sha256,
          "catalog_fingerprint_sha256",
        ),
        service_id: input.service_id,
        created_at_utc: input.created_at_utc,
        expires_at_utc: input.expires_at_utc,
        requester: {
          agent_id: input.requester_agent_id,
          callback_uri: input.callback_uri,
        },
        objective: input.objective,
        input_refs: [...input.input_refs],
        expected_outputs: [...input.expected_outputs],
        commercial: {
          quote_asset: input.quote_asset,
          max_total: input.max_total,
        },
        execution_limits: {
          max_runtime_seconds: input.max_runtime_seconds,
          max_output_bytes: input.max_output_bytes,
        },
        nonce: input.order_nonce,
      },
    };
  }

  async #prepareInternal(
    input: PreparePaidWorkInput,
  ): Promise<PreparedInternal> {
    const catalog = await this.#readCatalog();
    return await withPrivateTempDirectory(
      "void-agent-mcp-prepare-",
      async (directory) => {
        const inputPath = path.join(directory, "input.json");
        const requestPath = path.join(directory, "request.json");
        const materializerInput = this.#materializerInput(input, catalog);
        await writeFile(inputPath, canonicalJson(materializerInput), {
          encoding: "utf8",
          flag: "wx",
          mode: 0o600,
        });
        await chmod(inputPath, 0o600);

        const result = await this.#runner.run(
          this.#spec(
            this.#config.tsxExecutable,
            [
              this.#path(MATERIALIZER_RELATIVE),
              "materialize",
              inputPath,
              requestPath,
            ],
          ),
        );
        const output = parseKeyValueOutput(result.stdout);
        const request = await requirePrivateRegularJson(
          requestPath,
          MAX_SUBMISSION_REQUEST_BYTES,
          "materialized request",
        );
        if (
          request.marker
            !== "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1"
          || request.version !== 1
        ) {
          throw new Error("materialized request identity mismatch");
        }

        const submissionId = requireString(
          request.submission_id,
          "submission_id",
        );
        if (!/^voidawsr1_[0-9a-f]{64}$/.test(submissionId)) {
          throw new Error("materialized submission_id is invalid");
        }
        const workOrder = requireObject(
          request.work_order,
          "materialized work_order",
        );
        if (
          workOrder.marker !== "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1"
          || workOrder.version !== 1
        ) {
          throw new Error("materialized work_order identity mismatch");
        }
        const workOrderId = requireString(
          workOrder.work_order_id,
          "work_order_id",
        );
        if (!/^voidawo1_[0-9a-f]{64}$/.test(workOrderId)) {
          throw new Error("materialized work_order_id is invalid");
        }

        const canonicalRequest = canonicalJson(request);
        if (
          Buffer.byteLength(canonicalRequest, "utf8")
          > MAX_SUBMISSION_REQUEST_BYTES
        ) {
          throw new Error("materialized request exceeds submission limit");
        }
        const requestSha256 = sha256Text(canonicalRequest);
        const reportedSha = output.get("request_sha256");
        if (reportedSha !== requestSha256) {
          throw new Error("materializer request SHA-256 mismatch");
        }
        if (
          output.get("route")
            !== "/__void/agents/paid-work/submissions/v1"
          || output.get("service_id") !== SERVICE_ID
          || output.get("capability_id") !== "datanet.fetch_verify"
          || output.get("work_order_id") !== workOrderId
          || output.get("submission_id") !== submissionId
        ) {
          throw new Error("materializer metadata mismatch");
        }
        for (const key of [
          "http_submission",
          "credential_change",
          "provider_selection",
          "quote_generation",
          "payment_execution",
          "work_dispatch",
          "transaction_broadcast",
          "money_movement",
        ]) {
          if (output.get(key) !== "false") {
            throw new Error(`materializer authority mismatch: ${key}`);
          }
        }

        const publicResult: BridgeJson = {
          marker: "VOID_AGENT_MCP_PREPARED_SUBMISSION_V1",
          version: 1,
          route: "/__void/agents/paid-work/submissions/v1",
          service_id: SERVICE_ID,
          capability_id: "datanet.fetch_verify",
          catalog_fingerprint_sha256: requireString(
            catalog.catalog_fingerprint_sha256,
            "catalog_fingerprint_sha256",
          ),
          work_order_id: workOrderId,
          submission_id: submissionId,
          request_sha256: requestSha256,
          request,
          network_submission_performed: false,
          accepted_for_review: false,
          authority: { ...AUTHORITY_DENIED },
        };
        return {
          publicResult,
          request,
          canonicalRequest,
          requestSha256,
          workOrderId,
          submissionId,
        };
      },
    );
  }

  async preparePaidWorkSubmission(
    input: PreparePaidWorkInput,
  ): Promise<BridgeJson> {
    return (await this.#prepareInternal(input)).publicResult;
  }

  async submitPaidWork(
    input: SubmitPaidWorkInput,
  ): Promise<BridgeJson> {
    if (!this.#config.allowSubmit || this.#config.tokenFile === null) {
      throw new Error(
        "paid-work submission is disabled by the local operator",
      );
    }
    if (input.confirm !== "submit-paid-work") {
      throw new Error(
        'confirm must be exactly "submit-paid-work"',
      );
    }

    const prepared = await this.#prepareInternal(input);
    const submission = await withPrivateTempDirectoryPreservingResult(
      "void-agent-mcp-submit-",
      async (directory) => {
        const requestPath = path.join(directory, "request.json");
        await writeFile(requestPath, prepared.canonicalRequest, {
          encoding: "utf8",
          flag: "wx",
          mode: 0o600,
        });
        await chmod(requestPath, 0o600);

        const args = [
          this.#path(PAID_WORK_CLIENT_RELATIVE),
          "submit",
          "--base-url",
          this.#config.baseUrl,
          "--request",
          requestPath,
          "--token-file",
          this.#config.tokenFile!,
          "--timeout-ms",
          String(this.#config.timeoutMs),
          "--max-response-bytes",
          String(this.#config.maxResponseBytes),
        ];
        if (input.expect_new) args.push("--expect-new");

        const result = await this.#runJson(
          this.#config.nodeExecutable,
          args,
          "VOID paid-work submission client",
          [0, 3],
        );
        if (!authorityAllFalse(result.authority)) {
          throw new Error(
            "VOID paid-work submission result granted forbidden authority",
          );
        }
        if (
          result.submission_id !== prepared.submissionId
          || result.work_order_id !== prepared.workOrderId
          || result.request_sha256 !== prepared.requestSha256
        ) {
          throw new Error("paid-work submission result identity mismatch");
        }

        const acceptedForReview = requireBoolean(
          result.accepted_for_review,
          "accepted_for_review",
        );
        const duplicate = requireBoolean(
          result.duplicate,
          "duplicate",
        );
        const conflict = requireBoolean(
          result.conflicting_duplicate,
          "conflicting_duplicate",
        );
        if (conflict && (acceptedForReview || duplicate)) {
          throw new Error("conflicting duplicate result is inconsistent");
        }
        if (!conflict && !acceptedForReview) {
          throw new Error("submission was not accepted for review");
        }

        const output: BridgeJson = {
          marker: "VOID_AGENT_MCP_SUBMISSION_RESULT_V1",
          version: 1,
          prepared: prepared.publicResult,
          client_result: result,
          interpretation: {
            accepted_for_review: acceptedForReview,
            duplicate,
            conflicting_duplicate: conflict,
            payment_executed: false,
            paid_work_execution_started: false,
            work_dispatched: false,
            work_credit_awarded: false,
            work_credit_ledger_written: false,
            void_settled: false,
          },
          authority: { ...AUTHORITY_DENIED },
        };
        const serialized = canonicalJson(output);
        if (
          serialized.includes(this.#config.tokenFile!)
        ) {
          throw new Error("token file path disclosure blocked");
        }
        return output;
      },
      this.#submissionTempDirectoryRemover,
    );

    const interpretation = requireObject(
      submission.value.interpretation,
      "submission interpretation",
    );
    const output: BridgeJson = {
      ...submission.value,
      interpretation: {
        ...interpretation,
        private_temp_cleanup_completed: submission.cleanupCompleted,
      },
    };
    if (canonicalJson(output).includes(this.#config.tokenFile)) {
      throw new Error("token file path disclosure blocked");
    }
    return output;
  }
}
