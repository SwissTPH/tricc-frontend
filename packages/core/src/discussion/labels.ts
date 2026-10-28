import type { DiscussionLabel } from '../model/types.js'

/** The five categories a new project offers. A discussion carries one of them. */
export const DEFAULT_DISCUSSION_LABELS: DiscussionLabel[] = [
  { id: 'question', name: 'Question', color: 'blue' },
  { id: 'decision', name: 'Decision', color: 'green' },
  { id: 'clinical-review', name: 'Clinical review', color: 'pink' },
  { id: 'translation', name: 'Translation', color: 'yellow' },
  { id: 'problem', name: 'Problem', color: 'grey' },
]
