#!/usr/bin/env node
import crypto from "node:crypto";
import net from "node:net";

const MARKER="VOID_RAILWAY_P2P_INTRODUCER_LIVE_VERIFY_V1";
const TARGETS=[
  {label:"railway",host:"iriguchi.proxy.rlwy.net",port:58979},
  {label:"precision",host:"24.40.99.171",port:4700},
];
const MAX=64*1024, PROTO=2, DOMAIN="VOID_P2P_AUTHENTICATED_PEER_IDENTITY_V1";

function nodeId(pem){return crypto.createHash("sha256").update(pem).digest("hex").slice(0,32);}
function frame(msg){const b=Buffer.from(JSON.stringify(msg));const h=Buffer.alloc(4);h.writeUInt32BE(b.length);return Buffer.concat([h,b]);}
function transcript(v){return Buffer.from(JSON.stringify({domain:DOMAIN,challenge:v.challenge,self_challenge:v.self_challenge,id:v.id,listen:v.listen,proto:v.proto,pubkey:v.pubkey}));}
function exact(o,keys){return !!o&&typeof o==="object"&&!Array.isArray(o)&&JSON.stringify(Object.keys(o).sort())===JSON.stringify([...keys].sort());}
function hello(raw){
  if(!exact(raw,["type","id","listen","proto","pubkey","challenge"])||raw.type!=="HELLO") return null;
  if(!/^[0-9a-f]{32}$/.test(raw.id)||raw.proto!==PROTO||!/^[0-9a-f]{64}$/.test(raw.challenge)||!Array.isArray(raw.listen)) return null;
  let k;try{k=crypto.createPublicKey(raw.pubkey);}catch{return null;}
  const pem=k.export({type:"spki",format:"pem"}).toString();
  if(pem!==raw.pubkey||nodeId(pem)!==raw.id)return null;
  return {...raw,pubkey:pem};
}
function verifyAuth(raw,expected,remoteHello){
  if(!exact(raw,["type","id","listen","proto","pubkey","challenge","self_challenge","sig"])||raw.type!=="AUTH")return false;
  if(raw.challenge!==expected||raw.self_challenge!==remoteHello.challenge)return false;
  if(raw.id!==remoteHello.id||raw.proto!==remoteHello.proto||raw.pubkey!==remoteHello.pubkey||JSON.stringify(raw.listen)!==JSON.stringify(remoteHello.listen))return false;
  return /^[0-9a-f]{128}$/.test(raw.sig)&&crypto.verify(null,transcript(raw),crypto.createPublicKey(raw.pubkey),Buffer.from(raw.sig,"hex"));
}
async function probe(target){
  const kp=crypto.generateKeyPairSync("ed25519");
  const pub=kp.publicKey.export({type:"spki",format:"pem"}).toString();
  const id=nodeId(pub), localChallenge=crypto.randomBytes(32).toString("hex");
  return await new Promise((resolve,reject)=>{
    const socket=net.createConnection({host:target.host,port:target.port});
    let buf=Buffer.alloc(0),remoteHello=null,authed=false,peerAddrs=null;
    const timer=setTimeout(()=>finish(new Error(`${target.label} timeout`)),15000);
    function finish(err,val){clearTimeout(timer);socket.destroy();err?reject(err):resolve(val);}
    function send(m){socket.write(frame(m));}
    socket.on("connect",()=>send({type:"HELLO",id,listen:[],proto:PROTO,pubkey:pub,challenge:localChallenge}));
    socket.on("error",finish);
    socket.on("data",(chunk)=>{
      buf=Buffer.concat([buf,chunk]);
      while(buf.length>=4){
        const len=buf.readUInt32BE(0);if(len>MAX)return finish(new Error("oversized frame"));
        if(buf.length<4+len)return;
        const raw=JSON.parse(buf.subarray(4,4+len).toString("utf8"));buf=buf.subarray(4+len);
        if(raw.type==="HELLO"){
          remoteHello=hello(raw);if(!remoteHello)return finish(new Error("invalid HELLO"));
          const unsigned={challenge:remoteHello.challenge,self_challenge:localChallenge,id,listen:[],proto:PROTO,pubkey:pub};
          send({type:"AUTH",...unsigned,sig:crypto.sign(null,transcript(unsigned),kp.privateKey).toString("hex")});
        } else if(raw.type==="AUTH"){
          if(!remoteHello||!verifyAuth(raw,localChallenge,remoteHello))return finish(new Error("invalid AUTH"));
          authed=true;
        } else if(raw.type==="PEERS"&&authed){
          peerAddrs=Array.isArray(raw.addrs)?raw.addrs.map(String).sort():[];
          return finish(null,{label:target.label,node_id:remoteHello.id,listen:[...remoteHello.listen].sort(),peers:peerAddrs});
        }
      }
    });
  });
}
const results=[];
for(const t of TARGETS) results.push(await probe(t));
for(const r of results){
  console.log(`${r.label}_node_id=${r.node_id}`);
  console.log(`${r.label}_listen=${JSON.stringify(r.listen)}`);
  console.log(`${r.label}_peers=${JSON.stringify(r.peers)}`);
}
const railway=results.find(x=>x.label==="railway"), precision=results.find(x=>x.label==="precision");
if(railway.node_id!=="4f93300760f94834139babd2b54d2619")throw new Error("Railway node ID mismatch");
if(precision.node_id!=="9d89483769e469e0473b489dc50dba96")throw new Error("Precision node ID mismatch");
if(!railway.peers.includes("24.40.99.171:4700"))throw new Error("Railway did not advertise Precision");
if(!precision.peers.includes("iriguchi.proxy.rlwy.net:58979"))throw new Error("Precision did not advertise Railway");
console.log("mutual_peer_exchange=true");
console.log("independent_peer_identities=2");
console.log("wallet_authority=false");
console.log("transaction_authority=false");
console.log(`${MARKER}_GREEN`);
