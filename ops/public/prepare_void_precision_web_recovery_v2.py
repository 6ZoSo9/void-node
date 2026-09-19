#!/usr/bin/env python3
"""Prepare a fresh commit-bound website bundle and immediately verify it.

The caller's umask cannot change artifact modes. Only an allowlisted runtime
bundle is materialized; unrelated repository files and Git metadata are not
runtime artifacts. No existing bundle is overwritten or repaired in place.
Default profile observes Precision; --artifact-only is for source/CI fixtures
and never emits a designated-host pass. No services or routes are changed.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import tempfile

REPO = "https://github.com/6ZoSo9/void-node.git"
VERIFIER = "ops/public/verify_void_precision_web_preparation_v2.py"
PREPARER = "ops/public/prepare_void_precision_web_recovery_v2.py"


def require(value, reason):
    if not value:
        raise RuntimeError(reason)


def command(args, limit=4 * 1024 * 1024, timeout=180, allowed_exits=(0,), completed=False):
    env = {"PATH": "/usr/bin:/bin", "LANG": "C", "HOME": str(Path.home()),
           "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
           "GIT_TERMINAL_PROMPT": "0", "GIT_NO_REPLACE_OBJECTS": "1", "GIT_OPTIONAL_LOCKS": "0"}
    p = subprocess.run(args, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       env=env, timeout=timeout, check=False)
    require(p.returncode in allowed_exits, Path(args[0]).name + " failed (exit " + str(p.returncode) + ")")
    require(len(p.stdout) + len(p.stderr) <= limit, "command output exceeds bound")
    return p if completed else p.stdout


def directory(path, create=False):
    require(path.is_absolute() and ".." not in path.parts and re.fullmatch(r"/[A-Za-z0-9_./+-]+", str(path)), "unsafe preparation path")
    fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    try:
        for component in path.parts[1:]:
            try:
                child = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            except FileNotFoundError:
                require(create, "missing preparation ancestor")
                os.mkdir(component, 0o700, dir_fd=fd)
                child = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = child
            s = os.fstat(fd)
            require(s.st_uid in (0, os.getuid()) and not s.st_mode & 0o022, "foreign-writable preparation ancestor: " + str(path))
    finally:
        os.close(fd)


def write_new(path, data, mode):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    try:
        view = memoryview(data)
        while view:
            written = os.write(fd, view)
            require(written > 0, "artifact write made no progress")
            view = view[written:]
        os.fsync(fd)
    finally:
        os.close(fd)


def prepare(args):
    require(re.fullmatch(r"[a-f0-9]{40}", args.source_head), "full source commit required")
    if not args.artifact_only:
        require(socket.gethostname().lower() == "zoso-precision-tower-7810"
                and str(Path.home()) == "/home/zoso" and os.getuid() != 0, "run designated-host preparation as zoso on Precision")
    git = shutil.which("git")
    node = shutil.which("node")
    require(git and node, "installed Git and Node required; packages are not installed")
    git, node = str(Path(git).resolve()), str(Path(node).resolve())
    live, parent = args.live_checkout.absolute(), args.output_parent.absolute()
    # The existing checkout is a read-only object/coordinate input, not staged
    # executable content. Keep its ancestors pinned without changing its modes.
    directory(live.parent)
    live_fd = os.open(live, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        require(os.fstat(live_fd).st_uid in (0, os.getuid()), "foreign live checkout owner")
    finally:
        os.close(live_fd)
    directory(parent, create=True)
    bundle = parent / ("pr1373-" + args.source_head[:12])
    require(not os.path.lexists(bundle), "bundle already exists; verify it separately, never overwrite or repair it")
    aggregate_path = parent / (bundle.name + "-aggregate.json")
    require(not os.path.lexists(aggregate_path), "aggregate already exists; preserve the earlier transaction")
    live_head = command([git, "-C", str(live), "rev-parse", "HEAD"], timeout=10).decode().strip()
    require(re.fullmatch(r"[a-f0-9]{40}", live_head), "invalid live checkout head")
    # Git writes only to this disposable private object store, not to live refs.
    with tempfile.TemporaryDirectory(prefix=".objects-", dir=parent) as temporary:
        store = Path(temporary) / "repository.git"
        command([git, "-c", "core.hooksPath=/dev/null", "-c", "init.templateDir=", "clone", "--bare", "--shared", str(live), str(store)])
        found = subprocess.run([git, "-C", str(store), "cat-file", "-e", args.source_head + "^{commit}"],
                               stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               env={"PATH": "/usr/bin:/bin", "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null", "GIT_NO_REPLACE_OBJECTS": "1"}, timeout=10, check=False)
        if found.returncode:
            require(not args.artifact_only, "artifact fixture commit must exist locally")
            command([git, "-C", str(store), "-c", "core.hooksPath=/dev/null", "fetch", "--no-tags", REPO, args.source_head])
        def object_bytes(kind, oid, limit=1048576):
            require(re.fullmatch(r"[a-f0-9]{40}", oid), "invalid Git object name")
            data = command([git, "-C", str(store), "cat-file", kind, oid], limit=limit)
            actual = hashlib.sha1(kind.encode() + b" " + str(len(data)).encode() + b"\0" + data).hexdigest()
            require(actual == oid, "Git object content hash mismatch")
            return data

        raw_commit = object_bytes("commit", args.source_head)
        tree = raw_commit.split(b"\n", 1)[0].decode().removeprefix("tree ")
        require(re.fullmatch(r"[a-f0-9]{40}", tree), "invalid source tree")
        proof = {"commit": base64.b64encode(raw_commit).decode(), "trees": {}}

        def blob_at(relative):
            current = tree
            components = relative.split("/")
            for index, component in enumerate(components):
                raw_tree = object_bytes("tree", current)
                proof["trees"][current] = base64.b64encode(raw_tree).decode()
                entries, position = {}, 0
                while position < len(raw_tree):
                    space = raw_tree.index(b" ", position)
                    nul = raw_tree.index(b"\0", space)
                    mode, name = raw_tree[position:space].decode(), raw_tree[space + 1:nul].decode()
                    require(name not in entries and name not in ("", ".", "..") and "/" not in name
                            and nul + 21 <= len(raw_tree) and len(entries) < 10000, "invalid Git tree member")
                    entries[name] = (mode, raw_tree[nul + 1:nul + 21].hex())
                    position = nul + 21
                mode, oid = entries[component]
                if index == len(components) - 1:
                    require(mode in ("100644", "100755"), "allowlisted source is not a regular file")
                    return object_bytes("blob", oid)
                require(mode in ("40000", "040000"), "allowlisted source ancestor is not a directory")
                current = oid

        # Verify the complete Git object chain before executing even definitions
        # from the pinned verifier. Local cache contents are not execution trust.
        require(Path(__file__).read_bytes() == blob_at(PREPARER), "running preparer file differs from the pinned source")
        verifier_bytes = blob_at(VERIFIER)
        module = {"__name__": "commit_bound_preflight", "__file__": str(bundle / "source" / VERIFIER)}
        exec(compile(verifier_bytes, VERIFIER, "exec"), module)
        payload = {relative: blob_at(relative) for relative in module["PAYLOAD"]}
        verified_tree, members = module["source_members"](proof, args.source_head)
        require(verified_tree == tree and payload[VERIFIER] == verifier_bytes, "source witness mismatch")
        runtime = module["node_identity"](node)
        unit_files = module["units"](bundle, node, args.source_head)
        manifest = module["expected_manifest"](payload, unit_files, members)
    # No Git metadata or clone-generated symlinks enter the runtime bundle.
    os.mkdir(bundle, 0o700)
    for row in sorted((r for r in manifest if r["type"] == "directory" and r["path"] != "."), key=lambda r: (r["path"].count("/"), r["path"])):
        os.mkdir(bundle / row["path"], int(row["mode"], 8))
    for relative, data in payload.items():
        write_new(bundle / "source" / relative, data, int(members[relative]["mode"], 8))
    for relative, data in unit_files.items():
        write_new(bundle / relative, data, 0o600)
    require(command([git, "-C", str(live), "rev-parse", "HEAD"], timeout=10).decode().strip() == live_head, "live checkout moved during preparation")
    receipt = {"marker": module["MARKER"], "source_head": args.source_head, "source_tree": tree, "source_proof": proof,
        "bundle": str(bundle), "profile": "artifact-only" if args.artifact_only else "precision-host",
        "preparer_sha256": module["sha"](payload[PREPARER]), "preflight_sha256": module["sha"](verifier_bytes),
        "node": runtime, "live_checkout": str(live), "live_head": live_head, "manifest": manifest,
        "manifest_sha256": module["sha"](module["canonical"](manifest)), "manual_permission_corrections": 0,
        "authority": module["AUTHORITY"]}
    receipt_bytes = module["canonical"](receipt) + b"\n"
    receipt_sha = module["sha"](receipt_bytes)
    write_new(bundle / "preparation-receipt.json", receipt_bytes, 0o600)
    # Immediately compose the exact bound verifier; no intervening chmod or
    # source write. Its successful output is required for the aggregate pass.
    invocation = [sys.executable, "-I", "-B", str(bundle / "source" / VERIFIER), "--bundle", str(bundle),
                  "--source-head", args.source_head, "--receipt-sha256", receipt_sha]
    if not args.artifact_only:
        invocation.append("--host-checks")
    process = command(invocation, timeout=300, allowed_exits=(0, 2), completed=True)
    output = process.stdout
    verification = module["strict_json"](output)
    expected_result = "ARTIFACT_VERIFIED" if args.artifact_only else "PRECISION_HOST_OBSERVED_PASS"
    require(verification["marker"] == "VOID_PRECISION_WEB_PREFLIGHT_V2"
            and verification["result"] in (expected_result, "HOLD"),
            "preflight terminal does not match this generation")
    passed = verification["result"] == expected_result
    require(process.returncode == (0 if passed else 2), "preflight result/exit mismatch")
    if passed:
        require(verification["receipt_sha256"] == receipt_sha and verification["source_head"] == args.source_head,
                "preflight coordinates do not match this generation")
    aggregate = {"marker": "VOID_PRECISION_WEB_PREPARATION_AGGREGATE_V2", "profile": receipt["profile"],
        "result": verification["result"], "preflight_exit": process.returncode,
        "source_head": args.source_head, "source_tree": tree, "preparer_sha256": receipt["preparer_sha256"],
        "preflight_sha256": receipt["preflight_sha256"], "receipt_sha256": receipt_sha,
        "manifest_sha256": receipt["manifest_sha256"], "node": runtime,
        "fresh_bundle": True, "intervening_permission_correction": False,
        "preflight_stdout_sha256": module["sha"](output), "preflight": verification, "authority": module["AUTHORITY"]}
    aggregate_bytes = module["canonical"](aggregate) + b"\n"
    write_new(aggregate_path, aggregate_bytes, 0o600)
    print(json.dumps({"marker": module["MARKER"], "result": verification["result"], "reason": verification.get("reason"), "source_head": args.source_head,
         "source_tree": tree, "bundle": str(bundle), "receipt": str(bundle / "preparation-receipt.json"),
         "receipt_sha256": receipt_sha, "manifest_sha256": receipt["manifest_sha256"],
         "preparer_sha256": receipt["preparer_sha256"], "preflight_sha256": receipt["preflight_sha256"],
         "node": runtime, "aggregate": str(aggregate_path), "aggregate_sha256": module["sha"](aggregate_bytes),
         "fresh_bundle": True, "manual_permission_corrections": 0, "authority": module["AUTHORITY"]}, sort_keys=True))
    print("Return preparation-receipt.json and the aggregate JSON. Independent acceptance remains false.")
    return 0 if passed else 2


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true", required=True)
    parser.add_argument("--source-head", required=True)
    parser.add_argument("--live-checkout", type=Path, default=Path.home() / "dev/void-node")
    parser.add_argument("--output-parent", type=Path, default=Path.home() / "dev/void-web-recovery-v2")
    parser.add_argument("--artifact-only", action="store_true")
    args = parser.parse_args()
    original_umask = os.umask(0o022)
    try:
        return prepare(args)
    finally:
        os.umask(original_umask)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"marker": "VOID_PRECISION_WEB_PREPARATION_V2", "result": "HOLD", "reason": str(error),
                          "installed": False, "service_changed": False, "funnel_changed": False, "dns_changed": False}))
        raise SystemExit(2)
