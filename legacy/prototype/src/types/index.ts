// Core TRICC Types based on the Python models

export interface TriccRef {
  system: string
  code: string
  version?: string
  instance?: number
  display?: string
}

export interface Concept {
  code: string
  system: string
  version?: string
  display: string
  dataType: string
  conceptType: string
}

export interface CodeSystem {
  id: string
  name: string
  description?: string
  concepts: Concept[]
}

export interface DisplayType {
  code: string
  system: string
  display: string
  description?: string
}

export interface TriccNode {
  id: string
  type: TriccNodeType
  concept?: Concept
  displayType?: DisplayType
  position: { x: number; y: number }
  data: {
    label: string
    expression?: string
    applicability?: string
    default?: string
    save?: string // obs, diag, flag, or obs.[othername].[snomedCode]
    process?: string // For start nodes: CPG common process
    link?: string // For link nodes: reference to activity
    expressionInputs?: string // Additional expression inputs
    attributes?: Record<string, any>
    options?: Concept[] // For select_one and select_multiple nodes
  }
}

export interface TriccEdge {
  id: string
  source: string
  target: string
  logic?: string
  weight?: number
  label?: string
}

export interface TriccActivity {
  id: string
  name: string
  type: 'normal' | 'segment'
  trigger?: string // For segments: trigger condition
  process?: string // For main activities: CPG common process
  nodes: TriccNode[]
  edges: TriccEdge[]
  dataInputs: TriccDataInput[]
  dataOutputs: TriccDataOutput[]
  conformanceRules: string[]
  starts: string[] // Node IDs that are start nodes
  instantiate?: string // Reference to abstract activity
  context?: TriccContext
}

export interface TriccDataInput {
  name: string
  type: string
  required: boolean
  criteria?: string // Search criteria
}

export interface TriccDataOutput {
  name: string
  type: string
  validator?: string[]
}

export interface TriccProject {
  id: string
  title: string
  description: string
  langCode: string
  activities: Record<string, TriccActivity>
  segments: Record<string, string[]> // segment name -> list of activity IDs
  order: string[] // Ordered list of activity IDs or process names
  contexts: TriccContext[]
  codeSystems: Record<string, CodeSystem>
  valueSets: Record<string, any>
  mediaPath?: string
  system?: string // Project system identifier
  code?: string // Project code
  version?: string // Project version
}

export interface TriccContext {
  system: string
  code: string
  version?: string
  display: string
  attributes?: Record<string, any>
}

export interface CustomNodeData {
  label: string
  nodeType: TriccNodeType
  concept?: Concept
  displayType?: DisplayType
  expression?: string
  applicability?: string
  default?: string
  attributes?: Record<string, any>
  options?: Concept[]
}

// CPG Common Process list for activity ordering
export const CPG_COMMON_PROCESSES = [
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

export type CPGProcess = (typeof CPG_COMMON_PROCESSES)[number]

export enum TriccNodeType {
  NOTE = 'note',
  CALCULATE = 'calculate',
  OUTPUT = 'output',
  SELECT_MULTIPLE = 'select_multiple',
  SELECT_ONE = 'select_one',
  SELECT_YESNO = 'select_one yesno',
  DECIMAL = 'decimal',
  INTEGER = 'integer',
  TEXT = 'text',
  DATE = 'date',
  RHOMBUS = 'rhombus',
  GOTO = 'goto',
  START = 'start',
  ACTIVITY_START = 'activity_start',
  LINK_IN = 'link_in',
  LINK_OUT = 'link_out',
  COUNT = 'count',
  ADD = 'add',
  ACTIVITY = 'activity',
  HELP = 'help-message',
  HINT = 'hint-message',
  EXCLUSIVE = 'not',
  END = 'end',
  ACTIVITY_END = 'activity_end',
  EDGE = 'edge',
  PAGE = 'page',
  NOT_AVAILABLE = 'not_available',
  QUANTITY = 'quantity',
  BRIDGE = 'bridge',
  WAIT = 'wait',
  OPERATION = 'operation',
  CONTEXT = 'context',
  DIAGNOSIS = 'diagnosis',
  PROPOSED_DIAGNOSIS = 'proposed_diagnosis',
  INPUT = 'input',
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'author' | 'viewer'
}

export interface ProjectSettings {
  terminologyServerUrl: string
  defaultLanguage: string
  autoSave: boolean
  theme: 'light' | 'dark'
}

export interface TerminologyServerConfig {
  url: string
  name: string
  description?: string
  isDefault: boolean
}
