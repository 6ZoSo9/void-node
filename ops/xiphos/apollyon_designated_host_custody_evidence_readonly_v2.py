#!/usr/bin/env python3
from __future__ import annotations
import argparse, grp, hashlib, json, os, pwd, re, socket, stat, subprocess, sys, time
from pathlib import Path
from typing import Any

MARKER='VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V2'
EVIDENCE_MARKER='VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2'
TARGET_HOST='Xiphos'
PINNED_SOURCE={
 'custody_core_blob_sha1':'f9f18db5bbfeea466202ef0d7babe08c3c401d66',
 'custody_service_blob_sha1':'8961572ba5834371b1229f790a1960940fc74935',
 'custody_client_blob_sha1':'fb31dbbda76c94f0ad08e38094c151a24a78b486',
}
SOURCE_PATHS={
 'custody_core_blob_sha1':'tools/apollyon-authorization-custody-core-v1.mjs',
 'custody_service_blob_sha1':'tools/apollyon-authorization-custody-service-v1.mjs',
 'custody_client_blob_sha1':'tools/apollyon-authorization-custody-client-v1.mjs',
}
SERVICE_PROPERTIES=(
 'User','Group','SupplementaryGroups','UMask','NoNewPrivileges','PrivateTmp','PrivateDevices',
 'ProtectSystem','ProtectHome','ProtectKernelTunables','ProtectKernelModules','ProtectKernelLogs',
 'ProtectControlGroups','LockPersonality','RestrictSUIDSGID','RestrictRealtime',
 'CapabilityBoundingSet','AmbientCapabilities','RestrictAddressFamilies','ReadWritePaths',
 'RefuseManualStart','RefuseManualStop','ActiveState','MainPID',
)
REVIEWED_SYSTEMD_MAJOR=255
REVIEWED_SYSTEMD_PACKAGE_VERSIONS=('255.4-1ubuntu8.11',)
SYSTEMD_MANAGE_UNIT_VERBS=(
 'start','verify-active','stop','reload','reload-or-start','restart','try-restart',
 'try-reload','nop','reload-or-restart','reload-or-try-restart','kill','clean',
 'set-property','reset-failed','ref','bind-mount','mount-image',
)
SYSTEMD_GLOBAL_CONTROL_ACTIONS=(
 'org.freedesktop.systemd1.manage-unit-files',
 'org.freedesktop.systemd1.reload-daemon',
 'org.freedesktop.systemd1.set-environment',
)
POLKIT_DENY_ACTIONS=('org.freedesktop.systemd1.manage-units',*SYSTEMD_GLOBAL_CONTROL_ACTIONS)
POLKIT_DENY_RULE_PATH=Path('/etc/polkit-1/rules.d/00-void-apollyon-training-custody-deny-v1.rules')
POLKIT_RULE_DIRECTORIES=(Path('/etc/polkit-1/rules.d'),Path('/usr/share/polkit-1/rules.d'))
RULE_RE=re.compile(r'^[A-Za-z0-9_.-]{1,200}\.rules$')
UNIT_RE=re.compile(r'^[A-Za-z0-9_.@-]+\.service$')
MAX_TTL_MS=300_000
MAX_SYSTEM_BUS_UNIQUE_NAMES=256
MAX_TRAINING_SYSTEM_BUS_SENDERS=32
SYSTEM_BUS_UNIQUE_NAME_RE=re.compile(r'^:[0-9]+\.[0-9]+$')
SYSTEM_BUS_LIST_FIELD_RE=re.compile(r'^[A-Za-z0-9_.@:+-]{1,200}$')
class Hold(RuntimeError): pass
def hold(code:str)->None: raise Hold(code)
def canonical(v:Any)->str: return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False)
def sha256(data:bytes)->str: return hashlib.sha256(data).hexdigest()
def git_blob_sha1(data:bytes)->str:
 h=hashlib.sha1(); h.update(f'blob {len(data)}\0'.encode('ascii')); h.update(data); return h.hexdigest()
def repo_root()->Path: return Path(__file__).resolve().parents[2]
def verify_source(root:Path)->dict[str,str]:
 out={}
 for key,rel in SOURCE_PATHS.items():
  digest=git_blob_sha1((root/rel).read_bytes())
  if digest!=PINNED_SOURCE[key]: hold('apollyon_custody_collector_source_binding_mismatch')
  out[key]=digest
 return out
def canonical_abs(raw:str,code:str)->Path:
 if not raw or not os.path.isabs(raw): hold(code)
 norm=os.path.abspath(raw)
 if norm!=raw: hold(code)
 return Path(norm)
def lstat_direct(path:Path,kind:str)->os.stat_result:
 try: st=path.lstat()
 except OSError as e: raise Hold('apollyon_custody_collector_path_unreadable') from e
 if stat.S_ISLNK(st.st_mode) or Path(os.path.realpath(path))!=path: hold('apollyon_custody_collector_path_alias_rejected')
 if kind=='dir' and not stat.S_ISDIR(st.st_mode): hold('apollyon_custody_collector_directory_required')
 if kind=='socket' and not stat.S_ISSOCK(st.st_mode): hold('apollyon_custody_collector_socket_required')
 if kind=='file' and not stat.S_ISREG(st.st_mode): hold('apollyon_custody_collector_regular_file_required')
 return st
def mode(st:os.stat_result)->str: return f'{stat.S_IMODE(st.st_mode):04o}'
def no_acl(path:Path)->bool:
 try: names=os.listxattr(path,follow_symlinks=False)
 except OSError as e: raise Hold('apollyon_custody_collector_xattr_read_failed') from e
 return 'system.posix_acl_access' not in names and 'system.posix_acl_default' not in names
def user(name:str):
 try:return pwd.getpwnam(name)
 except KeyError as e: raise Hold('apollyon_custody_collector_user_missing') from e
def canonical_training_user(name:str):
 try:
  forward=pwd.getpwnam(name)
  reverse=pwd.getpwuid(forward.pw_uid)
  again=pwd.getpwnam(name)
 except KeyError as e:
  raise Hold('apollyon_custody_collector_training_user_missing') from e
 identity=lambda value:(value.pw_name,value.pw_uid,value.pw_gid)
 if (
  forward.pw_name!=name or
  reverse.pw_name!=name or
  identity(forward)!=identity(reverse) or
  identity(forward)!=identity(again)
 ):
  hold('apollyon_custody_collector_training_user_not_canonical')
 return forward
def group(name:str):
 try:return grp.getgrnam(name)
 except KeyError as e: raise Hold('apollyon_custody_collector_group_missing') from e
def groups(u)->list[int]:
 try:return sorted(set(int(x) for x in os.getgrouplist(u.pw_name,u.pw_gid)))
 except OSError as e: raise Hold('apollyon_custody_collector_group_resolution_failed') from e
def bit_perm(st,uid,gids,owner,groupbit,other)->bool:
 m=stat.S_IMODE(st.st_mode)
 if uid==st.st_uid:return bool(m&owner)
 if st.st_gid in gids:return bool(m&groupbit)
 return bool(m&other)
def can_write(st,uid,gids)->bool:return bit_perm(st,uid,gids,stat.S_IWUSR,stat.S_IWGRP,stat.S_IWOTH)
def can_x(st,uid,gids)->bool:return bit_perm(st,uid,gids,stat.S_IXUSR,stat.S_IXGRP,stat.S_IXOTH)
def ancestors(path:Path)->list[Path]:
 out=[]; cur=path.parent
 while True:
  out.append(cur)
  if cur==cur.parent:return out
  cur=cur.parent
def boolprop(v:str)->bool:
 if v=='yes':return True
 if v=='no':return False
 hold('apollyon_custody_collector_service_bool_invalid')
def resolve_uid(v:str)->int:return int(v) if v.isdecimal() else user(v).pw_uid
def resolve_gid(v:str)->int:return int(v) if v.isdecimal() else group(v).gr_gid
def words(v:str)->list[str]:return [x for x in v.split() if x]
def run(args:list[str])->str:
 try:p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=8,check=False,env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LC_ALL':'C'})
 except (OSError,subprocess.SubprocessError) as e: raise Hold('apollyon_custody_collector_probe_execution_failed') from e
 if p.returncode!=0: hold('apollyon_custody_collector_probe_failed')
 return p.stdout
def run_status(args:list[str])->subprocess.CompletedProcess[str]:
 try:return subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=8,check=False,env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LC_ALL':'C'})
 except (OSError,subprocess.SubprocessError) as e: raise Hold('apollyon_custody_collector_probe_execution_failed') from e
def systemd_show(unit:str)->dict[str,str]:
 if not UNIT_RE.fullmatch(unit):hold('apollyon_custody_collector_service_unit_invalid')
 args=['/usr/bin/systemctl','show',unit,'--no-pager']+[f'--property={x}' for x in SERVICE_PROPERTIES]
 out={}
 for line in run(args).splitlines():
  if '=' in line:
   k,v=line.split('=',1); out[k]=v
 if set(out)!=set(SERVICE_PROPERTIES):hold('apollyon_custody_collector_service_properties_incomplete')
 return out
def expected_polkit_deny_rule(runtime_user:str)->bytes:
 user_json=json.dumps(runtime_user,ensure_ascii=False)
 actions=' ||\n'.join(f'      action.id === {json.dumps(x)}' for x in POLKIT_DENY_ACTIONS)
 text=(
  'polkit.addRule(function(action, subject) {\n'
  '  if (\n'
  f'    subject.user === {user_json} &&\n'
  '    (\n'
  f'{actions}\n'
  '    )\n'
  '  ) {\n'
  '    return polkit.Result.NO;\n'
  '  }\n'
  '  return polkit.Result.NOT_HANDLED;\n'
  '});\n'
 )
 return text.encode('utf-8')
def polkit_rule_inventory()->list[dict[str,Any]]:
 entries=[]
 for rank,directory in enumerate(POLKIT_RULE_DIRECTORIES):
  st=lstat_direct(directory,'dir')
  if st.st_uid!=0 or stat.S_IMODE(st.st_mode)&0o022:hold('apollyon_custody_collector_polkit_rules_directory_untrusted')
  try:names=[entry.name for entry in os.scandir(directory) if entry.name.endswith('.rules')]
  except OSError as e:raise Hold('apollyon_custody_collector_polkit_rules_inventory_failed') from e
  for name in names:
   if not RULE_RE.fullmatch(name):hold('apollyon_custody_collector_polkit_rule_name_invalid')
   entries.append({'directory':str(directory),'name':name,'path':str(directory/name),'rank':rank})
 entries.sort(key=lambda x:(x['name'],x['rank']))
 return entries
def polkit_deny_rule_evidence(training)->dict[str,Any]:
 expected=expected_polkit_deny_rule(training.pw_name)
 st=lstat_direct(POLKIT_DENY_RULE_PATH,'file')
 if st.st_uid!=0 or st.st_gid!=0 or st.st_nlink!=1 or stat.S_IMODE(st.st_mode)&0o022:
  hold('apollyon_custody_collector_polkit_deny_rule_custody_invalid')
 for ancestor in ancestors(POLKIT_DENY_RULE_PATH):
  ast=lstat_direct(ancestor,'dir')
  if ast.st_uid!=0 or stat.S_IMODE(ast.st_mode)&0o022:
   hold('apollyon_custody_collector_polkit_deny_rule_ancestor_untrusted')
 try:observed=POLKIT_DENY_RULE_PATH.read_bytes()
 except OSError as e:raise Hold('apollyon_custody_collector_polkit_deny_rule_unreadable') from e
 after=lstat_direct(POLKIT_DENY_RULE_PATH,'file')
 if (st.st_dev,st.st_ino,st.st_size,st.st_mtime_ns,st.st_ctime_ns)!=(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns):
  hold('apollyon_custody_collector_polkit_deny_rule_changed')
 if observed!=expected:hold('apollyon_custody_collector_polkit_deny_rule_bytes_mismatch')
 inventory=polkit_rule_inventory()
 if not inventory or inventory[0]['path']!=str(POLKIT_DENY_RULE_PATH):
  hold('apollyon_custody_collector_polkit_deny_rule_not_first')
 return {
  'action_id_only':True,
  'bytes':len(observed),
  'denied_action_ids':list(POLKIT_DENY_ACTIONS),
  'details_can_change_result':False,
  'group_other_writable':False,
  'lexically_first':True,
  'mode':mode(st),
  'owner_gid':st.st_gid,
  'owner_uid':st.st_uid,
  'path':str(POLKIT_DENY_RULE_PATH),
  'retained_ancestors_group_other_writable':False,
  'retained_ancestors_root_owned':True,
  'runtime_user':training.pw_name,
  'sha256':sha256(observed),
  'single_link':True,
  'symlink':False,
 }
def classify_pkcheck_status(code:int)->str:
 if code==0:return 'authorized'
 if code==1:return 'denied'
 if code==2:return 'challenge'
 if code==3:return 'dismissed'
 return 'error'
def parse_installed_systemd_version_line(line:str)->dict[str,Any]:
 value=line.strip(); match=re.fullmatch(r'^systemd\s+([0-9]+)\s+\(([^()]+)\)$',value)
 if not match:hold('apollyon_custody_collector_systemd_version_failed')
 major=int(match.group(1)); package_version=match.group(2).strip()
 if (
  major!=REVIEWED_SYSTEMD_MAJOR or
  package_version not in REVIEWED_SYSTEMD_PACKAGE_VERSIONS
 ):
  hold('apollyon_custody_collector_systemd_package_not_reviewed')
 return {
  'installed_systemd_major':major,
  'installed_systemd_package_version':package_version,
  'observed_systemd_version_line':value,
  'reviewed_systemd_package_version':package_version,
 }
def parse_running_systemd_manager_version(raw:str)->dict[str,Any]:
 value=raw.strip(); match=re.fullmatch(r's\s+"([A-Za-z0-9.+:~_-]{1,120})"',value)
 if not match:hold('apollyon_custody_collector_running_systemd_version_failed')
 version=match.group(1)
 if version not in REVIEWED_SYSTEMD_PACKAGE_VERSIONS:
  hold('apollyon_custody_collector_running_systemd_package_not_reviewed')
 major_match=re.match(r'^([0-9]+)(?:[.-]|$)',version)
 if not major_match or int(major_match.group(1))!=REVIEWED_SYSTEMD_MAJOR:
  hold('apollyon_custody_collector_running_systemd_major_not_reviewed')
 return {
  'running_systemd_manager_major':int(major_match.group(1)),
  'running_systemd_manager_version':version,
 }
def parse_systemd_bus_owner_pid(raw:str)->dict[str,Any]:
 value=raw.strip(); match=re.fullmatch(r'u\s+([1-9][0-9]*)',value)
 if not match:hold('apollyon_custody_collector_systemd_bus_owner_pid_invalid')
 pid=int(match.group(1))
 if pid!=1:hold('apollyon_custody_collector_systemd_bus_owner_not_pid1')
 return {
  'systemd_bus_owner_pid':pid,
  'systemd_bus_owner_pid_is_pid1':True,
 }
def systemd_version_evidence()->dict[str,Any]:
 lines=run(['/usr/bin/systemctl','--version']).splitlines()
 if not lines:hold('apollyon_custody_collector_systemd_version_failed')
 installed=parse_installed_systemd_version_line(lines[0])
 owner=parse_systemd_bus_owner_pid(run([
  '/usr/bin/busctl','--system','call',
  'org.freedesktop.DBus','/org/freedesktop/DBus',
  'org.freedesktop.DBus','GetConnectionUnixProcessID',
  's','org.freedesktop.systemd1',
 ]))
 running=parse_running_systemd_manager_version(run([
  '/usr/bin/busctl','--system','get-property',
  'org.freedesktop.systemd1','/org/freedesktop/systemd1',
  'org.freedesktop.systemd1.Manager','Version',
 ]))
 if running['running_systemd_manager_version']!=installed['installed_systemd_package_version']:
  hold('apollyon_custody_collector_running_installed_systemd_version_mismatch')
 return {
  **installed,**owner,**running,
  'running_installed_systemd_version_match':True,
 }

def process_uid_slots(status_text:str)->list[int]:
 line=next((x for x in status_text.splitlines() if x.startswith('Uid:')),None)
 if line is None:hold('apollyon_custody_collector_training_process_uid_invalid')
 parts=line.split()[1:]
 if len(parts)!=4 or any(not x.isdecimal() for x in parts):
  hold('apollyon_custody_collector_training_process_uid_invalid')
 return [int(x) for x in parts]
def zero_capability_credentials(status_text:str,training)->dict[str,Any]:
 uid_slots=process_uid_slots(status_text)
 if any(uid!=training.pw_uid for uid in uid_slots):
  hold('apollyon_custody_collector_training_process_uid_invalid')
 caps={}
 for key in ('CapInh','CapPrm','CapEff','CapAmb'):
  line=next((x for x in status_text.splitlines() if x.startswith(key+':')),None)
  if line is None:hold('apollyon_custody_collector_training_process_capabilities_invalid')
  raw=line.split(':',1)[1].strip()
  if not re.fullmatch(r'[0-9A-Fa-f]+',raw) or int(raw,16)!=0:
   hold('apollyon_custody_collector_training_process_capabilities_nonzero')
  caps[key]='0'
 nnp=next((x for x in status_text.splitlines() if x.startswith('NoNewPrivs:')),None)
 if nnp is None or nnp.split(':',1)[1].strip()!='1':
  hold('apollyon_custody_collector_training_process_no_new_privileges_not_enforced')
 return {
  'uid_slots':uid_slots,
  'capabilities':{
   'ambient':caps['CapAmb'],'effective':caps['CapEff'],
   'inheritable':caps['CapInh'],'no_new_privileges':True,
   'permitted':caps['CapPrm'],
  },
 }
def parse_proc_start_time(stat_text:str,code:str)->str:
 close=stat_text.rfind(') ')
 if close<=0:hold(code)
 fields=stat_text[close+2:].strip().split()
 if len(fields)<20 or not fields[19].isdecimal() or int(fields[19])<=0:hold(code)
 return fields[19]
def training_thread_subject(pid:int,tid:int,training)->dict[str,Any]:
 if not isinstance(pid,int) or pid<=0 or not isinstance(tid,int) or tid<=0:
  hold('apollyon_custody_collector_training_thread_invalid')
 base=Path(f'/proc/{pid}/task/{tid}')
 try:
  stat_text=(base/'stat').read_text(encoding='utf-8')
  status_text=(base/'status').read_text(encoding='utf-8')
 except (OSError,UnicodeError) as e:
  raise Hold('apollyon_custody_collector_training_thread_unreadable') from e
 credentials=zero_capability_credentials(status_text,training)
 return {
  'tid':tid,
  'start_time_ticks':parse_proc_start_time(
   stat_text,'apollyon_custody_collector_training_thread_stat_invalid',
  ),
  'uid_slots':credentials['uid_slots'],
  'capabilities':credentials['capabilities'],
 }
def training_process_subject(pid:int,training)->dict[str,Any]:
 if not isinstance(pid,int) or pid<=0:hold('apollyon_custody_collector_training_pid_invalid')
 try:
  stat_text=Path(f'/proc/{pid}/stat').read_text(encoding='utf-8')
  status_text=Path(f'/proc/{pid}/status').read_text(encoding='utf-8')
 except (OSError,UnicodeError) as e:
  raise Hold('apollyon_custody_collector_training_process_unreadable') from e
 credentials=zero_capability_credentials(status_text,training)
 start=parse_proc_start_time(
  stat_text,'apollyon_custody_collector_training_process_stat_invalid',
 )
 return {
  'capabilities':credentials['capabilities'],
  'pid':pid,'start_time_ticks':start,
  'uid':training.pw_uid,'uid_slots':credentials['uid_slots'],
 }
def training_process_thread_ids(pid:int)->list[int]:
 task=Path(f'/proc/{pid}/task')
 try:entries=list(task.iterdir())
 except OSError as e:
  raise Hold('apollyon_custody_collector_training_thread_inventory_failed') from e
 tids=sorted(int(entry.name) for entry in entries if entry.name.isdecimal())
 if not tids or pid not in tids:
  hold('apollyon_custody_collector_training_thread_inventory_invalid')
 return tids
def training_process_thread_inventory(pid:int,training)->dict[str,Any]:
 first_ids=training_process_thread_ids(pid)
 first=[training_thread_subject(pid,tid,training) for tid in first_ids]
 second_ids=training_process_thread_ids(pid)
 if first_ids!=second_ids:
  hold('apollyon_custody_collector_training_thread_inventory_changed')
 second=[training_thread_subject(pid,tid,training) for tid in second_ids]
 if first!=second:
  hold('apollyon_custody_collector_training_thread_credentials_changed')
 return {
  'thread_count':len(second),
  'thread_inventory_sha256':sha256(canonical(second).encode('utf-8')),
  'thread_set_stable':True,
  'all_threads_capability_free':True,
 }
def process_has_training_uid_thread(pid:int,training_uid:int)->bool:
 task=Path(f'/proc/{pid}/task')
 try:entries=list(task.iterdir())
 except FileNotFoundError:return False
 except OSError as e:
  raise Hold('apollyon_custody_collector_training_thread_inventory_failed') from e
 for thread in entries:
  if not thread.name.isdecimal():continue
  try:status_text=(thread/'status').read_text(encoding='utf-8')
  except FileNotFoundError:
   hold('apollyon_custody_collector_training_thread_inventory_changed')
  except (OSError,UnicodeError) as e:
   raise Hold('apollyon_custody_collector_training_thread_inventory_failed') from e
  if training_uid in process_uid_slots(status_text):
   return True
 return False
def training_uid_process_ids(training)->list[int]:
 ids=[]
 try:entries=list(Path('/proc').iterdir())
 except OSError as e:raise Hold('apollyon_custody_collector_proc_inventory_failed') from e
 for proc in entries:
  if not proc.name.isdecimal():continue
  pid=int(proc.name)
  if process_has_training_uid_thread(pid,training.pw_uid):
   ids.append(pid)
 ids.sort()
 return ids
def collect_training_uid_processes(training)->dict[str,Any]:
 ids=training_uid_process_ids(training)
 processes=[]; total_threads=0
 for pid in ids:
  subject=training_process_subject(pid,training)
  threads=training_process_thread_inventory(pid,training)
  total_threads+=threads['thread_count']
  processes.append({
   'pid':subject['pid'],
   'start_time_ticks':subject['start_time_ticks'],
   'uid':subject['uid'],
   'uid_slots':subject['uid_slots'],
   'capabilities':subject['capabilities'],
   'thread_count':threads['thread_count'],
   'thread_inventory_sha256':threads['thread_inventory_sha256'],
   'thread_set_stable':threads['thread_set_stable'],
   'all_threads_capability_free':threads['all_threads_capability_free'],
  })
 return {'processes':processes,'thread_count':total_threads}
def training_uid_process_inventory(training,expected_pid:int)->dict[str,Any]:
 first=collect_training_uid_processes(training)
 if not first['processes'] or expected_pid not in {x['pid'] for x in first['processes']}:
  hold('apollyon_custody_collector_training_process_inventory_missing_expected')
 second=collect_training_uid_processes(training)
 if first!=second:
  hold('apollyon_custody_collector_training_process_inventory_changed')
 return {
  'all_training_uid_processes_capability_free':True,
  'all_training_uid_threads_capability_free':True,
  'training_uid_process_count':len(second['processes']),
  'training_uid_process_set_stable':True,
  'training_uid_processes':second['processes'],
  'training_uid_thread_count':second['thread_count'],
  'training_uid_thread_sets_stable':True,
 }
def control_request_specs(unit:str)->list[tuple[str,tuple[tuple[str,str],...]]]:
 return [
  ('org.freedesktop.systemd1.manage-units',()),
  *[
   ('org.freedesktop.systemd1.manage-units',(('unit',unit),('verb',verb)))
   for verb in SYSTEMD_MANAGE_UNIT_VERBS
  ],
  *[(action,()) for action in SYSTEMD_GLOBAL_CONTROL_ACTIONS],
 ]
def pkcheck_denial(action_id:str,subject:str,details:tuple[tuple[str,str],...]=())->dict[str,Any]:
 args=['/usr/bin/pkcheck','--action-id',action_id,'--process',subject]
 for key,value in details:args.extend(['--detail',key,value])
 p=run_status(args); classification=classify_pkcheck_status(p.returncode)
 if classification!='denied':
  hold('apollyon_custody_collector_runtime_service_control_authorized' if classification=='authorized' else 'apollyon_custody_collector_runtime_service_control_not_explicitly_denied')
 return {'action_id':action_id,'details':[{'key':k,'value':v} for k,v in details],'exit_status':1,'result':'explicitly_denied'}
def pkcheck_bus_denial(action_id:str,bus_name:str,details:tuple[tuple[str,str],...]=())->dict[str,Any]:
 if not SYSTEM_BUS_UNIQUE_NAME_RE.fullmatch(bus_name):
  hold('apollyon_custody_collector_system_bus_name_invalid')
 args=['/usr/bin/pkcheck','--action-id',action_id,'--system-bus-name',bus_name]
 for key,value in details:args.extend(['--detail',key,value])
 p=run_status(args); classification=classify_pkcheck_status(p.returncode)
 if classification!='denied':
  hold('apollyon_custody_collector_runtime_service_control_authorized' if classification=='authorized' else 'apollyon_custody_collector_runtime_service_control_not_explicitly_denied')
 return {'action_id':action_id,'details':[{'key':k,'value':v} for k,v in details],'exit_status':1,'result':'explicitly_denied'}
def parse_busctl_unique_rows(raw:str)->list[dict[str,Any]]:
 rows=[]
 for line in raw.splitlines():
  stripped=line.strip()
  if not stripped:continue
  parts=stripped.split()
  if len(parts)<4:hold('apollyon_custody_collector_system_bus_list_invalid')
  name,pid_raw,process_name,user_name=parts[:4]
  if not SYSTEM_BUS_UNIQUE_NAME_RE.fullmatch(name):
   hold('apollyon_custody_collector_system_bus_list_invalid')
  if not pid_raw.isdecimal() or int(pid_raw)<=0:
   hold('apollyon_custody_collector_system_bus_list_invalid')
  if (
   not SYSTEM_BUS_LIST_FIELD_RE.fullmatch(process_name) or
   not SYSTEM_BUS_LIST_FIELD_RE.fullmatch(user_name)
  ):hold('apollyon_custody_collector_system_bus_list_invalid')
  rows.append({
   'bus_name':name,'listed_pid':int(pid_raw),
   'listed_process':process_name,'listed_user':user_name,
  })
 if len(rows)>MAX_SYSTEM_BUS_UNIQUE_NAMES:
  hold('apollyon_custody_collector_system_bus_list_oversize')
 rows.sort(key=lambda x:x['bus_name'])
 if len({row['bus_name'] for row in rows})!=len(rows):
  hold('apollyon_custody_collector_system_bus_list_duplicate')
 return rows
def parse_busctl_unique_names(raw:str)->list[str]:
 return [row['bus_name'] for row in parse_busctl_unique_rows(raw)]
def dbus_connection_uint32(method:str,name:str)->int:
 if method not in {'GetConnectionUnixProcessID','GetConnectionUnixUser'}:
  hold('apollyon_custody_collector_system_bus_method_invalid')
 if not SYSTEM_BUS_UNIQUE_NAME_RE.fullmatch(name):
  hold('apollyon_custody_collector_system_bus_name_invalid')
 p=run_status([
  '/usr/bin/busctl','--system','call',
  'org.freedesktop.DBus','/org/freedesktop/DBus',
  'org.freedesktop.DBus',method,'s',name,
 ])
 if p.returncode!=0:
  hold('apollyon_custody_collector_system_bus_credentials_lookup_failed')
 match=re.fullmatch(r'u\s+([0-9]+)\s*',p.stdout)
 if not match:hold('apollyon_custody_collector_system_bus_credentials_invalid')
 value=int(match.group(1))
 if value<0 or value>0xFFFF_FFFF:
  hold('apollyon_custody_collector_system_bus_credentials_invalid')
 return value
def system_bus_sender_snapshot(training,process_ids:set[int])->list[dict[str,Any]]:
 rows=parse_busctl_unique_rows(run([
  '/usr/bin/busctl','--system','--unique','--no-pager','--no-legend','list',
 ]))
 senders=[]
 training_users={training.pw_name,str(training.pw_uid)}
 for row in rows:
  if row['listed_pid'] not in process_ids and row['listed_user'] not in training_users:
   continue
  name=row['bus_name']
  pid=dbus_connection_uint32('GetConnectionUnixProcessID',name)
  uid=dbus_connection_uint32('GetConnectionUnixUser',name)
  if pid!=row['listed_pid']:
   hold('apollyon_custody_collector_system_bus_list_credentials_drift')
  if pid not in process_ids or uid!=training.pw_uid:
   hold('apollyon_custody_collector_training_system_bus_credentials_mismatch')
  senders.append({'bus_name':name,'pid':pid,'uid':uid})
 if len(senders)>MAX_TRAINING_SYSTEM_BUS_SENDERS:
  hold('apollyon_custody_collector_training_system_bus_sender_limit')
 senders.sort(key=lambda x:x['bus_name'])
 return senders
def system_bus_sender_evidence(training,process_inventory:dict[str,Any],unit:str)->dict[str,Any]:
 process_ids={item['pid'] for item in process_inventory['training_uid_processes']}
 first=system_bus_sender_snapshot(training,process_ids)
 evidence=[]; specs=control_request_specs(unit)
 for sender in first:
  checks=[
   pkcheck_bus_denial(action_id,sender['bus_name'],details)
   for action_id,details in specs
  ]
  evidence.append({
   **sender,
   'all_systemd_control_actions_explicitly_denied':True,
   'checked_action_count':len(checks),
   'denial_transcript_sha256':sha256(canonical(checks).encode('utf-8')),
   'subject_type':'system-bus-name',
  })
 second=system_bus_sender_snapshot(training,process_ids)
 if first!=second:
  hold('apollyon_custody_collector_training_system_bus_sender_set_changed')
 return {
  'actual_system_bus_sender_checks_required':True,
  'actual_system_bus_sender_count':len(evidence),
  'actual_system_bus_sender_set_stable':True,
  'actual_system_bus_senders':evidence,
 }
def service_control_evidence(training,training_pid:int,unit:str)->dict[str,Any]:
 if not UNIT_RE.fullmatch(unit):hold('apollyon_custody_collector_service_unit_invalid')
 versions=systemd_version_evidence()
 process_inventory=training_uid_process_inventory(training,training_pid)
 process=next(
  (item for item in process_inventory['training_uid_processes']
   if item['pid']==training_pid),None,
 )
 if process is None:hold('apollyon_custody_collector_training_process_inventory_missing_expected')
 process_subject=f"{process['pid']},{process['start_time_ticks']},{process['uid']}"
 deny_rule=polkit_deny_rule_evidence(training)
 specs=control_request_specs(unit)
 checks=[pkcheck_denial(action_id,process_subject,details) for action_id,details in specs]
 bus=system_bus_sender_evidence(training,process_inventory,unit)
 post_inventory=training_uid_process_inventory(training,training_pid)
 if canonical(post_inventory['training_uid_processes'])!=canonical(process_inventory['training_uid_processes']):
  hold('apollyon_custody_collector_training_process_identity_changed_during_authorization')
 if post_inventory['training_uid_thread_count']!=process_inventory['training_uid_thread_count']:
  hold('apollyon_custody_collector_training_process_identity_changed_during_authorization')
 return {
  'actual_system_bus_sender_checks_required':bus['actual_system_bus_sender_checks_required'],
  'actual_system_bus_sender_count':bus['actual_system_bus_sender_count'],
  'actual_system_bus_sender_set_stable':bus['actual_system_bus_sender_set_stable'],
  'actual_system_bus_senders':bus['actual_system_bus_senders'],
  'all_systemd_control_actions_explicitly_denied':True,
  'all_training_uid_processes_capability_free':process_inventory['all_training_uid_processes_capability_free'],
  'all_training_uid_threads_capability_free':process_inventory['all_training_uid_threads_capability_free'],
  'checked_actions':checks,
  'absolute_runtime_service_control_denial_proven':False,
  'inherited_system_bus_descriptor_absence_required':True,
  'inherited_system_bus_descriptor_absence_proven':False,
  'installed_systemd_package_version':versions['installed_systemd_package_version'],
  'observed_systemd_version_line':versions['observed_systemd_version_line'],
  'pkcheck_subject':process_subject,
  'polkit_deny_rule':deny_rule,
  'reviewed_systemd_major':REVIEWED_SYSTEMD_MAJOR,
  'reviewed_systemd_package_version':versions['reviewed_systemd_package_version'],
  'running_installed_systemd_version_match':versions['running_installed_systemd_version_match'],
  'running_systemd_manager_major':versions['running_systemd_manager_major'],
  'running_systemd_manager_version':versions['running_systemd_manager_version'],
  'runtime_can_control_service':None,
  'service_unit':unit,
  'systemd_bus_owner_pid':versions['systemd_bus_owner_pid'],
  'systemd_bus_owner_pid_is_pid1':versions['systemd_bus_owner_pid_is_pid1'],
  'training_pid':process['pid'],
  'training_process_capabilities':process['capabilities'],
  'training_process_start_time_ticks':process['start_time_ticks'],
  'training_uid':process['uid'],
  'training_uid_process_identity_stable_across_authorization':True,
  'training_uid_process_count':process_inventory['training_uid_process_count'],
  'training_uid_process_set_stable':process_inventory['training_uid_process_set_stable'],
  'training_uid_processes':process_inventory['training_uid_processes'],
  'training_uid_thread_count':process_inventory['training_uid_thread_count'],
  'training_uid_thread_sets_stable':process_inventory['training_uid_thread_sets_stable'],
 }
def proc_uids()->dict[int,set[int]]:
 out={}
 for p in Path('/proc').iterdir():
  if not p.name.isdecimal():continue
  try:t=(p/'status').read_text(encoding='utf-8')
  except (OSError,UnicodeError):continue
  line=next((x for x in t.splitlines() if x.startswith('Uid:')),None)
  if not line:continue
  parts=line.split()
  if len(parts)>=2 and parts[1].isdecimal():out.setdefault(int(parts[1]),set()).add(int(p.name))
 return out
def snapshot(ttl:int)->dict[str,Any]:
 if ttl<1 or ttl>MAX_TTL_MS:hold('apollyon_custody_collector_ttl_invalid')
 observed=time.time_ns()//1_000_000
 try:generation=time.clock_gettime_ns(time.CLOCK_BOOTTIME)
 except (AttributeError,OSError) as e: raise Hold('apollyon_custody_collector_boottime_unavailable') from e
 boot=Path('/proc/sys/kernel/random/boot_id').read_text(encoding='ascii').strip()
 if not re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}',boot):hold('apollyon_custody_collector_boot_id_invalid')
 return {'boot_id_sha256':sha256(boot.encode()),'evidence_generation':generation,'expires_at_ms':observed+ttl,'observed_at_ms':observed}
def path_evidence(state_root:Path,socket_path:Path,training,custody,ipc_gid:int):
 consumed=state_root/'consumed'; sp=socket_path.parent
 ss=lstat_direct(state_root,'dir'); sc=lstat_direct(consumed,'dir'); spst=lstat_direct(sp,'dir'); sk=lstat_direct(socket_path,'socket')
 state_chain=ancestors(state_root); socket_chain=ancestors(sp)
 for p in (state_root,consumed,sp,socket_path,*state_chain,*socket_chain):
  if not no_acl(p):hold('apollyon_custody_collector_extended_acl_rejected')
 tg=set(groups(training)); cg=set(groups(custody)); ast=[lstat_direct(p,'dir') for p in state_chain]; sap=[lstat_direct(p,'dir') for p in socket_chain]
 state={'direct':True,'mode':mode(ss),'owner_gid':ss.st_gid,'owner_uid':ss.st_uid,'realpath_canonical':True,'retained_ancestor_count':len(ast),'retained_ancestors_direct':True,'retained_ancestors_group_other_writable':any(stat.S_IMODE(x.st_mode)&0o022 for x in ast),'retained_ancestors_root_owned':all(x.st_uid==0 for x in ast),'retained_ancestors_symlink_free':True,'symlink':False,'training_uid_rename_unlink_denied':not can_write(lstat_direct(state_root.parent,'dir'),training.pw_uid,tg),'training_uid_write_denied':not can_write(ss,training.pw_uid,tg)}
 consumed_ev={'direct':True,'mode':mode(sc),'owner_gid':sc.st_gid,'owner_uid':sc.st_uid,'parent_bound_to_state_root':consumed.parent==state_root,'symlink':False,'training_uid_rename_unlink_denied':not can_write(ss,training.pw_uid,tg),'training_uid_write_denied':not can_write(sc,training.pw_uid,tg)}
 sp_ev={'custody_uid_write_allowed':can_write(spst,custody.pw_uid,cg),'direct':True,'mode':mode(spst),'owner_gid':spst.st_gid,'owner_uid':spst.st_uid,'retained_ancestor_count':len(sap),'retained_ancestors_direct':True,'retained_ancestors_group_other_writable':any(stat.S_IMODE(x.st_mode)&0o022 for x in sap),'retained_ancestors_root_owned':all(x.st_uid==0 for x in sap),'retained_ancestors_symlink_free':True,'symlink':False,'training_uid_rename_unlink_denied':not can_write(lstat_direct(sp.parent,'dir'),training.pw_uid,tg),'training_uid_traverse_allowed':can_x(spst,training.pw_uid,tg),'training_uid_write_denied':not can_write(spst,training.pw_uid,tg)}
 sock_ev={'custody_uid_connect_allowed':can_write(sk,custody.pw_uid,cg),'mode':mode(sk),'owner_gid':sk.st_gid,'owner_uid':sk.st_uid,'training_uid_connect_allowed':can_write(sk,training.pw_uid,tg),'type':'AF_UNIX_socket'}
 return state,consumed_ev,sp_ev,sock_ev
def service_evidence(unit:str,state_root:Path,socket_parent:Path,custody,ipc_gid:int,control:dict[str,Any])->dict[str,Any]:
 p=systemd_show(unit); uid=resolve_uid(p['User']); gid=resolve_gid(p['Group']); supp=sorted(resolve_gid(x) for x in words(p['SupplementaryGroups']))
 rw=[]
 for item in words(p['ReadWritePaths']):
  if item==str(socket_parent):rw.append('socket_parent')
  elif item==str(state_root):rw.append('state_root')
  else:hold('apollyon_custody_collector_extra_readwrite_path')
 rw.sort()
 if rw!=['socket_parent','state_root']:hold('apollyon_custody_collector_readwrite_paths_incomplete')
 if p['RefuseManualStart']!='yes' or p['RefuseManualStop']!='yes':hold('apollyon_custody_collector_runtime_control_not_denied')
 if p['ActiveState']!='active':hold('apollyon_custody_collector_service_not_active')
 try:mainpid=int(p['MainPID'])
 except ValueError as e:raise Hold('apollyon_custody_collector_main_pid_invalid') from e
 if mainpid<=0 or proc_uids().get(custody.pw_uid,set())!={mainpid}:hold('apollyon_custody_collector_custody_uid_process_exclusivity_failed')
 if uid!=custody.pw_uid or gid!=custody.pw_gid or supp!=[ipc_gid]:hold('apollyon_custody_collector_service_identity_mismatch')
 umask=p['UMask']; umask=f'{int(umask,8):04o}' if umask else ''
 return {'ambient_capabilities':words(p['AmbientCapabilities']),'capability_bounding_set':words(p['CapabilityBoundingSet']),'custody_uid_only_reviewed_service':True,'group_gid':gid,'lock_personality':boolprop(p['LockPersonality']),'manager':'system','no_new_privileges':boolprop(p['NoNewPrivileges']),'private_devices':boolprop(p['PrivateDevices']),'private_tmp':boolprop(p['PrivateTmp']),'protect_control_groups':boolprop(p['ProtectControlGroups']),'protect_home':boolprop(p['ProtectHome']),'protect_kernel_logs':boolprop(p['ProtectKernelLogs']),'protect_kernel_modules':boolprop(p['ProtectKernelModules']),'protect_kernel_tunables':boolprop(p['ProtectKernelTunables']),'protect_system':p['ProtectSystem'],'read_write_targets':rw,'restrict_address_families':words(p['RestrictAddressFamilies']),'restrict_realtime':boolprop(p['RestrictRealtime']),'restrict_suid_sgid':boolprop(p['RestrictSUIDSGID']),'runtime_can_control_service':control['runtime_can_control_service'],'supplementary_gids':supp,'umask':umask,'user_uid':uid}
def collect(a)->dict[str,Any]:
 if os.geteuid()!=0:hold('apollyon_custody_collector_root_required')
 if socket.gethostname().casefold()!=TARGET_HOST.casefold():hold('apollyon_custody_collector_wrong_host')
 source=verify_source(repo_root()); tr=canonical_training_user(a.training_user); cu=user(a.custody_user); ipc=group(a.ipc_group); tg=groups(tr); cg=groups(cu)
 if tr.pw_uid==cu.pw_uid or tr.pw_gid==cu.pw_gid:hold('apollyon_custody_collector_identity_separation_invalid')
 if ipc.gr_gid in {tr.pw_gid,cu.pw_gid} or ipc.gr_gid not in tg or ipc.gr_gid not in cg:hold('apollyon_custody_collector_ipc_membership_invalid')
 if cu.pw_gid in tg or tr.pw_gid in cg:hold('apollyon_custody_collector_primary_group_cross_membership')
 sr=canonical_abs(a.state_root,'apollyon_custody_collector_state_root_invalid'); sp=canonical_abs(a.socket_path,'apollyon_custody_collector_socket_path_invalid')
 if sp.parent==sr or sp.parent.is_relative_to(sr) or sr.is_relative_to(sp.parent):hold('apollyon_custody_collector_paths_not_separated')
 sev,cev,spev,sockev=path_evidence(sr,sp,tr,cu,ipc.gr_gid); control=service_control_evidence(tr,a.training_pid,a.service_unit); service=service_evidence(a.service_unit,sr,sp.parent,cu,ipc.gr_gid,control); snap=snapshot(a.ttl_ms); now=time.time_ns()//1_000_000
 if now<snap['observed_at_ms'] or now>=snap['expires_at_ms']:hold('apollyon_custody_collector_clock_window_invalid')
 return {'consumed_directory':cev,'evidence_snapshot':snap,'identities':{'custody_gid':cu.pw_gid,'custody_supplementary_gids':cg,'custody_uid':cu.pw_uid,'ipc_gid':ipc.gr_gid,'training_gid':tr.pw_gid,'training_supplementary_gids':tg,'training_uid':tr.pw_uid,'training_user':tr.pw_name},'marker':EVIDENCE_MARKER,'service':service,'service_control':control,'socket':sockev,'socket_parent':spev,'source_binding':source,'state_root':sev,'target_host':TARGET_HOST,'verification_now_ms':now,'version':2}
def self_test():
 current_name=pwd.getpwuid(os.getuid()).pw_name
 canonical_current=canonical_training_user(current_name)
 assert canonical_current.pw_name==current_name
 assert git_blob_sha1(b'hello\n')==hashlib.sha1(b'blob 6\0hello\n').hexdigest(); assert canonical({'b':1,'a':2})=='{"a":2,"b":1}'; assert boolprop('yes') is True; assert boolprop('no') is False; assert classify_pkcheck_status(1)=='denied'; assert classify_pkcheck_status(0)=='authorized'; assert parse_installed_systemd_version_line('systemd 255 (255.4-1ubuntu8.11)')['installed_systemd_package_version']=='255.4-1ubuntu8.11'; assert parse_running_systemd_manager_version('s \"255.4-1ubuntu8.11\"')['running_systemd_manager_major']==255; assert parse_systemd_bus_owner_pid('u 1')['systemd_bus_owner_pid_is_pid1'] is True; assert REVIEWED_SYSTEMD_PACKAGE_VERSIONS==('255.4-1ubuntu8.11',); assert SYSTEM_BUS_UNIQUE_NAME_RE.fullmatch(':1.42') is not None; assert parse_busctl_unique_names(':1.2 2 service root\n:1.1 1 other root\n')==[':1.1',':1.2']; assert b'polkit.message' not in expected_polkit_deny_rule('training'); assert b'action.id' in expected_polkit_deny_rule('training'); assert classify_pkcheck_status(2)=='challenge'; assert classify_pkcheck_status(3)=='dismissed'; assert classify_pkcheck_status(127)=='error'
 try:boolprop('bad')
 except Hold:pass
 else:raise AssertionError('invalid boolean did not HOLD')
 print(MARKER+'_SELF_TEST=GREEN')
def make_parser():
 p=argparse.ArgumentParser(); p.add_argument('--training-user');p.add_argument('--training-pid',type=int);p.add_argument('--custody-user');p.add_argument('--ipc-group');p.add_argument('--state-root');p.add_argument('--socket-path');p.add_argument('--service-unit');p.add_argument('--ttl-ms',type=int,default=300_000);p.add_argument('--self-test',action='store_true');return p
def main()->int:
 a=make_parser().parse_args()
 if a.self_test:self_test();return 0
 if any(getattr(a,k) in (None,'') for k in ('training_user','training_pid','custody_user','ipc_group','state_root','socket_path','service_unit')):print('HOLD=apollyon_custody_collector_required_argument_missing',file=sys.stderr);return 2
 try:e=collect(a)
 except Hold as x:
  print('HOLD='+str(x),file=sys.stderr);print('read_only=true\nhost_mutation=false\nservice_action=false\noperator_private_key_access=false\nattempt_claim=false\ntraining_execution=false',file=sys.stderr);return 2
 sys.stdout.write(canonical(e)+'\n');print(MARKER,file=sys.stderr);print('read_only=true\nlive_host_evidence_collected=true\nverification_clock_source=kernel_realtime\nevidence_generation_source=CLOCK_BOOTTIME_ns\nhost_mutation=false\nservice_action=false\noperator_private_key_access=false\nattempt_claim=false\ntraining_execution=false',file=sys.stderr);return 0
if __name__=='__main__':raise SystemExit(main())
