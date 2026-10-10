import fs from "node:fs";
import path from "node:path";
import { types as utilTypes } from "node:util";

export const VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_V1 =
  "VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_V1";

export const VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_POLICY_V1 =
  Object.freeze({
    source_only_descriptor_reader:true,
    linux_procfs_dirfd_required:true,
    fixed_ledger_names:true,
    caller_selected_leaf_names:false,
    caller_selected_write_path:false,
    server_path_configuration_verified:false,
    cross_uid_permissions_qualified:false,
    cross_file_read_window_unchanged_proven:true,
    cross_file_atomic_snapshot_verified:false,
    cross_file_exclusive_lock_held:false,
    payment_capacity_lock_verified:false,
    filesystem_write:false,
    custody_reserve_method_enabled:false,
    service_mounted:false,
    runtime_integration:false,
    production_allocation_mutation_ready:false,
    funds_movement:false,
  });

const REQUESTS_NAME="requests.jsonl";
const OPERATOR_NAME="operator-events.jsonl";
const MAX_REQUESTS_BYTES=64*1024*1024;
const MAX_OPERATOR_BYTES=64*1024*1024;

function fail(code){throw new Error("custody_payment_ledgers_observer_"+code);}
function identity(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink&&a.size===b.size&&
    a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;
}
function safeAbsoluteDirectory(value){
  if(typeof value!=="string"||!path.isAbsolute(value)||
     value!==path.resolve(value)||value==="/"||value.includes("\0")||
     value.includes("//")){
    fail("request_dir_invalid");
  }
  const parts=value.split("/").slice(1);
  if(parts.length<1||parts.some(part=>
    !/^[A-Za-z0-9_.-]+$/u.test(part)||part==="."||part==="..")){
    fail("request_dir_invalid");
  }
  return value;
}
function closeDescriptorsOrThrow(fds,code){
  let closeFailed=false;
  for(const fd of fds){
    try{fs.closeSync(fd);}catch{closeFailed=true;}
  }
  if(closeFailed)fail(code);
}
function openDirectoryChain(absolute){
  if(process.platform!=="linux"||
     !Number.isInteger(fs.constants.O_NOFOLLOW)||
     !Number.isInteger(fs.constants.O_DIRECTORY)||
     fs.constants.O_NOFOLLOW<=0){
    fail("linux_dirfd_unavailable");
  }
  const flags=fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|
    fs.constants.O_NOFOLLOW;
  const held=[];
  let walking="/";
  try{
    const rootVisible=fs.lstatSync("/",{bigint:true});
    const rootFd=fs.openSync("/",flags);
    const rootStat=fs.fstatSync(rootFd,{bigint:true});
    held.push({fd:rootFd,path:"/",stat:rootStat});
    if(!rootVisible.isDirectory()||rootVisible.isSymbolicLink()||
       !identity(rootVisible,rootStat)){
      fail("filesystem_root_unbound");
    }
    for(const component of absolute.split("/").slice(1)){
      const parent=held.at(-1);
      walking=path.join(walking,component);
      const visible=fs.lstatSync(walking,{bigint:true});
      if(!visible.isDirectory()||visible.isSymbolicLink()){
        fail("directory_ancestor_unqualified");
      }
      const fd=fs.openSync(
        "/proc/self/fd/"+parent.fd+"/"+component,
        flags,
      );
      const stat=fs.fstatSync(fd,{bigint:true});
      held.push({fd,path:walking,stat});
      if(!stat.isDirectory()||!identity(visible,stat)){
        fail("directory_ancestor_fd_mismatch");
      }
    }
    return held;
  }catch(error){
    closeDescriptorsOrThrow(held.reverse().map(entry=>entry.fd),
      "directory_cleanup_failed");
    throw error;
  }
}
function openLeaf(directoryFd,absolute,name,maximum){
  if(!Number.isSafeInteger(maximum)||maximum<1)fail("read_limit_invalid");
  const full=path.join(absolute,name);
  const visible=fs.lstatSync(full,{bigint:true});
  if(!visible.isFile()||visible.isSymbolicLink()||visible.nlink!==1n||
     visible.size<1n||visible.size>BigInt(maximum)){
    fail(name===REQUESTS_NAME?"requests_leaf_unqualified":"operator_leaf_unqualified");
  }
  const fd=fs.openSync(
    "/proc/self/fd/"+directoryFd+"/"+name,
    fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW,
  );
  try{
    const stat=fs.fstatSync(fd,{bigint:true});
    if(!stat.isFile()||stat.nlink!==1n||!identity(visible,stat)){
      fail(name===REQUESTS_NAME?"requests_leaf_fd_mismatch":"operator_leaf_fd_mismatch");
    }
    return {fd,path:full,stat,maximum,name};
  }catch(error){
    closeDescriptorsOrThrow([fd],"leaf_cleanup_failed");
    throw error;
  }
}
function readPinned(leaf){
  const cap=Number(leaf.stat.size)+1;
  if(!Number.isSafeInteger(cap)||cap<2||cap>leaf.maximum+1){
    fail("pinned_read_size_invalid");
  }
  const bytes=Buffer.alloc(cap);
  let total=0;
  while(total<cap){
    const n=fs.readSync(leaf.fd,bytes,total,cap-total,total);
    if(n===0)break;
    total+=n;
  }
  if(BigInt(total)!==leaf.stat.size){
    fail(leaf.name===REQUESTS_NAME?
      "requests_changed_during_read":"operator_changed_during_read");
  }
  return bytes.subarray(0,total);
}
function revalidateLeaf(leaf){
  const after=fs.fstatSync(leaf.fd,{bigint:true});
  const visible=fs.lstatSync(leaf.path,{bigint:true});
  if(!after.isFile()||after.nlink!==1n||!visible.isFile()||
     visible.isSymbolicLink()||!identity(leaf.stat,after)||
     !identity(after,visible)){
    fail(leaf.name===REQUESTS_NAME?
      "requests_changed_during_observation":"operator_changed_during_observation");
  }
}
function revalidateDirectories(held){
  for(const dir of held){
    const afterFd=fs.fstatSync(dir.fd,{bigint:true});
    const visible=fs.lstatSync(dir.path,{bigint:true});
    if(!afterFd.isDirectory()||!visible.isDirectory()||
       visible.isSymbolicLink()||!identity(dir.stat,afterFd)||
       !identity(afterFd,visible)){
      fail("directory_ancestor_changed_during_observation");
    }
  }
}
function held(reason){
  return Object.freeze({
    marker:VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_V1,
    version:1,
    observed:false,
    reason,
    requests_jsonl:null,
    operator_events_jsonl:null,
    cross_file_read_window_unchanged_proven:false,
    cross_file_atomic_snapshot_verified:false,
    server_path_configuration_verified:false,
    cross_uid_permissions_qualified:false,
    cross_file_exclusive_lock_held:false,
    payment_capacity_lock_verified:false,
    filesystem_write:false,
    custody_reserve_method_enabled:false,
    production_allocation_mutation_ready:false,
    funds_movement:false,
  });
}

export function observeBuyVoidCustodyPaymentLedgersReadOnlyV1(input={}){
  let dirs=[];
  let requests;
  let operator;
  let result=null;
  let failure=null;
  try{
    if(!input||typeof input!=="object"||Array.isArray(input)||
       utilTypes.isProxy(input)||
       ![Object.prototype,null].includes(Object.getPrototypeOf(input))){
      fail("input_shape_invalid");
    }
    const descriptors=Object.getOwnPropertyDescriptors(input);
    const keys=Reflect.ownKeys(descriptors);
    if(keys.length!==1||keys[0]!=="request_dir"){
      fail("input_shape_invalid");
    }
    const descriptor=descriptors.request_dir;
    if(!descriptor||descriptor.enumerable!==true||
       !Object.prototype.hasOwnProperty.call(descriptor,"value")){
      fail("input_accessor_forbidden");
    }
    const requestDir=safeAbsoluteDirectory(descriptor.value);
    dirs=openDirectoryChain(requestDir);
    const directory=dirs.at(-1);
    requests=openLeaf(directory.fd,requestDir,REQUESTS_NAME,MAX_REQUESTS_BYTES);
    operator=openLeaf(directory.fd,requestDir,OPERATOR_NAME,MAX_OPERATOR_BYTES);
    const requestBytes=readPinned(requests);
    const operatorBytes=readPinned(operator);
    revalidateLeaf(requests);
    revalidateLeaf(operator);
    revalidateDirectories(dirs);
    result=Object.freeze({
      marker:VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_V1,
      version:1,
      observed:true,
      reason:null,
      requests_jsonl:Buffer.from(requestBytes),
      operator_events_jsonl:Buffer.from(operatorBytes),
      evidence:Object.freeze({
        requests:Object.freeze({
          dev:requests.stat.dev.toString(),
          ino:requests.stat.ino.toString(),
          uid:requests.stat.uid.toString(),
          gid:requests.stat.gid.toString(),
          mode:(requests.stat.mode&0o777n).toString(8),
          bytes:requestBytes.length,
        }),
        operator_events:Object.freeze({
          dev:operator.stat.dev.toString(),
          ino:operator.stat.ino.toString(),
          uid:operator.stat.uid.toString(),
          gid:operator.stat.gid.toString(),
          mode:(operator.stat.mode&0o777n).toString(8),
          bytes:operatorBytes.length,
        }),
      }),
      cross_file_read_window_unchanged_proven:true,
      cross_file_atomic_snapshot_verified:false,
      server_path_configuration_verified:false,
      cross_uid_permissions_qualified:false,
      cross_file_exclusive_lock_held:false,
      payment_capacity_lock_verified:false,
      filesystem_write:false,
      custody_reserve_method_enabled:false,
      production_allocation_mutation_ready:false,
      funds_movement:false,
    });
  }catch(error){
    failure=error;
  }finally{
    const fds=[];
    if(operator?.fd!==undefined)fds.push(operator.fd);
    if(requests?.fd!==undefined)fds.push(requests.fd);
    fds.push(...dirs.reverse().map(dir=>dir.fd));
    try{closeDescriptorsOrThrow(fds,"descriptor_cleanup_failed");}
    catch(error){failure=error;}
  }
  if(failure){
    const raw=failure instanceof Error?failure.message:
      "custody_payment_ledgers_observer_held";
    const reason=raw.startsWith("custody_payment_ledgers_observer_")?
      raw.slice("custody_payment_ledgers_observer_".length):"held";
    return held(reason);
  }
  return result;
}
