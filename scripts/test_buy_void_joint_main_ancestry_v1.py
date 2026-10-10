#!/usr/bin/env python3
"""Exercise the workflow's actual shell bodies in disposable, network-free Git repos."""
import argparse
import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile

JOIN = "cff927e850dfc078419be06a468aa77c6c1f41c3"
PARENT1 = "4350c87181cb44dce28b66eb691bdbc26dd68551"
PARENT2 = "8696309719a88a5f06345b13701092ab3bdc9ceb"
MAIN = "ba853a4bfb237701504225ddba615f7b46eeb991"
WALLET = "f94fa806a4889477b67887e91c162f4d4ca62055"
WORKFLOW = ".github/workflows/buy-void-first-original-v6-joint-main-reconcile-v1.yml"
DOC = "docs/architecture/buy-void-first-original-v6-joint-main-reconcile-v1.md"
PROOF = "scripts/prove_void_public_bootstrap_outside_machine_target_v1.mjs"
PINS = {
    ".github/workflows/void-checkpoint-restore-node-init-seal-v1.yml": "2a4248adbdc3274292736f871fa61294eaae37e0",
    ".github/workflows/void-public-bootstrap-outside-machine-acceptance-v1.yml": "30cce5558ccc131e88193aa3c761367a0ae9baf8",
    "scripts/prove_void_checkpoint_restore_node_init_seal_v1.mjs": "930c7787f830f9c8f6a3abd328e217e79b5f5aec",
    PROOF: "47064b1daa20a52236ceeb394e3bf409eba61463",
    "scripts/prove_void_public_seed_named_tunnel_packet_v1.mjs": "a3389c814f9dc9c763e7623f2708183e85700b9d",
    "src/node_core.ts": "f4385b68b786570044adf4b36429e98e888b7749",
    "src/economic/buy_void_verified_allocation_replay_binding_v1.ts": "0a74a3652081c3e142d0b887676771a7ac148f32",
    "src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts": "0e27a76e777c326d2d9e2b1550b7f2979fca9abb",
}
BUYER_PROOFS = (
    "scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v2_original_wallet.mjs",
    "scripts/prove_buy_void_custody_reserve_plan_v2_original_wallet.mjs",
    "scripts/prove_buy_void_verified_payment_allocation_handoff_dual_rail_v2.ts",
    "scripts/prove_buy_void_verified_payment_allocation_handoff_first_original_v2.ts",
)
STEP_NAMES = (
    "Bind exact PR head and both reviewed parents",
    "Require exactly two metadata additions and one mode-only repair",
    "Require canonical checkpoint source blobs unchanged from current main",
    "Preserve first-original buyer/payment/dispatch lineage",
)


def shell_blocks(source: str) -> list[str]:
    """Fail on workflow structure drift instead of silently testing a copied predicate."""
    found = {}
    for match in re.finditer(r"^      - name: ([^\n]+)\n(.*?)(?=^      - name: |\Z)", source, re.M | re.S):
        name, section = match.groups()
        if name in STEP_NAMES:
            body = re.search(r"^        run: \|\n((?:          .*\n|\n)+)", section, re.M)
            if body is None or name in found:
                raise AssertionError("missing or repeated workflow shell block: " + name)
            found[name] = "\n".join(line[10:] for line in body[1].splitlines()) + "\n"
    if set(found) != set(STEP_NAMES):
        raise AssertionError("ancestry workflow step set changed")
    return [found[name] for name in STEP_NAMES]


class Fixture:
    def __init__(self, root: Path):
        self.repo = root / "repo"
        self.repo.mkdir()
        self.runner = root / "runner"
        self.runner.mkdir()
        self.env = {
            "PATH": os.defpath, "HOME": str(root), "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_TERMINAL_PROMPT": "0", "GIT_AUTHOR_NAME": "Fixture",
            "GIT_AUTHOR_EMAIL": "fixture@example.invalid", "GIT_COMMITTER_NAME": "Fixture",
            "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
        }
        self.git("init", "--quiet", "--initial-branch=fixture")
        self.git("config", "core.hooksPath", os.devnull)
        self.git("config", "core.fileMode", "true")
        self.git("config", "commit.gpgsign", "false")
        self.mapping = {}
        for name in (*PINS, *BUYER_PROOFS, "src/index.ts"):
            self.write(name, "synthetic " + name + "\n")
            if name in PINS:
                self.mapping[PINS[name]] = self.git("hash-object", "--", name)
        (self.repo / PROOF).chmod(0o755)
        main = self.commit("main")
        self.write("integration.txt", "integration\n")
        integration = self.commit("integration")
        self.git("checkout", "--quiet", "--detach", main)
        self.write("buyer.txt", "buyer\n")
        wallet = self.commit("wallet")
        self.write("integration.txt", "integration\n")
        (self.repo / PROOF).chmod(0o644)
        buyer = self.commit("buyer")
        self.write(WORKFLOW, "synthetic historical workflow\n")
        self.write(DOC, "synthetic historical note\n")
        (self.repo / PROOF).chmod(0o755)
        self.git("add", "--", WORKFLOW, DOC, PROOF)
        self.tree = self.git("write-tree")
        join = self.git("commit-tree", self.tree, "-p", buyer, "-p", integration, "-m", "join")
        self.git("checkout", "--quiet", "--detach", join)
        self.mapping.update({MAIN: main, WALLET: wallet, PARENT1: buyer, PARENT2: integration, JOIN: join})

    def git(self, *args: str) -> str:
        result = subprocess.run(["git", *args], cwd=self.repo, env=self.env,
                                capture_output=True, text=True, timeout=10, check=True)
        return result.stdout.strip()

    def write(self, name: str, text: str) -> None:
        target = self.repo / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")

    def commit(self, message: str) -> str:
        # The only staged files are newly created synthetic files in this isolated repo.
        self.git("add", "--all")
        self.git("commit", "--quiet", "--allow-empty", "-m", message)
        return self.git("rev-parse", "HEAD")

    def child(self) -> None:
        self.write(DOC, "synthetic maintained note\n")
        self.commit("ordinary descendant")

    def evaluate(self, blocks: list[str], expected: str | None = None) -> bool:
        env = dict(self.env, EXPECTED_HEAD=expected or self.git("rev-parse", "HEAD"),
                   REVIEWED_JOIN=self.mapping[JOIN], RUNNER_TEMP=str(self.runner))
        for body in blocks:
            # Only literal immutable object IDs are translated to synthetic Git IDs.
            body = re.sub(r"\b[0-9a-f]{40}\b", lambda m: self.mapping.get(m[0], m[0]), body)
            result = subprocess.run(["bash", "-c", body], cwd=self.repo, env=env,
                                    capture_output=True, text=True, timeout=10)
            if result.returncode:
                return False
        return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--historical-workflow", type=Path,
                        help="offline copy of the exact original blob; its Git hash is verified")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    source = (root / WORKFLOW).read_text(encoding="utf-8")
    if args.historical_workflow:
        old = args.historical_workflow.read_bytes()
    else:
        old = subprocess.run(["git", "show", JOIN + ":" + WORKFLOW], cwd=root,
                             capture_output=True, timeout=10, check=True).stdout
    actual_hash = hashlib.sha1(b"blob " + str(len(old)).encode() + b"\0" + old).hexdigest()
    if actual_hash != "8a63ff411d915b487c0ce8290b700f272ebc54a3":
        raise AssertionError("historical workflow is not the reviewed original blob")
    current, historical = shell_blocks(source), shell_blocks(old.decode("utf-8"))
    if not re.search(r"^      REVIEWED_JOIN: " + JOIN + r"$", source, re.M):
        raise AssertionError("reviewed join must remain pinned in the workflow")
    watched = (*PINS, *BUYER_PROOFS, "src/index.ts", "scripts/test_buy_void_joint_main_ancestry_v1.py")
    for name in watched:
        if name.startswith("src/economic/"):
            name = "src/economic/**"
        if "      - '" + name + "'" not in source:
            raise AssertionError("protected change would not trigger CI: " + name)

    scenarios = ["original_join", "original_descendant_rejected", "join", "descendant",
                 "two_descendants", "wrong_head", "untracked", "tracked_dirty",
                 "copied_tree_without_join", "reversed_parents", "missing_second_parent",
                 "extra_parent", "mode_regression", "new_economic_source", "whitespace"]
    scenarios += ["changed:" + name for name in (*PINS, *BUYER_PROOFS, "src/index.ts")]
    for scenario in scenarios:
        with tempfile.TemporaryDirectory(prefix="void-joint-ci-test-") as tmp:
            fixture = Fixture(Path(tmp))
            blocks = historical if scenario.startswith("original_") else current
            wanted = scenario in {"original_join", "join", "descendant", "two_descendants"}
            expected = None
            if scenario in {"original_descendant_rejected", "descendant", "two_descendants"}:
                fixture.child()
                if scenario == "two_descendants":
                    fixture.commit("another ordinary descendant")
            elif scenario == "wrong_head":
                expected = fixture.mapping[MAIN]
            elif scenario == "untracked":
                fixture.write("untracked.txt", "dirty\n")
            elif scenario == "tracked_dirty":
                fixture.write(DOC, "uncommitted\n")
            elif scenario == "copied_tree_without_join":
                copied = fixture.git("commit-tree", fixture.tree, "-p", fixture.mapping[PARENT1], "-m", "copy")
                fixture.git("checkout", "--quiet", "--detach", copied)
            elif scenario in {"reversed_parents", "missing_second_parent", "extra_parent"}:
                parents = [fixture.mapping[PARENT2], fixture.mapping[PARENT1]]
                if scenario == "missing_second_parent":
                    parents = [fixture.mapping[PARENT1]]
                elif scenario == "extra_parent":
                    parents = [fixture.mapping[PARENT1], fixture.mapping[PARENT2], fixture.mapping[MAIN]]
                flags = [flag for parent in parents for flag in ("-p", parent)]
                bad = fixture.git("commit-tree", fixture.tree, *flags, "-m", "wrong join")
                fixture.git("checkout", "--quiet", "--detach", bad)
                fixture.mapping[JOIN] = bad
            elif scenario == "mode_regression":
                (fixture.repo / PROOF).chmod(0o644)
                fixture.commit("wrong mode")
            elif scenario == "new_economic_source":
                fixture.write("src/economic/extra.ts", "unreviewed\n")
                fixture.commit("unreviewed source")
            elif scenario == "whitespace":
                fixture.write(DOC, "trailing whitespace \n")
                fixture.commit("whitespace")
            elif scenario.startswith("changed:"):
                fixture.write(scenario.removeprefix("changed:"), "changed fixture bytes\n")
                fixture.commit("source drift")
            observed = fixture.evaluate(blocks, expected)
            if observed != wanted:
                raise AssertionError("unexpected workflow result: " + scenario)
            print("PASS " + scenario)
    print("VOID_JOINT_MAIN_ANCESTRY_REGRESSION_GREEN")
    print("scenarios=" + str(len(scenarios)))
    print("network_calls=false")
    print("production_data_access=false")


if __name__ == "__main__":
    main()
