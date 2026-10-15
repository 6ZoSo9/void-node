#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHA40 = /^[0-9a-f]{40}$/u;
const ZERO40 = /^0{40}$/u;

function fail(message) {
  throw new Error(message);
}

function git(args) {
  const result = spawnSync(
    "/usr/bin/git",
    ["--no-replace-objects", "-C", ROOT, ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 20_000,
      env: {
        PATH: "/usr/bin:/bin",
        HOME: "/nonexistent",
        LANG: "C",
        LC_ALL: "C",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_SYSTEM: "/dev/null",
        GIT_NO_REPLACE_OBJECTS: "1",
        GIT_OPTIONAL_LOCKS: "0",
        GIT_TERMINAL_PROMPT: "0",
      },
    },
  );
  if (result.status !== 0) {
    fail("git_failed:" + String(result.stderr || "").slice(-500));
  }
  return String(result.stdout || "").trim();
}

function sha(value, label, { allowZero = false } = {}) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!SHA40.test(normalized)) fail(label + "_invalid");
  if (!allowZero && ZERO40.test(normalized)) fail(label + "_zero");
  return normalized;
}

function firstParent(head) {
  const parent = git(["rev-parse", "--verify", head + "^1"]);
  return sha(parent, "first_parent");
}

function mergeBase(base, head) {
  const merged = git(["merge-base", base, head]);
  return sha(merged, "merge_base");
}

function resolveVoidKeygenDiffBaseWithV1({
  eventName,
  headSha,
  pullRequestBaseSha = "",
  pushBeforeSha = "",
} = {}, {
  pullRequestMergeBase = mergeBase,
} = {}) {
  const event = String(eventName || "");
  const head = sha(headSha, "head");
  let base;
  if (event === "pull_request") {
    const requestedBase = sha(
      pullRequestBaseSha,
      "pull_request_base",
    );
    base = sha(
      pullRequestMergeBase(requestedBase, head),
      "pull_request_merge_base",
    );
  } else if (event === "push") {
    const before = String(pushBeforeSha || "").trim().toLowerCase();
    if (before && SHA40.test(before) && !ZERO40.test(before)) {
      base = before;
    } else if (!before || ZERO40.test(before)) {
      base = firstParent(head);
    } else {
      fail("push_before_invalid");
    }
  } else if (event === "workflow_dispatch") {
    base = firstParent(head);
  } else {
    fail("event_name_unsupported");
  }

  const ancestor = spawnSync(
    "/usr/bin/git",
    ["--no-replace-objects", "-C", ROOT, "merge-base", "--is-ancestor", base, head],
    {
      stdio: "ignore",
      timeout: 20_000,
      env: {
        PATH: "/usr/bin:/bin",
        HOME: "/nonexistent",
        LANG: "C",
        LC_ALL: "C",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_SYSTEM: "/dev/null",
        GIT_NO_REPLACE_OBJECTS: "1",
        GIT_OPTIONAL_LOCKS: "0",
        GIT_TERMINAL_PROMPT: "0",
      },
    },
  );
  if (ancestor.status !== 0) fail("diff_base_not_ancestor");
  return base;
}

export function resolveVoidKeygenDiffBaseV1(input = {}) {
  return resolveVoidKeygenDiffBaseWithV1(input);
}

function selfTest() {
  const head = sha(git(["rev-parse", "HEAD"]), "self_test_head");
  const parent = firstParent(head);
  assert.equal(
    resolveVoidKeygenDiffBaseV1({
      eventName: "pull_request",
      headSha: head,
      pullRequestBaseSha: parent,
    }),
    parent,
  );

  const simulatedDivergedBase = "1".repeat(40);
  let simulatedMergeBaseCalls = 0;
  assert.equal(
    resolveVoidKeygenDiffBaseWithV1(
      {
        eventName: "pull_request",
        headSha: head,
        pullRequestBaseSha: simulatedDivergedBase,
      },
      {
        pullRequestMergeBase(base, candidateHead) {
          simulatedMergeBaseCalls += 1;
          assert.equal(base, simulatedDivergedBase);
          assert.equal(candidateHead, head);
          return parent;
        },
      },
    ),
    parent,
  );
  assert.equal(simulatedMergeBaseCalls, 1);
  assert.equal(
    resolveVoidKeygenDiffBaseV1({
      eventName: "push",
      headSha: head,
      pushBeforeSha: parent,
    }),
    parent,
  );
  assert.equal(
    resolveVoidKeygenDiffBaseV1({
      eventName: "push",
      headSha: head,
      pushBeforeSha: "0".repeat(40),
    }),
    parent,
  );
  assert.equal(
    resolveVoidKeygenDiffBaseV1({
      eventName: "workflow_dispatch",
      headSha: head,
    }),
    parent,
  );
  assert.throws(
    () => resolveVoidKeygenDiffBaseV1({
      eventName: "schedule",
      headSha: head,
    }),
    /event_name_unsupported/u,
  );
  console.log("VOID_KEYGEN_CI_DIFF_BASE_V1_SELF_TEST_GREEN");
  console.log("pull_request_base_supported=true");
  console.log("pull_request_merge_base_supported=true");
  console.log("pull_request_raw_base_ancestry_required=false");
  console.log("push_before_supported=true");
  console.log("push_zero_before_parent_fallback=true");
  console.log("workflow_dispatch_parent_fallback=true");
  console.log("unknown_event_rejected=true");
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--self-test") {
    return { selfTest: true };
  }
  const result = {
    selfTest: false,
    eventName: "",
    headSha: "",
    pullRequestBaseSha: "",
    pushBeforeSha: "",
  };
  for (let i = 0; i < argv.length; i += 2) {
    if (i + 1 >= argv.length) fail("argument_value_missing");
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--event") result.eventName = value;
    else if (key === "--head") result.headSha = value;
    else if (key === "--pr-base") result.pullRequestBaseSha = value;
    else if (key === "--push-before") result.pushBeforeSha = value;
    else fail("unknown_argument:" + key);
  }
  return result;
}

const direct = Boolean(
  process.argv[1] &&
  import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href
);
if (direct) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.selfTest) {
      selfTest();
    } else {
      process.stdout.write(
        resolveVoidKeygenDiffBaseV1(args) + "\n",
      );
    }
  } catch (error) {
    console.error("HOLD=" + String(error?.message || error));
    process.exitCode = 2;
  }
}
