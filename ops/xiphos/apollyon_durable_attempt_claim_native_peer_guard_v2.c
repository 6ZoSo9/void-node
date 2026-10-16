#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <signal.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <sys/un.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define MARKER "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_V2"
#define FRAME_BYTES 64
#define TEST_TIMEOUT_MS 150
#define MAX_PROC_STAT 8192

struct peer_identity {
  pid_t pid;
  uid_t uid;
  gid_t gid;
  pid_t ppid;
  unsigned long long start_ticks;
};

static int monotonic_ms(long long *out) {
  struct timespec ts;
  if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0) return -1;
  *out = (long long)ts.tv_sec * 1000LL + (long long)(ts.tv_nsec / 1000000L);
  return 0;
}

static int remaining_ms(long long deadline) {
  long long now = 0;
  if (monotonic_ms(&now) != 0) return -1;
  if (now >= deadline) return 0;
  long long remaining = deadline - now;
  return remaining > 0x7fffffffLL ? 0x7fffffff : (int)remaining;
}

static int poll_input(int fd, long long deadline) {
  for (;;) {
    int timeout = remaining_ms(deadline);
    if (timeout < 0) return -1;
    if (timeout == 0) {
      errno = ETIMEDOUT;
      return -1;
    }
    struct pollfd p = {.fd = fd, .events = POLLIN | POLLHUP};
    int result = poll(&p, 1, timeout);
    if (result > 0) return 0;
    if (result == 0) {
      errno = ETIMEDOUT;
      return -1;
    }
    if (errno != EINTR) return -1;
  }
}

static int send_all(int fd, const unsigned char *bytes, size_t len) {
  size_t used = 0;
  while (used < len) {
    ssize_t n = send(fd, bytes + used, len - used, MSG_NOSIGNAL);
    if (n > 0) {
      used += (size_t)n;
      continue;
    }
    if (n < 0 && errno == EINTR) continue;
    return -1;
  }
  return 0;
}

static int send_exact_then_half_close(
  int fd,
  const unsigned char *bytes,
  size_t len
) {
  if (send_all(fd, bytes, len) != 0) return -1;
  if (shutdown(fd, SHUT_WR) != 0) return -1;
  return 0;
}

static int read_exact_then_eof(
  int fd,
  unsigned char *out,
  size_t exact_len,
  int timeout_ms
) {
  long long now = 0;
  if (monotonic_ms(&now) != 0) return -1;
  long long deadline = now + timeout_ms;
  size_t used = 0;

  while (used < exact_len) {
    if (poll_input(fd, deadline) != 0) return -1;
    ssize_t n = recv(fd, out + used, exact_len - used, 0);
    if (n > 0) {
      used += (size_t)n;
      continue;
    }
    if (n == 0) {
      errno = EMSGSIZE;
      return -1;
    }
    if (errno == EINTR) continue;
    return -1;
  }

  for (;;) {
    if (poll_input(fd, deadline) != 0) return -1;
    unsigned char extra = 0;
    ssize_t n = recv(fd, &extra, 1, 0);
    if (n == 0) return 0;
    if (n > 0) {
      errno = EMSGSIZE;
      return -1;
    }
    if (errno == EINTR) continue;
    return -1;
  }
}

static int peercred(int fd, struct ucred *cred) {
  socklen_t len = sizeof(*cred);
  memset(cred, 0, sizeof(*cred));
  if (
    getsockopt(fd, SOL_SOCKET, SO_PEERCRED, cred, &len) != 0 ||
    len != sizeof(*cred)
  ) return -1;
  return 0;
}

static int pidfd_open_checked(pid_t pid) {
#ifdef SYS_pidfd_open
  return (int)syscall(SYS_pidfd_open, pid, 0);
#else
  errno = ENOSYS;
  return -1;
#endif
}

static int pidfd_alive(int fd) {
  struct pollfd p = {.fd = fd, .events = POLLIN};
  int result;
  do {
    result = poll(&p, 1, 0);
  } while (result < 0 && errno == EINTR);
  if (result == 0) return 0;
  errno = ESRCH;
  return -1;
}

static int read_proc_stat(
  pid_t pid,
  pid_t *ppid,
  unsigned long long *start_ticks
) {
  char path[128];
  if (
    snprintf(path, sizeof(path), "/proc/%ld/stat", (long)pid) >=
    (int)sizeof(path)
  ) return -1;

  int fd = open(path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (fd < 0) return -1;
  unsigned char raw[MAX_PROC_STAT];
  size_t used = 0;
  for (;;) {
    if (used == sizeof(raw) - 1) {
      close(fd);
      errno = EFBIG;
      return -1;
    }
    ssize_t n = read(fd, raw + used, sizeof(raw) - 1 - used);
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
  raw[used] = '\0';

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
  *ppid = (pid_t)parsed_ppid;
  *start_ticks = parsed_start;
  return 0;
}

static int source_relation_to_fd(pid_t pid, int expected_exe_fd) {
  char path[128];
  if (
    snprintf(path, sizeof(path), "/proc/%ld/exe", (long)pid) >=
    (int)sizeof(path)
  ) return -1;
  struct stat expected;
  struct stat observed;
  if (fstat(expected_exe_fd, &expected) != 0) return -1;
  if (stat(path, &observed) != 0) return -1;
  return (
    expected.st_dev == observed.st_dev &&
    expected.st_ino == observed.st_ino
  ) ? 0 : 1;
}

static int abstract_listener(
  int *server_out,
  struct sockaddr_un *address_out,
  socklen_t *length_out
) {
  int server = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
  if (server < 0) return -1;

  struct sockaddr_un address;
  memset(&address, 0, sizeof(address));
  address.sun_family = AF_UNIX;
  char name[80];
  int n = snprintf(
    name, sizeof(name),
    "void-apollyon-claim-peer-v2-%ld-%ld",
    (long)getpid(), (long)time(NULL)
  );
  if (n < 1 || n >= (int)sizeof(name)) {
    close(server);
    errno = ENAMETOOLONG;
    return -1;
  }
  size_t name_len = (size_t)n;
  if (name_len + 1 > sizeof(address.sun_path)) {
    close(server);
    errno = ENAMETOOLONG;
    return -1;
  }
  address.sun_path[0] = '\0';
  memcpy(address.sun_path + 1, name, name_len);
  socklen_t length = (socklen_t)(
    offsetof(struct sockaddr_un, sun_path) + 1 + name_len
  );

  if (bind(server, (struct sockaddr *)&address, length) != 0) {
    int saved = errno;
    close(server);
    errno = saved;
    return -1;
  }
  if (listen(server, 4) != 0) {
    int saved = errno;
    close(server);
    errno = saved;
    return -1;
  }
  *server_out = server;
  *address_out = address;
  *length_out = length;
  return 0;
}

static int self_test_framing_good(void) {
  int pair[2];
  if (socketpair(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0, pair) != 0) return -1;
  pid_t child = fork();
  if (child < 0) return -1;
  if (child == 0) {
    close(pair[0]);
    unsigned char frame[FRAME_BYTES];
    for (size_t i = 0; i < sizeof(frame); ++i) frame[i] = (unsigned char)i;
    if (send_exact_then_half_close(pair[1], frame, sizeof(frame)) != 0) _exit(10);
    unsigned char ack = 0;
    ssize_t n;
    do {
      n = recv(pair[1], &ack, 1, 0);
    } while (n < 0 && errno == EINTR);
    close(pair[1]);
    _exit(n == 1 && ack == 0xA5 ? 0 : 11);
  }

  close(pair[1]);
  unsigned char observed[FRAME_BYTES];
  if (read_exact_then_eof(pair[0], observed, sizeof(observed), TEST_TIMEOUT_MS) != 0) {
    close(pair[0]);
    return -1;
  }
  for (size_t i = 0; i < sizeof(observed); ++i) {
    if (observed[i] != (unsigned char)i) {
      close(pair[0]);
      errno = EBADMSG;
      return -1;
    }
  }
  const unsigned char ack = 0xA5;
  if (send_all(pair[0], &ack, 1) != 0) {
    close(pair[0]);
    return -1;
  }
  close(pair[0]);
  int status = 0;
  if (
    waitpid(child, &status, 0) != child ||
    !WIFEXITED(status) ||
    WEXITSTATUS(status) != 0
  ) return -1;
  return 0;
}

static int self_test_framing_extra(void) {
  int pair[2];
  if (socketpair(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0, pair) != 0) return -1;
  pid_t child = fork();
  if (child < 0) return -1;
  if (child == 0) {
    close(pair[0]);
    unsigned char frame[FRAME_BYTES + 1];
    memset(frame, 0x5A, sizeof(frame));
    if (send_all(pair[1], frame, sizeof(frame)) != 0) _exit(10);
    if (shutdown(pair[1], SHUT_WR) != 0) _exit(11);
    close(pair[1]);
    _exit(0);
  }
  close(pair[1]);
  unsigned char observed[FRAME_BYTES];
  errno = 0;
  int result = read_exact_then_eof(
    pair[0], observed, sizeof(observed), TEST_TIMEOUT_MS
  );
  int saved = errno;
  close(pair[0]);
  int status = 0;
  if (waitpid(child, &status, 0) != child) return -1;
  if (result == 0 || saved != EMSGSIZE) {
    errno = EPROTO;
    return -1;
  }
  return 0;
}

static int self_test_framing_short(void) {
  int pair[2];
  if (socketpair(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0, pair) != 0) return -1;
  pid_t child = fork();
  if (child < 0) return -1;
  if (child == 0) {
    close(pair[0]);
    unsigned char frame[FRAME_BYTES - 1];
    memset(frame, 0x4C, sizeof(frame));
    if (send_all(pair[1], frame, sizeof(frame)) != 0) _exit(10);
    if (shutdown(pair[1], SHUT_WR) != 0) _exit(11);
    close(pair[1]);
    _exit(0);
  }
  close(pair[1]);
  unsigned char observed[FRAME_BYTES];
  errno = 0;
  int result = read_exact_then_eof(
    pair[0], observed, sizeof(observed), TEST_TIMEOUT_MS
  );
  int saved = errno;
  close(pair[0]);
  int status = 0;
  if (waitpid(child, &status, 0) != child) return -1;
  if (result == 0 || saved != EMSGSIZE) {
    errno = EPROTO;
    return -1;
  }
  return 0;
}

static int self_test_framing_delayed_extra(void) {
  int pair[2];
  if (socketpair(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0, pair) != 0) return -1;
  pid_t child = fork();
  if (child < 0) return -1;
  if (child == 0) {
    close(pair[0]);
    unsigned char frame[FRAME_BYTES];
    memset(frame, 0x5D, sizeof(frame));
    if (send_all(pair[1], frame, sizeof(frame)) != 0) _exit(10);
    struct timespec delay = {.tv_sec = 0, .tv_nsec = 30000000L};
    nanosleep(&delay, NULL);
    const unsigned char extra = 0xEE;
    if (send_all(pair[1], &extra, 1) != 0) _exit(11);
    if (shutdown(pair[1], SHUT_WR) != 0) _exit(12);
    close(pair[1]);
    _exit(0);
  }
  close(pair[1]);
  unsigned char observed[FRAME_BYTES];
  errno = 0;
  int result = read_exact_then_eof(
    pair[0], observed, sizeof(observed), TEST_TIMEOUT_MS
  );
  int saved = errno;
  close(pair[0]);
  int status = 0;
  if (waitpid(child, &status, 0) != child) return -1;
  if (result == 0 || saved != EMSGSIZE) {
    errno = EPROTO;
    return -1;
  }
  return 0;
}

static int self_test_framing_no_eof(void) {
  int pair[2];
  if (socketpair(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0, pair) != 0) return -1;
  pid_t child = fork();
  if (child < 0) return -1;
  if (child == 0) {
    close(pair[0]);
    unsigned char frame[FRAME_BYTES];
    memset(frame, 0x6B, sizeof(frame));
    if (send_all(pair[1], frame, sizeof(frame)) != 0) _exit(10);
    struct timespec delay = {.tv_sec = 0, .tv_nsec = 400000000L};
    nanosleep(&delay, NULL);
    close(pair[1]);
    _exit(0);
  }
  close(pair[1]);
  unsigned char observed[FRAME_BYTES];
  errno = 0;
  int result = read_exact_then_eof(pair[0], observed, sizeof(observed), 50);
  int saved = errno;
  close(pair[0]);
  kill(child, SIGTERM);
  waitpid(child, NULL, 0);
  if (result == 0 || saved != ETIMEDOUT) {
    errno = EPROTO;
    return -1;
  }
  return 0;
}

static int self_test_peer_and_exec_drift(void) {
  int server = -1;
  struct sockaddr_un address;
  socklen_t address_len = 0;
  if (abstract_listener(&server, &address, &address_len) != 0) return -1;

  int expected_exe_fd = open("/proc/self/exe", O_RDONLY | O_CLOEXEC);
  if (expected_exe_fd < 0) {
    close(server);
    return -1;
  }

  pid_t child = fork();
  if (child < 0) return -1;
  if (child == 0) {
    close(server);
    int client = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
    if (client < 0) _exit(10);
    if (
      connect(client, (struct sockaddr *)&address, address_len) != 0
    ) _exit(11);
    const unsigned char ready = 0x52;
    if (send_all(client, &ready, 1) != 0) _exit(12);
    unsigned char command = 0;
    ssize_t n;
    do {
      n = recv(client, &command, 1, 0);
    } while (n < 0 && errno == EINTR);
    close(client);
    if (n != 1 || command != 0x58) _exit(13);
    execl("/bin/sleep", "sleep", "5", (char *)NULL);
    _exit(14);
  }

  int accepted = accept4(server, NULL, NULL, SOCK_CLOEXEC);
  if (accepted < 0) return -1;
  close(server);

  struct ucred cred;
  if (
    peercred(accepted, &cred) != 0 ||
    cred.pid != child ||
    cred.uid != getuid() ||
    cred.gid != getgid()
  ) return -1;

  unsigned char ready = 0;
  ssize_t n;
  do {
    n = recv(accepted, &ready, 1, 0);
  } while (n < 0 && errno == EINTR);
  if (n != 1 || ready != 0x52) return -1;

  int pidfd = pidfd_open_checked(child);
  if (pidfd < 0 || pidfd_alive(pidfd) != 0) return -1;

  pid_t before_ppid = 0;
  unsigned long long before_start = 0;
  if (read_proc_stat(child, &before_ppid, &before_start) != 0) return -1;
  if (source_relation_to_fd(child, expected_exe_fd) != 0) return -1;

  const unsigned char execute = 0x58;
  if (send_all(accepted, &execute, 1) != 0) return -1;
  close(accepted);

  int drift_seen = 0;
  for (int i = 0; i < 100; ++i) {
    int relation = source_relation_to_fd(child, expected_exe_fd);
    if (relation == 1) {
      drift_seen = 1;
      break;
    }
    if (relation < 0) return -1;
    struct timespec short_delay = {.tv_sec = 0, .tv_nsec = 10000000L};
    nanosleep(&short_delay, NULL);
  }
  if (!drift_seen || pidfd_alive(pidfd) != 0) return -1;

  pid_t after_ppid = 0;
  unsigned long long after_start = 0;
  if (read_proc_stat(child, &after_ppid, &after_start) != 0) return -1;
  if (after_start != before_start || after_ppid != before_ppid) return -1;

  kill(child, SIGTERM);
  waitpid(child, NULL, 0);
  close(pidfd);
  close(expected_exe_fd);
  return 0;
}

static int self_test(void) {
  if (self_test_framing_good() != 0) return 1;
  if (self_test_framing_extra() != 0) return 1;
  if (self_test_framing_short() != 0) return 1;
  if (self_test_framing_delayed_extra() != 0) return 1;
  if (self_test_framing_no_eof() != 0) return 1;
  if (self_test_peer_and_exec_drift() != 0) return 1;

  printf("%s_SELF_TEST_GREEN\n", MARKER);
  printf("af_unix_sock_stream=true\n");
  printf("so_peercred_proven=true\n");
  printf("pidfd_liveness_proven=true\n");
  printf("exec_in_place_source_drift_detected=true\n");
  printf("response_frame_exact_bytes=64\n");
  printf("response_half_close_eof_proven=true\n");
  printf("response_extra_byte_rejected=true\n");
  printf("response_short_eof_rejected=true\n");
  printf("response_delayed_extra_rejected=true\n");
  printf("response_no_eof_timeout_rejected=true\n");
  printf("read_half_ack_after_peer_eof_proven=true\n");
  printf("cross_uid_host_qualification_performed=false\n");
  printf("host_installation=false\n");
  printf("claim_store_mutation=false\n");
  printf("durable_attempt_claim=false\n");
  printf("training_execution=false\n");
  printf("private_key_access=false\n");
  printf("signing=false\n");
  printf("transaction=false\n");
  printf("funds_movement=false\n");
  return 0;
}

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "--self-test") == 0) return self_test();
  fprintf(
    stderr,
    "%s_HOLD\nreason=source_candidate_self_test_only\n"
    "host_installation=false\nclaim_store_mutation=false\n"
    "durable_attempt_claim=false\ntraining_execution=false\n"
    "private_key_access=false\nsigning=false\ntransaction=false\n"
    "funds_movement=false\n",
    MARKER
  );
  return 2;
}
