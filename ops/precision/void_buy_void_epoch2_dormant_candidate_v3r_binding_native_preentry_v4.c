#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <stdbool.h>
#include <stdint.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4"
#define FIXED_ROOT "/opt/void-buy-void-epoch2-dormant-v3r-binding-v4"
#define FIXED_SELF FIXED_ROOT "/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v4"
#define FIXED_BINDER FIXED_ROOT "/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v4.mjs"
#define FIXED_NODE "/usr/bin/node"
#define FIXED_DEVNULL "/dev/null"
#define FIXED_POLICY "/opt/void-buy-void-epoch2-live-composition-v3/policy-v3.conf"
#define POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3"
#define CONFIRM "RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4"
#define PREENTRY_ENV "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4=" MARKER
#define BINDER_FD_ENV_PREFIX "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4_BINDER_FD="
#define PROOF_FD_ENV_PREFIX "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4_PROOF_FD="
#define PROOF_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PARENT_PROOF_V4"
#define BINDER_GIT_BLOB "5c3f2f8f6d49e67017ad30e6c61bd8af6a11a3ab"
#define BINDER_BYTES 52936U
#define MAX_POLICY_BYTES 1024U
#define MAX_RUNNER_BYTES (4U * 1024U * 1024U)
#define MAX_NODE_BYTES (512U * 1024U * 1024U)

static const unsigned char BINDER_SHA256[32]={
  0xa6,0x6d,0xfc,0x54,0xa7,0xcb,0xae,0xd0,
  0x25,0x71,0x19,0xfb,0x5f,0x6e,0xe0,0xd4,
  0xcd,0x09,0x4c,0x31,0xad,0x04,0x07,0x35,
  0x82,0x19,0x60,0x1f,0x46,0x6f,0xcf,0x11
};

typedef struct{unsigned char data[64];uint32_t datalen;uint64_t bitlen;uint32_t state[8];} sha256_ctx;
static const uint32_t SHA256_K[64]={
0x428a2f98U,0x71374491U,0xb5c0fbcfU,0xe9b5dba5U,0x3956c25bU,0x59f111f1U,0x923f82a4U,0xab1c5ed5U,
0xd807aa98U,0x12835b01U,0x243185beU,0x550c7dc3U,0x72be5d74U,0x80deb1feU,0x9bdc06a7U,0xc19bf174U,
0xe49b69c1U,0xefbe4786U,0x0fc19dc6U,0x240ca1ccU,0x2de92c6fU,0x4a7484aaU,0x5cb0a9dcU,0x76f988daU,
0x983e5152U,0xa831c66dU,0xb00327c8U,0xbf597fc7U,0xc6e00bf3U,0xd5a79147U,0x06ca6351U,0x14292967U,
0x27b70a85U,0x2e1b2138U,0x4d2c6dfcU,0x53380d13U,0x650a7354U,0x766a0abbU,0x81c2c92eU,0x92722c85U,
0xa2bfe8a1U,0xa81a664bU,0xc24b8b70U,0xc76c51a3U,0xd192e819U,0xd6990624U,0xf40e3585U,0x106aa070U,
0x19a4c116U,0x1e376c08U,0x2748774cU,0x34b0bcb5U,0x391c0cb3U,0x4ed8aa4aU,0x5b9cca4fU,0x682e6ff3U,
0x748f82eeU,0x78a5636fU,0x84c87814U,0x8cc70208U,0x90befffaU,0xa4506cebU,0xbef9a3f7U,0xc67178f2U};
static uint32_t rotr32(uint32_t x,uint32_t n){return(x>>n)|(x<<(32U-n));}
static void sha256_transform(sha256_ctx*c,const unsigned char d[64]){
  uint32_t m[64];for(size_t i=0;i<16;i++){size_t j=i*4U;m[i]=((uint32_t)d[j]<<24)|((uint32_t)d[j+1]<<16)|((uint32_t)d[j+2]<<8)|(uint32_t)d[j+3];}
  for(size_t i=16;i<64;i++){uint32_t s0=rotr32(m[i-15],7)^rotr32(m[i-15],18)^(m[i-15]>>3),s1=rotr32(m[i-2],17)^rotr32(m[i-2],19)^(m[i-2]>>10);m[i]=m[i-16]+s0+m[i-7]+s1;}
  uint32_t a=c->state[0],b=c->state[1],cc=c->state[2],dd=c->state[3],e=c->state[4],f=c->state[5],g=c->state[6],h=c->state[7];
  for(size_t i=0;i<64;i++){uint32_t s1=rotr32(e,6)^rotr32(e,11)^rotr32(e,25),ch=(e&f)^((~e)&g),t1=h+s1+ch+SHA256_K[i]+m[i],s0=rotr32(a,2)^rotr32(a,13)^rotr32(a,22),maj=(a&b)^(a&cc)^(b&cc),t2=s0+maj;h=g;g=f;f=e;e=dd+t1;dd=cc;cc=b;b=a;a=t1+t2;}
  c->state[0]+=a;c->state[1]+=b;c->state[2]+=cc;c->state[3]+=dd;c->state[4]+=e;c->state[5]+=f;c->state[6]+=g;c->state[7]+=h;
}
static void sha256_init(sha256_ctx*c){c->datalen=0;c->bitlen=0;c->state[0]=0x6a09e667U;c->state[1]=0xbb67ae85U;c->state[2]=0x3c6ef372U;c->state[3]=0xa54ff53aU;c->state[4]=0x510e527fU;c->state[5]=0x9b05688cU;c->state[6]=0x1f83d9abU;c->state[7]=0x5be0cd19U;}
static void sha256_update(sha256_ctx*c,const unsigned char*d,size_t n){for(size_t i=0;i<n;i++){c->data[c->datalen++]=d[i];if(c->datalen==64U){sha256_transform(c,c->data);c->bitlen+=512U;c->datalen=0;}}}
static void sha256_final(sha256_ctx*c,unsigned char h[32]){uint32_t i=c->datalen;c->data[i++]=0x80U;if(i>56U){while(i<64U)c->data[i++]=0;sha256_transform(c,c->data);i=0;}while(i<56U)c->data[i++]=0;c->bitlen+=(uint64_t)c->datalen*8U;for(size_t j=0;j<8;j++)c->data[63U-j]=(unsigned char)(c->bitlen>>(j*8U));sha256_transform(c,c->data);for(size_t j=0;j<8;j++){h[j*4U]=(unsigned char)(c->state[j]>>24);h[j*4U+1]=(unsigned char)(c->state[j]>>16);h[j*4U+2]=(unsigned char)(c->state[j]>>8);h[j*4U+3]=(unsigned char)c->state[j];}}
static void sha256_buffer(const unsigned char*d,size_t n,unsigned char h[32]){sha256_ctx c;sha256_init(&c);sha256_update(&c,d,n);sha256_final(&c,h);}
static bool sha256_fd_matches(int fd,const unsigned char expected[32]){
  if(lseek(fd,0,SEEK_SET)<0)return false;
  sha256_ctx c;sha256_init(&c);unsigned char b[8192];
  for(;;){ssize_t n=read(fd,b,sizeof(b));if(n<0){if(errno==EINTR)continue;return false;}if(n==0)break;sha256_update(&c,b,(size_t)n);}
  unsigned char h[32];sha256_final(&c,h);if(lseek(fd,0,SEEK_SET)<0)return false;return memcmp(h,expected,32U)==0;
}

typedef struct{char expected_head[41];char node_sha256[65];size_t node_bytes;} policy_v1;
static bool child_created=false;
static bool proof_released=false;
static bool binder_source_release_started=false;

static const char*sensitive_authority_state(void){
  return binder_source_release_started?"unproven_after_binder_source_release":"false";
}

static void hold(const char*reason){
  fprintf(stderr,"%s_HOLD reason=%s\n",MARKER,reason);
  fprintf(stderr,"native_first_entry=true\n");
  fprintf(stderr,"child_process_created=%s\n",child_created?"true":"false");
  fprintf(stderr,"binder_parent_proof_released=%s\n",proof_released?"true":"false");
  fprintf(stderr,"binder_source_release_started=%s\n",binder_source_release_started?"true":"false");
  fprintf(stderr,"credential_content_access=%s\n",sensitive_authority_state());
  fprintf(stderr,"private_key_access=%s\n",sensitive_authority_state());
  fprintf(stderr,"signing=%s\n",sensitive_authority_state());
  fprintf(stderr,"transaction=false\n");
  fprintf(stderr,"payment_acceptance=false\n");
  fprintf(stderr,"public_presale_activation=false\n");
  fprintf(stderr,"wc_void_market_activation=false\n");
  fprintf(stderr,"funds_movement=false\n");
  exit(2);
}
static bool lower_hex_exact(const char*s,size_t n){if(s==NULL||strlen(s)!=n)return false;for(size_t i=0;i<n;i++)if(!((s[i]>='0'&&s[i]<='9')||(s[i]>='a'&&s[i]<='f')))return false;return true;}
static bool decimal_size(const char*s,size_t maximum,size_t*out){if(s==NULL||*s=='\0')return false;size_t v=0;for(const char*p=s;*p;p++){if(*p<'0'||*p>'9')return false;size_t d=(size_t)(*p-'0');if(v>(maximum-d)/10U)return false;v=v*10U+d;}if(v==0||v>maximum)return false;*out=v;return true;}
static bool same_identity(const struct stat*a,const struct stat*b){return a->st_dev==b->st_dev&&a->st_ino==b->st_ino&&a->st_uid==b->st_uid&&a->st_gid==b->st_gid&&a->st_mode==b->st_mode&&a->st_nlink==b->st_nlink&&a->st_size==b->st_size;}
static bool safe_regular(const struct stat*st,bool executable){return S_ISREG(st->st_mode)&&st->st_uid==0&&st->st_nlink==1&&(st->st_mode&0022)==0&&(st->st_mode&(S_ISUID|S_ISGID))==0&&(!executable||(st->st_mode&0111)!=0);}
static void require_safe_dir(const char*p,const char*r){struct stat st;if(lstat(p,&st)!=0||!S_ISDIR(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=0||(st.st_mode&0022)!=0)hold(r);}
static void require_safe_ancestors(const char*p,const char*r){
  char b[PATH_MAX];size_t n=strlen(p);if(n==0||n>=sizeof(b)||p[0]!='/')hold(r);memcpy(b,p,n+1);require_safe_dir("/",r);
  for(size_t i=1;i<n;i++){if(b[i]!='/')continue;char s=b[i];b[i]='\0';require_safe_dir(b,r);b[i]=s;}
}
static int open_trusted(const char*p,bool executable,const char*r){
  require_safe_ancestors(p,r);struct stat before;if(lstat(p,&before)!=0||S_ISLNK(before.st_mode)||!safe_regular(&before,executable))hold(r);
  int fd=open(p,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);if(fd<0)hold(r);struct stat opened,visible;
  if(fstat(fd,&opened)!=0||lstat(p,&visible)!=0||!same_identity(&before,&opened)||!same_identity(&opened,&visible)||!safe_regular(&opened,executable)){close(fd);hold(r);}
  return fd;
}
static struct stat require_self_identity(void){
  char observed[PATH_MAX];ssize_t n=readlink("/proc/self/exe",observed,sizeof(observed)-1U);if(n<=0||(size_t)n>=sizeof(observed))hold("binder_preentry_self_unreadable");
  observed[n]='\0';if(strcmp(observed,FIXED_SELF)!=0)hold("binder_preentry_fixed_path_required");
  int fixed_fd=open_trusted(FIXED_SELF,true,"binder_preentry_self_custody_invalid");
  int actual_fd=open("/proc/self/exe",O_RDONLY|O_CLOEXEC);if(actual_fd<0){close(fixed_fd);hold("binder_preentry_self_actual_open_failed");}
  struct stat fixed_st,actual_st,visible;
  if(fstat(fixed_fd,&fixed_st)!=0||fstat(actual_fd,&actual_st)!=0||lstat(FIXED_SELF,&visible)!=0||
     !same_identity(&fixed_st,&actual_st)||!same_identity(&actual_st,&visible)){
    close(actual_fd);close(fixed_fd);hold("binder_preentry_self_running_generation_mismatch");
  }
  close(actual_fd);close(fixed_fd);return actual_st;
}
static void require_devnull_stdin(void){
  struct stat a,b;if(fstat(STDIN_FILENO,&a)!=0||lstat(FIXED_DEVNULL,&b)!=0||!S_ISCHR(a.st_mode)||!S_ISCHR(b.st_mode)||a.st_dev!=b.st_dev||a.st_ino!=b.st_ino||a.st_rdev!=b.st_rdev)hold("binder_preentry_caller_stdin_forbidden");
}
static bool write_all(int fd,const unsigned char*d,size_t n){size_t o=0;while(o<n){ssize_t w=write(fd,d+o,n-o);if(w<0){if(errno==EINTR)continue;return false;}if(w==0)return false;o+=(size_t)w;}return true;}
static bool stream_fd(int in_fd,int out_fd){
  if(lseek(in_fd,0,SEEK_SET)<0)return false;
  unsigned char b[8192];
  for(;;){ssize_t n=read(in_fd,b,sizeof(b));if(n<0){if(errno==EINTR)continue;return false;}if(n==0)break;binder_source_release_started=true;if(!write_all(out_fd,b,(size_t)n))return false;}
  return lseek(in_fd,0,SEEK_SET)>=0;
}
static bool read_start_ticks(pid_t pid,unsigned long long*out){
  char p[64];int n=snprintf(p,sizeof(p),"/proc/%ld/stat",(long)pid);if(n<=0||(size_t)n>=sizeof(p))return false;int fd=open(p,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);if(fd<0)return false;
  char b[4096];ssize_t got;do{got=read(fd,b,sizeof(b)-1U);}while(got<0&&errno==EINTR);close(fd);if(got<=0||(size_t)got>=sizeof(b))return false;b[got]='\0';
  char*right=strrchr(b,')');if(right==NULL||right[1]!=' ')return false;char*cur=right+2,*save=NULL;unsigned field=3U;
  for(char*t=strtok_r(cur," ",&save);t!=NULL;t=strtok_r(NULL," ",&save),field++){if(field!=22U)continue;errno=0;char*end=NULL;unsigned long long v=strtoull(t,&end,10);if(errno!=0||end==t||*end!='\0'||v==0ULL)return false;*out=v;return true;}return false;
}
static policy_v1 read_policy(void){
  int fd=open_trusted(FIXED_POLICY,false,"binder_preentry_policy_custody_invalid");struct stat st;if(fstat(fd,&st)!=0||st.st_size<=0||(uintmax_t)st.st_size>MAX_POLICY_BYTES){close(fd);hold("binder_preentry_policy_size_invalid");}
  size_t n=(size_t)st.st_size;char*buf=calloc(n+1U,1U);if(buf==NULL){close(fd);hold("binder_preentry_policy_alloc_failed");}size_t off=0;
  while(off<n){ssize_t got=read(fd,buf+off,n-off);if(got<0){if(errno==EINTR)continue;free(buf);close(fd);hold("binder_preentry_policy_read_failed");}if(got==0){free(buf);close(fd);hold("binder_preentry_policy_short_read");}off+=(size_t)got;}
  struct stat after,visible;if(fstat(fd,&after)!=0||lstat(FIXED_POLICY,&visible)!=0||!same_identity(&st,&after)||!same_identity(&after,&visible)){free(buf);close(fd);hold("binder_preentry_policy_changed");}close(fd);
  if(buf[n-1U]!='\n'){free(buf);hold("binder_preentry_policy_newline_required");}
  char*save=NULL,*lines[6];size_t count=0;for(char*l=strtok_r(buf,"\n",&save);l;l=strtok_r(NULL,"\n",&save)){if(count>=6U){free(buf);hold("binder_preentry_policy_shape_invalid");}lines[count++]=l;}if(count!=6U){free(buf);hold("binder_preentry_policy_shape_invalid");}
  const char*s0="schema=",*s1="expected_head=",*s2="runner_sha256=",*s3="runner_bytes=",*s4="node_sha256=",*s5="node_bytes=";
  if(strncmp(lines[0],s0,strlen(s0))!=0||strcmp(lines[0]+strlen(s0),POLICY_SCHEMA)!=0||
     strncmp(lines[1],s1,strlen(s1))!=0||strncmp(lines[2],s2,strlen(s2))!=0||
     strncmp(lines[3],s3,strlen(s3))!=0||strncmp(lines[4],s4,strlen(s4))!=0||
     strncmp(lines[5],s5,strlen(s5))!=0){free(buf);hold("binder_preentry_policy_schema_invalid");}
  policy_v1 p;memset(&p,0,sizeof(p));const char*head=lines[1]+strlen(s1),*runner_sha=lines[2]+strlen(s2),*runner_bytes=lines[3]+strlen(s3),*node_sha=lines[4]+strlen(s4),*node_bytes=lines[5]+strlen(s5);size_t ignored_runner_bytes=0;
  if(!lower_hex_exact(head,40U)||!lower_hex_exact(runner_sha,64U)||
     !decimal_size(runner_bytes,MAX_RUNNER_BYTES,&ignored_runner_bytes)||
     !lower_hex_exact(node_sha,64U)||!decimal_size(node_bytes,MAX_NODE_BYTES,&p.node_bytes)){free(buf);hold("binder_preentry_policy_value_invalid");}
  memcpy(p.expected_head,head,41U);memcpy(p.node_sha256,node_sha,65U);free(buf);return p;
}
static void sha256_fd_hex(int fd,char out[65]){
  if(lseek(fd,0,SEEK_SET)<0)hold("binder_preentry_digest_seek_failed");
  sha256_ctx c;sha256_init(&c);unsigned char b[8192];
  for(;;){ssize_t n=read(fd,b,sizeof(b));if(n<0){if(errno==EINTR)continue;hold("binder_preentry_digest_read_failed");}if(n==0)break;sha256_update(&c,b,(size_t)n);}
  unsigned char h[32];sha256_final(&c,h);static const char hex[]="0123456789abcdef";for(size_t i=0;i<32;i++){out[i*2U]=hex[h[i]>>4];out[i*2U+1U]=hex[h[i]&15U];}out[64]='\0';if(lseek(fd,0,SEEK_SET)<0)hold("binder_preentry_digest_rewind_failed");
}
static void require_node_policy(int fd,const policy_v1*p){
  struct stat st;if(fstat(fd,&st)!=0||st.st_size<=0||(uintmax_t)st.st_size!=(uintmax_t)p->node_bytes)hold("binder_preentry_node_size_mismatch");
  char h[65];sha256_fd_hex(fd,h);if(strcmp(h,p->node_sha256)!=0)hold("binder_preentry_node_digest_mismatch");
}
static void parse_args(int argc,char**argv,char source_head[41],char runtime_head[41]){
  if(argc!=8||strcmp(argv[1],"--run")!=0||strcmp(argv[2],"--confirm")!=0||
     strcmp(argv[3],CONFIRM)!=0||strcmp(argv[4],"--source-head")!=0||
     !lower_hex_exact(argv[5],40U)||strcmp(argv[6],"--runtime-head")!=0||
     !lower_hex_exact(argv[7],40U))hold("binder_preentry_arguments_invalid");
  memcpy(source_head,argv[5],41U);
  memcpy(runtime_head,argv[7],41U);
}
static void emit_proof(int fd,pid_t child,const char source_head[41],const char runtime_head[41],const struct stat*self,const struct stat*binder,const struct stat*node,unsigned long long parent_ticks,unsigned long long child_ticks){
  char proof[2176];int n=snprintf(proof,sizeof(proof),
    "{\"schema\":\"%s\",\"parent_pid\":%ld,\"parent_start_ticks\":\"%llu\",\"child_pid\":%ld,\"child_start_ticks\":\"%llu\",\"preentry_dev\":\"%ju\",\"preentry_ino\":\"%ju\",\"binder_dev\":\"%ju\",\"binder_ino\":\"%ju\",\"node_dev\":\"%ju\",\"node_ino\":\"%ju\",\"source_head\":\"%s\",\"runtime_head\":\"%s\"}\n",
    PROOF_SCHEMA,(long)getpid(),parent_ticks,(long)child,child_ticks,(uintmax_t)self->st_dev,(uintmax_t)self->st_ino,(uintmax_t)binder->st_dev,(uintmax_t)binder->st_ino,(uintmax_t)node->st_dev,(uintmax_t)node->st_ino,source_head,runtime_head);
  if(n<=0||(size_t)n>=sizeof(proof)||!write_all(fd,(const unsigned char*)proof,(size_t)n))hold("binder_preentry_parent_proof_write_failed");
}
static int self_test_hold(bool post_source){
  child_created=true;proof_released=true;binder_source_release_started=post_source;
  hold(post_source?"self_test_post_source":"self_test_pre_source");
  return 1;
}
static int self_test(void){
  static const unsigned char abc_expected[32]={0xba,0x78,0x16,0xbf,0x8f,0x01,0xcf,0xea,0x41,0x41,0x40,0xde,0x5d,0xae,0x22,0x23,0xb0,0x03,0x61,0xa3,0x96,0x17,0x7a,0x9c,0xb4,0x10,0xff,0x61,0xf2,0x00,0x15,0xad};
  unsigned char h[32];sha256_buffer((const unsigned char*)"abc",3U,h);if(memcmp(h,abc_expected,32U)!=0)return 1;if(BINDER_BYTES!=52936U||strlen(BINDER_GIT_BLOB)!=40U)return 1;
  puts(MARKER "_SELF_TEST_GREEN");puts("native_first_instruction=true");puts("fixed_self_path=true");puts("fixed_binder_path=true");puts("binder_exact_sha256_bound=true");puts("binder_git_blob_provenance_bound=true");puts("node_policy_sha256_bound=true");puts("binder_descriptor_retained=true");puts("node_descriptor_fexecve=true");puts("private_parent_proof_channel=true");puts("source_runtime_two_head_contract=true");puts("runtime_policy_head_separate_from_source_head=true");puts("caller_stdin_javascript_forbidden=true");puts("loader_environment_sanitized=true");puts("failure_truth_boundary_test_modes=true");puts("credential_content_access=false");puts("transaction=false");puts("public_presale_activation=false");puts("funds_movement=false");return 0;
}
int main(int argc,char**argv){
  if(argc==2&&strcmp(argv[1],"--self-test")==0)return self_test();
  if(argc==2&&strcmp(argv[1],"--self-test-hold-pre-source")==0)return self_test_hold(false);
  if(argc==2&&strcmp(argv[1],"--self-test-hold-post-source")==0)return self_test_hold(true);
  if(geteuid()!=0)hold("binder_preentry_root_required");
  char source_head[41],runtime_head[41];parse_args(argc,argv,source_head,runtime_head);struct stat self_st=require_self_identity();require_devnull_stdin();
  policy_v1 policy=read_policy();if(strcmp(runtime_head,policy.expected_head)!=0)hold("binder_preentry_runtime_head_policy_mismatch");
  int binder_fd=open_trusted(FIXED_BINDER,false,"binder_preentry_binder_custody_invalid");struct stat binder_st;if(fstat(binder_fd,&binder_st)!=0||(uintmax_t)binder_st.st_size!=BINDER_BYTES||!sha256_fd_matches(binder_fd,BINDER_SHA256)){close(binder_fd);hold("binder_preentry_binder_identity_mismatch");}
  int node_fd=open_trusted(FIXED_NODE,true,"binder_preentry_node_custody_invalid");require_node_policy(node_fd,&policy);
  struct stat node_st;if(fstat(node_fd,&node_st)!=0){close(node_fd);close(binder_fd);hold("binder_preentry_generation_snapshot_failed");}
  unsigned long long parent_ticks=0;if(!read_start_ticks(getpid(),&parent_ticks)){close(node_fd);close(binder_fd);hold("binder_preentry_parent_generation_unavailable");}
  int source_pipe[2],proof_pipe[2];if(pipe2(source_pipe,O_CLOEXEC)!=0||pipe2(proof_pipe,O_CLOEXEC)!=0){close(node_fd);close(binder_fd);hold("binder_preentry_pipe_failed");}
  if(signal(SIGPIPE,SIG_IGN)==SIG_ERR){close(source_pipe[0]);close(source_pipe[1]);close(proof_pipe[0]);close(proof_pipe[1]);close(node_fd);close(binder_fd);hold("binder_preentry_sigpipe_guard_failed");}
  pid_t child=fork();if(child<0){close(source_pipe[0]);close(source_pipe[1]);close(proof_pipe[0]);close(proof_pipe[1]);close(node_fd);close(binder_fd);hold("binder_preentry_fork_failed");}
  if(child==0){
    close(source_pipe[1]);close(proof_pipe[1]);if(dup2(source_pipe[0],STDIN_FILENO)<0)_exit(126);close(source_pipe[0]);
    int bf=fcntl(binder_fd,F_GETFD),pf=fcntl(proof_pipe[0],F_GETFD);if(bf<0||pf<0||fcntl(binder_fd,F_SETFD,bf&~FD_CLOEXEC)!=0||fcntl(proof_pipe[0],F_SETFD,pf&~FD_CLOEXEC)!=0)_exit(126);
    char binder_env[128],proof_env[128];if(snprintf(binder_env,sizeof(binder_env),BINDER_FD_ENV_PREFIX "%d",binder_fd)<=0||snprintf(proof_env,sizeof(proof_env),PROOF_FD_ENV_PREFIX "%d",proof_pipe[0])<=0)_exit(126);
    char*const next_argv[]={(char*)FIXED_NODE,(char*)"--input-type=module",(char*)"-",(char*)"--run",(char*)"--confirm",(char*)CONFIRM,(char*)"--source-head",source_head,(char*)"--runtime-head",policy.expected_head,NULL};
    char*const envp[]={(char*)"PATH=/usr/bin:/bin",(char*)"HOME=/root",(char*)"LANG=C",(char*)"LC_ALL=C",(char*)"TZ=UTC",(char*)PREENTRY_ENV,binder_env,proof_env,NULL};
    fexecve(node_fd,next_argv,envp);_exit(126);
  }
  child_created=true;close(source_pipe[0]);close(proof_pipe[0]);close(node_fd);
  unsigned long long child_ticks=0;if(!read_start_ticks(child,&child_ticks)){close(source_pipe[1]);close(proof_pipe[1]);close(binder_fd);(void)kill(child,SIGTERM);(void)waitpid(child,NULL,0);hold("binder_preentry_child_generation_unavailable");}
  emit_proof(proof_pipe[1],child,source_head,policy.expected_head,&self_st,&binder_st,&node_st,parent_ticks,child_ticks);proof_released=true;close(proof_pipe[1]);
  if(!stream_fd(binder_fd,source_pipe[1])){close(source_pipe[1]);close(binder_fd);(void)kill(child,SIGTERM);(void)waitpid(child,NULL,0);hold("binder_preentry_source_stream_failed");}
  close(source_pipe[1]);close(binder_fd);int status=0;pid_t waited;do{waited=waitpid(child,&status,0);}while(waited<0&&errno==EINTR);if(waited!=child)hold("binder_preentry_child_wait_failed");if(WIFEXITED(status))return WEXITSTATUS(status);hold("binder_preentry_child_not_cleanly_exited");
}
