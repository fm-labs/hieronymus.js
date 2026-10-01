type Listener = (...args: any[]) => void

export class EventBus {
  private listeners: { [event: string]: Listener[] } = {}

  // Subscribe to an event
  on(event: string, listener: Listener): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    //console.log('EventBus.on', event, listener)
    this.listeners[event].push(listener)
  }

  // Unsubscribe from an event
  off(event: string, listener: Listener): void {
    const eventListeners = this.listeners[event]
    if (eventListeners) {
      const index = eventListeners.indexOf(listener)
      if (index !== -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  // Dispatch an event
  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners[event] || []
    //console.log('EventBus.emit', event, args, eventListeners.length)
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(...args)
      }
    }
  }
}
