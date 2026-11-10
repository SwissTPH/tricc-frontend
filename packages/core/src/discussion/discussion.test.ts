import { describe, expect, it } from 'vitest'
import { ProjectDocument, READ_ONLY_CAPABILITIES, REVIEW_CAPABILITIES } from '../document/doc.js'
import { sampleProject } from '../format/__fixtures__.js'
import { readProject, writeChanged, writeProject } from '../format/serialize/index.js'
import type { Anchor, Person } from '../model/types.js'
import { anchorLabel, resolveAnchor } from './anchor.js'
import type { DiscussionActor } from './store.js'

const ACTIVITY = 'triage-danger-signs'
const alice: Person = { id: 'alice', name: 'Alice Martin' }
const bob: Person = { id: 'bob', name: 'Bob' }

function actor(by: Person, canModerate = false): DiscussionActor {
  return { by, at: '2026-10-27T14:00:00Z', canModerate }
}

function nodeAnchor(): Anchor {
  return { kind: 'node', activityId: ACTIVITY, nodeId: 'n-weight' }
}

function noteAnchor(commentId = 'note'): Anchor {
  return { kind: 'comment', activityId: ACTIVITY, commentId }
}

describe('discussion files', () => {
  it('writes no discussions folder when the project has none', () => {
    const paths = Object.keys(writeProject(sampleProject()))
    expect(paths.filter((path) => path.startsWith('discussions/'))).toEqual([])
  })

  it('round-trips a discussion on a node and one on a sticky note', () => {
    const doc = ProjectDocument.fromProject(sampleProject())
    doc.transact((tx) =>
      tx.setComment(ACTIVITY, {
        id: 'note',
        text: 'Check the dose',
        color: 'yellow',
        x: 10,
        y: 20,
        node: 'n-weight',
      }),
    )
    const onNote = doc.discuss(actor(alice), (tx) =>
      tx.start(noteAnchor(), 'Check the dose', 'Is this the note?', ['question']),
    )
    const onNode = doc.discuss(actor(alice), (tx) =>
      tx.start(nodeAnchor(), 'weight', 'Is this the node?', ['clinical-review']),
    )
    const files = writeProject(doc.snapshot())
    expect(files[`discussions/${onNote}.discussion.yaml`]).toContain('comment: note')
    expect(files[`discussions/${onNode}.discussion.yaml`]).toContain('node: n-weight')

    const { project } = readProject(files)
    expect(project.discussions).toEqual(doc.snapshot().discussions)
    expect(project.discussionLabels).toEqual(doc.snapshot().discussionLabels)
    expect(project.discussions?.[onNote]?.about).toEqual(noteAnchor())
    expect(project.discussions?.[onNode]?.about).toEqual(nodeAnchor())
  })

  it('drops the discussion file when the discussion is removed, and keeps the categories', () => {
    const doc = ProjectDocument.fromProject(sampleProject())
    const id = doc.discuss(actor(alice), (tx) =>
      tx.start(nodeAnchor(), 'weight', 'A question', ['question']),
    )
    const before = writeProject(doc.snapshot())
    doc.discuss(actor(alice), (tx) => tx.discard(id))
    const { removed, files } = writeChanged(doc.snapshot(), before)
    expect(removed).toEqual([`discussions/${id}.discussion.yaml`])
    expect(files['discussions/labels.yaml']).toBeTypeOf('string')
    expect(doc.snapshot().discussions).toBeUndefined()
  })
})

describe('one category', () => {
  it('keeps only the first category, on start and on a later change', () => {
    const doc = ProjectDocument.fromProject(sampleProject())
    const id = doc.discuss(actor(alice), (tx) =>
      tx.start(nodeAnchor(), 'weight', 'Which one?', ['decision', 'problem']),
    )
    expect(doc.snapshot().discussions?.[id]?.labels).toEqual(['decision'])
    doc.discuss(actor(alice), (tx) => tx.setLabels(id, ['problem', 'question']))
    expect(doc.snapshot().discussions?.[id]?.labels).toEqual(['problem'])
  })
})

describe('undo', () => {
  it('does not remove a discussion', () => {
    const doc = ProjectDocument.fromProject(sampleProject())
    const id = doc.discuss(actor(alice), (tx) =>
      tx.start(nodeAnchor(), 'weight', 'Still here', ['question']),
    )
    doc.transact((tx) => tx.moveNode(ACTIVITY, 'n-weight', 9, 9))
    doc.undo.undo()
    expect(doc.snapshot().activities[ACTIVITY]?.nodes['n-weight']?.ui?.x).toBe(40)
    expect(doc.snapshot().discussions?.[id]?.comments[0]?.text).toBe('Still here')
  })
})

describe('sticky note', () => {
  it('keeps the thread when the note is deleted, and reattaches when the note returns', () => {
    const doc = ProjectDocument.fromProject(sampleProject())
    doc.transact((tx) =>
      tx.setComment(ACTIVITY, {
        id: 'note',
        text: 'Check the dose',
        color: 'yellow',
        x: 10,
        y: 20,
        node: 'n-weight',
      }),
    )
    const project = doc.snapshot()
    expect(anchorLabel(project, noteAnchor(), 'en')).toBe('Check the dose')
    const onNote = doc.discuss(actor(alice), (tx) =>
      tx.start(noteAnchor(), anchorLabel(project, noteAnchor(), 'en'), 'About the note', [
        'question',
      ]),
    )
    const onNode = doc.discuss(actor(alice), (tx) =>
      tx.start(nodeAnchor(), 'weight', 'About the node', ['problem']),
    )

    doc.undo.breakGesture()
    doc.transact((tx) => tx.removeComment(ACTIVITY, 'note'))
    const gone = doc.snapshot()
    expect(resolveAnchor(gone, noteAnchor())).toBeUndefined()
    expect(gone.discussions?.[onNote]?.about).toEqual(noteAnchor())
    expect(gone.discussions?.[onNote]?.label).toBe('Check the dose')
    expect(resolveAnchor(gone, nodeAnchor())?.id).toBe('n-weight')
    expect(gone.discussions?.[onNode]?.about).toEqual(nodeAnchor())

    doc.undo.undo()
    const back = doc.snapshot()
    expect(resolveAnchor(back, noteAnchor())).toMatchObject({ id: 'note', text: 'Check the dose' })
    expect(back.discussions?.[onNote]?.about).toEqual(noteAnchor())
    expect(back.discussions?.[onNode]?.comments[0]?.text).toBe('About the node')
  })
})

describe('who may write', () => {
  it('refuses a discussion without comment.write', () => {
    const doc = ProjectDocument.fromProject(sampleProject(), {
      capabilities: () => READ_ONLY_CAPABILITIES,
    })
    expect(() =>
      doc.discuss(actor(alice), (tx) => tx.start(nodeAnchor(), 'weight', 'No', ['question'])),
    ).toThrow(/comment\.write/)
    expect(doc.snapshot().discussions).toBeUndefined()
  })

  it('lets a reviewer discuss, and refuses an edit of someone else’s comment', () => {
    const doc = ProjectDocument.fromProject(sampleProject(), {
      capabilities: () => REVIEW_CAPABILITIES,
    })
    const id = doc.discuss(actor(alice), (tx) =>
      tx.start(nodeAnchor(), 'weight', 'Alice wrote this', ['question']),
    )
    const commentId = doc.snapshot().discussions?.[id]?.comments[0]?.id ?? ''
    expect(() =>
      doc.discuss(actor(bob), (tx) => tx.edit(id, commentId, 'Bob rewrites it')),
    ).toThrow(/comment\.moderate/)
    expect(doc.snapshot().discussions?.[id]?.comments[0]?.text).toBe('Alice wrote this')
    doc.discuss(actor(bob, true), (tx) => tx.edit(id, commentId, 'A moderator edits it'))
    expect(doc.snapshot().discussions?.[id]?.comments[0]?.text).toBe('A moderator edits it')
  })
})

describe('removing', () => {
  it('hides one comment and leaves the discussion', () => {
    const doc = ProjectDocument.fromProject(sampleProject())
    const id = doc.discuss(actor(alice), (tx) =>
      tx.start(nodeAnchor(), 'weight', 'The question', ['question']),
    )
    const replyId = doc.discuss(actor(alice), (tx) => tx.reply(id, 'A reply'))
    doc.discuss(actor(alice), (tx) => tx.remove(id, replyId))
    const discussion = doc.snapshot().discussions?.[id]
    const reply = discussion?.comments.find((comment) => comment.id === replyId)
    expect(reply?.deleted).toBe(true)
    expect(reply?.text).toBeUndefined()
    expect(discussion?.comments[0]?.text).toBe('The question')
    expect(discussion?.status).toBe('open')
  })

  it('removes the whole discussion only for its starter, until someone else has answered', () => {
    const doc = ProjectDocument.fromProject(sampleProject())
    const id = doc.discuss(actor(alice), (tx) =>
      tx.start(nodeAnchor(), 'weight', 'The question', ['question']),
    )
    expect(() => doc.discuss(actor(bob), (tx) => tx.discard(id))).toThrow(/answered/)
    expect(doc.snapshot().discussions?.[id]).toBeDefined()

    doc.discuss(actor(bob), (tx) => tx.reply(id, 'An answer'))
    expect(() => doc.discuss(actor(alice), (tx) => tx.discard(id))).toThrow(/answered/)
    expect(doc.snapshot().discussions?.[id]?.comments).toHaveLength(2)

    doc.discuss(actor(alice, true), (tx) => tx.discard(id))
    expect(doc.snapshot().discussions).toBeUndefined()
  })
})
