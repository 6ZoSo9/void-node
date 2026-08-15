export const VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1 = 128 * 1024;
export const VOID_UI_WAVE2_HOME_SOURCE_TIMEOUT_MS_V1 = 2500;

export type VoidUiWave2HomeSourceResultV1 = {
  ok: boolean;
  status: number;
  body: unknown;
  error?: string;
};

export type VoidUiWave2HomeReadinessEvidenceV1 = {
  ready: boolean;
  txroot_live: 0 | 1;
  reasons: string[];
};

export type VoidUiWave2HomeOperationalEvidenceV1 = {
  source_available: boolean;
  operational_ready: boolean;
  chain_head: number | null;
  peer_count: number | null;
};

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

type FetchOptions = {
  timeoutMs?: number;
  fetchImpl?: FetchLike;
};

export class VoidUiWave2HomeSnapshotBuildOwnerV1<T> {
  private inFlight: Promise<T> | null = null;

  getOrStart(build: () => Promise<T>): Promise<T> {
    if (this.inFlight !== null) {
      return this.inFlight;
    }

    let owned: Promise<T>;
    owned = Promise.resolve()
      .then(build)
      .finally(() => {
        if (this.inFlight === owned) {
          this.inFlight = null;
        }
      });

    this.inFlight = owned;
    return owned;
  }

  hasInFlight(): boolean {
    return this.inFlight !== null;
  }
}

export function resolveVoidUiWave2HomeSourceBaseV1(
  candidateInput: string,
  fallback: string
): string {
  const candidate = String(candidateInput || fallback).trim();

  try {
    const parsed = new URL(candidate);
    const hostname = parsed.hostname;
    const normalizedHostname =
      hostname.startsWith("[") && hostname.endsWith("]")
        ? hostname.slice(1, -1)
        : hostname;
    const allowedHost =
      normalizedHostname === "127.0.0.1" ||
      normalizedHostname === "localhost" ||
      normalizedHostname === "::1";

    if (
      parsed.protocol !== "http:" ||
      !allowedHost ||
      (parsed.pathname !== "/" && parsed.pathname !== "") ||
      parsed.search ||
      parsed.hash ||
      parsed.username ||
      parsed.password
    ) {
      return fallback;
    }

    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return fallback;
  }
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function parseVoidUiWave2HomeHealthOkV1(body: unknown): boolean {
  return isObjectRecord(body) && body.ok === true;
}

export function parseVoidUiWave2HomeReadinessEvidenceV1(
  body: unknown
): VoidUiWave2HomeReadinessEvidenceV1 | null {
  if (!isObjectRecord(body)) return null;

  if (
    typeof body.ready !== "boolean" ||
    (body.txroot_live !== 0 && body.txroot_live !== 1) ||
    !Array.isArray(body.reasons) ||
    !body.reasons.every((reason) => typeof reason === "string")
  ) {
    return null;
  }

  return {
    ready: body.ready,
    txroot_live: body.txroot_live,
    reasons: [...body.reasons] as string[],
  };
}

export function parseVoidUiWave2HomeChainHeadV1(
  body: unknown
): number | null {
  if (!isObjectRecord(body)) return null;

  const value =
    body.number ??
    body.height ??
    body.head ??
    body.latest ??
    null;

  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  )
    ? value
    : null;
}

const hasExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[]
): boolean => {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
};

const isVoidUiWave2HomeConnectedPeerV1 = (value: unknown): boolean => {
  if (!isObjectRecord(value)) return false;

  return (
    hasExactKeys(value, ["id", "addr", "listens", "outbound"]) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.addr === "string" &&
    value.addr.length > 0 &&
    Array.isArray(value.listens) &&
    value.listens.every((listen) => typeof listen === "string") &&
    typeof value.outbound === "boolean"
  );
};

export function parseVoidUiWave2HomePeerCountV1(
  body: unknown
): number | null {
  if (!isObjectRecord(body)) return null;

  if (body.ok !== true || !Array.isArray(body.connected)) {
    return null;
  }

  return body.connected.every(isVoidUiWave2HomeConnectedPeerV1)
    ? body.connected.length
    : null;
}

export function evaluateVoidUiWave2HomeOperationalEvidenceV1(input: {
  health: VoidUiWave2HomeSourceResultV1;
  ready: VoidUiWave2HomeSourceResultV1;
  head: VoidUiWave2HomeSourceResultV1;
  peers: VoidUiWave2HomeSourceResultV1;
}): VoidUiWave2HomeOperationalEvidenceV1 {
  const parsedHealthOk = parseVoidUiWave2HomeHealthOkV1(input.health.body);
  const parsedReadiness = parseVoidUiWave2HomeReadinessEvidenceV1(
    input.ready.body
  );
  const parsedChainHead = parseVoidUiWave2HomeChainHeadV1(input.head.body);
  const parsedPeerCount = parseVoidUiWave2HomePeerCountV1(input.peers.body);

  const sourceAvailable =
    input.health.ok === true &&
    input.health.status === 200 &&
    parsedHealthOk === true &&
    input.ready.ok === true &&
    input.ready.status === 200 &&
    parsedReadiness !== null &&
    input.head.ok === true &&
    input.head.status === 200 &&
    parsedChainHead !== null &&
    input.peers.ok === true &&
    input.peers.status === 200 &&
    parsedPeerCount !== null;

  return {
    source_available: sourceAvailable,
    operational_ready:
      sourceAvailable &&
      parsedReadiness !== null &&
      parsedReadiness.ready === true &&
      parsedReadiness.txroot_live === 1 &&
      parsedReadiness.reasons.length === 0,
    chain_head: parsedChainHead,
    peer_count: parsedPeerCount,
  };
}

const awaitTeardownWithinSignal = async (
  startTeardown: () => Promise<unknown>,
  signal: AbortSignal
): Promise<void> => {
  let pending: Promise<unknown>;
  try {
    pending = startTeardown();
  } catch {
    // Cleanup cannot replace the primary bounded-input result.
    return;
  }

  const settled = pending.then(
    () => undefined,
    () => undefined
  );
  if (signal.aborted) {
    void settled;
    return;
  }

  let onAbort!: () => void;
  const aborted = new Promise<void>((resolve) => {
    onAbort = resolve;
    signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    await Promise.race([settled, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
};

const declaredLength = (response: Response): number | null => {
  const raw = response.headers.get("content-length");
  if (raw === null || !/^[0-9]+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export async function readVoidUiWave2HomeBoundedTextV1(
  response: Response,
  signal: AbortSignal
): Promise<string> {
  const declared = declaredLength(response);
  if (
    declared !== null &&
    declared > VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1
  ) {
    if (response.body) {
      await awaitTeardownWithinSignal(
        () => response.body!.cancel("void_ui_wave2_home_source_body_too_large"),
        signal
      );
    }
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
        await awaitTeardownWithinSignal(
          () => reader.cancel("void_ui_wave2_home_source_body_too_large"),
          signal
        );
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

    const text = await readVoidUiWave2HomeBoundedTextV1(
      response,
      controller.signal
    );
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
