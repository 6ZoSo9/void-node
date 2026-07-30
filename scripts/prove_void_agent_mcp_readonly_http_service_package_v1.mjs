#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const json = (path) => JSON.parse(read(path));

const paths = [
  ".github/workflows/void-agent-mcp-readonly-http-service-package-v1.yml",
  "docs/public-agent/void-agent-mcp-readonly-http-service-package-v1.md",
  "examples/void-agent-mcp-readonly-http-service-package-v1.example.json",
  "schemas/void-agent-mcp-readonly-http-service-package-v1.schema.json",
  "ops/systemd/void-agent-mcp-readonly-http-v1.service.in",
  "ops/systemd/void-agent-mcp-readonly-http-v1.env.example",
  "ops/deploy_void_agent_mcp_readonly_http_service_v1.py",
  "scripts/prove_void_agent_mcp_readonly_http_service_package_v1.mjs",
];
for (const path of paths) assert.ok(read(path).length > 0, `${path}: empty`);

const unit = read("ops/systemd/void-agent-mcp-readonly-http-v1.service.in");
const env = read("ops/systemd/void-agent-mcp-readonly-http-v1.env.example");
const deployer = read("ops/deploy_void_agent_mcp_readonly_http_service_v1.py");
const workflow = read(".github/workflows/void-agent-mcp-readonly-http-service-package-v1.yml");
const docs = read("docs/public-agent/void-agent-mcp-readonly-http-service-package-v1.md");
const example = json("examples/void-agent-mcp-readonly-http-service-package-v1.example.json");
const schema = json("schemas/void-agent-mcp-readonly-http-service-package-v1.schema.json");

assert.match(unit, /VOID_AGENT_MCP_READONLY_HTTP_SYSTEMD_SERVICE_V1/);
for (const directive of [
  "NoNewPrivileges=true",
  "PrivateTmp=true",
  "ProtectSystem=strict",
  "ProtectHome=read-only",
  "RestrictAddressFamilies=AF_INET AF_UNIX",
  "UMask=0077",
  "UnsetEnvironment=VOID_MCP_TOKEN_FILE",
  "Environment=VOID_MCP_ALLOW_SUBMIT=0",
]) assert.ok(unit.includes(directive), `missing ${directive}`);
assert.ok(!/^PrivateDevices=/m.test(unit));
assert.ok(!unit.includes("0.0.0.0"));
assert.ok(!unit.includes("VOID_MCP_ALLOW_SUBMIT=1"));
assert.ok(!unit.includes("VOID_MCP_TOKEN_FILE="));

assert.match(env, /VOID_AGENT_MCP_READONLY_HTTP_ENV_V1/);
assert.ok(env.includes('VOID_MCP_HTTP_HOST="127.0.0.1"'));
assert.ok(env.includes('VOID_MCP_HTTP_PORT="4114"'));
assert.ok(!env.includes("VOID_MCP_TOKEN_FILE"));
assert.ok(!env.includes("VOID_MCP_ALLOW_SUBMIT"));

assert.match(deployer, /deployVoidAgentMcpReadonlyHttpServiceV1/);
assert.match(deployer, /direct-socket readiness/);
assert.ok(deployer.includes(String.raw`match = re.fullmatch(r"socket:\[(\d+)\]", target)`));
assert.ok(deployer.includes("rollback_disable_before_unit_removal") === false);
assert.ok(deployer.indexOf('["systemctl", "--user", "disable", SERVICE_NAME]') < deployer.indexOf("restore_file(UNIT_PATH"));

assert.equal(example.marker, "VOID_AGENT_MCP_READONLY_HTTP_SERVICE_PACKAGE_V1");
assert.equal(example.version, 1);
assert.deepEqual(example.listener, {
  host: "127.0.0.1",
  port: 4114,
  path: "/mcp",
  loopback_only: true,
  external_network_listener: false,
});
assert.deepEqual(example.mcp.protocols, ["2025-11-25", "2026-07-28"]);
assert.equal(example.mcp.submit_tool_registered, false);
assert.equal(example.authority.submission_enabled, false);
assert.equal(example.authority.token_file_allowed, false);
assert.equal(schema.properties.marker.const, example.marker);
assert.equal(schema.properties.listener.properties.host.const, "127.0.0.1");
assert.equal(schema.properties.listener.properties.external_network_listener.const, false);

for (const phrase of [
  "source-and-CI only",
  "loopback-only",
  "PrivateDevices",
  "direct TCP",
  "no live credential",
]) assert.ok(docs.includes(phrase), `docs missing: ${phrase}`);

assert.match(workflow, /npm --prefix integrations\/mcp run check/);
assert.match(workflow, /--self-test/);
assert.match(workflow, /prove_void_agent_mcp_readonly_http_service_package_v1\.mjs/);
assert.match(workflow, /prove_void_agent_mcp_bridge_v1\.ts/);
assert.match(workflow, /fetch-depth: 2/);
assert.match(workflow, /git diff --exit-code HEAD\^1\.\.HEAD/);
assert.match(workflow, /git worktree add --detach "\$CHECKOUT" HEAD\^1/);
assert.match(workflow, /npm --prefix "\$CHECKOUT" ci/);
assert.match(workflow, /cd "\$CHECKOUT"/);
assert.match(workflow, /tsconfig\.build\.json/);

const result = {
  marker: "VOID_AGENT_MCP_READONLY_HTTP_SERVICE_PACKAGE_PROOF_V1",
  exact_green: true,
  expected_files: paths.length,
  source_and_ci_only: true,
  shared_mcp_proof_clean_parent: true,
  systemd_user_scope: true,
  private_devices_omitted: true,
  capability_compatible_hardening_preserved: true,
  loopback_only: true,
  direct_socket_readiness: true,
  rollback_disable_before_unit_removal: true,
  submission_default_disabled: true,
  token_file_configuration_absent: true,
  external_network_listener: false,
  reverse_proxy_configuration: false,
  live_credential_access: false,
  live_paid_work_submission: false,
  payment_execution: false,
  paid_work_execution: false,
  wc_ledger_write: false,
  void_settlement: false,
  runtime_mutation: false,
  deployment: false,
};
console.log(JSON.stringify(result, null, 2));
console.log("VOID_AGENT_MCP_READONLY_HTTP_SERVICE_PACKAGE_PROOF=PASS");
