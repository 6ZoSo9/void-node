#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "[setup] repo = $(pwd)"

########################################
# 1) Create/overwrite the e2e script
########################################

cat > ops/void-devnet-e2e.sh <<'EOS'
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "[e2e] step 1: devnet-up..."
./ops/void-devnet-up.sh

echo
echo "[e2e] step 2: haiku demo (single run)..."
./ops/void-devnet-haiku-demo.sh

echo
echo "[e2e] step 3: agent / metrics health..."
if [ -x ./ops/void-devnet-agent-health.sh ]; then
  ./ops/void-devnet-agent-health.sh
else
  echo "[e2e] (skip) ops/void-devnet-agent-health.sh not found"
fi

echo
echo "[e2e] OK – devnet end-to-end pipeline passed."
EOS

chmod +x ops/void-devnet-e2e.sh

########################################
# 2) Wire npm test -> e2e script
########################################

if [ ! -f package.json ]; then
  echo "[ERR] package.json not found in $(pwd)" >&2
  exit 1
fi

node <<'EOS2'
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

if (!pkg.scripts) pkg.scripts = {};
pkg.scripts.test = "./ops/void-devnet-e2e.sh";

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log("[pkg] scripts.test wired to ./ops/void-devnet-e2e.sh");
EOS2

echo "[setup] void-devnet e2e + npm test wiring complete."
