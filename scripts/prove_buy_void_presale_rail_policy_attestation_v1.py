#!/usr/bin/env python3
"""Read-only Buy VOID presale-rail policy attestation. Never a payment/launch tool."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_PRESALE_RAIL_POLICY_ATTESTATION_V1"
HOST_PARENT = "1b17ac5668b9b022935b577e15eba534116a9ea0"
FREEZE_PARENT = "bfdff02472c57439721ebed0a94498c691c68a9c"
EXPECTED = tuple(sorted((
    ".github/workflows/buy-void-presale-rail-policy-attestation-v1.yml",
    "docs/architecture/buy-void-presale-rail-policy-attestation-v1.md",
    "scripts/prove_buy_void_presale_rail_policy_attestation_v1.py",
)))
SOURCE_BLOBS = {
    "README.md": "6b52c555eb7d93b9ea6652d50aa946f6a319d7de",
    "docs/architecture/buy-void-dual-rail-server-policy-v1.md":
        "a8c2300f7f2b1296790bf496e02a997f7126310f",
    "docs/operators/wc-void-coupled-launch-regeneration-census-v2.md":
        "0a0479fe6f22d3b09458749a31a63f90a510ce5a",
    "docs/architecture/buy-void-presale-source-freeze-candidate-v1.md":
        "599203e3edb9deb39d7df6b0fd662373eee7ea30",
    "docs/operators/buy-void-precision-source-freeze-host-metadata-census-v1.md":
        "8ec7c32de83c673f26d53f91938d306b02086db1",
    "ops/security/buy-void-presale-source-freeze-candidate-v1.json":
        "91d2d7877bc3066e3030337576ca2dddeb55bfc8",
    "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json":
        "61a9d85d285f9c9d249adf401580822c44c6dac6",
    "scripts/void_buy_void_precision_source_freeze_host_metadata_census_v1.py":
        "e82feb591d3dfab838e0aeb597efab3f2b5866a3",
}
ENV = {
    "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C",
    "LC_ALL": "C", "TZ": "UTC", "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_NO_REPLACE_OBJECTS": "1", "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
}

def require(value: bool, reason: str) -> None:
    if not value:
        raise AssertionError(reason)

def git(*args: str) -> str:
    require(args and args[0] in ("rev-parse", "merge-base", "diff", "status", "ls-tree"),
            "git_operation_not_read_only")
    argv = [
        "/usr/bin/git", "--no-replace-objects", "-c", "core.hooksPath=/dev/null",
        "-c", "core.fsmonitor=false", "-C", str(ROOT), *args,
    ]
    result = subprocess.run(argv, env=ENV, stdin=subprocess.DEVNULL,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=40, check=False)
    require(result.returncode == 0, "git_refusal:" + args[0] + ":" +
            result.stderr.decode("utf-8", "replace")[-280:])
    return result.stdout.decode("utf-8", "strict").strip()

def read_pinned(relative: str, expected_blob: str) -> bytes:
    require(not Path(relative).is_absolute() and all(
        part not in ("", ".", "..") for part in relative.split("/")),
        "unsafe_path:" + relative)
    absolute = ROOT.joinpath(*relative.split("/"))
    before = absolute.lstat()
    require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and
            0 < before.st_size <= 1024 * 1024, "unsafe_file:" + relative)
    raw = absolute.read_bytes()
    after = absolute.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        require(getattr(before, field) == getattr(after, field),
                "file_generation_changed:" + relative + ":" + field)
    observed = hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()
    require(observed == expected_blob == git("rev-parse", "HEAD:" + relative),
            "historical_source_blob_drift:" + relative)
    require(git("ls-tree", "HEAD", "--", relative) ==
            "100644 blob " + expected_blob + "\t" + relative,
            "historical_source_mode_drift:" + relative)
    return raw

def prove() -> None:
    require(git("status", "--porcelain=v1", "--untracked-files=all") == "",
            "checkout_dirty")
    head = git("rev-parse", "HEAD")
    require(git("merge-base", HOST_PARENT, head) == HOST_PARENT,
            "host_metadata_parent_missing")
    require(git("merge-base", FREEZE_PARENT, head) == FREEZE_PARENT,
            "source_freeze_parent_missing")
    changed = tuple(sorted(line for line in git(
        "diff", "--no-renames", "--name-status", HOST_PARENT, head, "--"
    ).splitlines() if line))
    require(changed == tuple("A\t" + path for path in EXPECTED),
            "policy_attestation_not_additive_three_files")

    texts = {}
    for relative, blob in SOURCE_BLOBS.items():
        raw = read_pinned(relative, blob)
        if relative.endswith(".json"):
            texts[relative] = json.loads(raw.decode("utf-8", "strict"))
        else:
            texts[relative] = raw.decode("utf-8", "strict")

    readme = texts["README.md"]
    dual = texts["docs/architecture/buy-void-dual-rail-server-policy-v1.md"]
    wc = texts["docs/operators/wc-void-coupled-launch-regeneration-census-v2.md"]
    legacy = texts["docs/architecture/buy-void-presale-source-freeze-candidate-v1.md"]
    host = texts["docs/operators/buy-void-precision-source-freeze-host-metadata-census-v1.md"]
    manifest = texts["ops/security/buy-void-presale-source-freeze-candidate-v1.json"]
    lock = texts["ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json"]

    require("source-allowlisted to native USDC on Ethereum mainnet (chain ID `1`) "
            "and Base mainnet (chain ID `8453`) only" in readme,
            "current_approved_rails_not_source_documented")
    require("BTC/VOID remains post-presale and separately launch-gated" in readme,
            "post_presale_market_not_separated")
    require("No fixed WC-to-VOID redemption or conversion ratio exists" in readme,
            "wc_void_fixed_rate_claim_forbidden")
    require("Public presale intake and production WC/VOID market activation "
            "are coupled and remain closed" in readme,
            "public_launch_coupling_not_source_documented")

    for value in ("Base mainnet", "chain ID `8453`",
                  "Ethereum mainnet", "chain ID `1`",
                  "fixed rate: **2 VOID per 1 USDC**",
                  "finite presale maximum: **10,000,000 VOID**",
                  "accepted source asset: USDC",
                  "one payment may produce at most one fulfillment"):
        require(value in dual, "dual_rail_reviewed_policy_missing:" + value)
    require("canonical rate: 2 VOID per 1 USDC" in wc and
            "simultaneous presale/WC-VOID launch ordering" in wc,
            "wc_void_launch_rate_or_coupling_invalid")

    # Preserve evidence of the error; do not silently rewrite frozen documents.
    require("purchase safety with BTC-only presale" in legacy,
            "historical_btc_only_statement_changed_without_version")
    require("fixed 2 VOID per USDC native-USDC presale flow" in host,
            "reviewed_host_runbook_policy_missing")
    require(manifest.get("source_snapshot", {}).get("auto_adopt_new_main_commits")
            is False, "source_snapshot_automatically_advances")
    gates = manifest.get("release_gate", {})
    require(gates.get("btc_void_presale_and_wc_void_pool_coupled") is True,
            "legacy_ambiguous_launch_flag_changed")
    require(manifest.get("reviewed_v5_source_enforcement", {}).get(
            "candidate_enforcement_set_sha256") ==
            "1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf",
            "accepted_source_enforcement_changed")
    require(lock.get("candidate_enforcement_identity_accepted") is True,
            "source_lock_not_accepted")
    for flag in ("customer_payment_acceptance_authorized",
                 "public_presale_activation", "wc_void_activation",
                 "transaction_submission_authorized", "funds_movement"):
        require(gates.get(flag) is False,
                "freeze_live_authority_overclaim:" + flag)
    for flag in ("deployed_artifact_generation_verified",
                 "runtime_mount_authority",
                 "production_source_finality_authority_ready",
                 "public_presale_activation", "funds_movement"):
        require(lock.get(flag) is False, "lock_live_authority_overclaim:" + flag)

def main() -> None:
    require(sys.argv[1:] in ([], ["--self-test"]), "unsupported_mode")
    prove()
    print(MARKER + "_GREEN")
    print("read_only=true")
    print("presale_payment_asset=native_USDC")
    print("presale_source_chains=ethereum_1,base_8453")
    print("presale_void_per_usdc=2")
    print("presale_inventory_void=10000000")
    print("btc_void_market_post_presale=true")
    print("presale_wc_void_launch_coupled=true")
    print("wc_void_price_market_determined=true")
    print("frozen_btc_only_presale_statement_historical_incorrect=true")
    print("freeze_manifest_rewritten=false")
    print("source_snapshot_auto_advance=false")
    print("customer_payment_acceptance_authorized=false")
    print("public_presale_activation=false")
    print("wc_void_activation=false")
    print("funds_movement=false")
    print("status=PAYMENT_RAIL_DOCUMENTATION_RECONCILIATION_HOLD")

if __name__ == "__main__":
    main()
