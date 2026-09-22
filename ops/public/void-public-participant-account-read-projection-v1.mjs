#!/usr/bin/env node

export const VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1 =
  Object.freeze({
    marker: "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1",
    capability: "participant.account.read.v1",
    wallet_view: "wallet",
    earn_view: "earn",
    wallet_source_path: "/__void/ui/wave3/wallet.json",
    earn_source_path: "/__void/ui/wave4/earn.json",
    max_source_response_bytes: 256 * 1024,
    source_timeout_ms: 5000,
    raw_source_forwarding: false,
    authorization_forwarded_upstream: false,
    cookie_forwarding: false,
    wallet_private_key_access: false,
    wallet_unlock_authority: false,
    wallet_send_authority: false,
    work_credit_mutation_authority: false,
    validator_mutation_authority: false,
    generic_rpc_authority: false,
    transaction_signing: false,
    money_movement_authority: false,
    listener_created: false,
    production_route_mounted: false,
  });

const ACCOUNT_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const EARN_STATUS = new Set([
  "unavailable",
  "stopped",
  "manual_only",
  "active",
  "configured",
]);

function fail(message) {
  throw new Error(message);
}

function objectValue(raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail(label + "_object_required");
  }
  return raw;
}

function safeAccount(raw) {
  const account = String(raw || "").trim();
  if (!ACCOUNT_RE.test(account)) fail("account_invalid");
  return account;
}

function loopbackBase(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw || ""));
  } catch (error) {
    void error;
    fail("source_base_invalid");
  }

  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    !/^[0-9]{1,5}$/.test(parsed.port) ||
    Number(parsed.port) < 1 ||
    Number(parsed.port) > 65535 ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    fail("source_base_invalid");
  }

  return "http://127.0.0.1:" + parsed.port;
}

function nonNegativeNumber(raw) {
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0
    ? raw
    : null;
}

function nonNegativeSafeInteger(raw) {
  return typeof raw === "number" &&
    Number.isSafeInteger(raw) &&
    raw >= 0
    ? raw
    : null;
}

function safeText(raw, max = 96) {
  const value = String(raw ?? "");
  if (
    value.length > max ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return "";
  }
  return value;
}

function safeAddress(raw) {
  const value = String(raw || "").trim();
  return ADDRESS_RE.test(value) ? value : "";
}

function assertFalseBoundaries(raw, keys, label) {
  const source = objectValue(raw, label);
  for (const key of keys) {
    if (source[key] !== false) {
      fail(label + "_authority_invalid");
    }
  }
}

async function readBoundedJson(response, signal) {
  const declaredRaw = response.headers.get("content-length");
  if (declaredRaw !== null) {
    if (!/^(0|[1-9][0-9]*)$/.test(declaredRaw)) {
      fail("source_content_length_invalid");
    }
    const declared = Number(declaredRaw);
    if (
      !Number.isSafeInteger(declared) ||
      declared >
        VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1
          .max_source_response_bytes
    ) {
      fail("source_response_too_large");
    }
  }

  if (!response.body || typeof response.body.getReader !== "function") {
    fail("source_body_unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let text = "";

  try {
    while (true) {
      if (signal.aborted) fail("source_timeout");
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        fail("source_body_chunk_invalid");
      }
      total += value.byteLength;
      if (
        total >
        VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1
          .max_source_response_bytes
      ) {
        fail("source_response_too_large");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    try {
      await reader.cancel(error);
    } catch (cleanupError) {
      void cleanupError;
    }
    throw error;
  } finally {
    try {
      reader.releaseLock();
    } catch (cleanupError) {
      void cleanupError;
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    void error;
    fail("source_json_invalid");
  }
  return objectValue(parsed, "source");
}

async function fetchSanitizedSource({
  base,
  route,
  account,
  fetchImpl,
}) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("source_timeout")),
    VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1.source_timeout_ms,
  );
  timer.unref?.();

  const target =
    base + route + "?account=" + encodeURIComponent(account);

  try {
    const response = await fetchImpl(target, {
      method: "GET",
      headers: {
        accept: "application/json",
        "cache-control": "no-store",
        "user-agent":
          "void-public-participant-account-read-projection-v1",
      },
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });

    if (
      response.redirected === true ||
      response.status !== 200 ||
      response.ok !== true
    ) {
      fail("source_unavailable");
    }
    if (
      typeof response.url === "string" &&
      response.url.length > 0 &&
      response.url !== target
    ) {
      fail("source_final_url_mismatch");
    }

    const contentType = String(
      response.headers.get("content-type") || "",
    ).toLowerCase();
    const mediaType = contentType.split(";", 1)[0].trim();
    if (mediaType !== "application/json") {
      fail("source_content_type_invalid");
    }

    return await readBoundedJson(response, controller.signal);
  } catch (error) {
    if (String(error?.message || error) === "source_timeout") {
      throw error;
    }
    if (controller.signal.aborted) {
      fail("source_timeout");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function projectBalance(raw, label) {
  const row = objectValue(raw, label);
  const available = row.available === true;
  const balance = nonNegativeNumber(row.balance);
  const entries = nonNegativeSafeInteger(row.entries);

  if (available && (balance === null || entries === null)) {
    fail(label + "_invalid");
  }

  return Object.freeze({
    available,
    balance: available ? balance : null,
    entries: available ? entries : null,
  });
}

function projectWallet(source, account) {
  if (
    source.marker !== "VOID_UI_WAVE3_WALLET_READONLY_V1" ||
    source.read_only !== true
  ) {
    fail("wallet_source_contract_invalid");
  }

  const sourceAccount = objectValue(source.account, "wallet_account");
  if (
    sourceAccount.selected !== true ||
    sourceAccount.id !== account
  ) {
    fail("wallet_source_account_mismatch");
  }

  assertFalseBoundaries(
    source.boundaries,
    [
      "browser_wallet_connection",
      "wallet_create",
      "wallet_import",
      "wallet_unlock",
      "wallet_export",
      "wallet_send",
      "wc_to_void",
      "ledger_write",
      "validator_mutation",
      "operator_mutation",
      "money_movement",
    ],
    "wallet_boundaries",
  );

  const wallet = objectValue(source.wallet, "wallet");
  const walletSourceAvailable = wallet.source_available === true;
  const hasWallet = wallet.has_wallet === true;
  if (!walletSourceAvailable && hasWallet) {
    fail("wallet_source_availability_invalid");
  }
  const address = safeAddress(wallet.address);
  if (hasWallet && !address) fail("wallet_source_address_invalid");
  const nativeGasAvailable = wallet.native_gas_available === true;
  const nativeGasDisplay = String(wallet.native_gas_display || "");
  if (
    nativeGasAvailable &&
    !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(nativeGasDisplay)
  ) {
    fail("wallet_native_gas_display_invalid");
  }

  const balances = objectValue(source.balances, "wallet_balances");
  const ledgerWc = projectBalance(
    balances.ledger_wc,
    "wallet_ledger_wc",
  );
  const productionWc = projectBalance(
    balances.production_wc,
    "wallet_production_wc",
  );

  return Object.freeze({
    ok: true,
    marker:
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1.marker,
    view: "wallet",
    account,
    capability:
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1.capability,
    read_only: true,
    wallet: Object.freeze({
      source_available: walletSourceAvailable,
      has_wallet: hasWallet,
      address: hasWallet ? address : "",
      native_gas_available: nativeGasAvailable,
      native_gas_display:
        nativeGasAvailable ? safeText(nativeGasDisplay, 80) : "—",
    }),
    balances: Object.freeze({
      ledger_wc: ledgerWc,
      production_wc: productionWc,
    }),
    boundaries: Object.freeze({
      wallet_unlock: false,
      wallet_export: false,
      wallet_send: false,
      wc_to_void: false,
      ledger_write: false,
      money_movement: false,
    }),
  });
}

function nullableNonNegative(raw, label) {
  if (raw === null || raw === undefined) return null;
  const value = nonNegativeNumber(raw);
  if (value === null) fail(label + "_invalid");
  return value;
}

function requiredNonNegative(raw, label) {
  const value = nullableNonNegative(raw, label);
  if (value === null) fail(label + "_required");
  return value;
}

function requiredNonNegativeSafeInteger(raw, label) {
  const value = nonNegativeSafeInteger(raw);
  if (value === null) fail(label + "_invalid");
  return value;
}

function projectEarn(source, account) {
  if (
    source.marker !== "VOID_UI_WAVE4_EARN_READONLY_V1" ||
    source.read_only !== true
  ) {
    fail("earn_source_contract_invalid");
  }

  const sourceAccount = objectValue(source.account, "earn_account");
  if (
    sourceAccount.selected !== true ||
    sourceAccount.id !== account
  ) {
    fail("earn_source_account_mismatch");
  }

  assertFalseBoundaries(
    source.boundaries,
    [
      "job_execution",
      "job_submission",
      "reward_award",
      "runner_activation",
      "runner_tick",
      "runner_config",
      "wc_redeem",
      "wc_send",
      "wc_to_void",
      "ledger_write",
      "browser_wallet_connection",
      "validator_mutation",
      "operator_mutation",
      "money_movement",
    ],
    "earn_boundaries",
  );

  const earning = objectValue(source.earning, "earning");
  const status = String(earning.status || "");
  if (!EARN_STATUS.has(status)) fail("earn_status_invalid");

  const accounting = objectValue(source.accounting, "accounting");
  const legacy = objectValue(
    accounting.legacy_wc,
    "legacy_accounting",
  );
  const production = objectValue(
    accounting.production_wc,
    "production_accounting",
  );
  const rewards = objectValue(
    accounting.rewards_last_hour,
    "reward_accounting",
  );

  const recentJobs = objectValue(source.recent_jobs, "recent_jobs");
  const receipts = objectValue(
    source.verification_receipts,
    "verification_receipts",
  );
  const datanet = objectValue(source.datanet, "datanet");

  const legacyAvailable = legacy.available === true;
  const legacyEarned = legacyAvailable
    ? requiredNonNegative(legacy.earned, "legacy_earned")
    : null;
  const legacyRedeemed = legacyAvailable
    ? requiredNonNegative(legacy.redeemed, "legacy_redeemed")
    : null;
  const legacyRedeemable = legacyAvailable
    ? requiredNonNegative(legacy.redeemable, "legacy_redeemable")
    : null;
  const legacyDebited = legacyAvailable
    ? requiredNonNegative(legacy.debited, "legacy_debited")
    : null;

  const productionAvailable = production.available === true;
  const productionBalance = productionAvailable
    ? requiredNonNegative(production.balance, "production_balance")
    : null;
  const productionEntries = productionAvailable
    ? requiredNonNegativeSafeInteger(
        production.entries,
        "production_entries",
      )
    : null;

  const jobsCount = requiredNonNegativeSafeInteger(
    recentJobs.count,
    "recent_jobs_count",
  );
  const receiptsCount = requiredNonNegativeSafeInteger(
    receipts.count,
    "verification_receipts_count",
  );

  const manualOnly = earning.manual_only === true;
  const automaticBackground = earning.automatic_background === true;
  if (manualOnly && automaticBackground) {
    fail("earn_execution_state_invalid");
  }
  if (status === "manual_only" && !manualOnly) {
    fail("earn_status_state_mismatch");
  }
  if (status === "active" && !automaticBackground) {
    fail("earn_status_state_mismatch");
  }

  const datanetSourceAvailable = datanet.source_available === true;
  const datanetStatus =
    datanet.status === "available" ? "available" : "unavailable";
  if (!datanetSourceAvailable && datanetStatus === "available") {
    fail("datanet_source_state_invalid");
  }

  return Object.freeze({
    ok: true,
    marker:
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1.marker,
    view: "earn",
    account,
    capability:
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1.capability,
    read_only: true,
    earning: Object.freeze({
      status,
      status_label: safeText(earning.status_label, 48),
      manual_only: manualOnly,
      automatic_background: automaticBackground,
      safe_mode: earning.safe_mode === true,
      jobs_last_hour: nullableNonNegative(
        earning.jobs_last_hour,
        "jobs_last_hour",
      ),
      max_jobs_per_hour: nullableNonNegative(
        earning.max_jobs_per_hour,
        "max_jobs_per_hour",
      ),
    }),
    accounting: Object.freeze({
      legacy_wc: Object.freeze({
        available: legacyAvailable,
        earned: legacyEarned,
        redeemed: legacyRedeemed,
        redeemable: legacyRedeemable,
        debited: legacyDebited,
      }),
      production_wc: Object.freeze({
        available: productionAvailable,
        balance: productionBalance,
        entries: productionEntries,
      }),
      rewards_last_hour: Object.freeze({
        total: nullableNonNegative(rewards.total, "rewards_total"),
        publish: nullableNonNegative(rewards.publish, "rewards_publish"),
        verify: nullableNonNegative(rewards.verify, "rewards_verify"),
        redundancy: nullableNonNegative(
          rewards.redundancy,
          "rewards_redundancy",
        ),
      }),
    }),
    activity: Object.freeze({
      recent_jobs_count: jobsCount,
      verification_receipts_count: receiptsCount,
    }),
    datanet: Object.freeze({
      source_available: datanetSourceAvailable,
      status: datanetStatus,
      receipt_store_records: nullableNonNegative(
        datanet.receipt_store_records,
        "datanet_receipt_store_records",
      ),
      account_wc_events: nullableNonNegative(
        datanet.account_wc_events,
        "datanet_account_wc_events",
      ),
    }),
    boundaries: Object.freeze({
      job_execution: false,
      job_submission: false,
      reward_award: false,
      runner_activation: false,
      wc_redeem: false,
      wc_send: false,
      wc_to_void: false,
      ledger_write: false,
      money_movement: false,
    }),
  });
}

export function createVoidPublicParticipantAccountReadProjectionV1({
  sessionHttp,
  sourceBase = "http://127.0.0.1:4100",
  fetchImpl = fetch,
} = {}) {
  if (
    !sessionHttp ||
    typeof sessionHttp.authorizeAccountRead !== "function"
  ) {
    fail("session_http_authority_required");
  }
  if (typeof fetchImpl !== "function") {
    fail("source_fetch_required");
  }

  const base = loopbackBase(sourceBase);

  const read = async ({
    authorization,
    account: accountRaw,
    view,
  } = {}) => {
    const account = safeAccount(accountRaw);
    if (view !== "wallet" && view !== "earn") {
      fail("view_invalid");
    }

    const authority = sessionHttp.authorizeAccountRead(
      String(authorization || ""),
      account,
    );
    if (
      !authority ||
      authority.account !== account ||
      authority.read_only !== true ||
      authority.capability !==
        VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1.capability ||
      authority.signing_authority !== false ||
      authority.money_movement_authority !== false
    ) {
      fail("session_authority_invalid");
    }

    const source = await fetchSanitizedSource({
      base,
      route:
        view === "wallet"
          ? VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1
              .wallet_source_path
          : VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1
              .earn_source_path,
      account,
      fetchImpl,
    });

    return view === "wallet"
      ? projectWallet(source, account)
      : projectEarn(source, account);
  };

  return Object.freeze({
    read,
    authority:
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1,
  });
}
