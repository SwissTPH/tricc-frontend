/**
 * @tricc/core — the guideline model, the collaborative document, the file format,
 * authoring validation, terminology, and every environment port.
 *
 * Framework-free by construction: nothing here imports React.
 */

// Model
export * from './model/types.js'
export * from './model/activity-kind.js'

// Format
export * from './format/schema/index.js'
export * from './format/codec.js'
export {
  readProject,
  writeProject,
  writeChanged,
  createProject,
  createActivity,
  createProcessActivity,
  FormatVersionError,
  toYaml,
  fromYaml,
  toJson,
  fromJson,
  type ProjectFiles,
  type ReadResult,
} from './format/serialize/index.js'
export {
  toArchive,
  fromArchive,
  normalizeImport,
  stripCommonRoot,
  ARCHIVE_EXTENSION,
} from './format/archive.js'
export {
  MIGRATIONS,
  compareVersions,
  parseVersion,
  type Migration,
} from './format/migrations/index.js'

// Document
export {
  ProjectDocument,
  CapabilityError,
  ALL_CAPABILITIES,
  READ_ONLY_CAPABILITIES,
  type ProjectDocumentOptions,
  type Unsubscribe,
} from './document/doc.js'
export { Mutations } from './document/mutations.js'
export { UndoController } from './document/undo.js'
export { LOCAL_ORIGIN } from './document/codec.js'

// Validation
export * from './validate/index.js'

// Terminology
export * from './terminology/index.js'

// Ports and runtime
export * from './ports/index.js'
export {
  TriccRuntime,
  createTriccRuntime,
  type TriccRuntimeConfig,
  type OpenProject,
} from './runtime.js'
