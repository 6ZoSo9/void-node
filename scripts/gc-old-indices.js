"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var txindex_js_1 = require("../src/chain/txindex.js");
var dir = process.env.INDEX_DIR || 'data/index';
var keep = Number(process.env.KEEP_LAST || 3);
var idx = new txindex_js_1.TxIndex(dir);
console.log(idx.gc(keep));
