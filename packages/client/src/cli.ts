// A simple Node.js client CLI to spawn a Remote Client

import { Client } from "./Client.js";

export async function run() {
  const client = new Client();
  await client.connect();
  client.on("connection", () => {
    console.log("🔌  Connected");
  });
  client.on("disconnection", () => {
    console.log("😞  Disconnected");
  });
}
