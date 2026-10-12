#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_AI_AGENT_CAPABILITY_NEGOTIATION_PROOF_V1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const discoveryPath = path.join(
  root,
  "public/public-node/agents/discovery-v1.json",
);
const catalogPath = path.join(
  root,
  "public/public-node/agents/capabilities-v1.json",
);
const catalogSchemaPath = path.join(
  root,
  "public/public-node/agents/capabilities-v1.schema.json",
);
const wellKnownPath = path.join(
  root,
  "public/.well-known/void-agent-capabilities.json",
);
const wellKnownSchemaPath = path.join(
  root,
  "public/.well-known/void-agent-capabilities.schema.json",
);
const clientPath = path.join(
  root,
  "tools/void-ai-agent-capability-client-v1.mjs",
);
const gatewayPath = path.join(
  root,
  "ops/void-ai-agent-public-gateway-v1.mjs",
);
const gatewayProofPath = path.join(
  root,
  "scripts/prove_void_ai_agent_public_gateway_v1.mjs",
);
const gatewayDocPath = path.join(
  root,
  "docs/public/ai-agent-public-ingress-isolated-gateway-v1.md",
);
const negotiationDocPath = path.join(
  root,
  "docs/public/ai-agent-capability-negotiation-v1.md",
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const [
  discovery,
  catalog,
  catalogSchema,
  wellKnown,
  wellKnownSchema,
  client,
  gateway,
  gatewayProof,
  gatewayDoc,
  negotiationDoc,
] = await Promise.all([
  readFile(discoveryPath, "utf8").then(JSON.parse),
  readFile(catalogPath, "utf8").then(JSON.parse),
  readFile(catalogSchemaPath, "utf8").then(JSON.parse),
  readFile(wellKnownPath, "utf8").then(JSON.parse),
  readFile(wellKnownSchemaPath, "utf8").then(JSON.parse),
  readFile(clientPath, "utf8"),
  readFile(gatewayPath, "utf8"),
  readFile(gatewayProofPath, "utf8"),
  readFile(gatewayDocPath, "utf8"),
  readFile(negotiationDocPath, "utf8"),
]);

assert(
  discovery.entrypoints?.capability_negotiation ===
    "/public-node/agents/capabilities-v1.json",
  "canonical discovery lacks capability-negotiation entrypoint",
);

const advertisedCapability = discovery.capabilities?.find(
  (entry) => entry?.id === "capability_negotiation",
);
assert(advertisedCapability, "discovery capability entry is missing");
assert(
  advertisedCapability.state === "live",
  "discovery capability is not live",
);
assert(
  advertisedCapability.authority === "read_only",
  "discovery capability is not read-only",
);
assert(
  advertisedCapability.discovery ===
    discovery.entrypoints.capability_negotiation,
  "discovery capability path differs",
);

const onboardingStep = discovery.agent_onboarding?.steps?.find(
  (step) =>
    step?.action === "fetch" &&
    step?.path === "/public-node/agents/capabilities-v1.json",
);
assert(onboardingStep, "capability onboarding step is missing");
assert(onboardingStep.method === "GET", "onboarding method is not GET");
assert(onboardingStep.required === true, "onboarding step is not required");

assert(
  catalog.marker === "VOID_AI_AGENT_CAPABILITY_NEGOTIATION_V1",
  "catalog marker differs",
);
assert(
  catalog.protocol === "void-agent-capability-negotiation/1",
  "catalog protocol differs",
);
assert(catalog.network?.chain_id === 2050, "catalog chain ID differs");
assert(
  catalog.negotiation?.mode === "client_side_intersection",
  "negotiation mode differs",
);
assert(
  catalog.negotiation?.request_submission_enabled === false,
  "request submission must remain disabled",
);
assert(
  catalog.negotiation?.server_round_trip_required === false,
  "server round trip must remain false",
);
assert(
  catalog.negotiation?.default_result === "not_granted",
  "negotiation default differs",
);
assert(
  JSON.stringify(catalog.negotiation?.result_states) ===
    JSON.stringify(["granted", "not_granted"]),
  "result states differ",
);

assert(
  catalog.authority?.authentication_contract_published === true,
  "authentication contract publication differs",
);

for (const [name, expected] of Object.entries({
  mutation_authority_granted: false,
  authentication_active: false,
  signed_request_envelopes_active: false,
  payment_submission_active: false,
  work_credit_awards_active: false,
  buy_void_automatic_fulfillment_active: false,
})) {
  assert(
    catalog.authority?.[name] === expected,
    `${name} must remain false`,
  );
}

const byId = new Map(
  catalog.capabilities.map((entry) => [entry.id, entry]),
);
assert(
  byId.size === catalog.capabilities.length,
  "capability IDs are not unique",
);

for (const id of [
  "public_discovery",
  "capability_negotiation",
  "authentication_contract_discovery",
]) {
  const entry = byId.get(id);
  assert(entry, `missing live capability ${id}`);
  assert(entry.state === "live", `${id} state differs`);
  assert(entry.enabled === true, `${id} enabled differs`);
  assert(entry.access === "anonymous", `${id} access differs`);
  assert(entry.authority === "read_only", `${id} authority differs`);
  assert(
    entry.http_methods.every(
      (method) => method === "GET" || method === "HEAD",
    ),
    `${id} has an unsafe method`,
  );
  assert(entry.paths.length > 0, `${id} paths are empty`);
}

for (const id of [
  "public_readonly_network_data",
  "authenticated_readonly_agent_session",
  "bounded_paid_work_submission",
  "work_credit_earning",
  "buy_void_automatic_fulfillment",
  "validator_activation",
  "wallet_treasury_or_ledger_mutation",
]) {
  const entry = byId.get(id);
  assert(entry, `missing denied capability ${id}`);
  assert(entry.enabled === false, `${id} must be disabled`);
  assert(entry.authority !== "read_only", `${id} must not be read-only`);
  assert(entry.http_methods.length === 0, `${id} methods must be empty`);
  assert(entry.paths.length === 0, `${id} paths must be empty`);
}

assert(catalog.safety?.same_origin_only === true, "same-origin wall missing");
assert(catalog.safety?.follow_redirects === false, "redirect wall missing");
assert(catalog.safety?.send_credentials === false, "credentials must not send");
assert(catalog.safety?.send_secrets === false, "secrets must not send");
assert(
  catalog.safety?.unknown_capability_result === "not_granted",
  "unknown default differs",
);
assert(
  catalog.safety?.ambiguous_capability_result === "not_granted",
  "ambiguous default differs",
);

assert(
  catalogSchema.properties?.marker?.const === catalog.marker,
  "catalog schema marker differs",
);
assert(
  catalogSchema.properties?.protocol?.const === catalog.protocol,
  "catalog schema protocol differs",
);
assert(
  catalogSchema.properties?.authority?.properties
    ?.mutation_authority_granted?.const === false,
  "catalog schema mutation wall differs",
);
assert(
  catalogSchema.properties?.negotiation?.properties
    ?.request_submission_enabled?.const === false,
  "catalog schema request-submission wall differs",
);

assert(
  wellKnown.marker === "VOID_AI_AGENT_CAPABILITY_WELL_KNOWN_V1",
  "well-known capability marker differs",
);
assert(
  wellKnown.protocol === "void-agent-capability-well-known/1",
  "well-known capability protocol differs",
);
assert(
  wellKnown.canonical_capabilities ===
    "/public-node/agents/capabilities-v1.json",
  "well-known canonical pointer differs",
);
assert(
  wellKnown.authority?.mutation_authority_granted === false,
  "well-known mutation authority differs",
);
assert(
  wellKnown.authority?.credentials_required === false,
  "well-known credentials requirement differs",
);
assert(
  wellKnownSchema.$id ===
    "https://voidchain.org/.well-known/void-agent-capabilities.schema.json",
  "well-known capability schema canonical ID differs",
);
assert(
  wellKnownSchema.$id !==
    "https://voidchain.io/.well-known/void-agent-capabilities.schema.json",
  "retired well-known capability schema ID accepted",
);
assert(
  wellKnownSchema.properties?.marker?.const === wellKnown.marker,
  "well-known schema marker differs",
);

for (const route of [
  "/public-node/agents/capabilities-v1.json",
  "/public-node/agents/capabilities-v1.schema.json",
  "/.well-known/void-agent-capabilities.json",
  "/.well-known/void-agent-capabilities.schema.json",
  "/public-node/agents/authentication-v1.json",
  "/public-node/agents/authentication-v1.schema.json",
  "/.well-known/void-agent-authentication.json",
  "/.well-known/void-agent-authentication.schema.json",
]) {
  assert(gateway.includes(`"${route}"`), `gateway lacks ${route}`);
  assert(gatewayProof.includes(`"${route}"`), `gateway proof lacks ${route}`);
}

for (const forbidden of [
  /method:\s*"POST"/,
  /method:\s*"PUT"/,
  /method:\s*"PATCH"/,
  /method:\s*"DELETE"/,
  /authorization/i,
  /cookie/i,
  /credentials:\s*"include"/,
  /seed[_ -]?phrase/i,
]) {
  assert(
    forbidden.test(client) === false,
    `client contains forbidden pattern ${forbidden}`,
  );
}

for (const required of [
  "client_side_intersection",
  "sameOriginPath",
  'method: "GET"',
  'redirect: "error"',
  "unknown_capability",
  "advertised_requirements_not_satisfied",
  "capability_mutation_authority_claim_rejected",
  "work_credit_awards_must_be_inactive",
  "buy_void_fulfillment_must_be_inactive",
]) {
  assert(client.includes(required), `client lacks ${required}`);
}

for (const required of [
  "fourteen repository-backed JSON",
  "/public-node/agents/capabilities-v1.json",
  "/.well-known/void-agent-capabilities.json",
  "/public-node/agents/authentication-v1.json",
  "/.well-known/void-agent-authentication.json",
  "no authentication verifier runtime",
  "no payment or paid-work submission",
]) {
  assert(gatewayDoc.includes(required), `gateway doc lacks ${required}`);
}

for (const required of [
  "client-side intersection",
  "`not_granted`",
  "authentication_contract_discovery",
  "authenticated_readonly_agent_session",
  "automatic Work Credit awards",
  "Buy VOID automatic fulfillment",
  "AI-agent read-only verifier runtime v1",
]) {
  assert(
    negotiationDoc.includes(required),
    `negotiation doc lacks ${required}`,
  );
}

const child = spawn(process.execPath, [gatewayPath], {
  cwd: root,
  env: {
    ...process.env,
    VOID_REPO_ROOT: root,
    VOID_AI_AGENT_PUBLIC_GATEWAY_HOST: "127.0.0.1",
    VOID_AI_AGENT_PUBLIC_GATEWAY_PORT: "0",
    VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_MODE: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stopped = false;

async function stopChild() {
  if (stopped) return;
  stopped = true;
  if (child.exitCode !== null) return;

  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
      resolve();
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function waitForReady() {
  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      reject(
        new Error(
          `gateway startup timeout stdout=${stdout} stderr=${stderr}`,
        ),
      );
    }, 10_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim().startsWith("{")) continue;
        try {
          const value = JSON.parse(line);
          if (
            value.marker === "VOID_AI_AGENT_PUBLIC_GATEWAY_V1" &&
            value.ready === true
          ) {
            clearTimeout(timer);
            resolve(value);
            return;
          }
        } catch {
          // Continue collecting output.
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      reject(
        new Error(
          `gateway exited before ready code=${code} signal=${signal} ` +
            `stdout=${stdout} stderr=${stderr}`,
        ),
      );
    });
  });
}

async function runClient(port) {
  return await new Promise((resolve, reject) => {
    const clientChild = spawn(
      process.execPath,
      [
        clientPath,
        "--base",
        `http://127.0.0.1:${port}`,
        "--want",
        [
          "public_discovery",
          "capability_negotiation",
          "authentication_contract_discovery",
          "bounded_paid_work_submission",
          "work_credit_earning",
          "unknown_future_capability",
        ].join(","),
      ],
      {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      clientChild.kill("SIGKILL");
      reject(new Error("capability client timeout"));
    }, 15_000);

    clientChild.stdout.setEncoding("utf8");
    clientChild.stderr.setEncoding("utf8");
    clientChild.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    clientChild.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    clientChild.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `client failed code=${code} signal=${signal} ` +
              `stdout=${stdout} stderr=${stderr}`,
          ),
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(
          new Error(
            `client output is not JSON: ${String(error)} stdout=${stdout}`,
          ),
        );
      }
    });
  });
}

try {
  const ready = await waitForReady();
  assert(
    ready.allowed_routes.length === 14,
    "gateway allowed-route count differs",
  );

  const result = await runClient(ready.port);
  assert(result.ok === true, "client did not return ok=true");
  assert(
    result.negotiation?.mode === "client_side_intersection",
    "client negotiation mode differs",
  );
  assert(
    result.negotiation?.request_submission_enabled === false,
    "client request submission differs",
  );

  assert(
    JSON.stringify(result.granted.map((entry) => entry.id).sort()) ===
      JSON.stringify(
        [
          "authentication_contract_discovery",
          "capability_negotiation",
          "public_discovery",
        ].sort(),
      ),
    "client granted set differs",
  );

  const deniedById = new Map(
    result.not_granted.map((entry) => [entry.id, entry]),
  );
  assert(
    deniedById.get("bounded_paid_work_submission")?.reason ===
      "advertised_requirements_not_satisfied",
    "paid work denial differs",
  );
  assert(
    deniedById.get("work_credit_earning")?.reason ===
      "advertised_requirements_not_satisfied",
    "Work Credit denial differs",
  );
  assert(
    deniedById.get("unknown_future_capability")?.reason ===
      "unknown_capability",
    "unknown capability denial differs",
  );

  process.stdout.write(
    `${MARKER}\n` +
      `gateway_route_count=14\n` +
      `catalog_capability_count=${catalog.capabilities.length}\n` +
      `granted_count=${result.granted.length}\n` +
      `not_granted_count=${result.not_granted.length}\n` +
      `negotiation_mode=client_side_intersection\n` +
      `request_submission_enabled=0\n` +
      `authentication_active=0\n` +
      `mutation_authority=0\n` +
      `paid_work_submission=0\n` +
      `work_credit_awards=0\n` +
      `buy_void_automatic_fulfillment=0\n` +
      `verdict=AI_AGENT_CAPABILITY_NEGOTIATION_LOCAL_EXACT_GREEN\n` +
      `${MARKER}_COMPLETE\n`,
  );
} finally {
  await stopChild();
}
