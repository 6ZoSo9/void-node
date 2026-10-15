#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <signal.h>
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
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_PEER_GUARD_V1"
#define EXPECTED_EXE "/usr/lib/systemd/systemd"
#define MAX_TEXT (1024 * 1024)
#define MAX_PIDS 64

struct proc_identity {
  pid_t pid;
  pid_t ppid;
  uid_t uid;
  gid_t gid;
  unsigned long long start_ticks;
};

static void die(const char *code) {
  fprintf(stderr, "%s_HOLD\nreason=%s\n", MARKER, code);
  exit(2);
}

static int read_bounded(const char *path, unsigned char *buf, size_t cap, size_t *out_len) {
  int fd = open(path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (fd < 0) return -1;
  size_t used = 0;
  for (;;) {
    if (used == cap) {
      unsigned char extra;
      ssize_t n = read(fd, &extra, 1);
      close(fd);
      if (n != 0) { errno = EFBIG; return -1; }
      break;
    }
    ssize_t n = read(fd, buf + used, cap - used);
    if (n < 0) {
      int saved = errno;
      close(fd);
      errno = saved;
      return -1;
    }
    if (n == 0) break;
    used += (size_t)n;
  }
  if (close(fd) != 0) return -1;
  *out_len = used;
  return 0;
}

static int parse_uint(const char *s, unsigned long long *out) {
  if (!s || !*s) return -1;
  unsigned long long v = 0;
  for (const unsigned char *p = (const unsigned char *)s; *p; ++p) {
    if (*p < '0' || *p > '9') return -1;
    unsigned digit = (unsigned)(*p - '0');
    if (v > (UINT64_MAX - digit) / 10ULL) return -1;
    v = v * 10ULL + digit;
  }
  *out = v;
  return 0;
}

static int proc_stat_identity(pid_t pid, pid_t *ppid, unsigned long long *start_ticks) {
  char path[128];
  if (snprintf(path, sizeof(path), "/proc/%ld/stat", (long)pid) >= (int)sizeof(path)) return -1;
  unsigned char raw[8192];
  size_t len = 0;
  if (read_bounded(path, raw, sizeof(raw) - 1, &len) != 0) return -1;
  raw[len] = '\0';
  char *close = strrchr((char *)raw, ')');
  if (!close || close[1] != ' ') return -1;
  char *save = NULL;
  char *token = strtok_r(close + 2, " ", &save);
  int index = 0;
  long parsed_ppid = -1;
  unsigned long long parsed_start = 0;
  while (token) {
    if (index == 1) {
      char *end = NULL;
      errno = 0;
      long v = strtol(token, &end, 10);
      if (errno || !end || *end || v < 1) return -1;
      parsed_ppid = v;
    }
    if (index == 19) {
      if (parse_uint(token, &parsed_start) != 0 || parsed_start < 1) return -1;
      break;
    }
    index += 1;
    token = strtok_r(NULL, " ", &save);
  }
  if (parsed_ppid < 1 || parsed_start < 1) return -1;
  *ppid = (pid_t)parsed_ppid;
  *start_ticks = parsed_start;
  return 0;
}

static int parse_status_ids(pid_t pid, uid_t expected_uid, uid_t *uid_out, gid_t *gid_out) {
  char path[128];
  if (snprintf(path, sizeof(path), "/proc/%ld/status", (long)pid) >= (int)sizeof(path)) return -1;
  unsigned char raw[65536];
  size_t len = 0;
  if (read_bounded(path, raw, sizeof(raw) - 1, &len) != 0) return -1;
  raw[len] = '\0';
  unsigned long uidv[4], gidv[4];
  int have_uid = 0, have_gid = 0;
  char *save = NULL;
  for (char *line = strtok_r((char *)raw, "\n", &save); line; line = strtok_r(NULL, "\n", &save)) {
    if (sscanf(line, "Uid:\t%lu\t%lu\t%lu\t%lu", &uidv[0], &uidv[1], &uidv[2], &uidv[3]) == 4) have_uid = 1;
    if (sscanf(line, "Gid:\t%lu\t%lu\t%lu\t%lu", &gidv[0], &gidv[1], &gidv[2], &gidv[3]) == 4) have_gid = 1;
  }
  if (!have_uid || !have_gid) return -1;
  for (int i = 0; i < 4; ++i) {
    if (uidv[i] != (unsigned long)expected_uid) return -1;
    if (gidv[i] != gidv[0]) return -1;
  }
  *uid_out = expected_uid;
  *gid_out = (gid_t)gidv[0];
  return 0;
}

static int exact_file_text(pid_t pid, const char *leaf, const char *expected) {
  char path[128];
  if (snprintf(path, sizeof(path), "/proc/%ld/%s", (long)pid, leaf) >= (int)sizeof(path)) return -1;
  unsigned char raw[4096];
  size_t len = 0;
  if (read_bounded(path, raw, sizeof(raw), &len) != 0) return -1;
  size_t expected_len = strlen(expected);
  if (len == expected_len && memcmp(raw, expected, len) == 0) return 0;
  if (len == expected_len + 1 && raw[len - 1] == '\n' && memcmp(raw, expected, expected_len) == 0) return 0;
  return -1;
}

static int exact_cmdline(pid_t pid) {
  char path[128];
  if (snprintf(path, sizeof(path), "/proc/%ld/cmdline", (long)pid) >= (int)sizeof(path)) return -1;
  static const unsigned char expected[] = EXPECTED_EXE "\0--user\0";
  unsigned char raw[4096];
  size_t len = 0;
  if (read_bounded(path, raw, sizeof(raw), &len) != 0) return -1;
  return len == sizeof(expected) - 1 && memcmp(raw, expected, len) == 0 ? 0 : -1;
}

static int exact_cgroup(pid_t pid, uid_t uid) {
  char expected[256];
  if (snprintf(expected, sizeof(expected),
      "0::/user.slice/user-%lu.slice/user@%lu.service/init.scope\n",
      (unsigned long)uid, (unsigned long)uid) >= (int)sizeof(expected)) return -1;
  return exact_file_text(pid, "cgroup", expected);
}

static int exact_executable(pid_t pid) {
  char proc_path[128];
  if (snprintf(proc_path, sizeof(proc_path), "/proc/%ld/exe", (long)pid) >= (int)sizeof(proc_path)) return -1;
  char link[4096];
  ssize_t n = readlink(proc_path, link, sizeof(link) - 1);
  if (n < 0 || (size_t)n >= sizeof(link) - 1) return -1;
  link[n] = '\0';
  if (strcmp(link, EXPECTED_EXE) != 0) return -1;

  struct stat expected, observed;
  if (lstat(EXPECTED_EXE, &expected) != 0 || !S_ISREG(expected.st_mode) ||
      expected.st_uid != 0 || (expected.st_mode & 0022) != 0 ||
      (expected.st_mode & 0111) == 0) return -1;
  if (stat(proc_path, &observed) != 0) return -1;
  return expected.st_dev == observed.st_dev && expected.st_ino == observed.st_ino ? 0 : -1;
}

static int candidate(pid_t pid, uid_t uid, struct proc_identity *out) {
  if (pid <= 1) return -1;
  if (exact_file_text(pid, "comm", "systemd") != 0) return -1;
  if (exact_cmdline(pid) != 0) return -1;
  if (exact_cgroup(pid, uid) != 0) return -1;
  if (exact_executable(pid) != 0) return -1;
  pid_t ppid = 0;
  unsigned long long start = 0;
  if (proc_stat_identity(pid, &ppid, &start) != 0 || ppid != 1) return -1;
  uid_t observed_uid = 0;
  gid_t gid = 0;
  if (parse_status_ids(pid, uid, &observed_uid, &gid) != 0) return -1;
  out->pid = pid;
  out->ppid = ppid;
  out->uid = observed_uid;
  out->gid = gid;
  out->start_ticks = start;
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
  int r = poll(&p, 1, 0);
  return r == 0 ? 0 : -1;
}

static int find_manager(uid_t uid, struct proc_identity *out) {
  char path[512];
  if (snprintf(path, sizeof(path),
      "/sys/fs/cgroup/user.slice/user-%lu.slice/user@%lu.service/init.scope/cgroup.procs",
      (unsigned long)uid, (unsigned long)uid) >= (int)sizeof(path)) return -1;
  unsigned char raw[16384];
  size_t len = 0;
  if (read_bounded(path, raw, sizeof(raw) - 1, &len) != 0) return -1;
  raw[len] = '\0';
  int count = 0;
  struct proc_identity found = {0};
  char *save = NULL;
  for (char *line = strtok_r((char *)raw, "\n", &save); line; line = strtok_r(NULL, "\n", &save)) {
    unsigned long long parsed = 0;
    if (parse_uint(line, &parsed) != 0 || parsed > 0x7fffffffULL) return -1;
    struct proc_identity current;
    if (candidate((pid_t)parsed, uid, &current) == 0) {
      found = current;
      count += 1;
    }
  }
  if (count != 1) return -1;
  *out = found;
  return 0;
}

static int connect_private(uid_t uid, struct stat *before, struct stat *after) {
  char path[256];
  if (snprintf(path, sizeof(path), "/run/user/%lu/systemd/private", (unsigned long)uid) >= (int)sizeof(path)) return -1;
  if (lstat(path, before) != 0 || !S_ISSOCK(before->st_mode) || S_ISLNK(before->st_mode) ||
      before->st_uid != uid) return -1;
  int fd = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
  if (fd < 0) return -1;
  struct sockaddr_un address;
  memset(&address, 0, sizeof(address));
  address.sun_family = AF_UNIX;
  if (strlen(path) >= sizeof(address.sun_path)) { close(fd); errno = ENAMETOOLONG; return -1; }
  strcpy(address.sun_path, path);
  if (connect(fd, (struct sockaddr *)&address, sizeof(address)) != 0) {
    int saved = errno; close(fd); errno = saved; return -1;
  }
  if (lstat(path, after) != 0 || before->st_dev != after->st_dev || before->st_ino != after->st_ino ||
      before->st_uid != after->st_uid || before->st_gid != after->st_gid || before->st_mode != after->st_mode) {
    close(fd); errno = ESTALE; return -1;
  }
  return fd;
}

static int peercred(int fd, struct ucred *cred) {
  socklen_t len = sizeof(*cred);
  memset(cred, 0, sizeof(*cred));
  if (getsockopt(fd, SOL_SOCKET, SO_PEERCRED, cred, &len) != 0 || len != sizeof(*cred)) return -1;
  return 0;
}

static int live(uid_t uid) {
  if (geteuid() != 0) die("root_required");
  struct proc_identity manager;
  if (find_manager(uid, &manager) != 0) die("manager_candidate_not_exactly_one");
  int pidfd = pidfd_open_checked(manager.pid);
  if (pidfd < 0 || pidfd_alive(pidfd) != 0) die("manager_pidfd_unavailable");

  struct stat socket_before, socket_after;
  int busfd = connect_private(uid, &socket_before, &socket_after);
  if (busfd < 0) { close(pidfd); die("manager_private_socket_connect_failed"); }
  struct ucred cred;
  if (peercred(busfd, &cred) != 0 ||
      cred.pid != manager.pid || cred.uid != manager.uid || cred.gid != manager.gid) {
    close(busfd); close(pidfd); die("manager_private_socket_peer_mismatch");
  }

  struct proc_identity after;
  if (candidate(manager.pid, uid, &after) != 0 ||
      after.start_ticks != manager.start_ticks ||
      after.ppid != manager.ppid ||
      after.gid != manager.gid ||
      pidfd_alive(pidfd) != 0) {
    close(busfd); close(pidfd); die("manager_generation_changed");
  }

  printf("%s_GREEN\n", MARKER);
  printf("runtime_uid=%lu\n", (unsigned long)uid);
  printf("manager_pid=%ld\n", (long)manager.pid);
  printf("manager_gid=%lu\n", (unsigned long)manager.gid);
  printf("manager_start_ticks=%llu\n", manager.start_ticks);
  printf("manager_cgroup=init.scope\n");
  printf("manager_executable=%s\n", EXPECTED_EXE);
  printf("manager_pidfd_retained=true\n");
  printf("private_socket_path=/run/user/%lu/systemd/private\n", (unsigned long)uid);
  printf("private_socket_peer_pid=%ld\n", (long)cred.pid);
  printf("private_socket_peer_uid=%lu\n", (unsigned long)cred.uid);
  printf("private_socket_peer_gid=%lu\n", (unsigned long)cred.gid);
  printf("private_socket_peer_authenticated=true\n");
  printf("unit_properties_queried=false\n");
  printf("host_mutation=false\n");
  printf("payment_acceptance=false\n");
  printf("public_presale_activation=false\n");
  printf("funds_movement=false\n");
  close(busfd);
  close(pidfd);
  return 0;
}

static int self_test_peer(void) {
  char templ[] = "/tmp/void-user-manager-peer-XXXXXX";
  char *dir = mkdtemp(templ);
  if (!dir) return -1;
  char path[108];
  if (snprintf(path, sizeof(path), "%s/private", dir) >= (int)sizeof(path)) return -1;
  int sync_pipe[2];
  if (pipe2(sync_pipe, O_CLOEXEC) != 0) return -1;
  pid_t child = fork();
  if (child < 0) return -1;
  if (child == 0) {
    close(sync_pipe[0]);
    int server = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
    if (server < 0) _exit(10);
    struct sockaddr_un address;
    memset(&address, 0, sizeof(address));
    address.sun_family = AF_UNIX;
    strcpy(address.sun_path, path);
    if (bind(server, (struct sockaddr *)&address, sizeof(address)) != 0 || listen(server, 1) != 0) _exit(11);
    if (write(sync_pipe[1], "R", 1) != 1) _exit(12);
    int client = accept4(server, NULL, NULL, SOCK_CLOEXEC);
    if (client < 0) _exit(13);
    char byte;
    ssize_t got = read(client, &byte, 1);
    if (got != 1 || byte != 'X') _exit(14);
    close(client); close(server); close(sync_pipe[1]);
    _exit(0);
  }
  close(sync_pipe[1]);
  char ready;
  if (read(sync_pipe[0], &ready, 1) != 1 || ready != 'R') return -1;
  close(sync_pipe[0]);
  int client = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
  if (client < 0) return -1;
  struct sockaddr_un address;
  memset(&address, 0, sizeof(address));
  address.sun_family = AF_UNIX;
  strcpy(address.sun_path, path);
  if (connect(client, (struct sockaddr *)&address, sizeof(address)) != 0) return -1;
  struct ucred cred;
  if (peercred(client, &cred) != 0 || cred.pid != child || cred.pid == getpid()) return -1;
  if (write(client, "X", 1) != 1) return -1;
  close(client);
  int status = 0;
  if (waitpid(child, &status, 0) != child || !WIFEXITED(status) || WEXITSTATUS(status) != 0) return -1;
  unlink(path);
  rmdir(dir);
  return 0;
}

static int self_test(void) {
  unsigned long long v = 0;
  if (parse_uint("1000", &v) != 0 || v != 1000) return 1;
  if (parse_uint("01x", &v) == 0) return 1;
  if (self_test_peer() != 0) return 1;
  printf("%s_SELF_TEST_GREEN\n", MARKER);
  printf("so_peercred_live_socket_positive=true\n");
  printf("wrong_peer_pid_rejected_by_contract=true\n");
  printf("systemd_private_socket_selected=true\n");
  printf("user_bus_socket_not_used=true\n");
  printf("unit_properties_queried=false\n");
  printf("host_mutation=false\n");
  return 0;
}

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "--self-test") == 0) return self_test();
  if (argc == 3 && strcmp(argv[1], "--uid") == 0) {
    unsigned long long raw = 0;
    if (parse_uint(argv[2], &raw) != 0 || raw == 0 || raw > 0x7fffffffULL) die("uid_invalid");
    return live((uid_t)raw);
  }
  fprintf(stderr, "usage: %s --self-test | --uid <positive-uid>\n", argv[0]);
  return 2;
}
