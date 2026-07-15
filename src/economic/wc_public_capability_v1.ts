import crypto from "node:crypto";
import express from "express";
import fs from "node:fs";
import path from "node:path";

/**
 * VOID_WC_PUBLIC_CAPABILITY_V1
 *
 * Bounded activation bridge for real outside-participant useful-work earning.
 *
 * Public authority:
 * - one operator-issued, account-bound, task-bound, expiring, single-use ticket
 * - one public Run Once request using that ticket
 *
 * Internal authority:
 * - canonical loopback-only runner/config/tick/job/worker/receipt-scan routes
 * - canonical WC reward policy and canonical ledger remain authoritative
 *
 * Explicitly absent:
 * - participant-selected WC amount
 * - generic credit route
 * - background earning activation
 * - WC-to-VOID execution
 * - wallet send or money movement
 */
const MARKER = "VOID_WC_PUBLIC_CAPABILITY_V1";
const TASK_CLASS = "datanet_fetch_verify";
const OPERATOR_ISSUE_ROUTE = "/__void/operator/wc-public-capability-v1/issue";
const PUBLIC_RUN_ROUTE = "/wc/public-capability-v1/run-once";
const PUBLIC_STATUS_ROUTE = "/wc/public-capability-v1/status";
const GLOBAL_MARK = "__void_wc_public_capability_v1";

type JsonObject = Record<string, any>;

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function safeAccount(value: unknown): string {
  const account = String(value || "").trim();
  if (!/^[A-Za-z0-9._:@-]{3,128}$/.test(account)) return "";
  return account;
}

function dataDir(): string {
  const raw = String(process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a");
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function rootDir(): string {
  return path.join(dataDir(), "wc_v1", "public-capabilities-v1");
}

function issuedDir(): string {
  return path.join(rootDir(), "issued");
}

function consumedDir(): string {
  return path.join(rootDir(), "consumed");
}

function auditFile(): string {
  return path.join(rootDir(), "audit.jsonl");
}

function ensureDirs(): void {
  fs.mkdirSync(issuedDir(), { recursive: true, mode: 0o700 });
  fs.mkdirSync(consumedDir(), { recursive: true, mode: 0o700 });
}

function enabled(): boolean {
  return String(process.env.VOID_WC_PUBLIC_CAPABILITY_ENABLED || "") === "1";
}

function perAccountCap(): number {
  return clampInt(process.env.VOID_WC_PUBLIC_CAPABILITY_PER_ACCOUNT_CAP, 3, 1, 100);
}

function globalCap(): number {
  return clampInt(process.env.VOID_WC_PUBLIC_CAPABILITY_GLOBAL_CAP, 100, 1, 10000);
}

function defaultTtlMs(): number {
  return clampInt(process.env.VOID_WC_PUBLIC_CAPABILITY_TTL_MS, 15 * 60 * 1000, 60_000, 60 * 60 * 1000);
}

function maxTtlMs(): number {
  return clampInt(process.env.VOID_WC_PUBLIC_CAPABILITY_MAX_TTL_MS, 60 * 60 * 1000, 60_000, 24 * 60 * 60 * 1000);
}

function ticketFile(dir: string, ticketId: string): string {
  if (!/^[0-9a-f]{32}$/.test(ticketId)) throw new Error("invalid_ticket_id");
  return path.join(dir, `${ticketId}.json`);
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function safeHexEqual(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function atomicWriteJson(file: string, value: JsonObject): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, file);
}

function readJson(file: string): JsonObject | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function appendAudit(event: JsonObject): void {
  ensureDirs();
  fs.appendFileSync(
    auditFile(),
    JSON.stringify({ marker: MARKER, ts_ms: Date.now(), ...event }) + "\n",
    { encoding: "utf8", mode: 0o600 },
  );
}

function parseToken(raw: string): { ticketId: string; token: string } | null {
  const token = String(raw || "").trim();
  const match = /^wc1\.([0-9a-f]{32})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;
  return { ticketId: match[1], token };
}

function bearerOrBodyToken(req: any): string {
  const auth = String(req?.headers?.authorization || "");
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  return String(req?.body?.capability_token || "").trim();
}

function ticketCounts(now = Date.now()): {
  active: number;
  consumed: number;
  accountCounts: Record<string, number>;
} {
  ensureDirs();
  let active = 0;
  let consumed = 0;
  const accountCounts: Record<string, number> = {};

  for (const name of fs.readdirSync(issuedDir())) {
    if (!name.endsWith(".json")) continue;
    const record = readJson(path.join(issuedDir(), name));
    if (!record) continue;
    if (Number(record.expires_at_ms || 0) <= now) continue;
    active += 1;
    const account = String(record.account || "");
    if (account) accountCounts[account] = Number(accountCounts[account] || 0) + 1;
  }

  for (const name of fs.readdirSync(consumedDir())) {
    if (!name.endsWith(".json")) continue;
    const record = readJson(path.join(consumedDir(), name));
    if (!record) continue;
    consumed += 1;
    const account = String(record.account || "");
    if (account) accountCounts[account] = Number(accountCounts[account] || 0) + 1;
  }

  return { active, consumed, accountCounts };
}

function issueCapability(account: string, ttlMs: number): JsonObject {
  ensureDirs();
  const now = Date.now();
  const counts = ticketCounts(now);
  const total = counts.active + counts.consumed;
  const accountTotal = Number(counts.accountCounts[account] || 0);

  if (total >= globalCap()) throw new Error("global_cap_reached");
  if (accountTotal >= perAccountCap()) throw new Error("account_cap_reached");

  const ticketId = crypto.randomBytes(16).toString("hex");
  const secret = crypto.randomBytes(32).toString("base64url");
  const token = `wc1.${ticketId}.${secret}`;
  const record = {
    marker: MARKER,
    version: 1,
    ticket_id: ticketId,
    account,
    task_class: TASK_CLASS,
    token_sha256: sha256Hex(token),
    issued_at_ms: now,
    expires_at_ms: now + ttlMs,
    max_uses: 1,
    status: "issued",
    public_run_route: PUBLIC_RUN_ROUTE,
  };

  atomicWriteJson(ticketFile(issuedDir(), ticketId), record);
  appendAudit({
    event: "issued",
    ticket_id: ticketId,
    account,
    task_class: TASK_CLASS,
    expires_at_ms: record.expires_at_ms,
  });

  return {
    ...record,
    capability_token: token,
    capability_token_returned_once: true,
  };
}

function updateConsumed(ticketId: string, patch: JsonObject): JsonObject {
  const file = ticketFile(consumedDir(), ticketId);
  const current = readJson(file) || { marker: MARKER, ticket_id: ticketId };
  const next = { ...current, ...patch };
  atomicWriteJson(file, next);
  return next;
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 30_000): Promise<JsonObject> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...(init || {}), signal: controller.signal });
    const text = await response.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { ok: false, error: "non_json_response", raw: text.slice(0, 500) };
    }
    if (!response.ok) {
      const error: any = new Error(String(body?.error || `http_${response.status}`));
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function findVerifiedReceipt(value: any, depth = 0): JsonObject | null {
  if (!value || depth > 10) return null;
  if (
    typeof value === "object" &&
    String(value.kind || "") === TASK_CLASS &&
    String(value.status || "").toLowerCase() === "completed" &&
    value?.output?.verified === true &&
    value.receipt_id
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findVerifiedReceipt(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = findVerifiedReceipt(item, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function publicStatus(accountRaw: unknown): JsonObject {
  const account = safeAccount(accountRaw);
  const counts = ticketCounts();
  return {
    ok: true,
    marker: MARKER,
    enabled: enabled(),
    task_class: TASK_CLASS,
    manual_only: true,
    operator_issue_route: OPERATOR_ISSUE_ROUTE,
    public_run_route: PUBLIC_RUN_ROUTE,
    capability: {
      account_bound: true,
      task_bound: true,
      expiring: true,
      single_use: true,
      token_stored_as_sha256_only: true,
      participant_selected_award: false,
    },
    caps: {
      per_account: perAccountCap(),
      global: globalCap(),
      active_issued: counts.active,
      consumed: counts.consumed,
      account_total: account ? Number(counts.accountCounts[account] || 0) : null,
    },
    canonical_pipeline: {
      runner_config: "/wc/runner/config",
      runner_set: "/wc/runner/set",
      runner_tick: "/wc/runner/tick",
      receipt_scan: "/wc/scan-receipts",
      balance: "/wc/redeemable",
    },
    automatic_background_loop: false,
    generic_credit_route: false,
    wc_to_void: false,
    wallet_send: false,
    buy_void_fulfillment: false,
    money_movement: false,
  };
}

async function runCapability(req: any, res: any): Promise<any> {
  if (!enabled()) {
    return res.status(503).json({ ok: false, marker: MARKER, error: "capability_lane_disabled" });
  }

  const account = safeAccount(req?.body?.account);
  if (!account) return res.status(400).json({ ok: false, marker: MARKER, error: "invalid_account" });

  const parsed = parseToken(bearerOrBodyToken(req));
  if (!parsed) return res.status(401).json({ ok: false, marker: MARKER, error: "invalid_capability" });

  const issuedPath = ticketFile(issuedDir(), parsed.ticketId);
  const consumedPath = ticketFile(consumedDir(), parsed.ticketId);

  if (fs.existsSync(consumedPath)) {
    return res.status(409).json({ ok: false, marker: MARKER, error: "capability_already_used" });
  }

  const record = readJson(issuedPath);
  if (!record) return res.status(401).json({ ok: false, marker: MARKER, error: "invalid_capability" });
  if (!safeHexEqual(String(record.token_sha256 || ""), sha256Hex(parsed.token))) {
    return res.status(401).json({ ok: false, marker: MARKER, error: "invalid_capability" });
  }
  if (String(record.account || "") !== account) {
    return res.status(403).json({ ok: false, marker: MARKER, error: "capability_account_mismatch" });
  }
  if (String(record.task_class || "") !== TASK_CLASS) {
    return res.status(403).json({ ok: false, marker: MARKER, error: "capability_task_mismatch" });
  }
  if (Number(record.expires_at_ms || 0) <= Date.now()) {
    return res.status(410).json({ ok: false, marker: MARKER, error: "capability_expired" });
  }

  const port = String(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || "4100");
  const base = `http://127.0.0.1:${port}`;
  const encodedAccount = encodeURIComponent(account);

  let before: JsonObject;
  try {
    before = await fetchJson(`${base}/wc/redeemable?account=${encodedAccount}`, undefined, 10_000);
  } catch (error: any) {
    return res.status(503).json({
      ok: false,
      marker: MARKER,
      error: "canonical_balance_unavailable",
      detail: String(error?.message || error),
    });
  }

  let runnerStatusBefore: JsonObject;
  try {
    runnerStatusBefore = await fetchJson(
      `${base}/wc/runner/status?account=${encodedAccount}`,
      undefined,
      10_000,
    );
  } catch (error: any) {
    return res.status(503).json({
      ok: false,
      marker: MARKER,
      error: "runner_status_unavailable",
      detail: String(error?.message || error),
    });
  }

  if (runnerStatusBefore?.loop_disabled !== true || runnerStatusBefore?.loop_started === true) {
    return res.status(503).json({
      ok: false,
      marker: MARKER,
      error: "runner_loop_not_disabled",
      capability_consumed: false,
    });
  }

  if (runnerStatusBefore?.enabled === true) {
    return res.status(409).json({
      ok: false,
      marker: MARKER,
      error: "runner_already_enabled",
      capability_consumed: false,
    });
  }

  try {
    fs.renameSync(issuedPath, consumedPath);
  } catch (error: any) {
    if (fs.existsSync(consumedPath) || String(error?.code || "") === "ENOENT") {
      return res.status(409).json({ ok: false, marker: MARKER, error: "capability_already_used" });
    }
    return res.status(500).json({ ok: false, marker: MARKER, error: "capability_consume_failed" });
  }

  updateConsumed(parsed.ticketId, {
    status: "consumed_pending",
    consumed_at_ms: Date.now(),
    token_sha256: String(record.token_sha256 || ""),
  });
  appendAudit({
    event: "consumed",
    ticket_id: parsed.ticketId,
    account,
    task_class: TASK_CLASS,
  });

  let runnerEnabledByCapability = false;

  const disableRunner = async (): Promise<JsonObject | null> => {
    if (!runnerEnabledByCapability) return null;
    const disabled = await fetchJson(
      `${base}/wc/runner/set?dry=0&confirm=wcRunnerSet`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account, enabled: false }),
      },
    );
    if (disabled?.enabled !== false) throw new Error("runner_disable_failed");
    runnerEnabledByCapability = false;
    return disabled;
  };

  try {
    const config = await fetchJson(
      `${base}/wc/runner/config?dry=0&confirm=wcRunnerConfig`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          account,
          safe_mode: true,
          allow_datanet_publish: false,
          allow_datanet_fetch_verify: true,
          allow_datanet_redundancy_check: false,
          min_submit_gap_ms: 45_000,
          max_jobs_per_hour: 3,
        }),
      },
    );

    const setResult = await fetchJson(
      `${base}/wc/runner/set?dry=0&confirm=wcRunnerSet`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account, enabled: true }),
      },
    );
    runnerEnabledByCapability = setResult?.enabled === true;
    if (!runnerEnabledByCapability) throw new Error("runner_enable_failed");

    const tick = await fetchJson(
      `${base}/wc/runner/tick?dry=0&confirm=wcRunnerTick`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account }),
      },
      45_000,
    );

    const receipt = findVerifiedReceipt(tick);
    if (!receipt) {
      const disableResult = await disableRunner();
      const failure = updateConsumed(parsed.ticketId, {
        status: "consumed_no_verified_work",
        completed_at_ms: Date.now(),
        failure_reason: String(tick?.outcome_reason || tick?.reason || "verified_receipt_missing"),
      });
      appendAudit({
        event: "completed_without_credit",
        ticket_id: parsed.ticketId,
        account,
        reason: failure.failure_reason,
      });
      return res.status(409).json({
        ok: false,
        marker: MARKER,
        error: "verified_work_not_completed",
        ticket_id: parsed.ticketId,
        account,
        task_class: TASK_CLASS,
        outcome: tick,
        runner_disabled: disableResult?.enabled === false,
      });
    }

    if (String(receipt.account || "") !== account) {
      throw new Error("receipt_account_mismatch");
    }

    const scan = await fetchJson(
      `${base}/wc/scan-receipts?dry=0&confirm=wcScanReceipts`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
      30_000,
    );

    const after = await fetchJson(`${base}/wc/redeemable?account=${encodedAccount}`, undefined, 10_000);
    const beforeRedeemable = Number(before?.redeemable || 0);
    const afterRedeemable = Number(after?.redeemable || 0);
    const delta = Math.round((afterRedeemable - beforeRedeemable) * 1e9) / 1e9;

    if (!(delta > 0)) {
      throw new Error("canonical_wc_delta_missing");
    }

    const disableResult = await disableRunner();

    updateConsumed(parsed.ticketId, {
      status: "completed",
      completed_at_ms: Date.now(),
      receipt_id: String(receipt.receipt_id || ""),
      job_id: String(receipt.job_id || ""),
      dataset_id: String(receipt.dataset_id || ""),
      wc_delta: delta,
      canonical_redeemable_after: afterRedeemable,
    });
    appendAudit({
      event: "credited",
      ticket_id: parsed.ticketId,
      account,
      receipt_id: String(receipt.receipt_id || ""),
      job_id: String(receipt.job_id || ""),
      wc_delta: delta,
    });

    return res.status(200).json({
      ok: true,
      marker: MARKER,
      ticket_id: parsed.ticketId,
      account,
      task_class: TASK_CLASS,
      capability_consumed: true,
      verified_receipt: {
        receipt_id: String(receipt.receipt_id || ""),
        job_id: String(receipt.job_id || ""),
        dataset_id: String(receipt.dataset_id || ""),
        input_hash: String(receipt.input_hash || ""),
        output_hash: String(receipt.output_hash || ""),
        verified: receipt?.output?.verified === true,
      },
      wc: {
        before: beforeRedeemable,
        after: afterRedeemable,
        delta,
        canonical_redeemable: true,
      },
      internal: {
        config_ok: config?.ok === true,
        runner_enabled: setResult?.enabled === true,
        tick_outcome: tick?.outcome || null,
        scan_credited: Number(scan?.credited || 0),
        runner_disabled: disableResult?.enabled === false,
      },
      automatic_background_loop: false,
      participant_selected_award: false,
      generic_credit_route: false,
      wc_to_void: false,
      wallet_send: false,
      buy_void_fulfillment: false,
      money_movement: false,
    });
  } catch (error: any) {
    let disableError = "";
    if (runnerEnabledByCapability) {
      try {
        await disableRunner();
      } catch (cleanupError: any) {
        disableError = String(cleanupError?.message || cleanupError);
      }
    }

    const failureDetail = disableError
      ? `${String(error?.message || error)}; cleanup=${disableError}`
      : String(error?.message || error);

    updateConsumed(parsed.ticketId, {
      status: "failed",
      completed_at_ms: Date.now(),
      failure_reason: failureDetail,
    });
    appendAudit({
      event: "failed",
      ticket_id: parsed.ticketId,
      account,
      reason: failureDetail,
    });

    return res.status(Number(error?.status || 500)).json({
      ok: false,
      marker: MARKER,
      error: "capability_execution_failed",
      detail: failureDetail,
      ticket_id: parsed.ticketId,
      capability_consumed: true,
      runner_disabled: !runnerEnabledByCapability,
    });
  }
}

function mount(): void {
  const globalState: any = globalThis as any;
  const app: any = globalState.__void_http_app || globalState.app;
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    setTimeout(mount, 250).unref?.();
    return;
  }
  if (app[GLOBAL_MARK]) return;
  app[GLOBAL_MARK] = true;

  ensureDirs();
  const jsonParser = express.json({ limit: "64kb" });

  app.get(PUBLIC_STATUS_ROUTE, (req: any, res: any) => {
    try {
      return res.json(publicStatus(req?.query?.account));
    } catch (error: any) {
      return res.status(500).json({ ok: false, marker: MARKER, error: String(error?.message || error) });
    }
  });

  app.post(OPERATOR_ISSUE_ROUTE, jsonParser, (req: any, res: any) => {
    try {
      if (!enabled()) {
        return res.status(503).json({ ok: false, marker: MARKER, error: "capability_lane_disabled" });
      }
      const account = safeAccount(req?.body?.account);
      if (!account) return res.status(400).json({ ok: false, marker: MARKER, error: "invalid_account" });

      const requestedTask = String(req?.body?.task_class || TASK_CLASS);
      if (requestedTask !== TASK_CLASS) {
        return res.status(400).json({ ok: false, marker: MARKER, error: "task_class_not_allowlisted" });
      }

      const ttlMs = clampInt(req?.body?.ttl_ms, defaultTtlMs(), 60_000, maxTtlMs());
      const capability = issueCapability(account, ttlMs);
      return res.status(201).json({
        ok: true,
        marker: MARKER,
        ...capability,
        operator_issued: true,
        manual_only: true,
        participant_selected_award: false,
        money_movement: false,
      });
    } catch (error: any) {
      const message = String(error?.message || error);
      const status = /cap_reached/.test(message) ? 409 : 500;
      return res.status(status).json({ ok: false, marker: MARKER, error: message });
    }
  });

  app.post(PUBLIC_RUN_ROUTE, jsonParser, (req: any, res: any) => {
    void runCapability(req, res);
  });

  try {
    console.log(`[${MARKER}] mounted ${PUBLIC_STATUS_ROUTE} ${OPERATOR_ISSUE_ROUTE} ${PUBLIC_RUN_ROUTE}`);
  } catch {
    // Mount logging must never affect route availability.
  }
}

setTimeout(mount, 250).unref?.();
