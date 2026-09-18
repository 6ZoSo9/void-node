#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SOURCE_PATHS,sourceInventorySha256,validateSourceInventory} from './lib/void_datanet_executed_byte_receipt_dag_v1.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const git=(args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:8*1024*1024}).trim();
const head=git(['rev-parse','HEAD']);
const tree=git(['rev-parse','HEAD^{tree}']);
assert(/^[0-9a-f]{40}$/.test(head));
assert(/^[0-9a-f]{40}$/.test(tree));

const inventory=SOURCE_PATHS.map((rel)=>{
  const line=git(['ls-tree','HEAD','--',rel]);
  const m=/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(line);
  assert(m,`source inventory ls-tree: ${rel}`);
  assert.equal(m[3],rel);
  const bytes=fs.readFileSync(path.join(root,rel));
  assert(bytes.length>0&&bytes.length<=512*1024*1024,`source inventory bytes: ${rel}`);
  assert.equal(git(['hash-object','--',rel]),m[2],`source inventory blob: ${rel}`);
  return {path:rel,mode:m[1],blob_sha1:m[2],bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});
validateSourceInventory(inventory);
const digest=sourceInventorySha256(inventory);
console.log('VOID_DATANET_EXECUTED_BYTE_SOURCE_INVENTORY_V1_GREEN');
console.log(`head=${head}`);
console.log(`tree=${tree}`);
console.log(`source_paths=${inventory.length}`);
console.log(`source_inventory_sha256=${digest}`);
console.log('source_inventory='+JSON.stringify(inventory));
