#define _GNU_SOURCE
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <signal.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

#define MARKER "VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_HOLD_V1"
#define QUALIFICATION_WINDOW_SECONDS 300U

static volatile sig_atomic_t stop_requested = 0;

static void request_stop(int signo) {
  (void)signo;
  stop_requested = 1;
}

static void hold(const char *reason) {
  fprintf(stderr, "HOLD=%s\n", reason);
  fprintf(stderr, "attempt_claim=false\n");
  fprintf(stderr, "training_execution=false\n");
  fprintf(stderr, "candidate_weight_mutation=false\n");
  fprintf(stderr, "automatic_retry=false\n");
  fprintf(stderr, "automatic_promotion=false\n");
  fprintf(stderr, "deployment=false\n");
  fprintf(stderr, "wallet_or_funds_action=false\n");
  exit(2);
}

static void assert_nonroot_stable_identity(void) {
  if (getuid() == 0 || geteuid() == 0 ||
      getuid() != geteuid() || getgid() != getegid()) {
    hold("apollyon_candidate_training_entrypoint_identity_invalid");
  }
}

static void assert_no_new_privileges(void) {
  errno = 0;
  int value = prctl(PR_GET_NO_NEW_PRIVS, 0, 0, 0, 0);
  if (value != 1) {
    hold("apollyon_candidate_training_entrypoint_no_new_privileges_unproven");
  }
}

static void assert_no_inherited_fds(void) {
  DIR *dir = opendir("/proc/self/fd");
  if (dir == NULL) {
    hold("apollyon_candidate_training_entrypoint_fd_census_failed");
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
    (void)closedir(dir);
    hold("apollyon_candidate_training_entrypoint_inherited_fd_present");
  }
  if (errno != 0) {
    (void)closedir(dir);
    hold("apollyon_candidate_training_entrypoint_fd_census_failed");
  }
  if (closedir(dir) != 0) {
    hold("apollyon_candidate_training_entrypoint_fd_census_close_failed");
  }
}

static void install_signal_handlers(void) {
  struct sigaction action;
  memset(&action, 0, sizeof(action));
  action.sa_handler = request_stop;
  if (sigemptyset(&action.sa_mask) != 0) {
    hold("apollyon_candidate_training_entrypoint_signal_setup_failed");
  }
  if (sigaction(SIGTERM, &action, NULL) != 0 ||
      sigaction(SIGINT, &action, NULL) != 0) {
    hold("apollyon_candidate_training_entrypoint_signal_setup_failed");
  }
}

static int run_self_test(void) {
  if (QUALIFICATION_WINDOW_SECONDS != 300U) {
    return 10;
  }
  puts(MARKER "_SELF_TEST=GREEN");
  puts("fixed_qualification_window_seconds=300");
  puts("requires_nonroot_stable_identity=true");
  puts("requires_no_new_privileges=true");
  puts("requires_no_inherited_fds_ge_3=true");
  puts("durable_attempt_claim_required=true");
  puts("durable_attempt_claim_proven=false");
  puts("training_execution=false");
  puts("candidate_weight_mutation=false");
  puts("automatic_retry=false");
  puts("automatic_promotion=false");
  puts("deployment=false");
  return 0;
}

static void require_nonblocking_fd(int fd, const char *reason) {
  int flags = fcntl(fd, F_GETFL);
  if (flags < 0 || fcntl(fd, F_SETFL, flags | O_NONBLOCK) != 0) {
    hold(reason);
  }
}

static void prepare_observation_io(void) {
  require_nonblocking_fd(
      STDOUT_FILENO,
      "apollyon_candidate_training_entrypoint_stdout_nonblocking_failed");
  require_nonblocking_fd(
      STDERR_FILENO,
      "apollyon_candidate_training_entrypoint_stderr_nonblocking_failed");
}

static void emit_ready(void) {
  static const char payload[] =
      MARKER "\n"
      "status=qualification_hold_active\n"
      "qualification_only=true\n"
      "fixed_qualification_window_seconds=300\n"
      "durable_attempt_claim_required=true\n"
      "durable_attempt_claim_proven=false\n"
      "training_execution_authorized=false\n"
      "training_execution=false\n"
      "candidate_weight_mutation=false\n"
      "automatic_retry=false\n"
      "automatic_promotion=false\n"
      "deployment=false\n"
      "network_api_authority=false\n"
      "wallet_or_funds_action=false\n"
      "void_chain_mutation=false\n";

  ssize_t written = write(STDOUT_FILENO, payload, sizeof(payload) - 1U);
  if (written < 0) {
    if (errno == EAGAIN || errno == EWOULDBLOCK) {
      hold("apollyon_candidate_training_entrypoint_stdout_not_immediately_writable");
    }
    hold("apollyon_candidate_training_entrypoint_stdout_write_failed");
  }
  if ((size_t)written != sizeof(payload) - 1U) {
    hold("apollyon_candidate_training_entrypoint_stdout_short_write");
  }
}

static struct timespec arm_qualification_deadline(void) {
  struct timespec deadline;
  if (clock_gettime(CLOCK_BOOTTIME, &deadline) != 0) {
    hold("apollyon_candidate_training_entrypoint_clock_unavailable");
  }
  if (deadline.tv_sec > (time_t)(LONG_MAX - QUALIFICATION_WINDOW_SECONDS)) {
    hold("apollyon_candidate_training_entrypoint_deadline_overflow");
  }
  deadline.tv_sec += (time_t)QUALIFICATION_WINDOW_SECONDS;
  return deadline;
}

static void qualification_hold(const struct timespec *deadline) {
  while (!stop_requested) {
    int rc = clock_nanosleep(
        CLOCK_BOOTTIME, TIMER_ABSTIME, deadline, NULL);
    if (rc == 0) {
      break;
    }
    if (rc == EINTR) {
      continue;
    }
    errno = rc;
    hold("apollyon_candidate_training_entrypoint_sleep_failed");
  }
}

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "--self-test") == 0) {
    return run_self_test();
  }
  if (argc != 1) {
    hold("apollyon_candidate_training_entrypoint_arguments_invalid");
  }

  assert_nonroot_stable_identity();
  assert_no_new_privileges();
  assert_no_inherited_fds();
  install_signal_handlers();
  prepare_observation_io();
  struct timespec qualification_deadline = arm_qualification_deadline();
  emit_ready();
  qualification_hold(&qualification_deadline);

  hold("apollyon_candidate_training_entrypoint_durable_claim_gate_required");
  return 2;
}
