#define _GNU_SOURCE
#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <inttypes.h>
#include <limits.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <linux/unistd.h>
#include <signal.h>
#include <stdbool.h>
#include <stdarg.h>
#include <linux/audit.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

#define MARKER "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_BOOTSTRAP_V1"
#define PLAN_ID "voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc"
#define PLAN_BLOB "9dde5523dca6ab240626430ce1c2b82f1cfe7f20"
#define PLAN_REQUIREMENTS 70U
#define MANIFEST_SCHEMA "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_MANIFEST_V1"
#define RECEIPT_SCHEMA "VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_RECEIPT_V1"
#define SEAL_MODE "CREATE_ONLY_CLOSED_TREE_V1"
#define FIXED_SOURCE_ROOT "/home/zoso/Downloads/void-v7-create-only-closed-tree-candidate-v1"
#define FIXED_PAYLOAD_NAME "payload"
#define FIXED_MANIFEST_NAME "manifest-v1.conf"
#define FIXED_FINAL_PARENT "/opt"
#define FIXED_FINAL_NAME "void-buy-void-v7-create-only-closed-tree-v1"
#define FIXED_STAGE_NAME ".void-buy-void-v7-create-only-closed-tree-v1.stage-v1"
#define RECEIPT_NAME "install-receipt-v1.conf"
#define CONFIRM_TOKEN "INSTALL_VOID_V7_CREATE_ONLY_CLOSED_TREE_BOOTSTRAP_V1"
#define MAX_MANIFEST_BYTES (64U * 1024U * 1024U)
#define MAX_RECEIPT_BYTES (128U * 1024U * 1024U)
#define MAX_ENTRIES 250000U
#define MAX_FILE_BYTES (512ULL * 1024ULL * 1024ULL)
#define MAX_TOTAL_BYTES (16ULL * 1024ULL * 1024ULL * 1024ULL)
#define IO_BUFFER_BYTES (1024U * 1024U)
#ifndef RENAME_NOREPLACE
#define RENAME_NOREPLACE 1U
#endif

#ifndef VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_SHA256
#define VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_SHA256 ""
#endif
#ifndef VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_BYTES
#define VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_BYTES 0U
#endif
#define ACCEPTED_MANIFEST_SHA256 VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_SHA256
#define ACCEPTED_MANIFEST_BYTES VOID_V7_CLOSED_TREE_ACCEPTED_MANIFEST_BYTES

typedef struct {
    uint32_t h[8];
    uint64_t total;
    unsigned char block[64];
    size_t used;
} sha256_ctx;

typedef struct {
    char kind;
    mode_t mode;
    char *path;
    uint64_t size;
    char sha256[65];
    dev_t dev;
    ino_t ino;
    nlink_t nlink;
} entry_v1;

typedef struct {
    char *raw;
    size_t raw_size;
    char generation[65];
    entry_v1 *entries;
    size_t count;
    uint64_t total_bytes;
    char sha256[65];
} manifest_v1;

typedef struct {
    int fd;
    struct stat st;
} retained_file_v1;

static bool write_boundary_entered=false;
static bool publication_performed=false;
static bool parent_fsync_completed=false;
static bool final_verification_completed=false;
static bool fixture_mode=false;
static uid_t expected_owner=0;
static gid_t expected_group=0;

static void receipt_common(FILE *out) {
    fprintf(out,"plan_contract_id=%s\n",PLAN_ID);
    fprintf(out,"plan_contract_blob=%s\n",PLAN_BLOB);
    fprintf(out,"plan_contract_requirement_count=%u\n",PLAN_REQUIREMENTS);
    fprintf(out,"seal_mode=%s\n",SEAL_MODE);
    fprintf(out,"existing_launcher_v2_modified=false\n");
    fprintf(out,"new_launcher_generation_authorized=false\n");
    fprintf(out,"protected_v5_apply=false\n");
    fprintf(out,"service_mutation=false\ncredential_access=false\nsigning=false\ntransaction=false\n");
    fprintf(out,"payment_acceptance=false\npublic_presale_activation=false\nwc_activation=false\nfunds_movement=false\n");
}

static void hold(const char *reason) {
    fprintf(stderr,"%s_HOLD reason=%s\n",MARKER,reason);
    fprintf(stderr,"write_boundary_entered=%s\n",write_boundary_entered?"true":"false");
    fprintf(stderr,"publication=%s\n",publication_performed?"true":"false");
    fprintf(stderr,"parent_fsync_completed=%s\n",parent_fsync_completed?"true":"false");
    fprintf(stderr,"final_verification_completed=%s\n",final_verification_completed?"true":"false");
    receipt_common(stderr);
    exit(2);
}

static bool hexn(const char *s,size_t n){
    if(!s || strlen(s)!=n) return false;
    for(size_t i=0;i<n;i++) if(!((s[i]>='0'&&s[i]<='9')||(s[i]>='a'&&s[i]<='f'))) return false;
    return true;
}
static bool decu64(const char *s,uint64_t max,uint64_t *out){
    if(!s||!*s) return false;
    if(s[0]=='0' && s[1]) return false;
    uint64_t v=0;
    for(const char *p=s;*p;p++){
        if(*p<'0'||*p>'9') return false;
        unsigned d=(unsigned)(*p-'0');
        if(v>(max-d)/10U) return false;
        v=v*10U+d;
    }
    if(v>max) return false;
    *out=v; return true;
}
static bool clean_rel(const char *path){
    if(!path||!*path||path[0]=='/'||strlen(path)>=PATH_MAX) return false;
    if(!strcmp(path,RECEIPT_NAME)) return false;
    const char *p=path;
    while(*p){
        const char *e=strchr(p,'/'); size_t n=e?(size_t)(e-p):strlen(p);
        if(!n||n>NAME_MAX||(n==1&&p[0]=='.')||(n==2&&p[0]=='.'&&p[1]=='.')) return false;
        for(size_t i=0;i<n;i++){
            unsigned char c=(unsigned char)p[i];
            if(c<0x20||c==0x7f||c=='|'||c=='\\') return false;
        }
        if(!e) return true;
        p=e+1; if(!*p) return false;
    }
    return false;
}
static bool clean_abs(const char *path){
    if(!path||path[0]!='/'||strlen(path)>=PATH_MAX) return false;
    if(!strcmp(path,"/")) return true;
    return clean_rel(path+1);
}

static uint32_t rotr32(uint32_t x,unsigned n){return (x>>n)|(x<<(32U-n));}
static const uint32_t K256[64]={
0x428a2f98U,0x71374491U,0xb5c0fbcfU,0xe9b5dba5U,0x3956c25bU,0x59f111f1U,0x923f82a4U,0xab1c5ed5U,
0xd807aa98U,0x12835b01U,0x243185beU,0x550c7dc3U,0x72be5d74U,0x80deb1feU,0x9bdc06a7U,0xc19bf174U,
0xe49b69c1U,0xefbe4786U,0x0fc19dc6U,0x240ca1ccU,0x2de92c6fU,0x4a7484aaU,0x5cb0a9dcU,0x76f988daU,
0x983e5152U,0xa831c66dU,0xb00327c8U,0xbf597fc7U,0xc6e00bf3U,0xd5a79147U,0x06ca6351U,0x14292967U,
0x27b70a85U,0x2e1b2138U,0x4d2c6dfcU,0x53380d13U,0x650a7354U,0x766a0abbU,0x81c2c92eU,0x92722c85U,
0xa2bfe8a1U,0xa81a664bU,0xc24b8b70U,0xc76c51a3U,0xd192e819U,0xd6990624U,0xf40e3585U,0x106aa070U,
0x19a4c116U,0x1e376c08U,0x2748774cU,0x34b0bcb5U,0x391c0cb3U,0x4ed8aa4aU,0x5b9cca4fU,0x682e6ff3U,
0x748f82eeU,0x78a5636fU,0x84c87814U,0x8cc70208U,0x90befffaU,0xa4506cebU,0xbef9a3f7U,0xc67178f2U};
static void sha_block(sha256_ctx *c,const unsigned char b[64]){
