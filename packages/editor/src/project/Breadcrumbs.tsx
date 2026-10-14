import { Fragment } from 'react'
import { resolve } from '@tricc/core'
import { useProjectSnapshot } from '../runtime/context.js'
import { HomeIcon } from '../components/Dialog.js'

/**
 * Where the author is: home, the project, then the activities they reached by following
 * gotos. The host owns the trail; activities no longer in the project are left out.
 */
export function Breadcrumbs({
  trail,
  extra,
  onHome,
  onProject,
  onCrumb,
}: {
  /** Activity ids, outermost first. The last one is open. */
  trail: string[]
  /** A view open in place of an activity, such as the data dictionary. */
  extra?: string
  onHome: () => void
  onProject: () => void
  /** Go back to the activity at this index of `trail`. */
  onCrumb: (index: number) => void
}) {
  const project = useProjectSnapshot()
  const lang = project.languages.default
  const crumbs = trail
    .map((id, index) => ({ id, index, activity: project.activities[id] }))
    .filter((c) => c.activity !== undefined)
  const atProject = crumbs.length === 0 && !extra
  return (
    <nav aria-label="Breadcrumb" className="tricc-crumbs" data-testid="breadcrumbs">
      <ol>
        <li>
          <button
            type="button"
            className="tricc-crumbs__home"
            data-testid="nav-home"
            aria-label="All projects"
            title="All projects"
            onClick={onHome}
          >
            <HomeIcon />
          </button>
        </li>
        <li>
          <button
            type="button"
            data-testid="nav-overview"
            aria-current={atProject ? 'page' : undefined}
            onClick={onProject}
          >
            {resolve(project.title, lang, lang) ?? project.id}
          </button>
        </li>
        {crumbs.map((c, i) => (
          <Fragment key={`${c.id}-${c.index}`}>
            <li>
              <button
                type="button"
                data-testid={`crumb-${c.id}`}
                aria-current={!extra && i === crumbs.length - 1 ? 'page' : undefined}
                onClick={() => onCrumb(c.index)}
              >
                {resolve(c.activity!.title, lang, lang) ?? c.id}
              </button>
            </li>
          </Fragment>
        ))}
        {extra && (
          <li>
            <span aria-current="page" data-testid="crumb-extra">
              {extra}
            </span>
          </li>
        )}
      </ol>
    </nav>
  )
}

/**
 * The next trail when opening `id`.
 *
 * - `reset`: opened from a list (navigator, overview, validation): only that activity.
 * - `follow`: reached through a goto: added to the trail.
 * - `return`: going back to a calling activity: kept if already on the trail.
 *
 * An activity already on the trail cuts it back there, so following a loop of gotos
 * never grows the trail without bound.
 */
export function nextTrail(trail: string[], id: string, mode: 'reset' | 'follow' | 'return'): string[] {
  const at = trail.indexOf(id)
  if (mode === 'reset') return [id]
  if (at >= 0) return trail.slice(0, at + 1)
  return mode === 'follow' ? [...trail, id] : [id]
}
