"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var kidx_js_1 = require("../src/util/kidx.js");
var base = process.env.DATA_DIR || 'data';
var r = await (0, kidx_js_1.buildAllKidx)(base);
console.log(JSON.stringify(r, null, 2));
