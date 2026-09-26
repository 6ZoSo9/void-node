#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";
import { Interface, getAddress, id } from "ethers";

export const VOID_ECONOMIC_EVM_FINAL_VALUE_CENSUS_V1 =
  "VOID_ECONOMIC_EVM_FINAL_VALUE_CENSUS_V1";

export const VOID_ECONOMIC_EVM_FINAL_VALUE_CENSUS_AUTHORITY_V1 = Object.freeze({
  chain_id: "2050",
  loopback_http_only: true,
  fixed_block_observation: true,
  read_only_rpc_methods: Object.freeze([
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getLogs",
    "eth_getCode",
    "eth_call",
  ]),
  credential_access: false,
  wallet_access: false,
  private_key_access: false,
  filesystem_write: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain_write: false,
  token_movement: false,
  money_movement: false,
});

const TOKEN = new Interface([
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
]);
const PRESALE = new Interface([
  "function voidToken() view returns (address)",
  "function remainingInventoryAtoms() view returns (uint256)",
  "function totalFulfilledAtoms() view returns (uint256)",
  "function maxInventoryAtoms() view returns (uint256)",
]);
const TRANSFER_TOPIC = id("Transfer(address,address,uint256)").toLowerCase();
const ZERO = "0x0000000000000000000000000000000000000000";
const ADDRESS = /^0x[0-9a-f]{40}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const HEX = /^0x(?:[0-9a-f]{2})*$/i;
const QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;

function text(value) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function address(value) {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const out = getAddress(raw).toLowerCase();
    return ADDRESS.test(out) ? out : "";
  } catch {
    return "";
  }
}
function quantity(value) {
  const raw = text(value);
  if (!QUANTITY.test(raw)) return null;
  try { return BigInt(raw); } catch { return null; }
}
function bytes(value) {
  const raw = text(value).toLowerCase();
  return HEX.test(raw) ? raw : "";
}
function hash(value) {
  const raw = text(value).toLowerCase();
  return HASH.test(raw) ? raw : "";
}
function fromTopic(topic) {
  const raw = text(topic).toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(raw)) return "";
  return address("0x" + raw.slice(-40));
}
function normalizeRpc(input) {
  let url;
  try { url = new URL(text(input?.rpc_url)); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^\[/,"").replace(/\]$/,"");
  const hostname = host === "127.0.0.1" ? "127.0.0.1" : host === "::1" ? "::1" : null;
  const port = Number(url.port || 0);
  if (!hostname || url.protocol !== "http:" || url.username || url.password ||
      url.search || url.hash || !Number.isInteger(port) || port <= 0 || port > 65535) {
    return null;
  }
  return {
    hostname,
    port,
    path: url.pathname || "/",
    fingerprint_sha256: sha256(url.toString()),
  };
}
function createTransport(policy) {
  let next = 0;
  return async ({method,params}) => {
    const body = JSON.stringify({jsonrpc:"2.0",id:++next,method,params});
    return await new Promise((resolve,reject) => {
      const req = http.request({
        protocol:"http:", hostname:policy.hostname, port:policy.port,
        path:policy.path, method:"POST", agent:false,
        headers:{"content-type":"application/json","content-length":Buffer.byteLength(body),"connection":"close"},
      }, (res) => {
        const chunks=[]; let total=0;
        res.on("data",(chunk)=>{
          total += chunk.length;
          if (total > 8*1024*1024) req.destroy(new Error("response_too_large"));
          else chunks.push(chunk);
        });
        res.on("end",()=>{
          if (res.statusCode !== 200) return reject(new Error("http_status_invalid"));
          let payload;
          try { payload=JSON.parse(Buffer.concat(chunks).toString("utf8")); }
          catch { return reject(new Error("rpc_json_invalid")); }
          if (!payload || payload.jsonrpc!=="2.0" || payload.error ||
              !Object.prototype.hasOwnProperty.call(payload,"result")) {
            return reject(new Error("rpc_envelope_invalid"));
          }
          resolve(payload.result);
        });
      });
      req.setTimeout(10000,()=>req.destroy(new Error("rpc_timeout")));
      req.on("error",reject);
      req.end(body);
    });
  };
}
function decodeUint(iface, fn, raw) {
  const data=bytes(raw);
  if (!data) throw new Error("invalid_call_result:"+fn);
  return BigInt(iface.decodeFunctionResult(fn,data)[0]);
}
function decodeAddress(iface, fn, raw) {
  const data=bytes(raw);
  if (!data) throw new Error("invalid_call_result:"+fn);
  const out=address(iface.decodeFunctionResult(fn,data)[0]);
  if (!out) throw new Error("invalid_address_result:"+fn);
  return out;
}
function held(reason, methods=[], detail={}) {
  return {
    ok:false, status:"HOLD", marker:VOID_ECONOMIC_EVM_FINAL_VALUE_CENSUS_V1,
    reason, rpc_methods_used:methods, detail,
    credential_access_performed:false, wallet_access_performed:false,
    private_key_access_performed:false, filesystem_write_performed:false,
    transaction_constructed:false, transaction_signed:false,
    transaction_broadcast:false, chain_write_performed:false,
    token_movement_performed:false, money_movement_performed:false,
  };
}

export async function observeVoidEconomicEvmFinalValueCensusV1(input) {
  const rpc = normalizeRpc(input);
  const token = address(input?.void_token_address);
  const presale = address(input?.presale_contract_address);
  const chunkSize = Number(input?.log_chunk_size || 2000);
  if (!rpc || !token || !Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 10000) {
    return held("input_invalid");
  }
  const methods=[];
  const transport=input?.transport || createTransport(rpc);
  const call=async(method,params)=>{methods.push(method); return await transport({method,params});};

  try {
    if (quantity(await call("eth_chainId",[])) !== 2050n) return held("chain_id_mismatch",methods);
    const head=quantity(await call("eth_blockNumber",[]));
    if (head === null) return held("head_invalid",methods);
    const tag="0x"+head.toString(16);
    const block=await call("eth_getBlockByNumber",[tag,false]);
    const blockHash=hash(block?.hash);
    if (!blockHash || quantity(block?.number)!==head) return held("block_invalid",methods);

    const tokenCode=bytes(await call("eth_getCode",[token,tag]));
    if (!tokenCode || tokenCode==="0x") return held("voidtoken_code_missing",methods);
    const tokenRuntimeSha256=sha256(Buffer.from(tokenCode.slice(2),"hex"));

    const holders=new Set();
    let transferLogCount=0;
    for (let start=0n; start<=head; start+=BigInt(chunkSize)) {
      const end = start + BigInt(chunkSize-1) > head ? head : start + BigInt(chunkSize-1);
      const logs=await call("eth_getLogs",[{
        address:token,
        fromBlock:"0x"+start.toString(16),
        toBlock:"0x"+end.toString(16),
        topics:[TRANSFER_TOPIC],
      }]);
      if (!Array.isArray(logs)) return held("transfer_logs_invalid",methods);
      for (const log of logs) {
        if (hash(log?.blockHash)==="" || !Array.isArray(log?.topics) || log.topics.length < 3) {
          return held("transfer_log_shape_invalid",methods);
        }
        const from=fromTopic(log.topics[1]);
        const to=fromTopic(log.topics[2]);
        if (!from || !to) return held("transfer_log_address_invalid",methods);
        if (from !== ZERO) holders.add(from);
        if (to !== ZERO) holders.add(to);
        transferLogCount += 1;
      }
    }

    const ethCall=async(to,data)=>await call("eth_call",[{to,data},tag]);
    const totalSupply=decodeUint(TOKEN,"totalSupply",await ethCall(token,TOKEN.encodeFunctionData("totalSupply")));

    const nonzero=[];
    let holderSum=0n;
    for (const holder of [...holders].sort()) {
      const balance=decodeUint(TOKEN,"balanceOf",await ethCall(token,TOKEN.encodeFunctionData("balanceOf",[holder])));
      if (balance === 0n) continue;
      const code=bytes(await call("eth_getCode",[holder,tag]));
      if (!code) return held("holder_code_invalid",methods,{holder});
      const isContract=code!=="0x";
      const row={
        address:holder,
        balance_atoms:balance.toString(),
        account_kind:isContract ? "contract" : "eoa",
        runtime_code_sha256:isContract ? sha256(Buffer.from(code.slice(2),"hex")) : null,
      };
      nonzero.push(row);
      holderSum += balance;
    }

    const contractHolders=nonzero.filter((row)=>row.account_kind==="contract");
    let presaleObservation=null;
    if (presale) {
      const code=bytes(await call("eth_getCode",[presale,tag]));
      if (!code || code==="0x") return held("presale_code_missing",methods);
      const presaleToken=decodeAddress(PRESALE,"voidToken",await ethCall(presale,PRESALE.encodeFunctionData("voidToken")));
      if (presaleToken !== token) return held("presale_voidtoken_mismatch",methods);
      const remaining=decodeUint(PRESALE,"remainingInventoryAtoms",await ethCall(presale,PRESALE.encodeFunctionData("remainingInventoryAtoms")));
      const fulfilled=decodeUint(PRESALE,"totalFulfilledAtoms",await ethCall(presale,PRESALE.encodeFunctionData("totalFulfilledAtoms")));
      const maxInventory=decodeUint(PRESALE,"maxInventoryAtoms",await ethCall(presale,PRESALE.encodeFunctionData("maxInventoryAtoms")));
      const balance=decodeUint(TOKEN,"balanceOf",await ethCall(token,TOKEN.encodeFunctionData("balanceOf",[presale])));
      presaleObservation={
        address:presale,
        runtime_code_sha256:sha256(Buffer.from(code.slice(2),"hex")),
        token_balance_atoms:balance.toString(),
        remaining_inventory_atoms:remaining.toString(),
        total_fulfilled_atoms:fulfilled.toString(),
        max_inventory_atoms:maxInventory.toString(),
        accounting_identity_holds: remaining + fulfilled === maxInventory,
        token_balance_covers_remaining: balance >= remaining,
      };
    }

    const blockAgain=await call("eth_getBlockByNumber",[tag,false]);
    if (hash(blockAgain?.hash)!==blockHash) return held("fixed_block_revalidation_failed",methods);

    const supplyConserved=holderSum===totalSupply;
    return {
      ok:supplyConserved,
      status:supplyConserved ? "READ_ONLY_CENSUS_GREEN" : "HOLD",
      marker:VOID_ECONOMIC_EVM_FINAL_VALUE_CENSUS_V1,
      version:1,
      observation:{
        chain_id:"2050",
        block_number:head.toString(),
        block_hash:blockHash,
        void_token:token,
        void_token_runtime_sha256:tokenRuntimeSha256,
        transfer_log_count:transferLogCount,
        discovered_holder_address_count:holders.size,
        nonzero_holder_count:nonzero.length,
        nonzero_holders:nonzero,
        contract_holders:contractHolders,
        total_supply_atoms:totalSupply.toString(),
        holder_balance_sum_atoms:holderSum.toString(),
        holder_sum_matches_total_supply:supplyConserved,
        presale:presaleObservation,
      },
      rpc_methods_used:methods,
      read_only_observation_complete:true,
      credential_access_performed:false,
      wallet_access_performed:false,
      private_key_access_performed:false,
      filesystem_write_performed:false,
      transaction_constructed:false,
      transaction_signed:false,
      transaction_broadcast:false,
      chain_write_performed:false,
      token_movement_performed:false,
      money_movement_performed:false,
    };
  } catch (error) {
    return held("rpc_observation_failed",methods,{message:text(error?.message||error).slice(0,240)});
  }
}
