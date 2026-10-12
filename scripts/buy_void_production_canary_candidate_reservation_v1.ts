export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1 =
  "VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1";

export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1 =
  "run_crash_consistent_saga_stage";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PARENT_RUNTIME_MARKER_V1 =
  "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1 =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1 =
  "/__void/operator/buy-void-runtime-v1/command";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_STATUS_ROUTE_V1 =
  "/__void/operator/buy-void-runtime-v1/status";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PORT_ENV_V1 =
  "VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_OPERATOR_PORT";

export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RETIREMENT_REASON_V1 =
  "candidate_reservation_retired_for_canonical_erc20_transition";

export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1 = {
  retired: true,
  retired_for_canonical_erc20_transition: true,
  canonical_delivery_asset: "void_token_erc20",
  request_id_only_business_selector: true,
  legacy_parent_runtime_action_reachable: false,
  legacy_parent_runtime_status_required: false,
  runtime_http_get: false,
  runtime_http_post: false,
  direct_journal_imports: false,
  claim_journal_write: false,
  allowed_apply_stages: [] as readonly string[],
  candidate_ready: false,
  recovery_reader_available: true,
  transaction_preparation: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_reservation: false,
  execution_attempt_reservation: false,
  inventory_decrement: false,
  public_fulfilled_closeout: false,
  service_start: false,
  service_restart: false,
  money_movement: false,
} as const;

const REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;

export type BuyVoidProductionCanaryCandidateCliArgsV1 = {
  request_id: string;
  apply: boolean;
  confirmation?: string;
  saga_confirmation?: string;
  action_confirmation?: string;
  delegated_confirmation?: string;
  policy_fingerprint_sha256?: string;
  expected_plan_fingerprint_sha256?: string;
};

export type BuyVoidProductionCanaryCandidateHttpGetV1 = (
  input: Readonly<{ url: string }>,
) => Promise<{ status: number; json: unknown }>;

export type BuyVoidProductionCanaryCandidateHttpPostV1 = (
  input: Readonly<{
    url: string;
    body: Readonly<Record<string, unknown>>;
  }>,
) => Promise<{ status: number; json: unknown }>;

export type BuyVoidProductionCanaryCandidateDecisionV1 = {
  marker: typeof VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1;
  version: 1;
  ok: false;
  status: "held";
  applied: false;
  request_id: string | null;
  reason: string;
  retired: true;
  canonical_delivery_asset: "void_token_erc20";
  legacy_parent_runtime_action_reachable: false;
  runtime_http_get_performed: false;
  runtime_http_post_performed: false;
  stage_transition_count: 0;
  transaction_preparation_performed: false;
  rpc_call_performed: false;
  credential_access_performed: false;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  inventory_reservation_performed: false;
  execution_attempt_reservation_performed: false;
  inventory_decrement_performed: false;
  public_fulfilled_closeout_performed: false;
  money_movement_performed: false;
  authority:
    typeof VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function held(
  requestId: string | null,
  reason: string,
): BuyVoidProductionCanaryCandidateDecisionV1 {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1,
    version: 1,
    ok: false,
    status: "held",
    applied: false,
    request_id: requestId,
    reason,
    retired: true,
    canonical_delivery_asset: "void_token_erc20",
    legacy_parent_runtime_action_reachable: false,
    runtime_http_get_performed: false,
    runtime_http_post_performed: false,
    stage_transition_count: 0,
    transaction_preparation_performed: false,
    rpc_call_performed: false,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    inventory_reservation_performed: false,
    execution_attempt_reservation_performed: false,
    inventory_decrement_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
    authority: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1,
  };
}

export function parseBuyVoidProductionCanaryCandidateArgsV1(
  argv: readonly string[],
): BuyVoidProductionCanaryCandidateCliArgsV1 {
  const result: BuyVoidProductionCanaryCandidateCliArgsV1 = {
    request_id: "",
    apply: false,
  };
  const values: Record<
    string,
    keyof BuyVoidProductionCanaryCandidateCliArgsV1
  > = {
    "--request-id": "request_id",
    "--confirm": "confirmation",
    "--saga-confirm": "saga_confirmation",
    "--action-confirm": "action_confirmation",
    "--delegated-confirm": "delegated_confirmation",
    "--policy-fingerprint-sha256": "policy_fingerprint_sha256",
    "--expected-plan-fingerprint-sha256":
      "expected_plan_fingerprint_sha256",
  };
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (seen.has(option)) throw new Error(`duplicate_option:${option}`);
    seen.add(option);
    if (option === "--apply") {
      result.apply = true;
      continue;
    }
    const field = values[option];
    if (!field) throw new Error(`unexpected_option:${option}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${option}_value_required`);
    }
    (result as any)[field] = value;
    index += 1;
  }
  result.request_id = text(result.request_id);
  if (!REQUEST_ID.test(result.request_id)) throw new Error("invalid_request_id");
  if (
    !result.apply &&
    [
      result.confirmation,
      result.saga_confirmation,
      result.action_confirmation,
      result.delegated_confirmation,
      result.policy_fingerprint_sha256,
      result.expected_plan_fingerprint_sha256,
    ].some((value) => value !== undefined)
  ) {
    throw new Error("apply_confirmation_without_apply");
  }
  return result;
}

function operatorPort(env: NodeJS.ProcessEnv): number {
  const raw = text(
    env[VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PORT_ENV_V1] || "4100",
  );
  if (!/^[0-9]+$/.test(raw)) throw new Error("invalid_operator_port");
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("invalid_operator_port");
  }
  return port;
}

export function buyVoidProductionCanaryCandidateCommandEndpointV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `http://127.0.0.1:${operatorPort(env)}` +
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1;
}

export function buyVoidProductionCanaryCandidateStatusEndpointV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `http://127.0.0.1:${operatorPort(env)}` +
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_STATUS_ROUTE_V1;
}

export async function defaultBuyVoidProductionCanaryCandidateHttpGetV1(
  _input: Readonly<{ url: string }>,
): Promise<{ status: number; json: unknown }> {
  return {
    status: 410,
    json: {
      marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1,
      ok: false,
      error: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RETIREMENT_REASON_V1,
    },
  };
}

export async function defaultBuyVoidProductionCanaryCandidateHttpPostV1(
  _input: Readonly<{
    url: string;
    body: Readonly<Record<string, unknown>>;
  }>,
): Promise<{ status: number; json: unknown }> {
  return {
    status: 410,
    json: {
      marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1,
      ok: false,
      error: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RETIREMENT_REASON_V1,
    },
  };
}

export async function planBuyVoidProductionCanaryCandidateReservationV1(
  input: Readonly<{
    request_id: string;
    command_endpoint?: string;
    status_endpoint?: string;
    http_get?: BuyVoidProductionCanaryCandidateHttpGetV1;
    http_post?: BuyVoidProductionCanaryCandidateHttpPostV1;
  }>,
): Promise<BuyVoidProductionCanaryCandidateDecisionV1> {
  const requestId = text(input?.request_id);
  if (!REQUEST_ID.test(requestId)) return held(null, "invalid_request_id");
  return held(
    requestId,
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RETIREMENT_REASON_V1,
  );
}

export async function runBuyVoidProductionCanaryCandidateReservationV1(
  input: Readonly<{
    args: BuyVoidProductionCanaryCandidateCliArgsV1;
    command_endpoint?: string;
    status_endpoint?: string;
    http_get?: BuyVoidProductionCanaryCandidateHttpGetV1;
    http_post?: BuyVoidProductionCanaryCandidateHttpPostV1;
  }>,
): Promise<BuyVoidProductionCanaryCandidateDecisionV1> {
  const requestId = text(input?.args?.request_id);
  if (!REQUEST_ID.test(requestId)) return held(null, "invalid_request_id");
  return held(
    requestId,
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RETIREMENT_REASON_V1,
  );
}

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/buy_void_production_canary_candidate_reservation_v1.ts --request-id <request-id>",
    "",
    "RETIRED: the legacy native-canary reservation lane is held during the",
    "canonical ERC-20 transition. This command performs no runtime HTTP call",
    "and cannot reserve inventory or an execution attempt.",
  ].join("\n");
}

async function main(): Promise<void> {
  try {
    const args = parseBuyVoidProductionCanaryCandidateArgsV1(
      process.argv.slice(2),
    );
    const decision = await runBuyVoidProductionCanaryCandidateReservationV1({
      args,
    });
    process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
    process.exitCode = 2;
  } catch (error) {
    process.stderr.write(
      `${usage()}\n${text((error as Error)?.message || error)}\n`,
    );
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  /(?:^|[\\/])buy_void_production_canary_candidate_reservation_v1\.ts$/.test(
    process.argv[1],
  )
) {
  void main();
}
