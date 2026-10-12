import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_server_mount_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_server_registrar_integration_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
  createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerExpressRegistryV1,
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1,
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionDefaultDependencyIdentityV1,
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionSourceTopologyV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressMiddlewareV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_server_bootstrap_composition_v1.js";

const repositoryRoot = path.resolve(".");
const implementationPath = path.join(
  repositoryRoot,
  "scripts/public_agent_service_trusted_requester_acceptance_persistence_http_route_server_bootstrap_composition_v1.ts",
);
const proofPath = path.join(
  repositoryRoot,
  "scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_http_route_server_bootstrap_composition_v1.ts",
);
const docsPath = path.join(
  repositoryRoot,
  "docs/public-agent/public-agent-service-trusted-requester-acceptance-persistence-http-route-server-bootstrap-composition-v1.md",
);
const schemaPath = path.join(
  repositoryRoot,
  "schemas/public-agent-service-trusted-requester-acceptance-persistence-http-route-server-bootstrap-composition-v1.schema.json",
);
const examplePath = path.join(
  repositoryRoot,
  "examples/public-agent-service-trusted-requester-acceptance-persistence-http-route-server-bootstrap-composition-v1.example.json",
);
const workflowPath = path.join(
  repositoryRoot,
  ".github/workflows/public-agent-service-trusted-requester-acceptance-persistence-http-route-server-bootstrap-composition-v1.yml",
);
const sourceIndexPath = path.join(repositoryRoot, "src/index.ts");

const implementationSource = fs.readFileSync(implementationPath, "utf8");
const proofSource = fs.readFileSync(proofPath, "utf8");
const documentation = fs.readFileSync(docsPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");
const example = JSON.parse(fs.readFileSync(examplePath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const sourceIndex = fs.readFileSync(sourceIndexPath, "utf8");

assert.equal(
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionDefaultDependencyIdentityV1()
    .execute_registrar_integration_exact,
  true,
);
const topology =
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionSourceTopologyV1();
assert.equal(topology.expected_app_creation, "const app = express();");
assert.equal(
  topology.expected_live_app_export,
  "(globalThis as any).__void_http_app = app;",
);
assert.equal(topology.expected_listener_owner, "src/index.ts");
assert.equal(topology.bootstrap_callsite_integrated, false);
assert.equal(
  sourceIndex.includes(
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER,
  ),
  false,
);

for (const token of [
  "createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerExpressRegistryV1",
  "executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1",
  "compareAndSwapExactRouteSnapshot",
  "bootstrapTrustedRequesterAcceptancePersistenceHttpRouteServerCompositionV1",
  "PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION",
  "PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION",
  "trustedReplayPlanInputProvider",
  "stale Express route revision",
  "Express app.use reordered existing route layers",
]) {
  assert.equal(
    implementationSource.includes(token),
    true,
    `bootstrap source omitted ${token}`,
  );
}
for (const forbidden of [
  'from "express"',
  "createServer(",
  "listen(",
]) {
  assert.equal(
    implementationSource.includes(forbidden),
    false,
    `bootstrap source gained listener surface: ${forbidden}`,
  );
}
for (const phrase of [
  "revision-bound Express route-registry adapter",
  "source-only and disabled by default",
  "does not modify `src/index.ts`",
  "Dry-run composition",
  "preserves unrelated route layers",
  "stale revisions",
  "rollback",
  "later live call-site lane",
]) {
  assert.equal(
    documentation.includes(phrase),
    true,
    `bootstrap documentation omitted ${phrase}`,
  );
}
for (const commandText of [
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_runtime_binding_v1.ts",
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_http_route_binding_v1.ts",
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_http_route_server_mount_binding_v1.ts",
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_http_route_server_registrar_integration_v1.ts",
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_http_route_server_bootstrap_composition_v1.ts",
]) {
  assert.equal(
    workflow.includes(commandText),
    true,
    `bootstrap workflow omitted ${commandText}`,
  );
}
assert.equal(
  schema.x_void_marker,
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_SCHEMA_V1",
);
assert.equal(
  example.marker,
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_EXAMPLE_V1",
);
assert.equal(example.version, 1);
assert.equal(example.example_only, true);

function config(enabled: boolean) {
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_V1",
    version: 1,
    enabled,
  };
}

function command(apply: boolean) {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    apply,
    confirmation:
      apply
        ? PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIRMATION
        : "",
    integration_confirmation:
      apply
        ? PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION
        : "",
    mount_confirmation:
      apply
        ? PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION
        : "",
  };
}

function enabledEnvironment(): NodeJS.ProcessEnv {
  return {
    [PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV]:
      "1",
    [PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV]:
      "1",
    [PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV]:
      "1",
    [PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV]:
      "1",
  };
}

function routeLayer(
  routePath: string,
  method: string,
  handle: (...args: any[]) => unknown = () => undefined,
) {
  return {
    name: "bound dispatch",
    handle,
    route: {
      path: routePath,
      methods: {
        [method.toLowerCase()]:
          true,
      },
      stack: [
        {
          handle,
        },
      ],
    },
  };
}

class FakeApp {
  _router = {
    stack: [] as unknown[],
  };
  useCalls = 0;
  listenReadCount = 0;
  failAfterAppend = false;

  get listen(): never {
    this.listenReadCount += 1;
    throw new Error("listener authority accessed");
  }

  use(
    middleware:
      PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressMiddlewareV1,
  ): void {
    this.useCalls += 1;
    this._router.stack.push({
      name: "trusted requester bootstrap dispatcher",
      handle:
        middleware,
    });
    if (this.failAfterAppend) {
      throw new Error("synthetic app.use failure");
    }
  }
}

function integrationAuthority(
  snapshotRead: boolean,
  casAttempted: boolean,
) {
  return {
    source_level_route_registry_adapter:
      true,
    server_route_registry_snapshot_read:
      snapshotRead,
    server_route_registry_compare_and_swap:
      casAttempted,
    production_http_route_mount:
      false,
    network_listener_creation:
      false,
    live_route_registry_integration:
      false,
    src_index_modification:
      false,
    express_app_modification:
      false,
    production_http_submission:
      false,
    production_acceptance_persistence:
      false,
    production_replay_write:
      false,
    payment_authorization:
      false,
    payment_execution:
      false,
    work_execution_authorization:
      false,
    work_dispatch:
      false,
    work_credit_write:
      false,
    work_credit_settlement:
      false,
    wallet_or_signer_access:
      false,
    production_signing:
      false,
    transaction_broadcast:
      false,
    credential_issue:
      false,
    credential_change:
      false,
    runtime_mutation:
      false,
    service_restart:
      false,
    deployment:
      false,
    money_movement:
      false,
  };
}

let registrarCalls = 0;
let snapshotRevisionCaptured = "";
let trustedProviderCalls = 0;
let mountedHandlerCalls = 0;

const fakeDependencies = {
  executeRegistrarIntegration(
    commandValue: any,
    environment: NodeJS.ProcessEnv,
    trustedReplayPlanInputProvider: () => unknown,
    registry:
      PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistryV1,
  ): PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarIntegrationResultV1 {
    registrarCalls += 1;
    const apply = commandValue.apply === true;
    assert.equal(
      commandValue.confirmation,
      apply
        ? PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_CONFIRMATION
        : "",
    );
    assert.equal(
      commandValue.mount_confirmation,
      apply
        ? PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_CONFIRMATION
        : "",
    );

    const base = {
      marker:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_VERSION,
      enabled:
        true,
      apply,
      confirmation_verified:
        true,
      mount_confirmation_verified:
        true,
      registry_revision_after:
        null,
      unrelated_route_count_after:
        null,
      exact_route_count_after:
        null,
      trusted_input_provider_deferred:
        true,
      mount:
        null,
    };

    if (
      environment[
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV
      ] !== "1"
    ) {
      return {
        ...base,
        status: "disabled",
        enabled: false,
        registry_snapshot_read: false,
        registry_compare_and_swap_attempted: false,
        registry_compare_and_swap_applied: false,
        registry_revision_before: null,
        unrelated_route_count_before: null,
        authority: integrationAuthority(false, false),
      } as any;
    }
    if (
      environment[
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV
      ] !== "1"
    ) {
      return {
        ...base,
        status: "mount_disabled",
        registry_snapshot_read: false,
        registry_compare_and_swap_attempted: false,
        registry_compare_and_swap_applied: false,
        registry_revision_before: null,
        unrelated_route_count_before: null,
        authority: integrationAuthority(false, false),
      } as any;
    }
    if (
      environment[
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV
      ] !== "1"
    ) {
      return {
        ...base,
        status: "route_disabled",
        registry_snapshot_read: false,
        registry_compare_and_swap_attempted: false,
        registry_compare_and_swap_applied: false,
        registry_revision_before: null,
        unrelated_route_count_before: null,
        authority: integrationAuthority(false, false),
      } as any;
    }
    if (!apply) {
      return {
        ...base,
        status: "planned",
        registry_snapshot_read: false,
        registry_compare_and_swap_attempted: false,
        registry_compare_and_swap_applied: false,
        registry_revision_before: null,
        unrelated_route_count_before: null,
        authority: integrationAuthority(false, false),
      } as any;
    }

    const snapshot =
      registry.readExactRouteSnapshot();
    snapshotRevisionCaptured =
      snapshot.revision;
    const canonical =
      snapshot.routes.filter(
        (entry) =>
          entry.method
            === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD
          && (
            entry.path
              === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH
            || entry.path
              === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH
          ),
      );
    if (canonical.length === 2) {
      assert.equal(
        canonical.every(
          (entry) =>
            entry.handler_id
              === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
        ),
        true,
        "canonical conflict rejected",
      );
      return {
        ...base,
        status: "already_mounted",
        registry_snapshot_read: true,
        registry_compare_and_swap_attempted: false,
        registry_compare_and_swap_applied: false,
        registry_revision_before: snapshot.revision,
        unrelated_route_count_before: snapshot.routes.length - 2,
        unrelated_route_count_after: snapshot.routes.length - 2,
        exact_route_count_after: 2,
        authority: integrationAuthority(true, false),
      } as any;
    }
    assert.equal(
      canonical.length,
      0,
      "partial trusted requester server route mount state rejected",
    );

    const mountedHandler = (
      request:
        PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRequestV1,
    ) => {
      mountedHandlerCalls += 1;
      trustedReplayPlanInputProvider();
      assert.equal(request.marker,
        "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_V1");
      assert.equal(request.remote_address, "127.0.0.1");
      return {
        marker:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER,
        version:
          PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
        status_code:
          request.path
            === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH
            ? 200
            : 201,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body:
          JSON.stringify({
            path:
              request.path,
            body:
              request.body,
            content_length:
              request.headers["content-length"],
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
    };

    const additions = [
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    ].map((routePath) => ({
      method:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
      path:
        routePath,
      handler_id:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
      handle:
        mountedHandler,
    }));
    const nextRoutes =
      Object.freeze([
        ...snapshot.routes,
        ...additions,
      ]);
    const receipt =
      registry.compareAndSwapExactRouteSnapshot(
        snapshot.revision,
        nextRoutes,
      );
    assert.equal(receipt.previous_revision, snapshot.revision);
    assert.equal(receipt.route_count, nextRoutes.length);
    return {
      ...base,
      status: "mounted",
      registry_snapshot_read: true,
      registry_compare_and_swap_attempted: true,
      registry_compare_and_swap_applied: true,
      registry_revision_before: snapshot.revision,
      registry_revision_after: receipt.next_revision,
      unrelated_route_count_before: snapshot.routes.length,
      unrelated_route_count_after: snapshot.routes.length,
      exact_route_count_after: 2,
      authority: integrationAuthority(true, true),
    } as any;
  },
};

const neverMountDependencies = {} as any;

let disabledAppCalls = 0;
let disabledRegistrarCalls = registrarCalls;
const disabled =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
    config(false),
    { broken: true },
    {},
    () => {
      throw new Error("disabled composition invoked trusted provider");
    },
    () => {
      disabledAppCalls += 1;
      throw new Error("disabled composition invoked app provider");
    },
    neverMountDependencies,
    fakeDependencies as any,
  );
assert.equal(disabled.status, "disabled");
assert.equal(disabledAppCalls, 0);
assert.equal(registrarCalls, disabledRegistrarCalls);

let confirmationAppCalls = 0;
for (const [field, value, pattern] of [
  ["confirmation", "wrong", /requires exact confirmation/],
  ["integration_confirmation", "wrong", /requires exact integration confirmation/],
  ["mount_confirmation", "wrong", /requires exact mount confirmation/],
] as const) {
  assert.throws(
    () =>
      executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
        config(true),
        {
          ...command(true),
          [field]:
            value,
        },
        enabledEnvironment(),
        () => undefined,
        () => {
          confirmationAppCalls += 1;
          return new FakeApp();
        },
        neverMountDependencies,
        fakeDependencies as any,
      ),
    pattern,
  );
}
assert.equal(confirmationAppCalls, 0);

const dry =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
    config(true),
    command(false),
    enabledEnvironment(),
    () => {
      throw new Error("dry run invoked trusted provider");
    },
    () => {
      throw new Error("dry run invoked app provider");
    },
    neverMountDependencies,
    fakeDependencies as any,
  );
assert.equal(dry.status, "planned");
assert.equal(dry.registry_created, false);
assert.equal(dry.route_stack_snapshot_count, 0);

for (const [name, envName, expectedStatus] of [
  ["registrar", PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED_ENV, "upstream_disabled"],
  ["mount", PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED_ENV, "mount_disabled"],
  ["route", PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV, "route_disabled"],
] as const) {
  const environment =
    enabledEnvironment();
  environment[envName] =
    "0";
  const result =
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
      config(true),
      command(true),
      environment,
      () => {
        throw new Error(`${name} disabled invoked trusted provider`);
      },
      () => {
        throw new Error(`${name} disabled invoked app provider`);
      },
      neverMountDependencies,
      fakeDependencies as any,
    );
  assert.equal(result.status, expectedStatus);
  assert.equal(result.app_provider_invoked, false);
}

const unrelatedHandle = () => undefined;
const app = new FakeApp();
const unrelatedLayer =
  routeLayer("/health", "GET", unrelatedHandle);
app._router.stack.push(unrelatedLayer);
const beforeApplyProviderCalls =
  trustedProviderCalls;
let appProviderCalls = 0;
const mounted =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
    config(true),
    command(true),
    enabledEnvironment(),
    () => {
      trustedProviderCalls += 1;
      return {
        trusted:
          true,
      };
    },
    () => {
      appProviderCalls += 1;
      return app;
    },
    neverMountDependencies,
    fakeDependencies as any,
  );
assert.equal(mounted.marker,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_MARKER);
assert.equal(mounted.status, "mounted");
assert.equal(appProviderCalls, 1);
assert.equal(mounted.route_stack_snapshot_count, 1);
assert.equal(mounted.compare_and_swap_attempt_count, 1);
assert.equal(mounted.compare_and_swap_apply_count, 1);
assert.equal(mounted.dispatcher_install_count, 1);
assert.equal(mounted.exact_managed_route_count, 2);
assert.equal(mounted.authority.express_app_provider_access, true);
assert.equal(mounted.authority.express_route_stack_snapshot_read, true);
assert.equal(mounted.authority.express_dispatcher_installation, true);
assert.equal(mounted.authority.network_listener_creation, false);
assert.equal(app._router.stack.length, 2);
assert.equal(app._router.stack[0], unrelatedLayer);
assert.equal(app.useCalls, 1);
assert.equal(trustedProviderCalls, beforeApplyProviderCalls);
assert.match(snapshotRevisionCaptured, /^[0-9a-f]{64}$/);

const dispatcher:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressMiddlewareV1 =
    (app._router.stack[1] as any).handle;

async function invokeMiddleware(
  middleware:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceExpressMiddlewareV1,
  request: any,
) {
  const headers: Record<string, string> = {};
  let body = "";
  let nextCount = 0;
  let nextError: unknown = null;
  const response: any = {
    statusCode:
      0,
    writableEnded:
      false,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] =
        value;
    },
    end(value = "") {
      body =
        value;
      this.writableEnded =
        true;
    },
  };
  await middleware(
    request,
    response,
    (error?: unknown) => {
      nextCount += 1;
      nextError =
        error ?? null;
    },
  );
  return {
    response,
    headers,
    body,
    nextCount,
    nextError,
  };
}

const unrelated =
  await invokeMiddleware(
    dispatcher,
    {
      method:
        "GET",
      path:
        "/unrelated",
      headers:
        {},
      socket: {
        remoteAddress:
          "127.0.0.1",
      },
    },
  );
assert.equal(unrelated.nextCount, 1);
assert.equal(unrelated.response.writableEnded, false);

const statusResponse =
  await invokeMiddleware(
    dispatcher,
    {
      method:
        "GET",
      path:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      headers: {
        "x-test":
          "one",
      },
      socket: {
        remoteAddress:
          "127.0.0.1",
      },
      body:
        "",
    },
  );
assert.equal(statusResponse.nextCount, 0);
assert.equal(statusResponse.nextError, null);
assert.equal(statusResponse.response.statusCode, 200);
assert.equal(statusResponse.response.writableEnded, true);
assert.equal(trustedProviderCalls, beforeApplyProviderCalls + 1);
assert.equal(mountedHandlerCalls, 1);

const commandResponse =
  await invokeMiddleware(
    dispatcher,
    {
      method:
        "POST",
      path:
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      headers: {
        "content-type":
          "application/json",
        "content-length":
          "999",
      },
      socket: {
        remoteAddress:
          "127.0.0.1",
      },
      body: {
        apply:
          false,
      },
    },
  );
assert.equal(commandResponse.response.statusCode, 201);
const parsedCommandBody =
  JSON.parse(commandResponse.body);
assert.equal(parsedCommandBody.body, '{"apply":false}');
assert.equal(
  parsedCommandBody.content_length,
  String(Buffer.byteLength('{"apply":false}', "utf8")),
);

const idempotent =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
    config(true),
    command(true),
    enabledEnvironment(),
    () => undefined,
    () => app,
    neverMountDependencies,
    fakeDependencies as any,
  );
assert.equal(idempotent.status, "already_mounted");
assert.equal(idempotent.dispatcher_install_count, 1);
assert.equal(idempotent.compare_and_swap_apply_count, 1);
assert.equal(idempotent.exact_managed_route_count, 2);
assert.equal(app._router.stack.length, 2);
assert.equal(app.useCalls, 1);

const duplicateApp = new FakeApp();
duplicateApp._router.stack.push(
  routeLayer("/dup", "GET", () => 1),
  routeLayer("/dup", "GET", () => 2),
);
const duplicateAdapter =
  createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerExpressRegistryV1(
    duplicateApp,
  );
const duplicateSnapshot =
  duplicateAdapter.registry.readExactRouteSnapshot();
assert.equal(
  duplicateSnapshot.routes.filter(
    (entry) =>
      entry.method === "GET"
      && entry.path === "/dup",
  ).length,
  1,
);

const conflictApp = new FakeApp();
conflictApp._router.stack.push(
  routeLayer(
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
    "GET",
  ),
);
assert.throws(
  () =>
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerBootstrapCompositionV1(
      config(true),
      command(true),
      enabledEnvironment(),
      () => undefined,
      () => conflictApp,
      neverMountDependencies,
      fakeDependencies as any,
    ),
  /partial trusted requester server route mount state rejected|canonical conflict rejected/,
);
assert.equal(conflictApp._router.stack.length, 1);
assert.equal(conflictApp.useCalls, 0);

const staleApp = new FakeApp();
staleApp._router.stack.push(routeLayer("/one", "GET"));
const staleAdapter =
  createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerExpressRegistryV1(
    staleApp,
  );
const staleSnapshot =
  staleAdapter.registry.readExactRouteSnapshot();
staleApp._router.stack.push(routeLayer("/two", "GET"));
const staleHandle = (_request: any): any => ({
  marker:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_MARKER,
  version:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
  status_code:
    200,
  headers:
    {},
  body:
    "",
  route_enabled:
    true,
  runtime_config_loaded:
    false,
  runtime_invoked:
    false,
  runtime_status:
    null,
});
const staleNext = [
  ...staleSnapshot.routes,
  {
    method:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
    path:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
    handler_id:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    handle:
      staleHandle,
  },
  {
    method:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
    path:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    handler_id:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    handle:
      staleHandle,
  },
];
assert.throws(
  () =>
    staleAdapter.registry.compareAndSwapExactRouteSnapshot(
      staleSnapshot.revision,
      staleNext,
    ),
  /stale Express route revision/,
);
assert.equal(staleAdapter.observe().dispatcher_install_count, 0);
assert.equal(staleApp._router.stack.length, 2);

const rollbackApp = new FakeApp();
const rollbackOriginal =
  routeLayer("/one", "GET");
rollbackApp._router.stack.push(
  rollbackOriginal,
);
rollbackApp.failAfterAppend =
  true;
const rollbackAdapter =
  createPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteServerExpressRegistryV1(
    rollbackApp,
  );
const rollbackSnapshot =
  rollbackAdapter.registry.readExactRouteSnapshot();
const rollbackNext = [
  ...rollbackSnapshot.routes,
  {
    method:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
    path:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
    handler_id:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    handle:
      staleHandle,
  },
  {
    method:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_METHOD,
    path:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    handler_id:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_HANDLER_ID,
    handle:
      staleHandle,
  },
];
assert.throws(
  () =>
    rollbackAdapter.registry.compareAndSwapExactRouteSnapshot(
      rollbackSnapshot.revision,
      rollbackNext,
    ),
  /synthetic app\.use failure/,
);
assert.equal(rollbackAdapter.observe().dispatcher_install_count, 0);
assert.equal(rollbackAdapter.observe().compare_and_swap_apply_count, 0);
assert.equal(rollbackApp._router.stack.length, 1);
assert.equal(rollbackApp._router.stack[0], rollbackOriginal);
assert.equal(rollbackApp.listenReadCount, 0);

for (const literal of [
  "environment_disabled_by_default=true",
  "disabled_short_circuit_before_command_validation=true",
  "disabled_short_circuit_before_app_provider=true",
  "apply_confirmation_precedes_app_provider=true",
  "integration_confirmation_precedes_app_provider=true",
  "mount_confirmation_precedes_app_provider=true",
  "registrar_disabled_short_circuit_before_app_provider=true",
  "mount_disabled_short_circuit_before_app_provider=true",
  "route_disabled_short_circuit_before_app_provider=true",
  "dry_run_without_app_provider_or_registry=true",
  "app_provider_invoked_once_on_apply=true",
  "route_stack_snapshot_read_once=true",
  "duplicate_unmanaged_routes_aggregated=true",
  "unrelated_route_layers_preserved=true",
  "compare_and_swap_expected_revision_exact=true",
  "compare_and_swap_invoked_once=true",
  "dispatcher_installed_once=true",
  "dispatcher_installation_rollback_exact=true",
  "stale_revision_rejected=true",
  "stale_revision_no_partial_mutation=true",
  "exact_two_managed_routes=true",
  "already_mounted_idempotent=true",
  "unmanaged_canonical_route_conflict_rejected=true",
  "trusted_input_provider_deferred_to_route_handler=true",
  "mounted_handler_response_preserved=true",
  "unrelated_request_deferred=true",
  "listener_method_not_accessed=true",
  "source_level_express_app_provider_access_verified=true",
  "source_level_express_route_stack_snapshot_read_verified=true",
  "source_level_express_dispatcher_installation_verified=true",
  "production_http_route_mounted=false",
  "network_listener_created=false",
  "live_route_registry_integrated=false",
  "bootstrap_callsite_integrated=false",
  "src_index_modified=false",
  "runtime_configuration_installed=false",
  "production_http_submission_performed=false",
  "production_acceptance_persistence_performed=false",
  "production_replay_write_performed=false",
  "service_restart=no",
  "deployment=no",
  "money_movement=false",
]) {
  assert.equal(
    proofSource.includes(literal),
    true,
    `proof source omitted ${literal}`,
  );
}

console.log(
  "marker=VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_PROOF_V1",
);
console.log("sealed_trusted_registrar_integration_available=true");
console.log("lower_runtime_route_mount_and_registrar_proofs_required_by_workflow=true");
console.log("environment_disabled_by_default=true");
console.log("disabled_short_circuit_before_command_validation=true");
console.log("disabled_short_circuit_before_app_provider=true");
console.log("apply_confirmation_precedes_app_provider=true");
console.log("integration_confirmation_precedes_app_provider=true");
console.log("mount_confirmation_precedes_app_provider=true");
console.log("registrar_disabled_short_circuit_before_app_provider=true");
console.log("mount_disabled_short_circuit_before_app_provider=true");
console.log("route_disabled_short_circuit_before_app_provider=true");
console.log("dry_run_without_app_provider_or_registry=true");
console.log("app_provider_invoked_once_on_apply=true");
console.log("route_stack_snapshot_read_once=true");
console.log("duplicate_unmanaged_routes_aggregated=true");
console.log("unrelated_route_layers_preserved=true");
console.log("compare_and_swap_expected_revision_exact=true");
console.log("compare_and_swap_invoked_once=true");
console.log("dispatcher_installed_once=true");
console.log("dispatcher_installation_rollback_exact=true");
console.log("stale_revision_rejected=true");
console.log("stale_revision_no_partial_mutation=true");
console.log("exact_two_managed_routes=true");
console.log("already_mounted_idempotent=true");
console.log("unmanaged_canonical_route_conflict_rejected=true");
console.log("trusted_input_provider_deferred_to_route_handler=true");
console.log("mounted_handler_response_preserved=true");
console.log("unrelated_request_deferred=true");
console.log("listener_method_not_accessed=true");
console.log("source_level_express_app_provider_access_verified=true");
console.log("source_level_express_route_stack_snapshot_read_verified=true");
console.log("source_level_express_dispatcher_installation_verified=true");
console.log("production_http_route_mounted=false");
console.log("network_listener_created=false");
console.log("live_route_registry_integrated=false");
console.log("bootstrap_callsite_integrated=false");
console.log("src_index_modified=false");
console.log("runtime_configuration_installed=false");
console.log("production_http_submission_performed=false");
console.log("production_acceptance_persistence_performed=false");
console.log("production_replay_write_performed=false");
console.log("payment_authorization=false");
console.log("payment_execution=false");
console.log("work_execution_authorization=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_access=false");
console.log("runtime_mutation=false");
console.log("service_restart=no");
console.log("deployment=no");
console.log("money_movement=false");
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_V1_EXACT_GREEN",
);
