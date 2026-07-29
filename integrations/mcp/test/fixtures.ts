import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import type {
  BridgeJson,
  PreparePaidWorkInput,
} from "../src/bridge.js";
import type { VoidMcpConfig } from "../src/config.js";
import {
  canonicalJson,
  sha256Text,
  type JsonValue,
} from "../src/json.js";
import type {
  CommandResult,
  CommandRunner,
  CommandSpec,
} from "../src/process.js";

const AUTHORITY_FALSE: BridgeJson = {
  provider_selected: false,
  quote_created: false,
  payment_authorized: false,
  work_execution_authorized: false,
  work_dispatched: false,
  wc_award_authorized: false,
  wc_ledger_write_authorized: false,
  wallet_or_signer_access: false,
  signing_authority: false,
  transaction_broadcast_authority: false,
  buy_void_fulfillment_authority: false,
};

export type FakeObservation = Readonly<{
  kind: string;
  directoryMode: number;
  inputMode: number;
}>;

export class FakeRunner implements CommandRunner {
  readonly specs: CommandSpec[] = [];
  readonly observations: FakeObservation[] = [];
  submitMode: "accepted" | "duplicate" | "conflict" = "accepted";

  async run(spec: CommandSpec): Promise<CommandResult> {
    this.specs.push(spec);
    if (
      spec.args.some((value) =>
        value.endsWith(
          "void-ai-agent-bootstrap-client-v1.mjs",
        )
      )
    ) {
      return this.#result({
        marker: "VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1",
        schema: "void_ai_agent_bootstrap_result_v1",
        version: 1,
        base_origin: "http://127.0.0.1:4100",
        readiness: {
          read_only_connection_ready: true,
          paid_work_execution_promised: false,
          work_credit_earning_promised: false,
        },
        safety: {
          http_methods_used: ["GET"],
          mutation_performed: false,
        },
      });
    }
    if (
      spec.args.some((value) =>
        value.endsWith(
          "public_agent_service_order_submission_v1.ts",
        )
      )
    ) {
      return await this.#materialize(spec);
    }
    if (
      spec.args.some((value) =>
        value.endsWith(
          "void-ai-agent-paid-work-client-v1.mjs",
        )
      )
      && spec.args.includes("probe")
    ) {
      return this.#result({
        marker: "VOID_AI_AGENT_PAID_WORK_CLIENT_V1",
        schema: "void_ai_agent_paid_work_client_result_v1",
        version: 1,
        mode: "probe",
        authority: AUTHORITY_FALSE,
        submission_route: {
          configured: true,
          request_body_sent: false,
          authorization_header_sent: false,
        },
      });
    }
    if (
      spec.args.some((value) =>
        value.endsWith(
          "void-ai-agent-paid-work-client-v1.mjs",
        )
      )
      && spec.args.includes("submit")
    ) {
      return await this.#submit(spec);
    }
    throw new Error(`unexpected fake command: ${spec.args.join(" ")}`);
  }

  #result(
    value: BridgeJson,
    exitCode = 0,
  ): CommandResult {
    return {
      exitCode,
      stdout: `${JSON.stringify(value)}\n`,
      stderr: "",
    };
  }

  async #materialize(
    spec: CommandSpec,
  ): Promise<CommandResult> {
    const modeIndex = spec.args.indexOf("materialize");
    const inputPath = spec.args[modeIndex + 1];
    const requestPath = spec.args[modeIndex + 2];
    if (!inputPath || !requestPath) {
      throw new Error("fake materializer paths missing");
    }
    const input = JSON.parse(
      await readFile(inputPath, "utf8"),
    ) as BridgeJson;
    const identityHash = sha256Text(canonicalJson(input));
    const workOrderId = `voidawo1_${identityHash}`;
    const submissionId =
      `voidawsr1_${sha256Text(`submission:${identityHash}`)}`;
    const request: BridgeJson = {
      marker: "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
      version: 1,
      submission_id: submissionId,
      work_order: {
        marker: "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
        version: 1,
        work_order_id: workOrderId,
        source_input_sha256: identityHash,
      },
    };
    await writeFile(
      requestPath,
      `${JSON.stringify(request, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    await chmod(requestPath, 0o600);

    const directoryMetadata = await stat(path.dirname(inputPath));
    const inputMetadata = await stat(inputPath);
    this.observations.push({
      kind: "materialize",
      directoryMode: directoryMetadata.mode & 0o777,
      inputMode: inputMetadata.mode & 0o777,
    });

    const requestSha = sha256Text(canonicalJson(request));
    return {
      exitCode: 0,
      stdout: [
        "route=/__void/agents/paid-work/submissions/v1",
        "service_id=void.datanet.fetch-verify.v1",
        "capability_id=datanet.fetch_verify",
        `work_order_id=${workOrderId}`,
        `submission_id=${submissionId}`,
        `request_sha256=${requestSha}`,
        `output=${requestPath}`,
        "http_submission=false",
        "credential_change=false",
        "provider_selection=false",
        "quote_generation=false",
        "payment_execution=false",
        "work_dispatch=false",
        "transaction_broadcast=false",
        "money_movement=false",
        "",
      ].join("\n"),
      stderr: "",
    };
  }

  async #submit(spec: CommandSpec): Promise<CommandResult> {
    const requestFlag = spec.args.indexOf("--request");
    const tokenFlag = spec.args.indexOf("--token-file");
    const requestPath = spec.args[requestFlag + 1];
    const tokenFile = spec.args[tokenFlag + 1];
    if (!requestPath || !tokenFile) {
      throw new Error("fake submit paths missing");
    }
    const raw = await readFile(requestPath);
    const request = JSON.parse(raw.toString("utf8")) as BridgeJson;
    const workOrder = request.work_order as BridgeJson;

    const directoryMetadata = await stat(path.dirname(requestPath));
    const requestMetadata = await stat(requestPath);
    this.observations.push({
      kind: "submit",
      directoryMode: directoryMetadata.mode & 0o777,
      inputMode: requestMetadata.mode & 0o777,
    });

    const conflict = this.submitMode === "conflict";
    const duplicate = this.submitMode === "duplicate";
    const value: BridgeJson = {
      marker: "VOID_AI_AGENT_PAID_WORK_CLIENT_V1",
      schema: "void_ai_agent_paid_work_client_result_v1",
      version: 1,
      mode: "submit",
      submission_id: String(request.submission_id),
      work_order_id: String(workOrder.work_order_id),
      request_sha256: sha256Text(raw),
      accepted_for_review: !conflict,
      duplicate,
      conflicting_duplicate: conflict,
      authority: AUTHORITY_FALSE,
      receipt_id:
        conflict
          ? null
          : `voidawsi1_${"c".repeat(64)}`,
    };
    return this.#result(value, conflict ? 3 : 0);
  }
}

function catalogWithoutFingerprint(): BridgeJson {
  return {
    catalog_id: "void.public-agent-services.v1",
    catalog_status: "descriptive_only",
    honesty: {
      automatic_payment_execution_available: false,
      credential_issuance: false,
      external_paid_work_execution_available: false,
      money_movement: false,
      runtime_mutation: false,
      service_mutation: false,
      signing: false,
      transaction_broadcast: false,
      wallet_access: false,
    },
    marker: "VOID_PUBLIC_AGENT_SERVICES_CATALOG_V1",
    schema: "void.public-agent-services-catalog.v1",
    services: [
      {
        availability: "contract_only",
        category: "verifiable_work",
        execution: {
          external_available: false,
          mode: "contract_only",
          mutation_authority: false,
        },
        interface: {
          kind: "work_type",
          method: null,
          path: "datanet_fetch_verify",
        },
        maturity: "contract_defined",
        pricing: {
          amount: null,
          currency: null,
          payment_execution_available: false,
          status: "not_published",
        },
        service_id: "void.datanet.fetch-verify.v1",
        verification: {
          deterministic_receipts: true,
        },
      },
    ],
    version: 1,
  };
}

export async function writeFixtureRepo(
  root: string,
): Promise<void> {
  const catalog = catalogWithoutFingerprint();
  const fingerprint = sha256Text(canonicalJson(catalog));
  const full: BridgeJson = {
    ...catalog,
    catalog_fingerprint_sha256: fingerprint,
  };
  const catalogPath = path.join(
    root,
    "ops/public/agent-services-v1/catalog.json",
  );
  await mkdir(path.dirname(catalogPath), {
    recursive: true,
    mode: 0o700,
  });
  await writeFile(
    catalogPath,
    `${JSON.stringify(full, null, 2)}\n`,
    "utf8",
  );
}

export function makeConfig(
  repoRoot: string,
  options: {
    allowSubmit?: boolean;
    tokenFile?: string | null;
  } = {},
): VoidMcpConfig {
  return Object.freeze({
    repoRoot,
    baseUrl: "http://127.0.0.1:4100/",
    allowSubmit: options.allowSubmit ?? false,
    tokenFile: options.tokenFile ?? null,
    timeoutMs: 10_000,
    maxResponseBytes: 1_048_576,
    nodeExecutable: process.execPath,
    tsxExecutable: path.join(repoRoot, "node_modules/.bin/tsx"),
  });
}

export const SAMPLE_INPUT: PreparePaidWorkInput = Object.freeze({
  service_id: "void.datanet.fetch-verify.v1",
  created_at_utc: "2026-07-28T20:00:00Z",
  expires_at_utc: "2026-07-28T21:00:00Z",
  requester_agent_id: "void-test-agent-v1",
  callback_uri: "https://agent.example/callback",
  objective: "Fetch and independently verify one bounded DataNet object.",
  input_refs: ["datanet://object/test-v1"],
  expected_outputs: ["verified_object", "verification_receipt"],
  quote_asset: "WC",
  max_total: "3",
  max_runtime_seconds: 300,
  max_output_bytes: 1_048_576,
  order_nonce: "order-nonce-v1",
  submission_nonce: "submission-nonce-v1",
});

export function jsonText(value: JsonValue): string {
  return JSON.stringify(value);
}
