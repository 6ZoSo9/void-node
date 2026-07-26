#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const unitPath = path.join(
  root,
  "examples/systemd/void-operator-webhook-receiver-v1.service",
);
const docPath = path.join(
  root,
  "docs/operators/void-operator-webhook-receiver-v1.md",
);
const workflowPath = path.join(
  root,
  ".github/workflows/void-operator-webhook-receiver-v1.yml",
);

const unit = fs.readFileSync(unitPath, "utf8");
const doc = fs.readFileSync(docPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");
const unitLines = unit.split("\n");

const exactLineCount = (line) =>
  unitLines.filter((candidate) => candidate === line).length;

const requiredUnitLines = [
  "PrivateDevices=false",
  "MemoryDenyWriteExecute=false",
  "NoNewPrivileges=true",
  "PrivateTmp=true",
  "ProtectSystem=strict",
  "ProtectHome=read-only",
  "ReadWritePaths=%h/.local/state/void-operator-webhook-receiver-v1 %h/void-precision-smoke",
  "RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX",
  "RestrictSUIDSGID=true",
  "LockPersonality=true",
  "UMask=0077",
];

const checks = {
  privateDevicesUserManagerCompatible:
    exactLineCount("PrivateDevices=false") === 1,
  memoryDenyWriteExecuteNodeCompatible:
    exactLineCount("MemoryDenyWriteExecute=false") === 1,
  oldPrivateDevicesDirectiveAbsent:
    exactLineCount("PrivateDevices=true") === 0,
  oldMdweDirectiveAbsent:
    exactLineCount("MemoryDenyWriteExecute=true") === 0,
  nodeOptionsAbsent:
    !unit.includes("NODE_OPTIONS") &&
    !unit.includes("--jitless"),
  privateDevicesRationale:
    unit.includes("unprivileged systemd user manager"),
  mdweRationale:
    unit.includes(
      "Node.js V8 and bundled Undici require executable memory and WebAssembly",
    ),
  preservedHardening:
    requiredUnitLines.every((line) => exactLineCount(line) === 1),
  loopbackHostPreserved:
    exactLineCount(
      "Environment=VOID_OPERATOR_WEBHOOK_RECEIVER_HOST=127.0.0.1",
    ) === 1,
  loopbackPortPreserved:
    exactLineCount(
      "Environment=VOID_OPERATOR_WEBHOOK_RECEIVER_PORT=4186",
    ) === 1,
  restartBoundaryPreserved:
    exactLineCount("Restart=on-failure") === 1 &&
    exactLineCount("RestartSec=3") === 1,
  documentationMarker:
    doc.includes(
      "VOID_OPERATOR_WEBHOOK_RECEIVER_USER_MANAGER_NODE_COMPAT_V1",
    ),
  documentationPrivateDevices:
    doc.includes("`PrivateDevices=false`"),
  documentationMdwe:
    doc.includes("`MemoryDenyWriteExecute=false`"),
  documentationJitlessReason:
    doc.includes("`--jitless` removes WebAssembly"),
  workflowRunsExistingReceiverProof:
    workflow.includes(
      "node scripts/prove_void_operator_webhook_receiver_v1.mjs",
    ),
  workflowRunsCompatibilityProof:
    workflow.includes(
      "node scripts/prove_void_operator_webhook_receiver_user_manager_node_compat_v1.mjs",
    ),
};

const failures = Object.entries(checks)
  .filter(([, value]) => !value)
  .map(([key]) => key);

console.log(JSON.stringify({ checks, failures }, null, 2));

if (failures.length > 0) {
  throw new Error(
    `VOID operator webhook receiver compatibility proof failed: ${failures.join(",")}`,
  );
}

console.log(
  "VOID_OPERATOR_WEBHOOK_RECEIVER_USER_MANAGER_NODE_COMPAT_V1_GREEN",
);
