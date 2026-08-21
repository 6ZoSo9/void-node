(() => {
  "use strict";

  const MARKER = "VOID_PUBLIC_NODE_HOME_V1";
  const NETWORK_MARKER = "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1";
  const NETWORK_ENDPOINT = "/__void/public-app/network.json";
  const MAX_RESPONSE_BYTES = 64 * 1024;
  const REQUEST_TIMEOUT_MS = 5000;
  const CLEANUP_TIMEOUT_MS = 100;

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = String(value);
  };

  const setStatus = (label, tone) => {
    const node = document.querySelector("[data-node-status]");
    if (!node) return;
    node.textContent = label;
    node.dataset.tone = tone;
  };

  const canonicalLength = (raw) => {
    if (raw === null) return null;
    if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
      throw new Error("response_content_length_invalid");
    }
    const value = Number(raw);
    if (!Number.isSafeInteger(value)) {
      throw new Error("response_content_length_invalid");
    }
    return value;
  };

  const boundedCancel = async (reader) => {
    try {
      await Promise.race([
        Promise.resolve(reader.cancel()),
        new Promise((resolve) => setTimeout(resolve, CLEANUP_TIMEOUT_MS)),
      ]);
    } catch {
      // Cleanup is best effort and must not replace the primary read failure.
    }
  };

  const readJsonBounded = async (response) => {
    const declared = canonicalLength(response.headers.get("content-length"));
    if (declared !== null && declared > MAX_RESPONSE_BYTES) {
      throw new Error("response_body_too_large");
    }
    if (!response.body || typeof response.body.getReader !== "function") {
      throw new Error("response_stream_required");
    }

    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!(value instanceof Uint8Array)) {
          throw new Error("response_chunk_invalid");
        }
        total += value.byteLength;
        if (total > MAX_RESPONSE_BYTES) {
          throw new Error("response_body_too_large");
        }
        chunks.push(value);
      }
    } catch (error) {
      await boundedCancel(reader);
      throw error;
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text);
  };

  const exactNetworkUrl = () => new URL(NETWORK_ENDPOINT, window.location.origin).href;

  const validateSnapshot = (snapshot) => {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new Error("network_snapshot_invalid");
    }
    if (snapshot.marker !== NETWORK_MARKER) {
      throw new Error("network_marker_invalid");
    }

    const ready = snapshot.ready === true;
    const status = typeof snapshot.status === "string" ? snapshot.status : "";
    const chainHead = snapshot.chain_head;
    const peerCount = snapshot.peer_count;

    if (chainHead !== null && (!Number.isSafeInteger(chainHead) || chainHead < 0)) {
      throw new Error("chain_head_invalid");
    }
    if (!Number.isSafeInteger(peerCount) || peerCount < 0) {
      throw new Error("peer_count_invalid");
    }

    const nodeLabel =
      snapshot.node &&
      typeof snapshot.node === "object" &&
      typeof snapshot.node.label === "string" &&
      snapshot.node.label.length >= 1 &&
      snapshot.node.label.length <= 128
        ? snapshot.node.label
        : "VOID public node";

    const networkName =
      typeof snapshot.network_name === "string" &&
      snapshot.network_name.length >= 1 &&
      snapshot.network_name.length <= 64
        ? snapshot.network_name
        : "Mainnet-0";

    return { ready, status, chainHead, peerCount, nodeLabel, networkName };
  };

  const applySnapshot = (snapshot) => {
    const state = validateSnapshot(snapshot);

    if (state.ready) {
      setStatus("Ready", "positive");
    } else if (state.status === "restricted_ready") {
      setStatus("Synchronized", "warning");
    } else if (state.status === "unavailable") {
      setStatus("Unavailable", "danger");
    } else {
      setStatus("Degraded", "warning");
    }

    setText(
      "[data-node-block]",
      state.chainHead === null ? "—" : state.chainHead.toLocaleString("en-US"),
    );
    setText("[data-node-peers]", state.peerCount);
    setText("[data-node-label]", state.nodeLabel);
    setText("[data-node-network]", state.networkName);
    document.documentElement.dataset.voidPublicNodeHome = "ready";
  };

  const run = async () => {
    try {
      const response = await fetch(NETWORK_ENDPOINT, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`network_http_${response.status}`);
      }
      if (response.url !== exactNetworkUrl()) {
        throw new Error("network_final_url_mismatch");
      }

      applySnapshot(await readJsonBounded(response));
    } catch (error) {
      setStatus("Unavailable", "danger");
      setText("[data-node-block]", "—");
      setText("[data-node-peers]", "—");
      document.documentElement.dataset.voidPublicNodeHome = "unavailable";
      console.warn(`[${MARKER}]`, error instanceof Error ? error.message : String(error));
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
