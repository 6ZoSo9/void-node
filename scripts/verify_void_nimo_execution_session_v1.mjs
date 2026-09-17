#!/usr/bin/env node
// Independent structural verifier. Receipts need authenticated workflow/parent
// provenance; an internally consistent JSON document is not self-authenticating.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const keys = (value, wanted) => assert.deepEqual(Object.keys(value).sort(), wanted.split(" ").sort());
const integer = (v, minimum = 0) => assert(Number.isSafeInteger(v) && v >= minimum);
const digest = v => assert(typeof v === "string" && /^[0-9a-f]{64}$/.test(v));
const paths = ["tools/void-nimo-no-tailnet-acceptance-v1.mjs", "scripts/lib/void_public_seed_common_v1.mjs",
  "scripts/prove_void_nimo_no_tailnet_acceptance_v1.mjs", ".github/workflows/void-nimo-no-tailnet-acceptance-v1.yml",
  "docs/operations/void-nimo-no-tailnet-onboarding-v1.md", "scripts/prove_void_nimo_execution_session_v1.mjs",
  "scripts/verify_void_nimo_execution_session_v1.mjs", "scripts/fixtures/nimo-execution-session-v1/child.mjs",
  "scripts/fixtures/nimo-execution-session-v1/forge.cjs", "scripts/fixtures/nimo-execution-session-v1/forge.mjs"];
function git(...args) {
  const r = spawnSync("/usr/bin/git", ["--no-replace-objects", ...args], { timeout: 10_000, maxBuffer: 1024 * 1024 });
  assert.equal(r.status, 0); return r.stdout;
}
const source = { head: git("rev-parse", "HEAD").toString().trim(), tree: git("rev-parse", "HEAD^{tree}").toString().trim(),
  sources: paths.map(name => {
    const bytes = git("show", `HEAD:${name}`); assert(bytes.equals(fs.readFileSync(name)));
    return { path: name, sha256: sha(bytes), bytes: bytes.length };
  }) };
const routes = ["/health", "/__void/ready.json", "/blocks/latest/number2.json", "/p2p/peers"];
const attacks = ["env-require", "env-import", "argv-require", "argv-import"];
const population = [...attacks.map(attack => ["red", attack, 0]), ["nominal", "none", 0],
  ...attacks.map(attack => ["admission", attack, 0]), ...[1, 4, 8, 11].flatMap(cut => [["killed", "none", cut], ["fresh", "none", 0]])];
function verify(receipt, generation, major) {
  keys(receipt, "schema generation major source runtime execution_root cases checker_children loopback_requests forged_results void_node_started runtime_configuration_bound public_onboarding_accepted");
  assert.equal(receipt.schema, "void_nimo_execution_session_v1"); assert.equal(receipt.generation, generation);
  assert.equal(receipt.major, major); assert([22, 24, 26].includes(major)); assert.deepEqual(receipt.source, source);
  assert.equal(typeof receipt.execution_root, "string"); assert(path.isAbsolute(receipt.execution_root)); assert(receipt.execution_root.length <= 1024);
  for (const field of ["void_node_started", "runtime_configuration_bound", "public_onboarding_accepted"]) assert.equal(receipt[field], false);
  assert.equal(receipt.checker_children, 17); assert.equal(receipt.loopback_requests, 84); assert.equal(receipt.forged_results, 48);
  const runtime = receipt.runtime; keys(runtime, "executable version sha256 bytes dev ino");
  assert.equal(typeof runtime.executable, "string"); assert(path.isAbsolute(runtime.executable));
  assert(new RegExp(`^v${major}\\.[0-9]+\\.[0-9]+$`).test(runtime.version)); digest(runtime.sha256);
  integer(runtime.bytes, 1); assert(runtime.bytes <= 256 * 1024 * 1024); integer(runtime.dev); integer(runtime.ino, 1);
  assert.equal(receipt.cases.length, 17); const instances = new Set(); let requests = 0;
  for (const [index, row] of receipt.cases.entries()) {
    keys(row, "kind attack cut identity ticks terminal stdout packet transcript connections admitted");
    const [kind, attack, cut] = population[index]; assert.deepEqual([row.kind, row.attack, row.cut], [kind, attack, cut]);
    assert.equal(row.admitted, kind !== "red" && attack === "none" && !cut);
    integer(row.ticks); assert(row.ticks < 64); keys(row.terminal, "code signal");
    const id = row.identity; keys(id, "pid parent_pid start_ticks argv environment cwd executable executable_dev executable_ino");
    assert.equal(id.cwd, receipt.execution_root);
    integer(id.pid, 1); integer(id.parent_pid, 1); assert(/^[0-9]+$/.test(id.start_ticks));
    const instance = `${id.pid}:${id.start_ticks}`; assert(!instances.has(instance)); instances.add(instance);
    assert.equal(id.executable, runtime.executable); assert.equal(id.executable_dev, runtime.dev); assert.equal(id.executable_ino, runtime.ino);
    const args = [runtime.executable, "--no-warnings", "--experimental-vm-modules", path.join(receipt.execution_root, paths[7])];
    const environment = ["LANG=C", "LC_ALL=C", "TZ=UTC", "NODE_CHANNEL_FD=3", "NODE_CHANNEL_SERIALIZATION_MODE=json"];
    if (attack !== "none") {
      const flag = attack.endsWith("require") ? "--require" : "--import";
      const preload = path.join(receipt.execution_root, `scripts/fixtures/nimo-execution-session-v1/forge.${flag === "--require" ? "cjs" : "mjs"}`);
      if (attack.startsWith("env-")) environment.push(`NODE_OPTIONS=${flag}=${preload}`);
      else args.splice(1, 0, flag, preload);
    }
    assert.deepEqual(id.argv, args); assert.deepEqual(id.environment, environment.sort());
    keys(row.packet, "type head manifest bodies"); assert.equal(row.packet.type, "release"); assert.equal(row.packet.head, source.head);
    assert.equal(typeof row.packet.manifest, "string"); assert(row.packet.manifest.length <= 4096);
    const manifest = JSON.parse(row.packet.manifest); assert.equal(canonical(manifest), row.packet.manifest);
    const content = { ...manifest }; delete content.manifest_id;
    assert.equal(manifest.manifest_id, `voidpbm1_${sha(canonical(content))}`);
    const target = manifest.sync_endpoints[0].qualified_head; integer(target, 1951058); assert(target < 1952058);
    const now = Date.parse(manifest.generated_at); integer(now, 1); assert.equal(Date.parse(manifest.expires_at) - now, 60_000);
    const peerBody = JSON.parse(row.packet.bodies["/p2p/peers"]), peer = peerBody.connected[0].id;
    assert(/^[0-9a-f]{32}$/.test(peer));
    const bodies = [{ ok: true }, { ready: true, gap: 0, txroot_live: 1, reasons: [], head: target }, { number: target },
      { ok: true, connected: [{ id: peer, addr: "peer.example:4700", listens: [], outbound: true }],
        verifiedPeers: [{ node_id: peer, addresses: ["peer.example:4700"], last_authenticated_at_ms: now }] }];
    assert.deepEqual(row.packet.bodies, Object.fromEntries(routes.map((r, i) => [r, canonical(bodies[i])])));
    const total = kind === "red" || attack !== "none" ? 0 : cut || 12;
    assert.equal(row.connections, total); assert.equal(row.transcript.length, total); requests += total;
    row.transcript.forEach((entry, n) => {
      keys(entry, "request response"); assert.equal(typeof entry.request, "string"); assert(Buffer.byteLength(entry.request) <= 8192);
      assert(entry.request.startsWith(`GET ${routes[n % 4]} HTTP/1.1\r\n`)); assert(entry.request.endsWith("\r\n\r\n"));
      assert(entry.request.toLowerCase().includes("\r\nhost: 127.0.0.1:4100\r\n"));
      assert(!/\r\n(?:content-length|transfer-encoding):/i.test(entry.request));
      const body = row.packet.bodies[routes[n % 4]];
      const expected = cut === n + 1 ? null : `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`;
      assert.equal(entry.response, expected);
    });
    let expectedOutput;
    if (cut) { assert.deepEqual(row.terminal, { code: null, signal: "SIGKILL" }); expectedOutput = ""; }
    else if (kind === "admission") {
      assert.deepEqual(row.terminal, { code: 2, signal: null }); expectedOutput = "VOID_NIMO_EXECUTION_ENVELOPE_HOLD\nVOID_NIMO_FORGED_RESULTS=0\n";
    } else {
      assert.deepEqual(row.terminal, { code: 0, signal: null });
      expectedOutput = ["=== VOID NIMO NO-TAILNET POST-SYNC V1 ===", "local_http_base=http://127.0.0.1:4100", "local_http_process_bound=false",
        `source_head=${source.head}`, "tailscale_binary_present=false", "tailnet_address_present=false", "public_sync_endpoint_count=1",
        `bootstrap_manifest_id=${manifest.manifest_id}`, `bootstrap_manifest_sha256=${sha(row.packet.manifest)}`, `qualified_target_head=${target}`,
        "target_observation_count=3", "target_observation_interval_ms=1000", `observed_heads=[${target},${target},${target}]`,
        `head=${target}`, "gap=0", "txroot_live=1", "connected_peer_count=1", "verified_peer_count=1", "verified_connected_peer_count=1",
        "tailnet_required=false", "private_configuration_required=false", "runtime_session_bound=false", "fresh_join_proven=false",
        "public_onboarding_accepted=false", "VOID_NIMO_NO_TAILNET_TARGET_OBSERVATIONS_V1_GREEN", ""].join("\n");
      if (kind === "red") expectedOutput += "VOID_NIMO_FORGED_RESULTS=12\n";
    }
    assert.equal(row.stdout, expectedOutput);
  }
  assert.equal(requests, 84); return receipt;
}
function read(directory, generation, major) {
  const file = path.join(directory, `node-${major}.json`), fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  let bytes;
  try {
    const before = fs.fstatSync(fd); assert(before.isFile() && before.nlink === 1 && before.size > 0 && before.size <= 256 * 1024);
    bytes = Buffer.alloc(before.size); let size = 0;
    for (let n = 0; n < 64 && size < bytes.length; n++) size += fs.readSync(fd, bytes, size, bytes.length - size, null);
    assert.equal(size, before.size); const after = fs.fstatSync(fd);
    for (const k of ["dev", "ino", "size", "mtimeMs", "ctimeMs"]) assert.equal(after[k], before[k]);
  } finally { fs.closeSync(fd); }
  const receipt = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  assert(bytes.equals(Buffer.from(canonical(receipt) + "\n")), "receipt must be canonical bytes");
  verify(receipt, generation, major); return { receipt, sha256: sha(bytes), bytes: bytes.length };
}
const [mode, directory, generation, argument] = process.argv.slice(2);
assert.equal(process.argv.length, 6); assert(/^[A-Za-z0-9-]{1,80}$/.test(generation));
if (mode === "--single") {
  const major = Number(argument), original = read(directory, generation, major), mutants = [
    ["historical-generation", r => { r.generation += "-old"; }], ["mixed-head", r => { r.source.head = "0".repeat(40); }],
    ["repinned-source-digest", r => { r.source.sources[0].sha256 = "0".repeat(64); }], ["mixed-runtime", r => { r.runtime.version = "v99.0.0"; }],
    ["missing-case", r => { r.cases.pop(); }], ["duplicate-case", r => { r.cases[1] = r.cases[0]; }],
    ["reordered-cases", r => { [r.cases[0], r.cases[1]] = [r.cases[1], r.cases[0]]; }],
    ["forged-success-without-tcp", r => { r.cases[4].transcript = []; r.cases[4].connections = 0; }],
    ["missing-request", r => { r.cases[4].transcript.pop(); }], ["extra-request", r => { r.cases[4].transcript.push(r.cases[4].transcript[0]); }],
    ["changed-route", r => { r.cases[4].transcript[0].request = "GET /other HTTP/1.1\r\n\r\n"; }],
    ["changed-response", r => { r.cases[4].transcript[0].response += " "; }],
    ["repinned-payload-with-old-output", r => { r.cases[4].packet.bodies['/health'] = '{"ok":false}'; }],
    ["changed-argv", r => { r.cases[4].identity.argv.push("--require=foreign"); }],
    ["changed-environment", r => { r.cases[4].identity.environment.push("NODE_OPTIONS=foreign"); }],
    ["changed-executable", r => { r.cases[4].identity.executable += "-other"; }],
    ["reused-process-instance", r => { r.cases[4].identity = r.cases[0].identity; }],
    ["killed-receipt-admitted", r => { r.cases[9].admitted = true; }], ["attacked-receipt-admitted", r => { r.cases[5].admitted = true; }],
    ["tick-ceiling", r => { r.cases[4].ticks = 64; }], ["partial-green-output", r => { r.cases[4].stdout = "VOID_NIMO_NO_TAILNET_TARGET_OBSERVATIONS_V1_GREEN\n"; }],
    ["runtime-acceptance-promotion", r => { r.runtime_configuration_bound = true; }],
  ];
  for (const [id, change] of mutants) { const r = structuredClone(original.receipt); change(r); assert.throws(() => verify(r, generation, major), undefined, id); }
  console.log(canonical({ marker: "VOID_NIMO_EXECUTION_RECEIPT_V1_GREEN", major, generation, receipt_sha256: original.sha256,
    negative_cases: mutants.map(([id]) => id), negative_case_count: mutants.length, positive_case_count: 1 }));
} else {
  assert.equal(mode, "--aggregate"); assert.deepEqual(fs.readdirSync(directory).sort(), ["node-22.json", "node-24.json", "node-26.json"]);
  const members = [22, 24, 26].map(major => ({ major, ...read(directory, generation, major) }));
  const aggregate = { schema: "void_nimo_execution_session_aggregate_v1", generation, source,
    members: members.map(r => ({ major: r.major, runtime: r.receipt.runtime, receipt_sha256: r.sha256, receipt_bytes: r.bytes })),
    checker_children: 51, historical_false_greens: 12, forged_results: 144, loopback_requests: 252,
    nominal_admissions: 3, rejected_admissions: 12, killed_children: 12, fresh_reconstructions: 12,
    void_node_started: false, runtime_configuration_bound: false, public_onboarding_accepted: false };
  const bytes = Buffer.from(canonical(aggregate) + "\n"), fd = fs.openSync(argument, "wx", 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  console.log(canonical({ marker: "FETCH_DISPATCHER_EXECUTION_RECOVERY_GREEN", generation, head: source.head,
    aggregate_sha256: sha(bytes), aggregate_bytes: bytes.length, checker_children: 51, loopback_requests: 252,
    historical_false_greens: 12, forged_results: 144, killed_children: 12, fresh_reconstructions: 12,
    void_node_started: false, runtime_configuration_bound: false, public_onboarding_accepted: false }));
}
