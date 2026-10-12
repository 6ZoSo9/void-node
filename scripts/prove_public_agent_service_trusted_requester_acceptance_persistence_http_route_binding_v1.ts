import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ERROR_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESULT_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteFromEnvironmentV1,
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1,
  loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigFromEnvironmentV1,
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteDefaultDependencyIdentityV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteDependenciesV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_http_route_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_runtime_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
} from "./public_agent_service_acceptance_persistence_adapter_v1.js";

const ROOT = path.resolve(
  path.dirname(
    new URL(import.meta.url).pathname,
  ),
  "..",
);

function routeConfig(
  enabled: boolean,
  maxBody = 4096,
) {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    enabled,
    max_body_bytes:
      maxBody,
  };
}

function request(
  routePath: string,
  method = "GET",
  body = "",
  headers: Record<string, string> = {},
  remoteAddress = "127.0.0.1",
) {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    method,
    path:
      routePath,
    remote_address:
      remoteAddress,
    headers,
    body,
  };
}

function runtimeConfig(
  enabled: boolean,
): PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    version:
      1,
    enabled,
    persistence_config: {
      marker:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
      version:
        1,
      allowed_root:
        "/proof/operator-owned-root-not-accessed",
      max_pointer_bytes:
        65_536,
      max_generation_file_bytes:
        4_194_304,
      max_generation_count:
        10_000,
      fsync_enabled:
        true,
    },
  };
}

function authority(
  applied: boolean,
) {
  return {
    acceptance_persistence:
      applied,
    quote_acceptance_recorded:
      applied,
    requester_authentication_replay_write:
      applied,
    provider_authentication_replay_write:
      applied,
    acceptance_replay_write:
      applied,
    payment_authorization:
      false,
    payment_execution:
      false,
    execution_authorization:
      false,
    work_dispatch:
      false,
    credential_issue:
      false,
    credential_change:
      false,
    provider_selection:
      false,
    requester_key_registry_write:
      false,
    provider_key_registry_write:
      false,
    wallet_access:
      false,
    production_signing:
      false,
    transaction_broadcast:
      false,
    work_credit_write:
      false,
    work_credit_settlement:
      false,
    http_submission:
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

function runtimeResult(
  status:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1["status"],
): PublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeResultV1 {
  const applied =
    status === "persisted"
    || status === "duplicate"
    || status === "recovered";
  const enabled =
    status !== "disabled";
  const planned =
    status === "planned"
    || status === "example_only";
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
    version:
      1,
    status,
    enabled,
    apply:
      applied,
    confirmation_verified:
      applied,
    trusted_input_provider_invoked:
      enabled,
    trusted_replay_plan_verified:
      enabled,
    requester_binding_provenance_verified:
      status !== "example_only"
        && enabled,
    persistence_handoff_packet_validated:
      enabled,
    store_inspected:
      enabled,
    persistence_attempted:
      applied,
    persistence_status:
      applied
        ? status === "persisted"
          ? "committed"
          : status
        : null,
    root_realpath:
      enabled
        ? "/proof/operator-owned-root-not-exposed"
        : null,
    generation_count_before:
      enabled
        ? 2
        : null,
    requester_authentication_id:
      enabled
        ? "requester-authentication-id"
        : null,
    provider_authentication_id:
      enabled
        ? "provider-authentication-id"
        : null,
    quote_id:
      enabled
        ? "quote-id"
        : null,
    work_order_id:
      enabled
        ? "work-order-id"
        : null,
    requester_agent_id:
      enabled
        ? "requester-agent-id"
        : null,
    provider_id:
      enabled
        ? "provider-id"
        : null,
    acceptance_nonce:
      enabled
        ? "acceptance-nonce"
        : null,
    plan_id:
      enabled
        ? `plan-${status}`
        : null,
    acceptance_id:
      enabled
        ? `acceptance-${status}`
        : null,
    transaction_id:
      enabled
        ? `transaction-${status}`
        : null,
    before_state_id:
      enabled
        ? "state-before"
        : null,
    after_state_id:
      enabled
        ? "state-after"
        : null,
    before_revision:
      enabled
        ? 2
        : null,
    after_revision:
      enabled
        ? 3
        : null,
    generation_id:
      applied
        ? `generation-${status}`
        : null,
    operation_id:
      applied
        ? `operation-${status}`
        : null,
    acceptance_materialized_in_memory:
      enabled,
    acceptance_persisted:
      applied,
    requester_authentication_replay_write:
      applied,
    provider_authentication_replay_write:
      applied,
    acceptance_replay_write:
      applied,
    single_active_acceptance_per_quote_enforced:
      enabled,
    quote_acceptance_recorded:
      applied,
    operator_owned_persistence_config:
      true,
    server_replay_state_injected:
      enabled,
    direct_verified_packet_provider:
      enabled,
    authority:
      authority(applied),
    runtime_binding_enabled:
      enabled,
    runtime_confirmation_verified:
      applied,
    composition_invoked:
      enabled,
    composition_confirmation_injected:
      applied,
    trusted_input_provider_forwarded:
      enabled,
  };
}

function parseBody(
  response:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpResponseV1,
): Record<string, unknown> {
  return JSON.parse(
    response.body,
  ) as Record<string, unknown>;
}

const dependencyIdentity =
  publicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteDefaultDependencyIdentityV1();
assert.deepEqual(
  dependencyIdentity,
  {
    load_runtime_config_exact:
      true,
    execute_runtime_exact:
      true,
    trusted_provider_separate_from_command:
      true,
  },
);

const loadedDisabled =
  loadPublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteConfigFromEnvironmentV1(
    {},
  );
assert.equal(
  loadedDisabled.enabled,
  false,
);
assert.equal(
  loadedDisabled.max_body_bytes,
  4 * 1024 * 1024,
);

let disabledLoadCount = 0;
let disabledExecuteCount = 0;
let disabledProviderCount = 0;
const disabledDependencies:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteDependenciesV1 = {
    loadRuntimeConfig:
      () => {
        disabledLoadCount += 1;
        throw new Error(
          "must not load runtime config",
        );
      },
    executeRuntime:
      () => {
        disabledExecuteCount += 1;
        throw new Error(
          "must not invoke runtime",
        );
      },
  };
const hostileRequest = new Proxy(
  {},
  {
    ownKeys() {
      throw new Error(
        "disabled route inspected request",
      );
    },
  },
);
const disabledResponse =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(false),
    hostileRequest,
    {},
    () => {
      disabledProviderCount += 1;
      throw new Error(
        "disabled route invoked provider",
      );
    },
    disabledDependencies,
  );
assert.equal(
  disabledResponse.status_code,
  404,
);
assert.equal(
  disabledResponse.route_enabled,
  false,
);
assert.equal(
  disabledLoadCount,
  0,
);
assert.equal(
  disabledExecuteCount,
  0,
);
assert.equal(
  disabledProviderCount,
  0,
);

let runtimeLoadCount = 0;
let runtimeExecuteCount = 0;
let lastEnvironment:
  NodeJS.ProcessEnv | null = null;
let lastCommand: unknown = null;
let lastProvider:
  (() => unknown) | null = null;
let nextRuntimeResult =
  runtimeResult("planned");
let runtimeError:
  Error | null = null;

const dependencies:
  PublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteDependenciesV1 = {
    loadRuntimeConfig:
      (environment) => {
        runtimeLoadCount += 1;
        lastEnvironment =
          environment;
        return runtimeConfig(true);
      },
    executeRuntime:
      (
        _config,
        command,
        provider,
      ) => {
        runtimeExecuteCount += 1;
        lastCommand =
          command;
        lastProvider =
          provider;
        if (runtimeError !== null) {
          throw runtimeError;
        }
        return nextRuntimeResult;
      },
  };

const runtimeEnvironment = {
  VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED:
    "1",
};
const serverOwnedInput = {
  secret_requester_payload:
    "requester-secret-do-not-echo",
  secret_acceptance_payload:
    "acceptance-secret-do-not-echo",
};
let providerCalls = 0;
const trustedProvider = () => {
  providerCalls += 1;
  return serverOwnedInput;
};

const external =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      "GET",
      "",
      {},
      "203.0.113.7",
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  external.status_code,
  404,
);
assert.equal(
  runtimeLoadCount,
  0,
);

const forwarded =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      "GET",
      "",
      {
        "x-forwarded-for":
          "127.0.0.1",
      },
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  forwarded.status_code,
  404,
);
assert.equal(
  runtimeLoadCount,
  0,
);

const unknownPath =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      "/__void/operator/unknown",
      "GET",
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  unknownPath.status_code,
  404,
);

const statusGet =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      "GET",
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  statusGet.status_code,
  200,
);
assert.equal(
  statusGet.runtime_config_loaded,
  true,
);
assert.equal(
  statusGet.runtime_invoked,
  false,
);
assert.equal(
  runtimeLoadCount,
  1,
);
assert.equal(
  runtimeExecuteCount,
  0,
);
assert.equal(
  providerCalls,
  0,
);
assert.equal(
  statusGet.headers["cache-control"],
  "no-store",
);
assert.equal(
  statusGet.headers["access-control-allow-origin"],
  undefined,
);
const statusJson =
  parseBody(statusGet);
assert.equal(
  statusJson.runtime_enabled,
  true,
);
assert.equal(
  statusJson.trusted_input_provider_server_owned,
  true,
);
assert.equal(
  statusJson.raw_persistence_root_exposed,
  false,
);
assert.equal(
  statusGet.body.includes(
    "/proof/",
  ),
  false,
);

const statusHead =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      "HEAD",
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  statusHead.status_code,
  200,
);
assert.equal(
  statusHead.body,
  "",
);
assert.equal(
  statusHead.headers["content-length"],
  statusGet.headers["content-length"],
);

const statusMethod =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      "POST",
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  statusMethod.status_code,
  405,
);
assert.equal(
  statusMethod.headers.allow,
  "GET, HEAD",
);

const commandMethod =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      "GET",
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  commandMethod.status_code,
  405,
);
assert.equal(
  commandMethod.headers.allow,
  "POST",
);

const command = {
  marker:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
  version:
    1,
  apply:
    false,
  confirmation:
    "",
  recorded_at_utc:
    "2026-07-29T15:30:00Z",
};
const commandBody =
  JSON.stringify(
    command,
  );

const mediaRejected =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      "POST",
      commandBody,
      {
        "content-type":
          "text/plain",
      },
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  mediaRejected.status_code,
  415,
);

const encodedRejected =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      "POST",
      commandBody,
      {
        "content-type":
          "application/json",
        "content-encoding":
          "gzip",
      },
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  encodedRejected.status_code,
  415,
);

const tooLarge =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(
      true,
      1024,
    ),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      "POST",
      "x".repeat(1025),
      {
        "content-type":
          "application/json",
      },
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  tooLarge.status_code,
  413,
);

const lengthMismatch =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      "POST",
      commandBody,
      {
        "content-type":
          "application/json",
        "content-length":
          "1",
      },
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  lengthMismatch.status_code,
  400,
);

const invalidJson =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      "POST",
      "{",
      {
        "content-type":
          "application/json",
      },
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  invalidJson.status_code,
  400,
);

runtimeLoadCount = 0;
runtimeExecuteCount = 0;
lastCommand = null;
lastProvider = null;
nextRuntimeResult =
  runtimeResult("planned");

const planned =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      "POST",
      commandBody,
      {
        "content-type":
          "application/json; charset=utf-8",
        "content-length":
          String(
            Buffer.byteLength(
              commandBody,
              "utf8",
            ),
          ),
      },
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  planned.status_code,
  200,
);
assert.equal(
  planned.runtime_status,
  "planned",
);
assert.equal(
  planned.runtime_config_loaded,
  true,
);
assert.equal(
  planned.runtime_invoked,
  true,
);
assert.equal(
  runtimeLoadCount,
  1,
);
assert.equal(
  runtimeExecuteCount,
  1,
);
assert.equal(
  lastEnvironment,
  runtimeEnvironment,
);
assert.deepEqual(
  lastCommand,
  command,
);
assert.equal(
  lastProvider,
  trustedProvider,
);
assert.equal(
  providerCalls,
  0,
);
const plannedJson =
  parseBody(planned);
assert.equal(
  plannedJson.marker,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_RESULT_MARKER,
);
assert.equal(
  plannedJson.status,
  "planned",
);
assert.equal(
  plannedJson.root_realpath,
  undefined,
);
assert.match(
  String(
    plannedJson.root_fingerprint,
  ),
  /^[0-9a-f]{64}$/,
);
assert.equal(
  planned.body.includes(
    "/proof/operator-owned-root-not-exposed",
  ),
  false,
);
assert.equal(
  planned.body.includes(
    "requester-secret-do-not-echo",
  ),
  false,
);
assert.equal(
  planned.body.includes(
    "acceptance-secret-do-not-echo",
  ),
  false,
);

for (const [status, expectedCode] of [
  ["disabled", 503],
  ["persisted", 201],
  ["duplicate", 200],
  ["recovered", 200],
] as const) {
  nextRuntimeResult =
    runtimeResult(status);
  const mapped =
    handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
      routeConfig(true),
      request(
        PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
        "POST",
        commandBody,
        {
          "content-type":
            "application/json",
        },
      ),
      runtimeEnvironment,
      trustedProvider,
      dependencies,
    );
  assert.equal(
    mapped.status_code,
    expectedCode,
  );
  assert.equal(
    mapped.runtime_status,
    status,
  );
}

runtimeError = new Error(
  "sensitive signer and requester material must never be returned",
);
const redactedError =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      "POST",
      commandBody,
      {
        "content-type":
          "application/json",
      },
    ),
    runtimeEnvironment,
    trustedProvider,
    dependencies,
  );
assert.equal(
  redactedError.status_code,
  400,
);
assert.equal(
  redactedError.body.includes(
    "sensitive signer",
  ),
  false,
);
assert.equal(
  parseBody(redactedError).marker,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ERROR_MARKER,
);
runtimeError = null;

const fromEnvironmentDisabled =
  handlePublicAgentServiceTrustedRequesterAcceptancePersistenceHttpRouteFromEnvironmentV1(
    request(
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
      "GET",
    ),
    {
      [PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV]:
        "0",
    },
    trustedProvider,
    dependencies,
  );
assert.equal(
  fromEnvironmentDisabled.status_code,
  404,
);

const source = fs.readFileSync(
  path.join(
    ROOT,
    "scripts",
    "public_agent_service_trusted_requester_acceptance_persistence_http_route_binding_v1.ts",
  ),
  "utf8",
);
const docs = fs.readFileSync(
  path.join(
    ROOT,
    "docs",
    "public-agent",
    "public-agent-service-trusted-requester-acceptance-persistence-http-route-binding-v1.md",
  ),
  "utf8",
);
const workflow = fs.readFileSync(
  path.join(
    ROOT,
    ".github",
    "workflows",
    "public-agent-service-trusted-requester-acceptance-persistence-http-route-binding-v1.yml",
  ),
  "utf8",
);
const schema = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "schemas",
      "public-agent-service-trusted-requester-acceptance-persistence-http-route-binding-v1.schema.json",
    ),
    "utf8",
  ),
) as Record<string, unknown>;

for (const forbidden of [
  'from "express"',
  "createServer(",
  "app.post(",
  "app.use(",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    `route source gained mounted-server surface: ${forbidden}`,
  );
}
for (const token of [
  "executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1",
  "trustedReplayPlanInputProvider",
  "PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION",
  "contentTypeAccepted",
  "contentLengthMatches",
  "rootFingerprint",
]) {
  assert.equal(
    source.includes(token),
    true,
    `route source omitted ${token}`,
  );
}
for (const phrase of [
  "framework-neutral, loopback-only HTTP handler",
  "does not mount",
  "server-owned trusted replay-plan input provider",
  "persistTrustedRequesterAcceptanceRuntimeV1",
  "No CORS header",
  "Compressed request bodies are rejected",
  "A later integration lane",
]) {
  assert.equal(
    docs.includes(phrase),
    true,
    `route documentation omitted ${phrase}`,
  );
}
for (const commandText of [
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_runtime_binding_v1.ts",
  "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_http_route_binding_v1.ts",
]) {
  assert.equal(
    workflow.includes(commandText),
    true,
    `workflow omitted ${commandText}`,
  );
}
assert.equal(
  schema.x_void_marker,
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SCHEMA_V1",
);

console.log(
  "marker=VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_BINDING_PROOF_V1",
);
console.log(
  "sealed_trusted_runtime_binding_available=true",
);
console.log(
  "lower_runtime_proof_required_by_workflow=true",
);
console.log(
  "disabled_route_returns_404_before_request_validation=true",
);
console.log(
  "disabled_route_skips_runtime_config_load=true",
);
console.log(
  "disabled_route_skips_runtime_invocation=true",
);
console.log(
  "disabled_route_skips_trusted_input_provider=true",
);
console.log(
  "loopback_only_verified=true",
);
console.log(
  "forwarding_headers_hidden=true",
);
console.log(
  "noncanonical_path_hidden=true",
);
console.log(
  "status_get_verified=true",
);
console.log(
  "status_head_verified=true",
);
console.log(
  "status_method_allow_verified=true",
);
console.log(
  "command_method_allow_verified=true",
);
console.log(
  "json_content_type_required=true",
);
console.log(
  "content_encoding_restricted=true",
);
console.log(
  "body_size_bound_enforced=true",
);
console.log(
  "content_length_verified=true",
);
console.log(
  "runtime_environment_server_owned=true",
);
console.log(
  "runtime_command_forwarded_exact=true",
);
console.log(
  "trusted_input_provider_forwarded_exact=true",
);
console.log(
  "trusted_input_not_in_command=true",
);
console.log(
  "requester_authentication_input_not_echoed=true",
);
console.log(
  "acceptance_input_not_echoed=true",
);
console.log(
  "raw_persistence_root_not_exposed=true",
);
console.log(
  "runtime_error_redacted=true",
);
console.log(
  "runtime_disabled_mapped_to_503=true",
);
console.log(
  "runtime_planned_mapped_to_200=true",
);
console.log(
  "runtime_persisted_mapped_to_201=true",
);
console.log(
  "runtime_duplicate_mapped_to_200=true",
);
console.log(
  "runtime_recovered_mapped_to_200=true",
);
console.log(
  "http_route_binding_mounted=false",
);
console.log(
  "network_listener_created=false",
);
console.log(
  "route_registrar_modified=false",
);
console.log(
  "src_index_modified=false",
);
console.log(
  "runtime_configuration_installed=false",
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
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_BINDING_V1_EXACT_GREEN",
);
