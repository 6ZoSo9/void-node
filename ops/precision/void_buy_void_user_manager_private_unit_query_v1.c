#define main void_buy_void_private_peer_guard_embedded_main
#include "void_buy_void_user_manager_private_peer_guard_v1.c"
#undef main
#undef MARKER

#include <dlfcn.h>
#include <inttypes.h>
#include <limits.h>

#define MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V2"
#define NODE_EXE "/usr/bin/node"
#define LIBSYSTEMD_SONAME "/usr/lib/x86_64-linux-gnu/libsystemd.so.0"
#define SANITIZED_ENV_MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1"

static void query_die(const char *code) { fprintf(stderr, "%s_HOLD\nreason=%s\n", MARKER, code); exit(2); }

typedef struct sd_bus sd_bus;
typedef struct sd_bus_message sd_bus_message;

struct sd_api {
  void *handle;
  int library_fd;
  char library_path[PATH_MAX];
  int (*bus_new)(sd_bus **);
  int (*bus_set_fd)(sd_bus *, int, int);
  int (*bus_set_bus_client)(sd_bus *, int);
  int (*bus_set_method_call_timeout)(sd_bus *, uint64_t);
  int (*bus_start)(sd_bus *);
  int (*bus_get_fd)(sd_bus *);
  int (*bus_call_method)(sd_bus *, const char *, const char *, const char *, const char *, void *, sd_bus_message **, const char *, ...);
  int (*message_read)(sd_bus_message *, const char *, ...);
  int (*get_property_string)(sd_bus *, const char *, const char *, const char *, const char *, void *, char **);
  int (*get_property_trivial)(sd_bus *, const char *, const char *, const char *, const char *, void *, char, void *);
  sd_bus_message *(*message_unref)(sd_bus_message *);
  sd_bus *(*bus_unref)(sd_bus *);
};

static int clean_loader_environment(void) {
  const char *marker = getenv(SANITIZED_ENV_MARKER);
  if (!marker || strcmp(marker, "1") != 0) return -1;
  const char *forbidden[] = {
    "LD_PRELOAD", "LD_LIBRARY_PATH", "LD_AUDIT", "LD_DEBUG",
    "LD_PROFILE", "LD_ORIGIN_PATH", "LD_ASSUME_KERNEL", "LD_BIND_NOW",
    "LD_DYNAMIC_WEAK", "LD_HWCAP_MASK", "LD_POINTER_GUARD",
    "LD_SHOW_AUXV", "LD_USE_LOAD_BIAS", "GLIBC_TUNABLES", NULL
  };
  for (size_t i = 0; forbidden[i] != NULL; ++i) {
    if (getenv(forbidden[i]) != NULL) return -1;
  }
  return 0;
}

static int trusted_directory(const char *p) {
  struct stat st;
  if (lstat(p, &st) != 0 || !S_ISDIR(st.st_mode) || S_ISLNK(st.st_mode) ||
      st.st_uid != 0 || (st.st_mode & 0022) != 0) return -1;
  return 0;
}

static int open_verified_libsystemd(int *out_fd, char *resolved, size_t cap) {
  if (!out_fd || !resolved || cap < 2) return -1;
  if (trusted_directory("/") != 0 ||
      trusted_directory("/usr") != 0 ||
      trusted_directory("/usr/lib") != 0 ||
      trusted_directory("/usr/lib/x86_64-linux-gnu") != 0) return -1;

  struct stat link_st;
  if (lstat(LIBSYSTEMD_SONAME, &link_st) != 0 || link_st.st_uid != 0 ||
      link_st.st_nlink != 1) return -1;
  if (!S_ISLNK(link_st.st_mode) && !S_ISREG(link_st.st_mode)) return -1;
  if (S_ISREG(link_st.st_mode) && (link_st.st_mode & 0022) != 0) return -1;

  char target[PATH_MAX];
  if (!realpath(LIBSYSTEMD_SONAME, target)) return -1;
  const char *prefix = "/usr/lib/x86_64-linux-gnu/libsystemd.so.0";
  if (strncmp(target, prefix, strlen(prefix)) != 0 ||
      target[strlen(prefix)] == '/') return -1;
  size_t n = strlen(target);
  if (n + 1 > cap) return -1;

  struct stat visible;
  if (lstat(target, &visible) != 0 || !S_ISREG(visible.st_mode) ||
      S_ISLNK(visible.st_mode) || visible.st_uid != 0 ||
      (visible.st_mode & 0022) != 0 || visible.st_nlink != 1 ||
      visible.st_size <= 0) return -1;

  int fd = open(target, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (fd < 0) return -1;
  struct stat held;
  if (fstat(fd, &held) != 0 || held.st_dev != visible.st_dev ||
      held.st_ino != visible.st_ino || held.st_uid != visible.st_uid ||
      held.st_gid != visible.st_gid || held.st_mode != visible.st_mode ||
      held.st_nlink != visible.st_nlink || held.st_size != visible.st_size) {
    close(fd);
    return -1;
  }
  memcpy(resolved, target, n + 1);
  *out_fd = fd;
  return 0;
}

static int load_symbol(void *handle, const char *name, const char *expected_path, void *target) {
  void *value = dlsym(handle, name);
  if (!value) return -1;
  Dl_info info;
  memset(&info, 0, sizeof(info));
  if (dladdr(value, &info) == 0 || !info.dli_fname) return -1;
  char loaded[PATH_MAX];
  if (!realpath(info.dli_fname, loaded) || strcmp(loaded, expected_path) != 0) return -1;
  memcpy(target, &value, sizeof(value));
  return 0;
}

static int load_sd_api(struct sd_api *api) {
  memset(api, 0, sizeof(*api));
  api->library_fd = -1;
  if (clean_loader_environment() != 0) return -1;
  if (open_verified_libsystemd(&api->library_fd, api->library_path,
                               sizeof(api->library_path)) != 0) return -1;

  char procfd[64];
  if (snprintf(procfd, sizeof(procfd), "/proc/self/fd/%d", api->library_fd) >=
      (int)sizeof(procfd)) goto fail;
  api->handle = dlopen(procfd, RTLD_NOW | RTLD_LOCAL);
  if (!api->handle) goto fail;
#define LOAD(field, symbol) do {   if (load_symbol(api->handle, symbol, api->library_path, &api->field) != 0) goto fail; } while (0)
  LOAD(bus_new, "sd_bus_new");
  LOAD(bus_set_fd, "sd_bus_set_fd");
  LOAD(bus_set_bus_client, "sd_bus_set_bus_client");
  LOAD(bus_set_method_call_timeout, "sd_bus_set_method_call_timeout");
  LOAD(bus_start, "sd_bus_start");
  LOAD(bus_get_fd, "sd_bus_get_fd");
  LOAD(bus_call_method, "sd_bus_call_method");
  LOAD(message_read, "sd_bus_message_read");
  LOAD(get_property_string, "sd_bus_get_property_string");
  LOAD(get_property_trivial, "sd_bus_get_property_trivial");
  LOAD(message_unref, "sd_bus_message_unref");
  LOAD(bus_unref, "sd_bus_unref");
#undef LOAD

  struct stat held, visible;
  if (fstat(api->library_fd, &held) != 0 ||
      lstat(api->library_path, &visible) != 0 ||
      !S_ISREG(visible.st_mode) || S_ISLNK(visible.st_mode) ||
      held.st_dev != visible.st_dev || held.st_ino != visible.st_ino ||
      held.st_uid != visible.st_uid || held.st_gid != visible.st_gid ||
      held.st_mode != visible.st_mode || held.st_nlink != visible.st_nlink ||
      held.st_size != visible.st_size) goto fail;
  return 0;

fail:
  if (api->handle) dlclose(api->handle);
  if (api->library_fd >= 0) close(api->library_fd);
  memset(api, 0, sizeof(*api));
  api->library_fd = -1;
  return -1;
}

static void unload_sd_api(struct sd_api *api) {
  if (api->handle) dlclose(api->handle);
  if (api->library_fd >= 0) close(api->library_fd);
  memset(api, 0, sizeof(*api));
  api->library_fd = -1;
}

static int safe_unit_name(const char *unit) {
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

static int exact_service_cgroup(pid_t pid, uid_t uid, const char *unit) {
  char path[128];
  if (snprintf(path, sizeof(path), "/proc/%ld/cgroup", (long)pid) >= (int)sizeof(path)) return -1;
  unsigned char raw[4096];
  size_t len = 0;
  if (read_bounded(path, raw, sizeof(raw) - 1, &len) != 0) return -1;
  raw[len] = '\0';
  char expected[512];
  int n = snprintf(expected, sizeof(expected),
    "0::/user.slice/user-%lu.slice/user@%lu.service/app.slice/%s\n",
    (unsigned long)uid, (unsigned long)uid, unit);
  if (n <= 0 || n >= (int)sizeof(expected)) return -1;
  return len == (size_t)n && memcmp(raw, expected, len) == 0 ? 0 : -1;
}

static int exact_executable_path(pid_t pid, const char *expected_path) {
  char proc_path[128];
  if (snprintf(proc_path, sizeof(proc_path), "/proc/%ld/exe", (long)pid) >= (int)sizeof(proc_path)) return -1;
  char link[4096];
  ssize_t n = readlink(proc_path, link, sizeof(link) - 1);
  if (n < 0 || (size_t)n >= sizeof(link) - 1) return -1;
  link[n] = '\0';
  if (strcmp(link, expected_path) != 0) return -1;
  struct stat expected, observed;
  if (lstat(expected_path, &expected) != 0 || !S_ISREG(expected.st_mode) ||
      expected.st_uid != 0 || (expected.st_mode & 0022) != 0 ||
      (expected.st_mode & 0111) == 0) return -1;
  if (stat(proc_path, &observed) != 0) return -1;
  return expected.st_dev == observed.st_dev && expected.st_ino == observed.st_ino ? 0 : -1;
}

static int copy_string(char *dst, size_t cap, const char *src) {
  if (!dst || cap < 2 || !src) return -1;
  size_t n = strlen(src);
  if (n >= cap || memchr(src, '\n', n) || memchr(src, '\r', n)) return -1;
  memcpy(dst, src, n + 1);
  return 0;
}

struct unit_observation {
  char load_state[32];
  char active_state[32];
  char sub_state[32];
  char user[128];
  char group[128];
  char control_group[512];
  uint32_t main_pid;
  int no_new_privileges;
  uint64_t capability_bounding_set;
  uint64_t ambient_capabilities;
};

struct service_security {
  int no_new_privileges;
  uint64_t cap_inh;
  uint64_t cap_prm;
  uint64_t cap_eff;
  uint64_t cap_bnd;
  uint64_t cap_amb;
};

static int parse_status_hex_line(const char *line, const char *key, uint64_t *out) {
  size_t n=strlen(key);
  if(strncmp(line,key,n)!=0) return 0;
  const unsigned char *p=(const unsigned char *)line+n;
  while(*p==' ' || *p=='\t') ++p;
  if(!*p) return -1;
  uint64_t value=0;
  size_t digits=0;
  for(;*p;++p) {
    unsigned digit;
    if(*p>='0' && *p<='9') digit=(unsigned)(*p-'0');
    else if(*p>='a' && *p<='f') digit=10U+(unsigned)(*p-'a');
    else if(*p>='A' && *p<='F') digit=10U+(unsigned)(*p-'A');
    else return -1;
    if(digits>=16) return -1;
    value=(value<<4)|digit;
    digits+=1;
  }
  if(digits==0) return -1;
  *out=value;
  return 1;
}

static int parse_status_nnp_line(const char *line, int *out) {
  static const char key[]="NoNewPrivs:";
  size_t n=sizeof(key)-1;
  if(strncmp(line,key,n)!=0) return 0;
  const char *p=line+n;
  while(*p==' ' || *p=='\t') ++p;
  if(strcmp(p,"0")==0) { *out=0; return 1; }
  if(strcmp(p,"1")==0) { *out=1; return 1; }
  return -1;
}

static int parse_service_security_text(char *text, struct service_security *out) {
  struct service_security parsed={0};
  int have_nnp=0,have_inh=0,have_prm=0,have_eff=0,have_bnd=0,have_amb=0;
  char *save=NULL;
  for(char *line=strtok_r(text,"\n",&save);line;line=strtok_r(NULL,"\n",&save)) {
    int r=parse_status_nnp_line(line,&parsed.no_new_privileges);
    if(r<0 || (r>0 && have_nnp)) return -1;
    if(r>0) { have_nnp=1; continue; }
#define PARSE_CAP(field,key,have) do { \
      r=parse_status_hex_line(line,key,&parsed.field); \
      if(r<0 || (r>0 && have)) return -1; \
      if(r>0) { have=1; continue; } \
    } while(0)
    PARSE_CAP(cap_inh,"CapInh:",have_inh);
    PARSE_CAP(cap_prm,"CapPrm:",have_prm);
    PARSE_CAP(cap_eff,"CapEff:",have_eff);
    PARSE_CAP(cap_bnd,"CapBnd:",have_bnd);
    PARSE_CAP(cap_amb,"CapAmb:",have_amb);
#undef PARSE_CAP
  }
  if(!have_nnp || !have_inh || !have_prm || !have_eff || !have_bnd || !have_amb) return -1;
  *out=parsed;
  return 0;
}

static int parse_service_security(pid_t pid, struct service_security *out) {
  char path[128];
  if(snprintf(path,sizeof(path),"/proc/%ld/status",(long)pid)>=(int)sizeof(path)) return -1;
  unsigned char raw[65536];
  size_t len=0;
  if(read_bounded(path,raw,sizeof(raw)-1,&len)!=0) return -1;
  raw[len]='\0';
  return parse_service_security_text((char *)raw,out);
}

static int same_service_security(const struct service_security *a,
                                 const struct service_security *b) {
  return a->no_new_privileges==b->no_new_privileges &&
         a->cap_inh==b->cap_inh &&
         a->cap_prm==b->cap_prm &&
         a->cap_eff==b->cap_eff &&
         a->cap_bnd==b->cap_bnd &&
         a->cap_amb==b->cap_amb;
}

static int service_security_policy_ok(const struct unit_observation *obs,
                                      const struct service_security *security) {
  return obs->no_new_privileges==1 &&
         obs->ambient_capabilities==0 &&
         security->no_new_privileges==1 &&
         security->cap_inh==0 &&
         security->cap_prm==0 &&
         security->cap_eff==0 &&
         security->cap_amb==0 &&
         security->cap_bnd==obs->capability_bounding_set;
}

static int get_string_prop(struct sd_api *api, sd_bus *bus, const char *object,
                           const char *interface, const char *property,
                           char *dst, size_t cap) {
  char *value = NULL;
  int r = api->get_property_string(bus, NULL, object, interface, property, NULL, &value);
  if (r < 0 || !value) { free(value); return -1; }
  int out = copy_string(dst, cap, value);
  free(value);
  return out;
}

static int query_unit(struct sd_api *api, sd_bus *bus, const char *unit,
                      struct unit_observation *out) {
  sd_bus_message *reply = NULL;
  int r = api->bus_call_method(bus, NULL, "/org/freedesktop/systemd1",
      "org.freedesktop.systemd1.Manager", "GetUnit", NULL, &reply, "s", unit);
  if (r < 0 || !reply) return -1;
  const char *object = NULL;
  r = api->message_read(reply, "o", &object);
  if (r < 0 || !object ||
      strncmp(object, "/org/freedesktop/systemd1/unit/",
        strlen("/org/freedesktop/systemd1/unit/")) != 0) {
    api->message_unref(reply);
    return -1;
  }
  char object_copy[512];
  if (copy_string(object_copy, sizeof(object_copy), object) != 0) {
    api->message_unref(reply);
    return -1;
  }
  api->message_unref(reply);

  memset(out, 0, sizeof(*out));
  if (get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Unit","LoadState",out->load_state,sizeof(out->load_state)) != 0 ||
      get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Unit","ActiveState",out->active_state,sizeof(out->active_state)) != 0 ||
      get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Unit","SubState",out->sub_state,sizeof(out->sub_state)) != 0 ||
      get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Unit","ControlGroup",out->control_group,sizeof(out->control_group)) != 0 ||
      get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Service","User",out->user,sizeof(out->user)) != 0 ||
      get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Service","Group",out->group,sizeof(out->group)) != 0) return -1;
  if (api->get_property_trivial(bus,NULL,object_copy,"org.freedesktop.systemd1.Service","MainPID",NULL,'u',&out->main_pid) < 0 ||
      api->get_property_trivial(bus,NULL,object_copy,"org.freedesktop.systemd1.Service","NoNewPrivileges",NULL,'b',&out->no_new_privileges) < 0 ||
      api->get_property_trivial(bus,NULL,object_copy,"org.freedesktop.systemd1.Service","CapabilityBoundingSet",NULL,'t',&out->capability_bounding_set) < 0 ||
      api->get_property_trivial(bus,NULL,object_copy,"org.freedesktop.systemd1.Service","AmbientCapabilities",NULL,'t',&out->ambient_capabilities) < 0) return -1;
  return 0;
}

static int validate_unit_observation(uid_t uid, const char *unit,
                                     const struct proc_identity *manager,
                                     const struct unit_observation *obs,
                                     struct proc_identity *service,
                                     struct service_security *security) {
  if (strcmp(obs->load_state,"loaded") || strcmp(obs->active_state,"active") || strcmp(obs->sub_state,"running")) return -1;
  if (obs->user[0] != '\0' || obs->group[0] != '\0') return -1;
  if (obs->main_pid <= 1) return -1;
  char expected_cgroup[512];
  int n = snprintf(expected_cgroup,sizeof(expected_cgroup),
    "/user.slice/user-%lu.slice/user@%lu.service/app.slice/%s",
    (unsigned long)uid,(unsigned long)uid,unit);
  if (n <= 0 || n >= (int)sizeof(expected_cgroup) || strcmp(obs->control_group,expected_cgroup)) return -1;

  pid_t ppid = 0;
  unsigned long long start = 0;
  if (proc_stat_identity((pid_t)obs->main_pid,&ppid,&start) != 0 || ppid != manager->pid) return -1;
  uid_t observed_uid = 0;
  gid_t observed_gid = 0;
  if (parse_status_ids((pid_t)obs->main_pid,uid,&observed_uid,&observed_gid) != 0 || observed_gid != manager->gid) return -1;
  struct service_security observed_security;
  if (parse_service_security((pid_t)obs->main_pid,&observed_security) != 0) return -1;
  if (!service_security_policy_ok(obs,&observed_security)) return -1;
  if (exact_service_cgroup((pid_t)obs->main_pid,uid,unit) != 0) return -1;
  if (exact_executable_path((pid_t)obs->main_pid,NODE_EXE) != 0) return -1;
  service->pid=(pid_t)obs->main_pid;
  service->ppid=ppid;
  service->uid=observed_uid;
  service->gid=observed_gid;
  service->start_ticks=start;
  *security=observed_security;
  return 0;
}

static int live_query(uid_t uid, const char *unit) {
  if (geteuid() != 0) query_die("root_required");
  if (safe_unit_name(unit) != 0) query_die("unit_invalid");

  struct proc_identity manager;
  if (find_manager(uid,&manager) != 0) query_die("manager_candidate_not_exactly_one");
  int manager_pidfd=pidfd_open_checked(manager.pid);
  if (manager_pidfd < 0 || pidfd_alive(manager_pidfd) != 0) query_die("manager_pidfd_unavailable");

  struct stat socket_before,socket_after;
  int busfd=connect_private(uid,&socket_before,&socket_after);
  if (busfd < 0) { close(manager_pidfd); query_die("manager_private_socket_connect_failed"); }
  struct ucred cred;
  if (peercred(busfd,&cred) != 0 || cred.pid != manager.pid || cred.uid != manager.uid || cred.gid != manager.gid) {
    close(busfd); close(manager_pidfd); query_die("manager_private_socket_peer_mismatch");
  }

  struct sd_api api;
  if (load_sd_api(&api) != 0) { close(busfd); close(manager_pidfd); query_die("libsystemd_api_unavailable"); }
  sd_bus *bus=NULL;
  if (api.bus_new(&bus) < 0 || !bus ||
      api.bus_set_fd(bus,busfd,busfd) < 0 ||
      api.bus_set_bus_client(bus,0) < 0 ||
      api.bus_set_method_call_timeout(bus,5ULL*1000ULL*1000ULL) < 0) {
    if (bus) api.bus_unref(bus); else close(busfd);
    unload_sd_api(&api); close(manager_pidfd); query_die("sd_bus_configuration_failed");
  }
  busfd=-1;
  if (api.bus_start(bus) < 0) {
    api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("sd_bus_start_failed");
  }
  int retained_fd=api.bus_get_fd(bus);
  struct ucred retained_cred;
  if (retained_fd < 0 || peercred(retained_fd,&retained_cred) != 0 ||
      retained_cred.pid != manager.pid || retained_cred.uid != manager.uid || retained_cred.gid != manager.gid) {
    api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("sd_bus_retained_peer_mismatch");
  }

  struct unit_observation obs;
  if (query_unit(&api,bus,unit,&obs) != 0) {
    api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("unit_property_query_failed");
  }
  struct proc_identity service;
  struct service_security service_security;
  if (validate_unit_observation(uid,unit,&manager,&obs,&service,&service_security) != 0) {
    api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("unit_property_kernel_binding_failed");
  }
  int service_pidfd=pidfd_open_checked(service.pid);
  if (service_pidfd < 0 || pidfd_alive(service_pidfd) != 0) {
    api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("service_pidfd_unavailable");
  }

  struct proc_identity manager_after,service_after;
  struct ucred final_cred;
  if (candidate(manager.pid,uid,&manager_after) != 0 ||
      manager_after.start_ticks != manager.start_ticks || manager_after.gid != manager.gid ||
      proc_stat_identity(service.pid,&service_after.ppid,&service_after.start_ticks) != 0 ||
      service_after.ppid != manager.pid || service_after.start_ticks != service.start_ticks ||
      exact_service_cgroup(service.pid,uid,unit) != 0 || exact_executable_path(service.pid,NODE_EXE) != 0 ||
      pidfd_alive(manager_pidfd) != 0 || pidfd_alive(service_pidfd) != 0 ||
      peercred(retained_fd,&final_cred) != 0 || final_cred.pid != manager.pid || final_cred.uid != manager.uid || final_cred.gid != manager.gid) {
    close(service_pidfd); api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("post_query_generation_changed");
  }
  struct service_security service_security_after;
  if (parse_service_security(service.pid,&service_security_after) != 0 ||
      !same_service_security(&service_security,&service_security_after)) {
    close(service_pidfd); api.bus_unref(bus); unload_sd_api(&api); close(manager_pidfd); query_die("post_query_security_changed");
  }

  printf("%s_GREEN\n",MARKER);
  printf("runtime_uid=%lu\n",(unsigned long)uid);
  printf("manager_pid=%ld\n",(long)manager.pid);
  printf("manager_gid=%lu\n",(unsigned long)manager.gid);
  printf("manager_start_ticks=%llu\n",manager.start_ticks);
  printf("manager_peer_authenticated=true\n");
  printf("same_private_fd_used_for_query=true\n");
  printf("sanitized_loader_environment=true\n");
  printf("libsystemd_fixed_path_verified=true\n");
  printf("libsystemd_retained_fd_load=true\n");
  printf("libsystemd_symbol_provenance_verified=true\n");
  printf("runtime_service_unit=%s\n",unit);
  printf("LoadState=%s\n",obs.load_state);
  printf("ActiveState=%s\n",obs.active_state);
  printf("SubState=%s\n",obs.sub_state);
  printf("User=%s\n",obs.user);
  printf("Group=%s\n",obs.group);
  printf("MainPID=%u\n",obs.main_pid);
  printf("ControlGroup=%s\n",obs.control_group);
  printf("NoNewPrivileges=yes\n");
  printf("CapabilityBoundingSet=%016" PRIx64 "\n",obs.capability_bounding_set);
  printf("AmbientCapabilities=%016" PRIx64 "\n",obs.ambient_capabilities);
  printf("KernelNoNewPrivs=%d\n",service_security.no_new_privileges);
  printf("KernelCapInh=%016" PRIx64 "\n",service_security.cap_inh);
  printf("KernelCapPrm=%016" PRIx64 "\n",service_security.cap_prm);
  printf("KernelCapEff=%016" PRIx64 "\n",service_security.cap_eff);
  printf("KernelCapBnd=%016" PRIx64 "\n",service_security.cap_bnd);
  printf("KernelCapAmb=%016" PRIx64 "\n",service_security.cap_amb);
  printf("configured_kernel_bounding_set_equal=true\n");
  printf("kernel_active_capabilities_zero=true\n");
  printf("service_ppid=%ld\n",(long)service.ppid);
  printf("service_start_ticks=%llu\n",service.start_ticks);
  printf("service_pidfd_retained=true\n");
  printf("manager_pidfd_retained=true\n");
  printf("runtime_main_pid_kernel_bound=true\n");
  printf("manager_generation_reverified=true\n");
  printf("service_generation_reverified=true\n");
  printf("host_mutation=false\n");
  printf("payment_acceptance=false\n");
  printf("public_presale_activation=false\n");
  printf("funds_movement=false\n");

  close(service_pidfd);
  api.bus_unref(bus);
  unload_sd_api(&api);
  close(manager_pidfd);
  return 0;
}

static int self_test_query(void) {
  struct sd_api api;
  if (load_sd_api(&api) != 0) return 1;
  unload_sd_api(&api);
  if (safe_unit_name("void-node-live.service") != 0) return 1;
  if (safe_unit_name("../bad.service") == 0) return 1;
  if (safe_unit_name("bad.socket") == 0) return 1;

  char good_status[]=
    "NoNewPrivs:\t1\n"
    "CapInh:\t0000000000000000\n"
    "CapPrm:\t0000000000000000\n"
    "CapEff:\t0000000000000000\n"
    "CapBnd:\t000001ffffffffff\n"
    "CapAmb:\t0000000000000000\n";
  struct service_security good;
  if (parse_service_security_text(good_status,&good) != 0 ||
      good.no_new_privileges != 1 ||
      good.cap_inh != 0 || good.cap_prm != 0 || good.cap_eff != 0 ||
      good.cap_bnd != UINT64_C(0x000001ffffffffff) || good.cap_amb != 0) return 1;
  char bad_status[]=
    "NoNewPrivs:\t0\n"
    "CapInh:\t0000000000000000\n"
    "CapPrm:\t0000000000000000\n"
    "CapEff:\t0000000000000001\n"
    "CapBnd:\t000001ffffffffff\n"
    "CapAmb:\t0000000000000000\n";
  struct service_security bad;
  if (parse_service_security_text(bad_status,&bad) != 0) return 1;

  struct unit_observation synthetic_obs;
  memset(&synthetic_obs,0,sizeof(synthetic_obs));
  synthetic_obs.no_new_privileges=1;
  synthetic_obs.capability_bounding_set=UINT64_C(0x000001ffffffffff);
  synthetic_obs.ambient_capabilities=0;
  if (!service_security_policy_ok(&synthetic_obs,&good)) return 1;
  if (service_security_policy_ok(&synthetic_obs,&bad)) return 1;
  struct service_security wrong_bnd=good;
  wrong_bnd.cap_bnd-=1;
  if (service_security_policy_ok(&synthetic_obs,&wrong_bnd)) return 1;
  synthetic_obs.ambient_capabilities=1;
  if (service_security_policy_ok(&synthetic_obs,&good)) return 1;

  printf("%s_SELF_TEST_GREEN\n",MARKER);
  printf("kernel_security_status_parser=true\n");
  printf("kernel_no_new_privileges_required=true\n");
  printf("kernel_active_capabilities_zero_required=true\n");
  printf("configured_kernel_bounding_set_equality_required=true\n");
  printf("libsystemd_runtime_symbols_available=true\n");
  printf("sanitized_loader_environment=true\n");
  printf("libsystemd_fixed_soname_path=%s\n",LIBSYSTEMD_SONAME);
  printf("libsystemd_retained_fd_load=true\n");
  printf("libsystemd_symbol_provenance_verified=true\n");
  printf("sd_bus_set_fd_same_connection_required=true\n");
  printf("direct_peer_mode_required=true\n");
  printf("systemd_private_socket_required=true\n");
  printf("public_user_bus_used=false\n");
  printf("unit_properties_queried_live_only=true\n");
  printf("host_mutation=false\n");
  return 0;
}

int main(int argc,char **argv) {
  if (clean_loader_environment() != 0) query_die("sanitized_loader_environment_required");
  if (argc==2 && strcmp(argv[1],"--self-test")==0) return self_test_query();
  if (argc==5 && strcmp(argv[1],"--uid")==0 && strcmp(argv[3],"--unit")==0) {
    unsigned long long raw=0;
    if (parse_uint(argv[2],&raw)!=0 || raw==0 || raw>0x7fffffffULL) query_die("uid_invalid");
    return live_query((uid_t)raw,argv[4]);
  }
  fprintf(stderr,"usage: %s --self-test | --uid <positive-uid> --unit <service>\n",argv[0]);
  return 2;
}
