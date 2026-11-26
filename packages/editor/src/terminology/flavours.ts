import {
  conceptFlavours,
  conceptUsage,
  type Concept,
  type ConceptKey,
  type Mutations,
  type Project,
} from '@tricc/core'

/**
 * Flavours of a concept's texts (feature/20261125-concept-text-flavours.md): the editor side
 * of naming them, counting the questions showing one, and moving those questions on a rename.
 */

/** A flavour code not used by the concept yet: `base`, else `base_2`, `base_3`… */
export function uniqueFlavour(concept: Concept, base: string): string {
  const taken = new Set(conceptFlavours(concept))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}_${n}`)) n++
  return `${base}_${n}`
}

/** The questions of a saved concept showing one of its flavours. */
export function flavourUses(
  project: Project,
  key: ConceptKey,
  saved: Concept | undefined,
  flavour: string,
): { activityId: string; nodeId: string }[] {
  if (!saved || !conceptFlavours(saved).includes(flavour)) return []
  return conceptUsage(project, key).filter(
    (u) => !u.optionId && project.activities[u.activityId]?.nodes[u.nodeId]?.flavour === flavour,
  )
}

/**
 * In a save: the questions showing a renamed flavour follow it. `renames` maps the code now
 * to the code in `saved`, the concept as it is in the project.
 */
export function carryFlavourRenames(
  tx: Mutations,
  project: Project,
  key: ConceptKey,
  saved: Concept | undefined,
  renames: Map<string, string>,
): void {
  for (const [now, was] of renames) {
    if (now === was) continue
    for (const u of flavourUses(project, key, saved, was)) {
      const node = project.activities[u.activityId]!.nodes[u.nodeId]!
      tx.updateNode(u.activityId, { ...node, flavour: now })
    }
  }
}
