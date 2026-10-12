import {
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_V1,
  createExternalOpportunityAgentIntakeDiscoveryContractV1,
  handleExternalOpportunityAgentIntakeDiscoveryV1,
  type ExternalOpportunityAgentIntakeDiscoveryRequestV1,
  type ExternalOpportunityAgentIntakeDiscoveryResponseV1,
} from "./agent_intake_readonly_discovery_route_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_V1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_SCHEMA_V1 =
  "void-external-opportunity-agent-intake-runtime-adapter-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_REGISTRATION_V1 =
  "all" as const;

export type ExternalOpportunityAgentIntakeRuntimeAdapterHeaderValueV1 =
  | string
  | string[]
  | undefined;

export interface ExternalOpportunityAgentIntakeRuntimeAdapterRequestV1 {
  method?: string;
  path?: string;
  originalUrl?: string;
  url?: string;
  headers?: Record<
    string,
    ExternalOpportunityAgentIntakeRuntimeAdapterHeaderValueV1
  >;
}

export interface ExternalOpportunityAgentIntakeRuntimeAdapterResponseV1 {
  status(code: number): ExternalOpportunityAgentIntakeRuntimeAdapterResponseV1;
  setHeader(name: string, value: string): void;
  send?(body: string): unknown;
  end(body?: string): unknown;
}

export type ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1 = (
  request: ExternalOpportunityAgentIntakeRuntimeAdapterRequestV1,
  response: ExternalOpportunityAgentIntakeRuntimeAdapterResponseV1,
) => unknown;

export interface ExternalOpportunityAgentIntakeRuntimeAdapterApplicationV1 {
  all(
    path: string,
    handler: ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1,
  ): unknown;
}

export interface ExternalOpportunityAgentIntakeRuntimeAdapterContractV1 {
  schema:
    typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_SCHEMA_V1;
  marker:
    typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_V1;
  version: 1;
  registration: {
    path: typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1;
    method:
      typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_REGISTRATION_V1;
    registration_count_per_mount: 1;
    exact_path_only: true;
  };
  handler_binding: {
    marker:
      typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_V1;
    handler: "handleExternalOpportunityAgentIntakeDiscoveryV1";
    etag: typeof VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1;
    response_body_sha256: string;
  };
  response_mapping: {
    status: "status";
    headers: "setHeader";
    body: "send_or_end";
    empty_body: "end";
  };
  behavior: {
    get: true;
    head: true;
    conditional_304: true;
    unsupported_method_405: true;
    noncanonical_path_404: true;
    structural_application_interface: true;
    express_import: false;
    production_mount: false;
    runtime_host_mutation: false;
    index_mutation: false;
    network_listener: false;
    outbound_network_request: false;
    deployment: false;
  };
}

export interface ExternalOpportunityAgentIntakeRuntimeAdapterValidationV1 {
  ok: boolean;
  errors: string[];
}

function requestPathV1(
  request: ExternalOpportunityAgentIntakeRuntimeAdapterRequestV1,
): string {
  if (typeof request.path === "string") {
    return request.path;
  }

  const rawUrl =
    typeof request.originalUrl === "string"
      ? request.originalUrl
      : typeof request.url === "string"
        ? request.url
        : "";

  const queryIndex = rawUrl.indexOf("?");
  return queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
}

function discoveryRequestV1(
  request: ExternalOpportunityAgentIntakeRuntimeAdapterRequestV1,
): ExternalOpportunityAgentIntakeDiscoveryRequestV1 {
  return {
    method: typeof request.method === "string" ? request.method : "",
    path: requestPathV1(request),
    headers: request.headers,
  };
}

function applyDiscoveryResponseV1(
  target: ExternalOpportunityAgentIntakeRuntimeAdapterResponseV1,
  source: ExternalOpportunityAgentIntakeDiscoveryResponseV1,
): unknown {
  for (const [name, value] of Object.entries(source.headers)) {
    target.setHeader(name, value);
  }

  const statusTarget = target.status(source.status);
  if (source.body.length === 0) {
    return statusTarget.end();
  }

  if (typeof statusTarget.send === "function") {
    return statusTarget.send(source.body);
  }

  return statusTarget.end(source.body);
}

export function createExternalOpportunityAgentIntakeRuntimeAdapterContractV1():
  ExternalOpportunityAgentIntakeRuntimeAdapterContractV1 {
  const discoveryContract =
    createExternalOpportunityAgentIntakeDiscoveryContractV1();

  return {
    schema:
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_V1,
    version: 1,
    registration: {
      path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
      method:
        VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_REGISTRATION_V1,
      registration_count_per_mount: 1,
      exact_path_only: true,
    },
    handler_binding: {
      marker:
        VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_V1,
      handler: "handleExternalOpportunityAgentIntakeDiscoveryV1",
      etag: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
      response_body_sha256:
        discoveryContract.capability_binding.response_body_sha256,
    },
    response_mapping: {
      status: "status",
      headers: "setHeader",
      body: "send_or_end",
      empty_body: "end",
    },
    behavior: {
      get: true,
      head: true,
      conditional_304: true,
      unsupported_method_405: true,
      noncanonical_path_404: true,
      structural_application_interface: true,
      express_import: false,
      production_mount: false,
      runtime_host_mutation: false,
      index_mutation: false,
      network_listener: false,
      outbound_network_request: false,
      deployment: false,
    },
  };
}

export function validateExternalOpportunityAgentIntakeRuntimeAdapterContractV1(
  value: unknown,
): ExternalOpportunityAgentIntakeRuntimeAdapterValidationV1 {
  const errors: string[] = [];

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, errors: ["contract must be an object"] };
  }

  const expected = createExternalOpportunityAgentIntakeRuntimeAdapterContractV1();
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    errors.push("contract must match the deterministic V1 runtime adapter");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function createExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1():
  ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1 {
  return (request, response) =>
    applyDiscoveryResponseV1(
      response,
      handleExternalOpportunityAgentIntakeDiscoveryV1(
        discoveryRequestV1(request),
      ),
    );
}

export function mountExternalOpportunityAgentIntakeRuntimeAdapterV1(
  application: ExternalOpportunityAgentIntakeRuntimeAdapterApplicationV1,
): ExternalOpportunityAgentIntakeRuntimeAdapterContractV1 {
  const handler = createExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1();
  application.all(
    VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
    handler,
  );
  return createExternalOpportunityAgentIntakeRuntimeAdapterContractV1();
}
