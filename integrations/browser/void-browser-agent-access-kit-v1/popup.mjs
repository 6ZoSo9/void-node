import {
  BINDING_PATHS,
  discoverReadOnlySurface,
  normalizeEndpoint,
  permissionOrigin,
  verifySignedOnionBinding,
} from "./core.mjs";

// VOID_BROWSER_AGENT_RESPONSE_BOUNDS_V1_BEGIN
const RESPONSE_TEARDOWN_TIMEOUT_MS_V1 = 250;
const responseLifetimeQuarantineV1 = new Map();

class BrowserResponseHoldV1 extends Error {
  constructor(message) {
    super(message);
    this.name = "BrowserResponseHoldV1";
  }
}

function responseHoldV1(message) {
  return new BrowserResponseHoldV1(message);
}

function bytesToHexV1(bytes) {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function parseDeclaredLengthV1(headers, maximum) {
  const raw = headers.get("content-length");
  if (raw === null) return null;
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
    throw responseHoldV1("response content-length is invalid");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw responseHoldV1("response content-length is invalid");
  }
  if (value > maximum) throw responseHoldV1("response is too large");
  return value;
}

function abortErrorV1(signal) {
  if (signal.reason instanceof Error) return signal.reason;
  return responseHoldV1("request deadline exceeded");
}

function taggedOutcomeV1(promise) {
  return Promise.resolve(promise).then(
    (value) => Object.freeze({ kind: "fulfilled", value }),
    (error) => Object.freeze({ kind: "rejected", error }),
  );
}

function beginResponseQuarantineV1(url) {
  const existing = responseLifetimeQuarantineV1.get(url);
  if (existing) return existing;
  const token = { pending: 0 };
  responseLifetimeQuarantineV1.set(url, token);
  return token;
}

function addResponseQuarantinePromiseV1(url, token, outcomePromise) {
  token.pending += 1;
  void outcomePromise.then(() => {
    token.pending -= 1;
    if (token.pending === 0 && responseLifetimeQuarantineV1.get(url) === token) {
      responseLifetimeQuarantineV1.delete(url);
    }
  });
}

async function readChunkWithDeadlineV1(reader, signal) {
  if (signal.aborted) {
    return Object.freeze({
      winner: Object.freeze({ kind: "aborted", error: abortErrorV1(signal) }),
      readOutcome: null,
    });
  }
  let onAbort;
  const aborted = new Promise((resolve) => {
    onAbort = () => resolve(Object.freeze({ kind: "aborted", error: abortErrorV1(signal) }));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  const readOutcome = Promise.resolve()
    .then(() => reader.read())
    .then(
      (value) => Object.freeze({ kind: "read", value }),
      (error) => Object.freeze({ kind: "read_error", error }),
    );
  try {
    return Object.freeze({
      winner: await Promise.race([readOutcome, aborted]),
      readOutcome,
    });
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

async function settleRejectedBodyV1(response, reader, controller, requestedUrl, quarantineToken) {
  try {
    controller.abort(responseHoldV1("rejected response body"));
  } catch {}
  let cleanup;
  try {
    if (reader && typeof reader.cancel === "function") {
      cleanup = reader.cancel("rejected response body");
    } else if (response?.body && typeof response.body.cancel === "function") {
      cleanup = response.body.cancel("rejected response body");
    } else {
      cleanup = undefined;
    }
  } catch (error) {
    cleanup = Promise.reject(error);
  }
  const cleanupOutcome = taggedOutcomeV1(cleanup);
  const token = quarantineToken ?? beginResponseQuarantineV1(requestedUrl);
  addResponseQuarantinePromiseV1(requestedUrl, token, cleanupOutcome);
  await Promise.race([
    cleanupOutcome,
    new Promise((resolve) =>
      setTimeout(
        () => resolve(Object.freeze({ kind: "teardown_timeout" })),
        RESPONSE_TEARDOWN_TIMEOUT_MS_V1,
      ),
    ),
  ]);
}

async function fetchBoundedJsonDocumentV1(url, options = {}) {
  const maximum = options.maximum ?? 512 * 1024;
  const timeoutMs = options.timeoutMs ?? 8_000;
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > 2 * 1024 * 1024) {
    throw responseHoldV1("maximum response size is invalid");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) {
    throw responseHoldV1("request timeout is invalid");
  }

  const requestedUrl = new URL(String(url)).href;
  if (responseLifetimeQuarantineV1.has(requestedUrl)) {
    throw responseHoldV1("prior response body generation is still unresolved");
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(responseHoldV1("request deadline exceeded")),
    timeoutMs,
  );
  let response = null;
  let reader = null;
  let bodyComplete = false;
  let quarantineToken = null;

  try {
    response = await fetch(requestedUrl, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (response.redirected === true) {
      throw responseHoldV1("redirected response is forbidden");
    }
    let finalUrl;
    try {
      finalUrl = new URL(String(response.url || "")).href;
    } catch {
      throw responseHoldV1("response final URL is invalid");
    }
    if (finalUrl !== requestedUrl) {
      throw responseHoldV1("response final URL mismatch");
    }
    if (!response.ok) {
      throw responseHoldV1(`request returned HTTP ${response.status}`);
    }
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("application/json")) {
      throw responseHoldV1("response is not application/json");
    }
    parseDeclaredLengthV1(response.headers, maximum);
    if (!response.body || typeof response.body.getReader !== "function") {
      throw responseHoldV1("response body is unavailable");
    }
    try {
      reader = response.body.getReader();
    } catch {
      throw responseHoldV1("response body reader is unavailable");
    }

    const chunks = [];
    let total = 0;
    while (true) {
      const readState = await readChunkWithDeadlineV1(reader, controller.signal);
      if (readState.winner.kind === "aborted") {
        if (readState.readOutcome) {
          quarantineToken = beginResponseQuarantineV1(requestedUrl);
          addResponseQuarantinePromiseV1(
            requestedUrl,
            quarantineToken,
            readState.readOutcome,
          );
        }
        throw readState.winner.error;
      }
      if (readState.winner.kind === "read_error") {
        throw readState.winner.error;
      }
      const part = readState.winner.value;
      if (!part || typeof part.done !== "boolean") {
        throw responseHoldV1("response body read result is invalid");
      }
      if (part.done) break;
      if (!(part.value instanceof Uint8Array)) {
        throw responseHoldV1("response body chunk is invalid");
      }
      total += part.value.byteLength;
      if (!Number.isSafeInteger(total) || total > maximum) {
        throw responseHoldV1("response is too large");
      }
      chunks.push(part.value);
    }
    bodyComplete = true;

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let value;
    try {
      value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      throw responseHoldV1("response is not strict JSON");
    }
    if (!globalThis.crypto?.subtle) {
      throw responseHoldV1("Web Crypto is unavailable");
    }
    return Object.freeze({
      value,
      sha256: bytesToHexV1(await globalThis.crypto.subtle.digest("SHA-256", bytes)),
      byte_length: bytes.length,
    });
  } catch (error) {
    if (response && !bodyComplete) {
      await settleRejectedBodyV1(
        response,
        reader,
        controller,
        requestedUrl,
        quarantineToken,
      );
    }
    if (error instanceof BrowserResponseHoldV1) throw error;
    throw responseHoldV1(`request failed: ${String(error?.message || error)}`);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBoundedJsonV1(url, options = {}) {
  return (await fetchBoundedJsonDocumentV1(url, options)).value;
}
// VOID_BROWSER_AGENT_RESPONSE_BOUNDS_V1_END

const api = globalThis.browser ?? globalThis.chrome;
const form = document.querySelector("#verify-form");
const endpointInput = document.querySelector("#endpoint");
const button = document.querySelector("#verify-button");
const readConsole = document.querySelector("#read-console");
const readForm = document.querySelector("#read-form");
const resourceSelect = document.querySelector("#resource");
const readButton = document.querySelector("#read-button");
const status = document.querySelector("#status");
const result = document.querySelector("#result");

let verifiedSession = null;

async function storedEndpoint() {
  const value = await api.storage.local.get("void_endpoint_v1");
  return typeof value?.void_endpoint_v1 === "string" ? value.void_endpoint_v1 : "";
}

async function fetchBinding(origin) {
  let lastError = null;
  for (const path of BINDING_PATHS) {
    try {
      return await fetchBoundedJsonDocumentV1(`${origin}${path}`, {
        maximum: 512 * 1024,
        timeoutMs: 8_000,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("signed onion binding unavailable");
}

function resetReadConsole() {
  verifiedSession = null;
  resourceSelect.replaceChildren();
  readConsole.hidden = true;
}

function enableReadConsole(origin, resources) {
  if (!Array.isArray(resources) || resources.length === 0) {
    resetReadConsole();
    return;
  }
  verifiedSession = Object.freeze({
    origin,
    resources: Object.freeze([...resources]),
  });
  resourceSelect.replaceChildren();
  resources.forEach((resource, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${resource.capability_id} // ${resource.path}`;
    resourceSelect.append(option);
  });
  readConsole.hidden = false;
}

function show(kind, message, value = null) {
  status.className = kind;
  status.textContent = message;
  if (value === null) {
    result.hidden = true;
    result.textContent = "";
  } else {
    result.hidden = false;
    result.textContent = JSON.stringify(value, null, 2);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetReadConsole();
  button.disabled = true;
  show("", "Requesting access to this origin…");
  try {
    const origin = normalizeEndpoint(endpointInput.value);
    const granted = await api.permissions.request({
      origins: [permissionOrigin(origin)],
    });
    if (!granted) throw new Error("origin permission was not granted");

    show("", "Verifying signed onion binding…");
    const [binding, trustPins] = await Promise.all([
      fetchBinding(origin),
      fetchBoundedJsonV1(api.runtime.getURL("trust-pins.json"), {
        maximum: 16 * 1024,
        timeoutMs: 2_000,
      }),
    ]);
    const identity = await verifySignedOnionBinding(binding.value, origin, {
      trustPins,
      observedBindingSha256: binding.sha256,
    });

    show("", "Validating VOID's same-origin discovery chain…");
    const discovery = await discoverReadOnlySurface(origin, {
      maximum: 1024 * 1024,
      timeoutMs: 8_000,
      fetchJson: fetchBoundedJsonV1,
    });
    await api.storage.local.set({ void_endpoint_v1: origin });
    enableReadConsole(origin, discovery.capabilities.resources);

    show("ok", "VOID identity verified. Read-only resources are available below.", {
      marker: "VOID_BROWSER_AGENT_ACCESS_KIT_V1_RESULT",
      verified: true,
      identity,
      discovery: discovery.contracts,
      network: discovery.network,
      capabilities: discovery.capabilities,
      mutation_authority: false,
      payment_authority: false,
      wallet_or_signer_access: false,
    });
  } catch (error) {
    show("hold", `HOLD: ${String(error?.message || error)}`);
  } finally {
    button.disabled = false;
  }
});

readForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  readButton.disabled = true;
  try {
    if (!verifiedSession) throw new Error("verify a VOID origin first");
    const index = Number(resourceSelect.value);
    if (!Number.isSafeInteger(index)) throw new Error("invalid resource selection");
    const resource = verifiedSession.resources[index];
    if (!resource || resource.method !== "GET") {
      throw new Error("resource is not granted for read-only GET");
    }
    show("", `Fetching verified resource ${resource.path}…`);
    const document = await fetchBoundedJsonDocumentV1(
      `${verifiedSession.origin}${resource.path}`,
      {
        maximum: 1024 * 1024,
        timeoutMs: 8_000,
      },
    );
    show("ok", "Verified read-only resource fetched.", {
      marker: "VOID_BROWSER_AGENT_VERIFIED_READ_V1",
      origin: verifiedSession.origin,
      capability_id: resource.capability_id,
      method: resource.method,
      path: resource.path,
      response_sha256: document.sha256,
      response_bytes: document.byte_length,
      value: document.value,
      credentials_sent: false,
      redirects_followed: false,
      mutation_authority: false,
      payment_authority: false,
    });
  } catch (error) {
    show("hold", `HOLD: ${String(error?.message || error)}`);
  } finally {
    readButton.disabled = false;
  }
});

storedEndpoint().then((value) => {
  if (value) endpointInput.value = value;
}).catch(() => {});
