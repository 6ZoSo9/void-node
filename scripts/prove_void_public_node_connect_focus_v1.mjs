#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = {
  route: readFileSync(
    resolve(ROOT, "public/public-node/connect/index.html"),
    "utf8",
  ),
  pack: readFileSync(
    resolve(
      ROOT,
      "public/public-node/connect/public-node-connect-pack-v1.html",
    ),
    "utf8",
  ),
};
const workflow = readFileSync(
  resolve(ROOT, ".github/workflows/void-public-node-connect-focus-v1.yml"),
  "utf8",
);
const pack = JSON.parse(
  readFileSync(
    resolve(
      ROOT,
      "public/public-node/connect/public-node-connect-pack-v1.json",
    ),
    "utf8",
  ),
);
const rootIndex = JSON.parse(
  readFileSync(resolve(ROOT, "public/public-node/index.json"), "utf8"),
);
const connectDoc = readFileSync(
  resolve(ROOT, "docs/public/public-node-connect-pack-v1.md"),
  "utf8",
);

const publicLinks = [
  "/public-node/connect/public-node-connect-pack-v1.json",
  "/public-node/connect/public-node-connect-pack-v1.html",
];
const dialCommand =
  "curl --fail-with-body --silent --show-error -X POST -H 'content-type: application/json'";
const machineDialCommand = `${dialCommand} --data '{"addr":"<PEER_HOST>:<PEER_P2P_PORT>"}' http://127.0.0.1:4100/p2p/dial | jq .`;
const requiredGuidance = [
  "Run this only against a local node you administer.",
  "This POST asks the local node to start an outgoing connection and may update its local peer state.",
  "means the node accepted the dial request. It does not prove that the peer connected.",
  "reports why the request was rejected. Do not retry blindly;",
  "confirm the peer appears connected in the peer snapshot",
];

for (const [name, html] of Object.entries(pages)) {
  const compact = html.replace(/\s+/gu, " ");

  assert.match(html, /<html lang="en">/u, `${name} language missing`);
  assert.match(html, /<main>/u, `${name} main landmark missing`);
  assert.match(
    compact,
    /a:focus-visible \{ outline:3px solid #f8fafc; outline-offset:4px; \}/u,
    `${name} link focus indicator missing`,
  );
  assert.doesNotMatch(
    html,
    /outline\s*:\s*(?:0|none)\b/iu,
    `${name} removes focus indication`,
  );
  assert.doesNotMatch(
    html,
    /<script\b|<form\b|<input\b/iu,
    `${name} must remain inert`,
  );
  assert.match(html, /This is not validator admission/u);
  assert.match(html, /Public-safe node connection guidance only/u);
  assert.ok(html.includes(dialCommand), `${name} dial command hides errors`);

  for (const guidance of requiredGuidance) {
    assert.ok(
      compact.includes(guidance),
      `${name} missing dial guidance: ${guidance}`,
    );
  }

  assert.equal(
    (html.match(/<a\b/gu) || []).length,
    publicLinks.length,
    `${name} public link count changed`,
  );
  for (const href of publicLinks) {
    assert.ok(
      html.includes(`href="${href}"`),
      `${name} missing public link: ${href}`,
    );
  }
}

assert.equal(pack.example_commands?.dial_peer, machineDialCommand);
assert.equal(pack.boundary?.read_only, false);
assert.equal(pack.boundary?.mutation_route_enabled, true);
assert.equal(pack.boundary?.automatic_peer_dial_enabled_by_this_pack, false);
assert.match(pack.dial_outcomes?.accepted || "", /does not prove/u);
assert.match(pack.dial_outcomes?.rejected || "", /before retrying/u);
assert.match(pack.dial_outcomes?.connection_verification || "", /\/p2p\/peers/u);
assert.ok(
  pack.operator_flow?.some((step) => step.includes("may update local peer state")),
  "machine operator flow must disclose the dial side effect",
);
assert.ok(
  pack.operator_flow?.some((step) => step.includes("not proof that the peer connected")),
  "machine operator flow must bound accepted dial semantics",
);
assert.ok(
  pack.operator_flow?.some((step) => step.includes("do not retry blindly")),
  "machine operator flow must provide rejection guidance",
);

const rootPackBoundary = rootIndex.public_node_connect_pack?.boundary;
assert.equal(rootPackBoundary?.read_only, false);
assert.equal(rootPackBoundary?.mutation_route_enabled, true);
assert.equal(rootPackBoundary?.automatic_peer_dial_enabled_by_this_pack, false);

assert.ok(connectDoc.includes(machineDialCommand));
assert.ok(connectDoc.includes("may update local peer state"));
assert.ok(connectDoc.includes("does not prove that the peer connected"));

assert.ok(
  workflow.includes(
    '"public/public-node/connect/public-node-connect-pack-v1.html"',
  ),
  "workflow must watch the alternate public HTML surface",
);
for (const watchedPath of [
  "public/public-node/connect/public-node-connect-pack-v1.json",
  "docs/public/public-node-connect-pack-v1.md",
  "tools/proof-public-node-connect-pack-v1.mjs",
  "tools/proof-public-node-connect-pack-closeout-v1.mjs",
  "tools/proof-public-node-connect-lane-closeout-v1.mjs",
  "tools/proof-public-node-operator-quickstart-closeout-v1.mjs",
  "tools/proof-public-node-operator-status-rollup-closeout-v1.mjs",
]) {
  assert.ok(
    workflow.includes(`"${watchedPath}"`),
    `workflow must watch ${watchedPath}`,
  );
}
assert.equal(
  workflow.includes('"public/public-node/index.json"'),
  false,
  "shared public root index must not be a focused-workflow trigger",
);
assert.ok(
  rootIndex.public_node_connect_pack,
  "proof must still read and validate the shared root index contract",
);
assert.ok(
  workflow.includes('merge_base="$(git merge-base "$BASE" "$HEAD")"'),
  "workflow must derive the common ancestor from the moving base tip",
);
assert.ok(
  workflow.includes('git diff --check "$merge_base" "$HEAD"'),
  "workflow must run hygiene from the common ancestor",
);
assert.ok(
  !workflow.includes('git merge-base --is-ancestor "$BASE" "$HEAD"'),
  "workflow must not require the moving base tip to be an ancestor",
);

const fixture = mkdtempSync(
  resolve(tmpdir(), "void-public-node-focus-moving-base-"),
);
const gitEnv = {
  ...process.env,
  HOME: fixture,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
};

function git(...args) {
  const result = spawnSync(
    "/usr/bin/git",
    ["-C", fixture, ...args],
    {
      encoding: "utf8",
      env: gitEnv,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed: ${result.stderr}`,
  );
  return result.stdout.trim();
}

try {
  git("init", "--initial-branch=main");
  git("config", "user.name", "VOID Focus Proof");
  git("config", "user.email", "void-focus-proof@example.invalid");

  writeFileSync(resolve(fixture, "base.txt"), "base\n", "utf8");
  git("add", "--", "base.txt");
  git("commit", "-m", "base");
  const commonBase = git("rev-parse", "HEAD");

  git("switch", "-c", "candidate");
  writeFileSync(resolve(fixture, "focus.txt"), "focus repair\n", "utf8");
  git("add", "--", "focus.txt");
  git("commit", "-m", "candidate");
  const candidateHead = git("rev-parse", "HEAD");

  git("switch", "main");
  writeFileSync(resolve(fixture, "advance.txt"), "independent base advance\n", "utf8");
  git("add", "--", "advance.txt");
  git("commit", "-m", "advance base");
  const movedBase = git("rev-parse", "HEAD");

  const staleAncestorCheck = spawnSync(
    "/usr/bin/git",
    [
      "-C",
      fixture,
      "merge-base",
      "--is-ancestor",
      movedBase,
      candidateHead,
    ],
    {
      encoding: "utf8",
      env: gitEnv,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  assert.equal(
    staleAncestorCheck.status,
    1,
    "fixture must reproduce a disjoint moving base tip",
  );

  const mergeBase = git("merge-base", movedBase, candidateHead);
  assert.equal(mergeBase, commonBase);
  git("diff", "--check", mergeBase, candidateHead);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

console.log("VOID_PUBLIC_NODE_CONNECT_FOCUS_V1_PROOF_GREEN");
console.log("explicit_keyboard_focus_indicator=true");
console.log("focus_not_removed=true");
console.log("public_html_surfaces=2");
console.log("dial_side_effect_disclosed=true");
console.log("dial_result_semantics_bounded=true");
console.log("machine_readable_dial_contract_aligned=true");
console.log("public_index_dial_boundary_aligned=true");
console.log("public_resource_links=2");
console.log("moving_base_merge_base_hygiene=true");
console.log("disjoint_base_advance_regression=true");
console.log("runtime_or_network_mutation=false");
