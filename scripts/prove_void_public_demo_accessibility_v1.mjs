#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const target = "public/demo/index.html";
const source = fs.readFileSync(target, "utf8");

function requireDemoAccessibility(html) {
  assert.match(
    html,
    /<label\s+class="field-label"\s+for="jobMsg">Job message<\/label>/u,
    "job message field must have a visible label bound to jobMsg",
  );
  assert.match(
    html,
    /<textarea\s+id="jobMsg"\s+name="message"\s+rows="5">/u,
    "job message textarea must preserve its bound id and stable form name",
  );
  assert.match(
    html,
    /<span class="sr-only">Node health: <\/span><span id="healthDot" class="dot"><\/span><span id="healthLabel">unknown<\/span><\/span>/u,
    "health status must retain an explicit accessible subject",
  );
  assert.match(
    html,
    /<span class="pill" role="status" aria-live="polite" aria-atomic="true"><span class="sr-only">Node health: <\/span><span id="healthDot"/u,
    "health changes must be exposed as an atomic polite status",
  );
  assert.match(
    html,
    /<span id="submitState" class="pill" role="status" aria-live="polite" aria-atomic="true"><span class="sr-only">Job submission: <\/span>/u,
    "submission changes must include an explicit accessible subject",
  );
  assert.match(
    html,
    /<pre id="resultBox" role="status" aria-live="polite" aria-atomic="true">No result yet\.<\/pre>/u,
    "result and error text must be exposed as an atomic polite status",
  );
  assert.match(
    html,
    /\.btn:focus-visible,textarea:focus-visible\s*\{[\s\S]*?outline:3px solid var\(--accent\);[\s\S]*?outline-offset:3px;/u,
    "keyboard focus must remain visibly distinct on demo controls",
  );
}

requireDemoAccessibility(source);

const negativeMutations = [
  {
    name: "broken_label_target",
    html: source.replace('for="jobMsg"', 'for="missing-job-message"'),
    error: /visible label bound to jobMsg/u,
  },
  {
    name: "broken_textarea_id",
    html: source.replace('id="jobMsg" name="message"', 'id="job-message" name="message"'),
    error: /bound id and stable form name/u,
  },
  {
    name: "missing_submit_status",
    html: source.replace(
      'id="submitState" class="pill" role="status"',
      'id="submitState" class="pill"',
    ),
    error: /submission changes/u,
  },
  {
    name: "missing_result_live_region",
    html: source.replace(
      'id="resultBox" role="status" aria-live="polite"',
      'id="resultBox" role="status"',
    ),
    error: /result and error text/u,
  },
  {
    name: "missing_health_subject",
    html: source.replace('<span class="sr-only">Node health: </span>', ""),
    error: /health status must retain an explicit accessible subject/u,
  },
  {
    name: "missing_submission_subject",
    html: source.replace('<span class="sr-only">Job submission: </span>', ""),
    error: /submission changes must include an explicit accessible subject/u,
  },
  {
    name: "missing_focus_indicator",
    html: source.replace("outline:3px solid var(--accent);", "outline:none;"),
    error: /keyboard focus/u,
  },
];

for (const mutation of negativeMutations) {
  assert.throws(
    () => requireDemoAccessibility(mutation.html),
    mutation.error,
    mutation.name + " must be rejected",
  );
}

console.log("VOID_PUBLIC_DEMO_ACCESSIBILITY_V1_GREEN");
console.log("visible_job_message_label=true");
console.log("health_status_live=true");
console.log("submit_status_live=true");
console.log("result_error_status_live=true");
console.log("keyboard_focus_visible=true");
console.log("negative_mutations=7");
