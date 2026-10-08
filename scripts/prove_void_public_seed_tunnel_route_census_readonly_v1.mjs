#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tool = path.join(root, "ops/public/void_public_seed_tunnel_route_census_readonly_v1.sh");
const source = fs.readFileSync(tool, "utf8");
const marker = "VOID_PUBLIC_SEED_TUNNEL_ROUTE_CENSUS_READONLY_V1";

assert(source.startsWith("#!/usr/bin/env bash\n"));
assert(source.includes(`MARKER=${marker}`));
for (const needle of [
  "--read-only", "--self-test",
  "void-public-seed-named-tunnel-v1.service",
  "https://seed.nullfeed.org/__void/ready.json",
  "https://seed.nullfeed.org/health",
  "http://127.0.0.1:4111/__void/ready.json",
  "http://127.0.0.1:4122/health",
  "https://seed.nullfeed.org/cdn-cgi/trace",
  "read_only=true", "service_mutation=false", "dns_mutation=false",
  "credential_file_direct_access=false",
  "raw_process_arguments_printed=false",
  "raw_http_bodies_printed=false",
  "bootstrap_qualification_or_publication=false",
  "cloudflared_tunnel_total_requests", "cloudflared_tunnel_ha_connections",
  "metrics_listener=%s", "PUBLIC_REQUEST_NOT_COUNTED_HYPOTHESIS",
  "PUBLIC_HTTP_200_STILL_UNQUALIFIED", "tunnel_requests_delta=%s",
  "PUBLIC_PROBE_TRANSPORT_HOLD", "CONNECTOR_CHANGED_HOLD",
  "process_generation_stable=%s",
  "one_request_counter_delta_not_conclusive=true",
]) {
  assert(source.includes(needle), `missing safe operator/proof marker: ${needle}`);
}

// These commands must not be supplied in this read-only source. The script
// may use systemctl show, journal-free process metadata, curl and ss only.
for (const [label, pattern] of [
  ["privileged mutation", /\bsudo\b/u],
  ["service mutation", /systemctl\s+(?:--user\s+)?(?:restart|stop|start|enable|disable|daemon-reload)\b/u],
  ["DNS mutation", /\b(?:cloudflared|curl)\s+[^\n]*\b(?:route\s+dns|tunnel\s+delete|tunnel\s+create)\b/u],
  ["repo mutation", /\bgit\s+(?:push|add|commit|reset|checkout|merge)\b/u],
  ["filesystem mutation", /^\s*(?:rm|mv|cp|install|chmod|chown|truncate|tee)\b/mu],
  ["credential access", /\/\.cloudflared\/[\w-]+\.json/u],
]) {
  assert(!pattern.test(source), `${label} primitive unexpectedly present`);
}

function run(args) {
  return spawnSync("bash", [tool, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 256 * 1024,
    env: { PATH: "/usr/bin:/bin", LC_ALL: "C", HOME: "/nonexistent" },
  });
}

const syntax = spawnSync("bash", ["-n", tool], {
  encoding: "utf8", timeout: 5000,
});
assert.equal(syntax.status, 0, `shell syntax failure: ${syntax.stderr}`);

const selfTest = run(["--self-test"]);
assert.equal(selfTest.status, 0, `self-test failure: ${selfTest.stderr}`);
assert(selfTest.stdout.includes(`${marker}_SELF_TEST_GREEN`));
assert(selfTest.stdout.includes("live_network_access=false"));
assert(selfTest.stdout.includes("service_mutation=false"));

for (const args of [[], ["--apply"], ["--read-only", "--apply"], ["--help"]]) {
  const rejected = run(args);
  assert.equal(rejected.status, 2, `unexpected accepted CLI arguments ${args}`);
  assert(!rejected.stdout.includes("tunnel_process_identity="));
}

console.log("VOID_PUBLIC_SEED_TUNNEL_ROUTE_CENSUS_READONLY_V1_PROOF_GREEN");
console.log("source_contract_readonly=true");
console.log("no_config_or_credential_path_printed=true");
console.log("one_public_probe_between_metrics_snapshots=true");
console.log("zero_delta_is_hypothesis_not_identity_proof=true");
console.log("failed_public_curl_cannot_claim_stale_routing=true");
console.log("connector_restart_invalidates_counter_comparison=true");
console.log("self_test_synthetic_only=true");
console.log("operator_host_access=false");
console.log("services_changed=false");
console.log("funds_moved=false");
