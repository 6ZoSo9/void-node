"use strict";
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDir = ensureDir;
exports.readJsonIfExists = readJsonIfExists;
exports.writeJsonAtomic = writeJsonAtomic;
exports.writeFileAtomic = writeFileAtomic;
// src/util/files.ts
var fs = require("node:fs");
var path = require("node:path");
function ensureDir(dir) {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
function readJsonIfExists(file) {
    try {
        if (!fs.existsSync(file))
            return null;
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch (_a) {
        return null;
    }
}
function writeJsonAtomic(file, obj) {
    var dir = path.dirname(file);
    ensureDir(dir);
    var tmp = file + ".tmp-" + Date.now();
    fs.writeFileSync(tmp, JSON.stringify(obj));
    fs.renameSync(tmp, file);
}
/** Generic atomic write for Buffer/strings. */
function writeFileAtomic(file, data) {
    var dir = path.dirname(file);
    ensureDir(dir);
    var tmp = file + ".tmp-" + Date.now();
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, file);
}
