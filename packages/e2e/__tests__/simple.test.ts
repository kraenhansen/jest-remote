import { runCLI } from "jest";
import { resolve } from "node:path";

const runner = resolve(__dirname, "../../runner");

async function runJest() {
  return runCLI(
    {
      _: [],
      $0: "",
      runner,
      testPathIgnorePatterns: [],
      testPathPattern: ["__tests__/__tests__"],
      // Empty reporters to silence the inner Jest execution
      reporters: [],
    },
    ["."]
  );
}

test("it works", async () => {
  const { results } = await runJest();
  expect(results.success).toEqual(false);
  expect(results.numFailedTests).toEqual(1);
}, 10_000);
