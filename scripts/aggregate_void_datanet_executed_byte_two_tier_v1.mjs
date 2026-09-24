#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {buildTwoTier,validateTwoTier,canonical} from './lib/void_datanet_executed_byte_receipt_dag_v1.mjs';

const [hostedFile,designatedFile,output]=process.argv.slice(2);
assert(hostedFile&&designatedFile&&output,'usage: hosted-tier designated-host-tier output');
function readTier(file,expectedTier){
  const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink(),'tier file type');
  const text=fs.readFileSync(file,'utf8');assert(Buffer.byteLength(text)>0&&Buffer.byteLength(text)<=64*1024*1024,'tier byte bound');
  const value=JSON.parse(text);assert.equal(canonical(value)+'\n',text,'tier canonical bytes');
  assert.equal(value.host_tier,expectedTier,'tier host binding');
  return value;
}
const hosted=readTier(hostedFile,'hosted'),designated=readTier(designatedFile,'designated-host');
const receipt=buildTwoTier([hosted,designated]);validateTwoTier(receipt);
const text=canonical(receipt)+'\n';
fs.mkdirSync(output,{recursive:false});
fs.writeFileSync(path.join(output,'two-tier.json'),text,{flag:'wx',mode:0o600});
console.log('VOID_DATANET_EXECUTED_BYTE_TWO_TIER_V1_GREEN');
console.log('tiers=2');
console.log(`generation=${receipt.generation}`);
console.log(`head=${receipt.head}`);
console.log(`source_inventory_sha256=${receipt.source_inventory_sha256}`);
console.log('two_tier_sha256='+crypto.createHash('sha256').update(text).digest('hex'));
console.log('executed_byte_acceptance_green=true');
console.log('source_green=false');
console.log('merged=false');
console.log('deployed=false');
