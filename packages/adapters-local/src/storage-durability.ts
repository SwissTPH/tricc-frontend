/**
 * Whether the browser may delete what this app keeps in it.
 *
 * Without `navigator.storage.persist()`, an origin's storage is best-effort: when the disk
 * runs low, Chromium deletes the IndexedDB of best-effort origins, least recently used
 * first, and leaves localStorage behind. For a project kept only in this browser, that is
 * the whole project, gone without a word.
 */

/**
 * `persisted`: the browser will not delete it on its own. `best-effort`: it may, when disk
 * space runs low. `unknown`: this browser cannot say (no StorageManager).
 */
export type StorageDurability = 'persisted' | 'best-effort' | 'unknown'

interface StorageManagerLike {
  persist?(): Promise<boolean>
  persisted?(): Promise<boolean>
}

function manager(): StorageManagerLike | undefined {
  return (globalThis as { navigator?: { storage?: StorageManagerLike } }).navigator?.storage
}

/** What the browser currently promises, without asking for anything. */
export async function storageDurability(
  storage: StorageManagerLike | undefined = manager(),
): Promise<StorageDurability> {
  if (!storage?.persisted) return 'unknown'
  try {
    return (await storage.persisted()) ? 'persisted' : 'best-effort'
  } catch {
    return 'unknown'
  }
}

/**
 * Ask the browser to keep this origin's storage. Call it from a click where possible:
 * Firefox asks the user, and Chromium weighs how the site is used, which a user action
 * counts towards. Asking again after a grant is skipped; a refusal is not an error.
 */
export async function requestDurableStorage(
  storage: StorageManagerLike | undefined = manager(),
): Promise<StorageDurability> {
  const now = await storageDurability(storage)
  if (now !== 'best-effort' || !storage?.persist) return now
  try {
    return (await storage.persist()) ? 'persisted' : 'best-effort'
  } catch {
    return 'best-effort'
  }
}
