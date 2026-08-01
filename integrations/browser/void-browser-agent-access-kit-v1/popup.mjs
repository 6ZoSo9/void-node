import {
  BINDING_PATHS,
  discoverReadOnlySurface,
  fetchBoundedJson,
  fetchBoundedJsonDocument,
  normalizeEndpoint,
  permissionOrigin,
  verifySignedOnionBinding,
} from "./core.mjs";

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
      return await fetchBoundedJsonDocument(`${origin}${path}`, {
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
      fetchBoundedJson(api.runtime.getURL("trust-pins.json"), {
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
    const document = await fetchBoundedJsonDocument(
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
