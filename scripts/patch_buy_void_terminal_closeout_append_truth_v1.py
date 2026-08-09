#!/usr/bin/env python3
from pathlib import Path

MODEL = Path("src/economic/buy_void_saga_terminal_closeout_model_v1.ts")
CORE = Path("src/economic/buy_void_saga_terminal_closeout_v1.ts")
CORE_PROOF = Path("scripts/prove_buy_void_saga_terminal_closeout_v1.ts")
OPERATOR = Path("scripts/buy_void_production_terminal_closeout_operator_v1.ts")
OPERATOR_PROOF = Path("scripts/prove_buy_void_production_terminal_closeout_operator_v1.ts")
DOC = Path("docs/operators/buy-void-production-terminal-closeout-operator-v1.md")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)

model = MODEL.read_text()
model = replace_once(
    model,
    '''      public_request_fulfilled: boolean;\n      saga_closeout_appended: false;\n      automatic_retry_allowed: false;''',
    '''      public_request_fulfilled: boolean;\n      saga_closeout_appended: boolean;\n      automatic_retry_allowed: false;''',
    "held saga append truth type",
)
MODEL.write_text(model)

core = CORE.read_text()
core = replace_once(
    core,
    '''    public_request_fulfilled?: boolean;\n  } = {},''',
    '''    public_request_fulfilled?: boolean;\n    saga_closeout_appended?: boolean;\n  } = {},''',
    "held options saga append truth",
)
core = replace_once(
    core,
    '''    public_request_fulfilled:\n      options.public_request_fulfilled === true,\n    saga_closeout_appended: false,''',
    '''    public_request_fulfilled:\n      options.public_request_fulfilled === true,\n    saga_closeout_appended:\n      options.saga_closeout_appended === true,''',
    "held output saga append truth",
)
core = replace_once(
    core,
    '''    return held(true, "saga_append", "terminal_closeout_final_saga_mismatch", {\n      mutation_performed: true,\n      inventory_consumption_performed: progress.inventory_committed,\n      public_request_fulfilled: progress.public_committed,\n    });''',
    '''    return held(true, "saga_append", "terminal_closeout_final_saga_mismatch", {\n      mutation_performed: true,\n      inventory_consumption_performed: progress.inventory_committed,\n      public_request_fulfilled: progress.public_committed,\n      saga_closeout_appended: true,\n    });''',
    "post append final verification truth",
)
CORE.write_text(core)

operator = OPERATOR.read_text()
operator = replace_once(
    operator,
    '''    const mutation = decision.mutation_performed === true;\n    const inventory = decision.inventory_consumption_performed === true;\n    const publicFulfilled = decision.public_request_fulfilled === true;\n    const recovery = mutation || inventory || publicFulfilled;''',
    '''    const mutation = decision.mutation_performed === true;\n    const inventory = decision.inventory_consumption_performed === true;\n    const publicFulfilled = decision.public_request_fulfilled === true;\n    const sagaAppended = decision.saga_closeout_appended === true;\n    const recovery = mutation || inventory || publicFulfilled || sagaAppended;''',
    "operator held recovery includes saga append",
)
operator = replace_once(
    operator,
    '''      public_request_fulfilled: publicFulfilled,\n      saga_closeout_appended: false,''',
    '''      public_request_fulfilled: publicFulfilled,\n      saga_closeout_appended: sagaAppended,''',
    "operator held saga append truth",
)
OPERATOR.write_text(operator)

core_proof = CORE_PROOF.read_text()
anchor = '''  const concurrent = await createFixture("concurrent");\n'''
insert = '''  const postAppend = await createFixture("post_append_mismatch");\n  for (const [name, value] of Object.entries(\n    configuredEnv(postAppend.request_dir),\n  )) {\n    process.env[name] = value;\n  }\n  const postAppendDry = await runBuyVoidSagaTerminalCloseoutV1({\n    root_dir: postAppend.root,\n    saga_id: postAppend.saga_id,\n  });\n  assert.equal(postAppendDry.ok, true);\n  if (\n    postAppendDry.ok !== true ||\n    postAppendDry.status !== "dry_run"\n  ) {\n    throw new Error("post-append mismatch dry run failed");\n  }\n  let closeoutAppendObserved = false;\n  const realSaga = postAppend.saga;\n  const wrappedSaga: any = {\n    ...realSaga,\n    createFilesystemSagaStoreV1(rootDir: string) {\n      const store = realSaga.createFilesystemSagaStoreV1(rootDir);\n      return {\n        ...store,\n        appendEvent(input: any) {\n          const updated = store.appendEvent(input);\n          if (input?.event?.event_type === "closeout_committed") {\n            closeoutAppendObserved = true;\n          }\n          return updated;\n        },\n        recover(sagaId: string) {\n          const record = store.recover(sagaId);\n          if (\n            closeoutAppendObserved &&\n            record?.state?.state === "closed"\n          ) {\n            return {\n              ...record,\n              state: {\n                ...record.state,\n                closeout_id: "f".repeat(64),\n              },\n            };\n          }\n          return record;\n        },\n      };\n    },\n  };\n  const postAppendMismatch = await runBuyVoidSagaTerminalCloseoutV1({\n    ...applyInput(postAppendDry, postAppend),\n    dependencies: {\n      load_saga_module: async () => wrappedSaga,\n    },\n  });\n  assert.equal(postAppendMismatch.ok, false);\n  if (postAppendMismatch.ok !== false) {\n    throw new Error("expected post-append verification hold");\n  }\n  assert.equal(postAppendMismatch.stage, "saga_append");\n  assert.equal(\n    postAppendMismatch.reason,\n    "terminal_closeout_final_saga_mismatch",\n  );\n  assert.equal(postAppendMismatch.mutation_performed, true);\n  assert.equal(postAppendMismatch.inventory_consumption_performed, true);\n  assert.equal(postAppendMismatch.public_request_fulfilled, true);\n  assert.equal(postAppendMismatch.saga_closeout_appended, true);\n  assert.equal(postAppendMismatch.automatic_retry_allowed, false);\n  assert.equal(closeoutAppendObserved, true);\n  const durablePostAppend = realSaga\n    .createFilesystemSagaStoreV1(\n      path.join(\n        postAppend.root,\n        "buy-void-crash-consistent-saga-runtime-v1",\n      ),\n    )\n    .recover(postAppend.saga_id);\n  assert.equal(durablePostAppend.state.state, "closed");\n  assert.equal(\n    durablePostAppend.state.closeout_id,\n    postAppendDry.closeout_id,\n  );\n  assert.equal(\n    durablePostAppend.events.filter(\n      (event: any) => event.event_type === "closeout_committed",\n    ).length,\n    1,\n  );\n\n  const concurrent = await createFixture("concurrent");\n'''
core_proof = replace_once(
    core_proof,
    anchor,
    insert,
    "core proof post append mismatch insertion",
)
core_proof = replace_once(
    core_proof,
    '''  fs.rmSync(fixture.base, { recursive: true, force: true });\n  fs.rmSync(concurrent.base, { recursive: true, force: true });''',
    '''  fs.rmSync(fixture.base, { recursive: true, force: true });\n  fs.rmSync(postAppend.base, { recursive: true, force: true });\n  fs.rmSync(concurrent.base, { recursive: true, force: true });''',
    "core proof cleanup post append fixture",
)
core_proof = replace_once(
    core_proof,
    '''  process.stdout.write("saga_closeout_event_count=1\\n");\n  process.stdout.write("concurrent_process_closeout_unique=true\\n");''',
    '''  process.stdout.write("saga_closeout_event_count=1\\n");\n  process.stdout.write("post_append_verification_mismatch_saga_append_truth=true\\n");\n  process.stdout.write("post_append_verification_mismatch_automatic_retry=false\\n");\n  process.stdout.write("concurrent_process_closeout_unique=true\\n");''',
    "core proof output post append truth",
)
CORE_PROOF.write_text(core_proof)

operator_proof = OPERATOR_PROOF.read_text()
operator_proof = replace_once(
    operator_proof,
    '''function partialHeldFixture(): Record<string, unknown> {\n  return {''',
    '''function partialHeldFixture(input: {\n  publicFulfilled?: boolean;\n  sagaAppended?: boolean;\n} = {}): Record<string, unknown> {\n  const publicFulfilled = input.publicFulfilled === true;\n  const sagaAppended = input.sagaAppended === true;\n  return {''',
    "operator proof partial fixture options",
)
operator_proof = replace_once(
    operator_proof,
    '''      stage: "public_closeout",\n      reason: "synthetic_public_projection_failure",\n      mutation_performed: true,\n      inventory_consumption_performed: true,\n      public_request_fulfilled: false,\n      saga_closeout_appended: false,''',
    '''      stage: sagaAppended ? "saga_append" : "public_closeout",\n      reason: sagaAppended\n        ? "terminal_closeout_final_saga_mismatch"\n        : "synthetic_public_projection_failure",\n      mutation_performed: true,\n      inventory_consumption_performed: true,\n      public_request_fulfilled: publicFulfilled,\n      saga_closeout_appended: sagaAppended,''',
    "operator proof decision partial saga truth",
)
operator_proof = replace_once(
    operator_proof,
    '''    mutation_performed: true,\n    inventory_consumption_performed: true,\n    public_request_fulfilled: false,\n    saga_closeout_appended: false,''',
    '''    mutation_performed: true,\n    inventory_consumption_performed: true,\n    public_request_fulfilled: publicFulfilled,\n    saga_closeout_appended: sagaAppended,''',
    "operator proof response partial saga truth",
)
operator_proof = replace_once(
    operator_proof,
    '''assert.equal(partial.public_request_fulfilled, false);\nassert.equal(partial.automatic_retry_allowed, false);\n\nlet transportPosts = 0;''',
    '''assert.equal(partial.public_request_fulfilled, false);\nassert.equal(partial.saga_closeout_appended, false);\nassert.equal(partial.automatic_retry_allowed, false);\n\nlet postAppendHeldPosts = 0;\nconst postAppendHeld = await runBuyVoidProductionTerminalCloseoutV1({\n  args: applyArgs(plan.plan_fingerprint_sha256),\n  http_get: async () => ({\n    status: 200,\n    json: statusFixture({ applyEnabled: true }),\n  }),\n  http_post: async () => {\n    postAppendHeldPosts += 1;\n    return postAppendHeldPosts <= 2\n      ? { status: 200, json: dryFixture() }\n      : {\n          status: 500,\n          json: partialHeldFixture({\n            publicFulfilled: true,\n            sagaAppended: true,\n          }),\n        };\n  },\n});\nassert.equal(postAppendHeld.ok, false);\nassert.equal(postAppendHeld.status, "held");\nassert.equal(postAppendHeld.side_effect_state_known, true);\nassert.equal(postAppendHeld.recovery_required, true);\nassert.equal(postAppendHeld.mutation_performed, true);\nassert.equal(postAppendHeld.inventory_consumption_performed, true);\nassert.equal(postAppendHeld.public_request_fulfilled, true);\nassert.equal(postAppendHeld.saga_closeout_appended, true);\nassert.equal(postAppendHeld.automatic_retry_allowed, false);\n\nlet transportPosts = 0;''',
    "operator proof post append held truth",
)
operator_proof = replace_once(
    operator_proof,
    '''  partial_mutation_truth_preserved: true,\n  applied_transport_unknown_preserved: true,''',
    '''  partial_mutation_truth_preserved: true,\n  post_append_verification_mismatch_saga_truth_preserved: true,\n  applied_transport_unknown_preserved: true,''',
    "operator proof marker post append truth",
)
OPERATOR_PROOF.write_text(operator_proof)

doc = DOC.read_text()
marker = "## Post-append verification truth"
if marker not in doc:
    doc += '''\n\n## Post-append verification truth\n\nA rare final verification-read mismatch can occur after the saga supervisor has already durably appended `closeout_committed`. In that case the terminal-closeout runtime reports a held/recovery-required result with `saga_closeout_appended=true`; the production operator preserves that exact persisted-effect flag rather than relabeling the closeout as not appended. Automatic retry remains disabled.\n'''
DOC.write_text(doc)

print("VOID_BUY_VOID_TERMINAL_CLOSEOUT_APPEND_TRUTH_V1_PATCHED")
