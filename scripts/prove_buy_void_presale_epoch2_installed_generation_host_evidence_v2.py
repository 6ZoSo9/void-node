#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V2"
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_presale_epoch2_installed_generation_host_evidence_v2.py"
)
TARGET_BLOB = "e707d2cececa056f2b4fdc56e2160fad0d851b85"
BASE_REL = (
    "ops/precision/"
    "void_buy_void_presale_epoch2_installed_generation_host_evidence_v1.py"
)
BASE_BLOB = "6b2bf387bff5e5cd6ada048fd5c8fe4d28d66577"
BASE_PROOF_REL = (
    "scripts/"
    "prove_buy_void_presale_epoch2_installed_generation_host_evidence_v1.py"
)
BASE_PROOF_BLOB = "4981ccf99c029a0b90042747f9023107826202ef"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    actual = git_blob(raw)
    assert actual == expected, (relative, actual, expected)
    return raw


source_bytes = pin(TARGET_REL, TARGET_BLOB)
source = source_bytes.decode("utf-8", "strict")
base_bytes = pin(BASE_REL, BASE_BLOB)
base_source = base_bytes.decode("utf-8", "strict")
base_proof = pin(BASE_PROOF_REL, BASE_PROOF_BLOB).decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)

bootstrap = source.index("import sys as _bootstrap_sys")
shadowable = source.index("import argparse")
assert source.index("_bootstrap_sys.flags.isolated != 1") > bootstrap
assert source.index("raise SystemExit(2)") < shadowable

for required in (
    'BASE_GIT_BLOB_SHA1 = "' + BASE_BLOB + '"',
    'FIXED_CHECKOUT = Path("/home/zoso/dev/void-node")',
    'getattr(module, "FIXED_CHECKOUT", None) != FIXED_CHECKOUT',
    "def _verify_tracked_checkout_bytes(",
    "base._git(tree_query)",
    "base._git(index_query)",
    "base._read_visible_file(",
    "module._verify_checkout_bytes = tracked_verifier",
    "module.checkout_snapshot = tracked_snapshot",
    '"tracked_source_checkout_exact": True',
    '"untracked_paths_enumerated": False',
    '"untracked_paths_source_authority": False',
    '"checkout_clean_claimed": False',
    "base.collect(expected_head)",
    '"filesystem_write_performed"',
    '"production_host_evidence_authority"',
):
    assert required in source, required

for forbidden in (
    '"--others"',
    '"--exclude-standard"',
    "subprocess.",
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
    "os.O_EXCL",
    "os.mkdir(",
    "os.rename(",
    "os.replace(",
    ".unlink(",
    "/usr/bin/sudo",
    "systemctl",
    "socket.",
    "urllib",
    "requests",
):
    assert forbidden not in source, forbidden

# V2 inherits the reviewed V1 isolation, Git confinement, descriptor loading,
# and native-self-test contract by exact source/proof identity. Bind concrete
# proof code and inherited qualifier-proof assertions rather than output labels.
for required in (
    "module._require_isolated_python()",
    "checkout_local_shadow_import_executed",
    "_guard_qualifier_installer_loader(module, expected_head)",
    '"--reuid=1000"',
    "KERNEL_READ_BOUNDARY_EXECUTED =",
    "descriptor_bound_native_self_test_required=true",
    "pathname_swap_during_self_test_rejected=true",
):
    assert required in base_proof, required
for required in (
    'FIXED_CHECKOUT = Path("/home/zoso/dev/void-node")',
    "def _verify_checkout_bytes(",
    "def checkout_snapshot(",
    "def collect(",
    "qualifier.collect(expected_head)",
    '"native_self_test_execution_performed": True',
    '"filesystem_write_performed": False',
):
    assert required in base_source, required

parsed = ast.parse(source)
functions = {
    node.name: node
    for node in parsed.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "_require_isolated_python",
    "_open_parent_nofollow",
    "_read_exact_base_source",
    "_verify_tracked_checkout_bytes",
    "_load_patched_base_module",
    "_validate_base_result",
    "collect",
    "self_test",
    "_emit_hold",
):
    assert name in functions, name

tracked_source = ast.get_source_segment(
    source, functions["_verify_tracked_checkout_bytes"]
) or ""
assert "ls-tree" in tracked_source
assert "--stage" in tracked_source
assert "_read_visible_file" in tracked_source
assert "--others" not in tracked_source
assert "status" not in tracked_source

isolation_source = ast.get_source_segment(
    source, functions["_require_isolated_python"]
) or ""
assert "source_checkout = Path(__file__).resolve(strict=False).parents[2]" in isolation_source
assert "FIXED_CHECKOUT.resolve(strict=False)" in isolation_source
assert "candidate == protected or protected in candidate.parents" in isolation_source

load_source = ast.get_source_segment(source, functions["_load_patched_base_module"]) or ""
assert load_source.index("_require_isolated_python()") < load_source.index(
    "_read_exact_base_source(source_path)"
)
assert load_source.index("_read_exact_base_source(source_path)") < load_source.index("exec(")
assert load_source.index("module._verify_checkout_bytes = tracked_verifier") < load_source.index("return module")
assert load_source.index("module.checkout_snapshot = tracked_snapshot") < load_source.index("return module")

spec = importlib.util.spec_from_file_location(
    "void_presale_epoch2_installed_generation_host_evidence_v2",
    ROOT / TARGET_REL,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module._require_isolated_python()
base = module._load_patched_base_module()
assert base.MARKER == module.BASE_MARKER
assert base.SCHEMA == module.BASE_SCHEMA
assert base.PARENT_PLAN_ID == module.PARENT_PLAN_ID
assert base.FIXED_CHECKOUT == module.FIXED_CHECKOUT
assert base._verify_checkout_bytes.__name__ == "tracked_verifier"
assert base.checkout_snapshot.__name__ == "tracked_snapshot"


def expect_hold(action, reason: str) -> None:
    try:
        action()
    except Exception as exc:
        assert str(exc).startswith(reason), (str(exc), reason)
    else:
        raise AssertionError("expected_hold_missing:" + reason)


# Even under isolated Python, a site-provided search path must not expose the
# materialized source checkout as import authority.
saved_sys_path = list(module.sys.path)
try:
    module.sys.path.insert(0, str(ROOT))
    expect_hold(
        module._require_isolated_python,
        "python_path_source_checkout_exposure",
    )
finally:
    module.sys.path[:] = saved_sys_path
module._require_isolated_python()

# A lexical sys.path entry beneath a protected checkout must remain forbidden
# even when that entry is a symlink whose resolved target points outside.
with tempfile.TemporaryDirectory(prefix="void-epoch2-v2-syspath-escape-") as td:
    root = Path(td)
    copied_source = root / "copy/ops/precision/target.py"
    copied_source.parent.mkdir(parents=True)
    copied_source.write_bytes(source_bytes)
    fixed_checkout = root / "precision-checkout"
    fixed_checkout.mkdir()
    outside = root / "outside-imports"
    outside.mkdir()
    marker = root / "symlink-escape-shadow-executed"
    (outside / "selectors.py").write_text(
        "from pathlib import Path\nPath(" + repr(str(marker)) + ").write_text('executed')\n",
        encoding="utf-8",
    )
    escape = fixed_checkout / "escape"
    escape.symlink_to(outside, target_is_directory=True)

    saved_file = module.__file__
    saved_fixed = module.FIXED_CHECKOUT
    saved_path = list(module.sys.path)
    try:
        module.__file__ = str(copied_source)
        module.FIXED_CHECKOUT = fixed_checkout
        module.sys.path.insert(0, str(escape))
        expect_hold(
            module._load_patched_base_module,
            "python_path_source_checkout_exposure",
        )
        assert not marker.exists()
    finally:
        module.__file__ = saved_file
        module.FIXED_CHECKOUT = saved_fixed
        module.sys.path[:] = saved_path
module._require_isolated_python()

# A copied V2 wrapper must still reject V1's fixed Precision checkout before
# executing exact V1 bytes. A hostile shadow module therefore cannot run.
with tempfile.TemporaryDirectory(prefix="void-epoch2-v2-fixed-checkout-") as td:
    root = Path(td)
    copied_source = root / "copy/ops/precision/target.py"
    copied_source.parent.mkdir(parents=True)
    copied_source.write_bytes(source_bytes)
    fixed_checkout = root / "precision-checkout"
    hostile = fixed_checkout / "scripts"
    hostile.mkdir(parents=True)
    marker = root / "shadow-executed"
    (hostile / "selectors.py").write_text(
        "from pathlib import Path\nPath(" + repr(str(marker)) + ").write_text('executed')\n",
        encoding="utf-8",
    )
    saved_file = module.__file__
    saved_fixed = module.FIXED_CHECKOUT
    saved_path = list(module.sys.path)
    try:
        module.__file__ = str(copied_source)
        module.FIXED_CHECKOUT = fixed_checkout
        module.sys.path.insert(0, str(hostile))
        expect_hold(
            module._load_patched_base_module,
            "python_path_source_checkout_exposure",
        )
        assert not marker.exists()
    finally:
        module.__file__ = saved_file
        module.FIXED_CHECKOUT = saved_fixed
        module.sys.path[:] = saved_path
module._require_isolated_python()

# The base source reader is descriptor-bound and rejects path substitution.
with tempfile.TemporaryDirectory(prefix="void-epoch2-v2-base-source-") as td:
    root = Path(td)
    candidate = root / module.BASE_NAME
    candidate.write_bytes(base_bytes)
    assert module._read_exact_base_source(candidate) == base_bytes
    candidate.unlink()
    alternate = root / "alternate.py"
    alternate.write_bytes(base_bytes)
    candidate.symlink_to(alternate)
    expect_hold(lambda: module._read_exact_base_source(candidate), "base_source_unavailable")
    candidate.unlink()
    os.mkfifo(candidate, 0o600)
    expect_hold(lambda: module._read_exact_base_source(candidate), "base_source_metadata_invalid")
    candidate.unlink()
    candidate.write_bytes(b"x" * len(base_bytes))
    expect_hold(lambda: module._read_exact_base_source(candidate), "base_source_blob_mismatch")

# Exercise the exact tracked-source verifier with hostile/unbounded untracked data
# present. No Git query may enumerate those paths.
with tempfile.TemporaryDirectory(prefix="void-epoch2-v2-tracked-fixture-") as td:
    checkout = Path(td) / "checkout"
    checkout.mkdir()

    def git(*args: str) -> bytes:
        return subprocess.run(
            ["/usr/bin/git", "-C", str(checkout), *args],
            check=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=20,
        ).stdout

    git("init", "-q", "-b", "main")
    tracked = checkout / "tracked.txt"
    tracked.write_bytes(b"reviewed tracked bytes\n")
    git("add", "--", "tracked.txt")
    git(
        "-c", "user.name=Fixture",
        "-c", "user.email=fixture@example.invalid",
        "-c", "commit.gpgsign=false",
        "commit", "-qm", "fixture",
    )
    expected_head = git("rev-parse", "HEAD").decode().strip()

    # These names would be dangerous only if checkout-local imports or broad
    # untracked enumeration were source authority. Isolated exact loading keeps
    # them outside the execution boundary.
    for relative in (
        "hashlib.py",
        "argparse.py",
        "sitecustomize.py",
        "__future__.py",
        "data_a/000001/runtime-record.json",
        "node_modules/example/index.js",
    ):
        path = checkout / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("untracked fixture\n", encoding="utf-8")

    queries: list[tuple[str, ...]] = []
    saved = {
        "FIXED_CHECKOUT": base.FIXED_CHECKOUT,
        "_git": base._git,
        "_git_text": base._git_text,
        "_main_branch": base._main_branch,
    }

    def fixture_git(args: list[str]) -> bytes:
        query = tuple(args)
        queries.append(query)
        assert "--others" not in query, query
        assert args[0] != "status", query
        return git(*args)

    try:
        base.FIXED_CHECKOUT = checkout
        base._git = fixture_git
        base._git_text = lambda args: fixture_git(args).decode("utf-8", "strict")
        base._main_branch = lambda: "main"

        module._verify_tracked_checkout_bytes(base, expected_head)
        observed = base.checkout_snapshot(expected_head)
        assert observed == {
            "head": expected_head,
            "tree": git("rev-parse", "HEAD^{tree}").decode().strip(),
            "branch": "main",
            "tracked_source_exact": True,
            "untracked_paths_enumerated": False,
            "untracked_paths_source_authority": False,
        }
        assert queries
        assert all("--others" not in query for query in queries)

        tracked.write_bytes(b"x" * len(b"reviewed tracked bytes\n"))
        expect_hold(
            lambda: module._verify_tracked_checkout_bytes(base, expected_head),
            "checkout_worktree_bytes_mismatch",
        )
        tracked.write_bytes(b"reviewed tracked bytes\n")

        git("update-index", "--force-remove", "--", "tracked.txt")
        expect_hold(
            lambda: module._verify_tracked_checkout_bytes(base, expected_head),
            "checkout_index_differs_from_head",
        )
        git("read-tree", "HEAD")
        module._verify_tracked_checkout_bytes(base, expected_head)
    finally:
        base.FIXED_CHECKOUT = saved["FIXED_CHECKOUT"]
        base._git = saved["_git"]
        base._git_text = saved["_git_text"]
        base._main_branch = saved["_main_branch"]

# The V2 receipt truthfully states that untracked paths were not enumerated and
# grants no new runtime/economic authority.
head = "a" * 40
base_result = {
    "schema": module.BASE_SCHEMA,
    "marker": module.BASE_MARKER,
    "version": 1,
    "expected_head": head,
    "epoch2_installed_generation_qualified": True,
    "filesystem_write_performed": False,
    "runner_execution": False,
    "live_composition_execution": False,
    "service_mutation": False,
    "network_contact": False,
    "credential_access": False,
    "private_key_access": False,
    "wallet_or_signer_access": False,
    "signing": False,
    "transaction_submission": False,
    "payment_acceptance": False,
    "public_presale_activation": False,
    "wc_void_market_activation": False,
    "treasury_or_liquidity_action": False,
    "funds_movement": False,
    "production_host_evidence_authority": False,
}
fake = types.SimpleNamespace(collect=lambda expected: dict(base_result))
saved_loader, saved_geteuid = module._load_patched_base_module, module.os.geteuid
try:
    module._load_patched_base_module = lambda: fake
    module.os.geteuid = lambda: 0
    receipt = module.collect(head)
    assert receipt["marker"] == MARKER
    assert receipt["version"] == 2
    assert receipt["tracked_source_checkout_exact"] is True
    assert receipt["untracked_paths_enumerated"] is False
    assert receipt["untracked_paths_source_authority"] is False
    assert receipt["checkout_clean_claimed"] is False
    assert receipt["filesystem_write_performed"] is False
    assert receipt["production_host_evidence_authority"] is False
    base_result["filesystem_write_performed"] = True
    expect_hold(lambda: module.collect(head), "base_result_contract_invalid")
finally:
    module._load_patched_base_module = saved_loader
    module.os.geteuid = saved_geteuid

# Direct unisolated execution must stop before a checkout-local shadow module can
# run. The hostile file is beside the V2 source copy.
with tempfile.TemporaryDirectory(prefix="void-epoch2-v2-shadow-") as td:
    root = Path(td)
    target = root / "target.py"
    target.write_bytes(source_bytes)
    marker = root / "shadow-executed"
    (root / "argparse.py").write_text(
        "from pathlib import Path\nPath(" + repr(str(marker)) + ").write_text('executed')\n",
        encoding="utf-8",
    )
    completed = subprocess.run(
        ["/usr/bin/python3", "-B", str(target), "--self-test"],
        check=False,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=20,
    )
    assert completed.returncode == 2
    assert MARKER in completed.stdout
    assert "reason=python_isolated_mode_required" in completed.stdout
    assert not marker.exists()

print(MARKER + "_PROOF_GREEN")
print("exact_base_v1_source_blob_bound=true")
print("exact_base_v1_proof_blob_bound=true")
print("base_v1_fixed_checkout_contract_bound=true")
print("base_v1_source_descriptor_bound=true")
print("base_v1_source_symlink_fifo_rejected=true")
print("tracked_tree_index_worktree_equality_required=true")
print("tracked_file_byte_and_mode_drift_rejected=true")
print("tracked_index_drift_rejected=true")
print("untracked_paths_enumerated=false")
print("untracked_paths_source_authority=false")
print("large_untracked_runtime_tree_compatible=true")
print("checkout_shadow_modules_outside_isolated_loader=true")
print("checkout_root_sys_path_injection_rejected=true")
print("fixed_checkout_sys_path_injection_rejected_before_base_exec=true")
print("lexical_symlink_escape_sys_path_rejected=true")
print("delegated_original_status_bypassed=true")
print("base_native_self_test_contract_inherited=true")
print("receipt_checkout_clean_overclaim_rejected=true")
print("authority_overclaim_rejected=true")
print("filesystem_write_performed=false")
print("runner_execution=false")
print("live_composition_execution=false")
print("service_mutation=false")
print("network_contact=false")
print("credential_access=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")
