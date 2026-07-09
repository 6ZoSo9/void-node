"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
exports.globalEnqueueTx = globalEnqueueTx;
var fs = require("node:fs");
var path = require("node:path");
var net = require("node:net");
var crypto = require("node:crypto");
var mempool_js_1 = require("./chain/mempool.js");
var block_js_1 = require("./chain/block.js");
var cid_js_1 = require("./util/cid.js");
var files_js_1 = require("./util/files.js");
var seg_store_js_1 = require("./chain/seg_store.js");
var txindex_js_1 = require("./chain/txindex.js");
var receipts_js_1 = require("./chain/receipts.js");
var kidx_js_1 = require("./util/kidx.js");
/** ---------- signing helpers (Node built-in ed25519) ---------- */
function signBytes(priv, bytes) {
    return crypto.sign(null, Buffer.from(bytes), priv).toString("hex");
}
function verifyBytes(pub, bytes, sigHex) {
    try {
        return crypto.verify(null, Buffer.from(bytes), pub, Buffer.from(sigHex, "hex"));
    }
    catch (_a) {
        return false;
    }
}
function safeImportPublicKey(pem) {
    try {
        return crypto.createPublicKey(pem);
    }
    catch (_a) {
        return null;
    }
}
function bytesToSign(topic, data, nonce) {
    return Buffer.from(JSON.stringify({ topic: topic, data: data, nonce: nonce }));
}
/** ---------- wire / pubsub ---------- */
var MAX_MSG_BYTES = 64 * 1024;
var PROTO_VER = 1;
function encode(m) {
    var body = Buffer.from(JSON.stringify(m));
    var len = Buffer.alloc(4);
    len.writeUInt32BE(body.length, 0);
    return Buffer.concat([len, body]);
}
var Framer = /** @class */ (function () {
    function Framer(onMsg, onBad) {
        this.onMsg = onMsg;
        this.onBad = onBad;
        this.buf = Buffer.alloc(0);
    }
    Framer.prototype.feed = function (chunk) {
        var _a, _b;
        this.buf = Buffer.concat([this.buf, chunk]);
        while (this.buf.length >= 4) {
            var len = this.buf.readUInt32BE(0);
            if (len > MAX_MSG_BYTES) {
                (_a = this.onBad) === null || _a === void 0 ? void 0 : _a.call(this, new Error("frame too large: ".concat(len)));
                this.buf = Buffer.alloc(0);
                return;
            }
            if (this.buf.length < 4 + len)
                break;
            var body = this.buf.subarray(4, 4 + len);
            this.buf = this.buf.subarray(4 + len);
            try {
                this.onMsg(JSON.parse(body.toString("utf8")));
            }
            catch (e) {
                (_b = this.onBad) === null || _b === void 0 ? void 0 : _b.call(this, e);
            }
        }
    };
    return Framer;
}());
var PubSub = /** @class */ (function () {
    function PubSub() {
        this.subs = new Map();
    }
    PubSub.prototype.subscribe = function (peerId, topic) {
        if (!this.subs.has(topic))
            this.subs.set(topic, new Set());
        this.subs.get(topic).add(peerId);
    };
    PubSub.prototype.subscribers = function (topic) {
        var _a;
        return (_a = this.subs.get(topic)) !== null && _a !== void 0 ? _a : new Set();
    };
    return PubSub;
}());
var Node = /** @class */ (function () {
    // Single canonical constructor: sets keys and honors opts.allowEmptyBlocks
    function Node(tcpPort, kp, opts) {
        var _this = this;
        this.tcpPort = tcpPort;
        this.listenAddrs = [];
        this.peers = new Map();
        this.pubsub = new PubSub();
        this.baseDir = process.env.DATA_DIR || "data";
        this.txIndex = new txindex_js_1.TxIndex(path.join(this.baseDir, "index"));
        this.receipts = new receipts_js_1.ReceiptsStore(path.join(this.baseDir, "receipts"), { shardSpan: 10000 });
        this.seen = new Set(); // pubsub message (topic:nonce) dedupe
        this.seenTimestamps = new Map();
        this.SEEN_TTL_MS = 5 * 60000;
        this.txSeen = new Map(); // tx hash -> firstSeenMs (TTL GC below)
        this.TX_TTL_MS = 30 * 60000;
        this.dialing = new Set();
        this.knownAddrs = new Set();
        this.backoff = new Map();
        this.MIN_BACKOFF = 500;
        this.MAX_BACKOFF = 15000;
        this.myTopics = new Set();
        // --- blob replication state ---
        this.peerHttp = new Map(); // nodeId -> http base
        this.blobFetchQ = [];
        this.blobFetchRunning = false;
        this.store = new seg_store_js_1.SegStore(process.env.DATA_DIR || "data", {
            segmentMaxBytes: 128 * 1024 * 1024,
            sparseEvery: 512,
        });
        this.mempool = new mempool_js_1.Mempool();
        this.proposerTimer = null;
        this.blobsDir = path.join(this.baseDir, "blobs");
        this.allowEmptyBlocks = false;
        this.server = net.createServer(function (sock) { return _this.onIncoming(sock); });
        this.id = kp.nodeId;
        this.priv = kp.privateKey;
        this.pub = kp.publicKey;
        this.pubPEM = kp.pubPEM;
        this.allowEmptyBlocks = !!(opts === null || opts === void 0 ? void 0 : opts.allowEmptyBlocks);
        (0, files_js_1.ensureDir)(this.blobsDir);
    }
    /** Rebuild compact tx index from blocks. */
    Node.prototype.rebuildTxIndex = function () {
        return __awaiter(this, void 0, void 0, function () {
            var idxDir, head, indexed, BATCH, batch, n, b, i, tx;
            var _a;
            return __generator(this, function (_b) {
                idxDir = path.join(this.baseDir, "index");
                if (fs.existsSync(idxDir))
                    fs.rmSync(idxDir, { recursive: true, force: true });
                fs.mkdirSync(idxDir, { recursive: true });
                head = this.store.loadHeadNumber();
                indexed = 0;
                BATCH = 2000;
                batch = [];
                for (n = 0; n <= head; n++) {
                    b = this.store.loadBlock(n);
                    if (!((_a = b === null || b === void 0 ? void 0 : b.txs) === null || _a === void 0 ? void 0 : _a.length))
                        continue;
                    for (i = 0; i < b.txs.length; i++) {
                        tx = b.txs[i];
                        if (tx === null || tx === void 0 ? void 0 : tx.hash) {
                            batch.push({ h: tx.hash.toLowerCase(), n: n, o: i });
                            indexed++;
                            if (batch.length >= BATCH) {
                                this.txIndex.putMany(batch);
                                batch = [];
                            }
                        }
                    }
                }
                if (batch.length)
                    this.txIndex.putMany(batch);
                return [2 /*return*/, { ok: true, blocks: head + 1, indexed: indexed }];
            });
        });
    };
    /** lifecycle */
    Node.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var addr;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // bind to loopback by default to avoid accidental multi-binding conflicts
                    return [4 /*yield*/, new Promise(function (resolve) { return _this.server.listen(_this.tcpPort, "127.0.0.1", resolve); })];
                    case 1:
                        // bind to loopback by default to avoid accidental multi-binding conflicts
                        _c.sent();
                        addr = "127.0.0.1:".concat(this.server.address().port);
                        this.listenAddrs.push(addr);
                        this.knownAddrs.add(addr);
                        console.log("[void-node] started TCP on ".concat(addr, ", id=").concat(this.id));
                        // Default topic subscriptions used across the stack
                        this.subscribe("void/tx");
                        this.subscribe("void/http");
                        this.subscribe("void/blob.announce");
                        this.subscribe("void/block");
                        // GC dedup tables
                        (_b = (_a = setInterval(function () {
                            var now = Date.now();
                            for (var _i = 0, _a = _this.seenTimestamps; _i < _a.length; _i++) {
                                var _b = _a[_i], k = _b[0], ts = _b[1];
                                if (now - ts > _this.SEEN_TTL_MS) {
                                    _this.seenTimestamps.delete(k);
                                    _this.seen.delete(k);
                                }
                            }
                            for (var _c = 0, _d = _this.txSeen; _c < _d.length; _c++) {
                                var _e = _d[_c], h = _e[0], ts = _e[1];
                                if (now - ts > _this.TX_TTL_MS)
                                    _this.txSeen.delete(h);
                            }
                        }, 30000)).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
                        return [2 /*return*/];
                }
            });
        });
    };
    Node.prototype.stop = function () {
        for (var _i = 0, _a = this.peers.values(); _i < _a.length; _i++) {
            var p = _a[_i];
            p.socket.destroy();
        }
        this.server.close();
    };
    /** sockets */
    Node.prototype.onIncoming = function (socket) {
        var peerAddr = "".concat(socket.remoteAddress, ":").concat(socket.remotePort);
        this.attachSocket(socket, peerAddr, false);
    };
    Node.prototype.attachSocket = function (socket, peerAddr, outgoing) {
        var _this = this;
        var peerId = "?-".concat(crypto.randomBytes(4).toString("hex"));
        var framer = new Framer(function (msg) { return _this.onMsg(peerId, msg); }, function (e) {
            console.warn("[wire] bad message from ".concat(peerId, " (").concat(peerAddr, "):"), e.message);
        });
        socket.on("data", function (chunk) { return framer.feed(chunk); });
        socket.on("close", function () {
            _this.peers.delete(peerId);
        });
        socket.on("error", function (e) {
            console.warn("[peer] error ".concat(peerId, " (").concat(peerAddr, "):"), e.message);
        });
        var peer = {
            id: peerId,
            socket: socket,
            framer: framer,
            addr: peerAddr,
            listens: [],
            outbound: outgoing,
            handshakeDone: false,
        };
        this.peers.set(peerId, peer);
        this.sendRaw(peer, { type: "HELLO", id: this.id, listen: this.listenAddrs, proto: PROTO_VER, pubkey: this.pubPEM });
    };
    Node.prototype.onMsg = function (tempOrRealId, msg) {
        var _a, _b;
        if (msg.type === "HELLO") {
            var ent = __spreadArray([], this.peers.entries(), true).find(function (_a) {
                var k = _a[0];
                return k === tempOrRealId || k.startsWith("?-");
            });
            if (!ent)
                return;
            var tmpKey = ent[0], p = ent[1];
            var existing = this.peers.get(msg.id);
            if (existing) {
                if (existing.outbound && !p.outbound) {
                    p.socket.destroy();
                    this.peers.delete(tmpKey);
                    return;
                }
                else {
                    existing.socket.destroy();
                    this.peers.delete(msg.id);
                }
            }
            this.peers.delete(tmpKey);
            p.id = msg.id;
            p.handshakeDone = true;
            p.listens = Array.isArray(msg.listen) ? msg.listen : [];
            this.peers.set(p.id, p);
            console.log("[peer] HELLO -> ".concat(p.id, " @ ").concat(p.addr, " (they listen: ").concat(p.listens.join(",") || "n/a", ")"));
            // Heuristic: infer their HTTP base from first p2p listen like 127.0.0.1:4701 -> http://127.0.0.1:4101
            var firstListen = p.listens[0];
            var httpFromP2P = function (addr) {
                if (!addr)
                    return undefined;
                var m = addr.match(/^([^:]+):(\d+)$/);
                if (!m)
                    return undefined;
                var host = m[1], port = Number(m[2]);
                if (port >= 4700 && port <= 4799)
                    return "http://".concat(host, ":").concat(4100 + (port - 4700));
                return undefined;
            };
            var inferredHttp = httpFromP2P(firstListen);
            if (inferredHttp) {
                this.peerHttp.set(p.id, inferredHttp);
                if (p.id !== this.id)
                    (_a = this.onHttpAnnounce) === null || _a === void 0 ? void 0 : _a.call(this, { id: p.id, http: inferredHttp, p2p: firstListen });
            }
            // Merge peerset and send back PEERS + our current topic subs
            for (var _i = 0, _c = p.listens; _i < _c.length; _i++) {
                var a = _c[_i];
                this.knownAddrs.add(a);
            }
            var addrs = new Set();
            for (var _d = 0, _e = this.peers.values(); _d < _e.length; _d++) {
                var pp = _e[_d];
                for (var _f = 0, _g = pp.listens; _f < _g.length; _f++) {
                    var a = _g[_f];
                    addrs.add(a);
                }
            }
            for (var _h = 0, _j = this.listenAddrs; _h < _j.length; _h++) {
                var a = _j[_h];
                addrs.add(a);
            }
            this.sendRaw(p, { type: "PEERS", addrs: __spreadArray([], addrs, true) });
            for (var _k = 0, _l = this.myTopics; _k < _l.length; _k++) {
                var t = _l[_k];
                this.sendRaw(p, { type: "SUB", topic: t });
            }
            return;
        }
        if (msg.type === "PEERS") {
            for (var _m = 0, _o = msg.addrs; _m < _o.length; _m++) {
                var a = _o[_m];
                if (!this.isSelfAddress(a))
                    this.knownAddrs.add(a);
            }
            for (var _p = 0, _q = msg.addrs; _p < _q.length; _p++) {
                var a = _q[_p];
                if (this.shouldDial(a))
                    this.connect(a);
            }
            return;
        }
        if (msg.type === "SUB") {
            if (!this.isKnownPeer(tempOrRealId))
                return;
            this.pubsub.subscribe(tempOrRealId, msg.topic);
            return;
        }
        if (msg.type === "PUB") {
            var key = "".concat(msg.topic, ":").concat(msg.nonce);
            if (this.seen.has(key))
                return;
            var pub = safeImportPublicKey(msg.pubkey);
            if (!pub)
                return;
            var bytes = bytesToSign(msg.topic, msg.data, msg.nonce);
            if (!verifyBytes(pub, bytes, msg.sig))
                return;
            this.seen.add(key);
            this.seenTimestamps.set(key, Date.now());
            if (this.pubsub.subscribers(msg.topic).has(this.id)) {
                try {
                    if (msg.topic === "void/tx") {
                        var tx = JSON.parse(msg.data);
                        this.acceptTx(tx);
                    }
                    else if (msg.topic === "void/http") {
                        var info = JSON.parse(msg.data);
                        var pid = String((info === null || info === void 0 ? void 0 : info.id) || "").trim();
                        var http = String((info === null || info === void 0 ? void 0 : info.http) || "").trim();
                        if (pid && /^https?:\/\/.+/.test(http)) {
                            var base = http.replace(/\/+$/, "");
                            this.peerHttp.set(pid, base);
                            if (pid !== this.id)
                                (_b = this.onHttpAnnounce) === null || _b === void 0 ? void 0 : _b.call(this, { id: pid, http: base });
                        }
                    }
                    else if (msg.topic === "void/blob.announce") {
                        var ann = JSON.parse(msg.data);
                        var cid = String((ann === null || ann === void 0 ? void 0 : ann.cid) || "").trim();
                        if (cid && !this.getBlob(cid)) {
                            var providers = __spreadArray([], this.peerHttp.values(), true);
                            if (providers.length)
                                this.enqueueBlobFetch(cid, providers);
                        }
                    }
                    else if (msg.topic === "void/block") {
                        var hdr = JSON.parse(msg.data);
                        var num = Number(hdr === null || hdr === void 0 ? void 0 : hdr.number);
                        if (Number.isFinite(num)) {
                            var already = this.store.loadBlock(num);
                            if (!already) {
                                this.store.saveBlock({
                                    number: num,
                                    parentHash: String(hdr.parentHash || "").padStart(64, "0"),
                                    txRoot: String(hdr.txRoot || "").toLowerCase(),
                                    blobRoot: String(hdr.blobRoot || "").toLowerCase(),
                                    txs: [],
                                    blobs: [],
                                    proposer: String(hdr.proposer || this.id),
                                    sig: String(hdr.sig || ""),
                                    timestamp: Number.isFinite(hdr === null || hdr === void 0 ? void 0 : hdr.timestamp) ? Number(hdr.timestamp) : Date.now(),
                                });
                            }
                        }
                    }
                    else {
                        // other topics: ignore for now
                    }
                }
                catch (_r) {
                    /* ignore bad payloads */
                }
            }
            // fan-out to other subscribers
            for (var _s = 0, _t = this.peers.values(); _s < _t.length; _s++) {
                var p = _t[_s];
                if (p.id === tempOrRealId)
                    continue;
                if (this.pubsub.subscribers(msg.topic).has(p.id))
                    this.sendRaw(p, msg);
            }
            return;
        }
    };
    /** canonical tx intake (validation + dedupe) */
    Node.prototype.acceptTx = function (raw) {
        var _a, _b, _c;
        if (!raw || typeof raw !== "object")
            return false;
        var h = String(raw.hash || "").toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(h))
            return false;
        if (this.txSeen.has(h))
            return false; // de-dupe globally
        var tx = { hash: h, body: (_a = raw.body) !== null && _a !== void 0 ? _a : {} };
        this.txSeen.set(h, Date.now());
        try {
            (_c = (_b = this.mempool).push) === null || _c === void 0 ? void 0 : _c.call(_b, tx);
        }
        catch (_d) { }
        return true;
    };
    Node.prototype.sendRaw = function (peer, msg) {
        try {
            peer.socket.write(encode(msg));
        }
        catch (_a) { }
    };
    Node.prototype.isKnownPeer = function (id) {
        return this.peers.has(id) && !id.startsWith("?-");
    };
    Node.prototype.isSelfAddress = function (addr) {
        return this.listenAddrs.includes(addr);
    };
    Node.prototype.shouldDial = function (addr) {
        if (this.isSelfAddress(addr))
            return false;
        if (this.dialing.has(addr))
            return false;
        for (var _i = 0, _a = this.peers.values(); _i < _a.length; _i++) {
            var p = _a[_i];
            if (p.listens.includes(addr))
                return false;
        }
        return true;
    };
    Node.prototype.connect = function (addr) {
        var _this = this;
        if (!this.shouldDial(addr))
            return;
        this.dialing.add(addr);
        var _a = addr.split(":"), host = _a[0], portStr = _a[1];
        var port = Number(portStr);
        if (!host || !port) {
            this.dialing.delete(addr);
            return;
        }
        var socket = net.createConnection({ host: host, port: port }, function () {
            console.log("[dial] connected ".concat(addr));
            _this.backoff.delete(addr);
            _this.attachSocket(socket, addr, true);
            _this.dialing.delete(addr);
        });
        socket.on("error", function (e) {
            var _a;
            console.warn("[dial] failed ".concat(addr, ":"), e.message);
            _this.dialing.delete(addr);
            socket.destroy();
            var cur = (_a = _this.backoff.get(addr)) !== null && _a !== void 0 ? _a : _this.MIN_BACKOFF;
            var nxt = Math.min(cur * 2, _this.MAX_BACKOFF);
            _this.backoff.set(addr, nxt);
            setTimeout(function () { return _this.connect(addr); }, cur);
        });
    };
    /** pubsub facade */
    Node.prototype.subscribe = function (topic) {
        this.myTopics.add(topic);
        this.pubsub.subscribe(this.id, topic);
        for (var _i = 0, _a = this.peers.values(); _i < _a.length; _i++) {
            var p = _a[_i];
            this.sendRaw(p, { type: "SUB", topic: topic });
        }
    };
    Node.prototype.publishString = function (topic, data) {
        var nonce = crypto.randomBytes(8).toString("hex");
        var bytes = bytesToSign(topic, data, nonce);
        var sig = signBytes(this.priv, bytes);
        var msg = { type: "PUB", topic: topic, data: data, from: this.id, nonce: nonce, sig: sig, pubkey: this.pubPEM };
        for (var _i = 0, _a = this.peers.values(); _i < _a.length; _i++) {
            var p = _a[_i];
            if (this.pubsub.subscribers(topic).has(p.id))
                this.sendRaw(p, msg);
        }
        if (this.pubsub.subscribers(topic).has(this.id)) {
            var key = "".concat(topic, ":").concat(nonce);
            this.seen.add(key);
            this.seenTimestamps.set(key, Date.now());
        }
    };
    Node.prototype.publishJson = function (topic, obj) {
        this.publishString(topic, JSON.stringify(obj));
    };
    /** --------- blob replication --------- */
    Node.prototype.enqueueBlobFetch = function (cid, providers) {
        if (this.blobFetchQ.some(function (q) { return q.cid === cid; }))
            return;
        this.blobFetchQ.push({ cid: cid, providers: providers.slice(0, 8), enqueuedAt: Date.now() });
        if (!this.blobFetchRunning) {
            this.blobFetchRunning = true;
            void this.blobFetchLoop();
        }
    };
    Node.prototype.blobFetchLoop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var backoff, MIN_MS, MAX_MS, fetchWithTimeout, tryFetchBlob, _loop_1, this_1;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        backoff = new Map();
                        MIN_MS = 1500;
                        MAX_MS = 20000;
                        fetchWithTimeout = function (url_1) {
                            var args_1 = [];
                            for (var _i = 1; _i < arguments.length; _i++) {
                                args_1[_i - 1] = arguments[_i];
                            }
                            return __awaiter(_this, __spreadArray([url_1], args_1, true), void 0, function (url, ms) {
                                var ctrl, t;
                                if (ms === void 0) { ms = 7000; }
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            ctrl = new AbortController();
                                            t = setTimeout(function () { return ctrl.abort(); }, ms);
                                            _a.label = 1;
                                        case 1:
                                            _a.trys.push([1, , 3, 4]);
                                            return [4 /*yield*/, fetch(url, { signal: ctrl.signal, headers: { "user-agent": "void-node/1 blob-fetch" } })];
                                        case 2: return [2 /*return*/, _a.sent()];
                                        case 3:
                                            clearTimeout(t);
                                            return [7 /*endfinally*/];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            });
                        };
                        tryFetchBlob = function (base, cid) { return __awaiter(_this, void 0, void 0, function () {
                            var candidates, _i, candidates_1, url, r, ctype, j, buf, _a, _b, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        candidates = [
                                            "".concat(base, "/blob/").concat(cid), // raw bytes (preferred by our code)
                                            "".concat(base, "/blob/raw/").concat(cid), // alt
                                            "".concat(base, "/blob/get/").concat(cid),
                                        ];
                                        _i = 0, candidates_1 = candidates;
                                        _d.label = 1;
                                    case 1:
                                        if (!(_i < candidates_1.length)) return [3 /*break*/, 9];
                                        url = candidates_1[_i];
                                        _d.label = 2;
                                    case 2:
                                        _d.trys.push([2, 7, , 8]);
                                        return [4 /*yield*/, fetchWithTimeout(url)];
                                    case 3:
                                        r = _d.sent();
                                        if (!(r === null || r === void 0 ? void 0 : r.ok))
                                            return [3 /*break*/, 8];
                                        ctype = String(r.headers.get("content-type") || "").toLowerCase();
                                        if (!ctype.includes("application/json")) return [3 /*break*/, 5];
                                        return [4 /*yield*/, r.json()];
                                    case 4:
                                        j = _d.sent();
                                        if (typeof (j === null || j === void 0 ? void 0 : j.base64) === "string")
                                            return [2 /*return*/, Buffer.from(j.base64, "base64")];
                                        if (typeof (j === null || j === void 0 ? void 0 : j.text) === "string")
                                            return [2 /*return*/, Buffer.from(j.text, "utf8")];
                                        return [3 /*break*/, 8];
                                    case 5:
                                        _b = (_a = Buffer).from;
                                        return [4 /*yield*/, r.arrayBuffer()];
                                    case 6:
                                        buf = _b.apply(_a, [_d.sent()]);
                                        return [2 /*return*/, buf];
                                    case 7:
                                        _c = _d.sent();
                                        return [3 /*break*/, 8];
                                    case 8:
                                        _i++;
                                        return [3 /*break*/, 1];
                                    case 9: return [2 /*return*/, null];
                                }
                            });
                        }); };
                        _loop_1 = function () {
                            var job, ok, _i, _c, base, buf, computed, _d, cur, next;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        job = this_1.blobFetchQ.shift();
                                        if (this_1.getBlob(job.cid))
                                            return [2 /*return*/, "continue"];
                                        ok = false;
                                        _i = 0, _c = job.providers;
                                        _e.label = 1;
                                    case 1:
                                        if (!(_i < _c.length)) return [3 /*break*/, 8];
                                        base = _c[_i];
                                        return [4 /*yield*/, tryFetchBlob(base, job.cid)];
                                    case 2:
                                        buf = _e.sent();
                                        if (!buf)
                                            return [3 /*break*/, 7];
                                        _e.label = 3;
                                    case 3:
                                        _e.trys.push([3, 6, , 7]);
                                        return [4 /*yield*/, (0, cid_js_1.cidForBytes)(buf)];
                                    case 4:
                                        computed = _e.sent();
                                        if (computed !== job.cid)
                                            return [3 /*break*/, 7];
                                        return [4 /*yield*/, this_1.putBlobFromBuffer(buf)];
                                    case 5:
                                        _e.sent();
                                        ok = true;
                                        return [3 /*break*/, 8];
                                    case 6:
                                        _d = _e.sent();
                                        return [3 /*break*/, 7];
                                    case 7:
                                        _i++;
                                        return [3 /*break*/, 1];
                                    case 8:
                                        if (!ok) {
                                            cur = (_a = backoff.get(job.cid)) !== null && _a !== void 0 ? _a : MIN_MS;
                                            next = Math.min(cur * 2, MAX_MS);
                                            backoff.set(job.cid, next);
                                            setTimeout(function () { return _this.enqueueBlobFetch(job.cid, job.providers); }, cur);
                                        }
                                        else {
                                            backoff.delete(job.cid);
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _b.label = 1;
                    case 1:
                        if (!this.blobFetchQ.length) return [3 /*break*/, 3];
                        return [5 /*yield**/, _loop_1()];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        this.blobFetchRunning = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    /** --------- proposer --------- */
    Node.prototype.startProposer = function (intervalMs) {
        var _this = this;
        if (intervalMs === void 0) { intervalMs = 5000; }
        if (this.proposerTimer)
            return { ok: false, error: "already running" };
        var ms = Math.max(300, Number(intervalMs) || 5000);
        this.proposerTimer = setInterval(function () { void _this.sealBlock(); }, ms);
        return { ok: true, intervalMs: ms };
    };
    Node.prototype.stopProposer = function () {
        if (!this.proposerTimer)
            return { ok: true, note: "not running" };
        clearInterval(this.proposerTimer);
        this.proposerTimer = null;
        return { ok: true, stopped: true };
    };
    Node.prototype.takeTxBatch = function (max) {
        if (max === void 0) { max = 1000; }
        try {
            if (typeof this.mempool.drain === "function") {
                var r1 = this.mempool.drain(max);
                if (Array.isArray(r1))
                    return r1;
                var r2 = this.mempool.drain();
                if (Array.isArray(r2))
                    return r2;
            }
            if (typeof this.mempool.popMany === "function") {
                var r = this.mempool.popMany(max);
                if (Array.isArray(r))
                    return r;
            }
            if (typeof this.mempool.take === "function") {
                var r = this.mempool.take(max);
                if (Array.isArray(r))
                    return r;
            }
            if (typeof this.mempool.peekAll === "function") {
                var all = this.mempool.peekAll();
                if (Array.isArray(all)) {
                    if (typeof this.mempool.clear === "function") {
                        try {
                            this.mempool.clear();
                        }
                        catch (_a) { }
                    }
                    return all.slice(0, max);
                }
            }
        }
        catch (_b) { }
        return [];
    };
    Node.prototype.sealBlock = function (opts) {
        return __awaiter(this, void 0, void 0, function () {
            var t0, parent, number, batch, txs, allowEmpty, blobs, roots, now, parentBlock, parentHash, headerBytes, sig, b, refs, shard, _a, anyReceipts, recs, _i, recs_1, r, _b, dt;
            var _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        t0 = Date.now();
                        parent = this.store.loadHeadNumber();
                        number = parent + 1;
                        batch = this.takeTxBatch(1000);
                        txs = batch
                            .filter(function (t) {
                            return t &&
                                typeof t === "object" &&
                                typeof t.body === "object" &&
                                t.body !== null &&
                                typeof t.hash === "string" &&
                                /^[0-9a-fA-F]{64}$/.test(t.hash);
                        })
                            .map(function (t) { return (__assign(__assign({}, t), { hash: String(t.hash).toLowerCase() })); });
                        allowEmpty = !!(opts === null || opts === void 0 ? void 0 : opts.allowEmptyOnce) || this.allowEmptyBlocks;
                        if (txs.length === 0 && !allowEmpty) {
                            return [2 /*return*/, { ok: true, number: parent, txs: 0 }];
                        }
                        blobs = discoverLocalBlobs(this.baseDir);
                        roots = (0, block_js_1.computeRoots)(txs, blobs);
                        now = Date.now();
                        parentBlock = parent >= 0 ? this.store.loadBlock(parent) : null;
                        parentHash = parent >= 0 && parentBlock ? (0, block_js_1.blockHash)(parentBlock) : "".padStart(64, "0");
                        headerBytes = Buffer.from(JSON.stringify({
                            number: number,
                            parentHash: parentHash,
                            timestamp: now,
                            txRoot: roots.txRoot,
                            blobRoot: roots.blobRoot,
                            proposer: this.id,
                        }));
                        sig = signBytes(this.priv, headerBytes);
                        b = {
                            number: number,
                            parentHash: parentHash,
                            timestamp: now,
                            txRoot: roots.txRoot,
                            blobRoot: roots.blobRoot,
                            txs: txs,
                            blobs: blobs,
                            proposer: this.id,
                            sig: sig,
                        };
                        this.store.saveBlock(b);
                        if (!((_c = b.txs) === null || _c === void 0 ? void 0 : _c.length)) return [3 /*break*/, 12];
                        try {
                            refs = b.txs.map(function (tx, i) { return ({ h: tx.hash.toLowerCase(), n: b.number, o: i }); });
                            this.txIndex.putMany(refs);
                        }
                        catch (_h) { }
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 3, , 4]);
                        shard = this.txIndex.shardForBlock(b.number);
                        return [4 /*yield*/, (0, kidx_js_1.buildKidxForJsonl)(shard.path)];
                    case 2:
                        _g.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _g.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        _g.trys.push([4, 11, , 12]);
                        anyReceipts = this.receipts;
                        recs = b.txs.map(function (tx, i) {
                            var _a;
                            return ({
                                h: tx.hash.toLowerCase(),
                                n: b.number,
                                o: i,
                                ts: (_a = b.timestamp) !== null && _a !== void 0 ? _a : now,
                            });
                        });
                        if (!(typeof anyReceipts.appendMany === "function")) return [3 /*break*/, 6];
                        return [4 /*yield*/, anyReceipts.appendMany(recs)];
                    case 5:
                        _g.sent();
                        return [3 /*break*/, 10];
                    case 6:
                        if (!(typeof anyReceipts.append === "function")) return [3 /*break*/, 10];
                        _i = 0, recs_1 = recs;
                        _g.label = 7;
                    case 7:
                        if (!(_i < recs_1.length)) return [3 /*break*/, 10];
                        r = recs_1[_i];
                        return [4 /*yield*/, anyReceipts.append(r)];
                    case 8:
                        _g.sent();
                        _g.label = 9;
                    case 9:
                        _i++;
                        return [3 /*break*/, 7];
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        _b = _g.sent();
                        return [3 /*break*/, 12];
                    case 12:
                        this.publishJson("void/block", {
                            number: b.number,
                            hash: (0, block_js_1.blockHash)(b),
                            txRoot: b.txRoot,
                            blobRoot: b.blobRoot,
                            timestamp: b.timestamp,
                        });
                        dt = Date.now() - t0;
                        (_d = this.onSealed) === null || _d === void 0 ? void 0 : _d.call(this, b, dt);
                        return [2 /*return*/, { ok: true, number: b.number, txs: (_f = (_e = b.txs) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 0 }];
                }
            });
        });
    };
    /** follower: one-shot */
    Node.prototype.pullOnce = function (peerHttp, hooks) {
        return __awaiter(this, void 0, void 0, function () {
            var myHead, headRes, theirHead, from, to, fetchRange, arr, retried, imported, alreadyHad, filled, importedNums, _loop_2, this_2, _i, arr_1, b;
            var _this = this;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        myHead = this.store.loadHeadNumber();
                        return [4 /*yield*/, fetch("".concat(peerHttp, "/head")).then(function (r) { return r.json(); }).catch(function () { return null; })];
                    case 1:
                        headRes = _e.sent();
                        theirHead = Number((_a = headRes === null || headRes === void 0 ? void 0 : headRes.head) !== null && _a !== void 0 ? _a : -1);
                        if (!Number.isFinite(theirHead)) {
                            return [2 /*return*/, { ok: false, imported: 0, alreadyHad: 0, filled: 0, reason: "peer head unavailable" }];
                        }
                        if (theirHead <= myHead) {
                            return [2 /*return*/, { ok: true, imported: 0, alreadyHad: 0, filled: 0, reason: "no new blocks", myHead: myHead, theirHead: theirHead }];
                        }
                        from = myHead + 1;
                        to = theirHead;
                        fetchRange = function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, fetch("".concat(peerHttp, "/blocks/range?from=").concat(from, "&to=").concat(to))
                                            .then(function (r) { return r.json(); })
                                            .then(function (j) { return (Array.isArray(j) ? j : []); })
                                            .catch(function () { return []; })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); };
                        return [4 /*yield*/, fetchRange()];
                    case 2:
                        arr = _e.sent();
                        retried = false;
                        if (!(!Array.isArray(arr) || arr.length === 0 || Number((_b = arr[arr.length - 1]) === null || _b === void 0 ? void 0 : _b.number) !== theirHead)) return [3 /*break*/, 4];
                        return [4 /*yield*/, fetchRange()];
                    case 3:
                        arr = _e.sent();
                        retried = true;
                        _e.label = 4;
                    case 4:
                        imported = 0;
                        alreadyHad = 0;
                        filled = 0;
                        importedNums = [];
                        _loop_2 = function (b) {
                            var n, existing, incomingHasTxs, existingHasTxs, refs, anyReceipts, recs, _f, recs_2, r, _g, merged, refs, anyReceipts, recs, _h, recs_3, r, _j;
                            return __generator(this, function (_k) {
                                switch (_k.label) {
                                    case 0:
                                        n = Number(b === null || b === void 0 ? void 0 : b.number);
                                        if (!Number.isFinite(n))
                                            return [2 /*return*/, "continue"];
                                        existing = this_2.store.loadBlock(n);
                                        incomingHasTxs = Array.isArray(b === null || b === void 0 ? void 0 : b.txs) && b.txs.length > 0;
                                        existingHasTxs = Array.isArray(existing === null || existing === void 0 ? void 0 : existing.txs) && existing.txs.length > 0;
                                        if (!!existing) return [3 /*break*/, 10];
                                        this_2.store.saveBlock(b);
                                        imported++;
                                        importedNums.push(n);
                                        if (!incomingHasTxs) return [3 /*break*/, 9];
                                        try {
                                            refs = b.txs.map(function (tx, i) { return ({ h: String(tx.hash).toLowerCase(), n: n, o: i }); });
                                            this_2.txIndex.putMany(refs);
                                        }
                                        catch (_l) { }
                                        _k.label = 1;
                                    case 1:
                                        _k.trys.push([1, 8, , 9]);
                                        anyReceipts = this_2.receipts;
                                        recs = b.txs.map(function (tx, i) {
                                            var _a;
                                            return ({
                                                h: String(tx.hash).toLowerCase(),
                                                n: n,
                                                o: i,
                                                ts: (_a = b.timestamp) !== null && _a !== void 0 ? _a : Date.now(),
                                            });
                                        });
                                        if (!(typeof anyReceipts.appendMany === "function")) return [3 /*break*/, 3];
                                        return [4 /*yield*/, anyReceipts.appendMany(recs)];
                                    case 2:
                                        _k.sent();
                                        return [3 /*break*/, 7];
                                    case 3:
                                        if (!(typeof anyReceipts.append === "function")) return [3 /*break*/, 7];
                                        _f = 0, recs_2 = recs;
                                        _k.label = 4;
                                    case 4:
                                        if (!(_f < recs_2.length)) return [3 /*break*/, 7];
                                        r = recs_2[_f];
                                        return [4 /*yield*/, anyReceipts.append(r)];
                                    case 5:
                                        _k.sent();
                                        _k.label = 6;
                                    case 6:
                                        _f++;
                                        return [3 /*break*/, 4];
                                    case 7: return [3 /*break*/, 9];
                                    case 8:
                                        _g = _k.sent();
                                        return [3 /*break*/, 9];
                                    case 9:
                                        (_c = hooks === null || hooks === void 0 ? void 0 : hooks.onImportBlock) === null || _c === void 0 ? void 0 : _c.call(hooks, b);
                                        return [2 /*return*/, "continue"];
                                    case 10:
                                        if (!(!existingHasTxs && incomingHasTxs)) return [3 /*break*/, 20];
                                        merged = __assign(__assign(__assign({}, existing), b), { txs: b.txs });
                                        this_2.store.saveBlock(merged);
                                        filled++;
                                        importedNums.push(n);
                                        try {
                                            refs = b.txs.map(function (tx, i) { return ({ h: String(tx.hash).toLowerCase(), n: n, o: i }); });
                                            this_2.txIndex.putMany(refs);
                                        }
                                        catch (_m) { }
                                        _k.label = 11;
                                    case 11:
                                        _k.trys.push([11, 18, , 19]);
                                        anyReceipts = this_2.receipts;
                                        recs = b.txs.map(function (tx, i) {
                                            var _a;
                                            return ({
                                                h: String(tx.hash).toLowerCase(),
                                                n: n,
                                                o: i,
                                                ts: (_a = b.timestamp) !== null && _a !== void 0 ? _a : Date.now(),
                                            });
                                        });
                                        if (!(typeof anyReceipts.appendMany === "function")) return [3 /*break*/, 13];
                                        return [4 /*yield*/, anyReceipts.appendMany(recs)];
                                    case 12:
                                        _k.sent();
                                        return [3 /*break*/, 17];
                                    case 13:
                                        if (!(typeof anyReceipts.append === "function")) return [3 /*break*/, 17];
                                        _h = 0, recs_3 = recs;
                                        _k.label = 14;
                                    case 14:
                                        if (!(_h < recs_3.length)) return [3 /*break*/, 17];
                                        r = recs_3[_h];
                                        return [4 /*yield*/, anyReceipts.append(r)];
                                    case 15:
                                        _k.sent();
                                        _k.label = 16;
                                    case 16:
                                        _h++;
                                        return [3 /*break*/, 14];
                                    case 17: return [3 /*break*/, 19];
                                    case 18:
                                        _j = _k.sent();
                                        return [3 /*break*/, 19];
                                    case 19:
                                        (_d = hooks === null || hooks === void 0 ? void 0 : hooks.onImportBlock) === null || _d === void 0 ? void 0 : _d.call(hooks, b);
                                        return [2 /*return*/, "continue"];
                                    case 20:
                                        alreadyHad++;
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_2 = this;
                        _i = 0, arr_1 = arr;
                        _e.label = 5;
                    case 5:
                        if (!(_i < arr_1.length)) return [3 /*break*/, 8];
                        b = arr_1[_i];
                        return [5 /*yield**/, _loop_2(b)];
                    case 6:
                        _e.sent();
                        _e.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 5];
                    case 8: return [2 /*return*/, {
                            ok: true,
                            imported: imported,
                            alreadyHad: alreadyHad,
                            filled: filled,
                            myHead: myHead,
                            theirHead: theirHead,
                            from: from,
                            to: to,
                            got: Array.isArray(arr) ? arr.length : 0,
                            retried: retried,
                            importedNums: importedNums,
                        }];
                }
            });
        });
    };

// VOID_FOLLOWER_TAILNET_HEAD_BOUNDED_IMPORT_V1_JS_OVERRIDE
Node.prototype.pullOnce = async function(peerHttp, hooks) {
    const myHead = this.store.loadHeadNumber();
    const base = String(peerHttp || "").replace(/\/+$/, "");
    const readJson = async (path) => {
        try {
            const r = await fetch(base + path).catch(() => null);
            if (!r || !r.ok) return null;
            return await r.json().catch(() => null);
        } catch (_) {
            return null;
        }
    };
    const readPeerHead = async () => {
        for (const path of ["/blocks/latest/number2.json", "/blocks/latest/number.json", "/head", "/__void/ready.json", "/api/health"]) {
            const j = await readJson(path);
            const n = Number((j === null || j === void 0 ? void 0 : j.number) ?? (j === null || j === void 0 ? void 0 : j.head));
            if (Number.isFinite(n) && n >= 0) return n;
        }
        return -1;
    };
    const theirHead = await readPeerHead();
    if (!(Number.isFinite(theirHead) && theirHead >= 0)) {
        return { ok: false, imported: 0, alreadyHad: 0, filled: 0, reason: "peer head unavailable", myHead, theirHead };
    }
    if (theirHead <= myHead) {
        return { ok: true, imported: 0, alreadyHad: 0, filled: 0, reason: "no new blocks", myHead, theirHead };
    }
    const from = myHead + 1;
    const maxPull = Math.max(1, Number(process.env.VOID_FOLLOWER_PULL_LIMIT || 250) || 250);
    const to = Math.min(theirHead, myHead + maxPull);
    const fetchRange = async () => {
        try {
            const r = await fetch(base + "/blocks/range?from=" + from + "&to=" + to);
            const j = await r.json();
            return Array.isArray(j) ? j : [];
        } catch (_) {
            return [];
        }
    };
    let arr = await fetchRange();
    let retried = false;
    if (!Array.isArray(arr) || arr.length === 0 || Number(arr[arr.length - 1]?.number) !== to) {
        arr = await fetchRange();
        retried = true;
    }
    let imported = 0, alreadyHad = 0, filled = 0;
    const importedNums = [];
    for (const b of (Array.isArray(arr) ? arr : [])) {
        const n = Number(b?.number);
        if (!Number.isFinite(n)) continue;
        const existing = this.store.loadBlock(n);
        const incomingHasTxs = Array.isArray(b?.txs) && b.txs.length > 0;
        const existingHasTxs = Array.isArray(existing?.txs) && existing.txs.length > 0;
        if (!existing) {
            this.store.saveBlock(b);
            imported++;
            importedNums.push(n);
            try { hooks?.onImportBlock?.(b); } catch (_) {}
            continue;
        }
        if (!existingHasTxs && incomingHasTxs) {
            const merged = Object.assign({}, existing, b, { txs: b.txs });
            this.store.saveBlock(merged);
            filled++;
            importedNums.push(n);
            try { hooks?.onImportBlock?.(merged); } catch (_) {}
            continue;
        }
        alreadyHad++;
    }
    return { ok: true, imported, alreadyHad, filled, myHead, advancedHead: this.store.loadHeadNumber(), theirHead, from, to, got: Array.isArray(arr) ? arr.length : 0, retried, bounded: to < theirHead, maxPull, importedNums };
};

    /** follower periodic */
    Node.prototype.startFollower = function (peerHttp, intervalMs, opts) {
        var _this = this;
        var _a, _b;
        if (peerHttp === void 0) { peerHttp = "http://localhost:4100"; }
        if (intervalMs === void 0) { intervalMs = 2000; }
        var running = false;
        var tick = function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (running)
                            return [2 /*return*/];
                        running = true;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.pullOnce(peerHttp, opts)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        running = false;
                        return [2 /*return*/];
                }
            });
        }); };
        void tick();
        (_b = (_a = setInterval(tick, intervalMs)).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
        return { ok: true, peerHttp: peerHttp, intervalMs: intervalMs };
    };
    Node.prototype.peersSnapshot = function () {
        var connected = __spreadArray([], this.peers.values(), true).filter(function (p) { return !p.id.startsWith("?-"); })
            .map(function (p) { return ({ id: p.id, addr: p.addr, listens: p.listens, outbound: p.outbound }); });
        return { connected: connected, knownAddrs: __spreadArray([], this.knownAddrs, true) };
    };
    /** blobs */
    Node.prototype.putBlobFromBuffer = function (buf) {
        return __awaiter(this, void 0, void 0, function () {
            var cid, file;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, cid_js_1.cidForBytes)(buf)];
                    case 1:
                        cid = _a.sent();
                        file = path.join(this.blobsDir, cid);
                        if (!fs.existsSync(file))
                            fs.writeFileSync(file, buf);
                        this.publishJson("void/blob.announce", { cid: cid, size: buf.length });
                        return [2 /*return*/, { cid: cid, size: buf.length }];
                }
            });
        });
    };
    Node.prototype.getBlob = function (cid) {
        var file = path.join(this.blobsDir, cid);
        if (!fs.existsSync(file))
            return null;
        return fs.readFileSync(file);
    };
    return Node;
}());
exports.Node = Node;
function discoverLocalBlobs(baseDir) {
    if (baseDir === void 0) { baseDir = process.env.DATA_DIR || "data"; }
    var dir = path.join(baseDir, "blobs");
    if (!fs.existsSync(dir))
        return [];
    return fs
        .readdirSync(dir)
        .filter(function (f) { return /^[0-9a-f]{64}$/i.test(f); })
        .map(function (f) {
        var p = path.join(dir, f);
        var st = fs.statSync(p);
        return { cid: f, size: st.size };
    });
}
// ---------------- [ADD] tx enqueue shim export (idempotent) ----------------
// Some routes import { globalEnqueueTx } from "../node_core.js". Provide a tiny
// queue that lives on globalThis so the import resolves without touching other code.
function globalEnqueueTx(tx) {
    try {
        var g = globalThis;
        if (!g.__void_tx_queue)
            g.__void_tx_queue = [];
        g.__void_tx_queue.push(tx !== null && tx !== void 0 ? tx : {});
        return g.__void_tx_queue.length;
    }
    catch (_a) {
        return -1;
    }
}
// ---------------------------------------------------------------------------
