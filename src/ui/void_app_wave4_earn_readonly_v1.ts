import * as os from "node:os";

const G: any = globalThis as any;
const MARK = "__void_ui_wave4_earn_readonly_v1";
const ROUTE_MARKER = "VOID_UI_WAVE4_EARN_READONLY_V1";
const EARN_ROUTE = "/__void/ui/wave4/earn.json";
const STATUS_ROUTE = "/__void/ui/wave4-earn-v1/status.json";
const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const HISTORY_LIMIT = 5;

type SourceResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

type TaskClass = "publish" | "verify" | "redundancy" | "work";
type HistoryStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "recorded";

function isLoopbackRequest(req: any): boolean {
  const values = [
    req?.ip,
    req?.socket?.remoteAddress,
    req?.connection?.remoteAddress,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return values.some(
    (value) =>
      value === "127.0.0.1" ||
      value.startsWith("127.") ||
      value === "::1" ||
      value === "::ffff:127.0.0.1" ||
      value === "localhost"
  );
}

function sendJson(req: any, res: any, code: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value));

  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-void-marker": ROUTE_MARKER,
  });

  if (String(req?.method || "GET").toUpperCase() === "HEAD") {
    res.end();
    return;
  }

  res.end(body);
}

function sourceBase(): string {
  const port = Math.max(
    1,
    Math.min(65535, Number(process.env.HTTP_PORT || 4100) || 4100)
  );

  return `http://127.0.0.1:${port}`;
}

function accountId(raw: unknown): string | null {
  const value = String(raw || "").trim();

  return ACCOUNT_PATTERN.test(value) ? value : null;
}

function objectBody(source: SourceResult): Record<string, any> {
  return source.body !== null &&
    typeof source.body === "object" &&
    !Array.isArray(source.body)
    ? (source.body as Record<string, any>)
    : {};
}

function arrayBody(
  source: SourceResult,
  key: string
): Record<string, any>[] {
  const body = objectBody(source);
  const value = body[key];

  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, any> =>
          item !== null &&
          typeof item === "object" &&
          !Array.isArray(item)
      )
    : [];
}

function finiteNumber(raw: unknown): number | null {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function nonNegative(raw: unknown): number | null {
  const value = finiteNumber(raw);

  return value !== null && value >= 0 ? value : null;
}

function displayNumber(raw: number | null): string {
  if (raw === null) return "—";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 9,
  }).format(raw);
}

function safeReference(raw: unknown): string {
  const value = String(raw || "").trim();

  if (!/^[A-Za-z0-9._:-]{1,180}$/.test(value)) return "";

  return value;
}

function shortReference(raw: string): string {
  if (!raw) return "—";
  if (raw.length <= 22) return raw;

  return `${raw.slice(0, 10)}…${raw.slice(-8)}`;
}

function timestampIso(raw: unknown): string | null {
  const value = finiteNumber(raw);

  if (value === null || value <= 0) return null;

  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function normalizeTask(raw: unknown): TaskClass {
  const value = String(raw || "").trim().toLowerCase();

  if (value.includes("redundancy")) return "redundancy";
  if (value.includes("verify")) return "verify";
  if (value.includes("publish") || value === "datanet_receipt") {
    return "publish";
  }

  return "work";
}

function taskLabel(task: TaskClass): string {
  if (task === "publish") return "Publish data";
  if (task === "verify") return "Verify data";
  if (task === "redundancy") return "Check redundancy";

  return "Useful work";
}

function normalizeStatus(raw: unknown): HistoryStatus {
  const value = String(raw || "").trim().toLowerCase();

  if (value === "queued" || value === "pending" || value === "ready") {
    return "queued";
  }

  if (value === "running" || value === "processing") return "running";

  if (
    value === "completed" ||
    value === "credited" ||
    value === "done" ||
    value === "ok" ||
    value === "success"
  ) {
    return "completed";
  }

  if (value === "failed" || value === "error") return "failed";

  return "recorded";
}

function statusLabel(status: HistoryStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function reasonLabel(raw: unknown): string {
  const value = String(raw || "").trim().toLowerCase();

  if (value === "target_publish_mix") {
    return "Network currently favors a publish task.";
  }

  if (value === "stale_verify_target") {
    return "A stale object is available for verification.";
  }

  if (value === "redundancy_target") {
    return "A redundancy check is currently preferred.";
  }

  if (value === "receipt_auto_credit") {
    return "Verified receipt credit.";
  }

  if (!value) return "No selection reason is currently available.";

  return "Useful-work policy selected this task.";
}

function sanitizeJob(raw: Record<string, any>): Record<string, unknown> {
  const reference = safeReference(raw.job_id || raw.id);
  const receiptReference = safeReference(raw.receipt_id);
  const task = normalizeTask(
    raw.task_class ||
    raw.selected_task_class ||
    raw.kind ||
    raw.type
  );
  const status = normalizeStatus(raw.display_status || raw.status);
  const reward = nonNegative(raw.delta);

  return {
    reference,
    short_reference: shortReference(reference),
    receipt_reference: receiptReference,
    short_receipt_reference: shortReference(receiptReference),
    task_class: task,
    task_label: taskLabel(task),
    status,
    status_label: statusLabel(status),
    result_label:
      status === "completed"
        ? task === "verify"
          ? "Verified"
          : task === "redundancy"
            ? "Checked"
            : "Stored"
        : statusLabel(status),
    recorded_at: timestampIso(
      raw.sort_ts_ms ||
      raw.completed_at_ms ||
      raw.created_at_ms ||
      raw.ts_ms
    ),
    reward_wc: reward,
    reward_display: displayNumber(reward),
    dataset_selected: Boolean(
      raw.dataset_id || raw.selected_dataset_id
    ),
    safe_mode:
      typeof raw.safe_mode === "boolean" ? raw.safe_mode : null,
  };
}

function sanitizeReceipt(
  raw: Record<string, any>
): Record<string, unknown> {
  const reference = safeReference(raw.receipt_id || raw.id);
  const jobReference = safeReference(raw.job_id);
  const task = normalizeTask(
    raw.task_class ||
    raw.kind ||
    raw.reason
  );
  const status = normalizeStatus(raw.display_status || raw.status);
  const reward = nonNegative(raw.delta);
  const bytes = nonNegative(raw.bytes);

  return {
    reference,
    short_reference: shortReference(reference),
    job_reference: jobReference,
    short_job_reference: shortReference(jobReference),
    task_class: task,
    task_label: taskLabel(task),
    status,
    status_label: statusLabel(status),
    result_label:
      status === "completed"
        ? task === "verify"
          ? "Verified"
          : task === "redundancy"
            ? "Checked"
            : "Accepted"
        : statusLabel(status),
    recorded_at: timestampIso(raw.sort_ts_ms || raw.ts_ms),
    reward_wc: reward,
    reward_display: displayNumber(reward),
    bytes,
    bytes_display:
      bytes === null
        ? "—"
        : new Intl.NumberFormat("en-US").format(bytes),
  };
}

async function fetchJson(base: string, route: string): Promise<SourceResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  timer.unref?.();

  try {
    const response = await fetch(base + route, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "void-ui-wave4-earn-readonly-v1",
        "Cache-Control": "no-store",
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let body: unknown = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      body: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

function nodeIdentity(): {
  label: string;
  role: "precision" | "nimo" | "alienware" | "local";
} {
  const hostname = os.hostname();

  if (/precision/i.test(hostname)) {
    return { label: "Precision", role: "precision" };
  }

  if (/n153b|nimo/i.test(hostname)) {
    return { label: "Nimo", role: "nimo" };
  }

  if (/alienware/i.test(hostname)) {
    return { label: "Alienware", role: "alienware" };
  }

  return { label: "Local node", role: "local" };
}

async function buildSnapshot(account: string): Promise<Record<string, unknown>> {
  const base = sourceBase();
  const encoded = encodeURIComponent(account);

  const [
    runnerSource,
    rewardSource,
    redeemableSource,
    productionSource,
    jobsSource,
    receiptsSource,
    datanetSource,
  ] = await Promise.all([
    fetchJson(base, `/wc/runner/status?account=${encoded}`),
    fetchJson(base, `/wc/reward-stats?account=${encoded}`),
    fetchJson(base, `/wc/redeemable?account=${encoded}`),
    fetchJson(base, `/wc/production/balance?account=${encoded}`),
    fetchJson(base, `/jobs?account=${encoded}&limit=${HISTORY_LIMIT}`),
    fetchJson(
      base,
      `/receipts?account=${encoded}&limit=${HISTORY_LIMIT}`
    ),
    fetchJson(
      base,
      `/__void/participant/datanet-wc/status?account=${encoded}`
    ),
  ]);

  const runner = objectBody(runnerSource);
  const reward = objectBody(rewardSource);
  const redeemable = objectBody(redeemableSource);
  const production = objectBody(productionSource);
  const datanet = objectBody(datanetSource);

  const runnerAvailable =
    runnerSource.status === 200 && runner.ok === true;
  const enabled = runnerAvailable && runner.enabled === true;
  const manualOnly = enabled && runner.manual_only === true;
  const automaticBackground =
    enabled &&
    runner.loop_started === true &&
    runner.loop_disabled !== true;

  const earningStatus =
    !runnerAvailable
      ? "unavailable"
      : !enabled
        ? "stopped"
        : manualOnly
          ? "manual_only"
          : automaticBackground
            ? "active"
            : "configured";

  const earningStatusLabel =
    earningStatus === "manual_only"
      ? "Manual only"
      : earningStatus === "active"
        ? "Active"
        : earningStatus === "configured"
          ? "Configured"
          : earningStatus === "stopped"
            ? "Stopped"
            : "Unavailable";

  const approvedTasks = Array.isArray(runner.approved_task_classes)
    ? runner.approved_task_classes
        .map((value: unknown) => normalizeTask(value))
        .filter(
          (value: TaskClass, index: number, all: TaskClass[]) =>
            all.indexOf(value) === index
        )
        .map((task: TaskClass) => ({
          task_class: task,
          label: taskLabel(task),
        }))
    : [];

  const selection =
    runner.selection !== null &&
    typeof runner.selection === "object" &&
    !Array.isArray(runner.selection)
      ? runner.selection
      : {};

  const selectedTask = normalizeTask(
    selection.task_class || runner.active_task_class
  );

  const selectionAvailable =
    runnerAvailable &&
    Boolean(selection.task_class || runner.active_task_class);

  const earned =
    redeemableSource.status === 200 && redeemable.ok === true
      ? nonNegative(redeemable.earned)
      : null;

  const redeemed =
    redeemableSource.status === 200 && redeemable.ok === true
      ? nonNegative(redeemable.redeemed)
      : null;

  const redeemableWc =
    redeemableSource.status === 200 && redeemable.ok === true
      ? nonNegative(redeemable.redeemable)
      : null;

  const debited =
    redeemableSource.status === 200 && redeemable.ok === true
      ? nonNegative(redeemable.debited)
      : null;

  const productionBalance =
    productionSource.status === 200 &&
    production.ok === true &&
    production.marker === "VOID_WC_PRODUCTION_BALANCE_V1"
      ? nonNegative(production.balance)
      : null;

  const totals =
    reward.totals_last_hour !== null &&
    typeof reward.totals_last_hour === "object" &&
    !Array.isArray(reward.totals_last_hour)
      ? reward.totals_last_hour
      : {};

  const lastCredit =
    reward.last_credit !== null &&
    typeof reward.last_credit === "object" &&
    !Array.isArray(reward.last_credit)
      ? reward.last_credit
      : null;

  const lastCreditAmount = lastCredit
    ? nonNegative(lastCredit.delta)
    : null;

  const lastCreditTask = lastCredit
    ? normalizeTask(lastCredit.receipt_kind)
    : "work";

  const jobs = arrayBody(jobsSource, "jobs")
    .slice(0, HISTORY_LIMIT)
    .map(sanitizeJob);

  const receipts = arrayBody(receiptsSource, "receipts")
    .slice(0, HISTORY_LIMIT)
    .map(sanitizeReceipt);

  const datanetBody =
    datanet.datanet !== null &&
    typeof datanet.datanet === "object" &&
    !Array.isArray(datanet.datanet)
      ? datanet.datanet
      : {};

  const receiptStats =
    datanetBody.receipts !== null &&
    typeof datanetBody.receipts === "object" &&
    !Array.isArray(datanetBody.receipts)
      ? datanetBody.receipts
      : {};

  const wcBody =
    datanet.wc !== null &&
    typeof datanet.wc === "object" &&
    !Array.isArray(datanet.wc)
      ? datanet.wc
      : {};

  const accountEvents =
    wcBody.account_events !== null &&
    typeof wcBody.account_events === "object" &&
    !Array.isArray(wcBody.account_events)
      ? wcBody.account_events
      : {};

  return {
    ok: true,
    marker: ROUTE_MARKER,
    generated_at: new Date().toISOString(),
    read_only: true,
    network_name: "Mainnet-0",
    node: nodeIdentity(),
    account: {
      selected: true,
      id: account,
      label: account,
    },
    earning: {
      source_available: runnerAvailable,
      status: earningStatus,
      status_label: earningStatusLabel,
      enabled,
      manual_only: manualOnly,
      automatic_background: automaticBackground,
      safe_mode: runner.safe_mode === true,
      policy:
        runner.payout_policy === "useful_verifiable_only"
          ? "Useful, verifiable work only"
          : "Policy unavailable",
      approved_task_classes: approvedTasks,
      jobs_last_hour: nonNegative(runner.jobs_last_hour),
      max_jobs_per_hour: nonNegative(runner.max_jobs_per_hour),
      summary:
        earningStatus === "manual_only"
          ? "Earning is configured, but background execution is disabled. This Wave 4 view does not run work."
          : earningStatus === "active"
            ? "The runner reports active earning. This Wave 4 view remains read-only."
            : earningStatus === "configured"
              ? "Earning is configured. This Wave 4 view does not execute work."
              : earningStatus === "stopped"
                ? "Earning is stopped for this account."
                : "Earning status is unavailable.",
      available_work: {
        available: selectionAvailable,
        task_class: selectionAvailable ? selectedTask : null,
        task_label: selectionAvailable
          ? taskLabel(selectedTask)
          : "No task selected",
        reason: reasonLabel(selection.reason),
        difficulty:
          ["low", "medium", "high"].includes(
            String(selection.difficulty_bucket || "").toLowerCase()
          )
            ? String(selection.difficulty_bucket).toLowerCase()
            : null,
        network_need_score: nonNegative(selection.network_need_score),
        dataset_selected: Boolean(selection.dataset_id),
        execution_available: false,
      },
    },
    accounting: {
      legacy_wc: {
        available: earned !== null,
        earned,
        earned_display: displayNumber(earned),
        redeemed,
        redeemed_display: displayNumber(redeemed),
        redeemable: redeemableWc,
        redeemable_display: displayNumber(redeemableWc),
        debited,
        debited_display: displayNumber(debited),
        spendable_claimed: false,
        redemption_action_available: false,
      },
      production_wc: {
        available: productionBalance !== null,
        balance: productionBalance,
        display: displayNumber(productionBalance),
        entries:
          productionBalance !== null
            ? nonNegative(production.count)
            : null,
        ledger_version:
          productionBalance !== null
            ? String(production.ledger_version || "")
            : "",
        spendable: false,
        redeemable: false,
        transferable: false,
        included_in_legacy_balance: false,
      },
      rewards_last_hour: {
        total: nonNegative(totals.total_wc),
        total_display: displayNumber(nonNegative(totals.total_wc)),
        publish: nonNegative(totals.publish_wc),
        verify: nonNegative(totals.verify_wc),
        redundancy: nonNegative(totals.redundancy_wc),
      },
      last_credit: {
        available: lastCredit !== null && lastCreditAmount !== null,
        amount: lastCreditAmount,
        amount_display: displayNumber(lastCreditAmount),
        task_class: lastCredit ? lastCreditTask : null,
        task_label: lastCredit
          ? taskLabel(lastCreditTask)
          : "No credit recorded",
        reason: lastCredit
          ? reasonLabel(lastCredit.reason)
          : "No credit recorded.",
        recorded_at: lastCredit
          ? timestampIso(lastCredit.ts_ms)
          : null,
      },
    },
    recent_jobs: {
      available: jobsSource.status === 200,
      count: jobs.length,
      limit: HISTORY_LIMIT,
      items: jobs,
    },
    verification_receipts: {
      available: receiptsSource.status === 200,
      count: receipts.length,
      limit: HISTORY_LIMIT,
      items: receipts,
    },
    datanet: {
      source_available:
        datanetSource.status === 200 && datanet.ok === true,
      status:
        datanetBody.status === "available"
          ? "available"
          : "unavailable",
      receipt_store_records: nonNegative(receiptStats.total),
      account_wc_events: nonNegative(accountEvents.matched),
      useful_work_policy:
        datanet.safety?.useful_work_policy ===
        "useful_verifiable_only"
          ? "Useful, verifiable work only"
          : "Policy unavailable",
      mutation: false,
    },
    sources: {
      runner_status: {
        route: "/wc/runner/status",
        ok: runnerSource.ok,
        status: runnerSource.status,
      },
      reward_stats: {
        route: "/wc/reward-stats",
        ok: rewardSource.ok,
        status: rewardSource.status,
      },
      redeemable: {
        route: "/wc/redeemable",
        ok: redeemableSource.ok,
        status: redeemableSource.status,
      },
      production_wc: {
        route: "/wc/production/balance",
        ok: productionSource.ok,
        status: productionSource.status,
      },
      jobs: {
        route: "/jobs",
        ok: jobsSource.ok,
        status: jobsSource.status,
      },
      receipts: {
        route: "/receipts",
        ok: receiptsSource.ok,
        status: receiptsSource.status,
      },
      datanet_wc: {
        route: "/__void/participant/datanet-wc/status",
        ok: datanetSource.ok,
        status: datanetSource.status,
      },
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
  };
}

function install(app: any): boolean {
  if (!app || typeof app.all !== "function") return false;
  if (G[MARK]) return true;

  G[MARK] = true;

  app.all(EARN_ROUTE, async (req: any, res: any) => {
    if (!isLoopbackRequest(req)) {
      sendJson(req, res, 404, {
        ok: false,
        error: "not_found",
      });
      return;
    }

    const method = String(req?.method || "GET").toUpperCase();

    if (method !== "GET" && method !== "HEAD") {
      sendJson(req, res, 405, {
        ok: false,
        error: "method_not_allowed",
        allowed: ["GET", "HEAD"],
      });
      return;
    }

    const account = accountId(req?.query?.account);

    if (!account) {
      sendJson(req, res, 400, {
        ok: false,
        error: "missing_or_invalid_account_id",
        account_rule: "^[A-Za-z0-9._:-]{1,128}$",
      });
      return;
    }

    sendJson(req, res, 200, await buildSnapshot(account));
  });

  app.all(STATUS_ROUTE, (req: any, res: any) => {
    if (!isLoopbackRequest(req)) {
      sendJson(req, res, 404, {
        ok: false,
        error: "not_found",
      });
      return;
    }

    const method = String(req?.method || "GET").toUpperCase();

    if (method !== "GET" && method !== "HEAD") {
      sendJson(req, res, 405, {
        ok: false,
        error: "method_not_allowed",
        allowed: ["GET", "HEAD"],
      });
      return;
    }

    sendJson(req, res, 200, {
      ok: true,
      marker: ROUTE_MARKER,
      route: EARN_ROUTE,
      status_route: STATUS_ROUTE,
      loopback_only: true,
      methods: ["GET", "HEAD"],
      account_rule: "^[A-Za-z0-9._:-]{1,128}$",
      history_limit: HISTORY_LIMIT,
      exact_source_routes: [
        "/wc/runner/status",
        "/wc/reward-stats",
        "/wc/redeemable",
        "/wc/production/balance",
        "/jobs",
        "/receipts",
        "/__void/participant/datanet-wc/status",
      ],
      one_frontend_adapter: true,
      sanitized_source_bodies: true,
      job_execution: false,
      job_submission: false,
      reward_award: false,
      runner_activation: false,
      wc_redeem: false,
      wc_send: false,
      wc_to_void: false,
      ledger_write: false,
      wallet_connection: false,
      money_movement: false,
    });
  });

  console.log(
    "[void-app-wave4-earn-readonly.v1] mounted " +
      `${EARN_ROUTE} loopback-only`
  );

  return true;
}

(function mountVoidAppWave4EarnReadonlyV1() {
  const tryInstall = (): void => {
    try {
      const app = G.__void_http_app;

      if (install(app)) return;
    } catch {
      // Bounded retry preserves additive startup behavior.
    }

    setTimeout(tryInstall, 250).unref?.();
  };

  tryInstall();
})();

export {};
