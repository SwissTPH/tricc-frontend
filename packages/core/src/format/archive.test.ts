import { describe, expect, it } from 'vitest'
import { fromArchive, normalizeImport, stripCommonRoot, toArchive } from './archive.js'
import { readProject, writeProject } from './serialize/index.js'
import { sampleProject } from './__fixtures__.js'

describe('archive round-trip', () => {
  it('packages a project and unpacks it unchanged', () => {
    const files = writeProject(sampleProject())
    expect(fromArchive(toArchive(files))).toEqual(files)
  })

  it('a packaged project still reads as a project', () => {
    const original = sampleProject()
    const { project } = readProject(fromArchive(toArchive(writeProject(original))))
    expect(project).toEqual(original)
  })

  it('is deterministic — identical content gives identical bytes', () => {
    const files = writeProject(sampleProject())
    expect(Array.from(toArchive(files))).toEqual(Array.from(toArchive(files)))
  })

  it('preserves unicode and newlines', () => {
    const files = { 'a.txt': 'Fièvre — sévère\nline two\n' }
    expect(fromArchive(toArchive(files))).toEqual(files)
  })
})

describe('imported archives from other tools', () => {
  it('strips a single wrapping folder', () => {
    const wrapped = {
      'my-guideline/project.json': '{}',
      'my-guideline/activities/a.activity.yaml': 'id: a',
    }
    expect(stripCommonRoot(wrapped)).toEqual({
      'project.json': '{}',
      'activities/a.activity.yaml': 'id: a',
    })
  })

  it('leaves an already-flat project alone', () => {
    const flat = { 'project.json': '{}', 'activities/a.activity.yaml': 'id: a' }
    expect(stripCommonRoot(flat)).toEqual(flat)
  })

  it('does not strip when the result would not be a project', () => {
    // Two activities and nothing else: stripping "activities/" would lose the structure.
    const files = { 'activities/a.yaml': 'a', 'activities/b.yaml': 'b' }
    expect(stripCommonRoot(files)).toEqual(files)
  })

  it('does not strip when there are several top-level folders', () => {
    const files = { 'a/project.json': '{}', 'b/project.json': '{}' }
    expect(stripCommonRoot(files)).toEqual(files)
  })

  it('drops macOS archive noise', () => {
    const files = {
      'project.json': '{}',
      '__MACOSX/._project.json': 'junk',
      'activities/.DS_Store': 'junk',
    }
    expect(normalizeImport(files)).toEqual({ 'project.json': '{}' })
  })
})
