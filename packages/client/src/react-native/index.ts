import { ClientEventEmitter } from "../ClientEventEmitter.js";

console.log("globals", Object.keys(globalThis));
// ClientEventEmitter.EventEmitter = globalThis.EventEmitter as unknown;

export * from "../index.js";
