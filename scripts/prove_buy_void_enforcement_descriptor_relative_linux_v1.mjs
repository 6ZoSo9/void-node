#!/usr/bin/env node
// Linux-only standalone security proof. NO real VOID host, wallet, or runtime.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 16 * 1024 * 1024;
const identical = (a,b) =>
  a.dev===b.dev && a.ino===b.ino && a.mode===b.mode &&
  a.nlink===b.nlink && a.size===b.size &&
  a.mtimeMs===b.mtimeMs && a.ctimeMs===b.ctimeMs;
function check(ok,label) {
  if (!ok) throw new Error("descriptor_relative_"+label);
}
export function readDescriptorRelativeLinuxV1(root,relative,maxBytes=MAX_BYTES) {
  check(process.platform==="linux","linux_required");
  check(typeof relative==="string" &&
    /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/u.test(relative) &&
    relative.split("/").every(x=>x!=="."&&x!==".."),"safe_relative_path_required");
  check(Number.isSafeInteger(maxBytes)&&maxBytes>0&&maxBytes<=MAX_BYTES,"invalid_limit");
  const dirFlags=fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW;
  const leafFlags=fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW;
  check(typeof fs.constants.O_DIRECTORY==="number" &&
    typeof fs.constants.O_NOFOLLOW==="number" &&
    fs.constants.O_NOFOLLOW>0,"linux_descriptor_flags_required");
  const base=path.resolve(root), parts=relative.split("/");
  const opened=[];let leafFd;
  try {
    let visiblePath=base;
    const rootVisible=fs.lstatSync(base);
    check(rootVisible.isDirectory()&&!rootVisible.isSymbolicLink(),"root_invalid");
    check(fs.realpathSync(base)===base,"root_alias");
    const rootFd=fs.openSync(base,dirFlags);
    const rootStat=fs.fstatSync(rootFd);
    opened.push({fd:rootFd,absolute:base,stat:rootStat});
    check(identical(rootVisible,rootStat),"root_fd_mismatch");
    for(const component of parts.slice(0,-1)){
      const parentFd=opened.at(-1).fd;
      visiblePath=path.join(visiblePath,component);
      const seen=fs.lstatSync(visiblePath);
      check(seen.isDirectory()&&!seen.isSymbolicLink(),"directory_invalid");
      // The next pathname starts at the RETAINED parent directory descriptor,
      // not an ancestor which could have been replaced after lstat.
      const dirFd=fs.openSync("/proc/self/fd/"+parentFd+"/"+component,dirFlags);
      const stat=fs.fstatSync(dirFd);
      opened.push({fd:dirFd,absolute:visiblePath,stat});
      check(stat.isDirectory()&&identical(seen,stat),"directory_fd_mismatch");
    }
    const last=parts.at(-1),seenPath=path.join(visiblePath,last);
    const leafSeen=fs.lstatSync(seenPath);
    check(leafSeen.isFile()&&!leafSeen.isSymbolicLink()&&
      leafSeen.nlink===1&&leafSeen.size>0&&leafSeen.size<=maxBytes,"leaf_invalid");
    leafFd=fs.openSync("/proc/self/fd/"+opened.at(-1).fd+"/"+last,leafFlags);
    const before=fs.fstatSync(leafFd);
    check(before.isFile()&&before.nlink===1&&before.size>0&&
      before.size<=maxBytes&&identical(before,leafSeen),"leaf_fd_mismatch");
    const buffer=Buffer.alloc(before.size+1);let total=0;
    while(total<buffer.length){
      const n=fs.readSync(leafFd,buffer,total,buffer.length-total,total);
      if(n===0)break;
      total+=n;
    }
    check(total===before.size,"growth_or_truncation");
    check(identical(before,fs.fstatSync(leafFd)),"leaf_descriptor_changed");
    const after=fs.lstatSync(seenPath);
    check(after.isFile()&&!after.isSymbolicLink()&&
      identical(before,after),"leaf_path_rebound");
    for(const directory of opened){
      const now=fs.lstatSync(directory.absolute);
      check(now.isDirectory()&&!now.isSymbolicLink()&&
        identical(directory.stat,fs.fstatSync(directory.fd))&&
        identical(directory.stat,now),"ancestor_path_rebound");
    }
    return buffer.subarray(0,total);
  } finally {
    if(leafFd!==undefined)fs.closeSync(leafFd);
    for(const item of opened.reverse())fs.closeSync(item.fd);
  }
}
function selfTest() {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-descriptor-relative-"));
  const root=path.join(tmp,"repo"),nested=path.join(root,"nested");
  const outside=path.join(tmp,"outside"),leaf=path.join(nested,"source.js");
  const moved=path.join(tmp,"prior-nested");
  const nativeOpen=fs.openSync,nativeRead=fs.readSync;
  const restore=()=>{
    fs.rmSync(moved,{recursive:true,force:true});
    fs.rmSync(nested,{recursive:true,force:true});
    fs.mkdirSync(nested,{recursive:true});
    fs.writeFileSync(leaf,"SAFE!!",{mode:0o600});
  };
  const attack=()=>{fs.renameSync(nested,moved);fs.symlinkSync(outside,nested,"dir");};
  try {
    fs.mkdirSync(root);fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside,"source.js"),"ALIEN!",{mode:0o600});
    restore();
    assert.equal(readDescriptorRelativeLinuxV1(root,"nested/source.js",64).toString(),"SAFE!!");
    let changed=false;
    try {
      fs.openSync=function(p,...rest){
        if(!changed&&typeof p==="string"&&
           /^\/proc\/self\/fd\/\d+\/nested$/u.test(p)){changed=true;attack();}
        return nativeOpen.call(fs,p,...rest);
      };
      assert.throws(()=>readDescriptorRelativeLinuxV1(root,"nested/source.js",64),
        /descriptor_relative_|ELOOP|ENOTDIR|ENOENT/u);
      assert.equal(changed,true);
    } finally {fs.openSync=nativeOpen;}
    restore();changed=false;
    try {
      fs.openSync=function(p,...rest){
        if(!changed&&typeof p==="string"&&
           /^\/proc\/self\/fd\/\d+\/source\.js$/u.test(p)){changed=true;attack();}
        return nativeOpen.call(fs,p,...rest);
      };
      assert.throws(()=>readDescriptorRelativeLinuxV1(root,"nested/source.js",64),
        /descriptor_relative_leaf_path_rebound|descriptor_relative_ancestor_path_rebound/u);
      assert.equal(changed,true);
    } finally {fs.openSync=nativeOpen;}
    restore();changed=false;
    try {
      fs.readSync=function(fd,buf,...rest){
        if(!changed){
          changed=true;fs.appendFileSync(leaf,Buffer.alloc(3*1024*1024,0x61));
        }
        return nativeRead.call(fs,fd,buf,...rest);
      };
      assert.throws(()=>readDescriptorRelativeLinuxV1(root,"nested/source.js",64),
        /descriptor_relative_growth_or_truncation/u);
      assert.equal(changed,true);
    } finally {fs.readSync=nativeRead;}
    restore();
    assert.equal(readDescriptorRelativeLinuxV1(root,"nested/source.js",64).toString(),"SAFE!!");
    console.log("VOID_ENFORCEMENT_DESCRIPTOR_RELATIVE_LINUX_V1_SYNTHETIC_GREEN");
    console.log("ancestor_swap_before_directory_open_rejected=true");
    console.log("ancestor_swap_before_leaf_open_rejected=true");
    console.log("concurrent_3MiB_growth_rejected_with_pinned_plus_one=true");
    console.log("restored_original_source_accepted=true");
    console.log("real_VOID_repository_or_host_mutation=false");
    console.log("compiled_candidate_accepted=false");
    console.log("production_source_finality_authority_ready=false");
  } finally {
    fs.openSync=nativeOpen;fs.readSync=nativeRead;
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  selfTest();
}
