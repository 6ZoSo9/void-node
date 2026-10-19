#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define MARKER "VOID_CLOUDFLARE_HISTORICAL_USER_TUNNEL_RETIREMENT_PREEXEC_V2"
#define ROOT_DIR "/opt/void-cloudflare-user-tunnel-retirement-query-v2"
#define SELF_PATH ROOT_DIR "/void_cloudflare_historical_user_tunnel_retirement_preexec_v2"
#define QUERY_PATH ROOT_DIR "/void_cloudflare_historical_user_tunnel_retirement_query_v2"
#define QUERY_MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1=1"
#define PROOF_FD_NAME "VOID_CLOUDFLARE_RETIREMENT_PREEXEC_PROOF_FD"
#define PROOF_MAGIC "VOID_CLOUDFLARE_RETIREMENT_PREEXEC_PROOF_V1"

static void hold(const char *reason) {
  fprintf(stderr, "%s_HOLD\nreason=%s\n", MARKER, reason);
  _exit(2);
}

static int trusted_dir(const char *path) {
  struct stat st;
  if (lstat(path, &st) != 0 || !S_ISDIR(st.st_mode) || S_ISLNK(st.st_mode) ||
      st.st_uid != 0 || (st.st_mode & 0022) != 0) return -1;
  return 0;
}

static int trusted_file(const char *path, struct stat *out) {
  struct stat st;
  if (lstat(path, &st) != 0 || !S_ISREG(st.st_mode) || S_ISLNK(st.st_mode) ||
      st.st_uid != 0 || (st.st_mode & 0022) != 0 || (st.st_mode & 0111) == 0 ||
      st.st_nlink != 1 || st.st_size <= 0) return -1;
  if (out) *out = st;
  return 0;
}

static int same_stat(const struct stat *a, const struct stat *b) {
  return a->st_dev == b->st_dev && a->st_ino == b->st_ino &&
         a->st_uid == b->st_uid && a->st_gid == b->st_gid &&
         a->st_mode == b->st_mode && a->st_nlink == b->st_nlink &&
         a->st_size == b->st_size;
}

static int running_self(struct stat *out) {
  char path[PATH_MAX];
  ssize_t n = readlink("/proc/self/exe", path, sizeof(path) - 1);
  if (n <= 0 || (size_t)n >= sizeof(path) - 1) return -1;
  path[n] = '\0';
  if (strcmp(path, SELF_PATH) != 0) return -1;
  struct stat visible, running;
  if (trusted_file(SELF_PATH, &visible) != 0 ||
      stat("/proc/self/exe", &running) != 0 ||
      !same_stat(&visible, &running)) return -1;
  if (out) *out = running;
  return 0;
}

static int safe_uid(const char *raw) {
  if (!raw || !*raw) return -1;
  unsigned long long value = 0;
  for (const unsigned char *p = (const unsigned char *)raw; *p; ++p) {
    if (*p < '0' || *p > '9') return -1;
    value = value * 10ULL + (unsigned long long)(*p - '0');
    if (value > 0x7fffffffULL) return -1;
  }
  return value > 0 ? 0 : -1;
}

static int write_all(int fd, const char *buf, size_t len) {
  size_t off = 0;
  while (off < len) {
    ssize_t n = write(fd, buf + off, len - off);
    if (n > 0) {
      off += (size_t)n;
      continue;
    }
    if (n < 0 && errno == EINTR) continue;
    return -1;
  }
  return 0;
}

static int wait_child(pid_t child) {
  int status = 0;
  for (;;) {
    pid_t got = waitpid(child, &status, 0);
    if (got == child) break;
    if (got < 0 && errno == EINTR) continue;
    hold("child_wait_failed");
  }
  if (WIFEXITED(status)) return WEXITSTATUS(status);
  hold("query_child_signaled");
  return 2;
}

static int launch_query(char *const child_argv[]) {
  if (geteuid() != 0) hold("root_required");
  if (trusted_dir("/") != 0 || trusted_dir("/opt") != 0 ||
      trusted_dir(ROOT_DIR) != 0) hold("trusted_ancestry_invalid");

  struct stat self_st;
  if (running_self(&self_st) != 0) hold("fixed_preexec_generation_required");

  struct stat query_visible;
  if (trusted_file(QUERY_PATH, &query_visible) != 0)
    hold("query_file_custody_invalid");

  int query_fd = open(QUERY_PATH, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (query_fd < 0) hold("query_open_failed");
  struct stat query_opened;
  if (fstat(query_fd, &query_opened) != 0 ||
      !same_stat(&query_visible, &query_opened)) {
    close(query_fd);
    hold("query_open_identity_mismatch");
  }
  struct stat query_after;
  if (lstat(QUERY_PATH, &query_after) != 0 ||
      !same_stat(&query_opened, &query_after)) {
    close(query_fd);
    hold("query_path_changed_before_fork");
  }

  int proof_pipe[2] = {-1, -1};
  if (pipe2(proof_pipe, O_CLOEXEC) != 0) {
    close(query_fd);
    hold("proof_pipe_failed");
  }

  pid_t child = fork();
  if (child < 0) {
    close(proof_pipe[0]);
    close(proof_pipe[1]);
    close(query_fd);
    hold("query_fork_failed");
  }

  if (child == 0) {
    close(proof_pipe[1]);
    int fd_flags = fcntl(proof_pipe[0], F_GETFD);
    if (fd_flags < 0 ||
        fcntl(proof_pipe[0], F_SETFD, fd_flags & ~FD_CLOEXEC) != 0) {
      close(proof_pipe[0]);
      close(query_fd);
      hold("proof_fd_inheritance_failed");
    }
    char proof_env[96];
    if (snprintf(
          proof_env, sizeof(proof_env), "%s=%d",
          PROOF_FD_NAME, proof_pipe[0]) >= (int)sizeof(proof_env)) {
      close(proof_pipe[0]);
      close(query_fd);
      hold("proof_fd_environment_invalid");
    }
    char *const child_env[] = {
      "PATH=/usr/bin:/bin",
      "LANG=C",
      "LC_ALL=C",
      QUERY_MARKER,
      proof_env,
      NULL,
    };
    fexecve(query_fd, child_argv, child_env);
    int saved = errno;
    close(proof_pipe[0]);
    close(query_fd);
    errno = saved;
    hold("query_fexecve_failed");
  }

  close(proof_pipe[0]);
  close(query_fd);

  char record[512];
  int n = snprintf(
    record, sizeof(record),
    PROOF_MAGIC "\n"
    "parent_pid=%ld\n"
    "child_pid=%ld\n"
    "preexec_dev=%llu\n"
    "preexec_ino=%llu\n"
    "query_dev=%llu\n"
    "query_ino=%llu\n",
    (long)getpid(), (long)child,
    (unsigned long long)self_st.st_dev,
    (unsigned long long)self_st.st_ino,
    (unsigned long long)query_opened.st_dev,
    (unsigned long long)query_opened.st_ino);
  if (n <= 0 || (size_t)n >= sizeof(record) ||
      write_all(proof_pipe[1], record, (size_t)n) != 0) {
    close(proof_pipe[1]);
    (void)kill(child, SIGKILL);
    (void)waitpid(child, NULL, 0);
    hold("proof_write_failed");
  }
  close(proof_pipe[1]);
  return wait_child(child);
}

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "--exec-self-test") == 0) {
    char *const child_argv[] = {(char *)QUERY_PATH, "--self-test", NULL};
    return launch_query(child_argv);
  }
  if (argc == 3 && strcmp(argv[1], "--uid") == 0) {
    if (safe_uid(argv[2]) != 0) hold("uid_invalid");
    char *const child_argv[] = {
      (char *)QUERY_PATH, "--uid", argv[2], NULL,
    };
    return launch_query(child_argv);
  }
  fprintf(stderr,
    "usage: %s --exec-self-test | --uid <positive-uid>\n", argv[0]);
  return 2;
}
