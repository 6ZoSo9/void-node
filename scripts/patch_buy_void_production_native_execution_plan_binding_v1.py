#!/usr/bin/env python3
from pathlib import Path

RUNTIME = Path("src/economic/buy_void_native_execution_runtime_v1.ts")
RUNTIME_PROOF = Path("scripts/prove_buy_void_native_execution_runtime_v1.ts")
OPERATOR = Path("scripts/buy_void_production_native_execution_operator_v1.ts")
OPERATOR_PROOF = Path("scripts/prove_buy_void_production_native_execution_operator_v1.ts")
DOC = Path("docs/operators/buy-void-production-native-execution-operator-v1.md")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)

runtime = RUNTIME.read_text()

runtime = replace_once(
    runtime,
    '''  exact_confirmation_required_before_apply_io: true,\n  injected_dependencies_required_before_apply_io: true,''',
    '''  exact_confirmation_required_before_apply_io: true,\n  exact_policy_fingerprint_required_before_apply_planning: true,\n  exact_plan_fingerprint_required_before_signing: true,\n  injected_dependencies_required_before_apply_io: true,''',
    "runtime authority fingerprint flags",
)

runtime = replace_once(
    runtime,
    '''export type BuyVoidNativeExecutionRuntimeCommandV1 = {\n  attempt_id: string;\n  apply?: boolean;\n  confirmation?: unknown;\n  submission_idempotency_key?: unknown;\n  now_ms?: number;\n};''',
    '''export type BuyVoidNativeExecutionRuntimeCommandV1 = {\n  attempt_id: string;\n  apply?: boolean;\n  confirmation?: unknown;\n  submission_idempotency_key?: unknown;\n  expected_plan_fingerprint_sha256?: unknown;\n  policy_fingerprint_sha256?: unknown;\n  now_ms?: number;\n};''',
    "runtime command fingerprint fields",
)

runtime = replace_once(
    runtime,
    '''      attempt_id: string;\n      reconstructed_from_server_journals: true;\n      planner: BuyVoidNativeExecutionNonceFeePlanDecisionV1 & {''',
    '''      attempt_id: string;\n      reconstructed_from_server_journals: true;\n      plan_fingerprint_sha256: string;\n      runtime_policy_fingerprint_sha256: string;\n      planner: BuyVoidNativeExecutionNonceFeePlanDecisionV1 & {''',
    "runtime success decision fingerprint fields",
)

runtime = replace_once(
    runtime,
    '''function sha256Hex(value: string): string {\n  return crypto.createHash("sha256").update(value, "utf8").digest("hex");\n}\n\nfunction enabled(): boolean {''',
    '''function sha256Hex(value: string): string {\n  return crypto.createHash("sha256").update(value, "utf8").digest("hex");\n}\n\nfunction canonical(value: unknown): string {\n  if (value === null || typeof value !== "object") return JSON.stringify(value);\n  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;\n  const record = value as Record<string, unknown>;\n  return `{${Object.keys(record)\n    .sort()\n    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)\n    .join(",")}}`;\n}\n\nfunction buyVoidNativeExecutionRuntimePolicyFingerprintV1(\n  policy: BuyVoidNativeExecutionRuntimePolicyV1,\n): string {\n  return sha256Hex(\n    [\n      `root_dir=${policy.root_dir}`,\n      `pool_id=${policy.worker_policy.pool_id}`,\n      `fulfillment_wallet_address=${policy.worker_policy.fulfillment_wallet_address.toLowerCase()}`,\n      `max_void_amount_units=${policy.worker_policy.max_void_amount_units}`,\n      `gas_limit=${policy.planner_policy.gas_limit}`,\n      `max_gas_limit=${policy.worker_policy.max_gas_limit}`,\n      `max_fee_per_gas_wei=${policy.worker_policy.max_fee_per_gas_wei}`,\n      `max_priority_fee_per_gas_wei=${policy.worker_policy.max_priority_fee_per_gas_wei}`,\n      `fee_multiplier_bps=${policy.planner_policy.fee_multiplier_bps}`,\n      `rpc_url_fingerprint_sha256=${sha256Hex(policy.planner_policy.rpc_url)}`,\n    ].join("\\n"),\n  );\n}\n\nfunction buyVoidNativeExecutionPlanFingerprintV1(input: {\n  runtime_policy: BuyVoidNativeExecutionRuntimePolicyV1;\n  attempt_id: string;\n  reconstructed: ReconstructedV1;\n  planner: BuyVoidNativeExecutionNonceFeePlanDecisionV1 & {\n    ok: true;\n    status: "planned";\n  };\n  native_value_wei: bigint;\n}): string {\n  const planner = input.planner;\n  const plan = planner.transaction_plan;\n  return sha256Hex(canonical({\n    attempt_id: input.attempt_id,\n    inventory_reservation_id: input.reconstructed.bounded_plan.inventory_reservation_id,\n    bounded_execution_plan_id_sha256: input.reconstructed.bounded_plan.plan_id,\n    chain_id: "2050",\n    delivery_address: input.reconstructed.bounded_plan.delivery_address,\n    void_amount_units: input.reconstructed.bounded_plan.void_amount_units,\n    native_value_wei: input.native_value_wei.toString(),\n    nonce: plan.nonce,\n    gas_limit: String(plan.gas_limit),\n    max_fee_per_gas_wei: String(plan.max_fee_per_gas_wei),\n    max_priority_fee_per_gas_wei: String(plan.max_priority_fee_per_gas_wei),\n    wallet_address_fingerprint_sha256: planner.wallet_address_fingerprint_sha256,\n    rpc_url_fingerprint_sha256: planner.rpc_url_fingerprint_sha256,\n    observed_gas_price_wei: String(planner.observed_gas_price_wei),\n    estimated_max_transaction_cost_wei: String(planner.estimated_max_transaction_cost_wei),\n    observed_wallet_balance_wei: String(planner.observed_wallet_balance_wei),\n    rpc_methods_used: [...planner.rpc_methods_used],\n    runtime_policy_fingerprint_sha256:\n      buyVoidNativeExecutionRuntimePolicyFingerprintV1(input.runtime_policy),\n    required_confirmation: VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,\n  }));\n}\n\nfunction enabled(): boolean {''',
    "runtime canonical fingerprint helpers",
)

old_fingerprint = '''  const fingerprint = sha256Hex(\n    [\n      `root_dir=${rootDir}`,\n      `pool_id=${values.pool_id}`,\n      `fulfillment_wallet_address=${values.fulfillment_wallet_address.toLowerCase()}`,\n      `max_void_amount_units=${values.max_void_amount_units}`,\n      `gas_limit=${values.gas_limit}`,\n      `max_gas_limit=${values.max_gas_limit}`,\n      `max_fee_per_gas_wei=${values.max_fee_per_gas_wei}`,\n      `max_priority_fee_per_gas_wei=${values.max_priority_fee_per_gas_wei}`,\n      `fee_multiplier_bps=${values.fee_multiplier_bps}`,\n      `rpc_url_fingerprint_sha256=${sha256Hex(values.rpc_url)}`,\n    ].join("\\n"),\n  );\n\n  return {\n    configured: true,\n    policy: {\n      enabled: enabled(),\n      root_dir: rootDir,\n      worker_policy: workerPolicy,\n      execution_policy: executionPolicy,\n      planner_policy: plannerPolicy,\n    },\n    fingerprint_sha256: fingerprint,'''
new_fingerprint = '''  const policy: BuyVoidNativeExecutionRuntimePolicyV1 = {\n    enabled: enabled(),\n    root_dir: rootDir,\n    worker_policy: workerPolicy,\n    execution_policy: executionPolicy,\n    planner_policy: plannerPolicy,\n  };\n\n  return {\n    configured: true,\n    policy,\n    fingerprint_sha256:\n      buyVoidNativeExecutionRuntimePolicyFingerprintV1(policy),'''
runtime = replace_once(
    runtime,
    old_fingerprint,
    new_fingerprint,
    "runtime policy fingerprint reuse",
)

runtime = replace_once(
    runtime,
    '''  if (command.apply === true && !input.dependencies) {\n    return held("runtime_policy", {\n      reason: "native_execution_dependencies_required",\n      attempt_id: attemptId,\n    });\n  }\n\n  const reconstructed = reconstruct(''',
    '''  if (command.apply === true && !input.dependencies) {\n    return held("runtime_policy", {\n      reason: "native_execution_dependencies_required",\n      attempt_id: attemptId,\n    });\n  }\n\n  const runtimePolicyFingerprint =\n    buyVoidNativeExecutionRuntimePolicyFingerprintV1(runtimePolicy);\n  if (command.apply === true) {\n    const suppliedPolicyFingerprint = String(\n      command.policy_fingerprint_sha256 || "",\n    ).trim();\n    const suppliedPlanFingerprint = String(\n      command.expected_plan_fingerprint_sha256 || "",\n    ).trim();\n    if (!SHA256.test(suppliedPolicyFingerprint)) {\n      return held("runtime_policy", {\n        reason: "exact_policy_fingerprint_required",\n        attempt_id: attemptId,\n      });\n    }\n    if (suppliedPolicyFingerprint !== runtimePolicyFingerprint) {\n      return held("runtime_policy", {\n        reason: "native_execution_policy_fingerprint_mismatch",\n        attempt_id: attemptId,\n        detail: { required_policy_fingerprint_sha256: runtimePolicyFingerprint },\n      });\n    }\n    if (!SHA256.test(suppliedPlanFingerprint)) {\n      return held("runtime_policy", {\n        reason: "exact_plan_fingerprint_required",\n        attempt_id: attemptId,\n      });\n    }\n  }\n\n  const reconstructed = reconstruct(''',
    "runtime apply fingerprint precheck",
)

runtime = replace_once(
    runtime,
    '''  if ("reason" in planner) {\n    return held("nonce_fee_planning", {\n      reason: planner.reason,\n      attempt_id: attemptId,\n      planner,\n      detail: planner.detail,\n    });\n  }\n\n  const worker = await runBuyVoidNativeExecutionWorkerV1({''',
    '''  if ("reason" in planner) {\n    return held("nonce_fee_planning", {\n      reason: planner.reason,\n      attempt_id: attemptId,\n      planner,\n      detail: planner.detail,\n    });\n  }\n\n  const planFingerprint = buyVoidNativeExecutionPlanFingerprintV1({\n    runtime_policy: runtimePolicy,\n    attempt_id: attemptId,\n    reconstructed,\n    planner,\n    native_value_wei: nativeValue,\n  });\n  if (\n    command.apply === true &&\n    String(command.expected_plan_fingerprint_sha256 || "").trim() !==\n      planFingerprint\n  ) {\n    return held("nonce_fee_planning", {\n      reason: "native_execution_plan_fingerprint_mismatch",\n      attempt_id: attemptId,\n      planner,\n      detail: { required_plan_fingerprint_sha256: planFingerprint },\n    });\n  }\n\n  const worker = await runBuyVoidNativeExecutionWorkerV1({''',
    "runtime plan drift gate",
)

runtime = replace_once(
    runtime,
    '''    reconstructed_from_server_journals: true,\n    planner,\n    worker,''',
    '''    reconstructed_from_server_journals: true,\n    plan_fingerprint_sha256: planFingerprint,\n    runtime_policy_fingerprint_sha256: runtimePolicyFingerprint,\n    planner,\n    worker,''',
    "runtime success response fingerprints",
)

runtime = replace_once(
    runtime,
    '''    "attempt_id",\n    "apply",\n    "confirmation",\n    "submission_idempotency_key",\n  ]);''',
    '''    "attempt_id",\n    "apply",\n    "confirmation",\n    "submission_idempotency_key",\n    "expected_plan_fingerprint_sha256",\n    "policy_fingerprint_sha256",\n  ]);''',
    "runtime handler allowed fingerprint keys",
)

runtime = replace_once(
    runtime,
    '''      submission_idempotency_key:\n        (body as any).submission_idempotency_key,\n    },''',
    '''      submission_idempotency_key:\n        (body as any).submission_idempotency_key,\n      expected_plan_fingerprint_sha256:\n        (body as any).expected_plan_fingerprint_sha256,\n      policy_fingerprint_sha256:\n        (body as any).policy_fingerprint_sha256,\n    },''',
    "runtime handler forwards fingerprint keys",
)

RUNTIME.write_text(runtime)

operator = OPERATOR.read_text()
operator = replace_once(
    operator,
    '''  exact_plan_fingerprint_required: true,\n  exact_policy_fingerprint_required: true,''',
    '''  exact_plan_fingerprint_required: true,\n  exact_policy_fingerprint_required: true,\n  runtime_validates_exact_plan_fingerprint_before_signing: true,\n  runtime_validates_exact_policy_fingerprint_before_apply_planning: true,''',
    "operator authority server binding",
)
operator = replace_once(
    operator,
    '''type DryRuntimeV1 = {\n  plan_material: Record<string, unknown>;\n  public_plan: Record<string, unknown>;\n};''',
    '''type DryRuntimeV1 = {\n  plan_fingerprint_sha256: string;\n  public_plan: Record<string, unknown>;\n};''',
    "operator dry runtime type",
)
operator = replace_once(
    operator,
    '''    authority.exact_confirmation_required_before_apply_io !== true ||\n    authority.injected_dependencies_required_before_apply_io !== true ||''',
    '''    authority.exact_confirmation_required_before_apply_io !== true ||\n    authority.exact_policy_fingerprint_required_before_apply_planning !== true ||\n    authority.exact_plan_fingerprint_required_before_signing !== true ||\n    authority.injected_dependencies_required_before_apply_io !== true ||''',
    "operator status requires runtime binding authority",
)
operator = replace_once(
    operator,
    '''    runtime.raw_signed_transaction_persisted !== false ||\n    runtime.raw_signed_transaction_returned !== false ||\n    !planner ||''',
    '''    runtime.raw_signed_transaction_persisted !== false ||\n    runtime.raw_signed_transaction_returned !== false ||\n    !SHA256.test(text(runtime.plan_fingerprint_sha256)) ||\n    !SHA256.test(text(runtime.runtime_policy_fingerprint_sha256)) ||\n    text(runtime.runtime_policy_fingerprint_sha256) !==\n      status.policy_fingerprint_sha256 ||\n    !planner ||''',
    "operator dry response fingerprint boundary",
)
operator = replace_once(
    operator,
    '''  const planMaterial = {\n    ...publicPlan,\n    runtime_policy_fingerprint_sha256: status.policy_fingerprint_sha256,\n    required_confirmation: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,\n  };\n  return { plan_material: planMaterial, public_plan: publicPlan };''',
    '''  return {\n    plan_fingerprint_sha256: text(runtime.plan_fingerprint_sha256),\n    public_plan: publicPlan,\n  };''',
    "operator consumes server plan fingerprint",
)
operator = replace_once(
    operator,
    '''  const planFingerprint = sha256Hex(canonical(dry.plan_material));\n  return {''',
    '''  const planFingerprint = dry.plan_fingerprint_sha256;\n  return {''',
    "operator uses server plan fingerprint",
)
operator = replace_once(
    operator,
    '''    mutation_performed: false,\n    signing_performed: false,\n    transaction_broadcast_performed: false,\n    submission_may_have_occurred: true,''',
    '''    mutation_performed: null,\n    signing_performed: null,\n    transaction_broadcast_performed: null,\n    side_effect_state_known: false,\n    submission_may_have_occurred: true,''',
    "operator ambiguous apply truth",
)
operator = replace_once(
    operator,
    '''  const applyBody = {\n    attempt_id: attemptId,\n    apply: true,\n    confirmation: input.args.confirmation,\n    submission_idempotency_key: input.args.submission_idempotency_key,\n  } as const;''',
    '''  const applyBody = {\n    attempt_id: attemptId,\n    apply: true,\n    confirmation: input.args.confirmation,\n    submission_idempotency_key: input.args.submission_idempotency_key,\n    expected_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,\n    policy_fingerprint_sha256: plan.runtime_policy_fingerprint_sha256,\n  } as const;''',
    "operator apply body plan binding",
)
OPERATOR.write_text(operator)

runtime_proof = RUNTIME_PROOF.read_text()
runtime_proof = replace_once(
    runtime_proof,
    '''  assert.equal(dry.transaction_broadcast_performed, false);\n  assert.equal(dry.worker.status, "dry_run");''',
    '''  assert.equal(dry.transaction_broadcast_performed, false);\n  assert.match(dry.plan_fingerprint_sha256, /^[0-9a-f]{64}$/);\n  assert.match(dry.runtime_policy_fingerprint_sha256, /^[0-9a-f]{64}$/);\n  assert.equal(dry.worker.status, "dry_run");''',
    "runtime proof dry fingerprints",
)

runtime_proof = replace_once(
    runtime_proof,
    '''  let signerCalls = 0;\n  let broadcasterCalls = 0;\n  const appliedCalls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];''',
    '''  let driftSignerCalls = 0;\n  let driftBroadcasterCalls = 0;\n  const driftCalls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];\n  const driftTransport: BuyVoidNativeExecutionPlannerTransportV1 = async (call) => {\n    driftCalls.push({ ...call, params: [...call.params] });\n    const values: Record<string, string> = {\n      eth_chainId: "0x802",\n      eth_getTransactionCount: "0xa",\n      eth_gasPrice: "0x77359400",\n      eth_getBalance: "0x21e19e0c9bab2400000",\n    };\n    return {\n      ok: true,\n      result: values[call.method],\n      provider_submission_id: `runtime-drift-proof-${call.request_id}`,\n      http_status: 200,\n    };\n  };\n  const driftHeld = await runBuyVoidNativeExecutionRuntimeCommandV1({\n    runtime_policy: runtimePolicy(root),\n    command: {\n      attempt_id: reserved.attempt_id,\n      apply: true,\n      confirmation: VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,\n      submission_idempotency_key: hash("7"),\n      expected_plan_fingerprint_sha256: dry.plan_fingerprint_sha256,\n      policy_fingerprint_sha256: dry.runtime_policy_fingerprint_sha256,\n    },\n    dependencies: {\n      signer: {\n        async get_address() {\n          driftSignerCalls += 1;\n          return walletAddress;\n        },\n        async sign_transaction() {\n          driftSignerCalls += 1;\n          throw new Error("drift signer must not run");\n        },\n      },\n      broadcaster: {\n        async broadcast_signed_transaction() {\n          driftBroadcasterCalls += 1;\n          throw new Error("drift broadcaster must not run");\n        },\n      },\n    },\n    planner_transport: driftTransport,\n  });\n  assert.equal(driftHeld.ok, false);\n  if (!("reason" in driftHeld)) throw new Error("expected plan drift hold");\n  assert.equal(driftHeld.reason, "native_execution_plan_fingerprint_mismatch");\n  assert.equal(driftHeld.mutation_performed, false);\n  assert.equal(driftHeld.signing_performed, false);\n  assert.equal(driftHeld.transaction_broadcast_performed, false);\n  assert.equal(driftSignerCalls, 0);\n  assert.equal(driftBroadcasterCalls, 0);\n  assert.deepEqual(driftCalls.map((call) => call.method), [\n    "eth_chainId",\n    "eth_getTransactionCount",\n    "eth_gasPrice",\n    "eth_getBalance",\n  ]);\n\n  let signerCalls = 0;\n  let broadcasterCalls = 0;\n  const appliedCalls: BuyVoidNativeExecutionPlannerRpcCallV1[] = [];''',
    "runtime proof plan drift before signing",
)

runtime_proof = replace_once(
    runtime_proof,
    '''        submission_idempotency_key: hash("8"),\n        now_ms: 1_700_100_020_000,''',
    '''        submission_idempotency_key: hash("8"),\n        expected_plan_fingerprint_sha256: dry.plan_fingerprint_sha256,\n        policy_fingerprint_sha256: dry.runtime_policy_fingerprint_sha256,\n        now_ms: 1_700_100_020_000,''',
    "runtime proof accepted apply fingerprints",
)

runtime_proof = replace_once(
    runtime_proof,
    '''console.log("missing_dependencies_before_rpc=1");\nconsole.log("read_only_nonce_fee_planning=1");''',
    '''console.log("missing_dependencies_before_rpc=1");\nconsole.log("plan_fingerprint_drift_before_signing=held");\nconsole.log("plan_fingerprint_drift_signing=0");\nconsole.log("plan_fingerprint_drift_broadcast=0");\nconsole.log("read_only_nonce_fee_planning=1");''',
    "runtime proof output plan drift",
)
RUNTIME_PROOF.write_text(runtime_proof)

operator_proof = OPERATOR_PROOF.read_text()
operator_proof = replace_once(
    operator_proof,
    '''const BOUNDED_PLAN = "d".repeat(64);\nconst IDEMPOTENCY = "e".repeat(64);''',
    '''const BOUNDED_PLAN = "d".repeat(64);\nconst PLAN_FP = "7".repeat(64);\nconst IDEMPOTENCY = "e".repeat(64);''',
    "operator proof plan fingerprint constant",
)
operator_proof = replace_once(
    operator_proof,
    '''    exact_confirmation_required_before_apply_io: true,\n    injected_dependencies_required_before_apply_io: true,''',
    '''    exact_confirmation_required_before_apply_io: true,\n    exact_policy_fingerprint_required_before_apply_planning: true,\n    exact_plan_fingerprint_required_before_signing: true,\n    injected_dependencies_required_before_apply_io: true,''',
    "operator proof runtime authority flags",
)
operator_proof = replace_once(
    operator_proof,
    '''    status: "dry_run",\n    attempt_id: ATTEMPT,\n    reconstructed_from_server_journals: true,''',
    '''    status: "dry_run",\n    attempt_id: ATTEMPT,\n    reconstructed_from_server_journals: true,\n    plan_fingerprint_sha256: PLAN_FP,\n    runtime_policy_fingerprint_sha256: POLICY_FP,''',
    "operator proof dry runtime fingerprints",
)
operator_proof = replace_once(
    operator_proof,
    '''assert.equal(planned.runtime_policy_fingerprint_sha256, POLICY_FP);\nassert.equal(planned.rpc_url_fingerprint_sha256, RPC_FP);''',
    '''assert.equal(planned.runtime_policy_fingerprint_sha256, POLICY_FP);\nassert.equal(planned.plan_fingerprint_sha256, PLAN_FP);\nassert.equal(planned.rpc_url_fingerprint_sha256, RPC_FP);''',
    "operator proof planned server fingerprint",
)
operator_proof = replace_once(
    operator_proof,
    '''assert.deepEqual(acceptedIo.posts[1].body, {\n  attempt_id: ATTEMPT,\n  apply: true,\n  confirmation: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,\n  submission_idempotency_key: IDEMPOTENCY,\n});\nassert.equal(Object.keys(acceptedIo.posts[1].body).length, 4);''',
    '''assert.deepEqual(acceptedIo.posts[1].body, {\n  attempt_id: ATTEMPT,\n  apply: true,\n  confirmation: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,\n  submission_idempotency_key: IDEMPOTENCY,\n  expected_plan_fingerprint_sha256: PLAN_FP,\n  policy_fingerprint_sha256: POLICY_FP,\n});\nassert.equal(Object.keys(acceptedIo.posts[1].body).length, 6);''',
    "operator proof bound apply body",
)
operator_proof = replace_once(
    operator_proof,
    '''assert.equal(transportLoss.submission_may_have_occurred, true);\nassert.equal(transportLoss.reconciliation_required, true);\nassert.equal(transportLoss.automatic_retry_allowed, false);''',
    '''assert.equal(transportLoss.submission_may_have_occurred, true);\nassert.equal(transportLoss.reconciliation_required, true);\nassert.equal(transportLoss.mutation_performed, null);\nassert.equal(transportLoss.signing_performed, null);\nassert.equal(transportLoss.transaction_broadcast_performed, null);\nassert.equal(transportLoss.side_effect_state_known, false);\nassert.equal(transportLoss.automatic_retry_allowed, false);''',
    "operator proof transport ambiguity truth",
)
operator_proof = replace_once(
    operator_proof,
    '''assert.equal(malformed.submission_may_have_occurred, true);\nassert.equal(malformed.reconciliation_required, true);''',
    '''assert.equal(malformed.submission_may_have_occurred, true);\nassert.equal(malformed.reconciliation_required, true);\nassert.equal(malformed.mutation_performed, null);\nassert.equal(malformed.signing_performed, null);\nassert.equal(malformed.transaction_broadcast_performed, null);\nassert.equal(malformed.side_effect_state_known, false);''',
    "operator proof malformed ambiguity truth",
)
operator_proof = replace_once(
    operator_proof,
    '''assert.match(runtimeSource, /"attempt_id",\\s*\\n\\s*"apply",\\s*\\n\\s*"confirmation",\\s*\\n\\s*"submission_idempotency_key"/);''',
    '''assert.match(runtimeSource, /"attempt_id",\\s*\\n\\s*"apply",\\s*\\n\\s*"confirmation",\\s*\\n\\s*"submission_idempotency_key",\\s*\\n\\s*"expected_plan_fingerprint_sha256",\\s*\\n\\s*"policy_fingerprint_sha256"/);\nassert.match(runtimeSource, /native_execution_plan_fingerprint_mismatch/);''',
    "operator proof runtime input binding source",
)
operator_proof = replace_once(
    operator_proof,
    '''  apply_command_key_count: 4,\n  broadcast_unknown_reconciliation_required: true,''',
    '''  apply_command_key_count: 6,\n  runtime_plan_fingerprint_validation: true,\n  runtime_policy_fingerprint_validation: true,\n  ambiguous_side_effect_state_known: false,\n  broadcast_unknown_reconciliation_required: true,''',
    "operator proof output binding markers",
)
OPERATOR_PROOF.write_text(operator_proof)

doc = DOC.read_text()
marker = "## Server-enforced plan binding"
if marker not in doc:
    doc += '''\n\n## Server-enforced plan binding\n\nThe dry-run response now carries the runtime-produced deterministic plan fingerprint. The operator requires the reviewed fingerprint and current runtime-policy fingerprint, then echoes both into the value-bearing apply request. The runtime independently recomputes its current policy fingerprint before planning and recomputes the current execution-plan fingerprint after the fresh nonce/fee/balance read but before invoking the worker. Any policy or plan drift holds before signing or broadcast.\n\nAn apply transport timeout, lost response, or malformed response is not reported as a clean no-side-effect result. Those mutation/signing/broadcast fields are indeterminate and reconciliation remains required; automatic retry remains disabled.\n'''
DOC.write_text(doc)

print("VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_PLAN_BINDING_V1_PATCHED")
