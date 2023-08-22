import type WebSocket from "isomorphic-ws";

import { ClientActions, deserialize } from "jest-runner-remote-protocol";
import TestRunner from "jest-runner";
import { TestWatcher } from "jest-watcher";
import JestResolver, { ResolverOptions } from "jest-resolve";
import { ModuleMap } from "jest-haste-map";

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
  #watcher: TestWatcher | null = null;

  #actions: ClientActions = {
    initialize: (globalConfig, testRunnerContext) => {
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
        console.log(tests);
        for (const { context } of tests) {
          // Inflate a proper context
          // @ts-expect-error - We're accessing a private member of the Resolver
          const { _moduleMap, _options } = context.resolver;
          if (typeof _options !== "object" || typeof _moduleMap !== "object") {
            throw new Error("Expected _options and _moduleMap");
          }
          const moduleMap = ModuleMap.create(_options.rootDir);
          context.resolver = new JestResolver(moduleMap, _options);
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
}
