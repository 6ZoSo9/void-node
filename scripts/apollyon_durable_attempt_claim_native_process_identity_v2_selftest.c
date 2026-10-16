#define _GNU_SOURCE
#include "apollyon_durable_attempt_claim_native_process_identity_v2.h"

#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static const unsigned char CHILD_CMDLINE[] =
  "apollyon-claim-native-identity-child\0--hold\0";

static int child_mode(void) {
  unsigned char byte = 0;
  ssize_t n;
  do { n = read(3, &byte, 1); } while (n < 0 && errno == EINTR);
  return n == 1 && byte == 0x51 ? 0 : 11;
}

static int wait_zero(pid_t child) {
  int status = 0;
  pid_t got;
  do { got = waitpid(child, &status, 0); } while (got < 0 && errno == EINTR);
  return got == child && WIFEXITED(status) && WEXITSTATUS(status) == 0 ? 0 : -1;
}

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "--hold") == 0) return child_mode();
  if (argc != 2 || strcmp(argv[1], "--self-test") != 0) return 2;

  int pipefd[2];
  if (pipe(pipefd) != 0) return 20;
  pid_t child = fork();
  if (child < 0) return 21;
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
      wrong_exe,
      CHILD_CMDLINE,
      sizeof(CHILD_CMDLINE) - 1,
      &bad
    ) == 0
  ) return 28;
  close(wrong_exe);

  const unsigned char release = 0x51;
  if (write(pipefd[1], &release, 1) != 1) return 29;
  close(pipefd[1]);
  if (wait_zero(child) != 0) return 30;
  if (apollyon_claim_process_identity_pidfd_state_v2(identity.pidfd) != 1) return 31;
  apollyon_claim_process_identity_close_v2(&identity);
  close(expected_exe);

  printf("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PROCESS_IDENTITY_V2_SELF_TEST_GREEN\n");
  printf("direct_parent_lineage_primitive_proven=true\n");
  printf("pid_start_generation_bound=true\n");
  printf("all_uid_gid_slots_bound=true\n");
  printf("native_executable_inode_identity_bound=true\n");
  printf("raw_cmdline_identity_bound=true\n");
  printf("retained_pidfd_liveness_bound=true\n");
  printf("retained_pidfd_exit_state_bound=true\n");
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
