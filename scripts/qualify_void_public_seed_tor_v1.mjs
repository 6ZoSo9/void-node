#!/usr/bin/env node
import process from "node:process";
import { pathToFileURL } from "node:url";
export {
  buildTorQualificationReceiptV1,
  validateObservationV1,
} from "./lib/void_public_seed_tor_qualification_contract_v1.mjs";
export { qualifyTorSeedV1 } from "./lib/void_public_seed_tor_qualification_runtime_v1.mjs";
import { executeTorSeedQualificationV1 } from "./lib/void_public_seed_tor_qualification_runtime_v1.mjs";

const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invoked) {
  executeTorSeedQualificationV1(process.argv.slice(2)).catch((error) => {
    console.error(`VOID_PUBLIC_SEED_TOR_QUALIFICATION_V1_FAIL: ${error?.stack || error}`);
    process.exit(1);
  });
}
