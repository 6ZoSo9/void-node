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

static int parse_id_token(
  const char **cursor,
  unsigned long *value_out
) {
  if (!cursor || !*cursor || !value_out) {
    errno = EINVAL;
    return -1;
  }
  const char *p = *cursor;
  while (*p == ' ' || *p == '\t') ++p;
  if (*p < '0' || *p > '9') {
    errno = EPROTO;
    return -1;
  }
  errno = 0;
  char *end = NULL;
  unsigned long value = strtoul(p, &end, 10);
  if (errno != 0 || !end || end == p) return -1;
  *cursor = end;
  *value_out = value;
  return 0;
}

static int line_end_only(const char *cursor) {
  if (!cursor) return 0;
  while (*cursor == ' ' || *cursor == '\t') ++cursor;
  return *cursor == '\0';
}

static int validate_expected_supplementary_groups(
  const gid_t *expected,
  size_t expected_count
) {
  if (
    expected_count > APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2 ||
    (expected_count > 0 && !expected)
  ) {
    errno = EINVAL;
    return -1;
  }
  for (size_t i = 0; i < expected_count; ++i) {
    for (size_t j = i + 1; j < expected_count; ++j) {
      if (expected[i] == expected[j]) {
        errno = EINVAL;
        return -1;
      }
    }
  }
  return 0;
}

static int parse_four_slots(
  const char *line,
  const char *prefix,
  unsigned long values[4]
) {
  if (!line || !prefix || !values) {
    errno = EINVAL;
    return -1;
  }
  size_t prefix_len = strlen(prefix);
  if (strncmp(line, prefix, prefix_len) != 0) {
    errno = EPROTO;
    return -1;
  }
  const char *cursor = line + prefix_len;
  for (size_t i = 0; i < 4; ++i) {
    if (parse_id_token(&cursor, &values[i]) != 0) return -1;
  }
  if (!line_end_only(cursor)) {
    errno = EPROTO;
    return -1;
  }
  return 0;
}

static int parse_groups_line(
  const char *line,
  const gid_t *expected,
  size_t expected_count
) {
  if (validate_expected_supplementary_groups(expected, expected_count) != 0) {
    return -1;
  }
  static const char prefix[] = "Groups:";
  if (!line || strncmp(line, prefix, sizeof(prefix) - 1) != 0) {
    errno = EPROTO;
    return -1;
  }
  const char *cursor = line + sizeof(prefix) - 1;
  gid_t observed[APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2];
  size_t observed_count = 0;
  for (;;) {
    while (*cursor == ' ' || *cursor == '\t') ++cursor;
    if (*cursor == '\0') break;
    if (observed_count >= APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2) {
      errno = E2BIG;
      return -1;
    }
    unsigned long value = 0;
    if (parse_id_token(&cursor, &value) != 0) return -1;
    gid_t gid = (gid_t)value;
    if ((unsigned long)gid != value) {
      errno = ERANGE;
      return -1;
    }
    for (size_t i = 0; i < observed_count; ++i) {
      if (observed[i] == gid) {
        errno = EPROTO;
        return -1;
      }
    }
    observed[observed_count++] = gid;
  }
  if (observed_count != expected_count) {
    errno = EPERM;
    return -1;
  }
  for (size_t i = 0; i < observed_count; ++i) {
    int found = 0;
    for (size_t j = 0; j < expected_count; ++j) {
      if (observed[i] == expected[j]) {
        found = 1;
        break;
      }
    }
    if (!found) {
      errno = EPERM;
      return -1;
    }
  }
  return 0;
}

static int parse_status_identity_bytes(
  unsigned char *raw,
  size_t length,
  uid_t expected_uid,
  gid_t expected_gid,
  const gid_t *expected_supplementary_gids,
  size_t expected_supplementary_gid_count
) {
  if (
    !raw || length >= 16384 ||
    validate_expected_supplementary_groups(
      expected_supplementary_gids,
      expected_supplementary_gid_count
    ) != 0
  ) {
    if (errno == 0) errno = EINVAL;
    return -1;
  }
  raw[length] = '\0';
  unsigned long uid[4] = {0};
  unsigned long gid[4] = {0};
  int have_uid = 0;
  int have_gid = 0;
  int have_groups = 0;
  char *save = NULL;
  for (
    char *line = strtok_r((char *)raw, "\n", &save);
    line;
    line = strtok_r(NULL, "\n", &save)
  ) {
    if (strncmp(line, "Uid:", 4) == 0) {
      if (have_uid || parse_four_slots(line, "Uid:", uid) != 0) {
        errno = EPROTO;
        return -1;
      }
      have_uid = 1;
    } else if (strncmp(line, "Gid:", 4) == 0) {
      if (have_gid || parse_four_slots(line, "Gid:", gid) != 0) {
        errno = EPROTO;
        return -1;
      }
      have_gid = 1;
    } else if (strncmp(line, "Groups:", 7) == 0) {
      if (
        have_groups ||
        parse_groups_line(
          line,
          expected_supplementary_gids,
          expected_supplementary_gid_count
        ) != 0
      ) {
        if (errno == 0) errno = EPROTO;
        return -1;
      }
      have_groups = 1;
    }
  }
  if (!have_uid || !have_gid || !have_groups) {
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

static int parse_status_identity(
  pid_t pid,
  uid_t expected_uid,
  gid_t expected_gid,
  const gid_t *expected_supplementary_gids,
  size_t expected_supplementary_gid_count
) {
  unsigned char raw[16384];
  size_t length = 0;
  if (read_bounded_proc(pid, "status", raw, sizeof(raw) - 1, &length) != 0) {
    return -1;
  }
  return parse_status_identity_bytes(
    raw,
    length,
    expected_uid,
    expected_gid,
    expected_supplementary_gids,
    expected_supplementary_gid_count
  );
}

#ifdef APOLLYON_CLAIM_PROCESS_IDENTITY_V2_SELF_TEST
int apollyon_claim_process_identity_test_parse_status_v2(
  const unsigned char *input,
  size_t input_len,
  uid_t expected_uid,
  gid_t expected_gid,
  const gid_t *expected_supplementary_gids,
  size_t expected_supplementary_gid_count
) {
  if (!input || input_len >= 16384) {
    errno = EINVAL;
    return -1;
  }
  unsigned char raw[16384];
  memcpy(raw, input, input_len);
  return parse_status_identity_bytes(
    raw,
    input_len,
    expected_uid,
    expected_gid,
    expected_supplementary_gids,
    expected_supplementary_gid_count
  );
}

extern int apollyon_claim_process_identity_test_hook_v2(pid_t pid);
#endif

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
  if (result == 0) {
    if (p.revents != 0) {
      errno = EPROTO;
      return -1;
    }
    return 0;
  }
  if ((p.revents & (POLLNVAL | POLLERR)) != 0) {
    errno = EBADF;
    return -1;
  }
  const short terminal = (short)(POLLIN | POLLHUP);
  if ((p.revents & terminal) == 0 || (p.revents & (short)~terminal) != 0) {
    errno = EPROTO;
    return -1;
  }
  return 1;
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
  const gid_t *expected_supplementary_gids,
  size_t expected_supplementary_gid_count,
  int expected_executable_fd,
  const unsigned char *expected_cmdline,
  size_t expected_cmdline_len,
  struct apollyon_claim_process_identity_v2 *out
) {
  if (
    pid <= 1 || expected_ppid <= 0 || expected_executable_fd < 0 ||
    !expected_cmdline || expected_cmdline_len < 2 || !out ||
    validate_expected_supplementary_groups(
      expected_supplementary_gids,
      expected_supplementary_gid_count
    ) != 0
  ) {
    if (errno == 0) errno = EINVAL;
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
    parse_status_identity(
      pid,
      expected_uid,
      expected_gid,
      expected_supplementary_gids,
      expected_supplementary_gid_count
    ) != 0 ||
    exact_cmdline(pid, expected_cmdline, expected_cmdline_len) != 0
  ) {
    int saved = errno;
    close(pidfd);
    errno = saved;
    return -1;
  }

  dev_t first_exe_dev = 0;
  ino_t first_exe_ino = 0;
  if (
    exact_executable(
      pid,
      expected_executable_fd,
      &first_exe_dev,
      &first_exe_ino
    ) != 0
  ) {
    int saved = errno;
    close(pidfd);
    errno = saved;
    return -1;
  }

#ifdef APOLLYON_CLAIM_PROCESS_IDENTITY_V2_SELF_TEST
  if (apollyon_claim_process_identity_test_hook_v2(pid) != 0) {
    int saved = errno ? errno : EIO;
    close(pidfd);
    errno = saved;
    return -1;
  }
#endif

  pid_t middle_ppid = 0;
  unsigned long long middle_start = 0;
  if (
    parse_proc_stat(pid, &middle_ppid, &middle_start) != 0 ||
    middle_ppid != before_ppid || middle_start != before_start ||
    apollyon_claim_process_identity_pidfd_state_v2(pidfd) != 0
  ) {
    int saved = errno ? errno : ESTALE;
    close(pidfd);
    errno = saved;
    return -1;
  }

  if (
    parse_status_identity(
      pid,
      expected_uid,
      expected_gid,
      expected_supplementary_gids,
      expected_supplementary_gid_count
    ) != 0 ||
    exact_cmdline(pid, expected_cmdline, expected_cmdline_len) != 0
  ) {
    int saved = errno;
    close(pidfd);
    errno = saved;
    return -1;
  }

  dev_t second_exe_dev = 0;
  ino_t second_exe_ino = 0;
  if (
    exact_executable(
      pid,
      expected_executable_fd,
      &second_exe_dev,
      &second_exe_ino
    ) != 0 ||
    second_exe_dev != first_exe_dev ||
    second_exe_ino != first_exe_ino
  ) {
    int saved = errno ? errno : ESTALE;
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
  out->executable_dev = second_exe_dev;
  out->executable_ino = second_exe_ino;
  out->pidfd = pidfd;
  return 0;
}
