#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <signal.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1"
#define MANAGER_EXE "/usr/lib/systemd/systemd"
#define NODE_EXE "/usr/bin/node"
#define SERVICE_UNIT "void-node-live.service"
#define MAX_FILE (1024U*1024U)
#define MAX_PIDS 128U
#define MAX_ARGS 64U

#ifndef SYS_pidfd_open
#error "SYS_pidfd_open unavailable"
#endif
#ifndef SYS_pidfd_send_signal
#error "SYS_pidfd_send_signal unavailable"
#endif

typedef struct { unsigned char data[64]; uint32_t datalen; uint64_t bitlen; uint32_t state[8]; } sha256_ctx;
static const uint32_t K[64]={0x428a2f98U,0x71374491U,0xb5c0fbcfU,0xe9b5dba5U,0x3956c25bU,0x59f111f1U,0x923f82a4U,0xab1c5ed5U,0xd807aa98U,0x12835b01U,0x243185beU,0x550c7dc3U,0x72be5d74U,0x80deb1feU,0x9bdc06a7U,0xc19bf174U,0xe49b69c1U,0xefbe4786U,0x0fc19dc6U,0x240ca1ccU,0x2de92c6fU,0x4a7484aaU,0x5cb0a9dcU,0x76f988daU,0x983e5152U,0xa831c66dU,0xb00327c8U,0xbf597fc7U,0xc6e00bf3U,0xd5a79147U,0x06ca6351U,0x14292967U,0x27b70a85U,0x2e1b2138U,0x4d2c6dfcU,0x53380d13U,0x650a7354U,0x766a0abbU,0x81c2c92eU,0x92722c85U,0xa2bfe8a1U,0xa81a664bU,0xc24b8b70U,0xc76c51a3U,0xd192e819U,0xd6990624U,0xf40e3585U,0x106aa070U,0x19a4c116U,0x1e376c08U,0x2748774cU,0x34b0bcb5U,0x391c0cb3U,0x4ed8aa4aU,0x5b9cca4fU,0x682e6ff3U,0x748f82eeU,0x78a5636fU,0x84c87814U,0x8cc70208U,0x90befffaU,0xa4506cebU,0xbef9a3f7U,0xc67178f2U};
static uint32_t rotr(uint32_t x,uint32_t n){return(x>>n)|(x<<(32U-n));}
static void sha_transform(sha256_ctx*c,const unsigned char d[64]){uint32_t m[64];for(size_t i=0;i<16;i++){size_t j=i*4;m[i]=((uint32_t)d[j]<<24)|((uint32_t)d[j+1]<<16)|((uint32_t)d[j+2]<<8)|d[j+3];}for(size_t i=16;i<64;i++){uint32_t s0=rotr(m[i-15],7)^rotr(m[i-15],18)^(m[i-15]>>3),s1=rotr(m[i-2],17)^rotr(m[i-2],19)^(m[i-2]>>10);m[i]=m[i-16]+s0+m[i-7]+s1;}uint32_t a=c->state[0],b=c->state[1],cc=c->state[2],dd=c->state[3],e=c->state[4],f=c->state[5],g=c->state[6],h=c->state[7];for(size_t i=0;i<64;i++){uint32_t s1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^((~e)&g),t1=h+s1+ch+K[i]+m[i],s0=rotr(a,2)^rotr(a,13)^rotr(a,22),maj=(a&b)^(a&cc)^(b&cc),t2=s0+maj;h=g;g=f;f=e;e=dd+t1;dd=cc;cc=b;b=a;a=t1+t2;}c->state[0]+=a;c->state[1]+=b;c->state[2]+=cc;c->state[3]+=dd;c->state[4]+=e;c->state[5]+=f;c->state[6]+=g;c->state[7]+=h;}
static void sha_init(sha256_ctx*c){c->datalen=0;c->bitlen=0;c->state[0]=0x6a09e667U;c->state[1]=0xbb67ae85U;c->state[2]=0x3c6ef372U;c->state[3]=0xa54ff53aU;c->state[4]=0x510e527fU;c->state[5]=0x9b05688cU;c->state[6]=0x1f83d9abU;c->state[7]=0x5be0cd19U;}
static void sha_update(sha256_ctx*c,const unsigned char*d,size_t n){for(size_t i=0;i<n;i++){c->data[c->datalen++]=d[i];if(c->datalen==64U){sha_transform(c,c->data);c->bitlen+=512U;c->datalen=0;}}}
static void sha_final(sha256_ctx*c,unsigned char h[32]){uint32_t i=c->datalen;c->data[i++]=0x80U;if(i>56U){while(i<64U)c->data[i++]=0;sha_transform(c,c->data);i=0;}while(i<56U)c->data[i++]=0;c->bitlen+=(uint64_t)c->datalen*8U;for(size_t j=0;j<8;j++)c->data[63U-j]=(unsigned char)(c->bitlen>>(j*8U));sha_transform(c,c->data);for(size_t j=0;j<8;j++){h[j*4]=(unsigned char)(c->state[j]>>24);h[j*4+1]=(unsigned char)(c->state[j]>>16);h[j*4+2]=(unsigned char)(c->state[j]>>8);h[j*4+3]=(unsigned char)c->state[j];}}
static void sha_hex(const unsigned char*d,size_t n,char out[65]){sha256_ctx c;unsigned char h[32];static const char x[]="0123456789abcdef";sha_init(&c);sha_update(&c,d,n);sha_final(&c,h);for(size_t i=0;i<32;i++){out[i*2]=x[h[i]>>4];out[i*2+1]=x[h[i]&15U];}out[64]='\0';}

typedef struct {
  pid_t pid;
  pid_t ppid;
  unsigned long long start_ticks;
  uid_t uid;
  gid_t gid;
  char comm[64];
  char cgroup[PATH_MAX];
  char exe[PATH_MAX];
  char cmd_sha256[65];
  bool manager_shape;
  bool service_shape;
} proc_obs;

typedef struct {
  proc_obs manager;
  proc_obs service;
  char cgroup_mount[PATH_MAX];
  char manager_rel[PATH_MAX];
  char service_rel[PATH_MAX];
} selection;

static void hold(const char *reason){
  fprintf(stderr,MARKER "_HOLD reason=%s\n",reason);
  fprintf(stderr,"service_mutation=false\nnetwork_mutation=false\nrpc_contact=false\ncredential_access=false\nwallet_or_signer_access=false\npublic_presale_activation=false\nfunds_movement=false\n");
  exit(2);
}

static bool parse_u32(const char*s,unsigned long*out){char*e=NULL;errno=0;unsigned long v=strtoul(s,&e,10);if(errno||!s[0]||!e||*e!='\0'||v==0UL)return false;*out=v;return true;}
static bool ends_with(const char*s,const char*suffix){size_t a=strlen(s),b=strlen(suffix);return a>=b&&memcmp(s+a-b,suffix,b)==0;}

static unsigned char *read_all(const char *path,size_t max,size_t *n_out){
  int fd=open(path,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
  if(fd<0)return NULL;
  unsigned char *buf=malloc(max+1U); if(!buf){close(fd);return NULL;}
  size_t total=0;
  while(total<max+1U){ssize_t n=read(fd,buf+total,max+1U-total);if(n<0){if(errno==EINTR)continue;free(buf);close(fd);return NULL;}if(n==0)break;total+=(size_t)n;}
  close(fd);
  if(total==0||total>max){free(buf);return NULL;}
  buf[total]='\0';*n_out=total;return buf;
}

static bool safe_root_ancestors(const char *path){
  char buf[PATH_MAX];size_t len=strlen(path);if(len==0||len>=sizeof(buf)||path[0]!='/')return false;memcpy(buf,path,len+1);
  for(size_t i=1;i<len;i++){if(buf[i]!='/')continue;char saved=buf[i];buf[i]='\0';struct stat st;if(lstat(buf,&st)!=0||!S_ISDIR(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=0||(st.st_mode&0022)!=0){buf[i]=saved;return false;}buf[i]=saved;}
  return true;
}
static bool safe_root_exec(const char *path){struct stat st;if(!safe_root_ancestors(path)||lstat(path,&st)!=0)return false;return S_ISREG(st.st_mode)&&!S_ISLNK(st.st_mode)&&st.st_uid==0&&st.st_nlink==1&&(st.st_mode&0022)==0&&(st.st_mode&0111)!=0;}

static bool parse_status_ids(pid_t pid,uid_t *uid,gid_t *gid){
  char p[64];snprintf(p,sizeof(p),"/proc/%ld/status",(long)pid);size_t n=0;unsigned char*b=read_all(p,MAX_FILE,&n);if(!b)return false;
  char *save=NULL,*line=strtok_r((char*)b,"\n",&save);bool u=false,g=false;unsigned long uv[4]={0},gv[4]={0};
  while(line){if(strncmp(line,"Uid:",4)==0){if(sscanf(line+4,"%lu %lu %lu %lu",&uv[0],&uv[1],&uv[2],&uv[3])==4)u=true;}else if(strncmp(line,"Gid:",4)==0){if(sscanf(line+4,"%lu %lu %lu %lu",&gv[0],&gv[1],&gv[2],&gv[3])==4)g=true;}line=strtok_r(NULL,"\n",&save);}free(b);
  if(!u||!g||uv[0]!=uv[1]||uv[0]!=uv[2]||uv[0]!=uv[3]||gv[0]!=gv[1]||gv[0]!=gv[2]||gv[0]!=gv[3]) return false;
  *uid=(uid_t)uv[0];
  *gid=(gid_t)gv[0];
  return true;
}

static bool parse_stat(pid_t pid,pid_t *ppid,unsigned long long *start,char comm[64]){
  char p[64];snprintf(p,sizeof(p),"/proc/%ld/stat",(long)pid);size_t n=0;unsigned char*b=read_all(p,MAX_FILE,&n);if(!b)return false;
  char *s=(char*)b,*l=strchr(s,'('),*r=strrchr(s,')');if(!l||!r||r<=l+1){free(b);return false;}size_t clen=(size_t)(r-l-1);if(clen>=64){free(b);return false;}memcpy(comm,l+1,clen);comm[clen]='\0';
  char *rest=r+1;while(*rest==' ')rest++;char *copy=strdup(rest);if(!copy){free(b);return false;}char *save=NULL,*tok=strtok_r(copy," ", &save);size_t idx=0;unsigned long pv=0;unsigned long long st=0;bool okp=false,oks=false;
  while(tok){if(idx==1){char*e=NULL;errno=0;pv=strtoul(tok,&e,10);okp=!errno&&e&&*e=='\0'&&pv>0;}if(idx==19){char*e=NULL;errno=0;st=strtoull(tok,&e,10);oks=!errno&&e&&*e=='\0'&&st>0;}idx++;tok=strtok_r(NULL," ",&save);}free(copy);free(b);if(!okp||!oks)return false;*ppid=(pid_t)pv;*start=st;return true;
}

static bool read_cgroup(pid_t pid,char out[PATH_MAX]){
  char p[64];snprintf(p,sizeof(p),"/proc/%ld/cgroup",(long)pid);size_t n=0;unsigned char*b=read_all(p,MAX_FILE,&n);if(!b)return false;char *save=NULL,*line=strtok_r((char*)b,"\n",&save);size_t found=0;
  while(line){if(strncmp(line,"0::",3)==0){const char*v=line+3;size_t len=strlen(v);if(len==0||len>=PATH_MAX||v[0]!='/'){free(b);return false;}memcpy(out,v,len+1);found++;}line=strtok_r(NULL,"\n",&save);}free(b);return found==1;
}

static bool read_exe(pid_t pid,char out[PATH_MAX]){char p[64];snprintf(p,sizeof(p),"/proc/%ld/exe",(long)pid);ssize_t n=readlink(p,out,PATH_MAX-1);if(n<=0||n>=PATH_MAX-1)return false;out[n]='\0';return true;}

static bool cmdline_shape(pid_t pid,bool manager,char sha[65]){
  char p[64];snprintf(p,sizeof(p),"/proc/%ld/cmdline",(long)pid);size_t n=0;unsigned char*b=read_all(p,MAX_FILE,&n);if(!b)return false;sha_hex(b,n,sha);
  char *args[MAX_ARGS]={0};size_t count=0;size_t pos=0;while(pos<n){size_t len=strnlen((char*)b+pos,n-pos);if(len==n-pos){free(b);return false;}if(len>0){if(count>=MAX_ARGS){free(b);return false;}args[count++]=(char*)b+pos;}pos+=len+1;}
  bool ok=false;if(manager){ok=count==2&&strcmp(args[0],MANAGER_EXE)==0&&strcmp(args[1],"--user")==0;}else{bool branch=false,index=false;ok=count>=2&&strcmp(args[0],NODE_EXE)==0;for(size_t i=1;i<count;i++){if(strcmp(args[i],"--conditions=void-process-source-branch-main")==0)branch=true;if(ends_with(args[i],"/src/index.ts"))index=true;}ok=ok&&branch&&index;}free(b);return ok;
}

static bool observe(pid_t pid,proc_obs *o,const char *manager_rel,const char *service_rel,pid_t manager_pid){
  memset(o,0,sizeof(*o));o->pid=pid;if(!parse_status_ids(pid,&o->uid,&o->gid))return false;if(!parse_stat(pid,&o->ppid,&o->start_ticks,o->comm))return false;if(!read_cgroup(pid,o->cgroup))return false;if(!read_exe(pid,o->exe))return false;
  char manager_sha[65]={0},service_sha[65]={0};bool mgr_cmd=cmdline_shape(pid,true,manager_sha);bool svc_cmd=cmdline_shape(pid,false,service_sha);
  if(mgr_cmd)memcpy(o->cmd_sha256,manager_sha,sizeof(o->cmd_sha256));else if(svc_cmd)memcpy(o->cmd_sha256,service_sha,sizeof(o->cmd_sha256));
  o->manager_shape=o->ppid==1&&strcmp(o->comm,"systemd")==0&&strcmp(o->cgroup,manager_rel)==0&&strcmp(o->exe,MANAGER_EXE)==0&&safe_root_exec(MANAGER_EXE)&&mgr_cmd;
  o->service_shape=manager_pid>1&&o->ppid==manager_pid&&strcmp(o->comm,"node")==0&&strcmp(o->cgroup,service_rel)==0&&strcmp(o->exe,NODE_EXE)==0&&safe_root_exec(NODE_EXE)&&svc_cmd;
  return true;
}

static bool cgroup_mount(char out[PATH_MAX]){
  size_t n=0;unsigned char*b=read_all("/proc/self/mountinfo",MAX_FILE,&n);if(!b)return false;char *save=NULL,*line=strtok_r((char*)b,"\n",&save);size_t found=0;
  while(line){char *sep=strstr(line," - cgroup2 ");if(sep){char prefix[PATH_MAX*2];size_t plen=(size_t)(sep-line);if(plen>=sizeof(prefix)){free(b);return false;}memcpy(prefix,line,plen);prefix[plen]='\0';char *sv=NULL,*tok=strtok_r(prefix," ",&sv);size_t idx=0;char *mount=NULL;while(tok){if(idx==4){mount=tok;break;}idx++;tok=strtok_r(NULL," ",&sv);}if(!mount||strchr(mount,'\\')){free(b);return false;}size_t ml=strlen(mount);if(ml==0||ml>=PATH_MAX){free(b);return false;}memcpy(out,mount,ml+1);found++;}line=strtok_r(NULL,"\n",&save);}free(b);return found==1;
}

static size_t read_pids(const char *path,pid_t out[MAX_PIDS]){size_t n=0;unsigned char*b=read_all(path,MAX_FILE,&n);if(!b)hold("cgroup_procs_unreadable");char *save=NULL,*line=strtok_r((char*)b,"\n",&save);size_t count=0;while(line){if(*line){unsigned long v=0;if(!parse_u32(line,&v)||v>INT_MAX||count>=MAX_PIDS){free(b);hold("cgroup_procs_invalid");}out[count++]=(pid_t)v;}line=strtok_r(NULL,"\n",&save);}free(b);return count;}

static selection select_live(uid_t uid,gid_t gid){selection s;memset(&s,0,sizeof(s));if(!cgroup_mount(s.cgroup_mount))hold("cgroup2_mount_invalid");int n=snprintf(s.manager_rel,sizeof(s.manager_rel),"/user.slice/user-%lu.slice/user@%lu.service/init.scope",(unsigned long)uid,(unsigned long)uid);if(n<=0||(size_t)n>=sizeof(s.manager_rel))hold("manager_cgroup_path_invalid");n=snprintf(s.service_rel,sizeof(s.service_rel),"/user.slice/user-%lu.slice/user@%lu.service/app.slice/%s",(unsigned long)uid,(unsigned long)uid,SERVICE_UNIT);if(n<=0||(size_t)n>=sizeof(s.service_rel))hold("service_cgroup_path_invalid");
  char mp[PATH_MAX],sp[PATH_MAX];if(snprintf(mp,sizeof(mp),"%s%s/cgroup.procs",s.cgroup_mount,s.manager_rel)<=0||snprintf(sp,sizeof(sp),"%s%s/cgroup.procs",s.cgroup_mount,s.service_rel)<=0)hold("cgroup_procs_path_invalid");pid_t pids[MAX_PIDS];size_t pc=read_pids(mp,pids);size_t mc=0;for(size_t i=0;i<pc;i++){proc_obs o;if(!observe(pids[i],&o,s.manager_rel,s.service_rel,-1))continue;if(o.uid==uid&&o.gid==gid&&o.manager_shape){s.manager=o;mc++;}}if(mc!=1)hold("manager_candidate_count_invalid");pc=read_pids(sp,pids);size_t sc=0;for(size_t i=0;i<pc;i++){proc_obs o;if(!observe(pids[i],&o,s.manager_rel,s.service_rel,s.manager.pid))continue;if(o.uid==uid&&o.gid==gid&&o.service_shape){s.service=o;sc++;}}if(sc!=1)hold("service_candidate_count_invalid");return s;}

static int pidfd_open0(pid_t pid){return (int)syscall(SYS_pidfd_open,pid,0U);}
static bool pidfd_alive(int fd){return syscall(SYS_pidfd_send_signal,fd,0,NULL,0U)==0;}
static bool same_obs(const proc_obs*a,const proc_obs*b){return a->pid==b->pid&&a->ppid==b->ppid&&a->start_ticks==b->start_ticks&&a->uid==b->uid&&a->gid==b->gid&&strcmp(a->comm,b->comm)==0&&strcmp(a->cgroup,b->cgroup)==0&&strcmp(a->exe,b->exe)==0&&strcmp(a->cmd_sha256,b->cmd_sha256)==0;}

static int self_test(void){char h[65];sha_hex((const unsigned char*)"abc",3U,h);if(strcmp(h,"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")!=0)return 1;if(!ends_with("/x/src/index.ts","/src/index.ts"))return 1;if(ends_with("/x/src/index.ts.bak","/src/index.ts"))return 1;int fd=pidfd_open0(getpid());if(fd<0)return 1;bool alive=pidfd_alive(fd);close(fd);if(!alive)return 1;puts(MARKER "_SELF_TEST_GREEN");puts("sha256_internal_verified=true");puts("pidfd_open_self_verified=true");puts("pidfd_send_signal_zero_verified=true");puts("service_mutation=false");puts("rpc_contact=false");puts("public_presale_activation=false");puts("funds_movement=false");return 0;}

int main(int argc,char **argv){if(argc==2&&strcmp(argv[1],"--self-test")==0)return self_test();if(geteuid()!=0)hold("root_required");if(argc!=6||strcmp(argv[1],"--select")!=0||strcmp(argv[2],"--runtime-uid")!=0||strcmp(argv[4],"--runtime-gid")!=0)hold("arguments_invalid");unsigned long uv=0,gv=0;if(!parse_u32(argv[3],&uv)||!parse_u32(argv[5],&gv)||uv>UINT_MAX||gv>UINT_MAX)hold("runtime_identity_invalid");uid_t uid=(uid_t)uv;gid_t gid=(gid_t)gv;selection before=select_live(uid,gid);int mfd=pidfd_open0(before.manager.pid),sfd=pidfd_open0(before.service.pid);if(mfd<0||sfd<0){if(mfd>=0)close(mfd);if(sfd>=0)close(sfd);hold("pidfd_open_failed");}if(!pidfd_alive(mfd)||!pidfd_alive(sfd)){close(mfd);close(sfd);hold("pidfd_not_live");}
  printf(MARKER "_READY manager_pid=%ld manager_start_ticks=%llu manager_cmdline_sha256=%s service_pid=%ld service_start_ticks=%llu service_cmdline_sha256=%s\n",(long)before.manager.pid,before.manager.start_ticks,before.manager.cmd_sha256,(long)before.service.pid,before.service.start_ticks,before.service.cmd_sha256);fflush(stdout);
  char token[32]={0};if(!fgets(token,sizeof(token),stdin)||strcmp(token,"VERIFY\n")!=0){close(mfd);close(sfd);hold("verification_token_missing");}
  if(!pidfd_alive(mfd)||!pidfd_alive(sfd)){close(mfd);close(sfd);hold("pidfd_liveness_changed");}selection after=select_live(uid,gid);if(!same_obs(&before.manager,&after.manager)||!same_obs(&before.service,&after.service)){close(mfd);close(sfd);hold("selection_changed_during_collection");}
  close(mfd);close(sfd);printf(MARKER "_GREEN manager_pid=%ld manager_start_ticks=%llu manager_cmdline_sha256=%s service_pid=%ld service_start_ticks=%llu service_cmdline_sha256=%s\n",(long)after.manager.pid,after.manager.start_ticks,after.manager.cmd_sha256,(long)after.service.pid,after.service.start_ticks,after.service.cmd_sha256);puts("pidfds_retained_during_collection=true");puts("systemctl_user_selector_authority=false");puts("service_mutation=false");puts("network_mutation=false");puts("rpc_contact=false");puts("credential_access=false");puts("wallet_or_signer_access=false");puts("public_presale_activation=false");puts("funds_movement=false");return 0;}
