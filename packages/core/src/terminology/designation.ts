import type { Concept, Designation } from '../model/types.js'
import {
  designationText,
  fromPlain,
  toPlain,
  withDesignationText,
  type DisplayText,
} from '../text/message.js'

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
export const INTERVENTION_SCOPE_URL = 'https://tricc.org/StructureDefinition/designation-intervention'

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

/** A text for every intervention: no intervention scope (other extensions do not count). */
export function isUnscoped(d: Designation): boolean {
  return designationInterventions(d).length === 0
}

export function scopeExtension(interventionIds: string[]): unknown[] {
  return interventionIds.map((valueCode) => ({ url: INTERVENTION_SCOPE_URL, valueCode }))
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
  interventionId?: string,
): string | undefined {
  const text = conceptRichText(concept, use, lang, defaultLang, interventionId)
  return text === undefined ? undefined : toPlain(text)
}

/** Like `conceptText`, as a display text: the tree when the text has bold, lists or `${}`. */
export function conceptRichText(
  concept: Concept | undefined,
  use: DesignationUse,
  lang: string,
  defaultLang = lang,
  interventionId?: string,
): DisplayText | undefined {
  if (!concept) return undefined
  const find = (u: DesignationUse) => {
    const matching = concept.designations.filter((d) => d.language === lang && designationUse(d) === u)
    const scoped = interventionId
      ? matching.find((d) => designationInterventions(d).includes(interventionId))
      : undefined
    const hit = scoped ?? matching.find(isUnscoped)
    return hit && hit.value !== '' ? designationText(hit) : undefined
  }
  if (use === 'display') {
    if (lang === defaultLang && concept.display) return concept.display
    return find('display') ?? concept.display
  }
  const value = find(use)
  if (value !== undefined) return value
  if (use === 'q-display') return conceptRichText(concept, 'display', lang, defaultLang, interventionId)
  return undefined
}

/**
 * The concept with one text set or cleared. The default-language display is the concept's
 * `display`; any other text is a designation without an intervention scope.
 */
export function withConceptText(
  concept: Concept,
  use: DesignationUse,
  lang: string,
  value: DisplayText | undefined,
  defaultLang = lang,
): Concept {
  const next: Concept = { ...concept, designations: concept.designations.map((d) => ({ ...d })) }
  // A display is a dictionary name: plain text.
  if (use === 'display' && value !== undefined) value = toPlain(value)
  const empty = value === undefined || (typeof value === 'string' && value === '')
  if (use === 'display' && lang === defaultLang) {
    if (!empty) next.display = value as string
    else delete next.display
    return next
  }
  const index = next.designations.findIndex(
    (d) => d.language === lang && designationUse(d) === use && isUnscoped(d),
  )
  if (empty) {
    if (index >= 0) next.designations.splice(index, 1)
    return next
  }
  const text = typeof value === 'string' ? fromPlain(value) : value!
  const base: Designation =
    index >= 0 ? next.designations[index]! : { language: lang, use: { ...DESIGNATION_USES[use] }, value: '' }
  const updated = withDesignationText(base, text)
  if (index >= 0) next.designations[index] = updated
  else next.designations.push(updated)
  return next
}
