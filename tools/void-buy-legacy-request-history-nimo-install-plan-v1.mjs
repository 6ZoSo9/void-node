#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1";

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_AUTHORITY_V1 =
  Object.freeze({
    source_only_installation_plan: true,
    exact_reviewed_source_generation_bound: true,
    fixed_installation_layout_selected: true,
    exact_forced_command_selected: true,
    authorized_key_exact_forced_command_option_required: true,
    materialized_authorized_key_command_binding_required: true,
    dedicated_client_public_key_required: true,
    additive_authorized_keys_successor_required: true,
    existing_authorized_keys_generation_preservation_required: true,
    runtime_bundle_candidate_required: true,
    runtime_bundle_candidate_accepted: false,
    complete_transitive_runtime_closure_bound: false,
    protected_runtime_install_authorized: false,
    config_install_authorized: false,
    authority_root_create_authorized: false,
    witness_genesis_create_authorized: false,
    authorized_keys_mutation_authorized: false,
    sshd_mutation_authorized: false,
    live_nimo_installed: false,
    live_handler_execution_performed: false,
    live_remote_read_performed: false,
    live_remote_append_performed: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    external_witness_verified: false,
    historical_request_history_disposition_accepted: false,
    stable_root_apply_authorized: false,
    private_key_access: false,
    key_generation: false,
    signing: false,
    payment_acceptance: false,
    public_presale_activation: false,
    wc_void_market_activation: false,
    funds_movement: false,
  });

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_REVIEWED_SOURCE_ROOTS_V1 =
  Object.freeze([
    Object.freeze({path:"tools/void-buy-legacy-request-history-nimo-forced-command-v1.mjs",git_blob_sha1:"5022f293f2ac821210cec80ff39f6aff7b511696"}),
    Object.freeze({path:"tools/void-buy-legacy-request-history-nimo-transport-envelope-v1.mjs",git_blob_sha1:"3d0c9ecff9fdd07e3c9ef354a2ae7db9087c93fd"}),
    Object.freeze({path:"tools/void-buy-legacy-request-history-external-witness-v1.mjs",git_blob_sha1:"831d5f0ac090aaab08fc4410d338ac1cdab7cc40"}),
    Object.freeze({path:"tools/void-buy-legacy-request-history-sovereign-authorization-v1.mjs",git_blob_sha1:"ab680ab8f553229d4ffc0a013979d2052ac9bcd3"}),
    Object.freeze({path:"tools/void-buy-legacy-request-history-disposition-v1.mjs",git_blob_sha1:"118f529f287086ed0f9f368408a4fa421f694ea5"}),
    Object.freeze({path:"src/economic/buy_void_filesystem_bakery_lock_v1.ts",git_blob_sha1:"9bd47abb857368d928c0ca289766cdf3571629ba"}),
    Object.freeze({path:"src/economic/buy_void_allocation_custody_witness_transport_v1.ts",git_blob_sha1:"a5163272f08d6d96a9c2387fa6db344018e09694"}),
    Object.freeze({path:"src/economic/buy_void_allocation_custody_external_witness_v1.ts",git_blob_sha1:"5d24f3fb3e94611c653a0e3e1319afa7d0f4db72"}),
    Object.freeze({path:"src/economic/buy_void_allocation_reservation_high_water_v1.ts",git_blob_sha1:"9383c94cf848efb9a0112f1b741df4e10f790ac6"}),
    Object.freeze({path:"src/economic/buy_void_allocation_reservation_ledger_v1.ts",git_blob_sha1:"8d84955e1e093a5c5af63241e62b8722fadd2f29"}),
    Object.freeze({path:"src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",git_blob_sha1:"e284a38a4b7f3d498b07e77c661d6eef3b742e7a"}),
    Object.freeze({path:"src/economic/buy_void_auto_fulfillment_v1.ts",git_blob_sha1:"b7c963b1d55f000d82ad82289b31107b432503de"}),
    Object.freeze({path:"src/security/void_sovereign_emergency_control_v1.ts",git_blob_sha1:"1756c395bfb3e3c97aaf98546ae0ec2b59b1bea9"}),
    Object.freeze({path:"src/security/void_alignment_layer_v1.ts",git_blob_sha1:"002172c5edfa7d34687eb2aba018795aeb53f9d0"}),
    Object.freeze({path:"package.json",git_blob_sha1:"14fbdf5717b07fd4c734f5da7a8e84ed59bee93f"}),
    Object.freeze({path:"package-lock.json",git_blob_sha1:"15b5c82ea36f13079a2f9e8863722f654eb3f201"}),
    Object.freeze({path:"tsconfig.build.json",git_blob_sha1:"d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb"}),
    Object.freeze({path:"scripts/copy_void_runtime_js_v1.mjs",git_blob_sha1:"d1c4b3735ca2d3a9aa392ec1173cf7b123e0f9d9"}),
    Object.freeze({path:"scripts/retire_saveblock_periodic_rewriters_v1.mjs",git_blob_sha1:"3786dbc03de4be29b6e42059e46dbe1b95d8aa04"}),
  ]);

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1 =
  'test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin HOME=/var/lib/voidwitness LANG=C LC_ALL=C VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_V1=1 SSH_ORIGINAL_COMMAND="${SSH_ORIGINAL_COMMAND-}" /usr/bin/node /usr/local/libexec/void-legacy-history-witness-v1/void/void-buy-legacy-request-history-nimo-forced-command-v1.mjs --config=/etc/void/buy-void-legacy-history-external-witness-v1.json';

function encodeAuthorizedKeyCommandOptionV1(command){
  if(command!==VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1){
    throw new Error("legacy_history_nimo_authorized_key_command_not_selected");
  }
  const escaped=command.replaceAll("\\","\\\\").replaceAll('"','\\"');
  return 'command="'+escaped+'"';
}

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_AUTHORIZED_KEY_COMMAND_OPTION_V1 =
  encodeAuthorizedKeyCommandOptionV1(
    VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1,
  );

export function classifyVoidBuyVoidLegacyHistoryNimoAuthorizedKeyOptionsV1(input){
  try{
    if(!input||typeof input!=="object"||Array.isArray(input)||
       Object.getPrototypeOf(input)!==Object.prototype){
      throw new Error("legacy_history_nimo_authorized_key_options_shape_invalid");
    }
    const keys=Object.keys(input).sort();
    const expected=["command_option","restrict"].sort();
    if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index])){
      throw new Error("legacy_history_nimo_authorized_key_options_shape_invalid");
    }
    if(input.restrict!==true){
      throw new Error("legacy_history_nimo_authorized_key_restrict_required");
    }
    if(input.command_option!==VOID_BUY_VOID_LEGACY_HISTORY_NIMO_AUTHORIZED_KEY_COMMAND_OPTION_V1){
      throw new Error("legacy_history_nimo_authorized_key_command_option_mismatch");
    }
    return Object.freeze({
      ok:true,
      status:"SOURCE_AUTHORIZED_KEY_OPTION_SHAPE_BOUND",
      restrict:true,
      command_option:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_AUTHORIZED_KEY_COMMAND_OPTION_V1,
      command_value:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1,
      exact_line_materialized:false,
      authorized_keys_mutation_authorized:false,
    });
  }catch(error){
    return Object.freeze({
      ok:false,
      status:"HOLD",
      reason:error instanceof Error?error.message:String(error),
      exact_line_materialized:false,
      authorized_keys_mutation_authorized:false,
    });
  }
}

function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"){
    return "{"+Object.keys(value).sort()
      .map(key=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
  }
  throw new Error("legacy_history_nimo_install_plan_noncanonical_value");
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function planVoidBuyVoidLegacyHistoryNimoInstallV1(){
  const body=Object.freeze({
    schema:"void_buy_void_legacy_history_nimo_install_plan_v1",
    marker:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1,
    version:1,
    status:"HOLD_SOURCE_ONLY_INSTALLATION_PLAN",
    source_parent_main:"b912662c4fea95f9b2bff314e7f11003dd91672a",
    reviewed_source_roots:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_REVIEWED_SOURCE_ROOTS_V1,
    reviewed_source_roots_are_complete_runtime_bundle:false,
    fixed_layout:Object.freeze({
      handler_root:"/usr/local/libexec/void-legacy-history-witness-v1/void",
      handler_path:"/usr/local/libexec/void-legacy-history-witness-v1/void/void-buy-legacy-request-history-nimo-forced-command-v1.mjs",
      config_path:"/etc/void/buy-void-legacy-history-external-witness-v1.json",
      authority_root:"/var/lib/void-legacy-history-external-witness-v1",
      witness_path:"/var/lib/void-legacy-history-external-witness-v1/legacy-history-sovereign-authorization-v1.jsonl",
      intent_path:"/var/lib/void-legacy-history-external-witness-v1/legacy-history-sovereign-authorization-append-intent-v1.json",
      authorized_keys_path:"/etc/ssh/authorized_keys/voidwitness",
      node_path:"/usr/bin/node",
      env_path:"/usr/bin/env",
    }),
    expected_execution_identity:Object.freeze({
      username:"voidwitness",uid:997,gid:984,
      home:"/var/lib/voidwitness",
    }),
    expected_nimo_identity:Object.freeze({
      hostname:"Nimo",
      machine_id_sha256:"sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4",
      root_disk_serial:"50026B76873B25AB",
      root_disk_wwn:"eui.00000000000000000026b76873b25ab5",
    }),
    filesystem_policy:Object.freeze({
      handler_root_owner:"root:root",handler_root_mode:"0755",
      installed_runtime_files_owner:"root:root",
      installed_runtime_files_mode:"0444",
      config_owner:"root:root",config_mode:"0444",
      authority_root_owner:"voidwitness:voidwitness",authority_root_mode:"0700",
      witness_owner:"voidwitness:voidwitness",witness_mode:"0600",
      witness_initial_bytes:0,
      intent_owner:"voidwitness:voidwitness",intent_mode:"0600",
      nofollow_required:true,
      single_link_witness_required:true,
      root_owned_nonwritable_config_ancestry_required:true,
    }),
    forced_command:Object.freeze({
      command:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1,
      empty_original_command_required:true,
      clean_environment_required:true,
      caller_selected_command:false,
      caller_selected_path:false,
      shell_access:false,
    }),
    authorized_key:Object.freeze({
      path:"/etc/ssh/authorized_keys/voidwitness",
      owner:"root:root",mode:"0444",
      restrict_option_required:true,
      forced_command_option_required:true,
      forced_command_option_exact_encoding_required:true,
      forced_command_option_must_equal_selected_command:true,
      materialized_entry_command_option_required:true,
      materialized_entry_command_value_must_equal_forced_command_command:true,
      materialized_entry_restrict_only_sufficient:false,
      forced_command_value:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1,
      forced_command_option:
        VOID_BUY_VOID_LEGACY_HISTORY_NIMO_AUTHORIZED_KEY_COMMAND_OPTION_V1,
      dedicated_ed25519_client_key_required:true,
      transport_policy_client_public_key_sha256_required:true,
      public_key_blob_selected:false,
      public_key_fingerprint_selected:false,
      exact_line_materialized:false,
      existing_reviewed_entries_preserved_required:true,
      reviewed_additive_successor_required:true,
      replacement_of_existing_file_forbidden:true,
    }),
    runtime_bundle:Object.freeze({
      deterministic_bundle_candidate_required:true,
      exact_transitive_runtime_closure_required:true,
      built_dist_modules_required:true,
      package_lock_build_generation_bound_by_source_roots:true,
      runtime_bundle_candidate_accepted:false,
      complete_transitive_runtime_closure_bound:false,
      installed_runtime_bytes_selected:false,
    }),
    host_preflight:Object.freeze({
      nimo_identity_verified:false,
      voidwitness_identity_verified:false,
      fixed_node_identity_verified:false,
      sshd_effective_authorized_keys_path_verified:false,
      existing_authorized_keys_generation_verified:false,
      handler_paths_absent_or_exact_verified:false,
      config_path_absent_or_exact_verified:false,
      authority_root_absent_or_exact_verified:false,
      witness_path_absent_or_exact_verified:false,
    }),
    next_gates:Object.freeze([
      "DETERMINISTIC_RUNTIME_BUNDLE_CANDIDATE",
      "DEDICATED_CLIENT_PUBLIC_KEY_SELECTION",
      "AUTHORIZED_KEYS_ADDITIVE_SUCCESSOR",
      "NIMO_READ_ONLY_INSTALL_PREFLIGHT",
      "CREATE_ONLY_INSTALL_CEREMONY",
      "LIVE_READ_ONLY_TRANSPORT_QUALIFICATION",
    ]),
    authority:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_AUTHORITY_V1,
  });
  return Object.freeze({
    ...body,
    plan_id:"voidblrhnip1_"+sha256(Buffer.from(canonical(body),"utf8")),
  });
}

function main(){
  const args=process.argv.slice(2);
  if(args.length!==1||!["--plan","--self-test"].includes(args[0])){
    process.stderr.write("HOLD=source_only_installation_plan_no_mutation_mode\n");
    process.stderr.write("live_nimo_installed=false\n");
    process.stderr.write("authorized_keys_mutation_authorized=false\n");
    process.stderr.write("funds_movement=false\n");
    process.exitCode=2;
    return;
  }
  const plan=planVoidBuyVoidLegacyHistoryNimoInstallV1();
  if(args[0]==="--self-test"){
    if(plan.status!=="HOLD_SOURCE_ONLY_INSTALLATION_PLAN"||
       plan.authority.live_nimo_installed!==false||
       plan.authorized_key.exact_line_materialized!==false||
       plan.authorized_key.forced_command_option!==
         VOID_BUY_VOID_LEGACY_HISTORY_NIMO_AUTHORIZED_KEY_COMMAND_OPTION_V1||
       plan.authorized_key.materialized_entry_command_option_required!==true||
       plan.authorized_key.materialized_entry_command_value_must_equal_forced_command_command!==true||
       plan.authorized_key.materialized_entry_restrict_only_sufficient!==false||
       classifyVoidBuyVoidLegacyHistoryNimoAuthorizedKeyOptionsV1({
         restrict:true,
         command_option:plan.authorized_key.forced_command_option,
       }).ok!==true||
       plan.runtime_bundle.runtime_bundle_candidate_accepted!==false){
      throw new Error("legacy_history_nimo_install_plan_self_test_failed");
    }
    process.stdout.write(
      VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1+"_SELF_TEST_GREEN\n"+
      "source_only_installation_plan=true\n"+
      "runtime_bundle_candidate_accepted=false\n"+
      "authorized_key_exact_forced_command_option_required=true\n"+
      "materialized_authorized_key_command_binding_required=true\n"+
      "authorized_keys_additive_successor_required=true\n"+
      "live_nimo_installed=false\n"+
      "funds_movement=false\n"
    );
    return;
  }
  process.stdout.write(canonical(plan)+"\n");
}

if(import.meta.url===new URL("file://"+process.argv[1]).href)main();
