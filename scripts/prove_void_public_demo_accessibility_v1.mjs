#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const target = "public/demo/index.html";
const sourceBytes = fs.readFileSync(target);
const source = sourceBytes.toString("utf8");
const REVIEWED_HTML_GIT_BLOB = "6f31d5951febd95f5b618f54e9d4fd64d74bed83";

function gitBlobSha1(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

assert.equal(
  gitBlobSha1(sourceBytes),
  REVIEWED_HTML_GIT_BLOB,
  "public demo HTML bytes must match the reviewed bounded-announcement generation",
);

const allowedLiveRegionTags = Object.freeze([
  '<span class="pill" role="status" aria-live="polite" aria-atomic="true"><span class="sr-only">Node health: </span><span id="healthDot" class="dot"></span><span id="healthLabel">unknown</span></span>',
  '<span id="submitState" class="pill" role="status" aria-live="polite" aria-atomic="true"><span class="sr-only">Job submission: </span><span id="submitDot" class="dot"></span><span id="submitLabel">idle</span></span>',
  '<div id="resultStatus" class="pill mb" role="status" aria-live="polite" aria-atomic="true"><span class="sr-only">Job result: </span><span id="resultStatusLabel">No result yet.</span></div>',
]);

function countExact(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function requireResultPayloadOutsideLiveAncestors(html) {
  const resultMarkup = '<pre id="resultBox">No result yet.</pre>';
  const resultIndex = html.indexOf(resultMarkup);
  assert.notEqual(resultIndex, -1, "full result payload element must exist");

  const prefix = html.slice(0, resultIndex);
  const liveAttributeCount =
    (prefix.match(/(?:\s|\/)(?:role|aria-live)\s*=/giu) ?? []).length;
  assert.equal(
    liveAttributeCount,
    6,
    "full result payload must not be nested inside a live region",
  );

  assert.equal(
    countExact(html, "<body>"),
    1,
    "result source contract requires the exact body ancestor",
  );
  assert.equal(
    countExact(html, '<div class="wrap">'),
    1,
    "result source contract requires the exact wrap ancestor",
  );

  for (const tag of allowedLiveRegionTags) {
    assert.equal(
      countExact(prefix, tag),
      1,
      "only the three reviewed bounded status regions may precede resultBox",
    );
  }

  const resultSection = [
    '    <section class="card mt">',
    '      <h2>Latest Result</h2>',
    '      ' + allowedLiveRegionTags[2],
    '      ' + resultMarkup,
    '    </section>',
  ].join("\n");
  assert.equal(
    countExact(html, resultSection),
    1,
    "full result payload must remain in the exact reviewed result section",
  );

  assert.doesNotMatch(
    prefix,
    /<\s*output\b/iu,
    "implicit status output must not precede resultBox",
  );
}

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
    /<div id="resultStatus" class="pill mb" role="status" aria-live="polite" aria-atomic="true"><span class="sr-only">Job result: <\/span><span id="resultStatusLabel">No result yet\.<\/span><\/div>/u,
    "result changes must use a dedicated atomic polite status with an explicit subject",
  );
  assert.match(
    html,
    /<pre id="resultBox">No result yet\.<\/pre>/u,
    "full result payload must remain outside live regions",
  );
  requireResultPayloadOutsideLiveAncestors(html);
  assert.match(
    html,
    /\$\("resultBox"\)\.textContent = JSON\.stringify\(j, null, 2\);\s*\$\("resultStatusLabel"\)\.textContent = "Result ready\.";/u,
    "successful payloads must use a concise result-ready announcement",
  );
  assert.match(
    html,
    /\$\("resultBox"\)\.textContent = "Timed out waiting for result\.";\s*\$\("resultStatusLabel"\)\.textContent = "Timed out waiting for result\.";\s*return false;/u,
    "timeout announcement must remain bound to the polling-expiry result update",
  );
  assert.match(
    html,
    /\$\("resultBox"\)\.textContent = "Submitting\.\.\.";\s*\$\("resultStatusLabel"\)\.textContent = "Submitting job\.";/u,
    "submission announcement must remain bound to the submitting result update",
  );
  assert.match(
    html,
    /\$\("resultBox"\)\.textContent = String\(e\);\s*\$\("resultStatusLabel"\)\.textContent = "Job failed\.";/u,
    "error details must use a concise failure announcement",
  );
  assert.doesNotMatch(
    html,
    /\$\("resultStatusLabel"\)\.textContent = (?:JSON\.stringify\(|String\()/u,
    "live result status must not receive unbounded payload or error text",
  );
  assert.match(
    html,
    /\.btn:focus-visible,textarea:focus-visible\s*\{[\s\S]*?outline:3px solid var\(--accent\);[\s\S]*?outline-offset:3px;/u,
    "keyboard focus must remain visibly distinct on demo controls",
  );
}

requireDemoAccessibility(source);

for (const dynamicMutation of [
  source.replace(
    "</script>",
    'const liveAttribute = "role";\n$("resultBox").parentElement.setAttribute(liveAttribute, "status");\n</script>',
  ),
  source.replace(
    "</script>",
    'const liveAttribute = "aria-live";\n$("resultBox").parentElement.setAttribute(liveAttribute, "polite");\n</script>',
  ),
]) {
  assert.notEqual(
    gitBlobSha1(Buffer.from(dynamicMutation, "utf8")),
    REVIEWED_HTML_GIT_BLOB,
    "computed live-region mutation must invalidate the reviewed HTML blob",
  );
}

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
    name: "missing_result_status_live_region",
    html: source.replace(
      'id="resultStatus" class="pill mb" role="status" aria-live="polite"',
      'id="resultStatus" class="pill mb" role="status"',
    ),
    error: /dedicated atomic polite status/u,
  },
  {
    name: "result_payload_made_live",
    html: source.replace(
      '<pre id="resultBox">',
      '<pre id="resultBox" role="status" aria-live="polite" aria-atomic="true">',
    ),
    error: /outside live regions/u,
  },
  {
    name: "result_payload_live_ancestor",
    html: source.replace(
      '<section class="card mt">\n      <h2>Latest Result</h2>',
      '<section class="card mt" role="status" aria-live="polite">\n      <h2>Latest Result</h2>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_unquoted_live_ancestor",
    html: source.replace(
      '<div class="wrap">',
      '<div class="wrap" aria-live=polite>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_encoded_live_ancestor",
    html: source.replace(
      '<section class="card mt">\n      <h2>Latest Result</h2>',
      '<section class="card mt" aria-live="pol&#105;te">\n      <h2>Latest Result</h2>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_quoted_gt_live_ancestor",
    html: source.replace(
      '<section class="card mt">\n      <h2>Latest Result</h2>',
      '<section class="card mt" title="1 > 0" role="status">\n      <h2>Latest Result</h2>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_nonvoid_self_closing_live_ancestor",
    html: source.replace(
      '<section class="card mt">\n      <h2>Latest Result</h2>',
      '<section class="card mt" role="status" />\n      <h2>Latest Result</h2>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_foreign_unquoted_slash_live_ancestor",
    html: source.replace(
      '<pre id="resultBox">No result yet.</pre>',
      '<svg><g role="status" data-token=value/><pre id="resultBox">No result yet.</pre></g></svg>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_svg_html_integration_live_ancestor",
    html: source.replace(
      '<pre id="resultBox">No result yet.</pre>',
      '<svg><foreignObject><section role="status" />\n<pre id="resultBox">No result yet.</pre></section></foreignObject></svg>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_svg_breakout_live_ancestor",
    html: source.replace(
      '<pre id="resultBox">No result yet.</pre>',
      '<svg><g><div role="status" /></g></svg>\n<pre id="resultBox">No result yet.</pre></div>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_math_breakout_live_ancestor",
    html: source.replace(
      '<pre id="resultBox">No result yet.</pre>',
      '<math><mrow><div role="status" /></mrow></math>\n<pre id="resultBox">No result yet.</pre></div>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_script_data_live_ancestor",
    html: source.replace(
      '<pre id="resultBox">No result yet.</pre>',
      '<div role="status"><script>const marker = "</div>";</script>\n<pre id="resultBox">No result yet.</pre></div>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_script_double_escaped_live_ancestor",
    html: source.replace(
      '<pre id="resultBox">No result yet.</pre>',
      '<div role="status"><script><!--<script></script></div>--></script>\n<pre id="resultBox">No result yet.</pre></div>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_foreign_cdata_live_ancestor",
    html: source.replace(
      '<pre id="resultBox">No result yet.</pre>',
      '<div role="status"><svg><![CDATA[</svg></div>]]></svg>\n<pre id="resultBox">No result yet.</pre></div>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_table_scope_live_ancestor",
    html: source.replace(
      '<pre id="resultBox">No result yet.</pre>',
      '<div role="status"><table></div></table>\n<pre id="resultBox">No result yet.</pre></div>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_slash_delimited_live_ancestor",
    html: source.replace(
      '<pre id="resultBox">No result yet.</pre>',
      '<div/role=status>\n<pre id="resultBox">No result yet.</pre></div>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_multitoken_role_live_ancestor",
    html: source.replace(
      '<section class="card mt">\n      <h2>Latest Result</h2>',
      '<section class="card mt" role="status presentation">\n      <h2>Latest Result</h2>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "result_payload_unknown_then_status_role_ancestor",
    html: source.replace(
      '<section class="card mt">\n      <h2>Latest Result</h2>',
      '<section class="card mt" role="future-widget status">\n      <h2>Latest Result</h2>',
    ),
    error: /must not be nested inside a live region/u,
  },
  {
    name: "unbounded_result_payload_announcement",
    html: source.replace(
      '$("resultStatusLabel").textContent = "Result ready.";',
      '$("resultStatusLabel").textContent = JSON.stringify(j, null, 2);',
    ),
    error: /concise result-ready announcement|must not receive unbounded/u,
  },
  {
    name: "unbounded_result_error_announcement",
    html: source.replace(
      '$("resultStatusLabel").textContent = "Job failed.";',
      '$("resultStatusLabel").textContent = String(e);',
    ),
    error: /concise failure announcement|must not receive unbounded/u,
  },
  {
    name: "missing_timeout_result_announcement",
    html: source.replace(
      '$("resultStatusLabel").textContent = "Timed out waiting for result.";',
      "",
    ),
    error: /timeout announcement must remain bound/u,
  },
  {
    name: "moved_timeout_result_announcement",
    html: source
      .replace(
        '$("resultStatusLabel").textContent = "Timed out waiting for result.";',
        "",
      )
      .replace(
        "async function pollResult(id) {",
        'async function pollResult(id) {\n      $("resultStatusLabel").textContent = "Timed out waiting for result.";',
      ),
    error: /timeout announcement must remain bound/u,
  },
  {
    name: "missing_submitting_result_announcement",
    html: source.replace(
      '$("resultStatusLabel").textContent = "Submitting job.";',
      "",
    ),
    error: /submission announcement must remain bound/u,
  },
  {
    name: "moved_submitting_result_announcement",
    html: source
      .replace(
        '$("resultStatusLabel").textContent = "Submitting job.";',
        "",
      )
      .replace(
        "async function submitJob() {",
        'async function submitJob() {\n      $("resultStatusLabel").textContent = "Submitting job.";',
      ),
    error: /submission announcement must remain bound/u,
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
    name: "missing_result_subject",
    html: source.replace('<span class="sr-only">Job result: </span>', ""),
    error: /explicit subject/u,
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
console.log("result_status_live=true");
console.log("result_payload_live=false");
console.log("result_payload_live_ancestor=false");
console.log("result_status_bounded=true");
console.log("result_submission_timeout_status_bounded=true");
console.log("full_demo_html_git_blob_bound=true");
console.log("computed_live_mutation_invalidates_bound_html_blob=true");
console.log("ancestor_live_attribute_whitelist_fail_closed=true");
console.log("encoded_aria_live_ancestor_rejected=true");
console.log("quoted_gt_live_ancestor_rejected=true");
console.log("nonvoid_self_closing_live_ancestor_rejected=true");
console.log("foreign_unquoted_slash_attribute_not_self_closing=true");
console.log("foreign_html_integration_live_ancestor_rejected=true");
console.log("foreign_html_breakout_live_ancestor_rejected=true");
console.log("script_data_live_ancestor_rejected=true");
console.log("script_double_escaped_live_ancestor_rejected=true");
console.log("foreign_cdata_live_ancestor_rejected=true");
console.log("table_scope_live_ancestor_rejected=true");
console.log("slash_delimited_live_ancestor_rejected=true");
console.log("keyboard_focus_visible=true");
console.log("negative_mutations=31");
