import type { TestResult } from "@jest/test-result";

interface Options {
  stats: {
    failures: number;
    passes: number;
    pending: number;
    todo: number;
    start: Date;
    end: Date;
  };
  skipped: boolean;
  errorMessage?: string | null;
  tests: Array<{
    duration?: number | null;
    errorMessage?: string;
    testPath?: string;
    title?: string;
  }>;
  jestTestPath: string;
}
function getSnapshot(): TestResult["snapshot"] {
  return {
    added: 0,
    fileDeleted: false,
    matched: 0,
    unchecked: 0,
    uncheckedKeys: [],
    unmatched: 0,
    updated: 0,
  };
}

function getPerfStats({ stats }: Options): TestResult["perfStats"] {
  const start = stats.start.getTime();
  const end = stats.end.getTime();
  const runtime = end - start;
  // Note: this flag is set in 'lib/createJestRunner.ts'
  const slow = false;
  return { start, end, runtime, slow };
}

function getTestResults({
  errorMessage,
  tests,
  jestTestPath,
}: Options): TestResult["testResults"] {
  return tests.map((test) => {
    const actualErrorMessage = errorMessage || test.errorMessage;

    return {
      ancestorTitles: [],
      duration: test.duration,
      failureDetails: [],
      failureMessages: actualErrorMessage ? [actualErrorMessage] : [],
      fullName: jestTestPath || test.testPath || "",
      numPassingAsserts: test.errorMessage ? 1 : 0,
      status: test.errorMessage ? "failed" : "passed",
      title: test.title || "",
    };
  });
}

export default function toTestResult(options: Options): TestResult {
  const { stats, skipped, errorMessage, jestTestPath } = options;
  return {
    failureMessage: errorMessage,
    leaks: false,
    numFailingTests: stats.failures,
    numPassingTests: stats.passes,
    numPendingTests: stats.pending,
    numTodoTests: stats.todo,
    openHandles: [],
    perfStats: getPerfStats(options),
    skipped,
    snapshot: getSnapshot(),
    testFilePath: jestTestPath,
    testResults: getTestResults(options),
  };
}
