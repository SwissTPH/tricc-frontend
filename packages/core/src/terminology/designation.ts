import type { Concept, Designation } from '../model/types.js'
import { designationText, withDesignationText } from '../text/designation.js'
import { fromPlain, toPlain } from '../text/render.js'
import type { DisplayText } from '../text/schema.js'

/**
 * Designation uses, as `tricc_oo` writes and reads them (`converters/datadictionnary.py`).
 * A designation with no `use` is a display, the FHIR default.
 */
export const DESIGNATION_USES = {
  display: { system: 'http://terminology.hl7.org/CodeSystem/designation-usage', code: 'display' },
  hint: { system: 'https://tricc.org/CodeSystem/designation-use', code: 'hint' },
  help: { system: 'https://tricc.org/CodeSystem/designation-use', code: 'help' },
  /** Questionnaire text; falls back to display. */
  'q-display': { system: 'https://tricc.org/CodeSystem/designation-use', code: 'q-display' },
} as const

export type DesignationUse = keyof typeof DESIGNATION_USES

/** A designation carrying this extension applies only to the named intervention(s). */
export const INTERVENTION_SCOPE_URL =
  'https://tricc.org/StructureDefinition/designation-intervention'

/** The interventions a designation is scoped to; empty for an unscoped (default) text. */
export function designationInterventions(d: Designation): string[] {
  return (d.extension ?? [])
    .filter(
      (e): e is { url: string; valueCode: string } =>
        typeof e === 'object' &&
        e !== null &&
        (e as { url?: unknown }).url === INTERVENTION_SCOPE_URL &&
        typeof (e as { valueCode?: unknown }).valueCode === 'string',
    )
    .map((e) => e.valueCode)
}

/**
 * A designation carrying this extension applies only to the node(s) in the named repeat
 * slot(s): the text of a concept collected again, "Second temperature measurement"
 * (feature RFC repeat-slot-texts).
 */
export const REPEAT_SCOPE_URL = 'https://tricc.org/StructureDefinition/designation-repeat'

/** The repeat slots a designation is scoped to; empty for a text of every slot. */
export function designationRepeats(d: Designation): number[] {
  return (d.extension ?? [])
    .filter(
      (e): e is { url: string; valueInteger: number } =>
        typeof e === 'object' &&
        e !== null &&
        (e as { url?: unknown }).url === REPEAT_SCOPE_URL &&
        Number.isInteger((e as { valueInteger?: unknown }).valueInteger),
    )
    .map((e) => e.valueInteger)
}

/**
 * A text for every intervention and every repeat slot: no intervention or repeat scope (other
 * extensions do not count).
 */
export function isUnscoped(d: Designation): boolean {
  return designationInterventions(d).length === 0 && designationRepeats(d).length === 0
}

export function scopeExtension(interventionIds: string[]): unknown[] {
  return interventionIds.map((valueCode) => ({ url: INTERVENTION_SCOPE_URL, valueCode }))
}

export function repeatScopeExtension(slots: number[]): unknown[] {
  return slots.map((valueInteger) => ({ url: REPEAT_SCOPE_URL, valueInteger }))
}

/**
 * Where a text is read: the intervention, and the repeat slot of the node (`node.repeat ?? 1`).
 * Without `repeat`, slot-scoped texts are never picked.
 */
export interface TextScope {
  interventionId?: string
  repeat?: number
}

/** The designation is scoped to exactly this intervention and slot (each absent = none). */
function hasScope(d: Designation, scope: TextScope): boolean {
  const ivs = designationInterventions(d)
  const slots = designationRepeats(d)
  const sameIv = scope.interventionId
    ? ivs.length === 1 && ivs[0] === scope.interventionId
    : ivs.length === 0
  const sameSlot =
    scope.repeat !== undefined
      ? slots.length === 1 && slots[0] === scope.repeat
      : slots.length === 0
  return sameIv && sameSlot
}

/** The known use of a designation, `display` when it has none, undefined when it is another use. */
export function designationUse(d: Designation): DesignationUse | undefined {
  if (!d.use || (!d.use.system && !d.use.code)) return 'display'
  for (const [key, use] of Object.entries(DESIGNATION_USES)) {
    if (d.use.code === use.code && (!d.use.system || d.use.system === use.system)) {
      return key as DesignationUse
    }
  }
  return undefined
}

/**
 * A concept's text for one use and language. Mirrors `tricc_oo` `concept_text`: the
 * display in the default language is `concept.display`; anything else is a designation.
 * Questionnaire text falls back to the display.
 */
export function conceptText(
  concept: Concept | undefined,
  use: DesignationUse,
  lang: string,
  defaultLang = lang,
  scope: TextScope = {},
): string | undefined {
  const text = conceptRichText(concept, use, lang, defaultLang, scope)
  return text === undefined ? undefined : toPlain(text)
}

/**
 * Like `conceptText`, as a display text: a document when the text has bold, lists or pictures.
 *
 * The most specific text wins: for the slot in the intervention, for the slot, for the
 * intervention, then for all. A slot below 1 (`repeat: -1`, "collect it here only") has no
 * texts of its own. The display is the dictionary name: it never depends on the slot.
 */
export function conceptRichText(
  concept: Concept | undefined,
  use: DesignationUse,
  lang: string,
  defaultLang = lang,
  scope: TextScope = {},
): DisplayText | undefined {
  if (!concept) return undefined
  const { interventionId } = scope
  const slot =
    use !== 'display' && scope.repeat !== undefined && scope.repeat >= 1 ? scope.repeat : undefined
  const find = (u: DesignationUse) => {
    const matching = concept.designations.filter(
      (d) => d.language === lang && designationUse(d) === u && d.value !== '',
    )
    const forSlot = (d: Designation) => slot !== undefined && designationRepeats(d).includes(slot)
    const forIv = (d: Designation) =>
      interventionId !== undefined && designationInterventions(d).includes(interventionId)
    const noIv = (d: Designation) => designationInterventions(d).length === 0
    const noSlot = (d: Designation) => designationRepeats(d).length === 0
    const hit =
      matching.find((d) => forSlot(d) && forIv(d)) ??
      matching.find((d) => forSlot(d) && noIv(d)) ??
      matching.find((d) => forIv(d) && noSlot(d)) ??
      matching.find(isUnscoped)
    return hit ? designationText(hit) : undefined
  }
  if (use === 'display') {
    if (lang === defaultLang && concept.display) return concept.display
    return find('display') ?? concept.display
  }
  const value = find(use)
  if (value !== undefined) return value
  if (use === 'q-display')
    return conceptRichText(concept, 'display', lang, defaultLang, { interventionId })
  return undefined
}

/**
 * The concept with one text set or cleared. The default-language display is the concept's
 * `display`; any other text is a designation with exactly the given scope (none by default).
 */
export function withConceptText(
  concept: Concept,
  use: DesignationUse,
  lang: string,
  value: DisplayText | undefined,
  defaultLang = lang,
  scope: TextScope = {},
): Concept {
  const scoped = scope.interventionId !== undefined || scope.repeat !== undefined
  const next: Concept = { ...concept, designations: concept.designations.map((d) => ({ ...d })) }
  // A display is a dictionary name: plain text, on one line.
  if (use === 'display' && value !== undefined) value = toPlain(value).replace(/\s*\n\s*/g, ' ')
  const empty = value === undefined || (typeof value === 'string' && value === '')
  if (use === 'display' && lang === defaultLang && !scoped) {
    if (!empty) next.display = value as string
    else delete next.display
    return next
  }
  const index = next.designations.findIndex(
    (d) => d.language === lang && designationUse(d) === use && hasScope(d, scope),
  )
  if (empty) {
    if (index >= 0) next.designations.splice(index, 1)
    return next
  }
  const text = typeof value === 'string' ? fromPlain(value) : value!
  const base: Designation =
    index >= 0
      ? next.designations[index]!
      : {
          language: lang,
          use: { ...DESIGNATION_USES[use] },
          value: '',
          ...(scoped
            ? {
                extension: [
                  ...scopeExtension(scope.interventionId ? [scope.interventionId] : []),
                  ...repeatScopeExtension(scope.repeat !== undefined ? [scope.repeat] : []),
                ],
              }
            : {}),
        }
  const updated = withDesignationText(base, text)
  if (index >= 0) next.designations[index] = updated
  else next.designations.push(updated)
  return next
}
