import { ClientEventEmitter } from "./ClientEventEmitter.js";
import { ReconnectingSocket } from "./ReconnectingSocket.js";

export type Config = {
  address: string;
  autoConnect: boolean;
  reconnect: boolean;
  reconnectDelay: number;
};

const DEFAULT_CONFIG: Config = {
  address: "ws://localhost:8090",
  autoConnect: false,
  reconnect: true,
  reconnectDelay: 1000,
};

export class Client extends ClientEventEmitter {
  private config: Config;
  #socket: ReconnectingSocket;

  constructor(config: Partial<Config> = DEFAULT_CONFIG) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.#socket = new ReconnectingSocket(
      this.config.address,
      this.config.reconnect,
      this.config.reconnectDelay
    );
    if (this.config.autoConnect) {
      this.connect().catch(console.error);
    }
  }

  async connect(): Promise<void> {
    await this.#socket.connect();
    console.log("Connected!");
  }
}
