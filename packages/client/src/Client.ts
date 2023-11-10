import type WebSocket from "isomorphic-ws";

import { ClientActions, deserialize } from "jest-remote-protocol";
import TestRunner from "jest-runner";
import { TestWatcher } from "jest-watcher";
import Runtime from "jest-runtime";
import type { Config as JestConfig } from "@jest/types";

import { ClientEventEmitter } from "./ClientEventEmitter.js";
import { ReconnectingSocket } from "./ReconnectingSocket.js";
import { TestContext } from "@jest/test-result";

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

function hydrateContext(
  config: JestConfig.ProjectConfig,
  maxWorkers: number,
  watchman: boolean
): Promise<TestContext> {
  return Runtime.createContext(config, { maxWorkers, watchman });
}
export class Client extends ClientEventEmitter {
  #config: Config;
  #socket: ReconnectingSocket;
  #globalConfig: JestConfig.GlobalConfig | null = null;
  #runner: TestRunner | null = null;
  #watcher: TestWatcher | null = null;

  #actions: ClientActions = {
    initialize: (globalConfig, testRunnerContext) => {
      this.#globalConfig = globalConfig;
      this.#runner = new TestRunner(globalConfig, testRunnerContext);
      this.#watcher = new TestWatcher({ isWatchMode: globalConfig.watch });
    },
    "run-tests": async (tests) => {
      this.emit("run-tests", tests);
      const unsubscribables = [
        this.runner.on("test-file-start", (args) =>
          this.#socket.send("test-file-start", ...args)
        ),
        this.runner.on("test-file-failure", (args) =>
          this.#socket.send("test-file-failure", ...args)
        ),
        this.runner.on("test-file-success", (args) =>
          this.#socket.send("test-file-success", ...args)
        ),
        this.runner.on("test-case-result", (args) =>
          this.#socket.send("test-case-result", ...args)
        ),
      ];
      try {
        if (!this.#globalConfig) {
          throw new Error("Expected globalConfig to be initialized");
        }
        const { maxWorkers, watchman } = this.#globalConfig;
        for (const test of tests) {
          test.context = await hydrateContext(
            test.context.config,
            maxWorkers,
            watchman
          );
        }
        await this.runner.runTests(tests, this.watcher, { serial: true });
      } finally {
        for (const unsubscribe of unsubscribables) {
          unsubscribe();
        }
        this.#socket.send("run-tests-completed");
        this.emit("run-tests-completed");
      }
    },
  };

  constructor(config: Partial<Config> = DEFAULT_CONFIG) {
    super();
    this.#config = { ...DEFAULT_CONFIG, ...config };
    this.#socket = new ReconnectingSocket(
      this,
      {
        handleMessage: this.handleMessage,
        handleClose: this.handleClose,
      },
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

  get runner() {
    if (this.#runner) {
      return this.#runner;
    } else {
      throw new Error("Cannot get runner before it's been initialized");
    }
  }

  get watcher() {
    if (this.#watcher) {
      return this.#watcher;
    } else {
      throw new Error("Cannot get watcher before it's been initialized");
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
    const { action, args } = deserialize(data.toString());
    if (Array.isArray(args)) {
      this.callAction(action, ...args);
    } else {
      throw new Error("Expected an array of arguments");
    }
  };

  private handleClose = (code: number, reason?: string) => {
    console.log(
      `WebSocket closed: ${reason || "Unknown reason"} (code = ${code})`
    );
  };
}
