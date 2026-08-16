"use strict";

(() => {
  const MARKER = "VOID_CANONICAL_PRODUCER_SELF_HTTP_GUARD_V1";
  if (globalThis.__voidCanonicalSelfHttpGuardV1?.installed) return;

  const originalFetch = globalThis.fetch;
  if (typeof originalFetch !== "function") {
    globalThis.__voidCanonicalSelfHttpGuardV1 = {
      installed: false,
      enabled: false,
      marker: MARKER,
      reason: "fetch_unavailable",
    };
    return;
  }

  const enabled =
    process.env.VOID_CANONICAL_PRODUCER_ROLE === "1" &&
    process.env.VOID_CANONICAL_SELF_HTTP_GUARD === "1";
  const ownPort = String(process.env.HTTP_PORT || "4100");
  const legacyObserverSuppressionEnabled =
    process.env.VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS === "1";

  function boundedInt(raw, fallback, min, max) {
    const n = Number.parseInt(String(raw ?? ""), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  const maxInflight = boundedInt(
    process.env.VOID_CANONICAL_SELF_HTTP_MAX_INFLIGHT,
    8,
    1,
    64,
  );
  const timeoutMs = boundedInt(
    process.env.VOID_CANONICAL_SELF_HTTP_TIMEOUT_MS,
    1500,
    50,
    10000,
  );
  const teardownTimeoutMs = boundedInt(
    process.env.VOID_CANONICAL_SELF_HTTP_TEARDOWN_TIMEOUT_MS,
    500,
    50,
    5000,
  );

  const state = {
    installed: true,
    enabled,
    marker: MARKER,
    ownPort,
    maxInflight,
    timeoutMs,
    teardownTimeoutMs,
    legacyObserverSuppressionEnabled,
    inflight: 0,
    limited: 0,
    timedOut: 0,
    cleanups: 0,
    lastCleanupReason: "",
    teardownDeadlineHits: 0,
    teardownErrors: 0,
    lastTeardownError: "",
    suppressedInterventions: 0,
    suppressedLegacyObserverFetches: 0,
    legacyObserverSuppressions: {
      header3_match_exporter: 0,
      ready_watchdog: 0,
      proposer_head_pollers: 0,
    },
    lastSuppressedLegacyObserver: "",
    lastSuppressedLegacyObserverPath: "",
    autopropBypass: 0,
    selfPassThrough: 0,
    externalPassThrough: 0,
  };
  globalThis.__voidCanonicalSelfHttpGuardV1 = state;
  if (!enabled) return;

  const interventionPaths = new Set([
    "/proposer/auto/start",
    "/blocks/empty-policy/set",
    "/tx/merge/cap/set",
    "/tx/dev/burst",
  ]);

  function requestInfo(input, init) {
    const raw =
      typeof input === "string" || input instanceof URL
        ? String(input)
        : input && typeof input.url === "string"
          ? input.url
          : "";
    if (!raw) return null;

    let url;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }

    const method = String(init?.method || input?.method || "GET").toUpperCase();
    const host = url.hostname.toLowerCase();
    const loopback =
      host === "127.0.0.1" || host === "localhost" || host === "[::1]" || host === "::1";
    const port = url.port || (url.protocol === "http:" ? "80" : url.protocol === "https:" ? "443" : "");
    const self = url.protocol === "http:" && loopback && port === ownPort;
    const autoprop =
      self &&
      method === "POST" &&
      url.pathname === "/__void/metrics/proposer.commit-direct.v2fs/commit" &&
      url.search === "?empty=1";
    const intervention = self && method === "POST" && interventionPaths.has(url.pathname);

    return { url, method, self, autoprop, intervention };
  }

  function appCallerStack() {
    return String(new Error("caller").stack || "")
      .split("\n")
      .slice(1)
      .filter(
        (line) =>
          !line.includes("canonical-producer-self-http-guard-v1.cjs") &&
          !/\b(appCallerStack|classifyLegacyObserver|voidCanonicalProducerGuardedFetch)\b/.test(line),
      )
      .join("\n");
  }

  function classifyLegacyObserver(info) {
    if (!legacyObserverSuppressionEnabled || !info?.self || info.method !== "GET") return "";

    const path = info.url.pathname;
    const stack = appCallerStack();

    const header3Path =
      path === "/blocks/latest/number" ||
      /^\/blocks\/\d+\/(?:header3|txroot)$/.test(path);
    if (header3Path && /\bselfJson\b/.test(stack) && /\bpoll\b/.test(stack)) {
      return "header3_match_exporter";
    }

    const readyPath =
      path === "/__void/ready.json" ||
      path === "/head.txt" ||
      path === "/proposer/stats";
    if (
      readyPath &&
      /\bsample\b/.test(stack) &&
      (/\bfetchJson\b/.test(stack) || /\bfetchText\b/.test(stack))
    ) {
      return "ready_watchdog";
    }

    if (path === "/head.txt") {
      const firstAppFrame = stack.split("\n").find(Boolean) || "";
      if (/\bat poll\b/.test(firstAppFrame)) {
        return "proposer_head_pollers";
      }
    }

    return "";
  }

  function suppressedLegacyObserverResponse(info, family) {
    const headText = info.url.pathname === "/head.txt";
    return new Response(headText ? "NaN\n" : "null", {
      status: 200,
      headers: {
        "content-type": headText
          ? "text/plain; charset=utf-8"
          : "application/json; charset=utf-8",
        "x-void-self-http-guard": "suppressed-legacy-observer",
        "x-void-legacy-observer-family": family,
      },
    });
  }

  function wrapResponseBodyLifetime(response, cleanup, registerBodyCancel, isAbortRequested) {
    if (!(response instanceof Response)) {
      cleanup("non_response");
      return response;
    }

    const originalBody = response.body;
    if (!originalBody) {
      cleanup("no_body");
      return response;
    }

    const reader = originalBody.getReader();
    let cancelPromise = null;
    const cancelReader = (reason) => {
      if (cancelPromise) return cancelPromise;
      try {
        cancelPromise = Promise.resolve(reader.cancel(reason));
      } catch (err) {
        cancelPromise = Promise.reject(err);
      }
      return cancelPromise;
    };
    registerBodyCancel(cancelReader);

    const guardedBody = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            if (!isAbortRequested()) cleanup("body_complete");
            try {
              controller.close();
            } catch (closeErr) {
              void closeErr;
            }
            return;
          }
          controller.enqueue(value);
        } catch (err) {
          if (!isAbortRequested()) cleanup("body_error");
          try {
            controller.error(err);
          } catch (errorErr) {
            void errorErr;
          }
        }
      },
      async cancel(reason) {
        try {
          await cancelReader(reason);
        } finally {
          if (!isAbortRequested()) cleanup("body_cancel");
        }
      },
    });

    const guardedResponse = new Response(guardedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    return new Proxy(guardedResponse, {
      get(target, prop) {
        if (prop === "url" || prop === "redirected" || prop === "type") {
          return Reflect.get(response, prop, response);
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  globalThis.fetch = function voidCanonicalProducerGuardedFetch(input, init) {
    const info = requestInfo(input, init);

    if (!info?.self) {
      state.externalPassThrough += 1;
      return originalFetch.call(globalThis, input, init);
    }

    const legacyObserverFamily = classifyLegacyObserver(info);
    if (legacyObserverFamily) {
      state.suppressedLegacyObserverFetches += 1;
      state.legacyObserverSuppressions[legacyObserverFamily] += 1;
      state.lastSuppressedLegacyObserver = legacyObserverFamily;
      state.lastSuppressedLegacyObserverPath = info.url.pathname;
      return Promise.resolve(suppressedLegacyObserverResponse(info, legacyObserverFamily));
    }

    if (info.intervention) {
      state.suppressedInterventions += 1;
      return Promise.resolve(
        new Response(null, {
          status: 204,
          headers: { "x-void-self-http-guard": "suppressed-intervention" },
        }),
      );
    }

    if (info.autoprop) {
      state.autopropBypass += 1;
      return originalFetch.call(globalThis, input, init);
    }

    if (state.inflight >= maxInflight) {
      state.limited += 1;
      return Promise.reject(new TypeError(`${MARKER}_LIMIT max_inflight=${maxInflight}`));
    }

    state.inflight += 1;
    state.selfPassThrough += 1;

    const controller = new AbortController();
    const callerSignal = init?.signal || input?.signal;
    let callerAbort;
    let timer;
    let teardownTimer;
    let bodyCancel = null;
    let cleaned = false;
    let abortRequested = false;
    let abortReason = null;
    let abortCleanupReason = "";
    let teardownTaskStarted = false;
    let abortReject;
    const abortTerminal = new Promise((resolve, reject) => {
      void resolve;
      abortReject = reject;
    });
    void abortTerminal.catch(() => undefined);

    const recordTeardownError = (err) => {
      if (err === abortReason) return;
      state.teardownErrors += 1;
      state.lastTeardownError = String(err?.message || err || "unknown_teardown_error");
    };

    const cleanup = (reason) => {
      if (cleaned) return;
      cleaned = true;
      if (timer) clearTimeout(timer);
      if (teardownTimer) clearTimeout(teardownTimer);
      if (callerSignal && callerAbort) callerSignal.removeEventListener("abort", callerAbort);
      state.inflight = Math.max(0, state.inflight - 1);
      state.cleanups += 1;
      state.lastCleanupReason = reason;
      if (abortRequested && abortReject) {
        const reject = abortReject;
        abortReject = null;
        reject(abortReason instanceof Error ? abortReason : new Error(`${MARKER}_${abortCleanupReason || "ABORT"}`));
      }
    };

    const settleTeardownTask = (task, cleanupReason) => {
      if (teardownTaskStarted || cleaned) return;
      teardownTaskStarted = true;
      Promise.resolve(task).then(
        () => cleanup(cleanupReason),
        (err) => {
          recordTeardownError(err);
          cleanup(cleanupReason);
        },
      );
    };

    const beginAbort = (reason, cleanupReason) => {
      if (abortRequested || cleaned) return;
      abortRequested = true;
      abortReason = reason;
      abortCleanupReason = cleanupReason;
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (!controller.signal.aborted) controller.abort(reason);
      teardownTimer = setTimeout(() => {
        state.teardownDeadlineHits += 1;
        cleanup(`${cleanupReason}_teardown_deadline`);
      }, teardownTimeoutMs);
      if (bodyCancel) {
        let task;
        try {
          task = bodyCancel(reason);
        } catch (err) {
          recordTeardownError(err);
          cleanup(cleanupReason);
          return;
        }
        settleTeardownTask(task, cleanupReason);
      }
    };

    timer = setTimeout(() => {
      state.timedOut += 1;
      const reason = new Error(`${MARKER}_TIMEOUT timeout_ms=${timeoutMs}`);
      beginAbort(reason, "timeout");
    }, timeoutMs);

    if (callerSignal) {
      callerAbort = () => beginAbort(callerSignal.reason, "caller_abort");
      if (callerSignal.aborted) callerAbort();
      else callerSignal.addEventListener("abort", callerAbort, { once: true });
    }

    const guardedInit = { ...(init || {}), signal: controller.signal };
    let result;
    try {
      result = originalFetch.call(globalThis, input, guardedInit);
    } catch (err) {
      if (abortRequested) {
        cleanup(abortCleanupReason || "abort_fetch_sync_error");
      } else {
        cleanup("fetch_sync_error");
      }
      throw err;
    }

    const pipeline = Promise.resolve(result).then(
      (response) => {
        if (abortRequested) {
          if (response instanceof Response && response.body) {
            let task;
            try {
              task = response.body.cancel(abortReason);
            } catch (err) {
              recordTeardownError(err);
              cleanup(abortCleanupReason);
              return abortTerminal;
            }
            settleTeardownTask(task, abortCleanupReason);
          } else {
            cleanup(abortCleanupReason);
          }
          return abortTerminal;
        }
        return wrapResponseBodyLifetime(
          response,
          cleanup,
          (cancel) => {
            bodyCancel = cancel;
            if (abortRequested && !cleaned) {
              let task;
              try {
                task = bodyCancel(abortReason);
              } catch (err) {
                recordTeardownError(err);
                cleanup(abortCleanupReason);
                return;
              }
              settleTeardownTask(task, abortCleanupReason);
            }
          },
          () => abortRequested,
        );
      },
      (err) => {
        if (abortRequested) cleanup(abortCleanupReason);
        else cleanup("fetch_error");
        throw err;
      },
    );

    return Promise.race([pipeline, abortTerminal]);
  };
})();
