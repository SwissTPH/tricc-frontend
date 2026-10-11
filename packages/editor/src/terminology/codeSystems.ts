import { defaultCodeSystem, type CodeSystem, type Mutations, type Project } from '@tricc/core'

/** The project's default CodeSystem, created on first use. */
export function ensureDefaultCodeSystem(project: Project, tx: Mutations): CodeSystem {
  const existing = defaultCodeSystem(project)
  if (existing) return existing
  const cs: CodeSystem = {
    id: project.id,
    url: `https://tricc.org/CodeSystem/${project.id}`,
    name: project.id,
    status: 'draft',
    content: 'complete',
    concepts: {},
    conceptOrder: [],
  }
  tx.addCodeSystem(cs)
  tx.setMeta('defaultCodeSystem', cs.url)
  return cs
}
