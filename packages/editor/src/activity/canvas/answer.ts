import { resolve, type SelectOption, type TriccNode, conceptText, lookupConcept, optionConceptKey, type Project } from '@tricc/core'

/** How much of an answer label an edge may show. The rest is on hover. */
export const ANSWER_LABEL_LIMIT = 20

/** The code an `Answer()` call refers to: the answer name, else its concept, else its id. */
export function optionCode(option: SelectOption): string {
  return option.name || option.concept?.code || option.id
}

/** Stored on the edge. Single quotes follow CQL, and a quote inside the code is doubled. */
export function answerExpression(code: string): string {
  return `Answer('${code.replace(/'/g, "''")}')`
}

/** The code inside `Answer('code')`, or undefined when the edge is some other condition. */
export function answerCode(value: string | undefined): string | undefined {
  if (!value) return undefined
  const match = /^Answer\('((?:[^']|'')*)'\)$/.exec(value.trim())
  if (!match) return undefined
  return (match[1] ?? '').replace(/''/g, "'")
}

/** The node's own output, under the answer rows. It is not an answer. */
export const NODE_OUT_HANDLE = 'out'

export function answerHandleId(optionId: string): string {
  return `answer-${optionId}`
}

export function optionIdFromHandle(handle: string | null | undefined): string | undefined {
  if (!handle?.startsWith('answer-')) return undefined
  const id = handle.slice('answer-'.length)
  return id || undefined
}

export function findAnswer(node: TriccNode | undefined, code: string): SelectOption | undefined {
  return node?.options?.find((option) => optionCode(option) === code)
}

/**
 * What an answer says. Its text lives on its concept (the option name in the default
 * CodeSystem); an option not yet migrated may still carry its own label.
 */
export function answerLabel(option: SelectOption, lang: string, project?: Project): string {
  const concept = project ? lookupConcept(project, optionConceptKey(project, option)) : undefined
  return (
    conceptText(concept, 'q-display', lang, project?.languages.default) ||
    resolve(option.label, lang, lang) ||
    optionCode(option)
  )
}

/** A label cut to `limit` characters (the viewer's `labelChars` preference), with an ellipsis. */
export function shortenAnswer(label: string, limit: number = ANSWER_LABEL_LIMIT): string {
  if (label.length <= limit) return label
  return `${label.slice(0, limit)}…`
}

/** What an answer edge shows, and the full label for its hover. */
export function answerEdgeCaption(
  node: TriccNode | undefined,
  value: string | undefined,
  lang: string,
  project?: Project,
  limit: number = ANSWER_LABEL_LIMIT,
): { code: string; short: string; title: string; optionId?: string } | undefined {
  const code = answerCode(value)
  if (code === undefined) return undefined
  const option = findAnswer(node, code)
  const title = option ? answerLabel(option, lang, project) : code
  return { code, short: shortenAnswer(title, limit), title, ...(option ? { optionId: option.id } : {}) }
}
