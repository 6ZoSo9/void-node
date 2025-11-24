#!/usr/bin/env bash
set -euo pipefail

MAIN_DIR="$HOME/dev/void-node"
SAFEWT_DIR="$HOME/dev/void-node.safewt"

echo "[safeboot-worktree-prepare] MAIN_DIR=${MAIN_DIR}"
echo "[safeboot-worktree-prepare] SAFEWT_DIR=${SAFEWT_DIR}"
echo

if [ ! -d "${MAIN_DIR}/.git" ]; then
  echo "[FATAL] ${MAIN_DIR} is not a git repo; aborting." >&2
  exit 1
fi

cd "${MAIN_DIR}"

if [ -d "${SAFEWT_DIR}" ]; then
  echo "[info] ${SAFEWT_DIR} already exists; not touching it."
  echo "[info] If you want a fresh safeboot worktree, move or remove that directory and rerun."
  exit 0
fi

HEAD_COMMIT=$(git rev-parse HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD || echo "DETACHED")

echo "[info] main branch = ${BRANCH}"
echo "[info] main HEAD   = ${HEAD_COMMIT}"
echo "[info] creating worktree at ${SAFEWT_DIR} from HEAD"
echo

git worktree add "${SAFEWT_DIR}" "${HEAD_COMMIT}"

echo
echo "[safeboot-worktree-prepare] DONE. Summary:"
echo "  - Worktree: ${SAFEWT_DIR}"
echo "  - Source:   ${HEAD_COMMIT} (${BRANCH})"
echo
echo "Next steps (later, not now):"
echo "  - Point a safeboot systemd unit at ${SAFEWT_DIR}"
echo "  - Use a non-conflicting HTTP port + DATA_DIR"
echo "  - Mirror a subset of mainnet exporters under safeboot-specific metrics."
