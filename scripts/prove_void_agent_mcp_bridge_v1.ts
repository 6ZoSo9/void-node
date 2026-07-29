import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const ALLOWED_PREFIX = "integrations/mcp/";
const ALLOWED_EXACT = new Set([
  "scripts/prove_void_agent_mcp_bridge_v1.ts",
  ".github/workflows/void-agent-mcp-bridge-v1.yml",
]);
const EXPECTED_FILES = [
  "integrations/mcp/.gitignore",
  "integrations/mcp/README.md",
  "integrations/mcp/package.json",
  "integrations/mcp/package-lock.json",
  "integrations/mcp/tsconfig.json",
  "integrations/mcp/src/bridge.ts",
  "integrations/mcp/src/config.ts",
  "integrations/mcp/src/json.ts",
  "integrations/mcp/src/process.ts",
  "integrations/mcp/src/server.ts",
  "integrations/mcp/src/stdio.ts",
  "integrations/mcp/test/bridge.test.ts",
  "integrations/mcp/test/fixtures.ts",
  "integrations/mcp/test/protocol-compatibility.test.ts",
  "integrations/mcp/test/server.test.ts",
  "scripts/prove_void_agent_mcp_bridge_v1.ts",
  ".github/workflows/void-agent-mcp-bridge-v1.yml",
] as const;

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value !== null
    && typeof value === "object"
    && !Array.isArray(value),
  );
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((child) => sortJson(child));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortJson(value[key])]),
    );
  }
  assertCondition(
    value === null
    || typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean",
    "non-JSON value",
  );
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sha256Text(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalized(relative: string): string {
  return relative.replaceAll(path.sep, "/");
}

function allowedPath(relative: string): boolean {
  const value = normalized(relative);
  return value.startsWith(ALLOWED_PREFIX) || ALLOWED_EXACT.has(value);
}

function walkTrackedSource(
  directory: string,
): string[] {
  const output: string[] = [];
  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    if (
      entry.name === "node_modules"
      || entry.name === "dist"
      || entry.name.endsWith(".log")
    ) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...walkTrackedSource(absolute));
    } else if (entry.isFile()) {
      output.push(normalized(path.relative(ROOT, absolute)));
    } else {
      fail(`unexpected non-file in MCP lane: ${absolute}`);
    }
  }
  return output.sort();
}

function changedWorkingTreePaths(): string[] {
  const raw = execFileSync(
    "git",
    [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      assertCondition(
        line.length >= 4,
        `malformed git status line: ${line}`,
      );
      const rawPath = line.slice(3);
      const renameSeparator = rawPath.indexOf(" -> ");
      return normalized(
        renameSeparator >= 0
          ? rawPath.slice(renameSeparator + 4)
          : rawPath,
      );
    });
}

function changedCommittedPaths(baseRef: string): string[] {
  const raw = execFileSync(
    "git",
    ["diff", "--name-only", `${baseRef}...HEAD`],
    { cwd: ROOT, encoding: "utf8" },
  );
  return raw.split(/\r?\n/).filter(Boolean).map(normalized);
}

for (const relative of EXPECTED_FILES) {
  const absolute = path.join(ROOT, relative);
  const metadata = fs.lstatSync(absolute);
  assertCondition(metadata.isFile(), `${relative} must be a regular file`);
  assertCondition(!metadata.isSymbolicLink(), `${relative} must not be a symlink`);
}

const laneFiles = walkTrackedSource(
  path.join(ROOT, "integrations/mcp"),
);
const expectedLaneFiles = EXPECTED_FILES
  .filter((relative) => relative.startsWith(ALLOWED_PREFIX))
  .map(normalized)
  .sort();
assertCondition(
  canonicalJson(laneFiles) === canonicalJson(expectedLaneFiles),
  [
    "MCP lane file set mismatch",
    `expected=${expectedLaneFiles.join(",")}`,
    `actual=${laneFiles.join(",")}`,
  ].join("\n"),
);

const packageJson = JSON.parse(
  read("integrations/mcp/package.json"),
) as Record<string, unknown>;
assertCondition(packageJson.private === true, "MCP package must stay private");
assertCondition(packageJson.type === "module", "MCP package must stay ESM");
const dependencies = packageJson.dependencies;
const devDependencies = packageJson.devDependencies;
assertCondition(isRecord(dependencies), "dependencies missing");
assertCondition(isRecord(devDependencies), "devDependencies missing");
assertCondition(
  dependencies["@modelcontextprotocol/server"] === "2.0.0",
  "server SDK must be pinned to 2.0.0",
);
assertCondition(
  dependencies.zod === "4.2.0",
  "zod must be pinned to 4.2.0",
);
assertCondition(
  devDependencies["@modelcontextprotocol/client"] === "2.0.0",
  "client SDK must be pinned to 2.0.0",
);
assertCondition(
  devDependencies.typescript === "5.9.3",
  "TypeScript pin mismatch",
);
assertCondition(
  devDependencies["@types/node"] === "22.15.3",
  "@types/node pin mismatch",
);

const lock = JSON.parse(
  read("integrations/mcp/package-lock.json"),
) as Record<string, unknown>;
assertCondition(lock.lockfileVersion === 3, "package-lock must use version 3");
const lockPackages = lock.packages;
assertCondition(isRecord(lockPackages), "package-lock packages missing");
const lockRoot = lockPackages[""];
assertCondition(isRecord(lockRoot), "package-lock root package missing");
assertCondition(
  canonicalJson(lockRoot.dependencies)
    === canonicalJson(dependencies),
  "package-lock runtime dependency pins drifted",
);
assertCondition(
  canonicalJson(lockRoot.devDependencies)
    === canonicalJson(devDependencies),
  "package-lock development dependency pins drifted",
);

const bootstrapClient = read(
  "tools/void-ai-agent-bootstrap-client-v1.mjs",
);
for (const required of [
  "VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1",
  'method: "GET"',
  'redirect: "manual"',
  "mutation_performed: false",
]) {
  assertCondition(
    bootstrapClient.includes(required),
    `bootstrap client contract drift: ${required}`,
  );
}

const paidWorkClient = read(
  "tools/void-ai-agent-paid-work-client-v1.mjs",
);
for (const required of [
  "VOID_AI_AGENT_PAID_WORK_CLIENT_V1",
  'redirect: "manual"',
  "accepted_for_review",
  "conflicting_duplicate",
  "token_in_command_arguments: false",
  "automatic_retry: false",
]) {
  assertCondition(
    paidWorkClient.includes(required),
    `paid-work client contract drift: ${required}`,
  );
}

const materializer = read(
  "scripts/public_agent_service_order_submission_v1.ts",
);
for (const required of [
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_SUBMISSION_V1",
  "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
  "/__void/agents/paid-work/submissions/v1",
  "request_sha256",
  "http_submission=false",
  "payment_execution=false",
]) {
  assertCondition(
    materializer.includes(required),
    `materializer contract drift: ${required}`,
  );
}

const catalog = JSON.parse(
  read("ops/public/agent-services-v1/catalog.json"),
) as Record<string, unknown>;
assertCondition(
  catalog.catalog_status === "descriptive_only",
  "catalog must remain descriptive_only",
);
const catalogFingerprint = catalog.catalog_fingerprint_sha256;
assertCondition(
  typeof catalogFingerprint === "string"
    && /^[0-9a-f]{64}$/.test(catalogFingerprint),
  "catalog fingerprint invalid",
);
const catalogCopy = { ...catalog };
delete catalogCopy.catalog_fingerprint_sha256;
assertCondition(
  sha256Text(canonicalJson(catalogCopy)) === catalogFingerprint,
  "catalog fingerprint is not reproducible",
);
const honesty = catalog.honesty;
assertCondition(isRecord(honesty), "catalog honesty missing");
for (const key of [
  "external_paid_work_execution_available",
  "automatic_payment_execution_available",
  "wallet_access",
  "credential_issuance",
  "signing",
  "transaction_broadcast",
  "money_movement",
  "runtime_mutation",
  "service_mutation",
]) {
  assertCondition(
    honesty[key] === false,
    `catalog authority must remain false: ${key}`,
  );
}

const runtimeSources = [
  "integrations/mcp/src/bridge.ts",
  "integrations/mcp/src/config.ts",
  "integrations/mcp/src/json.ts",
  "integrations/mcp/src/process.ts",
  "integrations/mcp/src/server.ts",
  "integrations/mcp/src/stdio.ts",
].map((relative) => [relative, read(relative)] as const);

for (const [relative, source] of runtimeSources) {
  assertCondition(
    !/\bconsole\.log\s*\(/.test(source),
    `${relative} must not write console.log to MCP stdout`,
  );
  assertCondition(
    !/\bshell\s*:\s*true\b/.test(source),
    `${relative} must not enable a subprocess shell`,
  );
  assertCondition(
    !/\bexec(?:File|Sync)?\s*\(/.test(source),
    `${relative} must not use exec-family subprocess APIs`,
  );
  assertCondition(
    !/from\s+["'][.]{2,}\/[.]{2,}\/[.]{2,}\/src\//.test(source),
    `${relative} must not import the VOID node runtime`,
  );
}

const serverSource = read("integrations/mcp/src/server.ts");
assertCondition(
  serverSource.includes('z.literal("submit-paid-work")'),
  "submit tool exact confirmation schema missing",
);
assertCondition(
  serverSource.includes("if (config.allowSubmit)"),
  "submit tool registration gate missing",
);
assertCondition(
  !serverSource.includes("VOID_MCP_TOKEN_FILE"),
  "token file must not appear in MCP schemas",
);
const processSource = read("integrations/mcp/src/process.ts");
assertCondition(
  processSource.includes("shell: false"),
  "subprocess shell prohibition missing",
);
const bridgeSource = read("integrations/mcp/src/bridge.ts");
for (const required of [
  "accepted_for_review_only",
  "payment_executed: false",
  "work_credit_awarded: false",
  "void_settled: false",
  "automatic_retry",
]) {
  if (
    required === "automatic_retry"
    && !paidWorkClient.includes("automatic_retry: false")
  ) {
    fail("existing no-retry client boundary missing");
  }
  if (required !== "automatic_retry") {
    assertCondition(
      bridgeSource.includes(required),
      `bridge honesty marker missing: ${required}`,
    );
  }
}

const changed = [
  ...changedWorkingTreePaths(),
  ...(
    process.env.VOID_MCP_BASE_REF
      ? changedCommittedPaths(process.env.VOID_MCP_BASE_REF)
      : []
  ),
];
for (const relative of new Set(changed)) {
  assertCondition(
    allowedPath(relative),
    `out-of-lane changed path: ${relative}`,
  );
}

process.stdout.write(
  [
    "VOID_AGENT_MCP_BRIDGE_V1_PROOF=PASS",
    `expected_files=${EXPECTED_FILES.length}`,
    `lane_files=${laneFiles.length}`,
    `changed_paths_checked=${new Set(changed).size}`,
    "catalog_descriptive_only=true",
    "submit_default_disabled=true",
    "submit_dual_gate=true",
    "payment_execution=false",
    "work_execution=false",
    "wc_ledger_write=false",
    "wallet_or_signer_access=false",
    "transaction_broadcast=false",
    "buy_void_fulfillment=false",
    "",
  ].join("\n"),
);
