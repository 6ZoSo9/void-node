// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
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
// ---------------- Follower drift status v2 (additive, no deps) --------------------
(function followerStatusRouteV2() {
    var tries = 0, attached = false;
    function getApp() {
        // Your invariant: global hook exists right after `const app = express();`
        return globalThis.__void_http_app || globalThis.app || undefined;
    }
    function trimSlash(u) { return String(u || "").replace(/\/+$/, ""); }
    function fetchHeadFromMetrics(base) {
        return __awaiter(this, void 0, void 0, function () {
            var url, r, text, m;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = trimSlash(base) + "/metrics";
                        return [4 /*yield*/, fetch(url)];
                    case 1:
                        r = _a.sent();
                        if (!r.ok)
                            throw new Error("metrics_http_".concat(r.status));
                        return [4 /*yield*/, r.text()];
                    case 2:
                        text = _a.sent();
                        m = text.match(/(^|\n)\s*void_head_number\s+([0-9]+)(\s|$)/);
                        if (!m)
                            throw new Error("head_metric_missing");
                        return [2 /*return*/, Number(m[2])];
                }
            });
        });
    }
    function attach() {
        return __awaiter(this, void 0, void 0, function () {
            var app;
            var _this = this;
            return __generator(this, function (_a) {
                app = getApp();
                if (!app || typeof app.get !== "function") {
                    if (++tries < 60)
                        return [2 /*return*/, setTimeout(attach, 500)];
                    return [2 /*return*/];
                }
                if (attached)
                    return [2 /*return*/];
                attached = true;
                // GET /follower/status2?peer=http://127.0.0.1:4100
                // -> { ok, peer, head_local, head_peer, drift }
                app.get("/follower/status2", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                    var peer, myPort, myBase, _a, localHead, peerHead, drift, err_1, msg;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _b.trys.push([0, 2, , 3]);
                                peer = String(req.query.peer || "").trim();
                                if (!peer)
                                    return [2 /*return*/, res.status(400).json({ ok: false, error: "missing_peer_param" })];
                                myPort = Number(process.env.HTTP_PORT || 4100);
                                myBase = "http://127.0.0.1:".concat(myPort);
                                return [4 /*yield*/, Promise.all([
                                        fetchHeadFromMetrics(myBase),
                                        fetchHeadFromMetrics(peer)
                                    ])];
                            case 1:
                                _a = _b.sent(), localHead = _a[0], peerHead = _a[1];
                                drift = peerHead - localHead;
                                return [2 /*return*/, res.json({ ok: true, peer: trimSlash(peer), head_local: localHead, head_peer: peerHead, drift: drift })];
                            case 2:
                                err_1 = _b.sent();
                                msg = (err_1 && err_1.message) ? String(err_1.message) : String(err_1);
                                return [2 /*return*/, res.status(502).json({ ok: false, error: msg })];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        });
    }
    attach();
})();
