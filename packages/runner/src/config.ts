import { cosmiconfigSync } from "cosmiconfig";

export type Config = { command: string; port: number; logPrefix: string };

const { JEST_REMOTE_COMMAND, JEST_REMOTE_PORT, JEST_REMOTE_PREFIX } =
  process.env;

export const DEFAULT: Config = {
  command: JEST_REMOTE_COMMAND
    ? JEST_REMOTE_COMMAND
    : "echo 'Missing command for Jest Remote'; exit 1",
  port: JEST_REMOTE_PORT ? parseInt(JEST_REMOTE_PORT, 10) : 8090,
  logPrefix: JEST_REMOTE_PREFIX ? JEST_REMOTE_PREFIX : "worker",
};

const configResult = cosmiconfigSync("jest-runner-remote").search();

export const config: Config = configResult
  ? { ...DEFAULT, ...configResult.config }
  : DEFAULT;
