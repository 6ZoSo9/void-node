#!/usr/bin/env bash
set -euo pipefail

echo "=== [pkg] VOID Node mainnet package builder ==="

# 1) Repo root
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "[FATAL] This script must run inside the git repo (void-node)." >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

TS="$(date +%Y%m%d-%H%M%S || echo unknown)"
SHORT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
PKG_NAME="void-node-mainnet-${TS}-${SHORT_SHA}"

DIST_DIR="${REPO_ROOT}/dist"
PKG_ROOT="${DIST_DIR}/${PKG_NAME}"

echo "[cfg] REPO_ROOT = ${REPO_ROOT}"
echo "[cfg] DIST_DIR  = ${DIST_DIR}"
echo "[cfg] PKG_NAME  = ${PKG_NAME}"
echo

mkdir -p "${PKG_ROOT}"

# 2) Core project files (source-based package; target box will npm install + build)
echo "=== [pkg] copying core project files ==="

for f in package.json package-lock.json pnpm-lock.yaml yarn.lock tsconfig.json; do
  if [ -f "${f}" ]; then
    echo "[pkg]   + ${f}"
    cp -a "${f}" "${PKG_ROOT}/"
  fi
done

if [ -d src ]; then
  echo "[pkg]   + src/ (source tree)"
  cp -a src "${PKG_ROOT}/"
fi

if [ -d scripts ]; then
  echo "[pkg]   + scripts/ (helper scripts)"
  cp -a scripts "${PKG_ROOT}/"
fi

# We do NOT copy config/void-mainnet-bootstrap-mainnet.* or any key/secret material.
# This package is for running a node, not bootstrapping mainnet with your keys.
if [ -d config ]; then
  echo "[pkg]   + config/ (EXCLUDING sensitive mainnet bootstrap configs)"
  mkdir -p "${PKG_ROOT}/config"
  # Copy only non-bootstrap examples (very conservative).
  find config -maxdepth 1 -type f ! -name 'void-mainnet-bootstrap-*' -print0 2>/dev/null \
    | xargs -0 -r cp -t "${PKG_ROOT}/config" || true
fi

# 3) Minimal ops helpers (non-secret)
echo "=== [pkg] copying ops helpers (non-secret) ==="

if [ -d ops ]; then
  mkdir -p "${PKG_ROOT}/ops"
  # Copy only generic health/monitoring helpers that are safe to share.
  # We deliberately DO NOT copy mainnet keys/plan/broadcast scripts.
  find ops -maxdepth 1 -type f \
    ! -name 'void-mainnet-*keys*' \
    ! -name 'void-mainnet-*broadcast*' \
    ! -name 'void-mainnet-*plan*' \
    -print0 2>/dev/null \
    | xargs -0 -r cp -t "${PKG_ROOT}/ops" || true
fi

# 4) Systemd unit example
echo "=== [pkg] writing systemd unit example ==="

mkdir -p "${PKG_ROOT}/systemd"

cat > "${PKG_ROOT}/systemd/void-node@mainnet.service" <<'EOF_UNIT'
[Unit]
Description=VOID Node (mainnet) instance %i
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=%i
WorkingDirectory=%h/dev/void-node
Environment=NODE_ENV=production
# Adjust these for your validator:
Environment=HTTP_PORT=4100
Environment=P2P_PORT=4700
Environment=DATA_DIR=%h/dev/void-node/data_mainnet
# Point this to your node's private key file on that box (NOT your LUKS mainnet USB).
# Example: /home/%i/.secrets/void-node-mainnet.key
Environment=VOID_NODE_PRIVKEY_PATH=%h/.secrets/void-node-mainnet.key

ExecStart=/usr/bin/env npx --yes tsx src/index.ts
Restart=on-failure
RestartSec=5

# Hardening (adjust as needed)
NoNewPrivileges=true
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF_UNIT

# 5) Minimal README for the recipient
echo "=== [pkg] writing README ==="

cat > "${PKG_ROOT}/README-mainnet-node.txt" <<'EOF_README'
VOID Node — mainnet-core validator package (source-based)
========================================================

This bundle contains:
  - src/              : VOID node source code
  - package.json      : Node project manifest
  - tsconfig.json     : TypeScript config (if used)
  - scripts/          : Helper scripts (if present)
  - config/           : Non-sensitive example config files
  - ops/              : Non-secret ops helpers (NO mainnet keys/plan/broadcast)
  - systemd/          : Example systemd unit: void-node@mainnet.service

It does NOT contain:
  - Any private keys
  - Any mainnet bootstrap config JSON
  - Any LUKS images or sensitive artifacts

To use on a fresh Linux host (high-level):

  1) Install dependencies:
       - Node.js (v18+ or v20+ recommended)
       - npm or pnpm / yarn
       - git (optional, for pulling updates)

  2) Create a non-root user (e.g. 'void'):
       sudo adduser void

  3) Copy this bundle to the host, then unpack as that user:
       mkdir -p ~/dev
       tar -C ~/dev -xzf /path/to/void-node-mainnet-*.tar.gz
       cd ~/dev/void-node-mainnet-*/

  4) Install node dependencies and build (if build step is used):
       npm install
       # if you have a build script:
       npm run build || true

  5) Create a local node key for THIS validator (NOT your mainnet treasury keys):
       mkdir -p ~/.secrets
       # Example: generate a random 32-byte hex key (placeholder; replace with your own flow)
       head -c 32 /dev/urandom | xxd -p > ~/.secrets/void-node-mainnet.key
       chmod 600 ~/.secrets/void-node-mainnet.key

     Wire HTTP_PORT, P2P_PORT, DATA_DIR, and VOID_NODE_PRIVKEY_PATH to match your setup.

  6) Install the example systemd unit (as root):
       sudo cp systemd/void-node@mainnet.service /etc/systemd/system/
       sudo systemctl daemon-reload

       # Enable for user 'void' (example):
       sudo systemctl enable void-node@void.service
       sudo systemctl start  void-node@void.service

  7) Point the node at your VOID mainnet network:
       - This will typically be done via env vars or config
         (bootstrap peers, chainId=2050, etc).
       - Those details are NOT included here and will be provided separately.

Security notes:
  - This package is source-only + configs; no private keys inside.
  - Each validator/operator should generate their own node key on their own host.
  - Mainnet treasury / AdminGate / UpdateGate / ConfigGate keys MUST stay on your
    airgapped/LUKS flow, not on generic validator boxes.

EOF_README

# 6) Tarball
echo "=== [pkg] building tarball ==="
mkdir -p "${DIST_DIR}"

tar -C "${DIST_DIR}" -czf "${DIST_DIR}/${PKG_NAME}.tar.gz" "${PKG_NAME}"

echo
echo "=== [pkg DONE] ==="
echo "Package root : ${PKG_ROOT}"
echo "Tarball      : ${DIST_DIR}/${PKG_NAME}.tar.gz"
echo
echo "You can copy that .tar.gz to another machine to run a VOID node (once real mainnet exists)."
