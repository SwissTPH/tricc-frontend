import type { ProjectOwner } from '../model/types.js'
import type { ProjectRef } from './persistence.js'
import type { TriccNotification } from './notifications.js'

/**
 * What the project list shows without opening a project. The runtime refreshes it each
 * time a project is opened or saved (`describe`).
 */
export interface ProjectDescription {
  code?: string
  /** The project title in its default language. */
  title?: string
  labels?: string[]
  owner?: ProjectOwner
  /** Open discussions asking for the current author's attention, when last saved. */
  attention?: TriccNotification[]
}

export interface ProjectSummary extends ProjectRef, ProjectDescription {
  /** Epoch millis, or undefined where the adapter cannot know. */
  lastOpened?: number
}

export interface ProjectCatalogPort {
  list(): Promise<ProjectSummary[]>
  create(name: string): Promise<ProjectRef>
  /** May prompt the user; resolves undefined if they cancel. */
  open(): Promise<ProjectRef | undefined>
  remove(ref: ProjectRef): Promise<void>
  /** Change the name the project is listed under. Absent projects are ignored. */
  rename(ref: ProjectRef, name: string): Promise<void>
  touch(ref: ProjectRef): Promise<void>
  /** Replace what the list shows about the project. Absent projects are ignored. */
  describe(ref: ProjectRef, description: ProjectDescription): Promise<void>
}
