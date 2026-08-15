export const VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1 = 128 * 1024;
export const VOID_UI_WAVE2_HOME_SOURCE_TIMEOUT_MS_V1 = 2500;

export type VoidUiWave2HomeSourceResultV1 = {
  ok: boolean;
  status: number;
  body: unknown;
  error?: string;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

type FetchOptions = {
  timeoutMs?: number;
  fetchImpl?: FetchLike;
};

const bestEffortCancel = (
  body: ReadableStream<Uint8Array> | null,
  reason: string
): void => {
  if (!body) return;
  try {
    const pending = body.cancel(reason);
    void pending.catch(() => {});
  } catch {
    // Cleanup cannot replace the primary bounded-input result.
  }
};

const declaredLength = (response: Response): number | null => {
  const raw = response.headers.get("content-length");
  if (raw === null || !/^[0-9]+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export async function readVoidUiWave2HomeBoundedTextV1(
  response: Response
): Promise<string> {
  const declared = declaredLength(response);
  if (
    declared !== null &&
    declared > VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1
  ) {
    bestEffortCancel(response.body, "void_ui_wave2_home_source_body_too_large");
    throw new Error("source_body_too_large");
  }

  if (!response.body || typeof response.body.getReader !== "function") {
    throw new Error("source_body_not_stream_readable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new Error("source_body_chunk_invalid");
      }

      totalBytes += value.byteLength;
      if (totalBytes > VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1) {
        try {
          const pending = reader.cancel(
            "void_ui_wave2_home_source_body_too_large"
          );
          void pending.catch(() => {});
        } catch {
          // Cleanup cannot replace the primary bounded-input result.
        }
        throw new Error("source_body_too_large");
      }

      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();
    return text;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Reader cleanup is best effort only.
    }
  }
}

export async function fetchVoidUiWave2HomeSourceJsonV1(
  base: string,
  route: string,
  options: FetchOptions = {}
): Promise<VoidUiWave2HomeSourceResultV1> {
  const controller = new AbortController();
  const timeoutMs =
    Number.isSafeInteger(options.timeoutMs) && Number(options.timeoutMs) > 0
      ? Number(options.timeoutMs)
      : VOID_UI_WAVE2_HOME_SOURCE_TIMEOUT_MS_V1;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  timeout.unref?.();
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(`${base}${route}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "void-ui-wave2-home-readonly-v1",
        "Cache-Control": "no-store",
      },
      redirect: "error",
      signal: controller.signal,
    });

    const text = await readVoidUiWave2HomeBoundedTextV1(response);
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
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
