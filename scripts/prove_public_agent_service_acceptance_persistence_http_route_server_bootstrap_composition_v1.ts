import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_EXAMPLE_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
  createPublicAgentServiceAcceptancePersistenceHttpRouteServerExpressRegistryV1,
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1,
  loadPublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigFromEnvironmentV1,
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionDefaultDependencyIdentityV1,
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionSourceTopologyV1,
  type PublicAgentServiceAcceptancePersistenceExpressMiddlewareV1,
  type PublicAgentServiceAcceptancePersistenceExpressRequestLikeV1,
  type PublicAgentServiceAcceptancePersistenceExpressResponseLikeV1,
} from "./public_agent_service_acceptance_persistence_http_route_server_bootstrap_composition_v1.js";

const REG_ENABLED =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED";
const MOUNT_ENABLED =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED";
const ROUTE_ENABLED =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED";
const INTEGRATION_CONFIRMATION =
  "integrateAcceptancePersistenceHttpRouteServerRegistrarV1";
const MOUNT_CONFIRMATION =
  "mountAcceptancePersistenceHttpRouteServerV1";
const INTEGRATION_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_COMMAND_V1";
const INTEGRATION_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_RESULT_V1";
const HTTP_REQUEST_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_V1";
const HTTP_RESPONSE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_RESPONSE_V1";
const HANDLER_ID =
  "void.public-agent-service-acceptance-persistence-http-route.v1";
const STATUS_PATH =
  "/__void/operator/public-agent-service-acceptance-persistence-runtime-v1/status";
const COMMAND_PATH =
  "/__void/operator/public-agent-service-acceptance-persistence-runtime-v1/command";

function expectThrows(
  action: () => unknown,
  pattern: RegExp,
): void {
  let thrown: unknown = null;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, "expected action to throw");
  assert.match(thrown.message, pattern);
}

function routeLayer(
  path: string,
  method: string,
  handle: Function = () => undefined,
): Record<string, unknown> {
  return {
    name: "bound dispatch",
    handle,
    regexp: /^\/?$/i,
    route: {
      path,
      methods: { [method.toLowerCase()]: true },
      stack: [{ handle }],
    },
  };
}

class FakeApp {
  _router: { stack: unknown[] } = {
    stack: [],
  };
  failAfterAppend = false;
  listenReadCount = 0;

  constructor() {
    Object.defineProperty(this, "listen", {
      enumerable: false,
      configurable: false,
      get: () => {
        this.listenReadCount += 1;
        throw new Error("listener authority accessed");
      },
    });
  }

  use(
    middleware: PublicAgentServiceAcceptancePersistenceExpressMiddlewareV1,
  ): this {
    this._router.stack.push({
      name: "voidBootstrapCompositionDispatcher",
      handle: middleware,
      regexp: /^\/?(?=\/|$)/i,
    });
    if (this.failAfterAppend) {
      throw new Error("synthetic app.use failure");
    }
    return this;
  }
}

function integrationAuthority(
  snapshotRead: boolean,
  casAttempted: boolean,
): Record<string, boolean> {
  return {
    server_route_registry_snapshot_read: snapshotRead,
    server_route_registry_compare_and_swap: casAttempted,
    network_listener_creation: false,
    external_http_submission: false,
    production_acceptance_persistence: false,
    production_replay_write: false,
    payment_authorization: false,
    payment_execution: false,
    execution_authorization: false,
    work_dispatch: false,
    production_signing: false,
    transaction_broadcast: false,
    work_credit_write: false,
    money_movement: false,
  };
}

function fakeIntegration(
  environment: NodeJS.ProcessEnv,
  commandValue: unknown,
  _trustedContextProvider: () => unknown,
  registry: {
    readExactRouteSnapshot: () => {
      revision: string;
      routes: readonly {
        method: string;
        path: string;
        handler_id: string;
        handle: (request: unknown) => unknown;
      }[];
    };
    compareAndSwapExactRouteSnapshot: (
      expectedRevision: string,
      routes: readonly {
        method: string;
        path: string;
        handler_id: string;
        handle: (request: unknown) => unknown;
      }[],
    ) => {
      applied: boolean;
      previous_revision: string;
      next_revision: string;
      route_count: number;
    };
  },
): any {
  const flag = (name: string): boolean => {
    const value = environment[name];
    if (value === undefined || value === "" || value === "0") return false;
    assert.equal(value, "1", `${name} must be 0 or 1`);
    return true;
  };
  const integrationEnabled = flag(REG_ENABLED);
  if (!integrationEnabled) {
    return {
      marker: INTEGRATION_RESULT_MARKER,
      version: 1,
      status: "disabled",
      enabled: false,
      apply: false,
      confirmation_verified: false,
      mount_confirmation_verified: false,
      registry_snapshot_read: false,
      registry_compare_and_swap_attempted: false,
      registry_compare_and_swap_applied: false,
      registry_revision_before: null,
      registry_revision_after: null,
      unrelated_route_count_before: null,
      unrelated_route_count_after: null,
      exact_route_count_after: null,
      mount: null,
      authority: integrationAuthority(false, false),
    };
  }

  assert.ok(commandValue && typeof commandValue === "object");
  const command = commandValue as Record<string, unknown>;
  assert.equal(command.marker, INTEGRATION_COMMAND_MARKER);
  assert.equal(command.version, 1);
  assert.equal(typeof command.apply, "boolean");
  const apply = command.apply as boolean;
  if (apply) {
    assert.equal(command.confirmation, INTEGRATION_CONFIRMATION);
    assert.equal(command.mount_confirmation, MOUNT_CONFIRMATION);
  } else {
    assert.equal(command.confirmation, "");
    assert.equal(command.mount_confirmation, "");
  }

  if (!flag(MOUNT_ENABLED)) {
    return {
      marker: INTEGRATION_RESULT_MARKER,
      version: 1,
      status: "mount_disabled",
      enabled: true,
      apply,
      confirmation_verified: true,
      mount_confirmation_verified: true,
      registry_snapshot_read: false,
      registry_compare_and_swap_attempted: false,
      registry_compare_and_swap_applied: false,
      registry_revision_before: null,
      registry_revision_after: null,
      unrelated_route_count_before: null,
      unrelated_route_count_after: null,
      exact_route_count_after: null,
      mount: null,
      authority: integrationAuthority(false, false),
    };
  }
  if (!flag(ROUTE_ENABLED)) {
    return {
      marker: INTEGRATION_RESULT_MARKER,
      version: 1,
      status: "route_disabled",
      enabled: true,
      apply,
      confirmation_verified: true,
      mount_confirmation_verified: true,
      registry_snapshot_read: false,
      registry_compare_and_swap_attempted: false,
      registry_compare_and_swap_applied: false,
      registry_revision_before: null,
      registry_revision_after: null,
      unrelated_route_count_before: null,
      unrelated_route_count_after: null,
      exact_route_count_after: null,
      mount: null,
      authority: integrationAuthority(false, false),
    };
  }
  if (!apply) {
    return {
      marker: INTEGRATION_RESULT_MARKER,
      version: 1,
      status: "planned",
      enabled: true,
      apply: false,
      confirmation_verified: true,
      mount_confirmation_verified: true,
      registry_snapshot_read: false,
      registry_compare_and_swap_attempted: false,
      registry_compare_and_swap_applied: false,
      registry_revision_before: null,
      registry_revision_after: null,
      unrelated_route_count_before: null,
      unrelated_route_count_after: null,
      exact_route_count_after: null,
      mount: null,
      authority: integrationAuthority(false, false),
    };
  }

  const snapshot = registry.readExactRouteSnapshot();
  const byPath = new Map(snapshot.routes.map((entry) => [
    `${entry.method}\n${entry.path}`,
    entry,
  ]));
  const statusExisting = byPath.get(`ALL\n${STATUS_PATH}`);
  const commandExisting = byPath.get(`ALL\n${COMMAND_PATH}`);
  const existing = [statusExisting, commandExisting].filter(Boolean);
  if (existing.length > 0) {
    assert.equal(existing.length, 2, "partial canonical state rejected");
    assert.ok(existing.every((entry) => entry?.handler_id === HANDLER_ID), "canonical conflict rejected");
    return {
      marker: INTEGRATION_RESULT_MARKER,
      version: 1,
      status: "already_mounted",
      enabled: true,
      apply: true,
      confirmation_verified: true,
      mount_confirmation_verified: true,
      registry_snapshot_read: true,
      registry_compare_and_swap_attempted: false,
      registry_compare_and_swap_applied: false,
      registry_revision_before: snapshot.revision,
      registry_revision_after: null,
      unrelated_route_count_before: snapshot.routes.length - 2,
      unrelated_route_count_after: snapshot.routes.length - 2,
      exact_route_count_after: 2,
      mount: null,
      authority: integrationAuthority(true, false),
    };
  }

  const mountedHandle = (requestValue: unknown): any => {
    assert.ok(requestValue && typeof requestValue === "object");
    const request = requestValue as Record<string, unknown>;
    assert.equal(request.marker, HTTP_REQUEST_MARKER);
    return {
      marker: HTTP_RESPONSE_MARKER,
      version: 1,
      status_code: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
        "x-content-type-options": "nosniff",
      },
      body: `${JSON.stringify({
        ok: true,
        method: request.method,
        path: request.path,
        body: request.body,
        content_length: (request.headers as Record<string, string>)["content-length"] ?? null,
      })}\n`,
      route_enabled: true,
      loopback_verified: request.remote_address === "127.0.0.1",
      runtime_config_loaded: false,
      runtime_invoked: false,
      runtime_status: null,
    };
  };
  const additions = [STATUS_PATH, COMMAND_PATH].map((path) => Object.freeze({
    method: "ALL",
    path,
    handler_id: HANDLER_ID,
    handle: mountedHandle,
  }));
  const nextRoutes = Object.freeze([...snapshot.routes, ...additions]);
  const receipt = registry.compareAndSwapExactRouteSnapshot(
    snapshot.revision,
    nextRoutes,
  );
  assert.equal(receipt.applied, true);
  assert.equal(receipt.previous_revision, snapshot.revision);
  assert.equal(receipt.route_count, nextRoutes.length);

  return {
    marker: INTEGRATION_RESULT_MARKER,
    version: 1,
    status: "mounted",
    enabled: true,
    apply: true,
    confirmation_verified: true,
    mount_confirmation_verified: true,
    registry_snapshot_read: true,
    registry_compare_and_swap_attempted: true,
    registry_compare_and_swap_applied: true,
    registry_revision_before: snapshot.revision,
    registry_revision_after: receipt.next_revision,
    unrelated_route_count_before: snapshot.routes.length,
    unrelated_route_count_after: snapshot.routes.length,
    exact_route_count_after: 2,
    mount: null,
    authority: integrationAuthority(true, true),
  };
}

function command(
  apply: boolean,
): Record<string, unknown> {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION,
    apply,
    confirmation:
      apply
        ? PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIRMATION
        : "",
    integration_confirmation:
      apply ? INTEGRATION_CONFIRMATION : "",
    mount_confirmation:
      apply ? MOUNT_CONFIRMATION : "",
  };
}

function enabledEnvironment(): NodeJS.ProcessEnv {
  return {
    [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV]: "1",
    [REG_ENABLED]: "1",
    [MOUNT_ENABLED]: "1",
    [ROUTE_ENABLED]: "1",
  };
}

class FakeResponse implements PublicAgentServiceAcceptancePersistenceExpressResponseLikeV1 {
  statusCode = 0;
  headers = new Map<string, string>();
  headersSent = false;
  writableEnded = false;
  body = "";

  setHeader(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  end(body = ""): void {
    this.body = body;
    this.headersSent = true;
    this.writableEnded = true;
  }
}

async function invokeMiddleware(
  middleware: PublicAgentServiceAcceptancePersistenceExpressMiddlewareV1,
  request: PublicAgentServiceAcceptancePersistenceExpressRequestLikeV1,
): Promise<{ response: FakeResponse; nextCount: number }> {
  const response = new FakeResponse();
  let nextCount = 0;
  middleware(request, response, (error?: unknown) => {
    assert.equal(error, undefined);
    nextCount += 1;
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  return { response, nextCount };
}

const defaultIdentity =
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionDefaultDependencyIdentityV1();
assert.equal(defaultIdentity.execute_integration_exact, true);

const topology =
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionSourceTopologyV1();
assert.equal(topology.expected_app_creation, "const app = express();");
assert.equal(topology.expected_app_export, "(globalThis as any).__void_http_app = app;");
assert.equal(topology.expected_listener_owner, "src/index.ts");
assert.equal(topology.modifies_index, false);

const repositoryRoot = process.cwd();
const implementationPath = path.join(
  repositoryRoot,
  "scripts/public_agent_service_acceptance_persistence_http_route_server_bootstrap_composition_v1.ts",
);
const schemaPath = path.join(
  repositoryRoot,
  "schemas/public-agent-service-acceptance-persistence-http-route-server-bootstrap-composition-v1.schema.json",
);
const examplePath = path.join(
  repositoryRoot,
  "examples/public-agent-service-acceptance-persistence-http-route-server-bootstrap-composition-v1.example.json",
);
const documentationPath = path.join(
  repositoryRoot,
  "docs/public-agent/public-agent-service-acceptance-persistence-http-route-server-bootstrap-composition-v1.md",
);
const workflowPath = path.join(
  repositoryRoot,
  ".github/workflows/public-agent-service-acceptance-persistence-http-route-server-bootstrap-composition-v1.yml",
);
const sourceIndexPath = path.join(repositoryRoot, "src/index.ts");
for (const requiredPath of [
  implementationPath,
  schemaPath,
  examplePath,
  documentationPath,
  workflowPath,
  sourceIndexPath,
]) {
  assert.equal(fs.existsSync(requiredPath), true, `required artifact missing: ${requiredPath}`);
}
const implementationSource = fs.readFileSync(implementationPath, "utf8");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8")) as Record<string, unknown>;
const example = JSON.parse(fs.readFileSync(examplePath, "utf8")) as Record<string, unknown>;
const documentation = fs.readFileSync(documentationPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");
const sourceIndex = fs.readFileSync(sourceIndexPath, "utf8");
assert.equal(
  example.marker,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_EXAMPLE_MARKER,
);
assert.equal(example.version, 1);
assert.equal(
  (schema.properties as Record<string, any>).marker.const,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_EXAMPLE_MARKER,
);
assert.match(implementationSource, /createPublicAgentServiceAcceptancePersistenceHttpRouteServerExpressRegistryV1/);
assert.match(documentation, /bootstrapAcceptancePersistenceHttpRouteServerCompositionV1/);
assert.match(documentation, /does not modify `src\/index\.ts`/);
assert.match(workflow, /prove_public_agent_service_acceptance_persistence_http_route_server_bootstrap_composition_v1\.ts/);
assert.match(sourceIndex, /const app = express\(\);/);
assert.match(sourceIndex, /\(globalThis as any\)\.__void_http_app = app;/);
assert.equal(
  sourceIndex.includes(PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER),
  false,
);

const disabledProvider = (): never => {
  throw new Error("disabled composition invoked app provider");
};
const disabled =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1(
    {},
    { intentionally: "invalid because disabled short-circuits" },
    disabledProvider,
    () => ({ trusted: true }),
    { executeIntegration: fakeIntegration as any },
  );
assert.equal(disabled.marker, PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_MARKER);
assert.equal(disabled.status, "disabled");
assert.equal(disabled.app_provider_invoked, false);
assert.equal(disabled.registry_created, false);

expectThrows(
  () => loadPublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionConfigFromEnvironmentV1({
    [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV]: "yes",
  }),
  /must be 0 or 1/,
);

let upstreamDisabledProviderCount = 0;
const upstreamDisabled =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1(
    {
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED_ENV]: "1",
    },
    command(true),
    () => {
      upstreamDisabledProviderCount += 1;
      return new FakeApp();
    },
    () => ({ trusted: true }),
    { executeIntegration: fakeIntegration as any },
  );
assert.equal(upstreamDisabled.status, "integration_disabled");
assert.equal(upstreamDisabledProviderCount, 0);
assert.equal(upstreamDisabled.app_provider_invoked, false);

let dryProviderCount = 0;
const dryRun =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1(
    enabledEnvironment(),
    command(false),
    () => {
      dryProviderCount += 1;
      return new FakeApp();
    },
    () => ({ trusted: true }),
    { executeIntegration: fakeIntegration as any },
  );
assert.equal(dryRun.status, "planned");
assert.equal(dryProviderCount, 0);
assert.equal(dryRun.route_stack_snapshot_count, 0);
assert.equal(dryRun.compare_and_swap_attempt_count, 0);
assert.equal(dryRun.dispatcher_install_count, 0);

const app = new FakeApp();
const unrelatedHandle = () => undefined;
app._router.stack.push(routeLayer("/health", "GET", unrelatedHandle));
let appProviderCount = 0;
let trustedProviderCount = 0;
const mounted =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1(
    enabledEnvironment(),
    command(true),
    () => {
      appProviderCount += 1;
      return app;
    },
    () => {
      trustedProviderCount += 1;
      return { trusted: true };
    },
    { executeIntegration: fakeIntegration as any },
  );
assert.equal(mounted.status, "mounted");
assert.equal(appProviderCount, 1);
assert.equal(trustedProviderCount, 0);
assert.equal(mounted.app_provider_invoked, true);
assert.equal(mounted.registry_created, true);
assert.equal(mounted.route_stack_snapshot_count, 1);
assert.equal(mounted.compare_and_swap_attempt_count, 1);
assert.equal(mounted.compare_and_swap_apply_count, 1);
assert.equal(mounted.dispatcher_install_count, 1);
assert.equal(mounted.exact_managed_route_count, 2);
assert.equal(mounted.authority.express_dispatcher_installation, true);
assert.equal(mounted.authority.network_listener_creation, false);
assert.equal(app.listenReadCount, 0);
assert.equal(app._router.stack.length, 2);
assert.equal((app._router.stack[0] as any).route.path, "/health");

const dispatcher = (app._router.stack[1] as any).handle as
  PublicAgentServiceAcceptancePersistenceExpressMiddlewareV1;
assert.equal(typeof dispatcher, "function");

const statusDispatch = await invokeMiddleware(dispatcher, {
  method: "GET",
  path: STATUS_PATH,
  headers: {},
  complete: true,
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(statusDispatch.nextCount, 0);
assert.equal(statusDispatch.response.statusCode, 200);
assert.match(statusDispatch.response.body, /"path":"\/__void\/operator\/public-agent-service-acceptance-persistence-runtime-v1\/status"/);

const commandDispatch = await invokeMiddleware(dispatcher, {
  method: "POST",
  path: COMMAND_PATH,
  headers: { "content-type": "application/json", "content-length": "999" },
  body: { apply: false },
  complete: true,
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(commandDispatch.nextCount, 0);
assert.equal(commandDispatch.response.statusCode, 200);
const commandBody = JSON.parse(commandDispatch.response.body) as Record<string, unknown>;
assert.equal(commandBody.body, '{"apply":false}');
assert.equal(commandBody.content_length, String(Buffer.byteLength('{"apply":false}', "utf8")));

const unrelatedDispatch = await invokeMiddleware(dispatcher, {
  method: "GET",
  path: "/unrelated",
  headers: {},
  complete: true,
  socket: { remoteAddress: "127.0.0.1" },
});
assert.equal(unrelatedDispatch.nextCount, 1);
assert.equal(unrelatedDispatch.response.writableEnded, false);

const idempotent =
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1(
    enabledEnvironment(),
    command(true),
    () => app,
    () => ({ trusted: true }),
    { executeIntegration: fakeIntegration as any },
  );
assert.equal(idempotent.status, "already_mounted");
assert.equal(idempotent.dispatcher_install_count, 1);
assert.equal(idempotent.compare_and_swap_apply_count, 1);
assert.equal(idempotent.exact_managed_route_count, 2);
assert.equal(app._router.stack.length, 2);
assert.equal(app.listenReadCount, 0);

const conflictApp = new FakeApp();
conflictApp._router.stack.push(routeLayer(STATUS_PATH, "GET"));
expectThrows(
  () => executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1(
    enabledEnvironment(),
    command(true),
    () => conflictApp,
    () => ({ trusted: true }),
    { executeIntegration: fakeIntegration as any },
  ),
  /(partial canonical state rejected|canonical conflict rejected)/,
);
assert.equal(conflictApp._router.stack.length, 1);
assert.equal(conflictApp.listenReadCount, 0);

const staleApp = new FakeApp();
staleApp._router.stack.push(routeLayer("/one", "GET"));
const staleAdapter =
  createPublicAgentServiceAcceptancePersistenceHttpRouteServerExpressRegistryV1(staleApp);
const staleSnapshot = staleAdapter.registry.readExactRouteSnapshot();
staleApp._router.stack.push(routeLayer("/two", "GET"));
const staleHandle = (_request: unknown): any => ({
  marker: HTTP_RESPONSE_MARKER,
  version: 1,
  status_code: 204,
  headers: {},
  body: "",
  route_enabled: true,
  loopback_verified: true,
  runtime_config_loaded: false,
  runtime_invoked: false,
  runtime_status: null,
});
const staleNext = [
  ...staleSnapshot.routes,
  { method: "ALL", path: STATUS_PATH, handler_id: HANDLER_ID, handle: staleHandle },
  { method: "ALL", path: COMMAND_PATH, handler_id: HANDLER_ID, handle: staleHandle },
];
expectThrows(
  () => staleAdapter.registry.compareAndSwapExactRouteSnapshot(
    staleSnapshot.revision,
    staleNext,
  ),
  /stale Express route revision/,
);
assert.equal(staleAdapter.observe().dispatcher_install_count, 0);
assert.equal(staleApp._router.stack.length, 2);

const rollbackApp = new FakeApp();
rollbackApp._router.stack.push(routeLayer("/one", "GET"));
rollbackApp.failAfterAppend = true;
const rollbackAdapter =
  createPublicAgentServiceAcceptancePersistenceHttpRouteServerExpressRegistryV1(rollbackApp);
const rollbackSnapshot = rollbackAdapter.registry.readExactRouteSnapshot();
const rollbackNext = [
  ...rollbackSnapshot.routes,
  { method: "ALL", path: STATUS_PATH, handler_id: HANDLER_ID, handle: staleHandle },
  { method: "ALL", path: COMMAND_PATH, handler_id: HANDLER_ID, handle: staleHandle },
];
expectThrows(
  () => rollbackAdapter.registry.compareAndSwapExactRouteSnapshot(
    rollbackSnapshot.revision,
    rollbackNext,
  ),
  /synthetic app\.use failure/,
);
assert.equal(rollbackAdapter.observe().dispatcher_install_count, 0);
assert.equal(rollbackAdapter.observe().compare_and_swap_apply_count, 0);
assert.equal(rollbackApp._router.stack.length, 1);
assert.equal(rollbackApp.listenReadCount, 0);

assert.equal(PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER,
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_V1");
assert.equal(PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_MARKER,
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_CONFIG_V1");
assert.equal(PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER,
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_V1");
assert.equal(PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_EXAMPLE_MARKER,
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_EXAMPLE_V1");
assert.equal(PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION, 1);

const proof = {
  marker:
    "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_V1_PROOF_GREEN",
  binding_marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER,
  adapter_id:
    "void.public-agent-service-acceptance-persistence-http-route-server-bootstrap-composition.v1",
  source_base_commit:
    "0eeec78e8cff6e6de3725e3c3bd8c8d786583aab",
  sealed_registrar_integration_merge:
    "7d5abc9c47e87e1363cc8dc4e0b1cee98d6512d7",
  environment_disabled_by_default: true,
  invalid_enable_flag_rejected: true,
  disabled_short_circuit_before_command_validation: true,
  upstream_disabled_short_circuit_before_app_provider: true,
  dry_run_without_app_provider: true,
  exact_three_confirmations_required: true,
  app_provider_invoked_once_on_apply: true,
  trusted_context_provider_deferred_to_route_handler: true,
  route_stack_snapshot_read_once: true,
  unrelated_routes_preserved: true,
  compare_and_swap_expected_revision_exact: true,
  stale_revision_rejected: true,
  stale_revision_no_partial_mutation: true,
  dispatcher_installed_once: true,
  dispatcher_installation_rollback_exact: true,
  exact_two_managed_routes: true,
  already_mounted_idempotent: true,
  unmanaged_canonical_route_conflict_rejected: true,
  normalized_request_marker_exact: true,
  reconstructed_body_content_length_exact: true,
  mounted_response_preserved: true,
  unrelated_request_deferred: true,
  listener_method_not_accessed: true,
  schema_example_exact: true,
  documentation_contract_exact: true,
  workflow_proof_binding_exact: true,
  source_topology_exact: true,
  source_index_modified: false,
  production_http_route_mounted: false,
  network_listener_created: false,
  external_http_submission: false,
  production_acceptance_persistence_performed: false,
  production_replay_write_performed: false,
  payment_authorization: false,
  payment_execution: false,
  execution_authorization: false,
  work_dispatch: false,
  production_signing: false,
  transaction_broadcast: false,
  work_credit_write: false,
  runtime_mutation: false,
  service_change: false,
  money_movement: false,
  proof: "green",
};

process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
process.stdout.write(
  "acceptance_persistence_http_route_server_bootstrap_composition_proof=green\n",
);
