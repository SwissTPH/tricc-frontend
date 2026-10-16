import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { sampleProject } from '../__fixtures__.js'
import { projectFromDoc, projectToDoc } from '../../document/codec.js'
import { ProjectDocument } from '../../document/doc.js'
import { readProject, writeProject } from './index.js'
import { readRepository, repositoryOfTriccYaml, setTriccYamlRepository } from './tricc-yaml.js'

const REPO = {
  host: 'github' as const,
  url: 'https://github.com/SwissTPH/almanach',
  branch: 'main',
  path: 'projects/global',
}

describe('tricc.yaml repository', () => {
  it('survives tricc.yaml and the document', () => {
    const project = { ...sampleProject(), repository: REPO }
    const files = writeProject(project)
    expect(String(files['tricc.yaml'])).toContain('repository:\n  host: github\n')
    expect(readProject(files).project.repository).toEqual(REPO)
    const doc = new Y.Doc()
    projectToDoc(project, doc)
    expect(projectFromDoc(doc).repository).toEqual(REPO)
  })

  it('is written only when the project has one', () => {
    expect(String(writeProject(sampleProject())['tricc.yaml'])).not.toContain('repository')
  })

  it('ignores an incomplete entry and trims slashes', () => {
    expect(readRepository({ host: 'bitbucket', url: 'x', branch: 'main' })).toBeUndefined()
    expect(readRepository({ host: 'gitlab', url: 'https://gitlab.com/a/b' })).toBeUndefined()
    expect(readRepository({ host: 'gitlab', url: 'https://gitlab.com/a/b/', branch: 'dev', path: '/p/' })).toEqual({
      host: 'gitlab',
      url: 'https://gitlab.com/a/b',
      branch: 'dev',
      path: 'p',
    })
    expect(readRepository({ ...REPO, path: '' })).toEqual({ host: 'github', url: REPO.url, branch: 'main' })
  })

  it('is set in a tricc.yaml text without touching the rest of it', () => {
    const text = '# Almanach\ntitle: Global # the programme\ninterventions: []\n'
    const out = setTriccYamlRepository(text, REPO)
    expect(out).toContain('# Almanach\ntitle: Global # the programme\n')
    expect(repositoryOfTriccYaml(out)).toEqual(REPO)
    expect(repositoryOfTriccYaml('title: [')).toBeUndefined()
  })

  it('is set and cleared through the document', () => {
    const pd = ProjectDocument.fromProject(sampleProject())
    pd.transact((tx) => tx.setRepository(REPO))
    expect(pd.snapshot().repository).toEqual(REPO)
    pd.transact((tx) => tx.setRepository(undefined))
    expect(pd.snapshot().repository).toBeUndefined()
  })
})
