const SOURCE_ROUTE_PATHS = new Set([
  "/wc/runner/status",
  "/wc/reward-stats",
  "/wc/redeemable",
  "/wc/production/balance",
  "/jobs",
  "/receipts",
  "/__void/participant/datanet-wc/status",
]);

const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export const VOID_UI_WAVE4_EARN_SOURCE_MAX_BYTES_V1 = 256 * 1024;
export const VOID_UI_WAVE4_EARN_SOURCE_TIMEOUT_MS_V1 = 5_000;
export const VOID_UI_WAVE4_EARN_SOURCE_TEARDOWN_MS_V1 = 250;
export const VOID_UI_WAVE4_EARN_SOURCE_MAX_ZERO_PROGRESS_READS_V1 = 64;

export type VoidUiWave4EarnSourceResultV1 = {
  ok: boolean;
  status: number;
  body: unknown;
};

const settleWithinV1 = async (
  promise: Promise<unknown>,
  timeoutMs = VOID_UI_WAVE4_EARN_SOURCE_TEARDOWN_MS_V1,
): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      Promise.resolve(promise).then(() => undefined, () => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, timeoutMs);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
};

const cancelBodyBoundedV1 = async (
  response: Response,
  reason: string,
): Promise<void> => {
  if (!response.body || typeof response.body.cancel !== "function") return;
  await settleWithinV1(
    Promise.resolve(response.body.cancel(reason)),
  );
};

const sourceUrlV1 = (base: string, route: string): string => {
  const baseUrl = new URL(base);
  if (
    baseUrl.protocol !== "http:" ||
    baseUrl.hostname !== "127.0.0.1" ||
    baseUrl.username !== "" ||
    baseUrl.password !== "" ||
    baseUrl.pathname !== "/" ||
    baseUrl.search !== "" ||
    baseUrl.hash !== ""
  ) {
    throw new Error("earn_source_base_not_exact_loopback");
  }

  const url = new URL(route, baseUrl);
  if (
    url.origin !== baseUrl.origin ||
    !SOURCE_ROUTE_PATHS.has(url.pathname) ||
    url.hash !== ""
  ) {
    throw new Error("earn_source_route_not_allowed");
  }

  const keys = [...url.searchParams.keys()];
  if (
    keys.some((key) => key !== "account" && key !== "limit") ||
    url.searchParams.getAll("account").length !== 1 ||
    !ACCOUNT_PATTERN.test(url.searchParams.get("account") || "")
  ) {
    throw new Error("earn_source_query_invalid");
  }

  const needsLimit =
    url.pathname === "/jobs" || url.pathname === "/receipts";
  if (
    needsLimit
      ? url.searchParams.getAll("limit").length !== 1 ||
        url.searchParams.get("limit") !== "5"
      : url.searchParams.has("limit")
  ) {
    throw new Error("earn_source_limit_invalid");
  }

  return url.href;
};

const readJsonBodyBoundedV1 = async (
  response: Response,
  maximum: number,
): Promise<unknown> => {
  const declared = String(
    response.headers.get("content-length") || "",
  ).trim();

  if (declared) {
    if (!/^\d+$/.test(declared)) {
      await cancelBodyBoundedV1(
        response,
        "earn source content-length invalid",
      );
      throw new Error("earn_source_content_length_invalid");
    }
    if (
      declared.length > 20 ||
      BigInt(declared) > BigInt(maximum)
    ) {
      await cancelBodyBoundedV1(
        response,
        "earn source body exceeds byte limit",
      );
      throw new Error("earn_source_body_too_large");
    }
  }

  const body = response.body;
  const reader = body?.getReader?.();
  if (!reader) {
    throw new Error("earn_source_body_unreadable");
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  let zeroProgressReads = 0;
  let terminal = false;

  const cancelReader = async (reason: string): Promise<void> => {
    if (terminal) return;
    await settleWithinV1(
      Promise.resolve(reader.cancel(reason)),
    );
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        terminal = true;
        break;
      }
      if (!(value instanceof Uint8Array)) {
        await cancelReader("earn source body chunk invalid");
        throw new Error("earn_source_body_chunk_invalid");
      }
      if (value.byteLength === 0) {
        zeroProgressReads += 1;
        if (
          zeroProgressReads >
          VOID_UI_WAVE4_EARN_SOURCE_MAX_ZERO_PROGRESS_READS_V1
        ) {
          await cancelReader("earn source body made no progress");
          throw new Error("earn_source_body_no_progress");
        }
        continue;
      }

      zeroProgressReads = 0;
      total += value.byteLength;
      if (total > maximum) {
        await cancelReader("earn source body exceeds byte limit");
        throw new Error("earn_source_body_too_large");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (!terminal) {
      await cancelReader(
        error instanceof Error
          ? error.message
          : "earn source body rejected",
      );
    }
    throw error;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Reader cleanup is best effort after a terminal/cancel attempt.
    }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("earn_source_utf8_invalid");
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error("earn_source_json_invalid");
  }
};

export async function fetchVoidUiWave4EarnSourceJsonV1(
  base: string,
  route: string,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = VOID_UI_WAVE4_EARN_SOURCE_TIMEOUT_MS_V1,
    maximumBytes = VOID_UI_WAVE4_EARN_SOURCE_MAX_BYTES_V1,
  }: {
    fetchImpl?: typeof globalThis.fetch;
    timeoutMs?: number;
    maximumBytes?: number;
  } = {},
): Promise<VoidUiWave4EarnSourceResultV1> {
  if (
    typeof fetchImpl !== "function" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 50 ||
    timeoutMs > 30_000 ||
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes < 1024 ||
    maximumBytes > 1024 * 1024
  ) {
    return { ok: false, status: 0, body: null };
  }

  let expectedUrl: string;
  try {
    expectedUrl = sourceUrlV1(base, route);
  } catch {
    return { ok: false, status: 0, body: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error("earn_source_request_timeout"));
  }, timeoutMs);
  timer.unref?.();

  let response: Response | null = null;
  try {
    response = await fetchImpl(expectedUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "void-ui-wave4-earn-readonly-v1",
        "Cache-Control": "no-store",
      },
      redirect: "error",
      signal: controller.signal,
    });

    if (response.url !== expectedUrl) {
      await cancelBodyBoundedV1(
        response,
        "earn source final URL mismatch",
      );
      throw new Error("earn_source_final_url_mismatch");
    }

    if (!response.ok) {
      await cancelBodyBoundedV1(
        response,
        "earn source HTTP status unavailable",
      );
      return {
        ok: false,
        status: response.status,
        body: null,
      };
    }

    const contentType = String(
      response.headers.get("content-type") || "",
    ).toLowerCase();
    if (!contentType.includes("application/json")) {
      await cancelBodyBoundedV1(
        response,
        "earn source content type invalid",
      );
      throw new Error("earn_source_content_type_invalid");
    }

    const body = await readJsonBodyBoundedV1(
      response,
      maximumBytes,
    );

    return {
      ok: true,
      status: response.status,
      body,
    };
  } catch {
    if (!controller.signal.aborted) {
      controller.abort(new Error("earn_source_request_rejected"));
    }
    if (response) {
      await cancelBodyBoundedV1(
        response,
        "earn source request rejected",
      );
    }
    return {
      ok: false,
      status: 0,
      body: null,
    };
  } finally {
    clearTimeout(timer);
  }
}
