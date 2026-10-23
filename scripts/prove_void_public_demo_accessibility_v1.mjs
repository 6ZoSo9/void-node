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
  "status", "alert", "log", "marquee", "timer",
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
  "doc-notice", "doc-pagebreak", "doc-pagefooter", "doc-pageheader",
  "doc-pagelist", "doc-part", "doc-preface",
  "doc-prologue", "doc-pullquote", "doc-qna", "doc-subtitle", "doc-tip",
  "doc-toc",

  // Graphics-ARIA concrete roles.
  "graphics-document", "graphics-object", "graphics-symbol",
]);

const namedCharacterReferences = new Map([
  ["NewLine", "\n"],
  ["Tab", "\t"],
  ["amp", "&"],
  ["apos", "'"],
  ["gt", ">"],
  ["lt", "<"],
  ["quot", '"'],
]);

function decodeHtmlCharacterReferences(value) {
  return value.replace(
    /&#([0-9]+);?|&#[xX]([0-9a-fA-F]+);?|&([A-Za-z][A-Za-z0-9]+);/gu,
    (reference, decimal, hexadecimal, named) => {
      if (named !== undefined) {
        return namedCharacterReferences.get(named) ?? reference;
      }
      const codePoint = Number.parseInt(
        decimal ?? hexadecimal,
        decimal === undefined ? 16 : 10,
      );
      if (
        codePoint === 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return "\ufffd";
      }
      return String.fromCodePoint(codePoint);
    },
  );
}

function isAsciiWhitespace(character) {
  return character === " " || character === "\t" || character === "\n" ||
    character === "\f" || character === "\r";
}

function parseStartTagAttributes(tag) {
  const attributes = new Map();
  let index = 1;
  while (index < tag.length && !isAsciiWhitespace(tag[index]) &&
    tag[index] !== "/" && tag[index] !== ">") {
    index += 1;
  }

  while (index < tag.length) {
    while (index < tag.length && isAsciiWhitespace(tag[index])) index += 1;
    if (tag[index] === ">" || tag[index] === "/" || index >= tag.length) break;

    const nameStart = index;
    while (index < tag.length && !isAsciiWhitespace(tag[index]) &&
      tag[index] !== "=" && tag[index] !== "/" && tag[index] !== ">") {
      index += 1;
    }
    const name = tag.slice(nameStart, index).toLowerCase();
    while (index < tag.length && isAsciiWhitespace(tag[index])) index += 1;

    let value = "";
    if (tag[index] === "=") {
      index += 1;
      while (index < tag.length && isAsciiWhitespace(tag[index])) index += 1;
      const quote = tag[index] === '"' || tag[index] === "'" ? tag[index] : null;
      if (quote !== null) {
        index += 1;
        const valueStart = index;
        while (index < tag.length && tag[index] !== quote) index += 1;
        value = tag.slice(valueStart, index);
        if (tag[index] === quote) index += 1;
      } else {
        const valueStart = index;
        while (index < tag.length && !isAsciiWhitespace(tag[index]) &&
          tag[index] !== ">") {
          index += 1;
        }
        value = tag.slice(valueStart, index);
      }
    }

    if (name && !attributes.has(name)) {
      attributes.set(name, decodeHtmlCharacterReferences(value));
    }
  }
  return attributes;
}

function htmlAttributeValue(tag, name) {
  assert.ok(name === "role" || name === "aria-live");
  return parseStartTagAttributes(tag).get(name) ?? null;
}

function htmlTagsBefore(html, limit) {
  const tags = [];
  let index = 0;
  while (index < limit) {
    const start = html.indexOf("<", index);
    if (start === -1 || start >= limit) break;
    if (html.startsWith("<!--", start)) {
      const commentEnd = html.indexOf("-->", start + 4);
      index = commentEnd === -1 ? limit : commentEnd + 3;
      continue;
    }

    let cursor = start + 1;
    const closing = html[cursor] === "/";
    if (closing) cursor += 1;
    const nameStart = cursor;
    while (cursor < html.length && /[a-z0-9:-]/iu.test(html[cursor])) cursor += 1;
    if (cursor === nameStart) {
      index = start + 1;
      continue;
    }
    const name = html.slice(nameStart, cursor).toLowerCase();

    let quote = null;
    while (cursor < html.length) {
      const character = html[cursor];
      if (quote !== null) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        break;
      }
      cursor += 1;
    }
    if (cursor >= html.length || cursor >= limit) break;

    const raw = html.slice(start, cursor + 1);
    tags.push({
      closing,
      name,
      raw,
      selfClosing: /\/\s*>$/u.test(raw),
    });
    index = cursor + 1;
  }
  return tags;
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
  for (const tag of htmlTagsBefore(html, resultIndex)) {
    if (tag.closing) {
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].name === tag.name) {
          stack.splice(index, 1);
          break;
        }
      }
      continue;
    }
    if (tag.selfClosing || voidElements.has(tag.name)) continue;
    stack.push({ name: tag.name, tag: tag.raw });
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
    '<section class="card mt" role="progressbar status">\n      <h2>Latest Result</h2>',
  ),
);

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

requireDemoAccessibility(
  source.replace(
    '<section class="card mt">\n      <h2>Latest Result</h2>',
    '<section class="card mt" role="doc-pageheader status">\n      <h2>Latest Result</h2>',
  ),
);

requireDemoAccessibility(
  source.replace(
    '<section class="card mt">\n      <h2>Latest Result</h2>',
    '<section class="card mt" role="doc-pagefooter status">\n      <h2>Latest Result</h2>',
  ),
);

requireDemoAccessibility(
  source.replace(
    '<section class="card mt">\n      <h2>Latest Result</h2>',
    '<section class="card mt" data-role="status">\n      <h2>Latest Result</h2>',
  ),
);

requireDemoAccessibility(
  source.replace(
    '<section class="card mt">\n      <h2>Latest Result</h2>',
    '<section class="card mt" data-aria-live="polite">\n      <h2>Latest Result</h2>',
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
console.log("ordered_progressbar_fallback_nonlive=true");
console.log("encoded_aria_live_ancestor_rejected=true");
console.log("quoted_gt_live_ancestor_rejected=true");
console.log("keyboard_focus_visible=true");
console.log("negative_mutations=21");
