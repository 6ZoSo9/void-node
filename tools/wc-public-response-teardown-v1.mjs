export const RESPONSE_REJECTION_TEARDOWN_MS = 250;

export async function settleCancellationBounded(
  cancellation,
  teardownMs = RESPONSE_REJECTION_TEARDOWN_MS,
) {
  if (!cancellation || typeof cancellation.then !== "function") return;
  let timer = null;
  try {
    await Promise.race([
      Promise.resolve(cancellation).catch(() => undefined),
      new Promise((resolve) => {
        timer = setTimeout(resolve, teardownMs);
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

async function cancelTargetBounded(target, teardownMs) {
  if (!target || typeof target.cancel !== "function") return;
  let cancellation = null;
  try {
    cancellation = target.cancel();
  } catch (error) {
    void error;
    return;
  }
  await settleCancellationBounded(cancellation, teardownMs);
}

async function rejectResponseTeardownBounded({ response, reader = null, abort, teardownMs }) {
  try {
    abort?.(new Error("response_rejected"));
  } catch (error) {
    void error;
  }
  await cancelTargetBounded(reader ?? response?.body, teardownMs);
}

export async function readBoundedTextOwned(response, {
  maximumBytes,
  abort,
  teardownMs = RESPONSE_REJECTION_TEARDOWN_MS,
}) {
  const declaredRaw = response.headers.get("content-length");
  if (declaredRaw !== null) {
    const declaredText = declaredRaw.trim();
    if (!/^(0|[1-9]\d*)$/u.test(declaredText)) {
      const primary = new Error("response_content_length_invalid");
      await rejectResponseTeardownBounded({ response, abort, teardownMs });
      throw primary;
    }
    const declared = Number(declaredText);
    if (!Number.isSafeInteger(declared) || declared > maximumBytes) {
      const primary = new Error("response_body_too_large");
      await rejectResponseTeardownBounded({ response, abort, teardownMs });
      throw primary;
    }
  }

  if (!response.body || typeof response.body.getReader !== "function") {
    throw new Error("response_body_unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "";
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximumBytes) {
        const primary = new Error("response_body_too_large");
        await rejectResponseTeardownBounded({ response, reader, abort, teardownMs });
        throw primary;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    try {
      reader.releaseLock();
    } catch (error) {
      void error;
    }
  }
}
