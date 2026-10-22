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
#include <sys/mman.h>
#include <linux/memfd.h>
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
#define BINDER_GIT_BLOB "d2d648b144d3b406ff845a597fa4b9f54167b6bc"
#define BINDER_BYTES 66650U
#define MAX_POLICY_BYTES 1024U
#define MAX_RUNNER_BYTES (4U * 1024U * 1024U)
#define MAX_NODE_BYTES (512U * 1024U * 1024U)

static const unsigned char BINDER_SHA256[32]={
  0xc4,0x47,0x15,0x1d,0x7b,0xc4,0xd1,0xb3,
  0xff,0xc5,0xe9,0xc8,0xd5,0x8b,0x92,0xe8,
  0xf0,0x41,0xe3,0xaa,0x6c,0x0c,0x57,0x47,
  0xd6,0xda,0x62,0x14,0x71,0xe2,0x82,0x07
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
static bool lower_hex_span(const unsigned char*s,size_t n){
  if(s==NULL||n==0U)return false;
  for(size_t i=0U;i<n;i++)if(!((s[i]>='0'&&s[i]<='9')||(s[i]>='a'&&s[i]<='f')))return false;
  return true;
}
static bool decimal_size_span(const unsigned char*s,size_t n,size_t maximum,size_t*out){
  if(s==NULL||out==NULL||n==0U||s[0]=='0')return false;
  size_t v=0U;
  for(size_t i=0U;i<n;i++){
    if(s[i]<'0'||s[i]>'9')return false;
    size_t d=(size_t)(s[i]-'0');
    if(v>(maximum-d)/10U)return false;
    v=v*10U+d;
  }
  if(v==0U||v>maximum)return false;
  *out=v;
  return true;
}
static bool policy_line_value(
  const unsigned char*buf,size_t start,size_t len,const char*prefix,
  const unsigned char**value,size_t*value_len
){
  size_t prefix_len=strlen(prefix);
  if(buf==NULL||prefix==NULL||value==NULL||value_len==NULL||
     len<=prefix_len||memcmp(buf+start,prefix,prefix_len)!=0)return false;
  *value=buf+start+prefix_len;
  *value_len=len-prefix_len;
  return true;
}
static bool parse_policy_bytes(const unsigned char*buf,size_t n,policy_v1*out){
  if(buf==NULL||out==NULL||n==0U||n>MAX_POLICY_BYTES||buf[n-1U]!='\n')return false;
  size_t starts[6],lengths[6],count=0U,line_start=0U;
  for(size_t i=0U;i<n;i++){
    unsigned char ch=buf[i];
    if(ch=='\n'){
      if(i==line_start||count>=6U)return false;
      starts[count]=line_start;
      lengths[count]=i-line_start;
      count++;
      line_start=i+1U;
      continue;
    }
    /* Canonical policy bytes are visible non-space ASCII only. This rejects
     * NUL, CR, tabs, controls, high bytes and whitespace aliases before any
     * field interpretation. */
    if(ch<0x21U||ch>0x7eU)return false;
  }
  if(count!=6U||line_start!=n)return false;

  static const char*prefixes[6]={
    "schema=","expected_head=","runner_sha256=",
    "runner_bytes=","node_sha256=","node_bytes="
  };
  const unsigned char*values[6];size_t value_lengths[6];
  for(size_t i=0U;i<6U;i++){
    if(!policy_line_value(buf,starts[i],lengths[i],prefixes[i],
                          &values[i],&value_lengths[i]))return false;
  }
  if(value_lengths[0]!=strlen(POLICY_SCHEMA)||
     memcmp(values[0],POLICY_SCHEMA,value_lengths[0])!=0)return false;
  if(value_lengths[1]!=40U||!lower_hex_span(values[1],value_lengths[1]))return false;
  if(value_lengths[2]!=64U||!lower_hex_span(values[2],value_lengths[2]))return false;
  size_t runner_bytes=0U;
  if(!decimal_size_span(values[3],value_lengths[3],MAX_RUNNER_BYTES,&runner_bytes))return false;
  (void)runner_bytes;
  if(value_lengths[4]!=64U||!lower_hex_span(values[4],value_lengths[4]))return false;

  policy_v1 parsed;memset(&parsed,0,sizeof(parsed));
  if(!decimal_size_span(values[5],value_lengths[5],MAX_NODE_BYTES,&parsed.node_bytes))return false;
  memcpy(parsed.expected_head,values[1],40U);parsed.expected_head[40]='\0';
  memcpy(parsed.node_sha256,values[4],64U);parsed.node_sha256[64]='\0';
  *out=parsed;
  return true;
}
static bool same_identity(const struct stat*a,const struct stat*b){return a->st_dev==b->st_dev&&a->st_ino==b->st_ino&&a->st_uid==b->st_uid&&a->st_gid==b->st_gid&&a->st_mode==b->st_mode&&a->st_nlink==b->st_nlink&&a->st_size==b->st_size;}
static bool safe_regular(const struct stat*st,bool executable){return S_ISREG(st->st_mode)&&st->st_uid==0&&st->st_nlink==1&&(st->st_mode&0022)==0&&(st->st_mode&(S_ISUID|S_ISGID))==0&&(!executable||(st->st_mode&0111)!=0);}
static void require_safe_dir(const char*p,const char*r){struct stat st;if(lstat(p,&st)!=0||!S_ISDIR(st.st_mode)||S_ISLNK(st.st_mode)||st.st_uid!=0||(st.st_mode&0022)!=0)hold(r);}
static void require_safe_ancestors(const char*p,const char*r){
  char b[PATH_MAX];size_t n=strlen(p);if(n==0||n>=sizeof(b)||p[0]!='/')hold(r);memcpy(b,p,n+1);require_safe_dir("/",r);
  for(size_t i=1;i<n;i++){if(b[i]!='/')continue;char s=b[i];b[i]='\0';require_safe_dir(b,r);b[i]=s;}
}
/* The lstat->open interval must not wait if a concurrent privileged writer
 * substitutes a FIFO. The post-open fstat still requires an exact, root-owned
 * regular file. No executable authority or pathname fallback is added. */
static int open_leaf_nofollow_nonblocking(const char*p){
  return open(p,O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK);
}
static int open_trusted(const char*p,bool executable,const char*r){
  require_safe_ancestors(p,r);struct stat before;if(lstat(p,&before)!=0||S_ISLNK(before.st_mode)||!safe_regular(&before,executable))hold(r);
  int fd=open_leaf_nofollow_nonblocking(p);if(fd<0)hold(r);struct stat opened,visible;
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
/* Copy installed binder bytes BEFORE fork into a private source generation.
 * Hash the copied FD, then seal it against writes/growth/shrinkage. The
 * original root-owned inode is never streamed to a privileged child. */
static int stage_sealed_source(int source_fd,size_t accepted_bytes,const unsigned char expected_sha[32]){
  if(accepted_bytes==0U||accepted_bytes>MAX_RUNNER_BYTES)return -1;
  int sealed=memfd_create("void-epoch2-binder-verified-source",MFD_CLOEXEC|MFD_ALLOW_SEALING);
  if(sealed<0)return -1;
  if(lseek(source_fd,0,SEEK_SET)<0)goto fail;
  unsigned char buf[8192];size_t remaining=accepted_bytes;
  while(remaining>0U){
    size_t want=remaining<sizeof(buf)?remaining:sizeof(buf);
    ssize_t n=read(source_fd,buf,want);
    if(n<0&&errno==EINTR)continue;
    if(n<=0||!write_all(sealed,buf,(size_t)n))goto fail;
    remaining-=(size_t)n;
  }
  /* Even same-inode/same-size replacements must not be accepted. */
  for(;;){
    ssize_t n=read(source_fd,buf,1U);
    if(n<0&&errno==EINTR)continue;
    if(n!=0)goto fail;
    break;
  }
  struct stat st;
  if(fstat(sealed,&st)!=0||!S_ISREG(st.st_mode)||
     (uintmax_t)st.st_size!=(uintmax_t)accepted_bytes||
     !sha256_fd_matches(sealed,expected_sha))goto fail;
  const int require_seals=F_SEAL_WRITE|F_SEAL_GROW|F_SEAL_SHRINK|F_SEAL_SEAL;
  if(fcntl(sealed,F_ADD_SEALS,require_seals)!=0)goto fail;
  int applied=fcntl(sealed,F_GET_SEALS);
  if(applied<0||(applied&require_seals)!=require_seals||
     !sha256_fd_matches(sealed,expected_sha)||
     lseek(sealed,0,SEEK_SET)<0)goto fail;
  return sealed;
fail:
  close(sealed);
  return -1;
}
static bool same_content_generation(const struct stat*a,const struct stat*b){
  return same_identity(a,b)&&a->st_mtim.tv_sec==b->st_mtim.tv_sec&&
    a->st_mtim.tv_nsec==b->st_mtim.tv_nsec&&
    a->st_ctim.tv_sec==b->st_ctim.tv_sec&&
    a->st_ctim.tv_nsec==b->st_ctim.tv_nsec;
}
/* Release only the verified, sealed, exact-length byte snapshot. */
static bool stream_fd_exact(int in_fd,int out_fd,size_t expected_bytes){
  if(lseek(in_fd,0,SEEK_SET)<0)return false;
  unsigned char b[8192];size_t remaining=expected_bytes;
  while(remaining>0U){
    size_t want=remaining<sizeof(b)?remaining:sizeof(b);
    ssize_t n=read(in_fd,b,want);
    if(n<0&&errno==EINTR)continue;
    if(n<=0)return false;
    binder_source_release_started=true;
    if(!write_all(out_fd,b,(size_t)n))return false;
    remaining-=(size_t)n;
  }
  for(;;){
    ssize_t n=read(in_fd,b,1U);
    if(n<0&&errno==EINTR)continue;
    if(n!=0)return false;
    break;
  }
  return lseek(in_fd,0,SEEK_SET)>=0;
}

static bool read_start_ticks(pid_t pid,unsigned long long*out){
  char p[64];int n=snprintf(p,sizeof(p),"/proc/%ld/stat",(long)pid);if(n<=0||(size_t)n>=sizeof(p))return false;int fd=open(p,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);if(fd<0)return false;
  char b[4096];ssize_t got;do{got=read(fd,b,sizeof(b)-1U);}while(got<0&&errno==EINTR);close(fd);if(got<=0||(size_t)got>=sizeof(b))return false;b[got]='\0';
  char*right=strrchr(b,')');if(right==NULL||right[1]!=' ')return false;char*cur=right+2,*save=NULL;unsigned field=3U;
  for(char*t=strtok_r(cur," ",&save);t!=NULL;t=strtok_r(NULL," ",&save),field++){if(field!=22U)continue;errno=0;char*end=NULL;unsigned long long v=strtoull(t,&end,10);if(errno!=0||end==t||*end!='\0'||v==0ULL)return false;*out=v;return true;}return false;
}
static policy_v1 read_policy(void){
  int fd=open_trusted(FIXED_POLICY,false,"binder_preentry_policy_custody_invalid");
  struct stat st;
  if(fstat(fd,&st)!=0||st.st_size<=0||(uintmax_t)st.st_size>MAX_POLICY_BYTES){
    close(fd);hold("binder_preentry_policy_size_invalid");
  }
  size_t n=(size_t)st.st_size;
  unsigned char*buf=malloc(n);
  if(buf==NULL){close(fd);hold("binder_preentry_policy_alloc_failed");}
  size_t off=0U;
  while(off<n){
    ssize_t got=read(fd,buf+off,n-off);
    if(got<0){if(errno==EINTR)continue;free(buf);close(fd);hold("binder_preentry_policy_read_failed");}
    if(got==0){free(buf);close(fd);hold("binder_preentry_policy_short_read");}
    off+=(size_t)got;
  }
  struct stat after,visible;
  if(fstat(fd,&after)!=0||lstat(FIXED_POLICY,&visible)!=0||
     !same_identity(&st,&after)||!same_identity(&after,&visible)){
    free(buf);close(fd);hold("binder_preentry_policy_changed");
  }
  close(fd);
  policy_v1 p;
  if(!parse_policy_bytes(buf,n,&p)){
    free(buf);hold("binder_preentry_policy_canonical_invalid");
  }
  free(buf);
  return p;
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
  /* The parent speaks the compile-bound digest in its private proof pipe.
   * The child must never derive expected installed-source bytes from its
   * own mutable text or an unverified checkout. */
  char binder_hex[65];
  static const char digits[]="0123456789abcdef";
  for(size_t i=0U;i<sizeof(BINDER_SHA256);i++){
    binder_hex[i*2U]=digits[BINDER_SHA256[i]>>4];
    binder_hex[i*2U+1U]=digits[BINDER_SHA256[i]&0x0fU];
  }
  binder_hex[64]='\0';
  char proof[2176];int n=snprintf(proof,sizeof(proof),
    "{\"schema\":\"%s\",\"parent_pid\":%ld,\"parent_start_ticks\":\"%llu\",\"child_pid\":%ld,\"child_start_ticks\":\"%llu\",\"preentry_dev\":\"%ju\",\"preentry_ino\":\"%ju\",\"binder_dev\":\"%ju\",\"binder_ino\":\"%ju\",\"node_dev\":\"%ju\",\"node_ino\":\"%ju\",\"source_head\":\"%s\",\"runtime_head\":\"%s\",\"binder_bytes\":%u,\"binder_sha256\":\"%s\"}\n",
    PROOF_SCHEMA,(long)getpid(),parent_ticks,(long)child,child_ticks,(uintmax_t)self->st_dev,(uintmax_t)self->st_ino,(uintmax_t)binder->st_dev,(uintmax_t)binder->st_ino,(uintmax_t)node->st_dev,(uintmax_t)node->st_ino,source_head,runtime_head,(unsigned)BINDER_BYTES,binder_hex);
  if(n<=0||(size_t)n>=sizeof(proof)||!write_all(fd,(const unsigned char*)proof,(size_t)n))hold("binder_preentry_parent_proof_write_failed");
}
static bool self_test_sealed_source(void){
  /* No root, protected paths, Node, or signer: all data is disposable. */
  static const unsigned char accepted[6]={'A','B','C','D','E','F'};
  static const unsigned char substituted[6]={'U','V','W','X','Y','Z'};
  FILE*f=tmpfile();
  if(f==NULL)return false;
  int original=fileno(f),sealed=-1,staged_again=-1;
  int pfd[2]={-1,-1};bool ok=false;
  unsigned char digest[32],observed[6];struct stat before,after;
  sha256_buffer(accepted,sizeof(accepted),digest);
  if(original<0||!write_all(original,accepted,sizeof(accepted))||
     fstat(original,&before)!=0)goto out;
  sealed=stage_sealed_source(original,sizeof(accepted),digest);
  if(sealed<0)goto out;
  const int all_seals=F_SEAL_WRITE|F_SEAL_GROW|F_SEAL_SHRINK|F_SEAL_SEAL;
  int got_seals=fcntl(sealed,F_GET_SEALS);
  if(got_seals<0||(got_seals&all_seals)!=all_seals)goto out;
  errno=0;
  if(pwrite(sealed,substituted,sizeof(substituted),0)>=0||errno!=EPERM)goto out;
  /* Simulate a privileged same-inode writer after admission and before
   * source release. The old stat-only stream could now execute new bytes. */
  if(pwrite(original,substituted,sizeof(substituted),0)!=(ssize_t)sizeof(substituted)||
     fstat(original,&after)!=0||!same_identity(&before,&after))goto out;
  if(pipe(pfd)!=0)goto out;
  if(!stream_fd_exact(sealed,pfd[1],sizeof(accepted)))goto out;
  close(pfd[1]);pfd[1]=-1;
  ssize_t n=read(pfd[0],observed,sizeof(observed));
  if(n!=(ssize_t)sizeof(accepted)||memcmp(observed,accepted,sizeof(accepted))!=0)goto out;
  if(read(pfd[0],observed,1U)!=0)goto out;
  /* A fresh staging attempt from the modified original must fail digest
   * acceptance despite unchanged dev/ino/mode/nlink/size. */
  staged_again=stage_sealed_source(original,sizeof(accepted),digest);
  if(staged_again>=0)goto out;
  ok=true;
out:
  binder_source_release_started=false;
  if(staged_again>=0)close(staged_again);
  if(pfd[0]>=0)close(pfd[0]);
  if(pfd[1]>=0)close(pfd[1]);
  if(sealed>=0)close(sealed);
  fclose(f);
  return ok;
}
/* Exercise the SAME fd opener on a private FIFO without a writer. An
 * O_RDONLY open without O_NONBLOCK would hang before root-custody fstat.
 * The real open_trusted retains all exact leaf/ancestor/generation checks. */
static bool self_test_fifo_replacement_nonblocking(void){
  char dir[]="/tmp/void-e2-dormant-preentry-leaf-XXXXXX";
  if(mkdtemp(dir)==NULL)return false;
  char fifo[PATH_MAX];int n=snprintf(fifo,sizeof(fifo),"%s/swapped",dir);
  bool ok=false;
  if(n>0&&(size_t)n<sizeof(fifo)&&mkfifo(fifo,0600)==0){
    int fd=open_leaf_nofollow_nonblocking(fifo);
    if(fd>=0){
      struct stat observed;
      ok=fstat(fd,&observed)==0&&S_ISFIFO(observed.st_mode)&&
         !safe_regular(&observed,false);
      close(fd);
    }
    (void)unlink(fifo);
  }
  (void)rmdir(dir);
  return ok;
}
static bool self_test_policy_parser(void){
  static const unsigned char canonical[]=
    "schema=" POLICY_SCHEMA "\n"
    "expected_head=0123456789012345678901234567890123456789\n"
    "runner_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
    "runner_bytes=66650\n"
    "node_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n"
    "node_bytes=123456\n";
  static const unsigned char embedded_nul[]=
    "schema=" POLICY_SCHEMA "\n"
    "expected_head=0123456789012345678901234567890123456789\n"
    "runner_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
    "runner_bytes=66650\0hidden\n"
    "node_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n"
    "node_bytes=123456\n";
  static const unsigned char blank_line[]=
    "schema=" POLICY_SCHEMA "\n"
    "\n"
    "expected_head=0123456789012345678901234567890123456789\n"
    "runner_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
    "runner_bytes=66650\n"
    "node_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n"
    "node_bytes=123456\n";
  static const unsigned char hidden_suffix[]=
    "schema=" POLICY_SCHEMA "\n"
    "expected_head=0123456789012345678901234567890123456789\n"
    "runner_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
    "runner_bytes=66650\n"
    "node_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n"
    "node_bytes=123456\n"
    "hidden=x\n";
  static const unsigned char leading_zero_runner[]=
    "schema=" POLICY_SCHEMA "\n"
    "expected_head=0123456789012345678901234567890123456789\n"
    "runner_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
    "runner_bytes=066650\n"
    "node_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n"
    "node_bytes=123456\n";
  static const unsigned char leading_zero_node[]=
    "schema=" POLICY_SCHEMA "\n"
    "expected_head=0123456789012345678901234567890123456789\n"
    "runner_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
    "runner_bytes=66650\n"
    "node_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n"
    "node_bytes=0123456\n";
  static const unsigned char carriage_return[]=
    "schema=" POLICY_SCHEMA "\r\n"
    "expected_head=0123456789012345678901234567890123456789\n"
    "runner_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
    "runner_bytes=66650\n"
    "node_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n"
    "node_bytes=123456\n";
  static const unsigned char missing_final_lf[]=
    "schema=" POLICY_SCHEMA "\n"
    "expected_head=0123456789012345678901234567890123456789\n"
    "runner_sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
    "runner_bytes=66650\n"
    "node_sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n"
    "node_bytes=123456";
  policy_v1 p;
  if(!parse_policy_bytes(canonical,sizeof(canonical)-1U,&p))return false;
  if(strcmp(p.expected_head,"0123456789012345678901234567890123456789")!=0||
     strcmp(p.node_sha256,"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")!=0||
     p.node_bytes!=123456U)return false;
  if(parse_policy_bytes(embedded_nul,sizeof(embedded_nul)-1U,&p))return false;
  if(parse_policy_bytes(blank_line,sizeof(blank_line)-1U,&p))return false;
  if(parse_policy_bytes(hidden_suffix,sizeof(hidden_suffix)-1U,&p))return false;
  if(parse_policy_bytes(leading_zero_runner,sizeof(leading_zero_runner)-1U,&p))return false;
  if(parse_policy_bytes(leading_zero_node,sizeof(leading_zero_node)-1U,&p))return false;
  if(parse_policy_bytes(carriage_return,sizeof(carriage_return)-1U,&p))return false;
  if(parse_policy_bytes(missing_final_lf,sizeof(missing_final_lf)-1U,&p))return false;
  return true;
}
static int self_test_hold(bool post_source){
  child_created=true;proof_released=true;binder_source_release_started=post_source;
  hold(post_source?"self_test_post_source":"self_test_pre_source");
  return 1;
}
static int self_test(void){
  static const unsigned char abc_expected[32]={0xba,0x78,0x16,0xbf,0x8f,0x01,0xcf,0xea,0x41,0x41,0x40,0xde,0x5d,0xae,0x22,0x23,0xb0,0x03,0x61,0xa3,0x96,0x17,0x7a,0x9c,0xb4,0x10,0xff,0x61,0xf2,0x00,0x15,0xad};
  unsigned char h[32];sha256_buffer((const unsigned char*)"abc",3U,h);if(memcmp(h,abc_expected,32U)!=0)return 1;if(BINDER_BYTES!=66650U||strlen(BINDER_GIT_BLOB)!=40U)return 1;
  if(!self_test_sealed_source())return 1;
  if(!self_test_fifo_replacement_nonblocking())return 1;
  if(!self_test_policy_parser())return 1;
  puts(MARKER "_SELF_TEST_GREEN");puts("native_first_instruction=true");puts("fixed_self_path=true");puts("fixed_binder_path=true");puts("binder_exact_sha256_bound=true");puts("binder_git_blob_provenance_bound=true");puts("binder_parent_proof_contains_accepted_source_digest=true");puts("node_policy_sha256_bound=true");puts("binder_descriptor_retained=true");puts("binder_verified_sealed_memfd_source=true");puts("trusted_fifo_swap_open_nonblocking=true");puts("policy_exact_physical_bytes_canonical=true");puts("policy_embedded_nul_blank_suffix_leading_zero_rejected=true");puts("binder_same_inode_mutation_streams_only_accepted_bytes=true");puts("node_descriptor_fexecve=true");puts("private_parent_proof_channel=true");puts("source_runtime_two_head_contract=true");puts("runtime_policy_head_separate_from_source_head=true");puts("caller_stdin_javascript_forbidden=true");puts("loader_environment_sanitized=true");puts("failure_truth_boundary_test_modes=true");puts("credential_content_access=false");puts("transaction=false");puts("public_presale_activation=false");puts("funds_movement=false");return 0;
}
int main(int argc,char**argv){
  if(argc==2&&strcmp(argv[1],"--self-test")==0)return self_test();
  if(argc==2&&strcmp(argv[1],"--self-test-hold-pre-source")==0)return self_test_hold(false);
  if(argc==2&&strcmp(argv[1],"--self-test-hold-post-source")==0)return self_test_hold(true);
  if(geteuid()!=0)hold("binder_preentry_root_required");
  char source_head[41],runtime_head[41];parse_args(argc,argv,source_head,runtime_head);struct stat self_st=require_self_identity();require_devnull_stdin();
  policy_v1 policy=read_policy();if(strcmp(runtime_head,policy.expected_head)!=0)hold("binder_preentry_runtime_head_policy_mismatch");
  int binder_fd=open_trusted(FIXED_BINDER,false,"binder_preentry_binder_custody_invalid");
  struct stat binder_st,binder_after,binder_visible;
  if(fstat(binder_fd,&binder_st)!=0||(uintmax_t)binder_st.st_size!=BINDER_BYTES){
    close(binder_fd);hold("binder_preentry_binder_identity_mismatch");
  }
  int frozen_fd=stage_sealed_source(binder_fd,BINDER_BYTES,BINDER_SHA256);
  if(frozen_fd<0){close(binder_fd);hold("binder_preentry_binder_sealed_source_invalid");}
  if(fstat(binder_fd,&binder_after)!=0||lstat(FIXED_BINDER,&binder_visible)!=0||
     !same_content_generation(&binder_st,&binder_after)||
     !same_content_generation(&binder_after,&binder_visible)){
    close(frozen_fd);close(binder_fd);hold("binder_preentry_binder_generation_changed_during_stage");
  }
  int node_fd=open_trusted(FIXED_NODE,true,"binder_preentry_node_custody_invalid");require_node_policy(node_fd,&policy);
  struct stat node_st;if(fstat(node_fd,&node_st)!=0){close(node_fd);close(binder_fd);hold("binder_preentry_generation_snapshot_failed");}
  unsigned long long parent_ticks=0;if(!read_start_ticks(getpid(),&parent_ticks)){close(node_fd);close(binder_fd);hold("binder_preentry_parent_generation_unavailable");}
  int source_pipe[2],proof_pipe[2];if(pipe2(source_pipe,O_CLOEXEC)!=0||pipe2(proof_pipe,O_CLOEXEC)!=0){close(node_fd);close(binder_fd);hold("binder_preentry_pipe_failed");}
  if(signal(SIGPIPE,SIG_IGN)==SIG_ERR){close(source_pipe[0]);close(source_pipe[1]);close(proof_pipe[0]);close(proof_pipe[1]);close(node_fd);close(binder_fd);hold("binder_preentry_sigpipe_guard_failed");}
  pid_t child=fork();if(child<0){close(source_pipe[0]);close(source_pipe[1]);close(proof_pipe[0]);close(proof_pipe[1]);close(node_fd);close(binder_fd);hold("binder_preentry_fork_failed");}
  if(child==0){
    close(frozen_fd);
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
  if(!stream_fd_exact(frozen_fd,source_pipe[1],BINDER_BYTES)){close(source_pipe[1]);close(frozen_fd);close(binder_fd);(void)kill(child,SIGTERM);(void)waitpid(child,NULL,0);hold("binder_preentry_source_stream_failed");}
  close(source_pipe[1]);close(frozen_fd);close(binder_fd);int status=0;pid_t waited;do{waited=waitpid(child,&status,0);}while(waited<0&&errno==EINTR);if(waited!=child)hold("binder_preentry_child_wait_failed");if(WIFEXITED(status))return WEXITSTATUS(status);hold("binder_preentry_child_not_cleanly_exited");
}
