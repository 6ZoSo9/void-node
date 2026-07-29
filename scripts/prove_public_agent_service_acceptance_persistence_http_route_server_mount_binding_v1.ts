import assert from "node:assert/strict";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  type PublicAgentServiceAcceptancePersistenceHttpRequestV1,
  type PublicAgentServiceAcceptancePersistenceHttpResponseV1,
} from "./public_agent_service_acceptance_persistence_http_route_binding_v1.js";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_BINDING_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1,
  loadPublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigFromEnvironmentV1,
  publicAgentServiceAcceptancePersistenceHttpRouteServerMountDefaultDependencyIdentityV1,
  publicAgentServiceAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationV1,
} from "./public_agent_service_acceptance_persistence_http_route_server_mount_binding_v1.js";

const SOURCE_PACK_SHA =
  "4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec";
const SEALED_TRANSITION_MERGE =
  "525e1c8f6200f1a590de42270d5a08ad21c6281b";
const SEALED_TRANSITION_TAG =
  "ckpt-public-agent-service-acceptance-materialization-replay-consumer-v1-pr800-post-merge-exact-green-525e1c8f6200";
const SEALED_PERSISTENCE_ADAPTER_MERGE =
  "b6354ff1c8b15a51e3f6379077982355b5a4b258";
const SEALED_PERSISTENCE_ADAPTER_TAG =
  "ckpt-public-agent-service-acceptance-persistence-adapter-v1-pr804-post-merge-exact-green-b6354ff1c8b1";
const SEALED_RUNTIME_BINDING_MERGE =
  "ceef7f7ebd5ead737b08f517cddefa8c0d867efe";
const SEALED_RUNTIME_BINDING_TAG =
  "ckpt-public-agent-service-acceptance-persistence-runtime-binding-v1-pr809-post-merge-exact-green-ceef7f7ebd5e";
const SEALED_HTTP_ROUTE_BINDING_MERGE =
  "1abbf3399d3575780b9ff13eaf8a4d66a969180a";
const SEALED_HTTP_ROUTE_BINDING_TAG =
  "ckpt-public-agent-service-acceptance-persistence-http-route-binding-v1-pr812-post-merge-exact-green-1abbf3399d35";

const dryCommand = {
  marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
  version:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
  apply:
    false,
  confirmation:
    "",
} as const;

const applyCommand = {
  marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
  version:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
  apply:
    true,
  confirmation:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
} as const;

function responseFor(
  request: PublicAgentServiceAcceptancePersistenceHttpRequestV1,
): PublicAgentServiceAcceptancePersistenceHttpResponseV1 {
  const body = `${JSON.stringify({
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_PROOF_RESPONSE_V1",
    path:
      request.path,
  })}\n`;
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    status_code:
      200,
    headers: {
      "content-type":
        "application/json; charset=utf-8",
    },
    body,
    route_enabled:
      true,
    loopback_verified:
      true,
    runtime_config_loaded:
      false,
    runtime_invoked:
      false,
    runtime_status:
      null,
  };
}

class Registrar implements PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarV1 {
  inspectCalls = 0;
  registerCalls = 0;
  listenAccesses = 0;
  inspections:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1[];
  registered:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationV1[] =
      [];

  constructor(
    inspections:
      readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1[],
  ) {
    this.inspections = inspections;
  }

  get listen(): never {
    this.listenAccesses += 1;
    throw new Error("listener access forbidden");
  }

  inspectExactRoutes(
    routes:
      readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1[],
  ):
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1[] {
    this.inspectCalls += 1;
    assert.equal(
      routes.length,
      2,
    );
    return this.inspections;
  }

  registerExactRoutesAtomically(
    routes:
      readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrationV1[],
  ) {
    this.registerCalls += 1;
    this.registered = [...routes];
    return {
      registered:
        true,
      route_count:
        routes.length,
      handler_id:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    } as const;
  }
}

function inspections(
  state:
    "free" | "exact" | "conflict",
  conflictId =
    "other.handler.v1",
) {
  return publicAgentServiceAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1()
    .map((route) => ({
      ...route,
      state,
      existing_handler_id:
        state === "free"
          ? null
          : state === "exact"
            ? route.handler_id
            : conflictId,
    })) as readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1[];
}

const identity =
  publicAgentServiceAcceptancePersistenceHttpRouteServerMountDefaultDependencyIdentityV1();
assert.deepEqual(
  identity,
  {
    load_route_config_exact:
      true,
    handle_route_exact:
      true,
    sealed_route_default_dependencies_bound:
      true,
  },
);

assert.deepEqual(
  loadPublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigFromEnvironmentV1(
    {},
  ),
  {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
    version:
      1,
    enabled:
      false,
  },
);

assert.throws(
  () =>
    loadPublicAgentServiceAcceptancePersistenceHttpRouteServerMountConfigFromEnvironmentV1({
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
        "yes",
    }),
);

let routeConfigLoads = 0;
let routeCalls = 0;
let trustedContextCalls = 0;
const dependencies = {
  loadRouteConfig:
    (environment: NodeJS.ProcessEnv) => {
      routeConfigLoads += 1;
      return {
        marker:
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
        version:
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
        enabled:
          environment.VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED
            === "1",
        max_body_bytes:
          4096,
      } as const;
    },
  handleRoute:
    (
      _environment: NodeJS.ProcessEnv,
      request: PublicAgentServiceAcceptancePersistenceHttpRequestV1,
      trustedContextProvider: () => unknown,
    ) => {
      routeCalls += 1;
      trustedContextProvider();
      return responseFor(
        request,
      );
    },
};

const disabledRegistrar = new Registrar(
  inspections("free"),
);
const disabled = executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1(
  {},
  {
    malformed:
      true,
  },
  () => {
    trustedContextCalls += 1;
    return {};
  },
  disabledRegistrar,
  dependencies,
);
assert.equal(
  disabled.status,
  "disabled",
);
assert.equal(
  routeConfigLoads,
  0,
);
assert.equal(
  disabledRegistrar.inspectCalls,
  0,
);
assert.equal(
  disabledRegistrar.registerCalls,
  0,
);

const badConfirmationRegistrar = new Registrar(
  inspections("free"),
);
assert.throws(
  () =>
    executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
          "1",
        VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
          "1",
      },
      {
        ...applyCommand,
        confirmation:
          "wrong",
      },
      () => ({}),
      badConfirmationRegistrar,
      dependencies,
    ),
);
assert.equal(
  routeConfigLoads,
  0,
);
assert.equal(
  badConfirmationRegistrar.inspectCalls,
  0,
);

const routeDisabledRegistrar = new Registrar(
  inspections("free"),
);
const routeDisabled = executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1(
  {
    [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
      "1",
  },
  applyCommand,
  () => ({}),
  routeDisabledRegistrar,
  dependencies,
);
assert.equal(
  routeDisabled.status,
  "route_disabled",
);
assert.equal(
  routeDisabledRegistrar.inspectCalls,
  0,
);
assert.equal(
  routeDisabledRegistrar.registerCalls,
  0,
);

const dryRegistrar = new Registrar(
  inspections("free"),
);
const planned = executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1(
  {
    [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
      "1",
    VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
      "1",
  },
  dryCommand,
  () => ({}),
  dryRegistrar,
  dependencies,
);
assert.equal(
  planned.status,
  "planned",
);
assert.equal(
  dryRegistrar.inspectCalls,
  0,
);
assert.equal(
  dryRegistrar.registerCalls,
  0,
);

const conflictRegistrar = new Registrar(
  inspections("conflict"),
);
assert.throws(
  () =>
    executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
          "1",
        VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
          "1",
      },
      applyCommand,
      () => ({}),
      conflictRegistrar,
      dependencies,
    ),
);
assert.equal(
  conflictRegistrar.inspectCalls,
  1,
);
assert.equal(
  conflictRegistrar.registerCalls,
  0,
);

const partialStates = [
  ...inspections("free"),
].map((entry, index) => ({
  ...entry,
  state:
    index === 0
      ? "exact"
      : "free",
  existing_handler_id:
    index === 0
      ? entry.handler_id
      : null,
})) as readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerInspectionV1[];
const partialRegistrar = new Registrar(
  partialStates,
);
assert.throws(
  () =>
    executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
          "1",
        VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
          "1",
      },
      applyCommand,
      () => ({}),
      partialRegistrar,
      dependencies,
    ),
);
assert.equal(
  partialRegistrar.registerCalls,
  0,
);

const exactRegistrar = new Registrar(
  inspections("exact"),
);
const already = executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1(
  {
    [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
      "1",
    VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
      "1",
  },
  applyCommand,
  () => ({}),
  exactRegistrar,
  dependencies,
);
assert.equal(
  already.status,
  "already_mounted",
);
assert.equal(
  exactRegistrar.inspectCalls,
  1,
);
assert.equal(
  exactRegistrar.registerCalls,
  0,
);

const freeRegistrar = new Registrar(
  inspections("free"),
);
const mounted = executePublicAgentServiceAcceptancePersistenceHttpRouteServerMountBindingFromEnvironmentV1(
  {
    [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
      "1",
    VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
      "1",
  },
  applyCommand,
  () => {
    trustedContextCalls += 1;
    return {
      trusted:
        true,
    };
  },
  freeRegistrar,
  dependencies,
);
assert.equal(
  mounted.status,
  "mounted",
);
assert.equal(
  freeRegistrar.inspectCalls,
  1,
);
assert.equal(
  freeRegistrar.registerCalls,
  1,
);
assert.equal(
  freeRegistrar.registered.length,
  2,
);
assert.deepEqual(
  freeRegistrar.registered.map(
    ({ method, path, handler_id }) => ({
      method,
      path,
      handler_id,
    }),
  ),
  [
    {
      method:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
      path:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      handler_id:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    },
    {
      method:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
      path:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      handler_id:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    },
  ],
);

const request: PublicAgentServiceAcceptancePersistenceHttpRequestV1 = {
  marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
  version:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
  method:
    "GET",
  path:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  remote_address:
    "127.0.0.1",
  headers:
    {},
  body:
    "",
};
const mountedResponse =
  freeRegistrar.registered[0].handle(
    request,
  );
assert.equal(
  mountedResponse.status_code,
  200,
);
assert.equal(
  routeCalls,
  1,
);
assert.equal(
  trustedContextCalls,
  1,
);
assert.equal(
  freeRegistrar.listenAccesses,
  0,
);

const identities =
  publicAgentServiceAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1();
assert.equal(
  identities.length,
  2,
);
assert.ok(
  identities.every(
    (route) =>
      route.method
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD
      && route.handler_id
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  ),
);

const proof = {
  marker:
    "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_BINDING_V1_PROOF_GREEN",
  source_pack_sha256:
    SOURCE_PACK_SHA,
  sealed_transition_merge:
    SEALED_TRANSITION_MERGE,
  sealed_transition_checkpoint_tag:
    SEALED_TRANSITION_TAG,
  sealed_persistence_adapter_merge:
    SEALED_PERSISTENCE_ADAPTER_MERGE,
  sealed_persistence_adapter_checkpoint_tag:
    SEALED_PERSISTENCE_ADAPTER_TAG,
  sealed_runtime_binding_merge:
    SEALED_RUNTIME_BINDING_MERGE,
  sealed_runtime_binding_checkpoint_tag:
    SEALED_RUNTIME_BINDING_TAG,
  sealed_http_route_binding_merge:
    SEALED_HTTP_ROUTE_BINDING_MERGE,
  sealed_http_route_binding_checkpoint_tag:
    SEALED_HTTP_ROUTE_BINDING_TAG,
  binding_marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_BINDING_MARKER,
  mount_confirmation:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
  handler_id:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  status_path:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  command_path:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
  default_dependencies_exact:
    true,
  environment_disabled_by_default:
    true,
  invalid_enable_flag_rejected:
    true,
  disabled_short_circuit_before_command_validation:
    true,
  disabled_short_circuit_before_route_config_load:
    true,
  disabled_short_circuit_before_registrar:
    true,
  apply_confirmation_precedes_route_config_load:
    true,
  apply_confirmation_precedes_registrar:
    true,
  route_disabled_short_circuit_before_registrar:
    true,
  dry_run_plans_without_registrar:
    true,
  exact_route_set_two:
    true,
  exact_all_method_registration:
    true,
  handler_identity_exact:
    true,
  registrar_inspected_once:
    true,
  atomic_registration_invoked_once:
    true,
  already_mounted_idempotent:
    true,
  partial_state_rejected:
    true,
  conflicting_route_rejected:
    true,
  listener_method_not_accessed:
    true,
  server_environment_owned:
    true,
  trusted_context_provider_deferred_to_handler:
    true,
  mounted_handler_calls_sealed_route_exact:
    true,
  route_response_preserved:
    true,
  production_http_route_mounted:
    false,
  network_listener_created:
    false,
  external_http_submission:
    false,
  production_acceptance_persistence_performed:
    false,
  production_replay_write_performed:
    false,
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
  transaction_broadcast:
    false,
  work_credit_write:
    false,
  runtime_mutation:
    false,
  service_change:
    false,
  money_movement:
    false,
  proof:
    "green",
} as const;

process.stdout.write(
  `${JSON.stringify(proof, null, 2)}\n`,
);
