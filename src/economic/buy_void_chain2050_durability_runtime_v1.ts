import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import express from "express";
import {
  readBuyVoidExecutionAttemptV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_AUTHORITY_V1,
  VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1,
  VoidBuyVoidChain2050DurabilityHoldV1,
  buyVoidChain2050DurabilityFingerprintV1,
  buyVoidChain2050DurabilityRootDirV1,
  inspectBuyVoidChain2050DurabilityV1,
  satisfyBuyVoidChain2050DurabilityDebtV1,
  type BuyVoidChain2050DurabilitySatisfactionV1,
} from "./buy_void_chain2050_durability_gate_v1.js";

export const VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1 =
  "VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1";
export const VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_CONFIRMATION_V1 =
  "buyVoidSealConfirmedChain2050Checkpoint";
export const VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_ROUTES_V1 = {
  status: "/__void/operator/buy-void-chain2050-durability-v1/status",
  command: "/__void/operator/buy-void-chain2050-durability-v1/command",
} as const;

export const VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  server_controlled_rpc_url: true,
  server_controlled_checkpoint_root: true,
  server_controlled_durability_root: true,
  server_controlled_buy_void_runtime_root: true,
  confirmed_execution_attempt_required: true,
  exact_confirmation_required_before_checkpoint_io: true,
  checkpoint_minimum_bound_to_confirmed_delivery_block: true,
  finalized_checkpoint_required_before_debt_satisfaction: true,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  service_restart: false,
  money_movement: false,
} as const;

const ENABLE_ENV = "VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_ENABLED";
const RPC_ENV = "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL";
const CHECKPOINT_ROOT_ENV = "VOID_PRIVATE_CHAIN2050_CHECKPOINT_ROOT";
const BUY_VOID_RUNTIME_ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR";
const GLOBAL_MARK = "__void_buy_void_chain2050_durability_runtime_v1";
const HASH = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const JSON_LIMIT = "8kb";
const MAX_CHECKPOINT_STDOUT_BYTES = 256 * 1024;
const execFileAsync = promisify(execFile);

export type BuyVoidChain2050CheckpointSummaryV1 = {
  marker: "VOID_PRIVATE_CHAIN2050_CHECKPOINT_V1";
  checkpoint_id_sha256: string;
  chain_id: 2050;
  block_number: number;
  block_hash: string;
};

export type BuyVoidChain2050CheckpointCaptureV1 = (input: {
  rpc_url: string;
  minimum_block_number: number;
  output_root?: string;
}) => Promise<BuyVoidChain2050CheckpointSummaryV1>;

export type BuyVoidChain2050DurabilityRuntimeDecisionV1 =
  | {
      ok: true;
      marker: typeof VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1;
      version: 1;
      status: "planned";
      applied: false;
      attempt_id: string;
      transaction_hash: string;
      delivery_block_number: string;
      required_confirmation:
        typeof VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_CONFIRMATION_V1;
      checkpoint_capture_performed: false;
      durability_debt_satisfied: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      marker: typeof VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1;
      version: 1;
      status: "checkpoint_satisfied";
      applied: true;
      attempt_id: string;
      transaction_hash: string;
      delivery_block_number: string;
      checkpoint: BuyVoidChain2050CheckpointSummaryV1;
      satisfaction: BuyVoidChain2050DurabilitySatisfactionV1;
      checkpoint_capture_performed: true;
      durability_debt_satisfied: true;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      marker: typeof VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1;
      version: 1;
      status: "held";
      stage:
        | "runtime_policy"
        | "durability_debt"
        | "confirmed_attempt"
        | "checkpoint_capture"
        | "debt_satisfaction";
      reason: string;
      attempt_id: string | null;
      transaction_hash: string | null;
      checkpoint_capture_performed: boolean;
      durability_debt_satisfied: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
    };

function enabled(): boolean {
  return String(process.env[ENABLE_ENV] || "").trim() === "1";
}

function rpcUrl(): string {
  const raw = String(process.env[RPC_ENV] || "").trim();
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "http:" ||
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      url.pathname !== "/" ||
      !["127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
    ) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function checkpointRoot(): string | undefined {
  const raw = String(process.env[CHECKPOINT_ROOT_ENV] || "").trim();
  return raw ? path.resolve(raw) : undefined;
}

function buyVoidRuntimeRootDirV1(): string {
  const configured = String(process.env[BUY_VOID_RUNTIME_ROOT_ENV] || "").trim();
  if (configured) return path.resolve(configured);
  const dataDir = String(
    process.env.VOID_DATA_DIR || process.env.DATA_DIR || "data_a",
  ).trim();
  return path.resolve(
    process.cwd(),
    dataDir,
    "buy_void_v1",
    "runtime-integration-v1",
  );
}

function safeAttemptId(value: unknown): string {
  const id = String(value || "").trim().toLowerCase();
  return SHA256.test(id) ? id : "";
}

function parsePositiveBlock(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function held(
  stage: Extract<BuyVoidChain2050DurabilityRuntimeDecisionV1, { ok: false }>["stage"],
  reason: string,
  options: {
    attempt_id?: string | null;
    transaction_hash?: string | null;
    checkpoint_capture_performed?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): BuyVoidChain2050DurabilityRuntimeDecisionV1 {
  return {
    ok: false,
    marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1,
    version: 1,
    status: "held",
    stage,
    reason,
    attempt_id: options.attempt_id ?? null,
    transaction_hash: options.transaction_hash ?? null,
    checkpoint_capture_performed:
      options.checkpoint_capture_performed === true,
    durability_debt_satisfied: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

export async function captureBuyVoidChain2050CheckpointViaToolV1(input: {
  rpc_url: string;
  minimum_block_number: number;
  output_root?: string;
}): Promise<BuyVoidChain2050CheckpointSummaryV1> {
  const tool = path.resolve(
    process.cwd(),
    "tools/void-private-chain2050-checkpoint-v1.mjs",
  );
  if (!fs.existsSync(tool)) throw new Error("chain2050_checkpoint_tool_missing");
  const args = [
    tool,
    "--rpc-url",
    input.rpc_url,
    "--minimum-block-number",
    String(input.minimum_block_number),
  ];
  if (input.output_root) {
    args.push("--output-root", input.output_root);
  }
  const result = await execFileAsync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: MAX_CHECKPOINT_STDOUT_BYTES,
    timeout: 60_000,
    env: process.env,
  });
  let parsed: any;
  try {
    parsed = JSON.parse(String(result.stdout || ""));
  } catch {
    throw new Error("chain2050_checkpoint_tool_output_invalid");
  }
  if (
    parsed?.marker !== "VOID_PRIVATE_CHAIN2050_CHECKPOINT_V1" ||
    typeof parsed.checkpoint_id_sha256 !== "string" ||
    !SHA256.test(parsed.checkpoint_id_sha256) ||
    Number(parsed.chain_id) !== 2050 ||
    !Number.isSafeInteger(Number(parsed.block_number)) ||
    Number(parsed.block_number) <= 0 ||
    typeof parsed.block_hash !== "string" ||
    !HASH.test(parsed.block_hash)
  ) {
    throw new Error("chain2050_checkpoint_tool_boundary_invalid");
  }
  return {
    marker: "VOID_PRIVATE_CHAIN2050_CHECKPOINT_V1",
    checkpoint_id_sha256: parsed.checkpoint_id_sha256,
    chain_id: 2050,
    block_number: Number(parsed.block_number),
    block_hash: parsed.block_hash,
  };
}

export async function runBuyVoidChain2050DurabilityRuntimeCommandV1(input: {
  attempt_id: unknown;
  apply?: boolean;
  confirmation?: unknown;
  durability_root_dir?: string;
  buy_void_runtime_root_dir?: string;
  checkpoint_capture?: BuyVoidChain2050CheckpointCaptureV1;
  now_ms?: number;
}): Promise<BuyVoidChain2050DurabilityRuntimeDecisionV1> {
  const attemptId = safeAttemptId(input.attempt_id);
  if (!attemptId) return held("runtime_policy", "invalid_attempt_id");
  const apply = input.apply === true;
  if (apply && !enabled() && !input.checkpoint_capture) {
    return held("runtime_policy", "chain2050_durability_runtime_disabled", {
      attempt_id: attemptId,
    });
  }
  if (
    apply &&
    String(input.confirmation || "") !==
      VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_CONFIRMATION_V1
  ) {
    return held("runtime_policy", "explicit_confirmation_required", {
      attempt_id: attemptId,
      detail: {
        required_confirmation:
          VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_CONFIRMATION_V1,
      },
    });
  }

  const durabilityRoot = input.durability_root_dir
    ? path.resolve(input.durability_root_dir)
    : buyVoidChain2050DurabilityRootDirV1();
  const runtimeRoot = input.buy_void_runtime_root_dir
    ? path.resolve(input.buy_void_runtime_root_dir)
    : buyVoidRuntimeRootDirV1();
  let durability;
  try {
    durability = inspectBuyVoidChain2050DurabilityV1(durabilityRoot);
  } catch (error) {
    return held(
      "durability_debt",
      error instanceof VoidBuyVoidChain2050DurabilityHoldV1
        ? error.reason
        : "chain2050_durability_state_read_failed",
      {
        attempt_id: attemptId,
        detail: error instanceof VoidBuyVoidChain2050DurabilityHoldV1
          ? error.detail
          : { error_class: String((error as Error)?.name || "Error").slice(0, 80) },
      },
    );
  }
  if (durability.unresolved_debt_count !== 1) {
    return held("durability_debt", "chain2050_unresolved_debt_count_invalid", {
      attempt_id: attemptId,
      detail: {
        unresolved_debt_count: durability.unresolved_debt_count,
        unresolved_transaction_hashes: durability.unresolved_transaction_hashes,
        preclaim_debt_count: durability.preclaim_debt_count,
      },
    });
  }

  let attempt;
  try {
    attempt = readBuyVoidExecutionAttemptV1({
      root_dir: runtimeRoot,
      attempt_id: attemptId,
    });
  } catch (error) {
    return held("confirmed_attempt", "execution_attempt_read_failed", {
      attempt_id: attemptId,
      detail: {
        error_class: String((error as Error)?.name || "Error").slice(0, 80),
      },
    });
  }
  if (!attempt || attempt.status !== "confirmed" || !attempt.confirmation) {
    return held("confirmed_attempt", "execution_attempt_not_confirmed", {
      attempt_id: attemptId,
    });
  }
  const confirmed = attempt.confirmation.confirmed_record;
  const transactionHash = String(confirmed.void_delivery_tx_hash || "").toLowerCase();
  const deliveryBlock = parsePositiveBlock(confirmed.delivery_block_number);
  if (
    confirmed.delivery_chain_id !== "2050" ||
    !HASH.test(transactionHash) ||
    deliveryBlock === null ||
    attempt.confirmation.void_delivery_tx_hash !== transactionHash ||
    !durability.unresolved_transaction_hashes.includes(transactionHash)
  ) {
    return held("confirmed_attempt", "confirmed_attempt_durability_binding_invalid", {
      attempt_id: attemptId,
      transaction_hash: HASH.test(transactionHash) ? transactionHash : null,
    });
  }

  if (!apply) {
    return {
      ok: true,
      marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1,
      version: 1,
      status: "planned",
      applied: false,
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      delivery_block_number: String(deliveryBlock),
      required_confirmation:
        VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_CONFIRMATION_V1,
      checkpoint_capture_performed: false,
      durability_debt_satisfied: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    };
  }

  const rpc = rpcUrl();
  if (!rpc && !input.checkpoint_capture) {
    return held("runtime_policy", "chain2050_rpc_policy_not_configured", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
    });
  }
  const capture = input.checkpoint_capture || captureBuyVoidChain2050CheckpointViaToolV1;
  let checkpoint: BuyVoidChain2050CheckpointSummaryV1;
  try {
    checkpoint = await capture({
      rpc_url: rpc || "http://127.0.0.1:8545/",
      minimum_block_number: deliveryBlock,
      output_root: checkpointRoot(),
    });
  } catch (error) {
    return held("checkpoint_capture", "chain2050_checkpoint_capture_failed", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      detail: {
        error_class: String((error as Error)?.name || "Error").slice(0, 80),
      },
    });
  }
  if (
    checkpoint.chain_id !== 2050 ||
    checkpoint.block_number < deliveryBlock ||
    !HASH.test(checkpoint.block_hash) ||
    !SHA256.test(checkpoint.checkpoint_id_sha256)
  ) {
    return held("checkpoint_capture", "chain2050_checkpoint_capture_boundary_invalid", {
      attempt_id: attemptId,
      transaction_hash: transactionHash,
      checkpoint_capture_performed: true,
    });
  }

  let satisfaction: BuyVoidChain2050DurabilitySatisfactionV1;
  try {
    satisfaction = satisfyBuyVoidChain2050DurabilityDebtV1({
      root_dir: durabilityRoot,
      transaction_hash: transactionHash,
      attempt_id: attemptId,
      delivery_block_number: String(deliveryBlock),
      checkpoint,
      now_ms: input.now_ms,
    });
  } catch (error) {
    return held(
      "debt_satisfaction",
      error instanceof VoidBuyVoidChain2050DurabilityHoldV1
        ? error.reason
        : "chain2050_durability_satisfaction_failed",
      {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        checkpoint_capture_performed: true,
        detail: error instanceof VoidBuyVoidChain2050DurabilityHoldV1
          ? error.detail
          : { error_class: String((error as Error)?.name || "Error").slice(0, 80) },
      },
    );
  }

  return {
    ok: true,
    marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1,
    version: 1,
    status: "checkpoint_satisfied",
    applied: true,
    attempt_id: attemptId,
    transaction_hash: transactionHash,
    delivery_block_number: String(deliveryBlock),
    checkpoint,
    satisfaction,
    checkpoint_capture_performed: true,
    durability_debt_satisfied: true,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

function loopbackOnly(req: any, res: any): boolean {
  const remote = String(
    req?.socket?.remoteAddress ?? req?.connection?.remoteAddress ?? "",
  ).trim();
  if (["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) {
    return true;
  }
  res.status(403).json({
    marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1,
    ok: false,
    error: "operator_loopback_only",
  });
  return false;
}

export function buyVoidChain2050DurabilityRuntimeStatusV1(): Record<string, unknown> {
  const rpc = rpcUrl();
  try {
    const state = inspectBuyVoidChain2050DurabilityV1();
    return {
      marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1,
      version: 1,
      ok: true,
      enabled: enabled(),
      enable_env: ENABLE_ENV,
      routes: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_ROUTES_V1,
      rpc_configured: Boolean(rpc),
      checkpoint_root_configured: Boolean(checkpointRoot()),
      buy_void_runtime_root: buyVoidRuntimeRootDirV1(),
      durability_root: state.root_dir,
      active_debt_transaction_hash: state.active_debt_transaction_hash,
      preclaim_debt_count: state.preclaim_debt_count,
      unresolved_debt_count: state.unresolved_debt_count,
      unresolved_transaction_hashes: state.unresolved_transaction_hashes,
      durability_state_fingerprint_sha256:
        buyVoidChain2050DurabilityFingerprintV1(state),
      required_confirmation:
        VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_CONFIRMATION_V1,
      gate_marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1,
      authority: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_AUTHORITY_V1,
      gate_authority: VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_AUTHORITY_V1,
    };
  } catch (error) {
    return {
      marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1,
      version: 1,
      ok: false,
      enabled: enabled(),
      status: "hold",
      reason: error instanceof VoidBuyVoidChain2050DurabilityHoldV1
        ? error.reason
        : "chain2050_durability_status_failed",
      authority: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_AUTHORITY_V1,
    };
  }
}

async function handleCommand(req: any, res: any): Promise<unknown> {
  if (!loopbackOnly(req, res)) return null;
  const body = req?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1,
      ok: false,
      error: "invalid_json_body",
    });
  }
  const allowed = new Set(["attempt_id", "apply", "confirmation"]);
  const unexpected = Object.keys(body).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_V1,
      ok: false,
      error: "unexpected_input_key",
      unexpected_keys: unexpected.sort(),
    });
  }
  const decision = await runBuyVoidChain2050DurabilityRuntimeCommandV1({
    attempt_id: (body as any).attempt_id,
    apply: (body as any).apply === true,
    confirmation: (body as any).confirmation,
  });
  let status = 200;
  if (decision.ok === false) {
    if (decision.reason === "explicit_confirmation_required") {
      status = 428;
    } else if (
      decision.stage === "checkpoint_capture" ||
      decision.stage === "debt_satisfaction"
    ) {
      status = 500;
    } else {
      status = 409;
    }
  }
  return res.status(status).json(decision);
}

function mount(): void {
  const state = globalThis as any;
  const app: any = state.__void_http_app || state.app;
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    setTimeout(mount, 250).unref?.();
    return;
  }
  if (state[GLOBAL_MARK]) return;
  state[GLOBAL_MARK] = true;
  app.get(
    VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_ROUTES_V1.status,
    (req: any, res: any) => {
      if (!loopbackOnly(req, res)) return;
      res.status(200).json(buyVoidChain2050DurabilityRuntimeStatusV1());
    },
  );
  app.post(
    VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_ROUTES_V1.command,
    express.json({ limit: JSON_LIMIT }),
    (req: any, res: any) => {
      void handleCommand(req, res);
    },
  );
}

mount();
