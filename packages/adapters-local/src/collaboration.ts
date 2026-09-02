import type * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { CollaborationPort, CollaborationSession, ProjectRef } from '@tricc/core'

/**
 * Local durability for the editing document.
 *
 * No network: a single local participant. Its job is the offline update log that backs
 * crash recovery (feature/20260825-document-model.md §7). A hosted shell substitutes a
 * websocket provider here and nothing else changes.
 */
export class IndexedDbCollaboration implements CollaborationPort {
  readonly id = 'indexeddb'

  async connect(doc: Y.Doc, ref: ProjectRef): Promise<CollaborationSession> {
    const provider = new IndexeddbPersistence(`tricc-doc-${ref.id}`, doc)
    let synced = false
    const whenSynced = provider.whenSynced.then(() => {
      synced = true
    })
    return {
      get connected() {
        return synced
      },
      participants: () => [],
      onParticipantsChange: () => () => undefined,
      whenSynced: () => whenSynced.then(() => undefined),
      disconnect: async () => {
        await provider.destroy()
      },
    }
  }
}
