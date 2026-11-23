/**
 * One task at a time per key (overview §8): the session store queues the
 * writes of each file, so two saves of the same campaign or slice never race
 * for the rename.
 */

/** Runs `task` after every task queued earlier with the same `key`. */
export type KeyedQueue = <T>(key: string, task: () => Promise<T>) => Promise<T>;

/**
 * A new queue. Tasks with different keys run at the same time, and a task that
 * fails does not block the next one. The queue keeps one settled promise per
 * key it has seen: one per file written since the server started, a few
 * hundred at most on a local server.
 */
export function createKeyedQueue(): KeyedQueue {
  const tails = new Map<string, Promise<unknown>>();
  return <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const previous = tails.get(key) ?? Promise.resolve();
    const result = previous.then(task);
    tails.set(
      key,
      result.catch(() => undefined),
    );
    return result;
  };
}
