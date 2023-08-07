import type WebSocket from "isomorphic-ws";
import type TypedEmitter from "typed-emitter";
import type EventEmitter from "events";

export enum EventName {
  Connected = "connected",
  Disconnection = "disconnected",
  /*
  Error = "error",
  RunStart = "run-start",
  TestFileStart = "test-file-start",
  TestFileFailure = "test-file-failure",
  TestFileSuccess = "test-file-success",
  TestCaseResult = "test-case-result",
  */
}
export declare type ConnectedListener = (ws: WebSocket) => void;
export declare type DisconnectedListener = (
  code?: number,
  reason?: string
) => void;

export declare type Events = {
  connected: ConnectedListener;
  disconnected: DisconnectedListener;
};

export class ClientEventEmitter implements TypedEmitter<Events> {
  /** @internal */
  static EventEmitter: typeof EventEmitter;

  #emitter = new ClientEventEmitter.EventEmitter();

  public addListener<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    this.#emitter.addListener.call(this.#emitter, event, listener);
    return this;
  }

  public removeListener<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    this.#emitter.removeListener.call(this.#emitter, event, listener);
    return this;
  }

  public removeAllListeners<E extends keyof Events>(event?: E): this {
    this.#emitter.removeAllListeners.call(this.#emitter, event);
    return this;
  }

  public on<E extends keyof Events>(event: E, listener: Events[E]): this {
    this.#emitter.on.call(this.#emitter, event, listener);
    return this;
  }

  public once<E extends keyof Events>(event: E, listener: Events[E]): this {
    this.#emitter.addListener.call(this.#emitter, event, listener);
    return this;
  }

  public off<E extends keyof Events>(event: E, listener: Events[E]): this {
    this.#emitter.addListener.call(this.#emitter, event, listener);
    return this;
  }

  public emit<E extends keyof Events>(
    event: E,
    ...args: Parameters<Events[E]>
  ): boolean {
    return this.#emitter.emit.call(this.#emitter, event, ...args);
  }

  public setMaxListeners(n: number): this {
    this.#emitter.setMaxListeners.call(this.#emitter, n);
    return this;
  }

  public getMaxListeners(): number {
    return this.#emitter.getMaxListeners.call(this.#emitter);
  }

  public listenerCount<E extends keyof Events>(event: E): number {
    return this.#emitter.listenerCount.call(this.#emitter, event);
  }

  public prependListener<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    this.#emitter.prependListener.call(this.#emitter, event, listener);
    return this;
  }

  public prependOnceListener<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    this.#emitter.prependOnceListener.call(this.#emitter, event, listener);
    return this;
  }

  public eventNames(): (keyof Events)[] {
    return Object.values(EventName);
  }

  rawListeners<E extends keyof Events>(event: E): Events[E][] {
    return this.#emitter.rawListeners.call(this.#emitter, event) as Events[E][];
  }

  listeners<E extends keyof Events>(event: E): Events[E][] {
    return this.#emitter.listeners.call(this.#emitter, event) as Events[E][];
  }
}
