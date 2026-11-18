import { describe, expect, it, vi } from 'vitest'
import { requestDurableStorage, storageDurability } from './storage-durability.js'

describe('storage durability', () => {
  it('is unknown when the browser has no StorageManager', async () => {
    expect(await storageDurability(undefined)).toBe('unknown')
    expect(await requestDurableStorage(undefined)).toBe('unknown')
    expect(await requestDurableStorage({})).toBe('unknown')
  })

  it('does not ask again once the storage is persisted', async () => {
    const persist = vi.fn(async () => true)
    const storage = { persisted: async () => true, persist }
    expect(await requestDurableStorage(storage)).toBe('persisted')
    expect(persist).not.toHaveBeenCalled()
  })

  it('asks for best-effort storage and reports the answer', async () => {
    expect(
      await requestDurableStorage({ persisted: async () => false, persist: async () => true }),
    ).toBe('persisted')
    expect(
      await requestDurableStorage({ persisted: async () => false, persist: async () => false }),
    ).toBe('best-effort')
  })

  it('treats a failing call as no promise rather than an error', async () => {
    const failing = async (): Promise<boolean> => {
      throw new Error('blocked')
    }
    expect(await storageDurability({ persisted: failing })).toBe('unknown')
    expect(await requestDurableStorage({ persisted: async () => false, persist: failing })).toBe(
      'best-effort',
    )
  })
})
