import { anchorKindName } from './anchor.js'
import type { Discussion, Project } from '../model/types.js'

export interface DecisionRow {
  decidedAt: string
  status: 'resolved' | 'wont_change'
  element: string
  labels: string[]
  question: string
  decision?: string
  decidedBy: string
  version?: string
  comments: number
}

/** Resolved and won't-change discussions, newest first. */
export function decisionLog(
  project: Project,
  opts?: { since?: string; labels?: string[] },
): DecisionRow[] {
  const names = new Map((project.discussionLabels ?? []).map((label) => [label.id, label.name]))
  return Object.values(project.discussions ?? {})
    .filter(
      (discussion): discussion is Discussion & { status: 'resolved' | 'wont_change' } =>
        discussion.status === 'resolved' || discussion.status === 'wont_change',
    )
    .filter((discussion) => !opts?.since || (discussion.resolution?.at ?? '') >= opts.since)
    .filter(
      (discussion) =>
        !opts?.labels?.length || discussion.labels.some((id) => opts.labels?.includes(id)),
    )
    .map((discussion) => {
      const row: DecisionRow = {
        decidedAt: discussion.resolution?.at ?? '',
        status: discussion.status,
        element: `${anchorKindName(discussion.about.kind)} · ${discussion.label}`,
        labels: discussion.labels.map((id) => names.get(id) ?? id),
        question:
          discussion.comments.find((comment) => !comment.deleted && comment.text)?.text ?? '',
        decidedBy: discussion.resolution?.by.name ?? '',
        comments: discussion.comments.filter((comment) => !comment.deleted).length,
      }
      if (discussion.resolution?.note) row.decision = discussion.resolution.note
      if (discussion.resolution?.version) row.version = discussion.resolution.version
      return row
    })
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
}

export function decisionLogMarkdown(project: Project, rows: DecisionRow[]): string {
  const title = project.id
  const lines = [`# Decision log — ${title}`, '']
  if (rows.length === 0) lines.push('No decisions yet.', '')
  for (const row of rows) {
    lines.push(`## ${row.element}`)
    lines.push('')
    lines.push(`- Status: ${row.status === 'wont_change' ? "Won't change" : 'Resolved'}`)
    if (row.labels.length > 0) lines.push(`- Category: ${row.labels.join(', ')}`)
    lines.push(`- Question: ${row.question}`)
    if (row.decision) lines.push(`- Decision: ${row.decision}`)
    lines.push(`- By: ${row.decidedBy}`)
    if (row.version) lines.push(`- Version: ${row.version}`)
    lines.push(`- When: ${row.decidedAt}`)
    lines.push('')
  }
  return lines.join('\n')
}

/** RFC 4180, with a byte-order mark so a spreadsheet opens the text as UTF-8. */
export function decisionLogCsv(rows: DecisionRow[]): string {
  const header = [
    'decidedAt',
    'status',
    'element',
    'labels',
    'question',
    'decision',
    'decidedBy',
    'version',
    'comments',
  ]
  const body = rows.map((row) =>
    [
      row.decidedAt,
      row.status,
      row.element,
      row.labels.join('; '),
      row.question,
      row.decision ?? '',
      row.decidedBy,
      row.version ?? '',
      String(row.comments),
    ]
      .map(csvCell)
      .join(','),
  )
  return `\uFEFF${[header.join(','), ...body].join('\r\n')}\r\n`
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
