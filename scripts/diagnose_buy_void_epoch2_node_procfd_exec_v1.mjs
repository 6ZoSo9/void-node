#!/usr/bin/env node
// Unprivileged Linux Node spawn/retained-FD diagnostic only. Never an execution authorization.
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const MARKER="VOID_EPOCH2_NODE_PROCFD_EXEC_DIAGNOSTIC_V1";
const FLAGS=fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK;
const MAX_OUT=4096;
const NODE=fs.realpathSync(process.execPath);
const ENV={PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",HOME:"/nonexistent",TZ:"UTC"};
const FILES={true:"/usr/bin/true",setpriv:"/usr/bin/setpriv",node:NODE,python:fs.realpathSync("/usr/bin/python3"),git:fs.realpathSync("/usr/bin/git")};
function fail(message){throw new Error(message);}
function lease(file){
  if(fs.realpathSync(file)!==file)fail("noncanonical_executable");
  const before=fs.lstatSync(file,{bigint:true});
  if(!before.isFile()||before.isSymbolicLink()||before.size<1n)fail("bad_executable");
  const fd=fs.openSync(file,FLAGS);
  const opened=fs.fstatSync(fd,{bigint:true});
  if(opened.dev!==before.dev||opened.ino!==before.ino||opened.size!==before.size){
    fs.closeSync(fd);fail("executable_rebound");
  }
  return {file,fd,dev:opened.dev,ino:opened.ino,size:opened.size};
}
function revalidate(x){
  for(const row of [fs.fstatSync(x.fd,{bigint:true}),fs.lstatSync(x.file,{bigint:true})]){
    if(row.dev!==x.dev||row.ino!==x.ino||row.size!==x.size){
      fail("executable_generation_changed");
    }
  }
}
function attempt(label,file,args,stdio){
  let result;
  try{
    result=spawnSync(file,args,{
      cwd:"/",env:ENV,stdio,encoding:"utf8",timeout:5000,maxBuffer:MAX_OUT,
    });
  }catch(error){
    return {case:label,ok:false,exception:String(error?.name||"Error")};
  }
  return {
    case:label,
    ok:result.status===0&&!result.error&&!result.signal,
    exit_code:result.status,
    spawn_errno:result.error?.code??null,
    signal:result.signal??null,
  };
}
function check(){
  if(process.getuid?.()===0||process.geteuid?.()===0){
    fail("root_execution_not_permitted");
  }
  if(!fs.existsSync("/proc/self/fd"))fail("proc_fd_unavailable");
}
function selfTest(){
  check();
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("source_only=true");
  console.log("credential_access=false");
  console.log("payment_acceptance=false");
  console.log("funds_movement=false");
}
function run(){
  check();
  const t=lease(FILES.true),s=lease(FILES.setpriv),n=lease(FILES.node),py=lease(FILES.python),g=lease(FILES.git);
  try{
    const cases=[];
    cases.push(attempt("canonical_true",FILES.true,[],["ignore","pipe","pipe"]));
    cases.push(attempt("child_fixed_fd3_true","/proc/self/fd/3",[],["ignore","pipe","pipe",t.fd]));
    const stdio=["ignore","pipe","pipe"];
    while(stdio.length<=t.fd)stdio.push("ignore");
    stdio[t.fd]=t.fd;
    cases.push(attempt("child_same_number_fd_true","/proc/self/fd/"+t.fd,[],stdio));
    cases.push(attempt("parent_pid_fd_true","/proc/"+process.pid+"/fd/"+t.fd,[],["ignore","pipe","pipe",t.fd]));
    cases.push(attempt("nested_setpriv_child_fd3_to_fd4","/proc/self/fd/3",[
      "--no-new-privs","/proc/self/fd/4",
    ],["ignore","pipe","pipe",s.fd,t.fd]));
    cases.push(attempt("nested_setpriv_parent_fd_to_fd4","/proc/"+process.pid+"/fd/"+s.fd,[
      "--no-new-privs","/proc/self/fd/4",
    ],["ignore","pipe","pipe",s.fd,t.fd]));
    cases.push(attempt("node_child_fixed_fd3_version","/proc/self/fd/3",[
      "--version",
    ],["ignore","pipe","pipe",n.fd]));
    cases.push(attempt("python_child_fd3_pipe","/proc/self/fd/3",["--version"],["pipe","pipe","pipe",py.fd]));
    cases.push(attempt("git_child_fd3_pipe","/proc/self/fd/3",["--version"],["pipe","pipe","pipe",g.fd]));
    cases.push(attempt("setpriv_to_git_fd4_pipe",FILES.setpriv,["--no-new-privs","/proc/self/fd/4","--version"],["pipe","pipe","pipe","ignore",g.fd]));
    cases.push(attempt("nested_setpriv_fd3_git_fd4_pipe","/proc/self/fd/3",["--no-new-privs","/proc/self/fd/4","--version"],["pipe","pipe","pipe",s.fd,g.fd]));
    revalidate(t);revalidate(s);revalidate(n);revalidate(py);revalidate(g);
    const result={
      marker:MARKER,status:"DIAGNOSTIC_ONLY_NO_PRODUCTION_AUTHORITY",
      node_version:process.versions.node,uid:process.getuid(),euid:process.geteuid(),
      case_count:cases.length,passes:cases.filter(x=>x.ok).length,results:cases,
      source_mutation:false,service_mutation:false,credential_access:false,
      signing:false,transaction:false,payment_acceptance:false,
      public_presale_activation:false,funds_movement:false,
    };
    console.log(JSON.stringify(result));
    if(!cases[0].ok)fail("baseline_canonical_execution_failed");
  }finally{
    fs.closeSync(g.fd);fs.closeSync(py.fd);fs.closeSync(n.fd);fs.closeSync(s.fd);fs.closeSync(t.fd);
  }
}
try{
  if(process.argv.length!==3)fail("exactly_one_mode_required");
  if(process.argv[2]==="--self-test")selfTest();
  else if(process.argv[2]==="--run")run();
  else fail("mode_invalid");
}catch(error){
  console.error(JSON.stringify({
    marker:MARKER,status:"DIAGNOSTIC_HOLD",
    reason:String(error?.message||error).slice(0,200),
    payment_acceptance:false,funds_movement:false,
  }));
  process.exitCode=2;
}
