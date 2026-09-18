#!/usr/bin/env node
// Source-only hostile-ingress experiment. Child processes are test fixtures,
// not a production sandbox or designated-host isolation receipt.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync, fork } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as successor from "./lib/void_datanet_chain_peer_reconstruction_v1.mjs";

const SELF = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SELF), "..");
const HELPER = "scripts/lib/void_datanet_chain_peer_reconstruction_v1.mjs";
const RAW_COMMIT = "717aa6b83549c8f3547c97c0300660643df80d00";
const RAW_BLOB = "1e7cd0b3372dbffe53d62e4766de9826301e7122";
const payload = Buffer.from("bounded-ingress-control\n");
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
function canonical(value) {
  if (Buffer.isBuffer(value)) return JSON.stringify(value.toString("base64"));
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
}
const wire = value => Buffer.from(canonical(value));
function request(overrides = {}, bytes = payload) {
  const input = {
    chain_id: "2050", object_id: "ingress-object-v1", content_sha256: sha(bytes),
    byte_length: String(bytes.length), checkpoint_height: "1951058",
    checkpoint_block_hash: `0x${"a".repeat(64)}`, accepted_checkpoint_id: "checkpoint-v1",
    commitment_transaction_hash: `0x${"b".repeat(64)}`, commitment_log_index: "7", ...overrides,
  };
  // Independent fixture construction, never called on hostile values.
  const commitment = { marker: "VOID_DATANET_CHAIN_COMMITMENT_V1", version: 1, ...input,
    commitment_id: "voiddncommit1_" + sha(canonical({ domain: "void:datanet:chain2050:content-commitment:v1", ...input })) };
  return { commitment, local: { present: false, object_id: null, commitment_id: null, payload: null },
    peers: [{ peer_id: "peer-alpha", authenticated: true, accepts_repair: false,
      object_id: input.object_id, commitment_id: commitment.commitment_id,
      retrieval_generation: "retrieval-v1", payload: bytes }],
    policy: { ...successor.VOID_DATANET_RECONSTRUCTION_DEFAULT_POLICY_V1 } };
}
function hold(result) {
  assert.equal(result.ok, false); assert.equal(result.status, "DATANET_RECONSTRUCTION_HOLD");
  assert.equal(result.verified_independent_replica_count, 0);
  for (const [key, value] of Object.entries(result)) {
    if (key.endsWith("_authority_granted")) assert.equal(value, false, key);
  }
}
const POSITIONS = ["request", "commitment", "policy", "local", "peer"];
const OBJECT_CASES = [
  ...["ownKeys", "getOwnPropertyDescriptor", "get"].flatMap(hook => POSITIONS.map(position => `${position}:${hook}`)),
  ...["request", "commitment", "local", "peer"].map(position => `${position}:getter`),
  "commitment:toPrimitive", "peer:toString", "request:thrown-message",
  "request:never-ownKeys", "commitment:never-coercion",
];
const SCALAR_CASES = ["request:65536", "request:65537", "byte:9", "byte:10", "height:20", "height:21",
  "log:10", "log:11", "height:leading-zero", "height:negative", "height:exponent", "height:million"];
const CASES = [...OBJECT_CASES, ...SCALAR_CASES];
const VALID = new Set(["request:65536", "byte:9", "height:20", "log:10", "clean"]);
const NEVER = new Set(["request:never-ownKeys", "commitment:never-coercion"]);
assert.equal(CASES.length, 36);

function fixture(name, counters) {
  let input = request();
  if (name === "clean") return { input, encoded: wire(input) };
  if (OBJECT_CASES.includes(name)) {
    const [position, kind] = name.split(":");
    const owner = position === "peer" ? input.peers : input;
    const key = position === "peer" ? 0 : position;
    const target = position === "request" ? input : owner[key];
    const field = { request: "commitment", commitment: "checkpoint_height", policy: "max_object_bytes", local: "present", peer: "authenticated" }[position];
    const hook = () => { counters.callbacks++; };
    const forever = () => { hook(); process.send({ type: "hook" }); for (;;) {} };
    let replacement = target;
    if (["ownKeys", "getOwnPropertyDescriptor", "get"].includes(kind)) {
      replacement = new Proxy(target, { [kind](...args) { hook(); return Reflect[kind](...args); } });
    } else if (kind === "getter") {
      const value = target[field]; Object.defineProperty(target, field, { enumerable: true, get() { hook(); return value; } });
    } else if (kind === "toPrimitive" || kind === "never-coercion") {
      target.checkpoint_height = { [Symbol.toPrimitive]: kind === "never-coercion" ? forever : () => { hook(); return "1951058"; } };
    } else if (kind === "toString") {
      target.peer_id = { toString() { hook(); return "peer-alpha"; } };
    } else if (kind === "thrown-message") {
      Object.defineProperty(input, "commitment", { get() { hook(); throw { get message() { hook(); return "hostile_message"; } }; } });
    } else if (kind === "never-ownKeys") {
      replacement = new Proxy(target, { ownKeys: forever });
    }
    if (position === "request") input = replacement; else owner[key] = replacement;
    // Deliberately pass the live graph straight to the successor. Serializing
    // it in the trusted parent would execute precisely the hooks being tested.
    return { input, encoded: input };
  }
  if (name.startsWith("request:")) {
    input = request({}, Buffer.alloc(48000, 65));
    let remaining = 65536 - wire(input).length;
    const growth = Math.floor(remaining / 4) * 3;
    input = request({}, Buffer.alloc(48000 + growth, 65));
    remaining = 65536 - wire(input).length;
    input.peers[0].retrieval_generation += "x".repeat(remaining);
    assert.equal(wire(input).length, 65536);
    return { input, encoded: name === "request:65536" ? wire(input) : Buffer.concat([wire(input), Buffer.from(" ")]) };
  }
  const values = {
    "byte:9": ["byte_length", "268435456"], "byte:10": ["byte_length", "1000000000"],
    "height:20": ["checkpoint_height", "18446744073709551615"], "height:21": ["checkpoint_height", "100000000000000000000"],
    "log:10": ["commitment_log_index", "4294967295"], "log:11": ["commitment_log_index", "10000000000"],
    "height:leading-zero": ["checkpoint_height", "01"], "height:negative": ["checkpoint_height", "-1"],
    "height:exponent": ["checkpoint_height", "1e3"], "height:million": ["checkpoint_height", "9".repeat(1000000)],
  };
  const [field, value] = values[name];
  if (VALID.has(name)) input = request({ [field]: value }); else input.commitment[field] = value;
  if (name === "byte:9") input.policy.max_object_bytes = 268435456;
  return { input, encoded: wire(input) };
}

function instrument(counters) {
  const restores = [];
  function wrap(owner, key, count, observe = () => {}) {
    const original = owner[key];
    owner[key] = function (...args) { counters[count]++; observe(args); return Reflect.apply(original, this, args); };
    restores.push(() => { owner[key] = original; });
  }
  wrap(crypto, "createHash", "hashes");
  wrap(Array.prototype, "sort", "sorts");
  wrap(globalThis, "BigInt", "bigints", args => { if (typeof args[0] === "string" && args[0].length === 1000000) counters.millionBigInts++; });
  wrap(RegExp.prototype, "test", "scalarTraversal", args => { if (typeof args[0] === "string" && args[0].length === 1000000) counters.millionRegexes++; });
  wrap(Object, "keys", "scalarTraversal");
  wrap(Buffer, "byteLength", "scalarTraversal");
  wrap(Number, "isSafeInteger", "scalarTraversal");
  return () => { for (const restore of restores.reverse()) restore(); };
}

async function child(profile, name, controlPath) {
  const api = profile === "raw" ? await import(pathToFileURL(controlPath).href) : successor;
  const plan = api.planDatanetChainPeerReconstructionV1;
  // Warm normal module initialization before the ready/RSS boundary. Fixtures
  // and the million-digit adversary are producer allocations before admission.
  for (let i = 0; i < 3; i++) plan(profile === "raw" ? request() : wire(request()));
  const counters = { callbacks: 0, hashes: 0, sorts: 0, bigints: 0, millionBigInts: 0, millionRegexes: 0, scalarTraversal: 0 };
  const f = fixture(name, counters);
  const input = profile === "raw" ? f.input : f.encoded;
  process.send({ type: "ready" });
  process.once("message", message => {
    assert.equal(message, "go");
    const restore = instrument(counters);
    const before = process.memoryUsage().rss;
    const start = performance.now();
    let result;
    try { result = plan(input); }
    finally { restore(); }
    const elapsed = performance.now() - start;
    const growth = Math.max(0, process.memoryUsage().rss - before, process.resourceUsage().maxRSS * 1024 - before);
    hold(result);
    process.send({ type: "result", counters, elapsed, growth, digest: sha(canonical(result)), hasPlan: Object.hasOwn(result, "reference_plan") }, () => process.disconnect());
  });
}

async function supervised(profile, name, controlPath) {
  return await new Promise((resolveResult, reject) => {
    const candidate = fork(SELF, ["--child", profile, name, controlPath], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    let ready = false, started, record, timeout = false, hook = false, output = 0;
    let timer = setTimeout(() => { candidate.kill("SIGKILL"); reject(new Error("child_startup_timeout")); }, 10000);
    for (const stream of [candidate.stdout, candidate.stderr]) stream.on("data", chunk => {
      output += chunk.length;
      if (output > 8192) { candidate.kill("SIGKILL"); reject(new Error("child_output_bound")); }
    });
    candidate.on("message", message => {
      if (message.type === "ready") {
        assert.equal(ready, false); ready = true; clearTimeout(timer); started = performance.now();
        timer = setTimeout(() => { timeout = true; candidate.kill("SIGKILL"); }, profile === "raw" ? 700 : 250);
        candidate.send("go");
      } else if (message.type === "hook") { hook = true; }
      else if (message.type === "result") { assert.equal(record, undefined); record = message; }
      else { candidate.kill("SIGKILL"); reject(new Error("unknown_child_message")); }
    });
    candidate.once("error", reject);
    candidate.once("exit", (code, signal) => {
      clearTimeout(timer);
      const wall = performance.now() - started;
      if (!ready || output || (!timeout && (code !== 0 || signal || !record))) {
        reject(new Error(`child_failed:${profile}:${name}:${code}:${signal}:output=${output}`)); return;
      }
      resolveResult({ timeout, hook, wall, ...record });
    });
  });
}

const caseNames = [];
function check(name, fn) { fn(); caseNames.push(name); }
async function experiment() {
  const scratch = mkdtempSync(join(tmpdir(), "void-ingress-proof-"));
  try {
    const bytes = execFileSync("git", ["show", `${RAW_COMMIT}:${HELPER}`], { cwd: ROOT, timeout: 10000, maxBuffer: 65536 });
    assert.equal(crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"), RAW_BLOB);
    const controlPath = join(scratch, "control.mjs"); writeFileSync(controlPath, bytes, { flag: "wx", mode: 0o600 });
    const baselines = {};
    for (const profile of ["raw", "bounded"]) {
      const baseline = await supervised(profile, "clean", controlPath);
      assert.equal(baseline.timeout, false); baselines[profile] = baseline.digest;
    }
    assert.equal(baselines.raw, baselines.bounded, "independent clean baselines must agree");
    let processes = 0, rawCallbacks = 0, terminated = 0, million = 0, maximumDigest;
    const deadline = performance.now() + 25000;
    for (const name of CASES) {
      let rawDigest;
      for (const profile of ["raw", "bounded"]) {
        assert.ok(performance.now() < deadline, "cumulative_experiment_deadline");
        assert.ok(processes < 144, "cumulative_process_bound");
        const result = await supervised(profile, name, controlPath); processes++;
        // A fresh-process clean control immediately follows every candidate,
        // including killed legacy controls. Counters never cross processes.
        const recovery = await supervised(profile, "clean", controlPath); processes++;
        assert.equal(recovery.timeout, false); assert.equal(recovery.digest, baselines[profile]);
        assert.equal(recovery.counters.callbacks, 0);
        if (profile === "raw" && NEVER.has(name)) {
          assert.equal(result.timeout, true); assert.equal(result.hook, true);
          assert.ok(result.wall <= 1000, "supervisor termination exceeded one second"); terminated++;
        } else {
          assert.equal(result.timeout, false, `${profile}:${name}:timeout`);
          if (profile === "raw") {
            rawDigest = result.digest;
            if (OBJECT_CASES.includes(name)) assert.ok(result.counters.callbacks > 0, name);
            rawCallbacks += result.counters.callbacks;
            if (name === "height:million") {
              assert.ok(result.counters.millionBigInts > 0 && result.counters.millionRegexes > 0);
              million++;
            }
          } else {
            if (VALID.has(name)) assert.equal(result.digest, rawDigest, `${name}:profile_result_drift`);
            if (name === "request:65536") maximumDigest = result.digest;
            assert.equal(result.counters.callbacks, 0, name);
            assert.equal(result.counters.bigints, 0, name);
            assert.ok(result.elapsed <= 250 && result.wall <= 250, `${name}:execution_bound`);
            assert.ok(result.growth <= 8 * 1024 * 1024, `${name}:rss_growth_bound:${result.growth}`);
            assert.ok(result.counters.scalarTraversal <= 512, `${name}:scalar_traversal_bound`);
            if (!VALID.has(name)) {
              assert.equal(result.hasPlan, false, name);
              assert.equal(result.counters.hashes, 0, name); assert.equal(result.counters.sorts, 0, name);
            }
          }
        }
      }
      caseNames.push(`supervised attack and fresh recovery: ${name}`);
    }
    assert.ok(rawCallbacks > 0); assert.equal(terminated, 2); assert.equal(million, 1); assert.equal(processes, 144);
    assert.ok(performance.now() < deadline, "cumulative_experiment_deadline");
    return maximumDigest;
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

function focused() {
  const plan = successor.planDatanetChainPeerReconstructionV1;
  for (const [name, value] of [
    ["string", canonical(request())], ["Uint8Array", new Uint8Array(wire(request()))],
    ["boxed string", new String(canonical(request()))], ["null", null], ["function", () => {}],
    ["shared Buffer", Buffer.from(new SharedArrayBuffer(64))],
    ["resizable Buffer", Buffer.from(new ArrayBuffer(64, { maxByteLength: 128 }))],
    ["Buffer prototype forgery", Object.create(Buffer.prototype)],
  ]) check(`reject ${name}`, () => { const result = plan(value); hold(result); assert.equal(result.reference_plan, undefined); });
  check("Buffer instance accessors are ignored through internal slots", () => {
    const input = wire(request()); let callbacks = 0;
    for (const key of ["length", "byteLength", "buffer", "byteOffset", "toString", "utf8Slice", Symbol.iterator, Symbol.toPrimitive]) {
      Object.defineProperty(input, key, { get() { callbacks++; throw new Error("instance_hook"); } });
    }
    const result = plan(input); hold(result); assert.ok(result.reference_plan); assert.equal(callbacks, 0);
  });
  check("revoked Proxy and proxied Buffer reject without traps", () => {
    const revocable = Proxy.revocable(wire(request()), {}); revocable.revoke();
    let callbacks = 0;
    for (const input of [revocable.proxy, new Proxy(wire(request()), { getPrototypeOf() { callbacks++; throw 1; } })]) {
      const result = plan(input); hold(result); assert.equal(result.reference_plan, undefined);
    }
    assert.equal(callbacks, 0);
  });
  check("Buffer with Proxy prototype rejects without prototype traversal", () => {
    let callbacks = 0; const input = wire(request());
    Object.setPrototypeOf(input, new Proxy(Buffer.prototype, { getPrototypeOf() { callbacks++; throw 1; }, get() { callbacks++; throw 1; } }));
    hold(plan(input)); assert.equal(callbacks, 0);
  });
  check("all exported record entrypoints reject hostile objects before hooks", () => {
    let callbacks = 0; const input = new Proxy({}, { ownKeys() { callbacks++; throw 1; } });
    hold(plan(input)); assert.throws(() => successor.createDatanetChainCommitmentV1(input));
    assert.throws(() => successor.validateDatanetChainCommitmentV1(input)); assert.equal(callbacks, 0);
  });
  for (const [name, mutate] of [
    ["duplicate key", s => s.replace('"chain_id":"2050"', '"chain_id":"2050","chain_id":"2050"')],
    ["whitespace", s => s + "\n"], ["alternate escape", s => s.replace("2050", "\\u0032050" )],
    ["wrong key order", () => JSON.stringify(request())], ["malformed UTF-8", () => Buffer.from([0xc0, 0xaf])],
    ["BOM", s => "\ufeff" + s], ["depth", () => "[".repeat(1000) + "0" + "]".repeat(1000)],
    ["unknown field", s => s.replace('"local":', '"injected":true,"local":')],
    ["integer maximum plus one", s => s.replace('"checkpoint_height":"1951058"', '"checkpoint_height":"18446744073709551616"')],
    ["log maximum plus one", s => s.replace('"commitment_log_index":"7"', '"commitment_log_index":"4294967296"')],
    ["byte maximum plus one", s => s.replace(`"byte_length":"${payload.length}"`, '"byte_length":"268435457"')],
    ["noncanonical base64 padding", s => s.replace(payload.toString("base64"), payload.toString("base64").slice(0, -1))],
  ]) check(`bounded inert rejection: ${name}`, () => {
    const encoded = mutate(canonical(request())); const input = Buffer.isBuffer(encoded) ? encoded : Buffer.from(encoded);
    const counters = { callbacks: 0, hashes: 0, sorts: 0, bigints: 0, millionBigInts: 0, millionRegexes: 0, scalarTraversal: 0 };
    const restore = instrument(counters); let result;
    try { result = plan(input); } finally { restore(); }
    hold(result); assert.equal(result.reference_plan, undefined, name);
    assert.equal(counters.hashes, 0, name); assert.equal(counters.sorts, 0, name); assert.equal(counters.bigints, 0, name);
  });
  for (const count of [64, 256]) check(`existing ${count}-peer bound remains usable`, () => {
    const input = request(); input.policy.max_peer_candidates = count;
    for (let i = 1; i < count; i++) input.peers.push({
      peer_id: `p${String(i).padStart(3, "0")}`, retrieval_generation: "g0",
      object_id: null, commitment_id: null, payload: null, authenticated: false, accepts_repair: false,
    });
    assert.ok(wire(input).length <= 65536);
    const result = plan(wire(input)); hold(result);
    assert.equal(result.reference_plan.reference_candidate_results.length, count);
  });
  check("planner imports no filesystem network or repair capabilities", () => {
    const source = readFileSync(resolve(ROOT, HELPER), "utf8");
    const imports = [...source.matchAll(/from "([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(imports, ["node:crypto", "node:util"]);
    assert.doesNotMatch(source, /\b(?:require|eval|Function|fetch)\s*\(|\bimport\s*\(/);
  });
}

if (process.argv[2] === "--child") {
  await child(...process.argv.slice(3));
} else {
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === "--case-manifest"));
  focused(); const maximumDigest = await experiment();
  console.log("VOID_DATANET_BOUNDED_INGRESS_RECOVERY_EXPERIMENT_V1_GREEN");
  console.log("supervised_cases=36 profiles=2 attack_recovery_processes=144 baseline_processes=2");
  console.log("raw_hooks_reproduced=true raw_nonreturning_terminated=2 million_digit_regex_bigint_reproduced=true");
  console.log("successor_callbacks=0 rejected_hash_sort_bigint_operations=0 fresh_recovery_digest_stable=true");
  console.log("successor_max_ms=250 successor_max_rss_growth_bytes=8388608 successor_max_observed_scalar_traversal_calls=512");
  console.log(`exact_maximum_result_sha256=${maximumDigest}`);
  console.log("designated_host_evidence=false production_isolation_proven=false");
  console.log(`cases=${caseNames.length}`);
  if (process.argv[2] === "--case-manifest") console.log("case_manifest_json=" + JSON.stringify({
    schema: "VOID_DATANET_CASE_MANIFEST_V1", suite: "ingress", case_names: caseNames,
  }));
}
