import type TypedEmitter from "typed-emitter";

export enum EventName {
  Connected = "connection",
  Disconnection = "disconnection",
  /*
  Error = "error",
  RunStart = "run-start",
  TestFileStart = "test-file-start",
  TestFileFailure = "test-file-failure",
  TestFileSuccess = "test-file-success",
  TestCaseResult = "test-case-result",
  */
}
export declare type ConnectionListener = (ws: WebSocket) => void;
export declare type DisconnectionListener = (
  code?: number,
  reason?: string
) => void;

export declare type Events = {
  connection: ConnectionListener;
  disconnection: DisconnectionListener;
};

type ListenerCallback<E extends keyof Events> = (
  ...args: Parameters<Events[E]>
) => void;

const remover = Symbol("remover");

export class ClientEventEmitter implements TypedEmitter<Events> {
  #listeners = {
    [EventName.Connected]: new Set<ConnectionListener>(),
    [EventName.Disconnection]: new Set<DisconnectionListener>(),
  };

  emit<E extends keyof Events>(
    event: E,
    ...args: Parameters<ListenerCallback<E>>
  ): boolean {
    const listeners = this.#listeners[event] as Set<ListenerCallback<E>>;
    for (const listener of listeners) {
      listener.call(null, ...args);
    }
    return true;
  }

  eventNames(): (string | symbol)[] {
    return Object.keys(EventName);
  }

  addListener<E extends keyof Events>(event: E, listener: Events[E]): this {
    const listeners = this.#listeners[event] as Set<Events[E]>;
    listeners.add(listener);
    return this;
  }

  once<E extends keyof Events>(event: E, listener: Events[E]): this {
    const remover = () => {};
    return this.addListener(event, listener);
  }

  removeAllListeners<E extends keyof Events>(event?: E | undefined): this {
    if (event) {
      const listeners = this.#listeners[event] as Set<Events[E]>;
      listeners.clear();
    } else {
      for (const listeners of Object.values(this.#listeners)) {
        listeners.clear();
      }
    }
    return this;
  }

  removeListener<E extends keyof Events>(event: E, listener: Events[E]): this {
    const listeners = this.#listeners[event] as Set<Events[E]>;
    listeners.delete(listener);
    return this;
  }

  on<E extends keyof Events>(event: E, listener: Events[E]): this {
    return this.addListener(event, listener);
  }

  off<E extends keyof Events>(event: E, listener: Events[E]): this {
    return this.removeListener(event, listener);
  }

  // Keeping things simple

  prependListener(): never {
    throw new Error("Method not implemented.");
  }
  prependOnceListener(): never {
    throw new Error("Method not implemented.");
  }
  rawListeners(): never {
    throw new Error("Method not implemented.");
  }
  listeners(): never {
    throw new Error("Method not implemented.");
  }
  listenerCount(): never {
    throw new Error("Method not implemented.");
  }
  getMaxListeners(): never {
    throw new Error("Method not implemented.");
  }
  setMaxListeners(): never {
    throw new Error("Method not implemented.");
  }
}
