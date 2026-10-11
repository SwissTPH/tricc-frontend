/**
 * Per-viewer editor preferences.
 *
 * They belong to the person, not the project: they are never written to the project
 * folder, so two authors on one project can differ.
 */
export interface EditorPreferences {
  /** Lines of text a canvas node shows before it clamps. */
  labelLines: number
  /** Characters of a label shown in short places: answer links, the Insert data list. */
  labelChars: number
  /** The concept types the data dictionary offers. */
  conceptTypes: string[]
}

/**
 * Concept types `tricc_oo` knows: the defaults it assigns by node type
 * (`converters/xml_to_tricc.py` `get_concept_type`) and the types its FHIR strategy maps to a
 * resource (`converters/fhir/concept_mapper.py`; matched case-insensitively).
 */
export const DEFAULT_CONCEPT_TYPES = [
  'Observation',
  'Value',
  'Condition',
  'Symptom-Finding',
  'Question',
  'Value',
  'InteractSet',
  'Diagnosis',
  'Calculation',
  'Misc',
  'Finding',
  'Symptom',
  'Sign',
  'Vital',
  'Test',
  'Lab',
  'LabSet',
  'Drug',
  'Medication',
  'Treatment',
  'Procedure',
  'Intervention',
  'Referral',
  'Service',
  'Encounter',
  'Patient',
] as const

export const LABEL_LINES_MIN = 1
export const LABEL_LINES_MAX = 6
export const LABEL_CHARS_MIN = 5
export const LABEL_CHARS_MAX = 80

export const DEFAULT_PREFERENCES: EditorPreferences = {
  labelLines: 3,
  labelChars: 20,
  conceptTypes: [...DEFAULT_CONCEPT_TYPES],
}

export interface PreferencesPort {
  current(): EditorPreferences
  update(patch: Partial<EditorPreferences>): void
  onChange(cb: () => void): () => void
}

/** Keep a stored or typed value inside what the editor can render. */
export function normalizePreferences(raw: Partial<EditorPreferences> | undefined): EditorPreferences {
  const lines = Math.round(Number(raw?.labelLines))
  const chars = Math.round(Number(raw?.labelChars))
  const types = Array.isArray(raw?.conceptTypes)
    ? raw.conceptTypes.map((t) => String(t).trim()).filter((t) => t !== '')
    : []
  const unique = types.filter(
    (t, i) => types.findIndex((u) => u.toLowerCase() === t.toLowerCase()) === i,
  )
  return {
    labelLines: Number.isFinite(lines)
      ? Math.min(LABEL_LINES_MAX, Math.max(LABEL_LINES_MIN, lines))
      : DEFAULT_PREFERENCES.labelLines,
    labelChars: Number.isFinite(chars)
      ? Math.min(LABEL_CHARS_MAX, Math.max(LABEL_CHARS_MIN, chars))
      : DEFAULT_PREFERENCES.labelChars,
    conceptTypes: unique.length > 0 ? unique : [...DEFAULT_CONCEPT_TYPES],
  }
}
