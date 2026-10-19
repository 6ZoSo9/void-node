#define _GNU_SOURCE
#include "apollyon_claim_protected_first_entry_v1.h"

#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <unistd.h>

static int positive_case(void) {
  struct apollyon_claim_protected_first_entry_v1 gate;
  if(apollyon_claim_protected_first_entry_install_v1(&gate)!=0) return 1;

  if(
    gate.lock.self.retained.pid!=getpid() ||
    gate.lock.self.retained.start_ticks==0 ||
    gate.lock.self.retained.pidfd<0 ||
    gate.lock.self.kernel_self_generation_observed!=1 ||
    gate.lock.self.no_task_creation_lock_installed!=1 ||
    gate.lock.no_exec_filter_installed!=1 ||
    gate.lock.execve_and_execveat_denied!=1 ||
    gate.lock.same_kernel_generation_reobserved!=1 ||
    gate.executable_dev==0 ||
    gate.executable_ino==0 ||
    gate.fixed_path_custody_verified!=1 ||
    gate.expected_executable_fd_derived_internally!=1 ||
    gate.expected_cmdline_derived_internally!=1 ||
    gate.visible_generation_revalidated_after_lock!=1 ||
    gate.fixed_path_expected_source_bound!=1 ||
    gate.static_first_instruction_proven!=0 ||
    gate.protected_expected_source_origin_proven!=0 ||
    gate.protected_parent_origin_proven!=0 ||
    gate.xiphos_host_qualification_performed!=0 ||
    gate.durable_attempt_claim_performed!=0 ||
    prctl(PR_GET_NO_NEW_PRIVS,0,0,0,0)!=1
  ){
    apollyon_claim_protected_first_entry_close_v1(&gate);
    return 2;
  }

  char *const argv[]={"/bin/false",NULL};
  char *const envp[]={NULL};
  errno=0;
  if(syscall(SYS_execve,"/bin/false",argv,envp)!=-1 || errno!=EPERM){
    apollyon_claim_protected_first_entry_close_v1(&gate);
    return 3;
  }

  errno=0;
  if(syscall(SYS_fork)!=-1 || errno!=EPERM){
    apollyon_claim_protected_first_entry_close_v1(&gate);
    return 4;
  }

  if(apollyon_claim_process_identity_pidfd_state_v2(
      gate.lock.self.retained.pidfd
    )!=0){
    apollyon_claim_protected_first_entry_close_v1(&gate);
    return 5;
  }

  apollyon_claim_protected_first_entry_close_v1(&gate);
  if(gate.lock.self.retained.pidfd!=-1) return 6;
  return 0;
}

int main(int argc,char **argv) {
  if(argc!=2 || strcmp(argv[1],"--self-test")!=0){
    fputs("HOLD=source_only_self_test_only\n",stderr);
    return 2;
  }

  const int rc=positive_case();
  if(rc!=0){
    fprintf(stderr,"HOLD=protected_first_entry_case_%d\n",rc);
    return 1;
  }

  puts("VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_V1_PROOF_GREEN");
  puts("fixed_path_custody_verified=true");
  puts("expected_executable_fd_derived_internally=true");
  puts("expected_cmdline_derived_internally=true");
  puts("visible_generation_revalidated_after_lock=true");
  puts("fixed_path_expected_source_bound=true");
  puts("self_observed_no_clone_no_exec_chain_bound=true");
  puts("static_first_instruction_proven=false");
  puts("protected_expected_source_origin_proven=false");
  puts("protected_parent_origin_proven=false");
  puts("xiphos_host_qualification_performed=false");
  puts("durable_attempt_claim_performed=false");
  puts("training_execution_performed=false");
  puts("funds_movement=false");
  return 0;
}
