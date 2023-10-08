interface EventsMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [event: string]: any;
}

interface DefaultEvents extends EventsMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [event: string]: (...args: any) => void;
}

export interface Unsubscribe {
  (): void;
}

export interface Emitter<Events extends EventsMap = DefaultEvents> {
  emit<K extends keyof Events>(
    this: this,
    event: K,
    ...args: Parameters<Events[K]>
  ): void;

  events: Partial<{ [E in keyof Events]: Events[E][] }>;
  on<K extends keyof Events>(this: this, event: K, cb: Events[K]): Unsubscribe;
}

export const createEvents = <
  Events extends EventsMap = DefaultEvents,
>(): Emitter<Events> => ({
  events: {},
  emit(event, ...args) {
    const callbacks = this.events[event] || [];
    for (let i = 0, length = callbacks.length; i < length; i++) {
      callbacks[i](...args);
    }
  },
  on(event, cb) {
    this.events[event]?.push(cb) || (this.events[event] = [cb]);
    return () => {
      this.events[event] = this.events[event]?.filter((i) => cb !== i);
    };
  },
});
