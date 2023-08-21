import type WebSocket from "isomorphic-ws";

import { ClientActions } from "jest-runner-remote-protocol";
import TestRunner from "jest-runner";

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
  #config: Config;
  #socket: ReconnectingSocket;
  #runner: TestRunner | null = null;

  #actions: ClientActions = {
    initialize: (globalConfig, testRunnerContext) => {
      console.log({ TestRunner });
      this.#runner = new TestRunner(globalConfig, testRunnerContext);
    },
    "run-tests": (tests) => {
      console.log("Running tests!", JSON.stringify(tests, null, 2));
      this.emit("run-tests", tests);
      // TODO: Construct a Jest Runner
      // TODO: Add listeners to the runner and propagate to the server via actions
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

  private callAction<
    ActionName extends keyof ClientActions,
    ActionParameters extends Parameters<ClientActions[ActionName]>
  >(actionName: ActionName, ...args: ActionParameters): void {
    if (actionName in this.#actions) {
      const action = this.#actions[actionName] as (
        this: void,
        ...args: ActionParameters
      ) => void;
      action(...args);
    } else {
      throw new Error(`Unexpected action: ${actionName}`);
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
