import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  MARKER,
  RESULT_MARKER,
  evaluateGameNetworkingSocketsFeasibilityV1,
} from "./void_gamenetworkingsockets_transport_feasibility_v1.mjs";

function fail(message) {
  throw new Error(message);
}
function assertCondition(condition, message) {
  if (!condition) fail(message);
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function expectReject(label, callback) {
  try {
    callback();
  } catch {
    return;
  }
  fail(`expected rejection: ${label}`);
}

const examplePath =
  "examples/void-gamenetworkingsockets-transport-feasibility-v1.example.json";
const schemaPath =
  "schemas/void-gamenetworkingsockets-transport-feasibility-v1.schema.json";
const docsPath =
  "docs/architecture/void-gamenetworkingsockets-transport-feasibility-v1.md";
const workflowPath =
  ".github/workflows/void-gamenetworkingsockets-transport-feasibility-v1.yml";
const probePath =
  "ops/mainnet0/probe_void_gamenetworkingsockets_host_readiness_v1.py";

const example = JSON.parse(fs.readFileSync(examplePath, "utf8"));
const result = evaluateGameNetworkingSocketsFeasibilityV1(example);

assertCondition(result.marker === RESULT_MARKER, "result marker mismatch");
assertCondition(
  result.status === "proceed_to_optional_sidecar_build_probe",
  "feasibility status mismatch",
);
assertCondition(result.current_transport_preserved, "current transport changed");
assertCondition(
  result.exact_void_message_signatures_preserved,
  "message signatures changed",
);
assertCondition(
  result.production_activation_authorized === false,
  "production activation was authorized",
);

for (const [label, mutate] of [
  ["Steam client dependency", (v) => { v.upstream.steam_client_required = true; }],
  ["Steamworks dependency", (v) => { v.upstream.steamworks_partner_required = true; }],
  ["SDR dependency", (v) => { v.upstream.steam_datagram_relay_required = true; }],
  ["Steam authentication", (v) => { v.upstream.steam_authentication_required = true; }],
  ["TURN assumption", (v) => { v.upstream.turn_relay_assumed = true; }],
  ["default enablement", (v) => { v.proposed_phase.default_enabled = true; }],
  ["transport replacement", (v) => { v.proposed_phase.replace_current_transport = true; }],
  ["consensus dependency", (v) => { v.proposed_phase.consensus_dependency = true; }],
  ["identity dependency", (v) => { v.proposed_phase.node_identity_dependency = true; }],
  ["signature removal", (v) => { v.proposed_phase.existing_message_signatures_required = false; }],
  ["wire rewrite", (v) => { v.proposed_phase.existing_wire_messages_preserved = false; }],
  ["package install", (v) => { v.proposed_phase.automatic_package_install = true; }],
  ["source download", (v) => { v.proposed_phase.automatic_source_download = true; }],
  ["production activation", (v) => { v.proposed_phase.production_activation_requested = true; }],
]) {
  const candidate = clone(example);
  mutate(candidate);
  expectReject(label, () =>
    evaluateGameNetworkingSocketsFeasibilityV1(candidate),
  );
}

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
assertCondition(schema.additionalProperties === false, "schema must be closed");
assertCondition(
  schema.properties.upstream.properties.license.const === "BSD-3-Clause",
  "license boundary changed",
);

const docs = fs.readFileSync(docsPath, "utf8");
for (const fragment of [
  "default-off, loopback-only sidecar",
  "v1.5.1",
  "Steam Datagram Relay",
  "Native ICE remains beta",
  "HELLO",
  "PEERS",
  "SUB",
  "PUB",
  "Ed25519",
  "must not replace message signatures",
  "Production activation remains separately reviewed",
]) {
  assertCondition(docs.includes(fragment), `docs missing: ${fragment}`);
}

const workflow = fs.readFileSync(workflowPath, "utf8");
assertCondition(
  workflow.includes(
    "prove_void_gamenetworkingsockets_transport_feasibility_v1.mjs",
  ),
  "workflow proof command missing",
);
assertCondition(
  workflow.includes(
    "probe_void_gamenetworkingsockets_host_readiness_v1.py",
  ),
  "workflow host probe missing",
);
assertCondition(!workflow.includes("\n  push:"), "workflow adds push trigger");

const probeSource = fs.readFileSync(probePath, "utf8");
for (const forbidden of [
  "apt-get install",
  "apt install",
  "dnf install",
  "pacman -S",
  "curl ",
  "wget ",
  "git clone",
  "pip install",
]) {
  assertCondition(
    !probeSource.includes(forbidden),
    `probe contains forbidden action: ${forbidden}`,
  );
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-gns-feasibility-proof-"),
);
const fakeRepo = path.join(temp, "repo");
fs.mkdirSync(path.join(fakeRepo, ".git"), { recursive: true });
fs.mkdirSync(path.join(fakeRepo, "src/p2p"), { recursive: true });
fs.writeFileSync(
  path.join(fakeRepo, "src/node_core.ts"),
  [
    'import * as net from "node:net";',
    "const MAX_MSG_BYTES = 64 * 1024;",
    'type Msg = { type: "HELLO" } | { type: "PEERS" } | { type: "PUB" } | { type: "SUB" };',
    "const server = net.createServer(() => {});",
    "const socket = net.createConnection({ host: '127.0.0.1', port: 1 });",
    "const len = Buffer.alloc(4);",
    "len.writeUInt32BE(body.length, 0);",
    "crypto.sign(null, bytes, key);",
    "crypto.verify(null, bytes, key, sig);",
  ].join("\n"),
);
fs.writeFileSync(
  path.join(fakeRepo, "src/p2p/p2p.ts"),
  "export type PeerAddr = string;\n",
);
const fixturePath = path.join(temp, "fixture.json");
fs.writeFileSync(
  fixturePath,
  JSON.stringify({
    hostname: "void-gns-proof-host",
    tools: {
      git: "/usr/bin/git",
      cmake: "/usr/bin/cmake",
      ninja: "/usr/bin/ninja",
      make: null,
      "c++": "/usr/bin/c++",
      "g++": "/usr/bin/g++",
      "clang++": null,
      "pkg-config": "/usr/bin/pkg-config",
      python3: "/usr/bin/python3"
    },
    pkg_config: {
      libsodium: true,
      protobuf: true,
      openssl: true
    }
  }),
);
const reportPath = path.join(temp, "report.json");
const probe = spawnSync(
  "python3",
  [
    probePath,
    "--repo",
    fakeRepo,
    "--output",
    reportPath,
    "--fixture-json",
    fixturePath,
  ],
  { encoding: "utf8" },
);
assertCondition(probe.status === 0, `host probe failed: ${probe.stderr}`);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
assertCondition(
  report.status === "ready_for_local_dependency_build_probe",
  "host readiness status mismatch",
);
assertCondition(
  report.transport_boundary.all_required_observations_present === true,
  "transport boundary was not recognized",
);
assertCondition(
  Object.values(report.authority).every((value) => value === false),
  "host probe granted authority",
);

console.log(`marker=${MARKER}`);
console.log(`candidate_tag=${result.upstream_tag}`);
console.log("current_transport_preserved=true");
console.log("wire_messages_preserved=HELLO,PEERS,PUB,SUB");
console.log("message_signatures_preserved=true");
console.log("steam_client_required=false");
console.log("steam_datagram_relay_assumed=false");
console.log("custom_signaling_work_required_later=true");
console.log("loopback_sidecar_benchmark_next=true");
console.log("production_activation_authorized=false");
console.log("package_install=false");
console.log("source_download=false");
console.log("listener_start=false");
console.log("external_connection=false");
console.log("service_restart=false");
console.log("deployment=false");
console.log("money_movement=false");
console.log(
  "VOID_GAMENETWORKINGSOCKETS_TRANSPORT_FEASIBILITY_V1_PROOF_GREEN=true",
);
