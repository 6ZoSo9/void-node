import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cliPath = resolve(root, "ops/mainnet0/wc-public-earning-participant-v1.sh");
const workflowPath = resolve(
  root,
  ".github/workflows/wc-public-earning-participant-cli-false-default-v1.yml",
);

const oldTop =
  '(.coordinator_inbound_fetch // true) == ($transport == "inbound_fetch")';
const oldNested =
  '(.coordinator.coordinator_inbound_fetch // true) == ($transport == "inbound_fetch")';
const fixedTop =
  '((if has("coordinator_inbound_fetch") then .coordinator_inbound_fetch else true end) == ($transport == "inbound_fetch"))';
const fixedNested =
  '((if ((.coordinator | type) == "object" and (.coordinator | has("coordinator_inbound_fetch"))) then .coordinator.coordinator_inbound_fetch else true end) == ($transport == "inbound_fetch"))';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

function jqBoolean(
  input: unknown,
  transport: "inbound_fetch" | "outbound_bundle",
  filter: string,
): boolean {
  const stdout = execFileSync(
    "jq",
    ["-c", "--arg", "transport", transport, filter],
    {
      cwd: root,
      encoding: "utf8",
      input: JSON.stringify(input),
      stdio: ["pipe", "pipe", "pipe"],
    },
  ).trim();

  assert(
    stdout === "true" || stdout === "false",
    `unexpected jq boolean output: ${stdout}`,
  );
  return stdout === "true";
}

const cli = readFileSync(cliPath, "utf8");
const workflow = readFileSync(workflowPath, "utf8");

assert(count(cli, oldTop) === 0, "buggy top-level false-default expression remains");
assert(count(cli, oldNested) === 0, "buggy nested false-default expression remains");
assert(count(cli, fixedTop) === 1, "corrected top-level expression must appear once");
assert(count(cli, fixedNested) === 1, "corrected nested expression must appear once");

execFileSync("bash", ["-n", cliPath], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});

const topFilter =
  '((if has("coordinator_inbound_fetch") then .coordinator_inbound_fetch else true end) == ($transport == "inbound_fetch"))';
const nestedFilter =
  '((if ((.coordinator | type) == "object" and (.coordinator | has("coordinator_inbound_fetch"))) then .coordinator.coordinator_inbound_fetch else true end) == ($transport == "inbound_fetch"))';

assert(
  jqBoolean({ coordinator_inbound_fetch: false }, "outbound_bundle", topFilter),
  "outbound top-level false must be accepted",
);
assert(
  jqBoolean({ coordinator_inbound_fetch: true }, "inbound_fetch", topFilter),
  "inbound top-level true must be accepted",
);
assert(
  !jqBoolean({ coordinator_inbound_fetch: true }, "outbound_bundle", topFilter),
  "outbound top-level true must be rejected",
);
assert(
  !jqBoolean({ coordinator_inbound_fetch: false }, "inbound_fetch", topFilter),
  "inbound top-level false must be rejected",
);
assert(
  !jqBoolean({}, "outbound_bundle", topFilter),
  "missing top-level evidence must not impersonate outbound false",
);
assert(
  jqBoolean({}, "inbound_fetch", topFilter),
  "missing top-level evidence must retain legacy inbound default",
);

assert(
  jqBoolean(
    { coordinator: { coordinator_inbound_fetch: false } },
    "outbound_bundle",
    nestedFilter,
  ),
  "outbound nested false must be accepted",
);
assert(
  jqBoolean(
    { coordinator: { coordinator_inbound_fetch: true } },
    "inbound_fetch",
    nestedFilter,
  ),
  "inbound nested true must be accepted",
);
assert(
  !jqBoolean(
    { coordinator: { coordinator_inbound_fetch: true } },
    "outbound_bundle",
    nestedFilter,
  ),
  "outbound nested true must be rejected",
);
assert(
  !jqBoolean(
    { coordinator: { coordinator_inbound_fetch: false } },
    "inbound_fetch",
    nestedFilter,
  ),
  "inbound nested false must be rejected",
);
assert(
  !jqBoolean({ coordinator: {} }, "outbound_bundle", nestedFilter),
  "missing nested evidence must not impersonate outbound false",
);
assert(
  jqBoolean({ coordinator: {} }, "inbound_fetch", nestedFilter),
  "missing nested evidence must retain legacy inbound default",
);

assert(
  workflow.includes("prove_wc_public_earning_participant_cli_false_default_v1.ts"),
  "workflow must execute the dedicated false-default regression proof",
);
assert(
  workflow.includes("bash -n ops/mainnet0/wc-public-earning-participant-v1.sh"),
  "workflow must syntax-check the participant CLI",
);

console.log(
  "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_FALSE_DEFAULT_V1_GREEN",
);
