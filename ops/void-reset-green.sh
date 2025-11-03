#!/usr/bin/env bash
set -euo pipefail
/usr/bin/sudo /usr/local/bin/void-breadcrumbs-refresh.sh
/usr/bin/sudo /usr/local/bin/void-rollup-textfile.sh
/usr/bin/sudo /usr/local/bin/void-overall-textfile.sh
echo "OK: recomputed lag + refreshed rollups"
