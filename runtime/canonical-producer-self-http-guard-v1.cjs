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

  const state = {
    installed: true,
    enabled,
    marker: MARKER,
    ownPort,
    maxInflight,
    timeoutMs,
    inflight: 0,
    limited: 0,
    timedOut: 0,
    cleanups: 0,
    lastCleanupReason: "",
    suppressedInterventions: 0,
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
      url.searchParams.get("empty") === "1";
    const intervention = self && method === "POST" && interventionPaths.has(url.pathname);

    return { url, method, self, autoprop, intervention };
  }

  function wrapResponseBodyLifetime(response, cleanup, registerBodyCancel) {
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
    registerBodyCancel((reason) => Promise.resolve(reader.cancel(reason)).catch(() => {}));

    const guardedBody = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            cleanup("body_complete");
            controller.close();
            return;
          }
          controller.enqueue(value);
        } catch (err) {
          cleanup("body_error");
          controller.error(err);
        }
      },
      async cancel(reason) {
        try {
          await reader.cancel(reason);
        } finally {
          cleanup("body_cancel");
        }
      },
    });

    const guardedResponse = new Response(guardedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // Preserve fetch metadata that the Response constructor cannot set while
    // keeping all body consumers on the guarded stream above.
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

    if (info.intervention) {
      state.suppressedInterventions += 1;
      return Promise.resolve(
        new Response(null, {
          status: 204,
          headers: { "x-void-self-http-guard": "suppressed-intervention" },
        }),
      );
    }

    // Canonical block production uses this exact loopback commit route. Do not
    // apply diagnostic concurrency/timeout controls to it.
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
    let bodyCancel = null;
    let cleaned = false;

    const cleanup = (reason) => {
      if (cleaned) return;
      cleaned = true;
      if (timer) clearTimeout(timer);
      if (callerSignal && callerAbort) callerSignal.removeEventListener("abort", callerAbort);
      state.inflight = Math.max(0, state.inflight - 1);
      state.cleanups += 1;
      state.lastCleanupReason = reason;
    };

    const abortAndCleanup = (reason, cleanupReason) => {
      if (!controller.signal.aborted) controller.abort(reason);
      if (bodyCancel) void bodyCancel(reason);
      cleanup(cleanupReason);
    };

    if (callerSignal) {
      callerAbort = () => abortAndCleanup(callerSignal.reason, "caller_abort");
      if (callerSignal.aborted) callerAbort();
      else callerSignal.addEventListener("abort", callerAbort, { once: true });
    }

    timer = setTimeout(() => {
      state.timedOut += 1;
      const reason = new Error(`${MARKER}_TIMEOUT timeout_ms=${timeoutMs}`);
      abortAndCleanup(reason, "timeout");
    }, timeoutMs);

    const guardedInit = { ...(init || {}), signal: controller.signal };
    let result;
    try {
      result = originalFetch.call(globalThis, input, guardedInit);
    } catch (err) {
      cleanup("fetch_sync_error");
      throw err;
    }

    return Promise.resolve(result).then(
      (response) => wrapResponseBodyLifetime(
        response,
        cleanup,
        (cancel) => {
          bodyCancel = cancel;
          if (controller.signal.aborted) void bodyCancel(controller.signal.reason);
        },
      ),
      (err) => {
        cleanup("fetch_error");
        throw err;
      },
    );
  };
})();
