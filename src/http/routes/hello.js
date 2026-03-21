"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHello = registerHello;
function registerHello(app) {
    app.get("/hello", function (_req, res) { return res.json({ ok: true, msg: "void-node says hello" }); });
}
