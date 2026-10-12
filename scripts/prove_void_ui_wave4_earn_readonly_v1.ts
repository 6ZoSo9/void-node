import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import {
  loadAccount,
  renderEarnHistoryV1,
  validateEarnHistoryV1,
} from "../public/void-app-wave1-v1/assets/js/earn-live.js";

const root = process.cwd();

function fail(message: string): never {
  throw new Error(`VOID_UI_WAVE4_EARN_READONLY_V1_FAIL: ${message}`);
}

function read(relative: string): string {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

const moduleSource = read("src/ui/void_app_wave4_earn_readonly_v1.ts");
const client = read("public/void-app-wave1-v1/assets/js/earn-live.js");
const views = read("public/void-app-wave1-v1/assets/js/views.js");
const css = read("public/void-app-wave1-v1/assets/css/views.css");
const html = read("public/void-app-wave1-v1/index.html");
const wave3Module = read("src/ui/void_app_wave3_wallet_readonly_v1.ts");

const exactFiniteNumber = (raw: unknown): number | null =>
  typeof raw === "number" && Number.isFinite(raw) ? raw : null;
const exactNonNegative = (raw: unknown): number | null => {
  const value = exactFiniteNumber(raw);
  return value !== null && value >= 0 ? value : null;
};

for (const invalid of [
  null,
  true,
  false,
  "",
  "0",
  "1.25",
  [],
  [0],
  {},
  { value: 0 },
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
]) {
  assert.equal(exactFiniteNumber(invalid), null);
  assert.equal(exactNonNegative(invalid), null);
}
assert.equal(exactFiniteNumber(0), 0);
assert.equal(exactFiniteNumber(1.25), 1.25);
assert.equal(exactNonNegative(0), 0);
assert.equal(exactNonNegative(1.25), 1.25);
assert.equal(exactNonNegative(-0.25), null);

for (const kind of ["job", "receipt"] as const) {
  assert.throws(
    () =>
      validateEarnHistoryV1(
        {
          available: false,
          count: 1,
          limit: 5,
          items: [{}],
        },
        kind,
      ),
    new RegExp(`earn ${kind} unavailable history must be empty`),
  );
}

const priorDocument = globalThis.document;
const staleJobRow = Object.freeze({ id: "stale-job-row" });
const staleReceiptRow = Object.freeze({ id: "stale-receipt-row" });
const inertNodes = new Map<string, {
  children?: unknown[];
  hidden?: boolean;
  textContent?: string;
  replaceChildren?: (...children: unknown[]) => void;
}>([
  [
    "[data-earn-jobs-list]",
    {
      children: [staleJobRow],
      replaceChildren(...children: unknown[]) {
        this.children = children;
      },
    },
  ],
  [
    "[data-earn-jobs-empty]",
    { hidden: true, textContent: "stale jobs" },
  ],
  [
    "[data-earn-receipts-list]",
    {
      children: [staleReceiptRow],
      replaceChildren(...children: unknown[]) {
        this.children = children;
      },
    },
  ],
  [
    "[data-earn-receipts-empty]",
    { hidden: true, textContent: "stale receipts" },
  ],
]);

Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: {
    querySelector: (selector: string) => inertNodes.get(selector) ?? null,
    createElement: () => {
      throw new Error("unavailable history attempted to render a row");
    },
  },
});
try {
  renderEarnHistoryV1(
    "[data-earn-jobs-list]",
    "[data-earn-jobs-empty]",
    { available: false, count: 1, limit: 5, items: [{}] },
    "job",
  );
  renderEarnHistoryV1(
    "[data-earn-receipts-list]",
    "[data-earn-receipts-empty]",
    { available: false, count: 1, limit: 5, items: [{}] },
    "receipt",
  );
} finally {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: priorDocument,
  });
}

assert.deepEqual(inertNodes.get("[data-earn-jobs-list]")?.children, []);
assert.equal(inertNodes.get("[data-earn-jobs-empty]")?.hidden, false);
assert.equal(
  inertNodes.get("[data-earn-jobs-empty]")?.textContent,
  "Recent job history unavailable.",
);
assert.deepEqual(inertNodes.get("[data-earn-receipts-list]")?.children, []);
assert.equal(inertNodes.get("[data-earn-receipts-empty]")?.hidden, false);
assert.equal(
  inertNodes.get("[data-earn-receipts-empty]")?.textContent,
  "Verification receipt history unavailable.",
);

const unavailableSource = (route: string) => ({
  route,
  ok: false,
  status: 0,
});

const loadPathSnapshot = (
  account = "account-A",
  generatedAt = new Date().toISOString(),
) => ({
  ok: true,
  marker: "VOID_UI_WAVE4_EARN_READONLY_V1",
  generated_at: generatedAt,
  read_only: true,
  network_name: "Mainnet-0",
  node: {
    label: "Local node",
    role: "local",
  },
  account: {
    selected: true,
    id: account,
    label: account,
  },
  earning: {
    source_available: false,
    status: "unavailable",
    status_label: "Unavailable",
    enabled: false,
    manual_only: false,
    automatic_background: false,
    safe_mode: false,
    policy: "Policy unavailable",
    approved_task_classes: [],
    jobs_last_hour: null,
    max_jobs_per_hour: null,
    summary: "Earning status is unavailable.",
    available_work: {
      available: false,
      task_class: null,
      task_label: "No task selected",
      reason: "No selection reason is currently available.",
      difficulty: null,
      network_need_score: null,
      dataset_selected: false,
      execution_available: false,
    },
  },
  accounting: {
    legacy_wc: {
      available: false,
      earned: null,
      earned_display: "—",
      redeemed: null,
      redeemed_display: "—",
      redeemable: null,
      redeemable_display: "—",
      debited: null,
      debited_display: "—",
      spendable_claimed: false,
      redemption_action_available: false,
    },
    production_wc: {
      available: false,
      balance: null,
      display: "—",
      entries: null,
      ledger_version: "",
      spendable: false,
      redeemable: false,
      transferable: false,
      included_in_legacy_balance: false,
    },
    rewards_last_hour: {
      total: null,
      total_display: "—",
      publish: null,
      verify: null,
      redundancy: null,
    },
    last_credit: {
      available: false,
      amount: null,
      amount_display: "—",
      task_class: null,
      task_label: "No credit recorded",
      reason: "No credit recorded.",
      recorded_at: null,
    },
  },
  recent_jobs: {
    available: false,
    count: 1,
    limit: 5,
    items: [{}],
  },
  verification_receipts: {
    available: false,
    count: 0,
    limit: 5,
    items: [],
  },
  datanet: {
    source_available: false,
    status: "unavailable",
    receipt_store_records: null,
    account_wc_events: null,
    useful_work_policy: "Policy unavailable",
    mutation: false,
  },
  sources: {
    runner_status: unavailableSource("/wc/runner/status"),
    reward_stats: unavailableSource("/wc/reward-stats"),
    redeemable: unavailableSource("/wc/redeemable"),
    production_wc: unavailableSource("/wc/production/balance"),
    jobs: unavailableSource("/jobs"),
    receipts: unavailableSource("/receipts"),
    datanet_wc: unavailableSource("/__void/participant/datanet-wc/status"),
  },
  sanitization: {
    raw_source_bodies: false,
    absolute_paths: false,
    wallet_addresses: false,
    redeemed_event_wallets: false,
    job_inputs: false,
    job_meta: false,
    receipt_roots: false,
    receipt_leaves: false,
    receipt_payloads: false,
  },
  boundaries: {
    job_execution: false,
    job_submission: false,
    reward_award: false,
    runner_activation: false,
    runner_tick: false,
    runner_config: false,
    wc_redeem: false,
    wc_send: false,
    wc_to_void: false,
    ledger_write: false,
    browser_wallet_connection: false,
    validator_mutation: false,
    operator_mutation: false,
    money_movement: false,
  },
});

const staleEvidenceNodes = [
  "[data-earn-account-id]",
  "[data-earn-status]",
  "[data-earn-approved-work]",
  "[data-earn-policy]",
  "[data-earn-safe-mode]",
  "[data-earn-background]",
  "[data-earn-earned-wc]",
  "[data-earn-redeemable-wc]",
  "[data-earn-production-wc]",
  "[data-earn-earned-meta]",
  "[data-earn-redeemable-meta]",
  "[data-earn-production-meta]",
  "[data-earn-task-label]",
  "[data-earn-task-reason]",
  "[data-earn-task-difficulty]",
  "[data-earn-task-need]",
  "[data-earn-last-hour]",
  "[data-earn-last-credit]",
  "[data-earn-last-credit-time]",
  "[data-earn-datanet-status]",
  "[data-earn-datanet-records]",
  "[data-earn-account-events]",
  "[data-earn-source-runner]",
  "[data-earn-source-reward]",
  "[data-earn-source-redeemable]",
  "[data-earn-source-production]",
  "[data-earn-source-jobs]",
  "[data-earn-source-receipts]",
  "[data-earn-source-datanet]",
].map((selector) => [selector, { textContent: "stale evidence" }] as const);

const loadNodes = new Map<string, any>([
  ["[data-earn-state-chip]", { className: "", textContent: "Loaded" }],
  ["[data-earn-message]", { textContent: "stale loaded message" }],
  ...staleEvidenceNodes,
  ["[data-earn-jobs-count]", { textContent: "7" }],
  ["[data-earn-receipts-count]", { textContent: "9" }],
  [
    "[data-earn-jobs-list]",
    {
      children: [staleJobRow],
      replaceChildren(...children: unknown[]) {
        this.children = children;
      },
    },
  ],
  [
    "[data-earn-jobs-empty]",
    { hidden: true, textContent: "stale jobs" },
  ],
  [
    "[data-earn-receipts-list]",
    {
      children: [staleReceiptRow],
      replaceChildren(...children: unknown[]) {
        this.children = children;
      },
    },
  ],
  [
    "[data-earn-receipts-empty]",
    { hidden: true, textContent: "stale receipts" },
  ],
]);

const priorWindow = globalThis.window;
const priorSessionStorage = globalThis.sessionStorage;
const priorFetch = globalThis.fetch;
const loadButton = { disabled: false };
let storageWrites = 0;
let failedLoadMessage = "";

Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: {
    querySelector: (selector: string) => loadNodes.get(selector) ?? null,
    querySelectorAll: (selector: string) => {
      const node = loadNodes.get(selector);
      return node ? [node] : [];
    },
    createElement: () => {
      throw new Error("load error path attempted to render a history row");
    },
  },
});
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    location: {
      hash: "#/earn",
      origin: "https://void.example",
    },
  },
});
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    setItem() {
      storageWrites += 1;
    },
    getItem() {
      return null;
    },
    removeItem() {},
  },
});
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: async () => {
    const response = new Response(
      JSON.stringify(loadPathSnapshot()),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
    Object.defineProperty(response, "url", {
      configurable: true,
      value: "https://void.example/__void/ui/wave4/earn.json?account=account-A",
    });
    return response;
  },
});

try {
  await loadAccount("account-A", loadButton);
  failedLoadMessage = String(
    loadNodes.get("[data-earn-message]")?.textContent || "",
  );

  loadNodes.get("[data-earn-account-id]").textContent = "late stale account";
  loadButton.disabled = true;
  await loadAccount("bad account!", loadButton);
} finally {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: priorDocument,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: priorWindow,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: priorSessionStorage,
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: priorFetch,
  });
}

assert.equal(loadButton.disabled, false);
assert.equal(storageWrites, 0);
assert.match(
  failedLoadMessage,
  /earn job unavailable history must be empty/,
);
for (const [selector, expected] of [
  ["[data-earn-account-id]", "—"],
  ["[data-earn-status]", "Not checked"],
  ["[data-earn-approved-work]", "Not checked"],
  ["[data-earn-policy]", "Not checked"],
  ["[data-earn-safe-mode]", "Not checked"],
  ["[data-earn-background]", "Not checked"],
  ["[data-earn-earned-wc]", "—"],
  ["[data-earn-redeemable-wc]", "—"],
  ["[data-earn-production-wc]", "—"],
  ["[data-earn-earned-meta]", "No account loaded"],
  ["[data-earn-redeemable-meta]", "Visibility only"],
  ["[data-earn-production-meta]", "Non-spendable"],
  ["[data-earn-task-label]", "No task selected"],
  ["[data-earn-task-reason]", "Load an account to inspect policy selection."],
  ["[data-earn-task-difficulty]", "—"],
  ["[data-earn-task-need]", "—"],
  ["[data-earn-last-hour]", "—"],
  ["[data-earn-last-credit]", "No credit loaded"],
  ["[data-earn-last-credit-time]", "—"],
  ["[data-earn-datanet-status]", "Not checked"],
  ["[data-earn-datanet-records]", "—"],
  ["[data-earn-account-events]", "—"],
  ["[data-earn-source-runner]", "Not checked"],
  ["[data-earn-source-reward]", "Not checked"],
  ["[data-earn-source-redeemable]", "Not checked"],
  ["[data-earn-source-production]", "Not checked"],
  ["[data-earn-source-jobs]", "Not checked"],
  ["[data-earn-source-receipts]", "Not checked"],
  ["[data-earn-source-datanet]", "Not checked"],
]) {
  assert.equal(loadNodes.get(selector)?.textContent, expected, selector);
}
assert.equal(loadNodes.get("[data-earn-jobs-count]")?.textContent, "0");
assert.equal(loadNodes.get("[data-earn-receipts-count]")?.textContent, "0");
assert.deepEqual(loadNodes.get("[data-earn-jobs-list]")?.children, []);
assert.deepEqual(loadNodes.get("[data-earn-receipts-list]")?.children, []);
assert.equal(loadNodes.get("[data-earn-jobs-empty]")?.hidden, false);
assert.equal(
  loadNodes.get("[data-earn-jobs-empty]")?.textContent,
  "Recent job history unavailable.",
);
assert.equal(loadNodes.get("[data-earn-receipts-empty]")?.hidden, false);
assert.equal(
  loadNodes.get("[data-earn-receipts-empty]")?.textContent,
  "Verification receipt history unavailable.",
);
assert.equal(
  loadNodes.get("[data-earn-state-chip]")?.textContent,
  "Earn state unavailable",
);
assert.match(
  String(loadNodes.get("[data-earn-message]")?.textContent || ""),
  /Use 1–128 letters, numbers, periods, underscores, colons, or hyphens/,
);

for (const marker of [
  'return typeof raw === "number" && Number.isFinite(raw)',
  "const lastCreditAvailable =",
  "lastCredit !== null && lastCreditAmount !== null",
  "jobs_last_hour: nonNegative(runner.jobs_last_hour),",
  "total: nonNegative(totals.total_wc),",
  "total_display: displayNumber(nonNegative(totals.total_wc))",
  "available: lastCreditAvailable",
]) {
  if (!moduleSource.includes(marker)) {
    fail(`server numeric evidence contract missing: ${marker}`);
  }
}

for (const forbidden of [
  "const value = Number(raw)",
  "nonNegative(runner.jobs_last_hour) ?? 0",
  "nonNegative(production.count) ?? 0",
  "nonNegative(totals.total_wc) ?? 0",
]) {
  if (moduleSource.includes(forbidden)) {
    fail(`server numeric coercion/default remains: ${forbidden}`);
  }
}

for (const marker of [
  "const finiteNumber = (value) =>",
  "typeof value === 'number' && Number.isFinite(value)",
  "const nonNegativeSafeInteger = (value) =>",
  "const networkNeedScore = finiteNumber(",
  "lastCredit.available === true",
  "setText('[data-earn-jobs-count]', jobsCount)",
  "setText('[data-earn-receipts-count]', receiptsCount)",
  "value.available === false &&",
  "unavailable history must be empty",
  "jobs.available === true",
  "receipts.available === true",
  "renderEarnHistoryV1(",
  "resetEarnView(",
  "invalidateEarnRequest('earn request replaced by invalid account');",
  "restoreEarnLoadControlV1(button);",
  "export const loadAccount = async",
  "Recent job history unavailable.",
  "Verification receipt history unavailable.",
]) {
  if (!client.includes(marker)) {
    fail(`browser numeric evidence contract missing: ${marker}`);
  }
}

for (const forbidden of [
  "const number = Number(",
  "const status = Number(",
  "Number.isFinite(Number(",
  "jobs.count ?? 0",
  "receipts.count ?? 0",
]) {
  if (client.includes(forbidden)) {
    fail(`browser numeric coercion/default remains: ${forbidden}`);
  }
}

for (const marker of [
  'const ROUTE_MARKER = "VOID_UI_WAVE4_EARN_READONLY_V1"',
  'const EARN_ROUTE = "/__void/ui/wave4/earn.json"',
  'const STATUS_ROUTE = "/__void/ui/wave4-earn-v1/status.json"',
  'const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/',
  'const HISTORY_LIMIT = 5',
  'VOID_UI_WAVE4_EARN_SOURCE_MAX_RESPONSE_BYTES_V1 = 128 * 1024',
  'VOID_UI_WAVE4_EARN_SOURCE_TIMEOUT_MS_V1 = 5000',
  'VOID_UI_WAVE4_EARN_SOURCE_TEARDOWN_MS_V1 = 250',
  'VOID_UI_WAVE4_EARN_SOURCE_MAX_ZERO_PROGRESS_READS_V1 = 64',
  'redirect: "error"',
  'credentials: "omit"',
  'referrerPolicy: "no-referrer"',
  'response.url !== target',
  'mediaType !== "application/json"',
  'new TextDecoder("utf-8", { fatal: true })',
  'fetchEarnSourceWithinSignalV1(',
  'earn_source_late_fetch_after_deadline',
  'value === "127.0.0.1"',
  'value === "::1"',
  'method !== "GET" && method !== "HEAD"',
  'fetchVoidUiWave4EarnSourceJsonV1(base, `/wc/runner/status?account=${encoded}`)',
  'fetchVoidUiWave4EarnSourceJsonV1(base, `/wc/reward-stats?account=${encoded}`)',
  'fetchVoidUiWave4EarnSourceJsonV1(base, `/wc/redeemable?account=${encoded}`)',
  'fetchVoidUiWave4EarnSourceJsonV1(base, `/wc/production/balance?account=${encoded}`)',
  'fetchVoidUiWave4EarnSourceJsonV1(base, `/jobs?account=${encoded}&limit=${HISTORY_LIMIT}`)',
  '`/receipts?account=${encoded}&limit=${HISTORY_LIMIT}`',
  '`/__void/participant/datanet-wc/status?account=${encoded}`',
  'raw_source_bodies: false',
  'absolute_paths: false',
  'wallet_addresses: false',
  'job_inputs: false',
  'job_meta: false',
  'receipt_roots: false',
  'receipt_leaves: false',
  'receipt_payloads: false',
  'job_execution: false',
  'job_submission: false',
  'reward_award: false',
  'runner_activation: false',
  'runner_tick: false',
  'runner_config: false',
  'wc_redeem: false',
  'wc_send: false',
  'wc_to_void: false',
  'ledger_write: false',
  'browser_wallet_connection: false',
  'money_movement: false',
]) {
  if (!moduleSource.includes(marker)) {
    fail(`server marker missing: ${marker}`);
  }
}

for (const forbidden of [
  'app.post(',
  'app.put(',
  'app.patch(',
  'app.delete(',
  'appendFileSync',
  'writeFileSync',
  '"/wc/runner/set"',
  '"/wc/runner/tick"',
  '"/wc/runner/config"',
  '"/wc/redeem"',
  '"/wc/send"',
  '"/wc/scan-receipts"',
  '"/jobs/submit"',
  '"/__void/jobs-and-datanet-worker/run-once"',
  '"/__void/participant/wallet/send-void"',
  '"/__void/participant/wallet/trade/wc-to-void"',
  'privateKey',
  'mnemonic',
  'ciphertext',
  'await response.text()',
  'redirect: "follow"',
]) {
  if (moduleSource.includes(forbidden)) {
    fail(`server contains forbidden mutation or secret marker: ${forbidden}`);
  }
}

const frontendFetches = client.split("fetch(").length - 1;
const requestOwnerRuns =
  client.split("earnRequestOwner.run(").length - 1;

if (
  frontendFetches !== 0 ||
  requestOwnerRuns !== 1 ||
  !client.includes(
    "const route = \`${EARN_ENDPOINT}?account=${encodeURIComponent(value)}\`",
  ) ||
  !client.includes("readBoundedNetworkJsonV1(") ||
  !client.includes("response.url !== expectedUrl") ||
  !client.includes("redirect: 'error'")
) {
  fail(
    "frontend must use exactly one bounded owned Wave 4 adapter request",
  );
}

for (const marker of [
  "const EARN_ENDPOINT = '/__void/ui/wave4/earn.json'",
  "method: 'GET'",
  "cache: 'no-store'",
  "credentials: 'same-origin'",
  "redirect: 'error'",
  "mode: 'same-origin'",
  "referrerPolicy: 'no-referrer'",
  "AbortSignal.timeout(EARN_REQUEST_TIMEOUT_MS)",
  "export const validateEarnSnapshotV1 =",
  "snapshot.ok !== true || snapshot.marker !== EARN_MARKER",
  "Earn response account does not match request",
  "Earn generated timestamp outside freshness window",
  "const EARN_TOP_KEYS = Object.freeze([",
  "const EARN_BOUNDARY_KEYS = Object.freeze([",
  "const validateEarnSnapshotSchemaV1 =",
  "validateEarnSnapshotSchemaV1(snapshot);",
  "data-earn-account-form",
  "data-earn-jobs-list",
  "data-earn-receipts-list",
]) {
  if (!client.includes(marker)) {
    fail(`Earn client marker missing: ${marker}`);
  }
}

for (const forbidden of [
  "window.ethereum",
  "globalThis.ethereum",
  "XMLHttpRequest",
  "WebSocket",
  "sendTransaction",
  "personal_sign",
  "eth_sendTransaction",
  "method: 'POST'",
  "method: 'PUT'",
  "method: 'PATCH'",
  "method: 'DELETE'",
]) {
  if (client.includes(forbidden)) {
    fail(`frontend contains forbidden direct source or mutation marker: ${forbidden}`);
  }
}

const sanitizedSourceMetadataRoutes = [
  "/wc/runner/status",
  "/wc/reward-stats",
  "/wc/redeemable",
  "/wc/production/balance",
  "/jobs",
  "/receipts",
  "/__void/participant/datanet-wc/status",
];

for (const route of sanitizedSourceMetadataRoutes) {
  if (!client.includes(route)) {
    fail(`Earn source-metadata route validation missing: ${route}`);
  }
  for (const directPattern of [
    `fetch('${route}`,
    `fetch("${route}`,
    `fetch(\`${route}`,
    `earnRequestOwner.run('${route}`,
    `earnRequestOwner.run("${route}`,
    `earnRequestOwner.run(\`${route}`,
  ]) {
    if (client.includes(directPattern)) {
      fail(`Earn client directly requests sanitized source route: ${route}`);
    }
  }
}

for (const marker of [
  "function earnView()",
  "data-earn-view",
  "data-earn-account-form",
  "data-earn-earned-wc",
  "data-earn-redeemable-wc",
  "data-earn-production-wc",
  "data-earn-jobs-list",
  "data-earn-receipts-list",
  "Execution disabled",
  "No action in this view",
  "Advanced read-only details",
]) {
  if (!views.includes(marker)) {
    fail(`Earn view marker missing: ${marker}`);
  }
}

if (views.includes("earn: () => placeholderView('Earn'")) {
  fail("Earn placeholder remains active");
}

for (const marker of [
  "./assets/js/home-live.js",
  "./assets/js/wallet-live.js",
  "./assets/js/earn-live.js",
]) {
  if (!html.includes(marker)) {
    fail(`application integration marker missing: ${marker}`);
  }
}

if (html.includes("WAVE 4 READ-ONLY EARN")) {
  fail("obsolete Wave 4 prototype banner remains in production app shell");
}

for (const marker of [
  ".earn-account-form",
  ".earn-facts",
  ".earn-history-list",
  ".earn-source-details",
  ".earn-advanced-grid",
]) {
  if (!css.includes(marker)) {
    fail(`Earn CSS marker missing: ${marker}`);
  }
}

if (
  !wave3Module.startsWith(
    'import "./void_app_wave4_earn_readonly_v1.js";'
  )
) {
  fail("Wave 4 module import is not anchored in the Wave 3 module");
}

for (const relative of [
  "docs/public/void-ui-wave4-earn-readonly-v1/README.md",
  "docs/public/void-ui-wave4-earn-readonly-v1/ADAPTER_CONTRACT.md",
  "docs/public/void-ui-wave4-earn-readonly-v1/ACCEPTANCE_CRITERIA.md",
  "docs/public/void-ui-wave4-earn-readonly-v1/VISUAL_APPROVAL.md",
  "docs/public/void-ui-wave4-earn-readonly-v1/source-manifest.json",
]) {
  if (!fs.existsSync(path.join(root, relative))) {
    fail(`Wave 4 document missing: ${relative}`);
  }
}

const manifest = JSON.parse(
  read("docs/public/void-ui-wave4-earn-readonly-v1/source-manifest.json")
);

if (
  manifest.marker !== "VOID_UI_WAVE4_EARN_READONLY_V1" ||
  manifest.base !== "61c84c4611cc048d4c99c078dfa02da806d49256" ||
  manifest.account_input_kind !== "participant_account_id" ||
  manifest.loopback_only !== true ||
  manifest.get_head_only !== true ||
  manifest.frontend_fetch_count !== 1 ||
  manifest.history_limit !== 5 ||
  manifest.authority_added !== false ||
  manifest.visual_approval?.required !== true ||
  manifest.visual_approval?.approved !== true ||
  manifest.visual_approval?.approved_by !== "ZoSo" ||
  manifest.visual_approval?.approved_date !== "2026-07-15" ||
  manifest.visual_approval?.surface !== "/app/#/earn" ||
  manifest.visual_approval?.account !== "zoso" ||
  manifest.visual_approval?.desktop_reviewed !== true ||
  manifest.visual_approval?.mobile_reviewed !== true ||
  manifest.visual_approval?.receipt_sha256 !==
    "fb8ee0189556fa1a47679f4f6400b227f032cf6eaea6fac63f22e91b1239e406"
) {
  fail("Wave 4 source manifest contract is incorrect");
}

const visualApproval = read(
  "docs/public/void-ui-wave4-earn-readonly-v1/VISUAL_APPROVAL.md"
);

for (const marker of [
  "Approved for staging and PR preparation",
  "Approved by:** ZoSo",
  "Desktop and narrow/mobile layouts were manually reviewed",
  "VOID_UI_WAVE4_EARN_READONLY_VISUAL_PREVIEW_CORRECTED_V2_GREEN",
  "fb8ee0189556fa1a47679f4f6400b227f032cf6eaea6fac63f22e91b1239e406",
  "pre-load/empty state",
]) {
  if (!visualApproval.includes(marker)) {
    fail(`Wave 4 visual approval evidence missing: ${marker}`);
  }
}

const exactSources = [
  "/wc/runner/status",
  "/wc/reward-stats",
  "/wc/redeemable",
  "/wc/production/balance",
  "/jobs",
  "/receipts",
  "/__void/participant/datanet-wc/status",
];

if (
  JSON.stringify(manifest.fixed_source_routes) !==
  JSON.stringify(exactSources)
) {
  fail("Wave 4 fixed source allowlist is incorrect");
}

const hashes = manifest.repository_hashes;

if (!hashes || typeof hashes !== "object" || Array.isArray(hashes)) {
  fail("Wave 4 repository hash map is missing");
}

if (
  Object.prototype.hasOwnProperty.call(
    hashes,
    "scripts/prove_void_ui_wave4_earn_readonly_v1.ts"
  )
) {
  fail("Wave 4 proof self-reference was not excluded");
}

for (const [relative, expected] of Object.entries(hashes)) {
  const target = path.join(root, relative);

  if (!fs.existsSync(target)) {
    fail(`Wave 4 repository hash target missing: ${relative}`);
  }

  const actual = createHash("sha256")
    .update(fs.readFileSync(target))
    .digest("hex");

  if (actual !== expected) {
    fail(`Wave 4 repository hash mismatch: ${relative}`);
  }
}

const wave1 = JSON.parse(
  read("docs/public/void-ui-wave1-foundation-v1/source-manifest.json")
);
const wave2 = JSON.parse(
  read("docs/public/void-ui-wave2-home-readonly-v1/source-manifest.json")
);
const wave3 = JSON.parse(
  read("docs/public/void-ui-wave3-wallet-readonly-v1/source-manifest.json")
);

if (
  wave1.wave4_earn_readonly_transition?.authority_added !== false ||
  wave2.wave4_earn_readonly?.authority_added !== false ||
  wave3.wave4_earn_readonly_transition?.authority_added !== false
) {
  fail("upstream Wave manifests do not bind the Wave 4 no-authority transition");
}

console.log("VOID_UI_WAVE4_EARN_READONLY_V1_GREEN");
