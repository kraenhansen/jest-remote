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
  completed?: string;
  failed?: string;
  subject: string;
  action: () => R;
};

export async function reportProgress<R>({
  subject,
  action,
  starting = "STARTING",
  completed = "COMPLETED",
  failed = "FAILED",
}: ProgressTexts<R>) {
  process.stdout.write(progressBadge(starting) + " " + subject);
  try {
    const result = await action();
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(completedBadge(completed) + " " + subject + "\n");
    return result;
  } catch (err) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stderr.write(failedBadge(failed) + " " + subject + "\n");
    throw err;
  }
}
