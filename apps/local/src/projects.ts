import type { ProjectRef } from '@tricc/core'
import type { LocalRuntime } from './adapters.js'
import { forgetRepoState } from './git/ui.js'

/** Project list operations shared by the home page and the open project. */

/** The catalog entry with its folder handle, if it has one: that decides what a delete does. */
export async function refFor(local: LocalRuntime, summary: ProjectRef): Promise<ProjectRef> {
  const handle = await local.catalog.handleFor(summary)
  return handle ? { ...summary, handle } : summary
}

export function deleteNote(local: LocalRuntime, ref: ProjectRef): string {
  return local.storeFor(ref) === 'folder'
    ? 'The folder and its files stay on your disk; only this list forgets the project.'
    : 'Its files are kept only in this browser and are deleted. Export a copy first to keep it.'
}

/**
 * Off the list first, so a list shown next no longer has it; then `removed` (leave the
 * project, so no autosave writes it back); then delete what the browser kept.
 */
export async function deleteProject(
  local: LocalRuntime,
  ref: ProjectRef,
  removed?: () => void,
): Promise<void> {
  await local.catalog.remove(ref)
  removed?.()
  await local.persistence.forget(ref)
  await local.collaboration.forget(ref)
  forgetRepoState(ref.id)
}

export function resolveName(
  title: Record<string, string> | undefined,
  lang: string,
): string | undefined {
  if (!title) return undefined
  return title[lang] ?? Object.values(title)[0]
}

export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

export function slug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  )
}
