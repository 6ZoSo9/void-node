#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const DOC = 'docs/governance/void-brood-queen-local-model-seat-v1.md';
const FIXTURE = 'fixtures/governance/void-brood-queen-local-model-seat-v1.json';
const PARENT = 'fixtures/governance/void-brood-queen-cryptographic-identity-contract-v1.json';
const COMMAND = 'fixtures/governance/void-crown-brood-queen-command-layer-v1.json';
const MARKER = 'VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_20260822';
const PARENT_MARKER = 'VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822';
const COMMAND_MARKER = 'VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818';
const EXPECTED_CANDIDATE = 'ac1de81fc81bba23802b75e8d46beb1583785c14f94210af94e4e6901f93be3b';
const EXPECTED_CONSTITUTION = 'f3b155ab9df462f7a4f0981a52aca15ec640548c19c7e81c24e883513112adbd';

function hold(message) {
  throw new Error(message);
}

function exactKeys(value, expected, name) {
  const actual = Object.keys(value).sort().join(',');
  const wanted = [...expected].sort().join(',');
  if (actual !== wanted) hold(`${name} unexpected fields: ${actual}`);
}

function requireFalse(value, name) {
  if (value !== false) hold(`${name} must be false`);
}

function requireTrue(value, name) {
  if (value !== true) hold(`${name} must be true`);
}

async function main() {
  const [doc, fixtureText, parentText, commandText] = await Promise.all([
    readFile(DOC, 'utf8'),
    readFile(FIXTURE, 'utf8'),
    readFile(PARENT, 'utf8'),
    readFile(COMMAND, 'utf8'),
  ]);

  const fixture = JSON.parse(fixtureText);
  const parent = JSON.parse(parentText);
  const command = JSON.parse(commandText);

  exactKeys(fixture, [
    'marker',
    'parent_identity_contract_marker',
    'parent_command_layer_marker',
    'network',
    'office',
    'delegated_nonvalidator_realm',
    'validator_separation',
    'v5_candidate',
    'memory',
    'apollyon_separation',
    'local_containment',
    'remote_bridge',
  ], 'fixture');

  if (fixture.marker !== MARKER) hold('seat marker drifted');
  if (fixture.parent_identity_contract_marker !== PARENT_MARKER) hold('parent identity marker drifted');
  if (fixture.parent_command_layer_marker !== COMMAND_MARKER) hold('parent command marker drifted');
  if (parent.marker !== PARENT_MARKER) hold('parent identity fixture marker mismatch');
  if (command.marker !== COMMAND_MARKER) hold('command fixture marker mismatch');
  if (fixture.network?.chain_id !== 2050) hold('chain id drifted');
  if (fixture.office?.name !== 'Brood Queen' || fixture.office?.identity !== 'Ren') hold('Brood Queen office identity drifted');
  if (fixture.apollyon_separation?.office !== 'General' || fixture.apollyon_separation?.identity !== 'Apollyon') hold('Apollyon office identity drifted');
  if (fixture.v5_candidate?.candidate_digest !== EXPECTED_CANDIDATE) hold('V5 candidate digest drifted');
  if (fixture.v5_candidate?.constitution_sha256 !== EXPECTED_CONSTITUTION) hold('constitution digest drifted');

  requireFalse(fixture.office.local_model_is_office_identity, 'local model Crown identity');
  requireFalse(fixture.office.model_self_claim_is_authentication, 'model self-claim auth');
  requireTrue(fixture.office.provider_neutral, 'provider neutral office');

  requireTrue(fixture.delegated_nonvalidator_realm.broad_nonvalidator_operational_jurisdiction_supported, 'nonvalidator jurisdiction');
  requireTrue(fixture.delegated_nonvalidator_realm.sensitive_actions_still_require_applicable_capability_gate, 'sensitive action gate');
  requireFalse(fixture.delegated_nonvalidator_realm.ownership_of_people, 'ownership of people');

  for (const [key, value] of Object.entries(fixture.validator_separation)) {
    if (key === 'validator_realm_segregated') requireTrue(value, `validator_separation.${key}`);
    else requireFalse(value, `validator_separation.${key}`);
  }

  requireFalse(fixture.memory.committed_to_public_repository, 'memory public repo');
  requireFalse(fixture.memory.embedded_in_model_weights, 'memory model weights');
  requireTrue(fixture.memory.curated_semantic_memory_preferred, 'curated semantic memory');
  requireFalse(fixture.memory.raw_chat_import_automatic, 'automatic raw chat import');
  requireFalse(fixture.memory.raw_private_keys_allowed, 'raw private keys');
  requireFalse(fixture.memory.wallet_or_seed_credentials_allowed, 'wallet credentials');
  requireFalse(fixture.memory.node_keys_allowed, 'node keys');
  requireFalse(fixture.memory.provider_api_tokens_allowed, 'provider tokens');
  requireFalse(fixture.memory.ssh_credentials_allowed, 'ssh credentials');
  requireFalse(fixture.memory.session_credentials_allowed, 'session credentials');
  requireFalse(fixture.memory.memory_text_can_override_constitution, 'memory authority override');
  requireFalse(fixture.memory.validator_authority_in_context, 'validator authority in memory');

  requireFalse(fixture.apollyon_separation.may_impersonate_ren, 'Apollyon impersonation');
  requireFalse(fixture.apollyon_separation.may_authenticate_as_brood_queen, 'Apollyon Crown auth');
  requireFalse(fixture.apollyon_separation.may_inherit_brood_queen_root_key, 'Apollyon Crown key inheritance');
  requireFalse(fixture.apollyon_separation.may_inherit_brood_queen_session, 'Apollyon Crown session inheritance');
  requireFalse(fixture.apollyon_separation.output_is_crown_authentication, 'Apollyon output Crown auth');

  requireTrue(fixture.local_containment.model_api_loopback_only, 'loopback model API');
  requireTrue(fixture.local_containment.model_non_loopback_egress_denied, 'non-loopback egress denied');
  requireFalse(fixture.local_containment.model_direct_input_device_access, 'input device access');
  requireFalse(fixture.local_containment.model_service_can_read_void_repo, 'model repo read');
  requireFalse(fixture.local_containment.model_service_can_read_nodekey, 'model node key read');
  requireFalse(fixture.local_containment.model_service_can_read_tailscale_state, 'model tailscale read');
  requireFalse(fixture.local_containment.service_boot_enabled, 'boot-enabled model service');
  requireFalse(fixture.local_containment.model_repo_mutation, 'model repo mutation');

  requireFalse(fixture.remote_bridge.active, 'remote bridge active');
  requireTrue(fixture.remote_bridge.must_be_authenticated, 'remote bridge authentication');
  requireTrue(fixture.remote_bridge.must_be_auditable, 'remote bridge audit');
  requireTrue(fixture.remote_bridge.must_be_replay_resistant, 'remote bridge replay resistance');
  requireTrue(fixture.remote_bridge.must_terminate_at_trusted_broker, 'trusted broker termination');
  requireFalse(fixture.remote_bridge.may_expose_raw_ollama_to_internet, 'raw Ollama internet exposure');
  requireFalse(fixture.remote_bridge.public_github_private_memory_relay_allowed, 'public GitHub memory relay');

  for (const required of [
    MARKER,
    PARENT_MARKER,
    COMMAND_MARKER,
    '**King → Brood Queen / Ren → General / Apollyon**',
    'Raw conversation history is **not imported automatically**',
    'Public GitHub must not be used as a relay for private conversation memory',
    EXPECTED_CANDIDATE,
    EXPECTED_CONSTITUTION,
  ]) {
    if (!doc.includes(required)) hold(`doc missing required binding: ${required}`);
  }

  const secretShapes = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
  ];
  for (const pattern of secretShapes) {
    if (pattern.test(fixtureText)) hold(`fixture contains secret-like material: ${pattern}`);
  }

  process.stdout.write('VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_PROOF_GREEN\n');
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${error?.message ?? String(error)}\n`);
  process.exitCode = 2;
});
