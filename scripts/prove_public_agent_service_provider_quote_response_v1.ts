import fs from "node:fs";
import path from "node:path";
import {
  materializePublicAgentServiceProviderQuoteResponseV1,
  validatePublicAgentServiceProviderQuoteResponseV1,
  verifyPublicAgentServiceProviderQuoteResponseV1,
} from "./public_agent_service_provider_quote_response_v1.js";
import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function readJson(relative: string): unknown {
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(!fileStat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(fileStat.isFile(), `regular file required: ${relative}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function readText(relative: string): string {
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(!fileStat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(fileStat.isFile(), `regular file required: ${relative}`);
  return fs.readFileSync(resolved, "utf8");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectReject(
  label: string,
  action: () => unknown,
): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assertCondition(rejected, `${label} was not rejected`);
}

const inputPath =
  "examples/public-agent-service-provider-quote-response-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-provider-quote-response-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-provider-quote-response-v1.md";
const adapterPath =
  "scripts/public_agent_service_provider_quote_response_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-provider-quote-response-v1.yml";
const quoteDocsPath =
  "docs/public/agent-paid-work-quote-envelope-v1.md";
const credentialDocsPath =
  "docs/operators/agent-paid-work-credential-registry-v1.md";
const quoteSchemaPath =
  "schemas/agent-paid-work-quote-envelope-v1.schema.json";
const acceptanceSchemaPath =
  "schemas/agent-paid-work-acceptance-envelope-v1.schema.json";
const catalogPath =
  "ops/public/agent-services-v1/catalog.json";

const input = readJson(inputPath);
const catalog = readJson(catalogPath);
validatePublicAgentServiceProviderQuoteResponseV1(input);

const packet =
  materializePublicAgentServiceProviderQuoteResponseV1(
    input,
    catalog,
  );
verifyPublicAgentServiceProviderQuoteResponseV1(
  input,
  catalog,
  packet,
);

assertCondition(
  packet.marker
    === "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_PACKET_V1",
  "response packet marker mismatch",
);
assertCondition(
  packet.response_id === "voidawqr1_00e4cb3c90ac2de2016aee3b13cd87bd7b2d52bb6cfbad018bc379b829868f9c",
  "response_id changed",
);
assertCondition(
  /^voidawqr1_[0-9a-f]{64}$/.test(packet.response_id),
  "response_id format mismatch",
);
assertCondition(
  packet.status === "example_only",
  "example fixture must remain example_only",
);
assertCondition(
  packet.source.handoff_id
    === "voidawqh1_3be866b0d325662b37f505dec27069e620553a6a9bc855540d3c490e2c07c3cf",
  "handoff_id changed",
);
assertCondition(
  packet.source.work_order_id
    === "voidawo1_a328fbbee6ea0822c8fe5212e19cba23b889c489a39235a2529243d8f19fc106",
  "work_order_id changed",
);
assertCondition(
  packet.source.submission_id
    === "voidawsr1_797d2e02a13f783fdfe3844d9231fd9bfa1c21b62dd850188903e2b934068e16",
  "submission_id changed",
);
assertCondition(
  packet.source.request_sha256
    === "31b9590cb9802cd35449290a2663e996b90ad114180f6c207349f04ed321c8cc",
  "request_sha256 changed",
);
assertCondition(
  packet.source.receipt_id
    === "voidawsi1_1111111111111111111111111111111111111111111111111111111111111111",
  "receipt_id changed",
);
assertCondition(
  packet.source.quote_id === "voidawq1_c3ccb95c186dbd39557a0356bd77cabf3949a6544e93653e738074e69d9b701f",
  "quote_id changed",
);
assertCondition(
  packet.provider_claim.provider_id
    === "void.provider.example.datanet.verify",
  "provider claim changed",
);
assertCondition(
  packet.provider_claim.capability_id
    === "datanet.fetch_verify",
  "provider capability changed",
);
assertCondition(
  packet.authentication.mode
    === "unverified_declarative_provider",
  "authentication mode changed",
);
assertCondition(
  packet.authentication.provider_authentication_verified === false,
  "provider authentication was falsely verified",
);
assertCondition(
  packet.authentication.separately_authenticated_transport_required
    === true,
  "separate provider authentication requirement disappeared",
);
assertCondition(
  packet.acceptance_gate.eligible_for_acceptance === false,
  "response became acceptance eligible",
);
assertCondition(
  packet.acceptance_gate.reason
    === "provider_authentication_required",
  "acceptance-gate reason changed",
);
assertCondition(
  Object.values(packet.authority).every((value) => value === false),
  "response packet granted authority",
);

const reorderedInput = {
  quote_envelope: (input as Record<string, unknown>).quote_envelope,
  quote_handoff_input:
    (input as Record<string, unknown>).quote_handoff_input,
  response_nonce: (input as Record<string, unknown>).response_nonce,
  version: (input as Record<string, unknown>).version,
  marker: (input as Record<string, unknown>).marker,
};
const reordered =
  materializePublicAgentServiceProviderQuoteResponseV1(
    reorderedInput,
    catalog,
  );
assertCondition(
  reordered.response_id === packet.response_id,
  "input key order changed response_id",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(packet),
  "input key order changed response packet",
);

const changedNonce = clone(input) as Record<string, unknown>;
changedNonce.response_nonce =
  "provider-quote-response-packet-20300101-0002";
const changedNoncePacket =
  materializePublicAgentServiceProviderQuoteResponseV1(
    changedNonce,
    catalog,
  );
assertCondition(
  changedNoncePacket.response_id !== packet.response_id,
  "changed response nonce did not change response_id",
);
assertCondition(
  changedNoncePacket.source.quote_id === packet.source.quote_id,
  "changed response nonce changed quote_id",
);

const externalInput = clone(input) as Record<string, unknown>;
(
  externalInput.quote_handoff_input as Record<string, unknown>
).evidence_mode = "external_receiver_receipt";
const externalPacket =
  materializePublicAgentServiceProviderQuoteResponseV1(
    externalInput,
    catalog,
  );
assertCondition(
  externalPacket.status === "provider_authentication_required",
  "external response did not require provider authentication",
);
assertCondition(
  externalPacket.acceptance_gate.eligible_for_acceptance === false,
  "external unverified response became acceptance eligible",
);

const badQuoteId = clone(input) as Record<string, unknown>;
(
  badQuoteId.quote_envelope as Record<string, unknown>
).quote_id = "voidawq1_" + "0".repeat(64);
expectReject("mismatched quote_id", () =>
  materializePublicAgentServiceProviderQuoteResponseV1(
    badQuoteId,
    catalog,
  ),
);

const badWorkOrder = clone(input) as Record<string, unknown>;
(
  badWorkOrder.quote_envelope as Record<string, unknown>
).work_order_id = "voidawo1_" + "0".repeat(64);
expectReject("mismatched quote work_order_id", () =>
  materializePublicAgentServiceProviderQuoteResponseV1(
    badWorkOrder,
    catalog,
  ),
);

const badCapability = clone(input) as Record<string, unknown>;
(
  (
    badCapability.quote_envelope as Record<string, unknown>
  ).provider as Record<string, unknown>
).capability_id = "other.capability";
expectReject("mismatched provider capability", () =>
  materializePublicAgentServiceProviderQuoteResponseV1(
    badCapability,
    catalog,
  ),
);

const excessiveTotal = clone(input) as Record<string, unknown>;
(
  (
    excessiveTotal.quote_envelope as Record<string, unknown>
  ).commercial as Record<string, unknown>
).total = "6.00";
expectReject("quote above requester maximum", () =>
  materializePublicAgentServiceProviderQuoteResponseV1(
    excessiveTotal,
    catalog,
  ),
);

const badOutputs = clone(input) as Record<string, unknown>;
(
  (
    badOutputs.quote_envelope as Record<string, unknown>
  ).execution_commitment as Record<string, unknown>
).output_labels = ["different.json"];
expectReject("mismatched quote outputs", () =>
  materializePublicAgentServiceProviderQuoteResponseV1(
    badOutputs,
    catalog,
  ),
);

const falseTerm = clone(input) as Record<string, unknown>;
(
  (
    falseTerm.quote_envelope as Record<string, unknown>
  ).terms as Record<string, unknown>
).provider_authentication_required = false;
expectReject("removed provider authentication requirement", () =>
  materializePublicAgentServiceProviderQuoteResponseV1(
    falseTerm,
    catalog,
  ),
);

const tamperedPacket = clone(packet);
tamperedPacket.acceptance_gate.eligible_for_acceptance = true;
expectReject("tampered response packet", () =>
  verifyPublicAgentServiceProviderQuoteResponseV1(
    input,
    catalog,
    tamperedPacket,
  ),
);

const schema = readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_SCHEMA_V1",
  "response schema marker mismatch",
);

const docs = readText(docsPath).replace(/\s+/g, " ");
const adapter = readText(adapterPath);
const workflow = readText(workflowPath);
const quoteDocs = readText(quoteDocsPath)
  .replace(/\s+/g, " ")
  .replace(/`/g, "");
const credentialDocs = readText(credentialDocsPath)
  .replace(/\s+/g, " ")
  .replace(/`/g, "");
const quoteSchema = readText(quoteSchemaPath);
const acceptanceSchema = readText(acceptanceSchemaPath);

assertCondition(
  docs.includes(
    "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_V1",
  ),
  "response docs marker missing",
);
assertCondition(
  docs.includes("provider authentication remains unverified"),
  "response docs authentication boundary missing",
);
assertCondition(
  docs.includes("not eligible for acceptance"),
  "response docs acceptance boundary missing",
);
assertCondition(
  quoteDocs.includes("provider_id is declarative"),
  "existing quote provider identity boundary changed",
);
assertCondition(
  quoteDocs.includes("separately signed transport"),
  "existing quote transport-authentication boundary changed",
);
assertCondition(
  credentialDocs.includes("exactly one scope: agent_paid_work_submit"),
  "credential registry scope changed",
);
assertCondition(
  credentialDocs.includes(
    "does not select a provider, create a quote",
  ),
  "credential registry provider/quote boundary changed",
);
assertCondition(
  quoteSchema.includes(
    '"const": "VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1"',
  ),
  "quote schema marker changed",
);
assertCondition(
  quoteSchema.includes('"provider_authentication_required"'),
  "quote provider-authentication requirement changed",
);
assertCondition(
  acceptanceSchema.includes('"payment_authorization_granted"')
    && acceptanceSchema.includes('"const": false'),
  "acceptance payment boundary changed",
);
assertCondition(
  workflow.includes(
    "prove_public_agent_service_provider_quote_response_v1.ts",
  ),
  "workflow proof command missing",
);
assertCondition(
  /uses:\s*actions\/checkout@v4\s+with:\s+fetch-depth:\s*0/.test(
    workflow,
  ),
  "workflow must use full-history checkout",
);
assertCondition(
  !/from\s+["']node:(?:http|https|net|tls|child_process)["']/.test(
    adapter,
  ),
  "response adapter imports network or subprocess authority",
);
assertCondition(
  !/\bfetch\s*\(/.test(adapter),
  "response adapter performs an HTTP request",
);

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_ADAPTER_V1",
      input_marker:
        "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_V1",
      output_marker:
        "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_PACKET_V1",
      response_id: packet.response_id,
      status: packet.status,
      catalog_fingerprint_sha256:
        packet.source.catalog_fingerprint_sha256,
      handoff_id: packet.source.handoff_id,
      work_order_id: packet.source.work_order_id,
      submission_id: packet.source.submission_id,
      request_sha256: packet.source.request_sha256,
      receipt_id: packet.source.receipt_id,
      quote_id: packet.source.quote_id,
      provider_id: packet.provider_claim.provider_id,
      capability_id: packet.provider_claim.capability_id,
      quote_asset: packet.quote_envelope.commercial.quote_asset,
      total: packet.quote_envelope.commercial.total,
      provider_authentication_verified: false,
      eligible_for_acceptance: false,
      provider_selection: false,
      provider_authentication: false,
      quote_generation: false,
      quote_submission: false,
      quote_acceptance: false,
      payment_authorization: false,
      payment_execution: false,
      work_dispatch: false,
      http_submission: false,
      credential_change: false,
      runtime_mutation: false,
      money_movement: false,
      proof: "green",
    },
    null,
    2,
  ),
);
