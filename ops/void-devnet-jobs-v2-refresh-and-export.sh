#!/usr/bin/env bash
set -euo pipefail

# systemd user units do NOT source your shell profile; make PATH explicit.
export PATH="$HOME/.foundry/bin:$HOME/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

cd "$HOME/dev/void-node"

./ops/void-devnet-job-spool-refresh.sh
./ops/void-devnet-jobs-status-v2-exporter.sh
