"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueue = enqueue;
exports.dequeue = dequeue;
exports.depth = depth;
exports.isFull = isFull;
const config_js_1 = require("../config.js");
const queue = [];
function enqueue(job) {
    queue.push(job);
}
function dequeue() {
    return queue.shift();
}
function depth() {
    return queue.length;
}
function isFull() {
    return queue.length >= config_js_1.config.maxQueueDepth;
}
//# sourceMappingURL=queue.js.map