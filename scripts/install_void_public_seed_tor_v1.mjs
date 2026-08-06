#!/usr/bin/env node
import process from "node:process";
import { pathToFileURL } from "node:url";
import { canonicalFuturePath } from "./lib/void_public_seed_tor_install_contract_v1.mjs";
import { renderTorSeedV1 } from "./lib/void_public_seed_tor_install_build_v1.mjs";
import { executeTorSeedInstallerV1 } from "./lib/void_public_seed_tor_install_runtime_v1.mjs";

export { canonicalFuturePath, renderTorSeedV1 };

const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invoked) {
  executeTorSeedInstallerV1(process.argv.slice(2)).catch((error) => {
    console.error(`VOID_PUBLIC_SEED_TOR_INSTALLER_V1_FAIL: ${error?.stack || error}`);
    process.exit(1);
  });
}
