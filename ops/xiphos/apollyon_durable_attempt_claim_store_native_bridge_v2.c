#define _GNU_SOURCE
#include "apollyon_durable_attempt_claim_native_process_identity_v2.h"

#include <node_api.h>

#include <dlfcn.h>
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <link.h>
#include <linux/magic.h>
#include <poll.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/vfs.h>
#include <time.h>
#include <unistd.h>

#define PUBLISHER_INPUT_FD 3
#define MAX_REQUEST_BYTES 65536U
#define PIPE_DEADLINE_SECONDS 5
#define MAX_CLEANUP_ERRORS 4U

/* Shared by all Node environments loading this canonical addon image. A failed
 * attempt consumes the request too: a partial pipe frame must never be retried.
 * This does not confer custody over arbitrary other code in the Node process. */
static atomic_flag publisher_pipe_attempted = ATOMIC_FLAG_INIT;

static const napi_type_tag peer_type_tag = {
  UINT64_C(0x894f6c89b3d34a1d), UINT64_C(0xa865232adb295afa)
};

struct cleanup_error {
  const char *resource;
  const char *code;
  int error_number;
};

struct failure {
  const char *code;
  const char *message;
  int error_number;
  napi_status api_status;
  struct cleanup_error cleanup[MAX_CLEANUP_ERRORS];
  size_t cleanup_count;
};

struct owned_descriptor {
  int fd;
  int has_identity;
  struct stat identity;
};

struct environment;

struct peer_handle {
  struct environment *owner;
  struct peer_handle *previous;
  struct peer_handle *next;
  int closed;
  struct failure close_failure;
  struct owned_descriptor socket;
  struct owned_descriptor executable;
  struct owned_descriptor pidfd;
  struct ucred credentials;
  struct apollyon_claim_process_identity_v2 identity;
  gid_t groups[APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2];
  size_t group_count;
  unsigned char *cmdline;
  size_t cmdline_length;
};

struct environment {
  napi_env env;
  int closing;
  size_t references;
  struct peer_handle *handles;
};

static void fail(
  struct failure *failure,
  const char *code,
  const char *message,
  int error_number
) {
  if (failure->code) return;
  failure->code = code;
  failure->message = message;
  failure->error_number = error_number;
}

static int check_api(napi_status status, struct failure *failure) {
  if (status == napi_ok) return 0;
  fail(failure, "APOLLYON_NATIVE_NAPI_FAILURE", "Node-API operation failed", EIO);
  failure->api_status = status;
  return -1;
}

static int define_data(
  napi_env env,
  napi_value object,
  const char *name,
  napi_value value
) {
  const napi_property_descriptor property = {
    .utf8name = name,
    .value = value,
    .attributes = napi_enumerable
  };
  return napi_define_properties(env, object, 1, &property) == napi_ok ? 0 : -1;
}

static int define_string(
  napi_env env,
  napi_value object,
  const char *name,
  const char *value
) {
  napi_value string;
  if (napi_create_string_utf8(env, value, NAPI_AUTO_LENGTH, &string) != napi_ok) {
    return -1;
  }
  return define_data(env, object, name, string);
}

static int define_number(
  napi_env env,
  napi_value object,
  const char *name,
  int value
) {
  napi_value number;
  if (napi_create_int32(env, value, &number) != napi_ok) return -1;
  return define_data(env, object, name, number);
}

static napi_value throw_failure(napi_env env, const struct failure *failure) {
  napi_value cause = NULL;
  bool pending = false;
  if (napi_is_exception_pending(env, &pending) != napi_ok) return NULL;
  if (pending && napi_get_and_clear_last_exception(env, &cause) != napi_ok) {
    return NULL;
  }
  napi_value code;
  napi_value message;
  napi_value error;
  napi_value cleanup;
  if (
    napi_create_string_utf8(env, failure->code, NAPI_AUTO_LENGTH, &code) != napi_ok ||
    napi_create_string_utf8(
      env, failure->message, NAPI_AUTO_LENGTH, &message
    ) != napi_ok ||
    napi_create_error(env, code, message, &error) != napi_ok ||
    define_number(env, error, "errno", failure->error_number) != 0 ||
    napi_create_array_with_length(env, failure->cleanup_count, &cleanup) != napi_ok
  ) goto reporting_failed;
  for (size_t i = 0; i < failure->cleanup_count; ++i) {
    napi_value row;
    if (
      napi_create_object(env, &row) != napi_ok ||
      define_string(env, row, "resource", failure->cleanup[i].resource) != 0 ||
      define_string(env, row, "code", failure->cleanup[i].code) != 0 ||
      define_number(env, row, "errno", failure->cleanup[i].error_number) != 0 ||
      napi_object_freeze(env, row) != napi_ok ||
      napi_set_element(env, cleanup, (uint32_t)i, row) != napi_ok
    ) goto reporting_failed;
  }
  if (
    napi_object_freeze(env, cleanup) != napi_ok ||
    define_data(env, error, "cleanup_errors", cleanup) != 0 ||
    (cause && define_data(env, error, "cause", cause) != 0) ||
    (failure->api_status != napi_ok &&
      define_number(env, error, "napi_status", (int)failure->api_status) != 0) ||
    napi_object_freeze(env, error) != napi_ok ||
    napi_throw(env, error) != napi_ok
  ) goto reporting_failed;
  return NULL;

reporting_failed:
  /* No authority result is returned when even error allocation fails. */
  if (napi_is_exception_pending(env, &pending) == napi_ok && !pending) {
    if (cause) (void)napi_throw(env, cause);
    else (void)napi_throw_error(
      env, "APOLLYON_NATIVE_NAPI_FAILURE", "Native error reporting failed"
    );
  }
  return NULL;
}

static int same_object(const struct stat *a, const struct stat *b) {
  return a->st_dev == b->st_dev && a->st_ino == b->st_ino &&
    (a->st_mode & S_IFMT) == (b->st_mode & S_IFMT);
}

static int same_identity(const struct stat *a, const struct stat *b) {
  return same_object(a, b) && a->st_mode == b->st_mode &&
    a->st_uid == b->st_uid && a->st_gid == b->st_gid &&
    a->st_nlink == b->st_nlink;
}

static int same_executable(const struct stat *a, const struct stat *b) {
  return same_identity(a, b) && a->st_size == b->st_size &&
    a->st_mtim.tv_sec == b->st_mtim.tv_sec &&
    a->st_mtim.tv_nsec == b->st_mtim.tv_nsec &&
    a->st_ctim.tv_sec == b->st_ctim.tv_sec &&
    a->st_ctim.tv_nsec == b->st_ctim.tv_nsec;
}

static void cleanup_error(
  struct failure *failure,
  const char *resource,
  const char *code,
  int error_number
) {
  fail(failure, code, "Native descriptor cleanup failed", error_number);
  /* At most the temporary pidfd and three retained descriptors are owned. */
  if (failure->cleanup_count < MAX_CLEANUP_ERRORS) {
    failure->cleanup[failure->cleanup_count++] = (struct cleanup_error){
      .resource = resource, .code = code, .error_number = error_number
    };
  }
}

static void close_descriptor(
  struct owned_descriptor *descriptor,
  const char *resource,
  struct failure *failure
) {
  const int fd = descriptor->fd;
  descriptor->fd = -1;
  if (fd < 0) return;
  if (descriptor->has_identity) {
    struct stat current;
    if (fstat(fd, &current) != 0) {
      cleanup_error(failure, resource, "APOLLYON_NATIVE_FD_IDENTITY", errno);
      return;
    }
    if (!same_object(&descriptor->identity, &current)) {
      /* A detected replacement is not ours to close. Do not retry the number. */
      cleanup_error(failure, resource, "APOLLYON_NATIVE_FD_IDENTITY", ESTALE);
      return;
    }
  }
  if (close(fd) != 0) {
    /* Linux can release the descriptor even on EINTR. Never retry close. */
    cleanup_error(failure, resource, "APOLLYON_NATIVE_CLOSE_FAILED", errno);
  }
}

static int descriptor_identity(
  const struct owned_descriptor *descriptor,
  int executable,
  struct failure *failure
) {
  struct stat current;
  if (descriptor->fd < 0 || fstat(descriptor->fd, &current) != 0) {
    fail(failure, "APOLLYON_NATIVE_FD_IDENTITY", "Retained descriptor is unavailable",
      descriptor->fd < 0 ? EBADF : errno);
    return -1;
  }
  if (
    !descriptor->has_identity ||
    !(executable ? same_executable(&descriptor->identity, &current) :
      same_identity(&descriptor->identity, &current))
  ) {
    fail(failure, "APOLLYON_NATIVE_FD_IDENTITY", "Retained descriptor identity changed",
      ESTALE);
    return -1;
  }
  const int flags = fcntl(descriptor->fd, F_GETFD);
  if (flags < 0 || (flags & FD_CLOEXEC) == 0) {
    fail(failure, "APOLLYON_NATIVE_FD_IDENTITY", "Retained descriptor flags changed",
      flags < 0 ? errno : ESTALE);
    return -1;
  }
  return 0;
}

static int duplicate_descriptor(
  int borrowed_fd,
  const struct stat *expected,
  int executable,
  struct owned_descriptor *owned,
  struct failure *failure
) {
  struct stat before;
  struct stat after;
  if (fstat(borrowed_fd, &before) != 0) {
    fail(failure, "APOLLYON_NATIVE_FD_IDENTITY", "Borrowed descriptor is unavailable", errno);
    return -1;
  }
  if (!(executable ? same_executable(expected, &before) : same_identity(expected, &before))) {
    fail(failure, "APOLLYON_NATIVE_FD_IDENTITY", "Borrowed descriptor identity changed", ESTALE);
    return -1;
  }
  owned->fd = fcntl(borrowed_fd, F_DUPFD_CLOEXEC, PUBLISHER_INPUT_FD + 1);
  if (owned->fd < 0) {
    fail(failure, "APOLLYON_NATIVE_DESCRIPTOR_DUPLICATION", "Descriptor duplication failed", errno);
    return -1;
  }
  if (fstat(owned->fd, &owned->identity) != 0) {
    fail(failure, "APOLLYON_NATIVE_FD_IDENTITY", "Private descriptor identity is unavailable", errno);
    return -1;
  }
  owned->has_identity = 1;
  if (fstat(borrowed_fd, &after) != 0) {
    fail(failure, "APOLLYON_NATIVE_FD_IDENTITY", "Borrowed descriptor changed during duplication", errno);
    return -1;
  }
  if (
    !(executable ? same_executable(expected, &after) : same_identity(expected, &after)) ||
    !(executable ? same_executable(expected, &owned->identity) :
      same_identity(expected, &owned->identity))
  ) {
    fail(failure, "APOLLYON_NATIVE_FD_IDENTITY", "Descriptor identity changed during duplication", ESTALE);
    return -1;
  }
  return descriptor_identity(owned, executable, failure);
}

static int arguments(
  napi_env env,
  napi_callback_info info,
  size_t expected_count,
  napi_value *values,
  struct environment **owner,
  struct failure *failure
) {
  size_t count = expected_count + 1;
  void *data = NULL;
  if (check_api(napi_get_cb_info(env, info, &count, values, NULL, &data), failure) != 0) {
    return -1;
  }
  if (count != expected_count) {
    fail(failure, "APOLLYON_NATIVE_INVALID_ARGUMENT", "Unexpected native argument count", EINVAL);
    return -1;
  }
  *owner = data;
  if (!*owner || (*owner)->env != env || (*owner)->closing) {
    fail(failure, "APOLLYON_NATIVE_ENV_CLOSED", "Native environment is closed", ESHUTDOWN);
    return -1;
  }
  return 0;
}

static int unsigned_argument(
  napi_env env,
  napi_value value,
  uint32_t minimum,
  uint32_t maximum,
  uint32_t *out,
  struct failure *failure
) {
  napi_valuetype type;
  double number;
  if (check_api(napi_typeof(env, value, &type), failure) != 0) return -1;
  if (type != napi_number) goto invalid;
  if (check_api(napi_get_value_double(env, value, &number), failure) != 0) return -1;
  if (!(number >= minimum && number <= maximum) || number != (double)(uint32_t)number) {
    goto invalid;
  }
  *out = (uint32_t)number;
  return 0;
invalid:
  fail(failure, "APOLLYON_NATIVE_INVALID_ARGUMENT", "Native integer argument is invalid", EINVAL);
  return -1;
}

static int pipe_descriptor(int fd, struct stat *identity, struct failure *failure) {
  struct statfs filesystem;
  if (fstat(fd, identity) != 0 || fstatfs(fd, &filesystem) != 0) {
    fail(failure, "APOLLYON_NATIVE_PIPE_DESCRIPTOR", "Inherited pipe descriptor is unavailable", errno);
    return -1;
  }
  const int flags = fcntl(fd, F_GETFL);
  if (flags < 0) {
    fail(failure, "APOLLYON_NATIVE_PIPE_DESCRIPTOR", "Inherited pipe flags are unavailable", errno);
    return -1;
  }
  if (
    !S_ISFIFO(identity->st_mode) || filesystem.f_type != PIPEFS_MAGIC ||
    (flags & O_ACCMODE) != O_RDONLY || (flags & O_NONBLOCK) == 0 ||
    (flags & O_PATH) != 0
  ) {
    fail(failure, "APOLLYON_NATIVE_PIPE_DESCRIPTOR",
      "Inherited FD3 must be a nonblocking read-only anonymous pipe", EINVAL);
    return -1;
  }
  return 0;
}

static int pipe_remaining_ms(const struct timespec *deadline, struct failure *failure) {
  struct timespec now;
  if (clock_gettime(CLOCK_MONOTONIC, &now) != 0) {
    fail(failure, "APOLLYON_NATIVE_CLOCK_FAILED", "Monotonic clock read failed", errno);
    return -1;
  }
  const int64_t remaining =
    ((int64_t)deadline->tv_sec - (int64_t)now.tv_sec) * INT64_C(1000000000) +
    (int64_t)deadline->tv_nsec - (int64_t)now.tv_nsec;
  if (remaining <= 0) {
    fail(failure, "APOLLYON_NATIVE_PIPE_TIMEOUT", "Inherited pipe did not reach bounded EOF", ETIMEDOUT);
    return -1;
  }
  const int64_t milliseconds = (remaining + INT64_C(999999)) / INT64_C(1000000);
  return milliseconds > PIPE_DEADLINE_SECONDS * 1000 ?
    PIPE_DEADLINE_SECONDS * 1000 : (int)milliseconds;
}

static napi_value read_inherited_publisher_request(napi_env env, napi_callback_info info) {
  struct failure failure = {0};
  struct owned_descriptor input = {.fd = -1};
  struct environment *owner = NULL;
  napi_value values[1];
  napi_value output = NULL;
  unsigned char *bytes = NULL;
  size_t length = 0;
  struct stat initial;
  struct stat current;
  struct timespec deadline;
  if (atomic_flag_test_and_set_explicit(&publisher_pipe_attempted, memory_order_relaxed)) {
    fail(&failure, "APOLLYON_NATIVE_PIPE_ALREADY_ATTEMPTED",
      "Inherited publisher request was already attempted in this process", EALREADY);
    goto done;
  }
  if (arguments(env, info, 0, values, &owner, &failure) != 0) goto done;
  if (clock_gettime(CLOCK_MONOTONIC, &deadline) != 0) {
    fail(&failure, "APOLLYON_NATIVE_CLOCK_FAILED", "Monotonic clock read failed", errno);
    goto done;
  }
  deadline.tv_sec += PIPE_DEADLINE_SECONDS;
  if (
    pipe_descriptor(PUBLISHER_INPUT_FD, &initial, &failure) != 0 ||
    duplicate_descriptor(PUBLISHER_INPUT_FD, &initial, 0, &input, &failure) != 0 ||
    pipe_descriptor(input.fd, &current, &failure) != 0 ||
    pipe_descriptor(PUBLISHER_INPUT_FD, &current, &failure) != 0
  ) goto done;
  if (!same_identity(&initial, &current)) {
    fail(&failure, "APOLLYON_NATIVE_PIPE_IDENTITY", "Inherited pipe identity changed", ESTALE);
    goto done;
  }
  bytes = malloc(MAX_REQUEST_BYTES + 1U);
  if (!bytes) {
    fail(&failure, "APOLLYON_NATIVE_ALLOCATION", "Request buffer allocation failed", ENOMEM);
    goto done;
  }
  for (;;) {
    const int remaining_ms = pipe_remaining_ms(&deadline, &failure);
    if (remaining_ms < 0) goto done;
    /* dup shares the open-file-description flags. The inherited-FD owner must
     * preserve O_NONBLOCK for this synchronous call; never change shared flags
     * here. Recheck observed flag/identity drift before each bounded read. */
    if (pipe_descriptor(input.fd, &current, &failure) != 0) goto done;
    if (!same_identity(&initial, &current)) {
      fail(&failure, "APOLLYON_NATIVE_PIPE_IDENTITY", "Private pipe identity changed", ESTALE);
      goto done;
    }
    const ssize_t count = read(input.fd, bytes + length, MAX_REQUEST_BYTES + 1U - length);
    if (count > 0) {
      length += (size_t)count;
      if (length > MAX_REQUEST_BYTES) {
        fail(&failure, "APOLLYON_NATIVE_PIPE_TOO_LARGE", "Inherited request exceeds byte limit", EMSGSIZE);
        goto done;
      }
      continue;
    }
    if (count == 0) break;
    if (errno == EINTR) continue;
    if (errno != EAGAIN && errno != EWOULDBLOCK) {
      fail(&failure, "APOLLYON_NATIVE_PIPE_IO", "Inherited pipe read failed", errno);
      goto done;
    }
    struct pollfd wait = {.fd = input.fd, .events = POLLIN};
    const int result = poll(&wait, 1, remaining_ms);
    if (result < 0 && errno == EINTR) continue;
    if (result < 0) {
      fail(&failure, "APOLLYON_NATIVE_PIPE_IO", "Inherited pipe poll failed", errno);
      goto done;
    }
    if (result == 0) continue;
    if ((wait.revents & (short)~(POLLIN | POLLHUP)) != 0 || wait.revents == 0) {
      fail(&failure, "APOLLYON_NATIVE_PIPE_IO", "Inherited pipe poll state is invalid", EIO);
      goto done;
    }
  }
  if (
    pipe_remaining_ms(&deadline, &failure) < 0 ||
    pipe_descriptor(input.fd, &current, &failure) != 0 ||
    descriptor_identity(&input, 0, &failure) != 0
  ) goto done;
  if (!same_identity(&initial, &current)) {
    fail(&failure, "APOLLYON_NATIVE_PIPE_IDENTITY", "Private pipe identity changed", ESTALE);
  }

done:
  close_descriptor(&input, "publisher_pipe", &failure);
  if (!failure.code) {
    (void)check_api(napi_create_buffer_copy(env, length, bytes, NULL, &output), &failure);
  }
  free(bytes);
  return failure.code ? throw_failure(env, &failure) : output;
}

static int socket_credentials(int fd, struct ucred *credentials, struct failure *failure) {
  int domain = 0;
  int type = 0;
  int accepting = 0;
  socklen_t length = sizeof(int);
  if (getsockopt(fd, SOL_SOCKET, SO_DOMAIN, &domain, &length) != 0 || length != sizeof(int)) {
    goto system_error;
  }
  length = sizeof(int);
  if (getsockopt(fd, SOL_SOCKET, SO_TYPE, &type, &length) != 0 || length != sizeof(int)) {
    goto system_error;
  }
  length = sizeof(int);
  if (getsockopt(fd, SOL_SOCKET, SO_ACCEPTCONN, &accepting, &length) != 0 || length != sizeof(int)) {
    goto system_error;
  }
  struct sockaddr_storage address;
  memset(&address, 0, sizeof(address));
  length = sizeof(address);
  if (getpeername(fd, (struct sockaddr *)&address, &length) != 0) goto system_error;
  if (
    domain != AF_UNIX || type != SOCK_STREAM || accepting != 0 ||
    length < sizeof(sa_family_t) || length > sizeof(address) ||
    address.ss_family != AF_UNIX
  ) {
    fail(failure, "APOLLYON_NATIVE_PEER_DESCRIPTOR", "Peer must be a connected Unix stream socket", EINVAL);
    return -1;
  }
  length = sizeof(*credentials);
  if (getsockopt(fd, SOL_SOCKET, SO_PEERCRED, credentials, &length) != 0) goto system_error;
  if (length != sizeof(*credentials) || credentials->pid <= 1) {
    fail(failure, "APOLLYON_NATIVE_PEER_DESCRIPTOR", "Kernel peer credentials are invalid", EPROTO);
    return -1;
  }
  /* The request sender normally SHUT_WRs to delimit its frame. That half-close
   * preserves the acknowledgement direction; only a full transport failure is
   * terminal here. Process liveness comes from the retained pidfd. */
  struct pollfd transport = {.fd = fd, .events = 0};
  const int ready = poll(&transport, 1, 0);
  if (ready < 0) goto system_error;
  if (ready != 0 || transport.revents != 0) {
    fail(failure, "APOLLYON_NATIVE_PEER_TRANSPORT", "Connected peer transport is no longer live", ECONNRESET);
    return -1;
  }
  return 0;
system_error:
  fail(failure, "APOLLYON_NATIVE_PEER_DESCRIPTOR", "Connected peer descriptor check failed", errno ? errno : EPROTO);
  return -1;
}

static int same_credentials(const struct ucred *a, const struct ucred *b) {
  return a->pid == b->pid && a->uid == b->uid && a->gid == b->gid;
}

static int peer_bracket(struct peer_handle *handle, struct failure *failure) {
  struct ucred current;
  if (
    descriptor_identity(&handle->socket, 0, failure) != 0 ||
    descriptor_identity(&handle->executable, 1, failure) != 0 ||
    descriptor_identity(&handle->pidfd, 0, failure) != 0 ||
    socket_credentials(handle->socket.fd, &current, failure) != 0
  ) return -1;
  if (!same_credentials(&handle->credentials, &current)) {
    fail(failure, "APOLLYON_NATIVE_PEER_IDENTITY", "Kernel peer credentials changed", ESTALE);
    return -1;
  }
  const int state = apollyon_claim_process_identity_pidfd_state_v2(handle->pidfd.fd);
  if (state != 0) {
    fail(failure, state > 0 ? "APOLLYON_NATIVE_PEER_EXITED" : "APOLLYON_NATIVE_PEER_IDENTITY",
      "Retained peer process generation is not live", state > 0 ? ESRCH : errno);
    return -1;
  }
  return 0;
}

static void close_peer(struct peer_handle *handle, struct failure *failure) {
  if (handle->closed) return;
  handle->closed = 1;
  struct failure cleanup = {0};
  close_descriptor(&handle->pidfd, "peer_pidfd", &cleanup);
  handle->identity.pidfd = -1;
  close_descriptor(&handle->executable, "peer_executable", &cleanup);
  close_descriptor(&handle->socket, "peer_socket", &cleanup);
  free(handle->cmdline);
  handle->cmdline = NULL;
  handle->cmdline_length = 0;
  handle->close_failure = cleanup;
  for (size_t i = 0; i < cleanup.cleanup_count; ++i) {
    cleanup_error(failure, cleanup.cleanup[i].resource, cleanup.cleanup[i].code,
      cleanup.cleanup[i].error_number);
  }
}

static void finalize_peer(napi_env env, void *data, void *hint) {
  (void)env;
  (void)hint;
  struct peer_handle *handle = data;
  struct environment *owner = handle->owner;
  if (handle->previous) handle->previous->next = handle->next;
  else owner->handles = handle->next;
  if (handle->next) handle->next->previous = handle->previous;
  struct failure ignored = {0};
  close_peer(handle, &ignored);
  free(handle);
  if (--owner->references == 0) free(owner);
}

static void cleanup_environment(void *data) {
  struct environment *owner = data;
  owner->closing = 1;
  owner->env = NULL;
  /* Finalization is fallback cleanup only; it never returns a success receipt.
   * Explicit close/revalidation reports every owned-descriptor cleanup error. */
  for (struct peer_handle *handle = owner->handles; handle; handle = handle->next) {
    struct failure ignored = {0};
    close_peer(handle, &ignored);
  }
  if (--owner->references == 0) free(owner);
}

static napi_value open_peer_identity(napi_env env, napi_callback_info info) {
  struct failure failure = {0};
  struct environment *owner = NULL;
  struct peer_handle *handle = NULL;
  napi_value values[8];
  napi_value output = NULL;
  uint32_t socket_fd;
  uint32_t executable_fd;
  uint32_t ppid;
  uint32_t uid;
  uint32_t gid;
  uint32_t group_count;
  bool is_array = false;
  bool is_buffer = false;
  bool is_typed_array = false;
  bool ordinary_backing = false;
  bool detached = false;
  napi_typedarray_type cmdline_type;
  napi_value cmdline_backing;
  size_t typed_length = 0;
  size_t byte_offset = 0;
  void *typed_bytes = NULL;
  void *cmdline = NULL;
  size_t cmdline_length = 0;
  int wrapped = 0;
  struct stat socket_identity;
  struct stat executable_identity;
  struct ucred borrowed_credentials;
  struct ucred private_credentials;
  if (arguments(env, info, 7, values, &owner, &failure) != 0) goto done;
  if (
    unsigned_argument(env, values[0], 0, INT_MAX, &socket_fd, &failure) != 0 ||
    unsigned_argument(env, values[1], 1, INT_MAX, &ppid, &failure) != 0 ||
    unsigned_argument(env, values[2], 0, UINT32_MAX - 1U, &uid, &failure) != 0 ||
    unsigned_argument(env, values[3], 0, UINT32_MAX - 1U, &gid, &failure) != 0 ||
    unsigned_argument(env, values[5], 0, INT_MAX, &executable_fd, &failure) != 0 ||
    check_api(napi_is_array(env, values[4], &is_array), &failure) != 0 ||
    check_api(napi_is_buffer(env, values[6], &is_buffer), &failure) != 0 ||
    check_api(napi_is_typedarray(env, values[6], &is_typed_array), &failure) != 0
  ) goto done;
  if (!is_array || !is_buffer || !is_typed_array) {
    fail(&failure, "APOLLYON_NATIVE_INVALID_ARGUMENT", "Peer groups and cmdline types are invalid", EINVAL);
    goto done;
  }
  if (
    check_api(napi_get_array_length(env, values[4], &group_count), &failure) != 0 ||
    check_api(napi_get_buffer_info(env, values[6], &cmdline, &cmdline_length), &failure) != 0 ||
    check_api(napi_get_typedarray_info(env, values[6], &cmdline_type, &typed_length,
      &typed_bytes, &cmdline_backing, &byte_offset), &failure) != 0 ||
    check_api(napi_is_arraybuffer(env, cmdline_backing, &ordinary_backing), &failure) != 0
  ) goto done;
  if (!ordinary_backing) {
    fail(&failure, "APOLLYON_NATIVE_INVALID_ARGUMENT", "Peer cmdline cannot have shared backing", EINVAL);
    goto done;
  }
  if (check_api(napi_is_detached_arraybuffer(env, cmdline_backing, &detached), &failure) != 0) {
    goto done;
  }
  if (
    group_count > APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2 ||
    detached || cmdline_type != napi_uint8_array || typed_length != cmdline_length ||
    typed_bytes != cmdline ||
    !cmdline || cmdline_length < 2 || cmdline_length > MAX_REQUEST_BYTES ||
    ((unsigned char *)cmdline)[cmdline_length - 1] != '\0'
  ) {
    fail(&failure, "APOLLYON_NATIVE_INVALID_ARGUMENT", "Peer groups or raw cmdline bounds are invalid", EINVAL);
    goto done;
  }
  handle = calloc(1, sizeof(*handle));
  if (!handle) {
    fail(&failure, "APOLLYON_NATIVE_ALLOCATION", "Peer handle allocation failed", ENOMEM);
    goto done;
  }
  handle->owner = owner;
  handle->socket.fd = -1;
  handle->executable.fd = -1;
  handle->pidfd.fd = -1;
  handle->identity.pidfd = -1;
  handle->group_count = group_count;
  handle->cmdline = malloc(cmdline_length);
  if (!handle->cmdline) {
    fail(&failure, "APOLLYON_NATIVE_ALLOCATION", "Peer cmdline allocation failed", ENOMEM);
    goto done;
  }
  memcpy(handle->cmdline, cmdline, cmdline_length);
  handle->cmdline_length = cmdline_length;
  for (uint32_t i = 0; i < group_count; ++i) {
    napi_value element;
    uint32_t group;
    if (
      check_api(napi_get_element(env, values[4], i, &element), &failure) != 0 ||
      unsigned_argument(env, element, 0, UINT32_MAX - 1U, &group, &failure) != 0
    ) goto done;
    for (uint32_t j = 0; j < i; ++j) {
      if (handle->groups[j] == (gid_t)group) {
        fail(&failure, "APOLLYON_NATIVE_INVALID_ARGUMENT", "Supplementary groups contain duplicates", EINVAL);
        goto done;
      }
    }
    handle->groups[i] = (gid_t)group;
  }
  /* All JavaScript-visible argument reads finish before descriptor acquisition.
   * Policies are copied, and neither borrowed descriptor is used after open. */
  if (
    fstat((int)socket_fd, &socket_identity) != 0 ||
    fstat((int)executable_fd, &executable_identity) != 0
  ) {
    fail(&failure, "APOLLYON_NATIVE_PEER_DESCRIPTOR", "Borrowed peer descriptor is unavailable", errno);
    goto done;
  }
  if (!S_ISSOCK(socket_identity.st_mode) || !S_ISREG(executable_identity.st_mode)) {
    fail(&failure, "APOLLYON_NATIVE_PEER_DESCRIPTOR", "Peer descriptor types are invalid", EINVAL);
    goto done;
  }
  if (socket_credentials((int)socket_fd, &borrowed_credentials, &failure) != 0) goto done;
  if (borrowed_credentials.uid != (uid_t)uid || borrowed_credentials.gid != (gid_t)gid) {
    fail(&failure, "APOLLYON_NATIVE_PEER_IDENTITY", "Kernel peer credentials differ from expected policy", EPERM);
    goto done;
  }
  handle->credentials = borrowed_credentials;
  if (
    duplicate_descriptor((int)socket_fd, &socket_identity, 0, &handle->socket, &failure) != 0 ||
    duplicate_descriptor((int)executable_fd, &executable_identity, 1,
      &handle->executable, &failure) != 0 ||
    socket_credentials((int)socket_fd, &borrowed_credentials, &failure) != 0 ||
    socket_credentials(handle->socket.fd, &private_credentials, &failure) != 0
  ) goto done;
  if (
    !same_credentials(&borrowed_credentials, &handle->credentials) ||
    !same_credentials(&private_credentials, &handle->credentials)
  ) {
    fail(&failure, "APOLLYON_NATIVE_PEER_IDENTITY", "Kernel peer credentials changed during duplication", ESTALE);
    goto done;
  }
  errno = 0;
  if (apollyon_claim_process_identity_observe_v2(
    handle->credentials.pid, (pid_t)ppid, (uid_t)uid, (gid_t)gid,
    handle->groups, handle->group_count, handle->executable.fd,
    handle->cmdline, handle->cmdline_length, &handle->identity
  ) != 0) {
    fail(&failure, "APOLLYON_NATIVE_PEER_IDENTITY", "Native peer process observation failed", errno ? errno : EIO);
    goto done;
  }
  handle->pidfd.fd = handle->identity.pidfd;
  if (fstat(handle->pidfd.fd, &handle->pidfd.identity) != 0) {
    fail(&failure, "APOLLYON_NATIVE_FD_IDENTITY", "Retained pidfd identity is unavailable", errno);
    goto done;
  }
  handle->pidfd.has_identity = 1;
  if (peer_bracket(handle, &failure) != 0) goto done;
  if (
    check_api(napi_create_object(env, &output), &failure) != 0 ||
    check_api(napi_type_tag_object(env, output, &peer_type_tag), &failure) != 0 ||
    check_api(napi_wrap(env, output, handle, finalize_peer, NULL, NULL), &failure) != 0
  ) goto done;
  wrapped = 1;
  handle->next = owner->handles;
  if (owner->handles) owner->handles->previous = handle;
  owner->handles = handle;
  ++owner->references;
  (void)check_api(napi_object_freeze(env, output), &failure);

done:
  if (failure.code && handle) close_peer(handle, &failure);
  if (handle && !wrapped) free(handle);
  return failure.code ? throw_failure(env, &failure) : output;
}

static struct peer_handle *get_peer(
  napi_env env,
  napi_callback_info info,
  struct failure *failure
) {
  struct environment *owner = NULL;
  napi_value values[2];
  bool tagged = false;
  napi_valuetype type;
  if (arguments(env, info, 1, values, &owner, failure) != 0) return NULL;
  if (check_api(napi_typeof(env, values[0], &type), failure) != 0) return NULL;
  if (type != napi_object) goto invalid;
  if (check_api(napi_check_object_type_tag(env, values[0], &peer_type_tag, &tagged), failure) != 0) {
    return NULL;
  }
  if (!tagged) goto invalid;
  void *unwrapped = NULL;
  if (check_api(napi_unwrap(env, values[0], &unwrapped), failure) != 0) return NULL;
  struct peer_handle *handle = unwrapped;
  if (!handle || handle->owner != owner) goto invalid;
  return handle;
invalid:
  fail(failure, "APOLLYON_NATIVE_INVALID_ARGUMENT", "Expected an opaque peer handle from this environment", EINVAL);
  return NULL;
}

static napi_value revalidate_peer_identity(napi_env env, napi_callback_info info) {
  struct failure failure = {0};
  struct peer_handle *handle = get_peer(env, info, &failure);
  struct owned_descriptor temporary = {.fd = -1};
  struct apollyon_claim_process_identity_v2 observed = {.pidfd = -1};
  napi_value output = NULL;
  if (!handle) goto done;
  if (handle->closed) {
    fail(&failure, "APOLLYON_NATIVE_PEER_CLOSED", "Retained peer handle is closed", EBADF);
    goto done;
  }
  if (peer_bracket(handle, &failure) != 0) goto done;
  errno = 0;
  if (apollyon_claim_process_identity_observe_v2(
    handle->identity.pid, handle->identity.ppid, handle->identity.uid, handle->identity.gid,
    handle->groups, handle->group_count, handle->executable.fd,
    handle->cmdline, handle->cmdline_length, &observed
  ) != 0) {
    fail(&failure, "APOLLYON_NATIVE_PEER_IDENTITY", "Native peer process revalidation failed", errno ? errno : EIO);
    goto done;
  }
  temporary.fd = observed.pidfd;
  if (fstat(temporary.fd, &temporary.identity) != 0) {
    fail(&failure, "APOLLYON_NATIVE_FD_IDENTITY", "Temporary pidfd identity is unavailable", errno);
    goto done;
  }
  temporary.has_identity = 1;
  if (
    observed.pid != handle->identity.pid || observed.ppid != handle->identity.ppid ||
    observed.uid != handle->identity.uid || observed.gid != handle->identity.gid ||
    observed.start_ticks != handle->identity.start_ticks ||
    observed.executable_dev != handle->identity.executable_dev ||
    observed.executable_ino != handle->identity.executable_ino
  ) {
    fail(&failure, "APOLLYON_NATIVE_PEER_IDENTITY", "Retained peer process generation changed", ESTALE);
    goto done;
  }
  if (peer_bracket(handle, &failure) != 0) goto done;
  close_descriptor(&temporary, "temporary_pidfd", &failure);
  if (!failure.code && peer_bracket(handle, &failure) != 0) goto done;
  if (!failure.code) (void)check_api(napi_get_undefined(env, &output), &failure);

done:
  close_descriptor(&temporary, "temporary_pidfd", &failure);
  if (failure.code && handle) close_peer(handle, &failure);
  return failure.code ? throw_failure(env, &failure) : output;
}

static napi_value close_peer_identity(napi_env env, napi_callback_info info) {
  struct failure failure = {0};
  struct peer_handle *handle = get_peer(env, info, &failure);
  napi_value output = NULL;
  if (handle) {
    if (handle->closed) failure = handle->close_failure;
    else close_peer(handle, &failure);
  }
  if (!failure.code) (void)check_api(napi_get_undefined(env, &output), &failure);
  return failure.code ? throw_failure(env, &failure) : output;
}

static int retain_module_image(struct failure *failure) {
  Dl_info own_image = {0};
  if (
    dladdr(&publisher_pipe_attempted, &own_image) == 0 ||
    !own_image.dli_fname || !own_image.dli_fbase
  ) {
    fail(failure, "APOLLYON_NATIVE_MODULE_LIFETIME",
      "Native module image could not be identified", EIO);
    return -1;
  }
  /* A Worker may be the first and only importing environment. Node can unload
   * its addon after Worker exit, which would otherwise reset the atomic flag.
   * Promote only this already-loaded image; NOLOAD never loads another file.
   * NODELETE retains its static state until process exit. This loader identity
   * is not evidence of protected source origin or installed-file provenance. */
  void *lookup = dlopen(own_image.dli_fname, RTLD_NOW | RTLD_NOLOAD | RTLD_NODELETE);
  if (!lookup) {
    fail(failure, "APOLLYON_NATIVE_MODULE_LIFETIME",
      "Native module image could not be retained", EIO);
    return -1;
  }
  struct link_map *observed = NULL;
  if (
    dlinfo(lookup, RTLD_DI_LINKMAP, &observed) != 0 || !observed ||
    (uintptr_t)observed->l_addr != (uintptr_t)own_image.dli_fbase
  ) {
    fail(failure, "APOLLYON_NATIVE_MODULE_LIFETIME",
      "Native module lookup resolved a different image", ESTALE);
  }
  /* Balance the temporary lookup reference on every path. NODELETE remains
   * set; each Node environment therefore adds no permanent loader reference. */
  if (dlclose(lookup) != 0) {
    cleanup_error(failure, "module_lookup", "APOLLYON_NATIVE_MODULE_LIFETIME", EIO);
  }
  return failure->code ? -1 : 0;
}

NAPI_MODULE_INIT() {
  struct failure failure = {0};
  if (retain_module_image(&failure) != 0) return throw_failure(env, &failure);
  struct environment *owner = calloc(1, sizeof(*owner));
  if (!owner) {
    fail(&failure, "APOLLYON_NATIVE_ALLOCATION", "Native environment allocation failed", ENOMEM);
    return throw_failure(env, &failure);
  }
  owner->env = env;
  owner->references = 1;
  if (check_api(napi_add_env_cleanup_hook(env, cleanup_environment, owner), &failure) != 0) {
    free(owner);
    return throw_failure(env, &failure);
  }
  const napi_property_descriptor methods[] = {
    {.utf8name = "readInheritedPublisherRequest", .method = read_inherited_publisher_request, .data = owner},
    {.utf8name = "openPeerIdentity", .method = open_peer_identity, .data = owner},
    {.utf8name = "revalidatePeerIdentity", .method = revalidate_peer_identity, .data = owner},
    {.utf8name = "closePeerIdentity", .method = close_peer_identity, .data = owner}
  };
  if (check_api(napi_define_properties(env, exports, 4, methods), &failure) != 0) {
    return throw_failure(env, &failure);
  }
  return exports;
}
