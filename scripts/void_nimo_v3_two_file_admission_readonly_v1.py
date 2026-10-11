#!/usr/bin/env python3
"""Read-only Nimo V3 two-file installation-admission census. NEVER installs.

--inspect binds staged user-private files, root-owned installed files, and the
root-owned public SSH authorization set. --self-test tests pure classification.
The result is an observation, NOT installation authority or a signed receipt.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pwd
import socket
import stat
import sys

MARKER = "VOID_NIMO_V3_TWO_FILE_ADMISSION_READONLY_V1"
CANDIDATE = "voidwfb3_cec212bbadb4586f7d479c2284e7a2850f47bdc2205a6dccfad5274c8c7ef454"
ARCHIVE_BYTES = 256000
ARCHIVE_SHA = "5063297be5469385113041da31962d465350607dafffe25784e3b4888e7f6900"
STAGE = "void-nimo-v3-inactive-review-20261010"
AUTH_PATH = "/etc/ssh/authorized_keys/voidwitness"
AUTH_SHA = "82cf34c8c2ff28a29103d050f081cff21f9beb0fbad04ec2d6d4de212c49afe4"
ROOT_TOOLS = "/usr/local/libexec/void/"
ROOT_DIST = "/usr/local/libexec/"
RUNTIME = (
    ("tools/void-buy-allocation-custody-witness-forced-command-v2.mjs", 48914, "88f425986eff8597cdf6725e4608b3790aed2359fef6ae9fadb76292d9e5a26d"),
    ("dist/economic/buy_void_allocation_custody_external_witness_v1.js", 35821, "35d80f00a9ec0ce57bb457596d27e8c86a70d76efe310372e1fff796a92d43ca"),
    ("dist/economic/buy_void_allocation_custody_witness_transport_v1.js", 35066, "8e03107d1545977a19b847bbec926543b9812b6d9c16a4d7e13e62cf5c790979"),
    ("dist/economic/buy_void_allocation_reservation_high_water_v1.js", 12251, "1999015c9e0770a5a94b3b4d29f5aa6a47036406754673adb2ed5829c5e406e9"),
    ("dist/economic/buy_void_allocation_reservation_ledger_v1.js", 43033, "97a1cb675fec65558aa823b94f049815345fbaed4ac69c9dfae4e1416950cec0"),
    ("dist/economic/buy_void_auto_fulfillment_v1.js", 26226, "119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c"),
    ("dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js", 21165, "0b4dd188dbbf7658542b1d20c521227fa1fc01d7d79e89a713863b771380da13"),
    ("dist/economic/buy_void_filesystem_bakery_lock_v1.js", 18018, "7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994"),
)
HISTORICAL = {
    4: "af497a5b7f62b08b60e90a527ae3365540fd2a13fcd99f6dd4e8253423869c0f",
    5: "ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6",
}
RO = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
RD = RO | os.O_DIRECTORY


def hold(reason: str) -> None:
    raise ValueError("nimo_v3_preinstall_admission_" + reason)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def same(a: os.stat_result, b: os.stat_result) -> bool:
    return (a.st_dev, a.st_ino, a.st_uid, a.st_gid, a.st_mode,
            a.st_nlink, a.st_size, a.st_mtime_ns, a.st_ctime_ns) == (
            b.st_dev, b.st_ino, b.st_uid, b.st_gid, b.st_mode,
            b.st_nlink, b.st_size, b.st_mtime_ns, b.st_ctime_ns)


def open_directory(fd: int, name: str, owner: int, private: bool) -> int:
    if not name or name in (".", "..") or "/" in name:
        hold("invalid_directory_component")
    before = os.stat(name, dir_fd=fd, follow_symlinks=False)
    child = os.open(name, RD, dir_fd=fd)
    try:
        opened = os.fstat(child)
        after = os.stat(name, dir_fd=fd, follow_symlinks=False)
        if not (same(before, opened) and same(opened, after)
                and stat.S_ISDIR(opened.st_mode) and opened.st_uid == owner
                and (opened.st_mode & 0o022) == 0
                and (not private or (opened.st_mode & 0o7777) == 0o700)):
            hold("directory_not_private_or_root_bound")
        return child
    except BaseException:
        os.close(child)
        raise


def open_parent(path: str, current_uid: int, stage: bool) -> tuple[int, str]:
    if not path.startswith("/") or path == "/" or "\x00" in path or os.path.normpath(path) != path:
        hold("uncanonical_path")
    parts = path.strip("/").split("/")
    if any(p in ("", ".", "..") for p in parts):
        hold("uncanonical_path_component")
    fd = os.open("/", RD)
    try:
        roots = os.fstat(fd)
        if roots.st_uid != 0 or not stat.S_ISDIR(roots.st_mode) or roots.st_mode & 0o022:
            hold("root_ancestor_untrusted")
        for index, component in enumerate(parts[:-1]):
            # Only the invoking user's Nimo home, stage, and nested payload
            # directories may be user-owned. System and /home parents are root.
            usr = (stage and index >= 1)
            uid = current_uid if usr else 0
            private = (stage and index >= 2)
            next_fd = open_directory(fd, component, uid, private)
            os.close(fd)
            fd = next_fd
        return fd, parts[-1]
    except BaseException:
        os.close(fd)
        raise


def read_bound_file(path: str, uid: int, gid: int | None, mode: int,
                    expected_size: int | None, limit: int, stage: bool) -> tuple[int, str]:
    parent, basename = open_parent(path, uid, stage)
    try:
        before = os.stat(basename, dir_fd=parent, follow_symlinks=False)
        fd = os.open(basename, RO, dir_fd=parent)
        try:
            first = os.fstat(fd)
            if not (same(before, first) and stat.S_ISREG(first.st_mode)
                    and first.st_uid == uid and (gid is None or first.st_gid == gid)
                    and first.st_nlink == 1 and (first.st_mode & 0o7777) == mode
                    and 0 < first.st_size <= limit
                    and (expected_size is None or first.st_size == expected_size)):
                hold("file_identity_not_qualified")
            # Full bounded descriptor read, refusing file growth by size+1.
            buf = bytearray()
            while len(buf) < limit + 1:
                piece = os.read(fd, min(65536, limit + 1 - len(buf)))
                if not piece:
                    break
                buf.extend(piece)
            last = os.fstat(fd)
            visible = os.stat(basename, dir_fd=parent, follow_symlinks=False)
            if not (same(first, last) and same(last, visible) and len(buf) == first.st_size):
                hold("file_changed_during_observation")
            return len(buf), sha(buf)
        finally:
            os.close(fd)
    finally:
        os.close(parent)


def stage_files(uid: int, home: str) -> list[str]:
    # Inspect exact stage tree with descriptor-relative directory listing.
    stage_root = home + "/" + STAGE
    parent, leaf = open_parent(stage_root + "/marker", uid, stage=True)
    # The final directory reached by open_parent is the stage itself.
    try:
        if set(os.listdir(parent)) != {"tools", "dist"}:
            hold("stage_extra_or_missing_root_entries")
        # Exact tree is also enforced at each relative level.
        layouts = (
            ("tools", {"void-buy-allocation-custody-witness-forced-command-v2.mjs"}),
            ("dist", {"economic"}),
        )
        for name, expected in layouts:
            fd = open_directory(parent, name, uid, True)
            try:
                if set(os.listdir(fd)) != expected:
                    hold("stage_extra_or_missing_entries")
                if name == "dist":
                    inner = open_directory(fd, "economic", uid, True)
                    try:
                        if set(os.listdir(inner)) != {p.split("/")[-1] for p, _, _ in RUNTIME if p.startswith("dist/economic/")}:
                            hold("stage_extra_or_missing_economic_entries")
                    finally:
                        os.close(inner)
            finally:
                os.close(fd)
    finally:
        os.close(parent)
    digests = []
    for rel, length, expected in RUNTIME:
        _, digest = read_bound_file(stage_root + "/" + rel, uid, None, 0o400, length, length, True)
        if digest != expected:
            hold("staged_content_hash_mismatch")
        digests.append(digest)
    return digests


def classify(staged: list[str], installed: list[str], auth: str) -> str:
    if len(staged) != 8 or len(installed) != 8 or auth != AUTH_SHA:
        hold("source_or_authorization_set_mismatch")
    for index, (rel, _, desired) in enumerate(RUNTIME):
        if staged[index] != desired:
            hold("staged_v3_runtime_mismatch")
        allowed = {desired, HISTORICAL[index]} if index in HISTORICAL else {desired}
        if installed[index] not in allowed:
            hold("installed_runtime_unrecognized:" + rel)
    older = {i for i in HISTORICAL if installed[i] == HISTORICAL[i]}
    if older == {4, 5}:
        return "EXACT_TWO_FILE_HISTORICAL_V1_TO_V3_CANDIDATE"
    if not older:
        return "V3_FILE_BYTES_ALREADY_PRESENT_NOT_ATTESTED"
    hold("partially_upgraded_mixed_generation")


def inspect() -> dict:
    if os.name != "posix" or os.getuid() == 0 or os.geteuid() != os.getuid():
        hold("nonroot_unprivileged_required")
    if socket.gethostname().split(".")[0].lower() != "nimo":
        hold("nimo_host_required")
    user = pwd.getpwuid(os.getuid())
    home = user.pw_dir
    if not home.startswith("/home/") or home.endswith("/") or os.path.normpath(home) != home:
        hold("home_path_unqualified")
    staged = stage_files(os.getuid(), home)
    installed = []
    for rel, wanted_len, wanted_hash in RUNTIME:
        dest = ROOT_TOOLS + rel.removeprefix("tools/") if rel.startswith("tools/") else ROOT_DIST + rel
        length, digest = read_bound_file(dest, 0, 0, 0o444, None, 131072, False)
        if digest == wanted_hash and length != wanted_len:
            hold("installed_v3_length_mismatch")
        installed.append(digest)
    auth_size, auth_digest = read_bound_file(AUTH_PATH, 0, 0, 0o444, None, 32768, False)
    state = classify(staged, installed, auth_digest)
    return {"marker": MARKER, "mode": "inspect", "host": "Nimo", "candidate_manifest_id": CANDIDATE,
            "archive_expected_bytes": ARCHIVE_BYTES, "archive_expected_sha256": ARCHIVE_SHA,
            "archive_sha256_freshly_measured": False, "source_commit_source_only": "2d27716db345e04dbace677915ed2676f4db9b06",
            "stage_runtime_files_verified": len(staged), "installed_runtime_files_verified": len(installed),
            "installed_state": state, "files_to_change": [RUNTIME[i][0] for i in (4, 5)] if state.startswith("EXACT_TWO") else [],
            "installed_current_sha256": {RUNTIME[i][0]: installed[i] for i in (4, 5)},
            "target_v3_sha256": {RUNTIME[i][0]: RUNTIME[i][2] for i in (4, 5)},
            "auth_set_sha256": auth_digest, "auth_file_bytes": auth_size,
            "reviewed_three_key_auth_set_observed": True,
            "filesystem_mutation": False, "sudo_used": False, "runtime_service_quiescence_verified": False,
            "transport_identity_attested": False, "installed_v3_accepted": False,
            "authenticated_custody_principal_verified": False, "verified_payment_to_allocation_mounted": False,
            "custody_reserve_recover_enabled": False, "presale_activation": False,
            "funds_moved": False, "user_staged_private_bytes_only": True}


def self_test() -> dict:
    v3 = [h for _, _, h in RUNTIME]
    v1 = v3.copy()
    for i, old in HISTORICAL.items():
        v1[i] = old
    assert classify(v3, v1, AUTH_SHA).startswith("EXACT_TWO_FILE_")
    assert classify(v3, v3, AUTH_SHA).startswith("V3_FILE_BYTES_ALREADY_")
    bad_cases = 0
    samples = [
        (v3[:-1], v1, AUTH_SHA), (v3, v1[:-1], AUTH_SHA),
        (v3, v1, "0" * 64),
        (v3, ["0" * 64] + v1[1:], AUTH_SHA),
        (["0" * 64] + v3[1:], v1, AUTH_SHA),
        (v3, v1[:4] + [v3[4]] + v1[5:], AUTH_SHA),
        (v3, v1[:5] + [v3[5]] + v1[6:], AUTH_SHA),
    ]
    for ss, ii, auth in samples:
        try:
            classify(ss, ii, auth)
        except ValueError:
            bad_cases += 1
        else:
            raise AssertionError("adversarial_case_passed")
    assert bad_cases == len(samples)
    return {"marker": MARKER, "mode": "self-test", "pure_policy_cases_passed": 2 + bad_cases,
            "filesystem_writes": False, "host_files_accessed": False, "installed_v3_accepted": False,
            "presale_activation": False, "funds_moved": False}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    x = parser.add_mutually_exclusive_group(required=True)
    x.add_argument("--inspect", action="store_true")
    x.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    receipt = inspect() if args.inspect else self_test()
    print(json.dumps(receipt, sort_keys=True, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, AssertionError, KeyError) as exc:
        message = str(exc)
        if not message.startswith("nimo_v3_preinstall_admission_"):
            message = "nimo_v3_preinstall_admission_unqualified_host_or_input"
        print("VOID_NIMO_V3_TWO_FILE_ADMISSION_READONLY_HOLD:" + message, file=sys.stderr)
        sys.exit(2)
