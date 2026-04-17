import type { EventName, EventMap, EventHandler, Unsubscribe } from '../types'

type HandlerList<T extends EventName> = EventHandler<T>[]
type Listeners = { [K in EventName]?: HandlerList<K> }

export interface Emitter {
  on<T extends EventName>(name: T, handler: EventHandler<T>): Unsubscribe
  off<T extends EventName>(name: T, handler?: EventHandler<T>): void
  emit<T extends EventName>(name: T, payload: EventMap[T]): void
}

export function createEmitter(): Emitter {
  const listeners: Listeners = {}

  return {
    on(name, handler) {
      const list = (listeners[name] ??= [] as unknown as HandlerList<typeof name>) as HandlerList<
        typeof name
      >
      list.push(handler)
      return () => {
        const current = listeners[name] as HandlerList<typeof name> | undefined
        if (!current) return
        listeners[name] = current.filter((h) => h !== handler) as typeof current
      }
    },

    off(name, handler) {
      if (!handler) {
        delete listeners[name]
        return
      }
      const current = listeners[name] as HandlerList<typeof name> | undefined
      if (!current) return
      listeners[name] = current.filter((h) => h !== handler) as typeof current
    },

    emit(name, payload) {
      const list = listeners[name] as HandlerList<typeof name> | undefined
      if (!list) return
      for (const h of list) {
        try {
          h(payload)
        } catch {
          // swallow — one bad handler shouldn't break the rest
        }
      }
    },
  }
}
