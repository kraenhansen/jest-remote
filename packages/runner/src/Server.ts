import { strict as assert } from "assert";

import { WebSocketServer, WebSocket, RawData } from "ws";

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

export class Server {
  #server: WebSocketServer | null = null;

  constructor(private config: ServerConfig) {}

  async start() {
    await new Promise<void>((resolve) => {
      this.#server = new WebSocketServer(
        { port: this.config.port, clientTracking: true },
        resolve
      );
      this.#server.on("connection", this.handleConnection);
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

  private handleConnection = (client: WebSocket) => {
    client.on("message", this.handleMessage);
  };

  private handleMessage = (data: RawData) => {
    const { action, args } = JSON.parse(data.toString("utf8"));
    assert(action in this.config.actions);
    this.callAction(action, ...args);
  };

  private callAction<
    ActionName extends keyof ServerActions,
    ActionParameters extends Parameters<ServerActions[ActionName]>
  >(actionName: ActionName, ...args: ActionParameters): void {
    if (actionName in this.config.actions) {
      const action = this.config.actions[actionName] as (
        this: void,
        ...args: ActionParameters
      ) => void;
      action(...args);
    } else {
      throw new Error(`Unexpected action: ${actionName}`);
    }
  }
}
