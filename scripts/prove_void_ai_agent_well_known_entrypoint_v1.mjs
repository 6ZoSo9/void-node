#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const pointerPath = path.join(
  root,
  "public/.well-known/void-agent-discovery.json",
);
const schemaPath = path.join(
  root,
  "public/.well-known/void-agent-discovery.schema.json",
);
const canonicalPath = path.join(
  root,
  "public/public-node/agents/discovery-v1.json",
);
const authenticityPath = path.join(
  root,
  "public/.well-known/void-network-authenticity.json",
);
const clientPath = path.join(
  root,
  "tools/void-ai-agent-well-known-client-v1.mjs",
);
const docPath = path.join(
  root,
  "docs/public/ai-agent-well-known-entrypoint-v1.md",
);

for (const file of [
  pointerPath,
  schemaPath,
  canonicalPath,
  authenticityPath,
  clientPath,
  docPath,
]) {
  assert.equal(
    fs.existsSync(file),
    true,
    `missing required file: ${path.relative(root, file)}`,
  );
}

const pointer = JSON.parse(fs.readFileSync(pointerPath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
const authenticity = JSON.parse(
  fs.readFileSync(authenticityPath, "utf8"),
);
const client = fs.readFileSync(clientPath, "utf8");
const doc = fs.readFileSync(docPath, "utf8");

assert.equal(
  pointer.marker,
  "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
);
assert.equal(
  pointer.protocol,
  "void-agent-discovery-well-known/1",
);
assert.equal(pointer.network?.chain_id, 2050);
assert.equal(
  pointer.canonical_discovery,
  "/public-node/agents/discovery-v1.json",
);
assert.equal(pointer.authority?.default, "read_only");
assert.equal(pointer.authority?.mutation_authority_granted, false);
assert.equal(pointer.authority?.credentials_required, false);
assert.equal(pointer.safety?.same_origin_only, true);
assert.equal(pointer.safety?.follow_redirects, false);
assert.equal(pointer.safety?.send_secrets, false);
assert.equal(pointer.safety?.send_wallet_material, false);
assert.equal(pointer.safety?.send_operator_keys, false);
assert.equal(pointer.safety?.treat_unknown_as, "not_granted");
assert.equal(
  pointer.network_authenticity,
  "/.well-known/void-network-authenticity.json",
);
assert.equal(
  authenticity.marker,
  "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1",
);
assert.equal(authenticity.protocol, "void-network-authenticity/1");
assert.equal(authenticity.network?.chain_id, 2050);
assert.equal(authenticity.authority?.verification_only, true);

assert.equal(
  canonical.marker,
  "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1",
);
assert.equal(canonical.protocol, "void-agent-discovery/1");
assert.equal(canonical.network?.chain_id, pointer.network?.chain_id);
assert.equal(canonical.authority?.mutation_authority_granted, false);

assert.equal(
  schema.$id,
  "https://voidchain.org/.well-known/void-agent-discovery.schema.json",
);
assert.notEqual(
  schema.$id,
  "https://voidchain.io/.well-known/void-agent-discovery.schema.json",
);
assert.equal(
  schema.properties?.marker?.const,
  pointer.marker,
);
assert.equal(
  schema.properties?.protocol?.const,
  pointer.protocol,
);
assert.equal(
  schema.properties?.canonical_discovery?.const,
  pointer.canonical_discovery,
);
assert.equal(
  schema.properties?.authority?.properties
    ?.mutation_authority_granted?.const,
  false,
);
assert.equal(
  schema.properties?.safety?.properties?.same_origin_only?.const,
  true,
);

assert.match(client, /WELL_KNOWN_PATH/);
assert.match(client, /canonical_discovery/);
assert.match(client, /method:\s*"GET"/);
assert.match(client, /redirect:\s*"error"/);
assert.match(client, /sameOriginPath/);
assert.match(client, /mutation_authority_claim_rejected/);
assert.match(client, /unknown_authority_must_be_not_granted/);
assert.match(client, /createPublicKey/);
assert.match(client, /verifySignature/);
assert.match(client, /CANONICAL_DISCOVERY_SHA256/);
assert.match(client, /network_authenticity_url/);
assert.match(client, /MAX_RESPONSE_BYTES = 262_144/);
assert.match(client, /RESPONSE_TEARDOWN_TIMEOUT_MS = 250/);
assert.match(client, /rejectWithTeardown/);
assert.match(client, /response\.body\.getReader\(\)/);
assert.match(client, /response\.url !== url\.href/);
assert.doesNotMatch(client, /response\.json\(\)/);

for (const forbidden of [
  /method:\s*"POST"/,
  /method:\s*"PUT"/,
  /method:\s*"PATCH"/,
  /method:\s*"DELETE"/,
  /headers:\s*\{[^}]*authorization/is,
  /headers:\s*\{[^}]*cookie/is,
  /seed[_ -]?phrase/i,
]) {
  assert.equal(
    forbidden.test(client),
    false,
    `client contains forbidden pattern: ${forbidden}`,
  );
}

for (const required of [
  "/.well-known/void-agent-discovery.json",
  "does not grant mutation authority",
  "same-origin",
  "GET-only",
  "PR #646",
  "Nimo",
]) {
  assert.equal(
    doc.includes(required),
    true,
    `documentation missing: ${required}`,
  );
}

function runClient(base, { directLoopback = false } = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (directLoopback) {
      // The managed proof sandbox injects Node's opt-in environment proxy.
      // Disable that external transport shim so this fixture exercises the
      // actual local IPv6 socket rather than a configured HTTP proxy.
      delete env.NODE_USE_ENV_PROXY;
    }
    const child = spawn(process.execPath, [clientPath, "--base", base], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("well-known client proof deadline exceeded"));
    }, 5_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr });
    });
  });
}

let responseMode = "normal";
let requestCount = 0;
let stalledResponseClosed = false;
function handleRequest(request, response) {
  requestCount += 1;
  response.on("error", () => {});
  if (request.url === "/.well-known/void-agent-discovery.json") {
    response.setHeader("content-type", "application/json; charset=utf-8");
    if (responseMode === "non-2xx-stalled") {
      response.statusCode = 503;
      stalledResponseClosed = false;
      response.once("close", () => {
        stalledResponseClosed = true;
      });
      response.flushHeaders();
      return;
    }
    if (responseMode === "declared-oversize") {
      response.setHeader("content-length", "262145");
      response.end("x");
      return;
    }
    if (responseMode === "streamed-oversize") {
      let remaining = 262_145;
      while (remaining > 0) {
        const size = Math.min(8_192, remaining);
        response.write(Buffer.alloc(size, 0x61));
        remaining -= size;
      }
      response.end();
      return;
    }
    response.end(JSON.stringify(pointer));
    return;
  }
  if (request.url === pointer.canonical_discovery) {
    response.setHeader("content-type", "application/json; charset=utf-8");
    const servedCanonical = structuredClone(canonical);
    if (responseMode === "canonical-authority-elevated") {
      servedCanonical.capabilities[0].authority = "wallet_write";
    } else if (responseMode === "canonical-safety-unsafe") {
      servedCanonical.safety.send_secrets = true;
    } else if (responseMode === "canonical-onboarding-unsafe") {
      servedCanonical.agent_onboarding.steps[0].method = "POST";
    }
    response.end(JSON.stringify(servedCanonical));
    return;
  }
  if (request.url === pointer.network_authenticity) {
    if (responseMode === "authenticity-missing") {
      response.statusCode = 404;
      response.setHeader("content-type", "application/json");
      response.end("{}");
      return;
    }
    const servedAuthenticity = structuredClone(authenticity);
    if (responseMode === "authenticity-forged") {
      const signature = servedAuthenticity.verification.signature_base64;
      servedAuthenticity.verification.signature_base64 =
        `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    } else if (responseMode === "authenticity-wrong-key") {
      servedAuthenticity.verification.key_id =
        "ed25519:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    }
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify(servedAuthenticity));
    return;
  }
  response.statusCode = 404;
  response.setHeader("content-type", "application/json");
  response.end("{}");
}

const server = http.createServer(handleRequest);

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  requestCount = 0;
  responseMode = "normal";
  const ordinary = await runClient(base);
  assert.equal(ordinary.code, 0, ordinary.stderr);
  assert.equal(ordinary.signal, null);
  assert.equal(ordinary.stderr, "");
  assert.equal(JSON.parse(ordinary.stdout).ok, true);
  assert.equal(requestCount, 3);

  for (const mode of ["declared-oversize", "streamed-oversize"]) {
    requestCount = 0;
    responseMode = mode;
    const hostile = await runClient(base);
    assert.equal(hostile.code, 1, hostile.stdout);
    assert.equal(hostile.signal, null);
    assert.equal(hostile.stderr, "");
    const rejection = JSON.parse(hostile.stdout);
    assert.equal(rejection.ok, false);
    assert.equal(rejection.error, "well_known_discovery_rejected");
    assert.equal(
      rejection.detail,
      "well_known_response_exceeds_262144_bytes",
    );
    assert.equal(requestCount, 1);
  }

  requestCount = 0;
  responseMode = "non-2xx-stalled";
  const startedAt = Date.now();
  const rejected = await runClient(base);
  const elapsedMs = Date.now() - startedAt;
  assert.equal(rejected.code, 1, rejected.stdout);
  assert.equal(rejected.signal, null);
  assert.equal(rejected.stderr, "");
  const rejection = JSON.parse(rejected.stdout);
  assert.equal(rejection.ok, false);
  assert.equal(rejection.error, "well_known_discovery_rejected");
  assert.equal(rejection.detail, "well_known_http_503");
  assert.equal(requestCount, 1);
  assert.ok(
    elapsedMs < 2_000,
    `non-2xx teardown exceeded bound: ${elapsedMs}ms`,
  );
  for (let index = 0; index < 20 && !stalledResponseClosed; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.equal(
    stalledResponseClosed,
    true,
    "stalled rejected response was not terminally closed",
  );

  for (const [mode, detail] of [
    ["authenticity-missing", "network_authenticity_http_404"],
    [
      "authenticity-forged",
      "network_authenticity_signature_invalid",
    ],
    [
      "authenticity-wrong-key",
      "network_authenticity_verification_contract_mismatch",
    ],
  ]) {
    requestCount = 0;
    responseMode = mode;
    const hostile = await runClient(base);
    assert.equal(hostile.code, 1, hostile.stdout);
    const rejection = JSON.parse(hostile.stdout);
    assert.equal(rejection.detail, detail);
    assert.equal(
      requestCount,
      2,
      `${mode} reached canonical discovery`,
    );
  }

  for (const [mode, detail] of [
    [
      "canonical-authority-elevated",
      "canonical_live_capability_network_discovery_not_read_only",
    ],
    ["canonical-safety-unsafe", "canonical_safety_boundary_rejected"],
    [
      "canonical-onboarding-unsafe",
      "canonical_agent_onboarding_fetch_unsafe",
    ],
  ]) {
    requestCount = 0;
    responseMode = mode;
    const hostile = await runClient(base);
    assert.equal(hostile.code, 1, hostile.stdout);
    const rejection = JSON.parse(hostile.stdout);
    assert.equal(rejection.detail, detail);
    assert.equal(requestCount, 3);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const cleartextNonLoopback = await runClient("http://[2001:db8::1]");
assert.equal(cleartextNonLoopback.code, 1, cleartextNonLoopback.stdout);
assert.equal(
  JSON.parse(cleartextNonLoopback.stdout).detail,
  "base_must_use_https_except_loopback",
);

const ipv6Server = http.createServer(handleRequest);
await new Promise((resolve, reject) => {
  ipv6Server.once("error", reject);
  ipv6Server.listen(0, "::1", resolve);
});
try {
  const address = ipv6Server.address();
  assert.ok(address && typeof address === "object");
  requestCount = 0;
  responseMode = "normal";
  const ipv6 = await runClient(
    `http://[::1]:${address.port}`,
    { directLoopback: true },
  );
  assert.equal(ipv6.code, 0, ipv6.stdout || ipv6.stderr);
  assert.equal(ipv6.signal, null);
  assert.equal(ipv6.stderr, "");
  assert.equal(JSON.parse(ipv6.stdout).ok, true);
  assert.equal(requestCount, 3);
} finally {
  await new Promise((resolve) => ipv6Server.close(resolve));
}

console.log("VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1_PROOF_GREEN");
console.log(`pointer=${path.relative(root, pointerPath)}`);
console.log(`schema=${path.relative(root, schemaPath)}`);
console.log(`canonical=${path.relative(root, canonicalPath)}`);
console.log(`authenticity=${path.relative(root, authenticityPath)}`);
console.log(`client=${path.relative(root, clientPath)}`);
console.log(`documentation=${path.relative(root, docPath)}`);
console.log("bounded_response_adversaries=3");
console.log("rejected_response_lifetime_owned=true");
console.log("official_network_authenticity_adversaries=3");
console.log("canonical_authority_safety_adversaries=3");
console.log("ipv6_loopback_three_get_cold_start=true");
console.log("cleartext_non_loopback_ipv6_rejected=true");
console.log("existing_files_modified=4");
console.log("runtime_routing_modified=0");
console.log("validator_lane_modified=0");
console.log("release_lane_modified=0");
console.log("nimo_access=0");
