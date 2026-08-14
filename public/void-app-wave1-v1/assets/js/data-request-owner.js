const DATANET_ENDPOINT = '/public-node/datanet/field-replication-status-card-v1.json';

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

const forwardAbort = (sourceSignal, controller) => {
  if (!sourceSignal) return () => {};

  const abortFromSource = () => {
    if (!controller.signal.aborted) {
      controller.abort(sourceSignal.reason ?? new Error('DataNet request aborted'));
    }
  };

  if (sourceSignal.aborted) {
    abortFromSource();
    return () => {};
  }

  sourceSignal.addEventListener('abort', abortFromSource, { once: true });
  return () => sourceSignal.removeEventListener('abort', abortFromSource);
};

export function createDataNetRequestOwnerV1({
  fetchImpl,
  origin = globalThis.location?.origin ?? 'http://localhost',
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('DataNet request owner requires fetch');
  }

  let activeController = null;

  const abort = (reason = 'DataNet request superseded') => {
    const controller = activeController;
    activeController = null;
    if (controller && !controller.signal.aborted) {
      controller.abort(new Error(reason));
      return true;
    }
    return false;
  };

  const fetch = async (input, init = {}) => {
    if (!exactDataNetRequest(input, origin)) {
      return fetchImpl(input, init);
    }

    abort('DataNet request superseded');
    const controller = new AbortController();
    activeController = controller;
    const detachSourceAbort = forwardAbort(init?.signal, controller);

    try {
      return await fetchImpl(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      detachSourceAbort();
      if (activeController === controller) activeController = null;
    }
  };

  return Object.freeze({
    fetch,
    abort,
    hasActiveRequest: () => activeController !== null && !activeController.signal.aborted,
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
