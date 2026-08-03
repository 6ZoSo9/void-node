export const MARKER = "VOID_LUANTI_USEFUL_WORK_GAME_FOUNDATION_V1";
export const RESULT_MARKER =
  "VOID_LUANTI_USEFUL_WORK_GAME_FOUNDATION_RESULT_V1";

function fail(message) {
  throw new Error(message);
}
function assertCondition(condition, message) {
  if (!condition) fail(message);
}
function record(value, label) {
  assertCondition(
    value && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value;
}
function exactKeys(value, label, expected) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} must contain exactly: ${wanted.join(", ")}`,
  );
}
function falseFields(value, label, keys) {
  const item = record(value, label);
  for (const key of keys) {
    assertCondition(item[key] === false, `${label}.${key} must be false`);
  }
}
function trueFields(value, label, keys) {
  const item = record(value, label);
  for (const key of keys) {
    assertCondition(item[key] === true, `${label}.${key} must be true`);
  }
}

export function evaluateVoidLuantiUsefulWorkGameFoundationV1(inputValue) {
  const input = record(inputValue, "input");
  exactKeys(input, "input", [
    "marker",
    "version",
    "working_title",
    "upstream",
    "architecture",
    "consent_and_resources",
    "initial_capabilities",
    "forbidden_capabilities",
    "identity_and_rewards",
    "foundation_mod",
    "authority",
  ]);
  assertCondition(input.marker === MARKER, "marker mismatch");
  assertCondition(input.version === 1, "version mismatch");
  assertCondition(input.working_title === "VOID Realms", "title mismatch");

  const upstream = record(input.upstream, "upstream");
  const engine = record(upstream.engine, "upstream.engine");
  assertCondition(engine.project === "luanti-org/luanti", "engine mismatch");
  assertCondition(engine.candidate_version === "5.16.1", "engine version mismatch");
  assertCondition(engine.license === "LGPL-2.1-or-later", "engine license mismatch");
  falseFields(engine, "upstream.engine", ["vendored", "download_authorized"]);

  const game = record(upstream.reference_game, "upstream.reference_game");
  assertCondition(game.project === "mineclonia/mineclonia", "game mismatch");
  assertCondition(game.candidate_version === "0.122.2", "game version mismatch");
  assertCondition(game.code_license === "GPL-3.0-or-later", "game code license mismatch");
  assertCondition(game.media_license === "CC-BY-SA-4.0", "game media license mismatch");
  assertCondition(
    game.role === "compatibility_and_development_reference",
    "reference game role mismatch",
  );
  falseFields(game, "upstream.reference_game", [
    "forked",
    "vendored",
    "download_authorized",
    "minecraft_assets_allowed",
  ]);

  const architecture = record(input.architecture, "architecture");
  assertCondition(architecture.game_plane === "luanti_server_mod", "game plane mismatch");
  assertCondition(
    architecture.worker_plane === "separate_void_worker_companion",
    "worker plane mismatch",
  );
  falseFields(architecture, "architecture", [
    "server_mod_runs_on_player_device",
    "server_mod_can_start_worker",
    "game_account_is_wallet",
    "game_mod_has_reward_authority",
    "game_mod_has_work_credit_write_authority",
    "direct_void_rewards",
  ]);
  trueFields(architecture, "architecture", [
    "companion_installation_required",
    "companion_separate_consent_required",
    "reward_requires_verified_receipt",
    "game_receives_sanitized_read_only_status",
  ]);
  assertCondition(architecture.reward_unit === "WC", "reward unit mismatch");
  assertCondition(
    architecture.gamenetworkingsockets_role ===
      "optional_future_companion_transport",
    "GameNetworkingSockets role mismatch",
  );

  const consent = record(input.consent_and_resources, "consent_and_resources");
  falseFields(consent, "consent_and_resources", [
    "default_opt_in",
    "hidden_compute_allowed",
    "background_autostart_allowed",
  ]);
  trueFields(consent, "consent_and_resources", [
    "one_action_pause_required",
    "visible_status_required",
    "separate_game_and_companion_consent",
    "default_ac_power_only",
    "thermal_guard_required",
    "pause_while_game_is_resource_constrained",
  ]);
  assertCondition(
    Number.isInteger(consent.default_cpu_percent_cap) &&
      consent.default_cpu_percent_cap >= 1 &&
      consent.default_cpu_percent_cap <= 25,
    "CPU cap out of bounds",
  );
  assertCondition(
    Number.isInteger(consent.default_bandwidth_kib_per_second_cap) &&
      consent.default_bandwidth_kib_per_second_cap >= 16 &&
      consent.default_bandwidth_kib_per_second_cap <= 1024,
    "bandwidth cap out of bounds",
  );

  assertCondition(
    JSON.stringify(input.initial_capabilities) === JSON.stringify([
      "datanet_fetch_verify",
      "public_object_mirror_verify",
      "public_block_header_range_verify",
      "public_content_duplicate_check",
    ]),
    "initial capability set mismatch",
  );
  assertCondition(
    JSON.stringify(input.forbidden_capabilities) === JSON.stringify([
      "consensus_vote",
      "validator_key_use",
      "wallet_key_use",
      "transaction_signing",
      "payment_execution",
      "private_data_processing",
      "arbitrary_code_execution",
    ]),
    "forbidden capability set mismatch",
  );

  const rewards = record(input.identity_and_rewards, "identity_and_rewards");
  trueFields(rewards, "identity_and_rewards", [
    "game_identity_bound_by_separate_challenge",
    "coordinator_issues_bounded_ticket",
    "duplicate_protection_required",
    "per_account_caps_required",
    "work_credit_awarded_by_existing_verified_adapter",
  ]);
  falseFields(rewards, "identity_and_rewards", [
    "raw_worker_credential_exposed_to_game",
    "raw_worker_credential_exposed_to_mod",
    "wallet_or_signer_exposed",
    "gameplay_progress_requires_compute",
    "pay_to_win_allowed",
  ]);

  const mod = record(input.foundation_mod, "foundation_mod");
  assertCondition(mod.technical_name === "void_work", "mod name mismatch");
  assertCondition(mod.license === "GPL-3.0-or-later", "mod license mismatch");
  falseFields(mod, "foundation_mod", [
    "network_access",
    "filesystem_access",
    "external_program_execution",
  ]);
  trueFields(mod, "foundation_mod", [
    "records_in_game_intent_only",
    "starts_no_work",
    "awards_no_work_credit",
  ]);
  assertCondition(
    JSON.stringify(mod.commands) ===
      JSON.stringify(["voidwork", "voidwork_consent"]),
    "mod commands mismatch",
  );

  falseFields(input.authority, "authority", [
    "upstream_download",
    "upstream_fork",
    "package_install",
    "server_start",
    "network_listener_start",
    "external_connection",
    "worker_start",
    "work_ticket_issue",
    "work_execution",
    "work_credit_write",
    "void_settlement",
    "wallet_or_signer_access",
    "payment_execution",
    "service_restart",
    "deployment",
    "money_movement",
  ]);

  return {
    marker: RESULT_MARKER,
    version: 1,
    status: "foundation_ready_for_separate_upstream_and_companion_gates",
    working_title: input.working_title,
    engine_candidate: "Luanti 5.16.1",
    reference_game_candidate: "Mineclonia 0.122.2",
    server_mod_can_run_player_compute: false,
    separate_worker_companion_required: true,
    default_opt_in: false,
    hidden_compute_allowed: false,
    reward_unit: "WC",
    verified_receipt_required: true,
    game_mod_reward_authority: false,
    game_mod_work_credit_write_authority: false,
    upstream_download_authorized: false,
    production_activation_authorized: false,
    authority: input.authority,
  };
}
