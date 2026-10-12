import crypto from "node:crypto";

export const VOID_BOOTSTRAP_EXTERNAL_ACCEPTANCE_RECEIPT_V1 =
  "void_bootstrap_external_acceptance_receipt_v1";
export const VOID_BOOTSTRAP_EXTERNAL_ACCEPTANCE_RECEIPT_PREFIX_V1 =
  "voidbar1_";
export const VOID_NETWORK = "VOID Network";
export const VOID_CHAIN_ID = 2050;

const RECEIPT_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "repository",
  "evidence_mode",
  "observed_at",
  "eligible_paths_before_first_sync",
  "first_node",
  "second_node",
  "requirements",
  "authority",
  "evidence",
  "receipt_id",
]);

const REPOSITORY_KEYS = Object.freeze([
  "owner_repo",
  "commit",
]);

const PATH_KEYS = Object.freeze([
  "path_id",
  "record_transport",
  "record_failure_domain",
  "introduction_transport",
  "introduction_failure_domain",
  "target_peer_id",
  "eligible",
]);

const FIRST_NODE_KEYS = Object.freeze([
  "machine_label",
  "outside_operator_tailnet",
  "selected_path_id",
  "authenticated_first_peer_id",
  "head",
  "gap",
  "txroot_live",
  "learned_verified_peer_ids",
  "first_contact_removal",
]);

const REMOVAL_KEYS = Object.freeze([
  "component_role",
  "component_class",
  "failure_domain",
  "continued_connectivity",
  "connected_verified_peer_ids",
]);

const SECOND_NODE_KEYS = Object.freeze([
  "machine_label",
  "outside_operator_tailnet",
  "unavailable_component_role",
  "unavailable_component_class",
  "unavailable_failure_domain",
  "selected_path_id",
  "authenticated_first_peer_id",
  "head",
  "gap",
  "txroot_live",
  "learned_verified_peer_ids",
]);

const REQUIREMENT_KEYS = Object.freeze([
  "tailscale_required",
  "private_tailnet_dependency",
  "manual_operator_address_copy_required",
  "operator_contact_required",
  "commercial_cloud_provider_required",
  "dns_provider_required",
  "tunnel_provider_required",
  "certificate_authority_is_network_identity",
]);

const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

const EVIDENCE_KEYS = Object.freeze([
  "first_paths_before_sync_sha256",
  "first_ready_after_sync_sha256",
  "first_peers_after_sync_sha256",
  "first_ready_after_removal_sha256",
  "first_peers_after_removal_sha256",
  "second_ready_sha256",
  "second_peers_sha256",
]);

const RECORD_TRANSPORTS = new Set([
  "https_record_mirror",
  "tor_record_mirror",
]);

const INTRODUCTION_TRANSPORTS = new Set([
  "direct_ipv6_seed",
  "direct_ipv4_seed",
  "relay",
  "tor_sync_seed",
]);

const EVIDENCE_MODES = new Set([
  "synthetic_test_fixture",
  "external_machine_observation",
]);

const LABEL_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const NODE_ID_RE = /^[0-9a-f]{32}$/;
const COMMIT_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const RECEIPT_ID_RE = /^voidbar1_[0-9a-f]{64}$/;

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
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

function contentId(prefix, value, idField) {
  const body = structuredClone(value);
  delete body[idField];
  return `${prefix}${crypto
    .createHash("sha256")
    .update(canonicalJson(body))
    .digest("hex")}`;
}

function canonicalIso(value, label) {
  const text = String(value || "");
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== text) {
    throw new Error(`${label} must be canonical ISO-8601 UTC`);
  }
  return text;
}

function label(value, what) {
  const text = String(value || "");
  if (!LABEL_RE.test(text)) {
    throw new Error(`${what} is invalid`);
  }
  return text;
}

function nodeId(value, what) {
  const text = String(value || "");
  if (!NODE_ID_RE.test(text)) {
    throw new Error(`${what} must be 32 lowercase hex characters`);
  }
  return text;
}

function positiveHead(value, what) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${what} must be a positive safe integer`);
  }
  return value;
}

function exactZero(value, what) {
  if (value !== 0) throw new Error(`${what} must equal 0`);
  return 0;
}

function exactOne(value, what) {
  if (value !== 1) throw new Error(`${what} must equal 1`);
  return 1;
}

function sortedUniqueNodeIds(raw, what, { min = 1, max = 64 } = {}) {
  if (!Array.isArray(raw) || raw.length < min || raw.length > max) {
    throw new Error(`${what} count must be from ${min} through ${max}`);
  }
  const ids = raw.map((value) => nodeId(value, what));
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${what} contains duplicate peer IDs`);
  }
  const sorted = [...ids].sort();
  if (JSON.stringify(ids) !== JSON.stringify(sorted)) {
    throw new Error(`${what} must be sorted`);
  }
  return Object.freeze(ids);
}

function validatePath(raw) {
  const path = exactKeys(
    structuredClone(raw),
    PATH_KEYS,
    "eligible bootstrap path",
  );

  const pathId = label(path.path_id, "bootstrap path ID");
  if (!RECORD_TRANSPORTS.has(path.record_transport)) {
    throw new Error("bootstrap path record transport is invalid");
  }
  if (!INTRODUCTION_TRANSPORTS.has(path.introduction_transport)) {
    throw new Error("bootstrap path introduction transport is invalid");
  }
  const recordFailureDomain = label(
    path.record_failure_domain,
    "record failure domain",
  );
  const introductionFailureDomain = label(
    path.introduction_failure_domain,
    "introduction failure domain",
  );
  if (recordFailureDomain === introductionFailureDomain) {
    throw new Error(
      "record and introduction failure domains must differ within one path",
    );
  }
  const targetPeerId = nodeId(
    path.target_peer_id,
    "bootstrap path target peer ID",
  );
  if (path.eligible !== true) {
    throw new Error("bootstrap path must be eligible before first sync");
  }

  return Object.freeze({
    path_id: pathId,
    record_transport: path.record_transport,
    record_failure_domain: recordFailureDomain,
    introduction_transport: path.introduction_transport,
    introduction_failure_domain: introductionFailureDomain,
    target_peer_id: targetPeerId,
    eligible: true,
  });
}

function pathUsesComponent(path, role, componentClass, failureDomain) {
  if (role === "record_distribution") {
    return (
      path.record_transport === componentClass &&
      path.record_failure_domain === failureDomain
    );
  }
  if (role === "introduction") {
    return (
      path.introduction_transport === componentClass &&
      path.introduction_failure_domain === failureDomain
    );
  }
  throw new Error("bootstrap component role is invalid");
}

function validateComponentTuple(role, componentClass, failureDomain) {
  if (role === "record_distribution") {
    if (!RECORD_TRANSPORTS.has(componentClass)) {
      throw new Error("record-distribution component class is invalid");
    }
  } else if (role === "introduction") {
    if (!INTRODUCTION_TRANSPORTS.has(componentClass)) {
      throw new Error("introduction component class is invalid");
    }
  } else {
    throw new Error("bootstrap component role is invalid");
  }
  label(failureDomain, "bootstrap component failure domain");
}

function validateRepository(raw) {
  const repository = exactKeys(
    structuredClone(raw),
    REPOSITORY_KEYS,
    "acceptance repository",
  );
  if (repository.owner_repo !== "6ZoSo9/void-node") {
    throw new Error("acceptance repository must be 6ZoSo9/void-node");
  }
  if (!COMMIT_RE.test(String(repository.commit || ""))) {
    throw new Error("acceptance repository commit must be exact 40-hex SHA");
  }
  return Object.freeze({ ...repository });
}

function validateRequirements(raw) {
  const requirements = exactKeys(
    structuredClone(raw),
    REQUIREMENT_KEYS,
    "acceptance dependency requirements",
  );
  for (const key of REQUIREMENT_KEYS) {
    if (requirements[key] !== false) {
      throw new Error(`forbidden onboarding dependency enabled: ${key}`);
    }
  }
  return Object.freeze({ ...requirements });
}

function validateAuthority(raw) {
  const authority = exactKeys(
    structuredClone(raw),
    AUTHORITY_KEYS,
    "acceptance authority boundary",
  );
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) {
      throw new Error(`acceptance authority ${key} must be false`);
    }
  }
  return Object.freeze({ ...authority });
}

function validateEvidence(raw) {
  const evidence = exactKeys(
    structuredClone(raw),
    EVIDENCE_KEYS,
    "acceptance evidence hashes",
  );
  for (const key of EVIDENCE_KEYS) {
    if (!SHA256_RE.test(String(evidence[key] || ""))) {
      throw new Error(`acceptance evidence ${key} must be SHA-256`);
    }
  }
  return Object.freeze({ ...evidence });
}

function validateFirstNode(raw, pathsById) {
  const node = exactKeys(
    structuredClone(raw),
    FIRST_NODE_KEYS,
    "first acceptance node",
  );
  const machineLabel = label(node.machine_label, "first machine label");
  if (node.outside_operator_tailnet !== true) {
    throw new Error("first acceptance node must be outside operator Tailnet");
  }
  const selectedPathId = label(
    node.selected_path_id,
    "first selected path ID",
  );
  const selectedPath = pathsById.get(selectedPathId);
  if (!selectedPath) {
    throw new Error("first selected path is not in eligible pre-sync paths");
  }
  const firstPeerId = nodeId(
    node.authenticated_first_peer_id,
    "first authenticated peer ID",
  );
  if (firstPeerId !== selectedPath.target_peer_id) {
    throw new Error(
      "first authenticated peer ID must match selected path target peer ID",
    );
  }

  positiveHead(node.head, "first node head");
  exactZero(node.gap, "first node gap");
  exactOne(node.txroot_live, "first node txroot_live");

  const learned = sortedUniqueNodeIds(
    node.learned_verified_peer_ids,
    "first node learned verified peer IDs",
  );
  if (!learned.some((peerId) => peerId !== firstPeerId)) {
    throw new Error(
      "first node must learn at least one additional verified peer after first contact",
    );
  }

  const removal = exactKeys(
    structuredClone(node.first_contact_removal),
    REMOVAL_KEYS,
    "first-contact removal",
  );
  validateComponentTuple(
    removal.component_role,
    removal.component_class,
    removal.failure_domain,
  );
  if (
    !pathUsesComponent(
      selectedPath,
      removal.component_role,
      removal.component_class,
      removal.failure_domain,
    )
  ) {
    throw new Error(
      "first-contact removal must remove a component of the selected first-contact path",
    );
  }
  if (removal.continued_connectivity !== true) {
    throw new Error(
      "first node must retain connectivity after first-contact removal",
    );
  }
  const connected = sortedUniqueNodeIds(
    removal.connected_verified_peer_ids,
    "verified peers connected after first-contact removal",
  );
  if (!connected.some((peerId) => peerId !== firstPeerId)) {
    throw new Error(
      "continued connectivity must include a verified peer other than the original first-contact peer",
    );
  }

  return Object.freeze({
    machine_label: machineLabel,
    outside_operator_tailnet: true,
    selected_path_id: selectedPathId,
    authenticated_first_peer_id: firstPeerId,
    head: node.head,
    gap: 0,
    txroot_live: 1,
    learned_verified_peer_ids: learned,
    first_contact_removal: Object.freeze({
      component_role: removal.component_role,
      component_class: removal.component_class,
      failure_domain: removal.failure_domain,
      continued_connectivity: true,
      connected_verified_peer_ids: connected,
    }),
  });
}

function validateSecondNode(raw, paths, pathsById, firstNode) {
  const node = exactKeys(
    structuredClone(raw),
    SECOND_NODE_KEYS,
    "second acceptance node",
  );

  const machineLabel = label(node.machine_label, "second machine label");
  if (machineLabel === firstNode.machine_label) {
    throw new Error("second acceptance node must be a different fresh machine");
  }
  if (node.outside_operator_tailnet !== true) {
    throw new Error("second acceptance node must be outside operator Tailnet");
  }

  validateComponentTuple(
    node.unavailable_component_role,
    node.unavailable_component_class,
    node.unavailable_failure_domain,
  );

  const firstRemoval = firstNode.first_contact_removal;
  if (
    node.unavailable_component_role === firstRemoval.component_role &&
    node.unavailable_component_class === firstRemoval.component_class &&
    node.unavailable_failure_domain === firstRemoval.failure_domain
  ) {
    throw new Error(
      "second-node unavailable component must differ from first-contact removal",
    );
  }

  const unavailableExists = paths.some((path) =>
    pathUsesComponent(
      path,
      node.unavailable_component_role,
      node.unavailable_component_class,
      node.unavailable_failure_domain,
    ),
  );
  if (!unavailableExists) {
    throw new Error(
      "second-node intentionally unavailable component must exist in the eligible topology",
    );
  }

  const selectedPathId = label(
    node.selected_path_id,
    "second selected path ID",
  );
  const selectedPath = pathsById.get(selectedPathId);
  if (!selectedPath) {
    throw new Error("second selected path is not in eligible pre-sync paths");
  }
  if (
    pathUsesComponent(
      selectedPath,
      node.unavailable_component_role,
      node.unavailable_component_class,
      node.unavailable_failure_domain,
    )
  ) {
    throw new Error(
      "second node selected a path that depends on the intentionally unavailable component",
    );
  }

  const firstSelectedPath = pathsById.get(firstNode.selected_path_id);
  if (
    selectedPath.introduction_failure_domain ===
    firstSelectedPath.introduction_failure_domain
  ) {
    throw new Error(
      "two-node acceptance must exercise at least two independent introduction failure domains",
    );
  }

  const firstPeerId = nodeId(
    node.authenticated_first_peer_id,
    "second authenticated first peer ID",
  );
  if (firstPeerId !== selectedPath.target_peer_id) {
    throw new Error(
      "second authenticated first peer ID must match second selected path target peer ID",
    );
  }

  positiveHead(node.head, "second node head");
  exactZero(node.gap, "second node gap");
  exactOne(node.txroot_live, "second node txroot_live");

  const learned = sortedUniqueNodeIds(
    node.learned_verified_peer_ids,
    "second node learned verified peer IDs",
  );
  if (!learned.some((peerId) => peerId !== firstPeerId)) {
    throw new Error(
      "second node must learn at least one additional verified peer",
    );
  }

  return Object.freeze({
    machine_label: machineLabel,
    outside_operator_tailnet: true,
    unavailable_component_role: node.unavailable_component_role,
    unavailable_component_class: node.unavailable_component_class,
    unavailable_failure_domain: node.unavailable_failure_domain,
    selected_path_id: selectedPathId,
    authenticated_first_peer_id: firstPeerId,
    head: node.head,
    gap: 0,
    txroot_live: 1,
    learned_verified_peer_ids: learned,
  });
}

function normalizeForBuild(raw) {
  const value = structuredClone(raw);
  value.eligible_paths_before_first_sync = [
    ...value.eligible_paths_before_first_sync,
  ].sort((a, b) => String(a.path_id).localeCompare(String(b.path_id)));

  value.first_node.learned_verified_peer_ids = [
    ...value.first_node.learned_verified_peer_ids,
  ].sort();
  value.first_node.first_contact_removal.connected_verified_peer_ids = [
    ...value.first_node.first_contact_removal.connected_verified_peer_ids,
  ].sort();
  value.second_node.learned_verified_peer_ids = [
    ...value.second_node.learned_verified_peer_ids,
  ].sort();
  return value;
}

export function buildVoidBootstrapExternalAcceptanceReceiptV1(
  rawBody,
  { verifyExternalEvidence = null } = {},
) {
  const body = normalizeForBuild(rawBody);
  const receipt = Object.freeze({
    ...body,
    receipt_id: contentId(
      VOID_BOOTSTRAP_EXTERNAL_ACCEPTANCE_RECEIPT_PREFIX_V1,
      body,
      "receipt_id",
    ),
  });
  validateVoidBootstrapExternalAcceptanceReceiptV1(receipt, {
    verifyExternalEvidence,
  });
  return receipt;
}

export function validateVoidBootstrapExternalAcceptanceReceiptV1(
  rawReceipt,
  { verifyExternalEvidence = null } = {},
) {
  const receipt = exactKeys(
    structuredClone(rawReceipt),
    RECEIPT_KEYS,
    "external bootstrap acceptance receipt",
  );

  if (
    receipt.schema !== VOID_BOOTSTRAP_EXTERNAL_ACCEPTANCE_RECEIPT_V1 ||
    receipt.network !== VOID_NETWORK ||
    receipt.chain_id !== VOID_CHAIN_ID
  ) {
    throw new Error("external bootstrap acceptance network contract mismatch");
  }

  validateRepository(receipt.repository);
  if (!EVIDENCE_MODES.has(receipt.evidence_mode)) {
    throw new Error("acceptance evidence mode is invalid");
  }
  canonicalIso(receipt.observed_at, "acceptance observed_at");

  if (
    !Array.isArray(receipt.eligible_paths_before_first_sync) ||
    receipt.eligible_paths_before_first_sync.length < 2 ||
    receipt.eligible_paths_before_first_sync.length > 16
  ) {
    throw new Error(
      "acceptance requires 2 through 16 eligible paths before first sync",
    );
  }

  const paths = receipt.eligible_paths_before_first_sync.map(validatePath);
  const pathIds = new Set();
  for (const path of paths) {
    if (pathIds.has(path.path_id)) {
      throw new Error("eligible pre-sync paths contain duplicate path IDs");
    }
    pathIds.add(path.path_id);
  }

  const sortedPaths = [...paths].sort((a, b) =>
    a.path_id.localeCompare(b.path_id),
  );
  if (canonicalJson(paths) !== canonicalJson(sortedPaths)) {
    throw new Error("eligible pre-sync paths must be sorted by path ID");
  }

  const introductionDomains = new Set(
    paths.map((path) => path.introduction_failure_domain),
  );
  if (introductionDomains.size < 2) {
    throw new Error(
      "eligible pre-sync paths require at least two introduction failure domains",
    );
  }

  const pathsById = new Map(paths.map((path) => [path.path_id, path]));
  const firstNode = validateFirstNode(receipt.first_node, pathsById);
  const secondNode = validateSecondNode(
    receipt.second_node,
    paths,
    pathsById,
    firstNode,
  );

  validateRequirements(receipt.requirements);
  validateAuthority(receipt.authority);
  validateEvidence(receipt.evidence);

  if (!RECEIPT_ID_RE.test(String(receipt.receipt_id || ""))) {
    throw new Error("acceptance receipt ID is malformed");
  }
  const expectedId = contentId(
    VOID_BOOTSTRAP_EXTERNAL_ACCEPTANCE_RECEIPT_PREFIX_V1,
    receipt,
    "receipt_id",
  );
  if (receipt.receipt_id !== expectedId) {
    throw new Error("acceptance receipt ID does not match content");
  }

  // The evidence_mode label is not evidence. External-machine acceptance must
  // fail closed unless a caller injects a separately reviewed verifier for the
  // bound source observations. Synthetic fixtures remain self-contained.
  if (receipt.evidence_mode === "external_machine_observation") {
    if (typeof verifyExternalEvidence !== "function") {
      throw new Error(
        "external machine observation requires an injected evidence verifier",
      );
    }
    let verified = false;
    try {
      verified =
        verifyExternalEvidence(Object.freeze(structuredClone(receipt))) === true;
    } catch {
      verified = false;
    }
    if (!verified) {
      throw new Error(
        "external machine observation evidence verifier did not verify receipt",
      );
    }
  }

  return Object.freeze(structuredClone(receipt));
}
