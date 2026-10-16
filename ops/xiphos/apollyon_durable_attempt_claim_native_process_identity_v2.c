#define _GNU_SOURCE
#include "apollyon_durable_attempt_claim_native_process_identity_v2.h"

#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <unistd.h>

#define MAX_PROC_BYTES 65536U

static int read_bounded_proc(
  pid_t pid,
  const char *leaf,
  unsigned char *buffer,
  size_t capacity,
  size_t *length_out
) {
  char path[128];
  if (
    pid <= 1 || !leaf || !buffer || capacity < 2 || !length_out ||
    snprintf(path, sizeof(path), "/proc/%ld/%s", (long)pid, leaf) >=
      (int)sizeof(path)
  ) {
    errno = EINVAL;
    return -1;
  }
  int fd = open(path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (fd < 0) return -1;
  size_t used = 0;
  for (;;) {
    if (used == capacity) {
      close(fd);
      errno = EFBIG;
      return -1;
    }
    ssize_t n = read(fd, buffer + used, capacity - used);
    if (n > 0) {
      used += (size_t)n;
      continue;
    }
    if (n == 0) break;
    if (errno == EINTR) continue;
    int saved = errno;
    close(fd);
    errno = saved;
    return -1;
  }
  if (close(fd) != 0) return -1;
  *length_out = used;
  return 0;
}

static int parse_proc_stat(
  pid_t pid,
  pid_t *ppid_out,
  unsigned long long *start_ticks_out
) {
  unsigned char raw[8192];
  size_t length = 0;
  if (read_bounded_proc(pid, "stat", raw, sizeof(raw) - 1, &length) != 0) {
    return -1;
  }
  raw[length] = '\0';
  char *close_paren = strrchr((char *)raw, ')');
  if (!close_paren || close_paren[1] != ' ') {
    errno = EPROTO;
    return -1;
  }
  char *save = NULL;
  char *token = strtok_r(close_paren + 2, " ", &save);
  int index = 0;
  long parsed_ppid = -1;
  unsigned long long parsed_start = 0;
  while (token) {
    if (index == 1) {
      char *end = NULL;
      errno = 0;
      long value = strtol(token, &end, 10);
      if (errno != 0 || !end || *end != '\0' || value < 1) return -1;
      parsed_ppid = value;
    }
    if (index == 19) {
      char *end = NULL;
      errno = 0;
      unsigned long long value = strtoull(token, &end, 10);
      if (errno != 0 || !end || *end != '\0' || value < 1) return -1;
      parsed_start = value;
      break;
    }
    index += 1;
    token = strtok_r(NULL, " ", &save);
  }
  if (parsed_ppid < 1 || parsed_start < 1) {
    errno = EPROTO;
    return -1;
  }
  *ppid_out = (pid_t)parsed_ppid;
  *start_ticks_out = parsed_start;
  return 0;
}

static int parse_status_identity(
  pid_t pid,
  uid_t expected_uid,
  gid_t expected_gid
) {
  unsigned char raw[16384];
  size_t length = 0;
  if (read_bounded_proc(pid, "status", raw, sizeof(raw) - 1, &length) != 0) {
    return -1;
  }
  raw[length] = '\0';
  unsigned long uid[4] = {0};
  unsigned long gid[4] = {0};
  int have_uid = 0;
  int have_gid = 0;
  char *save = NULL;
  for (
    char *line = strtok_r((char *)raw, "\n", &save);
    line;
    line = strtok_r(NULL, "\n", &save)
  ) {
    if (
      sscanf(
        line, "Uid:\t%lu\t%lu\t%lu\t%lu",
        &uid[0], &uid[1], &uid[2], &uid[3]
      ) == 4
    ) have_uid = 1;
    if (
      sscanf(
        line, "Gid:\t%lu\t%lu\t%lu\t%lu",
        &gid[0], &gid[1], &gid[2], &gid[3]
      ) == 4
    ) have_gid = 1;
  }
  if (!have_uid || !have_gid) {
    errno = EPROTO;
    return -1;
  }
  for (int i = 0; i < 4; ++i) {
    if (uid[i] != (unsigned long)expected_uid) {
      errno = EPERM;
      return -1;
    }
    if (gid[i] != (unsigned long)expected_gid) {
      errno = EPERM;
      return -1;
    }
  }
  return 0;
}

static int exact_cmdline(
  pid_t pid,
  const unsigned char *expected,
  size_t expected_len
) {
  if (!expected || expected_len < 2 || expected_len > MAX_PROC_BYTES) {
    errno = EINVAL;
    return -1;
  }
  unsigned char *raw = malloc(expected_len + 1);
  if (!raw) return -1;
  size_t length = 0;
  int result = read_bounded_proc(pid, "cmdline", raw, expected_len + 1, &length);
  if (result == 0) {
    if (length != expected_len || memcmp(raw, expected, expected_len) != 0) {
      errno = EPROTO;
      result = -1;
    }
  }
  free(raw);
  return result;
}

static int exact_executable(
  pid_t pid,
  int expected_fd,
  dev_t *dev_out,
  ino_t *ino_out
) {
  if (expected_fd < 0 || !dev_out || !ino_out) {
    errno = EINVAL;
    return -1;
  }
  struct stat expected;
  if (fstat(expected_fd, &expected) != 0 || !S_ISREG(expected.st_mode)) return -1;
  char path[128];
  if (snprintf(path, sizeof(path), "/proc/%ld/exe", (long)pid) >= (int)sizeof(path)) {
    errno = ENAMETOOLONG;
    return -1;
  }
  struct stat observed;
  if (stat(path, &observed) != 0 || !S_ISREG(observed.st_mode)) return -1;
  if (expected.st_dev != observed.st_dev || expected.st_ino != observed.st_ino) {
    errno = ESTALE;
    return -1;
  }
  *dev_out = observed.st_dev;
  *ino_out = observed.st_ino;
  return 0;
}

static int pidfd_open_checked(pid_t pid) {
#ifdef SYS_pidfd_open
  return (int)syscall(SYS_pidfd_open, pid, 0);
#else
  (void)pid;
  errno = ENOSYS;
  return -1;
#endif
}

int apollyon_claim_process_identity_pidfd_state_v2(int pidfd) {
  if (pidfd < 0) {
    errno = EBADF;
    return -1;
  }
  struct pollfd p = {.fd = pidfd, .events = POLLIN};
  int result;
  do {
    result = poll(&p, 1, 0);
  } while (result < 0 && errno == EINTR);
  if (result < 0) return -1;
  return result == 0 ? 0 : 1;
}

void apollyon_claim_process_identity_close_v2(
  struct apollyon_claim_process_identity_v2 *identity
) {
  if (!identity) return;
  if (identity->pidfd >= 0) close(identity->pidfd);
  identity->pidfd = -1;
}

int apollyon_claim_process_identity_observe_v2(
  pid_t pid,
  pid_t expected_ppid,
  uid_t expected_uid,
  gid_t expected_gid,
  int expected_executable_fd,
  const unsigned char *expected_cmdline,
  size_t expected_cmdline_len,
  struct apollyon_claim_process_identity_v2 *out
) {
  if (
    pid <= 1 || expected_ppid <= 0 || expected_executable_fd < 0 ||
    !expected_cmdline || expected_cmdline_len < 2 || !out
  ) {
    errno = EINVAL;
    return -1;
  }
  memset(out, 0, sizeof(*out));
  out->pidfd = -1;

  pid_t before_ppid = 0;
  unsigned long long before_start = 0;
  if (parse_proc_stat(pid, &before_ppid, &before_start) != 0) return -1;
  if (before_ppid != expected_ppid) {
    errno = EPERM;
    return -1;
  }

  int pidfd = pidfd_open_checked(pid);
  if (pidfd < 0) return -1;
  if (apollyon_claim_process_identity_pidfd_state_v2(pidfd) != 0) {
    close(pidfd);
    errno = ESRCH;
    return -1;
  }

  if (
    parse_status_identity(pid, expected_uid, expected_gid) != 0 ||
    exact_cmdline(pid, expected_cmdline, expected_cmdline_len) != 0
  ) {
    int saved = errno;
    close(pidfd);
    errno = saved;
    return -1;
  }

  dev_t exe_dev = 0;
  ino_t exe_ino = 0;
  if (exact_executable(pid, expected_executable_fd, &exe_dev, &exe_ino) != 0) {
    int saved = errno;
    close(pidfd);
    errno = saved;
    return -1;
  }

  pid_t after_ppid = 0;
  unsigned long long after_start = 0;
  if (
    parse_proc_stat(pid, &after_ppid, &after_start) != 0 ||
    after_ppid != before_ppid || after_start != before_start ||
    apollyon_claim_process_identity_pidfd_state_v2(pidfd) != 0
  ) {
    int saved = errno ? errno : ESTALE;
    close(pidfd);
    errno = saved;
    return -1;
  }

  out->pid = pid;
  out->ppid = before_ppid;
  out->uid = expected_uid;
  out->gid = expected_gid;
  out->start_ticks = before_start;
  out->executable_dev = exe_dev;
  out->executable_ino = exe_ino;
  out->pidfd = pidfd;
  return 0;
}
