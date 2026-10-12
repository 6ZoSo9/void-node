#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
OUTDIR="${OUTDIR:-$ROOT/releases}"
STAMP="${STAMP:-$(date +%Y%m%d-%H%M%S)}"
PKGDIR="$OUTDIR/void-node-beta-$STAMP"
TARBALL="$OUTDIR/void-node-beta-$STAMP.tar.gz"

mkdir -p "$OUTDIR"
rm -rf "$PKGDIR"
mkdir -p "$PKGDIR/ops"

cp -a "$ROOT/BETA_READY.md" "$PKGDIR/"
cp -a "$ROOT/PUBLIC_BETA.md" "$PKGDIR/"
cp -a "$ROOT/README.md" "$PKGDIR/"
cp -a "$ROOT/ops/BETA_BASELINE_2026-03-23.md" "$PKGDIR/ops/"
cp -a "$ROOT/ops/SELF_HOSTED_BETA_CI_PLAN.md" "$PKGDIR/ops/"
cp -a "$ROOT/ops/public-beta-quickstart.sh" "$PKGDIR/ops/"
cp -a "$ROOT/ops/install-devbox-ubuntu.sh" "$PKGDIR/ops/"
cp -a "$ROOT/ops/install-user-units.sh" "$PKGDIR/ops/"
cp -a "$ROOT/ops/first-run-smoke.sh" "$PKGDIR/ops/"
cp -a "$ROOT/ops/install-path-status.sh" "$PKGDIR/ops/"

cat > "$PKGDIR/ops/README_BETA_PACK.txt" <<'TXT'
VOID Node beta pack contents

Start here:
- BETA_READY.md
- PUBLIC_BETA.md

Fastest path:
- ./ops/public-beta-quickstart.sh

Live status:
- ./ops/install-path-status.sh

Notes:
- This pack is a handoff surface, not a standalone binary distribution.
- Run from a real void-node checkout/workstation environment.
TXT

tar -C "$OUTDIR" -czf "$TARBALL" "void-node-beta-$STAMP"

echo "PASS beta-release-pack"
echo "package_dir=$PKGDIR"
echo "tarball=$TARBALL"
ls -lah "$TARBALL"
