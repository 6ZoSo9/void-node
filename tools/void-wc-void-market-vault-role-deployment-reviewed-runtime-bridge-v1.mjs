#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { AbiCoder, concat, keccak256 } from "ethers";

import {
  reverifyVoidWcVoidLaunchControllerControlEvidenceV1,
} from "./void-wc-void-launch-controller-control-requalification-v1.mjs";

export const VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_REVIEWED_RUNTIME_BRIDGE_V1 =
  "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_REVIEWED_RUNTIME_BRIDGE_V1";

const MAX_INPUT_BYTES=4*1024*1024;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const BYTES32=/^0x[0-9a-f]{64}$/u;
const HEX=/^0x(?:[0-9a-f]{2})+$/u;

function fail(code){throw new Error(code);}

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function exactObject(value,keys,code){
  if(!plain(value))fail(code);
  const actual=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(
    actual.length!==expected.length||
    actual.some((key,index)=>key!==expected[index])
  )fail(code);
  return value;
}

function directInput(relativePath){
  if(
    typeof relativePath!=="string"||
    relativePath.length<1||
    relativePath.length>512||
    path.isAbsolute(relativePath)
  )fail("ROLE_DEPLOYMENT_REVIEWED_RUNTIME_INPUT_PATH_INVALID");

  const root=fs.realpathSync.native(process.cwd());
  const candidate=path.resolve(root,relativePath);
  const relative=path.relative(root,candidate);
  if(
    relative===""||
    relative===".."||
    relative.startsWith(".."+path.sep)||
    path.isAbsolute(relative)
  )fail("ROLE_DEPLOYMENT_REVIEWED_RUNTIME_INPUT_PATH_ESCAPE");

  const pathStat=fs.lstatSync(candidate);
  if(
    !pathStat.isFile()||
    pathStat.isSymbolicLink()||
    pathStat.nlink!==1||
    pathStat.size<2||
    pathStat.size>MAX_INPUT_BYTES
  )fail("ROLE_DEPLOYMENT_REVIEWED_RUNTIME_INPUT_FILE_INVALID");

  const real=fs.realpathSync.native(candidate);
  if(real!==candidate)fail("ROLE_DEPLOYMENT_REVIEWED_RUNTIME_INPUT_ALIAS_FORBIDDEN");

  let fd;
  let before;
  let bytes;
  let after;
  try{
    fd=fs.openSync(
      candidate,
      fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
    );
    before=fs.fstatSync(fd);
    if(
      !before.isFile()||
      before.nlink!==1||
      before.dev!==pathStat.dev||
      before.ino!==pathStat.ino||
      before.size!==pathStat.size
    )fail("ROLE_DEPLOYMENT_REVIEWED_RUNTIME_INPUT_DESCRIPTOR_MISMATCH");
    bytes=fs.readFileSync(fd);
    after=fs.fstatSync(fd);
  }finally{
    if(fd!==undefined)fs.closeSync(fd);
  }

  const post=fs.lstatSync(candidate);
  if(
    bytes.length!==before.size||
    before.dev!==after.dev||
    before.ino!==after.ino||
    before.size!==after.size||
    before.mtimeMs!==after.mtimeMs||
    before.ctimeMs!==after.ctimeMs||
    post.dev!==before.dev||
    post.ino!==before.ino||
    post.size!==before.size||
    post.mtimeMs!==before.mtimeMs||
    post.ctimeMs!==before.ctimeMs
  )fail("ROLE_DEPLOYMENT_REVIEWED_RUNTIME_INPUT_CHANGED_DURING_READ");

  let value;
  try{
    value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  }catch{
    fail("ROLE_DEPLOYMENT_REVIEWED_RUNTIME_INPUT_JSON_INVALID");
  }
  return value;
}

function parseCli(){
  const args=process.argv.slice(2);
  if(
    args.length!==4||
    args[0]!=="--operation"||
    args[2]!=="--input"
  ){
    fail(
      "usage: --operation <reverify_control|derive_deployment> "+
      "--input <relative-input.json>",
    );
  }
  return Object.freeze({operation:args[1],input:args[3]});
}

function canonicalAddress(value,code){
  if(typeof value!=="string"||!ADDRESS.test(value))fail(code);
  return value;
}

function canonicalBytes32(value,code){
  if(typeof value!=="string"||!BYTES32.test(value))fail(code);
  return value;
}

function canonicalHex(value,code){
  if(typeof value!=="string"||!HEX.test(value))fail(code);
  return value;
}

const cli=parseCli();
let envelope;

try{
  const input=directInput(cli.input);
  let result;

  if(cli.operation==="reverify_control"){
    exactObject(
      input,
      ["evidence","now_unix"],
      "ROLE_DEPLOYMENT_REVIEWED_RUNTIME_CONTROL_INPUT_INVALID",
    );
    if(!Number.isSafeInteger(input.now_unix)||input.now_unix<=0){
      fail("ROLE_DEPLOYMENT_REVIEWED_RUNTIME_CONTROL_TIME_INVALID");
    }
    result=await reverifyVoidWcVoidLaunchControllerControlEvidenceV1({
      evidence:input.evidence,
      nowUnix:input.now_unix,
    });
  }else if(cli.operation==="derive_deployment"){
    exactObject(
      input,
      [
        "creation_hex",
        "void_token",
        "launch_controller",
        "settlement_executor",
        "closeout_controller",
        "coupled_launch_id_bytes32",
      ],
      "ROLE_DEPLOYMENT_REVIEWED_RUNTIME_DEPLOYMENT_INPUT_INVALID",
    );

    const creationHex=canonicalHex(
      input.creation_hex,
      "ROLE_DEPLOYMENT_REVIEWED_RUNTIME_CREATION_HEX_INVALID",
    );
    const values=[
      canonicalAddress(input.void_token,"ROLE_DEPLOYMENT_REVIEWED_RUNTIME_VOID_TOKEN_INVALID"),
      canonicalAddress(input.launch_controller,"ROLE_DEPLOYMENT_REVIEWED_RUNTIME_LAUNCH_CONTROLLER_INVALID"),
      canonicalAddress(input.settlement_executor,"ROLE_DEPLOYMENT_REVIEWED_RUNTIME_SETTLEMENT_EXECUTOR_INVALID"),
      canonicalAddress(input.closeout_controller,"ROLE_DEPLOYMENT_REVIEWED_RUNTIME_CLOSEOUT_CONTROLLER_INVALID"),
      canonicalBytes32(input.coupled_launch_id_bytes32,"ROLE_DEPLOYMENT_REVIEWED_RUNTIME_LAUNCH_ID_INVALID"),
    ];
    const types=["address","address","address","address","bytes32"];
    const encodedArgs=AbiCoder.defaultAbiCoder().encode(types,values);
    const deploymentDataHex=concat([creationHex,encodedArgs]);

    result={
      constructor_types:types,
      constructor_values:values,
      encoded_args_hex:encodedArgs,
      deployment_data_hex:deploymentDataHex,
      creation_bytecode_keccak256:keccak256(creationHex),
      deployment_data_keccak256:keccak256(deploymentDataHex),
    };
  }else{
    fail("ROLE_DEPLOYMENT_REVIEWED_RUNTIME_OPERATION_INVALID");
  }

  envelope={
    marker:VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_REVIEWED_RUNTIME_BRIDGE_V1,
    version:1,
    operation:cli.operation,
    ok:true,
    result,
    error:null,
  };
}catch(error){
  envelope={
    marker:VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_REVIEWED_RUNTIME_BRIDGE_V1,
    version:1,
    operation:cli.operation,
    ok:false,
    result:null,
    error:(error instanceof Error?error.message:String(error)).slice(0,512),
  };
}

process.stdout.write(JSON.stringify(envelope)+"\n");
