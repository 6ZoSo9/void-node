#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {TIERS,buildTier,validateTier,canonical} from './lib/void_datanet_executed_byte_receipt_dag_v1.mjs';

const [input,output,expectedTier='hosted']=process.argv.slice(2);
assert(input&&output,'usage: input output [hosted|designated-host]');
assert(TIERS.includes(expectedTier),'expected host tier');
const files=[];
function walk(dir){
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name),s=fs.lstatSync(p);
    assert(!s.isSymbolicLink(),'artifact_symlink');
    if(s.isDirectory()) walk(p);
    else if(name==='member.json') files.push(p);
  }
}
walk(input);files.sort();assert.equal(files.length,6,'six tier members');
const members=files.map(p=>{
  const b=fs.readFileSync(p);assert(b.length>0&&b.length<=32*1024*1024,'member bound');
  const value=JSON.parse(b);assert.equal(value.host_tier,expectedTier,'member host tier');
  return value;
});
const tier=buildTier(members);validateTier(tier);assert.equal(tier.host_tier,expectedTier);assert.equal(tier.members.length,6);
const text=canonical(tier)+'\n';
fs.mkdirSync(output,{recursive:false});
const file=path.join(output,`${expectedTier}-tier.json`);
fs.writeFileSync(file,text,{flag:'wx',mode:0o600});
console.log('VOID_DATANET_EXECUTED_BYTE_TIER_V1_GREEN');
console.log('members=6');
console.log(`host_tier=${expectedTier}`);
console.log(`generation=${tier.generation}`);
console.log('tier_sha256='+crypto.createHash('sha256').update(text).digest('hex'));
console.log('two_tier_acceptance=false');
