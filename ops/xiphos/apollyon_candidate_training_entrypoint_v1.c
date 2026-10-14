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
#define QUALIFICATION_TIMER_SIGNAL SIGUSR1

static sigset_t qualification_wait_set;

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

static void prepare_process_safety(void) {
  if (sigemptyset(&qualification_wait_set) != 0 ||
      sigaddset(&qualification_wait_set, SIGTERM) != 0 ||
      sigaddset(&qualification_wait_set, SIGINT) != 0 ||
      sigaddset(&qualification_wait_set, QUALIFICATION_TIMER_SIGNAL) != 0 ||
      sigprocmask(SIG_BLOCK, &qualification_wait_set, NULL) != 0) {
    _exit(2);
  }

  struct sigaction action;
  memset(&action, 0, sizeof(action));
  action.sa_handler = SIG_IGN;
  if (sigemptyset(&action.sa_mask) != 0 ||
      sigaction(SIGPIPE, &action, NULL) != 0) {
    _exit(2);
  }

  int stderr_flags = fcntl(STDERR_FILENO, F_GETFL);
  if (stderr_flags < 0 ||
      fcntl(STDERR_FILENO, F_SETFL, stderr_flags | O_NONBLOCK) != 0) {
    _exit(2);
  }

  require_nonblocking_fd(
      STDOUT_FILENO,
      "apollyon_candidate_training_entrypoint_stdout_nonblocking_failed");
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
    if (errno == EPIPE) {
      hold("apollyon_candidate_training_entrypoint_stdout_reader_closed");
    }
    hold("apollyon_candidate_training_entrypoint_stdout_write_failed");
  }
  if ((size_t)written != sizeof(payload) - 1U) {
    hold("apollyon_candidate_training_entrypoint_stdout_short_write");
  }
}

static timer_t arm_qualification_timer(void) {
  struct timespec deadline;
  if (clock_gettime(CLOCK_BOOTTIME, &deadline) != 0) {
    hold("apollyon_candidate_training_entrypoint_clock_unavailable");
  }
  if (deadline.tv_sec > (time_t)(LONG_MAX - QUALIFICATION_WINDOW_SECONDS)) {
    hold("apollyon_candidate_training_entrypoint_deadline_overflow");
  }
  deadline.tv_sec += (time_t)QUALIFICATION_WINDOW_SECONDS;

  struct sigevent event;
  memset(&event, 0, sizeof(event));
  event.sigev_notify = SIGEV_SIGNAL;
  event.sigev_signo = QUALIFICATION_TIMER_SIGNAL;

  timer_t timer_id;
  if (timer_create(CLOCK_BOOTTIME, &event, &timer_id) != 0) {
    hold("apollyon_candidate_training_entrypoint_timer_create_failed");
  }

  struct itimerspec specification;
  memset(&specification, 0, sizeof(specification));
  specification.it_value = deadline;
  if (timer_settime(timer_id, TIMER_ABSTIME, &specification, NULL) != 0) {
    (void)timer_delete(timer_id);
    hold("apollyon_candidate_training_entrypoint_timer_arm_failed");
  }
  return timer_id;
}

static void delete_qualification_timer(timer_t timer_id) {
  if (timer_delete(timer_id) != 0) {
    hold("apollyon_candidate_training_entrypoint_timer_delete_failed");
  }
}

static void reject_pending_signal_before_ready(timer_t timer_id) {
  const struct timespec zero_timeout = {0, 0};
  for (;;) {
    siginfo_t information;
    memset(&information, 0, sizeof(information));
    int signal_number = sigtimedwait(
        &qualification_wait_set, &information, &zero_timeout);
    if (signal_number < 0 && errno == EAGAIN) {
      return;
    }
    if (signal_number < 0 && errno == EINTR) {
      continue;
    }
    if (signal_number == SIGTERM || signal_number == SIGINT) {
      delete_qualification_timer(timer_id);
      hold("apollyon_candidate_training_entrypoint_stop_requested_before_ready");
    }
    if (signal_number == QUALIFICATION_TIMER_SIGNAL) {
      delete_qualification_timer(timer_id);
      if (information.si_code != SI_TIMER) {
        hold("apollyon_candidate_training_entrypoint_timer_signal_origin_invalid");
      }
      hold("apollyon_candidate_training_entrypoint_deadline_expired_before_ready");
    }
    delete_qualification_timer(timer_id);
    hold("apollyon_candidate_training_entrypoint_signal_wait_failed");
  }
}

static void qualification_hold(timer_t timer_id) {
  for (;;) {
    siginfo_t information;
    memset(&information, 0, sizeof(information));
    int signal_number = sigwaitinfo(&qualification_wait_set, &information);
    if (signal_number == SIGTERM || signal_number == SIGINT) {
      break;
    }
    if (signal_number == QUALIFICATION_TIMER_SIGNAL) {
      if (information.si_code != SI_TIMER) {
        delete_qualification_timer(timer_id);
        hold("apollyon_candidate_training_entrypoint_timer_signal_origin_invalid");
      }
      break;
    }
    if (signal_number < 0 && errno == EINTR) {
      continue;
    }
    delete_qualification_timer(timer_id);
    hold("apollyon_candidate_training_entrypoint_signal_wait_failed");
  }

  delete_qualification_timer(timer_id);
}

int main(int argc, char **argv) {
  prepare_process_safety();

  if (argc == 2 && strcmp(argv[1], "--self-test") == 0) {
    return run_self_test();
  }
  if (argc != 1) {
    hold("apollyon_candidate_training_entrypoint_arguments_invalid");
  }

  assert_nonroot_stable_identity();
  assert_no_new_privileges();
  assert_no_inherited_fds();
  timer_t qualification_timer = arm_qualification_timer();
  reject_pending_signal_before_ready(qualification_timer);
  emit_ready();
  qualification_hold(qualification_timer);

  hold("apollyon_candidate_training_entrypoint_durable_claim_gate_required");
  return 2;
}
