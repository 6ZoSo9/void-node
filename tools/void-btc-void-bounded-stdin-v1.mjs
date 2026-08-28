export const VOID_BTC_VOID_STDIN_IDLE_TIMEOUT_MS_V1 = 500;
export const VOID_BTC_VOID_STDIN_TOTAL_TIMEOUT_MS_V1 = 2000;

export function readBtcVoidBoundedStdinV1({
  stream = process.stdin,
  maxBytes,
  idleTimeoutMs = VOID_BTC_VOID_STDIN_IDLE_TIMEOUT_MS_V1,
  totalTimeoutMs = VOID_BTC_VOID_STDIN_TOTAL_TIMEOUT_MS_V1,
}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError("maxBytes must be a positive safe integer");
  }
  if (!Number.isSafeInteger(idleTimeoutMs) || idleTimeoutMs <= 0) {
    throw new TypeError("idleTimeoutMs must be a positive safe integer");
  }
  if (
    !Number.isSafeInteger(totalTimeoutMs) ||
    totalTimeoutMs < idleTimeoutMs
  ) {
    throw new TypeError(
      "totalTimeoutMs must be a safe integer at least idleTimeoutMs",
    );
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let settled = false;
    let idleTimer;
    let totalTimer;

    const cleanup = () => {
      clearTimeout(idleTimer);
      clearTimeout(totalTimer);
      stream.removeListener("data", onData);
      stream.removeListener("end", onEnd);
      stream.removeListener("error", onError);
    };
    const finishError = (message) => {
      if (settled) return;
      settled = true;
      cleanup();
      stream.pause?.();
      stream.destroy?.();
      reject(message instanceof Error ? message : new Error(message));
    };
    const finishSuccess = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (bytes === 0) {
        reject(new Error("stdin JSON is required"));
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    };
    const armIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(
        () =>
          finishError(
            `stdin idle deadline exceeded after ${idleTimeoutMs}ms`,
          ),
        idleTimeoutMs,
      );
    };
    function onData(chunk) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > maxBytes) {
        finishError(`stdin exceeds ${maxBytes} bytes`);
        return;
      }
      chunks.push(buffer);
      armIdleTimer();
    }
    function onEnd() {
      finishSuccess();
    }
    function onError(error) {
      finishError(error);
    }

    stream.on("data", onData);
    stream.once("end", onEnd);
    stream.once("error", onError);
    armIdleTimer();
    totalTimer = setTimeout(
      () =>
        finishError(
          `stdin total deadline exceeded after ${totalTimeoutMs}ms`,
        ),
      totalTimeoutMs,
    );
    stream.resume?.();
  });
}
