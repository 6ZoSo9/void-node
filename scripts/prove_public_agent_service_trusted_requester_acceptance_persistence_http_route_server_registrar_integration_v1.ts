import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_VERSION,
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerHandlerV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_server_mount_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_ADAPTER_ID,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
  createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1,
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1,
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1,
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationDefaultDependencyIdentityV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_server_registrar_integration_v1.js";

const ROOT = path.resolve(
  path.dirname(
    new URL(import.meta.url).pathname,
  ),
  "..",
);

function integrationConfig(
  enabled: boolean,
) {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
    enabled,
  };
}

const dryCommand = {
  marker:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
  version:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
  apply:
    false,
  confirmation:
    "",
  mount_confirmation:
    "",
};

const applyCommand = {
  marker:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_MARKER,
  version:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
  apply:
    true,
  confirmation:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION,
  mount_confirmation:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
};

function routeConfig(
  enabled: boolean,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    enabled,
    max_body_bytes:
      4096,
  };
}

function responseFor(
  request:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    status_code:
      200,
    headers: {
      "content-type":
        "application/json; charset=utf-8",
    },
    body:
      JSON.stringify({
        path:
          request.path,
      }),
    route_enabled:
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
  request:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1 {
  return {
    ...responseFor(
      request,
    ),
    body:
      JSON.stringify({
        unrelated:
          true,
      }),
  };
}

class MemoryRegistry
  implements
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1 {
  snapshotCalls = 0;
  compareAndSwapCalls = 0;
  failCompareAndSwap = false;
  routes:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[];
  revision: string;

  get listen(): never {
    throw new Error(
      "listener access forbidden",
    );
  }

  constructor(
    routes: readonly
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[] = [],
    revision =
      "registry-revision-1",
  ) {
    this.routes =
      [...routes];
    this.revision =
      revision;
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
    routes: readonly
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1[],
  ) {
    this.compareAndSwapCalls += 1;
    if (this.failCompareAndSwap) {
      this.revision =
        "registry-revision-concurrent";
    }
    if (
      expectedRevision
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
        true as const,
      previous_revision:
        previousRevision,
      next_revision:
        this.revision,
      route_count:
        routes.length,
    };
  }
}

const unrelatedEntry:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryEntryV1 = {
    method:
      "GET",
    path:
      "/unrelated",
    handler_id:
      "unrelated.handler.v1",
    handle:
      unrelatedHandler,
  };

const identities =
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountRouteIdentitiesV1();

const dependencyIdentity =
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationDefaultDependencyIdentityV1();
assert.deepEqual(
  dependencyIdentity,
  {
    load_mount_config_exact:
      true,
    execute_mount_exact:
      true,
    sealed_mount_default_dependencies_bound:
      true,
  },
);

let routeEnabled = true;
let routeConfigLoads = 0;
let routeHandlerCalls = 0;
let providerCalls = 0;
let lastEnvironment:
  NodeJS.ProcessEnv | null = null;
let lastRequest:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1 | null =
    null;
let lastProvider:
  (() => unknown) | null = null;

const environment = {
  [PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
    "1",
  [PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
    "1",
  VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED:
    "1",
};

const provider = () => {
  providerCalls += 1;
  return {
    server_owned:
      true,
  };
};

const mountDependencies:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerMountDependenciesV1 = {
    loadRouteConfig:
      (value) => {
        routeConfigLoads += 1;
        lastEnvironment =
          value;
        return routeConfig(
          routeEnabled,
        );
      },
    handleRoute:
      (
        request,
        value,
        trustedProvider,
      ) => {
        routeHandlerCalls += 1;
        lastRequest =
          request;
        lastEnvironment =
          value;
        lastProvider =
          trustedProvider;
        return responseFor(
          request,
        );
      },
  };

const disabledRegistry =
  new MemoryRegistry(
    [unrelatedEntry],
  );
const disabledCommand =
  new Proxy(
    {},
    {
      ownKeys() {
        throw new Error(
          "disabled integration inspected command",
        );
      },
    },
  );
const disabled =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
    integrationConfig(false),
    disabledCommand,
    environment,
    provider,
    disabledRegistry,
    {
      loadRouteConfig:
        () => {
          throw new Error(
            "disabled integration loaded route config",
          );
        },
      handleRoute:
        () => {
          throw new Error(
            "disabled integration invoked route handler",
          );
        },
    },
    {
      loadMountConfig:
        () => {
          throw new Error(
            "disabled integration loaded mount config",
          );
        },
      executeMount:
        () => {
          throw new Error(
            "disabled integration executed mount",
          );
        },
    },
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
  new MemoryRegistry(
    [unrelatedEntry],
  );
assert.throws(
  () =>
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
      integrationConfig(true),
      {
        ...applyCommand,
        confirmation:
          "wrong-integration-confirmation",
      },
      environment,
      provider,
      wrongIntegrationConfirmation,
      mountDependencies,
      {
        loadMountConfig:
          () => {
            throw new Error(
              "wrong integration confirmation loaded mount config",
            );
          },
        executeMount:
          () => {
            throw new Error(
              "wrong integration confirmation executed mount",
            );
          },
      },
    ),
  /requires exact confirmation/,
);
assert.equal(
  wrongIntegrationConfirmation.snapshotCalls,
  0,
);

const wrongMountConfirmation =
  new MemoryRegistry(
    [unrelatedEntry],
  );
assert.throws(
  () =>
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
      integrationConfig(true),
      {
        ...applyCommand,
        mount_confirmation:
          "wrong-mount-confirmation",
      },
      environment,
      provider,
      wrongMountConfirmation,
      mountDependencies,
      {
        loadMountConfig:
          () => {
            throw new Error(
              "wrong mount confirmation loaded mount config",
            );
          },
        executeMount:
          () => {
            throw new Error(
              "wrong mount confirmation executed mount",
            );
          },
      },
    ),
  /requires exact mount confirmation/,
);
assert.equal(
  wrongMountConfirmation.snapshotCalls,
  0,
);

const mountDisabledRegistry =
  new MemoryRegistry(
    [unrelatedEntry],
  );
const mountDisabled =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    applyCommand,
    {
      ...environment,
      [PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
        "0",
    },
    provider,
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
assert.equal(
  mountDisabledRegistry.compareAndSwapCalls,
  0,
);

routeEnabled = false;
const routeDisabledRegistry =
  new MemoryRegistry(
    [unrelatedEntry],
  );
const routeDisabled =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    applyCommand,
    environment,
    provider,
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
assert.equal(
  routeDisabledRegistry.compareAndSwapCalls,
  0,
);

routeEnabled = true;
routeConfigLoads = 0;
const dryRegistry =
  new MemoryRegistry(
    [unrelatedEntry],
  );
const planned =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    dryCommand,
    environment,
    provider,
    dryRegistry,
    mountDependencies,
  );
assert.equal(
  planned.status,
  "planned",
);
assert.equal(
  routeConfigLoads,
  1,
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
  new MemoryRegistry(
    [unrelatedEntry],
  );
const mounted =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    applyCommand,
    environment,
    provider,
    freeRegistry,
    mountDependencies,
  );
assert.equal(
  mounted.marker,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER,
);
assert.equal(
  mounted.status,
  "mounted",
);
assert.equal(
  mounted.registry_snapshot_read,
  true,
);
assert.equal(
  mounted.registry_compare_and_swap_attempted,
  true,
);
assert.equal(
  mounted.registry_compare_and_swap_applied,
  true,
);
assert.equal(
  mounted.registry_revision_before,
  "registry-revision-1",
);
assert.equal(
  mounted.registry_revision_after,
  "registry-revision-2",
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
  mounted.trusted_input_provider_deferred,
  true,
);
assert.equal(
  mounted.authority.server_route_registry_snapshot_read,
  true,
);
assert.equal(
  mounted.authority.server_route_registry_compare_and_swap,
  true,
);
assert.equal(
  mounted.authority.production_http_route_mount,
  false,
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
  freeRegistry.routes.length,
  3,
);
assert.equal(
  freeRegistry.routes[0]?.path,
  "/unrelated",
);
assert.equal(
  providerCalls,
  0,
);
assert.equal(
  routeHandlerCalls,
  0,
);

const registeredHandler =
  freeRegistry.routes.find(
    (entry) =>
      entry.handler_id
        === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  )?.handle;
assert.equal(
  typeof registeredHandler,
  "function",
);

const request:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    method:
      "GET",
    path:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
    remote_address:
      "127.0.0.1",
    headers: {},
    body:
      "",
  };
const routedResponse =
  registeredHandler!(
    request,
  );
assert.equal(
  routedResponse.status_code,
  200,
);
assert.equal(
  routeHandlerCalls,
  1,
);
assert.equal(
  lastRequest,
  request,
);
assert.equal(
  lastProvider,
  provider,
);
assert.equal(
  providerCalls,
  0,
);
assert.equal(
  lastEnvironment?.[
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV
  ],
  "1",
);
assert.equal(
  routedResponse.body,
  JSON.stringify({
    path:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  }),
);

const exactRegistry =
  new MemoryRegistry(
    freeRegistry.routes,
    "registry-revision-exact",
  );
const alreadyMounted =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    applyCommand,
    environment,
    provider,
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

const partialRegistry =
  new MemoryRegistry(
    [
      unrelatedEntry,
      freeRegistry.routes.find(
        (entry) =>
          entry.method
            === identities[0]!.method
          && entry.path
            === identities[0]!.path,
      )!,
    ],
  );
assert.throws(
  () =>
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
      applyCommand,
      environment,
      provider,
      partialRegistry,
      mountDependencies,
    ),
  /partial trusted requester server route mount state rejected/,
);
assert.equal(
  partialRegistry.compareAndSwapCalls,
  0,
);

const conflictingRoutes =
  identities.map(
    (identity) => ({
      method:
        identity.method,
      path:
        identity.path,
      handler_id:
        "other.handler.v1",
      handle:
        unrelatedHandler,
    }),
  );
const conflictRegistry =
  new MemoryRegistry(
    [
      unrelatedEntry,
      ...conflictingRoutes,
    ],
  );
assert.throws(
  () =>
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
      applyCommand,
      environment,
      provider,
      conflictRegistry,
      mountDependencies,
    ),
  /unexpected handler/,
);
assert.equal(
  conflictRegistry.compareAndSwapCalls,
  0,
);

const duplicateRegistry =
  new MemoryRegistry(
    [
      unrelatedEntry,
      {
        ...unrelatedEntry,
      },
    ],
  );
assert.throws(
  () =>
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
      applyCommand,
      environment,
      provider,
      duplicateRegistry,
      mountDependencies,
    ),
  /duplicate route keys/,
);
assert.equal(
  duplicateRegistry.compareAndSwapCalls,
  0,
);

const staleRegistry =
  new MemoryRegistry(
    [unrelatedEntry],
  );
staleRegistry.failCompareAndSwap =
  true;
const staleBefore =
  [...staleRegistry.routes];
assert.throws(
  () =>
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
      applyCommand,
      environment,
      provider,
      staleRegistry,
      mountDependencies,
    ),
  /registry revision changed/,
);
assert.equal(
  staleRegistry.snapshotCalls,
  1,
);
assert.equal(
  staleRegistry.compareAndSwapCalls,
  1,
);
assert.deepEqual(
  staleRegistry.routes,
  staleBefore,
);

const directRegistry =
  new MemoryRegistry(
    [unrelatedEntry],
  );
const integrated =
  createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
    directRegistry,
  );
integrated.registrar.inspectExactRoutes(
  identities,
);
assert.throws(
  () =>
    integrated.registrar.inspectExactRoutes(
      identities,
    ),
  /inspection is one-shot/,
);
assert.equal(
  directRegistry.snapshotCalls,
  1,
);

const withoutInspectionRegistry =
  new MemoryRegistry(
    [unrelatedEntry],
  );
const withoutInspection =
  createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1(
    withoutInspectionRegistry,
  );
assert.throws(
  () =>
    withoutInspection.registrar.registerExactRoutesAtomically(
      identities.map(
        (identity) => ({
          ...identity,
          handle:
            unrelatedHandler as
              PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerHandlerV1,
        }),
      ),
    ),
  /requires prior inspection/,
);
assert.equal(
  withoutInspectionRegistry.compareAndSwapCalls,
  0,
);

const defaultDisabled =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationFromEnvironmentV1(
    dryCommand,
    {},
    provider,
    new MemoryRegistry(),
    mountDependencies,
  );
assert.equal(
  defaultDisabled.status,
  "disabled",
);

const source = fs.readFileSync(
  path.join(
    ROOT,
    "scripts",
    "public_agent_service_trusted_requester_acceptance_persistence_http_route_server_registrar_integration_v1.ts",
  ),
  "utf8",
);
const docs = fs.readFileSync(
  path.join(
    ROOT,
    "docs",
    "public-agent",
    "public-agent-service-trusted-requester-acceptance-persistence-http-route-server-registrar-integration-v1.md",
  ),
  "utf8",
);
const workflow = fs.readFileSync(
  path.join(
    ROOT,
    ".github",
    "workflows",
    "public-agent-service-trusted-requester-acceptance-persistence-http-route-server-registrar-integration-v1.yml",
  ),
  "utf8",
);
const schema = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "schemas",
      "public-agent-service-trusted-requester-acceptance-persistence-http-route-server-registrar-integration-v1.schema.json",
    ),
    "utf8",
  ),
) as Record<string, unknown>;

for (const token of [
  "executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1",
  "createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationV1",
  "mountPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerV1",
  "compareAndSwapExactRouteSnapshot",
  "readExactRouteSnapshot",
  "integrateTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1",
  "PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION",
  "trustedReplayPlanInputProvider",
]) {
  assert.equal(
    source.includes(token),
    true,
    `registrar integration source omitted ${token}`,
  );
}
for (const forbidden of [
  'from "express"',
  "createServer(",
  "app.get(",
  "app.head(",
  "app.post(",
  "app.use(",
  "listen(",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    `registrar integration source gained live-server surface: ${forbidden}`,
  );
}
for (const phrase of [
  "revision-bound compare-and-swap semantics",
  "source-level integration adapter only",
  "integrateTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1",
  "mountTrustedRequesterAcceptancePersistenceHttpRouteServerV1",
  "Dry-run integration",
  "Preserve every unrelated route",
  "stale revision fails without partial mutation",
  "trusted replay-plan input provider remains deferred",
  "A later live-host integration lane",
]) {
  assert.equal(
    docs.includes(phrase),
    true,
    `registrar integration documentation omitted ${phrase}`,
  );
}
for (const commandText of [
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_runtime_binding_v1.ts",
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_http_route_binding_v1.ts",
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_http_route_server_mount_binding_v1.ts",
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_http_route_server_registrar_integration_v1.ts",
]) {
  assert.equal(
    workflow.includes(commandText),
    true,
    `registrar integration workflow omitted ${commandText}`,
  );
}
assert.equal(
  schema.x_void_marker,
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_SCHEMA_V1",
);

console.log(
  "marker=VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_PROOF_V1",
);
console.log(
  "sealed_trusted_server_mount_binding_available=true",
);
console.log(
  "lower_runtime_route_and_mount_proofs_required_by_workflow=true",
);
console.log(
  "environment_disabled_by_default=true",
);
console.log(
  "disabled_short_circuit_before_command_validation=true",
);
console.log(
  "disabled_short_circuit_before_mount_config_load=true",
);
console.log(
  "disabled_short_circuit_before_registry_access=true",
);
console.log(
  "integration_confirmation_precedes_mount_config_load=true",
);
console.log(
  "integration_confirmation_precedes_registry_access=true",
);
console.log(
  "mount_confirmation_precedes_mount_config_load=true",
);
console.log(
  "mount_confirmation_precedes_registry_access=true",
);
console.log(
  "mount_disabled_short_circuit_before_registry_access=true",
);
console.log(
  "route_disabled_short_circuit_before_registry_access=true",
);
console.log(
  "dry_run_without_registry_access=true",
);
console.log(
  "canonical_identity_set_enforced=true",
);
console.log(
  "registry_snapshot_read_once=true",
);
console.log(
  "duplicate_route_keys_rejected=true",
);
console.log(
  "unrelated_routes_preserved=true",
);
console.log(
  "compare_and_swap_expected_revision_exact=true",
);
console.log(
  "compare_and_swap_route_count_exact=true",
);
console.log(
  "compare_and_swap_invoked_once=true",
);
console.log(
  "stale_revision_rejected=true",
);
console.log(
  "stale_revision_no_partial_mutation=true",
);
console.log(
  "one_shot_registrar_inspection_verified=true",
);
console.log(
  "registration_requires_prior_inspection=true",
);
console.log(
  "already_mounted_idempotent=true",
);
console.log(
  "partial_mount_state_rejected=true",
);
console.log(
  "conflicting_route_rejected=true",
);
console.log(
  "mount_contract_delegated_exact=true",
);
console.log(
  "trusted_input_provider_deferred_to_handler=true",
);
console.log(
  "mounted_handler_response_preserved=true",
);
console.log(
  "listener_method_not_accessed=true",
);
console.log(
  "source_level_registry_snapshot_read_verified=true",
);
console.log(
  "source_level_registry_compare_and_swap_verified=true",
);
console.log(
  "production_http_route_mounted=false",
);
console.log(
  "network_listener_created=false",
);
console.log(
  "live_route_registry_integrated=false",
);
console.log(
  "src_index_modified=false",
);
console.log(
  "express_app_modified=false",
);
console.log(
  "runtime_configuration_installed=false",
);
console.log(
  "production_http_submission_performed=false",
);
console.log(
  "production_acceptance_persistence_performed=false",
);
console.log(
  "production_replay_write_performed=false",
);
console.log(
  "payment_authorization=false",
);
console.log(
  "payment_execution=false",
);
console.log(
  "work_execution_authorization=false",
);
console.log(
  "work_dispatch=false",
);
console.log(
  "work_credit_write=false",
);
console.log(
  "wallet_access=false",
);
console.log(
  "runtime_mutation=false",
);
console.log(
  "service_restart=no",
);
console.log(
  "deployment=no",
);
console.log(
  "money_movement=false",
);
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_V1_EXACT_GREEN",
);
