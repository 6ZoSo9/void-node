import assert from "node:assert/strict";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
  type PublicAgentServiceAcceptancePersistenceHttpRequestV1,
  type PublicAgentServiceAcceptancePersistenceHttpResponseV1,
} from "./public_agent_service_acceptance_persistence_http_route_binding_v1.js";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
  publicAgentServiceAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerHandlerV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerMountDependenciesV1,
} from "./public_agent_service_acceptance_persistence_http_route_server_mount_binding_v1.js";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_ADAPTER_ID,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
  createPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1,
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1,
  loadPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigFromEnvironmentV1,
  publicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationDefaultDependencyIdentityV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryV1,
} from "./public_agent_service_acceptance_persistence_http_route_server_registrar_integration_v1.js";

const SOURCE_PACK_SHA256 =
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
const SEALED_SERVER_MOUNT_BINDING_MERGE =
  "76c0ec79a3e7932f7f819fa205bfe6360ef8c9ab";
const SEALED_SERVER_MOUNT_BINDING_TAG =
  "ckpt-public-agent-service-acceptance-persistence-http-route-server-mount-binding-v1-pr816-post-merge-exact-green-76c0ec79a3e7";

const dryCommand = {
  marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
  version:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
  apply:
    false,
  confirmation:
    "",
  mount_confirmation:
    "",
} as const;

const applyCommand = {
  marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
  version:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
  apply:
    true,
  confirmation:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION,
  mount_confirmation:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
} as const;

function responseFor(
  request: PublicAgentServiceAcceptancePersistenceHttpRequestV1,
): PublicAgentServiceAcceptancePersistenceHttpResponseV1 {
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
    body:
      `${JSON.stringify({
        marker:
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_PROOF_RESPONSE_V1",
        path:
          request.path,
      })}\n`,
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

function unrelatedHandler(
  _request: PublicAgentServiceAcceptancePersistenceHttpRequestV1,
): PublicAgentServiceAcceptancePersistenceHttpResponseV1 {
  return responseFor({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    method:
      "GET",
    path:
      "/unrelated",
    remote_address:
      "127.0.0.1",
    headers:
      {},
    body:
      "",
  });
}

class Registry implements PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryV1 {
  snapshotCalls = 0;
  compareAndSwapCalls = 0;
  listenAccesses = 0;
  expectedRevisionSeen:
    string | null =
      null;
  nextRoutesSeen:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[]
      | null =
        null;
  routes:
    readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[];
  revision: string;
  failCompareAndSwap = false;

  constructor(
    routes:
      readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[] =
        [],
    revision =
      "registry-revision-1",
  ) {
    this.routes =
      [...routes];
    this.revision =
      revision;
  }

  get listen(): never {
    this.listenAccesses += 1;
    throw new Error(
      "listener access forbidden",
    );
  }

  readExactRouteSnapshot() {
    this.snapshotCalls += 1;
    return {
      revision:
        this.revision,
      routes:
        [...this.routes],
    };
  }

  compareAndSwapExactRouteSnapshot(
    expectedRevision: string,
    routes:
      readonly PublicAgentServiceAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
  ) {
    this.compareAndSwapCalls += 1;
    this.expectedRevisionSeen =
      expectedRevision;
    this.nextRoutesSeen =
      [...routes];
    if (
      this.failCompareAndSwap
      || expectedRevision
        !== this.revision
    ) {
      throw new Error(
        "registry revision changed",
      );
    }
    const previousRevision =
      this.revision;
    this.revision =
      "registry-revision-2";
    this.routes =
      [...routes];
    return {
      applied:
        true,
      previous_revision:
        previousRevision,
      next_revision:
        this.revision,
      route_count:
        routes.length,
    } as const;
  }
}

const unrelatedEntry = {
  method:
    "GET",
  path:
    "/health",
  handler_id:
    "void.health.v1",
  handle:
    unrelatedHandler,
} as const;

const mountDependencies:
  PublicAgentServiceAcceptancePersistenceHttpRouteServerMountDependenciesV1 =
    {
      loadRouteConfig:
        (environment) => ({
          marker:
            PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
          version:
            PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
          enabled:
            environment.VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED
              === "1",
          max_body_bytes:
            4096,
        }),
      handleRoute:
        (
          _environment,
          request,
          trustedContextProvider,
        ) => {
          trustedContextProvider();
          return responseFor(
            request,
          );
        },
    };

const identity =
  publicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationDefaultDependencyIdentityV1();
assert.deepEqual(
  identity,
  {
    execute_mount_exact:
      true,
    sealed_mount_default_dependencies_bound:
      true,
  },
);

assert.deepEqual(
  loadPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigFromEnvironmentV1(
    {},
  ),
  {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
    version:
      1,
    enabled:
      false,
  },
);

assert.throws(
  () =>
    loadPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationConfigFromEnvironmentV1({
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
        "yes",
    }),
);

let trustedContextCalls = 0;
const disabledRegistry =
  new Registry([
    unrelatedEntry,
  ]);
const disabled =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    {},
    {
      malformed:
        true,
    },
    () => {
      trustedContextCalls += 1;
      return {};
    },
    disabledRegistry,
    mountDependencies,
  );
assert.equal(
  disabled.status,
  "disabled",
);
assert.equal(
  disabledRegistry.snapshotCalls,
  0,
);
assert.equal(
  disabledRegistry.compareAndSwapCalls,
  0,
);

const wrongIntegrationConfirmation =
  new Registry([
    unrelatedEntry,
  ]);
assert.throws(
  () =>
    executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
          "1",
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
      wrongIntegrationConfirmation,
      mountDependencies,
    ),
);
assert.equal(
  wrongIntegrationConfirmation.snapshotCalls,
  0,
);

const wrongMountConfirmation =
  new Registry([
    unrelatedEntry,
  ]);
assert.throws(
  () =>
    executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
          "1",
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
          "1",
        VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
          "1",
      },
      {
        ...applyCommand,
        mount_confirmation:
          "wrong",
      },
      () => ({}),
      wrongMountConfirmation,
      mountDependencies,
    ),
);
assert.equal(
  wrongMountConfirmation.snapshotCalls,
  0,
);

const mountDisabledRegistry =
  new Registry([
    unrelatedEntry,
  ]);
const mountDisabled =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    {
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
        "1",
    },
    applyCommand,
    () => ({}),
    mountDisabledRegistry,
    mountDependencies,
  );
assert.equal(
  mountDisabled.status,
  "mount_disabled",
);
assert.equal(
  mountDisabledRegistry.snapshotCalls,
  0,
);

const routeDisabledRegistry =
  new Registry([
    unrelatedEntry,
  ]);
const routeDisabled =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    {
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
        "1",
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
        "1",
    },
    applyCommand,
    () => ({}),
    routeDisabledRegistry,
    mountDependencies,
  );
assert.equal(
  routeDisabled.status,
  "route_disabled",
);
assert.equal(
  routeDisabledRegistry.snapshotCalls,
  0,
);

const dryRegistry =
  new Registry([
    unrelatedEntry,
  ]);
const planned =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    {
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
        "1",
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
        "1",
      VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
        "1",
    },
    dryCommand,
    () => ({}),
    dryRegistry,
    mountDependencies,
  );
assert.equal(
  planned.status,
  "planned",
);
assert.equal(
  dryRegistry.snapshotCalls,
  0,
);
assert.equal(
  dryRegistry.compareAndSwapCalls,
  0,
);

const freeRegistry =
  new Registry([
    unrelatedEntry,
  ]);
const mounted =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    {
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
        "1",
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
    freeRegistry,
    mountDependencies,
  );
assert.equal(
  mounted.status,
  "mounted",
);
assert.equal(
  freeRegistry.snapshotCalls,
  1,
);
assert.equal(
  freeRegistry.compareAndSwapCalls,
  1,
);
assert.equal(
  freeRegistry.expectedRevisionSeen,
  "registry-revision-1",
);
assert.equal(
  freeRegistry.routes.length,
  3,
);
assert.equal(
  freeRegistry.routes[0].path,
  "/health",
);
assert.equal(
  mounted.unrelated_route_count_before,
  1,
);
assert.equal(
  mounted.unrelated_route_count_after,
  1,
);
assert.equal(
  mounted.exact_route_count_after,
  2,
);
assert.equal(
  trustedContextCalls,
  0,
);
assert.equal(
  freeRegistry.listenAccesses,
  0,
);

const registeredHandler =
  freeRegistry.routes.find(
    (entry) =>
      entry.handler_id
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  )?.handle;
assert.equal(
  typeof registeredHandler,
  "function",
);
const routedResponse =
  registeredHandler!({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    method:
      "GET",
    path:
      publicAgentServiceAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1()[0].path,
    remote_address:
      "127.0.0.1",
    headers:
      {},
    body:
      "",
  });
assert.equal(
  routedResponse.status_code,
  200,
);
assert.equal(
  trustedContextCalls,
  1,
);

const exactRegistry =
  new Registry([
    unrelatedEntry,
    ...freeRegistry.routes.filter(
      (entry) =>
        entry.handler_id
          === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    ),
  ]);
const alreadyMounted =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    {
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
        "1",
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
        "1",
      VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
        "1",
    },
    applyCommand,
    () => ({}),
    exactRegistry,
    mountDependencies,
  );
assert.equal(
  alreadyMounted.status,
  "already_mounted",
);
assert.equal(
  exactRegistry.snapshotCalls,
  1,
);
assert.equal(
  exactRegistry.compareAndSwapCalls,
  0,
);

const canonical =
  publicAgentServiceAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1();
const partialRegistry =
  new Registry([
    unrelatedEntry,
    {
      ...freeRegistry.routes.find(
        (entry) =>
          entry.path
            === canonical[0].path,
      )!,
    },
  ]);
assert.throws(
  () =>
    executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
          "1",
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
          "1",
        VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
          "1",
      },
      applyCommand,
      () => ({}),
      partialRegistry,
      mountDependencies,
    ),
);
assert.equal(
  partialRegistry.compareAndSwapCalls,
  0,
);

const conflictRegistry =
  new Registry([
    unrelatedEntry,
    {
      method:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
      path:
        canonical[0].path,
      handler_id:
        "other.handler.v1",
      handle:
        unrelatedHandler,
    },
    {
      method:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
      path:
        canonical[1].path,
      handler_id:
        "other.handler.v1",
      handle:
        unrelatedHandler,
    },
  ]);
assert.throws(
  () =>
    executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
          "1",
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
          "1",
        VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
          "1",
      },
      applyCommand,
      () => ({}),
      conflictRegistry,
      mountDependencies,
    ),
);
assert.equal(
  conflictRegistry.compareAndSwapCalls,
  0,
);

const duplicateRegistry =
  new Registry([
    unrelatedEntry,
    unrelatedEntry,
  ]);
assert.throws(
  () =>
    executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
          "1",
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
          "1",
        VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
          "1",
      },
      applyCommand,
      () => ({}),
      duplicateRegistry,
      mountDependencies,
    ),
);
assert.equal(
  duplicateRegistry.compareAndSwapCalls,
  0,
);

const staleRegistry =
  new Registry([
    unrelatedEntry,
  ]);
staleRegistry.failCompareAndSwap =
  true;
assert.throws(
  () =>
    executePublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
          "1",
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
          "1",
        VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
          "1",
      },
      applyCommand,
      () => ({}),
      staleRegistry,
      mountDependencies,
    ),
);
assert.equal(
  staleRegistry.compareAndSwapCalls,
  1,
);
assert.equal(
  staleRegistry.routes.length,
  1,
);

const directRegistry =
  new Registry([
    unrelatedEntry,
  ]);
const integrated =
  createPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
    directRegistry,
  );
assert.throws(
  () =>
    integrated.registrar.inspectExactRoutes([
      {
        method:
          "GET",
        path:
          "/wrong",
        handler_id:
          "wrong",
      },
      canonical[1],
    ]),
);
assert.equal(
  directRegistry.snapshotCalls,
  0,
);

const oneShotRegistry =
  new Registry([
    unrelatedEntry,
  ]);
const oneShot =
  createPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
    oneShotRegistry,
  );
oneShot.registrar.inspectExactRoutes(
  canonical,
);
assert.throws(
  () =>
    oneShot.registrar.inspectExactRoutes(
      canonical,
    ),
);

const withoutInspectionRegistry =
  new Registry([
    unrelatedEntry,
  ]);
const withoutInspection =
  createPublicAgentServiceAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
    withoutInspectionRegistry,
  );
assert.throws(
  () =>
    withoutInspection.registrar.registerExactRoutesAtomically(
      canonical.map(
        (identity) => ({
          ...identity,
          handle:
            unrelatedHandler,
        }),
      ),
    ),
);
assert.equal(
  withoutInspectionRegistry.compareAndSwapCalls,
  0,
);

assert.equal(
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_ADAPTER_ID,
  "void.public-agent-service-acceptance-persistence-http-route-server-registrar.v1",
);
assert.equal(
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_MARKER,
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_V1",
);
assert.equal(
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER,
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_V1",
);

const proof = {
  marker:
    "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_V1_PROOF_GREEN",
  source_pack_sha256:
    SOURCE_PACK_SHA256,
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
  sealed_server_mount_binding_merge:
    SEALED_SERVER_MOUNT_BINDING_MERGE,
  sealed_server_mount_binding_checkpoint_tag:
    SEALED_SERVER_MOUNT_BINDING_TAG,
  binding_marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_MARKER,
  integration_confirmation:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION,
  mount_confirmation:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
  registrar_adapter_id:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_ADAPTER_ID,
  default_dependencies_exact:
    identity.execute_mount_exact,
  environment_disabled_by_default:
    true,
  invalid_enable_flag_rejected:
    true,
  disabled_short_circuit_before_command_validation:
    true,
  integration_confirmation_precedes_registry_access:
    true,
  mount_confirmation_precedes_registry_access:
    true,
  mount_disabled_short_circuit_before_registry_access:
    true,
  route_disabled_short_circuit_before_registry_access:
    true,
  dry_run_without_registry_access:
    true,
  canonical_identity_set_enforced:
    true,
  registry_snapshot_read_once:
    true,
  duplicate_route_keys_rejected:
    true,
  unrelated_routes_preserved:
    true,
  compare_and_swap_expected_revision_exact:
    true,
  compare_and_swap_route_count_exact:
    true,
  compare_and_swap_invoked_once:
    true,
  stale_revision_rejected:
    true,
  stale_revision_no_partial_mutation:
    true,
  already_mounted_idempotent:
    true,
  partial_state_rejected:
    true,
  conflicting_route_rejected:
    true,
  inspection_one_shot:
    true,
  registration_requires_inspection:
    true,
  trusted_context_provider_deferred_to_handler:
    true,
  mounted_handler_response_preserved:
    true,
  listener_method_not_accessed:
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
  `${JSON.stringify(
    proof,
    null,
    2,
  )}\n`,
);
