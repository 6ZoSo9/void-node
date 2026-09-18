#!/usr/bin/env node
import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,renameSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {
 CANONICAL_ORIGIN_FETCH_URLS_V1,
 CANONICAL_ORIGIN_REPOSITORY_V1,
 FORBIDDEN_GIT_REPOSITORY_ENV_V1,
 PUBLIC_FETCH_REMOTE_V1,
 PUBLIC_FETCH_URL_V1,
 PUBLIC_PUSH_URL_V1,
 VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,
 applyTransportPlanV1,
 buildTransportPlanV1,
 inspectRepositoryTransportV1,
} from '../tools/void-node-fleet-public-fetch-transport-v1.mjs';

function run(cwd,command,args,expected=0,env=process.env){
 const r=spawnSync(command,args,{cwd,encoding:'utf8',env});
 if(r.error)throw r.error;
 assert.equal(r.status,expected,`${command} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
 return r;
}
function runWithEnv(cwd,command,args,overrides,expected=0){return run(cwd,command,args,expected,{...process.env,...overrides});}
function withEnv(name,value,fn){const had=Object.hasOwn(process.env,name),old=process.env[name];process.env[name]=value;try{return fn();}finally{if(had)process.env[name]=old;else delete process.env[name];}}
function git(repo,...args){return run(repo,'git',args).stdout.trim();}
function makeRepo(origin='git@github.com:6ZoSo9/void-node.git'){
 const repo=mkdtempSync(join(tmpdir(),'void-public-fetch-proof-'));
 git(repo,'init','-q','-b','main');git(repo,'config','user.name','VOID Proof');git(repo,'config','user.email','proof@example.invalid');
 writeFileSync(join(repo,'tracked.txt'),'base\n');git(repo,'add','--','tracked.txt');git(repo,'commit','-q','-m','base');
 git(repo,'remote','add','origin',origin);git(repo,'config','--local','remote.origin.pushurl','ssh://git@github.com/6ZoSo9/void-node.git');
 writeFileSync(join(repo,'tracked.txt'),'dirty-worktree\n');writeFileSync(join(repo,'untracked.txt'),'untracked\n');return repo;
}
function cloneRepo(source){const dst=mkdtempSync(join(tmpdir(),'void-public-fetch-proof-clone-'));rmSync(dst,{recursive:true,force:true});cpSync(source,dst,{recursive:true});return dst;}
function invariant(s){return {repository_identity_sha256:s.repository_identity_sha256,branch:s.branch,head:s.head,tree:s.tree,worktree_status_sha256:s.worktree_status_sha256,dirty_count:s.dirty_count,index_sha256:s.index_sha256,refs_sha256:s.refs_sha256,canonical_origin_required:s.canonical_origin_required,origin_repository:s.origin_repository,origin_fetch_count:s.origin_fetch_count,origin_fetch_sha256:s.origin_fetch_sha256,origin_effective_fetch_count:s.origin_effective_fetch_count,origin_effective_fetch_sha256:s.origin_effective_fetch_sha256,origin_push_count:s.origin_push_count,origin_push_sha256:s.origin_push_sha256,prospective_public_fetch_count:s.prospective_public_fetch_count,prospective_public_fetch_sha256:s.prospective_public_fetch_sha256};}
function assertNoRemote(repo){assert.equal(run(repo,'git',['config','--local','--get-all',`remote.${PUBLIC_FETCH_REMOTE_V1}.url`],1).stdout,'');assert.equal(run(repo,'git',['config','--local','--get-all',`remote.${PUBLIC_FETCH_REMOTE_V1}.pushurl`],1).stdout,'');}
function assertReceipt(path,expected){assert.deepEqual(JSON.parse(readFileSync(path,'utf8')),expected);assert.equal(statSync(path).mode&0o777,0o600);}

const repos=[];
const root=mkdtempSync(join(tmpdir(),'void-public-fetch-config-'));
const oldHome=process.env.HOME,oldXdg=process.env.XDG_CONFIG_HOME;
process.env.HOME=root;process.env.XDG_CONFIG_HOME=join(root,'xdg');mkdirSync(process.env.XDG_CONFIG_HOME,{recursive:true});
const globalConfig=join(root,'.gitconfig'),systemFixture=join(root,'system.gitconfig');writeFileSync(globalConfig,'');writeFileSync(systemFixture,'');
try{
 const repo=makeRepo();repos.push(repo);const before=inspectRepositoryTransportV1(repo),plan=buildTransportPlanV1(before);
 assert.match(before.repository_identity_sha256,/^[0-9a-f]{64}$/);assert.equal(before.origin_repository,CANONICAL_ORIGIN_REPOSITORY_V1);assert.equal(before.dedicated_state,'MISSING');assert.equal(before.dirty_count,2);assert.equal(plan.mutation_required,true);

 const envA=makeRepo(),envB=makeRepo();repos.push(envA,envB);const bGit=git(envB,'rev-parse','--absolute-git-dir');
 const staticEnv=new Map([
  ['GIT_DIR',bGit],['GIT_WORK_TREE',envB],['GIT_INDEX_FILE',join(bGit,'index')],['GIT_COMMON_DIR',bGit],['GIT_OBJECT_DIRECTORY',join(bGit,'objects')],['GIT_ALTERNATE_OBJECT_DIRECTORIES',join(bGit,'objects')],['GIT_NAMESPACE','proof'],
  ['GIT_CONFIG',join(root,'config-override')],['GIT_CONFIG_GLOBAL','/dev/null'],['GIT_CONFIG_SYSTEM','/dev/null'],['GIT_CONFIG_NOSYSTEM','1'],['GIT_CONFIG_PARAMETERS','proof.key=value'],['GIT_CONFIG_COUNT','1'],
 ]);
 assert.deepEqual([...staticEnv.keys()],[...FORBIDDEN_GIT_REPOSITORY_ENV_V1]);
 for(const [name,value] of staticEnv)withEnv(name,value,()=>assert.throws(()=>inspectRepositoryTransportV1(envA),/Git repository-selection environment is not allowed/));
 for(const name of ['GIT_CONFIG_KEY_0','GIT_CONFIG_VALUE_0'])withEnv(name,'proof',()=>assert.throws(()=>inspectRepositoryTransportV1(envA),/Git repository-selection environment is not allowed/));
 assertNoRemote(envA);assertNoRemote(envB);

 const cloneA=makeRepo(),cloneB=cloneRepo(cloneA);repos.push(cloneA,cloneB);const aSnap=inspectRepositoryTransportV1(cloneA),bSnap=inspectRepositoryTransportV1(cloneB);
 for(const k of ['head','tree','worktree_status_sha256','index_sha256','refs_sha256'])assert.equal(aSnap[k],bSnap[k]);assert.notEqual(aSnap.repository_identity_sha256,bSnap.repository_identity_sha256);
 const aPlan=buildTransportPlanV1(aSnap);assert.notEqual(aPlan.plan_id_sha256,buildTransportPlanV1(bSnap).plan_id_sha256);assert.throws(()=>applyTransportPlanV1(cloneB,aPlan.plan_id_sha256),/transport plan changed/);assertNoRemote(cloneB);

 const replacement=makeRepo();repos.push(replacement);const rSnap=inspectRepositoryTransportV1(replacement),rPlan=buildTransportPlanV1(rSnap);assert.equal(rPlan.plan_id_sha256,buildTransportPlanV1(inspectRepositoryTransportV1(replacement)).plan_id_sha256);
 const backup=`${replacement}-original`;repos.push(backup);renameSync(replacement,backup);cpSync(backup,replacement,{recursive:true});const replaced=inspectRepositoryTransportV1(replacement);for(const k of ['head','tree','worktree_status_sha256','index_sha256','refs_sha256'])assert.equal(rSnap[k],replaced[k]);assert.notEqual(rSnap.repository_identity_sha256,replaced.repository_identity_sha256);assert.throws(()=>applyTransportPlanV1(replacement,rPlan.plan_id_sha256),/transport plan changed/);assertNoRemote(replacement);

 const applied=applyTransportPlanV1(repo,plan.plan_id_sha256);assert.equal(applied.outcome,'TRANSPORT_CONFIGURED');assert.deepEqual(invariant(applied.after),invariant(before));assert.equal(git(repo,'remote','get-url','--all',PUBLIC_FETCH_REMOTE_V1),PUBLIC_FETCH_URL_V1);assert.equal(git(repo,'remote','get-url','--push',PUBLIC_FETCH_REMOTE_V1),PUBLIC_PUSH_URL_V1);
 const aligned=inspectRepositoryTransportV1(repo);assert.equal(aligned.dedicated_state,'ALIGNED');const idem=applyTransportPlanV1(repo,buildTransportPlanV1(aligned).plan_id_sha256);assert.equal(idem.outcome,'ALREADY_ALIGNED');assert.equal(idem.mutation_attempted,false);
 git(repo,'config','--local','--replace-all',`remote.${PUBLIC_FETCH_REMOTE_V1}.url`,'ssh://example.invalid/repo.git');git(repo,'config','--local','--replace-all',`remote.${PUBLIC_FETCH_REMOTE_V1}.pushurl`,'ssh://example.invalid/repo.git');const bad=inspectRepositoryTransportV1(repo);assert.equal(bad.dedicated_state,'MISCONFIGURED');assert.equal(applyTransportPlanV1(repo,buildTransportPlanV1(bad).plan_id_sha256).after.dedicated_state,'ALIGNED');assert.throws(()=>applyTransportPlanV1(repo,'0'.repeat(64)),/transport plan changed/);

 const detached=makeRepo();repos.push(detached);git(detached,'checkout','--detach','-q');assert.throws(()=>inspectRepositoryTransportV1(detached),/exact main/);
 for(const origin of CANONICAL_ORIGIN_FETCH_URLS_V1){const r=makeRepo(origin);repos.push(r);assert.equal(inspectRepositoryTransportV1(r).origin_repository,CANONICAL_ORIGIN_REPOSITORY_V1);}
 for(const origin of ['git@github.com:someone-else/not-void-node.git','https://example.invalid/6ZoSo9/void-node.git']){const r=makeRepo(origin);repos.push(r);assert.throws(()=>inspectRepositoryTransportV1(r),/canonical 6ZoSo9\/void-node/);assertNoRemote(r);}
 const mixed=makeRepo();repos.push(mixed);git(mixed,'config','--local','--add','remote.origin.url','https://example.invalid/other/repo.git');assert.throws(()=>inspectRepositoryTransportV1(mixed),/exactly one canonical/);assertNoRemote(mixed);
 const dup=makeRepo();repos.push(dup);git(dup,'config','--local','--add','remote.origin.url',PUBLIC_FETCH_URL_V1);assert.throws(()=>inspectRepositoryTransportV1(dup),/exactly one canonical/);assertNoRemote(dup);

 const rewrite='[url "ssh://example.invalid/rewritten.git"]\n\tinsteadOf = https://github.com/6ZoSo9/void-node.git\n';
 const prospective=makeRepo();repos.push(prospective);writeFileSync(globalConfig,rewrite);assert.throws(()=>inspectRepositoryTransportV1(prospective),/public fetch URL is rewritten/);assertNoRemote(prospective);writeFileSync(globalConfig,'');
 const originRewrite=makeRepo('https://github.com/6ZoSo9/void-node.git');repos.push(originRewrite);writeFileSync(globalConfig,rewrite);assert.throws(()=>inspectRepositoryTransportV1(originRewrite),/origin effective fetch URL/);assertNoRemote(originRewrite);writeFileSync(globalConfig,'');
 const nonLocal=makeRepo();repos.push(nonLocal);writeFileSync(globalConfig,`[remote "${PUBLIC_FETCH_REMOTE_V1}"]\n\turl = ${PUBLIC_FETCH_URL_V1}\n`);assert.throws(()=>inspectRepositoryTransportV1(nonLocal),/non-local configuration/);assertNoRemote(nonLocal);writeFileSync(globalConfig,'');

 // Reproduce the masked-global finding with Git itself, then prove the controller rejects the masking environment.
 const masked=makeRepo('https://github.com/6ZoSo9/void-node.git');repos.push(masked);writeFileSync(globalConfig,rewrite);
 assert.equal(git(masked,'ls-remote','--get-url',PUBLIC_FETCH_URL_V1),'ssh://example.invalid/rewritten.git');
 assert.equal(runWithEnv(masked,'git',['ls-remote','--get-url',PUBLIC_FETCH_URL_V1],{GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}).stdout.trim(),PUBLIC_FETCH_URL_V1);
 const tool=new URL('../tools/void-node-fleet-public-fetch-transport-v1.mjs',import.meta.url).pathname;
 const maskedOut=join(root,'masked-global.json');const maskedCli=runWithEnv(process.cwd(),process.execPath,[tool,'--repo',masked,'--output',maskedOut],{GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'},2);const maskedResult=JSON.parse(maskedCli.stdout);assert.equal(maskedResult.outcome,'HOLD');assert.equal(maskedResult.mutation_attempted,false);assert.match(maskedResult.error,/GIT_CONFIG_GLOBAL/);assert.equal(existsSync(maskedOut),false);assertNoRemote(masked);writeFileSync(globalConfig,'');

 // Show a system-config rewrite can also be suppressed by NOSYSTEM; the controller rejects both controls.
 writeFileSync(systemFixture,rewrite);
 assert.equal(runWithEnv(masked,'git',['ls-remote','--get-url',PUBLIC_FETCH_URL_V1],{GIT_CONFIG_SYSTEM:systemFixture}).stdout.trim(),'ssh://example.invalid/rewritten.git');
 assert.equal(runWithEnv(masked,'git',['ls-remote','--get-url',PUBLIC_FETCH_URL_V1],{GIT_CONFIG_SYSTEM:systemFixture,GIT_CONFIG_NOSYSTEM:'1'}).stdout.trim(),PUBLIC_FETCH_URL_V1);
 const sysOut=join(root,'masked-system.json');const sysCli=runWithEnv(process.cwd(),process.execPath,[tool,'--repo',masked,'--output',sysOut],{GIT_CONFIG_SYSTEM:systemFixture,GIT_CONFIG_NOSYSTEM:'1'},2);assert.equal(JSON.parse(sysCli.stdout).outcome,'HOLD');assert.equal(existsSync(sysOut),false);assertNoRemote(masked);

 const injectOut=join(root,'config-injection.json');const injectCli=runWithEnv(process.cwd(),process.execPath,[tool,'--repo',masked,'--output',injectOut],{GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'url.ssh://example.invalid/rewritten.git.insteadOf',GIT_CONFIG_VALUE_0:PUBLIC_FETCH_URL_V1},2);assert.equal(JSON.parse(injectCli.stdout).outcome,'HOLD');assert.equal(existsSync(injectOut),false);assertNoRemote(masked);

 const redirectedA=makeRepo(),redirectedB=makeRepo();repos.push(redirectedA,redirectedB);const redirectedGit=git(redirectedB,'rev-parse','--absolute-git-dir');const redDryOut=join(root,'git-dir-dry.json');const redDry=runWithEnv(process.cwd(),process.execPath,[tool,'--repo',redirectedA,'--output',redDryOut],{GIT_DIR:redirectedGit},2);assert.equal(JSON.parse(redDry.stdout).outcome,'HOLD');assert.equal(existsSync(redDryOut),false);assertNoRemote(redirectedA);assertNoRemote(redirectedB);
 const redPlan=buildTransportPlanV1(inspectRepositoryTransportV1(redirectedA)).plan_id_sha256;const redApplyOut=join(root,'git-dir-apply.json');const redApply=runWithEnv(process.cwd(),process.execPath,[tool,'--repo',redirectedA,'--output',redApplyOut,'--apply','--confirm-operation',VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,'--confirm-plan-id',redPlan],{GIT_DIR:redirectedGit},2);assert.equal(JSON.parse(redApply.stdout).outcome,'HOLD');assert.equal(existsSync(redApplyOut),false);assertNoRemote(redirectedA);assertNoRemote(redirectedB);

 const cliRepo=makeRepo();repos.push(cliRepo);const unsafe=join(cliRepo,'unsafe.json');const unsafeResult=run(process.cwd(),process.execPath,[tool,'--repo',cliRepo,'--output',unsafe],2);assert.equal(JSON.parse(unsafeResult.stdout).outcome,'HOLD');assert.equal(existsSync(unsafe),false);assertNoRemote(cliRepo);
 const unsafeGit=join(git(cliRepo,'rev-parse','--absolute-git-dir'),'unsafe.json'),unsafePlan=buildTransportPlanV1(inspectRepositoryTransportV1(cliRepo)).plan_id_sha256;const unsafeApply=run(process.cwd(),process.execPath,[tool,'--repo',cliRepo,'--output',unsafeGit,'--apply','--confirm-operation',VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,'--confirm-plan-id',unsafePlan],2);assert.equal(JSON.parse(unsafeApply.stdout).outcome,'HOLD');assert.equal(existsSync(unsafeGit),false);assertNoRemote(cliRepo);
 const preRepo=makeRepo();repos.push(preRepo);const preOut=join(root,'preexisting.json');writeFileSync(preOut,'keep\n');const preBytes=readFileSync(preOut),prePlan=buildTransportPlanV1(inspectRepositoryTransportV1(preRepo)).plan_id_sha256;const pre=run(process.cwd(),process.execPath,[tool,'--repo',preRepo,'--output',preOut,'--apply','--confirm-operation',VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,'--confirm-plan-id',prePlan],2);assert.equal(JSON.parse(pre.stdout).outcome,'HOLD');assert.deepEqual(readFileSync(preOut),preBytes);assertNoRemote(preRepo);

 const dryOut=join(root,'dry.json'),dry=run(process.cwd(),process.execPath,[tool,'--repo',cliRepo,'--output',dryOut]),dryResult=JSON.parse(dry.stdout);assertReceipt(dryOut,dryResult);assert.equal(dryResult.outcome,'READY_TO_APPLY');assert.equal(dryResult.mutation_attempted,false);assert.equal(dryResult.authority.git_fetch,false);assert.equal(dry.stdout.includes(cliRepo),false);const cliPlan=dryResult.plan.plan_id_sha256,dryBytes=readFileSync(dryOut);
 const duplicate=run(process.cwd(),process.execPath,[tool,'--repo',cliRepo,'--output',dryOut],2);assert.equal(JSON.parse(duplicate.stdout).outcome,'HOLD');assert.deepEqual(readFileSync(dryOut),dryBytes);assertNoRemote(cliRepo);
 const wrong=run(process.cwd(),process.execPath,[tool,'--repo',cliRepo,'--apply','--confirm-operation','WRONG','--confirm-plan-id',cliPlan],2);assert.equal(JSON.parse(wrong.stdout).outcome,'HOLD');assertNoRemote(cliRepo);
 const applyOut=join(root,'apply.json'),apply=run(process.cwd(),process.execPath,[tool,'--repo',cliRepo,'--output',applyOut,'--apply','--confirm-operation',VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,'--confirm-plan-id',cliPlan]),applyResult=JSON.parse(apply.stdout);assertReceipt(applyOut,applyResult);assert.equal(applyResult.outcome,'TRANSPORT_CONFIGURED');assert.equal(applyResult.authority.git_fetch,false);assert.equal(git(cliRepo,'remote','get-url','--all',PUBLIC_FETCH_REMOTE_V1),PUBLIC_FETCH_URL_V1);assert.equal(git(cliRepo,'remote','get-url','--push',PUBLIC_FETCH_REMOTE_V1),PUBLIC_PUSH_URL_V1);
 const alignedOut=join(root,'aligned.json'),alignedCli=run(process.cwd(),process.execPath,[tool,'--repo',cliRepo,'--output',alignedOut]),alignedResult=JSON.parse(alignedCli.stdout);assertReceipt(alignedOut,alignedResult);assert.equal(alignedResult.outcome,'ALREADY_ALIGNED');assert.equal(alignedResult.mutation_attempted,false);

 const receiptRepo=makeRepo();repos.push(receiptRepo);const receiptPlan=buildTransportPlanV1(inspectRepositoryTransportV1(receiptRepo)).plan_id_sha256,fault=join(root,'fault.mjs');writeFileSync(fault,`import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';const old=fs.writeSync;let hit=false;fs.writeSync=function(...a){if(!hit&&typeof a[0]==='number'){hit=true;throw new Error('proof injected final receipt write failure');}return old.apply(fs,a)};syncBuiltinESMExports();`);const receiptOut=join(root,'receipt-failure.json');const receipt=run(process.cwd(),process.execPath,['--import',fault,tool,'--repo',receiptRepo,'--output',receiptOut,'--apply','--confirm-operation',VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1,'--confirm-plan-id',receiptPlan],2);const receiptResult=JSON.parse(receipt.stdout);assert.equal(receiptResult.outcome,'HOLD');assert.equal(receiptResult.mutation_attempted,true);assert.equal(receiptResult.mutation_succeeded,true);assert.match(receiptResult.error,/fresh inspection required/);assert.equal(inspectRepositoryTransportV1(receiptRepo).dedicated_state,'ALIGNED');assertReceipt(receiptOut,receiptResult);

 const source=readFileSync(tool,'utf8');assert.equal(source.includes("spawnSync('systemctl'"),false);assert.equal(source.includes("spawnSync('curl'"),false);
 console.log('VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1_PROOF_GREEN');
 console.log('status=PASS');console.log('git_configuration_source_environment_rejected=true');console.log('masked_global_rewrite_rejected=true');console.log('masked_system_rewrite_rejected=true');console.log('indexed_config_injection_rejected=true');console.log('git_repository_selection_environment_rejected=true');console.log('selected_worktree_identity_bound=true');console.log('cross_clone_plan_reuse_rejected=true');console.log('same_path_replacement_plan_reuse_rejected=true');console.log('instead_of_rewrite_rejected=true');console.log('non_local_dedicated_config_rejected=true');console.log('operator_cli_journey_proven=true');console.log('post_apply_receipt_failure_truth_preserved=true');console.log('origin_preserved=true');console.log('refs_preserved=true');console.log('idempotent=true');console.log('git_fetch=false');console.log('service_mutation=false');console.log('runtime_mutation=false');
}finally{
 if(oldHome===undefined)delete process.env.HOME;else process.env.HOME=oldHome;
 if(oldXdg===undefined)delete process.env.XDG_CONFIG_HOME;else process.env.XDG_CONFIG_HOME=oldXdg;
 for(const repo of repos)rmSync(repo,{recursive:true,force:true});rmSync(root,{recursive:true,force:true});
}