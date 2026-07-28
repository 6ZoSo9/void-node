import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
  executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1,
  loadPublicAgentServiceAcceptancePersistenceRuntimeConfigFromEnvironmentV1,
  publicAgentServiceAcceptancePersistenceRuntimeDefaultDependencyIdentityV1,
  type PublicAgentServiceAcceptancePersistenceRuntimeDependenciesV1,
} from "./public_agent_service_acceptance_persistence_runtime_binding_v1.js";

const EMPTY_STATE_ID =
  "voidawrs1_09fcfb20aa71c21c83beddec7ca3965d2bcd98d13c08d9f0e70842e0f255d678";
const NEXT_STATE_ID =
  "voidawrs1_1111111111111111111111111111111111111111111111111111111111111111";
const PLAN_ID =
  "voidawacp1_2222222222222222222222222222222222222222222222222222222222222222";
const ACCEPTANCE_ID =
  "voidawa1_3333333333333333333333333333333333333333333333333333333333333333";
const TRANSACTION_ID =
  "voidawact1_4444444444444444444444444444444444444444444444444444444444444444";
const GENERATION_ID =
  "voidawpg1_5555555555555555555555555555555555555555555555555555555555555555";
const OPERATION_ID =
  "voidawpo1_6666666666666666666666666666666666666666666666666666666666666666";
const REQUESTER_AUTH_ID =
  "voidawra1_7777777777777777777777777777777777777777777777777777777777777777";
const PROVIDER_AUTH_ID =
  "voidawqa1_8888888888888888888888888888888888888888888888888888888888888888";
const QUOTE_ID =
  "voidawq1_9999999999999999999999999999999999999999999999999999999999999999";
const WORK_ORDER_ID =
  "voidawo1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function expectReject(
  label: string,
  operation: () => unknown,
): void {
  let rejected = false;
  try {
    operation();
  } catch {
    rejected = true;
  }
  assertCondition(rejected, `${label} did not reject`);
}

function emptyState() {
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1" as const,
    version: 1 as const,
    revision: 0,
    consumed_requester_authentication_ids: [] as string[],
    consumed_provider_authentication_ids: [] as string[],
    consumed_acceptance_ids: [] as string[],
    active_acceptance_by_quote: {} as Record<string, string>,
    state_id: EMPTY_STATE_ID,
  };
}

function currentState() {
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1" as const,
    version: 1 as const,
    revision: 7,
    consumed_requester_authentication_ids: [
      "voidawra1_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    ],
    consumed_provider_authentication_ids: [
      "voidawqa1_cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    ],
    consumed_acceptance_ids: [
      "voidawa1_dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    ],
    active_acceptance_by_quote: {
      [
        "voidawq1_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      ]:
        "voidawa1_dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    },
    state_id:
      "voidawrs1_ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  };
}

function packetForState(
  before: ReturnType<typeof emptyState> | ReturnType<typeof currentState>,
) {
  const next = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1" as const,
    version: 1 as const,
    revision: before.revision + 1,
    consumed_requester_authentication_ids: [
      ...before.consumed_requester_authentication_ids,
      REQUESTER_AUTH_ID,
    ],
    consumed_provider_authentication_ids: [
      ...before.consumed_provider_authentication_ids,
      PROVIDER_AUTH_ID,
    ],
    consumed_acceptance_ids: [
      ...before.consumed_acceptance_ids,
      ACCEPTANCE_ID,
    ],
    active_acceptance_by_quote: {
      ...before.active_acceptance_by_quote,
      [QUOTE_ID]: ACCEPTANCE_ID,
    },
    state_id:
      before.revision === 0
        ? NEXT_STATE_ID
        : "voidawrs1_1212121212121212121212121212121212121212121212121212121212121212",
  };
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_V1" as const,
    version: 1 as const,
    plan_id: PLAN_ID,
    status:
      "acceptance_materialization_planned" as const,
    source_evidence: {
      source_pack_sha256:
        "4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec" as const,
      source_commit:
        "182228a1a9c4b31ec5ce9dc4b0fa1383938913df" as const,
      diagnostic_correction:
        "acceptance_specific_persistent_replay_consumer_not_found" as const,
      canonical_acceptance_materializer_verified:
        true as const,
      declarative_replay_requirements_verified:
        true as const,
      production_persistence_consumer_verified:
        false as const,
    },
    source: {
      requester_authentication_id:
        REQUESTER_AUTH_ID,
      provider_authentication_id:
        PROVIDER_AUTH_ID,
      handoff_id:
        "voidawah1_1313131313131313131313131313131313131313131313131313131313131313",
      quote_id:
        QUOTE_ID,
      work_order_id:
        WORK_ORDER_ID,
      requester_agent_id:
        "agent.example.runtime.requester",
      provider_id:
        "void.provider.example.runtime",
      acceptance_nonce:
        "runtime-binding-proof-acceptance-0001",
    },
    acceptance: {
      preview_acceptance_id:
        ACCEPTANCE_ID,
      acceptance_id:
        ACCEPTANCE_ID,
      acceptance_materialized_in_memory:
        true,
      acceptance_created_in_durable_state:
        false as const,
      acceptance_envelope: {
        marker:
          "VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1",
        version: 1,
        acceptance_id:
          ACCEPTANCE_ID,
        work_order_id:
          WORK_ORDER_ID,
        quote_id:
          QUOTE_ID,
        created_at_utc:
          "2030-01-01T00:07:00Z",
        expires_at_utc:
          "2030-01-01T19:00:00Z",
        requester: {
          agent_id:
            "agent.example.runtime.requester",
        },
        provider: {
          provider_id:
            "void.provider.example.runtime",
          capability_id:
            "datanet.fetch_verify",
        },
        commercial: {
          quote_asset: "USD",
          total: "3.50",
          payment_rail_id:
            "void.external.prepaid.v1",
        },
        terms: {
          quote_terms_accepted: true,
          requester_authentication_required: true,
          provider_authentication_required: true,
          separate_payment_authorization_required: true,
          separate_execution_authorization_required: true,
          acceptance_is_not_payment_instruction: true,
          acceptance_is_not_execution_instruction: true,
          acceptance_is_not_funds_reservation: true,
          payment_authorization_granted: false,
          execution_authorization_granted: false,
          acceptance_replay_protection_required: true,
          single_active_acceptance_per_quote_required: true,
        },
        nonce:
          "runtime-binding-proof-acceptance-0001",
      },
    },
    replay: {
      before_state:
        before,
      next_state:
        next,
      transaction: {
        marker:
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_TRANSACTION_V1" as const,
        version: 1 as const,
        transaction_id:
          TRANSACTION_ID,
        before_state_id:
          before.state_id,
        after_state_id:
          next.state_id,
        before_revision:
          before.revision,
        after_revision:
          next.revision,
        requester_authentication_id:
          REQUESTER_AUTH_ID,
        provider_authentication_id:
          PROVIDER_AUTH_ID,
        acceptance_id:
          ACCEPTANCE_ID,
        quote_id:
          QUOTE_ID,
        work_order_id:
          WORK_ORDER_ID,
        requester_agent_id:
          "agent.example.runtime.requester",
        atomic_consumption_count:
          3 as const,
        requester_authentication_consumed:
          true as const,
        provider_authentication_consumed:
          true as const,
        acceptance_id_consumed:
          true as const,
        single_active_acceptance_per_quote_enforced:
          true as const,
      },
      requester_authentication_replay_checked:
        true as const,
      provider_authentication_replay_checked:
        true as const,
      acceptance_replay_checked:
        true as const,
      single_active_acceptance_per_quote_checked:
        true as const,
      expected_revision_checked:
        true as const,
      all_or_nothing_transition_verified:
        true as const,
      production_persistence_consumer_verified:
        false as const,
    },
    authority: {
      acceptance_persistence: false as const,
      quote_acceptance: false as const,
      requester_authentication_replay_write: false as const,
      provider_authentication_replay_write: false as const,
      acceptance_replay_write: false as const,
      payment_authorization: false as const,
      payment_execution: false as const,
      execution_authorization: false as const,
      work_dispatch: false as const,
      credential_issue: false as const,
      credential_change: false as const,
      provider_selection: false as const,
      requester_key_registry_write: false as const,
      provider_key_registry_write: false as const,
      wallet_access: false as const,
      production_signing: false as const,
      transaction_broadcast: false as const,
      work_credit_write: false as const,
      http_submission: false as const,
      runtime_mutation: false as const,
      money_movement: false as const,
    },
  };
}

function receipt(
  status: "committed" | "duplicate" | "recovered",
  packet: ReturnType<typeof packetForState>,
) {
  const transaction = packet.replay.transaction;
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RECEIPT_V1" as const,
    version: 1 as const,
    status,
    operation_id:
      OPERATION_ID,
    allowed_root_realpath:
      "/tmp/void-runtime-binding-proof-store",
    generation_id:
      GENERATION_ID,
    parent_generation_id:
      null,
    pointer_id:
      "voidawpp1_1414141414141414141414141414141414141414141414141414141414141414",
    transaction_id:
      transaction.transaction_id,
    acceptance_id:
      packet.acceptance.acceptance_id as string,
    quote_id:
      QUOTE_ID,
    before_state_id:
      transaction.before_state_id,
    after_state_id:
      transaction.after_state_id,
    before_revision:
      transaction.before_revision,
    after_revision:
      transaction.after_revision,
    atomic_consumption_count: 3 as const,
    acceptance_persisted: true as const,
    requester_authentication_replay_persisted: true as const,
    provider_authentication_replay_persisted: true as const,
    acceptance_replay_persisted: true as const,
    single_active_acceptance_per_quote_enforced: true as const,
    immutable_generation_published: true as const,
    current_pointer_published: true as const,
    generation_recovered:
      status === "recovered",
    exact_duplicate:
      status === "duplicate",
    lock_acquired: true as const,
    lock_released: true as const,
    generation_files_mode: "0600" as const,
    store_directories_mode: "0700" as const,
    generation_directory_fsync: true as const,
    generations_parent_fsync: true as const,
    current_pointer_fsync: true as const,
    root_directory_fsync: true as const,
    authority: {
      acceptance_persistence: true as const,
      quote_acceptance_recorded: true as const,
      requester_authentication_replay_write: true as const,
      provider_authentication_replay_write: true as const,
      acceptance_replay_write: true as const,
      payment_authorization: false as const,
      payment_execution: false as const,
      execution_authorization: false as const,
      work_dispatch: false as const,
      credential_issue: false as const,
      credential_change: false as const,
      provider_selection: false as const,
      requester_key_registry_write: false as const,
      provider_key_registry_write: false as const,
      wallet_access: false as const,
      production_signing: false as const,
      transaction_broadcast: false as const,
      work_credit_write: false as const,
      http_submission: false as const,
      runtime_mutation: false as const,
      money_movement: false as const,
    },
  };
}

function config(enabled: boolean) {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    version: 1,
    enabled,
    persistence_config: {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_V1",
      version: 1,
      allowed_root:
        "/tmp/void-runtime-binding-proof-store",
      max_pointer_bytes:
        65_536,
      max_generation_file_bytes:
        4_194_304,
      max_generation_count:
        10_000,
      recover_exact_orphaned_generation:
        true,
    },
  };
}

function command(
  apply: boolean,
  confirmation = apply
    ? PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION
    : "",
) {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
    version: 1,
    apply,
    confirmation,
    recorded_at_utc:
      "2030-01-01T00:10:00Z",
    requester_authentication_input: {
      marker: "signed-requester-authentication-proof-input",
    },
    acceptance_draft: {
      marker: "acceptance-draft-proof-input",
    },
  };
}

function trustedContext() {
  return {
    catalog: {
      marker: "trusted-catalog",
    },
    work_order: {
      marker: "trusted-work-order",
    },
    quote: {
      marker: "trusted-quote",
    },
  };
}

function fakeDependencies(
  before: ReturnType<typeof emptyState> | ReturnType<typeof currentState>,
  persistenceStatus: "committed" | "duplicate" | "recovered" = "committed",
) {
  const calls = {
    stateId: 0,
    inspect: 0,
    plan: 0,
    verify: 0,
    persist: 0,
    provider: 0,
  };
  let plannedInput: Record<string, unknown> | null = null;
  const packet = packetForState(before);
  const dependencies: PublicAgentServiceAcceptancePersistenceRuntimeDependenciesV1 = {
    acceptanceReplayStateId: (draft) => {
      calls.stateId += 1;
      assertCondition(
        draft.revision === 0,
        "empty-state draft revision changed",
      );
      return EMPTY_STATE_ID;
    },
    inspectStore: () => {
      calls.inspect += 1;
      return {
        root_realpath:
          "/tmp/void-runtime-binding-proof-store",
        current:
          before.revision === 0
            ? null
            : {
                replayState: before,
              },
        generation_count:
          before.revision,
      };
    },
    plan: (input) => {
      calls.plan += 1;
      assertCondition(
        input !== null
          && typeof input === "object"
          && !Array.isArray(input),
        "planner input changed",
      );
      plannedInput = input as Record<string, unknown>;
      return packet as never;
    },
    verify: (_input, _catalog, _workOrder, _quote, candidate) => {
      calls.verify += 1;
      assertCondition(
        candidate === packet,
        "verification packet identity changed",
      );
      return packet as never;
    },
    persist: (_config, request, packetProvider) => {
      calls.persist += 1;
      assertCondition(
        request !== null
          && typeof request === "object"
          && !Array.isArray(request),
        "persistence request changed",
      );
      const requestRecord = request as Record<string, unknown>;
      assertCondition(
        requestRecord.confirmation
          === "persistVerifiedAcceptanceReplayTransitionV1",
        "binding did not use the sealed adapter confirmation",
      );
      assertCondition(
        packetProvider() === packet,
        "persistence packet provider changed",
      );
      return receipt(
        persistenceStatus,
        packet,
      ) as never;
    },
  };
  return {
    calls,
    packet,
    dependencies,
    plannedInput: () => plannedInput,
    provider: () => {
      calls.provider += 1;
      return trustedContext();
    },
  };
}

function main(): void {
  const defaultIdentity =
    publicAgentServiceAcceptancePersistenceRuntimeDefaultDependencyIdentityV1();
  assertCondition(
    Object.values(defaultIdentity)
      .every((value) => value === true),
    "default dependencies are not exact",
  );
  assertCondition(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_DEFAULT_DEPENDENCIES_V1
      .persist
      !== undefined,
    "default persistence dependency is unavailable",
  );

  const disabled = fakeDependencies(emptyState());
  const disabledResult =
    executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1(
      config(false),
      { malformed: true },
      () => {
        disabled.calls.provider += 1;
        fail("disabled runtime loaded trusted context");
      },
      disabled.dependencies,
    );
  assertCondition(
    disabledResult.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
    "disabled result marker changed",
  );
  assertCondition(
    disabledResult.status === "disabled"
      && disabledResult.enabled === false
      && disabledResult.store_inspected === false
      && disabledResult.persistence_attempted === false,
    "disabled runtime did not short-circuit",
  );
  assertCondition(
    Object.values(disabled.calls)
      .every((value) => value === 0),
    "disabled runtime invoked a dependency",
  );

  const wrongConfirmation = fakeDependencies(emptyState());
  expectReject(
    "wrong apply confirmation",
    () => executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1(
      config(true),
      command(true, "wrong-confirmation"),
      wrongConfirmation.provider,
      wrongConfirmation.dependencies,
    ),
  );
  assertCondition(
    Object.values(wrongConfirmation.calls)
      .every((value) => value === 0),
    "wrong confirmation was not rejected before store/context access",
  );

  const dry = fakeDependencies(emptyState());
  const dryResult =
    executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1(
      config(true),
      command(false),
      dry.provider,
      dry.dependencies,
    );
  assertCondition(
    dryResult.status === "planned"
      && dryResult.acceptance_id === ACCEPTANCE_ID
      && dryResult.transaction_id === TRANSACTION_ID
      && dryResult.before_revision === 0
      && dryResult.after_revision === 1
      && dryResult.persistence_attempted === false
      && dryResult.acceptance_persisted === false,
    "dry-run result changed",
  );
  assertCondition(
    dry.calls.inspect === 1
      && dry.calls.stateId === 1
      && dry.calls.provider === 1
      && dry.calls.plan === 1
      && dry.calls.verify === 1
      && dry.calls.persist === 0,
    "dry-run dependency ordering changed",
  );
  assertCondition(
    Object.values(dryResult.authority)
      .every((value) => value === false),
    "dry-run gained authority",
  );

  const applied = fakeDependencies(emptyState(), "committed");
  const appliedResult =
    executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1(
      config(true),
      command(true),
      applied.provider,
      applied.dependencies,
    );
  assertCondition(
    appliedResult.status === "persisted"
      && appliedResult.persistence_status === "persisted"
      && appliedResult.confirmation_verified === true
      && appliedResult.persistence_attempted === true
      && appliedResult.acceptance_persisted === true
      && appliedResult.generation_id === GENERATION_ID
      && appliedResult.operation_id === OPERATION_ID,
    "applied result changed",
  );
  assertCondition(
    applied.calls.inspect === 1
      && applied.calls.stateId === 1
      && applied.calls.provider === 1
      && applied.calls.plan === 1
      && applied.calls.verify === 1
      && applied.calls.persist === 1,
    "applied dependency ordering changed",
  );
  assertCondition(
    appliedResult.authority.acceptance_persistence
      && appliedResult.authority.quote_acceptance_recorded
      && appliedResult.authority.requester_authentication_replay_write
      && appliedResult.authority.provider_authentication_replay_write
      && appliedResult.authority.acceptance_replay_write,
    "applied result omitted persistence authority",
  );
  assertCondition(
    appliedResult.authority.payment_authorization === false
      && appliedResult.authority.payment_execution === false
      && appliedResult.authority.execution_authorization === false
      && appliedResult.authority.work_dispatch === false
      && appliedResult.authority.wallet_access === false
      && appliedResult.authority.transaction_broadcast === false
      && appliedResult.authority.money_movement === false,
    "applied result gained unrelated authority",
  );

  for (const status of [
    "duplicate",
    "recovered",
  ] as const) {
    const scenario = fakeDependencies(emptyState(), status);
    const result =
      executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1(
        config(true),
        command(true),
        scenario.provider,
        scenario.dependencies,
      );
    assertCondition(
      result.status === status
        && result.persistence_status === status
        && result.acceptance_persisted,
      `${status} persistence status was not preserved`,
    );
  }

  const existing = fakeDependencies(currentState());
  const existingResult =
    executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1(
      config(true),
      command(false),
      existing.provider,
      existing.dependencies,
    );
  const existingInput = existing.plannedInput();
  assertCondition(
    existingInput !== null,
    "existing-state planner input was not captured",
  );
  assertCondition(
    existingInput.expected_state_revision === 7,
    "runtime did not derive revision from the server store",
  );
  assertCondition(
    (existingInput.replay_state_snapshot as { state_id: string })
      .state_id
      === currentState().state_id,
    "runtime did not use the server replay-state snapshot",
  );
  assertCondition(
    existing.calls.stateId === 0
      && existingResult.before_revision === 7
      && existingResult.after_revision === 8,
    "existing-state plan changed",
  );

  const clientPath = command(false) as Record<string, unknown>;
  clientPath.allowed_root = "/client/forbidden";
  const clientPathScenario = fakeDependencies(emptyState());
  expectReject(
    "client storage configuration",
    () => executePublicAgentServiceAcceptancePersistenceRuntimeBindingV1(
      config(true),
      clientPath,
      clientPathScenario.provider,
      clientPathScenario.dependencies,
    ),
  );
  assertCondition(
    Object.values(clientPathScenario.calls)
      .every((value) => value === 0),
    "client storage configuration reached dependencies",
  );

  const disabledEnvironment =
    loadPublicAgentServiceAcceptancePersistenceRuntimeConfigFromEnvironmentV1({
      VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT:
        "/var/lib/void-agent-paid-work-acceptance-persistence-v1",
    });
  assertCondition(
    disabledEnvironment.enabled === false,
    "environment config is not disabled by default",
  );
  const enabledEnvironment =
    loadPublicAgentServiceAcceptancePersistenceRuntimeConfigFromEnvironmentV1({
      VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED:
        "1",
      VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT:
        "/var/lib/void-agent-paid-work-acceptance-persistence-v1",
      VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_MAX_GENERATION_COUNT:
        "5000",
    });
  assertCondition(
    enabledEnvironment.enabled
      && enabledEnvironment.persistence_config.max_generation_count === 5000,
    "environment enablement config changed",
  );
  expectReject(
    "invalid enable flag",
    () => loadPublicAgentServiceAcceptancePersistenceRuntimeConfigFromEnvironmentV1({
      VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED:
        "yes",
      VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT:
        "/var/lib/void-agent-paid-work-acceptance-persistence-v1",
    }),
  );
  expectReject(
    "missing server root",
    () => loadPublicAgentServiceAcceptancePersistenceRuntimeConfigFromEnvironmentV1({}),
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        marker:
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_BINDING_V1_PROOF_GREEN",
        sealed_persistence_adapter_merge:
          "b6354ff1c8b15a51e3f6379077982355b5a4b258",
        sealed_persistence_adapter_checkpoint_tag:
          "ckpt-public-agent-service-acceptance-persistence-adapter-v1-pr804-post-merge-exact-green-b6354ff1c8b1",
        sealed_transition_merge:
          "525e1c8f6200f1a590de42270d5a08ad21c6281b",
        sealed_transition_checkpoint_tag:
          "ckpt-public-agent-service-acceptance-materialization-replay-consumer-v1-pr800-post-merge-exact-green-525e1c8f6200",
        source_pack_sha256:
          "4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec",
        default_dependencies_exact:
          true,
        environment_disabled_by_default:
          true,
        environment_enable_requires_server_root:
          true,
        invalid_enable_flag_rejected:
          true,
        disabled_short_circuit_verified:
          true,
        apply_confirmation_precedes_store_read:
          true,
        client_storage_configuration_rejected:
          true,
        trusted_context_provider_called_once:
          true,
        replay_state_loaded_server_side:
          true,
        dry_run_plans_without_persisting:
          true,
        apply_invokes_persistence_once:
          true,
        adapter_confirmation_injected_server_side:
          true,
        committed_status_mapped_to_persisted:
          true,
        duplicate_status_preserved:
          true,
        recovered_status_preserved:
          true,
        acceptance_persistence_authority_bounded:
          true,
        payment_authorization:
          false,
        payment_execution:
          false,
        execution_authorization:
          false,
        work_dispatch:
          false,
        production_signing:
          false,
        http_submission:
          false,
        runtime_mutation:
          false,
        money_movement:
          false,
        production_acceptance_persistence_performed:
          false,
        production_replay_write_performed:
          false,
        proof:
          "green",
      },
      null,
      2,
    )}\n`,
  );
}

main();
