import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  executeAuthenticatedPaidWorkActivationPersistenceV1,
  type ActivationDependenciesV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.js";
import {
  acceptanceReplayStateIdV1,
  type AcceptanceReplayStateDraftV1,
  type PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1,
} from "./public_agent_service_acceptance_materialization_replay_consumer_v1.js";
import {
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1,
  type AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_v1.js";
import {
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_COMMAND_MARKER,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIRMATION,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_MARKER,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED_ENV,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_COUNT_ENV,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RECOVER_ORPHAN_ENV,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RESULT_MARKER,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT_ENV,
  authenticatedPaidWorkActivationPersistenceRuntimeDefaultDependencyIdentityV1,
  executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1,
  inspectAuthenticatedPaidWorkActivationPersistenceStoreV1,
  loadAuthenticatedPaidWorkActivationPersistenceRuntimeConfigFromEnvironmentV1,
  type AuthenticatedPaidWorkActivationPersistenceRuntimeDependenciesV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.js";

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectReject(
  label: string,
  action: () => unknown,
  expectedFragment?: string,
): void {
  let error: unknown = null;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  assertCondition(error instanceof Error, `${label} was not rejected`);
  if (expectedFragment !== undefined) {
    assertCondition(
      error.message.includes(expectedFragment),
      `${label} rejected with unexpected message: ${error.message}`,
    );
  }
}

function readJson(relative: string): unknown {
  return JSON.parse(
    fs.readFileSync(path.resolve(relative), "utf8"),
  ) as unknown;
}

const example = readJson(
  "examples/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.example.json",
) as Record<string, unknown>;
const exampleCommand = example.command as Record<string, unknown>;
const prepared = verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
  exampleCommand.prepared_input,
  exampleCommand.prepared_packet,
);
const requesterId = `voidawra1_${"a".repeat(64)}`;
const providerId = `voidawqa1_${"b".repeat(64)}`;

function mockRequester(
  packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
): Record<string, unknown> {
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_PACKET_V1",
    version: 1,
    requester_authentication_id: requesterId,
    status: "requester_authenticated_for_acceptance",
    source: {
      quote_id: packet.source.quote_id,
      work_order_id: packet.source.work_order_id,
      requester_agent_id: packet.source.requester_agent_id,
      provider_id: packet.source.provider_id,
      acceptance_nonce: (
        packet.prepared_artifacts.acceptance_envelope as unknown as Record<
          string,
          unknown
        >
      ).nonce,
      provider_authentication_id: providerId,
    },
    verification: {
      provider_authentication_verified: true,
      requester_authentication_verified: true,
    },
    acceptance_gate: {
      eligible_for_acceptance_materialization: true,
    },
    authority: {},
  };
}

function acceptanceState(
  value: AcceptanceReplayStateDraftV1,
): AcceptanceReplayStateDraftV1 & { state_id: string } {
  return {
    ...value,
    state_id: acceptanceReplayStateIdV1(value),
  };
}

function mockAcceptance(
  packet: AuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityPacketV1,
  input: Record<string, unknown>,
): PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1 {
  const before = input.replay_state_snapshot as Record<string, unknown>;
  const acceptance = packet.prepared_artifacts.acceptance_envelope;
  const draft: AcceptanceReplayStateDraftV1 = {
    marker: "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1",
    version: 1,
    revision: (before.revision as number) + 1,
    consumed_requester_authentication_ids: [
      ...(before.consumed_requester_authentication_ids as string[]),
      requesterId,
    ].sort(),
    consumed_provider_authentication_ids: [
      ...(before.consumed_provider_authentication_ids as string[]),
      providerId,
    ].sort(),
    consumed_acceptance_ids: [
      ...(before.consumed_acceptance_ids as string[]),
      acceptance.acceptance_id,
    ].sort(),
    active_acceptance_by_quote: {
      ...(before.active_acceptance_by_quote as Record<string, string>),
      [acceptance.quote_id]: acceptance.acceptance_id,
    },
  };
  const after = acceptanceState(draft);
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_V1",
    version: 1,
    plan_id: `voidawacp1_${"c".repeat(64)}`,
    status: "acceptance_materialization_planned",
    source_evidence: {
      source_pack_sha256:
        "4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec",
      source_commit: "182228a1a9c4b31ec5ce9dc4b0fa1383938913df",
      diagnostic_correction:
        "acceptance_specific_persistent_replay_consumer_not_found",
      canonical_acceptance_materializer_verified: true,
      declarative_replay_requirements_verified: true,
      production_persistence_consumer_verified: false,
    },
    source: {
      requester_authentication_id: requesterId,
      provider_authentication_id: providerId,
      handoff_id: `voidawah1_${"d".repeat(64)}`,
      quote_id: acceptance.quote_id,
      work_order_id: acceptance.work_order_id,
      requester_agent_id: acceptance.requester.agent_id,
      provider_id: acceptance.provider.provider_id,
      acceptance_nonce: acceptance.nonce,
    },
    acceptance: {
      preview_acceptance_id: acceptance.acceptance_id,
      acceptance_id: acceptance.acceptance_id,
      acceptance_materialized_in_memory: true,
      acceptance_created_in_durable_state: false,
      acceptance_envelope: acceptance,
    },
    replay: {
      before_state:
        before as unknown as ReturnType<typeof acceptanceState>,
      next_state: after,
      transaction: {
        marker: "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_TRANSACTION_V1",
        version: 1,
        transaction_id: `voidawact1_${"e".repeat(64)}`,
        before_state_id: before.state_id as string,
        after_state_id: after.state_id,
        before_revision: before.revision as number,
        after_revision: after.revision,
        requester_authentication_id: requesterId,
        provider_authentication_id: providerId,
        acceptance_id: acceptance.acceptance_id,
        quote_id: acceptance.quote_id,
        work_order_id: acceptance.work_order_id,
        requester_agent_id: acceptance.requester.agent_id,
        atomic_consumption_count: 3,
        requester_authentication_consumed: true,
        provider_authentication_consumed: true,
        acceptance_id_consumed: true,
        single_active_acceptance_per_quote_enforced: true,
      },
      requester_authentication_replay_checked: true,
      provider_authentication_replay_checked: true,
      acceptance_replay_checked: true,
      single_active_acceptance_per_quote_checked: true,
      expected_revision_checked: true,
      all_or_nothing_transition_verified: true,
      production_persistence_consumer_verified: false,
    },
    authority: {
      acceptance_persistence: false,
      quote_acceptance: false,
      requester_authentication_replay_write: false,
      provider_authentication_replay_write: false,
      acceptance_replay_write: false,
      payment_authorization: false,
      payment_execution: false,
      execution_authorization: false,
      work_dispatch: false,
      credential_issue: false,
      credential_change: false,
      provider_selection: false,
      requester_key_registry_write: false,
      provider_key_registry_write: false,
      wallet_access: false,
      production_signing: false,
      transaction_broadcast: false,
      work_credit_write: false,
      http_submission: false,
      runtime_mutation: false,
      money_movement: false,
    },
  };
}

let activePrepared = prepared;
const activationDependencies: ActivationDependenciesV1 = {
  verifyPrepared: (input, packet) => {
    activePrepared =
      verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
        input,
        packet,
      );
    return activePrepared;
  },
  authenticateRequester: () => mockRequester(activePrepared),
  planAcceptance: (input) =>
    mockAcceptance(activePrepared, input as Record<string, unknown>),
};
const runtimeDependencies:
  AuthenticatedPaidWorkActivationPersistenceRuntimeDependenciesV1 = {
    executeActivationPersistence: (input, catalog) =>
      executeAuthenticatedPaidWorkActivationPersistenceV1(
        input,
        catalog,
        activationDependencies,
      ),
  };

const schema = readJson(
  "schemas/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.schema.json",
) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_RUNTIME_BINDING_SCHEMA_V1",
  "schema marker mismatch",
);
const docs = fs.readFileSync(
  path.resolve(
    "docs/operations/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.md",
  ),
  "utf8",
).replace(/\s+/g, " ");
const workflow = fs.readFileSync(
  path.resolve(
    ".github/workflows/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-runtime-binding-v1.yml",
  ),
  "utf8",
);
const source = fs.readFileSync(
  path.resolve(
    "scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts",
  ),
  "utf8",
);
for (const fragment of [
  "disabled by default",
  "confirmation is validated before the trusted-context provider or store is read",
  "loads both replay snapshots from the private server-side store",
  "**does not authorize or execute payment**",
  "requesters cannot supply a persistence root, replay state, or expected revision",
]) {
  assertCondition(docs.includes(fragment), `docs fragment missing: ${fragment}`);
}
assertCondition(
  workflow.includes(
    "prove_authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts",
  ),
  "workflow focused proof command missing",
);
assertCondition(
  workflow.includes(
    "prove_authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.ts",
  ),
  "workflow underlying activation proof command missing",
);
assertCondition(
  /uses:\s*actions\/checkout@v4\s+with:\s+fetch-depth:\s*0/.test(workflow),
  "workflow full-history checkout missing",
);
assertCondition(
  !/from\s+["']node:(?:http|https|net|tls|child_process)["']/.test(source),
  "runtime binding imports network or subprocess authority",
);
assertCondition(!/\bfetch\s*\(/.test(source), "runtime binding performs HTTP");
assertCondition(
  !source.includes("materializeAgentPaidWorkPaymentExecutionAuthorization"),
  "runtime binding materializes payment execution authorization",
);
assertCondition(
  !source.includes("request.persistence_config"),
  "runtime binding accepts client persistence configuration",
);

const disabledEnvironment =
  loadAuthenticatedPaidWorkActivationPersistenceRuntimeConfigFromEnvironmentV1(
    {},
  );
assertCondition(
  disabledEnvironment.enabled === false
    && disabledEnvironment.persistence_config === null,
  "environment default is not disabled",
);
expectReject(
  "invalid enabled environment flag",
  () =>
    loadAuthenticatedPaidWorkActivationPersistenceRuntimeConfigFromEnvironmentV1(
      {
        [AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED_ENV]:
          "yes",
      },
    ),
);
expectReject(
  "enabled environment without root",
  () =>
    loadAuthenticatedPaidWorkActivationPersistenceRuntimeConfigFromEnvironmentV1(
      {
        [AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED_ENV]:
          "1",
      },
    ),
);

let disabledProviderCalls = 0;
const disabledResult =
  executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
    example.config,
    null,
    () => {
      disabledProviderCalls += 1;
      throw new Error("disabled provider must not be called");
    },
    runtimeDependencies,
  );
assertCondition(
  disabledResult.status === "disabled"
    && disabledProviderCalls === 0
    && disabledResult.store_inspected === false
    && disabledResult.activation_persistence_result === null,
  "disabled runtime did not short-circuit",
);
assertCondition(
  Object.values(disabledResult.authority).every((value) => value === false),
  "disabled runtime granted authority",
);

const cliProofRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-paid-work-runtime-cli-no-read-proof-"),
);
const disabledCliConfigPath = path.join(
  cliProofRoot,
  "disabled-config.json",
);
const missingCommandPath = path.join(
  cliProofRoot,
  "missing-command.json",
);
const missingTrustedContextPath = path.join(
  cliProofRoot,
  "missing-trusted-context.json",
);
fs.writeFileSync(
  disabledCliConfigPath,
  `${JSON.stringify(example.config, null, 2)}\n`,
  { mode: 0o600 },
);
const runtimeCliPath = path.resolve(
  "scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.ts",
);
const tsxCliPath = path.resolve("node_modules/.bin/tsx");
const disabledCli = spawnSync(
  tsxCliPath,
  [
    runtimeCliPath,
    "execute",
    disabledCliConfigPath,
    missingCommandPath,
    missingTrustedContextPath,
  ],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env },
  },
);
assertCondition(
  disabledCli.status === 0,
  `disabled CLI failed: ${disabledCli.stderr}`,
);
const disabledCliResult = JSON.parse(disabledCli.stdout) as Record<
  string,
  unknown
>;
assertCondition(
  disabledCliResult.status === "disabled"
    && disabledCliResult.trusted_context_loaded === false
    && disabledCliResult.store_inspected === false
    && disabledCliResult.persistence_attempted === false,
  "disabled CLI result boundary failed",
);
assertCondition(
  !fs.existsSync(missingCommandPath)
    && !fs.existsSync(missingTrustedContextPath),
  "disabled CLI touched missing command or trusted-context paths",
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-paid-work-runtime-binding-proof-"),
);
fs.chmodSync(root, 0o700);
const enabledConfig = {
  marker:
    AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIG_MARKER,
  version: 1,
  enabled: true,
  persistence_config: {
    marker:
      "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_CONFIG_V1",
    version: 1,
    enabled: true,
    allowed_root: root,
    max_pointer_bytes: 65_536,
    max_generation_file_bytes: 4_194_304,
    max_generation_count: 10_000,
    recover_exact_orphaned_generation: true,
  },
};
const trustedContext = clone(example.trusted_context) as Record<string, unknown>;
const plannedCommand = clone(example.command) as Record<string, unknown>;
plannedCommand.requester_authentication_input = {
  synthetic_external_proof: true,
};
plannedCommand.apply = false;
plannedCommand.confirmation = "";
plannedCommand.recorded_at_utc = "2026-07-31T14:31:00Z";

let plannedProviderCalls = 0;
const planned = executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
  enabledConfig,
  plannedCommand,
  () => {
    plannedProviderCalls += 1;
    return trustedContext;
  },
  runtimeDependencies,
);
assertCondition(
  planned.status === "planned"
    && plannedProviderCalls === 1
    && planned.trusted_context_provider_calls === 1
    && planned.store_inspected
    && planned.acceptance_revision_before === 0
    && planned.payment_revision_before === 0
    && !fs.existsSync(path.join(root, "current.json")),
  "dry-run runtime planning failed",
);
assertCondition(
  Object.values(planned.authority).every((value) => value === false),
  "dry-run runtime granted authority",
);

let wrongConfirmationProviderCalls = 0;
const wrongConfirmation = clone(plannedCommand);
wrongConfirmation.apply = true;
wrongConfirmation.confirmation = "wrong";
const absentRootConfig = clone(enabledConfig) as Record<string, unknown>;
(
  absentRootConfig.persistence_config as Record<string, unknown>
).allowed_root = path.join(root, "does-not-exist");
expectReject(
  "wrong runtime confirmation",
  () =>
    executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
      absentRootConfig,
      wrongConfirmation,
      () => {
        wrongConfirmationProviderCalls += 1;
        return trustedContext;
      },
      runtimeDependencies,
    ),
  "confirmation must be",
);
assertCondition(
  wrongConfirmationProviderCalls === 0,
  "wrong confirmation invoked trusted provider before rejection",
);

const enabledCliConfigPath = path.join(
  cliProofRoot,
  "enabled-config.json",
);
const wrongCliCommandPath = path.join(
  cliProofRoot,
  "wrong-confirmation-command.json",
);
const stillMissingTrustedContextPath = path.join(
  cliProofRoot,
  "still-missing-trusted-context.json",
);
fs.writeFileSync(
  enabledCliConfigPath,
  `${JSON.stringify(enabledConfig, null, 2)}\n`,
  { mode: 0o600 },
);
fs.writeFileSync(
  wrongCliCommandPath,
  `${JSON.stringify(wrongConfirmation, null, 2)}\n`,
  { mode: 0o600 },
);
const wrongConfirmationCli = spawnSync(
  tsxCliPath,
  [
    runtimeCliPath,
    "execute",
    enabledCliConfigPath,
    wrongCliCommandPath,
    stillMissingTrustedContextPath,
  ],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env },
  },
);
assertCondition(
  wrongConfirmationCli.status !== 0
    && wrongConfirmationCli.stderr.includes("confirmation must be"),
  "CLI wrong confirmation did not fail before trusted-context file access",
);
assertCondition(
  !fs.existsSync(stillMissingTrustedContextPath)
    && !fs.existsSync(path.join(root, "current.json")),
  "CLI wrong confirmation touched trusted context or persistence state",
);

const clientStorageInjection = clone(plannedCommand) as Record<string, unknown>;
clientStorageInjection.persistence_config = enabledConfig.persistence_config;
expectReject(
  "client storage injection",
  () =>
    executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
      enabledConfig,
      clientStorageInjection,
      () => trustedContext,
      runtimeDependencies,
    ),
  "keys must be exact",
);

const mismatchedTrusted = clone(trustedContext) as Record<string, unknown>;
(
  mismatchedTrusted.quote as Record<string, unknown>
).nonce = "trusted-context-mismatch";
expectReject(
  "trusted quote mismatch",
  () =>
    executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
      enabledConfig,
      plannedCommand,
      () => mismatchedTrusted,
      runtimeDependencies,
    ),
  "trusted quote binding mismatch",
);
assertCondition(
  !fs.existsSync(path.join(root, "current.json")),
  "trusted-context mismatch wrote state",
);

const applyCommand = clone(plannedCommand);
applyCommand.apply = true;
applyCommand.confirmation =
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_CONFIRMATION;
applyCommand.recorded_at_utc = "2026-07-31T14:32:00Z";
let applyProviderCalls = 0;
const committed = executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
  enabledConfig,
  applyCommand,
  () => {
    applyProviderCalls += 1;
    return trustedContext;
  },
  runtimeDependencies,
);
assertCondition(
  committed.status === "committed"
    && applyProviderCalls === 1
    && committed.persistence_attempted
    && committed.persistence_status === "committed",
  "first runtime apply did not commit",
);
assertCondition(
  committed.authority.quote_acceptance
    && committed.authority.acceptance_persistence
    && committed.authority.payment_authorization,
  "runtime apply did not activate bounded authority",
);
assertCondition(
  committed.authority.payment_execution === false
    && committed.authority.payment_destination_resolution === false
    && committed.authority.transaction_construction === false
    && committed.authority.transaction_broadcast === false
    && committed.authority.work_execution_authorization === false
    && committed.authority.work_dispatch === false
    && committed.authority.wallet_access === false
    && committed.authority.money_movement === false,
  "runtime apply exceeded authority boundary",
);
assertCondition(
  committed.transaction_id
    === "voidawapat1_d0818505c3fc965c66a97aad730243a6e058007ae6c43b2a9afe62e5ef636275",
  "runtime transaction identity changed",
);
assertCondition(
  committed.generation_id
    === "voidawpag1_b01c3aae87f55261abe043f334ef0e81f1d6bf8bba536be86259158dcf430f1e",
  "runtime generation identity changed",
);

const inspectionAfterCommit =
  inspectAuthenticatedPaidWorkActivationPersistenceStoreV1(
    enabledConfig.persistence_config,
  );
assertCondition(
  inspectionAfterCommit.current_present
    && inspectionAfterCommit.acceptance_state.revision === 1
    && inspectionAfterCommit.payment_state.revision === 1,
  "server-side replay snapshots were not loaded from committed state",
);

const duplicateCommand = clone(applyCommand);
duplicateCommand.recorded_at_utc = "2026-07-31T14:33:00Z";
const duplicate = executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
  enabledConfig,
  duplicateCommand,
  () => trustedContext,
  runtimeDependencies,
);
assertCondition(
  duplicate.status === "duplicate"
    && duplicate.generation_id === committed.generation_id
    && duplicate.acceptance_revision_before === 1
    && duplicate.payment_revision_before === 1,
  "runtime duplicate reuse failed",
);

const conflictingCommand = clone(applyCommand) as Record<string, unknown>;
const conflictingPreparedInput =
  conflictingCommand.prepared_input as Record<string, unknown>;
(
  conflictingPreparedInput.payment_authority_plan as Record<string, unknown>
).nonce = "runtime-binding-conflict-20260731-0001";
conflictingCommand.prepared_packet =
  materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(
    conflictingPreparedInput,
  );
conflictingCommand.recorded_at_utc = "2026-07-31T14:34:00Z";
const conflictingTrusted = clone(trustedContext) as Record<string, unknown>;
conflictingTrusted.work_order = conflictingPreparedInput.work_order;
conflictingTrusted.quote = conflictingPreparedInput.quote;
expectReject(
  "runtime stale conflicting transition",
  () =>
    executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
      enabledConfig,
      conflictingCommand,
      () => conflictingTrusted,
      runtimeDependencies,
    ),
);

const currentPath = path.join(root, "current.json");
fs.unlinkSync(currentPath);
const recoveredCommand = clone(applyCommand);
recoveredCommand.recorded_at_utc = "2026-07-31T14:35:00Z";
const recovered = executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
  enabledConfig,
  recoveredCommand,
  () => trustedContext,
  runtimeDependencies,
);
assertCondition(
  recovered.status === "recovered"
    && recovered.generation_id === committed.generation_id,
  "runtime exact orphan recovery failed",
);
const postRecoveryDuplicate =
  executeAuthenticatedPaidWorkActivationPersistenceRuntimeBindingV1(
    enabledConfig,
    duplicateCommand,
    () => trustedContext,
    runtimeDependencies,
  );
assertCondition(
  postRecoveryDuplicate.status === "duplicate",
  "runtime post-recovery duplicate failed",
);

const enabledEnvironment =
  loadAuthenticatedPaidWorkActivationPersistenceRuntimeConfigFromEnvironmentV1(
    {
      [AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED_ENV]:
        "1",
      [AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT_ENV]: root,
      [AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_MAX_GENERATION_COUNT_ENV]:
        "10000",
      [AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_RECOVER_ORPHAN_ENV]:
        "1",
    },
  );
assertCondition(
  enabledEnvironment.enabled
    && enabledEnvironment.persistence_config?.allowed_root === root,
  "enabled environment config failed",
);

const defaultIdentity =
  authenticatedPaidWorkActivationPersistenceRuntimeDefaultDependencyIdentityV1();
assertCondition(
  defaultIdentity.execute_activation_persistence_exact,
  "runtime default dependency identity failed",
);
assertCondition(
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1
    .executeActivationPersistence
    === executeAuthenticatedPaidWorkActivationPersistenceV1,
  "runtime default dependency object drifted",
);

console.log(`packet_id=${committed.packet_id}`);
console.log(`acceptance_id=${committed.acceptance_id}`);
console.log(`payment_intent_id=${committed.payment_intent_id}`);
console.log(`transaction_id=${committed.transaction_id}`);
console.log(`generation_id=${committed.generation_id}`);
console.log("disabled_by_default=true");
console.log("disabled_provider_not_called=true");
console.log("disabled_cli_command_file_not_read=true");
console.log("disabled_cli_trusted_context_file_not_read=true");
console.log("cli_confirmation_precedes_trusted_context_file_read=true");
console.log("confirmation_precedes_provider_and_store_read=true");
console.log("trusted_context_provider_called_once=true");
console.log("trusted_work_order_bound=true");
console.log("trusted_quote_bound=true");
console.log("client_storage_configuration_rejected=true");
console.log("replay_snapshots_loaded_server_side=true");
console.log("dry_run_plans_without_persisting=true");
console.log("apply_injects_underlying_confirmation_server_side=true");
console.log("atomic_five_identity_persistence=true");
console.log("deterministic_duplicate_reuse=true");
console.log("stale_conflicting_transition_rejected=true");
console.log("exact_orphan_recovery=true");
console.log("temporary_activation_persistence_performed=true");
console.log("production_activation_persistence_performed=false");
console.log("effective_quote_acceptance=true_after_temporary_persistence");
console.log("effective_payment_authorization=true_after_temporary_persistence");
console.log("payment_execution=false");
console.log("payment_destination_resolution=false");
console.log("transaction_construction=false");
console.log("transaction_broadcast=false");
console.log("work_execution_authorization=false");
console.log("work_dispatch=false");
console.log("wallet_access=false");
console.log("work_credit_write=false");
console.log("void_settlement=false");
console.log("runtime_mutation=false");
console.log("money_movement=false");
console.log("schema_docs_workflow_boundary_checks=true");
console.log("network_and_subprocess_authority_absent=true");
console.log("payment_execution_materialization_absent=true");
fs.rmSync(cliProofRoot, { recursive: true, force: true });
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_RUNTIME_BINDING_V1_EXACT_GREEN",
);
