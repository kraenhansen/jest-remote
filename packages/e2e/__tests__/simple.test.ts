import { runCLI } from "jest";
import { resolve } from "node:path";

const runner = resolve(__dirname, "../../runner");

async function runJest() {
  return runCLI(
    {
      runner,
      _: [],
      $0: "__tests__/__tests__/success.test.ts",
    },
    ["."]
  );
}

test("it works", async () => {
  const { results } = await runJest();
  expect(results.success).toEqual(true);
}, 10_000);
