#!/usr/bin/env node
import crypto from "node:crypto";
import net from "node:net";

const MARKER = "VOID_RAILWAY_P2P_INTRODUCER_V1";
const PROTO = 2;
const MAX_FRAME = 64 * 1024;
const AUTH_DOMAIN = "VOID_P2P_AUTHENTICATED_PEER_IDENTITY_V1";
const BIND_HOST = "0.0.0.0";
const BIND_PORT = Number(process.env.VOID_INTRODUCER_BIND_PORT || "4700");
const UPSTREAM = String(process.env.VOID_INTRODUCER_UPSTREAM || "24.40.99.171:4700");
const MAX_CONNECTIONS = 64;
const AUTH_TIMEOUT_MS = 5000;
const RECONNECT_MS = 5000;

function fail(message) {
  console.error(`${MARKER}_REFUSE: ${message}`);
  process.exit(2);
}
function boundedPort(value, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 65535) throw new Error(`${label} invalid`);
  return n;
}
function parseHostPort(raw, label) {
  const text = String(raw || "").trim();
  const m = /^([^:\s]+):(\d{1,5})$/.exec(text);
  if (!m) throw new Error(`${label} must be host:port`);
  return { host: m[1].toLowerCase(), port: boundedPort(m[2], label), text: `${m[1].toLowerCase()}:${Number(m[2])}` };
}
function canonicalPublicPem(key) {
  return crypto.createPublicKey(key).export({type:"spki",format:"pem"}).toString();
}
function privateKeyFromSeedHex(seedHex) {
  if (!/^[0-9a-f]{64}$/.test(seedHex)) throw new Error("VOID_INTRODUCER_KEY_SEED_HEX must be 32-byte lowercase hex");
  const prefix=Buffer.from("302e020100300506032b657004220420","hex");
  return crypto.createPrivateKey({key:Buffer.concat([prefix,Buffer.from(seedHex,"hex")]),format:"der",type:"pkcs8"});
}
function nodeIdFromPem(pem) {
  return crypto.createHash("sha256").update(pem).digest("hex").slice(0,32);
}
function challenge() {
  return crypto.randomBytes(32).toString("hex");
}
function transcript(value) {
  return Buffer.from(JSON.stringify({
    domain:AUTH_DOMAIN,
    challenge:value.challenge,
    self_challenge:value.self_challenge,
    id:value.id,
    listen:value.listen,
    proto:value.proto,
    pubkey:value.pubkey,
  }),"utf8");
}
function exactKeys(value, keys) {
  if (!value || typeof value!=="object" || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort());
}
function normalizeHello(raw) {
  if (!exactKeys(raw,["type","id","listen","proto","pubkey","challenge"]) || raw.type!=="HELLO") return null;
  if (!/^[0-9a-f]{32}$/.test(raw.id) || raw.proto!==PROTO || !/^[0-9a-f]{64}$/.test(raw.challenge)) return null;
  if (!Array.isArray(raw.listen) || raw.listen.length>32 || raw.listen.some(x=>typeof x!=="string" || x.length<3 || x.length>512 || /\s/.test(x))) return null;
  let pub;
  try { pub=crypto.createPublicKey(raw.pubkey); } catch { return null; }
  if (pub.asymmetricKeyType!=="ed25519") return null;
  const pem=pub.export({type:"spki",format:"pem"}).toString();
  if (pem!==raw.pubkey || nodeIdFromPem(pem)!==raw.id) return null;
  return {type:"HELLO",id:raw.id,listen:[...raw.listen],proto:raw.proto,pubkey:pem,challenge:raw.challenge};
}
function buildAuth(identity, remoteChallenge, selfChallenge, privateKey) {
  const body={challenge:remoteChallenge,self_challenge:selfChallenge,...identity};
  return {type:"AUTH",...body,sig:crypto.sign(null,transcript(body),privateKey).toString("hex")};
}
function verifyAuth(raw, expectedChallenge, hello) {
  if (!exactKeys(raw,["type","id","listen","proto","pubkey","challenge","self_challenge","sig"]) || raw.type!=="AUTH") return false;
  if (raw.challenge!==expectedChallenge || raw.self_challenge!==hello.challenge) return false;
  if (raw.id!==hello.id || raw.proto!==hello.proto || raw.pubkey!==hello.pubkey || JSON.stringify(raw.listen)!==JSON.stringify(hello.listen)) return false;
  if (!/^[0-9a-f]{128}$/.test(raw.sig)) return false;
  return crypto.verify(null,transcript({
    challenge:raw.challenge,self_challenge:raw.self_challenge,id:raw.id,listen:raw.listen,proto:raw.proto,pubkey:raw.pubkey
  }),crypto.createPublicKey(raw.pubkey),Buffer.from(raw.sig,"hex"));
}
function frame(message) {
  const body=Buffer.from(JSON.stringify(message),"utf8");
  if (body.length>MAX_FRAME) throw new Error("frame too large");
  const prefix=Buffer.alloc(4); prefix.writeUInt32BE(body.length);
  return Buffer.concat([prefix,body]);
}
function createFramer(onMessage,onBad) {
  let buffer=Buffer.alloc(0);
  return (chunk)=>{
    buffer=Buffer.concat([buffer,chunk],buffer.length+chunk.length);
    while(buffer.length>=4){
      const len=buffer.readUInt32BE(0);
      if(len>MAX_FRAME){ buffer=Buffer.alloc(0); onBad(new Error("frame too large")); return; }
      if(buffer.length<4+len) return;
      const body=buffer.subarray(4,4+len);
      buffer=buffer.subarray(4+len);
      try { onMessage(JSON.parse(body.toString("utf8"))); } catch(e){ onBad(e); return; }
    }
  };
}

const seed=String(process.env.VOID_INTRODUCER_KEY_SEED_HEX || "").trim();
const privateKey=privateKeyFromSeedHex(seed);
const publicPem=canonicalPublicPem(privateKey);
const nodeId=nodeIdFromPem(publicPem);
const proxyDomain=String(process.env.RAILWAY_TCP_PROXY_DOMAIN || "").trim().toLowerCase();
const proxyPort=String(process.env.RAILWAY_TCP_PROXY_PORT || "").trim();
const explicitAdvertise=String(process.env.VOID_INTRODUCER_ADVERTISE_ADDR || "").trim();
let advertise;
try {
  advertise=parseHostPort(explicitAdvertise || `${proxyDomain}:${proxyPort}`,"advertise address").text;
} catch (e) { fail(e.message); }
let upstream;
try { upstream=parseHostPort(UPSTREAM,"upstream"); } catch(e){ fail(e.message); }
if (!Number.isSafeInteger(BIND_PORT) || BIND_PORT<1 || BIND_PORT>65535) fail("bind port invalid");
if (advertise===upstream.text) fail("advertise address must differ from upstream");

const identity={id:nodeId,listen:[advertise],proto:PROTO,pubkey:publicPem};
const sockets=new Set();
let upstreamPeer=null;
let upstreamTimer=null;
let shuttingDown=false;

function send(socket,msg){ if(!socket.destroyed) socket.write(frame(msg)); }

function attach(socket,{outbound=false,label=""}={}){
  if(sockets.size>=MAX_CONNECTIONS){ socket.destroy(); return; }
  sockets.add(socket);
  socket.setNoDelay(true);
  socket.setKeepAlive(true,10000);
  const state={localChallenge:challenge(),remoteHello:null,authenticated:false,remoteId:null,outbound,label};
  const timer=setTimeout(()=>{ if(!state.authenticated) socket.destroy(new Error("authentication timeout")); },AUTH_TIMEOUT_MS);
  timer.unref?.();

  const close=()=>{
    clearTimeout(timer);
    sockets.delete(socket);
    if(upstreamPeer===socket){ upstreamPeer=null; scheduleUpstream(); }
  };
  socket.on("close",close);
  socket.on("error",()=>{});

  const feed=createFramer((msg)=>{
    if(msg?.type==="HELLO"){
      if(state.authenticated || state.remoteHello){ socket.destroy(new Error("duplicate HELLO")); return; }
      const hello=normalizeHello(msg);
      if(!hello || hello.id===nodeId){ socket.destroy(new Error("invalid HELLO")); return; }
      state.remoteHello=hello;
      send(socket,buildAuth(identity,hello.challenge,state.localChallenge,privateKey));
      return;
    }
    if(msg?.type==="AUTH"){
      if(state.authenticated || !state.remoteHello || !verifyAuth(msg,state.localChallenge,state.remoteHello)){
        socket.destroy(new Error("invalid AUTH")); return;
      }
      clearTimeout(timer);
      state.authenticated=true;
      state.remoteId=state.remoteHello.id;
      console.log(`peer_authenticated=${state.remoteId} direction=${outbound?"outbound":"inbound"} label=${label}`);
      send(socket,{type:"PEERS",addrs:[upstream.text,advertise]});
      return;
    }
    if(!state.authenticated) return;
    if(msg?.type==="PEERS") return;
    if(msg?.type==="SUB") return;
    if(msg?.type==="PUB") return;
  },()=>socket.destroy());
  socket.on("data",feed);

  send(socket,{type:"HELLO",...identity,challenge:state.localChallenge});
}

function scheduleUpstream(){
  if(shuttingDown || upstreamPeer || upstreamTimer) return;
  upstreamTimer=setTimeout(()=>{
    upstreamTimer=null;
    connectUpstream();
  },RECONNECT_MS);
  upstreamTimer.unref?.();
}
function connectUpstream(){
  if(shuttingDown || upstreamPeer) return;
  const socket=net.createConnection({host:upstream.host,port:upstream.port});
  upstreamPeer=socket;
  socket.once("connect",()=>attach(socket,{outbound:true,label:"precision"}));
  socket.once("error",()=>{ if(upstreamPeer===socket) upstreamPeer=null; scheduleUpstream(); });
  socket.once("close",()=>{ if(upstreamPeer===socket) upstreamPeer=null; scheduleUpstream(); });
}

const server=net.createServer((socket)=>attach(socket,{outbound:false,label:"public"}));
server.maxConnections=MAX_CONNECTIONS;
server.listen(BIND_PORT,BIND_HOST,()=>{
  console.log(MARKER);
  console.log(`node_id=${nodeId}`);
  console.log(`listen=${advertise}`);
  console.log(`upstream=${upstream.text}`);
  console.log("chain_state=false");
  console.log("wallet_authority=false");
  console.log("signer_authority=false");
  console.log("validator_authority=false");
  console.log("work_credit_authority=false");
  console.log("transaction_signing=false");
  console.log("transaction_broadcast=false");
  console.log("funds_movement=false");
  console.log(`${MARKER}_GREEN`);
  connectUpstream();
});

function shutdown(){
  if(shuttingDown) return;
  shuttingDown=true;
  if(upstreamTimer) clearTimeout(upstreamTimer);
  for(const socket of sockets) socket.destroy();
  server.close(()=>process.exit(0));
  setTimeout(()=>process.exit(0),2000).unref();
}
process.on("SIGTERM",shutdown);
process.on("SIGINT",shutdown);
