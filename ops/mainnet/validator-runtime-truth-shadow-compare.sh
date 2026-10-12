#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

DIR="${1:-${DIR:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current}}"
BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_JSON="${OUT_JSON:-/tmp/validator-runtime-truth-shadow-compare.${STAMP}.json}"
STRICT="${STRICT:-0}"

python3 - "$DIR" "$BASE" "$OUT_JSON" "$STRICT" <<'PY'
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

dir_path = Path(sys.argv[1]).resolve()
base = sys.argv[2].rstrip("/")
out_json = Path(sys.argv[3]).resolve()
strict = str(sys.argv[4]).strip() == "1"

files = sorted(dir_path.glob("epoch-*.manifest.verified.json"))
if not files:
    raise SystemExit(f"[ERR] no verified manifests found in {dir_path}")

manifests = {}
for p in files:
    j = json.loads(p.read_text())
    manifests[int(j["epoch"])] = j

def get_json(path: str):
    url = f"{base}{path}"
    try:
        with urllib.request.urlopen(url) as r:
            return r.status, json.loads(r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            payload = json.loads(body)
        except Exception:
            payload = {"raw": body}
        return e.code, payload

report = {
    "ok": True,
    "base": base,
    "dir": str(dir_path),
    "loadedEpochsFromDisk": sorted(manifests.keys()),
    "mismatches": [],
    "checked": {
        "status": False,
        "epochs": [],
        "proposers": [],
        "windows": [],
    },
}

def mismatch(kind, where, expected, got):
    report["ok"] = False
    report["mismatches"].append({
        "kind": kind,
        "where": where,
        "expected": expected,
        "got": got,
    })

status_code, status = get_json("/__void/runtime/validator-truth/status")
report["checked"]["status"] = True

if status_code != 200:
    mismatch("http_status", "/status", 200, status_code)
else:
    if status.get("ok") is not True:
        mismatch("status.ok", "/status", True, status.get("ok"))
    if status.get("configuredMode") != "verified_epoch_manifests":
        mismatch("status.configuredMode", "/status", "verified_epoch_manifests", status.get("configuredMode"))
    if status.get("mode") != "verified_epoch_manifests":
        mismatch("status.mode", "/status", "verified_epoch_manifests", status.get("mode"))
    if status.get("loadedEpochs") != sorted(manifests.keys()):
        mismatch("status.loadedEpochs", "/status", sorted(manifests.keys()), status.get("loadedEpochs"))
    latest_disk = sorted(manifests.keys())[-1]
    if status.get("latestEpoch") != latest_disk:
        mismatch("status.latestEpoch", "/status", latest_disk, status.get("latestEpoch"))

for epoch in sorted(manifests.keys()):
    m = manifests[epoch]
    start = int(m["requestedStartSlot"])
    end = int(m["requestedEndSlotExclusive"])
    schedule = m.get("scheduleWindow") or []

    epoch_path = f"/__void/runtime/validator-truth/epoch/{epoch}"
    epoch_code, epoch_payload = get_json(epoch_path)
    report["checked"]["epochs"].append(epoch_path)
    if epoch_code != 200:
        mismatch("http_status", epoch_path, 200, epoch_code)
    else:
        s = epoch_payload.get("summary") or {}
        if int(s.get("epoch", -1)) != epoch:
            mismatch("epoch.summary.epoch", epoch_path, epoch, s.get("epoch"))
        if int(s.get("requestedStartSlot", -1)) != start:
            mismatch("epoch.summary.requestedStartSlot", epoch_path, start, s.get("requestedStartSlot"))
        if int(s.get("requestedEndSlotExclusive", -1)) != end:
            mismatch("epoch.summary.requestedEndSlotExclusive", epoch_path, end, s.get("requestedEndSlotExclusive"))
        if int(s.get("validatorCount", -1)) != int(m["validatorCount"]):
            mismatch("epoch.summary.validatorCount", epoch_path, int(m["validatorCount"]), s.get("validatorCount"))
        if str(s.get("totalPower")) != str(m["totalPower"]):
            mismatch("epoch.summary.totalPower", epoch_path, str(m["totalPower"]), s.get("totalPower"))
        if bool(s.get("published")) != bool(m["published"]):
            mismatch("epoch.summary.published", epoch_path, bool(m["published"]), s.get("published"))
        if bool(s.get("publishedMatch")) != bool(m["publishedMatch"]):
            mismatch("epoch.summary.publishedMatch", epoch_path, bool(m["publishedMatch"]), s.get("publishedMatch"))
        if int(s.get("scheduleWindowLength", -1)) != len(schedule):
            mismatch("epoch.summary.scheduleWindowLength", epoch_path, len(schedule), s.get("scheduleWindowLength"))

    for entry in schedule:
        slot = int(entry["slot"])
        prop_path = f"/__void/runtime/validator-truth/proposer/{epoch}/{slot}"
        prop_code, prop_payload = get_json(prop_path)
        report["checked"]["proposers"].append(prop_path)
        if prop_code != 200:
            mismatch("http_status", prop_path, 200, prop_code)
            continue
        p = prop_payload.get("proposer") or {}
        if int(p.get("epoch", -1)) != epoch:
            mismatch("proposer.epoch", prop_path, epoch, p.get("epoch"))
        if int(p.get("slot", -1)) != slot:
            mismatch("proposer.slot", prop_path, slot, p.get("slot"))
        if p.get("reward") != entry["reward"]:
            mismatch("proposer.reward", prop_path, entry["reward"], p.get("reward"))
        if str(p.get("effectivePower")) != str(entry["effectivePower"]):
            mismatch("proposer.effectivePower", prop_path, str(entry["effectivePower"]), p.get("effectivePower"))
        if int(p.get("validatorCount", -1)) != int(m["validatorCount"]):
            mismatch("proposer.validatorCount", prop_path, int(m["validatorCount"]), p.get("validatorCount"))
        if str(p.get("totalPower")) != str(m["totalPower"]):
            mismatch("proposer.totalPower", prop_path, str(m["totalPower"]), p.get("totalPower"))
        if bool(p.get("published")) != bool(m["published"]):
            mismatch("proposer.published", prop_path, bool(m["published"]), p.get("published"))
        if bool(p.get("publishedMatch")) != bool(m["publishedMatch"]):
            mismatch("proposer.publishedMatch", prop_path, bool(m["publishedMatch"]), p.get("publishedMatch"))

    win_path = f"/__void/runtime/validator-truth/window/{epoch}/{start}/{end}"
    win_code, win_payload = get_json(win_path)
    report["checked"]["windows"].append(win_path)
    if win_code != 200:
        mismatch("http_status", win_path, 200, win_code)
    else:
        got_window = win_payload.get("window") or []
        if len(got_window) != len(schedule):
            mismatch("window.length", win_path, len(schedule), len(got_window))
        for idx, (got, exp) in enumerate(zip(got_window, schedule)):
            where = f"{win_path}#{idx}"
            if int(got.get("epoch", -1)) != epoch:
                mismatch("window.epoch", where, epoch, got.get("epoch"))
            if int(got.get("slot", -1)) != int(exp["slot"]):
                mismatch("window.slot", where, int(exp["slot"]), got.get("slot"))
            if got.get("reward") != exp["reward"]:
                mismatch("window.reward", where, exp["reward"], got.get("reward"))
            if str(got.get("effectivePower")) != str(exp["effectivePower"]):
                mismatch("window.effectivePower", where, str(exp["effectivePower"]), got.get("effectivePower"))

out_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

print("=== [shadow compare summary] ===")
print(f"dir={dir_path}")
print(f"base={base}")
print(f"out_json={out_json}")
print(f"ok={report['ok']}")
print(f"mismatch_count={len(report['mismatches'])}")
if report["mismatches"]:
    print("--- mismatches ---")
    for item in report["mismatches"][:50]:
        print(json.dumps(item, sort_keys=True))
    if len(report["mismatches"]) > 50:
        print(f"... truncated {len(report['mismatches']) - 50} additional mismatches ...")

if strict and not report["ok"]:
    raise SystemExit(1)
PY

echo
echo "[ok] wrote $OUT_JSON"
