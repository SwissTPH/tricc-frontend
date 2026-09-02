import type * as Y from 'yjs'
import type { ProjectRef } from './persistence.js'

export interface Participant {
  id: string
  displayName: string
  colour?: string
}

export interface CollaborationSession {
  readonly connected: boolean
  participants(): Participant[]
  onParticipantsChange(cb: () => void): () => void
  /** Resolves once any locally-persisted state has been loaded into the document. */
  whenSynced(): Promise<void>
  disconnect(): Promise<void>
}

export interface CollaborationPort {
  readonly id: string
  connect(doc: Y.Doc, ref: ProjectRef): Promise<CollaborationSession>
}
