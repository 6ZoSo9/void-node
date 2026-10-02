#!/usr/bin/env node
import {
  VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1,
  promoteWcVoidBoundedCanaryCandidatesV1,
} from "./void-wc-void-bounded-canary-candidate-promotion-v1.mjs";
import {
  promoteWcVoidBoundedCanarySemanticV1,
} from "./void-wc-void-bounded-canary-semantic-promotion-v1.mjs";
import {
  classifyVoidWcVoidProductionReadinessV1,
} from "./void-wc-void-production-readiness-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "./void-coupled-economic-successor-gate-v1.mjs";

export const VOID_WC_VOID_BOUNDED_CANARY_REVIEWED_EXECUTION_V1 =
  "VOID_WC_VOID_BOUNDED_CANARY_REVIEWED_EXECUTION_V1";

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function summarize(decision) {
  return Object.freeze({
    ok: decision?.ok === true,
    status: typeof decision?.status === "string" ? decision.status : "UNKNOWN",
    reason: typeof decision?.reason === "string" ? decision.reason : null,
    missing_gates: Object.freeze(
      Array.isArray(decision?.missing_gates) ? [...decision.missing_gates] : [],
    ),
  });
}

export function executeVoidWcVoidBoundedCanaryReviewedV1(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("BOUNDED_CANARY_REVIEWED_REQUEST_INVALID");
  }
  const operation = String(request.operation || "");
  if (operation === "prepare") {
    const semantic = promoteWcVoidBoundedCanarySemanticV1(
      request.semantic_promotion_request,
    );
    const semanticBytes = prettyBytes(semantic);
    const promotion = promoteWcVoidBoundedCanaryCandidatesV1({
      repository_head_sha: request.repository_head_sha,
      repository_tree_sha: request.repository_tree_sha,
      semantic_promotion_bytes: semanticBytes,
      semantic_promotion_file_sha256:
        request.semantic_promotion_file_sha256_rederived,
      production_candidate_bytes:
        Buffer.from(request.production_candidate_base64, "base64"),
      production_candidate_file_sha256:
        request.production_candidate_file_sha256,
      coupled_candidate_bytes:
        Buffer.from(request.coupled_candidate_base64, "base64"),
      coupled_candidate_file_sha256:
        request.coupled_candidate_file_sha256,
      successor_candidate_bytes:
        Buffer.from(request.successor_candidate_base64, "base64"),
      successor_candidate_file_sha256:
        request.successor_candidate_file_sha256,
    });
    const productionBefore =
      classifyVoidWcVoidProductionReadinessV1(request.production_candidate);
    const productionAfter =
      classifyVoidWcVoidProductionReadinessV1(
        promotion.promoted_production_candidate,
      );
    const coupledBefore =
      classifyVoidCoupledEconomicSuccessorGateV1(
        request.coupled_candidate,
        request.successor_candidate,
      );
    const coupledAfter =
      classifyVoidCoupledEconomicSuccessorGateV1(
        promotion.promoted_coupled_candidate,
        request.successor_candidate,
      );
    return Object.freeze({
      marker: VOID_WC_VOID_BOUNDED_CANARY_REVIEWED_EXECUTION_V1,
      operation,
      semantic,
      semantic_pretty_base64: semanticBytes.toString("base64"),
      promotion,
      promotion_contract: Object.freeze({
        marker: VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1,
        authority: VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_AUTHORITY_V1,
      }),
      production_before: summarize(productionBefore),
      production_after: summarize(productionAfter),
      coupled_before: summarize(coupledBefore),
      coupled_after: summarize(coupledAfter),
    });
  }
  if (operation === "classify") {
    return Object.freeze({
      marker: VOID_WC_VOID_BOUNDED_CANARY_REVIEWED_EXECUTION_V1,
      operation,
      production: summarize(
        classifyVoidWcVoidProductionReadinessV1(
          request.production_candidate,
        ),
      ),
      coupled: summarize(
        classifyVoidCoupledEconomicSuccessorGateV1(
          request.coupled_candidate,
          request.successor_candidate,
        ),
      ),
    });
  }
  throw new Error("BOUNDED_CANARY_REVIEWED_OPERATION_INVALID");
}
