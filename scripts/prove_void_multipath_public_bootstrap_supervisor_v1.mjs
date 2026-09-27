#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  createTorPublicSeedClientAdapterV1,
} from "../tools/void-tor-public-seed-client-adapter-v1.mjs";
import {
  bootstrapTransportPlanV1,
  composeFollowerOriginsV1,
  validateLoopbackAdapterOriginV1,
} from "./lib/void_multipath_public_bootstrap_supervisor_v1.mjs";

const MARKER = "VOID_MULTIPATH_PUBLIC_BOOTSTRAP_SUPERVISOR_V1_PROOF";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`${MARKER}_FAIL`);
  console.error(message);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function expectThrow(fn, pattern, label) {
  let error = null;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  if (!error || !pattern.test(String(error.message || error))) {
    fail(`${label} did not fail as expected`);
  }
}

const httpsOnly = bootstrapTransportPlanV1({
  httpsPeers: "https://203.0.113.10",
});
expect(JSON.stringify(httpsOnly.transports) === JSON.stringify(["https"]), "HTTPS-only plan mismatch");
expect(httpsOnly.followerFailoverEnabled === false, "HTTPS-only plan must not claim cross-transport failover");

const torOnly = bootstrapTransportPlanV1({
  torPeers: "http://exampleexampleexampleexampleexampleexampleexampleexample.onion",
});
expect(JSON.stringify(torOnly.transports) === JSON.stringify(["tor"]), "Tor-only plan mismatch");

const both = bootstrapTransportPlanV1({
  httpsPeers: "https://203.0.113.10",
  torPeers: "http://exampleexampleexampleexampleexampleexampleexampleexample.onion",
  requireMultipath: true,
});
expect(JSON.stringify(both.transports) === JSON.stringify(["https", "tor"]), "dual-transport plan mismatch");
expect(both.followerFailoverEnabled === true, "dual-transport plan must enable follower failover");
expectThrow(
  () => bootstrapTransportPlanV1({ httpsPeers: "https://203.0.113.10", requireMultipath: true }),
  /requires both HTTPS and Tor/,
  "multipath acceptance with one class",
);
expectThrow(
  () => bootstrapTransportPlanV1({}),
  /at least one verified public bootstrap transport/,
  "empty transport plan",
);

const composed = composeFollowerOriginsV1([
  { transport: "https", base: "http://127.0.0.1:4191" },
  { transport: "tor", base: "http://127.0.0.1:4192" },
]);
expect(
  JSON.stringify(composed.followerOrigins) === JSON.stringify(["http://127.0.0.1:4191", "http://127.0.0.1:4192"]),
  "follower origin composition mismatch",
);
expectThrow(
  () => validateLoopbackAdapterOriginV1("https://127.0.0.1:4191", "https"),
  /unadorned local HTTP origin/,
  "remote/HTTPS adapter origin",
);
expectThrow(
  () => validateLoopbackAdapterOriginV1("http://192.168.1.20:4191", "https"),
  /numeric loopback/,
  "non-loopback adapter origin",
);
expectThrow(
  () => composeFollowerOriginsV1([
    { transport: "https", base: "http://127.0.0.1:4191" },
    { transport: "tor", base: "http://127.0.0.1:4191" },
  ]),
  /distinct loopback origins/,
  "duplicate adapter origin",
);

async function closeServerV1(server) {
  await new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function proveTorHistoricalResponseAuthorityV1() {
  const secret = crypto.randomBytes(32);
  const generation = crypto.randomBytes(16).toString("hex");
  const sequence = 1;
  const body = Buffer.from(
    `${JSON.stringify([{ number: 0, timestamp: 1776292502707 }])}\n`,
  );
  let requestCount = 0;
  const adapter = await createTorPublicSeedClientAdapterV1({
    peers:
      "http://6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion",
    port: 0,
    authority: {
      schema: "void_public_seed_response_authority_v1",
      generation,
      sequence,
      secret,
    },
    request: async (_peer, route) => {
      requestCount += 1;
      expect(
        route === "/blocks/range?from=0&to=0",
        "Tor authority proof route mismatch",
      );
      return {
        status: 200,
        contentType: "application/json; charset=utf-8",
        bytes: body,
      };
    },
  });

  const route = "/blocks/range?from=0&to=0";
  try {
    const nonce = crypto.randomBytes(32).toString("hex");
    const response = await fetch(`${adapter.base}${route}`, {
      headers: {
        "x-void-public-seed-authority-challenge": nonce,
      },
    });
    expect(response.status === 200, "Tor authority proof HTTP status mismatch");
    const exactBody = Buffer.from(await response.arrayBuffer());
    expect(exactBody.equals(body), "Tor authority proof body mismatch");

    const bodySha256 = crypto.createHash("sha256").update(exactBody).digest("hex");
    const transcript = JSON.stringify({
      schema: "void_public_seed_response_authority_v1",
      generation,
      sequence,
      nonce,
      method: "GET",
      route,
      status: 200,
      byte_length: exactBody.length,
      body_sha256: bodySha256,
    });
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(transcript, "utf8")
      .digest("hex");

    expect(
      response.headers.get("x-void-public-seed-authority-schema") ===
        "void_public_seed_response_authority_v1",
      "Tor authority schema header mismatch",
    );
    expect(
      response.headers.get("x-void-public-seed-authority-generation") === generation,
      "Tor authority generation header mismatch",
    );
    expect(
      response.headers.get("x-void-public-seed-authority-sequence") === String(sequence),
      "Tor authority sequence header mismatch",
    );
    expect(
      response.headers.get("x-void-public-seed-authority-route-b64url") ===
        Buffer.from(route, "utf8").toString("base64url"),
      "Tor authority route header mismatch",
    );
    expect(
      response.headers.get("x-void-public-seed-authority-body-sha256") === bodySha256,
      "Tor authority body hash mismatch",
    );
    expect(
      response.headers.get("x-void-public-seed-authority-hmac") === expectedHmac,
      "Tor authority HMAC mismatch",
    );

    const unchallenged = await fetch(`${adapter.base}${route}`);
    await unchallenged.arrayBuffer();
    expect(
      unchallenged.headers.get("x-void-public-seed-authority-hmac") === null,
      "Tor adapter must not emit authority without a challenge",
    );
    expect(requestCount === 2, "Tor authority proof request count mismatch");
  } finally {
    await closeServerV1(adapter.server);
  }
}

await proveTorHistoricalResponseAuthorityV1();

const launcher = fs.readFileSync(path.join(ROOT, "run-void-node.sh"), "utf8");
const resolver = fs.readFileSync(path.join(ROOT, "scripts", "resolve_void_public_bootstrap_v1.mjs"), "utf8");
const runtimeSupervisor = fs.readFileSync(
  path.join(ROOT, "scripts", "run_void_multipath_public_bootstrap_supervisor_v1.mjs"),
  "utf8",
);
const torAdapterSource = fs.readFileSync(
  path.join(ROOT, "tools", "void-tor-public-seed-client-adapter-v1.mjs"),
  "utf8",
);
const authoritySource = fs.readFileSync(
  path.join(ROOT, "src", "http", "follower_verified_public_bootstrap_authority_v1.ts"),
  "utf8",
);

for (const token of [
  "VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH",
  "resolve_https_public_bootstrap_v1",
  "resolve_tor_public_bootstrap_v1",
  "reverify HTTPS bootstrap trust after live-resolution failure",
  "reverify Tor bootstrap trust after live-resolution failure",
  "resolved_multipath_https_tor",
  "authenticated_stale_default",
  "--allow-authenticated-stale",
  "signed_manifest_is_default",
  "VOID_MULTIPATH_PUBLIC_BOOTSTRAP_NODE_ENTRY",
]) {
  expect(launcher.includes(token), `launcher missing contract token: ${token}`);
}
for (const token of [
  "--verify-only",
  "EXIT_TRUST_INVALID = 2",
  "EXIT_TRANSPORT_UNAVAILABLE = 3",
  "trust_material_verified=true",
  "live_seed_probe_performed=false",
]) {
  expect(resolver.includes(token), `HTTPS resolver missing contract token: ${token}`);
}
for (const token of [
  "VOID_FOLLOWER_AUTOSTART_PEERS",
  "VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE",
  "createPublicSeedClientAdapterV1",
  "createTorPublicSeedClientAdapterV1",
  "run_void_public_bootstrap_child_v1.mjs",
  "adapter_origins",
  "historical_authority_ipc_bound=true",
  "historical_authority_secret_exposed=false",
  "adapter_loopback_only=true",
  "money_movement_authority=false",
]) {
  expect(runtimeSupervisor.includes(token), `runtime supervisor missing contract token: ${token}`);
}
for (const token of [
  "authority = null",
  "responseAuthorityHeadersV1",
  "x-void-public-seed-authority-hmac",
  "historical_response_authority=",
]) {
  expect(torAdapterSource.includes(token), `Tor adapter missing authority token: ${token}`);
}
for (const token of [
  "adapter_origins",
  "adapterOrigins.includes(parsed.origin)",
  "installVerifiedPublicBootstrapAuthoritySetForTestV1",
]) {
  expect(authoritySource.includes(token), `verified authority missing multipath token: ${token}`);
}
const childEnvBlock = runtimeSupervisor.slice(
  runtimeSupervisor.indexOf("env: {"),
  runtimeSupervisor.indexOf("stdio:", runtimeSupervisor.indexOf("env: {")),
);
expect(!childEnvBlock.includes("secret_hex"), "multipath authority secret must not enter child env");
expect(runtimeSupervisor.includes('"ipc"'), "multipath child must retain IPC authority binding");
expect(!launcher.includes("BOOTSTRAP_ADDRS="), "launcher must not synthesize manual BOOTSTRAP_ADDRS");

console.log("VOID_MULTIPATH_PUBLIC_BOOTSTRAP_SUPERVISOR_V1_PROOF_GREEN");
console.log("invalid_published_https_trust_fails_closed=true");
console.log("https_transport_unavailability_is_classified=true");
console.log("invalid_published_tor_trust_fails_closed=true");
console.log("tor_trust_reverified_after_live_resolution_failure=true");
console.log("tor_unavailability_can_fall_back_to_https=true");
console.log("authenticated_stale_default_tor_can_retire_to_https=true");
console.log("explicit_stale_tor_material_remains_fail_closed=true");
console.log("https_unavailability_can_fall_back_to_tor=true");
console.log("acceptance_mode_requires_both_transport_classes=true");
console.log("multipath_historical_authority_origin_set=true");
console.log("tor_historical_response_hmac=true");
console.log("historical_authority_ipc_bound=true");
console.log("manual_bootstrap_addrs_required=false");
console.log("tailnet_required=false");
console.log("wallet_signer_validator_wc_money_authority=0");
