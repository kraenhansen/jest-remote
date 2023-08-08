import type WebSocket from "isomorphic-ws";

import { ClientEventEmitter } from "./ClientEventEmitter.js";
import { ReconnectingSocket } from "./ReconnectingSocket.js";
import { ClientActionName, ClientActions } from "jest-runner-remote-protocol";

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
  #config: Config;
  #socket: ReconnectingSocket;
  #actions: ClientActions = {
    "run-tests": (tests) => {
      console.log("Running tests!", tests);
      this.emit("run-tests", tests);
      // TODO: Don't fake a completion
      setTimeout(() => {
        // TODO: Make sure the message gets sent ...
        this.#socket.send("run-tests-completed");
        this.emit("run-tests-completed");
      }, 1000);
    },
  };

  constructor(config: Partial<Config> = DEFAULT_CONFIG) {
    super();
    this.#config = { ...DEFAULT_CONFIG, ...config };
    this.#socket = new ReconnectingSocket(
      this,
      this.handleMessage,
      this.#config.address,
      this.#config.reconnect,
      this.#config.reconnectDelay
    );
    // Setup listeners
    this.on("run-tests-completed", () => {
      this.#socket.disconnect(1000, "Test run completed");
    });
    // Connect if we have to
    if (this.#config.autoConnect) {
      this.connect().catch(console.error);
    }
  }

  async connect(): Promise<void> {
    await this.#socket.connect();
  }

  private callAction<Action extends keyof ClientActions>(
    action: Action,
    ...args: Parameters<ClientActions[Action]>
  ): void {
    if (action in this.#actions) {
      this.#actions[action as ClientActionName].apply(null, args);
    } else {
      throw new Error(`Unexpected action: ${action}`);
    }
  }

  private handleMessage = (data: WebSocket.Data) => {
    const { action, args } = JSON.parse(data.toString());
    if (Array.isArray(args)) {
      this.callAction(action, ...args);
    } else {
      throw new Error("Expected an array of arguments");
    }
  };
}
