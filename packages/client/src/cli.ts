// A simple Node.js client CLI to spawn a Remote Client

import { JestRemoteClient } from "./node/index.js";

export async function run() {
  const client = new JestRemoteClient();
  client.on("connected", () => {
    console.log("🔌  Connected");
  });
  client.on("disconnected", () => {
    console.log("😞  Disconnected");
  });
  await client.connect();
}
