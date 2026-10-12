#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.scripts?.["datanet:pull"] !== "node tools/datanet-pull-v1.mjs") {
  throw new Error("missing datanet:pull package script");
}
const src = fs.readFileSync("tools/datanet-pull-v1.mjs", "utf8");
for (const token of ["tailscale_tailnet", "cgnat_or_tailnet", "100.64.0.0/10"]) {
  if (!src.includes(token)) throw new Error(`missing ${token}`);
}
NODE

VOID_NETWORK_HINT=cellphone-data+tailscale npm run datanet:pull -- --diagnose-only http://100.122.245.125:8088/public-node/index.json >/tmp/void-tailnet-diagnostics-tailscale.out
grep -q 'target_class=tailscale_tailnet' /tmp/void-tailnet-diagnostics-tailscale.out
grep -q '100.64.0.0/10 is being treated as Tailscale/tailnet space' /tmp/void-tailnet-diagnostics-tailscale.out
grep -q 'VOID_DATANET_PULL_DIAGNOSTIC_V1_READY' /tmp/void-tailnet-diagnostics-tailscale.out

VOID_NETWORK_HINT=cellphone-data npm run datanet:pull -- --diagnose-only http://100.122.245.125:8088/public-node/index.json >/tmp/void-tailnet-diagnostics-cgnat.out
grep -q 'target_class=cgnat_or_tailnet' /tmp/void-tailnet-diagnostics-cgnat.out
grep -q '100.64.0.0/10 is CGNAT space' /tmp/void-tailnet-diagnostics-cgnat.out
grep -q 'VOID_DATANET_PULL_DIAGNOSTIC_V1_READY' /tmp/void-tailnet-diagnostics-cgnat.out

echo "VOID_DATANET_PULL_TAILNET_DIAGNOSTICS_V1_GREEN"
