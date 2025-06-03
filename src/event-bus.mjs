// Event Bus implementation
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - The name of the event to subscribe to
   * @param {Function} callback - The callback function to execute when the event is emitted
   * @returns {Function} A function to unsubscribe from the event
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    const eventListeners = this.listeners.get(eventName);
    eventListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = eventListeners.indexOf(callback);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event with data
   * @param {string} eventName - The name of the event to emit
   * @param {any} data - The data to pass to the event listeners
   * @returns {Array<Promise|void>} Array of promises from async callbacks or undefined values from sync callbacks
   */
  emit(eventName, data) {
    const eventListeners = this.listeners.get(eventName);
    if (!eventListeners || eventListeners.length === 0) {
      return [];
    }
    
    return eventListeners.map(callback => callback(data));
  }

  /**
   * Emit an event and wait for all async callbacks to complete
   * @param {string} eventName - The name of the event to emit
   * @param {any} data - The data to pass to the event listeners
   * @returns {Promise<void>} Promise that resolves when all callbacks have completed
   */
  async emitAsync(eventName, data) {
    const results = this.emit(eventName, data);
    await Promise.all(results.filter(result => result instanceof Promise));
  }

  /**
   * Remove all listeners for a specific event
   * @param {string} eventName - The name of the event to clear listeners for
   */
  clearListeners(eventName) {
    this.listeners.delete(eventName);
  }

  /**
   * Remove all event listeners
   */
  clearAllListeners() {
    this.listeners.clear();
  }
}
