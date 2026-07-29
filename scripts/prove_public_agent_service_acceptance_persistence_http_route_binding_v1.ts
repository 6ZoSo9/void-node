import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  handlePublicAgentServiceAcceptancePersistenceHttpRouteFromEnvironmentV1,
  handlePublicAgentServiceAcceptancePersistenceHttpRouteV1,
  loadPublicAgentServiceAcceptancePersistenceHttpRouteConfigFromEnvironmentV1,
  publicAgentServiceAcceptancePersistenceHttpRouteDefaultDependencyIdentityV1,
  type PublicAgentServiceAcceptancePersistenceHttpRequestV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteDependenciesV1,
} from "./public_agent_service_acceptance_persistence_http_route_binding_v1.js";
import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
  type PublicAgentServiceAcceptancePersistenceRuntimeConfigV1,
  type PublicAgentServiceAcceptancePersistenceRuntimeResultV1,
} from "./public_agent_service_acceptance_persistence_runtime_binding_v1.js";

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

function sha256(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function routeConfig(enabled: boolean, maxBody = 4096) {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    enabled,
    max_body_bytes:
      maxBody,
  };
}

function request(
  path: string,
  method = "GET",
  body = "",
  headers: Record<string, string> = {},
  remoteAddress = "127.0.0.1",
): PublicAgentServiceAcceptancePersistenceHttpRequestV1 {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_REQUEST_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_VERSION,
    method,
    path,
    remote_address:
      remoteAddress,
    headers,
    body,
  };
}

function runtimeConfig(enabled: boolean): PublicAgentServiceAcceptancePersistenceRuntimeConfigV1 {
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
        "/var/lib/void-agent-paid-work-acceptance-persistence-v1",
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

function runtimeResult(
  status:
    | "disabled"
    | "planned"
    | "persisted"
    | "duplicate"
    | "recovered",
): PublicAgentServiceAcceptancePersistenceRuntimeResultV1 {
  const applied = status === "persisted"
    || status === "duplicate"
    || status === "recovered";
  const enabled = status !== "disabled";
  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_RESULT_MARKER,
    version: 1,
    status,
    enabled,
    apply:
      applied,
    confirmation_verified:
      applied,
    trusted_context_loaded:
      enabled,
    store_inspected:
      enabled,
    persistence_attempted:
      applied,
    persistence_status:
      applied ? status : null,
    root_realpath:
      enabled
        ? "/var/lib/void-agent-paid-work-acceptance-persistence-v1"
        : null,
    generation_count_before:
      enabled ? 2 : null,
    plan_id:
      enabled ? `plan-${status}` : null,
    acceptance_id:
      enabled ? `acceptance-${status}` : null,
    transaction_id:
      enabled ? `transaction-${status}` : null,
    before_state_id:
      enabled ? "state-before" : null,
    after_state_id:
      enabled ? "state-after" : null,
    before_revision:
      enabled ? 2 : null,
    after_revision:
      enabled ? 3 : null,
    generation_id:
      applied ? `generation-${status}` : null,
    operation_id:
      applied ? `operation-${status}` : null,
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
    authority: {
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
      http_submission:
        false,
      runtime_mutation:
        false,
      money_movement:
        false,
    },
  };
}

function parseBody(response: { body: string }): Record<string, unknown> {
  return JSON.parse(response.body) as Record<string, unknown>;
}

const defaultIdentity =
  publicAgentServiceAcceptancePersistenceHttpRouteDefaultDependencyIdentityV1();
assert.deepEqual(defaultIdentity, {
  load_runtime_config_exact:
    true,
  execute_runtime_exact:
    true,
  runtime_default_dependencies_bound:
    true,
  sha256_text_exact:
    true,
});

const disabledEnvironment = {
  VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT:
    "/var/lib/void-agent-paid-work-acceptance-persistence-v1",
};
const loadedDisabled =
  loadPublicAgentServiceAcceptancePersistenceHttpRouteConfigFromEnvironmentV1(
    disabledEnvironment,
  );
assert.equal(loadedDisabled.enabled, false);
assert.equal(loadedDisabled.max_body_bytes, 4 * 1024 * 1024);
assert.throws(
  () => loadPublicAgentServiceAcceptancePersistenceHttpRouteConfigFromEnvironmentV1({
    [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV]:
      "yes",
  }),
  /must be 0 or 1/,
);

let disabledLoaderCalls = 0;
let disabledRuntimeCalls = 0;
const disabledDependencies: PublicAgentServiceAcceptancePersistenceHttpRouteDependenciesV1 = {
  loadRuntimeConfig: () => {
    disabledLoaderCalls += 1;
    throw new Error("must not load runtime config");
  },
  executeRuntime: () => {
    disabledRuntimeCalls += 1;
    throw new Error("must not invoke runtime");
  },
  sha256Text:
    sha256,
};
const poisonedRequest = new Proxy({}, {
  get() {
    throw new Error("disabled route inspected request");
  },
  ownKeys() {
    throw new Error("disabled route enumerated request");
  },
});
const disabledResponse =
  handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
    routeConfig(false),
    poisonedRequest,
    {},
    () => {
      throw new Error("disabled route called trusted context");
    },
    disabledDependencies,
  );
assert.equal(disabledResponse.status_code, 404);
assert.equal(disabledResponse.route_enabled, false);
assert.equal(disabledLoaderCalls, 0);
assert.equal(disabledRuntimeCalls, 0);

let loadCalls = 0;
let executeCalls = 0;
let providerCalls = 0;
let lastEnvironment: NodeJS.ProcessEnv | null = null;
let lastCommand: unknown = null;
let nextRuntimeResult = runtimeResult("planned");
let runtimeError: Error | null = null;
const dependencies: PublicAgentServiceAcceptancePersistenceHttpRouteDependenciesV1 = {
  loadRuntimeConfig: (environment) => {
    loadCalls += 1;
    lastEnvironment = environment;
    return runtimeConfig(true);
  },
  executeRuntime: (_config, command, provider) => {
    executeCalls += 1;
    lastCommand = command;
    if (runtimeError !== null) throw runtimeError;
    assert.equal(typeof provider, "function");
    return nextRuntimeResult;
  },
  sha256Text:
    sha256,
};
const runtimeEnvironment = {
  [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED_ENV]:
    "1",
  VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT:
    "/var/lib/void-agent-paid-work-acceptance-persistence-v1",
};

const external = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
    "GET",
    "",
    {},
    "203.0.113.44",
  ),
  runtimeEnvironment,
  () => {
    providerCalls += 1;
    return {};
  },
  dependencies,
);
assert.equal(external.status_code, 404);
assert.equal(loadCalls, 0);
assert.equal(executeCalls, 0);

const forwarded = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
    "GET",
    "",
    { "x-forwarded-for": "127.0.0.1" },
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(forwarded.status_code, 404);
assert.equal(loadCalls, 0);

const unknownPath = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request("/__void/operator/unknown", "GET"),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(unknownPath.status_code, 404);

const statusGet = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
    "GET",
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(statusGet.status_code, 200);
assert.equal(statusGet.runtime_config_loaded, true);
assert.equal(statusGet.runtime_invoked, false);
assert.equal(statusGet.headers["cache-control"], "no-store");
assert.equal(statusGet.headers["access-control-allow-origin"], undefined);
const statusJson = parseBody(statusGet);
assert.equal(statusJson.runtime_enabled, true);
assert.equal(statusJson.raw_persistence_root_exposed, false);
assert.equal(statusGet.body.includes("/var/lib/"), false);

const statusHead = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
    "HEAD",
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(statusHead.status_code, 200);
assert.equal(statusHead.body, "");
assert.equal(
  statusHead.headers["content-length"],
  statusGet.headers["content-length"],
);

const statusMethod = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
    "POST",
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(statusMethod.status_code, 405);
assert.equal(statusMethod.headers.allow, "GET, HEAD");

const commandMethod = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    "GET",
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(commandMethod.status_code, 405);
assert.equal(commandMethod.headers.allow, "POST");

const command = {
  marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
  version: 1,
  apply: false,
  confirmation: "",
  recorded_at_utc: "2026-07-28T23:59:00Z",
  requester_authentication_input: {
    secret_requester_payload: "requester-secret-do-not-echo",
  },
  acceptance_draft: {
    secret_acceptance_payload: "acceptance-secret-do-not-echo",
  },
};
const commandBody = JSON.stringify(command);

const mediaRejected = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    "POST",
    commandBody,
    {},
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(mediaRejected.status_code, 415);

const encodedRejected = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    "POST",
    commandBody,
    {
      "content-type": "application/json",
      "content-encoding": "gzip",
    },
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(encodedRejected.status_code, 415);

const tooLarge = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true, 1024),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    "POST",
    "x".repeat(1025),
    { "content-type": "application/json" },
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(tooLarge.status_code, 413);

const lengthMismatch = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    "POST",
    commandBody,
    {
      "content-type": "application/json",
      "content-length": "1",
    },
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(lengthMismatch.status_code, 400);

const invalidJson = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    "POST",
    "{",
    { "content-type": "application/json" },
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(invalidJson.status_code, 400);

loadCalls = 0;
executeCalls = 0;
nextRuntimeResult = runtimeResult("planned");
const planned = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    "POST",
    commandBody,
    {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(Buffer.byteLength(commandBody, "utf8")),
    },
  ),
  runtimeEnvironment,
  () => {
    providerCalls += 1;
    return { catalog: {}, work_order: {}, quote: {} };
  },
  dependencies,
);
assert.equal(planned.status_code, 200);
assert.equal(planned.runtime_status, "planned");
assert.equal(loadCalls, 1);
assert.equal(executeCalls, 1);
assert.equal(lastEnvironment, runtimeEnvironment);
assert.deepEqual(lastCommand, command);
const plannedJson = parseBody(planned);
assert.equal(
  plannedJson.root_fingerprint_sha256,
  sha256("/var/lib/void-agent-paid-work-acceptance-persistence-v1"),
);
assert.equal(planned.body.includes("/var/lib/"), false);
assert.equal(planned.body.includes("requester-secret-do-not-echo"), false);
assert.equal(planned.body.includes("acceptance-secret-do-not-echo"), false);
assert.equal(providerCalls, 0);

for (const [status, expectedCode] of [
  ["disabled", 503],
  ["persisted", 201],
  ["duplicate", 200],
  ["recovered", 200],
] as const) {
  nextRuntimeResult = runtimeResult(status);
  const mapped = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
    routeConfig(true),
    request(
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
      "POST",
      commandBody,
      { "content-type": "application/json" },
    ),
    runtimeEnvironment,
    () => ({}),
    dependencies,
  );
  assert.equal(mapped.status_code, expectedCode);
  assert.equal(mapped.runtime_status, status);
}

runtimeError = new Error(
  "sensitive signer and requester material must never be returned",
);
const redactedError = handlePublicAgentServiceAcceptancePersistenceHttpRouteV1(
  routeConfig(true),
  request(
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
    "POST",
    commandBody,
    { "content-type": "application/json" },
  ),
  runtimeEnvironment,
  () => ({}),
  dependencies,
);
assert.equal(redactedError.status_code, 400);
assert.equal(redactedError.body.includes("sensitive signer"), false);
runtimeError = null;

const fromEnvironmentDisabled =
  handlePublicAgentServiceAcceptancePersistenceHttpRouteFromEnvironmentV1(
    disabledEnvironment,
    poisonedRequest,
    () => ({}),
    disabledDependencies,
  );
assert.equal(fromEnvironmentDisabled.status_code, 404);

const output = {
  marker:
    "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_BINDING_V1_PROOF_GREEN",
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
  status_path:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_STATUS_PATH,
  command_path:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_COMMAND_PATH,
  default_dependencies_exact:
    true,
  route_environment_disabled_by_default:
    true,
  invalid_enable_flag_rejected:
    true,
  disabled_route_returns_404_before_request_validation:
    true,
  disabled_route_skips_runtime_config_load:
    true,
  disabled_route_skips_runtime_invocation:
    true,
  loopback_only_enforced:
    true,
  forwarded_headers_hidden:
    true,
  noncanonical_path_hidden:
    true,
  status_get_verified:
    true,
  status_head_verified:
    true,
  status_method_allow_verified:
    true,
  command_method_allow_verified:
    true,
  json_content_type_required:
    true,
  content_encoding_restricted:
    true,
  body_size_bound_enforced:
    true,
  content_length_verified:
    true,
  malformed_json_rejected:
    true,
  runtime_environment_server_owned:
    true,
  runtime_command_forwarded_exact:
    true,
  trusted_context_provider_not_called_by_route:
    true,
  raw_persistence_root_redacted:
    true,
  persistence_root_fingerprint_exposed:
    true,
  requester_authentication_input_not_echoed:
    true,
  acceptance_draft_not_echoed:
    true,
  runtime_error_redacted:
    true,
  runtime_disabled_mapped_to_503:
    true,
  runtime_planned_mapped_to_200:
    true,
  runtime_persisted_mapped_to_201:
    true,
  runtime_duplicate_mapped_to_200:
    true,
  runtime_recovered_mapped_to_200:
    true,
  no_cors_header:
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
};

console.log(JSON.stringify(output, null, 2));
