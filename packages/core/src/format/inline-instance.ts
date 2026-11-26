import type { Discussion, Project, TriccNode } from '../model/types.js'
import { anchorLabel } from '../discussion/anchor.js'

/** The author of what TRICC itself writes in a project, such as the notes of a conversion. */
export const TRICC_AUTHOR = { id: 'tricc', name: 'TRICC' } as const

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** A discussion id (`d-` and 10 base-36 characters) derived from a key, so a read is repeatable. */
function derivedId(prefix: 'd' | 'c', key: string): string {
  // Two FNV-1a passes with different seeds give enough bits for 10 characters.
  let a = 0x811c9dc5
  let b = 0x01000193 ^ 0x5bd1e995
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i)
    a = Math.imul(a ^ c, 0x01000193) >>> 0
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0
  }
  let body = ''
  for (let i = 0; i < 10; i++) {
    const word = i < 5 ? a : b
    body += ALPHABET[(word >>> ((i % 5) * 6)) % ALPHABET.length]
  }
  return `${prefix}-${body}`
}

function noteText(node: TriccNode, hadAsGroup: boolean): string {
  if (node.type === 'goto') {
    return hadAsGroup
      ? "This Go to had instance -1, the old way to put the activity's questions here. It also sets Show as, which wins, so only the instance value was removed. Check Show as, then resolve this discussion."
      : "This Go to had instance -1, the old way to put the activity's questions here. It now says Show as: Inline, which does the same, and the instance value was removed. Check the change, then resolve this discussion."
  }
  return hadAsGroup
    ? 'This activity had instance -1 on its start node, which TRICC ignored. It also sets Show as, so only the instance value was removed. Check Show as, then resolve this discussion.'
    : 'This activity had instance -1 on its start node, which TRICC ignored. It now says Show as: Inline: every Go to that does not set Show as puts its questions in the caller, with no section of their own. If this activity should stay a section, set Show as to Default or Section, then resolve this discussion.'
}

/**
 * `instance: -1` on a goto (or an activity start) was the way to put an activity's questions in
 * the caller. Show as: Inline (`asGroup: false`) replaces it (feature/20261126-questionnaire-
 * pages.md §2). Each such node loses its instance, gets `asGroup: false` (and `page: false`) when
 * it sets neither, and an open discussion says what changed. Returns the nodes converted.
 */
export function migrateInlineInstances(
  project: Project,
  now: string = new Date().toISOString(),
): number {
  let converted = 0
  const lang = project.languages.default
  for (const activity of Object.values(project.activities)) {
    for (const id of activity.nodeOrder) {
      const node = activity.nodes[id]
      if (!node || node.instance !== -1) continue
      if (node.type !== 'goto' && node.type !== 'activity_start') continue
      const hadAsGroup = node.asGroup !== undefined
      delete node.instance
      if (!hadAsGroup) {
        node.asGroup = false
        if (node.page === undefined) node.page = false
      }
      converted++
      const key = `inline-instance|${activity.id}|${node.id}`
      const discussionId = derivedId('d', key)
      const discussions = (project.discussions ??= {})
      if (discussions[discussionId]) continue
      const about = { kind: 'node' as const, activityId: activity.id, nodeId: node.id }
      const discussion: Discussion = {
        id: discussionId,
        about,
        label: anchorLabel(project, about, lang),
        status: 'open',
        labels: [],
        comments: [
          {
            id: derivedId('c', key),
            author: { ...TRICC_AUTHOR },
            at: now,
            text: noteText(node, hadAsGroup),
          },
        ],
        events: [{ at: now, by: { ...TRICC_AUTHOR } }],
      }
      discussions[discussionId] = discussion
    }
  }
  return converted
}
