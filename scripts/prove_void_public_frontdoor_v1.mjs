#!/usr/bin/env node
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(ROOT, "public/void-public-frontdoor-v1/index.html");
const serverPath = resolve(ROOT, "ops/public/void-public-frontdoor-v1.mjs");
const cutoverPath = resolve(ROOT, "ops/public/void-public-frontdoor-cutover-v1.sh");
const html = readFileSync(htmlPath, "utf8");
const source = readFileSync(serverPath, "utf8");
const cutover = readFileSync(cutoverPath, "utf8");

assert.match(html, /VOID_PUBLIC_FRONTDOOR_V1/);
assert.match(html, /VOID_UI_VISUAL_UNIFICATION_V1/);
assert.match(html, /<title>VOID \/ Public Node<\/title>/);
assert.match(html, /<strong>VOID<\/strong><span>Public Node<\/span>/);
assert.match(html, /A decentralized data network for AI agents/);
assert.match(html, /href="\/app\/"[^>]*>Enter VOID/);
assert.match(html, /href="\/participant"[^>]*>Participate/);
assert.equal((html.match(/class="button(?: primary)?"/g) || []).length, 2);
assert.equal((html.match(/class="card"/g) || []).length, 3);
for (const token of [
  "--bg:#050506",
  "--surface:#0b0b0e",
  "--line:#2a2a31",
  "--text:#f2f2f4",
  "--secondary:#c8c8cf",
  "--muted:#9898a3",
  "background-size:32px 32px",
]) {
  assert.ok(html.includes(token), `unified VOID visual token missing: ${token}`);
}
assert.match(html, /a:focus-visible\{outline:2px solid var\(--text\);outline-offset:4px\}/);
assert.doesNotMatch(html, /border-radius\s*:|box-shadow\s*:/i);
for (const old of [
  "VOID Network is live",
  "Fund VOID",
  "Inspect Public Proof",
  "EXACT-GREEN HINT",
  "TXROOT LIVE",
  "Operator controls are not exposed",
]) {
  assert.ok(!html.includes(old), `legacy root clutter must be absent: ${old}`);
}
assert.doesNotMatch(html, /<script\b/i);
assert.doesNotMatch(html, /<form\b|<input\b/i);

assert.match(source, /const BIND = process\.env\.VOID_PUBLIC_FRONTDOOR_BIND \|\| "127\.0\.0\.1"/);
assert.match(source, /if \(BIND !== "127\.0\.0\.1"\) throw new Error/);
assert.match(source, /UPSTREAM_HOST = "127\.0\.0\.1"/);
assert.match(source, /VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT/);
assert.match(source, /STATUS_PROBE_PATH = "\/app\/"/);
assert.match(source, /VOID_PUBLIC_FRONTDOOR_STATUS_TIMEOUT_MS/);
assert.match(source, /statusProbeInFlight/);
assert.match(source, /ready: upstreamReady/);
assert.match(source, /upstream_ready: upstreamReady/);
assert.doesNotMatch(source, /\bready:\s*true/);
assert.match(source, /req\.pipe\(upstream\)/);
assert.doesNotMatch(source, /child_process|exec\(|spawn\(|writeFile|appendFile/);

assert.match(cutover, /VOID_PUBLIC_FRONTDOOR_CUTOVER_V1/);
assert.match(cutover, /canonical_funnel_root_ports_from_text/);
assert.match(cutover, /https:\/\/\$\{dns\}:8443/);
assert.match(cutover, /127\.0\.0\.1:8082/);
assert.match(cutover, /127\.0\.0\.1:4188/);
assert.match(cutover, /canonical_443_port=8082/);
assert.match(cutover, /auxiliary_8443_ignored=true/);
assert.match(cutover, /tailscale funnel status --json/);
assert.match(cutover, /tailscale funnel --https=443 --bg --yes/);
assert.match(cutover, /--rollback/);
assert.match(cutover, /node_service_restart=false/);
assert.match(cutover, /composition_gateway_restart=false/);
assert.match(cutover, /flock -n 9/);
assert.match(cutover, /unresolved prior cutover transaction/);
assert.match(cutover, /require_exact_port "\$previous_port" "\$observed" "pre-cutover predecessor"/);
assert.match(cutover, /publish_transaction_state preparing "\$previous_port" "\$FRONTDOOR_PORT"/);
assert.match(cutover, /publish_transaction_state prepared "\$previous_port" "\$FRONTDOOR_PORT"/);
assert.match(cutover, /publish_transaction_state installed "\$previous_port" "\$FRONTDOOR_PORT"/);
assert.match(cutover, /publish_transaction_state retired "\$previous" "\$installed"/);
assert.match(cutover, /rollback_decision "\$phase" "\$previous" "\$installed" "\$observed"/);
assert.match(cutover, /fs\.fsyncSync\(fd\)/);
assert.match(cutover, /fs\.constants\.O_NOFOLLOW/);
assert.match(cutover, /canonical 443 authority changed; refusing stale rollback/);
assert.doesNotMatch(cutover, /expected exactly one simple root Funnel proxy target/);
assert.doesNotMatch(cutover, /tailscale funnel reset/);
assert.doesNotMatch(cutover, /systemctl --user (restart|stop|start) void-node/);
assert.doesNotMatch(cutover, /src\/index\.ts/);

const parserSelfTest = execFileSync("bash", [cutoverPath, "--parser-self-test"], {
  cwd: ROOT,
  encoding: "utf8",
});
assert.match(parserSelfTest, /VOID_PUBLIC_FRONTDOOR_CUTOVER_V1_PARSER_SELF_TEST_GREEN/);
assert.match(parserSelfTest, /canonical_443_port=8082/);
assert.match(parserSelfTest, /auxiliary_8443_ignored=true/);

const transactionSelfTest = execFileSync("bash", [cutoverPath, "--transaction-self-test"], {
  cwd: ROOT,
  encoding: "utf8",
});
assert.match(transactionSelfTest, /VOID_PUBLIC_FRONTDOOR_CUTOVER_V1_TRANSACTION_SELF_TEST_GREEN/);
assert.match(transactionSelfTest, /stale_predecessor_rejected=true/);
assert.match(transactionSelfTest, /overlapping_transaction_lock_rejected=true/);
assert.match(transactionSelfTest, /rollback_requires_exact_installed_state=true/);
assert.match(transactionSelfTest, /prepared_without_switch_recovery=true/);
assert.match(transactionSelfTest, /transaction_state_atomic_durable=true/);
assert.match(transactionSelfTest, /transaction_retirement_is_durable_state=true/);

const cutoverFixtureRoot = mkdtempSync(join(tmpdir(), "void-frontdoor-cutover-proof-"));
try {
  const fakeBin = join(cutoverFixtureRoot, "bin");
  const fixtureSourceRoot = join(cutoverFixtureRoot, "source");
  const fixtureHome = join(cutoverFixtureRoot, "home");
  const fixturePortPath = join(cutoverFixtureRoot, "canonical-port");
  const fixtureMutationLog = join(cutoverFixtureRoot, "mutations.log");
  const fixtureReadyPath = join(cutoverFixtureRoot, "wait-ready");
  const fixtureGoPath = join(cutoverFixtureRoot, "wait-go");
  mkdirSync(fakeBin, { recursive: true });
  mkdirSync(join(fixtureSourceRoot, "ops/public"), { recursive: true });
  mkdirSync(join(fixtureSourceRoot, "public/void-public-frontdoor-v1"), { recursive: true });
  writeFileSync(join(fixtureSourceRoot, "ops/public/void-public-frontdoor-v1.mjs"), 'console.log("mock frontdoor");\n');
  writeFileSync(join(fixtureSourceRoot, "public/void-public-frontdoor-v1/index.html"), '<!doctype html><p>VOID_PUBLIC_FRONTDOOR_V1</p>\n');

  const fakeTailscale = `#!/usr/bin/env bash
set -euo pipefail
port_file="\${VOID_TEST_FUNNEL_PORT_FILE:?}"
mutation_log="\${VOID_TEST_FUNNEL_MUTATION_LOG:?}"
if [[ "\${1:-}" == "status" && "\${2:-}" == "--json" ]]; then
  printf '{"Self":{"DNSName":"fixture.ts.net."}}\\n'
  exit 0
fi
if [[ "\${1:-}" == "funnel" && "\${2:-}" == "status" ]]; then
  if [[ "\${3:-}" == "--json" ]]; then
    printf '{"fixture":true}\\n'
    exit 0
  fi
  port="$(cat "$port_file")"
  cat <<OUT
https://fixture.ts.net (Funnel on)
|-- / proxy http://127.0.0.1:\${port}

https://fixture.ts.net:8443 (Funnel on)
|-- / proxy http://127.0.0.1:4188
OUT
  exit 0
fi
if [[ "\${1:-}" == "funnel" && "\${2:-}" == "--https=443" ]]; then
  target="\${@: -1}"
  port="\${target##*:}"
  port="\${port%/}"
  [[ "$port" =~ ^[0-9]+$ ]] || exit 3
  printf '%s\\n' "$port" >> "$mutation_log"
  printf '%s\\n' "$port" > "$port_file"
  exit 0
fi
exit 4
`;
  const fakeSystemctl = `#!/usr/bin/env bash
exit 0
`;
  const fakeCurl = `#!/usr/bin/env bash
set -euo pipefail
url=""
for arg in "$@"; do
  case "$arg" in http://*|https://*) url="$arg" ;; esac
done
[[ -n "$url" ]] || exit 2
if [[ "$url" == "http://127.0.0.1:8082/" && -n "\${VOID_TEST_WAIT_FILE:-}" ]]; then
  : > "\${VOID_TEST_WAIT_READY_FILE:?}"
  while [[ ! -e "$VOID_TEST_WAIT_FILE" ]]; do sleep 0.02; done
fi
if [[ "$url" == "http://127.0.0.1:8083/app/" && -n "\${VOID_TEST_DRIFT_TO_PORT:-}" ]]; then
  printf '%s\\n' "$VOID_TEST_DRIFT_TO_PORT" > "\${VOID_TEST_FUNNEL_PORT_FILE:?}"
fi
case "$url" in
  http://127.0.0.1:8083/|https://fixture.ts.net/)
    printf 'VOID_PUBLIC_FRONTDOOR_V1\\n'
    ;;
esac
exit 0
`;
  writeFileSync(join(fakeBin, "tailscale"), fakeTailscale);
  writeFileSync(join(fakeBin, "systemctl"), fakeSystemctl);
  writeFileSync(join(fakeBin, "curl"), fakeCurl);
  chmodSync(join(fakeBin, "tailscale"), 0o755);
  chmodSync(join(fakeBin, "systemctl"), 0o755);
  chmodSync(join(fakeBin, "curl"), 0o755);

  const baseFixtureEnv = {
    ...process.env,
    HOME: fixtureHome,
    PATH: `${fakeBin}:${process.env.PATH || ""}`,
    VOID_FRONTDOOR_SOURCE_ROOT: fixtureSourceRoot,
    VOID_TEST_FUNNEL_PORT_FILE: fixturePortPath,
    VOID_TEST_FUNNEL_MUTATION_LOG: fixtureMutationLog,
  };
  const resetCutoverFixture = () => {
    rmSync(fixtureHome, { recursive: true, force: true });
    rmSync(fixtureReadyPath, { force: true });
    rmSync(fixtureGoPath, { force: true });
    mkdirSync(fixtureHome, { recursive: true });
    writeFileSync(fixturePortPath, "8082\n");
    writeFileSync(fixtureMutationLog, "");
  };
  const runCutoverFixture = (mode, extraEnv = {}) => spawnSync("bash", [cutoverPath, mode], {
    cwd: ROOT,
    env: { ...baseFixtureEnv, ...extraEnv },
    encoding: "utf8",
  });
  const mutationLines = () => readFileSync(fixtureMutationLog, "utf8").trim().split("\n").filter(Boolean);

  // Stale predecessor: drift 8082 -> 9000 after local frontdoor checks but before the final compare.
  resetCutoverFixture();
  const staleApply = runCutoverFixture("--apply", { VOID_TEST_DRIFT_TO_PORT: "9000" });
  assert.notEqual(staleApply.status, 0, `stale predecessor unexpectedly applied: ${staleApply.stdout} ${staleApply.stderr}`);
  assert.match(staleApply.stderr, /pre-cutover predecessor changed/);
  assert.equal(readFileSync(fixturePortPath, "utf8").trim(), "9000");
  assert.deepEqual(mutationLines(), []);

  // Successful 8082 -> 8083, then foreign 9000: old rollback must HOLD and preserve 9000.
  resetCutoverFixture();
  const installBeforeForeign = runCutoverFixture("--apply");
  assert.equal(installBeforeForeign.status, 0, `baseline fixture apply failed: ${installBeforeForeign.stdout} ${installBeforeForeign.stderr}`);
  assert.equal(readFileSync(fixturePortPath, "utf8").trim(), "8083");
  writeFileSync(fixturePortPath, "9000\n");
  const mutationCountBeforeStaleRollback = mutationLines().length;
  const staleRollback = runCutoverFixture("--rollback");
  assert.notEqual(staleRollback.status, 0, `stale rollback unexpectedly succeeded: ${staleRollback.stdout} ${staleRollback.stderr}`);
  assert.match(staleRollback.stderr, /canonical 443 authority changed; refusing stale rollback/);
  assert.equal(readFileSync(fixturePortPath, "utf8").trim(), "9000");
  assert.equal(mutationLines().length, mutationCountBeforeStaleRollback);

  // Two overlapping applies: second must fail on the transaction lock while first is stalled pre-cutover.
  resetCutoverFixture();
  let firstStdout = "";
  let firstStderr = "";
  const firstApply = spawn("bash", [cutoverPath, "--apply"], {
    cwd: ROOT,
    env: {
      ...baseFixtureEnv,
      VOID_TEST_WAIT_FILE: fixtureGoPath,
      VOID_TEST_WAIT_READY_FILE: fixtureReadyPath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  firstApply.stdout.on("data", (chunk) => { firstStdout += chunk; });
  firstApply.stderr.on("data", (chunk) => { firstStderr += chunk; });
  const overlapDeadline = Date.now() + 5000;
  while (true) {
    try {
      if (readFileSync(fixtureReadyPath).length >= 0) break;
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
    if (firstApply.exitCode !== null) throw new Error(`first fixture apply exited before overlap barrier: ${firstStdout} ${firstStderr}`);
    if (Date.now() >= overlapDeadline) {
      firstApply.kill("SIGTERM");
      throw new Error(`first fixture apply did not reach overlap barrier: ${firstStdout} ${firstStderr}`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
  }
  const secondApply = runCutoverFixture("--apply");
  assert.notEqual(secondApply.status, 0, `overlapping second apply unexpectedly succeeded: ${secondApply.stdout} ${secondApply.stderr}`);
  assert.match(secondApply.stderr, /another frontdoor cutover transaction is active/);
  assert.deepEqual(mutationLines(), []);
  writeFileSync(fixtureGoPath, "go\n");
  const firstExit = await new Promise((resolvePromise) => firstApply.once("exit", (code, signal) => resolvePromise({ code, signal })));
  assert.deepEqual(firstExit, { code: 0, signal: null }, `first fixture apply failed after overlap release: ${firstStdout} ${firstStderr}`);
  assert.equal(readFileSync(fixturePortPath, "utf8").trim(), "8083");
  assert.deepEqual(mutationLines(), ["8083"]);

  // Immediate transaction-owned rollback remains valid and restores the exact predecessor.
  resetCutoverFixture();
  const installBeforeOwnedRollback = runCutoverFixture("--apply");
  assert.equal(installBeforeOwnedRollback.status, 0, `fixture apply before owned rollback failed: ${installBeforeOwnedRollback.stdout} ${installBeforeOwnedRollback.stderr}`);
  const ownedRollback = runCutoverFixture("--rollback");
  assert.equal(ownedRollback.status, 0, `transaction-owned rollback failed: ${ownedRollback.stdout} ${ownedRollback.stderr}`);
  assert.equal(readFileSync(fixturePortPath, "utf8").trim(), "8082");
  assert.deepEqual(mutationLines(), ["8083", "8082"]);
} finally {
  rmSync(cutoverFixtureRoot, { recursive: true, force: true });
}

const upstreamPort = 18082;
const frontdoorPort = 18083;
let upstreamMode = "healthy";
let upstreamRequests = 0;
const upstream = http.createServer((req, res) => {
  upstreamRequests += 1;
  if (upstreamMode === "stall") return;

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    const out = Buffer.from(JSON.stringify({
      marker: "MOCK_UPSTREAM_V1",
      method: req.method,
      url: req.url,
      body,
      frontdoor: req.headers["x-void-frontdoor"] || null,
    }));
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": out.byteLength,
      "x-mock-upstream": "true",
      "x-void-public-app-composition": "v1",
    });
    res.end(out);
  });
});

const listenUpstream = () => new Promise((resolvePromise, reject) => {
  const onError = (error) => {
    upstream.off("listening", onListening);
    reject(error);
  };
  const onListening = () => {
    upstream.off("error", onError);
    resolvePromise();
  };
  upstream.once("error", onError);
  upstream.once("listening", onListening);
  upstream.listen(upstreamPort, "127.0.0.1");
});

const closeUpstream = () => new Promise((resolvePromise, reject) => {
  upstream.close((error) => {
    if (error) reject(error);
    else resolvePromise();
  });
});

await listenUpstream();

const child = spawn(process.execPath, [serverPath], {
  cwd: ROOT,
  env: {
    ...process.env,
    VOID_PUBLIC_FRONTDOOR_HOME: htmlPath,
    VOID_PUBLIC_FRONTDOOR_BIND: "127.0.0.1",
    VOID_PUBLIC_FRONTDOOR_PORT: String(frontdoorPort),
    VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT: String(upstreamPort),
    VOID_PUBLIC_FRONTDOOR_STATUS_TIMEOUT_MS: "250",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (d) => { stdout += d; });
child.stderr.on("data", (d) => { stderr += d; });

const fetchStatus = async () => {
  const response = await fetch(`http://127.0.0.1:${frontdoorPort}/__void/frontdoor/status.json`);
  assert.equal(response.status, 200);
  return response.json();
};

try {
  const deadline = Date.now() + 5000;
  while (!stdout.includes("VOID_PUBLIC_FRONTDOOR_V1_READY")) {
    if (child.exitCode !== null) throw new Error(`frontdoor exited early: ${stderr}`);
    if (Date.now() > deadline) throw new Error(`frontdoor start timeout: ${stdout} ${stderr}`);
    await new Promise((r) => setTimeout(r, 25));
  }

  const rootResponse = await fetch(`http://127.0.0.1:${frontdoorPort}/`);
  assert.equal(rootResponse.status, 200);
  assert.equal(rootResponse.headers.get("x-void-frontdoor"), "VOID_PUBLIC_FRONTDOOR_V1");
  assert.match(await rootResponse.text(), /VOID_PUBLIC_FRONTDOOR_V1/);

  const status = await fetchStatus();
  assert.equal(status.marker, "VOID_PUBLIC_FRONTDOOR_V1");
  assert.equal(status.ready, true);
  assert.equal(status.listener_ready, true);
  assert.equal(status.upstream_ready, true);
  assert.equal(status.upstream, `http://127.0.0.1:${upstreamPort}`);

  upstreamMode = "stall";
  const stalledBefore = upstreamRequests;
  const stalledStarted = Date.now();
  const stalledStatuses = await Promise.all([
    fetchStatus(),
    fetchStatus(),
    fetchStatus(),
  ]);
  const stalledElapsed = Date.now() - stalledStarted;
  assert.ok(stalledElapsed < 1000, `stalled status probe escaped bound: ${stalledElapsed}ms`);
  assert.equal(upstreamRequests - stalledBefore, 1);
  for (const stalledStatus of stalledStatuses) {
    assert.equal(stalledStatus.ready, false);
    assert.equal(stalledStatus.listener_ready, true);
    assert.equal(stalledStatus.upstream_ready, false);
  }

  upstreamMode = "healthy";
  const recoveredAfterStall = await fetchStatus();
  assert.equal(recoveredAfterStall.ready, true);
  assert.equal(recoveredAfterStall.upstream_ready, true);

  const proxyResponse = await fetch(`http://127.0.0.1:${frontdoorPort}/app/test?x=1`);
  assert.equal(proxyResponse.status, 200);
  assert.equal(proxyResponse.headers.get("x-mock-upstream"), "true");
  const proxyJson = await proxyResponse.json();
  assert.equal(proxyJson.method, "GET");
  assert.equal(proxyJson.url, "/app/test?x=1");
  assert.equal(proxyJson.frontdoor, "VOID_PUBLIC_FRONTDOOR_V1");

  const postResponse = await fetch(`http://127.0.0.1:${frontdoorPort}/buy-void`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ test: true }),
  });
  const postJson = await postResponse.json();
  assert.equal(postJson.method, "POST");
  assert.equal(postJson.url, "/buy-void");
  assert.equal(postJson.body, '{"test":true}');

  const rootPost = await fetch(`http://127.0.0.1:${frontdoorPort}/`, {
    method: "POST",
    body: "root-post",
  });
  const rootPostJson = await rootPost.json();
  assert.equal(rootPostJson.method, "POST");
  assert.equal(rootPostJson.url, "/");
  assert.equal(rootPostJson.body, "root-post");

  await closeUpstream();
  const downStarted = Date.now();
  const downStatus = await fetchStatus();
  const downElapsed = Date.now() - downStarted;
  assert.ok(downElapsed < 1000, `downstream-unavailable status escaped bound: ${downElapsed}ms`);
  assert.equal(downStatus.ready, false);
  assert.equal(downStatus.listener_ready, true);
  assert.equal(downStatus.upstream_ready, false);

  await listenUpstream();
  const recoveredAfterDown = await fetchStatus();
  assert.equal(recoveredAfterDown.ready, true);
  assert.equal(recoveredAfterDown.upstream_ready, true);
} finally {
  child.kill("SIGTERM");
  await new Promise((r) => child.once("exit", r));
  if (upstream.listening) await closeUpstream();
}

console.log("VOID_PUBLIC_FRONTDOOR_V1_PROOF_GREEN");
console.log("unified_visual_contract=true");
console.log("hero_primary_exits=2");
console.log("capability_paths=3");
console.log("legacy_root_clutter=false");
console.log("canonical_443_funnel_selection_proved=true");
console.log("auxiliary_8443_funnel_ignored=true");
console.log("root_static_get_head_only=true");
console.log("non_root_proxy_behavior_executed=true");
console.log("post_passthrough_executed=true");
console.log("frontdoor_status_upstream_bound=true");
console.log("frontdoor_status_probe_singleflight=true");
console.log("frontdoor_status_recovery_without_restart=true");
console.log("cutover_stale_predecessor_rejected=true");
console.log("cutover_overlap_lock_rejected=true");
console.log("cutover_rollback_exact_installed_state_required=true");
console.log("loopback_only=true");
console.log("rollback_contract_present=true");
console.log("cutover_transaction_predecessor_revalidated=true");
console.log("cutover_transaction_overlap_serialized=true");
console.log("cutover_rollback_exact_state_bound=true");
console.log("cutover_transaction_state_durable=true");
console.log("node_runtime_mutated=false");
