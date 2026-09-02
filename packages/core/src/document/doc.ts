import * as Y from 'yjs'
import type { Project } from '../model/types.js'
import type { Capability, CapabilitySet } from '../ports/identity.js'
import { LOCAL_ORIGIN, projectFromDoc, projectToDoc } from './codec.js'
import { Mutations } from './mutations.js'
import { UndoController } from './undo.js'

export class CapabilityError extends Error {
  constructor(readonly required: Capability) {
    super(`this action requires the "${required}" capability`)
    this.name = 'CapabilityError'
  }
}

export interface ProjectDocumentOptions {
  /** Consulted on every mutation. Defaults to full access. */
  capabilities?: () => CapabilitySet
}

export type Unsubscribe = () => void

/**
 * The editing document.
 *
 * The only module that knows about Yjs. Everything downstream consumes plain snapshots,
 * which is what keeps the CRDT decision contained and reversible
 * (feature/20260825-document-model.md §12).
 */
export class ProjectDocument {
  readonly doc: Y.Doc
  readonly undo: UndoController
  private readonly caps: () => CapabilitySet
  private cached: { version: number; value: Project } | undefined
  private version = 0
  private readonly listeners = new Set<() => void>()

  private constructor(doc: Y.Doc, opts: ProjectDocumentOptions) {
    this.doc = doc
    this.caps = opts.capabilities ?? (() => ALL_CAPABILITIES)
    this.undo = new UndoController(doc, LOCAL_ORIGIN)
    this.doc.on('afterTransaction', () => {
      this.version++
      this.cached = undefined
      for (const l of this.listeners) l()
    })
  }

  static fromProject(project: Project, opts: ProjectDocumentOptions = {}): ProjectDocument {
    const doc = new Y.Doc()
    projectToDoc(project, doc)
    return new ProjectDocument(doc, opts)
  }

  static fromDoc(doc: Y.Doc, opts: ProjectDocumentOptions = {}): ProjectDocument {
    return new ProjectDocument(doc, opts)
  }

  /**
   * A plain, immutable view. Memoized per document version, so repeated reads between
   * edits are free and pure consumers never see a Y type.
   */
  snapshot(): Project {
    if (this.cached?.version === this.version) return this.cached.value
    const value = projectFromDoc(this.doc)
    this.cached = { version: this.version, value }
    return value
  }

  /**
   * The only way to mutate. Enforces `project.write` at the document layer, so a component
   * that forgets to gate cannot corrupt a read-only session (§4).
   */
  transact<T>(fn: (tx: Mutations) => T, origin: unknown = LOCAL_ORIGIN): T {
    this.require('project.write')
    let result!: T
    this.doc.transact(() => {
      result = fn(new Mutations(this.doc))
    }, origin)
    return result
  }

  /** Read without mutating; no capability required beyond having the document. */
  read<T>(fn: (project: Project) => T): T {
    return fn(this.snapshot())
  }

  require(capability: Capability): void {
    if (!this.caps().has(capability)) throw new CapabilityError(capability)
  }

  can(capability: Capability): boolean {
    return this.caps().has(capability)
  }

  /** Fires after every transaction, local or remote. */
  subscribe(listener: () => void): Unsubscribe {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Monotonic; changes whenever the document does. Useful as a React store version. */
  getVersion(): number {
    return this.version
  }

  applyUpdate(update: Uint8Array, origin: unknown = 'remote'): void {
    Y.applyUpdate(this.doc, update, origin)
  }

  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc)
  }

  destroy(): void {
    this.undo.destroy()
    this.listeners.clear()
    this.doc.destroy()
  }
}

export const ALL_CAPABILITIES: CapabilitySet = new Set([
  'project.read',
  'project.write',
  'project.export',
  'project.delete',
  'terminology.read',
  'terminology.write',
  'settings.write',
]) as CapabilitySet

export const READ_ONLY_CAPABILITIES: CapabilitySet = new Set([
  'project.read',
  'project.export',
  'terminology.read',
]) as CapabilitySet
