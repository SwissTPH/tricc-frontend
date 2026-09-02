import { z } from 'zod'

/** FHIR code regex — the same constraint FHIR puts on CodeSystem concept codes. */
export const FHIR_CODE = /^[^\s]+( [^\s]+)*$/

export const conceptRefSchema = z
  .object({
    system: z.string().min(1),
    code: z.string().regex(FHIR_CODE, 'invalid FHIR code'),
  })
  .strict()

export type ConceptRef = z.infer<typeof conceptRefSchema>

export const DATA_TYPES = [
  'boolean',
  'integer',
  'decimal',
  'string',
  'date',
  'dateTime',
  'coded',
  'quantity',
] as const
export type DataType = (typeof DATA_TYPES)[number]

export function conceptKey(ref: ConceptRef): string {
  return `${ref.system}|${ref.code}`
}
