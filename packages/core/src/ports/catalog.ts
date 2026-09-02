import type { ProjectRef } from './persistence.js'

export interface ProjectSummary extends ProjectRef {
  /** Epoch millis, or undefined where the adapter cannot know. */
  lastOpened?: number
}

export interface ProjectCatalogPort {
  list(): Promise<ProjectSummary[]>
  create(name: string): Promise<ProjectRef>
  /** May prompt the user; resolves undefined if they cancel. */
  open(): Promise<ProjectRef | undefined>
  remove(ref: ProjectRef): Promise<void>
  touch(ref: ProjectRef): Promise<void>
}
