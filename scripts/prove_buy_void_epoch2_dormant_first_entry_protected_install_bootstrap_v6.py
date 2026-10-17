#!/usr/bin/env python3
"""Prove C6 components and the accepted C6 ELF handoff to frozen inner V5.

The inherited include-C component harness stays in disposable repositories.
The full proof separately invokes the exact accepted C6 ELF four times inside
a mandatory private mount/PID/proc fixture. The frozen C2 launcher and native
input remain data. The canonical inner receipts are checked as emitted; absent
ALREADY_GREEN publication/next-action fields are reported explicitly. Full
fixture snapshots verify unchanged state and no publication during the calls.
"""
from __future__ import annotations

import argparse
import ast
import contextlib
import hashlib
import inspect
import json
import importlib.util
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE_REL = "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6.c"
INSTALLER_REL = "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v5.py"
MANIFEST_REL = "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V6"
GENERATION_PREFIX = "voidbuye2dormantsourcegen3_"
SOURCE_ROLES = ("installer", "bootstrap_source", "lock", "runtime_installer")
SOURCE_BLOB = "a317d3dce324337f107909bd6e33e98622b3ef09"
INSTALLER_BLOB = "ce6930bc1be8239a3171d4922c44b96a50f5778b"
MANIFEST_BLOB = "6e0630af72111bd9976dcc38cdcdada1904dd067"
MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_MANIFEST_BYTES = 16384
ACCEPTED_BOOTSTRAP_BYTES = 874_608
ACCEPTED_BOOTSTRAP_SHA256 = "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
ACCEPTED_BOOTSTRAP_BLOB = "a91707c3e5803071fc73c3451c9bcb3b774f8b48"
ACCEPTED_BOOTSTRAP_LOCK_REL = "ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
ACCEPTED_BOOTSTRAP_LOCK_ID = "voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
ACCEPTED_LAUNCHER_BYTES = 731_072
ACCEPTED_LAUNCHER_SHA256 = "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
ACCEPTED_NATIVE_BYTES = 726_976
ACCEPTED_NATIVE_SHA256 = "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
FIXTURE_GIT_CONFIG = (
    b"[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n"
    b"\tbare = false\n\tlogallrefupdates = true\n"
)
FIXTURE_SCHEMA = "source_generation_v3_accepted_native_v6_inner_v5_fixture_v1"
FROZEN = {
    ACCEPTED_BOOTSTRAP_LOCK_REL: (4272, "f5b03c6b81016edf21f605099e0ef8976f40e107"),
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py": (127102, "88577de29dddbe61d2c2f59179d0dcb62a49165a"),
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c": (106764, "81fc960f1cec597b01875ed944b25e5b6574d34d"),
    "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf": (2382, "782f747cda24a214c64e8ec3f49b6791bbb62f97"),
    "scripts/prove_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.py": (49056, "32f58b97ca2564bccd95dbcf07ccd033aa68133e"),
    "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_v2.py": (94126, "a6574e2d52f267d4a595c8cad0004d4797fd6f93"),
    'ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3.py': (95062, '242eac04da6e17d32e9a9baa9b57f572cabda7a8'),
    'ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4.c': (60997, 'c7d2125b59dcbecc1d6aae8818e84cac8ce85da9'),
    'ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v1.conf': (2380, 'a484a7d2e1159ebbef3357ec849af92d7f12cff1'),
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py": (42054, "383b84e71b371de65579e4113469e86a59b807ab"),
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py": (58454, "69a018c0eccedf3782055c56725579d02463b05e"),
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2.c": (19450, "19f9baf8d6d707da43dbd0e247667af1a10e46c5"),
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3.c": (19765, "2c3c9ed120cc9949a0528e43be886354aa25da5a"),
}
BASE_ENV = {
    "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C",
    "LC_ALL": "C", "TZ": "UTC",
}
SETUP_ENV = {
    **BASE_ENV, "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null", "GIT_NO_REPLACE_OBJECTS": "1",
    "GIT_TERMINAL_PROMPT": "0", "GIT_ALLOW_PROTOCOL": "", "GIT_NO_LAZY_FETCH": "1",
    "GIT_AUTHOR_NAME": "VOID source fixture", "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
    "GIT_COMMITTER_NAME": "VOID source fixture", "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
}


class ProofError(RuntimeError):
    pass


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise ProofError(reason)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()


def accepted_bootstrap_lock(source: bytes, manifest: bytes, installer: bytes) -> None:
    """Bind existing acceptance as immutable data; grant no new authority."""
    raw = read_source(ACCEPTED_BOOTSTRAP_LOCK_REL)
    size, expected_blob = FROZEN[ACCEPTED_BOOTSTRAP_LOCK_REL]
    require(len(raw) == size and git_blob(raw) == expected_blob,
            "accepted_bootstrap_lock_identity_changed")
    lock = json.loads(raw)
    require(lock["schema"] == "void_buy_void_epoch2_dormant_first_entry_bootstrap_v6_candidate_lock_v1"
            and lock["repository"] == "6ZoSo9/void-node"
            and lock["lock_id"] == ACCEPTED_BOOTSTRAP_LOCK_ID,
            "accepted_bootstrap_lock_contract_changed")
    for key in ("candidate_accepted", "native_binary_identity_accepted", "source_generation_identity_accepted"):
        require(lock[key] is True, "accepted_bootstrap_lock_acceptance_missing:" + key)
    for key in ("protected_install_authorized", "live_execution_authorized", "credential_access_authorized",
                "private_key_access_authorized", "signing_authorized", "transaction_authorized",
                "rpc_call_authorized", "payment_acceptance_authorized", "public_presale_activation_authorized",
                "wc_void_market_activation_authorized", "treasury_liquidity_action_authorized",
                "funds_movement_authorized", "production_host_evidence_authority"):
        require(lock[key] is False, "accepted_bootstrap_lock_authority_changed:" + key)
    require(lock["native_binary"]["bytes"] == ACCEPTED_BOOTSTRAP_BYTES
            and lock["native_binary"]["sha256"] == ACCEPTED_BOOTSTRAP_SHA256,
            "accepted_bootstrap_binary_contract_changed")
    generation = lock["source_generation"]
    require(generation["id"] == GENERATION_PREFIX + sha256(manifest),
            "accepted_bootstrap_source_generation_changed")
    for prefix, content in (("manifest", manifest), ("bootstrap_source", source), ("inner_installer", installer)):
        require(generation[prefix + "_git_blob_sha1"] == git_blob(content)
                and generation[prefix + "_bytes"] == len(content)
                and generation[prefix + "_sha256"] == sha256(content),
                "accepted_bootstrap_bound_source_changed:" + prefix)


def repository_state(root: Path) -> dict[str, tuple]:
    """Observe fixture bytes and generation metadata, excluding access time."""
    result = {}
    for path in (root, *sorted(root.rglob("*"))):
        st = path.lstat()
        if stat.S_ISLNK(st.st_mode):
            value = ("link", os.readlink(path))
        elif stat.S_ISREG(st.st_mode):
            value = ("file", sha256(path.read_bytes()))
        elif stat.S_ISDIR(st.st_mode):
            value = ("directory",)
        else:
            value = ("other",)
        result[str(path.relative_to(root))] = (
            st.st_dev, st.st_ino, st.st_mode, st.st_uid, st.st_gid,
            st.st_nlink, st.st_size, st.st_mtime_ns, st.st_ctime_ns, *value,
        )
    return result


def read_source(relative: str, maximum: int = MAX_SOURCE_BYTES) -> bytes:
    path = ROOT / relative
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        before = os.fstat(fd)
        require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and
                0 < before.st_size <= maximum, "source_metadata_invalid:" + relative)
        raw = bytearray()
        while len(raw) < before.st_size:
            chunk = os.read(fd, min(65536, before.st_size - len(raw)))
            require(bool(chunk), "source_short_read:" + relative)
            raw.extend(chunk)
        require(not os.read(fd, 1), "source_grew:" + relative)
        after, visible = os.fstat(fd), path.lstat()
        for field in ("st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
                      "st_size", "st_mtime_ns", "st_ctime_ns"):
            require(getattr(before, field) == getattr(after, field) == getattr(visible, field),
                    "source_changed:" + relative)
        return bytes(raw)
    finally:
        os.close(fd)


def run(argv: list[str], *, check: bool = True, env: dict[str, str] | None = None,
        timeout: int = 90) -> subprocess.CompletedProcess[bytes]:
    result = subprocess.run(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, env=BASE_ENV if env is None else env,
                            timeout=timeout, check=False)
    if check and result.returncode:
        raise ProofError("command_failed:" + str(result.returncode) + ":" +
                         result.stderr.decode("utf-8", "replace")[:2000])
    return result


def discover(names: tuple[str, ...]) -> str:
    for name in names:
        path = shutil.which(name)
        if path:
            return path
    raise ProofError("tool_unavailable:" + ",".join(names))


def compile_args(compiler: str, source: Path, binary: Path, digest: str, size: int) -> list[str]:
    return [compiler, "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", "-Wformat=2",
            "-Wshadow", "-fstack-protector-strong", "-D_FORTIFY_SOURCE=2", "-static",
            "-Wl,-z,relro,-z,now,-z,noexecstack",
            '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MANIFEST_SHA256="' + digest + '"',
            "-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MANIFEST_BYTES=" + str(size),
            str(source), "-o", str(binary)]


def expect_hold(binary: Path, args: list[str], label: str, *,
                env: dict[str, str] | None = None) -> str:
    checkout = Path(args[2]) if len(args) == 4 and args[0] in ("verify", "verify-drift") else None
    before = repository_state(checkout) if checkout is not None else None
    git_before = repository_state(checkout / ".git") if checkout is not None else None
    result = run([str(binary), *args], check=False, env=env)
    if checkout is not None:
        require(repository_state(checkout / ".git") == git_before, "native_hold_changed_source_git_metadata:" + label)
        if args[0] != "verify-drift":
            require(repository_state(checkout) == before, "native_hold_changed_source_bytes_or_metadata:" + label)
    text = result.stderr.decode("ascii", "replace")
    allowed_stdout = (b"", private_authority()) if checkout is not None else (b"",)
    require(result.returncode == 2 and result.stdout in allowed_stdout and MARKER + "_HOLD reason=" in text,
            "native_missing_hold:" + label + ":" + text)
    require("installer_python_started=false\n" in text and
            "installer_apply_performed=false\n" in text,
            "native_hold_not_prechild:" + label)
    return text


def private_authority() -> bytes:
    return (b"git_boundary_policy=private_metadata_pinned_objects_raw_checkout_v4\n"
            b"temporary_git_metadata_write_authorized=true\n"
            b"temporary_git_metadata_mutation_possible=true\n"
            b"source_repository_mutation=false\nsource_object_fetch=false\n")


def harness_source(source: Path) -> str:
    # Production checks remain real. The include-C pread interposition first
    # executes real pread, then changes one earlier inert fixture file when a
    # known later fixture inode is read. No Git helper program is installed.
    quoted = str(source).replace("\\", "\\\\").replace('"', '\\"')
    prefix = r'''#define _GNU_SOURCE
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>
#include <fcntl.h>
#include <stdbool.h>
static int fixture_earlier_fd = -1;
static struct stat fixture_later_identity;
static bool fixture_drift_armed = false;
static ssize_t fixture_pread(int, void *, size_t, off_t);
#define pread fixture_pread
#define main production_bootstrap_main
'''
    return prefix + '#include "' + quoted + '"\n#undef main\n#undef pread\n' + r'''
static ssize_t fixture_pread(int fd, void *buffer, size_t count, off_t offset) {
    ssize_t result = pread(fd, buffer, count, offset);
    if (result > 0 && fixture_drift_armed) {
        struct stat observed;
        if (!fstat(fd, &observed) && observed.st_dev == fixture_later_identity.st_dev &&
            observed.st_ino == fixture_later_identity.st_ino) {
            unsigned char value;
            fixture_drift_armed = false;
            if (pread(fixture_earlier_fd, &value, 1, 0) != 1)
                hold("source_fixture_earlier_file_read_failed");
            value ^= 1;
            if (pwrite(fixture_earlier_fd, &value, 1, 0) != 1)
                hold("source_fixture_earlier_file_write_failed");
        }
    }
    return result;
}
static void fixture_arm_drift(int checkout_fd) {
    fixture_earlier_fd = openat(checkout_fd, "earlier/first.txt", O_RDWR | O_CLOEXEC | O_NOFOLLOW);
    int later_fd = openat(checkout_fd, "later/last.txt", O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
    if (fixture_earlier_fd < 0 || later_fd < 0 || fstat(later_fd, &fixture_later_identity) ||
        !S_ISREG(fixture_later_identity.st_mode) || fixture_later_identity.st_size < 1)
        hold("source_fixture_drift_files_invalid");
    close(later_fd);
    fixture_drift_armed = true;
}
int main(int argc, char **argv) {
    if (argc == 3 && !strcmp(argv[1], "git-resource-limits")) {
        const int kinds[3] = {RLIMIT_AS, RLIMIT_CPU, RLIMIT_CORE};
        struct rlimit parent_limits[3];
        for (size_t i = 0; i < 3; i++)
            if (getrlimit(kinds[i], &parent_limits[i])) hold("source_fixture_resource_read_failed");
        pid_t child = fork();
        if (child < 0) hold("source_fixture_resource_fork_failed");
        if (!child) {
            const rlim_t caps[3] = {(rlim_t)2 * 1024 * 1024 * 1024, 20, 0};
            rlim_t expected[3];
            for (size_t i = 0; i < 3; i++) {
                struct rlimit inherited;
                if (getrlimit(kinds[i], &inherited)) _exit(31);
                if (!strcmp(argv[2], "stricter") && i < 2) {
                    rlim_t stricter = i == 0 ? (rlim_t)1024 * 1024 * 1024 : 7;
                    if (inherited.rlim_cur == RLIM_INFINITY || inherited.rlim_cur > stricter)
                        inherited.rlim_cur = stricter;
                    if (setrlimit(kinds[i], &inherited)) _exit(32);
                }
                expected[i] = caps[i];
                if (inherited.rlim_cur != RLIM_INFINITY && inherited.rlim_cur < expected[i])
                    expected[i] = inherited.rlim_cur;
                if (inherited.rlim_max != RLIM_INFINITY && inherited.rlim_max < expected[i])
                    expected[i] = inherited.rlim_max;
            }
            if (!git_child_limits()) _exit(33);
            for (size_t i = 0; i < 3; i++) {
                struct rlimit observed;
                if (getrlimit(kinds[i], &observed) || observed.rlim_cur != expected[i] ||
                    observed.rlim_max != expected[i]) _exit(34);
            }
            _exit(0);
        }
        int status;
        if (waitpid(child, &status, 0) != child || !WIFEXITED(status) || WEXITSTATUS(status))
            hold("source_fixture_resource_child_failed");
        for (size_t i = 0; i < 3; i++) {
            struct rlimit observed;
            if (getrlimit(kinds[i], &observed) || observed.rlim_cur != parent_limits[i].rlim_cur ||
                observed.rlim_max != parent_limits[i].rlim_max)
                hold("source_fixture_parent_limits_changed");
        }
        puts("native_git_child_resource_limits_green=true\nparent_limits_unchanged=true\ninstaller_python_started=false");
        return 0;
    }
    if (argc == 3 && !strcmp(argv[1], "child-waitability")) {
        struct sigaction action = {0};
        action.sa_handler = !strcmp(argv[2], "ignored") ? SIG_IGN : SIG_DFL;
        if (!strcmp(argv[2], "auto-reap")) action.sa_flags = SA_NOCLDWAIT;
        if (sigemptyset(&action.sa_mask) || sigaction(SIGCHLD, &action, NULL))
            hold("source_fixture_signal_setup_failed");
        require_waitable_children();
        puts("native_waitable_child_contract_green=true\ninstaller_python_started=false");
        return 0;
    }
    if (argc >= 2 && !strcmp(argv[1], "environment")) {
        validate_caller_environment(argv + 2);
        puts("native_caller_environment_green=true\ninstaller_python_started=false");
        return 0;
    }
    if (argc >= 2 && !strcmp(argv[1], "request")) {
        request_v4 request = parse_request(argc - 1, argv + 1);
        printf("native_request_parser_green=true\nexpected_head=%s\ninstaller_python_started=false\n",
            request.expected_head);
        return 0;
    }
    if (argc == 3 && !strcmp(argv[1], "hash-fixture")) {
        int fd = open(argv[2], O_RDONLY | O_CLOEXEC | O_NOFOLLOW | O_NONBLOCK);
        struct stat st;
        if (fd < 0 || fstat(fd, &st) || !S_ISREG(st.st_mode) || st.st_nlink != 1 ||
            st.st_size < 0 || (uintmax_t)st.st_size > MAX_SOURCE_BYTES)
            hold("source_fixture_hash_input_invalid");
        size_t size = (size_t)st.st_size;
        unsigned char *raw = calloc(size + 1, 1);
        if (!raw) hold("source_fixture_hash_allocation_failed");
        size_t offset = 0;
        while (offset < size) {
            ssize_t got = pread(fd, raw + offset, size - offset, (off_t)offset);
            if (got < 0 && errno == EINTR) continue;
            if (got <= 0) hold("source_fixture_hash_short_read");
            offset += (size_t)got;
        }
        char blob_bytes[41], blob_fd[41], sha_bytes[65], sha_fd[65];
        hash_bytes(raw, size, true, blob_bytes); hash_fd(fd, size, true, blob_fd);
        hash_bytes(raw, size, false, sha_bytes); hash_fd(fd, size, false, sha_fd);
        printf("blob_bytes=%s\nblob_fd=%s\nsha256_bytes=%s\nsha256_fd=%s\n",
            blob_bytes, blob_fd, sha_bytes, sha_fd);
        free(raw); close(fd); return 0;
    }
    if (argc == 3 && !strcmp(argv[1], "parse-manifest")) {
        retained_v4 input = open_input(argv[2], MAX_MANIFEST_BYTES);
        bytes_v4 raw = read_fd(input.fd, MAX_MANIFEST_BYTES);
        manifest_v4 parsed = parse_manifest(raw);
        printf("native_manifest_parser_green=true\nsource_generation_id=%s\n", parsed.generation);
        free(raw.data); close(input.fd); return 0;
    }
    if (argc == 3 && !strcmp(argv[1], "proof-schema")) {
        context_v4 ctx;
        init_context(&ctx);
        retained_v4 input = open_input(argv[2], MAX_MANIFEST_BYTES);
        ctx.fds[R_MANIFEST] = snapshot_input(&input, MANIFEST_BYTES, MANIFEST_SHA256, false);
        bytes_v4 raw = read_fd(ctx.fds[R_MANIFEST], MAX_MANIFEST_BYTES);
        ctx.manifest = parse_manifest(raw);
        free(raw.data);
        ctx.request.op = OP_PLAN;
        memset(ctx.request.expected_head, '1', 40);
        memset(ctx.tree, '2', 40);
        memset(ctx.policy_sha256, '3', 64);
        ctx.policy_bytes = 1;
        if (stat("/proc/self/exe", &ctx.self.opened)) hold("source_fixture_exe_stat_failed");
        for (size_t i = 1; i < R_COUNT; i++) {
            if (i == R_MANIFEST) continue;
            if (i == R_CHECKOUT || i == R_GIT_DIR) {
                ctx.fds[i] = open("/tmp", O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
                if (ctx.fds[i] < 0) hold("source_fixture_directory_failed");
            } else {
                int writer = memfd_create("nonoperational-proof-schema-fixture", MFD_CLOEXEC | MFD_ALLOW_SEALING);
                if (writer < 0) hold("source_fixture_memfd_failed");
                write_all(writer, (const unsigned char *)"fixture", 7);
                seal_writer(writer, i == R_PYTHON || i == R_GIT ? 0500 : 0400);
                ctx.fds[i] = readonly_memfd(writer);
                close(writer);
            }
        }
        create_private_proof(&ctx);
        int seals = fcntl(ctx.fds[R_PROOF], F_GET_SEALS);
        struct stat proof_stat;
        if (seals < 0 || (seals & REQUIRED_SEALS) != REQUIRED_SEALS ||
            fstat(ctx.fds[R_PROOF], &proof_stat) || proof_stat.st_nlink != 0 ||
            (proof_stat.st_mode & 07777) != 0400)
            hold("source_fixture_proof_not_private_sealed_data");
        raw = read_fd(ctx.fds[R_PROOF], MAX_PROOF_BYTES);
        write_all(STDOUT_FILENO, raw.data, raw.size);
        free(raw.data); return 0;
    }
    if (argc == 3 && !strcmp(argv[1], "parse-policy")) {
        retained_v4 input = open_input(argv[2], MAX_POLICY_BYTES);
        bytes_v4 raw = read_fd(input.fd, MAX_POLICY_BYTES);
        policy_v4 parsed = parse_policy(raw);
        printf("native_policy_parser_green=true\npython_bytes=%zu\ngit_bytes=%zu\n",
            parsed.python_bytes, parsed.git_bytes);
        free(raw.data); close(input.fd); return 0;
    }
    if (argc == 3 && !strcmp(argv[1], "tool-policy")) {
        retained_v4 input = open_input(argv[2], MAX_POLICY_BYTES);
        bytes_v4 raw = read_fd(input.fd, MAX_POLICY_BYTES);
        policy_v4 policy = parse_policy(raw);
        tool_v4 python = open_tool(FIXED_PYTHON, MAX_PYTHON_BYTES);
        tool_v4 git_tool = open_tool(FIXED_GIT, MAX_GIT_BYTES);
        int python_fd = snapshot_input(&python.target, policy.python_bytes, policy.python_sha256, true);
        int git_fd = snapshot_input(&git_tool.target, policy.git_bytes, policy.git_sha256, true);
        if ((fcntl(python_fd, F_GET_SEALS) & REQUIRED_SEALS) != REQUIRED_SEALS ||
            (fcntl(git_fd, F_GET_SEALS) & REQUIRED_SEALS) != REQUIRED_SEALS)
            hold("source_fixture_tool_seals_invalid");
        retool(&python); retool(&git_tool);
        puts("native_tool_policy_snapshots_green=true\ninstaller_python_started=false");
        free(raw.data); return 0;
    }
    if (argc == 5 && !strcmp(argv[1], "candidate")) {
        retained_v4 input = open_input(argv[2], MAX_MANIFEST_BYTES);
        int manifest_fd = snapshot_input(&input, MANIFEST_BYTES, MANIFEST_SHA256, false);
        bytes_v4 raw = read_fd(manifest_fd, MAX_MANIFEST_BYTES);
        manifest_v4 manifest = parse_manifest(raw);
        retained_v4 candidate = open_input(argv[4], MAX_CANDIDATE_BYTES);
        if (!strcmp(argv[3], "launcher"))
            (void)snapshot_input(&candidate, manifest.launcher_bytes, manifest.launcher_sha256, false);
        else if (!strcmp(argv[3], "native"))
            (void)snapshot_input(&candidate, manifest.native_bytes, manifest.native_sha256, false);
        else hold("source_fixture_candidate_role_invalid");
        puts("native_candidate_snapshot_green=true\ninstaller_python_started=false");
        free(raw.data); return 0;
    }
    if (argc != 5 || (strcmp(argv[1], "verify") && strcmp(argv[1], "verify-drift")) || !hexn(argv[4], 40))
        hold("source_fixture_argument_invalid");
    context_v4 ctx;
    init_context(&ctx);
    snprintf(ctx.request.expected_head, sizeof(ctx.request.expected_head), "%s", argv[4]);
    ctx.manifest_input = open_input(argv[2], MAX_MANIFEST_BYTES);
    ctx.fds[R_MANIFEST] = snapshot_input(&ctx.manifest_input, MANIFEST_BYTES, MANIFEST_SHA256, false);
    bytes_v4 raw = read_fd(ctx.fds[R_MANIFEST], MAX_MANIFEST_BYTES);
    ctx.manifest = parse_manifest(raw);
    free(raw.data);
    ctx.git = open_tool(FIXED_GIT, MAX_GIT_BYTES);
    char digest[65];
    hash_fd(ctx.git.target.fd, (size_t)ctx.git.target.opened.st_size, false, digest);
    ctx.fds[R_GIT] = snapshot_input(&ctx.git.target, (size_t)ctx.git.target.opened.st_size, digest, true);
    bind_checkout(&ctx, argv[3]);
    if (!strcmp(argv[1], "verify-drift")) fixture_arm_drift(ctx.fds[R_CHECKOUT]);
    verify_checkout(&ctx);
    retool(&ctx.git);
    reinput(&ctx.manifest_input);
    private_end(&ctx);
    if (installer_child_created) hold("source_fixture_installer_child_unexpected");
    printf("native_checkout_helper_green=true\nsource_generation_id=%s\nexpected_head=%s\nexpected_tree=%s\n"
        "installer_python_started=false\n", ctx.manifest.generation, ctx.request.expected_head, ctx.tree);
    return 0;
}
'''


def git(checkout: Path, *args: str) -> bytes:
    return run(["/usr/bin/git", "-C", str(checkout), "-c", "core.hooksPath=/dev/null",
                "-c", "core.fsmonitor=false", *args], env=SETUP_ENV).stdout


def commit(checkout: Path, message: str) -> str:
    git(checkout, "add", "--all")
    git(checkout, "commit", "--no-gpg-sign", "-qm", message)
    return git(checkout, "rev-parse", "HEAD").decode("ascii").strip()


def verify(harness: Path, installed: Path, checkout: Path, head: str,
           generation: str, *, env: dict[str, str] | None = None) -> dict[str, str]:
    before = repository_state(checkout)
    result = run([str(harness), "verify", str(installed), str(checkout), head], env=env)
    require(repository_state(checkout) == before, "native_verifier_changed_source_bytes_or_metadata")
    require(not result.stderr, "native_fixture_unexpected_stderr")
    rows = dict(line.split("=", 1) for line in result.stdout.decode("ascii").splitlines())
    require(result.stdout.startswith(private_authority()) and
            rows.get("filesystem_write") == "true" and
            rows.get("temporary_git_metadata_mutation_performed") == "true" and
            rows.get("temporary_git_metadata_cleanup_complete") == "true",
            "native_private_metadata_authority_or_cleanup_receipt_invalid")
    require(rows.get("native_checkout_helper_green") == "true" and
            rows.get("source_generation_id") == generation and
            rows.get("expected_head") == head and
            re.fullmatch("[0-9a-f]{40}", rows.get("expected_tree", "")) is not None and
            rows.get("installer_python_started") == "false", "native_fixture_receipt_invalid")
    return rows


def parse_fixtures(harness: Path, temporary: Path, manifest: bytes) -> int:
    fixture = temporary / "parser-input.conf"
    count = 0
    policy = ("schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6\n"
              "python_sha256=" + "1" * 64 + "\npython_bytes=1\ngit_sha256=" + "2" * 64 + "\ngit_bytes=1\n").encode("ascii")
    for command, raw in (("parse-manifest", manifest), ("parse-policy", policy)):
        fixture.write_bytes(raw)
        run([str(harness), command, str(fixture)])
        rows = raw.splitlines(keepends=True)
        malformed = [raw[:-1], raw + b"\n", raw.replace(b"\n", b"\r\n"),
                     raw + b"unknown=value\n", b"\x00" + raw, b"\xff" + raw]
        for index in range(len(rows)):
            malformed.append(b"".join(rows[:index] + rows[index + 1:]))
            malformed.append(b"".join(rows[:index + 1] + [rows[index]] + rows[index + 1:]))
        for index in range(len(rows) - 1):
            changed = list(rows)
            changed[index], changed[index + 1] = changed[index + 1], changed[index]
            malformed.append(b"".join(changed))
        for row in rows:
            key, value = row[:-1].split(b"=", 1)
            alternatives = []
            if key.endswith(b"_bytes"):
                alternatives = [b"0", b"01", b"-1", b"+1", b"99999999999999999999999999999999999999999"]
            elif key.endswith((b"_sha256", b"_blob_sha1")):
                alternatives = [b"A" * len(value), b"g" * len(value), value[:-1]]
            else:
                alternatives = [b"caller_selected_value"]
            for alternative in alternatives:
                malformed.append(raw.replace(row, key + b"=" + alternative + b"\n", 1))
        for index, changed in enumerate(malformed):
            fixture.write_bytes(changed)
            expect_hold(harness, [command, str(fixture)], command + "_" + str(index))
            count += 1
    return count


def hash_fixtures(harness: Path, temporary: Path) -> int:
    fixture = temporary / "hash-boundary.bin"
    lengths = (0, 1, 55, 56, 63, 64, 65, 119, 120, 127, 128, 129,
               65535, 65536, 65537, 1000000)
    for size in lengths:
        raw = (bytes(range(256)) * ((size + 255) // 256))[:size]
        fixture.write_bytes(raw)
        result = run([str(harness), "hash-fixture", str(fixture)])
        require(not result.stderr, "native_hash_fixture_stderr")
        values = dict(line.split("=", 1) for line in result.stdout.decode("ascii").splitlines())
        require(values == {"blob_bytes": git_blob(raw), "blob_fd": git_blob(raw),
                           "sha256_bytes": sha256(raw), "sha256_fd": sha256(raw)},
                "native_hash_reference_mismatch_at_bytes:" + str(size))
    return len(lengths)


def entry_contract_fixtures(harness: Path, temporary: Path, manifest: bytes) -> int:
    head = "1" * 40
    plan = ["--installer-plan", "--launcher", "/tmp/fixture-launcher", "--native",
            "/tmp/fixture-native", "--expected-head", head]
    apply = ["--installer-apply", *plan[1:], "--expected-plan-id",
             "voidbuye2dormantfirstentryinstall5_" + "2" * 64, "--confirm",
             "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V5_CREATE_ONLY"]
    for valid in (plan, apply):
        result = run([str(harness), "request", *valid])
        require(b"native_request_parser_green=true\n" in result.stdout and not result.stderr,
                "native_request_valid_fixture_failed")
    malformed = [[], plan[:-1], plan + ["--extra"], ["--plan", *plan[1:]],
                 [*plan[:-1], "A" * 40], [*plan[:-1], "1" * 39],
                 [*plan[:2], "relative-launcher", *plan[3:]],
                 [*plan[:4], "/tmp/../fixture-native", *plan[5:]],
                 [*plan[:1], "--native", *plan[2:]], apply[:-1],
                 [*apply[:-1], "WRONG_CONFIRM"],
                 [*apply[:8], "wrong_prefix_" + "2" * 64, *apply[9:]],
                 [*apply[:8], "voidbuye2dormantfirstentryinstall5_" + "g" * 64, *apply[9:]]]
    count = 0
    for index, args in enumerate(malformed):
        expect_hold(harness, ["request", *args], "strict_native_argv_" + str(index))
        count += 1
    run([str(harness), "environment", "PATH=/usr/bin:/bin", "HOME=/nonexistent", "LANG=C"])
    for name in ("LD_PRELOAD", "LD_LIBRARY_PATH", "LD_AUDIT", "LD_DEBUG", "PYTHONPATH", "PYTHONHOME",
                 "GIT_DIR", "GIT_CONFIG_COUNT", "GIT_EXEC_PATH", "MALLOC_CHECK_", "GLIBC_TUNABLES",
                 "GCONV_PATH", "LOCPATH", "NLSPATH", "ENV", "BASH_ENV"):
        expect_hold(harness, ["environment", name + "=fixture"], "hostile_native_environment:" + name)
        count += 1
    for entry in ("MISSING_EQUALS", "=invalid_name"):
        expect_hold(harness, ["environment", entry], "malformed_native_environment")
        count += 1
    run([str(harness), "child-waitability", "default"])
    for disposition in ("ignored", "auto-reap"):
        reason = expect_hold(harness, ["child-waitability", disposition], "unwaitable_git_child:" + disposition)
        require("source_fixture_signal_setup_failed" not in reason, "native_signal_fixture_setup_failed")
        count += 1

    installed = temporary / "proof-schema-manifest.conf"
    installed.write_bytes(manifest)
    produced = run([str(harness), "proof-schema", str(installed)])
    require(not produced.stderr, "native_proof_schema_stderr")
    spec = importlib.util.spec_from_file_location("void_v5_proof_schema_consumer", ROOT / INSTALLER_REL)
    require(spec is not None and spec.loader is not None, "inner_proof_parser_import_failed")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    parsed = module._parse_parent_proof(produced.stdout)
    require(len(parsed) == 53 and parsed["operation"] == "installer_plan" and
            parsed["expected_head"] == head and parsed["expected_tree"] == "2" * 40 and
            parsed["source_generation_id"] == GENERATION_PREFIX + sha256(manifest),
            "native_proof_to_inner_schema_mismatch")
    require(len({parsed[role + "_fd"] for role in module.FD_ROLES}) == 13,
            "native_proof_roles_not_distinct")
    # Only the real producer/consumer schema is asserted here. Fixture role data
    # and executable location deliberately cannot authenticate an installer.
    return count


def snapshot_fixtures(harness: Path, temporary: Path, manifest: bytes) -> int:
    rows = {"schema": "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"}
    for role, path in (("python", Path("/usr/bin/python3")), ("git", Path("/usr/bin/git"))):
        raw = path.read_bytes()
        rows[role + "_sha256"] = sha256(raw)
        rows[role + "_bytes"] = str(len(raw))
    def policy_bytes(values: dict[str, str]) -> bytes:
        return "".join(key + "=" + value + "\n" for key, value in values.items()).encode("ascii")
    policy = temporary / "host-policy.conf"
    policy.write_bytes(policy_bytes(rows))
    positive = run([str(harness), "tool-policy", str(policy)])
    require(b"native_tool_policy_snapshots_green=true\n" in positive.stdout and not positive.stderr,
            "native_tool_snapshot_fixture_failed")
    count = 0
    for role in ("python", "git"):
        for suffix, value in (("_sha256", "0" * 64), ("_bytes", str(int(rows[role + "_bytes"]) + 1))):
            changed = dict(rows)
            changed[role + suffix] = value
            policy.write_bytes(policy_bytes(changed))
            expect_hold(harness, ["tool-policy", str(policy)], "tool_policy_drift:" + role + suffix)
            count += 1
    installed = temporary / "snapshot-manifest.conf"
    installed.write_bytes(manifest)
    manifest_rows = dict(row.split("=", 1) for row in manifest.decode("ascii").splitlines())
    for role in ("launcher", "native"):
        candidate = temporary / (role + "-substitution.bin")
        candidate.write_bytes(b"\0" * int(manifest_rows[role + "_bytes"]))
        expect_hold(harness, ["candidate", str(installed), role, str(candidate)],
                    "same_length_payload_substitution:" + role)
        count += 1
    return count


def checkout_fixtures(harness: Path, temporary: Path, manifest: bytes,
                      bound: dict[str, bytes]) -> tuple[int, str, str]:
    checkout = temporary / "checkout"
    checkout.mkdir()
    git(checkout, "init", "--initial-branch=main", "--template=")
    for relative, raw in bound.items():
        path = checkout / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
        path.chmod(0o644)
    unrelated = checkout / "unrelated.txt"
    unrelated.write_bytes(b"first unrelated source gate\n")
    first = commit(checkout, "first generation fixture")
    installed = temporary / "installed-manifest.conf"
    installed.write_bytes(manifest)
    generation = GENERATION_PREFIX + sha256(manifest)
    one = verify(harness, installed, checkout, first, generation)
    unrelated.write_bytes(b"second unrelated source gate\n")
    second = commit(checkout, "unrelated commit without generation changes")
    two = verify(harness, installed, checkout, second, generation)
    require(first != second and one["expected_tree"] != two["expected_tree"],
            "fixture_runtime_evidence_did_not_change")
    require(one["source_generation_id"] == two["source_generation_id"],
            "unrelated_commit_changed_native_generation")
    count = 0
    base_args = ["verify", str(installed), str(checkout)]

    # Each altered dependency is committed with a clean index at a new valid HEAD.
    for relative, raw in bound.items():
        (checkout / relative).write_bytes(raw + b"\n")
        changed = commit(checkout, "change bound dependency " + relative)
        require(not git(checkout, "status", "--porcelain=v1", "--untracked-files=all"),
                "dependency_fixture_not_clean")
        expect_hold(harness, [*base_args, changed], "committed_dependency:" + relative)
        count += 1
        git(checkout, "reset", "--hard", second)

    expect_hold(harness, [*base_args, first], "forged_old_runtime_head")
    count += 1
    unrelated.write_bytes(b"dirty tracked bytes\n")
    expect_hold(harness, [*base_args, second], "dirty_tracked_worktree")
    git(checkout, "add", "unrelated.txt")
    expect_hold(harness, [*base_args, second], "staged_tracked_change")
    count += 2
    git(checkout, "reset", "--hard", second)

    extra = checkout / "untracked.txt"
    extra.write_bytes(b"untracked\n")
    expect_hold(harness, [*base_args, second], "untracked_worktree")
    extra.unlink()
    count += 1
    git(checkout, "checkout", "-qb", "fixture-non-main")
    expect_hold(harness, [*base_args, second], "non_main_branch")
    git(checkout, "checkout", "-q", "main")
    git(checkout, "checkout", "--detach", "-q", second)
    expect_hold(harness, [*base_args, second], "detached_head")
    git(checkout, "checkout", "-q", "main")
    count += 2
    for enable, disable, label in (("--assume-unchanged", "--no-assume-unchanged", "assume_unchanged"),
                                   ("--skip-worktree", "--no-skip-worktree", "skip_worktree")):
        git(checkout, "update-index", enable, "unrelated.txt")
        expect_hold(harness, [*base_args, second], label)
        git(checkout, "update-index", disable, "unrelated.txt")
        count += 1

    unrelated.chmod(0o755)
    expect_hold(harness, [*base_args, second], "worktree_executable_mode_drift")
    unrelated.chmod(0o644)
    count += 1
    installer = checkout / INSTALLER_REL
    installer.chmod(0o755)
    changed = commit(checkout, "change required source mode")
    expect_hold(harness, [*base_args, changed], "committed_bound_dependency_mode")
    git(checkout, "reset", "--hard", second)
    count += 1

    original = unrelated.read_bytes()
    target = temporary / "external-tracked-file.txt"
    target.write_bytes(original)
    unrelated.unlink()
    unrelated.symlink_to(target)
    expect_hold(harness, [*base_args, second], "regular_to_symlink_worktree")
    unrelated.unlink()
    unrelated.write_bytes(original)
    count += 1

    # Common object-store indirections must fail even if ordinary Git can read HEAD.
    for relative, raw in (("objects/info/alternates", b"/nonexistent/object-store\n"),
                          ("objects/info/http-alternates", b"https://example.invalid/objects\n"),
                          ("shallow", (second + "\n").encode("ascii")),
                          ("info/grafts", (second + "\n").encode("ascii")),
                          ("commondir", b".\n")):
        path = checkout / ".git" / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
        expect_hold(harness, [*base_args, second], "object_store_indirection:" + relative)
        path.unlink()
        count += 1

    installed.write_bytes(manifest.replace(b"repository=6ZoSo9/void-node\n",
                                          b"repository=6ZoSo9/VOID-node\n"))
    expect_hold(harness, [*base_args, second], "installed_manifest_compile_digest_drift")
    installed.write_bytes(manifest)
    count += 1
    verify(harness, installed, checkout, second, generation)
    return count, first, second



def private_git_fixtures(harness: Path, temporary: Path, manifest: bytes,
                         bound: dict[str, bytes]) -> int:
    """Exercise the actual C checkout helper against the repaired witness gaps."""
    installed = temporary / "private-reader-manifest.conf"
    installed.write_bytes(manifest)
    generation = GENERATION_PREFIX + sha256(manifest)

    def create(name):
        checkout = temporary / ("private-" + name)
        checkout.mkdir()
        git(checkout, "init", "--initial-branch=main", "--template=")
        files = dict(bound, **{
            ".gitignore": b"ignored/\n", ".gitattributes": b"tracked.txt filter=fixture\n",
            "tracked.txt": b"ordinary tracked source\n", "earlier/first.txt": b"earlier ordinary file\n",
            "later/last.txt": b"later ordinary file\n", "executable.sh": b"#!/bin/sh\nexit 0\n",
        })
        for relative, raw in files.items():
            target = checkout / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(raw)
            target.chmod(0o755 if relative == "executable.sh" else 0o644)
        (checkout / "link").symlink_to("tracked.txt")
        return checkout, commit(checkout, "ordinary private reader fixture")

    checkout, head = create("loose")
    verify(harness, installed, checkout, head, generation)
    (checkout / "ignored").mkdir()
    (checkout / "ignored/output.txt").write_bytes(b"ignored ordinary fixture\n")
    verify(harness, installed, checkout, head, generation)

    # Every configuration path is nonexistent and no helper program is supplied.
    helper_root = "/__void_fixture_nonexistent_helpers__"
    require(not Path(helper_root).exists(), "inert_helper_root_unexpectedly_exists")
    for key, value in (("core.fsmonitor", helper_root + "/fsmonitor"),
                       ("core.hooksPath", helper_root + "/hooks"),
                       ("filter.fixture.clean", helper_root + "/filter"),
                       ("filter.fixture.required", "true"), ("include.path", helper_root + "/include")):
        git(checkout, "config", key, value)
    git(checkout, "config", "core.repositoryFormatVersion", "99")
    verify(harness, installed, checkout, head, generation)

    checkout, head = create("packed")
    git(checkout, "repack", "-ad")
    git(checkout, "prune-packed")
    git(checkout, "pack-refs", "--all", "--prune")
    require(not (checkout / ".git/refs/heads/main").exists(), "native_packed_refs_fixture_not_packed")
    require(bool(list((checkout / ".git/objects/pack").glob("*.pack"))), "native_packed_objects_fixture_not_packed")
    verify(harness, installed, checkout, head, generation)

    checkout, head = create("split-index")
    git(checkout, "update-index", "--split-index")
    shared = list((checkout / ".git").glob("sharedindex.*"))
    require(bool(shared), "native_split_index_fixture_not_created")
    old_ns = 946684800000000000
    for path in shared:
        os.utime(path, ns=(old_ns, old_ns))
    expect_hold(harness, ["verify", str(installed), str(checkout), head], "private_split_index")
    require(all(path.stat().st_mtime_ns == old_ns for path in shared), "native_reader_touched_shared_index")

    checkout, head = create("sparse-index")
    git(checkout, "sparse-checkout", "init", "--cone", "--sparse-index")
    git(checkout, "sparse-checkout", "set", "earlier")
    expect_hold(harness, ["verify", str(installed), str(checkout), head], "private_sparse_index")

    checkout, head = create("corrupt-child-tree")
    tree_oid = git(checkout, "rev-parse", head + ":earlier").decode("ascii").strip()
    tree_raw = git(checkout, "cat-file", "tree", tree_oid)
    old_raw = (checkout / "earlier/first.txt").read_bytes()
    replacement = (checkout / "later/last.txt").read_bytes()
    old_entry = b"first.txt\0" + bytes.fromhex(git_blob(old_raw))
    require(tree_raw.count(old_entry) == 1, "native_corrupt_tree_fixture_member_missing")
    changed = tree_raw.replace(old_entry, b"first.txt\0" + bytes.fromhex(git_blob(replacement)))
    (checkout / "earlier/first.txt").write_bytes(replacement)
    git(checkout, "add", "earlier/first.txt")
    target = checkout / ".git/objects" / tree_oid[:2] / tree_oid[2:]
    target.chmod(0o600)
    target.write_bytes(zlib.compress(b"tree " + str(len(changed)).encode() + b"\0" + changed))
    actual_tree_oid = hashlib.sha1(b"tree " + str(len(changed)).encode() + b"\0" + changed).hexdigest()
    require(actual_tree_oid != tree_oid, "native_corrupt_tree_fixture_identity_unchanged")
    expect_hold(harness, ["verify", str(installed), str(checkout), head], "private_raw_nested_tree_identity")

    checkout, head = create("missing-bound-object")
    rows = dict(line.split("=", 1) for line in manifest.decode("ascii").splitlines())
    missing = rows["runtime_installer_blob_sha1"]
    (checkout / ".git/objects" / missing[:2] / missing[2:]).unlink()
    expect_hold(harness, ["verify", str(installed), str(checkout), head], "private_missing_bound_object")

    checkout, head = create("owner-executable")
    (checkout / "executable.sh").chmod(0o655)
    expect_hold(harness, ["verify", str(installed), str(checkout), head], "owner_execute_bit_0755_to_0655")

    checkout, head = create("earlier-file-drift")
    earlier = checkout / "earlier/first.txt"
    before = earlier.read_bytes()
    before_git = repository_state(checkout / ".git")
    reason = expect_hold(harness, ["verify-drift", str(installed), str(checkout), head], "earlier_file_drift_after_real_read")
    after = earlier.read_bytes()
    require(after == bytes([before[0] ^ 1]) + before[1:], "native_earlier_file_drift_not_injected_exactly_once")
    require("source_fixture_" not in reason, "native_drift_fixture_failed_before_real_fence")
    require(repository_state(checkout / ".git") == before_git, "native_drift_reader_changed_git_metadata")
    return 6


def production_fixture_driver() -> None:
    """Root-only disposable fixture driver; never imported by production code."""
    import ctypes
    import hashlib
    import json
    import os
    import pathlib
    import re
    import signal
    import stat
    import subprocess
    import sys

    def require(condition: bool, reason: str) -> None:
        if not condition:
            raise RuntimeError(reason)

    require(os.geteuid() == os.getegid() == 0, "fixture_driver_requires_root")
    require(sys.flags.isolated == 1 and sys.flags.no_site == 1,
            "fixture_driver_requires_isolated_no_site_python")
    require(len(sys.argv) == 3 and re.fullmatch(r"[0-9a-f]{64}", sys.argv[1]) is not None
            and sys.argv[2] == "--isolate-production-fixture",
            "fixture_isolation_and_manifest_digest_required")
    require(os.uname().nodename != "zoso-Precision-Tower-7810", "precision_host_forbidden")

    def digest(raw: bytes) -> str:
        return hashlib.sha256(raw).hexdigest()

    def blob(raw: bytes) -> str:
        return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()

    def identity(observed: os.stat_result) -> tuple[int, ...]:
        return tuple(getattr(observed, field) for field in (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
            "st_size", "st_mtime_ns", "st_ctime_ns",
        ))

    def directory_binding(observed: os.stat_result) -> tuple[int, ...]:
        return (observed.st_dev, observed.st_ino, observed.st_mode,
                observed.st_uid, observed.st_gid)

    def namespace_ids() -> dict[str, list[int]]:
        result = {}
        for name in ("mnt", "pid", "user", "uts"):
            observed = os.stat("/proc/self/ns/" + name)
            result[name] = [observed.st_dev, observed.st_ino]
        return result

    def read_fd(fd: int, size: int) -> bytes:
        result = bytearray()
        while len(result) < size:
            chunk = os.pread(fd, min(65536, size - len(result)), len(result))
            require(bool(chunk), "fixture_input_short_read")
            result.extend(chunk)
        require(not os.pread(fd, 1, size), "fixture_input_grew")
        return bytes(result)

    # All transferred inputs are flat regular files in the caller's newly
    # created temporary directory. Their individual bytes and closed logical
    # paths are checked before a fixed-path directory can be created.
    input_root = os.open(pathlib.Path(__file__).parent,
                         os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        def input_bytes(name: str, size: int, expected_digest: str) -> bytes:
            require(re.fullmatch(r"[a-z0-9-]+", name) is not None,
                    "fixture_input_basename_invalid")
            require(isinstance(size, int) and 0 < size <= 2 * 1024 * 1024,
                    "fixture_input_size_invalid")
            fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
                         dir_fd=input_root)
            try:
                before = os.fstat(fd)
                require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1
                        and before.st_size == size, "fixture_input_metadata_invalid")
                raw = read_fd(fd, size)
                require(identity(before) == identity(os.fstat(fd)) == identity(
                    os.stat(name, dir_fd=input_root, follow_symlinks=False)),
                    "fixture_input_generation_changed")
                require(digest(raw) == expected_digest, "fixture_input_digest_mismatch")
                return raw
            finally:
                os.close(fd)

        manifest_st = os.stat("production-manifest", dir_fd=input_root, follow_symlinks=False)
        require(0 < manifest_st.st_size <= 65536, "fixture_manifest_size_invalid")
        manifest_raw = input_bytes("production-manifest", manifest_st.st_size, sys.argv[1])
        manifest = json.loads(manifest_raw)
        require(set(manifest) == {"schema", "head", "payloads", "checkout", "isolate",
                                  "parent_namespaces", "parent_anchors"}
                and manifest["schema"] == "source_generation_v3_accepted_native_v6_inner_v5_fixture_v1",
                "fixture_manifest_schema_invalid")
        require(manifest["isolate"] is True,
                "fixture_isolation_argument_binding_invalid")
        parent_namespaces = manifest["parent_namespaces"]
        require(isinstance(parent_namespaces, dict)
                and set(parent_namespaces) == {"mnt", "pid", "user", "uts"}
                and all(isinstance(value, list) and len(value) == 2
                        and all(type(item) is int and item > 0 for item in value)
                        for value in parent_namespaces.values()),
                "fixture_parent_namespace_binding_invalid")
        parent_anchors = manifest["parent_anchors"]
        require(isinstance(parent_anchors, dict) and set(parent_anchors) == {"/", "/opt", "/home"}
                and all(isinstance(value, list) and len(value) == 9
                        and all(type(item) is int and item >= 0 for item in value)
                        for value in parent_anchors.values()),
                "fixture_parent_anchor_binding_invalid")
        head = manifest["head"]
        require(isinstance(head, str) and re.fullmatch(r"[0-9a-f]{40}", head) is not None,
                "fixture_head_invalid")
        payloads = manifest["payloads"]
        require(set(payloads) == {"bootstrap", "launcher", "native", "host_policy", "payload_policy"},
                "fixture_payload_roles_invalid")
        loaded: dict[str, bytes] = {}
        input_names: set[str] = {"production-manifest"}
        for role, row in payloads.items():
            require(set(row) == {"file", "bytes", "sha256"}, "fixture_payload_row_invalid")
            require(row["file"] not in input_names, "fixture_duplicate_input")
            input_names.add(row["file"])
            loaded[role] = input_bytes(row["file"], row["bytes"], row["sha256"])
        require(loaded["bootstrap"].startswith(b"\x7fELF")
                and len(loaded["bootstrap"]) == 874608
                and digest(loaded["bootstrap"]) ==
                "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
                and blob(loaded["bootstrap"]) == "a91707c3e5803071fc73c3451c9bcb3b774f8b48",
                "fixture_accepted_bootstrap_changed")
        require(len(loaded["launcher"]) == 731072 and digest(loaded["launcher"]) ==
                "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28",
                "fixture_accepted_launcher_changed")
        require(len(loaded["native"]) == 726976 and digest(loaded["native"]) ==
                "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c",
                "fixture_accepted_native_changed")
        host_rows = loaded["host_policy"].decode("ascii").splitlines(keepends=True)
        require(len(host_rows) == 5 and host_rows[0] ==
                "schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6\n"
                and re.fullmatch(r"python_sha256=[0-9a-f]{64}\n", host_rows[1]) is not None
                and re.fullmatch(r"python_bytes=[1-9][0-9]*\n", host_rows[2]) is not None
                and re.fullmatch(r"git_sha256=[0-9a-f]{64}\n", host_rows[3]) is not None
                and re.fullmatch(r"git_bytes=[1-9][0-9]*\n", host_rows[4]) is not None,
                "fixture_host_policy_invalid")
        expected_payload_policy = (
            "schema=VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1\n"
            + host_rows[1] + host_rows[2]
        ).encode("ascii")
        require(loaded["payload_policy"] == expected_payload_policy,
                "fixture_payload_policy_namespace_or_python_mismatch")
        checkout_rows = manifest["checkout"]
        require(isinstance(checkout_rows, list) and 1 <= len(checkout_rows) <= 128,
                "fixture_checkout_count_invalid")
        checkout: dict[str, dict] = {}
        allowed_directories = {
            ".git", ".git/objects", ".git/objects/info", ".git/objects/pack",
            ".git/refs", ".git/refs/heads", ".git/refs/tags", ".git/logs",
            ".git/logs/refs", ".git/logs/refs/heads", "ops", "ops/security", "ops/precision",
        }
        allowed_files = {
            ".git/config", ".git/HEAD", ".git/index", ".git/COMMIT_EDITMSG",
            ".git/logs/HEAD", ".git/logs/refs/heads/main", ".git/refs/heads/main",
            "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf",
            "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v5.py",
            "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6.c",
            "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.json",
            "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py",
        }
        total = 0
        for row in checkout_rows:
            relative = row.get("path")
            require(isinstance(relative, str) and relative not in checkout
                    and all(re.fullmatch(r"[A-Za-z0-9_.-]{1,255}", part)
                            and part not in (".", "..") for part in relative.split("/"))
                    and len(relative.split("/")) <= 6, "fixture_checkout_path_invalid")
            if row.get("kind") == "directory":
                require(set(row) == {"path", "kind"} and (
                    relative in allowed_directories
                    or re.fullmatch(r"\.git/objects/[0-9a-f]{2}", relative)),
                    "fixture_checkout_directory_invalid")
                checkout[relative] = {"kind": "directory"}
            else:
                require(set(row) == {"path", "kind", "file", "bytes", "sha256"}
                        and row["kind"] == "file" and (
                            relative in allowed_files
                            or re.fullmatch(r"\.git/objects/[0-9a-f]{2}/[0-9a-f]{38}", relative)),
                        "fixture_checkout_file_invalid")
                require(row["file"] not in input_names, "fixture_duplicate_input")
                input_names.add(row["file"])
                raw = input_bytes(row["file"], row["bytes"], row["sha256"])
                total += len(raw)
                require(total <= 1024 * 1024, "fixture_checkout_byte_budget_exceeded")
                checkout[relative] = {"kind": "file", "raw": raw}
        require(all(str(pathlib.PurePosixPath(relative).parent) == "." or
                    checkout.get(str(pathlib.PurePosixPath(relative).parent), {}).get("kind") == "directory"
                    for relative in checkout), "fixture_checkout_parent_missing")
        require(checkout[".git/config"]["raw"] == (
            b"[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n"
            b"\tbare = false\n\tlogallrefupdates = true\n"), "fixture_git_config_not_closed")
        require(checkout[".git/HEAD"]["raw"] == b"ref: refs/heads/main\n"
                and checkout[".git/refs/heads/main"]["raw"] == (head + "\n").encode("ascii"),
                "fixture_checkout_head_binding_invalid")
        require(checkout[".git/index"]["raw"][:8] == b"DIRC\0\0\0\2",
                "fixture_checkout_not_ordinary_index_v2")
        tracked_pins = {
            "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf":
                (2382, "6e0630af72111bd9976dcc38cdcdada1904dd067"),
            "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v5.py":
                (127528, "ce6930bc1be8239a3171d4922c44b96a50f5778b"),
            "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6.c":
                (106764, "a317d3dce324337f107909bd6e33e98622b3ef09"),
            "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.json":
                (4548, "227c2fa449abf1387925373c706ecd07775d5898"),
            "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py":
                (57255, "f3d6b1559be7490303cf36338c4bfa38fdaa390a"),
        }
        require({relative for relative, row in checkout.items()
                 if row["kind"] == "file" and not relative.startswith(".git/")}
                == set(tracked_pins), "fixture_tracked_membership_invalid")
        for relative, (size, expected_blob) in tracked_pins.items():
            raw = checkout[relative]["raw"]
            require(len(raw) == size and blob(raw) == expected_blob,
                    "fixture_tracked_source_changed:" + relative)
        source_manifest = checkout[
            "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
        ]["raw"]
        generation = "voidbuye2dormantsourcegen3_" + digest(source_manifest)
        runtime_installer = checkout[
            "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
        ]["raw"]
        require(set(os.listdir(input_root)) == input_names | {"production-driver.py"},
                "fixture_input_bundle_not_flat_or_has_unlisted_entries")
    finally:
        os.close(input_root)

    launcher_name = "void-buy-void-epoch2-dormant-binder-installer-first-entry-v1"
    pair_name = "void-buy-void-epoch2-dormant-v3r-binding-v2"
    bootstrap_name = "void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6"
    stage_names = ("." + launcher_name + ".stage", "." + pair_name + ".stage",
                   "." + bootstrap_name + ".stage")
    reserved_opt_names = (bootstrap_name, launcher_name, pair_name, *stage_names,
                          "void-buy-void-epoch2-dormant-binder-installer-first-entry-v2")
    nodes: list[dict] = []
    anchors: list[dict] = []
    original_anchors: list[dict] = []
    # These are the only mount targets and options admitted by this helper.
    # /opt must be executable for the actual launcher; /home contains data.
    mounts = [
        {"name": "opt", "target": b"/opt", "flags": 2 | 4,
         "data": b"mode=0755,uid=0,gid=0,size=16777216,nr_inodes=256",
         "mounted": False, "binding": None, "mount_id": None},
        {"name": "home", "target": b"/home", "flags": 2 | 4 | 8,
         "data": b"mode=0755,uid=0,gid=0,size=8388608,nr_inodes=256",
         "mounted": False, "binding": None, "mount_id": None},
    ]
    libc = None
    current_process: subprocess.Popen | None = None
    native_pids: list[int] = []
    failure: BaseException | None = None
    cleanup_completed = False
    owned_cleanup_completed = False
    private_mount_cleanup_completed = False
    private_proc_verified = False
    root_fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)

    def anchor_diagnostic(path: str, observed: os.stat_result) -> str:
        return ("path=" + path + " mode=" + format(stat.S_IMODE(observed.st_mode), "04o")
                + " uid=" + str(observed.st_uid) + " gid=" + str(observed.st_gid))

    def physical_root_directory(fd: int, path: str) -> None:
        observed = os.fstat(fd)
        require(stat.S_ISDIR(observed.st_mode) and observed.st_uid == observed.st_gid == 0
                and observed.st_mode & 0o022 == 0,
                "fixture_anchor_custody_invalid:" + anchor_diagnostic(path, observed))

    def open_original_anchor(name: str) -> dict:
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        print("fixture_original_anchor " + anchor_diagnostic("/" + name, visible), flush=True)
        require(stat.S_ISDIR(visible.st_mode), "fixture_anchor_not_physical_directory:/" + name)
        fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                     dir_fd=root_fd)
        try:
            require(identity(visible) == identity(os.fstat(fd)) == tuple(parent_anchors["/" + name]),
                    "fixture_original_anchor_rebound:/" + name)
            value = {"name": name, "fd": fd, "identity": identity(visible),
                     "binding": directory_binding(visible)}
            original_anchors.append(value)
            return value
        except BaseException:
            os.close(fd)
            raise

    def open_anchor(name: str) -> dict:
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        require(stat.S_ISDIR(visible.st_mode), "fixture_anchor_not_physical_directory")
        fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                     dir_fd=root_fd)
        try:
            physical_root_directory(fd, "/" + name)
            require(identity(visible) == identity(os.fstat(fd)), "fixture_anchor_rebound")
            require(stat.S_IMODE(visible.st_mode) == 0o755,
                    "fixture_private_anchor_mode_invalid:/" + name)
            value = {"name": name, "fd": fd, "binding": directory_binding(visible), "children": set()}
            anchors.append(value)
            return value
        except BaseException:
            os.close(fd)
            raise

    def verify_original_anchors(*, visible: bool) -> None:
        physical_root_directory(root_fd, "/")
        require(identity(os.fstat(root_fd)) == tuple(parent_anchors["/"]) ==
                identity(os.stat("/", follow_symlinks=False)), "fixture_original_root_generation_changed")
        for anchor in original_anchors:
            expected = anchor["identity"]
            observed = os.fstat(anchor["fd"])
            require(identity(observed) == expected,
                    "fixture_original_anchor_generation_changed:/" + anchor["name"])
            if visible:
                observed = os.stat(anchor["name"], dir_fd=root_fd, follow_symlinks=False)
                require(identity(observed) == expected,
                        "fixture_original_anchor_visible_generation_changed:/" + anchor["name"])

    def verify_anchors() -> None:
        verify_original_anchors(visible=False)
        for anchor in anchors:
            require(directory_binding(os.fstat(anchor["fd"])) == anchor["binding"] ==
                    directory_binding(os.stat(anchor["name"], dir_fd=root_fd, follow_symlinks=False)),
                    "fixture_anchor_generation_changed")
            require(set(os.listdir(anchor["fd"])) == anchor["children"],
                    "fixture_private_anchor_has_unknown_entries:/" + anchor["name"])

    def mount_table() -> dict[int, list[bytes]]:
        with open("/proc/self/mountinfo", "rb") as source:
            raw = source.read(2 * 1024 * 1024 + 1)
        require(len(raw) <= 2 * 1024 * 1024, "fixture_mount_table_too_large")
        lines = raw.splitlines()
        require(0 < len(lines) <= 4096, "fixture_mount_table_count_invalid")
        result = {}
        for line in lines:
            parts = line.split()
            require(len(parts) >= 10 and b"-" in parts[6:] and parts[0].isdigit(),
                    "fixture_mount_table_row_invalid")
            divider = parts.index(b"-", 6)
            require(divider + 3 < len(parts)
                    and all(not item.startswith((b"shared:", b"master:", b"propagate_from:"))
                            for item in parts[6:divider]), "fixture_mount_propagation_not_private")
            mount_id = int(parts[0])
            require(mount_id not in result, "fixture_mount_table_duplicate_id")
            result[mount_id] = parts
        return result

    def descriptor_mount_id(fd: int) -> int:
        with open("/proc/self/fdinfo/" + str(fd), "rb") as source:
            raw = source.read(4097)
        require(len(raw) <= 4096, "fixture_fdinfo_too_large")
        matches = re.findall(rb"^mnt_id:\s+([0-9]+)$", raw, re.MULTILINE)
        require(len(matches) == 1, "fixture_descriptor_mount_id_missing")
        return int(matches[0])

    def verify_private_mount(record: dict, fd: int) -> None:
        mount_id = descriptor_mount_id(fd)
        table = mount_table()
        require(mount_id in table, "fixture_private_mount_id_missing")
        parts = table[mount_id]
        divider = parts.index(b"-", 6)
        options = set(parts[5].split(b","))
        require(parts[4] == record["target"] and parts[divider + 1] == b"tmpfs"
                and {b"rw", b"nosuid", b"nodev"} <= options
                and (b"noexec" in options) == (record["name"] == "home"),
                "fixture_private_mount_type_or_flags_invalid")
        if record["mount_id"] is None:
            record["mount_id"] = mount_id
        else:
            require(record["mount_id"] == mount_id, "fixture_private_mount_generation_changed")

    def verify_namespace_binding() -> None:
        nonlocal private_proc_verified
        current = namespace_ids()
        require(current["mnt"] != parent_namespaces["mnt"]
                and current["pid"] != parent_namespaces["pid"]
                and current["user"] == parent_namespaces["user"]
                and current["uts"] == parent_namespaces["uts"],
                "fixture_private_namespace_binding_invalid")
        require(os.getpid() == 1 and os.getppid() == 0 and os.readlink("/proc/self") == "1",
                "fixture_private_pid_proc_binding_invalid")
        init_pid = os.stat("/proc/1/ns/pid")
        children_pid = os.stat("/proc/self/ns/pid_for_children")
        require(current["pid"] == [init_pid.st_dev, init_pid.st_ino]
                == [children_pid.st_dev, children_pid.st_ino],
                "fixture_private_proc_namespace_mismatch")
        proc_fd = os.open("/proc", os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try:
            table = mount_table()
            proc_id = descriptor_mount_id(proc_fd)
            require(proc_id in table, "fixture_private_proc_mount_missing")
            parts = table[proc_id]
            divider = parts.index(b"-", 6)
            require(parts[4] == b"/proc" and parts[divider + 1] == b"proc",
                    "fixture_private_proc_mount_invalid")
        finally:
            os.close(proc_fd)
        private_proc_verified = True

    def mount_private_anchor(record: dict) -> dict:
        require(libc is not None and not record["mounted"],
                "fixture_private_mount_not_admitted")
        # Record successful mount state before a handled signal can interrupt.
        previous = signal.pthread_sigmask(signal.SIG_BLOCK,
                                          {signal.SIGTERM, signal.SIGINT, signal.SIGALRM})
        try:
            result = libc.mount(b"tmpfs", record["target"], b"tmpfs",
                                record["flags"], ctypes.c_char_p(record["data"]))
            if result == 0:
                record["mounted"] = True
            else:
                raise RuntimeError("fixture_private_mount_failed:" + record["name"]
                                   + ":errno=" + str(ctypes.get_errno()))
        finally:
            signal.pthread_sigmask(signal.SIG_SETMASK, previous)
        anchor = open_anchor(record["name"])
        record["binding"] = anchor["binding"]
        require(not os.listdir(anchor["fd"]), "fixture_private_anchor_not_empty")
        verify_private_mount(record, anchor["fd"])
        return anchor

    def unmount_private_anchor(record: dict) -> None:
        require(libc is not None and record["mounted"]
                and record["binding"] is not None and record["mount_id"] is not None,
                "fixture_private_unmount_not_bound")
        fd = os.open(record["target"], os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
        try:
            require(directory_binding(os.fstat(fd)) == record["binding"]
                    and not os.listdir(fd), "fixture_private_unmount_generation_changed")
            verify_private_mount(record, fd)
        finally:
            os.close(fd)
        # No descriptor or cwd inside either fresh mount survives to umount.
        previous = signal.pthread_sigmask(signal.SIG_BLOCK,
                                          {signal.SIGTERM, signal.SIGINT, signal.SIGALRM})
        try:
            result = libc.umount2(record["target"], 0)
            if result == 0:
                record["mounted"] = False
            else:
                raise RuntimeError("fixture_private_unmount_failed:" + record["name"]
                                   + ":errno=" + str(ctypes.get_errno()))
        finally:
            signal.pthread_sigmask(signal.SIG_SETMASK, previous)
        original = next(anchor for anchor in original_anchors if anchor["name"] == record["name"])
        require(identity(os.stat(record["name"], dir_fd=root_fd, follow_symlinks=False))
                == identity(os.fstat(original["fd"])) == original["identity"],
                "fixture_original_anchor_not_restored:/" + record["name"])

    def absent(parent: dict, name: str) -> None:
        try:
            os.stat(name, dir_fd=parent["fd"], follow_symlinks=False)
        except FileNotFoundError:
            return
        raise RuntimeError("fixture_fixed_path_already_present:" + name)

    def directory(parent: dict, name: str, uid: int = 0) -> dict:
        os.mkdir(name, 0o700, dir_fd=parent["fd"])
        fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                     dir_fd=parent["fd"])
        node = {"kind": "directory", "parent": parent, "name": name, "fd": fd, "children": set()}
        nodes.append(node)
        parent["children"].add(name)
        os.fchown(fd, uid, uid)
        os.fchmod(fd, 0o755)
        node["binding"] = directory_binding(os.fstat(fd))
        return node

    def file(parent: dict, name: str, raw: bytes, mode: int, uid: int = 0) -> dict:
        fd = os.open(name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
                     0o600, dir_fd=parent["fd"])
        node = {"kind": "file", "parent": parent, "name": name, "fd": fd}
        nodes.append(node)
        parent["children"].add(name)
        view = memoryview(raw)
        while view:
            written = os.write(fd, view)
            require(written > 0, "fixture_file_short_write")
            view = view[written:]
        os.fchown(fd, uid, uid)
        os.fchmod(fd, mode)
        os.fsync(fd)
        observed = os.fstat(fd)
        require(stat.S_ISREG(observed.st_mode) and observed.st_nlink == 1
                and read_fd(fd, len(raw)) == raw, "fixture_file_readback_failed")
        node.update({"binding": identity(observed), "sha256": digest(raw), "bytes": len(raw)})
        retained = os.open(name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW,
                           dir_fd=parent["fd"])
        try:
            require(identity(os.fstat(retained)) == identity(os.fstat(fd)) == node["binding"] ==
                    identity(os.stat(name, dir_fd=parent["fd"], follow_symlinks=False)),
                    "fixture_read_only_descriptor_rebound")
        except BaseException:
            os.close(retained)
            raise
        os.close(fd)
        node["fd"] = retained
        return node

    def verify_node(node: dict) -> None:
        visible = os.stat(node["name"], dir_fd=node["parent"]["fd"], follow_symlinks=False)
        opened = os.fstat(node["fd"])
        if node["kind"] == "file":
            require(identity(visible) == identity(opened) == node["binding"],
                    "fixture_owned_file_generation_changed")
            require(digest(read_fd(node["fd"], node["bytes"])) == node["sha256"],
                    "fixture_owned_file_bytes_changed")
        else:
            require(directory_binding(visible) == directory_binding(opened) == node["binding"],
                    "fixture_owned_directory_generation_changed")
            require(set(os.listdir(node["fd"])) == node["children"],
                    "fixture_owned_directory_has_unknown_entries")

    def snapshot() -> tuple:
        verify_anchors()
        result = []
        for node in nodes:
            verify_node(node)
            result.append((node["kind"], node["name"], identity(os.fstat(node["fd"])),
                           node.get("sha256"), tuple(sorted(node.get("children", ())))))
        return tuple(result)

    def reap_group(pid: int, process: subprocess.Popen | None = None) -> None:
        try:
            os.killpg(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        if process is not None:
            process.communicate(timeout=10)

    def interrupted(_signum: int, _frame: object) -> None:
        raise RuntimeError("fixture_driver_interrupted")

    def invoke(argv: list[str], *, success: bool = True) -> subprocess.CompletedProcess[str]:
        nonlocal current_process
        require(current_process is None, "fixture_previous_child_unreaped")
        reaped = False
        current_process = subprocess.Popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                           stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="strict",
                                           start_new_session=True, env={
                                               "PATH": "/usr/bin:/bin", "HOME": "/root",
                                               "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
                                           })
        try:
            require(current_process.pid > 1, "fixture_native_parent_pid_must_exceed_one")
            native_pids.append(current_process.pid)
            stdout, stderr = current_process.communicate(timeout=30)
            returncode = current_process.returncode
            reaped = True
        except BaseException:
            reap_group(current_process.pid, current_process)
            reaped = True
            raise
        finally:
            if reaped:
                current_process = None
        result = subprocess.CompletedProcess(argv, returncode, stdout, stderr)
        if success:
            require(result.returncode == 0 and not stderr, "fixture_real_launcher_failed:" + stderr[:600])
        return result

    real_child_marker = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V5"
    outer_marker = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V6"
    outer_green = outer_marker + "_GREEN"
    qualification = "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_INSTALLED_READ_ONLY_QUALIFICATION_V1"

    def terminal_lines(result: subprocess.CompletedProcess[str], *, native_success: bool) -> list[str]:
        lines = result.stdout.splitlines()
        require(real_child_marker in lines, "fixture_actual_inner_receipt_missing")
        last_inner = max(index for index, line in enumerate(lines) if line == real_child_marker)
        if native_success:
            require(result.returncode == 0 and not result.stderr and lines.count(outer_green) == 1,
                    "fixture_final_native_green_missing")
            native_index = lines.index(outer_green)
            require(native_index > last_inner, "fixture_native_receipt_precedes_inner_terminal")
            native_lines = lines[native_index:]
            for fact in ("source_generation_id=" + generation, "expected_head=" + head,
                         "native_prechild_source_generation_verified=true",
                         "private_parent_proof_and_inputs_retained_through_child_exit=true",
                         "installer_python_started=true", "installer_child_exit_zero=true",
                         "installer_apply_result=see_authenticated_inner_terminal_receipt"):
                require(fact in native_lines, "fixture_native_terminal_fact_missing:" + fact)
            child_lines = lines[last_inner + 1:native_index]
        else:
            require(result.returncode == 2 and outer_green not in lines,
                    "fixture_failed_child_reported_native_green")
            stderr = result.stderr.splitlines()
            for fact in (outer_marker + "_HOLD reason=bootstrap_installer_child_failed",
                         "installer_python_started=true",
                         "installer_apply_state=unknown_or_partial_if_child_created",
                         "temporary_git_metadata_cleanup_complete=true"):
                require(fact in stderr, "fixture_native_child_hold_fact_missing:" + fact)
            child_lines = lines[last_inner + 1:]
        require("temporary_git_metadata_cleanup_completed=true" in child_lines,
                "fixture_inner_private_git_cleanup_not_completed")
        require("temporary_git_metadata_cleanup_complete=true" in lines,
                "fixture_native_private_git_cleanup_not_complete")
        return child_lines

    def require_plan(result: subprocess.CompletedProcess[str], state: str) -> str:
        lines = terminal_lines(result, native_success=True)
        for fact in ("mode=plan", "expected_head=" + head, "source_generation_id=" + generation,
                     "protected_state=" + state, "launcher_candidate_verified=true",
                     "native_candidate_verified=true", "runtime_installer_git_object_verified=true",
                     "private_native_parent_proof_verified=true", "closed_source_generation_verified=true",
                     "git_boundary_policy=private_metadata_pinned_objects_raw_checkout_v4",
                     "protected_state_mutation=false", "launcher_execution_authorized=false",
                     "native_execution_authorized=false", "binder_execution_authorized=false",
                     "production_host_evidence_authority=false"):
            require(fact in lines, "fixture_real_plan_fact_missing:" + fact)
        plans = [line.removeprefix("plan_id=") for line in lines if line.startswith("plan_id=")]
        require(len(plans) == 1 and re.fullmatch(r"voidbuye2dormantfirstentryinstall5_[0-9a-f]{64}", plans[0])
                is not None, "fixture_real_plan_id_missing")
        if state == "DORMANT_FIRST_ENTRY_PROTECTED_ROOT_GREEN":
            require(qualification in lines, "fixture_canonical_installed_plan_qualification_receipt_missing")
        return plans[0]

    def record_call(label: str, result: subprocess.CompletedProcess[str]) -> None:
        print("production_call_" + label + "_inner_and_native_terminal_verified=true")
        print("production_call_" + label + "_stdout_sha256=" + digest(result.stdout.encode("utf-8")))
        print("production_call_" + label + "_stderr_sha256=" + digest(result.stderr.encode("utf-8")))

    print("production_child_fixture_only=true", flush=True)
    print("fixture_fixed_path_creation_authorized=true", flush=True)
    print("existing_installation_replacement_authorized=false", flush=True)
    print("accepted_launcher_native_or_binder_execution_authorized=false", flush=True)
    print("fixture_network_contact=false", flush=True)
    print("production_fixture_isolation_requested=true", flush=True)
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    signal.signal(signal.SIGALRM, interrupted)
    signal.alarm(180)
    try:
        # The complete flat bundle is in memory before /home can be hidden.
        # No host checkout cwd is carried into either of the private mounts.
        os.chdir("/")
        print("fixture_original_anchor " + anchor_diagnostic("/", os.fstat(root_fd)), flush=True)
        physical_root_directory(root_fd, "/")
        original_opt, original_home = open_original_anchor("opt"), open_original_anchor("home")
        verify_original_anchors(visible=True)
        # Check the original host view before the first mount or fixed-path
        # creation. A present path, including a dangling symlink, is refusal.
        for name in reserved_opt_names:
            absent(original_opt, name)
        absent(original_home, "zoso")
        verify_namespace_binding()
        libc = ctypes.CDLL(None, use_errno=True)
        libc.mount.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p,
                               ctypes.c_ulong, ctypes.c_void_p]
        libc.mount.restype = ctypes.c_int
        libc.umount2.argtypes = [ctypes.c_char_p, ctypes.c_int]
        libc.umount2.restype = ctypes.c_int
        for record in mounts:
            mount_private_anchor(record)
        opt, home = anchors
        for name in reserved_opt_names:
            absent(opt, name)
        absent(home, "zoso")
        verify_anchors()
        bootstrap_root = directory(opt, bootstrap_name)
        bootstrap_bin = directory(bootstrap_root, "bin")
        file(bootstrap_bin, "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6",
             loaded["bootstrap"], 0o555)
        file(bootstrap_root, "source-generation-v3.conf", source_manifest, 0o444)
        file(bootstrap_root, "policy-v1.conf", loaded["host_policy"], 0o444)
        user_home = directory(home, "zoso")
        user_dev = directory(user_home, "dev")
        checkout_root = directory(user_dev, "void-node", 1000)
        copied = {".": checkout_root}
        for relative in sorted(checkout, key=lambda value: (value.count("/"), value)):
            row = checkout[relative]
            path = pathlib.PurePosixPath(relative)
            parent = copied[str(path.parent)]
            if row["kind"] == "directory":
                copied[relative] = directory(parent, path.name, 1000)
            else:
                copied[relative] = file(parent, path.name, row["raw"], 0o644, 1000)
        candidate_inputs = directory(user_home, "first-entry-consumer-fixture-inputs")
        file(candidate_inputs, "accepted-launcher-v2", loaded["launcher"], 0o444)
        file(candidate_inputs, "accepted-native-v2", loaded["native"], 0o444)
        bootstrap = "/opt/" + bootstrap_name + "/bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6"
        request = ["--launcher", "/home/zoso/first-entry-consumer-fixture-inputs/accepted-launcher-v2",
                   "--native", "/home/zoso/first-entry-consumer-fixture-inputs/accepted-native-v2",
                   "--expected-head", head]
        baseline = snapshot()
        absent(opt, launcher_name)
        first_plan = invoke([bootstrap, "--installer-plan", *request])
        plan_a = require_plan(first_plan, "DORMANT_FIRST_ENTRY_ROOT_ABSENT_READY_FOR_CREATE_ONLY")
        require(snapshot() == baseline, "fixture_absent_plan_changed_bytes_or_metadata")
        absent(opt, launcher_name)
        for name in stage_names:
            absent(opt, name)
        record_call("absent_plan", first_plan)

        # Seed only the exact C2/native fixture payload as data. Those two ELFs
        # are never invoked. Accepted C6 must reject stale A or return ALREADY_GREEN.
        launcher_root = directory(opt, launcher_name)
        launcher_bin = directory(launcher_root, "bin")
        source_root = directory(launcher_root, "source")
        source_ops = directory(source_root, "ops")
        source_precision = directory(source_ops, "precision")
        inputs = directory(launcher_root, "input")
        file(launcher_bin, "void_buy_void_epoch2_dormant_binder_installer_first_entry_v1",
             loaded["launcher"], 0o555)
        file(launcher_root, "policy-v1.conf", loaded["payload_policy"], 0o444)
        file(source_precision, "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py",
             runtime_installer, 0o444)
        file(inputs, "void_buy_void_epoch2_dormant_binder_native_candidate_v2", loaded["native"], 0o444)
        baseline = snapshot()
        second_plan = invoke([bootstrap, "--installer-plan", *request])
        plan_b = require_plan(second_plan, "DORMANT_FIRST_ENTRY_PROTECTED_ROOT_GREEN")
        require(plan_b != plan_a, "fixture_protected_state_not_bound_into_plan_id")
        require(snapshot() == baseline, "fixture_installed_plan_changed_bytes_or_metadata")
        for name in stage_names:
            absent(opt, name)
        record_call("installed_plan", second_plan)

        stale = invoke([bootstrap, "--installer-apply", *request, "--expected-plan-id", plan_a,
                        "--confirm", "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V5_CREATE_ONLY"], success=False)
        stale_lines = terminal_lines(stale, native_success=False)
        for fact in ("status=HOLD", "reason=expected_plan_id_mismatch", "publication=false",
                     "launcher_execution=false", "native_execution=false", "binder_execution=false"):
            require(fact in stale_lines, "fixture_stale_plan_fact_missing:" + fact)
        require(snapshot() == baseline, "fixture_stale_apply_changed_bytes_or_metadata")
        for name in stage_names:
            absent(opt, name)
        record_call("stale_apply", stale)

        applied = invoke([bootstrap, "--installer-apply", *request, "--expected-plan-id", plan_b,
                          "--confirm", "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V5_CREATE_ONLY"])
        applied_lines = terminal_lines(applied, native_success=True)
        for fact in ("mode=apply", "status=ALREADY_GREEN", "protected_install_performed=false",
                     "launcher_execution=false", "native_execution=false", "binder_execution=false"):
            require(fact in applied_lines, "fixture_real_already_green_fact_missing:" + fact)
        # Frozen canonical inner V5 emits neither field in ALREADY_GREEN.
        # Keep this absence visible; unchanged state is independently observed.
        require(not any(line.startswith("publication=") for line in applied_lines),
                "fixture_canonical_already_green_publication_receipt_changed")
        require(not any(line.startswith("next_action=") for line in applied_lines),
                "fixture_canonical_already_green_next_action_changed")
        require(snapshot() == baseline, "fixture_already_green_apply_changed_bytes_or_metadata")
        for name in stage_names:
            absent(opt, name)
        require(len(native_pids) == 4 and all(pid > 1 for pid in native_pids),
                "fixture_actual_native_invocation_count_or_parent_pid_invalid")
        record_call("current_apply", applied)
    except BaseException as exc:
        failure = exc
    finally:
        signal.alarm(0)
        if current_process is not None:
            try:
                reap_group(current_process.pid, current_process)
                current_process = None
            except BaseException as exc:
                failure = failure or exc
        try:
            require(current_process is None, "fixture_cleanup_refused_while_child_unreaped")
            # Validate the whole owned forest before the first removal. Unknown
            # names, substitutions or changed bytes cause refusal, not rmtree.
            snapshot()
            for node in reversed(nodes):
                verify_node(node)
                if node["kind"] == "file":
                    os.unlink(node["name"], dir_fd=node["parent"]["fd"])
                else:
                    require(not os.listdir(node["fd"]), "fixture_cleanup_directory_not_empty")
                    os.rmdir(node["name"], dir_fd=node["parent"]["fd"])
                node["parent"]["children"].remove(node["name"])
                os.close(node["fd"])
                node["fd"] = -1
            verify_anchors()
            if len(anchors) == 2:
                for name in reserved_opt_names:
                    absent(anchors[0], name)
                absent(anchors[1], "zoso")
            owned_cleanup_completed = True
        except BaseException as exc:
            print("production_fixture_cleanup_refused=true", file=sys.stderr)
            failure = failure or exc
        finally:
            fresh_fds_closed = True
            for node in reversed(nodes):
                if node["fd"] >= 0:
                    try:
                        os.close(node["fd"])
                    except BaseException as exc:
                        fresh_fds_closed = False
                        failure = failure or exc
                    finally:
                        node["fd"] = -1
            for anchor in reversed(anchors):
                try:
                    os.close(anchor["fd"])
                except BaseException as exc:
                    fresh_fds_closed = False
                    failure = failure or exc
                finally:
                    anchor["fd"] = -1
            try:
                require(current_process is None and owned_cleanup_completed and fresh_fds_closed,
                        "fixture_private_unmount_refused_before_owned_cleanup")
                for record in reversed(mounts):
                    if record["mounted"]:
                        unmount_private_anchor(record)
                require(not any(record["mounted"] for record in mounts),
                        "fixture_private_mount_cleanup_incomplete")
                private_mount_cleanup_completed = True
                verify_original_anchors(visible=True)
                if len(original_anchors) == 2:
                    for name in reserved_opt_names:
                        absent(original_anchors[0], name)
                    absent(original_anchors[1], "zoso")
                verify_namespace_binding()
                cleanup_completed = True
            except BaseException as exc:
                print("production_fixture_anchor_or_mount_cleanup_refused=true", file=sys.stderr)
                failure = failure or exc
            finally:
                for anchor in reversed(original_anchors):
                    try:
                        os.close(anchor["fd"])
                    except BaseException as exc:
                        cleanup_completed = False
                        failure = failure or exc
                try:
                    os.close(root_fd)
                except BaseException as exc:
                    cleanup_completed = False
                    failure = failure or exc
    if failure is not None:
        print("REAL_PRODUCTION_NATIVE_V6_INNER_V5_HANDOFF_HOLD reason=" + type(failure).__name__ + ":" + str(failure)[:800],
              file=sys.stderr)
        print("production_fixture_cleanup_completed=" + str(cleanup_completed).lower(), file=sys.stderr)
        print("production_fixture_private_mount_cleanup_completed="
              + str(private_mount_cleanup_completed).lower(), file=sys.stderr)
        raise SystemExit(2)
    print("REAL_PRODUCTION_NATIVE_V6_INNER_V5_HANDOFF_GREEN")
    print("production_child_exact_blob=ce6930bc1be8239a3171d4922c44b96a50f5778b")
    print("production_native_source_exact_blob=a317d3dce324337f107909bd6e33e98622b3ef09")
    print("production_source_manifest_exact_blob=6e0630af72111bd9976dcc38cdcdada1904dd067")
    print("production_bootstrap_invocations=4")
    print("production_native_parent_pid_greater_than_one=true")
    print("production_child_parent_validator_unchanged=true")
    print("production_c_default_path_exercised=true")
    print("production_thirteen_descriptor_roles_authenticated=true")
    print("production_sealed_memfd_inner_source_exercised=true")
    print("production_child_ready_plan_exercised=true")
    print("production_installed_state_changes_plan_id=true")
    print("production_child_stale_plan_rejected=true")
    print("production_child_already_green_apply_exercised=true")
    print("production_canonical_installed_plan_qualification_receipt_verified=true")
    print("production_canonical_already_green_publication_receipt_present=false")
    print("production_canonical_already_green_next_action_present=false")
    print("production_no_publication_observed=true")
    print("production_inner_and_final_native_receipts_verified=true")
    print("production_accepted_bootstrap_binary_exercised=true")
    print("production_bootstrap_binary_bytes=874608")
    print("production_bootstrap_binary_sha256=c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b")
    print("production_bootstrap_binary_git_blob_sha1=a91707c3e5803071fc73c3451c9bcb3b774f8b48")
    print("accepted_launcher_native_or_binder_executed=false")
    print("fixture_bytes_and_mtime_ctime_preserved_during_operations=true")
    print("production_fixture_cleanup_completed=true")
    print("production_fixture_private_mount_pid_namespace_exercised=true")
    print("production_fixture_private_proc_verified=" + str(private_proc_verified).lower())
    print("production_fixture_private_mount_cleanup_completed=" + str(private_mount_cleanup_completed).lower())


def read_bound_input(path: Path, *, expected_bytes: int | None = None,
                     expected_sha256: str | None = None, maximum: int = MAX_SOURCE_BYTES) -> bytes:
    require(path.is_absolute() and os.path.normpath(str(path)) == str(path),
            "fixture_input_requires_normalized_absolute_path")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        before = os.fstat(fd)
        require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1
                and 0 < before.st_size <= maximum, "fixture_bound_input_metadata_invalid")
        require(expected_bytes is None or before.st_size == expected_bytes,
                "fixture_bound_input_size_mismatch")
        raw = bytearray()
        while len(raw) < before.st_size:
            chunk = os.read(fd, min(65536, before.st_size - len(raw)))
            require(bool(chunk), "fixture_bound_input_short_read")
            raw.extend(chunk)
        require(not os.read(fd, 1), "fixture_bound_input_grew")
        after, visible = os.fstat(fd), path.lstat()
        for field in ("st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
                      "st_size", "st_mtime_ns", "st_ctime_ns"):
            require(getattr(before, field) == getattr(after, field) == getattr(visible, field),
                    "fixture_bound_input_generation_changed")
    finally:
        os.close(fd)
    result = bytes(raw)
    require(expected_sha256 is None or sha256(result) == expected_sha256,
            "fixture_bound_input_sha256_mismatch")
    return result


def write_local(path: Path, raw: bytes, mode: int = 0o644) -> None:
    path.write_bytes(raw)
    path.chmod(mode)


def production_handoff_fixture(temporary: Path, bound: dict[str, bytes],
                               accepted_bootstrap: Path, accepted_launcher: Path, accepted_native: Path) -> None:
    """Run the reviewed default-path boundary only in the mandatory private fixture."""
    import pathlib
    require(os.uname().nodename != "zoso-Precision-Tower-7810", "precision_host_forbidden")
    require(set(bound) == {MANIFEST_REL, INSTALLER_REL, SOURCE_REL,
                          "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.json",
                          "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"},
            "fixture_five_source_membership_invalid")
    accepted_bootstrap_raw = read_bound_input(accepted_bootstrap, expected_bytes=ACCEPTED_BOOTSTRAP_BYTES,
                                              expected_sha256=ACCEPTED_BOOTSTRAP_SHA256)
    require(accepted_bootstrap_raw.startswith(b"\x7fELF")
            and git_blob(accepted_bootstrap_raw) == ACCEPTED_BOOTSTRAP_BLOB,
            "fixture_accepted_bootstrap_identity_changed")
    accepted_launcher_raw = read_bound_input(accepted_launcher, expected_bytes=ACCEPTED_LAUNCHER_BYTES,
                                             expected_sha256=ACCEPTED_LAUNCHER_SHA256)
    accepted_native_raw = read_bound_input(accepted_native, expected_bytes=ACCEPTED_NATIVE_BYTES,
                                           expected_sha256=ACCEPTED_NATIVE_SHA256)
    temp = temporary
    bundle = temp / "production-bundle"
    bundle.mkdir(mode=0o700)
    git_checkout = temp / "prebuilt-checkout"
    empty_template = temp / "empty-template"
    git_checkout.mkdir()
    empty_template.mkdir()
    git_env = {
        "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1", "GIT_TERMINAL_PROMPT": "0", "GIT_ALLOW_PROTOCOL": "",
        "GIT_NO_LAZY_FETCH": "1", "GIT_OPTIONAL_LOCKS": "0", "GIT_ATTR_NOSYSTEM": "1",
        "GIT_AUTHOR_NAME": "VOID exact child fixture", "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_NAME": "VOID exact child fixture", "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
        "GIT_AUTHOR_DATE": "2001-01-01T00:00:00Z", "GIT_COMMITTER_DATE": "2001-01-01T00:00:00Z",
    }

    def fixture_git(*args: str) -> bytes:
        completed = subprocess.run([
            "/usr/bin/git", "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false",
            "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false", "-c", "core.attributesFile=/dev/null",
            "-C", str(git_checkout), *args,
        ], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env=git_env, timeout=30, check=False)
        assert completed.returncode == 0 and not completed.stderr, completed.stderr.decode("utf-8", "replace")
        return completed.stdout

    fixture_git("init", "--quiet", "--initial-branch=main", "--template=" + str(empty_template))
    (git_checkout / ".git/config").write_bytes(FIXTURE_GIT_CONFIG)
    for relative, raw in bound.items():
        path = git_checkout / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        write_local(path, raw)
    fixture_git("add", "--", *sorted(bound))
    fixture_git("commit", "--quiet", "--no-gpg-sign", "-m", "Exact frozen production-child fixture inputs")
    real_head = fixture_git("rev-parse", "--verify", "HEAD").decode("ascii").strip()
    assert re.fullmatch(r"[0-9a-f]{40}", real_head)
    assert fixture_git("status", "--porcelain=v1", "--untracked-files=all") == b""
    require(fixture_git("ls-files", "-z").split(b"\0") ==
            [relative.encode("ascii") for relative in sorted(bound)] + [b""],
            "fixture_exact_five_tracked_inputs_missing")
    assert (git_checkout / ".git/config").read_bytes() == FIXTURE_GIT_CONFIG
    payloads = {}
    python_raw = read_bound_input(pathlib.Path("/usr/bin/python3").resolve(strict=True),
                                  maximum=512 * 1024 * 1024)
    git_raw = read_bound_input(pathlib.Path("/usr/bin/git").resolve(strict=True),
                               maximum=64 * 1024 * 1024)
    python_rows = ("python_sha256=" + sha256(python_raw)
                   + "\npython_bytes=" + str(len(python_raw)) + "\n")
    payload_policy = (
        "schema=VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1\n"
        + python_rows
    ).encode("ascii")
    host_policy = (
        "schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6\n"
        + python_rows + "git_sha256=" + sha256(git_raw)
        + "\ngit_bytes=" + str(len(git_raw)) + "\n"
    ).encode("ascii")
    for role, raw in (("bootstrap", accepted_bootstrap_raw),
                      ("launcher", accepted_launcher_raw), ("native", accepted_native_raw),
                      ("host_policy", host_policy), ("payload_policy", payload_policy)):
        basename = "input-" + role.replace("_", "-")
        write_local(bundle / basename, raw, 0o444)
        payloads[role] = {"file": basename, "bytes": len(raw), "sha256": sha256(raw)}
    rows = []
    for index, path in enumerate(sorted(git_checkout.rglob("*"))):
        relative = str(path.relative_to(git_checkout))
        observed = path.lstat()
        if stat.S_ISDIR(observed.st_mode):
            rows.append({"path": relative, "kind": "directory"})
        else:
            assert stat.S_ISREG(observed.st_mode) and observed.st_nlink == 1
            raw = read_bound_input(path)
            basename = "checkout-input-" + str(index)
            write_local(bundle / basename, raw, 0o444)
            rows.append({"path": relative, "kind": "file", "file": basename,
                         "bytes": len(raw), "sha256": sha256(raw)})
    require(len(rows) <= 128 and sum(row.get("bytes", 0) for row in rows) <= 1024 * 1024,
            "fixture_checkout_construction_budget_exceeded")
    parent_reserved_paths = (
        ("/opt", "void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6"),
        ("/opt", ".void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6.stage"),
        ("/opt", "void-buy-void-epoch2-dormant-binder-installer-first-entry-v1"),
        ("/opt", "void-buy-void-epoch2-dormant-v3r-binding-v2"),
        ("/opt", ".void-buy-void-epoch2-dormant-binder-installer-first-entry-v1.stage"),
        ("/opt", ".void-buy-void-epoch2-dormant-v3r-binding-v2.stage"),
        ("/opt", "void-buy-void-epoch2-dormant-binder-installer-first-entry-v2"),
        ("/home", "zoso"),
    )

    def parent_namespace_ids() -> dict[str, list[int]]:
        result = {}
        for name in ("mnt", "pid", "user", "uts"):
            observed = os.stat("/proc/self/ns/" + name)
            result[name] = [observed.st_dev, observed.st_ino]
        return result

    def parent_anchor_identity(observed: os.stat_result) -> list[int]:
        return [getattr(observed, field) for field in (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
            "st_size", "st_mtime_ns", "st_ctime_ns",
        )]

    def root_owned_tool(path: str) -> None:
        logical = pathlib.Path(path)
        resolved = logical.resolve(strict=True)
        for directory in set(logical.parents) | set(resolved.parents):
            observed = directory.lstat()
            assert (stat.S_ISDIR(observed.st_mode) and observed.st_uid == observed.st_gid == 0
                    and observed.st_mode & 0o022 == 0), "fixture_tool_parent_custody_invalid:" + str(directory)
        link = logical.lstat()
        assert (link.st_uid == link.st_gid == 0
                and (stat.S_ISREG(link.st_mode) or stat.S_ISLNK(link.st_mode))), "fixture_tool_path_invalid:" + path
        observed = resolved.lstat()
        assert (stat.S_ISREG(observed.st_mode) and observed.st_uid == observed.st_gid == 0
                and observed.st_mode & 0o022 == 0 and observed.st_mode & stat.S_IXUSR), \
            "fixture_tool_custody_invalid:" + path

    with contextlib.ExitStack() as parent_descriptors:
        parent_fds = {}
        parent_anchors = {}
        parent_namespaces = parent_namespace_ids()
        for path in ("/", "/opt", "/home"):
            fd = os.open(path if path == "/" else path[1:],
                         os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                         dir_fd=None if path == "/" else parent_fds["/"])
            parent_descriptors.callback(os.close, fd)
            parent_fds[path] = fd
            opened = os.fstat(fd)
            visible = os.stat(path if path == "/" else path[1:],
                              dir_fd=None if path == "/" else parent_fds["/"], follow_symlinks=False)
            diagnostic = ("path=" + path + " mode=" + format(stat.S_IMODE(opened.st_mode), "04o")
                          + " uid=" + str(opened.st_uid) + " gid=" + str(opened.st_gid))
            print("production_fixture_parent_anchor " + diagnostic, flush=True)
            assert stat.S_ISDIR(opened.st_mode) and parent_anchor_identity(opened) == parent_anchor_identity(visible), \
                "fixture_parent_anchor_not_physical_or_rebound:" + diagnostic
            if path == "/":
                assert (opened.st_uid == opened.st_gid == 0 and opened.st_mode & 0o022 == 0), \
                    "fixture_parent_anchor_custody_invalid:" + diagnostic
            parent_anchors[path] = parent_anchor_identity(opened)

        def parent_fixed_paths_absent() -> None:
            for path, name in parent_reserved_paths:
                try:
                    os.stat(name, dir_fd=parent_fds[path], follow_symlinks=False)
                except FileNotFoundError:
                    continue
                raise AssertionError("fixture_parent_fixed_path_present:" + path + "/" + name)

        def parent_recheck() -> None:
            assert parent_namespace_ids() == parent_namespaces, "fixture_parent_namespace_changed"
            for path, fd in parent_fds.items():
                opened = parent_anchor_identity(os.fstat(fd))
                visible = parent_anchor_identity(os.stat(
                    path if path == "/" else path[1:],
                    dir_fd=None if path == "/" else parent_fds["/"], follow_symlinks=False))
                # Private mounts preserve every field of the original anchors.
                assert opened == visible == parent_anchors[path], \
                    "fixture_parent_anchor_generation_changed:" + path
            parent_fixed_paths_absent()

        parent_recheck()
        manifest_raw = json.dumps({
            "schema": FIXTURE_SCHEMA, "head": real_head,
            "payloads": payloads, "checkout": rows, "isolate": True,
            "parent_namespaces": parent_namespaces, "parent_anchors": parent_anchors,
        }, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")
        write_local(bundle / "production-manifest", manifest_raw, 0o444)
        driver = bundle / "production-driver.py"
        write_local(driver, (inspect.getsource(production_fixture_driver)
                             + "\nproduction_fixture_driver()\n").encode("utf-8"), 0o444)
        print("production_child_fixture_fixed_path_creation_authorized=true", flush=True)
        print("production_child_fixture_requires_all_fixed_paths_absent=true", flush=True)
        print("production_child_fixture_accepted_payload_execution_authorized=false", flush=True)
        print("production_fixture_private_mount_pid_namespace_creation_authorized=true", flush=True)
        print("production_fixture_private_tmpfs_mount_creation_authorized=true", flush=True)
        production_argv = ["/usr/bin/python3", "-I", "-S", "-B", str(driver), sha256(manifest_raw)]
        root_owned_tool("/usr/bin/python3")
        root_owned_tool("/usr/bin/git")
        root_owned_tool("/usr/bin/timeout")
        root_owned_tool("/usr/bin/unshare")
        production_argv = [
            "/usr/bin/timeout", "--signal=KILL", "210s", "/usr/bin/unshare",
            "--mount", "--pid", "--fork", "--mount-proc", "--propagation", "private",
            "--kill-child=KILL", "--", *production_argv, "--isolate-production-fixture",
        ]
        if os.geteuid() != 0 or os.getegid() != 0:
            root_owned_tool("/usr/bin/sudo")
            production_argv = ["/usr/bin/sudo", "-n", *production_argv]
        parent_recheck()
        try:
            production = subprocess.run(
                production_argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, env=BASE_ENV, text=True, encoding="utf-8", errors="strict",
                timeout=240, check=False, cwd="/",
            )
        finally:
            # On success, refusal and timeout, every original metadata field,
            # including mtime/ctime, must be identical.
            parent_recheck()
        require(production.returncode == 0 and not production.stderr,
                "isolated_production_handoff_failed:" + production.stderr[:2000])
        for fact in (
            "REAL_PRODUCTION_NATIVE_V6_INNER_V5_HANDOFF_GREEN",
            "production_child_exact_blob=" + INSTALLER_BLOB,
            "production_native_source_exact_blob=" + SOURCE_BLOB,
            "production_source_manifest_exact_blob=" + MANIFEST_BLOB,
            "production_bootstrap_invocations=4",
            "production_native_parent_pid_greater_than_one=true",
            "production_child_parent_validator_unchanged=true",
            "production_c_default_path_exercised=true",
            "production_thirteen_descriptor_roles_authenticated=true",
            "production_sealed_memfd_inner_source_exercised=true",
            "production_child_ready_plan_exercised=true",
            "production_installed_state_changes_plan_id=true",
            "production_child_stale_plan_rejected=true",
            "production_child_already_green_apply_exercised=true",
            "production_canonical_installed_plan_qualification_receipt_verified=true",
            "production_canonical_already_green_publication_receipt_present=false",
            "production_canonical_already_green_next_action_present=false",
            "production_no_publication_observed=true",
            "production_inner_and_final_native_receipts_verified=true",
            "production_accepted_bootstrap_binary_exercised=true",
            "production_bootstrap_binary_bytes=" + str(ACCEPTED_BOOTSTRAP_BYTES),
            "production_bootstrap_binary_sha256=" + ACCEPTED_BOOTSTRAP_SHA256,
            "production_bootstrap_binary_git_blob_sha1=" + ACCEPTED_BOOTSTRAP_BLOB,
            "accepted_launcher_native_or_binder_executed=false",
            "fixture_bytes_and_mtime_ctime_preserved_during_operations=true",
            "production_fixture_cleanup_completed=true",
            "production_fixture_isolation_requested=true",
            "production_fixture_private_mount_pid_namespace_exercised=true",
            "production_fixture_private_proc_verified=true",
            "production_fixture_private_mount_cleanup_completed=true",
        ):
            require(fact in production.stdout.splitlines(), "production_handoff_fact_missing:" + fact)
        for label in ("absent_plan", "installed_plan", "stale_apply", "current_apply"):
            require("production_call_" + label + "_inner_and_native_terminal_verified=true"
                    in production.stdout.splitlines(), "production_handoff_call_missing:" + label)
        print(production.stdout, end="")
        print("production_fixture_parent_namespace_and_anchor_recheck_passed=true")
        print("production_fixture_original_anchor_metadata_preserved=true")
    for relative, raw in bound.items():
        require(read_source(relative) == raw, "production_fixture_source_changed:" + relative)
    require(read_bound_input(accepted_bootstrap, expected_bytes=ACCEPTED_BOOTSTRAP_BYTES,
                             expected_sha256=ACCEPTED_BOOTSTRAP_SHA256) == accepted_bootstrap_raw,
            "production_fixture_bootstrap_input_changed")
    require(read_bound_input(accepted_launcher, expected_bytes=ACCEPTED_LAUNCHER_BYTES,
                             expected_sha256=ACCEPTED_LAUNCHER_SHA256) == accepted_launcher_raw,
            "production_fixture_launcher_input_changed")
    require(read_bound_input(accepted_native, expected_bytes=ACCEPTED_NATIVE_BYTES,
                             expected_sha256=ACCEPTED_NATIVE_SHA256) == accepted_native_raw,
            "production_fixture_native_input_changed")

def proof(*, accepted_bootstrap: Path | None, accepted_launcher: Path | None,
          accepted_native: Path | None, components_only: bool) -> None:
    source = read_source(SOURCE_REL)
    manifest = read_source(MANIFEST_REL, MAX_MANIFEST_BYTES)
    require(git_blob(source) == SOURCE_BLOB, "successor_native_source_pin_mismatch")
    require(git_blob(manifest) == MANIFEST_BLOB, "successor_manifest_pin_mismatch")
    installer = read_source(INSTALLER_REL)
    require(git_blob(installer) == INSTALLER_BLOB, "canonical_inner_source_pin_mismatch")
    rows = dict(row.split("=", 1) for row in manifest.decode("ascii").splitlines())
    require(len(rows) == 35, "manifest_membership_invalid")
    bound = {MANIFEST_REL: manifest}
    for role in SOURCE_ROLES:
        relative = rows[role + "_rel"]
        raw = read_source(relative)
        require(git_blob(raw) == rows[role + "_blob_sha1"] and
                sha256(raw) == rows[role + "_sha256"] and
                str(len(raw)) == rows[role + "_bytes"], "manifest_source_identity_drift:" + role)
        bound[relative] = raw
    require(bound[SOURCE_REL] == source, "bootstrap_not_bound_source")
    for relative, (size, blob) in FROZEN.items():
        raw = read_source(relative)
        require(len(raw) == size and git_blob(raw) == blob, "frozen_source_changed:" + relative)
    accepted_bootstrap_lock(source, manifest, installer)
    require(b"VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD" not in source,
            "runtime_head_compile_bound")
    compiler, readelf = discover(("cc", "gcc", "clang", "musl-gcc")), discover(("readelf",))
    digest = sha256(manifest)
    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v6-source-proof-", dir="/tmp") as td:
        temporary = Path(td)
        native_source = temporary / "bootstrap.c"
        native_source.write_bytes(source)
        binary = temporary / "bootstrap"
        args = compile_args(compiler, native_source, binary, digest, len(manifest))
        for name, diagnostic in (("MANIFEST_SHA256", b"manifest sha required"),
                                 ("MANIFEST_BYTES", b"manifest bytes required")):
            prefix = "-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_" + name + "="
            rejected = run([arg for arg in args if not arg.startswith(prefix)], check=False)
            require(rejected.returncode != 0 and diagnostic in rejected.stderr,
                    "required_compile_parameter_accepted_when_absent:" + name)
        built = run(args)
        require(not built.stdout and not built.stderr, "static_build_diagnostics")
        headers = run([readelf, "-lW", str(binary)]).stdout
        dynamic = run([readelf, "-dW", str(binary)]).stdout
        require(re.search(rb"\bINTERP\b", headers) is None and b"NEEDED" not in dynamic,
                "bootstrap_not_static")
        self_test = run([str(binary), "--self-test"])
        require(not self_test.stderr and MARKER.encode("ascii") + b"_SELF_TEST_GREEN" in self_test.stdout,
                "native_self_test_missing")
        require(digest.encode("ascii") in self_test.stdout and str(len(manifest)).encode("ascii") in self_test.stdout,
                "native_self_test_missing_exact_manifest_identity")
        for label, invalid_digest, invalid_size in (("malformed_digest", "g" * 64, len(manifest)),
                                                   ("zero_bytes", digest, 0),
                                                   ("oversize", digest, MAX_MANIFEST_BYTES + 1)):
            invalid = temporary / label
            run(compile_args(compiler, native_source, invalid, invalid_digest, invalid_size))
            rejected = run([str(invalid), "--self-test"], check=False)
            require(rejected.returncode != 0 and not rejected.stdout,
                    "invalid_compile_contract_not_rejected:" + label)
        helper_source = temporary / "source-helper.c"
        helper_source.write_text(harness_source(native_source), encoding="ascii")
        harness = temporary / "source-helper"
        run(compile_args(compiler, helper_source, harness, digest, len(manifest)))
        for inherited in ("default", "stricter"):
            resource_result = run([str(harness), "git-resource-limits", inherited])
            require(not resource_result.stderr and
                    b"native_git_child_resource_limits_green=true\nparent_limits_unchanged=true\n" in resource_result.stdout,
                    "native_child_resource_clamp_not_exercised:" + inherited)
        hash_count = hash_fixtures(harness, temporary)
        parser_count = parse_fixtures(harness, temporary, manifest)
        entry_count = entry_contract_fixtures(harness, temporary, manifest)
        snapshot_count = snapshot_fixtures(harness, temporary, manifest)
        checkout_count, first, second = checkout_fixtures(harness, temporary, manifest, bound)
        private_count = private_git_fixtures(harness, temporary, manifest, bound)
        if not components_only:
            require(accepted_bootstrap is not None and accepted_launcher is not None and accepted_native is not None,
                    "accepted_fixture_artifact_paths_required")
            production_handoff_fixture(temporary, bound, accepted_bootstrap, accepted_launcher, accepted_native)
    for relative, raw in bound.items():
        require(read_source(relative) == raw, "bound_source_changed_during_proof:" + relative)
    print(MARKER + "_COMPONENT_PROOF_GREEN")
    print("bootstrap_source_sha256=" + sha256(source))
    print("accepted_bootstrap_lock_identity_bound=true")
    print("accepted_bootstrap_lock_id=" + ACCEPTED_BOOTSTRAP_LOCK_ID)
    print("private_git_rejection_cases=" + str(private_count))
    print("source_mtime_ctime_inode_and_bytes_preservation_checked=true")
    print("native_private_git_loose_packed_and_inert_config_exercised=true")
    print("native_split_index_without_sharedindex_touch_exercised=true")
    print("native_raw_tree_authentication_and_final_worktree_fence_exercised=true")
    print("native_earlier_file_drift_injected_after_real_pread=true")
    print("native_actual_child_resource_clamps_and_parent_limits_preserved=true")
    print("source_generation_id=" + GENERATION_PREFIX + digest)
    print("manifest_bytes=" + str(len(manifest)))
    print("native_hash_reference_length_fixtures=" + str(hash_count))
    print("native_parser_rejection_fixtures=" + str(parser_count))
    print("native_argv_environment_signal_rejection_fixtures=" + str(entry_count))
    print("native_tool_and_payload_rejection_fixtures=" + str(snapshot_count))
    print("native_checkout_rejection_fixtures=" + str(checkout_count))
    print("admissible_runtime_head_one=" + first)
    print("admissible_runtime_head_two=" + second)
    for value in ("predecessor_sources_frozen", "production_static_build", "no_pt_interp_or_dynamic_needed",
                  "required_manifest_compile_binding", "native_self_test", "invalid_compile_contracts_rejected",
                  "actual_native_helpers_exercised", "sealed_git_executable_used",
                  "native_private_proof_schema_consumed_by_inner_parser",
                  "unrelated_commit_preserves_generation", "all_four_bound_source_changes_rejected",
                  "manifest_git_object_change_rejected", "all_component_native_holds_prechild",
                  "temporary_build_outputs_removed"):
        print(value + "=true")
    for value in ("component_production_main_called", "component_installer_child_created",
                  "component_privileged_fixture_executed", "protected_install_executed",
                  "new_candidate_artifact_accepted", "credential_access", "funds_movement"):
        print(value + "=false")
    for value in ("bootstrap_plan_executed", "bootstrap_apply_executed", "installer_child_created",
                  "privileged_fixture_executed", "production_parent_handoff_proven"):
        print(value + "=" + str(not components_only).lower())
    print("complete_source_proof_performed=" + str(not components_only).lower())
    if not components_only:
        print(MARKER + "_SOURCE_PROOF_GREEN")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--components-only", action="store_true",
                        help="Run preserved C5 component coverage without the production handoff fixture")
    parser.add_argument("--accepted-bootstrap", type=Path,
                        help="Exact accepted C6 release ELF; never substituted with the component fixture build")
    parser.add_argument("--accepted-launcher", type=Path)
    parser.add_argument("--accepted-native", type=Path)
    parser.add_argument("--isolate-production-fixture", action="store_true",
                        help="Explicitly authorize the mandatory private mount/PID/proc fixture")
    args = parser.parse_args()
    if args.components_only:
        if args.accepted_bootstrap or args.accepted_launcher or args.accepted_native or args.isolate_production_fixture:
            parser.error("components-only does not admit production fixture arguments")
    elif not (args.accepted_bootstrap and args.accepted_launcher and args.accepted_native and args.isolate_production_fixture):
        parser.error("full proof requires all three exact accepted artifact paths and --isolate-production-fixture")
    if not args.components_only:
        require(os.uname().nodename != "zoso-Precision-Tower-7810", "precision_host_forbidden")
    proof(accepted_bootstrap=args.accepted_bootstrap, accepted_launcher=args.accepted_launcher,
          accepted_native=args.accepted_native,
          components_only=args.components_only)


if __name__ == "__main__":
    try:
        main()
    except (ProofError, OSError, ValueError, subprocess.SubprocessError) as exc:
        print(MARKER + "_SOURCE_PROOF_HOLD reason=" + str(exc), file=sys.stderr)
        raise SystemExit(2) from exc
