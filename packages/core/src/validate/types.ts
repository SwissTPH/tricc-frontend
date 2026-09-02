/**
 * Two levels, surfaced differently (feature/20260825-project-format.md §9):
 * schema validity blocks load; authoring validity blocks export but never editing —
 * a guideline is invalid for most of the time it is being written.
 */
export type Severity = 'error' | 'warning' | 'info'

export interface IssueLocation {
  activityId?: string
  nodeId?: string
  edgeId?: string
  interventionId?: string
  conceptCode?: string
  field?: string
}

export interface Issue {
  /** Stable rule id, e.g. `node.missing-name`. Used for suppression and for tests. */
  rule: string
  severity: Severity
  /** What is wrong, why it matters, and the next action (guided-authoring §8). */
  message: string
  location: IssueLocation
  /** Present when a mechanical fix exists. */
  fix?: { label: string; kind: string }
}

export function issue(
  rule: string,
  severity: Severity,
  message: string,
  location: IssueLocation,
  fix?: Issue['fix'],
): Issue {
  const i: Issue = { rule, severity, message, location }
  if (fix) i.fix = fix
  return i
}

/** Errors block export; warnings do not. */
export function blocksExport(issues: Issue[]): boolean {
  return issues.some((i) => i.severity === 'error')
}
