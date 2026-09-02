import type { Activity, Project } from '../model/types.js'

/** A small but semantically broad activity: branch, select, calculate, wait, diagnosis. */
export function sampleActivity(): Activity {
  return {
    id: 'triage-danger-signs',
    title: { en: 'Triage — danger signs', fr: 'Triage — signes de danger' },
    process: 'triage',
    applicability: { expression: 'AgeInMonths() < 60' },
    ui: { viewport: { x: 0, y: 0, zoom: 1 } },
    nodeOrder: ['n-start', 'n-weight', 'n-convulsions', 'n-score', 'n-severe', 'n-end'],
    edgeOrder: ['e1', 'e2', 'e3', 'e4'],
    nodes: {
      'n-start': {
        id: 'n-start',
        type: 'activity_start',
        name: 'triage_danger_signs',
        label: { en: 'Triage — danger signs' },
        ui: { x: 40, y: 40 },
      },
      'n-weight': {
        id: 'n-weight',
        type: 'integer',
        name: 'weight',
        label: { en: 'Weight (kg)', fr: 'Poids (kg)' },
        hint: { en: 'Use a calibrated scale' },
        concept: { system: 'http://tricc.org/CodeSystem/tricc', code: 'weight' },
        required: true,
        min: 0,
        max: 200,
        repeat: 1,
        notAvailable: { name: 'weight_not_available', label: { en: 'Weight not available' } },
        ui: { x: 40, y: 160, width: 200, height: 70 },
      },
      'n-convulsions': {
        id: 'n-convulsions',
        type: 'select_yesno',
        name: 'convulsions',
        label: { en: 'Convulsions?' },
        relevance: {
          intent: { en: 'Only for children under five with prolonged fever' },
          expression: 'AgeInMonths() < 60 and "Fever duration" > 3',
        },
        listName: 'yes_no',
        ui: { x: 40, y: 280 },
      },
      'n-score': {
        id: 'n-score',
        type: 'calculate',
        name: 'danger_score',
        calculate: { expression: '"convulsions" + "weight"' },
        ui: { x: 300, y: 280 },
      },
      'n-severe': {
        id: 'n-severe',
        type: 'proposed_diagnosis',
        name: 'severe_disease',
        label: { en: 'Very severe disease' },
        severity: 'severe',
        priority: 10,
        ui: { x: 40, y: 420 },
      },
      'n-end': { id: 'n-end', type: 'activity_end', ui: { x: 40, y: 540 } },
    },
    edges: {
      e1: {
        id: 'e1',
        source: 'n-start',
        target: 'n-weight',
        ui: { waypoints: [{ x: 140, y: 120 }] },
      },
      e2: { id: 'e2', source: 'n-weight', target: 'n-convulsions' },
      e3: { id: 'e3', source: 'n-convulsions', target: 'n-severe', value: 'yes' },
      e4: { id: 'e4', source: 'n-convulsions', target: 'n-end', value: 'no' },
    },
  }
}

export function sampleProject(): Project {
  const activity = sampleActivity()
  return {
    formatVersion: '1.0.0',
    id: 'smart-imci',
    system: 'http://tricc.org/smart-imci',
    code: 'smart-imci',
    version: '0.3.0',
    title: { en: 'IMCI sick child', fr: 'PCIME enfant malade' },
    languages: { default: 'en', available: ['en', 'fr'] },
    interventions: [
      {
        id: 'sick-child',
        code: 'sick-child',
        title: { en: 'Sick child consultation' },
        applicability: {
          intent: { en: 'Children from 2 months up to 5 years' },
          expression: 'AgeInMonths() >= 2 and AgeInMonths() < 60',
        },
        trigger: { mode: 'on-demand' },
        processes: [
          { process: 'triage', activities: [{ ref: 'triage-danger-signs' }] },
          {
            process: 'history-and-physical',
            activities: [
              { ref: 'hp-cough' },
              { ref: 'hp-diarrhoea', applicability: { expression: '"diarrhoea"' } },
            ],
          },
        ],
      },
    ],
    contexts: [{ system: 'http://tricc.org/context', code: 'encounter', display: 'Encounter' }],
    codeSystems: {
      'http://tricc.org/CodeSystem/tricc': {
        id: 'tricc',
        url: 'http://tricc.org/CodeSystem/tricc',
        version: '0.3.0',
        name: 'TriccConcepts',
        status: 'draft',
        content: 'complete',
        caseSensitive: true,
        conceptOrder: ['weight', 'date_of_birth'],
        concepts: {
          weight: {
            system: 'http://tricc.org/CodeSystem/tricc',
            code: 'weight',
            display: 'Weight',
            definition: 'Body weight measured at this encounter',
            designations: { fr: 'Poids' },
            dataType: 'decimal',
            conceptType: 'vital',
            unit: 'kg',
          },
          date_of_birth: {
            system: 'http://tricc.org/CodeSystem/tricc',
            code: 'date_of_birth',
            display: 'Date of birth',
            designations: {},
            dataType: 'date',
            conceptType: 'patient',
            targetResource: 'Patient',
            targetPath: 'birthDate',
          },
        },
      },
    },
    defaultCodeSystem: 'http://tricc.org/CodeSystem/tricc',
    libraries: { Shared: "library Shared version '1.0.0'\n" },
    activities: { [activity.id]: activity, 'hp-cough': minimalActivity('hp-cough') },
  }
}

export function minimalActivity(id: string): Activity {
  return {
    id,
    title: { en: id },
    nodeOrder: ['s'],
    edgeOrder: [],
    nodes: {
      s: { id: 's', type: 'activity_start', name: id.replace(/-/g, '_'), ui: { x: 0, y: 0 } },
    },
    edges: {},
  }
}
