#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1"
#define FIXED_SELF "/opt/void-buy-void-v7-preentry-v1/void_buy_void_source_finality_v7_native_preentry_v1"
#define FIXED_BASH "/usr/bin/bash"
#define FIXED_LAUNCHER "/opt/void-buy-void-v7-reviewed-v1/ops/precision/void_buy_void_source_finality_v7_privileged_launcher_v1.sh"
#define PREENTRY_ENV "VOID_BUY_VOID_V7_NATIVE_PREENTRY=VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1"

static void hold(const char *reason) {
    fprintf(stderr, "%s_HOLD reason=%s\n", MARKER, reason);
    fprintf(stderr, "native_preentry=true\n");
    fprintf(stderr, "root_required=true\n");
    fprintf(stderr, "privileged_receipt_execution_authorized=false\n");
    fprintf(stderr, "public_presale_activation=false\n");
    fprintf(stderr, "funds_movement=false\n");
    exit(2);
}

static bool same_identity(const struct stat *a, const struct stat *b) {
    return a->st_dev == b->st_dev &&
           a->st_ino == b->st_ino &&
           a->st_uid == b->st_uid &&
           a->st_gid == b->st_gid &&
           a->st_mode == b->st_mode &&
           a->st_nlink == b->st_nlink &&
           a->st_size == b->st_size;
}

static void require_safe_directory(const char *pathname, const char *reason) {
    struct stat st;
    if (lstat(pathname, &st) != 0 ||
        !S_ISDIR(st.st_mode) ||
        S_ISLNK(st.st_mode) ||
        st.st_uid != 0 ||
        (st.st_mode & 0022) != 0) {
        hold(reason);
    }
}

static void require_safe_ancestors(const char *pathname, const char *reason) {
    char buffer[PATH_MAX];
    size_t length = strlen(pathname);
    if (length == 0 || length >= sizeof(buffer) || pathname[0] != '/') {
        hold(reason);
    }
    memcpy(buffer, pathname, length + 1);
    require_safe_directory("/", reason);
    for (size_t i = 1; i < length; i++) {
        if (buffer[i] != '/') {
            continue;
        }
        char saved = buffer[i];
        buffer[i] = '\0';
        require_safe_directory(buffer, reason);
        buffer[i] = saved;
    }
}

static bool safe_regular_metadata(const struct stat *st, bool executable) {
    return S_ISREG(st->st_mode) &&
           st->st_uid == 0 &&
           st->st_nlink == 1 &&
           (st->st_mode & 0022) == 0 &&
           (st->st_mode & (S_ISUID | S_ISGID)) == 0 &&
           (!executable || (st->st_mode & 0111) != 0);
}

static bool safe_launcher_metadata(const struct stat *st) {
    return safe_regular_metadata(st, false) && (st->st_mode & 0111) == 0;
}

static void require_self_identity(void) {
    char observed[PATH_MAX];
    ssize_t count = readlink("/proc/self/exe", observed, sizeof(observed) - 1);
    if (count <= 0 || (size_t)count >= sizeof(observed)) {
        hold("native_preentry_self_identity_unreadable");
    }
    observed[count] = '\0';
    if (strcmp(observed, FIXED_SELF) != 0) {
        hold("native_preentry_fixed_path_required");
    }
    require_safe_ancestors(FIXED_SELF, "native_preentry_self_ancestor_untrusted");
    struct stat st;
    if (lstat(FIXED_SELF, &st) != 0 ||
        S_ISLNK(st.st_mode) ||
        !safe_regular_metadata(&st, true)) {
        hold("native_preentry_self_custody_invalid");
    }
}

static int open_trusted_regular(
    const char *pathname,
    bool executable,
    bool launcher,
    const char *reason
) {
    require_safe_ancestors(pathname, reason);
    struct stat before;
    if (lstat(pathname, &before) != 0 || S_ISLNK(before.st_mode)) {
        hold(reason);
    }
    if (launcher) {
        if (!safe_launcher_metadata(&before)) {
            hold(reason);
        }
    } else if (!safe_regular_metadata(&before, executable)) {
        hold(reason);
    }

    int fd = open(pathname, O_RDONLY | O_NOFOLLOW);
    if (fd < 0) {
        hold(reason);
    }
    struct stat opened;
    struct stat visible;
    if (fstat(fd, &opened) != 0 ||
        lstat(pathname, &visible) != 0 ||
        !same_identity(&before, &opened) ||
        !same_identity(&opened, &visible)) {
        close(fd);
        hold(reason);
    }
    if (launcher) {
        if (!safe_launcher_metadata(&opened)) {
            close(fd);
            hold(reason);
        }
    } else if (!safe_regular_metadata(&opened, executable)) {
        close(fd);
        hold(reason);
    }
    return fd;
}

static int self_test(void) {
    if (FIXED_SELF[0] != '/' || FIXED_BASH[0] != '/' || FIXED_LAUNCHER[0] != '/') {
        return 1;
    }
    struct stat synthetic;
    memset(&synthetic, 0, sizeof(synthetic));
    synthetic.st_mode = S_IFREG | 0755;
    synthetic.st_uid = 0;
    synthetic.st_nlink = 1;
    if (!safe_regular_metadata(&synthetic, true)) {
        return 1;
    }
    synthetic.st_mode |= S_ISUID;
    if (safe_regular_metadata(&synthetic, true)) {
        return 1;
    }
    synthetic.st_mode = S_IFREG | 0644;
    synthetic.st_uid = 0;
    synthetic.st_nlink = 1;
    if (!safe_launcher_metadata(&synthetic)) {
        return 1;
    }
    synthetic.st_mode |= 0111;
    if (safe_launcher_metadata(&synthetic)) {
        return 1;
    }
    puts(MARKER "_SELF_TEST=GREEN");
    puts("native_preentry_source_only=true");
    puts("bash_path_fixed=true");
    puts("bash_descriptor_execution=true");
    puts("launcher_path_fixed=true");
    puts("launcher_descriptor_retained=true");
    puts("launcher_direct_exec_mode=false");
    puts("setuid_setgid_rejected=true");
    puts("privileged_receipt_execution_authorized=false");
    puts("public_presale_activation=false");
    puts("funds_movement=false");
    return 0;
}

int main(int argc, char **argv) {
    if (argc == 2 && strcmp(argv[1], "--self-test") == 0) {
        return self_test();
    }
    if (geteuid() != 0) {
        hold("native_preentry_root_required");
    }
    require_self_identity();

    int launcher_fd = open_trusted_regular(
        FIXED_LAUNCHER,
        false,
        true,
        "native_preentry_launcher_custody_invalid"
    );
    int bash_fd = open_trusted_regular(
        FIXED_BASH,
        true,
        false,
        "native_preentry_bash_custody_invalid"
    );

    int descriptor_flags = fcntl(launcher_fd, F_GETFD);
    if (descriptor_flags < 0 ||
        fcntl(launcher_fd, F_SETFD, descriptor_flags & ~FD_CLOEXEC) != 0) {
        close(bash_fd);
        close(launcher_fd);
        hold("native_preentry_launcher_descriptor_inheritance_failed");
    }

    char launcher_fd_path[64];
    int printed = snprintf(
        launcher_fd_path,
        sizeof(launcher_fd_path),
        "/proc/self/fd/%d",
        launcher_fd
    );
    if (printed <= 0 || (size_t)printed >= sizeof(launcher_fd_path)) {
        close(bash_fd);
        close(launcher_fd);
        hold("native_preentry_launcher_descriptor_path_invalid");
    }

    size_t forwarded = (size_t)(argc > 1 ? argc - 1 : 0);
    if (forwarded > 128) {
        close(bash_fd);
        close(launcher_fd);
        hold("native_preentry_argument_count_invalid");
    }
    size_t total = forwarded + 5;
    char **next_argv = calloc(total, sizeof(char *));
    if (next_argv == NULL) {
        close(bash_fd);
        close(launcher_fd);
        hold("native_preentry_allocation_failed");
    }
    next_argv[0] = (char *)FIXED_BASH;
    next_argv[1] = (char *)"--noprofile";
    next_argv[2] = (char *)"--norc";
    next_argv[3] = launcher_fd_path;
    for (size_t i = 0; i < forwarded; i++) {
        next_argv[4 + i] = argv[1 + i];
    }
    next_argv[4 + forwarded] = NULL;

    char *const envp[] = {
        (char *)"PATH=/usr/sbin:/usr/bin:/sbin:/bin",
        (char *)"HOME=/root",
        (char *)"LANG=C",
        (char *)"LC_ALL=C",
        (char *)"TZ=UTC",
        (char *)PREENTRY_ENV,
        NULL,
    };

    fexecve(bash_fd, next_argv, envp);
    int saved = errno;
    free(next_argv);
    close(bash_fd);
    close(launcher_fd);
    errno = saved;
    hold("native_preentry_bash_fexecve_failed");
}
