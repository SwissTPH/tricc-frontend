import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  ProjectDocument,
  createActivity,
  createProject,
  createTriccRuntime,
  type CapabilitySet,
  type CollaborationPort,
  type CollaborationSession,
  type IdentityPort,
  type PersistencePort,
  type ProjectCatalogPort,
  type ProjectRef,
} from './index.js'

/**
 * Two clients share one already-seeded document. A local update is forwarded to the other
 * client and never echoed back onto itself.
 */
class SharedDocument implements CollaborationPort {
  readonly id = 'shared-test'
  private readonly doc = new Y.Doc()
  private readonly clients = new Set<Y.Doc>()

  seed(state: Uint8Array): void {
    Y.applyUpdate(this.doc, state)
  }

  async connect(doc: Y.Doc, _ref: ProjectRef): Promise<CollaborationSession> {
    const fromClient = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return
      Y.applyUpdate(this.doc, update, 'from-client')
      for (const other of this.clients) {
        if (other !== doc) Y.applyUpdate(other, update, 'remote')
      }
    }
    doc.on('update', fromClient)
    this.clients.add(doc)
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(this.doc), 'remote')
    return {
      connected: true,
      participants: () => [],
      onParticipantsChange: () => () => undefined,
      whenSynced: async () => undefined,
      disconnect: async () => {
        doc.off('update', fromClient)
        this.clients.delete(doc)
      },
    }
  }
}

const ALL = new Set([
  'project.read',
  'project.write',
  'project.export',
  'project.delete',
  'terminology.read',
  'terminology.write',
  'settings.write',
  'project.share',
]) as CapabilitySet

function identity(name: string): IdentityPort {
  return {
    current: () => ({ id: name, displayName: name }),
    capabilities: () => ALL,
    onChange: () => () => undefined,
  }
}

const catalog: ProjectCatalogPort = {
  list: async () => [],
  create: async (name) => ({ id: name, name }),
  open: async () => undefined,
  remove: async () => undefined,
  rename: async () => undefined,
  touch: async () => undefined,
}

describe('TriccRuntime.join', () => {
  it('opens the seeded document and converges an edit, without reading files', async () => {
    const project = createProject({ id: 'imci', title: 'IMCI' })
    const shared = new SharedDocument()
    shared.seed(ProjectDocument.fromProject(project).encodeState())

    const reads: string[] = []
    const persistence: PersistencePort = {
      id: 'none',
      capabilities: () => ({ canWatch: false, canWriteIncrementally: false }),
      read: async (ref) => {
        reads.push(ref.id)
        throw new Error('join must not read files')
      },
      write: async () => {
        throw new Error('join must not write files')
      },
    }

    const runtime = (name: string) =>
      createTriccRuntime({
        persistence,
        catalog,
        identity: identity(name),
        collaboration: shared,
      })

    const ref = { id: 'imci', name: 'IMCI' }
    const alice = await runtime('Alice').join(ref)
    const bob = await runtime('Bob').join(ref)

    expect(reads).toEqual([])
    expect(alice.document.snapshot().title).toEqual({ en: 'IMCI' })
    expect(bob.document.snapshot().title).toEqual({ en: 'IMCI' })

    alice.document.transact((tx) => tx.addActivity(createActivity({ id: 'assess', title: 'Assess' })))

    expect(bob.document.snapshot().activities['assess']?.title).toEqual({ en: 'Assess' })
    expect(runtime('Alice').hasUnsavedChanges(alice)).toBe(false)
  })
})
