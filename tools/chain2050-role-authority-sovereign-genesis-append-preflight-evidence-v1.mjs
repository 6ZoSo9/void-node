#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_PREFLIGHT_EVIDENCE_V1";

const EXPECTED = Object.freeze({
  evidence_id: "voidcrasgap1_a0af95011a1fb726b057fe1ff4ecf0b31b7529a95881821383adafed878f8812",
  preparation_id: "voidcrasgp1_4aac5c1bb4b7500c9dc15df53f36722a44471b9d52b61063528d49602a2348ee",
  live_identity_evidence_id: "voidcraslie1_88246d9a99f8a677e851e126ad860e6f57871f35275e1ca4eb9166c71e6536b2",
  script_sha256: "0a991b4060fe377fe15f562eedf77e50618a8ed2d76b43285e17e174b7babe0f",
  block: "37390",
  contract: "0xe4e9a5a8e5ac3a99176fcf50ba986a374577de49",
  runtime_sha256: "b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d",
  owner: "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
  empty_root: "d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7",
  subject: "7945ba03feac32e5268382a8b995eb7c927a084d9dd1d44598ffb340a12a770e",
  policy: "9a8ee80c68cb026b88117710c7d78e8b3063a1c5c2fe1cf6cb555ca80d8f1e75",
  record: "1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b",
  next_root: "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041",
  calldata_sha256: "83b9a1fb9a74b7755ed37ee3b945a50fb9d5841d36aa7b26707b5a06eb36f938",
  gas: "371459"
});

function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map(k => JSON.stringify(k)+":"+canonical(v[k])).join(",") + "}";
}
function sha256(v) {
  return crypto.createHash("sha256").update(v, "utf8").digest("hex");
}
function fail(reason) { throw new Error(reason); }

export function verifySovereignGenesisAppendPreflightEvidenceV1(v) {
  if (
    !v ||
    v.marker !== MARKER ||
    v.version !== 1 ||
    v.status !== "green_exact_sovereign_genesis_append_read_only_preflight" ||
    v.preflight_evidence_id !== EXPECTED.evidence_id ||
    v.genesis_preparation_id !== EXPECTED.preparation_id ||
    v.live_identity_evidence_id !== EXPECTED.live_identity_evidence_id ||
    v.observer?.script_sha256 !== EXPECTED.script_sha256 ||
    v.observer?.observation_block_before !== EXPECTED.block ||
    v.observer?.observation_block_after !== EXPECTED.block ||
    v.observer?.chain_id !== "2050" ||
    v.registry?.contract_address !== EXPECTED.contract ||
    v.registry?.runtime_sha256 !== EXPECTED.runtime_sha256 ||
    v.registry?.owner !== EXPECTED.owner ||
    v.registry?.pending_owner !== "0x0000000000000000000000000000000000000000" ||
    v.registry?.entry_count_before !== "0" ||
    v.registry?.entry_count_after !== "0" ||
    v.registry?.registry_root_before !== EXPECTED.empty_root ||
    v.registry?.registry_root_after !== EXPECTED.empty_root ||
    v.candidate?.identity_id !== "sovereign.zoso" ||
    v.candidate?.role !== "SOVEREIGN" ||
    v.candidate?.subject_binding_sha256 !== EXPECTED.subject ||
    v.candidate?.authority_policy_sha256 !== EXPECTED.policy ||
    v.candidate?.role_record_sha256 !== EXPECTED.record ||
    v.candidate?.predicted_registry_root_sha256 !== EXPECTED.next_root ||
    v.call?.function_selector !== "0x3fd97432" ||
    v.call?.calldata_bytes !== "452" ||
    v.call?.calldata_sha256 !== EXPECTED.calldata_sha256 ||
    v.call?.simulation_appended !== true ||
    v.call?.simulation_entry_index !== "0" ||
    v.call?.simulation_role_record_sha256 !== EXPECTED.record ||
    v.call?.simulation_registry_root_sha256 !== EXPECTED.next_root ||
    v.call?.simulation_gas_estimate !== EXPECTED.gas ||
    v.call?.state_unchanged_after_simulation !== true ||
    v.authority?.evidence_only !== true ||
    v.authority?.unsigned_transaction_preparation_authorized !== false ||
    v.authority?.private_key_access !== false ||
    v.authority?.wallet_or_signer_access !== false ||
    v.authority?.transaction_signing !== false ||
    v.authority?.transaction_broadcast !== false ||
    v.authority?.chain2050_write !== false ||
    v.authority?.registry_append !== false ||
    v.authority?.funds_action !== false ||
    v.next_gate !== "separate_unsigned_owner_transaction_preparation"
  ) fail("sovereign_genesis_append_preflight_evidence_binding_invalid");

  const material = {
    genesis_preparation_id: v.genesis_preparation_id,
    live_identity_evidence_id: v.live_identity_evidence_id,
    observer_script_sha256: v.observer.script_sha256,
    observation_block: v.observer.observation_block_before,
    contract: v.registry.contract_address,
    runtime_sha256: v.registry.runtime_sha256,
    owner: v.registry.owner,
    entry_count: v.registry.entry_count_before,
    registry_root: v.registry.registry_root_before,
    role_record_sha256: v.candidate.role_record_sha256,
    predicted_registry_root_sha256: v.candidate.predicted_registry_root_sha256,
    append_function_selector: v.call.function_selector,
    append_calldata_sha256: v.call.calldata_sha256,
    simulation_gas_estimate: v.call.simulation_gas_estimate,
    state_unchanged_after_simulation: v.call.state_unchanged_after_simulation
  };
  const id = "voidcrasgap1_" + sha256(canonical(material));
  if (id !== EXPECTED.evidence_id) fail("sovereign_genesis_append_preflight_evidence_id_mismatch");

  return Object.freeze({
    ok: true,
    preflight_evidence_id: id,
    role_record_sha256: EXPECTED.record,
    predicted_registry_root_sha256: EXPECTED.next_root,
    append_calldata_sha256: EXPECTED.calldata_sha256,
    simulation_gas_estimate: EXPECTED.gas
  });
}
