import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
  classifyVoidWcVoidCoupledLaunchReadinessV1,
} from "../../tools/void-wc-void-coupled-launch-readiness-v1.mjs";

export const VOID_BUY_COUPLED_LAUNCH_ID_V1 =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRODUCTION = "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED = "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR = "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";

function read(relativePath) {
  const value = JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
  );
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("buy_launch_source_invalid");
  }
  return value;
}

export function classifyBuyLaunchGateV1({ production, coupled, successor }) {
  let decision = null;
  try {
    decision = classifyVoidWcVoidCoupledLaunchReadinessV1({
      production_candidate: production,
      coupled_candidate: coupled,
      successor_migration_candidate: successor,
    });
  } catch {
    decision = null;
  }

  const ready =
    decision?.ok === true &&
    decision.status === "SOURCE_READY" &&
    decision.marker === VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1 &&
    decision.activation_authority === false &&
    decision.funding_authority === false &&
    decision.market_activation_authorized === false &&
    decision.public_presale_activation_authorized === false &&
    decision.funds_movement_authorized === false &&
    coupled?.shared_post_discovery_reconciliation?.coupled_launch_id ===
      VOID_BUY_COUPLED_LAUNCH_ID_V1;

  return Object.freeze({
    ready,
    id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    reason: ready ? null : "canonical_coupled_launch_source_not_ready",
  });
}

export function readBuyLaunchGateV1() {
  try {
    return classifyBuyLaunchGateV1({
      production: read(PRODUCTION),
      coupled: read(COUPLED),
      successor: read(SUCCESSOR),
    });
  } catch {
    return Object.freeze({
      ready: false,
      id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
      reason: "canonical_coupled_launch_source_unavailable",
    });
  }
}
