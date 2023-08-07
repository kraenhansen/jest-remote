import { EventEmitter } from "node:events";

import { ClientEventEmitter } from "../ClientEventEmitter.js";

ClientEventEmitter.EventEmitter = EventEmitter;

export * from "../index.js";
