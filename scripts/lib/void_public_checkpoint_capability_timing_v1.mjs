#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { blockHash } from "../../dist/chain/block.js";

export const VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_SCHEMA_V1 =
  "void_public_checkpoint_capability_timing_v1";

const SAMPLE_RE = /^[A-Za-z0-9._-]{1,128}$/;
const POLL_MS_V1 = 250;
const FETCH_TIMEOUT_MS_V1 = 2_000;
const MAX_JSON_BYTES_V1 = 8 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS_V1 = 4 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS_V1 = 12 * 60 * 60 * 1000;

function fail(message) {
  throw new Error(`VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_V1: ${message}`);
}

function positiveInteger(raw, name, { allowZero = false, maximum } = {}) {
  const text = String(raw ?? "").trim();
  const re = allowZero ? /^(0|[1-9][0-9]*)$/ : /^[1-9][0-9]*$/;
  if (!re.test(text)) fail(`${name} is malformed`);
  const value = Number(text);
  if (!Number.isSafeInteger(value) || (!allowZero && value <= 0)) {
    fail(`${name} is outside the safe integer domain`);
  }
  if (maximum !== undefined && value > maximum) {
    fail(`${name} exceeds ${maximum}`);
  }
  return value;
}

function elapsedMs(startNs, endNs = process.hrtime.bigint()) {
  return Number((endNs - startNs) / 1_000_000n);
}

export function parseVoidPublicCheckpointCapabilityTimingConfigV1(
  env = process.env,
) {
  const receiptFile = String(
    env.VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_RECEIPT_FILE || "",
  ).trim();
  if (!receiptFile) return null;
  if (!path.isAbsolute(receiptFile)) {
    fail("timing receipt path must be absolute");
  }
  const sampleId = String(
    env.VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_SAMPLE_ID || "",
  ).trim();
  if (!SAMPLE_RE.test(sampleId)) {
    fail("timing sample id is missing or malformed");
  }
  const targetHead = positiveInteger(
    env.VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_TARGET_HEAD,
    "timing target head",
    { allowZero: true },
  );
  const launcherStartedUnixMs = positiveInteger(
    env.VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_LAUNCHER_STARTED_UNIX_MS,
    "timing launcher start",
  );
  const timeoutRaw = String(
    env.VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_TIMEOUT_MS || "",
  ).trim();
  const timeoutMs = timeoutRaw
    ? positiveInteger(
        timeoutRaw,
        "timing timeout",
        { maximum: MAX_TIMEOUT_MS_V1 },
      )
    : DEFAULT_TIMEOUT_MS_V1;
  const httpPort = positiveInteger(
    env.HTTP_PORT || "4100",
    "HTTP_PORT",
    { maximum: 65535 },
  );
  return Object.freeze({
    receiptFile,
    sampleId,
    targetHead,
    launcherStartedUnixMs,
    timeoutMs,
    httpPort,
  });
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonBounded(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`timing probe exceeded ${FETCH_TIMEOUT_MS_V1}ms`));
  }, FETCH_TIMEOUT_MS_V1);
  let reader = null;
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok || !response.body) return null;

    const rawLength = String(
      response.headers.get("content-length") || "",
    ).trim();
    if (rawLength) {
      if (!/^(0|[1-9][0-9]*)$/.test(rawLength)) return null;
      if (Number(rawLength) > MAX_JSON_BYTES_V1) return null;
    }

    reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) return null;
      if (value.byteLength > MAX_JSON_BYTES_V1 - total) {
        controller.abort(new Error("timing JSON exceeded retained byte bound"));
        await Promise.resolve(reader.cancel()).catch(() => undefined);
        return null;
      }
      const chunk = Buffer.from(value);
      chunks.push(chunk);
      total += chunk.byteLength;
    }
    return JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    if (reader && controller.signal.aborted) {
      await Promise.resolve(reader.cancel()).catch(() => undefined);
    }
  }
}

function extractTargetBlock(payload, targetHead) {
  const candidates = [];
  if (Array.isArray(payload)) candidates.push(...payload);
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    for (const key of ["blocks", "items", "result"]) {
      if (Array.isArray(payload[key])) candidates.push(...payload[key]);
    }
    if (Number(payload.number) === targetHead) candidates.push(payload);
  }
  return candidates.find((block) => Number(block?.number) === targetHead) || null;
}

function readPeakRssBytes(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0 || process.platform !== "linux") {
    return null;
  }
  try {
    const text = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    for (const key of ["VmHWM", "VmRSS"]) {
      const match = new RegExp(`^${key}:\\s+([0-9]+)\\s+kB$`, "m").exec(text);
      if (match) return Number(match[1]) * 1024;
    }
  } catch {
    return null;
  }
  return null;
}

function writeReceiptCreateOnly(file, receipt) {
  const parent = path.dirname(file);
  const parentStat = fs.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    fail("timing receipt parent must be a real directory");
  }
  if (typeof process.getuid === "function" && parentStat.uid !== process.getuid()) {
    fail("timing receipt parent must be owned by the current user");
  }
  if ((parentStat.mode & 0o002) !== 0) {
    fail("timing receipt parent must not be world-writable");
  }
  fs.writeFileSync(
    file,
    `${JSON.stringify(receipt)}\n`,
    { flag: "wx", mode: 0o600 },
  );
}

function modeFromRestoreResult(restoreResult) {
  switch (restoreResult?.outcome) {
    case "selected":
      return "checkpoint_restore";
    case "existing_selector":
      return "checkpoint_restart";
    case "disabled":
      return "historical_control";
    case "unavailable":
      return "historical_fallback";
    default:
      return "unknown";
  }
}

export async function observeVoidPublicCheckpointCapabilityTimingV1({
  config,
  restoreResult,
  supervisorStartedUnixMs,
  supervisorStartedNs,
  nodeSpawnedNs,
  nodePid,
} = {}) {
  if (!config) return null;
  if (
    typeof supervisorStartedUnixMs !== "number" ||
    !Number.isSafeInteger(supervisorStartedUnixMs) ||
    typeof supervisorStartedNs !== "bigint" ||
    typeof nodeSpawnedNs !== "bigint"
  ) {
    fail("timing observer start inputs are malformed");
  }

  const mode = modeFromRestoreResult(restoreResult);
  const base = `http://127.0.0.1:${config.httpPort}`;
  const deadline = Date.now() + config.timeoutMs;
  let peakRssBytes = null;
  let terminal = null;

  while (Date.now() < deadline) {
    const rss = readPeakRssBytes(nodePid);
    if (rss !== null && (peakRssBytes === null || rss > peakRssBytes)) {
      peakRssBytes = rss;
    }

    const ready = await fetchJsonBounded(`${base}/__void/ready.json`);
    const observedHead = Number(ready?.head);
    const gap = Number(ready?.gap);
    const txrootLive = Number(ready?.txroot_live);
    if (
      ready?.ready === true &&
      Number.isSafeInteger(observedHead) &&
      observedHead >= config.targetHead &&
      gap === 0 &&
      txrootLive === 1
    ) {
      const range = await fetchJsonBounded(
        `${base}/blocks/range?from=${config.targetHead}&to=${config.targetHead}`,
      );
      const targetBlock = extractTargetBlock(range, config.targetHead);
      if (targetBlock) {
        terminal = {
          ready: true,
          observed_head: observedHead,
          gap,
          txroot_live: txrootLive,
          target_head: config.targetHead,
          target_block_hash: blockHash(targetBlock),
        };
        break;
      }
    }
    await sleep(POLL_MS_V1);
  }

  const completedNs = process.hrtime.bigint();
  const nodeSpawnElapsedMs = elapsedMs(supervisorStartedNs, nodeSpawnedNs);
  const supervisorStartToTerminalMs =
    elapsedMs(supervisorStartedNs, completedNs);
  const nodeSpawnToTerminalMs = elapsedMs(nodeSpawnedNs, completedNs);
  const launcherStartToTerminalMs =
    Math.max(0, Date.now() - config.launcherStartedUnixMs);
  const restoreTiming = restoreResult?.timing || null;

  const receipt = {
    schema: VOID_PUBLIC_CHECKPOINT_CAPABILITY_TIMING_SCHEMA_V1,
    sample_id: config.sampleId,
    mode,
    launcher_started_at_unix_ms: config.launcherStartedUnixMs,
    supervisor_started_at_unix_ms: supervisorStartedUnixMs,
    target_head: config.targetHead,
    checkpoint: {
      outcome: String(restoreResult?.outcome || "unknown"),
      checkpoint_id: restoreTiming?.checkpoint_id ?? null,
      checkpoint_head: restoreTiming?.checkpoint_head ?? null,
      checkpoint_payload_bytes: restoreTiming?.checkpoint_payload_bytes ?? null,
    },
    restore: {
      timing_complete: restoreTiming !== null || mode === "historical_control",
      total_ms:
        mode === "historical_control"
          ? 0
          : restoreTiming?.total_ms ?? null,
      phases_ms: restoreTiming?.phases_ms ?? null,
    },
    node: {
      spawn_elapsed_ms: nodeSpawnElapsedMs,
      spawn_to_terminal_ms: nodeSpawnToTerminalMs,
      post_checkpoint_catchup_ms:
        mode === "checkpoint_restore" ? nodeSpawnToTerminalMs : null,
      historical_catchup_ms:
        mode === "historical_control" ? nodeSpawnToTerminalMs : null,
      peak_rss_bytes: peakRssBytes,
    },
    launcher_start_to_terminal_ms: launcherStartToTerminalMs,
    supervisor_start_to_terminal_ms: supervisorStartToTerminalMs,
    total_start_to_terminal_ms: launcherStartToTerminalMs,
    terminal_reached: terminal !== null,
    terminal,
    authority: {
      timing_authority: false,
      restore_authority_modified: false,
      runtime_authority: false,
      validator_authority: false,
      wallet_or_funds_authority: false,
    },
  };

  writeReceiptCreateOnly(config.receiptFile, receipt);
  return Object.freeze(receipt);
}
