import { describe, expect, it, vi } from 'vitest'
import type { Discussion, Identity, Project } from '../model/types.js'
import type { IdentityPort } from '../ports/identity.js'
import type { ProjectCatalogPort, ProjectSummary } from '../ports/catalog.js'
import { ALL_CAPABILITIES } from '../document/doc.js'
import { attentionFor } from '../discussion/attention.js'
import { sampleProject } from '../format/__fixtures__.js'
import { DerivedNotifications, memoryReadState } from './derived.js'

const ME = { id: 'u-me', name: 'Ada' }
const BOB = { id: 'u-bob', name: 'Bob' }

function discussion(over: Partial<Discussion> = {}): Discussion {
  return {
    id: 'd1',
    about: { kind: 'activity', activityId: 'triage' },
    label: 'Triage',
    status: 'open',
    labels: [],
    comments: [],
    events: [],
    ...over,
  }
}

describe('attentionFor', () => {
  it('lists a tag by someone else, newest first, with a plain excerpt', () => {
    const d = discussion({
      comments: [
        { id: 'c1', author: BOB, at: '2026-11-01T10:00:00Z', text: 'Hi @[Ada](user:u-me) see' },
        { id: 'c2', author: BOB, at: '2026-11-02T10:00:00Z', text: '@[Ada](user:u-me) again' },
        { id: 'c3', author: BOB, at: '2026-11-03T10:00:00Z', text: 'nobody tagged' },
      ],
    })
    const items = attentionFor([d], { id: ME.id }, 'p1')
    expect(items.map((n) => n.id)).toEqual(['p1:d1:mention:c2', 'p1:d1:mention:c1'])
    expect(items[1]).toMatchObject({
      kind: 'mention',
      projectId: 'p1',
      title: 'Triage',
      excerpt: 'Hi @Ada see',
      by: BOB,
      read: false,
    })
  })

  it('matches a tag on the display name too, since every local author is "local"', () => {
    const d = discussion({
      comments: [{ id: 'c1', author: BOB, at: '2026-11-01T10:00:00Z', text: '@[ada ](user:x)' }],
    })
    expect(attentionFor([d], { id: 'local', name: 'Ada' }, 'p1')).toHaveLength(1)
    expect(attentionFor([d], { id: 'local', name: 'Grace' }, 'p1')).toHaveLength(0)
  })

  it('ignores own comments, deleted comments, and settled discussions', () => {
    const tag = '@[Ada](user:u-me)'
    const at = '2026-11-01T10:00:00Z'
    const mine = discussion({ comments: [{ id: 'c', author: ME, at, text: tag }] })
    const gone = discussion({ comments: [{ id: 'c', author: BOB, at, text: tag, deleted: true }] })
    const done = discussion({
      status: 'resolved',
      comments: [{ id: 'c', author: BOB, at, text: tag }],
    })
    expect(attentionFor([mine, gone, done], { id: ME.id }, 'p1')).toEqual([])
  })

  it('lists a discussion assigned to the author', () => {
    const d = discussion({
      assignee: ME,
      events: [{ at: '2026-11-02T08:00:00Z', by: BOB, assignee: ME }],
    })
    expect(attentionFor([d], { id: ME.id }, 'p1')).toEqual([
      expect.objectContaining({ id: 'p1:d1:assigned', kind: 'assigned', by: BOB }),
    ])
  })
})

function identity(who: Identity): IdentityPort {
  return {
    current: () => who,
    capabilities: () => ALL_CAPABILITIES,
    onChange: () => () => {},
  }
}

function catalog(rows: ProjectSummary[]): ProjectCatalogPort {
  return {
    list: async () => rows,
    create: async (name) => ({ id: name, name }),
    open: async () => undefined,
    remove: async () => {},
    rename: async () => {},
    touch: async () => {},
    describe: async () => {},
  }
}

function tagged(project: Project): Project {
  project.discussions = {
    d1: discussion({
      comments: [{ id: 'c1', author: BOB, at: '2026-11-01T10:00:00Z', text: '@[Ada](user:u-me)' }],
    }),
  }
  return project
}

describe('DerivedNotifications', () => {
  const who = identity({ id: ME.id, displayName: ME.name })
  const homeRow = (id: string, at: number): ProjectSummary => ({
    id,
    name: id,
    attention: [{ id: `${id}:x`, kind: 'mention', projectId: id, title: 't', at, read: false }],
  })

  it('home scope lists every project from the catalog; project scope only that one', async () => {
    const port = new DerivedNotifications(catalog([homeRow('a', 1), homeRow('b', 2)]), who)
    expect((await port.list({})).map((n) => n.projectId)).toEqual(['b', 'a'])
    expect((await port.list({ projectId: 'a' })).map((n) => n.projectId)).toEqual(['a'])
  })

  it('reads an attached project live, not the catalog', async () => {
    const port = new DerivedNotifications(catalog([homeRow('p', 1)]), who)
    const project = tagged(sampleProject())
    const listeners = new Set<() => void>()
    const cb = vi.fn()
    port.subscribe({ projectId: 'p' }, cb)
    const detach = port.attach('p', {
      snapshot: () => project,
      subscribe: (l) => (listeners.add(l), () => listeners.delete(l)),
    })
    expect(cb).toHaveBeenCalled()
    expect((await port.list({ projectId: 'p' })).map((n) => n.id)).toEqual(['p:d1:mention:c1'])
    detach()
    expect((await port.list({ projectId: 'p' })).map((n) => n.id)).toEqual(['p:x'])
  })

  it('remembers what was read, in the read-state store', async () => {
    const store = memoryReadState()
    const port = new DerivedNotifications(catalog([homeRow('a', 1)]), who, store)
    const cb = vi.fn()
    port.subscribe({}, cb)
    await port.markRead(['a:x'])
    expect(cb).toHaveBeenCalledTimes(1)
    expect((await port.list({}))[0]?.read).toBe(true)
    expect(store.load()).toEqual(['a:x'])
    const again = new DerivedNotifications(catalog([homeRow('a', 1)]), who, store)
    expect((await again.list({}))[0]?.read).toBe(true)
  })
})
