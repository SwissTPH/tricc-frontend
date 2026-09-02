import 'fake-indexeddb/auto'
import { describe, expect, it, beforeEach } from 'vitest'
import { testCatalogPort, testIdentityPort, testPersistencePort } from '@tricc/core/testing'
import type { ProjectFiles, ProjectRef } from '@tricc/core'
import { DownloadPersistence, FileSystemPersistence } from './persistence.js'
import { LocalProjectCatalog } from './catalog.js'
import { LocalIdentity, type PreferenceStore } from './identity.js'
import { FakeDir } from './fake-fs.js'
import { BrowserStoragePersistence, LocalPersistence } from './browser-storage.js'

// ---------------------------------------------------------------- conformance

testPersistencePort({
  name: 'FileSystemPersistence',
  create: async () => {
    const port = new FileSystemPersistence()
    const ref: ProjectRef = { id: 'fs-1', name: 'Project' }
    port.register(ref, new FakeDir())
    return { port, ref }
  },
})

let storeSeq = 0
testPersistencePort({
  name: 'BrowserStoragePersistence',
  create: async () => {
    const port = new BrowserStoragePersistence()
    const ref: ProjectRef = { id: `bs-${++storeSeq}`, name: 'Project' }
    await port.clear(ref)
    return { port, ref }
  },
})

testPersistencePort({
  name: 'LocalPersistence (browser-backed project)',
  create: async () => {
    const browser = new BrowserStoragePersistence()
    const port = new LocalPersistence(new FileSystemPersistence(), browser)
    const ref: ProjectRef = { id: `lp-${++storeSeq}`, name: 'Project' }
    await browser.clear(ref)
    return { port, ref }
  },
})

testPersistencePort({
  name: 'LocalPersistence (folder-backed project)',
  create: async () => {
    const port = new LocalPersistence(new FileSystemPersistence(), new BrowserStoragePersistence())
    const ref: ProjectRef = { id: `lpf-${++storeSeq}`, name: 'Project', handle: new FakeDir() }
    return { port, ref }
  },
})

testPersistencePort({
  name: 'DownloadPersistence',
  create: async () => ({ port: new DownloadPersistence(), ref: { id: 'dl-1', name: 'Project' } }),
})

let catalogSeq = 0
testCatalogPort({
  name: 'LocalProjectCatalog',
  create: async () => {
    // fake-indexeddb persists across tests in a run, so each harness gets its own ids and
    // the store is drained first - otherwise "starts empty" would depend on test order.
    const port = new LocalProjectCatalog(() => `cat-${++catalogSeq}`)
    for (const p of await port.list()) await port.remove(p)
    return { port }
  },
})

function memoryPrefs(): PreferenceStore {
  const map = new Map<string, string>()
  return { get: (k) => map.get(k) ?? null, set: (k, v) => void map.set(k, v) }
}

testIdentityPort({
  name: 'LocalIdentity',
  create: () => ({ port: new LocalIdentity(memoryPrefs()) }),
})

// ---------------------------------------------------------------- behaviour

describe('FileSystemPersistence', () => {
  let root: FakeDir
  let port: FileSystemPersistence
  const ref: ProjectRef = { id: 'p', name: 'Project' }

  beforeEach(() => {
    root = new FakeDir()
    port = new FileSystemPersistence()
    port.register(ref, root)
  })

  const files: ProjectFiles = {
    'project.json': '{"id":"p"}\n',
    'activities/a.activity.yaml': 'id: a\n',
    'terminology/t.codesystem.json': '{}\n',
  }

  it('creates nested directories on write', async () => {
    await port.write(ref, { files, changed: Object.keys(files), removed: [] })
    expect(await port.read(ref)).toEqual(files)
  })

  it('writes only the files named as changed', async () => {
    await port.write(ref, { files, changed: Object.keys(files), removed: [] })
    const before = root.clock

    const next = { ...files, 'activities/a.activity.yaml': 'id: a\n# edited\n' }
    await port.write(ref, { files: next, changed: ['activities/a.activity.yaml'], removed: [] })

    // One file written means the clock advanced once, not three times. This is what keeps
    // git history clean: untouched activities must not be rewritten.
    expect(root.clock).toBe(before + 1)
    expect(await port.read(ref)).toEqual(next)
  })

  it('reports a file changed outside the tool', async () => {
    await port.write(ref, { files, changed: Object.keys(files), removed: [] })
    expect(await port.externallyChanged(ref)).toEqual([])

    root.externalWrite('activities/a.activity.yaml', 'id: a\n# changed by git pull\n')
    expect(await port.externallyChanged(ref)).toEqual(['activities/a.activity.yaml'])
  })

  it('reports a file deleted outside the tool', async () => {
    await port.write(ref, { files, changed: Object.keys(files), removed: [] })
    await (await root.getDirectoryHandle('activities')).removeEntry('a.activity.yaml')
    expect(await port.externallyChanged(ref)).toEqual(['activities/a.activity.yaml'])
  })

  it('requests permission when it is not already granted', async () => {
    root.permission = 'prompt'
    await port.write(ref, { files, changed: Object.keys(files), removed: [] })
    expect(root.permission).toBe('granted')
  })

  it('fails with an actionable message when permission is refused', async () => {
    root.permission = 'prompt'
    root.grantOnRequest = false
    await expect(
      port.write(ref, { files, changed: Object.keys(files), removed: [] }),
    ).rejects.toThrow(/reopen it to continue/)
  })

  it('explains an unregistered project rather than throwing something opaque', async () => {
    const fresh = new FileSystemPersistence()
    await expect(fresh.read({ id: 'nope', name: 'Missing' })).rejects.toThrow(/reopen the folder/)
  })

  it('declares that it can watch and write incrementally', () => {
    expect(port.capabilities()).toEqual({ canWatch: true, canWriteIncrementally: true })
  })
})

describe('DownloadPersistence', () => {
  it('declares that it cannot watch or write incrementally', () => {
    // The UI adapts to declared capability rather than sniffing the environment, so this
    // being honest is what keeps the storage-mode indicator correct.
    expect(new DownloadPersistence().capabilities()).toEqual({
      canWatch: false,
      canWriteIncrementally: false,
    })
  })

  it('replaces the whole file set on write, dropping removed files', async () => {
    const port = new DownloadPersistence()
    const ref: ProjectRef = { id: 'd', name: 'D' }
    await port.write(ref, { files: { a: '1', b: '2' }, changed: ['a', 'b'], removed: [] })
    await port.write(ref, { files: { a: '1' }, changed: [], removed: ['b'] })
    expect(await port.read(ref)).toEqual({ a: '1' })
  })

  it('can be seeded from an uploaded archive', async () => {
    const port = new DownloadPersistence()
    const ref: ProjectRef = { id: 'd', name: 'D' }
    port.load(ref, { 'project.json': '{}' })
    expect(await port.read(ref)).toEqual({ 'project.json': '{}' })
  })
})

describe('LocalIdentity', () => {
  it('has a usable default with no stored preference', () => {
    expect(new LocalIdentity(memoryPrefs()).current().displayName).toBe('Local author')
  })

  it('persists a display name', () => {
    const prefs = memoryPrefs()
    new LocalIdentity(prefs).update({ displayName: 'Dr Smith', email: 'x@y.z' })
    const reloaded = new LocalIdentity(prefs)
    expect(reloaded.current().displayName).toBe('Dr Smith')
    expect(reloaded.current().email).toBe('x@y.z')
  })

  it('survives a corrupt stored preference', () => {
    const prefs = memoryPrefs()
    prefs.set('tricc.identity', 'not json')
    expect(new LocalIdentity(prefs).current().displayName).toBe('Local author')
  })

  it('never grants project.share, which has no meaning without a server', () => {
    expect(new LocalIdentity(memoryPrefs()).capabilities().has('project.share')).toBe(false)
  })

  it('grants write by default and drops it in read-only mode', () => {
    const identity = new LocalIdentity(memoryPrefs())
    expect(identity.capabilities().has('project.write')).toBe(true)
    identity.setReadOnly(true)
    expect(identity.capabilities().has('project.write')).toBe(false)
    expect(identity.capabilities().has('project.read')).toBe(true)
    identity.setReadOnly(false)
    expect(identity.capabilities().has('project.write')).toBe(true)
  })

  it('notifies subscribers when the mode or identity changes', () => {
    const identity = new LocalIdentity(memoryPrefs())
    let calls = 0
    const off = identity.onChange(() => calls++)
    identity.setReadOnly(true)
    expect(calls).toBe(1)
    identity.setReadOnly(true) // no change, no notification
    expect(calls).toBe(1)
    identity.update({ displayName: 'Renamed' })
    expect(calls).toBe(2)
    off()
    identity.setReadOnly(false)
    expect(calls).toBe(2)
  })
})

describe('LocalPersistence routing', () => {
  it('sends a project with a folder handle to the filesystem, not to browser storage', async () => {
    const browser = new BrowserStoragePersistence()
    const folder = new FileSystemPersistence()
    const port = new LocalPersistence(folder, browser)
    const dir = new FakeDir()
    const ref: ProjectRef = { id: 'routed', name: 'Routed', handle: dir }

    await port.write(ref, {
      files: { 'project.json': '{}' },
      changed: ['project.json'],
      removed: [],
    })

    expect(await folder.read(ref)).toEqual({ 'project.json': '{}' })
    // Nothing leaked into browser storage - two copies of a project is how they diverge.
    expect(await browser.read(ref)).toEqual({})
  })

  it('reports which store backs a project', () => {
    const port = new LocalPersistence(new FileSystemPersistence(), new BrowserStoragePersistence())
    expect(port.storeFor({ id: 'a', name: 'A' })).toBe('browser')
    expect(port.storeFor({ id: 'b', name: 'B', handle: new FakeDir() })).toBe('folder')
  })

  it('reports per-project capabilities, since an author can have both at once', () => {
    const port = new LocalPersistence(new FileSystemPersistence(), new BrowserStoragePersistence())
    expect(port.capabilitiesFor({ id: 'a', name: 'A' }).canWatch).toBe(false)
    expect(port.capabilitiesFor({ id: 'b', name: 'B', handle: new FakeDir() }).canWatch).toBe(true)
  })
})

describe('LocalProjectCatalog', () => {
  it('orders by most recently opened', async () => {
    const catalog = new LocalProjectCatalog(() => `ord-${Math.random().toString(36).slice(2)}`)
    for (const p of await catalog.list()) await catalog.remove(p)

    const first = await catalog.create('First')
    const second = await catalog.create('Second')
    await catalog.touch(first)

    const list = await catalog.list()
    expect(list[0]?.id).toBe(first.id)
    expect(list.map((p) => p.id)).toContain(second.id)
  })

  it('resolves undefined when no directory picker exists', async () => {
    // Firefox and Safari: the port must report "cannot", not throw.
    expect(await new LocalProjectCatalog().open()).toBeUndefined()
  })
})
