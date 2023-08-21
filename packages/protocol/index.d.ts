import type { Test, TestEvents, TestRunnerContext } from "jest-runner";
import type { Config } from "@jest/types";

export type ClientActions = {
  ["initialize"]: (
    globalConfig: Config.GlobalConfig,
    testRunnerContext: TestRunnerContext
  ) => void;
  ["run-tests"]: (tests: Test[]) => void;
};

export type ClientActionName = keyof ClientActions;

export type ServerActions = {
  ["run-tests-completed"]: () => void;
} & {
  [event in keyof TestEvents]: (...args: TestEvents[event]) => void;
};

export type ServerActionName = keyof ServerActions;
