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
  type FileContent,
  type ReadResult,
  isBinaryPath,
  fileText,
  fileBytes,
  sameContent,
  mergeImages,
} from './format/serialize/index.js'
export {
  anchorFromParam,
  anchorKey,
  anchorKindName,
  anchorLabel,
  anchorToParam,
  resolveAnchor,
} from './discussion/anchor.js'
export { DEFAULT_DISCUSSION_LABELS } from './discussion/labels.js'
export { parseCommentText, type TextPart } from './discussion/text.js'
export {
  decisionLog,
  decisionLogCsv,
  decisionLogMarkdown,
  type DecisionRow,
} from './discussion/decision-log.js'
export { LocalDiscussions, oneCategory, type DiscussionPort } from './discussion/port.js'
export {
  readRepository,
  repositoryOfTriccYaml,
  setTriccYamlRepository,
} from './format/serialize/tricc-yaml.js'
export {
  toArchive,
  fromArchive,
  normalizeImport,
  stripCommonRoot,
  ARCHIVE_EXTENSION,
} from './format/archive.js'
export { readActivityFile, type ParsedActivity } from './format/import-activity.js'
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
  REVIEW_CAPABILITIES,
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
export * from './text/index.js'

// Ports and runtime
export * from './ports/index.js'
export {
  TriccRuntime,
  createTriccRuntime,
  type TriccRuntimeConfig,
  type OpenProject,
} from './runtime.js'
