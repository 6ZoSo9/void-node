#!/usr/bin/env bash
set -euo pipefail

MAIN_DIR="$HOME/dev/void-node"
SAFE_DIR="$HOME/dev/void-node.safe"

echo "[safeboot-diag] MAIN_DIR=${MAIN_DIR}"
echo "[safeboot-diag] SAFE_DIR=${SAFE_DIR}"
echo

echo "=== [1] main repo state ==="
if [ -d "${MAIN_DIR}/.git" ]; then
  cd "${MAIN_DIR}"
  echo "[main] pwd=$(pwd)"
  git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "[main] (no branch)"
  git rev-parse HEAD 2>/dev/null || echo "[main] (no HEAD)"
  echo
  git status --short || true
else
  echo "[main] ${MAIN_DIR} is missing or not a git repo"
fi
echo

echo "=== [2] safeboot repo state ==="
if [ -d "${SAFE_DIR}" ]; then
  cd "${SAFE_DIR}"
  echo "[safe] pwd=$(pwd)"
  if [ -d .git ]; then
    git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "[safe] (no branch)"
    git rev-parse HEAD 2>/dev/null || echo "[safe] (no HEAD)"
    echo
    git status --short || true
  else
    echo "[safe] WARNING: ${SAFE_DIR} is not a git repo (likely an rsync/clone)"
    ls -1 || true
  fi
else
  echo "[safe] ${SAFE_DIR} does not exist"
fi
echo

echo "=== [3] HEAD comparison (if both git) ==="
if [ -d "${MAIN_DIR}/.git" ] && [ -d "${SAFE_DIR}/.git" ]; then
  MAIN_HEAD=$(cd "${MAIN_DIR}" && git rev-parse HEAD 2>/dev/null || echo "UNKNOWN")
  SAFE_HEAD=$(cd "${SAFE_DIR}" && git rev-parse HEAD 2>/dev/null || echo "UNKNOWN")
  echo "[compare] main HEAD = ${MAIN_HEAD}"
  echo "[compare] safe HEAD = ${SAFE_HEAD}"
  if [ "${MAIN_HEAD}" = "${SAFE_HEAD}" ]; then
    echo "[compare] SAFEBOOT tree is at the same commit as main."
  else
    echo "[compare] SAFEBOOT tree is at a DIFFERENT commit than main."
  fi
else
  echo "[compare] cannot compare HEADs (one or both trees lack .git)"
fi

echo
echo "[safeboot-diag] DONE"
