import { resolve, type SelectOption, type TriccNode } from '@tricc/core'

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

export function answerLabel(option: SelectOption, lang: string): string {
  return resolve(option.label, lang, lang) || optionCode(option)
}

export function shortenAnswer(label: string): string {
  if (label.length <= ANSWER_LABEL_LIMIT) return label
  return `${label.slice(0, ANSWER_LABEL_LIMIT)}…`
}

/** What an answer edge shows, and the full label for its hover. */
export function answerEdgeCaption(
  node: TriccNode | undefined,
  value: string | undefined,
  lang: string,
): { code: string; short: string; title: string; optionId?: string } | undefined {
  const code = answerCode(value)
  if (code === undefined) return undefined
  const option = findAnswer(node, code)
  const title = option ? answerLabel(option, lang) : code
  return { code, short: shortenAnswer(title), title, ...(option ? { optionId: option.id } : {}) }
}
