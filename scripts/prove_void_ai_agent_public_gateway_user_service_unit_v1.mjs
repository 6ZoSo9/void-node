#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER =
  "VOID_AI_AGENT_PUBLIC_GATEWAY_USER_SERVICE_UNIT_PROOF_V1";

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "..");
const unitPath = path.join(
  repositoryRoot,
  "ops/systemd/void-ai-agent-public-gateway-v1.service",
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const unit = await readFile(unitPath, "utf8");
const lines = unit.split(/\r?\n/);

assert(
  !lines.some((line) =>
    line.trim().startsWith("CapabilityBoundingSet="),
  ),
  "CapabilityBoundingSet must be absent from the user service",
);
assert(
  !lines.some((line) =>
    line.trim().startsWith("AmbientCapabilities="),
  ),
  "AmbientCapabilities must be absent from the user service",
);

const requiredExactLines = [
  "Type=simple",
  "WorkingDirectory=%h/dev/void-node",
  "ExecStart=%h/dev/void-node/ops/run-void-ai-agent-public-gateway-v1.sh",
  "Environment=NODE_ENV=production",
  "Environment=VOID_AI_AGENT_PUBLIC_GATEWAY_HOST=127.0.0.1",
  "Environment=VOID_AI_AGENT_PUBLIC_GATEWAY_PORT=4112",
  "Restart=on-failure",
  "RestartSec=3",
  "NoNewPrivileges=true",
  "PrivateTmp=true",
  "ProtectSystem=strict",
  "ProtectHome=read-only",
  "RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX",
  "UMask=0077",
  "WantedBy=default.target",
];

for (const required of requiredExactLines) {
  assert(
    lines.includes(required),
    `required unit line is missing: ${required}`,
  );
}

const forbiddenFragments = [
  "User=root",
  "Group=root",
  "sudo ",
  "0.0.0.0",
  "::",
  "4100",
  "Funnel",
  "tailscale",
];

for (const fragment of forbiddenFragments) {
  assert(
    !unit.includes(fragment),
    `forbidden unit fragment is present: ${fragment}`,
  );
}

process.stdout.write(
  `${MARKER}\n` +
    `capability_directive_count=0\n` +
    `loopback_host=127.0.0.1\n` +
    `gateway_port=4112\n` +
    `no_new_privileges=1\n` +
    `private_tmp=1\n` +
    `protect_system=strict\n` +
    `protect_home=read-only\n` +
    `verdict=AI_AGENT_PUBLIC_GATEWAY_USER_SERVICE_UNIT_STATIC_EXACT_GREEN\n` +
    `${MARKER}_COMPLETE\n`,
);
