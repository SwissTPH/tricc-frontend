import { z } from 'zod'
import { localizedTextSchema } from './localized.js'
import { expressionSchema } from './expression.js'

/** The format version this build reads and writes. */
export const FORMAT_VERSION = '1.0.0'

/**
 * cpg-common-process names. Canonical ordering is tricc_oo's (PROCESSES /
 * PROCESS_ORDER in visitors/utils.py) — this list drives a dropdown, not the order,
 * and free text is permitted.
 */
export const CPG_PROCESSES = [
  'triage',
  'emergency-care',
  'registration',
  'history-and-physical',
  'local-urgent-care',
  'acute-tertiary-care',
  'diagnostic-testing',
  'determine-diagnosis',
  'provide-counseling',
  'dispense-medications',
  'monitor-and-follow-up-of-patient',
  'alerts-reminders-education',
  'discharge-referral-of-patient',
  'charge-for-service',
  'record-and-report',
] as const

/**
 * An activity reference inside an intervention. A bare string is shorthand for `{ ref }`.
 * Who the intervention is for lives on the intervention `start`, not on each reference.
 */
export const activityRefSchema = z.union([
  z.string().min(1),
  z.object({ ref: z.string().min(1) }).strict(),
])

export const TRIGGER_MODES = ['on-demand', 'planned', 'event'] as const

/** `planned` and `event` need the planning layer (tricc_oo/feature/careplan.md). Reserved. */
export const IMPLEMENTED_TRIGGER_MODES = ['on-demand'] as const

export const triggerSchema = z
  .object({
    mode: z.enum(TRIGGER_MODES),
    event: z.string().optional(),
  })
  .strict()

export const interventionSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1).optional(),
    title: localizedTextSchema.optional(),
    description: localizedTextSchema.optional(),
    applicability: expressionSchema.optional(),
    trigger: triggerSchema.optional(),
    activities: z.array(activityRefSchema).default([]),
  })
  .strict()

export const contextSchema = z
  .object({
    system: z.string().min(1),
    code: z.string().min(1),
    display: z.string().optional(),
    version: z.string().optional(),
  })
  .strict()

export const projectSchema = z
  .object({
    formatVersion: z.string(),
    id: z.string().min(1),
    system: z.string().optional(),
    code: z.string().optional(),
    version: z.string().optional(),
    title: localizedTextSchema.optional(),
    description: localizedTextSchema.optional(),
    languages: z
      .object({
        default: z.string().min(1),
        available: z.array(z.string().min(1)).default([]),
      })
      .strict()
      .default({ default: 'en', available: ['en'] }),
    interventions: z.array(interventionSchema).default([]),
    contexts: z.array(contextSchema).default([]),
    terminology: z
      .object({
        codeSystems: z.array(z.string()).default([]),
        default: z.string().optional(),
      })
      .strict()
      .default({ codeSystems: [] }),
    cqlLibraries: z.array(z.string()).default([]),
    mediaPath: z.string().optional(),
  })
  .strict()

export type ProjectInput = z.infer<typeof projectSchema>
export type InterventionInput = z.infer<typeof interventionSchema>
export type ActivityRefInput = z.infer<typeof activityRefSchema>

/** Normalize the shorthand. */
export function refOf(r: ActivityRefInput): string {
  return typeof r === 'string' ? r : r.ref
}
