import crypto from "node:crypto";
import path from "node:path";
import {
  readBuyVoidCanonicalPresaleServerPolicyV1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";

export const VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_V1 =
  "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_V1";

export const VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_ENVS_V1 = {
  enabled: "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_ENABLED",
  request_dir: "VOID_BUY_REQUEST_DIR",
} as const;

export const VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_AUTHORITY_V1 = {
  source_only_contract: true,
  disabled_by_default: true,
  parent_economic_policy_required: true,
  server_controlled_pool_id: true,
  server_controlled_request_dir: true,
  caller_policy_input: false,
  runtime_route_mount: false,
  background_loop: false,
  startup_execution: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export type BuyVoidSagaTerminalCloseoutServerPolicyV1 = {
  marker: typeof VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_V1;
  version: 1;
  enabled: true;
  pool_id: string;
  request_dir: string;
  request_dir_fingerprint_sha256: string;
  parent_economic_policy_fingerprint_sha256: string;
  fingerprint_sha256: string;
};

export type BuyVoidSagaTerminalCloseoutServerPolicyDecisionV1 =
  | {
      ok: true;
      status: "configured";
      policy: BuyVoidSagaTerminalCloseoutServerPolicyV1;
    }
  | {
      ok: false;
      status: "held";
      reason: string;
      missing_envs: string[];
      detail?: Record<string, unknown>;
    };

function held(
  reason: string,
  missing_envs: string[] = [],
  detail?: Record<string, unknown>,
): Extract<BuyVoidSagaTerminalCloseoutServerPolicyDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    reason,
    missing_envs,
    ...(detail ? { detail } : {}),
  };
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(parts: Record<string, string>): string {
  return Object.keys(parts)
    .sort()
    .map((key) => `${key}=${parts[key]}`)
    .join("\n");
}

function normalizedRequestDir(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw || raw.includes("\0") || !path.isAbsolute(raw)) return "";
  const normalized = path.resolve(raw);
  return normalized === path.parse(normalized).root ? "" : normalized;
}

export function readBuyVoidSagaTerminalCloseoutServerPolicyV1(
  env: NodeJS.ProcessEnv = process.env,
): BuyVoidSagaTerminalCloseoutServerPolicyDecisionV1 {
  const enabledName =
    VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_ENVS_V1.enabled;
  const requestDirName =
    VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_ENVS_V1.request_dir;

  if (String(env[enabledName] || "").trim() !== "1") {
    return held("terminal_closeout_policy_disabled", [enabledName]);
  }

  const requestDir = normalizedRequestDir(env[requestDirName]);
  if (!requestDir) {
    return held("terminal_closeout_request_dir_not_configured", [requestDirName]);
  }

  const parent = readBuyVoidCanonicalPresaleServerPolicyV1(env);
  if (parent.ok !== true) {
    return held(
      `parent_economic_policy_held:${String(parent.reason || "unknown")}`,
      Array.isArray(parent.missing_envs) ? parent.missing_envs : [],
      "detail" in parent ? parent.detail : undefined,
    );
  }

  const poolId = String(parent.policy.inventory_policy.pool_id || "").trim();
  const parentFingerprint = String(
    parent.policy.fingerprints.combined_policy_sha256 || "",
  ).trim().toLowerCase();
  if (!SAFE_ID.test(poolId) || !SHA256.test(parentFingerprint)) {
    return held("terminal_closeout_parent_policy_binding_invalid");
  }

  const requestFingerprint = sha256(requestDir);
  const fingerprint = sha256(canonical({
    marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_V1,
    pool_id: poolId,
    request_dir_fingerprint_sha256: requestFingerprint,
    parent_economic_policy_fingerprint_sha256: parentFingerprint,
  }));

  return {
    ok: true,
    status: "configured",
    policy: {
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_V1,
      version: 1,
      enabled: true,
      pool_id: poolId,
      request_dir: requestDir,
      request_dir_fingerprint_sha256: requestFingerprint,
      parent_economic_policy_fingerprint_sha256: parentFingerprint,
      fingerprint_sha256: fingerprint,
    },
  };
}
