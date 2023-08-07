import WebSocket from "isomorphic-ws";
import { ClientEventEmitter } from "./ClientEventEmitter";

export class ReconnectingSocket {
  #socket: WebSocket | null = null;

  constructor(
    private eventEmitter: ClientEventEmitter,
    private handleMessage: (data: WebSocket.Data) => void,
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
        this.handleClose(code, reason).then(resolve, reject);
      });
      this.#socket.on("message", this.handleMessage);
    });
  }

  send(message: string | Record<string, unknown>) {
    if (typeof message === "string") {
      if (this.#socket) {
        const { readyState } = this.#socket;
        if (readyState === WebSocket.OPEN) {
          this.#socket.send(message);
        } else {
          throw new Error(
            `Expected an open socket (ready state = ${readyState})`
          );
        }
      } else {
        throw new Error("Expected a open socket");
      }
    } else {
      this.send(JSON.stringify(message));
    }
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

  private async handleClose(code: number, reason: unknown) {
    // Forget about the socket
    this.#socket = null;
    console.log(
      `WebSocket closed: ${reason || "Unknown reason"} (code = ${code})`
    );
    if (this.reconnect) {
      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, this.delay));
      console.log("... reconnecting");
      await this.connect();
    }
  }
}
