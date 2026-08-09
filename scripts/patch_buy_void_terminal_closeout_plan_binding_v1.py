#!/usr/bin/env python3
from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one anchor, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


MODEL = "src/economic/buy_void_saga_terminal_closeout_model_v1.ts"
CORE = "src/economic/buy_void_saga_terminal_closeout_v1.ts"
RUNTIME = "src/economic/buy_void_saga_terminal_closeout_runtime_v1.ts"
CORE_PROOF = "scripts/prove_buy_void_saga_terminal_closeout_v1.ts"
RUNTIME_PROOF = "scripts/prove_buy_void_saga_terminal_closeout_runtime_v1.ts"
OPERATOR = "scripts/buy_void_production_terminal_closeout_operator_v1.ts"
OPERATOR_PROOF = "scripts/prove_buy_void_production_terminal_closeout_operator_v1.ts"
DOC = "docs/operators/buy-void-production-terminal-closeout-operator-v1.md"

# Core model: make the reviewed terminal plan fingerprint explicit authority/input.
replace_once(
    MODEL,
    "  deterministic_closeout_plan_persistence: true,\n  append_only_inventory_consumption: true,",
    "  deterministic_closeout_plan_persistence: true,\n  exact_terminal_plan_fingerprint_required_before_mutation: true,\n  append_only_inventory_consumption: true,",
)
replace_once(
    MODEL,
    "  policy_fingerprint_sha256?: unknown;\n  saga_confirmation?: unknown;",
    "  policy_fingerprint_sha256?: unknown;\n  expected_plan_fingerprint_sha256?: unknown;\n  saga_confirmation?: unknown;",
)
replace_once(
    MODEL,
    "      required_policy_fingerprint_sha256: string;\n      required_saga_confirmation: string;",
    "      required_policy_fingerprint_sha256: string;\n      required_plan_fingerprint_sha256: string;\n      required_saga_confirmation: string;",
)

# Core: expose the exact plan fingerprint on dry run, require it before any
# mutation, and revalidate it at the inner supervisor reconstruction seam.
replace_once(
    CORE,
    "      required_policy_fingerprint_sha256: policy.fingerprint_sha256,\n      required_saga_confirmation: requiredSagaConfirmation,",
    "      required_policy_fingerprint_sha256: policy.fingerprint_sha256,\n      required_plan_fingerprint_sha256:\n        reconstructed.plan.plan_fingerprint_sha256,\n      required_saga_confirmation: requiredSagaConfirmation,",
)
replace_once(
    CORE,
    "  if (\n    terminalText(input.confirmation) !==\n      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1 ||",
    "  if (\n    typeof input.expected_plan_fingerprint_sha256 !== \"string\" ||\n    input.expected_plan_fingerprint_sha256 !==\n      reconstructed.plan.plan_fingerprint_sha256\n  ) {\n    return held(\n      true,\n      \"closeout_plan\",\n      \"terminal_closeout_plan_fingerprint_mismatch\",\n      {\n        detail: {\n          required_plan_fingerprint_sha256:\n            reconstructed.plan.plan_fingerprint_sha256,\n        },\n      },\n    );\n  }\n\n  if (\n    terminalText(input.confirmation) !==\n      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1 ||",
)
replace_once(
    CORE,
    "          const current = reconstructTerminalCloseoutV1({\n            root_dir: rootDir,\n            saga_module: sagaModule,\n            saga_store: sagaStore,\n            saga_record: record,\n            policy,\n            dependencies,\n          });\n          artifacts = applyTerminalCloseoutArtifactsV1(",
    "          const current = reconstructTerminalCloseoutV1({\n            root_dir: rootDir,\n            saga_module: sagaModule,\n            saga_store: sagaStore,\n            saga_record: record,\n            policy,\n            dependencies,\n          });\n          if (\n            current.plan.plan_fingerprint_sha256 !==\n            reconstructed.plan.plan_fingerprint_sha256\n          ) {\n            throw new Error(\"terminal_closeout_plan_changed_during_apply\");\n          }\n          artifacts = applyTerminalCloseoutArtifactsV1(",
)

# Runtime: caller must echo the exact terminal plan fingerprint and runtime
# passes it to the core as an expected mutation binding.
replace_once(
    RUNTIME,
    "  exact_policy_fingerprint_echo_required: true,\n  exact_saga_confirmation_required: true,",
    "  exact_policy_fingerprint_echo_required: true,\n  exact_terminal_plan_fingerprint_echo_required: true,\n  exact_saga_confirmation_required: true,",
)
replace_once(
    RUNTIME,
    "  \"policy_fingerprint_sha256\",\n  \"saga_confirmation\",",
    "  \"policy_fingerprint_sha256\",\n  \"terminal_plan_fingerprint_sha256\",\n  \"saga_confirmation\",",
)
replace_once(
    RUNTIME,
    "      required_policy_fingerprint_sha256:\n        dry.required_policy_fingerprint_sha256,\n      required_saga_confirmation: dry.required_saga_confirmation,",
    "      required_policy_fingerprint_sha256:\n        dry.required_policy_fingerprint_sha256,\n      required_terminal_plan_fingerprint_sha256:\n        dry.required_plan_fingerprint_sha256,\n      required_saga_confirmation: dry.required_saga_confirmation,",
)
replace_once(
    RUNTIME,
    "    text(body.policy_fingerprint_sha256).toLowerCase() ===\n      dry.required_policy_fingerprint_sha256 &&\n    text(body.saga_confirmation) === dry.required_saga_confirmation &&",
    "    text(body.policy_fingerprint_sha256).toLowerCase() ===\n      dry.required_policy_fingerprint_sha256 &&\n    typeof body.terminal_plan_fingerprint_sha256 === \"string\" &&\n    body.terminal_plan_fingerprint_sha256 ===\n      dry.required_plan_fingerprint_sha256 &&\n    text(body.saga_confirmation) === dry.required_saga_confirmation &&",
)
replace_once(
    RUNTIME,
    "    policy_fingerprint_sha256:\n      dry.required_policy_fingerprint_sha256,\n    saga_confirmation: dry.required_saga_confirmation,",
    "    policy_fingerprint_sha256:\n      dry.required_policy_fingerprint_sha256,\n    expected_plan_fingerprint_sha256:\n      dry.required_plan_fingerprint_sha256,\n    saga_confirmation: dry.required_saga_confirmation,",
)

# Production operator: require the runtime's new authority flag, bind the dry
# runtime plan fingerprint, and echo it on the final apply POST.
replace_once(
    OPERATOR,
    "  exact_policy_fingerprint_required: true,\n  exact_saga_confirmation_required: true,",
    "  exact_policy_fingerprint_required: true,\n  runtime_validates_exact_terminal_plan_fingerprint_before_mutation: true,\n  exact_saga_confirmation_required: true,",
)
replace_once(
    OPERATOR,
    "    authority.exact_policy_fingerprint_echo_required === true &&\n    authority.exact_saga_confirmation_required === true &&",
    "    authority.exact_policy_fingerprint_echo_required === true &&\n    authority.exact_terminal_plan_fingerprint_echo_required === true &&\n    authority.exact_saga_confirmation_required === true &&",
)
replace_once(
    OPERATOR,
    "    authority.deterministic_closeout_plan_persistence === true &&\n    authority.append_only_inventory_consumption === true &&",
    "    authority.deterministic_closeout_plan_persistence === true &&\n    authority.exact_terminal_plan_fingerprint_required_before_mutation === true &&\n    authority.append_only_inventory_consumption === true &&",
)
replace_once(
    OPERATOR,
    "  const plan = safePlan(decision.plan, sagaId, attemptId, closeoutId, policyFp);\n  if (!plan) return null;\n  return {\n    ...plan,",
    "  const plan = safePlan(decision.plan, sagaId, attemptId, closeoutId, policyFp);\n  if (!plan) return null;\n  const requiredTerminalPlanFingerprint = text(\n    response.required_terminal_plan_fingerprint_sha256,\n  ).toLowerCase();\n  if (\n    !SHA256.test(requiredTerminalPlanFingerprint) ||\n    requiredTerminalPlanFingerprint !== plan.terminal_plan_fingerprint_sha256 ||\n    text(decision.required_plan_fingerprint_sha256).toLowerCase() !==\n      requiredTerminalPlanFingerprint\n  ) return null;\n  return {\n    ...plan,",
)
replace_once(
    OPERATOR,
    "    policy_fingerprint_sha256: input.args.policy_fingerprint_sha256,\n    saga_confirmation: input.args.saga_confirmation,",
    "    policy_fingerprint_sha256: input.args.policy_fingerprint_sha256,\n    terminal_plan_fingerprint_sha256:\n      freshPlan.terminal_plan_fingerprint_sha256,\n    saga_confirmation: input.args.saga_confirmation,",
)

# Core proof: every legitimate apply now carries the reviewed terminal plan fp;
# prove both outer-plan drift and inner-adapter drift fail before accounting writes.
replace_once(
    CORE_PROOF,
    "    policy_fingerprint_sha256:\n      dry.required_policy_fingerprint_sha256,\n    saga_confirmation: dry.required_saga_confirmation,",
    "    policy_fingerprint_sha256:\n      dry.required_policy_fingerprint_sha256,\n    expected_plan_fingerprint_sha256:\n      dry.required_plan_fingerprint_sha256,\n    saga_confirmation: dry.required_saga_confirmation,",
)
replace_once(
    CORE_PROOF,
    "  assert.equal(\n    dry.plan.inventory_consumption.canonical_confirmed_state_id,\n    fixture.confirmed_state_id,\n  );\n\n  const confirmedPaths = buyVoidConfirmedStateJournalPathsV1(fixture.root);",
    "  assert.equal(\n    dry.plan.inventory_consumption.canonical_confirmed_state_id,\n    fixture.confirmed_state_id,\n  );\n  assert.equal(\n    dry.required_plan_fingerprint_sha256,\n    dry.plan.plan_fingerprint_sha256,\n  );\n\n  const wrongPlanBinding = await runBuyVoidSagaTerminalCloseoutV1({\n    ...applyInput(dry, fixture),\n    expected_plan_fingerprint_sha256: \"0\".repeat(64),\n    dependencies,\n  });\n  assert.equal(wrongPlanBinding.ok, false);\n  if (wrongPlanBinding.ok !== false) {\n    throw new Error(\"expected terminal plan fingerprint hold\");\n  }\n  assert.equal(wrongPlanBinding.stage, \"closeout_plan\");\n  assert.equal(\n    wrongPlanBinding.reason,\n    \"terminal_closeout_plan_fingerprint_mismatch\",\n  );\n  assert.equal(wrongPlanBinding.mutation_performed, false);\n  assert.equal(wrongPlanBinding.inventory_consumption_performed, false);\n  assert.equal(wrongPlanBinding.public_request_fulfilled, false);\n  assert.equal(wrongPlanBinding.saga_closeout_appended, false);\n  assert.equal(listBuyVoidInventoryConsumptionsV1(fixture.root).length, 0);\n\n  let innerPlanCalls = 0;\n  const innerPlanDrift = await runBuyVoidSagaTerminalCloseoutV1({\n    ...applyInput(dry, fixture),\n    dependencies: {\n      ...dependencies,\n      plan_closeout: (input: any) => {\n        innerPlanCalls += 1;\n        const planner = requireConfirmedCloseoutPlanner(input);\n        if (\n          planner.ok === true &&\n          innerPlanCalls >= 2\n        ) {\n          return {\n            ...planner,\n            plan: {\n              ...planner.plan,\n              terminal_plan_binding_drift_probe: \"inner-reconstruction\",\n            },\n          };\n        }\n        return planner;\n      },\n    },\n  });\n  assert.equal(innerPlanDrift.ok, false);\n  if (innerPlanDrift.ok !== false) {\n    throw new Error(\"expected inner terminal plan drift hold\");\n  }\n  assert.equal(innerPlanDrift.stage, \"closeout_plan\");\n  assert.equal(\n    innerPlanDrift.reason,\n    \"terminal_closeout_plan_changed_during_apply\",\n  );\n  assert.equal(innerPlanDrift.mutation_performed, false);\n  assert.equal(innerPlanDrift.inventory_consumption_performed, false);\n  assert.equal(innerPlanDrift.public_request_fulfilled, false);\n  assert.equal(innerPlanDrift.saga_closeout_appended, false);\n  assert.equal(listBuyVoidInventoryConsumptionsV1(fixture.root).length, 0);\n  assert.equal(\n    readJsonLines(path.join(fixture.request_dir, \"operator-events.jsonl\"))\n      .filter((row) => row.operator_status === \"fulfilled\").length,\n    0,\n  );\n\n  const confirmedPaths = buyVoidConfirmedStateJournalPathsV1(fixture.root);",
)
# Add a small helper import/call wrapper for the real planner used by inner drift.
replace_once(
    CORE_PROOF,
    "import {\n  listBuyVoidInventoryConsumptionsV1,\n} from \"../src/economic/buy_void_confirmed_closeout_v1.js\";",
    "import {\n  listBuyVoidInventoryConsumptionsV1,\n  planBuyVoidConfirmedCloseoutV1,\n} from \"../src/economic/buy_void_confirmed_closeout_v1.js\";\n\nfunction requireConfirmedCloseoutPlanner(input: any): any {\n  return planBuyVoidConfirmedCloseoutV1(input);\n}",
)
replace_once(
    CORE_PROOF,
    "  process.stdout.write(\"saga_closeout_event_count=1\\n\");",
    "  process.stdout.write(\"saga_closeout_event_count=1\\n\");\n  process.stdout.write(\"terminal_plan_fingerprint_bound_before_mutation=true\\n\");\n  process.stdout.write(\"terminal_plan_inner_reconstruction_drift_blocked=true\\n\");",
)

# Runtime proof: dry exposes the required fp, exact apply must echo it, mismatch
# is rejected before the core apply dependency is called.
replace_once(
    RUNTIME_PROOF,
    "const policyFingerprint = \"b\".repeat(64);\nconst sagaConfirmation",
    "const policyFingerprint = \"b\".repeat(64);\nconst terminalPlanFingerprint = \"e\".repeat(64);\nconst sagaConfirmation",
)
replace_once(
    RUNTIME_PROOF,
    "  plan: {},\n  required_confirmation:",
    "  plan: { plan_fingerprint_sha256: terminalPlanFingerprint },\n  required_confirmation:",
)
replace_once(
    RUNTIME_PROOF,
    "  required_policy_fingerprint_sha256: policyFingerprint,\n  required_saga_confirmation:",
    "  required_policy_fingerprint_sha256: policyFingerprint,\n  required_plan_fingerprint_sha256: terminalPlanFingerprint,\n  required_saga_confirmation:",
)
replace_once(
    RUNTIME_PROOF,
    "    assert.equal(input.policy_fingerprint_sha256, policyFingerprint);\n    assert.equal(input.saga_confirmation, sagaConfirmation);",
    "    assert.equal(input.policy_fingerprint_sha256, policyFingerprint);\n    assert.equal(input.expected_plan_fingerprint_sha256, terminalPlanFingerprint);\n    assert.equal(input.saga_confirmation, sagaConfirmation);",
)
replace_once(
    RUNTIME_PROOF,
    "  assert.equal(dry.body.required_policy_fingerprint_sha256, policyFingerprint);\n  assert.equal(dry.body.inventory_consumption_performed, false);",
    "  assert.equal(dry.body.required_policy_fingerprint_sha256, policyFingerprint);\n  assert.equal(\n    dry.body.required_terminal_plan_fingerprint_sha256,\n    terminalPlanFingerprint,\n  );\n  assert.equal(dry.body.inventory_consumption_performed, false);",
)
replace_once(
    RUNTIME_PROOF,
    "      policy_fingerprint_sha256: policyFingerprint,\n      saga_confirmation: sagaConfirmation,",
    "      policy_fingerprint_sha256: policyFingerprint,\n      terminal_plan_fingerprint_sha256: terminalPlanFingerprint,\n      saga_confirmation: sagaConfirmation,",
)
# The exact applied fixture appears twice (success + partial); update remaining occurrence too.
replace_once(
    RUNTIME_PROOF,
    "      policy_fingerprint_sha256: policyFingerprint,\n      saga_confirmation: sagaConfirmation,",
    "      policy_fingerprint_sha256: policyFingerprint,\n      terminal_plan_fingerprint_sha256: terminalPlanFingerprint,\n      saga_confirmation: sagaConfirmation,",
)
replace_once(
    RUNTIME_PROOF,
    "  const exact = await call(\n",
    "  const wrongPlan = await call(\n    {\n      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,\n      saga_id: sagaId,\n      apply: true,\n      confirmation:\n        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,\n      terminal_closeout_confirmation:\n        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,\n      policy_fingerprint_sha256: policyFingerprint,\n      terminal_plan_fingerprint_sha256: \"f\".repeat(64),\n      saga_confirmation: sagaConfirmation,\n      saga_action_confirmation: sagaActionConfirmation,\n    },\n    successfulRun,\n  );\n  assert.equal(wrongPlan.status, 428);\n  assert.equal(\n    wrongPlan.body.error,\n    \"saga_terminal_closeout_runtime_confirmation_mismatch\",\n  );\n  assert.equal(applyCalls, 0);\n\n  const exact = await call(\n",
)
replace_once(
    RUNTIME_PROOF,
    "  console.log(\"exact_policy_fingerprint_echo_required=true\");",
    "  console.log(\"exact_policy_fingerprint_echo_required=true\");\n  console.log(\"exact_terminal_plan_fingerprint_echo_required=true\");",
)

# Operator proof fixtures and final apply-body assertion.
replace_once(
    OPERATOR_PROOF,
    "    exact_policy_fingerprint_echo_required: true,\n    exact_saga_confirmation_required: true,",
    "    exact_policy_fingerprint_echo_required: true,\n    exact_terminal_plan_fingerprint_echo_required: true,\n    exact_saga_confirmation_required: true,",
)
replace_once(
    OPERATOR_PROOF,
    "    deterministic_closeout_plan_persistence: true,\n    append_only_inventory_consumption: true,",
    "    deterministic_closeout_plan_persistence: true,\n    exact_terminal_plan_fingerprint_required_before_mutation: true,\n    append_only_inventory_consumption: true,",
)
replace_once(
    OPERATOR_PROOF,
    "    required_policy_fingerprint_sha256: policyFp,\n    required_saga_confirmation: SAGA_CONFIRMATION,",
    "    required_policy_fingerprint_sha256: policyFp,\n    required_terminal_plan_fingerprint_sha256:\n      input.planFingerprint || TERMINAL_PLAN_FP,\n    required_saga_confirmation: SAGA_CONFIRMATION,",
)
replace_once(
    OPERATOR_PROOF,
    "      required_policy_fingerprint_sha256: policyFp,\n      required_saga_confirmation: SAGA_CONFIRMATION,",
    "      required_policy_fingerprint_sha256: policyFp,\n      required_plan_fingerprint_sha256:\n        input.planFingerprint || TERMINAL_PLAN_FP,\n      required_saga_confirmation: SAGA_CONFIRMATION,",
)
replace_once(
    OPERATOR_PROOF,
    "  \"policy_fingerprint_sha256\",\n  \"saga_action_confirmation\",",
    "  \"policy_fingerprint_sha256\",\n  \"saga_action_confirmation\",\n  \"terminal_plan_fingerprint_sha256\",",
)
replace_once(
    OPERATOR_PROOF,
    "  policy_fingerprint_sha256: POLICY_FP,\n  saga_confirmation: SAGA_CONFIRMATION,",
    "  policy_fingerprint_sha256: POLICY_FP,\n  terminal_plan_fingerprint_sha256: TERMINAL_PLAN_FP,\n  saga_confirmation: SAGA_CONFIRMATION,",
)
replace_once(
    OPERATOR_PROOF,
    "  exact_apply_command_key_count: 8,",
    "  exact_apply_command_key_count: 9,\n  server_enforced_terminal_plan_fingerprint: true,",
)

# Operator documentation: make the mutation binding explicit and correct key count.
doc = Path(DOC)
text = doc.read_text()
text = text.replace(
    "Only then may it send the exact eight-key apply command.",
    "Only then may it send the exact nine-key apply command, including the exact server-derived terminal plan fingerprint.",
)
if "Only then may it send the exact nine-key apply command" not in text:
    raise SystemExit("operator doc apply-key anchor missing")
text += """

## Server-enforced terminal plan binding

The final apply request echoes the exact `terminal_plan_fingerprint_sha256` from the fresh reviewed dry run. The loopback runtime requires that fingerprint and passes it to the terminal-closeout core as `expected_plan_fingerprint_sha256`.

The core independently reconstructs the current terminal plan and rejects any mismatch before inventory consumption, public fulfilled projection, or saga append. The supervisor adapter performs a second equality check immediately before `applyTerminalCloseoutArtifactsV1(...)`, closing the race between the core's outer reconstruction and the lease-protected inner reconstruction.

A plan mismatch or an inner reconstruction drift is a held closeout-plan decision with automatic retry disabled and all terminal accounting mutation flags false. The fingerprint is an execution/accounting binding, not additional wallet, RPC, signing, transaction-broadcast, or money-movement authority.
"""
doc.write_text(text)

print("VOID_BUY_VOID_TERMINAL_CLOSEOUT_PLAN_BINDING_V1_PATCHED")
