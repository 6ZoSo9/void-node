#define _GNU_SOURCE
#include "apollyon_durable_attempt_claim_native_process_identity_v2.h"

#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

extern int apollyon_claim_process_identity_test_parse_status_v2(
  const unsigned char *input,
  size_t input_len,
  uid_t expected_uid,
  gid_t expected_gid,
  const gid_t *expected_supplementary_gids,
  size_t expected_supplementary_gid_count
);

static const unsigned char CHILD_CMDLINE[] =
  "apollyon-claim-native-identity-child\0--hold\0";

static int hook_mode = 0;
static int hook_write_fd = -1;
static pid_t hook_child = -1;
static int hook_exec_observed = 0;

static int sleep_brief(void) {
  struct timespec delay = {.tv_sec = 0, .tv_nsec = 1000000L};
  while (nanosleep(&delay, &delay) != 0) {
    if (errno != EINTR) return -1;
  }
  return 0;
}

int apollyon_claim_process_identity_test_hook_v2(pid_t pid) {
  if (!hook_mode) return 0;
  if (pid != hook_child || hook_write_fd < 0) {
    errno = EINVAL;
    return -1;
  }
  const unsigned char command = 0x45;
  ssize_t n;
  do {
    n = write(hook_write_fd, &command, 1);
  } while (n < 0 && errno == EINTR);
  if (n != 1) return -1;

  struct stat expected;
  if (stat("/bin/sleep", &expected) != 0) return -1;
  char path[128];
  if (snprintf(path, sizeof(path), "/proc/%ld/exe", (long)pid) >= (int)sizeof(path)) {
    errno = ENAMETOOLONG;
    return -1;
  }
  for (int i = 0; i < 500; ++i) {
    struct stat observed;
    if (
      stat(path, &observed) == 0 &&
      observed.st_dev == expected.st_dev &&
      observed.st_ino == expected.st_ino
    ) {
      hook_exec_observed = 1;
      hook_mode = 0;
      return 0;
    }
    if (sleep_brief() != 0) return -1;
  }
  errno = ETIMEDOUT;
  return -1;
}

static int child_mode(void) {
  unsigned char byte = 0;
  ssize_t n;
  do { n = read(3, &byte, 1); } while (n < 0 && errno == EINTR);
  if (n != 1) return 11;
  if (byte == 0x51) return 0;
  if (byte == 0x45) {
    execl("/bin/sleep", "sleep", "30", (char *)NULL);
    return 12;
  }
  return 13;
}

static int wait_zero(pid_t child) {
  int status = 0;
  pid_t got;
  do { got = waitpid(child, &status, 0); } while (got < 0 && errno == EINTR);
  return got == child && WIFEXITED(status) && WEXITSTATUS(status) == 0 ? 0 : -1;
}

static int wait_any(pid_t child) {
  int status = 0;
  pid_t got;
  do { got = waitpid(child, &status, 0); } while (got < 0 && errno == EINTR);
  return got == child ? 0 : -1;
}

static pid_t spawn_child(int *write_fd_out) {
  int pipefd[2];
  if (!write_fd_out || pipe(pipefd) != 0) return -1;
  pid_t child = fork();
  if (child < 0) {
    close(pipefd[0]);
    close(pipefd[1]);
    return -1;
  }
  if (child == 0) {
    close(pipefd[1]);
    if (dup2(pipefd[0], 3) < 0) _exit(30);
    if (pipefd[0] != 3) close(pipefd[0]);
    execl(
      "/proc/self/exe",
      "apollyon-claim-native-identity-child",
      "--hold",
      (char *)NULL
    );
    _exit(31);
  }
  close(pipefd[0]);
  *write_fd_out = pipefd[1];
  return child;
}

static int collect_groups(
  gid_t groups[APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2],
  size_t *count_out
) {
  if (!groups || !count_out) return -1;
  int count = getgroups(
    (int)APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2,
    groups
  );
  if (count < 0) return -1;
  *count_out = (size_t)count;
  return 0;
}

static int parser_adversaries(void) {
  static const unsigned char good[] =
    "Name:\tfixture\n"
    "Uid:\t100\t100\t100\t100\n"
    "Gid:\t200\t200\t200\t200\n"
    "Groups:\t7 9\n";
  static const unsigned char duplicate_observed[] =
    "Uid:\t100\t100\t100\t100\n"
    "Gid:\t200\t200\t200\t200\n"
    "Groups:\t7 7\n";
  static const unsigned char missing_groups[] =
    "Uid:\t100\t100\t100\t100\n"
    "Gid:\t200\t200\t200\t200\n";
  static const unsigned char extra_group[] =
    "Uid:\t100\t100\t100\t100\n"
    "Gid:\t200\t200\t200\t200\n"
    "Groups:\t7 9 11\n";
  static const unsigned char missing_group[] =
    "Uid:\t100\t100\t100\t100\n"
    "Gid:\t200\t200\t200\t200\n"
    "Groups:\t7\n";
  gid_t expected[2] = {9, 7};
  if (
    apollyon_claim_process_identity_test_parse_status_v2(
      good, sizeof(good) - 1, 100, 200, expected, 2
    ) != 0
  ) return 1;
  if (
    apollyon_claim_process_identity_test_parse_status_v2(
      duplicate_observed, sizeof(duplicate_observed) - 1,
      100, 200, expected, 2
    ) == 0
  ) return 2;
  if (
    apollyon_claim_process_identity_test_parse_status_v2(
      missing_groups, sizeof(missing_groups) - 1,
      100, 200, expected, 2
    ) == 0
  ) return 3;
  if (
    apollyon_claim_process_identity_test_parse_status_v2(
      extra_group, sizeof(extra_group) - 1,
      100, 200, expected, 2
    ) == 0
  ) return 4;
  if (
    apollyon_claim_process_identity_test_parse_status_v2(
      missing_group, sizeof(missing_group) - 1,
      100, 200, expected, 2
    ) == 0
  ) return 5;
  gid_t duplicate_expected[2] = {7, 7};
  if (
    apollyon_claim_process_identity_test_parse_status_v2(
      good, sizeof(good) - 1,
      100, 200, duplicate_expected, 2
    ) == 0
  ) return 6;
  if (
    apollyon_claim_process_identity_test_parse_status_v2(
      good, sizeof(good) - 1, 100, 200, NULL, 1
    ) == 0
  ) return 7;
  return 0;
}

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "--hold") == 0) return child_mode();
  if (argc != 2 || strcmp(argv[1], "--self-test") != 0) return 2;
  if (parser_adversaries() != 0) return 19;

  gid_t supplementary[
    APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2
  ];
  size_t supplementary_count = 0;
  if (collect_groups(supplementary, &supplementary_count) != 0) return 20;

  int write_fd = -1;
  pid_t child = spawn_child(&write_fd);
  if (child < 0) return 21;

  int expected_exe = open("/proc/self/exe", O_RDONLY | O_CLOEXEC);
  if (expected_exe < 0) return 22;
  struct apollyon_claim_process_identity_v2 identity;
  int observed = -1;
  for (int i = 0; i < 200; ++i) {
    if (
      apollyon_claim_process_identity_observe_v2(
        child,
        getpid(),
        getuid(),
        getgid(),
        supplementary,
        supplementary_count,
        expected_exe,
        CHILD_CMDLINE,
        sizeof(CHILD_CMDLINE) - 1,
        &identity
      ) == 0
    ) {
      observed = 0;
      break;
    }
    struct timespec delay = {.tv_sec = 0, .tv_nsec = 5000000L};
    nanosleep(&delay, NULL);
  }
  if (observed != 0) return 23;
  if (
    identity.pid != child || identity.ppid != getpid() ||
    identity.uid != getuid() || identity.gid != getgid() ||
    identity.start_ticks < 1 || identity.pidfd < 0 ||
    apollyon_claim_process_identity_pidfd_state_v2(identity.pidfd) != 0
  ) return 24;

  struct apollyon_claim_process_identity_v2 bad;
  if (
    apollyon_claim_process_identity_observe_v2(
      child,
      getpid() + 1,
      getuid(),
      getgid(),
      supplementary,
      supplementary_count,
      expected_exe,
      CHILD_CMDLINE,
      sizeof(CHILD_CMDLINE) - 1,
      &bad
    ) == 0
  ) return 25;

  static const unsigned char WRONG_CMDLINE[] =
    "apollyon-claim-native-identity-child\0--hold\0--extra\0";
  if (
    apollyon_claim_process_identity_observe_v2(
      child,
      getpid(),
      getuid(),
      getgid(),
      supplementary,
      supplementary_count,
      expected_exe,
      WRONG_CMDLINE,
      sizeof(WRONG_CMDLINE) - 1,
      &bad
    ) == 0
  ) return 26;

  int wrong_exe = open("/bin/sleep", O_RDONLY | O_CLOEXEC);
  if (wrong_exe < 0) return 27;
  if (
    apollyon_claim_process_identity_observe_v2(
      child,
      getpid(),
      getuid(),
      getgid(),
      supplementary,
      supplementary_count,
      wrong_exe,
      CHILD_CMDLINE,
      sizeof(CHILD_CMDLINE) - 1,
      &bad
    ) == 0
  ) return 28;
  close(wrong_exe);

  int invalid_pidfd = dup(identity.pidfd);
  if (invalid_pidfd < 0) return 29;
  if (close(invalid_pidfd) != 0) return 30;
  errno = 0;
  if (
    apollyon_claim_process_identity_pidfd_state_v2(invalid_pidfd) != -1 ||
    errno != EBADF
  ) return 31;

  const unsigned char release = 0x51;
  if (write(write_fd, &release, 1) != 1) return 32;
  close(write_fd);
  if (wait_zero(child) != 0) return 33;
  if (apollyon_claim_process_identity_pidfd_state_v2(identity.pidfd) != 1) return 34;
  apollyon_claim_process_identity_close_v2(&identity);

  int drift_write_fd = -1;
  pid_t drift_child = spawn_child(&drift_write_fd);
  if (drift_child < 0) return 35;

  struct apollyon_claim_process_identity_v2 drift_ready;
  int drift_ready_observed = -1;
  for (int i = 0; i < 200; ++i) {
    if (
      apollyon_claim_process_identity_observe_v2(
        drift_child,
        getpid(),
        getuid(),
        getgid(),
        supplementary,
        supplementary_count,
        expected_exe,
        CHILD_CMDLINE,
        sizeof(CHILD_CMDLINE) - 1,
        &drift_ready
      ) == 0
    ) {
      drift_ready_observed = 0;
      break;
    }
    struct timespec delay = {.tv_sec = 0, .tv_nsec = 5000000L};
    nanosleep(&delay, NULL);
  }
  if (drift_ready_observed != 0) return 36;
  apollyon_claim_process_identity_close_v2(&drift_ready);

  hook_mode = 1;
  hook_write_fd = drift_write_fd;
  hook_child = drift_child;
  hook_exec_observed = 0;
  errno = 0;
  if (
    apollyon_claim_process_identity_observe_v2(
      drift_child,
      getpid(),
      getuid(),
      getgid(),
      supplementary,
      supplementary_count,
      expected_exe,
      CHILD_CMDLINE,
      sizeof(CHILD_CMDLINE) - 1,
      &bad
    ) == 0
  ) return 37;
  hook_mode = 0;
  if (!hook_exec_observed) return 38;
  close(drift_write_fd);
  if (kill(drift_child, SIGTERM) != 0 && errno != ESRCH) return 39;
  if (wait_any(drift_child) != 0) return 40;

  close(expected_exe);

  printf("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PROCESS_IDENTITY_V2_SELF_TEST_GREEN\n");
  printf("direct_parent_lineage_primitive_proven=true\n");
  printf("pid_start_generation_bound=true\n");
  printf("all_uid_gid_slots_bound=true\n");
  printf("exact_supplementary_groups_bound=true\n");
  printf("supplementary_group_parser_adversaries=true\n");
  printf("native_executable_inode_identity_bound=true\n");
  printf("raw_cmdline_identity_bound=true\n");
  printf("double_observation_generation_bracketed=true\n");
  printf("exec_in_place_observation_drift_rejected=true\n");
  printf("retained_pidfd_liveness_bound=true\n");
  printf("retained_pidfd_exit_state_bound=true\n");
  printf("invalid_pidfd_rejected=true\n");
  printf("wrong_parent_rejected=true\n");
  printf("wrong_cmdline_rejected=true\n");
  printf("wrong_executable_rejected=true\n");
  printf("cross_uid_host_qualification_performed=false\n");
  printf("interpreted_body_source_identity_proven=false\n");
  printf("host_installation=false\n");
  printf("service_action=false\n");
  printf("claim_store_mutation=false\n");
  printf("durable_attempt_claim=false\n");
  printf("training_execution=false\n");
  return 0;
}
