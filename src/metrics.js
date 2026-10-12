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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metrics = void 0;
var Metrics = /** @class */ (function () {
    function Metrics() {
        this.counters = Object.create(null);
        this.gauges = Object.create(null);
    }
    Metrics.prototype.inc = function (name, by) {
        if (by === void 0) { by = 1; }
        this.counters[name] = (this.counters[name] || 0) + by;
    };
    Metrics.prototype.set = function (name, val) {
        this.gauges[name] = val;
    };
    Metrics.prototype.renderText = function (extras) {
        var g = __assign(__assign({}, this.gauges), (extras || {}));
        var lines = [];
        // counters
        for (var _i = 0, _a = Object.entries(this.counters); _i < _a.length; _i++) {
            var _b = _a[_i], k = _b[0], v = _b[1];
            lines.push("# TYPE void_".concat(k, " counter"));
            lines.push("void_".concat(k, " ").concat(v !== null && v !== void 0 ? v : 0));
        }
        // gauges
        for (var _c = 0, _d = Object.entries(g); _c < _d.length; _c++) {
            var _e = _d[_c], k = _e[0], v = _e[1];
            lines.push("# TYPE void_".concat(k, " gauge"));
            lines.push("void_".concat(k, " ").concat(v !== null && v !== void 0 ? v : 0));
        }
        return lines.join("\n") + "\n";
    };
    return Metrics;
}());
exports.Metrics = Metrics;
