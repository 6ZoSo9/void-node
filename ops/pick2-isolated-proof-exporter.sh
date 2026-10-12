#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

JSON_IN="${JSON_IN:-/tmp/void-pick2-fairness-proof/picks.jsonl}"
OUT_FILE="${OUT_FILE:-/tmp/void-pick2-isolated-proof.prom}"

python3 - "$JSON_IN" "$OUT_FILE" <<'PY'
import json, sys, pathlib, collections

json_in = pathlib.Path(sys.argv[1])
out_file = pathlib.Path(sys.argv[2])

rows = []
if json_in.exists():
    for line in json_in.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except Exception:
            pass

tasks = []
policies = []
requested_account = ""
for r in rows:
    j = (r or {}).get("job") or {}
    tasks.append(str(j.get("selected_task_class") or j.get("task_class") or j.get("kind") or ""))
    policies.append(str(j.get("selection_policy") or ""))
    if not requested_account:
        requested_account = str(j.get("requested_account") or "")

counts = collections.Counter(tasks)

max_streak = 0
cur = 0
prev = None
for t in tasks:
    if t == prev:
        cur += 1
    else:
        cur = 1
        prev = t
    max_streak = max(max_streak, cur)

ok = 1 if rows and max_streak <= 1 and counts.get("datanet_fetch_verify", 0) == counts.get("datanet_redundancy_check", 0) else 0

def esc(v: str) -> str:
    return v.replace("\\", "\\\\").replace('"', '\\"')

lines = [
    "# HELP void_pick2_isolated_proof_ok Last isolated pick2 fairness proof status (1=ok).",
    "# TYPE void_pick2_isolated_proof_ok gauge",
    f'void_pick2_isolated_proof_ok{{requested_account="{esc(requested_account)}"}} {ok}',
    "# HELP void_pick2_isolated_proof_max_streak Last isolated pick2 fairness proof max streak.",
    "# TYPE void_pick2_isolated_proof_max_streak gauge",
    f'void_pick2_isolated_proof_max_streak{{requested_account="{esc(requested_account)}"}} {max_streak}',
    "# HELP void_pick2_isolated_proof_fetch_verify_count Last isolated proof fetch_verify pick count.",
    "# TYPE void_pick2_isolated_proof_fetch_verify_count gauge",
    f'void_pick2_isolated_proof_fetch_verify_count{{requested_account="{esc(requested_account)}"}} {counts.get("datanet_fetch_verify", 0)}',
    "# HELP void_pick2_isolated_proof_redundancy_check_count Last isolated proof redundancy_check pick count.",
    "# TYPE void_pick2_isolated_proof_redundancy_check_count gauge",
    f'void_pick2_isolated_proof_redundancy_check_count{{requested_account="{esc(requested_account)}"}} {counts.get("datanet_redundancy_check", 0)}',
]

for policy, n in sorted(collections.Counter(policies).items()):
    lines.append("# HELP void_pick2_isolated_proof_policy_count Count of picks by policy in last isolated proof.")
    lines.append("# TYPE void_pick2_isolated_proof_policy_count gauge")
    lines.append(f'void_pick2_isolated_proof_policy_count{{requested_account="{esc(requested_account)}",policy="{esc(policy)}"}} {n}')

out_file.write_text("\n".join(lines) + "\n")
print(str(out_file))
PY
