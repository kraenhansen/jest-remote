// A simple Node.js client CLI to spawn a Remote Client

import { JestRemoteClient } from "./node/index.js";

export async function run() {
  const client = new JestRemoteClient();
  await client.connect();
  client.on("connection", () => {
    console.log("🔌  Connected");
  });
  client.on("disconnection", () => {
    console.log("😞  Disconnected");
  });
}
