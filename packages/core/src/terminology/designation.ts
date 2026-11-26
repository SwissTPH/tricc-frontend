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
 * A designation carrying this extension is a flavour of the concept's text: another wording a
 * node can pick by its code (feature/20261125-concept-text-flavours.md).
 */
export const FLAVOUR_SCOPE_URL = 'https://tricc.org/StructureDefinition/designation-flavour'

/** A flavour code: lowercase letters, digits and `_`. */
export const FLAVOUR_CODE = /^[a-z0-9_]+$/

/** The flavour a designation is a text of; undefined for a default text. */
export function designationFlavour(d: Designation): string | undefined {
  const ext = (d.extension ?? []).find(
    (e) =>
      typeof e === 'object' && e !== null && (e as { url?: unknown }).url === FLAVOUR_SCOPE_URL,
  ) as { valueCode?: unknown } | undefined
  return typeof ext?.valueCode === 'string' ? ext.valueCode : undefined
}

/**
 * A text for every intervention and every node: no intervention or flavour scope (other
 * extensions do not count).
 */
export function isUnscoped(d: Designation): boolean {
  return designationInterventions(d).length === 0 && designationFlavour(d) === undefined
}

export function scopeExtension(interventionIds: string[]): unknown[] {
  return interventionIds.map((valueCode) => ({ url: INTERVENTION_SCOPE_URL, valueCode }))
}

export function flavourScopeExtension(code: string): unknown[] {
  return [{ url: FLAVOUR_SCOPE_URL, valueCode: code }]
}

/** The designation with its flavour set, changed or (undefined) removed. */
export function withFlavour(d: Designation, code: string | undefined): Designation {
  const kept = (d.extension ?? []).filter((e) => (e as { url?: unknown }).url !== FLAVOUR_SCOPE_URL)
  const extension = code === undefined ? kept : [...kept, ...flavourScopeExtension(code)]
  const next: Designation = { ...d }
  if (extension.length) next.extension = extension
  else delete next.extension
  return next
}

/** The flavour codes of a concept, in the order of their first text. */
export function conceptFlavours(concept: Concept | undefined): string[] {
  const out: string[] = []
  for (const d of concept?.designations ?? []) {
    const f = designationFlavour(d)
    if (f !== undefined && !out.includes(f)) out.push(f)
  }
  return out
}

/** The concept with a flavour renamed, in every language and use. */
export function renameFlavour(concept: Concept, from: string, to: string): Concept {
  return {
    ...concept,
    designations: concept.designations.map((d) =>
      designationFlavour(d) === from ? withFlavour(d, to) : d,
    ),
  }
}

/** The concept without a flavour's texts, in every language and use. */
export function removeFlavour(concept: Concept, code: string): Concept {
  return {
    ...concept,
    designations: concept.designations.filter((d) => designationFlavour(d) !== code),
  }
}

/** Where a text is read: the intervention, and the flavour the node picked. */
export interface TextScope {
  interventionId?: string
  flavour?: string
}

/** The designation is scoped to exactly this intervention and flavour (each absent = none). */
function hasScope(d: Designation, scope: TextScope): boolean {
  const ivs = designationInterventions(d)
  const sameIv = scope.interventionId
    ? ivs.length === 1 && ivs[0] === scope.interventionId
    : ivs.length === 0
  return sameIv && designationFlavour(d) === scope.flavour
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
 * The most specific text wins: the flavour in the intervention, the flavour, the intervention,
 * then the default. The display is the dictionary name: it has no flavour.
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
  const flavour = use === 'display' ? undefined : scope.flavour
  const find = (u: DesignationUse) => {
    const matching = concept.designations.filter(
      (d) => d.language === lang && designationUse(d) === u && d.value !== '',
    )
    const forFlavour = (d: Designation) =>
      flavour !== undefined && designationFlavour(d) === flavour
    const forIv = (d: Designation) =>
      interventionId !== undefined && designationInterventions(d).includes(interventionId)
    const noIv = (d: Designation) => designationInterventions(d).length === 0
    const noFlavour = (d: Designation) => designationFlavour(d) === undefined
    const hit =
      matching.find((d) => forFlavour(d) && forIv(d)) ??
      matching.find((d) => forFlavour(d) && noIv(d)) ??
      matching.find((d) => forIv(d) && noFlavour(d)) ??
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
  const scoped = scope.interventionId !== undefined || scope.flavour !== undefined
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
                  ...(scope.flavour !== undefined ? flavourScopeExtension(scope.flavour) : []),
                ],
              }
            : {}),
        }
  const updated = withDesignationText(base, text)
  if (index >= 0) next.designations[index] = updated
  else next.designations.push(updated)
  return next
}
