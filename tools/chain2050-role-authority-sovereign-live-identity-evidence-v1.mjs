#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_LIVE_IDENTITY_EVIDENCE_V1";

const EXPECTED = Object.freeze({
  evidence_id:
    "voidcraslie1_88246d9a99f8a677e851e126ad860e6f57871f35275e1ca4eb9166c71e6536b2",
  preparation_id:
    "voidcrasgp1_4aac5c1bb4b7500c9dc15df53f36722a44471b9d52b61063528d49602a2348ee",
  script_sha256:
    "54e70eab0ff683a9b1506fe909dde2481dfb4390113dd9233195f5f744123b5b",
  service: "void-node-live.service",
  key_path: "/home/zoso/dev/void-node/.secrets/nodeA.key",
  source_commit: "aa0492e60868dd1fcd8115f154b05ab48de07f85",
  source_tree: "a64791018335fe53f6c534dd08fda684a64605cb",
  source_branch: "main",
  node_id: "9d89483769e469e0473b489dc50dba96",
  der_sha256:
    "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b",
  jwk_x: "ejYyFziUrf8A2eRhz9_LJMM2SsMFvrEqVN1iC7m_G4g",
  subject_sha256:
    "7945ba03feac32e5268382a8b995eb7c927a084d9dd1d44598ffb340a12a770e",
});

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" +
    Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}";
}
function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
function hold(reason) {
  throw new Error(reason);
}

export function verifySovereignLiveIdentityEvidenceV1(value) {
  if (
    !value ||
    value.marker !== MARKER ||
    value.version !== 1 ||
    value.status !== "live_precision_main_node_key_revalidated" ||
    value.live_identity_evidence_id !== EXPECTED.evidence_id ||
    value.genesis_preparation_id !== EXPECTED.preparation_id ||
    value.observer?.script_sha256 !== EXPECTED.script_sha256 ||
    value.observer?.service !== EXPECTED.service ||
    value.observer?.live_node_privkey_path !== EXPECTED.key_path ||
    value.observer?.live_process_source_commit !== EXPECTED.source_commit ||
    value.observer?.live_process_source_tree !== EXPECTED.source_tree ||
    value.observer?.live_process_source_branch !== EXPECTED.source_branch ||
    value.identity?.node_id !== EXPECTED.node_id ||
    value.identity?.public_key_der_sha256 !== EXPECTED.der_sha256 ||
    value.identity?.public_key_jwk_x !== EXPECTED.jwk_x ||
    value.identity?.subject_binding_sha256 !== EXPECTED.subject_sha256 ||
    value.verification?.published_binding_exact !== true ||
    value.verification?.live_service_key_matches_published_binding !== true ||
    value.verification?.live_precision_main_node_key_revalidated !== true ||
    value.verification?.private_key_contents_printed !== false ||
    value.verification?.signature_created !== false ||
    value.authority?.evidence_only !== true ||
    value.authority?.transaction_signing_authorized !== false ||
    value.authority?.transaction_broadcast_authorized !== false ||
    value.authority?.chain2050_write_authorized !== false ||
    value.authority?.registry_append_authorized !== false ||
    value.authority?.wallet_or_signer_access_authorized !== false ||
    value.authority?.funds_action_authorized !== false ||
    value.next_gate !== "sovereign_genesis_append_read_only_preflight"
  ) {
    hold("sovereign_live_identity_evidence_binding_invalid");
  }

  const material = {
    genesis_preparation_id: value.genesis_preparation_id,
    observer_script_sha256: value.observer.script_sha256,
    service: value.observer.service,
    live_node_privkey_path: value.observer.live_node_privkey_path,
    live_process_source_commit: value.observer.live_process_source_commit,
    live_process_source_tree: value.observer.live_process_source_tree,
    live_process_source_branch: value.observer.live_process_source_branch,
    node_id: value.identity.node_id,
    public_key_der_sha256: value.identity.public_key_der_sha256,
    public_key_jwk_x: value.identity.public_key_jwk_x,
    subject_binding_sha256: value.identity.subject_binding_sha256,
    published_binding_exact: value.verification.published_binding_exact,
    live_service_key_matches_published_binding:
      value.verification.live_service_key_matches_published_binding,
    live_precision_main_node_key_revalidated:
      value.verification.live_precision_main_node_key_revalidated,
  };
  const id = "voidcraslie1_" + sha256(canonical(material));
  if (id !== EXPECTED.evidence_id) {
    hold("sovereign_live_identity_evidence_id_mismatch");
  }

  return Object.freeze({
    ok: true,
    live_identity_evidence_id: id,
    genesis_preparation_id: value.genesis_preparation_id,
    node_id: value.identity.node_id,
    public_key_der_sha256: value.identity.public_key_der_sha256,
    subject_binding_sha256: value.identity.subject_binding_sha256,
    next_gate: value.next_gate,
  });
}
