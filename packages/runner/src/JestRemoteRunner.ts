import { strict as assert } from "node:assert";
import * as cp from "node:child_process";
import { Readable } from "node:stream";
import * as ws from "ws";
import chalk from "chalk";

import * as Jest from "@jest/types";
import {
  Test,
  TestRunnerOptions,
  TestWatcher,
  EmittingTestRunnerInterface,
  TestEvents,
  UnsubscribeFn,
} from "jest-runner";

import { config } from "./config";
import { PrefixingTransform } from "./PrefixingTransform";

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

  #server: ws.Server | null = null;
  #worker: cp.ChildProcessByStdio<null, Readable, Readable> | null = null;
  // #worker: cp.ChildProcess | null = null;

  constructor(private globalConfig: Jest.Config.GlobalConfig) {
    // console.log({ globalConfig });
  }

  async runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    options: TestRunnerOptions
  ): Promise<void> {
    await this.startServer();
    await this.startWorker();
    assert(options.serial, "Expected serial mode");
    /*
    this.send({
      action: "runTests",
      tests: tests.map(({ path }) => ({ path })),
    });
    */
    // TODO: Propagate any events coming back from the server via the "emit"
    for (const test of tests) {
      // TODO: Send the intent to the client
      console.log({ test });
      const start = new Date();
      const end = new Date();

      this.emit("test-file-start", test);
      // this.emit("test-file-success", test, pass({ start, end, test }));
      /*
      const err = new Error("Unexpected");
      this.emit("test-file-failure", test, {
        message: err.message,
        stack: err.stack,
      });
      */
      // TODO: Exchange for actually sending the intent
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    await this.stopWorker();
    await this.stopServer();
  }

  on<Name extends keyof TestEvents>(
    eventName: Name,
    listener: EventListener<Name>
  ): UnsubscribeFn {
    const set = this.#listeners[eventName];
    set.add(listener);
    return () => set.delete(listener);
  }

  private emit<Name extends keyof TestEvents>(
    eventName: Name,
    ...eventData: TestEvents[Name]
  ) {
    for (const listener of this.#listeners[eventName]) {
      listener(eventData);
    }
  }

  private async startWorker(): Promise<void> {
    this.#worker = cp.spawn(config.command, {
      shell: true,
      stdio: [process.stdin, "pipe", "pipe"],
    });

    const styledPrefix = chalk.dim(`[${config.prefix}]`) + " ";

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

  private async stopWorker(): Promise<void> {
    // Wait for the process to exit
    await new Promise<void>((resolve) => {
      if (this.#worker) {
        this.#worker.kill("SIGKILL");
        this.#worker.once("close", resolve);
        this.#worker = null;
      }
    });
  }

  private async startServer(): Promise<void> {
    this.#server = new ws.Server({ port: config.port });
  }

  private async stopServer(): Promise<void> {
    if (this.#server) {
      this.#server.close();
      this.#server = null;
    }
  }

  private handleWorkerExit = (
    code: number | null,
    signal: NodeJS.Signals | null
  ) => {
    console.log("Worker exited!", { code, signal });
  };

  private killWorker = () => {
    if (this.#worker) {
      this.#worker.kill();
      this.#worker = null;
    }
  };
}
