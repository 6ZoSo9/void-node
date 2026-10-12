#!/usr/bin/env node
import process from "node:process";
import {
  classifyReachability,
  loadObservationFile,
} from "./lib/void_p2p_reachability_classification_contract_v1.mjs";

const MARKER = "VOID_P2P_REACHABILITY_CLASSIFICATION_CONTRACT_V1_VERIFY";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  let observations = "";
  let now = "";
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--observations") {
      index += 1;
      observations = argv[index] || "";
    } else if (argument === "--now") {
      index += 1;
      now = argv[index] || "";
    } else if (argument === "--help" || argument === "-h") {
      console.log("Usage: node scripts/verify_void_p2p_reachability_classification_contract_v1.mjs --observations /absolute/observations.json [--now ISO8601]");
      process.exit(0);
    } else fail(`unknown argument ${argument}`);
  }
  if (!observations) fail("--observations is required");
  return { observations, now };
}

try {
  const args = parseArgs(process.argv.slice(2));
  const loaded = loadObservationFile(args.observations);
  const nowMs = args.now ? Date.parse(args.now) : Date.now();
  if (!Number.isFinite(nowMs)) fail("--now is not a valid timestamp");
  const record = classifyReachability(loaded.observations, { nowMs });
  console.log(`${MARKER}_GREEN`);
  console.log(`record_id=${record.record_id}`);
  console.log(`subject_node_id=${record.subject_node_id}`);
  console.log(`candidate_address=${record.candidate_address}`);
  console.log(`classification=${record.classification}`);
  console.log(`fresh_observations=${record.counts.fresh_observations}`);
  console.log(`independent_success_domains=${record.counts.independent_success_domains}`);
  console.log("nat_type_inferred=false");
  console.log("relay_required_inferred=false");
  console.log("runtime_integration_performed=false");
  console.log("network_calls_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} catch (error) {
  fail(error?.stack || error?.message || String(error));
}
