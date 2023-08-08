import type { Test } from "jest-runner";

export type ClientActions = {
  ["run-tests"]: (tests: Test[]) => void;
};

export type ClientActionName = keyof ClientActions;

export type ServerActions = {
  ["run-tests-completed"]: () => void;
};

export type ServerActionName = keyof ServerActions;
