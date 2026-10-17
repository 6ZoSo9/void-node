#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_V1 =
  "VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_V1";
export const VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_SCHEMA_V1 =
  "void_external_paid_work_opening_lineage_v1";

export const VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_SOURCE_BLOBS_V1 =
  Object.freeze({
    "scripts/agent_paid_work_credential_request_intake_v1.ts":
      "bc2a74934c224026fba703920299768fde713a28",
    "scripts/agent_paid_work_credential_request_review_queue_v1.ts":
      "e084e88ce2420740db3adf7ce7a2949941f7e9f0",
    "scripts/agent_paid_work_canonical_remote_credential_issuance_v1.mjs":
      "7f72f5ca4fda5dd7d122866ce76d79ad00662a4e",
    "scripts/agent_paid_work_credential_registry_v1.ts":
      "4dbb76b46abd38a9c84c77991c3b0b7344294eb7",
    "scripts/agent_paid_work_credential_wc_account_binding_lifecycle_v1.mjs":
      "460fea591810124e4559785b83c33795d99adcda",
    "tools/void-cloudflare-origin-proxy-v2-source-v1.mjs":
      "851f794c99c2ba5eb48b89db6541a1e995710461",
    "ops/public/void-public-frontdoor-v1.mjs":
      "176f4a99c42ac3432d5797efaebf851cc0503737",
    "ops/public/void-public-app-composition-gateway-v1.mjs":
      "b086b612fe5ee1dc1d5bcc4838d926af890d1435",
    "ops/void-ai-agent-public-gateway-v1.mjs":
      "058aa319fda0af78e044e278b099471db2e07cf6",
    "scripts/agent_paid_work_submission_receiver_v1.ts":
      "7236b5bc241240b8af1b5f7748113e84fe1265b4",
    "scripts/external_agent_paid_work_fresh_canary_credential_live_transport_adapters_v1.ts":
      "6b777b650e4647cb13a2de757573a28d2109825c",
    "scripts/external_agent_paid_work_fresh_canary_credential_live_stage_commands_v1.ts":
      "6169b00af9d8aaca6cbbad2413e7b9ef4407f458",
    "scripts/external_agent_paid_work_fulfillment_fresh_canary_credential_lifecycle_and_wc_binding_v1.ts":
      "1e1909d5c5b5406e916149e62aa108cb5f1225cb",
    "scripts/external_agent_paid_work_fulfillment_orchestrator_v1.ts":
      "b45a8b891644dd06eb467ab0996725269213bc4f",
    "scripts/external_agent_paid_work_fulfillment_executor_receive_and_run_v1.ts":
      "a133bbbd6f4e43fc83b2de7d37abf1d4f562b81c",
    "scripts/external_agent_paid_work_fulfillment_return_package_acceptance_and_adapter_finalize_v1.ts":
      "7a6d60afa3ffa6f0ce7a9d59664a95a7bcc07efe",
    "scripts/agent_paid_work_wc_earning_adapter_cli_v1.ts":
      "2f964fc7a326998c7f5049bf4715f3b5c4add111",
    "src/economic/agent_paid_work_wc_earning_adapter_v1.ts":
      "c6bff48b452b6d517c66a6abbccd96411218be44",
    "scripts/void_wc_void_opening_production_wc_capacity_census_v1.ts":
      "a8d520e3ba5f62a558ca8fab855c3efe785cbc48",
    "public/public-node/agents/paid-work-v1.json":
      "4506a78d8acfc0637ea1abb740d95040cee2404d",
  });

export const VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1 =
  Object.freeze({
    credential_request:
      "/__void/agents/paid-work/credential-requests/v1",
    authenticated_submission:
      "/__void/agents/paid-work/submissions/v1",
  });

export const VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    source_lineage_bound: true,
    opening_eligibility_policy_changed: false,
    credential_request_operator_review_required: true,
    credential_scope_agent_paid_work_submit_required: true,
    credential_request_source_authenticated_ingress_bound: true,
    authenticated_submission_exact_ingress_bound: true,
    authenticated_submission_bearer_credential_required: true,
    authenticated_submission_payload_digest_required: true,
    outer_frontdoor_transport_generic: true,
    generic_agents_namespace_proxy_authorized: false,
    agents_namespace_siblings_fail_closed: true,
    submission_transport_source_identity_required: false,
    fixed_award_wc: 3,
    live_runtime_observed: false,
    public_readiness_verified: false,
    external_agent_runtime_onboarding_available: false,
    external_agent_paid_work_execution_available: false,
    credential_issuance: false,
    credential_registry_mutation: false,
    work_dispatch: false,
    work_execution: false,
    wc_award_authorized: false,
    wc_ledger_write: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    wc_void_market_activation: false,
    funds_movement: false,
  });

function canonicalize(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("external_paid_work_lineage_noncanonical_number");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = canonicalize(value[key]);
    }
    return output;
  }
  throw new Error("external_paid_work_lineage_noncanonical_value");
}

function sha256Utf8(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function canonicalVoidExternalPaidWorkOpeningLineageV1(value) {
  return JSON.stringify(canonicalize(value));
}

export function buildVoidExternalPaidWorkOpeningLineageV1() {
  const material = {
    schema: VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_SCHEMA_V1,
    marker: VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_V1,
    version: 1,
    status: "SOURCE_LINEAGE_QUALIFIED_NOT_LIVE",
    reviewed_source_main:
      "086272ba9add8065160a891eb0ac37cc1345cadd",
    credential_scope: "agent_paid_work_submit",
    fixed_award_wc: 3,
    routes: VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1,
    ingress: {
      credential_request: {
        transport:
          "cloudflare_source_authenticated_sensitive_route",
        exact_path:
          VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1
            .credential_request,
        operator_review_required: true,
      },
      authenticated_submission: {
        transport:
          "ordinary_frontdoor_to_exact_agents_namespace_route",
        exact_path:
          VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_ROUTES_V1
            .authenticated_submission,
        bearer_credential_required: true,
        payload_sha256_required: true,
        outer_frontdoor_transport_generic: true,
        composition_route_exact: true,
        sibling_agents_namespace_routes_fail_closed: true,
        generic_agents_namespace_proxy_authorized: false,
      },
    },
    stages: [
      "credential_request_intake",
      "operator_review_queue",
      "canonical_remote_credential_issuance",
      "credential_registry_authentication",
      "credential_wc_account_binding",
      "authenticated_submission_intake",
      "fresh_canary_transport",
      "fresh_canary_credential_lifecycle",
      "bounded_fulfillment_orchestration",
      "executor_receive_and_run",
      "return_package_acceptance",
      "wc_earning_adapter_finalization",
      "opening_capacity_provenance",
    ],
    source_blobs:
      VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_SOURCE_BLOBS_V1,
    authority:
      VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_AUTHORITY_V1,
  };
  const lineage_id =
    "voidapwopeninglineage1_" +
    sha256Utf8(
      canonicalVoidExternalPaidWorkOpeningLineageV1(material),
    );
  return Object.freeze({
    ...material,
    lineage_id,
  });
}
