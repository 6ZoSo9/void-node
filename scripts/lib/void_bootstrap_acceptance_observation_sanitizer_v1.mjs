import crypto from "node:crypto";

export const VOID_BOOTSTRAP_ACCEPTANCE_READY_OBSERVATION_V1 =
  "void_bootstrap_acceptance_ready_observation_v1";
export const VOID_BOOTSTRAP_ACCEPTANCE_PEERS_OBSERVATION_V1 =
  "void_bootstrap_acceptance_peers_observation_v1";

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const PEER_PHASES = new Set([
  "first_node_after_sync",
  "first_node_after_first_contact_removal",
  "second_node_after_sync",
]);

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function nodeId(value, label) {
  const text = String(value || "");
  if (!NODE_ID_RE.test(text)) {
    throw new Error(`${label} must be 32 lowercase hex characters`);
  }
  return text;
}

function safeInteger(value, label) {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a JSON integer`);
  }
  return value;
}

function sortedUniqueNodeIds(values, label) {
  const ids = values.map((value) => nodeId(value, label));
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} contains duplicate node IDs`);
  }
  return Object.freeze([...ids].sort());
}

function canonicalize(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical JSON cannot contain non-finite numbers");
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  throw new Error(`canonical JSON cannot contain ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256CanonicalObservationV1(value) {
  return crypto
    .createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex");
}

export function sanitizeVoidBootstrapReadyObservationV1(raw) {
  const ready = plainObject(raw, "VOID ready observation");

  const head = safeInteger(ready.head, "ready head");
  if (head < 1) {
    throw new Error("ready head must be greater than zero");
  }

  const gap = safeInteger(ready.gap, "ready gap");
  if (gap !== 0) {
    throw new Error("ready gap must equal 0 for bootstrap acceptance");
  }

  const txrootLive = safeInteger(
    ready.txroot_live,
    "ready txroot_live",
  );
  if (txrootLive !== 1) {
    throw new Error(
      "ready txroot_live must equal 1 for bootstrap acceptance",
    );
  }

  if (ready.ready !== true) {
    throw new Error("ready flag must be true for bootstrap acceptance");
  }

  if (ready.__ready_bridge_boot_grace === 1) {
    throw new Error(
      "boot-grace readiness cannot satisfy bootstrap acceptance",
    );
  }

  const bridge = plainObject(
    ready.__ready_bridge,
    "VOID ready bridge metadata",
  );

  const seenOk = safeInteger(
    bridge.txroot3_seen_ok,
    "ready bridge txroot3_seen_ok",
  );
  if (seenOk !== 1) {
    throw new Error(
      "ready bridge must have observed real txroot3 success",
    );
  }

  const txroot3Ok = safeInteger(
    bridge.txroot3_ok,
    "ready bridge txroot3_ok",
  );
  if (txroot3Ok !== 1) {
    throw new Error("ready bridge txroot3_ok must equal 1");
  }

  const ageMs = safeInteger(
    bridge.txroot3_age_ms,
    "ready bridge txroot3_age_ms",
  );
  if (ageMs < 0 || ageMs > 5000) {
    throw new Error(
      "ready bridge txroot3 evidence must be fresh within 5000 ms",
    );
  }

  const txroot3Latest = safeInteger(
    bridge.txroot3_latest,
    "ready bridge txroot3_latest",
  );
  if (txroot3Latest < 1) {
    throw new Error(
      "ready bridge txroot3_latest must be greater than zero",
    );
  }

  return Object.freeze({
    schema: VOID_BOOTSTRAP_ACCEPTANCE_READY_OBSERVATION_V1,
    head,
    gap: 0,
    txroot_live: 1,
    ready: true,
    txroot3_seen_ok: 1,
    txroot3_ok: 1,
    txroot3_age_ms: ageMs,
    txroot3_latest: txroot3Latest,
  });
}

export function sanitizeVoidBootstrapPeersObservationV1(
  raw,
  {
    phase,
    firstContactPeerId,
  },
) {
  const snapshot = plainObject(raw, "VOID P2P peers observation");
  if (snapshot.ok !== true) {
    throw new Error("P2P peers observation ok must equal true");
  }

  const phaseText = String(phase || "");
  if (!PEER_PHASES.has(phaseText)) {
    throw new Error("P2P peers acceptance phase is invalid");
  }

  const firstPeerId = nodeId(
    firstContactPeerId,
    "first-contact peer ID",
  );

  if (
    !Array.isArray(snapshot.connected) ||
    snapshot.connected.length < 1 ||
    snapshot.connected.length > 256
  ) {
    throw new Error(
      "P2P peers connected snapshot must contain 1 through 256 peers",
    );
  }

  if (
    !Array.isArray(snapshot.verifiedPeers) ||
    snapshot.verifiedPeers.length < 1 ||
    snapshot.verifiedPeers.length > 1024
  ) {
    throw new Error(
      "P2P verified-peer snapshot must contain 1 through 1024 peers",
    );
  }

  const connectedIds = sortedUniqueNodeIds(
    snapshot.connected.map((entry) => {
      const peer = plainObject(entry, "connected peer");
      return peer.id;
    }),
    "connected peer ID",
  );

  const verifiedIds = sortedUniqueNodeIds(
    snapshot.verifiedPeers.map((entry) => {
      const peer = plainObject(entry, "verified peer");
      return peer.node_id;
    }),
    "verified peer node ID",
  );

  if (
    phaseText === "first_node_after_sync" ||
    phaseText === "second_node_after_sync"
  ) {
    if (!connectedIds.includes(firstPeerId)) {
      throw new Error(
        "after-sync peers snapshot must include authenticated first-contact peer",
      );
    }
    if (!verifiedIds.some((peerId) => peerId !== firstPeerId)) {
      throw new Error(
        "after-sync peers snapshot must include an additional verified peer",
      );
    }
  }

  if (phaseText === "first_node_after_first_contact_removal") {
    const continued = connectedIds.filter(
      (peerId) => peerId !== firstPeerId,
    );
    if (continued.length < 1) {
      throw new Error(
        "post-removal peers snapshot must retain a peer other than first contact",
      );
    }
    if (
      !continued.some((peerId) => verifiedIds.includes(peerId))
    ) {
      throw new Error(
        "post-removal continued peer must also be a verified peer",
      );
    }
  }

  return Object.freeze({
    schema: VOID_BOOTSTRAP_ACCEPTANCE_PEERS_OBSERVATION_V1,
    phase: phaseText,
    first_contact_peer_id: firstPeerId,
    connected_peer_ids: connectedIds,
    verified_peer_ids: verifiedIds,
  });
}
