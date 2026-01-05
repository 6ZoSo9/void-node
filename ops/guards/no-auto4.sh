#!/usr/bin/env bash
set -euo pipefail

# Fail if the forbidden legacy job name / files reappear anywhere we care about.
# This is intentionally cheap + blunt.
PAT='void-proposer-auto4|proposer\.auto4\.prom|auto4-recording|auto4-alerts'

# Repo side (committed stuff)
if rg -n "$PAT" . >/dev/null 2>&1; then
  echo "[ERR] found forbidden auto4 strings in repo:"
  rg -n "$PAT" . || true
  exit 1
fi

# Host Prom side (best-effort if present; does NOT require root to fail repo checks)
if [[ -d /etc/prometheus ]]; then
  if rg -n "$PAT" /etc/prometheus >/dev/null 2>&1; then
    echo "[ERR] found forbidden auto4 strings under /etc/prometheus:"
    rg -n "$PAT" /etc/prometheus || true
    exit 1
  fi
fi

echo "[ok] guard: no auto4 anywhere (repo + /etc/prometheus)"
