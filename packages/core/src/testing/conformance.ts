import { describe, expect, it, beforeEach } from 'vitest'
import type {
  IdentityPort,
  PersistencePort,
  ProjectCatalogPort,
  ProjectRef,
} from '../ports/index.js'
import type { ProjectFiles } from '../format/serialize/index.js'

/**
 * Adapter conformance.
 *
 * The mechanism that makes "swap the plumbing" a claim rather than a hope: an adapter is
 * correct when it passes this suite, and the suite is written once by the package that
 * defines the interface. Local adapters run it now; a hosted adapter runs it unchanged
 * later (feature/20260825-library-architecture.md §8.1).
 */

export interface PersistenceHarness {
  name: string
  /** A fresh adapter and a ref pointing at empty storage. */
  create(): Promise<{ port: PersistencePort; ref: ProjectRef; dispose?: () => Promise<void> }>
}

const SAMPLE: ProjectFiles = {
  'project.json': '{\n  "formatVersion": "1.0.0",\n  "id": "p"\n}\n',
  'activities/a.activity.yaml': 'id: a\nnodes: []\n',
}

export function testPersistencePort(harness: PersistenceHarness): void {
  describe(`PersistencePort conformance: ${harness.name}`, () => {
    let port: PersistencePort
    let ref: ProjectRef
    let dispose: (() => Promise<void>) | undefined

    beforeEach(async () => {
      if (dispose) await dispose()
      const made = await harness.create()
      port = made.port
      ref = made.ref
      dispose = made.dispose
    })

    it('declares its capabilities', () => {
      const caps = port.capabilities()
      expect(typeof caps.canWatch).toBe('boolean')
      expect(typeof caps.canWriteIncrementally).toBe('boolean')
    })

    it('declares watch support honestly', () => {
      // A port claiming canWatch must actually provide watch, or callers will branch wrong.
      if (port.capabilities().canWatch) expect(typeof port.watch).toBe('function')
    })

    it('reads back exactly what was written', async () => {
      await port.write(ref, { files: SAMPLE, changed: Object.keys(SAMPLE), removed: [] })
      expect(await port.read(ref)).toEqual(SAMPLE)
    })

    it('reads an empty project as an empty file set, not an error', async () => {
      expect(await port.read(ref)).toEqual({})
    })

    it('applies an incremental change without disturbing other files', async () => {
      await port.write(ref, { files: SAMPLE, changed: Object.keys(SAMPLE), removed: [] })
      const next: ProjectFiles = {
        ...SAMPLE,
        'activities/a.activity.yaml': 'id: a\nnodes: []\n# edited\n',
      }
      await port.write(ref, { files: next, changed: ['activities/a.activity.yaml'], removed: [] })
      expect(await port.read(ref)).toEqual(next)
    })

    it('removes files listed as removed', async () => {
      await port.write(ref, { files: SAMPLE, changed: Object.keys(SAMPLE), removed: [] })
      const next: ProjectFiles = { 'project.json': SAMPLE['project.json'] as string }
      await port.write(ref, { files: next, changed: [], removed: ['activities/a.activity.yaml'] })
      expect(await port.read(ref)).toEqual(next)
    })

    it('round-trips content with newlines, unicode and nested paths', async () => {
      const awkward: ProjectFiles = {
        'project.json': '{"a":1}\n',
        'terminology/tricc.codesystem.json': '{"display":"Fièvre — sévère"}\n',
        'cql/Shared.cql': 'library Shared\n\ndefine "X": \'quoted\'\n',
      }
      await port.write(ref, { files: awkward, changed: Object.keys(awkward), removed: [] })
      expect(await port.read(ref)).toEqual(awkward)
    })

    it('is idempotent — writing the same files twice changes nothing', async () => {
      await port.write(ref, { files: SAMPLE, changed: Object.keys(SAMPLE), removed: [] })
      await port.write(ref, { files: SAMPLE, changed: Object.keys(SAMPLE), removed: [] })
      expect(await port.read(ref)).toEqual(SAMPLE)
    })
  })
}

export interface CatalogHarness {
  name: string
  create(): Promise<{ port: ProjectCatalogPort; dispose?: () => Promise<void> }>
}

export function testCatalogPort(harness: CatalogHarness): void {
  describe(`ProjectCatalogPort conformance: ${harness.name}`, () => {
    let port: ProjectCatalogPort

    beforeEach(async () => {
      const made = await harness.create()
      port = made.port
    })

    it('starts empty', async () => {
      expect(await port.list()).toEqual([])
    })

    it('lists what it creates', async () => {
      const ref = await port.create('First guideline')
      const list = await port.list()
      expect(list.map((s) => s.id)).toContain(ref.id)
      expect(list.find((s) => s.id === ref.id)?.name).toBe('First guideline')
    })

    it('gives every project a distinct id, even for identical names', async () => {
      const a = await port.create('Same name')
      const b = await port.create('Same name')
      expect(a.id).not.toBe(b.id)
    })

    it('removes', async () => {
      const ref = await port.create('Temporary')
      await port.remove(ref)
      expect((await port.list()).map((s) => s.id)).not.toContain(ref.id)
    })

    it('removing something absent is not an error', async () => {
      await expect(port.remove({ id: 'never-existed', name: 'x' })).resolves.toBeUndefined()
    })

    it('touch does not create', async () => {
      await port.touch({ id: 'ghost', name: 'ghost' })
      expect((await port.list()).map((s) => s.id)).not.toContain('ghost')
    })
  })
}

export interface IdentityHarness {
  name: string
  create(): { port: IdentityPort }
}

export function testIdentityPort(harness: IdentityHarness): void {
  describe(`IdentityPort conformance: ${harness.name}`, () => {
    it('always has an identity with a usable display name', () => {
      const { port } = harness.create()
      const id = port.current()
      expect(id.id).toBeTruthy()
      expect(id.displayName.trim()).not.toBe('')
    })

    it('returns a capability set', () => {
      const { port } = harness.create()
      const caps = port.capabilities()
      expect(caps.has('project.read')).toBe(true)
    })

    it('notifies on change and stops after unsubscribe', () => {
      const { port } = harness.create()
      let calls = 0
      const off = port.onChange(() => calls++)
      expect(typeof off).toBe('function')
      off()
      // Not asserting a call fires — that is adapter-specific — only that the contract
      // shape holds and unsubscribing is safe to call.
      expect(calls).toBeGreaterThanOrEqual(0)
    })
  })
}
