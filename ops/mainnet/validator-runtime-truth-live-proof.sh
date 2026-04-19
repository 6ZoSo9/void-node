#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

DIR="${1:-${DIR:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current}}"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== [1] live proof ==="
python3 - "$DIR" "$BASE" <<'PY'
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

dir_path = Path(sys.argv[1]).resolve()
base = sys.argv[2].rstrip("/")

files = sorted(dir_path.glob("epoch-*.manifest.verified.json"))
if not files:
    raise SystemExit(f"[ERR] no verified manifests found in {dir_path}")

manifests = {}
for p in files:
    j = json.loads(p.read_text())
    manifests[int(j["epoch"])] = j

loaded_epochs = sorted(manifests.keys())
latest_epoch = loaded_epochs[-1]
m = manifests[latest_epoch]

def get_json(path: str):
    url = f"{base}{path}"
    try:
        with urllib.request.urlopen(url) as r:
            body = r.read().decode("utf-8", "replace")
            return r.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            payload = json.loads(body)
        except Exception:
            payload = {"raw": body}
        return e.code, payload

status_code, status = get_json("/__void/runtime/validator-truth/status")
print("--- status")
print(json.dumps(status, indent=2))
assert status_code == 200, (status_code, status)
assert status["ok"] is True, status
assert status["configuredMode"] == "verified_epoch_manifests", status
assert status["mode"] == "verified_epoch_manifests", status
assert status["loadedEpochs"] == loaded_epochs, (status["loadedEpochs"], loaded_epochs)
assert status["latestEpoch"] == latest_epoch, (status["latestEpoch"], latest_epoch)

epoch_code, epoch_payload = get_json(f"/__void/runtime/validator-truth/epoch/{latest_epoch}")
print("--- epoch")
print(json.dumps(epoch_payload, indent=2))
assert epoch_code == 200, (epoch_code, epoch_payload)
summary = epoch_payload["summary"]
assert summary["epoch"] == latest_epoch, summary
assert int(summary["requestedStartSlot"]) == int(m["requestedStartSlot"]), summary
assert int(summary["requestedEndSlotExclusive"]) == int(m["requestedEndSlotExclusive"]), summary
assert int(summary["validatorCount"]) == int(m["validatorCount"]), summary
assert str(summary["totalPower"]) == str(m["totalPower"]), summary
assert bool(summary["published"]) == bool(m["published"]), summary
assert bool(summary["publishedMatch"]) == bool(m["publishedMatch"]), summary
assert int(summary["scheduleWindowLength"]) == len(m.get("scheduleWindow") or []), summary

start = int(m["requestedStartSlot"])
end = int(m["requestedEndSlotExclusive"])
first_slot = start
slot0_expected = (m.get("scheduleWindow") or [])[0]

prop_code, prop_payload = get_json(f"/__void/runtime/validator-truth/proposer/{latest_epoch}/{first_slot}")
print("--- proposer")
print(json.dumps(prop_payload, indent=2))
assert prop_code == 200, (prop_code, prop_payload)
proposer = prop_payload["proposer"]
assert int(proposer["epoch"]) == latest_epoch, proposer
assert int(proposer["slot"]) == first_slot, proposer
assert proposer["reward"] == slot0_expected["reward"], (proposer, slot0_expected)
assert str(proposer["effectivePower"]) == str(slot0_expected["effectivePower"]), (proposer, slot0_expected)
assert int(proposer["validatorCount"]) == int(m["validatorCount"]), proposer
assert str(proposer["totalPower"]) == str(m["totalPower"]), proposer

win_code, win_payload = get_json(f"/__void/runtime/validator-truth/window/{latest_epoch}/{start}/{end}")
print("--- window")
print(json.dumps(win_payload, indent=2))
assert win_code == 200, (win_code, win_payload)
window = win_payload["window"]
expected_window = m.get("scheduleWindow") or []
assert len(window) == len(expected_window), (len(window), len(expected_window))

for idx, (got, exp) in enumerate(zip(window, expected_window)):
    assert int(got["epoch"]) == latest_epoch, (idx, got)
    assert int(got["slot"]) == int(exp["slot"]), (idx, got, exp)
    assert got["reward"] == exp["reward"], (idx, got, exp)
    assert str(got["effectivePower"]) == str(exp["effectivePower"]), (idx, got, exp)

print()
print(f"[ok] live validator runtime truth matches disk manifests for epoch {latest_epoch} window=[{start},{end})")
PY
