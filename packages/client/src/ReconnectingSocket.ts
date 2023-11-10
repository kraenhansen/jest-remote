import { WebSocket, Data as WebSocketData } from "isomorphic-ws";

import type { ServerActions, ServerActionName } from "jest-remote-protocol";
import { serialize } from "jest-remote-protocol";

import { ClientEventEmitter } from "./ClientEventEmitter";

export type Handler = {
  handleMessage: (data: WebSocketData) => void;
  handleClose: (code: number, reason?: string) => void;
};

export class ReconnectingSocket {
  #socket: WebSocket | null = null;

  constructor(
    private eventEmitter: ClientEventEmitter,
    private handler: Handler,
    private address: string,
    private reconnect: boolean,
    private delay: number
  ) {}

  async connect(): Promise<void> {
    await new Promise((resolve, reject) => {
      this.#socket = new WebSocket(this.address);
      this.#socket.on("open", this.handleOpen);
      this.#socket.once("open", resolve);
      this.#socket.once("error", (err) => {
        if (!this.reconnect) {
          // Shouldn't be rejected if we're expecting a reconnect
          reject(err);
        }
      });
      this.#socket.once("close", (code, reason) => {
        this.handleClose(
          code,
          reason instanceof Buffer ? reason.toString() : undefined
        ).then(resolve, reject);
      });
      this.#socket.on("message", this.handler.handleMessage);
    });
  }

  async send<ActionName extends ServerActionName>(
    action: ActionName,
    ...args: Parameters<ServerActions[ActionName]>
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (this.#socket) {
        const { readyState } = this.#socket;
        if (readyState === WebSocket.OPEN) {
          this.#socket.send(serialize({ action, args }), (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          throw new Error(
            `Expected an open socket (ready state = ${readyState})`
          );
        }
      } else {
        throw new Error("Expected a open socket");
      }
    });
  }

  disconnect(code = 1000, reason?: string) {
    this.reconnect = false;
    if (this.#socket) {
      this.#socket.close(code, reason);
    }
  }

  private handleOpen = (ws: WebSocket) => {
    this.eventEmitter.emit("connected", ws);
  };

  private async handleClose(code: number, reason?: string) {
    // Forget about the socket
    this.#socket = null;
    this.handler.handleClose(code, reason);
    if (this.reconnect) {
      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, this.delay));
      console.log("... reconnecting");
      await this.connect();
    }
  }
}
