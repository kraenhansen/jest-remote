import type WebSocket from "isomorphic-ws";

import { ClientEventEmitter } from "./ClientEventEmitter.js";
import { ReconnectingSocket } from "./ReconnectingSocket.js";

export type Config = {
  address: string;
  autoConnect: boolean;
  reconnect: boolean;
  reconnectDelay: number;
};

const DEFAULT_CONFIG: Config = {
  address: "ws://localhost:8090",
  autoConnect: false,
  reconnect: true,
  reconnectDelay: 1000,
};

export class Client extends ClientEventEmitter {
  private config: Config;
  #socket: ReconnectingSocket;

  constructor(config: Partial<Config> = DEFAULT_CONFIG) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.#socket = new ReconnectingSocket(
      this,
      this.handleMessage,
      this.config.address,
      this.config.reconnect,
      this.config.reconnectDelay
    );
    // Setup listeners
    this.on("run-tests", (tests) => {
      console.log("Running tests!", tests);
      // TODO: Don't fake a completion
      setTimeout(() => {
        this.emit("run-tests-completed");
      }, 1000);
    });
    this.on("run-tests-completed", () => {
      this.#socket.send({ type: "run-tests-completed" });
      this.#socket.disconnect(1000, "Test run completed");
    });
    // Connect if we have to
    if (this.config.autoConnect) {
      this.connect().catch(console.error);
    }
  }

  async connect(): Promise<void> {
    await this.#socket.connect();
  }

  private handleMessage = (data: WebSocket.Data) => {
    const { type, ...args } = JSON.parse(data.toString());
    if (type === "run-tests") {
      if (!Array.isArray(args.tests)) {
        throw new Error("'run-tests' message missing an array of tests");
      }
      this.emit("run-tests", args.tests);
    } else {
      throw new Error(`Unexpected message type (${type})`);
    }
  };
}
