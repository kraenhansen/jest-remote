import { WebSocketServer, WebSocket } from "ws";

import {
  ClientActionName,
  ClientActions,
  ServerActionName,
  ServerActions,
} from "jest-runner-remote-protocol";

export type ServerConfig = {
  port: number;
  actions: ServerActions;
};

// TODO: Register listener for messages and call into config.actions

export class Server {
  #server: WebSocketServer | null = null;

  constructor(private config: ServerConfig) {}

  async start() {
    await new Promise<void>((resolve) => {
      this.#server = new WebSocketServer(
        { port: this.config.port, clientTracking: true },
        resolve
      );
    });
  }

  async stop() {
    await new Promise<void>((resolve, reject) => {
      if (this.#server) {
        this.#server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
        this.#server = null;
      }
    });
  }

  async waitForClient() {
    return new Promise<void>((resolve) => {
      if (this.#server) {
        if (this.#server.clients.size > 0) {
          resolve();
        } else {
          this.#server.once("connection", resolve);
        }
      } else {
        throw new Error("Expected a running server");
      }
    });
  }

  async waitForAction(client: WebSocket, action: ServerActionName) {
    return new Promise((resolve, reject) => {
      client.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.action === action) {
          resolve(message);
        }
      });
      client.once("close", () => {
        const err = new Error(`Socket closed while waiting for '${action}'`);
        reject(err);
      });
      client.once("error", (cause) => {
        const err = new Error(`Socket errored while waiting for '${action}'`, {
          cause,
        });
        reject(err);
      });
    });
  }

  async send<ActionName extends ClientActionName>(
    socket: WebSocket,
    action: ActionName,
    ...args: Parameters<ClientActions[ActionName]>
  ) {
    await new Promise<void>((resolve, reject) => {
      socket.send(JSON.stringify({ action, args }), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  get url(): string {
    const address = this.server.address();
    if (typeof address === "string") {
      return address;
    } else {
      const { family, address: host, port } = address;
      return `ws://${family === "IPv6" ? `[${host}]` : host}:${port}`;
    }
  }

  get clients(): ReadonlySet<WebSocket> {
    return this.server.clients;
  }

  private get server(): WebSocketServer {
    if (this.#server) {
      return this.#server;
    } else {
      throw new Error("Expected a running server");
    }
  }
}
