const DATANET_ENDPOINT = '/public-node/datanet/field-replication-status-card-v1.json';
const MAX_RESPONSE_BYTES = 128 * 1024;
const TEARDOWN_TIMEOUT_MS = 250;

const currentRoute = () => {
  if (typeof location === 'undefined') return '';
  return location.hash.replace(/^#\/?/, '').split(/[?\/]/)[0] || 'home';
};

const exactDataNetRequest = (input, origin) => {
  try {
    const base = new URL(origin);
    const requestValue = typeof Request !== 'undefined' && input instanceof Request
      ? input.url
      : String(input);
    const url = new URL(requestValue, base);
    return url.origin === base.origin
      && url.pathname === DATANET_ENDPOINT
      && url.search === ''
      && url.hash === '';
  } catch {
    return false;
  }
};

const abortReason = (signal, fallback) => (
  signal?.reason instanceof Error ? signal.reason : new Error(fallback)
);

const forwardAbort = (sourceSignal, controller) => {
  if (!sourceSignal) return () => {};

  const abortFromSource = () => {
    if (!controller.signal.aborted) {
      controller.abort(abortReason(sourceSignal, 'DataNet request aborted'));
    }
  };

  if (sourceSignal.aborted) {
    abortFromSource();
    return () => {};
  }

  sourceSignal.addEventListener('abort', abortFromSource, { once: true });
  return () => sourceSignal.removeEventListener('abort', abortFromSource);
};

const waitForAbort = (signal) => new Promise((_, reject) => {
  if (signal.aborted) {
    reject(abortReason(signal, 'DataNet request aborted'));
    return;
  }
  const onAbort = () => {
    signal.removeEventListener('abort', onAbort);
    reject(abortReason(signal, 'DataNet request aborted'));
  };
  signal.addEventListener('abort', onAbort, { once: true });
});

const raceSignal = async (promise, signal) => {
  if (!signal) return promise;
  return Promise.race([promise, waitForAbort(signal)]);
};

const boundedSettlement = async (promise, timeoutMs = TEARDOWN_TIMEOUT_MS) => {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(undefined), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
};

const canonicalContentLength = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value);
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
    throw new Error('DataNet response has an invalid content length');
  }
  const numeric = Number(raw);
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw new Error('DataNet response has an invalid content length');
  }
  return numeric;
};

export function createDataNetRequestOwnerV1({
  fetchImpl,
  origin = globalThis.location?.origin ?? 'http://localhost',
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('DataNet request owner requires fetch');
  }

  let activeRequest = null;
  let startQueue = Promise.resolve();

  const acquireStartSlot = async (sourceSignal) => {
    const predecessor = startQueue;
    let releaseSlot;
    const slot = new Promise((resolve) => { releaseSlot = resolve; });
    startQueue = predecessor.then(() => slot, () => slot);

    try {
      await raceSignal(predecessor, sourceSignal);
    } catch (error) {
      predecessor.then(releaseSlot, releaseSlot);
      throw error;
    }

    return releaseSlot;
  };

  const release = (request) => {
    if (request.released) return;
    request.released = true;
    request.detachSourceAbort();
    request.detachControllerAbort?.();
    if (activeRequest === request) activeRequest = null;
    request.resolveReleased();
  };

  const maybeRelease = (request) => {
    if (
      request.fetchSettled
      && request.bodyTerminal
      && request.pendingReads.size === 0
      && request.pendingCancels.size === 0
    ) {
      release(request);
    }
  };

  const trackRead = (request, promise) => {
    request.pendingReads.add(promise);
    promise.then(
      (result) => {
        request.pendingReads.delete(promise);
        if (result?.done === true) request.bodyTerminal = true;
        maybeRelease(request);
      },
      () => {
        request.pendingReads.delete(promise);
        request.bodyTerminal = true;
        maybeRelease(request);
      },
    );
    return promise;
  };

  const trackCancel = (request, promise) => {
    request.pendingCancels.add(promise);
    promise.then(
      () => {
        request.pendingCancels.delete(promise);
        request.bodyTerminal = true;
        maybeRelease(request);
      },
      () => {
        request.pendingCancels.delete(promise);
        request.bodyTerminal = true;
        maybeRelease(request);
      },
    );
    return promise;
  };

  const startReaderCancel = (request, rawReader, reason) => {
    if (request.cancelPromise) return request.cancelPromise;
    if (!rawReader || typeof rawReader.cancel !== 'function') {
      request.bodyTerminal = true;
      maybeRelease(request);
      request.cancelPromise = Promise.resolve();
      return request.cancelPromise;
    }
    const operation = Promise.resolve().then(() => rawReader.cancel(reason));
    request.cancelPromise = trackCancel(request, operation);
    return request.cancelPromise;
  };

  const startResponseCancel = (request, response, reason) => {
    if (request.cancelPromise) return request.cancelPromise;
    const body = response?.body;
    if (!body || typeof body.cancel !== 'function') {
      request.bodyTerminal = true;
      maybeRelease(request);
      request.cancelPromise = Promise.resolve();
      return request.cancelPromise;
    }
    const operation = Promise.resolve().then(() => body.cancel(reason));
    request.cancelPromise = trackCancel(request, operation);
    return request.cancelPromise;
  };

  const startOwnedCleanup = (request, reason) => {
    if (request.reader) return startReaderCancel(request, request.reader, reason);
    if (request.response) return startResponseCancel(request, request.response, reason);
    if (request.fetchSettled) {
      request.bodyTerminal = true;
      maybeRelease(request);
    }
    return request.cancelPromise ?? Promise.resolve();
  };

  const abortRequest = (request, reason) => {
    if (!request || request.released) return false;
    if (!request.controller.signal.aborted) {
      request.controller.abort(new Error(reason));
    }
    void startOwnedCleanup(request, reason).catch(() => {});
    return true;
  };

  const waitForPriorRelease = async (request, sourceSignal) => {
    if (!request || request.released) return;
    abortRequest(request, 'DataNet request superseded');
    await boundedSettlement(raceSignal(request.releasedPromise, sourceSignal));
    if (!request.released) {
      throw new Error('DataNet prior request generation is still settling');
    }
  };

  const wrapReader = (request, rawReader) => {
    request.reader = rawReader;
    return Object.freeze({
      async read() {
        if (request.controller.signal.aborted) {
          void startReaderCancel(
            request,
            rawReader,
            abortReason(request.controller.signal, 'DataNet request aborted').message,
          ).catch(() => {});
          throw abortReason(request.controller.signal, 'DataNet request aborted');
        }

        const operation = trackRead(
          request,
          Promise.resolve().then(() => rawReader.read()),
        );
        try {
          return await raceSignal(operation, request.controller.signal);
        } catch (error) {
          if (request.controller.signal.aborted) {
            void startReaderCancel(
              request,
              rawReader,
              abortReason(request.controller.signal, 'DataNet request aborted').message,
            ).catch(() => {});
          }
          throw error;
        }
      },
      async cancel(reason) {
        const operation = startReaderCancel(request, rawReader, reason);
        return boundedSettlement(operation);
      },
      releaseLock() {
        rawReader.releaseLock?.();
        maybeRelease(request);
      },
    });
  };

  const wrapResponse = (request, response) => {
    const rawBody = response?.body;
    const body = rawBody && typeof rawBody.getReader === 'function'
      ? Object.freeze({
          getReader() {
            let rawReader;
            try {
              rawReader = rawBody.getReader();
            } catch (error) {
              void startResponseCancel(request, response, 'DataNet body reader acquisition failed').catch(() => {});
              throw error;
            }
            return wrapReader(request, rawReader);
          },
          cancel(reason) {
            return boundedSettlement(startResponseCancel(request, response, reason));
          },
        })
      : rawBody;

    return new Proxy(response, {
      get(target, property) {
        if (property === 'body') return body;
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };

  const rejectResponse = async (request, response, error) => {
    const cleanup = startResponseCancel(request, response, error.message);
    try {
      await boundedSettlement(cleanup);
    } catch {
      // The primary admission failure remains authoritative.
    }
    throw error;
  };

  const prevalidateResponse = async (request, response, requestedHref) => {
    if (response && !Object.prototype.hasOwnProperty.call(response, 'ok') && !('ok' in Object(response))) {
      return response;
    }
    if (!response || response.ok !== true) {
      return rejectResponse(
        request,
        response,
        new Error(`DataNet endpoint returned HTTP ${response?.status ?? 'unknown'}`),
      );
    }
    if (response.redirected === true) {
      return rejectResponse(request, response, new Error('DataNet endpoint redirected'));
    }

    if (typeof response.url === 'string' && response.url.length > 0) {
      let finalUrl;
      try {
        finalUrl = new URL(response.url, origin);
      } catch {
        return rejectResponse(request, response, new Error('DataNet response escaped the exact same-origin endpoint'));
      }
      if (finalUrl.href !== requestedHref) {
        return rejectResponse(request, response, new Error('DataNet response escaped the exact same-origin endpoint'));
      }
    }

    let contentLength;
    try {
      contentLength = canonicalContentLength(response.headers?.get?.('content-length'));
    } catch (error) {
      return rejectResponse(request, response, error);
    }
    if (contentLength !== null && contentLength > MAX_RESPONSE_BYTES) {
      return rejectResponse(request, response, new Error('DataNet response exceeds the size limit'));
    }
    return wrapResponse(request, response);
  };

  const fetch = async (input, init = {}) => {
    if (!exactDataNetRequest(input, origin)) {
      return fetchImpl(input, init);
    }

    const releaseStartSlot = await acquireStartSlot(init?.signal);
    let controller;
    let request;
    let requestedHref;
    let rawFetch;

    try {
      if (activeRequest) {
        const priorRequest = activeRequest;
        abortRequest(priorRequest, 'DataNet request superseded');
        await waitForPriorRelease(priorRequest, init?.signal);
      }

      controller = new AbortController();
      let resolveReleased;
      const releasedPromise = new Promise((resolve) => { resolveReleased = resolve; });
      request = {
        controller,
        detachSourceAbort: forwardAbort(init?.signal, controller),
        detachControllerAbort: null,
        fetchSettled: false,
        response: null,
        reader: null,
        bodyTerminal: false,
        pendingReads: new Set(),
        pendingCancels: new Set(),
        cancelPromise: null,
        released: false,
        releasedPromise,
        resolveReleased,
      };
      activeRequest = request;

      const onControllerAbort = () => {
        void startOwnedCleanup(
          request,
          abortReason(controller.signal, 'DataNet request aborted').message,
        ).catch(() => {});
      };
      controller.signal.addEventListener('abort', onControllerAbort, { once: true });
      request.detachControllerAbort = () => controller.signal.removeEventListener('abort', onControllerAbort);

      requestedHref = new URL(String(input), origin).href;
      try {
        rawFetch = Promise.resolve(fetchImpl(input, {
          ...init,
          signal: controller.signal,
        }));
      } catch (error) {
        rawFetch = Promise.reject(error);
      }

      rawFetch.then(
        (response) => {
          request.fetchSettled = true;
          request.response = response;
          if (controller.signal.aborted) {
            void startResponseCancel(
              request,
              response,
              abortReason(controller.signal, 'DataNet request aborted').message,
            ).catch(() => {});
          }
          maybeRelease(request);
        },
        () => {
          request.fetchSettled = true;
          request.bodyTerminal = true;
          maybeRelease(request);
        },
      );
    } finally {
      releaseStartSlot();
    }

    let response;
    try {
      response = await raceSignal(rawFetch, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted && activeRequest === request) {
        request.bodyTerminal = true;
        maybeRelease(request);
      }
      throw error;
    }

    request.fetchSettled = true;
    request.response = response;
    return prevalidateResponse(request, response, requestedHref);
  };

  const abort = (reason = 'DataNet request superseded') => abortRequest(activeRequest, reason);

  return Object.freeze({
    fetch,
    abort,
    hasActiveRequest: () => activeRequest !== null,
    hasQuarantinedGeneration: () => Boolean(activeRequest?.controller.signal.aborted && !activeRequest.released),
  });
}

export function reconcileDataNetRequestOwnerWithViewV1(
  owner,
  { route = currentRoute(), viewPresent = false } = {},
) {
  if (!owner || typeof owner.abort !== 'function') {
    throw new Error('DataNet request owner is invalid');
  }
  if (route === 'data' && viewPresent === true) return true;
  owner.abort('DataNet view unmounted');
  return false;
}

export function installDataNetRequestOwnerV1({
  fetchImpl = globalThis.fetch,
  origin = globalThis.location?.origin ?? 'http://localhost',
} = {}) {
  const owner = createDataNetRequestOwnerV1({
    fetchImpl: typeof fetchImpl === 'function' ? fetchImpl.bind(globalThis) : fetchImpl,
    origin,
  });

  globalThis.fetch = owner.fetch;

  const reconcileView = () => reconcileDataNetRequestOwnerWithViewV1(owner, {
    route: currentRoute(),
    viewPresent: Boolean(document.querySelector('[data-datanet-view]')),
  });

  window.addEventListener('hashchange', reconcileView);

  const viewRoot = document.getElementById('view-root');
  if (viewRoot) {
    const observer = new MutationObserver(reconcileView);
    observer.observe(viewRoot, { childList: true });
  }

  return owner;
}

if (
  typeof document !== 'undefined'
  && typeof window !== 'undefined'
  && typeof globalThis.fetch === 'function'
) {
  installDataNetRequestOwnerV1();
}
