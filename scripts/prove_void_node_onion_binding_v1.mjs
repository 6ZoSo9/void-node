#!/usr/bin/env node

import {
  createHash,
  generateKeyPairSync,
} from "node:crypto";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import {
  VOID_NODE_ONION_BINDING_MARKER,
  VOID_NODE_ONION_BINDING_PATHS,
  canonicalJsonV1,
  loadExistingVoidNodeKeypairV1,
  readAndVerifyVoidNodeOnionBindingV1,
  signVoidNodeOnionBindingV1,
  verifyVoidNodeOnionBindingV1,
} from "../tools/lib/void-node-onion-binding-v1.mjs";
import {
  VOID_TOR_DESCRIPTOR_PATHS,
  buildVoidTorDescriptorV1,
  encodeV3OnionHostname,
} from "../tools/lib/void-tor-onion-descriptor-v1.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BINDING_LIB = join(ROOT, "tools/lib/void-node-onion-binding-v1.mjs");
const BINDING_CLI = join(ROOT, "tools/void-node-onion-binding-v1.mjs");
const SERVER = join(ROOT, "tools/void-tor-onion-public-node-v1.mjs");
const DESCRIPTOR_LIB = join(ROOT, "tools/lib/void-tor-onion-descriptor-v1.mjs");
const DESCRIPTOR_CLI = join(ROOT, "tools/void-tor-onion-descriptor-v1.mjs");
const LIFECYCLE = join(ROOT, "ops/tor/void-tor-onion-transport-v1.sh");
const LIVE_HELPER = join(ROOT, "ops/tor/void-node-onion-binding-v1.sh");
const SCHEMA = join(ROOT, "schemas/void-node-onion-binding-v1.schema.json");
const TOR_SCHEMA = join(ROOT, "schemas/void-tor-onion-transport-v1.schema.json");
const EXAMPLE = join(ROOT, "examples/void-node-onion-binding-v1.example.json");
const DOC = join(ROOT, "docs/public-node/void-node-onion-binding-v1.md");
const WORKFLOW = join(ROOT, ".github/workflows/void-node-onion-binding-v1.yml");
const KEYPAIR_MODULE = join(ROOT, "src/crypto/keypair.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function mode(path) {
  return statSync(path).mode & 0o777;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\nstdout:\n${result.stdout || ""}\nstderr:\n${result.stderr || ""}`);
  }
  return result;
}

function assertThrows(callback, expectedText) {
  let error;
  try {
    callback();
  } catch (caught) {
    error = caught;
  }
  assert(error, `expected failure containing ${expectedText}`);
  assert(String(error.message || error).includes(expectedText), `failure did not contain ${expectedText}: ${error}`);
}

async function assertRejects(callback, expectedText) {
  let error;
  try {
    await callback();
  } catch (caught) {
    error = caught;
  }
  assert(error, `expected async failure containing ${expectedText}`);
  assert(String(error.message || error).includes(expectedText), `async failure did not contain ${expectedText}: ${error}`);
}

function rawRequest({ port, path, method = "GET" }) {
  return new Promise((resolvePromise, reject) => {
    const request = http.request({ host: "127.0.0.1", port, path, method }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolvePromise({ status: response.statusCode, body: Buffer.concat(chunks) }));
    });
    request.setTimeout(5_000, () => request.destroy(new Error("request timeout")));
    request.on("error", reject);
    request.end();
  });
}

async function startServer(hostnameFile, bindingFile = "") {
  const args = [
    SERVER,
    "--host", "127.0.0.1",
    "--port", "0",
    "--hostname-file", hostnameFile,
    "--virtual-port", "80",
  ];
  if (bindingFile) args.push("--binding-file", bindingFile);
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const port = await new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`server readiness timeout\n${stdout}\n${stderr}`));
    }, 8_000);
    const inspect = () => {
      const match = stdout.match(/^port=(\d+)$/m);
      if (stdout.includes("VOID_TOR_ONION_PUBLIC_NODE_V1_READY") && match) {
        clearTimeout(timeout);
        resolvePromise(Number(match[1]));
      }
    };
    child.stdout.on("data", inspect);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`server exited before readiness: ${code}\n${stderr}`));
    });
  });
  return { child, port };
}

async function stopServer(server) {
  if (server.child.exitCode !== null) return;
  const exited = new Promise((resolvePromise) => server.child.once("exit", resolvePromise));
  server.child.kill("SIGTERM");
  await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(new Error("server stop timeout")), 6_000))]);
  assert(server.child.exitCode === 0, `server exit code ${server.child.exitCode}`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function main() {
  for (const path of [BINDING_LIB, BINDING_CLI, SERVER, DESCRIPTOR_LIB, DESCRIPTOR_CLI, LIFECYCLE, LIVE_HELPER, SCHEMA, TOR_SCHEMA, EXAMPLE, DOC, WORKFLOW, KEYPAIR_MODULE]) {
    assert(statSync(path).isFile(), `required file missing: ${path}`);
  }
  run("bash", ["-n", LIFECYCLE]);
  run("bash", ["-n", LIVE_HELPER]);
  for (const path of [BINDING_LIB, BINDING_CLI, SERVER, DESCRIPTOR_LIB, DESCRIPTOR_CLI]) run(process.execPath, ["--check", path]);

  const temp = mkdtempSync(join(tmpdir(), "void-node-onion-binding-v1-proof-"));
  try {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const privatePath = join(temp, "node.key");
    const hostnamePath = join(temp, "hostname");
    const bindingPath = join(temp, "binding.json");
    writeFileSync(privatePath, privatePem, { mode: 0o600 });
    chmodSync(privatePath, 0o600);
    const onionHostname = encodeV3OnionHostname(createHash("sha256").update("binding-proof-onion").digest().subarray(0, 32));
    writeFileSync(hostnamePath, `${onionHostname}\n`, { mode: 0o600 });

    const loaded = await loadExistingVoidNodeKeypairV1(KEYPAIR_MODULE, privatePath);
    assert(typeof loaded.nodeId === "string", "loadKeypair node ID was not normalized to text");
    assert(loaded.nodeId.length >= 1 && loaded.nodeId.length <= 512, "loadKeypair node ID length is invalid");
    assert(loaded.nodeId.trim() === loaded.nodeId, "loadKeypair node ID contains surrounding whitespace");
    assert([...loaded.nodeId].every((character) => {
      const code = character.codePointAt(0);
      return code >= 0x21 && code <= 0x7e;
    }), "loadKeypair node ID is not printable ASCII");

    const commonJsPackage = join(temp, "commonjs-in-module-package");
    mkdirSync(commonJsPackage, { recursive: true, mode: 0o700 });
    writeFileSync(join(commonJsPackage, "package.json"), '{"type":"module"}\n', { mode: 0o600 });
    const commonJsNodeId = "void-node:fixture/Alpha+01";
    const commonJsKeypairModule = join(commonJsPackage, "keypair.js");
    writeFileSync(
      commonJsKeypairModule,
      [
        '"use strict";',
        'Object.defineProperty(exports, "__esModule", { value: true });',
        'exports.loadKeypair = loadKeypair;',
        'const crypto = require("node:crypto");',
        'const fs = require("node:fs");',
        'function loadKeypair(path) {',
        '  const privateKey = crypto.createPrivateKey(fs.readFileSync(path, "utf8"));',
        '  const publicKey = crypto.createPublicKey(privateKey);',
        '  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();',
        `  const nodeId = ${JSON.stringify(commonJsNodeId)};`,
        '  return { privateKey, publicKey, pubPEM, nodeId };',
        '}',
        '',
      ].join("\n"),
      { mode: 0o600 },
    );
    const commonJsLoaded = await loadExistingVoidNodeKeypairV1(commonJsKeypairModule, privatePath);
    assert(commonJsLoaded.nodeId === commonJsNodeId, "CommonJS loader did not preserve the canonical VOID node ID");

    const esmPackage = join(temp, "esm-keypair-package");
    mkdirSync(esmPackage, { recursive: true, mode: 0o700 });
    writeFileSync(join(esmPackage, "package.json"), '{"type":"module"}\n', { mode: 0o600 });
    const esmNodeId = "VOID.Node/CaseSensitive:01";
    const esmKeypairModule = join(esmPackage, "keypair.js");
    writeFileSync(
      esmKeypairModule,
      [
        'import { createPrivateKey, createPublicKey } from "node:crypto";',
        'import { readFileSync } from "node:fs";',
        'export function loadKeypair(path) {',
        '  const privateKey = createPrivateKey(readFileSync(path, "utf8"));',
        '  const publicKey = createPublicKey(privateKey);',
        '  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();',
        `  return { privateKey, publicKey, pubPEM, nodeId: ${JSON.stringify(esmNodeId)} };`,
        '}',
        '',
      ].join("\n"),
      { mode: 0o600 },
    );
    const esmLoaded = await loadExistingVoidNodeKeypairV1(esmKeypairModule, privatePath);
    assert(esmLoaded.nodeId === esmNodeId, "ESM loader changed node ID case or punctuation");

    for (const [label, expression, expected] of [
      ["printable-buffer", `Buffer.from(${JSON.stringify(commonJsNodeId)}, "ascii")`, commonJsNodeId],
      ["json-buffer", `Buffer.from(${JSON.stringify(commonJsNodeId)}, "ascii").toJSON()`, commonJsNodeId],
      ["binary-buffer", "Buffer.from([0, 1, 2, 255])", "000102ff"],
    ]) {
      const modulePath = join(commonJsPackage, `keypair-${label}.js`);
      const source = read(commonJsKeypairModule).replace(
        'return { privateKey, publicKey, pubPEM, nodeId };',
        `return { privateKey, publicKey, pubPEM, nodeId: ${expression} };`,
      );
      writeFileSync(modulePath, source, { mode: 0o600 });
      const variantLoaded = await loadExistingVoidNodeKeypairV1(modulePath, privatePath);
      assert(variantLoaded.nodeId === expected, `${label} node ID canonicalization drifted`);
    }

    const omittedNodeIdModule = join(commonJsPackage, "keypair-omitted-node-id.js");
    writeFileSync(
      omittedNodeIdModule,
      read(commonJsKeypairModule).replace(
        'return { privateKey, publicKey, pubPEM, nodeId };',
        'return { privateKey, pubPEM };',
      ),
      { mode: 0o600 },
    );
    const omittedLoaded = await loadExistingVoidNodeKeypairV1(omittedNodeIdModule, privatePath);
    const expectedDerivedNodeId = createHash("sha256").update(omittedLoaded.pubPEM).digest("hex");
    assert(omittedLoaded.nodeId === expectedDerivedNodeId, "omitted node ID did not derive the public-PEM fingerprint");
    assert(omittedLoaded.publicKey?.type === "public", "omitted publicKey was not reconstructed from pubPEM");

    for (const [label, expression, expectedText] of [
      ["leading-space", '" bad-node"', "surrounding whitespace"],
      ["embedded-space", '"bad node"', "printable ASCII without whitespace"],
      ["control", '"bad\\nnode"', "printable ASCII without whitespace"],
      ["oversized", '"x".repeat(513)', "length is invalid"],
      ["object", '{ value: "node" }', "string or byte sequence"],
    ]) {
      const modulePath = join(commonJsPackage, `keypair-invalid-${label}.js`);
      const source = read(commonJsKeypairModule).replace(
        'return { privateKey, publicKey, pubPEM, nodeId };',
        `return { privateKey, publicKey, pubPEM, nodeId: ${expression} };`,
      );
      writeFileSync(modulePath, source, { mode: 0o600 });
      await assertRejects(
        () => loadExistingVoidNodeKeypairV1(modulePath, privatePath),
        expectedText,
      );
    }

    const mismatchedPairModule = join(commonJsPackage, "keypair-mismatched-pair.js");
    writeFileSync(
      mismatchedPairModule,
      read(commonJsKeypairModule).replace(
        'const publicKey = crypto.createPublicKey(privateKey);',
        'const publicKey = crypto.generateKeyPairSync("ed25519").publicKey;',
      ),
      { mode: 0o600 },
    );
    await assertRejects(
      () => loadExistingVoidNodeKeypairV1(mismatchedPairModule, privatePath),
      "mismatched private/public keys",
    );

    const issuedAt = "2026-07-30T06:00:00.000Z";
    const expiresAt = "2027-01-26T06:00:00.000Z";
    const binding = signVoidNodeOnionBindingV1({
      nodeId: loaded.nodeId,
      privateKey: loaded.privateKey,
      publicKey: loaded.publicKey,
      onionHostname,
      virtualPort: 80,
      issuedAt,
      expiresAt,
    });
    const verified = verifyVoidNodeOnionBindingV1(binding, {
      expectedNodeId: loaded.nodeId,
      expectedOnionHostname: onionHostname,
      expectedVirtualPort: 80,
      now: issuedAt,
      allowNotYetValidWithinSkew: true,
    });
    assert(verified.summary.node_id === loaded.nodeId, "verified node ID mismatch");
    assert(canonicalJsonV1({ z: 1, a: { y: 2, x: 3 } }) === '{"a":{"x":3,"y":2},"z":1}', "canonical JSON ordering drift");

    for (const [label, mutate, expected] of [
      ["node ID", (v) => { v.node.node_id = "void-node:tampered"; }, "signature verification"],
      ["onion", (v) => { v.transport.onion_hostname = encodeV3OnionHostname(createHash("sha256").update("other-onion").digest().subarray(0, 32)); }, "transport profile"],
      ["URI", (v) => { v.transport.uri = "http://example.invalid"; }, "transport profile"],
      ["authority", (v) => { v.authority.transaction_submission = true; }, "authority.transaction_submission"],
      ["signature", (v) => { v.signature.value = Buffer.alloc(64, 7).toString("base64"); }, "signature verification"],
      ["unknown field", (v) => { v.extra = true; }, "keys mismatch"],
    ]) {
      const tampered = clone(binding);
      mutate(tampered);
      assertThrows(() => verifyVoidNodeOnionBindingV1(tampered, { now: issuedAt, allowNotYetValidWithinSkew: true }), expected);
    }
    assertThrows(() => verifyVoidNodeOnionBindingV1(binding, { now: expiresAt }), "expired");

    const cli = run(process.execPath, [
      BINDING_CLI, "create",
      "--key-file", privatePath,
      "--keypair-module", KEYPAIR_MODULE,
      "--hostname-file", hostnamePath,
      "--output", bindingPath,
      "--expected-node-id", loaded.nodeId,
      "--virtual-port", "80",
      "--issued-at", issuedAt,
      "--expires-at", expiresAt,
    ]);
    assert(cli.stdout.includes("VOID_NODE_ONION_BINDING_V1_CREATE_GREEN"), "binding CLI create marker missing");
    assert(!cli.stdout.includes(privatePath), "binding CLI disclosed the private-key path");
    assert(mode(bindingPath) === 0o600, "binding output mode is not 0600");
    const cliBinding = readAndVerifyVoidNodeOnionBindingV1(bindingPath, {
      expectedNodeId: loaded.nodeId,
      expectedOnionHostname: onionHostname,
      expectedVirtualPort: 80,
      now: issuedAt,
      allowNotYetValidWithinSkew: true,
    });
    assert(cliBinding.binding.signature.value === binding.signature.value, "CLI binding drifted from library output");

    const commonJsBindingPath = join(temp, "binding-commonjs.json");
    const commonJsCli = run(process.execPath, [
      BINDING_CLI, "create",
      "--key-file", privatePath,
      "--keypair-module", commonJsKeypairModule,
      "--hostname-file", hostnamePath,
      "--output", commonJsBindingPath,
      "--expected-node-id", commonJsLoaded.nodeId,
      "--virtual-port", "80",
      "--issued-at", issuedAt,
      "--expires-at", expiresAt,
    ]);
    assert(commonJsCli.stdout.includes("VOID_NODE_ONION_BINDING_V1_CREATE_GREEN"), "CommonJS compatibility CLI create marker missing");
    const commonJsCliBinding = readAndVerifyVoidNodeOnionBindingV1(commonJsBindingPath, {
      expectedNodeId: commonJsLoaded.nodeId,
      expectedOnionHostname: onionHostname,
      expectedVirtualPort: 80,
      now: issuedAt,
      allowNotYetValidWithinSkew: true,
    });
    assert(commonJsCliBinding.summary.node_id === commonJsLoaded.nodeId, "CommonJS CLI did not preserve the canonical node ID");
    assert(commonJsCliBinding.binding.signature.value !== binding.signature.value, "different signed node IDs produced the same signature");
    const caseMismatch = spawnSync(process.execPath, [
      BINDING_CLI, "create",
      "--key-file", privatePath,
      "--keypair-module", esmKeypairModule,
      "--hostname-file", hostnamePath,
      "--output", join(temp, "case-mismatch.json"),
      "--expected-node-id", esmLoaded.nodeId.toLowerCase(),
      "--issued-at", issuedAt,
      "--expires-at", expiresAt,
    ], { cwd: ROOT, encoding: "utf8" });
    assert(caseMismatch.status !== 0, "CLI case-folded the canonical VOID node ID");

    chmodSync(privatePath, 0o644);
    const permissiveKey = spawnSync(process.execPath, [BINDING_CLI, "create", "--key-file", privatePath, "--keypair-module", KEYPAIR_MODULE, "--hostname-file", hostnamePath, "--output", join(temp, "bad.json"), "--expected-node-id", loaded.nodeId, "--issued-at", issuedAt, "--expires-at", expiresAt], { cwd: ROOT, encoding: "utf8" });
    assert(permissiveKey.status !== 0, "CLI accepted a group/world-readable private key");
    chmodSync(privatePath, 0o600);

    const descriptor = buildVoidTorDescriptorV1({ onionHostname, localPort: 18088, virtualPort: 80, generatedAt: issuedAt, status: "active", nodeBinding: cliBinding.summary });
    assert(descriptor.identity.signed_void_node_binding === true, "descriptor did not expose signed binding");
    assert(descriptor.identity.node_id === loaded.nodeId, "descriptor node ID mismatch");

    const unboundServer = await startServer(hostnamePath);
    try {
      for (const path of VOID_NODE_ONION_BINDING_PATHS) assert((await rawRequest({ port: unboundServer.port, path })).status === 404, `unbound binding route ${path} was not 404`);
      const response = await rawRequest({ port: unboundServer.port, path: VOID_TOR_DESCRIPTOR_PATHS[0] });
      assert(response.status === 200, "unbound descriptor failed");
      assert(JSON.parse(response.body).identity.signed_void_node_binding === false, "unbound descriptor claims binding");
    } finally {
      await stopServer(unboundServer);
    }

    const signedServer = await startServer(hostnamePath, bindingPath);
    try {
      const bodies = [];
      for (const path of VOID_NODE_ONION_BINDING_PATHS) {
        const response = await rawRequest({ port: signedServer.port, path });
        assert(response.status === 200, `signed binding route ${path} status ${response.status}`);
        bodies.push(response.body.toString("utf8"));
      }
      assert(bodies[0] === bodies[1], "binding route aliases differ");
      const servedBinding = JSON.parse(bodies[0]);
      assert(servedBinding.node.node_id === loaded.nodeId, "served binding node ID mismatch");
      const descriptorResponse = await rawRequest({ port: signedServer.port, path: VOID_TOR_DESCRIPTOR_PATHS[0] });
      assert(descriptorResponse.status === 200, "signed descriptor failed");
      const servedDescriptor = JSON.parse(descriptorResponse.body);
      assert(servedDescriptor.identity.signed_void_node_binding === true, "signed descriptor omitted binding");
      assert(servedDescriptor.identity.node_id === loaded.nodeId, "signed descriptor node ID mismatch");
      const post = await rawRequest({ port: signedServer.port, path: VOID_NODE_ONION_BINDING_PATHS[0], method: "POST" });
      assert(post.status === 405, "binding route accepted POST");

      const tampered = clone(binding);
      tampered.authority.work_credit_write = true;
      writeFileSync(bindingPath, `${JSON.stringify(tampered, null, 2)}\n`, { mode: 0o600 });
      assert((await rawRequest({ port: signedServer.port, path: VOID_NODE_ONION_BINDING_PATHS[0] })).status === 503, "tampered binding route did not fail closed");
      assert((await rawRequest({ port: signedServer.port, path: VOID_TOR_DESCRIPTOR_PATHS[0] })).status === 503, "tampered binding descriptor did not fail closed");
      writeFileSync(bindingPath, `${JSON.stringify(binding, null, 2)}\n`, { mode: 0o600 });
    } finally {
      await stopServer(signedServer);
    }

    const home = join(temp, "home");
    mkdirSync(home, { recursive: true, mode: 0o700 });
    const env = {
      ...process.env,
      HOME: home,
      XDG_CONFIG_HOME: join(home, ".config"),
      XDG_DATA_HOME: join(home, ".local/share"),
      XDG_STATE_HOME: join(home, ".local/state"),
      VOID_REPO: ROOT,
      VOID_TOR_BIN: "/usr/bin/true",
    };
    const render = join(temp, "render");
    const plan = run("bash", [LIVE_HELPER, "plan"], { env }).stdout;
    assert(plan.includes("uses_existing_void_node_key=true"), "live helper does not require existing node key");
    assert(plan.includes("parallel_identity_key=false"), "live helper permits parallel identity key");
    assert(plan.includes("service_restart=false"), "live helper restart boundary missing");
    run("bash", [LIFECYCLE, "render", render], { env });
    const runner = read(join(render, "run-public-node.sh"));
    const manifest = read(join(render, "render-manifest.txt"));
    assert(runner.includes("--binding-file"), "Tor runner omitted binding file");
    assert(runner.includes("VOID_NODE_ONION_BINDING_FILE"), "Tor runner omitted binding environment");
    assert(manifest.includes("binding_file="), "render manifest omitted binding file");
    assert(manifest.includes("optional-fail-closed-v1"), "render manifest omitted fail-closed binding state");

    const schema = JSON.parse(read(SCHEMA));
    assert(schema.properties.marker.const === VOID_NODE_ONION_BINDING_MARKER, "binding schema marker mismatch");
    assert(schema.properties.authority.properties.read_only.const === true, "binding schema read-only boundary missing");
    assert(schema.properties.node.properties.node_id.pattern === "^[!-~]{1,512}$", "binding schema does not preserve bounded printable node IDs");
    const torSchema = JSON.parse(read(TOR_SCHEMA));
    assert(Array.isArray(torSchema.properties.identity.oneOf) && torSchema.properties.identity.oneOf.length === 2, "Tor descriptor schema does not permit exactly bound and unbound identity states");
    assert(torSchema.properties.identity.oneOf[1].properties.node_id.pattern === "^[!-~]{1,512}$", "Tor descriptor schema still requires a key-derived node ID");
    const example = JSON.parse(read(EXAMPLE));
    assert(example.marker === VOID_NODE_ONION_BINDING_MARKER, "binding example marker mismatch");
    assert(example.signature.value.length === 88, "binding example signature length mismatch");

    const docs = read(DOC);
    for (const statement of ["same key through `src/crypto/keypair.js`", "no node or Tor restart is required", "fails closed with HTTP 503", "does not expose or enable transaction submission", "preserves the live `nodeId` exactly", "public-key derivation of the node ID is not required"]) assert(docs.includes(statement), `documentation missing: ${statement}`);
    const helperSource = read(LIVE_HELPER);
    assert(!helperSource.includes("toLowerCase()"), "live helper case-folds the canonical node ID");
    assert(helperSource.includes("canonical printable VOID nodeId"), "live helper canonical node-ID boundary missing");
    const workflow = read(WORKFLOW);
    assert(workflow.includes("node-version: 22"), "workflow does not pin Node 22");
    assert(workflow.includes("prove_void_node_onion_binding_v1.mjs"), "workflow binding proof missing");
    assert(workflow.includes("prove_void_tor_onion_transport_v1.mjs"), "workflow regression proof missing");

    const sourceDigest = createHash("sha256")
      .update(read(BINDING_LIB))
      .update(read(BINDING_CLI))
      .update(read(SERVER))
      .update(read(LIFECYCLE))
      .digest("hex");
    console.log("VOID_NODE_ONION_BINDING_V1_PROOF_GREEN");
    console.log(`marker=${VOID_NODE_ONION_BINDING_MARKER}`);
    console.log(`proof_source_sha256=${sourceDigest}`);
    console.log("uses_existing_void_node_key=true");
    console.log("canonical_void_node_id_preserved=true");
    console.log("node_id_key_possession_attestation=ed25519-signature");
    console.log("node_id_public_key_derivation_required=false");
    console.log("health_node_id_exact_match_required=true");
    console.log("parallel_identity_key=false");
    console.log("binding_routes=2");
    console.log("descriptor_fail_closed=true");
    console.log("service_restart=false");
    console.log("read_only=true");
    console.log("runtime_mutation=false");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("VOID_NODE_ONION_BINDING_V1_PROOF_FAIL");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
