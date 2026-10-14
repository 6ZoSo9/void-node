#define _GNU_SOURCE
#include <dirent.h>
#include <errno.h>
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

static void emit_ready(void) {
  puts(MARKER);
  puts("status=qualification_hold_active");
  puts("qualification_only=true");
  puts("fixed_qualification_window_seconds=300");
  puts("durable_attempt_claim_required=true");
  puts("durable_attempt_claim_proven=false");
  puts("training_execution_authorized=false");
  puts("training_execution=false");
  puts("candidate_weight_mutation=false");
  puts("automatic_retry=false");
  puts("automatic_promotion=false");
  puts("deployment=false");
  puts("network_api_authority=false");
  puts("wallet_or_funds_action=false");
  puts("void_chain_mutation=false");
  if (fflush(stdout) != 0) {
    hold("apollyon_candidate_training_entrypoint_stdout_flush_failed");
  }
}

static void qualification_hold(void) {
  const struct timespec one_second = {.tv_sec = 1, .tv_nsec = 0};
  for (unsigned int elapsed = 0;
       elapsed < QUALIFICATION_WINDOW_SECONDS && !stop_requested;
       ++elapsed) {
    struct timespec remaining = one_second;
    while (nanosleep(&remaining, &remaining) != 0) {
      if (errno == EINTR) {
        if (stop_requested) {
          break;
        }
        continue;
      }
      hold("apollyon_candidate_training_entrypoint_sleep_failed");
    }
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
  emit_ready();
  qualification_hold();

  hold("apollyon_candidate_training_entrypoint_durable_claim_gate_required");
  return 2;
}
