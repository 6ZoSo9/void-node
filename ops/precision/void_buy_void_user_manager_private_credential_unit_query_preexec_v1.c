#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_PREEXEC_V1"
#define ROOT_DIR "/opt/void-buy-void-user-manager-credential-query-v1"
#define SELF_PATH ROOT_DIR "/void_buy_void_user_manager_private_credential_unit_query_preexec_v1"
#define QUERY_PATH ROOT_DIR "/void_buy_void_user_manager_private_credential_unit_query_v1"
#define QUERY_MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1=1"

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

static int self_is_fixed(void) {
  char path[PATH_MAX];
  ssize_t n = readlink("/proc/self/exe", path, sizeof(path) - 1);
  if (n <= 0 || (size_t)n >= sizeof(path) - 1) return -1;
  path[n] = '\0';
  return strcmp(path, SELF_PATH) == 0 ? 0 : -1;
}

static int safe_uid(const char *raw) {
  if (!raw || !*raw) return -1;
  unsigned long long v = 0;
  for (const unsigned char *p = (const unsigned char *)raw; *p; ++p) {
    if (*p < '0' || *p > '9') return -1;
    unsigned long long digit = (unsigned long long)(*p - '0');
    if (v > (0x7fffffffULL - digit) / 10ULL) return -1;
    v = v * 10ULL + digit;
  }
  return v > 0 ? 0 : -1;
}

static int safe_unit(const char *unit) {
  if (!unit) return -1;
  size_t n = strlen(unit);
  if (n < 9 || n > 200 || strcmp(unit + n - 8, ".service") != 0) return -1;
  for (size_t i = 0; i < n; ++i) {
    unsigned char c = (unsigned char)unit[i];
    if (!((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
          (c >= '0' && c <= '9') || c == '_' || c == '.' || c == '@' ||
          c == ':' || c == '-')) return -1;
  }
  return 0;
}

static void exec_query(char *const child_argv[]) {
  if (geteuid() != 0) hold("root_required");
  if (trusted_dir("/") != 0 || trusted_dir("/opt") != 0 ||
      trusted_dir(ROOT_DIR) != 0) hold("trusted_ancestry_invalid");
  if (self_is_fixed() != 0) hold("fixed_preexec_path_required");

  struct stat visible;
  if (trusted_file(QUERY_PATH, &visible) != 0) hold("query_file_custody_invalid");

  int fd = open(QUERY_PATH, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (fd < 0) hold("query_open_failed");
  struct stat opened;
  if (fstat(fd, &opened) != 0 || !same_stat(&visible, &opened)) {
    close(fd);
    hold("query_open_identity_mismatch");
  }

  struct stat visible_after;
  if (lstat(QUERY_PATH, &visible_after) != 0 ||
      !same_stat(&opened, &visible_after)) {
    close(fd);
    hold("query_path_changed_before_exec");
  }

  char *const child_env[] = {
    "PATH=/usr/bin:/bin",
    "LANG=C",
    "LC_ALL=C",
    QUERY_MARKER,
    NULL,
  };

  fexecve(fd, child_argv, child_env);
  int saved = errno;
  close(fd);
  errno = saved;
  hold("query_fexecve_failed");
}

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "--exec-self-test") == 0) {
    char *const child_argv[] = {(char *)QUERY_PATH, "--self-test", NULL};
    exec_query(child_argv);
  }
  if (argc == 5 && strcmp(argv[1], "--uid") == 0 &&
      strcmp(argv[3], "--unit") == 0) {
    if (safe_uid(argv[2]) != 0) hold("uid_invalid");
    if (safe_unit(argv[4]) != 0) hold("unit_invalid");
    char *const child_argv[] = {
      (char *)QUERY_PATH, "--uid", argv[2], "--unit", argv[4], NULL,
    };
    exec_query(child_argv);
  }
  fprintf(stderr,
    "usage: %s --exec-self-test | --uid <positive-uid> --unit <service>\n",
    argv[0]);
  return 2;
}
