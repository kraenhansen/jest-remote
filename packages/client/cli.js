#!/usr/bin/env -S node
/* eslint-env node */
import { run } from "./dist/cli.js";
run().catch((err) => {
  console.error(
    `Failed to run Jest Runner Remote Client CLI: ${
      err instanceof Error ? err.message : err
    }`
  );
});
