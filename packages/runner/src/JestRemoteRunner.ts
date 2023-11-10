import { strict as assert } from "node:assert";
import * as cp from "node:child_process";
import { Readable } from "node:stream";
import chalk from "chalk";
import { WebSocket } from "ws";

import * as Jest from "@jest/types";
import {
  EmittingTestRunnerInterface,
  Test,
  TestEvents,
  TestRunnerContext,
  TestRunnerOptions,
  TestWatcher,
  UnsubscribeFn,
} from "jest-runner";

import { config } from "./config.js";
import { PrefixingTransform } from "./PrefixingTransform.js";
import { reportProgress } from "./ui.js";
import { Server } from "./Server.js";

type EventListener<Name extends keyof TestEvents> = (
  eventData: TestEvents[Name]
) => void | Promise<void>;

type EventListeners = {
  [Name in keyof TestEvents]: Set<EventListener<Name>>;
};

export class JestRemoteRunner implements EmittingTestRunnerInterface {
  readonly supportsEventEmitters = true;
  // TODO: Look into lifting this restriction
  readonly isSerial = true;

  #listeners: EventListeners = {
    "test-file-start": new Set(),
    "test-file-failure": new Set(),
    "test-file-success": new Set(),
    "test-case-result": new Set(),
  };

  #server: Server = new Server({
    port: config.port,
    actions: {
      "run-tests-completed": () => {
        // No-op
      },
      "test-file-start": (test) => {
        this.emit("test-file-start", test);
      },
      "test-file-failure": (test, error) => {
        this.emit("test-file-failure", test, error);
      },
      "test-file-success": (test, result) => {
        this.emit("test-file-success", test, result);
      },
      "test-case-result": (filePath, result) => {
        this.emit("test-case-result", filePath, result);
      },
    },
  });
  #worker: cp.ChildProcessByStdio<null, Readable, Readable> | null = null;
  // #worker: cp.ChildProcess | null = null;

  constructor(
    private globalConfig: Jest.Config.GlobalConfig,
    private testRunnerContext: TestRunnerContext
  ) {}

  async runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    options: TestRunnerOptions
  ): Promise<void> {
    await this.#server.start();
    await this.startWorker();
    assert(options.serial, "Expected serial mode");

    await reportProgress({
      action: () => this.#server.waitForClient(),
      starting: "LISTENING",
      startingText: `Waiting for a worker to connect to ${this.#server.url}`,
      completed: "CONNECTED",
      completedText: () => {
        return `Connected to worker`;
      },
    });

    await Promise.all(
      [...this.#server.clients].map((client) => this.initializeClient(client))
    );

    await Promise.all(
      [...this.#server.clients].map((client) =>
        this.runTestsWithClient(client, tests)
      )
    );

    await this.stopWorker();
    await this.#server.stop();
  }

  on<Name extends keyof TestEvents>(
    eventName: Name,
    listener: EventListener<Name>
  ): UnsubscribeFn {
    const set = this.#listeners[eventName];
    set.add(listener);
    return () => set.delete(listener);
  }

  private async initializeClient(client: WebSocket) {
    await this.#server.send(
      client,
      "initialize",
      this.globalConfig,
      this.testRunnerContext
    );
  }

  private async runTestsWithClient(client: WebSocket, tests: Test[]) {
    await this.#server.send(client, "run-tests", tests);
    // Wait for the client to respond with the "run-tests-completed" message
    await this.#server.waitForAction(client, "run-tests-completed");
  }

  private emit<Name extends keyof TestEvents>(
    eventName: Name,
    ...eventData: TestEvents[Name]
  ) {
    for (const listener of this.#listeners[eventName]) {
      listener(eventData);
    }
  }

  private async startWorker() {
    if (!config.command) {
      const err = new Error("jest-runner-remote is missing a command");
      err.stack = "";
      throw err;
    }

    this.#worker = cp.spawn(config.command, {
      shell: true,
      stdio: [process.stdin, "pipe", "pipe"],
    });

    const styledPrefix = chalk.dim(`[${config.logPrefix}]`) + " ";

    this.#worker.stdout
      .pipe(new PrefixingTransform(styledPrefix))
      .pipe(process.stdout);
    this.#worker.stderr
      .pipe(new PrefixingTransform(styledPrefix))
      .pipe(process.stderr);

    this.#worker.once("exit", this.handleWorkerExit);
    process.once("exit", this.killWorker);
    // Wait for the process to spawn
    await new Promise<void>((resolve, reject) => {
      if (this.#worker) {
        this.#worker.once("spawn", resolve);
        this.#worker.once("error", reject);
      }
    });
    // Stop listening for the "error" event
    this.#worker.removeAllListeners("error");
  }

  private async stopWorker() {
    // Wait for the process to exit
    await new Promise<void>((resolve) => {
      if (this.#worker) {
        this.#worker.kill("SIGKILL");
        this.#worker.once("exit", resolve);
        this.#worker = null;
      }
    });
  }

  private handleWorkerExit = (
    code: number | null,
    signal: NodeJS.Signals | null
  ) => {
    // TODO: Make sure this doesn't collide with the report of progress
    process.stdout.write(
      chalk.dim(`Worker exited (code = ${code}, signal = ${signal})\n`)
    );
  };

  private killWorker = () => {
    if (this.#worker) {
      this.#worker.kill();
      this.#worker = null;
    }
  };
}
