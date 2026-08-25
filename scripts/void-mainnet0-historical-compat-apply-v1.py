#!/usr/bin/env python3
from __future__ import annotations

import os
import shlex
import subprocess
import sys
from pathlib import Path

BRANCH = "fix/mainnet0-historical-public-bootstrap-compat-v1-20260825"
BASE = "face0d06328a5703cd9c2bcc9cd23bc782fa95f6"
HELPER = "scripts/void-mainnet0-historical-compat-apply-v1.py"
EXPECTED_FINAL = sorted([
    ".github/workflows/void-public-bootstrap-client-resilience-v1.yml",
    "docs/public/mainnet0-historical-public-bootstrap-compat-v1.md",
    "scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs",
    "scripts/prove_mainnet0_historical_public_bootstrap_v1.mjs",
    "src/chain/mainnet0_historical_compat_v1.ts",
    "src/chain/seg_store.ts",
    "src/http/follower_routes.ts",
    "src/http/follower_verified_public_bootstrap_authority_v1.ts",
    "src/node_core.ts",
])


def q(args):
    return " ".join(shlex.quote(str(x)) for x in args)


def run(args, cwd=None, capture=False):
    print(f"+ {q(args)}")
    r = subprocess.run(
        [str(x) for x in args],
        cwd=str(cwd) if cwd else None,
        text=True,
        capture_output=capture,
    )
    if capture:
        if r.stdout:
            print(r.stdout, end="" if r.stdout.endswith("\n") else "\n")
        if r.stderr:
            print(r.stderr, end="" if r.stderr.endswith("\n") else "\n", file=sys.stderr)
    if r.returncode != 0:
        raise RuntimeError(f"command failed rc={r.returncode}: {q(args)}")
    return r.stdout.strip() if capture else ""


def git(*args, capture=True):
    return run(["git", *args], capture=capture)


def replace(path, old, new, count=1):
    p = Path(path)
    text = p.read_text()
    seen = text.count(old)
    if seen != count:
        raise RuntimeError(f"{path}: expected anchor count={count}, observed={seen}")
    p.write_text(text.replace(old, new))
    print(f"patched={path}")


def main():
    root = Path(git("rev-parse", "--show-toplevel")).resolve()
    os.chdir(root)
    branch = git("branch", "--show-current")
    head = git("rev-parse", "HEAD")
    print(f"repo={root}")
    print(f"branch={branch}")
    print(f"head_before={head}")
    print("runtime_mutation=false")
    print("chain_mutation=false")
    print("wallet_authority=false")
    print("validator_authority=false")
    print("money_movement_authority=false")
    if branch != BRANCH:
        raise RuntimeError(f"HOLD: expected branch {BRANCH}, got {branch}")
    if git("status", "--porcelain", "--untracked-files=all"):
        raise RuntimeError("HOLD: worktree is not clean before repair")
    base = git("merge-base", "HEAD", BASE)
    if base != BASE:
        raise RuntimeError("HOLD: repair branch is not descended from reviewed base")

    replace(
        "src/node_core.ts",
        '''import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  validateLegacyCommitDirectV2fsForAppendV1,
} from "./chain/legacy_commit_direct_v2fs_v1.js";
import { followerLegacyV2fsOriginAuthorizedV1 } from "./http/follower_legacy_v2fs_authority_v1.js";
''',
        '''import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  validateLegacyCommitDirectV2fsForAppendV1,
} from "./chain/legacy_commit_direct_v2fs_v1.js";
import {
  isMainnet0GenesisMinimalV1,
  validateMainnet0GenesisMinimalForAppendV1,
} from "./chain/mainnet0_historical_compat_v1.js";
import { followerLegacyV2fsOriginAuthorizedV1 } from "./http/follower_legacy_v2fs_authority_v1.js";
import { followerVerifiedPublicBootstrapOriginAuthorizedV1 } from "./http/follower_verified_public_bootstrap_authority_v1.js";
''',
    )

    replace(
        "src/node_core.ts",
        '''    const legacyV2fsOriginAuthorized = followerLegacyV2fsOriginAuthorizedV1(
      peerHttp,
      process.env.VOID_FOLLOWER_LEGACY_V2FS_ORIGINS,
    );

    const validateFollowerBlockV1 = (
      block: any,
      parent: any,
    ): { ok: true; legacyV2fs: boolean } | { ok: false; reason: string } => {
      const hasCommitMarker =
        !!block &&
        typeof block === "object" &&
        !Array.isArray(block) &&
        Object.prototype.hasOwnProperty.call(block, "_commit");
      if (hasCommitMarker) {
        if (block._commit !== VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1) {
          return { ok: false, reason: "legacy_v2fs_marker_mismatch" };
        }
        if (!legacyV2fsOriginAuthorized) {
          return { ok: false, reason: "legacy_v2fs_origin_not_authorized" };
        }
        const legacy = validateLegacyCommitDirectV2fsForAppendV1(block, parent);
        if (legacy.ok === false) {
          return { ok: false, reason: legacy.reason };
        }
        return { ok: true, legacyV2fs: true };
      }

      const modern = validateBlockForAppend(block, parent as any);
      if (modern.ok === false) {
        return { ok: false, reason: modern.reason };
      }
      return { ok: true, legacyV2fs: false };
    };

    const saveFollowerBlockV1 = (
      block: any,
      admission: { ok: true; legacyV2fs: boolean },
    ): void => {
      if (admission.legacyV2fs) {
        this.store.saveAuthorizedLegacyCommitDirectV2fs(block);
        return;
      }
      this.store.saveBlock(block);
    };
''',
        '''    const verifiedPublicBootstrapOriginAuthorized =
      followerVerifiedPublicBootstrapOriginAuthorizedV1(peerHttp);
    const legacyV2fsOriginAuthorized =
      verifiedPublicBootstrapOriginAuthorized ||
      followerLegacyV2fsOriginAuthorizedV1(
        peerHttp,
        process.env.VOID_FOLLOWER_LEGACY_V2FS_ORIGINS,
      );

    type FollowerBlockAdmissionV1 =
      | {
          ok: true;
          mode: "genesis-minimal-v1" | "legacy-v2fs" | "modern";
        }
      | { ok: false; reason: string };

    const validateFollowerBlockV1 = (
      block: any,
      parent: any,
    ): FollowerBlockAdmissionV1 => {
      if (isMainnet0GenesisMinimalV1(block)) {
        if (!verifiedPublicBootstrapOriginAuthorized) {
          return { ok: false, reason: "mainnet0_minimal_origin_not_authorized" };
        }
        const minimal = validateMainnet0GenesisMinimalForAppendV1(block, parent);
        if (minimal.ok === false) {
          return { ok: false, reason: minimal.reason };
        }
        return { ok: true, mode: "genesis-minimal-v1" };
      }

      const hasCommitMarker =
        !!block &&
        typeof block === "object" &&
        !Array.isArray(block) &&
        Object.prototype.hasOwnProperty.call(block, "_commit");
      if (hasCommitMarker) {
        if (block._commit !== VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1) {
          return { ok: false, reason: "legacy_v2fs_marker_mismatch" };
        }
        if (!legacyV2fsOriginAuthorized) {
          return { ok: false, reason: "legacy_v2fs_origin_not_authorized" };
        }
        const legacy = validateLegacyCommitDirectV2fsForAppendV1(block, parent);
        if (legacy.ok === false) {
          return { ok: false, reason: legacy.reason };
        }
        return { ok: true, mode: "legacy-v2fs" };
      }

      const modern = validateBlockForAppend(block, parent as any);
      if (modern.ok === false) {
        return { ok: false, reason: modern.reason };
      }
      return { ok: true, mode: "modern" };
    };

    const saveFollowerBlockV1 = (
      block: any,
      admission: Extract<FollowerBlockAdmissionV1, { ok: true }>,
    ): void => {
      if (admission.mode === "genesis-minimal-v1") {
        this.store.saveAuthorizedMainnet0GenesisMinimalV1(block);
        return;
      }
      if (admission.mode === "legacy-v2fs") {
        this.store.saveAuthorizedMainnet0HistoricalLegacyV2fs(block);
        return;
      }
      this.store.saveBlock(block);
    };
''',
    )

    replace(
        "src/chain/seg_store.ts",
        'import { validateLegacyCommitDirectV2fsForAppendV1 } from "./legacy_commit_direct_v2fs_v1.js";\n',
        '''import { validateLegacyCommitDirectV2fsForAppendV1 } from "./legacy_commit_direct_v2fs_v1.js";
import {
  validateMainnet0GenesisMinimalForAppendV1,
  validateMainnet0HistoricalTransitionV1,
  type Mainnet0HistoricalAppendModeV1,
} from "./mainnet0_historical_compat_v1.js";
''',
    )
    replace(
        "src/chain/seg_store.ts",
        '''type CanonicalAppendModeV1 = "modern" | "legacy-v2fs";
type WalRecV1 = { v: 1; n: number; b64: string; ts: number };
type WalRecV2 = { v: 2; mode: "legacy-v2fs"; n: number; b64: string; ts: number };
''',
        '''type CanonicalAppendModeV1 = "modern" | Mainnet0HistoricalAppendModeV1;
type WalRecV1 = { v: 1; n: number; b64: string; ts: number };
type WalRecV2 = { v: 2; mode: "legacy-v2fs"; n: number; b64: string; ts: number };
type WalRecV3 = { v: 3; mode: "genesis-minimal-v1"; n: number; b64: string; ts: number };
type WalRecV4 = { v: 4; mode: "legacy-v2fs-historical-v1"; n: number; b64: string; ts: number };
''',
    )
    replace(
        "src/chain/seg_store.ts",
        '''  public saveAuthorizedLegacyCommitDirectV2fs(b: any): void {
    this.saveCanonicalBlockByModeV1(b, "legacy-v2fs");
  }

  private validateCanonicalBlockByModeV1(
    b: any,
    parent: Block | null,
    mode: CanonicalAppendModeV1,
  ) {
    return mode === "legacy-v2fs"
      ? validateLegacyCommitDirectV2fsForAppendV1(b, parent as any)
      : validateBlockForAppend(b, parent as any);
  }
''',
        '''  public saveAuthorizedLegacyCommitDirectV2fs(b: any): void {
    this.saveCanonicalBlockByModeV1(b, "legacy-v2fs");
  }

  public saveAuthorizedMainnet0GenesisMinimalV1(b: any): void {
    this.saveCanonicalBlockByModeV1(b, "genesis-minimal-v1", true);
  }

  public saveAuthorizedMainnet0HistoricalLegacyV2fs(b: any): void {
    this.saveCanonicalBlockByModeV1(b, "legacy-v2fs", true);
  }

  private validateCanonicalBlockByModeV1(
    b: any,
    parent: Block | null,
    mode: CanonicalAppendModeV1,
  ) {
    if (mode === "genesis-minimal-v1") {
      return validateMainnet0GenesisMinimalForAppendV1(b, parent as any);
    }
    return mode === "legacy-v2fs"
      ? validateLegacyCommitDirectV2fsForAppendV1(b, parent as any)
      : validateBlockForAppend(b, parent as any);
  }
''',
    )
    replace(
        "src/chain/seg_store.ts",
        '''      if (mode === "legacy-v2fs") {
        return JSON.stringify(existing) === JSON.stringify(candidate);
      }
''',
        '''      if (mode !== "modern") {
        return JSON.stringify(existing) === JSON.stringify(candidate);
      }
''',
    )
    replace(
        "src/chain/seg_store.ts",
        '''  private saveCanonicalBlockByModeV1(
    b: any,
    mode: CanonicalAppendModeV1,
  ): void {
''',
        '''  private saveCanonicalBlockByModeV1(
    b: any,
    mode: CanonicalAppendModeV1,
    mainnet0HistoricalRatchet = false,
  ): void {
''',
    )
    replace(
        "src/chain/seg_store.ts",
        '''    const parent = n === 0 ? null : this.loadBlock(n - 1);
    const valid = this.validateCanonicalBlockByModeV1(b, parent as any, mode);
    if (!valid.ok) {
      const op = mode === "legacy-v2fs"
        ? "saveAuthorizedLegacyCommitDirectV2fs"
        : "saveBlock";
      throw new Error(
        `SegStore.${op}: invalid block: ${(valid as any).reason || "unknown"}`,
      );
    }
''',
        '''    const parent = n === 0 ? null : this.loadBlock(n - 1);
    const op =
      mode === "genesis-minimal-v1"
        ? "saveAuthorizedMainnet0GenesisMinimalV1"
        : mode === "legacy-v2fs" && mainnet0HistoricalRatchet
          ? "saveAuthorizedMainnet0HistoricalLegacyV2fs"
          : mode === "legacy-v2fs"
            ? "saveAuthorizedLegacyCommitDirectV2fs"
            : "saveBlock";

    if (mainnet0HistoricalRatchet) {
      if (mode === "modern") {
        throw new Error("SegStore.saveBlock: modern mode cannot request historical ratchet");
      }
      const transition = validateMainnet0HistoricalTransitionV1(parent, mode);
      if (!transition.ok) {
        throw new Error(
          `SegStore.${op}: invalid historical transition: ${(transition as any).reason || "unknown"}`,
        );
      }
    }

    const valid = this.validateCanonicalBlockByModeV1(b, parent as any, mode);
    if (!valid.ok) {
      throw new Error(
        `SegStore.${op}: invalid block: ${(valid as any).reason || "unknown"}`,
      );
    }
''',
    )
    replace(
        "src/chain/seg_store.ts",
        '    this.walAppendDurable(seg, b, mode);\n',
        '    this.walAppendDurable(seg, b, mode, mainnet0HistoricalRatchet);\n',
    )
    replace(
        "src/chain/seg_store.ts",
        '  private walAppendDurable(seg: string, b: any, mode: CanonicalAppendModeV1) {\n',
        '''  private walAppendDurable(
    seg: string,
    b: any,
    mode: CanonicalAppendModeV1,
    mainnet0HistoricalRatchet = false,
  ) {
''',
    )
    replace(
        "src/chain/seg_store.ts",
        '''      const rec: WalRecV1 | WalRecV2 = mode === "legacy-v2fs"
        ? { v: 2, mode: "legacy-v2fs", n: Number(b.number), b64: body.toString("base64"), ts: Date.now() }
        : { v: 1, n: Number(b.number), b64: body.toString("base64"), ts: Date.now() };
''',
        '''      const rec: WalRecV1 | WalRecV2 | WalRecV3 | WalRecV4 =
        mode === "genesis-minimal-v1"
          ? { v: 3, mode: "genesis-minimal-v1", n: Number(b.number), b64: body.toString("base64"), ts: Date.now() }
          : mode === "legacy-v2fs" && mainnet0HistoricalRatchet
            ? { v: 4, mode: "legacy-v2fs-historical-v1", n: Number(b.number), b64: body.toString("base64"), ts: Date.now() }
            : mode === "legacy-v2fs"
              ? { v: 2, mode: "legacy-v2fs", n: Number(b.number), b64: body.toString("base64"), ts: Date.now() }
              : { v: 1, n: Number(b.number), b64: body.toString("base64"), ts: Date.now() };
''',
    )
    replace(
        "src/chain/seg_store.ts",
        '''      if (!rec || typeof rec !== "object" || (rec.v !== 1 && rec.v !== 2)) {
        keep(index, `malformed_record:${seg}:${index}`);
        continue;
      }

      let replayMode: CanonicalAppendModeV1 = "modern";
      if (rec.v === 2) {
        if (rec.mode !== "legacy-v2fs") {
          keep(index, `invalid_record_mode:${seg}:${index}`);
          continue;
        }
        replayMode = "legacy-v2fs";
      }
''',
        '''      if (
        !rec ||
        typeof rec !== "object" ||
        (rec.v !== 1 && rec.v !== 2 && rec.v !== 3 && rec.v !== 4)
      ) {
        keep(index, `malformed_record:${seg}:${index}`);
        continue;
      }

      let replayMode: CanonicalAppendModeV1 = "modern";
      let replayHistoricalRatchet = false;
      if (rec.v === 2) {
        if (rec.mode !== "legacy-v2fs") {
          keep(index, `invalid_record_mode:${seg}:${index}`);
          continue;
        }
        replayMode = "legacy-v2fs";
      } else if (rec.v === 3) {
        if (rec.mode !== "genesis-minimal-v1") {
          keep(index, `invalid_record_mode:${seg}:${index}`);
          continue;
        }
        replayMode = "genesis-minimal-v1";
        replayHistoricalRatchet = true;
      } else if (rec.v === 4) {
        if (rec.mode !== "legacy-v2fs-historical-v1") {
          keep(index, `invalid_record_mode:${seg}:${index}`);
          continue;
        }
        replayMode = "legacy-v2fs";
        replayHistoricalRatchet = true;
      }
''',
    )
    replace(
        "src/chain/seg_store.ts",
        '''      const parent = n === 0 ? null : this.loadBlock(n - 1);
      const valid = this.validateCanonicalBlockByModeV1(blk, parent as any, replayMode);
      if (!valid.ok) {
        keep(index, `invalid_block:${n}:${(valid as any).reason || "unknown"}`);
        continue;
      }
''',
        '''      const parent = n === 0 ? null : this.loadBlock(n - 1);
      if (replayHistoricalRatchet) {
        if (replayMode === "modern") {
          keep(index, `invalid_historical_replay_mode:${seg}:${index}`);
          continue;
        }
        const transition = validateMainnet0HistoricalTransitionV1(parent, replayMode);
        if (!transition.ok) {
          keep(
            index,
            `invalid_historical_transition:${n}:${(transition as any).reason || "unknown"}`,
          );
          continue;
        }
      }

      const valid = this.validateCanonicalBlockByModeV1(blk, parent as any, replayMode);
      if (!valid.ok) {
        keep(index, `invalid_block:${n}:${(valid as any).reason || "unknown"}`);
        continue;
      }
''',
    )

    replace(
        "src/http/follower_routes.ts",
        'import type { Express } from "express";\n',
        'import type { Express } from "express";\nimport { verifiedPublicBootstrapAdapterOriginV1 } from "./follower_verified_public_bootstrap_authority_v1.js";\n',
    )
    replace(
        "src/http/follower_routes.ts",
        '''  const adapterActive = process.env.VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE === "1";
  const origins: string[] = [];
''',
        '''  const adapterActive = process.env.VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE === "1";
  const adapterOrigin = adapterActive
    ? verifiedPublicBootstrapAdapterOriginV1(process.env)
    : null;
  const origins: string[] = [];
''',
    )
    replace(
        "src/http/follower_routes.ts",
        '''      if (adapterActive) {
        const hostname = parsed.hostname.toLowerCase().replace(/^\\[|\\]$/g, "");
        if (parsed.protocol !== "http:" || !["127.0.0.1", "::1"].includes(hostname)) {
          throw new Error("public bootstrap client adapter peer must be numeric loopback HTTP");
        }
      }
''',
        '''      if (adapterActive) {
        if (!adapterOrigin || parsed.origin !== adapterOrigin) {
          throw new Error(
            "public bootstrap client adapter peer must match the verified numeric-loopback origin",
          );
        }
      }
''',
    )

    replace(
        "scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs",
        '''    saveAuthorizedLegacyCommitDirectV2fs: (block) => {
      state.legacyWrites += 1;
      blocks.set(Number(block.number), block);
      state.head = Math.max(state.head, Number(block.number));
    },
    saveBlock: (block) => {
''',
        '''    saveAuthorizedLegacyCommitDirectV2fs: (block) => {
      state.legacyWrites += 1;
      blocks.set(Number(block.number), block);
      state.head = Math.max(state.head, Number(block.number));
    },
    saveAuthorizedMainnet0HistoricalLegacyV2fs: (block) => {
      state.legacyWrites += 1;
      blocks.set(Number(block.number), block);
      state.head = Math.max(state.head, Number(block.number));
    },
    saveBlock: (block) => {
''',
    )

    wf = ".github/workflows/void-public-bootstrap-client-resilience-v1.yml"
    replace(
        wf,
        '      - "scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs"\n',
        '      - "scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs"\n      - "scripts/prove_mainnet0_historical_public_bootstrap_v1.mjs"\n',
        count=2,
    )
    replace(
        wf,
        '      - "src/chain/legacy_commit_direct_v2fs_v1.ts"\n      - "src/http/follower_legacy_v2fs_authority_v1.ts"\n',
        '      - "src/chain/legacy_commit_direct_v2fs_v1.ts"\n      - "src/chain/mainnet0_historical_compat_v1.ts"\n      - "src/http/follower_legacy_v2fs_authority_v1.ts"\n      - "src/http/follower_verified_public_bootstrap_authority_v1.ts"\n',
        count=2,
    )
    replace(
        wf,
        '      - "docs/public/public-bootstrap-client-resilience-v1.md"\n',
        '      - "docs/public/public-bootstrap-client-resilience-v1.md"\n      - "docs/public/mainnet0-historical-public-bootstrap-compat-v1.md"\n',
        count=2,
    )
    replace(
        wf,
        '          node --check scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs\n',
        '          node --check scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs\n          node --check scripts/prove_mainnet0_historical_public_bootstrap_v1.mjs\n',
    )
    replace(
        wf,
        '          node scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs\n',
        '          node scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs\n          node scripts/prove_mainnet0_historical_public_bootstrap_v1.mjs\n',
    )
    replace(
        wf,
        '''          grep -F 'saveAuthorizedLegacyCommitDirectV2fs' dist/chain/seg_store.js
          grep -F 'proposer.commit-direct.v2fs' dist/chain/legacy_commit_direct_v2fs_v1.js
''',
        '''          grep -F 'saveAuthorizedLegacyCommitDirectV2fs' dist/chain/seg_store.js
          grep -F 'saveAuthorizedMainnet0GenesisMinimalV1' dist/chain/seg_store.js
          grep -F 'saveAuthorizedMainnet0HistoricalLegacyV2fs' dist/chain/seg_store.js
          grep -F 'mainnet0_historical_v2fs_genesis_forbidden' dist/chain/mainnet0_historical_compat_v1.js
          grep -F 'VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE' dist/http/follower_verified_public_bootstrap_authority_v1.js
          grep -F 'proposer.commit-direct.v2fs' dist/chain/legacy_commit_direct_v2fs_v1.js
''',
    )

    print("\n=== SOURCE SCOPE ===")
    run(["git", "diff", "--check"])
    changed = sorted(filter(None, git("diff", "--name-only").splitlines()))
    for path in changed:
        print(f"changed={path}")
    expected_uncommitted = sorted([
        ".github/workflows/void-public-bootstrap-client-resilience-v1.yml",
        "scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs",
        "src/chain/seg_store.ts",
        "src/http/follower_routes.ts",
        "src/node_core.ts",
    ])
    if changed != expected_uncommitted:
        raise RuntimeError(f"HOLD: uncommitted scope mismatch: {changed}")
    if "src/chain/block.ts" in changed:
        raise RuntimeError("HOLD: modern block validator changed")

    print("\n=== LOCKED INSTALL / TYPECHECK / BUILD ===")
    run(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"])
    run(["npm", "run", "typecheck"])
    run(["npm", "run", "build"])

    print("\n=== FOCUSED PROOFS ===")
    run(["node", "scripts/prove_mainnet0_historical_public_bootstrap_v1.mjs"])
    run(["node", "scripts/prove_follower_legacy_v2fs_and_duplicate_dial_v1.mjs"])
    run(["node", "scripts/prove_follower_legacy_empty_tx_root_v1.mjs"])
    run(["npx", "--no-install", "tsx", "scripts/prove_follower_low_catchup_pull_limit_v1.mjs"])

    run(["git", "diff", "--check"])
    changed_after = sorted(filter(None, git("diff", "--name-only").splitlines()))
    if changed_after != expected_uncommitted:
        raise RuntimeError(f"HOLD: proof/build changed tracked scope: {changed_after}")

    run(["git", "rm", "--", HELPER])
    run(["git", "add", "--", *expected_uncommitted])
    final_changed = sorted(filter(None, git("diff", BASE, "--name-only").splitlines()))
    if final_changed != EXPECTED_FINAL:
        raise RuntimeError(f"HOLD: final branch scope mismatch: {final_changed}")

    run([
        "git", "commit", "-m",
        "fix(follower): admit Mainnet-0 historical public bootstrap eras",
    ])
    final_head = git("rev-parse", "HEAD")
    print(f"final_head={final_head}")
    run(["git", "push", "origin", f"HEAD:refs/heads/{BRANCH}"])

    body = Path("/tmp/void-mainnet0-historical-compat-pr.md")
    body.write_text(f'''## Purpose

Repair clean no-Tailnet Chain-2050 bootstrap across the historical Mainnet-0 block eras without weakening the modern append validator.

## Exact source

- reviewed base: `{BASE}`
- branch: `{BRANCH}`
- candidate head: `{final_head}`

## Runtime evidence

Fresh Nimo proved the canonical public HTTPS path (`public_sync_active=true`, no Tailscale, no manual bootstrap addresses) and then rejected canonical block 0 because the exact historical `number,timestamp` envelope was mis-routed into modern validation as `missing_proposer`.

Observed shape evidence is minimal through sampled height `100000` and `proposer.commit-direct.v2fs` from sampled height `250000` through `1951058`. The exact transition height is not hardcoded.

## Repair boundary

- exact closed-keyset Mainnet-0 minimal validator;
- historical trust derived only from the already-verified single numeric-loopback public-bootstrap adapter with exact pull-origin equality;
- separate SegStore historical append methods and parent-era ratchet;
- JSON equality for historical replay identity;
- explicit WAL versions for minimal and ratcheted v2fs replay;
- `src/chain/block.ts` / modern `validateBlockForAppend()` unchanged.

## Local evidence

- `npm run typecheck`
- `npm run build`
- `VOID_MAINNET0_HISTORICAL_PUBLIC_BOOTSTRAP_V1_PROOF_GREEN`
- existing legacy-v2fs proof green
- existing legacy empty-txroot proof green
- existing low catch-up limit proof green

## Authority boundary

Draft source/proof/docs/CI only. No merge, deployment, Nimo/Alienware restart, DNS/service/interface mutation, Tailscale installation, chain reseed/rewrite, credential/private-key access, wallet/signer use, validator/Work Credit mutation, transaction, treasury/liquidity action, or funds movement.
''')
    pr = run([
        "gh", "pr", "create", "--repo", "6ZoSo9/void-node",
        "--base", "main", "--head", BRANCH, "--draft",
        "--title", "fix(follower): admit Mainnet-0 historical public bootstrap eras",
        "--body-file", str(body),
    ], capture=True)
    print(f"draft_pr={pr.splitlines()[-1]}")
    print("ready_transition=false")
    print("merge=false")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"HOLD: {exc}", file=sys.stderr)
        raise
