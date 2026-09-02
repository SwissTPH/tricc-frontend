import { z } from 'zod'
import { localizedTextSchema, type LocalizedText } from './localized.js'

/**
 * An authored expression: CQL, optionally preceded by a plain-language statement of
 * what it is meant to do.
 *
 * A bare string is shorthand for `{ expression }`.
 * See feature/20260825-guided-authoring.md §4.
 */
export interface Expression {
  /** Plain-language intent, localized. Never affects conversion. */
  intent?: LocalizedText
  /** CQL, restricted to the TRICC portable profile. */
  expression?: string
}

export const expressionSchema = z.union([
  z.string(),
  z
    .object({
      intent: localizedTextSchema.optional(),
      expression: z.string().optional(),
    })
    .strict()
    .refine(
      (v) => v.intent !== undefined || v.expression !== undefined,
      'an expression must carry an intent, an expression, or both',
    ),
])

export type ExpressionInput = z.infer<typeof expressionSchema>

export function toExpression(value: ExpressionInput, defaultLang: string): Expression {
  if (typeof value === 'string') return { expression: value }
  const out: Expression = {}
  if (value.intent !== undefined) {
    out.intent =
      typeof value.intent === 'string' ? { [defaultLang]: value.intent } : { ...value.intent }
  }
  if (value.expression !== undefined) out.expression = value.expression
  return out
}

export function fromExpression(
  value: Expression,
  defaultLang: string,
): ExpressionInput | undefined {
  const hasIntent = value.intent !== undefined && Object.keys(value.intent).length > 0
  const hasExpr = value.expression !== undefined && value.expression !== ''
  if (!hasIntent && !hasExpr) return undefined
  if (!hasIntent) return value.expression as string
  const out: { intent?: unknown; expression?: string } = {}
  if (hasIntent) {
    const intent = value.intent as LocalizedText
    const keys = Object.keys(intent)
    out.intent =
      keys.length === 1 && keys[0] === defaultLang
        ? intent[defaultLang]
        : Object.fromEntries(keys.sort().map((k) => [k, intent[k] as string]))
  }
  if (hasExpr) out.expression = value.expression
  return out as ExpressionInput
}

/** An intent with no expression: the clinician has stated what is wanted, nobody has written it. */
export function isOpenHandoff(value: Expression | undefined): boolean {
  if (!value) return false
  const hasIntent = value.intent !== undefined && Object.keys(value.intent).length > 0
  const hasExpr = value.expression !== undefined && value.expression.trim() !== ''
  return hasIntent && !hasExpr
}
