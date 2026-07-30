#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import {
  VOID_TOR_DESCRIPTOR_PATHS,
  VOID_TOR_ONION_TRANSPORT_MARKER,
  buildVoidTorDescriptorV1,
  encodeV3OnionHostname,
  validateV3OnionHostname,
} from "../tools/lib/void-tor-onion-descriptor-v1.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LIFECYCLE = join(ROOT, "ops/tor/void-tor-onion-transport-v1.sh");
const SERVER = join(ROOT, "tools/void-tor-onion-public-node-v1.mjs");
const DESCRIPTOR_CLI = join(ROOT, "tools/void-tor-onion-descriptor-v1.mjs");
const SCHEMA = join(ROOT, "schemas/void-tor-onion-transport-v1.schema.json");
const EXAMPLE = join(ROOT, "examples/void-tor-onion-transport-v1.example.json");
const DOC = join(ROOT, "docs/public-node/void-tor-onion-transport-v1.md");
const WORKFLOW = join(ROOT, ".github/workflows/void-tor-onion-transport-v1.yml");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\nstdout:\n${result.stdout || ""}\nstderr:\n${result.stderr || ""}`,
    );
  }
  return result;
}

function listFiles(root) {
  const output = [];
  const walk = (path, prefix = "") => {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const entryPath = join(path, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(entryPath, relative);
      else output.push(relative);
    }
  };
  walk(root);
  return output;
}

function rawHttpRequest({ port, path, method = "GET" }) {
  return new Promise((resolvePromise, reject) => {
    const request = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers: { host: "localhost" },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolvePromise({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    request.setTimeout(5_000, () => request.destroy(new Error("request timeout")));
    request.on("error", reject);
    request.end();
  });
}

async function startServer(hostnameFile) {
  const child = spawn(
    process.execPath,
    [
      SERVER,
      "--host",
      "127.0.0.1",
      "--port",
      "0",
      "--hostname-file",
      hostnameFile,
      "--virtual-port",
      "80",
    ],
    {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const port = await new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`server readiness timeout\nstdout:\n${stdout}\nstderr:\n${stderr}`));
    }, 8_000);

    const inspect = () => {
      const match = stdout.match(/^port=(\d+)$/m);
      if (stdout.includes("VOID_TOR_ONION_PUBLIC_NODE_V1_READY") && match) {
        clearTimeout(timeout);
        resolvePromise(Number(match[1]));
      }
    };
    child.stdout.on("data", inspect);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`server exited before readiness: code=${code} signal=${signal}\n${stderr}`));
    });
  });

  return { child, port, getStdout: () => stdout, getStderr: () => stderr };
}

async function stopServer(server) {
  if (server.child.exitCode !== null) return;
  const exited = new Promise((resolvePromise) => server.child.once("exit", resolvePromise));
  server.child.kill("SIGTERM");
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("server did not terminate")), 6_000),
  );
  await Promise.race([exited, timeout]);
  assert(server.child.exitCode === 0, `server exit code was ${server.child.exitCode}`);
}

function mode(path) {
  return statSync(path).mode & 0o777;
}

function writeRootSentinel(root, kind) {
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const body = [
    `marker=${VOID_TOR_ONION_TRANSPORT_MARKER}`,
    `kind=${kind}`,
    `path=${resolve(root)}`,
    `owner_uid=${process.getuid()}`,
    "",
  ].join("\n");
  writeFileSync(join(root, ".void-tor-onion-transport-v1-owned"), body, { mode: 0o600 });
}

async function main() {
  const requiredFiles = [LIFECYCLE, SERVER, DESCRIPTOR_CLI, SCHEMA, EXAMPLE, DOC, WORKFLOW];
  for (const path of requiredFiles) assert(statSync(path).isFile(), `required file missing: ${path}`);

  run("bash", ["-n", LIFECYCLE]);
  run(process.execPath, ["--check", SERVER]);
  run(process.execPath, ["--check", DESCRIPTOR_CLI]);

  const temp = mkdtempSync(join(tmpdir(), "void-tor-onion-transport-v1-proof-"));
  const home = join(temp, "home");
  const render = join(temp, "render");
  mkdirSync(home, { recursive: true, mode: 0o700 });

  try {
    const env = {
      ...process.env,
      HOME: home,
      XDG_CONFIG_HOME: join(home, ".config"),
      XDG_DATA_HOME: join(home, ".local/share"),
      XDG_STATE_HOME: join(home, ".local/state"),
      VOID_REPO: ROOT,
      VOID_TOR_PUBLIC_NODE_PORT: "18088",
      VOID_TOR_SOCKS_PORT: "19050",
      VOID_TOR_VIRTUAL_PORT: "80",
      VOID_TOR_BIN: "/usr/bin/tor",
    };

    const homeBeforePlan = listFiles(home);
    const plan = run("bash", [LIFECYCLE, "plan"], { env }).stdout;
    const homeAfterPlan = listFiles(home);
    assert(JSON.stringify(homeBeforePlan) === JSON.stringify(homeAfterPlan), "plan mutated HOME");
    for (const expected of [
      "plan_mutation=false",
      "root_leaf_guard=tor-onion-v1",
      "root_ownership_sentinel=.void-tor-onion-transport-v1-owned",
      "managed_roots_non_overlapping=true",
      "read_only=true",
      "transaction_submission=false",
      "p2p_listener=false",
      "mcp_listener=false",
      "wallet_or_signer_access=false",
      "work_credit_write=false",
      "void_settlement=false",
      "node_runtime_mutation=false",
    ]) {
      assert(plan.includes(expected), `plan missing ${expected}`);
    }

    const lexicalEscape = spawnSync("bash", [LIFECYCLE, "plan"], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...env, VOID_TOR_DATA_ROOT: join(home, "..", "escaped-data") },
    });
    assert(lexicalEscape.status !== 0, "lexical user-tree escape was accepted");
    assert(
      `${lexicalEscape.stdout}${lexicalEscape.stderr}`.includes("must resolve beneath HOME"),
      "lexical user-tree escape did not fail with the path boundary",
    );

    const outside = join(temp, "outside");
    const linkedRoot = join(home, "linked-outside");
    mkdirSync(outside, { recursive: true, mode: 0o700 });
    symlinkSync(outside, linkedRoot, "dir");
    const symlinkEscape = spawnSync("bash", [LIFECYCLE, "plan"], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...env, VOID_TOR_DATA_ROOT: join(linkedRoot, "data") },
    });
    assert(symlinkEscape.status !== 0, "symlink user-tree escape was accepted");
    assert(
      `${symlinkEscape.stdout}${symlinkEscape.stderr}`.includes("must resolve beneath HOME"),
      "symlink user-tree escape did not fail with the path boundary",
    );

    const broadRoot = spawnSync("bash", [LIFECYCLE, "plan"], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...env, VOID_TOR_CONFIG_ROOT: join(home, ".config") },
    });
    assert(broadRoot.status !== 0, "broad configuration root was accepted");
    assert(
      `${broadRoot.stdout}${broadRoot.stderr}`.includes("must end in /tor-onion-v1"),
      "broad configuration root did not fail with the dedicated-root boundary",
    );

    const overlappingRoot = join(home, "overlapping-roots", "tor-onion-v1");
    const overlap = spawnSync("bash", [LIFECYCLE, "plan"], {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...env,
        VOID_TOR_CONFIG_ROOT: overlappingRoot,
        VOID_TOR_DATA_ROOT: overlappingRoot,
      },
    });
    assert(overlap.status !== 0, "overlapping managed roots were accepted");
    assert(
      `${overlap.stdout}${overlap.stderr}`.includes("must not overlap"),
      "overlapping managed roots did not fail with the overlap boundary",
    );

    const renderResult = run("bash", [LIFECYCLE, "render", render], { env }).stdout;
    assert(renderResult.includes("VOID_TOR_ONION_TRANSPORT_V1_RENDER_GREEN"), "render marker missing");
    const renderedFiles = listFiles(render);
    assert(
      JSON.stringify(renderedFiles) ===
        JSON.stringify([
          "render-manifest.txt",
          "run-public-node.sh",
          "run-tor.sh",
          "systemd/user/void-public-node-tor-backend-v1.service",
          "systemd/user/void-tor-onion-transport-v1.service",
          "torrc",
        ]),
      `unexpected render file set: ${renderedFiles.join(", ")}`,
    );

    const torrc = read(join(render, "torrc"));
    assert(torrc.includes("HiddenServiceVersion 3"), "torrc does not pin v3");
    assert(torrc.includes(`DataDirectory "${join(home, ".local/share/void/tor-onion-v1/data")}"`), "quoted data directory mismatch");
    assert(torrc.includes(`HiddenServiceDir "${join(home, ".local/share/void/tor-onion-v1/hidden-service")}"`), "quoted hidden-service directory mismatch");
    assert(torrc.includes("HiddenServicePort 80 127.0.0.1:18088"), "hidden-service mapping mismatch");
    assert(torrc.includes("SocksPort 127.0.0.1:19050 IsolateSOCKSAuth"), "SOCKS mapping mismatch");
    assert((torrc.match(/^HiddenServicePort /gm) || []).length === 1, "unexpected extra hidden-service port");
    for (const forbidden of ["0.0.0.0", ":4100", ":4700", "/etc/tor", "hs_ed25519_secret_key", "ControlPort"] ) {
      assert(!torrc.includes(forbidden), `torrc contains forbidden value: ${forbidden}`);
    }

    const publicRunner = read(join(render, "run-public-node.sh"));
    assert(publicRunner.includes("--host 127.0.0.1"), "public-node runner is not loopback-bound");
    assert(publicRunner.includes("void-tor-onion-public-node-v1.mjs"), "wrong public-node server");
    assert(publicRunner.includes("--binding-file"), "public-node runner does not pass the optional binding file");
    const manifest = read(join(render, "render-manifest.txt"));
    for (const expected of [
      "canonical_void_node_identity=conditional-signed-binding-v1",
      "signed_void_node_binding=optional-fail-closed-v1",
      "transaction_submission=false",
      "p2p_listener=false",
      "mcp_listener=false",
      "wallet_or_signer_access=false",
      "work_credit_write=false",
      "void_settlement=false",
      "node_runtime_mutation=false",
    ]) {
      assert(manifest.includes(expected), `render manifest missing ${expected}`);
    }

    const backendUnitPath = join(render, "systemd/user/void-public-node-tor-backend-v1.service");
    const torUnitPath = join(render, "systemd/user/void-tor-onion-transport-v1.service");
    const backendUnit = read(backendUnitPath);
    const torUnit = read(torUnitPath);
    assert(!backendUnit.includes("WorkingDirectory="), "backend unit must rely on the runner-owned repository chdir");
    const systemdAnalyzeVersion = spawnSync("systemd-analyze", ["--version"], { encoding: "utf8" });
    if (systemdAnalyzeVersion.status === 0) {
      const unitVerify = spawnSync(
        "systemd-analyze",
        ["--system", "--man=no", "--generators=no", "verify", backendUnitPath, torUnitPath],
        { encoding: "utf8" },
      );
      assert(
        unitVerify.status === 0,
        `rendered systemd unit verification failed\nstdout:\n${unitVerify.stdout || ""}\nstderr:\n${unitVerify.stderr || ""}`,
      );
    }
    for (const unit of [backendUnit, torUnit]) {
      for (const hardening of [
        "NoNewPrivileges=true",
        "PrivateTmp=true",
        "ProtectSystem=strict",
        "ProtectHome=read-only",
        "UMask=0077",
      ]) {
        assert(unit.includes(hardening), `unit missing ${hardening}`);
      }
    }
    assert(torUnit.includes("Requires=void-public-node-tor-backend-v1.service"), "Tor unit does not require backend");
    assert(mode(join(render, "torrc")) === 0o600, "torrc mode is not 0600");
    assert(mode(join(render, "run-public-node.sh")) === 0o700, "public runner mode is not 0700");
    assert(mode(join(render, "run-tor.sh")) === 0o700, "Tor runner mode is not 0700");

    const lifecycle = read(LIFECYCLE);
    assert(!lifecycle.includes("/etc/tor/torrc"), "lifecycle script mutates system torrc");
    assert(lifecycle.includes("canonical_user_tree"), "canonical user-tree boundary missing");
    assert(lifecycle.includes("realpath -m --"), "realpath path canonicalization missing");
    assert(lifecycle.includes("PURGE_VOID_TOR_ONION_IDENTITY_V1"), "identity purge confirmation missing");
    assert(lifecycle.includes("identity_preserved=true"), "default uninstall does not preserve identity");
    assert(lifecycle.includes("--socks5-hostname"), "remote DNS-safe SOCKS probe missing");
    assert(lifecycle.includes(".void-tor-onion-transport-v1-owned"), "managed-root sentinel missing");
    assert(lifecycle.includes("verify_owned_root_or_absent"), "destructive root verification missing");
    assert(lifecycle.includes('prepare_owned_root "$STATE_ROOT" "state"'), "verify state ownership preparation missing");
    assert(lifecycle.includes('canonical_executable "$VOID_TOR_BIN"'), "VOID_TOR_BIN validation missing");

    const mockBin = join(temp, "mock-bin");
    mkdirSync(mockBin, { recursive: true, mode: 0o700 });
    const mockSystemctl = join(mockBin, "systemctl");
    writeFileSync(mockSystemctl, "#!/usr/bin/env bash\nexit 0\n", { mode: 0o700 });
    chmodSync(mockSystemctl, 0o700);
    const mockCurl = join(mockBin, "curl");
    writeFileSync(mockCurl, "#!/usr/bin/env bash\nexit 1\n", { mode: 0o700 });
    chmodSync(mockCurl, 0o700);
    const cleanupEnv = { ...env, PATH: `${mockBin}:${env.PATH}` };

    const unsafeConfigRoot = join(home, "unsafe-config", "tor-onion-v1");
    const unsafeConfigVictim = join(unsafeConfigRoot, "must-survive.txt");
    mkdirSync(unsafeConfigRoot, { recursive: true, mode: 0o700 });
    writeFileSync(unsafeConfigVictim, "survive\n", { mode: 0o600 });
    const unsafeUninstall = spawnSync("bash", [LIFECYCLE, "uninstall"], {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...cleanupEnv,
        VOID_TOR_CONFIG_ROOT: unsafeConfigRoot,
        VOID_TOR_DATA_ROOT: join(home, "unsafe-data", "tor-onion-v1"),
        VOID_TOR_STATE_ROOT: join(home, "unsafe-state", "tor-onion-v1"),
      },
    });
    assert(unsafeUninstall.status !== 0, "uninstall accepted an unowned configuration root");
    assert(
      `${unsafeUninstall.stdout}${unsafeUninstall.stderr}`.includes("sentinel missing"),
      "unowned configuration root did not fail on the ownership sentinel",
    );
    assert(existsSync(unsafeConfigVictim), "uninstall deleted an unowned configuration root");

    const safeConfigRoot = join(home, "safe-config", "tor-onion-v1");
    const safeDataRoot = join(home, "safe-data", "tor-onion-v1");
    const safeStateRoot = join(home, "safe-state", "tor-onion-v1");
    writeRootSentinel(safeConfigRoot, "config");
    writeRootSentinel(safeStateRoot, "state");
    writeFileSync(join(safeConfigRoot, "owned.txt"), "owned\n", { mode: 0o600 });
    writeFileSync(join(safeStateRoot, "owned.txt"), "owned\n", { mode: 0o600 });
    const safeUninstall = run("bash", [LIFECYCLE, "uninstall"], {
      env: {
        ...cleanupEnv,
        VOID_TOR_CONFIG_ROOT: safeConfigRoot,
        VOID_TOR_DATA_ROOT: safeDataRoot,
        VOID_TOR_STATE_ROOT: safeStateRoot,
      },
    });
    assert(safeUninstall.stdout.includes("VOID_TOR_ONION_TRANSPORT_V1_UNINSTALL_GREEN"), "owned-root uninstall marker missing");
    assert(!existsSync(safeConfigRoot), "owned configuration root survived uninstall");
    assert(!existsSync(safeStateRoot), "owned state root survived uninstall");

    const unsafePurgeConfigRoot = join(home, "unsafe-purge-config", "tor-onion-v1");
    const unsafePurgeDataRoot = join(home, "unsafe-purge-data", "tor-onion-v1");
    const unsafePurgeStateRoot = join(home, "unsafe-purge-state", "tor-onion-v1");
    const unsafePurgeVictim = join(unsafePurgeDataRoot, "identity-must-survive.txt");
    mkdirSync(unsafePurgeDataRoot, { recursive: true, mode: 0o700 });
    writeFileSync(unsafePurgeVictim, "identity\n", { mode: 0o600 });
    const unsafePurge = spawnSync(
      "bash",
      [LIFECYCLE, "purge-identity", "PURGE_VOID_TOR_ONION_IDENTITY_V1"],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: {
          ...cleanupEnv,
          VOID_TOR_CONFIG_ROOT: unsafePurgeConfigRoot,
          VOID_TOR_DATA_ROOT: unsafePurgeDataRoot,
          VOID_TOR_STATE_ROOT: unsafePurgeStateRoot,
        },
      },
    );
    assert(unsafePurge.status !== 0, "identity purge accepted an unowned data root");
    assert(
      `${unsafePurge.stdout}${unsafePurge.stderr}`.includes("sentinel missing"),
      "unowned identity root did not fail on the ownership sentinel",
    );
    assert(existsSync(unsafePurgeVictim), "identity purge deleted an unowned data root");

    const purgeConfigRoot = join(home, "purge-config", "tor-onion-v1");
    const purgeDataRoot = join(home, "purge-data", "tor-onion-v1");
    const purgeStateRoot = join(home, "purge-state", "tor-onion-v1");
    writeRootSentinel(purgeConfigRoot, "config");
    writeRootSentinel(purgeDataRoot, "data");
    writeRootSentinel(purgeStateRoot, "state");
    mkdirSync(join(purgeDataRoot, "hidden-service"), { recursive: true, mode: 0o700 });
    writeFileSync(join(purgeDataRoot, "hidden-service", "identity-key"), "test-only\n", { mode: 0o600 });
    const safePurge = run(
      "bash",
      [LIFECYCLE, "purge-identity", "PURGE_VOID_TOR_ONION_IDENTITY_V1"],
      {
        env: {
          ...cleanupEnv,
          VOID_TOR_CONFIG_ROOT: purgeConfigRoot,
          VOID_TOR_DATA_ROOT: purgeDataRoot,
          VOID_TOR_STATE_ROOT: purgeStateRoot,
        },
      },
    );
    assert(safePurge.stdout.includes("VOID_TOR_ONION_TRANSPORT_V1_IDENTITY_PURGED"), "owned identity purge marker missing");
    assert(!existsSync(purgeConfigRoot), "owned configuration root survived identity purge");
    assert(!existsSync(purgeStateRoot), "owned state root survived identity purge");
    assert(!existsSync(purgeDataRoot), "owned data root survived identity purge");

    const publicKey = Buffer.from(Array.from({ length: 32 }, (_, index) => index));
    const onionHostname = encodeV3OnionHostname(publicKey);
    assert(
      onionHostname === "aaaqeayeaudaocajbifqydiob4ibceqtcqkrmfyydenbwha5dyp3kead.onion",
      "deterministic v3 onion encoding changed",
    );
    assert(validateV3OnionHostname(onionHostname) === onionHostname, "valid v3 onion rejected");
    const badHostname = `${onionHostname[0] === "a" ? "b" : "a"}${onionHostname.slice(1)}`;
    assertThrows(() => validateV3OnionHostname(badHostname), "checksum-damaged onion was accepted");

    const verifyConfigRoot = join(home, "verify-config", "tor-onion-v1");
    const verifyDataRoot = join(home, "verify-data", "tor-onion-v1");
    const verifyStateRoot = join(home, "verify-state", "tor-onion-v1");
    writeRootSentinel(verifyDataRoot, "data");
    const verifyHiddenService = join(verifyDataRoot, "hidden-service");
    mkdirSync(verifyHiddenService, { recursive: true, mode: 0o700 });
    writeFileSync(join(verifyHiddenService, "hostname"), `${onionHostname}\n`, { mode: 0o600 });
    const failedStandaloneVerify = spawnSync("bash", [LIFECYCLE, "verify"], {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...cleanupEnv,
        VOID_TOR_CONFIG_ROOT: verifyConfigRoot,
        VOID_TOR_DATA_ROOT: verifyDataRoot,
        VOID_TOR_STATE_ROOT: verifyStateRoot,
      },
    });
    assert(failedStandaloneVerify.status !== 0, "mocked standalone verify unexpectedly succeeded");
    const verifyStateSentinel = join(verifyStateRoot, ".void-tor-onion-transport-v1-owned");
    assert(existsSync(verifyStateSentinel), "failed verify left the state root without an ownership sentinel");
    assert(read(verifyStateSentinel).includes(`path=${resolve(verifyStateRoot)}`), "verify state sentinel path mismatch");
    assert(existsSync(join(verifyStateRoot, "transport.json")), "standalone verify did not write its managed descriptor");

    const generatedAt = "2026-07-29T00:00:00.000Z";
    const descriptor = buildVoidTorDescriptorV1({
      onionHostname,
      localPort: 18088,
      virtualPort: 80,
      generatedAt,
      status: "active",
    });
    const example = JSON.parse(read(EXAMPLE));
    assert(JSON.stringify(descriptor) === JSON.stringify(example), "descriptor example drifted from implementation");
    const nonDefaultDescriptor = buildVoidTorDescriptorV1({
      onionHostname,
      localPort: 18088,
      virtualPort: 8080,
      generatedAt,
      status: "active",
    });
    assert(
      nonDefaultDescriptor.transport.uri === `http://${onionHostname}:8080`,
      "non-default virtual port is missing from the onion URI",
    );
    const schema = JSON.parse(read(SCHEMA));
    const uriPattern = new RegExp(schema.properties.transport.properties.uri.pattern);
    assert(uriPattern.test(descriptor.transport.uri), "schema rejected the default onion URI");
    assert(uriPattern.test(nonDefaultDescriptor.transport.uri), "schema rejected the non-default onion URI");
    assert(schema.properties.marker.const === VOID_TOR_ONION_TRANSPORT_MARKER, "schema marker mismatch");
    assert(schema.properties.version.const === 1, "schema version mismatch");
    assert(schema.properties.authority.properties.read_only.const === true, "schema read-only boundary missing");
    for (const key of [
      "transaction_submission",
      "p2p_listener",
      "mcp_listener",
      "wallet_or_signer_access",
      "work_credit_write",
      "void_settlement",
      "node_runtime_mutation",
      "operator_control",
    ]) {
      assert(schema.properties.authority.properties[key].const === false, `schema permits ${key}`);
    }

    const hostnameFile = join(temp, "hostname");
    const cliDescriptor = join(temp, "transport.json");
    writeFileSync(hostnameFile, `${onionHostname}\n`, { mode: 0o600 });
    const fixedDate = new Date(generatedAt);
    utimesSync(hostnameFile, fixedDate, fixedDate);
    const cli = run(
      process.execPath,
      [
        DESCRIPTOR_CLI,
        "--hostname-file",
        hostnameFile,
        "--output",
        cliDescriptor,
        "--local-port",
        "18088",
        "--virtual-port",
        "80",
        "--generated-at",
        generatedAt,
      ],
    );
    assert(cli.stdout.includes("VOID_TOR_ONION_DESCRIPTOR_V1_GREEN"), "descriptor CLI marker missing");
    assert(JSON.stringify(JSON.parse(read(cliDescriptor))) === JSON.stringify(example), "descriptor CLI output drifted");
    assert(mode(cliDescriptor) === 0o600, "descriptor output mode is not 0600");

    const nonDefaultCliDescriptor = join(temp, "transport-8080.json");
    run(
      process.execPath,
      [
        DESCRIPTOR_CLI,
        "--hostname-file",
        hostnameFile,
        "--output",
        nonDefaultCliDescriptor,
        "--local-port",
        "18088",
        "--virtual-port",
        "8080",
        "--generated-at",
        generatedAt,
      ],
    );
    assert(
      JSON.parse(read(nonDefaultCliDescriptor)).transport.uri === `http://${onionHostname}:8080`,
      "descriptor CLI omitted the non-default virtual port",
    );

    const check = run(process.execPath, [SERVER, "--check", "--host", "127.0.0.1"], { cwd: ROOT });
    assert(check.stdout.includes("VOID_TOR_ONION_PUBLIC_NODE_V1_CHECK_GREEN"), "server check marker missing");
    const externalBind = spawnSync(process.execPath, [SERVER, "--check", "--host", "0.0.0.0"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert(externalBind.status !== 0, "server accepted non-loopback bind");

    const server = await startServer(hostnameFile);
    try {
      const base = `http://127.0.0.1:${server.port}`;
      const indexResponse = await fetch(`${base}/public-node/index.json`);
      assert(indexResponse.status === 200, `public index status ${indexResponse.status}`);
      JSON.parse(await indexResponse.text());

      const descriptors = [];
      for (const path of VOID_TOR_DESCRIPTOR_PATHS) {
        const response = await fetch(`${base}${path}`);
        assert(response.status === 200, `descriptor status ${response.status} for ${path}`);
        descriptors.push(await response.json());
      }
      assert(JSON.stringify(descriptors[0]) === JSON.stringify(descriptors[1]), "descriptor aliases differ");
      assert(descriptors[0].transport.onion_hostname === onionHostname, "served onion hostname mismatch");
      assert(descriptors[0].identity.signed_void_node_binding === false, "served descriptor claims signed binding");
      assert(descriptors[0].authority.read_only === true, "served descriptor is not read-only");

      const head = await rawHttpRequest({ port: server.port, path: "/public-node/index.json", method: "HEAD" });
      assert(head.status === 200 && head.body.length === 0, "HEAD behavior invalid");
      const post = await rawHttpRequest({ port: server.port, path: "/public-node/index.json", method: "POST" });
      assert(post.status === 405, "POST was not rejected");
      const traversal = await rawHttpRequest({ port: server.port, path: "/%2e%2e/package.json" });
      assert(traversal.status === 403, `path traversal status was ${traversal.status}`);
      const backslash = await rawHttpRequest({ port: server.port, path: "/%5cetc/passwd" });
      assert(backslash.status === 403, `backslash path status was ${backslash.status}`);

      writeFileSync(hostnameFile, "not-an-onion\n", { mode: 0o600 });
      const invalidDescriptor = await fetch(`${base}${VOID_TOR_DESCRIPTOR_PATHS[0]}`);
      assert(invalidDescriptor.status === 503, "invalid hostname did not fail closed");
      const invalidBody = await invalidDescriptor.json();
      assert(invalidBody.reason === "onion-hostname-invalid", "invalid hostname reason mismatch");
    } finally {
      await stopServer(server);
    }

    const docs = read(DOC);
    for (const statement of [
      "does not expose the node HTTP listener on port 4100",
      "does not expose the P2P listener on port 4700",
      "does not expose MCP",
      "not the canonical VOID node identity",
      "signed VOID-node binding is optional and fail-closed",
      "user-owned sentinel",
      "sentinel-bound state root",
      "end-to-end self-probe",
    ]) {
      assert(docs.includes(statement), `documentation missing boundary: ${statement}`);
    }
    const workflow = read(WORKFLOW);
    assert(workflow.includes("node-version: 22"), "workflow does not pin Node 22");
    assert(workflow.includes("actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1"), "workflow checkout action is not immutable v7.0.1");
    assert(workflow.includes("actions/setup-node@820762786026740c76f36085b0efc47a31fe5020"), "workflow setup-node action is not immutable v7.0.0");
    assert(workflow.includes("prove_void_tor_onion_transport_v1.mjs"), "workflow proof command missing");

    const sourceDigest = createHash("sha256")
      .update(read(LIFECYCLE))
      .update(read(SERVER))
      .update(read(DESCRIPTOR_CLI))
      .digest("hex");
    console.log("VOID_TOR_ONION_TRANSPORT_V1_PROOF_GREEN");
    console.log(`marker=${VOID_TOR_ONION_TRANSPORT_MARKER}`);
    console.log(`proof_source_sha256=${sourceDigest}`);
    console.log("read_only=true");
    console.log("dangerous_paths_touched=false");
    console.log("runtime_mutation=false");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function assertThrows(callback, message) {
  let threw = false;
  try {
    callback();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

main().catch((error) => {
  console.error("VOID_TOR_ONION_TRANSPORT_V1_PROOF_FAIL");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
