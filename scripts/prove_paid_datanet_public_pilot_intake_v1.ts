import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const MARKER = "VOID_PAID_DATANET_PUBLIC_PILOT_INTAKE_V1";
const ISSUE_PATH =
  ".github/ISSUE_TEMPLATE/paid-datanet-pilot-intake-v1.yml";
const DOC_PATH =
  "docs/commercial/paid-datanet-public-pilot-intake-v1.md";
const WORKFLOW_PATH =
  ".github/workflows/paid-datanet-public-pilot-intake-v1.yml";

const issue = readFileSync(ISSUE_PATH, "utf8");
const docs = readFileSync(DOC_PATH, "utf8");
const workflow = readFileSync(WORKFLOW_PATH, "utf8");

let assertions = 0;

function ok(value, message = undefined) {
  assert.ok(value, message);
  assertions += 1;
}

function equal(actual, expected, message = undefined) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function deepEqual(actual, expected, message = undefined) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function includes(text, expected, message = undefined) {
  assert.ok(text.includes(expected), message ?? `missing ${expected}`);
  assertions += 1;
}

function notIncludes(text, forbidden, message = undefined) {
  assert.ok(!text.includes(forbidden), message ?? `forbidden ${forbidden}`);
  assertions += 1;
}

function count(text, pattern) {
  return text.split(pattern).length - 1;
}

function blocks(text) {
  const lines = text.split("\n");
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.startsWith("  - type: ")) {
      starts.push(index);
    }
  }

  return starts.map((start, position) => {
    const end = starts[position + 1] ?? lines.length;
    return lines.slice(start, end).join("\n");
  });
}

function blockId(block) {
  return block.match(/^\s+id:\s+([A-Za-z0-9_-]+)\s*$/m)?.[1] ?? null;
}

function blockType(block) {
  return block.match(/^  - type:\s+([A-Za-z0-9_-]+)\s*$/m)?.[1] ?? null;
}

function getBlock(id) {
  const found = issueBlocks.find((block) => blockId(block) === id);
  assert.ok(found, `missing issue form block ${id}`);
  assertions += 1;
  return found;
}

function hasTrailingWhitespace(text) {
  return text.split("\n").some((line) => /[ \t]+$/.test(line));
}

for (const [name, text] of [
  ["issue", issue],
  ["docs", docs],
  ["workflow", workflow],
]) {
  ok(text.length > 100, `${name} must not be empty`);
  equal(text.includes("\r"), false, `${name} must use LF line endings`);
  equal(text.includes("\t"), false, `${name} must not contain tabs`);
  equal(hasTrailingWhitespace(text), false, `${name} must not contain trailing whitespace`);
  equal(text.endsWith("\n"), true, `${name} must end with newline`);
}

equal(count(issue, MARKER), 1);
equal(count(docs, MARKER), 1);
equal(count(workflow, MARKER), 0);

includes(issue, "name: Paid DataNet pilot request");
includes(
  issue,
  "description: Request a bounded paid DataNet service using public or customer-authorized data.",
);
includes(issue, 'title: "[Paid DataNet Pilot]: "');
includes(issue, "**This issue is public.**");
includes(issue, "without downloading a node");
includes(issue, "Do not post passwords, API keys, private keys, seed phrases");
includes(issue, "Marker: `VOID_PAID_DATANET_PUBLIC_PILOT_INTAKE_V1`");

const issueBlocks = blocks(issue);
equal(issueBlocks.length, 13);

const types = issueBlocks.map(blockType);
deepEqual(types, [
  "markdown",
  "dropdown",
  "input",
  "input",
  "input",
  "input",
  "textarea",
  "textarea",
  "input",
  "dropdown",
  "textarea",
  "markdown",
  "checkboxes",
]);

const ids = issueBlocks.map(blockId).filter((value) => value !== null);
deepEqual(ids, [
  "service_code",
  "public_project_name",
  "requester_reference",
  "object_count",
  "total_bytes",
  "public_object_references",
  "desired_outcome",
  "desired_completion_window",
  "budget_readiness",
  "additional_public_context",
  "acknowledgements",
]);
equal(new Set(ids).size, ids.length);

const requiredIds = [
  "service_code",
  "public_project_name",
  "requester_reference",
  "object_count",
  "total_bytes",
  "public_object_references",
  "desired_outcome",
  "desired_completion_window",
  "budget_readiness",
];

for (const id of requiredIds) {
  const block = getBlock(id);
  includes(block, "validations:");
  includes(block, "required: true");
}

const optionalContext = getBlock("additional_public_context");
notIncludes(optionalContext, "validations:");
includes(optionalContext, "Optional public context");
includes(optionalContext, "Do not include secrets or private data.");

const serviceBlock = getBlock("service_code");
equal(blockType(serviceBlock), "dropdown");
includes(serviceBlock, "Select the bounded service you want quoted.");
const serviceOptions = [
  "datanet.object-integrity-check.v1 — DataNet Object Integrity Check",
  "datanet.public-retrieval-evidence.v1 — DataNet Public Retrieval Evidence",
  "datanet.dataset-replication-audit.v1 — DataNet Dataset Replication Audit",
];
for (const option of serviceOptions) {
  equal(count(serviceBlock, option), 1);
}
equal(count(serviceBlock, "        - "), 3);

const budgetBlock = getBlock("budget_readiness");
equal(blockType(budgetBlock), "dropdown");
includes(budgetBlock, "This form does not collect payment.");
includes(budgetBlock, "Ready to receive a deterministic quote");
includes(budgetBlock, "Exploring pricing before deciding");
equal(count(budgetBlock, "        - "), 2);

const inputIds = issueBlocks
  .filter((block) => blockType(block) === "input")
  .map(blockId);
deepEqual(inputIds, [
  "public_project_name",
  "requester_reference",
  "object_count",
  "total_bytes",
  "desired_completion_window",
]);

const textareaIds = issueBlocks
  .filter((block) => blockType(block) === "textarea")
  .map(blockId);
deepEqual(textareaIds, [
  "public_object_references",
  "desired_outcome",
  "additional_public_context",
]);

for (const forbiddenId of [
  "email",
  "phone",
  "wallet",
  "wallet_address",
  "password",
  "api_key",
  "private_key",
  "seed_phrase",
  "payment_card",
  "payment_credential",
  "private_dataset",
  "secret",
]) {
  equal(ids.includes(forbiddenId), false);
}

const objectRefs = getBlock("public_object_references");
includes(objectRefs, "List public URLs, content identifiers, or manifest references only.");
includes(objectRefs, "Do not paste private data or credentials.");
includes(objectRefs, "https://example.org/public-object-1");
includes(objectRefs, "sha256:0123456789abcdef...");

const objectCount = getBlock("object_count");
includes(objectCount, "Enter a whole number.");
includes(objectCount, 'placeholder: "Example: 12"');

const totalBytes = getBlock("total_bytes");
includes(totalBytes, "whole-number estimate");
includes(totalBytes, 'placeholder: "Example: 10485760"');

const acknowledgements = getBlock("acknowledgements");
equal(blockType(acknowledgements), "checkboxes");
equal(count(acknowledgements, "        - label:"), 5);
equal(count(acknowledgements, "          required: true"), 5);
includes(acknowledgements, "may be publicly visible");
includes(acknowledgements, "I confirm I have not included passwords");
includes(acknowledgements, "I have the right to submit every referenced object");
includes(
  acknowledgements,
  "submission does not create a contract, collect payment, guarantee acceptance, or authorize work",
);
includes(
  acknowledgements,
  "provide approved payment instructions separately, verify payment evidence, and explicitly admit the work before execution",
);

notIncludes(issue, "type: file");
notIncludes(issue, "type: upload");
notIncludes(issue, "type: password");
notIncludes(issue, "type: contact");
notIncludes(issue, "labels:");
notIncludes(issue, "assignees:");
notIncludes(issue, "projects:");

const pricingLines = [
  "Object Integrity Check: $2.50 base + $0.25 per object + $0.02 per billable MiB",
  "Public Retrieval Evidence: $4.00 base + $0.50 per object + $0.03 per billable MiB",
  "Dataset Replication Audit: $12.00 base + $0.10 per object + $0.01 per billable MiB",
];
for (const line of pricingLines) {
  equal(count(issue, line), 1);
  equal(count(docs, line), 1);
}

includes(issue, "configured margin floor");
includes(docs, "configured minimum margin floor");

includes(docs, "# Paid DataNet Public Pilot Intake V1");
includes(docs, "## Public offer");
includes(docs, "## No node download required");
includes(docs, "without downloading or operating a VOID node");
includes(docs, "public GitHub issue form");
includes(docs, "does not request an email address, phone number, wallet address");
includes(docs, "## Eligible requests");
includes(docs, "public URLs");
includes(docs, "public content identifiers");
includes(docs, "public manifests");
includes(docs, "published SHA-256 digests");
includes(docs, "public replica declarations");
includes(docs, "## Do not post secrets");
includes(docs, "A request containing unsafe material should be closed without quoting or execution.");
includes(docs, "## Manual bounded workflow");
includes(docs, "The operator provides approved payment instructions separately.");
includes(docs, "Payment evidence is verified outside the public issue.");
includes(docs, "Submission alone does not create a contract");
includes(docs, "## Commercial controls");
includes(docs, "Payment collection in the issue form: disabled.");
includes(docs, "Automatic execution: disabled.");
includes(docs, "Work Credit mutation: disabled.");
includes(docs, "Treasury access: disabled.");
includes(docs, "Secret submission: forbidden.");
includes(docs, "Operator approval before work: required.");
includes(docs, "Verified payment evidence before approved work: required.");
includes(docs, "## Service limits");
includes(docs, "`datanet.object-integrity-check.v1` | 32 | 268,435,456");
includes(docs, "`datanet.public-retrieval-evidence.v1` | 16 | 134,217,728");
includes(docs, "`datanet.dataset-replication-audit.v1` | 256 | 2,147,483,648");
includes(docs, "## Public intake path");
includes(docs, "**Paid DataNet pilot request** issue form");
includes(docs, "does not execute code, upload datasets, accept secrets, or process payment");

for (const serviceCode of [
  "datanet.object-integrity-check.v1",
  "datanet.public-retrieval-evidence.v1",
  "datanet.dataset-replication-audit.v1",
]) {
  ok(count(issue, serviceCode) >= 1);
  ok(count(docs, serviceCode) >= 1);
}

for (const forbiddenClaim of [
  "payment collection enabled",
  "automatic execution enabled",
  "guaranteed acceptance",
  "guaranteed completion",
  "investment",
  "profit",
  "yield",
]) {
  equal(issue.toLowerCase().includes(forbiddenClaim), false);
  equal(docs.toLowerCase().includes(forbiddenClaim), false);
}

includes(workflow, "name: paid-datanet-public-pilot-intake-v1");
includes(workflow, "pull_request:");
includes(workflow, "push:");
includes(workflow, "branches:");
includes(workflow, "- main");
includes(workflow, "permissions:");
includes(workflow, "contents: read");
includes(workflow, "runs-on: ubuntu-latest");
includes(workflow, "timeout-minutes: 10");
includes(workflow, "uses: actions/checkout@v4");
includes(workflow, "uses: actions/setup-node@v4");
includes(workflow, 'node-version: "20"');
includes(workflow, 'cache: "npm"');
includes(workflow, "run: npm ci");
includes(workflow, "npx --no-install tsx");
includes(workflow, "scripts/prove_paid_datanet_public_pilot_intake_v1.ts");

for (const path of [
  ISSUE_PATH,
  DOC_PATH,
  "scripts/prove_paid_datanet_public_pilot_intake_v1.ts",
  WORKFLOW_PATH,
]) {
  equal(count(workflow, `"${path}"`), 2);
}

equal(count(workflow, "paths:"), 2);
equal(count(workflow, "jobs:"), 1);
equal(count(workflow, "prove:"), 1);
equal(count(workflow, "Install dependencies"), 1);
equal(count(workflow, "Prove public pilot intake"), 1);

ok(assertions >= 180);

console.log(
  JSON.stringify(
    {
      marker: MARKER,
      assertion_count: assertions,
      issue_form_blocks: issueBlocks.length,
      input_field_count: inputIds.length,
      textarea_field_count: textareaIds.length,
      service_count: serviceOptions.length,
      acknowledgement_count: 5,
      public_customer_intake_enabled: true,
      node_download_required: false,
      secret_submission_allowed: false,
      payment_collection_enabled: false,
      execution_performed_by_form: false,
      automatic_execution_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
