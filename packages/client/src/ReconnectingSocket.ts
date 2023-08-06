import WebSocket from "isomorphic-ws";

export class ReconnectingSocket {
  #socket: WebSocket | null = null;

  constructor(
    private address: string,
    private reconnect: boolean,
    private delay: number
  ) {}

  async connect(): Promise<void> {
    await new Promise((resolve, reject) => {
      this.#socket = new WebSocket(this.address);
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
    });
  }

  private async handleClose(code: number, reason: unknown) {
    // Forget about the socket
    this.#socket = null;
    console.log("WebSocket closed!");
    if (this.reconnect) {
      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, this.delay));
      console.log("... reconnecting");
      await this.connect();
    }
  }
}
