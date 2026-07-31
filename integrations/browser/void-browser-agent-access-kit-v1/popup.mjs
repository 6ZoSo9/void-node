import {
  BINDING_PATHS,
  fetchBoundedJson,
  fetchBoundedJsonDocument,
  intersectReadOnlyCapabilities,
  normalizeEndpoint,
  permissionOrigin,
  verifySignedOnionBinding,
} from "./core.mjs";

const api = globalThis.browser ?? globalThis.chrome;
const form = document.querySelector("#verify-form");
const endpointInput = document.querySelector("#endpoint");
const button = document.querySelector("#verify-button");
const status = document.querySelector("#status");
const result = document.querySelector("#result");

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

    show("", "Intersecting public read-only capabilities…");
    const catalog = await fetchBoundedJson(
      `${origin}/public-node/agents/capabilities-v1.json`,
      { maximum: 1024 * 1024, timeoutMs: 8_000 },
    );
    const capabilities = intersectReadOnlyCapabilities(catalog);
    await api.storage.local.set({ void_endpoint_v1: origin });

    show("ok", "VOID signed identity verified. Read-only capabilities accepted.", {
      marker: "VOID_BROWSER_AGENT_ACCESS_KIT_V1_RESULT",
      verified: true,
      identity,
      capabilities,
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

storedEndpoint().then((value) => {
  if (value) endpointInput.value = value;
}).catch(() => {});
