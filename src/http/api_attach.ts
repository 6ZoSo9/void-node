// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/http/api_attach.ts
/**
 * Helper attach API: expose your local store over a tiny HTTP server.
 * Defaults: HTTP :4310, DATA_DIR from env.
 * Endpoints:
 *   GET  /api/health        -> { ok, head, dataDir }
 *   GET  /head              -> { ok, head }
 *   GET  /blocks/range?from=&to=   -> [blocks...]
 */
import express from "express";
import * as path from "node:path";
import { SegStore } from "../chain/seg_store.js";

const PORT = Number(process.env.ATTACH_PORT || 4310);
const DATA_DIR = process.env.DATA_DIR || "data";

export const ATTACH_BLOCK_RANGE_MAX_SPAN = 250;
export const ATTACH_BLOCK_RANGE_ERROR_CODE_V1 = "VOID_BLOCK_RANGE_INVALID_V1";

export type AttachBlockRangeErrorV1 = {
  ok: false;
  error: "bad range";
  code: typeof ATTACH_BLOCK_RANGE_ERROR_CODE_V1;
  reason: "invalid_head" | "invalid_bounds" | "range_span_exceeds_limit";
  max_heights: number;
  recovery: { from: number; to: number } | null;
  aliases: { from: ["from", "start"]; to: ["to", "end"] };
};

function normalizeAttachBlockRangeBoundV1(
  raw: unknown,
  fallback: number,
): number | null {
  if (raw === undefined) return fallback;
  if (typeof raw === "number") {
    return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
  }
  if (
    typeof raw !== "string" ||
    !/^(?:0|[1-9][0-9]*)$/u.test(raw)
  ) {
    return null;
  }
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export function resolveAttachBlockRangeAliasV1(
  primary: unknown,
  alias: unknown,
): { ok: true; value: unknown } | { ok: false; value: null } {
  const primaryPresent = primary !== undefined;
  const aliasPresent = alias !== undefined;
  if (primaryPresent && aliasPresent) return { ok: false, value: null };
  return {
    ok: true,
    value: primaryPresent ? primary : alias,
  };
}

export function attachBlockRangeErrorV1(
  fromRaw: unknown,
  toRaw: unknown,
  head: number,
): AttachBlockRangeErrorV1 {
  const from = normalizeAttachBlockRangeBoundV1(fromRaw, 0);
  const to = normalizeAttachBlockRangeBoundV1(toRaw, head);
  const validHead = Number.isSafeInteger(head) && head >= -1;
  if (!validHead) {
    return {
      ok: false,
      error: "bad range",
      code: ATTACH_BLOCK_RANGE_ERROR_CODE_V1,
      reason: "invalid_head",
      max_heights: ATTACH_BLOCK_RANGE_MAX_SPAN,
      recovery: null,
      aliases: { from: ["from", "start"], to: ["to", "end"] },
    };
  }

  const validFrom = from !== null;
  const boundedTo = to !== null ? Math.min(to, head) : Number.NaN;
  const reason =
    from !== null &&
    to !== null &&
    to >= from &&
    boundedTo >= from &&
    boundedTo - from >= ATTACH_BLOCK_RANGE_MAX_SPAN
      ? "range_span_exceeds_limit"
      : "invalid_bounds";

  const recoveryFrom = head < 0 ? 0 : validFrom ? from : 0;
  const recoveryCeiling =
    recoveryFrom <=
    Number.MAX_SAFE_INTEGER - (ATTACH_BLOCK_RANGE_MAX_SPAN - 1)
      ? recoveryFrom + ATTACH_BLOCK_RANGE_MAX_SPAN - 1
      : recoveryFrom;
  const recoveryTo =
    head < 0
      ? 0
      : recoveryFrom > head
        ? recoveryFrom
        : Math.min(head, recoveryCeiling);

  return {
    ok: false,
    error: "bad range",
    code: ATTACH_BLOCK_RANGE_ERROR_CODE_V1,
    reason,
    max_heights: ATTACH_BLOCK_RANGE_MAX_SPAN,
    recovery: { from: recoveryFrom, to: recoveryTo },
    aliases: { from: ["from", "start"], to: ["to", "end"] },
  };
}

export function parseAttachBlockRange(
  fromRaw: unknown,
  toRaw: unknown,
  head: number,
): { from: number; to: number } | null {
  const from = normalizeAttachBlockRangeBoundV1(fromRaw, 0);
  const to = normalizeAttachBlockRangeBoundV1(toRaw, head);
  if (
    !Number.isSafeInteger(head) ||
    head < -1 ||
    from === null ||
    to === null ||
    to < from
  ) {
    return null;
  }
  const boundedTo = Math.min(to, head);
  if (
    boundedTo >= from &&
    boundedTo - from >= ATTACH_BLOCK_RANGE_MAX_SPAN
  ) {
    return null;
  }
  return { from, to: boundedTo };
}

export function startAttachServer(opts?: { port?: number; dataDir?: string }) {
  const port = Number(opts?.port ?? PORT);
  const data = String(opts?.dataDir ?? DATA_DIR);
  const store = new SegStore(data, { sparseEvery: 256 });

  const app = express();
  app.use(express.json({ limit: "64mb" }));

  app.get(["/api/health", "/health"], (_req, res) => {
    res.json({ ok: true, head: store.loadHeadNumber(), dataDir: path.resolve(data) });
  });

  app.get(["/head", "/api/head"], (_req, res) => {
    res.json({ ok: true, head: store.loadHeadNumber() });
  });

  app.get("/blocks/range", (req, res) => {
    const head = store.loadHeadNumber();
    const fromAlias = resolveAttachBlockRangeAliasV1(
      req.query.from,
      req.query.start,
    );
    const toAlias = resolveAttachBlockRangeAliasV1(
      req.query.to,
      req.query.end,
    );
    const fromRaw = fromAlias.ok ? fromAlias.value : null;
    const toRaw = toAlias.ok ? toAlias.value : null;
    const range =
      fromAlias.ok && toAlias.ok
        ? parseAttachBlockRange(fromRaw, toRaw, head)
        : null;
    if (!range) {
      return res.status(400).json(
        attachBlockRangeErrorV1(fromRaw, toRaw, head),
      );
    }
    const out: any[] = [];
    for (let n = range.from; n <= range.to; n++) {
      const b = store.loadBlock(n);
      if (b) out.push(b);
    }
    res.json(out);
  });

  app.listen(port, () => {
    console.log(`[attach] http :${port} (DATA_DIR=${path.resolve(data)})`);
  });

  return { ok: true, port, dataDir: data };
}

// Allow: `npx tsx src/http/api_attach.ts`
if (process.argv[1]?.endsWith("api_attach.ts")) startAttachServer();
