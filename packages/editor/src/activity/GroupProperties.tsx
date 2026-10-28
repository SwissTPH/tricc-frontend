import {
  COMMENT_COLORS,
  conceptText,
  defaultCodeSystem,
  type Activity,
  type CanvasGroup,
  type CommentColor,
  type Project,
} from '@tricc/core'
import { useMutate } from '../runtime/context.js'
import { ensureDefaultCodeSystem } from '../terminology/codeSystems.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'

const NAME = /^[A-Za-z][A-Za-z0-9_.-]*$/

/**
 * A page group's details. It becomes a section of the form: its name is a concept code and
 * its title that concept's display, so the title translates like any other text.
 */
export function GroupProperties({
  activityId,
  activity,
  project,
  group,
  lang,
  readOnly,
  onUngrouped,
}: {
  activityId: string
  activity: Activity
  project: Project
  group: CanvasGroup
  lang: string
  readOnly: boolean
  onUngrouped: () => void
}) {
  const mutate = useMutate()
  const cs = defaultCodeSystem(project)
  const concept = group.name ? cs?.concepts[group.name] : undefined
  const title = conceptText(concept, 'display', lang, project.languages.default) ?? ''
  const members = Object.values(activity.nodes).filter((n) => n.group === group.id).length
  const inner = (activity.groups ?? []).filter((g) => g.parent === group.id).length
  const update = (patch: Partial<CanvasGroup>) => mutate((tx) => tx.setGroup(activityId, { ...group, ...patch }))

  return (
    <section aria-labelledby="group-heading" data-testid="group-properties">
      <h2 id="group-heading">Group</h2>
      <p>A section of the form. Drag nodes into the frame to add them, out of it to take them out.</p>
      <label htmlFor="group-name">Name</label>
      <Input size="sm"
        id="group-name"
        data-testid="group-name"
        value={group.name ?? ''}
        disabled={readOnly}
        onChange={(e) => {
          const name = e.target.value.trim()
          update({ name: name && NAME.test(name) ? name : undefined })
        }}
      />
      <label htmlFor="group-title">Title</label>
      <Input size="sm"
        id="group-title"
        data-testid="group-title"
        value={title}
        disabled={readOnly || !group.name}
        placeholder={group.name ? '' : 'Give the group a name first'}
        onChange={(e) => {
          const name = group.name
          if (!name) return
          mutate((tx) => {
            const target = ensureDefaultCodeSystem(project, tx)
            const current = target.concepts[name]
            tx.upsertConcept(target.url, {
              ...(current ?? { system: target.url, code: name, designations: [], conceptType: 'Misc' }),
              display: e.target.value,
            })
          })
        }}
      />
      <label htmlFor="group-color">Colour</label>
      <select
        id="group-color"
        data-testid="group-color"
        value={group.color}
        disabled={readOnly}
        onChange={(e) => update({ color: e.target.value as CommentColor })}
      >
        {COMMENT_COLORS.map((c) => (
          <option key={c} value={c}>
            {c[0]!.toUpperCase() + c.slice(1)}
          </option>
        ))}
      </select>
      <p data-testid="group-members">
        {members} {members === 1 ? 'node' : 'nodes'}
        {inner ? `, ${inner} ${inner === 1 ? 'group' : 'groups'}` : ''} in this group.
      </p>
      {!readOnly && (
        <Button
          variant="outline"
          size="sm"
          type="button"
          data-testid="group-ungroup"
          title="Removes the frame; its nodes stay where they are"
          onClick={() => {
            mutate((tx) => tx.removeGroup(activityId, group.id))
            onUngrouped()
          }}
        >
          Ungroup
        </Button>
      )}
    </section>
  )
}
