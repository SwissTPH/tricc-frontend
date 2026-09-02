import { z } from 'zod'
import { localizedTextSchema } from './localized.js'
import { expressionSchema } from './expression.js'
import { conceptRefSchema } from './concept.js'
import { NODE_TYPES } from './node-types.js'

/** Identifier fragment used for node `name` — what CQL references and what exports mangle. */
export const NAME_RE = /^[A-Za-z_][A-Za-z0-9_.]*$/

/**
 * Presentation only. Carries no semantics: removing every `ui` block must leave a project
 * that converts identically. feature/20260825-project-format.md §3.2.
 */
export const nodeUiSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    color: z.string().optional(),
    collapsed: z.boolean().optional(),
  })
  .strict()

export const edgeUiSchema = z
  .object({
    waypoints: z.array(z.object({ x: z.number(), y: z.number() }).strict()).optional(),
    labelOffset: z.object({ x: z.number(), y: z.number() }).strict().optional(),
  })
  .strict()

export const optionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().regex(NAME_RE).optional(),
    label: localizedTextSchema.optional(),
    concept: conceptRefSchema.optional(),
    relevance: expressionSchema.optional(),
  })
  .strict()

export const notAvailableSchema = z
  .object({
    name: z.string().regex(NAME_RE).optional(),
    label: localizedTextSchema.optional(),
    concept: conceptRefSchema.optional(),
  })
  .strict()

export const mediaSchema = z.object({ image: z.string().min(1) }).strict()

/**
 * `wait.reference` — what must be complete before proceeding. Three forms:
 * a list of node names, an activity reference, or an expression.
 * feature/20260825-project-format.md §4.2.
 */
export const waitReferenceSchema = z.union([
  z.array(z.string().min(1)),
  z.object({ activity: z.string().min(1) }).strict(),
  z.object({ expression: z.string().min(1) }).strict(),
])

export const nodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(NODE_TYPES),
    name: z.string().regex(NAME_RE, 'invalid node name').optional(),
    label: localizedTextSchema.optional(),
    hint: localizedTextSchema.optional(),
    help: localizedTextSchema.optional(),
    concept: conceptRefSchema.optional(),

    relevance: expressionSchema.optional(),
    calculate: expressionSchema.optional(),
    expression: expressionSchema.optional(),
    constraint: expressionSchema.optional(),
    constraintMessage: localizedTextSchema.optional(),

    required: z.boolean().optional(),
    default: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),

    repeat: z.number().int().optional(),
    instance: z.number().int().optional(),

    // rhombus / wait
    reference: z.union([z.string().min(1), waitReferenceSchema]).optional(),

    // goto / link
    link: z.string().min(1).optional(),

    // selects
    listName: z.string().min(1).optional(),
    options: z.array(optionSchema).optional(),

    // diagnoses
    severity: z.enum(['light', 'mild', 'moderate', 'severe']).optional(),
    priority: z.number().int().optional(),

    // populate
    context: z
      .enum(['patient', 'facility', 'practitioner', 'location', 'encounter', 'history'])
      .optional(),
    period: z.string().optional(),

    // start
    formId: z.string().optional(),
    process: z.string().optional(),

    media: mediaSchema.optional(),
    notAvailable: notAvailableSchema.optional(),

    /**
     * Deprecated. Read on load and preserved so nothing is lost, never written by the editor.
     * Superseded by concept-level persistence mapping —
     * tricc_oo/feature/20260826-concept-persistence-mapping.md.
     */
    save: z.string().optional(),

    ui: nodeUiSchema.optional(),
  })
  .strict()

/**
 * Edge branch semantics. `continue` is the spelling; `follow`/`suivre` are deprecated
 * aliases, read but never written. feature/20260825-project-format.md §5.
 */
export const DEPRECATED_CONTINUE = ['follow', 'suivre'] as const

export const edgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    /** Absent = unconditional. `yes`/`no`/`continue`, an integer score, or a CQL condition. */
    value: z.string().optional(),
    ui: edgeUiSchema.optional(),
  })
  .strict()

export const activitySchema = z
  .object({
    formatVersion: z.string().optional(),
    id: z.string().min(1),
    title: localizedTextSchema.optional(),
    process: z.string().optional(),
    applicability: expressionSchema.optional(),
    ui: z
      .object({ viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).strict() })
      .strict()
      .optional(),
    nodes: z.array(nodeSchema),
    edges: z.array(edgeSchema).default([]),
  })
  .strict()

export type ActivityInput = z.infer<typeof activitySchema>
export type NodeInput = z.infer<typeof nodeSchema>
export type EdgeInput = z.infer<typeof edgeSchema>
export type OptionInput = z.infer<typeof optionSchema>
