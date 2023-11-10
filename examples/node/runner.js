import { JestRemoteClient } from "jest-remote-client";

const client = new JestRemoteClient({ autoConnect: true });

client.on("connected", () => {
  console.log("Connected!");
});

client.on("disconnected", () => {
  console.log("Disconnected!");
});

client.on("run-tests", () => {
  console.log("Running tests!");
});

client.on("run-tests-completed", () => {
  console.log("Completed running tests!");
});
