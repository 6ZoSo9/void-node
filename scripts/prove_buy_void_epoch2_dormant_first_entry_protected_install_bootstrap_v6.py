#!/usr/bin/env python3
"""Build V6 and exercise its real prechild helpers on disposable repositories.

The production executable is invoked only for its inert self-test. The separate
include-C harness calls parsers, sealed snapshots and checkout verification; it
never calls production main, forks the installer or touches a protected path.
"""
from __future__ import annotations

import hashlib
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
INSTALLER_BLOB = "ebe64793d0b4b2f290c951ea8c8fb6d4e6777db7"
MANIFEST_BLOB = "2d23552495fc757cca7957b6ad1ee7672faa68eb"
MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_MANIFEST_BYTES = 16384
FROZEN = {
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py":
        (127102, "88577de29dddbe61d2c2f59179d0dcb62a49165a"),
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c":
        (106764, "81fc960f1cec597b01875ed944b25e5b6574d34d"),
    "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf":
        (2382, "782f747cda24a214c64e8ec3f49b6791bbb62f97"),
    "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.json":
        (4548, "227c2fa449abf1387925373c706ecd07775d5898"),
    "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py":
        (57255, "f3d6b1559be7490303cf36338c4bfa38fdaa390a"),
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
    policy = ("schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V5\n"
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
    spec = importlib.util.spec_from_file_location("void_v3_proof_schema_consumer", ROOT / INSTALLER_REL)
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
    rows = {"schema": "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V5"}
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


def proof() -> None:
    source = read_source(SOURCE_REL)
    manifest = read_source(MANIFEST_REL, MAX_MANIFEST_BYTES)
    require(git_blob(source) == SOURCE_BLOB, "successor_native_source_pin_mismatch")
    require(git_blob(manifest) == MANIFEST_BLOB, "successor_manifest_pin_mismatch")
    require(git_blob(read_source(INSTALLER_REL)) == INSTALLER_BLOB, "successor_inner_source_pin_mismatch")
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
    require(b"VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD" not in source,
            "runtime_head_compile_bound")
    compiler, readelf = discover(("cc", "gcc", "clang", "musl-gcc")), discover(("readelf",))
    digest = sha256(manifest)
    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v4-source-proof-") as td:
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
    for relative, raw in bound.items():
        require(read_source(relative) == raw, "bound_source_changed_during_proof:" + relative)
    print(MARKER + "_SOURCE_PROOF_GREEN")
    print("bootstrap_source_sha256=" + sha256(source))
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
                  "manifest_git_object_change_rejected", "all_native_holds_prechild",
                  "temporary_build_outputs_removed"):
        print(value + "=true")
    for value in ("bootstrap_plan_executed", "bootstrap_apply_executed", "installer_child_created",
                  "privileged_fixture_executed", "protected_install_executed", "candidate_artifact_accepted",
                  "production_parent_handoff_proven", "credential_access", "funds_movement"):
        print(value + "=false")


if __name__ == "__main__":
    try:
        proof()
    except (ProofError, OSError, ValueError, subprocess.SubprocessError) as exc:
        print(MARKER + "_SOURCE_PROOF_HOLD reason=" + str(exc), file=sys.stderr)
        raise SystemExit(2) from exc
