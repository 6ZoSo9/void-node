#!/usr/bin/env bash
set -euo pipefail
F="src/index.ts"

python3 - <<'PY'
from pathlib import Path
import re, sys

lines = Path("src/index.ts").read_text().splitlines()

# Remove obvious strings/backticks to avoid brace noise.
def strip_strings(s: str) -> str:
  # naive but good enough for our guard: nuke ', ", and ` strings
  s = re.sub(r"`[^`]*`", "``", s)
  s = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', '""', s)
  s = re.sub(r"'[^'\\]*(?:\\.[^'\\]*)*'", "''", s)
  return s

# Detect handler start like: app.use((req,...)=>{ or app.get("/x",(req,... )=>{ ... })
HANDLER_RE = re.compile(r"\bapp\.(use|get|post|put|delete|all)\s*\(")

brace_depth = 0
in_handler = False
handler_depth = None
saw_req_ref = False
saw_metrics_path = False
bad = []

pending_handler = False
pending_set_depth = None

for i, raw in enumerate(lines):
  s = strip_strings(raw)

  # Start detection: we only consider we're "in handler" when we see app.<verb>( ... (req ...)
  if not in_handler:
    if HANDLER_RE.search(s):
      # cheap check: req appears somewhere after the call open
      if re.search(r"\(\s*req\b", s) or re.search(r",\s*\(\s*req\b", s) or "function (req" in s or "function(req" in s:
        # we will enter handler when we hit the first '{' of that line (or subsequent line)
        pending_handler = True

  # If pending, and this line contains an opening brace, we enter handler at depth+1
  if (not in_handler) and pending_handler:
    if "{" in s:
      handler_depth = brace_depth + 1
      in_handler = True
      pending_handler = False
      saw_req_ref = False
      saw_metrics_path = False

  # If in handler, record req/metrics usage and flag console.log only inside handler
  if in_handler:
    if ("req.path" in s) or ("req.originalUrl" in s) or ("req.url" in s):
      saw_req_ref = True
    if "/metrics/void" in raw:
      saw_metrics_path = True
    if "console.log(" in s and (saw_req_ref and saw_metrics_path):
      bad.append((i+1, raw.strip()))

  # Update brace depth (after checks is fine as long as handler_depth was set pre-update)
  opens = s.count("{")
  closes = s.count("}")
  brace_depth += opens - closes

  # Exit handler when we pop back above the handler depth
  if in_handler and handler_depth is not None and brace_depth < handler_depth:
    in_handler = False
    handler_depth = None
    saw_req_ref = False
    saw_metrics_path = False

if bad:
  print("[FAIL] metrics hot-path console.log detected INSIDE req-handlers in src/index.ts")
  for n, ln in bad[:80]:
    print(f"{n}:{ln}")
  sys.exit(2)

print("[ok] no console.log inside req.path-gated /metrics/void handlers found")
PY
