#define _GNU_SOURCE
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <linux/close_range.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define MARKER "VOID_APOLLYON_TRAINING_BUS_ISOLATION_PREENTRY_V1"
#define TARGET "/opt/void-apollyon-training-v1/apollyon_candidate_training_entrypoint_v1"
#define TRAINING_HOME "/var/lib/void-apollyon-training-v1"

static void hold(const char *reason) {
  fprintf(stderr, "HOLD=%s\n", reason);
  fprintf(stderr, "host_mutation=false\n");
  fprintf(stderr, "service_action=false\n");
  fprintf(stderr, "attempt_claim=false\n");
  fprintf(stderr, "training_execution=false\n");
  exit(2);
}

static bool safe_regular_metadata(const struct stat *st, uid_t owner) {
  mode_t mode = st->st_mode;
  return S_ISREG(mode) &&
         st->st_uid == owner &&
         st->st_nlink == 1 &&
         (mode & (S_IWGRP | S_IWOTH | S_ISUID | S_ISGID)) == 0 &&
         (mode & (S_IXUSR | S_IXGRP | S_IXOTH)) != 0;
}

static void assert_root_owned_ancestor(const char *path) {
  struct stat st;
  if (lstat(path, &st) != 0 ||
      !S_ISDIR(st.st_mode) ||
      S_ISLNK(st.st_mode) ||
      st.st_uid != 0 ||
      (st.st_mode & (S_IWGRP | S_IWOTH)) != 0) {
    hold("apollyon_training_bus_isolation_untrusted_ancestor");
  }
}

static void assert_target_custody(void) {
  static const char *const ancestors[] = {
    "/",
    "/opt",
    "/opt/void-apollyon-training-v1",
  };
  for (size_t i = 0; i < sizeof(ancestors) / sizeof(ancestors[0]); ++i) {
    assert_root_owned_ancestor(ancestors[i]);
  }

  struct stat before;
  if (lstat(TARGET, &before) != 0 || S_ISLNK(before.st_mode) ||
      !safe_regular_metadata(&before, 0)) {
    hold("apollyon_training_bus_isolation_target_untrusted");
  }

  int fd = open(TARGET, O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
  if (fd < 0) {
    hold("apollyon_training_bus_isolation_target_open_failed");
  }
  struct stat opened;
  if (fstat(fd, &opened) != 0 ||
      opened.st_dev != before.st_dev ||
      opened.st_ino != before.st_ino ||
      opened.st_uid != before.st_uid ||
      opened.st_gid != before.st_gid ||
      opened.st_mode != before.st_mode ||
      opened.st_nlink != before.st_nlink ||
      opened.st_size != before.st_size) {
    close(fd);
    hold("apollyon_training_bus_isolation_target_identity_drift");
  }
  close(fd);
}

static void set_no_new_privileges(void) {
  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0) {
    hold("apollyon_training_bus_isolation_no_new_privileges_failed");
  }
  if (prctl(PR_GET_NO_NEW_PRIVS, 0, 0, 0, 0) != 1) {
    hold("apollyon_training_bus_isolation_no_new_privileges_unproven");
  }
}

static void close_extra_fds(void) {
  long rc = syscall(SYS_close_range, 3U, UINT_MAX, CLOSE_RANGE_UNSHARE);
  if (rc != 0) {
    hold("apollyon_training_bus_isolation_close_range_failed");
  }
}

static void assert_no_extra_fds(void) {
  DIR *dir = opendir("/proc/self/fd");
  if (dir == NULL) {
    hold("apollyon_training_bus_isolation_fd_census_failed");
  }
  int census_fd = dirfd(dir);
  errno = 0;
  for (;;) {
    struct dirent *entry = readdir(dir);
    if (entry == NULL) {
      break;
    }
    char *end = NULL;
    long value = strtol(entry->d_name, &end, 10);
    if (end == entry->d_name || *end != '\0') {
      continue;
    }
    if (value <= 2 || value == census_fd) {
      continue;
    }
    closedir(dir);
    hold("apollyon_training_bus_isolation_inherited_fd_present");
  }
  if (errno != 0) {
    closedir(dir);
    hold("apollyon_training_bus_isolation_fd_census_failed");
  }
  if (closedir(dir) != 0) {
    hold("apollyon_training_bus_isolation_fd_census_close_failed");
  }
}

static int run_self_test(void) {
  struct stat good = {0};
  good.st_mode = S_IFREG | 0755;
  good.st_uid = 0;
  good.st_nlink = 1;
  if (!safe_regular_metadata(&good, 0)) {
    return 10;
  }
  struct stat bad = good;
  bad.st_mode |= S_ISUID;
  if (safe_regular_metadata(&bad, 0)) {
    return 11;
  }
  bad = good;
  bad.st_mode |= S_ISGID;
  if (safe_regular_metadata(&bad, 0)) {
    return 12;
  }
  bad = good;
  bad.st_mode |= S_IWGRP;
  if (safe_regular_metadata(&bad, 0)) {
    return 13;
  }

  int pipefds[2];
  if (pipe(pipefds) != 0) {
    return 14;
  }
  pid_t child = fork();
  if (child < 0) {
    return 15;
  }
  if (child == 0) {
    set_no_new_privileges();
    close_extra_fds();
    if (fcntl(pipefds[0], F_GETFD) != -1 || errno != EBADF) {
      _exit(20);
    }
    errno = 0;
    if (fcntl(pipefds[1], F_GETFD) != -1 || errno != EBADF) {
      _exit(21);
    }
    assert_no_extra_fds();
    _exit(0);
  }

  close(pipefds[0]);
  close(pipefds[1]);
  int status = 0;
  if (waitpid(child, &status, 0) != child ||
      !WIFEXITED(status) ||
      WEXITSTATUS(status) != 0) {
    return 16;
  }

  puts(MARKER "_SELF_TEST=GREEN");
  puts("close_range_unshare_required=true");
  puts("all_inherited_fds_ge_3_closed=true");
  puts("no_new_privileges_required=true");
  puts("target_root_custody_required=true");
  puts("setuid_setgid_rejected=true");
  puts("training_execution=false");
  return 0;
}

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "--self-test") == 0) {
    return run_self_test();
  }
  if (argc != 1) {
    hold("apollyon_training_bus_isolation_arguments_invalid");
  }
  if (getuid() == 0 || geteuid() == 0 ||
      getuid() != geteuid() || getgid() != getegid()) {
    hold("apollyon_training_bus_isolation_identity_invalid");
  }

  assert_target_custody();
  set_no_new_privileges();
  close_extra_fds();
  assert_no_extra_fds();

  char *const child_argv[] = {(char *)TARGET, NULL};
  char *const child_env[] = {
    "PATH=/usr/bin:/bin",
    "HOME=" TRAINING_HOME,
    "LC_ALL=C",
    "PYTHONNOUSERSITE=1",
    "PYTHONDONTWRITEBYTECODE=1",
    NULL,
  };
  execve(TARGET, child_argv, child_env);
  hold("apollyon_training_bus_isolation_exec_failed");
  return 2;
}
