/**
 * Helper class to queue and process entities for migration purposes.
 */
class HexxenUpdateQueue {

  /**
   * Enqueues a callback function and starts processing the queue if not already running.
   *
   * @param {Function} fn callback function to run
   */
  static enqueue(fn) {
    if (! this.queue) this.queue = [];
    this.queue.push(fn);
    this._processQueue();
  }

  static async _processQueue() {
    if (this.running) return; // queue already running, ignore
    this.running = true;

    // console.log("Starting queue");
    await this._wait(500); // FIXME: workaround for FVTT#3107: delay start to allow FVTT to be completely initialized

    let idx = 0;
    do {
      // console.log("pre", idx, "/", this.queue.length);
      const curr = this.queue.shift();
      await curr();
      // console.log("post", idx);
      idx++;
      // await this._wait(100); // FIXME: workaround for FVTT#3407: delay to avoid data loss
    } while (this.queue.length > 0);

    this.running = false;
    // console.log("Queue done");
  }

  static async _wait(timeout) {
    await new Promise(resolverFn => setTimeout(resolverFn, timeout));
  }
}

/**
 * Helper for logging update data for Actors.
 */
// Hooks.on("preUpdateActor", function(...args) {
//   console.log(...args);
//   return true;
// });

/**
 * Helper for logging update data for OwnedItems.
 */
// Hooks.on("preUpdateOwnedItem", function(...args) {
//   console.log(...args);
//   return true;
// });

/**
 * Helper for logging update data for Items.
 */
// Hooks.on("preUpdateItem", function(...args) {
//   console.log(...args);
//   return true;
// });
