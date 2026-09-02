import { z } from 'zod'
import { DATA_TYPES, FHIR_CODE } from './concept.js'

/**
 * FHIR R4 CodeSystem. Standard resource shape — TRICC attributes go in
 * `concept.property`, which is the mechanism FHIR provides.
 * feature/20260825-terminology.md §1.
 */

export const designationSchema = z
  .object({
    language: z.string().min(1),
    value: z.string(),
    use: z.object({ system: z.string(), code: z.string() }).partial().optional(),
  })
  .strict()

export const propertyValueSchema = z
  .object({
    code: z.string().min(1),
    valueCode: z.string().optional(),
    valueString: z.string().optional(),
    valueBoolean: z.boolean().optional(),
    valueInteger: z.number().int().optional(),
  })
  .strict()

export const csConceptSchema = z
  .object({
    code: z.string().regex(FHIR_CODE),
    display: z.string().optional(),
    definition: z.string().optional(),
    designation: z.array(designationSchema).optional(),
    property: z.array(propertyValueSchema).optional(),
  })
  .strict()

export const codeSystemSchema = z
  .object({
    resourceType: z.literal('CodeSystem'),
    id: z.string().min(1),
    url: z.string().min(1),
    version: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    status: z.enum(['draft', 'active', 'retired', 'unknown']).default('draft'),
    content: z
      .enum(['not-present', 'example', 'fragment', 'complete', 'supplement'])
      .default('complete'),
    caseSensitive: z.boolean().optional(),
    description: z.string().optional(),
    property: z
      .array(
        z
          .object({
            code: z.string().min(1),
            description: z.string().optional(),
            type: z.enum(['code', 'Coding', 'string', 'integer', 'boolean', 'dateTime', 'decimal']),
          })
          .strict(),
      )
      .optional(),
    concept: z.array(csConceptSchema).default([]),
  })
  .strict()

export type CodeSystemInput = z.infer<typeof codeSystemSchema>
export type CsConceptInput = z.infer<typeof csConceptSchema>

/** TRICC concept properties. */
export const TRICC_PROPERTIES = {
  dataType: 'dataType',
  conceptType: 'conceptType',
  unit: 'unit',
  source: 'source',
  sourceVersion: 'sourceVersion',
  /** Persistence mapping — tricc_oo/feature/20260826-concept-persistence-mapping.md §1. */
  targetResource: 'targetResource',
  targetPath: 'targetPath',
} as const

/** The property declarations a TRICC-authored CodeSystem carries. */
export const TRICC_PROPERTY_DEFS = [
  { code: 'dataType', type: 'code' as const, description: `One of: ${DATA_TYPES.join(', ')}` },
  {
    code: 'conceptType',
    type: 'code' as const,
    description: 'TRICC concept class; drives FHIR resource mapping',
  },
  { code: 'unit', type: 'string' as const, description: 'Unit of measure' },
  {
    code: 'source',
    type: 'string' as const,
    description: 'Provenance, e.g. ocl:/orgs/WHO/sources/ICD-11/',
  },
  {
    code: 'sourceVersion',
    type: 'string' as const,
    description: 'Version of the source at import',
  },
  {
    code: 'targetResource',
    type: 'code' as const,
    description: 'FHIR resource this concept corresponds to',
  },
  {
    code: 'targetPath',
    type: 'string' as const,
    description: 'Element path relative to the resource root',
  },
]

export function readProperty(
  c: CsConceptInput,
  code: string,
): string | number | boolean | undefined {
  const p = c.property?.find((x) => x.code === code)
  if (!p) return undefined
  return p.valueCode ?? p.valueString ?? p.valueBoolean ?? p.valueInteger
}
