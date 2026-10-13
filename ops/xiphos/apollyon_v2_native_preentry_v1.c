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

#define MARKER "VOID_APOLLYON_V2_NATIVE_PREENTRY_V1"
#define FIXED_SELF "/opt/void-apollyon-custody-v2-preentry-v1/apollyon_v2_native_preentry_v1"
#define FIXED_PYTHON "/usr/bin/python3"
#define FIXED_LAUNCHER "/opt/void-apollyon-custody-v2-preentry-v1/apollyon_v2_installed_live_launcher_v1.py"

static void hold(const char *reason) {
    fprintf(stderr, "HOLD=%s\n", reason);
    fprintf(stderr, "native_preentry=true\n");
    fprintf(stderr, "root_required=true\n");
    fprintf(stderr, "python_descriptor_execution=false\n");
    fprintf(stderr, "attempt_claim=false\n");
    fprintf(stderr, "training_execution=false\n");
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

static void require_safe_regular(
    const char *pathname,
    bool executable,
    const char *reason
) {
    struct stat st;
    require_safe_ancestors(pathname, reason);
    if (lstat(pathname, &st) != 0 ||
        !S_ISREG(st.st_mode) ||
        S_ISLNK(st.st_mode) ||
        st.st_uid != 0 ||
        st.st_nlink != 1 ||
        (st.st_mode & 0022) != 0 ||
        (executable && (st.st_mode & 0111) == 0)) {
        hold(reason);
    }
}

static void require_self_identity(void) {
    char observed[PATH_MAX];
    ssize_t count = readlink("/proc/self/exe", observed, sizeof(observed) - 1);
    if (count <= 0 || (size_t)count >= sizeof(observed)) {
        hold("apollyon_v2_native_preentry_self_identity_unreadable");
    }
    observed[count] = '\0';
    if (strcmp(observed, FIXED_SELF) != 0) {
        hold("apollyon_v2_native_preentry_fixed_path_required");
    }
    require_safe_regular(
        FIXED_SELF,
        true,
        "apollyon_v2_native_preentry_self_custody_invalid"
    );
}

static int open_trusted_python(void) {
    char canonical[PATH_MAX];
    struct stat requested;
    if (lstat(FIXED_PYTHON, &requested) != 0) {
        hold("apollyon_v2_native_preentry_python_unreadable");
    }
    require_safe_ancestors(
        FIXED_PYTHON,
        "apollyon_v2_native_preentry_python_ancestor_untrusted"
    );
    if (!(S_ISLNK(requested.st_mode) || S_ISREG(requested.st_mode)) ||
        requested.st_uid != 0 ||
        requested.st_nlink != 1) {
        hold("apollyon_v2_native_preentry_python_path_untrusted");
    }
    if (realpath(FIXED_PYTHON, canonical) == NULL ||
        canonical[0] != '/') {
        hold("apollyon_v2_native_preentry_python_realpath_invalid");
    }
    require_safe_regular(
        canonical,
        true,
        "apollyon_v2_native_preentry_python_target_untrusted"
    );

    int fd = open(canonical, O_RDONLY | O_NOFOLLOW);
    if (fd < 0) {
        hold("apollyon_v2_native_preentry_python_open_failed");
    }
    struct stat opened;
    struct stat visible;
    if (fstat(fd, &opened) != 0 ||
        lstat(canonical, &visible) != 0 ||
        !same_identity(&opened, &visible) ||
        !S_ISREG(opened.st_mode) ||
        opened.st_uid != 0 ||
        opened.st_nlink != 1 ||
        (opened.st_mode & 0022) != 0 ||
        (opened.st_mode & 0111) == 0) {
        close(fd);
        hold("apollyon_v2_native_preentry_python_identity_drift");
    }
    return fd;
}

static int self_test(void) {
    if (FIXED_SELF[0] != '/' ||
        FIXED_PYTHON[0] != '/' ||
        FIXED_LAUNCHER[0] != '/') {
        return 1;
    }
    puts(MARKER "_SELF_TEST=GREEN");
    puts("native_preentry_source_only=true");
    puts("python_path_fixed=true");
    puts("python_descriptor_execution=true");
    puts("launcher_path_fixed=true");
    puts("setuid_binary=false");
    puts("attempt_claim=false");
    puts("training_execution=false");
    return 0;
}

int main(int argc, char **argv) {
    if (argc == 2 && strcmp(argv[1], "--self-test") == 0) {
        return self_test();
    }
    if (geteuid() != 0) {
        hold("apollyon_v2_native_preentry_root_required");
    }
    require_self_identity();
    require_safe_regular(
        FIXED_LAUNCHER,
        false,
        "apollyon_v2_native_preentry_launcher_custody_invalid"
    );

    int python_fd = open_trusted_python();

    size_t forwarded = (size_t)(argc > 1 ? argc - 1 : 0);
    if (forwarded > 128) {
        close(python_fd);
        hold("apollyon_v2_native_preentry_argument_count_invalid");
    }
    size_t total = forwarded + 5;
    char **next_argv = calloc(total, sizeof(char *));
    if (next_argv == NULL) {
        close(python_fd);
        hold("apollyon_v2_native_preentry_allocation_failed");
    }
    next_argv[0] = (char *)FIXED_PYTHON;
    next_argv[1] = (char *)"-I";
    next_argv[2] = (char *)"-B";
    next_argv[3] = (char *)FIXED_LAUNCHER;
    for (size_t i = 0; i < forwarded; i++) {
        next_argv[4 + i] = argv[1 + i];
    }
    next_argv[4 + forwarded] = NULL;

    char *const envp[] = {
        (char *)"PATH=/usr/sbin:/usr/bin:/sbin:/bin",
        (char *)"LC_ALL=C",
        (char *)"VOID_APOLLYON_V2_NATIVE_PREENTRY=VOID_APOLLYON_V2_NATIVE_PREENTRY_V1",
        NULL,
    };

    fexecve(python_fd, next_argv, envp);
    int saved = errno;
    free(next_argv);
    close(python_fd);
    errno = saved;
    hold("apollyon_v2_native_preentry_python_fexecve_failed");
}
