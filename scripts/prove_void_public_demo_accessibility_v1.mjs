#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const target = "public/demo/index.html";
const source = fs.readFileSync(target, "utf8");

const voidElements = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

const liveRoles = new Set([
  "status", "alert", "log", "marquee", "timer", "progressbar",
]);

const recognizedRoles = new Set([
  "alert", "alertdialog", "application", "article", "banner", "blockquote",
  "button", "caption", "cell", "checkbox", "code", "columnheader",
  "combobox", "complementary", "contentinfo", "definition", "deletion",
  "dialog", "directory", "document", "emphasis", "feed", "figure", "form",
  "generic", "grid", "gridcell", "group", "heading", "img", "insertion",
  "link", "list", "listbox", "listitem", "log", "main", "marquee", "math",
  "menu", "menubar", "menuitem", "menuitemcheckbox", "menuitemradio",
  "meter", "navigation", "none", "note", "option", "paragraph",
  "presentation", "progressbar", "radio", "radiogroup", "region", "row",
  "rowgroup", "rowheader", "scrollbar", "search", "searchbox", "separator",
  "slider", "spinbutton", "status", "strong", "subscript", "superscript",
  "switch", "tab", "table", "tablist", "tabpanel", "term", "textbox",
  "time", "timer", "toolbar", "tooltip", "tree", "treegrid", "treeitem",

  // DPUB-ARIA 1.1 concrete roles.
  "doc-abstract", "doc-acknowledgments", "doc-afterword", "doc-appendix",
  "doc-backlink", "doc-biblioentry", "doc-bibliography", "doc-biblioref",
  "doc-chapter", "doc-colophon", "doc-conclusion", "doc-cover",
  "doc-credit", "doc-credits", "doc-dedication", "doc-endnote",
  "doc-endnotes", "doc-epigraph", "doc-epilogue", "doc-errata",
  "doc-example", "doc-footnote", "doc-foreword", "doc-glossary",
  "doc-glossref", "doc-index", "doc-introduction", "doc-noteref",
  "doc-notice", "doc-pagebreak", "doc-pagelist", "doc-part", "doc-preface",
  "doc-prologue", "doc-pullquote", "doc-qna", "doc-subtitle", "doc-tip",
  "doc-toc",

  // Graphics-ARIA concrete roles.
  "graphics-document", "graphics-object", "graphics-symbol",
]);

function htmlAttributeValue(tag, name) {
  assert.ok(name === "role" || name === "aria-live");
  const pattern = new RegExp(
    "\\b" + name +
      "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'<>]+))",
    "iu",
  );
  const match = tag.match(pattern);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function tagCreatesLiveRegion(tag) {
  const role = htmlAttributeValue(tag, "role");
  if (role !== null) {
    const tokens = role
      .trim()
      .toLowerCase()
      .split(/[\t\n\f\r ]+/u)
      .filter(Boolean);
    for (const token of tokens) {
      if (!recognizedRoles.has(token)) continue;
      if (liveRoles.has(token)) return true;
      break;
    }
  }
  const ariaLive = htmlAttributeValue(tag, "aria-live");
  return ariaLive !== null &&
    ["polite", "assertive"].includes(ariaLive.trim().toLowerCase());
}

function requireResultPayloadOutsideLiveAncestors(html) {
  const needle = '<pre id="resultBox">';
  const resultIndex = html.indexOf(needle);
  assert.notEqual(resultIndex, -1, "full result payload element must exist");

  const stack = [];
  const tagPattern = /<\/?([a-z][a-z0-9:-]*)(?:\s[^<>]*?)?>/giu;
  for (const match of html.matchAll(tagPattern)) {
    if (match.index >= resultIndex) break;
    const tag = match[0];
    const name = match[1].toLowerCase();
    if (tag.startsWith("</")) {
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].name === name) {
          stack.splice(index, 1);
          break;
        }
      }
      continue;
    }
    if (tag.endsWith("/>") || voidElements.has(name)) continue;
    stack.push({ name, tag });
  }

  for (const ancestor of stack) {
    assert.equal(
      tagCreatesLiveRegion(ancestor.tag),
      false,
      "full result payload must not be nested inside a live region",
    );
  }
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

requireDemoAccessibility(
  source.replace(
    '<section class="card mt">\n      <h2>Latest Result</h2>',
    '<section class="card mt" role="presentation status">\n      <h2>Latest Result</h2>',
  ),
);

requireDemoAccessibility(
  source.replace(
    '<section class="card mt">\n      <h2>Latest Result</h2>',
    '<section class="card mt" role="doc-chapter status">\n      <h2>Latest Result</h2>',
  ),
);

requireDemoAccessibility(
  source.replace(
    '<section class="card mt">\n      <h2>Latest Result</h2>',
    '<section class="card mt" role="graphics-document status">\n      <h2>Latest Result</h2>',
  ),
);

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
console.log("keyboard_focus_visible=true");
console.log("negative_mutations=19");
