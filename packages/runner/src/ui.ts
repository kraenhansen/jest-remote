import readline from "node:readline";
import chalk from "chalk";

type DoneCallback = () => void;

const badge = (color: chalk.ChalkFunction, text: string) =>
  chalk.supportsColor ? color(` ${text} `) : text;

const progressBadge = (text: string) =>
  badge(chalk.reset.inverse.bold.yellow, text);

const completedBadge = (text: string) =>
  badge(chalk.reset.inverse.bold.green, text);

const failedBadge = (text: string) => badge(chalk.reset.inverse.bold.red, text);

type ProgressTexts<R> = {
  starting?: string;
  startingText: string | (() => string);
  completed?: string;
  completedText: string | (() => string);
  failed?: string;
  action: () => R;
};

function unwrap(value: string | (() => string)): string {
  return typeof value === "function" ? value() : value;
}

export async function reportProgress<R>({
  action,
  starting = "STARTING",
  startingText,
  completed = "COMPLETED",
  completedText,
  failed = "FAILED",
}: ProgressTexts<R>) {
  process.stdout.write(progressBadge(starting) + ` ${unwrap(startingText)}`);
  try {
    const result = await action();
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(
      completedBadge(completed) + ` ${unwrap(completedText)}\n`
    );
    return result;
  } catch (err) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    const message = err instanceof Error ? err.message : `${err}`;
    process.stderr.write(failedBadge(failed) + ` ${message}`);
    throw err;
  }
}
