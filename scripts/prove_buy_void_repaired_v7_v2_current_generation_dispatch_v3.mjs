#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const REPAIR_BASE="4a051b906b827836fd50216e80b226f8e0b23300";
const SELF="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs";
const DOC="docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v3.md";
const TOOL="ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const TOOL_BLOB="e0a682ea4038ca22e3a3b97da2cac29874096c46";
const TOOL_PROOF="scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts";
const TOOL_PROOF_BLOB="e634e666d3a190368ddb031f936ebbb6347b7196";
const TOOL_PREDECESSOR_BLOB="3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0";
const FROZEN_DISPATCH_V2="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs";
const FROZEN_DISPATCH_V2_BLOB="5f5e76a594c358639571a190dc48fc9e11fc8b01";
const FROZEN_DISPATCH_V2_DOC="docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v2.md";
const FROZEN_DISPATCH_V2_DOC_BLOB="e36038aea671b8ba84aadbcebcaeaa75e5efbdb8";
const CANDIDATE_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const CANDIDATE_BLOB="40c7d21e0f22bc2ffe079f80360af342f4d8a6aa";
const CANDIDATE_BYTES=17392;
const CANDIDATE_SHA256="7f9c032bb3685d0d45f439123878af0ba366bd587e29a98df3270f0f13808c96";
const CANDIDATE_SET="4d06da56a3fa3fa7891c64a0c7191756c344effb62b330a1b003bd4952dc0223";
const PROTECTED_INVENTORY="65880eb31fd75bc07b8c568ada5a4903a2c178108408e2a8390c15b3cafb7589";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v3.mjs";
const CANDIDATE_PROOF_BLOB="5cd2c9cb4f7ac4f4a71a697d04aa23c3ee9d6705";
const LOCK_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const LOCK_BLOB="f1b9d661eb3363e9bf18dbeb3610c659a54219bb";
const LOCK_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v3.mjs";
const LOCK_PROOF_BLOB="126fad9b17e4958742ccd508fe04c52ef84599b5";
const V4_CENSUS_PROOF="scripts/prove_buy_void_enforcement_final_v7_artifact_census_v4.mjs";
const V4_CENSUS_PROOF_BLOB="f0e1334da67309c1aeb98a2fa19e5ff77424955f";
const PROTECTED_PARENT="16563121f8d6c2a1fa7cd2f99ca4be2f88aa3cca";
const PROTECTED_PARENT_TREE="45db2286497ca9f6f0c0753bdba7cbed962385ce";
const PROTECTED_PARENT_ECONOMIC_TREE="762f3bfb382d20872cff04e4d5c00ac482ddc09b";
const PROTECTED_PARENT_SCOPE_ROWS=Object.freeze([
  {
    "git_blob_sha1":"15b5c82ea36f13079a2f9e8863722f654eb3f201",
    "git_mode":"100644",
    "path":"package-lock.json"
  },
  {
    "git_blob_sha1":"14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
    "git_mode":"100644",
    "path":"package.json"
  },
  {
    "git_blob_sha1":"c6bff48b452b6d517c66a6abbccd96411218be44",
    "git_mode":"100644",
    "path":"src/economic/agent_paid_work_wc_earning_adapter_v1.ts"
  },
  {
    "git_blob_sha1":"5d24f3fb3e94611c653a0e3e1319afa7d0f4db72",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_external_witness_v1.ts"
  },
  {
    "git_blob_sha1":"4adae871f2938840e2ec936e743d0b650b5f1a00",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_qualification_v1.ts"
  },
  {
    "git_blob_sha1":"1b60289e4d819ec693e47b5e1f6e2ba805d7a811",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_identity_continuity_v1.ts"
  },
  {
    "git_blob_sha1":"e559ac8f80cccf251bb507c979a72944ed7dbbd5",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_installation_qualification_v1.ts"
  },
  {
    "git_blob_sha1":"7692ddd1b1bb10740b156be7e12c3766095eba64",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_installation_qualification_v2.ts"
  },
  {
    "git_blob_sha1":"43696c5da4d1ac94a3205fb952936d3b3d33a366",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_qualification_v1.ts"
  },
  {
    "git_blob_sha1":"091961ce736148fd7d7168eb91112dbd0da3132d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_compare_packet_v1.ts"
  },
  {
    "git_blob_sha1":"f19d4cdaa9fd5cc551bb3d835721e2efefff8bb0",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_composition_v1.ts"
  },
  {
    "git_blob_sha1":"8def06474e0769ee0f36e8aeea74c4d83fbb9260",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_custody_qualification_v1.ts"
  },
  {
    "git_blob_sha1":"d2bc816b027d2aca0c236d9ec31d128b28159d7d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_external_custody_qualification_v1.ts"
  },
  {
    "git_blob_sha1":"4121dd43f75c21c44f248eabd13afe1da31089e9",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.ts"
  },
  {
    "git_blob_sha1":"1001c04998c79246799fdc2f30585526fbfe16a6",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts"
  },
  {
    "git_blob_sha1":"2d5fc24498b569f20701445d6214a8ca31e4f701",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_independence_v1.ts"
  },
  {
    "git_blob_sha1":"97180cc03e3f1b2f9935191ac6aafe4b15307708",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_second_control_composition_v1.ts"
  },
  {
    "git_blob_sha1":"c59f603ac5755a4b4021e7c5d5feaad386e23643",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_ssh_compare_adapter_v1.ts"
  },
  {
    "git_blob_sha1":"d92a40c96e749938bb41f9e4a69599afd408e645",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_state_v1.ts"
  },
  {
    "git_blob_sha1":"3556c67e132ced0cc94440e5a93667e13aad8db2",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts"
  },
  {
    "git_blob_sha1":"d2e84643c9f4d76c642c7e07d4ea2bf1634035e4",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts"
  },
  {
    "git_blob_sha1":"453550bcab9c5caf192c6d9d813bce9ce4433b0a",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v3.ts"
  },
  {
    "git_blob_sha1":"a5163272f08d6d96a9c2387fa6db344018e09694",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_custody_witness_transport_v1.ts"
  },
  {
    "git_blob_sha1":"9383c94cf848efb9a0112f1b741df4e10f790ac6",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_reservation_high_water_v1.ts"
  },
  {
    "git_blob_sha1":"8d84955e1e093a5c5af63241e62b8722fadd2f29",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_reservation_ledger_v1.ts"
  },
  {
    "git_blob_sha1":"b0fe98427a7bdf1c39c41fb64e94f3f142d6636b",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_reservation_publication_protocol_v1.ts"
  },
  {
    "git_blob_sha1":"b460963c25a87153551090ed97e9c716aad0b727",
    "git_mode":"100644",
    "path":"src/economic/buy_void_allocation_reservation_publication_writer_v1.ts"
  },
  {
    "git_blob_sha1":"9f028871fa389a63e974b9614c1e67279e8b818e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_auto_claim_worker_v1.ts"
  },
  {
    "git_blob_sha1":"b7c963b1d55f000d82ad82289b31107b432503de",
    "git_mode":"100644",
    "path":"src/economic/buy_void_auto_fulfillment_v1.ts"
  },
  {
    "git_blob_sha1":"3d68486d2563e399ea750c6ab058b39d4a76d5ad",
    "git_mode":"100644",
    "path":"src/economic/buy_void_auto_reserve_plan_worker_v1.ts"
  },
  {
    "git_blob_sha1":"da4d88c1cb1eb88c66849f63739703ec25fcf0fd",
    "git_mode":"100644",
    "path":"src/economic/buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"f1f15fbc764a83f220b9348aea609a566e6f5c39",
    "git_mode":"100644",
    "path":"src/economic/buy_void_bounded_auto_fulfillment_orchestrator_v1.ts"
  },
  {
    "git_blob_sha1":"815d3c0e395a8f0e54a51bd54e99a6395cd7e04d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_bounded_orchestrator_apply_activation_gate_v1.ts"
  },
  {
    "git_blob_sha1":"e918e79229a322e1cc751d30ac28f4c32ad01187",
    "git_mode":"100644",
    "path":"src/economic/buy_void_bounded_orchestrator_server_snapshot_v1.ts"
  },
  {
    "git_blob_sha1":"de8765d306c9ba1153ade10f0e5db92823ef3e39",
    "git_mode":"100644",
    "path":"src/economic/buy_void_broadcast_outcome_journal_v1.ts"
  },
  {
    "git_blob_sha1":"829a1b7ce8f9537228f830fe89292093db32bc4a",
    "git_mode":"100644",
    "path":"src/economic/buy_void_candidate_watch_operator_webhook_delivery_v1.ts"
  },
  {
    "git_blob_sha1":"464193d4f2f349c4d3cec63865ad761537a6e1bb",
    "git_mode":"100644",
    "path":"src/economic/buy_void_canonical_payment_rpc_rail_guard_v1.ts"
  },
  {
    "git_blob_sha1":"e4560fd197ea963d95604308fc5dae1bff5e1b11",
    "git_mode":"100644",
    "path":"src/economic/buy_void_chain2050_durability_gate_v1.ts"
  },
  {
    "git_blob_sha1":"4d6b317d1e478efa1bdc032b934a6ad616777122",
    "git_mode":"100644",
    "path":"src/economic/buy_void_chain2050_durability_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"5a679e3faacab4312ebdc45604d541b10128e82a",
    "git_mode":"100644",
    "path":"src/economic/buy_void_confirmed_closeout_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"114d75cce2770bdc597f94ca41d2680e8d2fff5d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_confirmed_closeout_v1.ts"
  },
  {
    "git_blob_sha1":"d420ff9fc9533098b613d2dae82425a9c4a4bf7e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_confirmed_state_journal_v1.ts"
  },
  {
    "git_blob_sha1":"0a70bd20bee7dac3fe66f707c1db2dc1920c158f",
    "git_mode":"100644",
    "path":"src/economic/buy_void_confirmed_state_request_resolution_v1.ts"
  },
  {
    "git_blob_sha1":"b2ea864a26016877063b4e3067f4fec54282d820",
    "git_mode":"100644",
    "path":"src/economic/buy_void_coupled_launch_gate_v1.mjs"
  },
  {
    "git_blob_sha1":"7fe5c6e18671453f5fae4476112a6a88b352085c",
    "git_mode":"100644",
    "path":"src/economic/buy_void_crash_consistent_saga_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"e284a38a4b7f3d498b07e77c661d6eef3b742e7a",
    "git_mode":"100644",
    "path":"src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts"
  },
  {
    "git_blob_sha1":"a7610b03d394254c760683f0d9061aa0865718db",
    "git_mode":"100644",
    "path":"src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs"
  },
  {
    "git_blob_sha1":"c0e0b531aab9509f31f74a14df577e3abce5548d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_cross_uid_failure_reconciliation_v1.mjs"
  },
  {
    "git_blob_sha1":"1bf88a403b1012ac00edaf634c5ed237a898043c",
    "git_mode":"100644",
    "path":"src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs"
  },
  {
    "git_blob_sha1":"223ebdb8317009228094b8ebecef19dc37d87a91",
    "git_mode":"100644",
    "path":"src/economic/buy_void_custody_launch_authority_v2.mjs"
  },
  {
    "git_blob_sha1":"8d44f6651b9210f7cb1a5ac3f895ce18d0890fb5",
    "git_mode":"100644",
    "path":"src/economic/buy_void_custody_launch_high_water_writer_v1.mjs"
  },
  {
    "git_blob_sha1":"d0dd148d6701e5e47cc8301d71a0777876560834",
    "git_mode":"100644",
    "path":"src/economic/buy_void_custody_launch_observed_read_v1.mjs"
  },
  {
    "git_blob_sha1":"79eb8c39529583fffdb083173fb37b1f32075a14",
    "git_mode":"100644",
    "path":"src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs"
  },
  {
    "git_blob_sha1":"31993eb100997dd98cb54bfa654555f6d5b064e1",
    "git_mode":"100644",
    "path":"src/economic/buy_void_custody_reserve_plan_v1.mjs"
  },
  {
    "git_blob_sha1":"5b23824bf0a0f33b193e1cfc022fcfb5b898b022",
    "git_mode":"100644",
    "path":"src/economic/buy_void_delivery_runtime_integration_v1.ts"
  },
  {
    "git_blob_sha1":"2deaee8ae4e0fbd909b417eef96a76012174c668",
    "git_mode":"100644",
    "path":"src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts"
  },
  {
    "git_blob_sha1":"f84ca60a37c77ae7691ec6970c59f123de4f73b7",
    "git_mode":"100644",
    "path":"src/economic/buy_void_delivery_submission_guard_v1.ts"
  },
  {
    "git_blob_sha1":"66e18fd566825e2f2f71a673418209f6824b7c81",
    "git_mode":"100644",
    "path":"src/economic/buy_void_epoch2_credential_attestation_v1.ts"
  },
  {
    "git_blob_sha1":"4de9832a0f8e384e477177b55975e8557ec9147c",
    "git_mode":"100644",
    "path":"src/economic/buy_void_epoch2_credential_source_binding_v1.ts"
  },
  {
    "git_blob_sha1":"158cbf14fa2b566632c096a22e484b651cd44f6d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts"
  },
  {
    "git_blob_sha1":"785fe80d74ae5f6840da22a19a337cd2bcee9944",
    "git_mode":"100644",
    "path":"src/economic/buy_void_epoch2_signer_control_v1.ts"
  },
  {
    "git_blob_sha1":"08e8849e1736d20c0737e493853732970c0f31a5",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_chain2050_broadcaster_v1.ts"
  },
  {
    "git_blob_sha1":"05d9094f507ade72591f1e8c4983085c2259f949",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_chain2050_total_deadline_transport_v1.ts"
  },
  {
    "git_blob_sha1":"52e0a9ab472dae77270de6e28eba1f385da772a0",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_delivery_dependency_bootstrap_integration_gate_v1.ts"
  },
  {
    "git_blob_sha1":"e5651535bde060c91e988beb324aa8e5621d2857",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.ts"
  },
  {
    "git_blob_sha1":"d110159db9d20a8ce85391f4bdb154b9a6ddefde",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_delivery_dependency_injection_v1.ts"
  },
  {
    "git_blob_sha1":"d769edb821cec543cf05e8425857114261561cc0",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_delivery_receipt_reconciler_v1.ts"
  },
  {
    "git_blob_sha1":"f124637375edc5e082ccdec937f43fd2f2312616",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.ts"
  },
  {
    "git_blob_sha1":"acf2f88b513bbe50e192531f9fc8d261b69bd0f1",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_execution_composition_v1.ts"
  },
  {
    "git_blob_sha1":"4e060e2d5a1b28be03cf8dde3eda45778b7ed002",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_production_configuration_candidate_binding_v1.ts"
  },
  {
    "git_blob_sha1":"8781b2e9efa8b70de6f0c6a3721be089cab4a976",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_production_configuration_verifier_v1.ts"
  },
  {
    "git_blob_sha1":"0999f773bdc4befb3e82676304f0d69f5cab42ef",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts"
  },
  {
    "git_blob_sha1":"baff79fbfdc9a01c73e66176dcb25ccc8cdaf0e7",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_transaction_preparation_planner_v1.ts"
  },
  {
    "git_blob_sha1":"0aaee66b0ebbfd8ba3e12d4f754aa9f2e68c1d02",
    "git_mode":"100644",
    "path":"src/economic/buy_void_ethereum_public_checkout_finality_gate_v1.ts"
  },
  {
    "git_blob_sha1":"536b6f6970c3aaf48b1ae0dec3a0356ad7c3a7fe",
    "git_mode":"100644",
    "path":"src/economic/buy_void_execution_attempt_journal_v1.ts"
  },
  {
    "git_blob_sha1":"9bd47abb857368d928c0ca289766cdf3571629ba",
    "git_mode":"100644",
    "path":"src/economic/buy_void_filesystem_bakery_lock_v1.ts"
  },
  {
    "git_blob_sha1":"d009e4db868bea4042195397314fafc955e3ad19",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fresh_candidate_auto_claim_activation_admission_packet_v1.ts"
  },
  {
    "git_blob_sha1":"9bc3bf99d0b2cdaefde3251a28d139582dfec5d6",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.ts"
  },
  {
    "git_blob_sha1":"587ab70fcd96dec905a7f4264cb030ad6c66df85",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.ts"
  },
  {
    "git_blob_sha1":"1434f87836691e964167b7b0ba8840ec431f390e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.ts"
  },
  {
    "git_blob_sha1":"96ab36c44b00c731e8f08fc455f03d03843eade4",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_v1.ts"
  },
  {
    "git_blob_sha1":"f24908953ccdd98244a89aab7bd181d3bcbd564e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_approval_envelope_v1.ts"
  },
  {
    "git_blob_sha1":"d462d2e73faa1be18453151ab8200c1118a947b6",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_console_v1.ts"
  },
  {
    "git_blob_sha1":"b7d991f6123ea7c8acf5fde486c7c0993531a568",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fresh_candidate_auto_claim_activation_planner_v1.ts"
  },
  {
    "git_blob_sha1":"6ab008fbf3f4af5a5a81a5506f45ef0cd707b45c",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fresh_candidate_auto_claim_one_shot_executor_v1.ts"
  },
  {
    "git_blob_sha1":"a6912f67f49a0ddc26502e77ae5cb9d96dd182ae",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fresh_candidate_auto_claim_v1.ts"
  },
  {
    "git_blob_sha1":"441e8635206ceeaf712af904f775fcd4481d08ba",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fulfilled_reconciliation_mode_v1.ts"
  },
  {
    "git_blob_sha1":"31c8ce9b88c86d32e187ed2ca7d0a23344fbd113",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fulfillment_confirmation_v1.ts"
  },
  {
    "git_blob_sha1":"7c4b099d835b84f50867e873fca763767c80c015",
    "git_mode":"100644",
    "path":"src/economic/buy_void_fulfillment_journal_v1.ts"
  },
  {
    "git_blob_sha1":"459a89b26cdc6a9f83c7aead6bf5be12c4808417",
    "git_mode":"100644",
    "path":"src/economic/buy_void_history_carrier_lifecycle_mount_v1.ts"
  },
  {
    "git_blob_sha1":"bd09f90d998aa35dfab28abdb06425d85baddb9e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_history_carrier_pipeline_mount_v1.ts"
  },
  {
    "git_blob_sha1":"b7879d25319df4dcaf42618c19f8484dcf826e10",
    "git_mode":"100644",
    "path":"src/economic/buy_void_history_carrier_root_authority_v1.ts"
  },
  {
    "git_blob_sha1":"7bf34060fda5492a270ba9233f6e06af9a76317a",
    "git_mode":"100644",
    "path":"src/economic/buy_void_history_carrier_runtime_binding_v1.ts"
  },
  {
    "git_blob_sha1":"72948e9d27b68de325751da93b65ccad6082988f",
    "git_mode":"100644",
    "path":"src/economic/buy_void_history_carrier_successor_publication_v1.ts"
  },
  {
    "git_blob_sha1":"16100e2f6461c184572023c6f179822de7128875",
    "git_mode":"100644",
    "path":"src/economic/buy_void_history_carrier_terminal_closeout_mount_v1.ts"
  },
  {
    "git_blob_sha1":"ec8ab7b91293a126cfd0632517af542f21d3bc93",
    "git_mode":"100644",
    "path":"src/economic/buy_void_history_carrier_v1.ts"
  },
  {
    "git_blob_sha1":"318b7e6fd439e86efa0facefa6ac9dffc23eaca9",
    "git_mode":"100644",
    "path":"src/economic/buy_void_history_segmented_successor_v1.ts"
  },
  {
    "git_blob_sha1":"dc15061a3c4f09ec31da678aa26a731708e70d6c",
    "git_mode":"100644",
    "path":"src/economic/buy_void_inventory_reservation_journal_v1.ts"
  },
  {
    "git_blob_sha1":"4e02d64e684648be9502715eaed994d31ec6e96d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_legacy_alias_carrier_genesis_v1.ts"
  },
  {
    "git_blob_sha1":"ca33b5afec81435456dc1cd56f4b55c443237060",
    "git_mode":"100644",
    "path":"src/economic/buy_void_legacy_history_migration_apply_v1.ts"
  },
  {
    "git_blob_sha1":"94b8377981ef2390efdfd0f9f426ea8766db6efd",
    "git_mode":"100644",
    "path":"src/economic/buy_void_legacy_history_migration_plan_v1.ts"
  },
  {
    "git_blob_sha1":"9b62461644eaa7b08ba2430328d566a15f25fe9c",
    "git_mode":"100644",
    "path":"src/economic/buy_void_manual_fulfilled_confirmed_state_gate_v1.ts"
  },
  {
    "git_blob_sha1":"28b50301609c16838903ee49e62ba91cd4660e88",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_chain2050_broadcaster_v1.ts"
  },
  {
    "git_blob_sha1":"adc44589068b12644f7a01e37a3503d048ec23da",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_delivery_dependency_readiness_v1.ts"
  },
  {
    "git_blob_sha1":"643825ce3cc7f1fa1e8accffe021160ee1f3e7df",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_delivery_receipt_reconciler_v1.ts"
  },
  {
    "git_blob_sha1":"d5efce25c36b25b31b5a91c1c046121004ff615b",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_delivery_receipt_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"66b59e662e5b8a0e39f66e5a29f16415be75daf7",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_delivery_runtime_dependencies_v1.ts"
  },
  {
    "git_blob_sha1":"9c7dbeebf84cc61b617cc5882db5ed2b776af1f2",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_delivery_runtime_integration_v1.ts"
  },
  {
    "git_blob_sha1":"a01182b49ba9edb3f6bab6eccbb524b905d5f990",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_delivery_sign_broadcast_adapter_v1.ts"
  },
  {
    "git_blob_sha1":"efd2f87db9ee57bc753a50e6cec7b1affd703114",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_execution_nonce_fee_planner_v1.ts"
  },
  {
    "git_blob_sha1":"5a961a5fb65dd1600660a8d3f64af44cbe1f5b80",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_execution_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"a449d7094fe47456d9ee2563f2bc2cbfb70a9c02",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_execution_worker_v1.ts"
  },
  {
    "git_blob_sha1":"5fd9296d10d810b1976c159578f13cca5d1594fe",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts"
  },
  {
    "git_blob_sha1":"f0f2a49a019e32c961ee96b9823830bfdaf9fe40",
    "git_mode":"100644",
    "path":"src/economic/buy_void_observe_and_claim_candidate_readiness_v1.ts"
  },
  {
    "git_blob_sha1":"b2674ee10e977eb2a90dbf1e158fc6da9eaca589",
    "git_mode":"100644",
    "path":"src/economic/buy_void_observe_and_claim_candidate_watch_notification_bridge_v1.ts"
  },
  {
    "git_blob_sha1":"c43338b8b5b2ca4cb43e6d72207b47c1d5cf4109",
    "git_mode":"100644",
    "path":"src/economic/buy_void_observe_and_claim_candidate_watch_v1.ts"
  },
  {
    "git_blob_sha1":"00282023f722dea6aa58d38a7dd9a25a421ce0f8",
    "git_mode":"100644",
    "path":"src/economic/buy_void_observe_and_claim_fixture_canary_gate_v1.ts"
  },
  {
    "git_blob_sha1":"7d1ced8dacb50fd7c7b708fd6587ed7930332bb3",
    "git_mode":"100644",
    "path":"src/economic/buy_void_operator_local_intent_v1.ts"
  },
  {
    "git_blob_sha1":"eb4fb37c6073415228b312663c45a99d5015c727",
    "git_mode":"100644",
    "path":"src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts"
  },
  {
    "git_blob_sha1":"d9abe2d601c27bdc76b6a945c293a50e9f7c6051",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_history_projection_v1.ts"
  },
  {
    "git_blob_sha1":"836f9a5d8ee8f121fc1c5b04ec7e3b8a5dcd295d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_history_terminal_projection_v1.ts"
  },
  {
    "git_blob_sha1":"029cfb2500d7ce5b644e02b8d94ee126e8f59f8a",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_broadcast_reconciliation_v1.ts"
  },
  {
    "git_blob_sha1":"d184aef61760e4f0109b016d6f5331e93136048d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_chain2050_broadcaster_v1.ts"
  },
  {
    "git_blob_sha1":"b68a9e39cf5548f065042f590c58b341020cce7e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_chain2050_inspection_v1.ts"
  },
  {
    "git_blob_sha1":"9e753c04f1127b440c28675199ae2c1f97a0f077",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_custodian_broadcast_v1.ts"
  },
  {
    "git_blob_sha1":"b20e6574abb56be8ae11d73974edda45e54a0b9a",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.ts"
  },
  {
    "git_blob_sha1":"2ff9274880db4c5e29dbc73acf363f75c6a2b33f",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_custodian_signer_v1.ts"
  },
  {
    "git_blob_sha1":"0e931dbb06857e39a266032d46a82031e4750038",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_claim_v1.ts"
  },
  {
    "git_blob_sha1":"73d3b0daf933ab6c6ab8a9b8ab7766ad4a9e0c8e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_enqueue_v1.ts"
  },
  {
    "git_blob_sha1":"a0c64bee56d38af5e879524ea2ca75f5d2d707a6",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_guarded_broadcast_apply_v1.ts"
  },
  {
    "git_blob_sha1":"e8403ac38af3825fd34a177384c81b81215068a3",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_guarded_broadcast_context_v1.ts"
  },
  {
    "git_blob_sha1":"9a694fe12f275f3ccdb07ee35804c9530d64501f",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_lease_context_v1.ts"
  },
  {
    "git_blob_sha1":"ea2eef3b28b9c598b5e8d3767adffd49b00d6330",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_lease_session_v1.ts"
  },
  {
    "git_blob_sha1":"e69d16a4a9260445399a152608a9c2a3c48a669d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_nonreplayable_postgres_v1.ts"
  },
  {
    "git_blob_sha1":"4e5d9a633b05d9254424c2132fc6620b94ff3692",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts"
  },
  {
    "git_blob_sha1":"f74cafa7665be4ac0ea4fd518ec02440d337fa27",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"1495c6dd21cfda1608ea29885d98617784a04bb0",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_contract_v1.ts"
  },
  {
    "git_blob_sha1":"27045345cf48cacd2a5f2bc9330812579d0761a4",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_v1.ts"
  },
  {
    "git_blob_sha1":"2db30a0d7f343c5c1264d89ec5c752ade609d843",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"066b5d3fde11ec79a8c6bb45f2ec5d6fec511e1f",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts"
  },
  {
    "git_blob_sha1":"7133a3a7ebb9349d195cc090787a134f07616a3e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_postgres_production_config_v1.ts"
  },
  {
    "git_blob_sha1":"88c72330c5a5b92780f2c6add7dda7dd5e92af10",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.ts"
  },
  {
    "git_blob_sha1":"aae34461ac47b3c5cbdecf75e6f6aa5935df677e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.ts"
  },
  {
    "git_blob_sha1":"81185c7829de65a9787cd1cb2237807891706058",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_preparation_recovery_apply_v1.ts"
  },
  {
    "git_blob_sha1":"fe6934db14de4226070f23b0e8a9b2cf6ed447c8",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_renew_v1.ts"
  },
  {
    "git_blob_sha1":"9439e29636019f39a3c0a23e8f76e576874af609",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_runtime_preview_v1.ts"
  },
  {
    "git_blob_sha1":"15b46946268bd1ba5b8fdad1e928b29505e59032",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_dispatcher_v1.ts"
  },
  {
    "git_blob_sha1":"a95a96dba71ff2b9c29a9302f962b6c3996c1c82",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_execution_composition_v1.ts"
  },
  {
    "git_blob_sha1":"9591e194fd86d0c6471fa13d1704b8cc72253b10",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_fulfillment_call_v1.ts"
  },
  {
    "git_blob_sha1":"0b654889dd512775cea0e65fb9d82fa8405cb80d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_fulfillment_receipt_v1.ts"
  },
  {
    "git_blob_sha1":"af2179651a88a74b158e7f3602fc5b3c30701f87",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_full_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"14ff942b2ab7b34ba9da56ac9f534fa2b4910f73",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_guarded_broadcast_v1.ts"
  },
  {
    "git_blob_sha1":"666284ec115c78dbdebfe74130c478d2251a5e6f",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_history_reconciliation_v1.ts"
  },
  {
    "git_blob_sha1":"85ab70a1cee8c236dcab7bbb87cbf324bad49a40",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_plan_reservation_v1.ts"
  },
  {
    "git_blob_sha1":"50252423e30c692d2674639100d59963771267f5",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_preparation_coordinator_v1.ts"
  },
  {
    "git_blob_sha1":"3b06f5d87f1647003348c7459cb3797a3394d343",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_preparation_custody_v1.ts"
  },
  {
    "git_blob_sha1":"f3058ab7a256e243971b6eba17dcb626d9a6d014",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_production_configuration_verifier_v1.ts"
  },
  {
    "git_blob_sha1":"ed1e7f394349a9f404e87b11047adf63bdc99630",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_production_deployment_attestation_v1.ts"
  },
  {
    "git_blob_sha1":"8718a06caaa2b5920adaacb597d943c5dc296d75",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_receipt_evidence_v1.ts"
  },
  {
    "git_blob_sha1":"c99ae75211ebca1874a220402fca56f083176ae9",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_receipt_outcome_v1.ts"
  },
  {
    "git_blob_sha1":"f398bf4dc1b73aee368e3a46e61347df320fe836",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_receipt_reconciliation_v1.ts"
  },
  {
    "git_blob_sha1":"6b431be22a6a9b0ad04539cc7805c41d5f8e65bb",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_runtime_activation_configuration_contract_v1.ts"
  },
  {
    "git_blob_sha1":"bb28e1af885ddc7aad5da375d97fce723a5c7359",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_runtime_adapter_v1.ts"
  },
  {
    "git_blob_sha1":"1c72f07509521a4bc2a57a2865851f623a3955ad",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_runtime_dependency_bootstrap_v1.ts"
  },
  {
    "git_blob_sha1":"c22236f2bc39eab1d9cb4bd3c9f16963f11dd1c4",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_runtime_preflight_v1.ts"
  },
  {
    "git_blob_sha1":"1fa3ef934e7fb534766d82c2718557e0bf56a4af",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_terminal_closeout_v1.ts"
  },
  {
    "git_blob_sha1":"aa2f60c57c4cb8fed280d67397636ddd08a415cc",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_transaction_preparation_v1.ts"
  },
  {
    "git_blob_sha1":"1e774ba0a26eecc1fb633faea8e8c27b4ebf806d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_keyed_unsigned_transaction_v1.ts"
  },
  {
    "git_blob_sha1":"0073818ad6f6418e895bf794024c9d678b3bef86",
    "git_mode":"100644",
    "path":"src/economic/buy_void_payment_rpc_observer_v1.ts"
  },
  {
    "git_blob_sha1":"318aaa6a1534fed0d2ab934a78d2a5de187f7ef8",
    "git_mode":"100644",
    "path":"src/economic/buy_void_pipeline_coordinator_v1.ts"
  },
  {
    "git_blob_sha1":"945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f",
    "git_mode":"100644",
    "path":"src/economic/buy_void_preappend_plain_input_v1.ts"
  },
  {
    "git_blob_sha1":"0a069bea0d41fba075d2558c1c29384e6506ed6e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_broadcast_custody_v1.ts"
  },
  {
    "git_blob_sha1":"e39df18f6b5324ead0707fe20ca7ae13f6b37046",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_broadcaster_chain2050_composition_v1.ts"
  },
  {
    "git_blob_sha1":"e25eccc52d527eb17f06e7cf0e49044b8924b5db",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_broadcaster_inspection_activation_v1.ts"
  },
  {
    "git_blob_sha1":"b944b8e94327c87626d2b51fedcd093a315680cb",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_broadcaster_ipc_v1.ts"
  },
  {
    "git_blob_sha1":"b752b0800b8eaddc6b9670de7173bd7f8ef0f17c",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_broadcaster_submission_activation_v1.ts"
  },
  {
    "git_blob_sha1":"e00140c49701068f8d919b8a3f7765b2aeaa557d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_chain2050_transport_v1.ts"
  },
  {
    "git_blob_sha1":"d25b6d14be580ca3d5f5db5a8239368e5689ab97",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_credential_signer_v1.ts"
  },
  {
    "git_blob_sha1":"475cceb6ce141bab4e5768de96066e5113d39c11",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_custodian_credential_activation_v1.ts"
  },
  {
    "git_blob_sha1":"9c51ea0ff2b7c1235078f81d808f7d991763bd25",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_custodian_credential_composition_v1.ts"
  },
  {
    "git_blob_sha1":"6362ef90471b487858da38e9461b367509c7694f",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_custodian_ipc_v1.ts"
  },
  {
    "git_blob_sha1":"801be43fa0c545864f50db9a9fe1436639b74ebd",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_custody_v1.ts"
  },
  {
    "git_blob_sha1":"fe4cc6b42a93df79ffb260da1f5fcd6fe222754f",
    "git_mode":"100644",
    "path":"src/economic/buy_void_prepared_transaction_plan_reservation_v1.ts"
  },
  {
    "git_blob_sha1":"877006a22cf34a0d31105eaefc4d9a10aace4f54",
    "git_mode":"100644",
    "path":"src/economic/buy_void_presale_fulfillment_deployment_preparation_v1.ts"
  },
  {
    "git_blob_sha1":"41b71626f89f02cd20640125fd28ed212198fa01",
    "git_mode":"100644",
    "path":"src/economic/buy_void_presale_fulfillment_local_gas_evidence_v1.ts"
  },
  {
    "git_blob_sha1":"42af583287bb66516823c0db70692f89e75f997a",
    "git_mode":"100644",
    "path":"src/economic/buy_void_production_activation_plan_v1.ts"
  },
  {
    "git_blob_sha1":"6bb1f6693918420bac78495a39bf49fcf62ac8aa",
    "git_mode":"100644",
    "path":"src/economic/buy_void_production_history_carrier_census_v1.ts"
  },
  {
    "git_blob_sha1":"5eb5aa82487d2e65ea75bd78768739d5757aed8b",
    "git_mode":"100644",
    "path":"src/economic/buy_void_production_live_canary_preflight_v1.ts"
  },
  {
    "git_blob_sha1":"5b5918d4b6167f025ef90a0907aa702d7d83ea3e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_production_preflight_operator_v1.ts"
  },
  {
    "git_blob_sha1":"5ac625dafd411d7be38f70a32b934930cf1a6d7d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_production_private_services_activation_v1.ts"
  },
  {
    "git_blob_sha1":"76b7399aba84bc898645f22b9f420f68e736c030",
    "git_mode":"100644",
    "path":"src/economic/buy_void_production_private_services_operator_v1.ts"
  },
  {
    "git_blob_sha1":"c6bb26dbd00e2a73914baa3c4588e0550397ced9",
    "git_mode":"100644",
    "path":"src/economic/buy_void_production_rpc_readiness_v1.ts"
  },
  {
    "git_blob_sha1":"58c921a1e9efdb3d672aee3dc102369561c42a15",
    "git_mode":"100644",
    "path":"src/economic/buy_void_public_request_under_launch_lock_v1.ts"
  },
  {
    "git_blob_sha1":"4c6fbc8ee586fb9f527895143bf53aabd0150032",
    "git_mode":"100644",
    "path":"src/economic/buy_void_request_tx_hash_binding_v1.ts"
  },
  {
    "git_blob_sha1":"00dad9a345dcbdc9d96bc0f61543f8d0db63e0ac",
    "git_mode":"100644",
    "path":"src/economic/buy_void_runtime_integration_v1.ts"
  },
  {
    "git_blob_sha1":"7fa3a3d6a188cf76624a369c00cda07c07411761",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_broadcast_evidence_journal_v1.ts"
  },
  {
    "git_blob_sha1":"fb1184e1a3cf8fc1d46f327b9df8f38d2f7adebb",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_broadcast_reconciliation_coordinator_v1.ts"
  },
  {
    "git_blob_sha1":"4c3cc20a0784b4893d188a0096ac6e7c0fa371cf",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_broadcast_reconciliation_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"ce832b18f169ed49ef28e48a6cd39076287327cc",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_broadcast_reconciliation_server_policy_v1.ts"
  },
  {
    "git_blob_sha1":"a0972fe68d26cc4e806444d095c66109083361df",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_execute_prepared_transaction_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"698d6150cc08d2768322126be3bf2b41bff64e95",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_prepared_transaction_coordinator_v1.ts"
  },
  {
    "git_blob_sha1":"bab7f00f4eba81efe43f89e0878aeedf5e8d3615",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_terminal_closeout_artifacts_v1.ts"
  },
  {
    "git_blob_sha1":"9236d2edf797deaeebcde709de89f6e968574998",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_terminal_closeout_model_v1.ts"
  },
  {
    "git_blob_sha1":"dbe56f239301530d26c851abe41e35cad32f8acf",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_terminal_closeout_reconstruction_v1.ts"
  },
  {
    "git_blob_sha1":"eb91042de57964dd706c533187f699389b07142c",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_terminal_closeout_runtime_v1.ts"
  },
  {
    "git_blob_sha1":"464292a50f83cbafeb17ff37bc5b3484c6c267f9",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_terminal_closeout_server_policy_v1.ts"
  },
  {
    "git_blob_sha1":"7097faf0dcd2943f2665e28e13c3773359af1bd5",
    "git_mode":"100644",
    "path":"src/economic/buy_void_saga_terminal_closeout_v1.ts"
  },
  {
    "git_blob_sha1":"419054e00f4d96015cd066be81e8719ee71ac00c",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts"
  },
  {
    "git_blob_sha1":"a3dbe4d0fed3034d3ca2c0b3704a758d7c776090",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_finality_authenticated_composition_v3.ts"
  },
  {
    "git_blob_sha1":"64953050d74bc0bc6d1e6948ae992d6143edca99",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_finality_authority_v2.ts"
  },
  {
    "git_blob_sha1":"c23155893efd684073a72a0903b89c72605faad5",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_finality_execution_preflight_v1.ts"
  },
  {
    "git_blob_sha1":"c90eba0e59d340c845a33d1d68c437e1ed63cec1",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_finality_generation_provenance_v4.ts"
  },
  {
    "git_blob_sha1":"0804a50b87c089e2d03bbca716641d7211e6a8bc",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_finality_generation_provenance_v5.ts"
  },
  {
    "git_blob_sha1":"d371b1b08d2afc383d5e4ad831464752843791a3",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_finality_generation_provenance_v6.ts"
  },
  {
    "git_blob_sha1":"390ff1a2ff0437cd8c8693e7807c12275df42573",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_finality_generation_provenance_v7.ts"
  },
  {
    "git_blob_sha1":"73f088779f015a554f16e9eecf8a9fd9de0e1594",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_finality_live_process_binding_v1.ts"
  },
  {
    "git_blob_sha1":"987c97568a4d1b9814218603df48a65dbfeed18f",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_finality_live_process_binding_v2.ts"
  },
  {
    "git_blob_sha1":"5d47cd29929f778b07a59647a80c4384b1497a08",
    "git_mode":"100644",
    "path":"src/economic/buy_void_source_finality_provider_pair_binding_v1.ts"
  },
  {
    "git_blob_sha1":"0ee4e5b5ec8b5653f77dda5b49d5591f42527741",
    "git_mode":"100644",
    "path":"src/economic/buy_void_terminal_closeout_request_lock_v1.ts"
  },
  {
    "git_blob_sha1":"b451bcd895986dadaf6e53954671062068316ccf",
    "git_mode":"100644",
    "path":"src/economic/buy_void_verified_allocation_replay_binding_v1.ts"
  },
  {
    "git_blob_sha1":"d2410a871c0318502654acd2428b2a4366d27185",
    "git_mode":"100644",
    "path":"src/economic/buy_void_verified_payment_capacity_admission_v1.ts"
  },
  {
    "git_blob_sha1":"5a95216e5c264f5b6c1c779a494f2c1ed445801e",
    "git_mode":"100644",
    "path":"src/economic/buy_void_verified_payment_duplicate_guard_v1.ts"
  },
  {
    "git_blob_sha1":"550ede02fc0b7d6874c324af58b5ef9c5591b311",
    "git_mode":"100644",
    "path":"src/economic/buy_void_verified_payment_v2.ts"
  },
  {
    "git_blob_sha1":"6a512f74f3c83c686e995b3cf1bfdeabc5c79140",
    "git_mode":"100644",
    "path":"src/economic/buy_void_web_payment_cross_uid_failure_binding_v1.mjs"
  },
  {
    "git_blob_sha1":"ec4d1bae5ccf1b0cd3a15dfe6f38b7bda69f1a25",
    "git_mode":"100644",
    "path":"src/economic/buy_void_web_payment_cross_uid_lock_validation_v1.mjs"
  },
  {
    "git_blob_sha1":"ae7d4b83f2008e0dc4d06beeaccb47b564bd9321",
    "git_mode":"100644",
    "path":"src/economic/buy_void_web_payment_cross_uid_lock_writer_impl_v1.mjs"
  },
  {
    "git_blob_sha1":"d78e08f9c2a400759d97ad75ab32fcd7067df74b",
    "git_mode":"100644",
    "path":"src/economic/buy_void_web_payment_cross_uid_lock_writer_v1.mjs"
  },
  {
    "git_blob_sha1":"9844dec00c917248067ca4cef1c9f28f83aa5802",
    "git_mode":"100644",
    "path":"src/economic/coupled_native_gas_effective_open_census_v1.ts"
  },
  {
    "git_blob_sha1":"ee1c9c81a037a61d0f5053dfe3c6bd457a4daf9e",
    "git_mode":"100644",
    "path":"src/economic/coupled_native_gas_liability_reconciliation_v1.ts"
  },
  {
    "git_blob_sha1":"cc45bf08b62099ac17b15df7a58e25a86150a79e",
    "git_mode":"100644",
    "path":"src/economic/coupled_native_gas_liability_store_v1.ts"
  },
  {
    "git_blob_sha1":"510114f3e4eff8ec88b9d290fca4335e079f5ee7",
    "git_mode":"100644",
    "path":"src/economic/coupled_native_gas_liability_v1.ts"
  },
  {
    "git_blob_sha1":"5907eee5770527a72f9b3395d5a8f706e72e7809",
    "git_mode":"100644",
    "path":"src/economic/coupled_native_gas_payer_observation_v1.ts"
  },
  {
    "git_blob_sha1":"5360a55bed6fccbe8d0dc242273264f2de94bea1",
    "git_mode":"100644",
    "path":"src/economic/coupled_native_gas_reconciliation_custody_qualification_v1.ts"
  },
  {
    "git_blob_sha1":"5143267b7b7381e1b9e7f561d1832a63308f1fae",
    "git_mode":"100644",
    "path":"src/economic/coupled_native_gas_reconciliation_evidence_resolver_v1.ts"
  },
  {
    "git_blob_sha1":"08841a3db71e5dc31c1c628de72796cf825157a2",
    "git_mode":"100644",
    "path":"src/economic/coupled_native_gas_reconciliation_storage_v1.ts"
  },
  {
    "git_blob_sha1":"67517092b5c94733c50135ef7ce7e5679b641a0e",
    "git_mode":"100644",
    "path":"src/economic/coupled_native_gas_reconciliation_writer_v1.ts"
  },
  {
    "git_blob_sha1":"7fe177f0e5d2e26dc4d32c25077e3f00da609c97",
    "git_mode":"100644",
    "path":"src/economic/coupled_native_gas_terminal_cost_evidence_v1.ts"
  },
  {
    "git_blob_sha1":"6019f20517270ee21bf4900ba4f15cccfb32fd2a",
    "git_mode":"100644",
    "path":"src/economic/participant_postpurchase_raw_submission_v1.ts"
  },
  {
    "git_blob_sha1":"12c9a3f5dc5e3f4465303b25f0a1a997ceff6d1b",
    "git_mode":"100644",
    "path":"src/economic/usdc_wvoid_base_market_v1.ts"
  },
  {
    "git_blob_sha1":"2a9fceab94ba709a1f00fa83c805ee1660c8f8e1",
    "git_mode":"100644",
    "path":"src/economic/wc_process_instance_lock_v1.ts"
  },
  {
    "git_blob_sha1":"dc14e8f93c15202b32c9f51b37fc27473297adf7",
    "git_mode":"100644",
    "path":"src/economic/wc_production_visibility_projection_v1.ts"
  },
  {
    "git_blob_sha1":"ee6823d1e70b23cbcdae8a1df468e2ad787c6db8",
    "git_mode":"100644",
    "path":"src/economic/wc_public_capability_v1.ts"
  },
  {
    "git_blob_sha1":"0656c78f2f3aeb0765aec270435e74be06ff9e1d",
    "git_mode":"100644",
    "path":"src/economic/wc_public_claim_history_authority_v1.ts"
  },
  {
    "git_blob_sha1":"98ac31a7f09aa06d50d875a47a6aef3e4067121c",
    "git_mode":"100644",
    "path":"src/economic/wc_public_earning_pilot_v1.ts"
  },
  {
    "git_blob_sha1":"d7ead43f8359269af8c0f8afb1dac78549c33837",
    "git_mode":"100644",
    "path":"src/economic/wc_public_remote_truth_jsonl_index_v1.ts"
  },
  {
    "git_blob_sha1":"18727620969107e0e69352c02e33270cb5045df8",
    "git_mode":"100644",
    "path":"src/economic/wc_public_state_directory_authority_v1.ts"
  },
  {
    "git_blob_sha1":"7cdba6de0a942a9feded04fc29377606f6d9aee9",
    "git_mode":"100644",
    "path":"src/economic/wc_verified_receipt_acceptance_v1.ts"
  },
  {
    "git_blob_sha1":"d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb",
    "git_mode":"100644",
    "path":"tsconfig.build.json"
  }
]);
const PROTECTED_PARENT_SCOPE_ROW_COUNT=248;
const PROTECTED_PARENT_SCOPE_SHA256="ded88b757c767b0766f96c140f796a86e60cf41933cb3e265755888734c5e30b";
const CURRENT_ECONOMIC_SCOPE_ROW_COUNT=249;
const CURRENT_ECONOMIC_SCOPE_SHA256="067042705f8786619174973a7c175cd2593dd0846a7e41a64cc5ac8633c0d1e8";
const ECONOMIC_SCOPE_PATHS=Object.freeze([
  "src/economic",
  "package.json",
  "package-lock.json",
  "tsconfig.build.json"
]);
const PROVIDER_EVIDENCE_HEAD="bc510343c5c418a75154bedcc445cbf1251dc037";
const PROVIDER_EVIDENCE_TREE="7e21075ccd632ea11f4d424424b348217a013dfe";
const PROVIDER_EVIDENCE="ops/security/buy-void-delivery-dependency-provider-closure-post2865-v1.json";
const PROVIDER_EVIDENCE_BLOB="b08c03912e0f66742f06f314bf5e1f5cad81f20f";
const PROVIDER_CANDIDATE_PROOF="scripts/prove_buy_void_delivery_dependency_provider_closure_v1.mjs";
const PROVIDER_CANDIDATE_PROOF_BLOB="bc9473b4fd79eae50f4e86ca24968d3328cdcf22";
const PROVIDER_SOURCE_ROWS=Object.freeze([
  {
    "git_blob_sha1":"5b23824bf0a0f33b193e1cfc022fcfb5b898b022",
    "git_mode":"100644",
    "path":"src/economic/buy_void_delivery_runtime_integration_v1.ts"
  },
  {
    "git_blob_sha1":"2deaee8ae4e0fbd909b417eef96a76012174c668",
    "git_mode":"100644",
    "path":"src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts"
  },
  {
    "git_blob_sha1":"f84ca60a37c77ae7691ec6970c59f123de4f73b7",
    "git_mode":"100644",
    "path":"src/economic/buy_void_delivery_submission_guard_v1.ts"
  },
  {
    "git_blob_sha1":"158cbf14fa2b566632c096a22e484b651cd44f6d",
    "git_mode":"100644",
    "path":"src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts"
  },
  {
    "git_blob_sha1":"08e8849e1736d20c0737e493853732970c0f31a5",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_chain2050_broadcaster_v1.ts"
  },
  {
    "git_blob_sha1":"05d9094f507ade72591f1e8c4983085c2259f949",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_chain2050_total_deadline_transport_v1.ts"
  },
  {
    "git_blob_sha1":"e5651535bde060c91e988beb324aa8e5621d2857",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.ts"
  },
  {
    "git_blob_sha1":"d110159db9d20a8ce85391f4bdb154b9a6ddefde",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_delivery_dependency_injection_v1.ts"
  },
  {
    "git_blob_sha1":"0999f773bdc4befb3e82676304f0d69f5cab42ef",
    "git_mode":"100644",
    "path":"src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts"
  },
  {
    "git_blob_sha1":"28b50301609c16838903ee49e62ba91cd4660e88",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_chain2050_broadcaster_v1.ts"
  },
  {
    "git_blob_sha1":"5fd9296d10d810b1976c159578f13cca5d1594fe",
    "git_mode":"100644",
    "path":"src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts"
  },
  {
    "git_blob_sha1":"00dad9a345dcbdc9d96bc0f61543f8d0db63e0ac",
    "git_mode":"100644",
    "path":"src/economic/buy_void_runtime_integration_v1.ts"
  }
]);
const PROVIDER_SUPPORT_ROWS=Object.freeze([
  {
    "git_blob_sha1":"15b5c82ea36f13079a2f9e8863722f654eb3f201",
    "git_mode":"100644",
    "path":"package-lock.json"
  },
  {
    "git_blob_sha1":"14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
    "git_mode":"100644",
    "path":"package.json"
  },
  {
    "git_blob_sha1":"bc9473b4fd79eae50f4e86ca24968d3328cdcf22",
    "git_mode":"100644",
    "path":"scripts/prove_buy_void_delivery_dependency_provider_closure_v1.mjs"
  },
  {
    "git_blob_sha1":"d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb",
    "git_mode":"100644",
    "path":"tsconfig.build.json"
  }
]);
const WORKFLOWS=Object.freeze([
  [".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml","CURRENT_PROTECTED_INTEGRATION_DISPATCH_V3","receipt"],
  [".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml","HISTORICAL_V1_REFUSAL_CURRENT_V2_DISPATCH_V3","historical-self-test"],
  [".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml","CURRENT_PROTECTED_INTEGRATION_DISPATCH_V3","receipt"],
  [".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml","CURRENT_PROTECTED_INTEGRATION_DISPATCH_V3","receipt"],
  [".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml","CURRENT_PROTECTED_INTEGRATION_DISPATCH_V3","receipt"],
]);
const EXPECTED_DELTA=Object.freeze([
  ["M",".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml"],
  ["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml"],
  ["M",".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml"],
  ["M",".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml"],
  ["A",".github/workflows/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.yml"],
  ["M",".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml"],
  ["A","docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v3.md"],
  ["A","docs/architecture/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.md"],
  ["M","ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts"],
  ["A","scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs"],
  ["M","scripts/prove_buy_void_source_finality_v7_deployment_receipt_install_v1.ts"],
  ["A","scripts/prove_buy_void_source_finality_v7_deployment_receipt_v3_lock_plan_v1.mjs"],
]);
const NONPROTECTED_ECONOMIC_DELTA=Object.freeze({
  "src/economic/buy_void_public_request_under_launch_lock_v1.ts":"M",
  "src/economic/buy_void_request_custody_read_policy_v1.ts":"A",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts":"M"
});
const NONPROTECTED_ECONOMIC_DRIFT=Object.freeze([
  "src/economic/buy_void_public_request_under_launch_lock_v1.ts",
  "src/economic/buy_void_request_custody_read_policy_v1.ts",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts"
]);
const ARTIFACT_PATHS=Object.freeze([
  "dist/economic/buy_void_auto_fulfillment_v1.js",
  "dist/economic/buy_void_broadcast_outcome_journal_v1.js",
  "dist/economic/buy_void_confirmed_state_journal_v1.js",
  "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
  "dist/economic/buy_void_delivery_runtime_integration_v1.js",
  "dist/economic/buy_void_delivery_sign_broadcast_adapter_v1.js",
  "dist/economic/buy_void_delivery_submission_guard_v1.js",
  "dist/economic/buy_void_erc20_delivery_receipt_reconciler_v1.js",
  "dist/economic/buy_void_erc20_execution_composition_v1.js",
  "dist/economic/buy_void_erc20_transaction_preparation_planner_v1.js",
  "dist/economic/buy_void_execution_attempt_journal_v1.js",
  "dist/economic/buy_void_filesystem_bakery_lock_v1.js",
  "dist/economic/buy_void_fulfillment_confirmation_v1.js",
  "dist/economic/buy_void_fulfillment_journal_v1.js",
  "dist/economic/buy_void_inventory_reservation_journal_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_pipeline_coordinator_v1.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_finality_execution_preflight_v1.js",
  "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
  "dist/economic/buy_void_verified_payment_v2.js",
  "dist/economic/buy_void_source_finality_generation_provenance_v7.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v1.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v2.js",
  "dist/economic/buy_void_source_finality_provider_pair_binding_v1.js",
  "dist/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js",
]);
const STABLE_FIELDS=Object.freeze([
  "dev","ino","mode","nlink","uid","gid","rdev","size","mtimeMs","ctimeMs",
]);
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function run(command,args,{timeout=300000,allowFail=false}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  });
  assert.equal(r.error,undefined,String(r.error||""));
  if(!allowFail)assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args){return String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();}
function treeBlob(ref,relative){return git(["rev-parse",ref+":"+relative]);}
function treeMode(ref,relative){
  const row=git(["ls-tree",ref,"--",relative]);
  const match=row.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(match,"tree_entry_invalid:"+ref+":"+relative);
  assert.equal(match[3],relative,"tree_path_mismatch:"+relative);
  return match[1];
}
function names(a,b,...paths){
  return git(["diff","--name-only",a,b,"--",...paths]).split("\n").filter(Boolean).sort();
}
function treeRows(ref,...paths){
  const raw=git(["ls-tree","-r","--full-tree",ref,"--",...paths]);
  const rows=raw.split("\n").filter(Boolean).map(line=>{
    const [metadata,relative]=line.split("\t");
    const [mode,kind,blob]=metadata.split(" ");
    assert.ok(mode==="100644"||mode==="100755","tree_manifest_mode_invalid:"+relative);
    assert.equal(kind,"blob","tree_manifest_kind_invalid:"+relative);
    assert.match(blob,/^[0-9a-f]{40}$/u,"tree_manifest_blob_invalid:"+relative);
    assert.ok(relative&&!path.isAbsolute(relative)&&!relative.split("/").includes(".."),
      "tree_manifest_path_invalid:"+relative);
    return {path:relative,git_blob_sha1:blob,git_mode:mode};
  }).sort((a,b)=>a.path.localeCompare(b.path,"en"));
  assert.equal(new Set(rows.map(row=>row.path)).size,rows.length,"tree_manifest_path_duplicate");
  return rows;
}
function manifestDriftStatuses(baseline,current){
  const left=new Map(baseline.map(row=>[row.path,row]));
  const right=new Map(current.map(row=>[row.path,row]));
  assert.equal(left.size,baseline.length,"baseline_manifest_path_duplicate");
  assert.equal(right.size,current.length,"current_manifest_path_duplicate");
  const rows=[];
  for(const relative of [...new Set([...left.keys(),...right.keys()])].sort()){
    const before=left.get(relative);
    const after=right.get(relative);
    if(canonical(before??null)===canonical(after??null))continue;
    const status=before===undefined?"A":after===undefined?"D":"M";
    rows.push([relative,status]);
  }
  return Object.fromEntries(rows);
}
function manifestDriftPaths(baseline,current){
  return Object.keys(manifestDriftStatuses(baseline,current)).sort();
}
function read(relative,max=4*1024*1024){
  assert.ok(!path.isAbsolute(relative)&&!relative.split("/").includes(".."),"unsafe_path:"+relative);
  assert.ok(Number.isSafeInteger(max)&&max>0&&max<Number.MAX_SAFE_INTEGER,"max_invalid:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const noFollow=fs.constants.O_NOFOLLOW;
  const nonBlock=fs.constants.O_NONBLOCK;
  assert.equal(typeof noFollow,"number","nofollow_unavailable");
  assert.equal(typeof nonBlock,"number","nonblock_unavailable");
  let fd=-1;
  try{
    fd=fs.openSync(absolute,fs.constants.O_RDONLY|noFollow|nonBlock);
    const opened=fs.fstatSync(fd);
    for(const key of STABLE_FIELDS)assert.equal(opened[key],before[key],"open_drift:"+relative+":"+key);
    const chunks=[]; const scratch=Buffer.alloc(Math.min(64*1024,max+1)); let total=0;
    while(total<=max){
      const remain=max+1-total; if(remain<=0)break;
      const count=fs.readSync(fd,scratch,0,Math.min(scratch.length,remain),null);
      if(count===0)break; chunks.push(Buffer.from(scratch.subarray(0,count))); total+=count;
    }
    assert.ok(total<=max,"file_too_large:"+relative);
    assert.equal(total,opened.size,"short_or_grown_read:"+relative);
    const after=fs.fstatSync(fd);
    for(const key of STABLE_FIELDS)assert.equal(after[key],opened[key],"descriptor_drift:"+relative+":"+key);
    const visible=fs.lstatSync(absolute);
    for(const key of STABLE_FIELDS)assert.equal(visible[key],opened[key],"visible_drift:"+relative+":"+key);
    return Buffer.concat(chunks,total);
  }finally{if(fd>=0)fs.closeSync(fd);}
}
function pin(relative,blob,max=4*1024*1024){
  const bytes=read(relative,max);
  assert.equal(gitBlob(bytes),blob,"git_blob_drift:"+relative);
  assert.equal(treeBlob("HEAD",relative),blob,"head_blob_drift:"+relative);
  return bytes;
}
function sourcePath(artifact){return "src/economic/"+path.basename(artifact,".js")+".ts";}
function verifyScope(){
  git(["cat-file","-e",REPAIR_BASE+"^{commit}"]);
  run("/usr/bin/git",["--no-replace-objects","-C",ROOT,"merge-base","--is-ancestor",REPAIR_BASE,"HEAD"],{timeout:30000});
  const rows=git(["diff","--name-status",REPAIR_BASE,"HEAD"])
    .split("\n").filter(Boolean).map(line=>{const [status,...rest]=line.split("\t");return [status,rest.join("\t")];})
    .sort((a,b)=>a[1].localeCompare(b[1]));
  assert.deepEqual(rows,[...EXPECTED_DELTA].sort((a,b)=>a[1].localeCompare(b[1])),"repair_delta_scope");
}
function verifyFrozenEvidence(){
  pin(FROZEN_DISPATCH_V2,FROZEN_DISPATCH_V2_BLOB,256*1024);
  pin(FROZEN_DISPATCH_V2_DOC,FROZEN_DISPATCH_V2_DOC_BLOB,256*1024);
  pin(CANDIDATE_PROOF,CANDIDATE_PROOF_BLOB,512*1024);
  pin(LOCK_PROOF,LOCK_PROOF_BLOB,512*1024);
  pin(V4_CENSUS_PROOF,V4_CENSUS_PROOF_BLOB,512*1024);
  const candidateBytes=pin(CANDIDATE_FILE,CANDIDATE_BLOB,128*1024);
  assert.equal(candidateBytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(candidateBytes),CANDIDATE_SHA256,"candidate_sha256");
  const candidate=JSON.parse(candidateBytes.toString("utf8"));
  assert.equal(candidate.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3");
  assert.equal(candidate.version,3);
  assert.equal(candidate.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(candidate.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(candidate.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(candidate.complete_executable_closure_verified,true);
  assert.equal(candidate.candidate_enforcement_identity_accepted,false);
  assert.equal(candidate.production_source_finality_authority_ready,false);
  assert.equal(candidate.public_presale_activation,false);
  assert.equal(candidate.funds_movement,false);
  const lockBytes=pin(LOCK_FILE,LOCK_BLOB,128*1024);
  const lock=JSON.parse(lockBytes.toString("utf8"));
  assert.equal(lock.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3");
  assert.equal(lock.version,3);
  assert.equal(lock.candidate_evidence?.git_blob_sha1,CANDIDATE_BLOB);
  assert.equal(lock.candidate_evidence?.sha256,CANDIDATE_SHA256);
  assert.equal(lock.candidate_evidence?.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(lock.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  assert.equal(lock.deployed_artifact_generation_verified,false);
  assert.equal(lock.runtime_mount_authority,false);
  assert.equal(lock.production_source_finality_authority_ready,false);
  assert.equal(lock.public_presale_activation,false);
  assert.equal(lock.funds_movement,false);
  return {candidate,lock};
}
function verifyProtectedCurrentIdentity(candidate){
  const rows=candidate.current_enforcement_tracked_source_inventory_v1;
  assert.ok(Array.isArray(rows)&&rows.length===49,"protected_inventory_rows");
  assert.equal(new Set(rows.map(row=>row.path)).size,49,"protected_path_duplicate");
  let drift=0;
  for(const row of rows){
    const actual=treeBlob("HEAD",row.path);
    if(row.path===TOOL){
      assert.equal(row.git_blob_sha1,TOOL_PREDECESSOR_BLOB,"tool_predecessor_drift");
      assert.equal(actual,TOOL_BLOB,"tool_successor_drift");
      assert.notEqual(actual,row.git_blob_sha1,"tool_transition_missing");
      drift++;
    }else{
      assert.equal(actual,row.git_blob_sha1,"protected_blob_drift:"+row.path);
    }
    assert.equal(treeMode("HEAD",row.path),row.git_mode,"protected_mode_drift:"+row.path);
  }
  assert.equal(drift,1,"reviewed_protected_drift_count");
  assert.equal(sha256(Buffer.from(canonical(rows),"utf8")),PROTECTED_INVENTORY,
    "frozen_protected_inventory_digest_drift");
  assert.equal(candidate.successor_transition?.reviewed_range_index_successor_bound,true,
    "range_index_successor_not_preserved");
  return rows.map(row=>row.path);
}
function verifyReaderRepair(){
  const tool=pin(TOOL,TOOL_BLOB,512*1024).toString("utf8");
  const proof=pin(TOOL_PROOF,TOOL_PROOF_BLOB,512*1024).toString("utf8");
  for(const token of [
    "function readBoundedRegularFileV1(","fs.constants.O_NOFOLLOW","openConstants.O_NONBLOCK","fs.openSync(",
    "fs.fstatSync(","fs.readSync(","maxBytes+1","_size_limit_exceeded:",
    "_open_generation_mismatch:","_descriptor_generation_changed:",
    "_visible_generation_changed:","export function readTrackedFileV1(",
    "MAX_CURRENT_ENFORCEMENT_SOURCE_BYTES_V1",
  ])assert.ok(tool.includes(token),"tool_reader_token_missing:"+token);
  for(const token of [
    "readTrackedFileV1,","proveProductionTrackedFileReadBoundaryV1",
    "production_tracked_file_descriptor_bound=true",
    "production_tracked_file_nofollow=true",
    "production_tracked_file_nonblocking=true",
    "production_tracked_file_max_plus_one_bounded=true",
    "production_tracked_file_replacement_rejected=true",
    "production_tracked_file_symlink_swap_rejected=true",
    "production_tracked_file_fifo_swap_rejected=true",
    "current_enforcement_inventory_uses_bounded_descriptor=true",
  ])assert.ok(proof.includes(token),"tool_proof_token_missing:"+token);
}
function verifyBuiltCensusIdentity(candidate){
  const artifacts=ARTIFACT_PATHS.map(relative=>{const b=read(relative,2*1024*1024);return {path:relative,bytes:b.length,sha256:sha256(b)};});
  const sources=[...new Set(ARTIFACT_PATHS.map(sourcePath))].sort().map(relative=>{
    const b=read(relative,4*1024*1024); const blob=gitBlob(b);
    assert.equal(treeBlob("HEAD",relative),blob,"census_source_head_mismatch:"+relative);
    return {path:relative,bytes:b.length,git_blob_sha1:blob,sha256:sha256(b)};
  });
  assert.equal(artifacts.length,28); assert.equal(sources.length,28);
  assert.equal(sha256(Buffer.from(JSON.stringify(artifacts),"utf8")),candidate.hosted_census_evidence.artifact_inventory_sha256,"hosted_artifact_inventory_drift");
  assert.equal(sha256(Buffer.from(JSON.stringify(sources),"utf8")),candidate.hosted_census_evidence.source_inventory_sha256,"hosted_source_inventory_drift");
  assert.equal(sha256(Buffer.from(canonical(artifacts),"utf8")),candidate.current_inventory_evidence.canonical_artifact_inventory_sha256,"canonical_artifact_inventory_drift");
  assert.equal(sha256(Buffer.from(canonical(sources),"utf8")),candidate.current_inventory_evidence.canonical_source_inventory_sha256,"canonical_source_inventory_drift");
}
function verifyProviderIdentity(){
  const evidence=JSON.parse(pin(PROVIDER_EVIDENCE,PROVIDER_EVIDENCE_BLOB,128*1024).toString("utf8"));
  assert.equal(evidence.marker,"VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_V1");
  assert.equal(evidence.repository_head_sha,PROVIDER_EVIDENCE_HEAD);
  assert.equal(evidence.repository_tree_sha,PROVIDER_EVIDENCE_TREE);
  assert.equal(evidence.provider_closure_sha256,"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945");
  assert.equal(evidence.provider_static_module_closure_verified,true);
  assert.equal(evidence.dynamic_module_loader_present,false);
  assert.equal(PROVIDER_SOURCE_ROWS.length,12,"provider_source_manifest_count");
  assert.equal(PROVIDER_SUPPORT_ROWS.length,4,"provider_support_manifest_count");
  assert.deepEqual(
    evidence.provider_source_paths,
    PROVIDER_SOURCE_ROWS.map(row=>row.path),
    "provider_source_path_manifest_drift",
  );
  const support=Object.fromEntries(PROVIDER_SUPPORT_ROWS.map(row=>[row.path,row]));
  assert.equal(Object.keys(support).length,PROVIDER_SUPPORT_ROWS.length,"provider_support_path_duplicate");
  assert.equal(evidence.package_json_git_blob_sha1,support["package.json"].git_blob_sha1,
    "provider_package_json_manifest_drift");
  assert.equal(evidence.package_lock_git_blob_sha1,support["package-lock.json"].git_blob_sha1,
    "provider_package_lock_manifest_drift");
  assert.equal(PROVIDER_CANDIDATE_PROOF_BLOB,support[PROVIDER_CANDIDATE_PROOF].git_blob_sha1,
    "provider_candidate_proof_manifest_drift");
  for(const row of [...PROVIDER_SOURCE_ROWS,...PROVIDER_SUPPORT_ROWS]){
    assert.deepEqual(Object.keys(row).sort(),["git_blob_sha1","git_mode","path"],
      "provider_manifest_row_shape:"+row.path);
    assert.match(row.git_blob_sha1,/^[0-9a-f]{40}$/u,"provider_manifest_blob_invalid:"+row.path);
    assert.ok(row.git_mode==="100644"||row.git_mode==="100755",
      "provider_manifest_mode_invalid:"+row.path);
    pin(row.path,row.git_blob_sha1,4*1024*1024);
    assert.equal(treeMode("HEAD",row.path),row.git_mode,"provider_manifest_mode_drift:"+row.path);
  }
  const identities=[evidence.server_runtime_identity,evidence.delivery_consumer_identity,evidence.delivery_adapter_identity,...evidence.provider_runtime_artifacts];
  const seen=new Set();
  for(const identity of identities){
    if(seen.has(identity.path))continue; seen.add(identity.path);
    const bytes=read(identity.path,2*1024*1024);
    assert.equal(bytes.length,identity.bytes,"provider_artifact_bytes_drift:"+identity.path);
    assert.equal(sha256(bytes),identity.sha256,"provider_artifact_sha256_drift:"+identity.path);
  }
  return evidence;
}
function verifyEconomicDrift(candidate){
  assert.match(PROTECTED_PARENT,/^[0-9a-f]{40}$/u,"protected_parent_identity_invalid");
  assert.match(PROTECTED_PARENT_TREE,/^[0-9a-f]{40}$/u,"protected_parent_tree_invalid");
  assert.match(PROTECTED_PARENT_ECONOMIC_TREE,/^[0-9a-f]{40}$/u,
    "protected_parent_economic_tree_invalid");
  assert.equal(PROTECTED_PARENT_SCOPE_ROWS.length,PROTECTED_PARENT_SCOPE_ROW_COUNT,
    "protected_parent_scope_row_count");
  assert.equal(
    sha256(Buffer.from(canonical(PROTECTED_PARENT_SCOPE_ROWS),"utf8")),
    PROTECTED_PARENT_SCOPE_SHA256,
    "protected_parent_scope_manifest_digest_drift",
  );
  const current=treeRows("HEAD",...ECONOMIC_SCOPE_PATHS);
  assert.equal(current.length,CURRENT_ECONOMIC_SCOPE_ROW_COUNT,
    "current_economic_scope_row_count");
  assert.equal(
    sha256(Buffer.from(canonical(current),"utf8")),
    CURRENT_ECONOMIC_SCOPE_SHA256,
    "current_economic_scope_manifest_digest_drift",
  );
  const driftStatuses=manifestDriftStatuses(PROTECTED_PARENT_SCOPE_ROWS,current);
  assert.deepEqual(driftStatuses,NONPROTECTED_ECONOMIC_DELTA,
    "unexpected_post_census_economic_delta");
  const baselineByPath=new Map(PROTECTED_PARENT_SCOPE_ROWS.map(row=>[row.path,row]));
  const currentByPath=new Map(current.map(row=>[row.path,row]));
  for(const [relative,status] of Object.entries(driftStatuses)){
    const before=baselineByPath.get(relative);
    const after=currentByPath.get(relative);
    if(status==="M"){
      assert.ok(before&&after,"post_census_modify_shape_drift:"+relative);
      assert.equal(before.git_mode,after.git_mode,"post_census_mode_drift:"+relative);
    }else if(status==="A"){
      assert.equal(before,undefined,"post_census_add_baseline_present:"+relative);
      assert.ok(after,"post_census_add_current_missing:"+relative);
      assert.equal(after.git_mode,"100644","post_census_added_mode_drift:"+relative);
    }else{
      assert.fail("post_census_status_unreviewed:"+relative+":"+status);
    }
  }
  const drift=Object.keys(driftStatuses).sort();
  assert.deepEqual(drift,NONPROTECTED_ECONOMIC_DRIFT,
    "unexpected_post_census_economic_drift_paths");
  const protectedSet=new Set(candidate.current_enforcement_tracked_source_inventory_v1.map(row=>row.path));
  for(const relative of drift)assert.equal(protectedSet.has(relative),false,
    "allowed_drift_entered_protected_inventory:"+relative);
}
function workflowAssertionVariableCounts(text,field){
  const pattern=new RegExp(
    "assert\\.equal\\(\\s*([A-Za-z_$][A-Za-z0-9_$]*)\\."+
      field+"\\s*,\\s*true\\s*\\);",
    "g",
  );
  const found=new Map();
  for(const match of text.matchAll(pattern)){
    found.set(match[1],(found.get(match[1])||0)+1);
  }
  return found;
}
function verifyWorkflowDispatchText(relative,marker,contract,text){
  assert.ok(text.includes(marker),"workflow_dispatch_marker_missing:"+relative);
  assert.ok(text.includes(SELF),"workflow_dispatch_proof_missing:"+relative);
  assert.equal(text.includes("node "+FROZEN_DISPATCH_V2),false,
    "workflow_dispatch_v2_invocation_remains:"+relative);
  assert.equal(text.includes(".reviewed_range_index_successor_bound"),false,
    "workflow_stale_reader_successor_assertion:"+relative);
  if(contract==="receipt"){
    assert.ok(text.includes("node "+SELF+" --receipt"),
      "workflow_receipt_invocation_missing:"+relative);
    const fields=[
      "reviewed_deployment_reader_successor_bound",
      "workflow_dispatch_contracts_bound",
      "production_tracked_file_nonblocking",
      "production_tracked_file_fifo_swap_rejected",
    ];
    const counts=new Map(fields.map(field=>[
      field,workflowAssertionVariableCounts(text,field),
    ]));
    const successors=counts.get(fields[0]);
    assert.ok(successors.size>0,
      "workflow_reader_assertion_variable_missing:"+relative);
    for(const [variable,requiredCount] of successors){
      for(const field of fields.slice(1)){
        const actualCount=counts.get(field).get(variable)||0;
        assert.ok(actualCount>=requiredCount,
          "workflow_reader_assertion_missing:"+relative+":"+variable+":"+
            field+":expected_at_least="+requiredCount+":actual="+actualCount);
      }
    }
    return;
  }
  if(contract==="historical-self-test"){
    assert.ok(text.includes("node "+SELF+" --self-test"),
      "workflow_historical_self_test_missing:"+relative);
    assert.equal(text.includes("node "+SELF+" --receipt"),false,
      "workflow_historical_receipt_invocation_forbidden:"+relative);
    assert.equal(
      workflowAssertionVariableCounts(
        text,"reviewed_deployment_reader_successor_bound",
      ).size,
      0,
      "workflow_historical_fake_receipt_assertion:"+relative,
    );
    assert.ok(text.includes("current_v2_generation_verified=true"),
      "workflow_historical_generation_marker_missing:"+relative);
    return;
  }
  assert.fail("workflow_dispatch_contract_unreviewed:"+relative+":"+contract);
}
function proveWorkflowDispatchContractFixtures(){
  const [receiptRelative,receiptMarker,receiptContract]=WORKFLOWS[0];
  const receipt=[
    receiptMarker,
    "node "+SELF+" --receipt > receipt.json",
    "assert.equal(c.reviewed_deployment_reader_successor_bound,true);",
    "assert.equal(c.workflow_dispatch_contracts_bound,true);",
    "assert.equal(c.production_tracked_file_nonblocking,true);",
    "assert.equal(c.production_tracked_file_fifo_swap_rejected,true);",
  ].join("\n");
  verifyWorkflowDispatchText(
    receiptRelative,receiptMarker,receiptContract,receipt,
  );
  assert.throws(
    ()=>verifyWorkflowDispatchText(
      receiptRelative,receiptMarker,receiptContract,
      receipt.replace(
        "assert.equal(c.production_tracked_file_fifo_swap_rejected,true);",
        "assert.equal(v.production_tracked_file_fifo_swap_rejected,true);",
      ),
    ),
    /workflow_reader_assertion_missing/u,
  );
  const [historicalRelative,historicalMarker,historicalContract]=WORKFLOWS[1];
  const historical=[
    historicalMarker,
    "node "+SELF+" --self-test",
    "current_v2_generation_verified=true",
  ].join("\n");
  verifyWorkflowDispatchText(
    historicalRelative,historicalMarker,historicalContract,historical,
  );
  assert.throws(
    ()=>verifyWorkflowDispatchText(
      historicalRelative,historicalMarker,historicalContract,
      historicalMarker+"\n"+SELF+"\ncurrent_v2_generation_verified=true",
    ),
    /workflow_historical_self_test_missing/u,
  );
}
function verifyWorkflowDispatch(){
  proveWorkflowDispatchContractFixtures();
  for(const [relative,marker,contract] of WORKFLOWS){
    const text=read(relative,512*1024).toString("utf8");
    verifyWorkflowDispatchText(relative,marker,contract,text);
  }
}
function verify(){
  verifyScope();
  const frozen=verifyFrozenEvidence();
  const protectedPaths=verifyProtectedCurrentIdentity(frozen.candidate);
  verifyReaderRepair();
  verifyBuiltCensusIdentity(frozen.candidate);
  const provider=verifyProviderIdentity();
  verifyEconomicDrift(frozen.candidate);
  verifyWorkflowDispatch();
  return Object.freeze({
    schema:"void_buy_void_repaired_v7_v2_current_generation_dispatch_v3",
    marker:"VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V3",
    version:3,
    repository:"6ZoSo9/void-node",
    repair_base:REPAIR_BASE,
    protected_path_count:protectedPaths.length,
    protected_path_identity_preserved:false,
    frozen_protected_inventory_preserved:true,
    reviewed_protected_drift_count:1,
    reviewed_deployment_reader_predecessor_blob:TOOL_PREDECESSOR_BLOB,
    reviewed_deployment_reader_current_blob:TOOL_BLOB,
    reviewed_deployment_reader_successor_bound:true,
    workflow_dispatch_contracts_bound:true,
    production_tracked_file_nonblocking:true,
    production_tracked_file_fifo_swap_rejected:true,
    reviewed_range_index_successor_preserved:true,
    frozen_candidate_json_sha256:CANDIDATE_SHA256,
    frozen_candidate_enforcement_set_sha256:CANDIDATE_SET,
    frozen_candidate_rederived_on_current_head:false,
    frozen_lock_identity_preserved:true,
    current_built_census_identity_matches_frozen_v4:true,
    frozen_v4_census_proof_preserved:true,
    provider_source_path_count:provider.provider_source_paths.length,
    provider_source_identity_preserved:true,
    provider_source_blob_manifest_bound:true,
    provider_historical_commit_object_required:false,
    protected_parent_scope_manifest_bound:true,
    protected_parent_scope_delta_status_bound:true,
    protected_parent_historical_commit_object_required:false,
    protected_parent_scope_row_count:PROTECTED_PARENT_SCOPE_ROWS.length,
    nonprotected_economic_drift_count:NONPROTECTED_ECONOMIC_DRIFT.length,
    provider_built_artifact_identity_preserved:true,
    current_generation_integration_verified:true,
    candidate_enforcement_identity_accepted:true,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--workflow-contract-self-test"){
  proveWorkflowDispatchContractFixtures();
  console.log("VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V3_WORKFLOW_CONTRACT_SELF_TEST_GREEN");
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const receipt=verify();
  assert.equal(receipt.nonprotected_economic_drift_count,NONPROTECTED_ECONOMIC_DRIFT.length);
  assert.equal(receipt.frozen_v4_census_proof_preserved,true);
  console.log("VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V3_GREEN");
  console.log("protected_path_identity_preserved="+receipt.protected_path_identity_preserved);
  console.log("frozen_protected_inventory_preserved="+receipt.frozen_protected_inventory_preserved);
  console.log("reviewed_protected_drift_count="+receipt.reviewed_protected_drift_count);
  console.log("reviewed_deployment_reader_successor_bound="+receipt.reviewed_deployment_reader_successor_bound);
  console.log("workflow_dispatch_contracts_bound="+receipt.workflow_dispatch_contracts_bound);
  console.log("production_tracked_file_nonblocking=true");
  console.log("production_tracked_file_fifo_swap_rejected=true");
  console.log("protected_path_count="+receipt.protected_path_count);
  console.log("provider_source_identity_preserved="+receipt.provider_source_identity_preserved);
  console.log("provider_source_blob_manifest_bound="+receipt.provider_source_blob_manifest_bound);
  console.log("provider_historical_commit_object_required=false");
  console.log("protected_parent_scope_manifest_bound=true");
  console.log("protected_parent_scope_delta_status_bound=true");
  console.log("protected_parent_historical_commit_object_required=false");
  console.log("protected_parent_scope_row_count="+receipt.protected_parent_scope_row_count);
  console.log("nonprotected_economic_drift_count="+receipt.nonprotected_economic_drift_count);
  console.log("current_built_census_identity_matches_frozen_v4="+receipt.current_built_census_identity_matches_frozen_v4);
  console.log("frozen_v4_census_proof_preserved="+receipt.frozen_v4_census_proof_preserved);
  console.log("frozen_candidate_rederived_on_current_head=false");
  console.log("current_generation_integration_verified=true");
  console.log("deployment_or_runtime_authority=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else if(args.length===1&&args[0]==="--receipt"){
  process.stdout.write(JSON.stringify(verify(),null,2)+"\n");
}else{
  throw new Error("usage: prove_buy_void_repaired_v7_v2_current_generation_dispatch_v3.mjs [--workflow-contract-self-test|--self-test|--receipt]");
}
