#!/usr/bin/env node
import {
  createHash,
  createPublicKey,
  verify,
} from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_AI_AGENT_AUTHENTICATION_CONTRACT_PROOF_V1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const files = {
  discovery:
    "public/public-node/agents/discovery-v1.json",
  catalog:
    "public/public-node/agents/capabilities-v1.json",
  catalogSchema:
    "public/public-node/agents/capabilities-v1.schema.json",
  auth:
    "public/public-node/agents/authentication-v1.json",
  authSchema:
    "public/public-node/agents/authentication-v1.schema.json",
  wellKnown:
    "public/.well-known/void-agent-authentication.json",
  wellKnownSchema:
    "public/.well-known/void-agent-authentication.schema.json",
  gateway:
    "ops/void-ai-agent-public-gateway-v1.mjs",
  gatewayProof:
    "scripts/prove_void_ai_agent_public_gateway_v1.mjs",
  capabilityClient:
    "tools/void-ai-agent-capability-client-v1.mjs",
  envelopeTool:
    "tools/void-ai-agent-auth-envelope-v1.mjs",
  authDoc:
    "docs/public/ai-agent-authentication-contract-v1.md",
  capabilityDoc:
    "docs/public/ai-agent-capability-negotiation-v1.md",
  gatewayDoc:
    "docs/public/ai-agent-public-ingress-isolated-gateway-v1.md",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(relative) {
  return JSON.parse(
    await readFile(path.join(root, relative), "utf8"),
  );
}

function canonicalize(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    assert(Number.isFinite(value), "non-finite canonical number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalize(value[key])}`,
      )
      .join(",")}}`;
  }
  throw new Error(`unsupported canonical type ${typeof value}`);
}

function runJson(relative, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(root, relative), ...args],
      {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`tool timeout ${relative}`));
    }, 20_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `${relative} failed code=${code} signal=${signal} ` +
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
            `${relative} output is not JSON: ${String(error)} ` +
              `stdout=${stdout}`,
          ),
        );
      }
    });
  });
}

const [
  discovery,
  catalog,
  catalogSchema,
  auth,
  authSchema,
  wellKnown,
  wellKnownSchema,
  gateway,
  gatewayProof,
  capabilityClient,
  envelopeTool,
  authDoc,
  capabilityDoc,
  gatewayDoc,
] = await Promise.all([
  readJson(files.discovery),
  readJson(files.catalog),
  readJson(files.catalogSchema),
  readJson(files.auth),
  readJson(files.authSchema),
  readJson(files.wellKnown),
  readJson(files.wellKnownSchema),
  readFile(path.join(root, files.gateway), "utf8"),
  readFile(path.join(root, files.gatewayProof), "utf8"),
  readFile(path.join(root, files.capabilityClient), "utf8"),
  readFile(path.join(root, files.envelopeTool), "utf8"),
  readFile(path.join(root, files.authDoc), "utf8"),
  readFile(path.join(root, files.capabilityDoc), "utf8"),
  readFile(path.join(root, files.gatewayDoc), "utf8"),
]);

assert(
  discovery.entrypoints?.authentication_contract ===
    "/public-node/agents/authentication-v1.json",
  "discovery authentication entrypoint differs",
);
const discoveryCapability = discovery.capabilities?.find(
  (entry) => entry?.id === "authentication_contract_discovery",
);
assert(discoveryCapability, "discovery auth capability missing");
assert(discoveryCapability.state === "live", "discovery auth state differs");
assert(
  discoveryCapability.authority === "read_only",
  "discovery auth authority differs",
);
assert(
  discoveryCapability.discovery ===
    discovery.entrypoints.authentication_contract,
  "discovery auth path differs",
);
const authStep = discovery.agent_onboarding?.steps?.find(
  (step) =>
    step?.action === "fetch" &&
    step?.path === "/public-node/agents/authentication-v1.json",
);
assert(authStep, "authentication onboarding step missing");
assert(authStep.method === "GET", "authentication onboarding method differs");
assert(authStep.required === true, "authentication onboarding not required");

assert(
  catalog.authority?.authentication_contract_published === true,
  "catalog authentication publication differs",
);
for (const key of [
  "authentication_active",
  "signed_request_envelopes_active",
  "payment_submission_active",
  "work_credit_awards_active",
  "buy_void_automatic_fulfillment_active",
  "mutation_authority_granted",
]) {
  assert(catalog.authority?.[key] === false, `${key} must remain false`);
}
assert(
  catalog.next_contract?.authentication_contract ===
    "/public-node/agents/authentication-v1.json",
  "catalog next-contract path differs",
);
assert(
  catalog.next_contract?.verifier_runtime_active === false,
  "catalog verifier runtime must remain false",
);
assert(
  catalog.next_contract?.authenticated_routes_active === false,
  "catalog authenticated routes must remain false",
);

const byId = new Map(
  catalog.capabilities.map((entry) => [entry.id, entry]),
);
const authDiscovery = byId.get("authentication_contract_discovery");
assert(authDiscovery, "catalog auth discovery missing");
assert(authDiscovery.state === "live", "auth discovery state differs");
assert(authDiscovery.enabled === true, "auth discovery not enabled");
assert(authDiscovery.access === "anonymous", "auth discovery access differs");
assert(
  authDiscovery.authority === "read_only",
  "auth discovery authority differs",
);
assert(
  JSON.stringify(authDiscovery.http_methods) ===
    JSON.stringify(["GET", "HEAD"]),
  "auth discovery methods differ",
);
assert(authDiscovery.paths.length === 4, "auth discovery path count differs");

const authSession = byId.get("authenticated_readonly_agent_session");
assert(authSession, "authenticated session capability missing");
assert(authSession.enabled === false, "authenticated session must be disabled");
assert(
  authSession.authority === "not_granted",
  "authenticated session authority differs",
);
assert(authSession.paths.length === 0, "authenticated session paths not empty");

assert(
  catalogSchema.properties?.authority?.properties
    ?.authentication_contract_published?.const === true,
  "catalog schema authentication publication differs",
);
assert(
  catalogSchema.properties?.next_contract?.properties
    ?.verifier_runtime_active?.const === false,
  "catalog schema verifier runtime differs",
);
assert(
  catalogSchema.properties?.capabilities?.minItems === 10,
  "catalog schema capability minimum differs",
);

assert(
  auth.marker === "VOID_AI_AGENT_AUTHENTICATION_CONTRACT_V1",
  "auth marker differs",
);
assert(
  auth.protocol === "void-agent-authentication/1",
  "auth protocol differs",
);
assert(auth.network?.chain_id === 2050, "auth chain ID differs");
assert(auth.publication?.contract_published === true, "auth not published");
for (const key of [
  "verifier_runtime_active",
  "session_issuance_active",
  "authenticated_routes_active",
  "request_submission_active",
]) {
  assert(auth.publication?.[key] === false, `publication ${key} not false`);
}
assert(auth.identity?.key_type === "OKP", "identity key type differs");
assert(auth.identity?.curve === "Ed25519", "identity curve differs");
assert(
  auth.identity?.private_key_transmission === "forbidden",
  "private-key transmission boundary differs",
);
assert(
  auth.canonicalization?.name === "void-canonical-json/1",
  "canonicalization differs",
);
assert(
  auth.signed_request_envelope?.signature_algorithm === "Ed25519",
  "signature algorithm differs",
);
assert(
  JSON.stringify(
    auth.signed_request_envelope?.constraints?.methods,
  ) === JSON.stringify(["GET", "HEAD"]),
  "envelope methods differ",
);
assert(
  auth.signed_request_envelope?.constraints?.maximum_ttl_seconds === 60,
  "maximum TTL differs",
);
assert(
  auth.signed_request_envelope?.constraints?.minimum_nonce_bytes === 16,
  "minimum nonce differs",
);
for (const key of [
  "send_signed_envelopes_now",
  "authorization_header_active",
  "session_endpoint_active",
  "challenge_endpoint_active",
  "protected_read_routes_active",
  "mutation_authority_granted",
  "payment_submission_active",
  "work_credit_awards_active",
  "buy_void_automatic_fulfillment_active",
]) {
  assert(
    auth.current_runtime_boundary?.[key] === false,
    `runtime boundary ${key} must remain false`,
  );
}
assert(
  auth.reference_tool?.private_key_output === false,
  "reference tool private-key boundary differs",
);

assert(
  authSchema.properties?.marker?.const === auth.marker,
  "auth schema marker differs",
);
assert(
  authSchema.properties?.publication?.properties
    ?.verifier_runtime_active?.const === false,
  "auth schema verifier wall differs",
);
assert(
  authSchema.properties?.current_runtime_boundary?.properties
    ?.mutation_authority_granted?.const === false,
  "auth schema mutation wall differs",
);

assert(
  wellKnown.marker === "VOID_AI_AGENT_AUTHENTICATION_WELL_KNOWN_V1",
  "well-known auth marker differs",
);
assert(
  wellKnown.canonical_authentication_contract ===
    "/public-node/agents/authentication-v1.json",
  "well-known auth pointer differs",
);
assert(wellKnown.contract_published === true, "well-known contract not live");
assert(
  wellKnown.verifier_runtime_active === false,
  "well-known verifier runtime differs",
);
assert(
  wellKnown.authenticated_routes_active === false,
  "well-known authenticated routes differ",
);
assert(
  wellKnown.mutation_authority_granted === false,
  "well-known mutation wall differs",
);
assert(
  wellKnownSchema.properties?.marker?.const === wellKnown.marker,
  "well-known auth schema marker differs",
);

for (const route of [
  "/public-node/agents/authentication-v1.json",
  "/public-node/agents/authentication-v1.schema.json",
  "/.well-known/void-agent-authentication.json",
  "/.well-known/void-agent-authentication.schema.json",
]) {
  assert(gateway.includes(`"${route}"`), `gateway lacks ${route}`);
  assert(gatewayProof.includes(`"${route}"`), `gateway proof lacks ${route}`);
}

for (const required of [
  "generateKeyPairSync",
  '"ed25519"',
  "void-canonical-json/1",
  "VOID_AI_AGENT_SIGNED_READONLY_REQUEST_V1",
  "private_key_emitted: false",
  "verifier_runtime_active: false",
  "send_signed_envelopes_now: false",
]) {
  assert(envelopeTool.includes(required), `envelope tool lacks ${required}`);
}
for (const forbidden of [
  /private_key\s*:/i,
  /privateKey\.export/,
  /writeFile/,
  /method:\s*"POST"/,
  /authorization/i,
  /cookie/i,
]) {
  assert(
    forbidden.test(envelopeTool) === false,
    `envelope tool contains forbidden pattern ${forbidden}`,
  );
}
assert(
  !capabilityClient.match(/method:\s*"POST"/),
  "capability client contains POST",
);

for (const [document, required] of [
  [authDoc, "verifier_runtime_active"],
  [authDoc, "private key is never emitted"],
  [authDoc, "AI-agent read-only verifier runtime v1"],
  [capabilityDoc, "authentication_contract_discovery"],
  [capabilityDoc, "authenticated_readonly_agent_session"],
  [gatewayDoc, "twelve repository-backed JSON documents"],
  [gatewayDoc, "no authentication verifier runtime"],
]) {
  assert(document.includes(required), `documentation lacks ${required}`);
}

const demo = await runJson(files.envelopeTool, [
  "demo",
  "--path",
  "/public-node/agents/capabilities-v1.json",
  "--capability",
  "capability_negotiation",
  "--ttl-seconds",
  "60",
]);

assert(demo.ok === true, "envelope demo did not return ok");
assert(demo.marker === "VOID_AI_AGENT_AUTH_ENVELOPE_TOOL_V1", "tool marker");
assert(demo.signature_algorithm === "Ed25519", "demo algorithm differs");
assert(demo.verified === true, "demo signature not verified");
assert(demo.private_key_emitted === false, "demo emitted private key");
assert(demo.verifier_runtime_active === false, "demo verifier runtime differs");
assert(
  demo.authenticated_routes_active === false,
  "demo authenticated routes differs",
);
assert(
  demo.send_signed_envelopes_now === false,
  "demo send-now boundary differs",
);
assert(
  demo.envelope.marker === "VOID_AI_AGENT_SIGNED_READONLY_REQUEST_V1",
  "demo envelope marker differs",
);
assert(demo.envelope.method === "GET", "demo method differs");
assert(demo.envelope.query === "", "demo query differs");
assert(
  demo.envelope.body_sha256 ===
    "e3b0c44298fc1c149afbf4c8996fb924" +
      "27ae41e4649b934ca495991b7852b855",
  "demo body hash differs",
);
const demoSerialized = JSON.stringify(demo);
assert(
  !demoSerialized.includes('\"private_key\"') &&
    !demoSerialized.includes('\"privateKey\"') &&
    !demoSerialized.includes('\"seed\"') &&
    !demoSerialized.includes('\"secret\"'),
  "demo output contains a private-material field",
);
assert(
  demo.public_key_jwk?.d === undefined &&
    demo.envelope?.public_key_jwk?.d === undefined,
  "demo output contains a private JWK component",
);

const canonicalEnvelope = canonicalize(demo.envelope);
assert(
  createHash("sha256").update(canonicalEnvelope).digest("hex") ===
    demo.canonical_envelope_sha256,
  "demo canonical envelope hash differs",
);
const publicKey = createPublicKey({
  key: demo.public_key_jwk,
  format: "jwk",
});
assert(
  verify(
    null,
    Buffer.from(canonicalEnvelope, "utf8"),
    publicKey,
    Buffer.from(demo.signature, "base64url"),
  ),
  "independent signature verification failed",
);

const capabilityResult = await runJson(files.capabilityClient, [
  "--base",
  "http://127.0.0.1:1",
  "--want",
  "public_discovery",
]).catch(() => null);
assert(
  capabilityResult === null,
  "capability client unexpectedly succeeded without a gateway",
);

process.stdout.write(
  `${MARKER}\n` +
    `gateway_route_count=12\n` +
    `catalog_capability_count=${catalog.capabilities.length}\n` +
    `authentication_contract_published=1\n` +
    `authentication_contract_discovery=live\n` +
    `authenticated_readonly_agent_session=not_granted\n` +
    `signature_algorithm=Ed25519\n` +
    `canonicalization=void-canonical-json/1\n` +
    `ephemeral_signature_verified=1\n` +
    `private_key_emitted=0\n` +
    `verifier_runtime_active=0\n` +
    `session_issuance_active=0\n` +
    `authenticated_routes_active=0\n` +
    `request_submission_active=0\n` +
    `mutation_authority=0\n` +
    `paid_work_submission=0\n` +
    `work_credit_awards=0\n` +
    `buy_void_automatic_fulfillment=0\n` +
    `verdict=AI_AGENT_AUTHENTICATION_CONTRACT_LOCAL_EXACT_GREEN\n` +
    `${MARKER}_COMPLETE\n`,
);
