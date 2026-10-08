import { describe, expect, it } from 'vitest'
import { validateActivity } from './activity.js'
import { validateProject } from './project.js'
import { blocksExport, type Issue } from './types.js'
import { sampleProject, sampleActivity, minimalActivity } from '../format/__fixtures__.js'
import type { Activity, Project, TriccNode } from '../model/types.js'

function rules(issues: Issue[]): string[] {
  return [...new Set(issues.map((i) => i.rule))].sort()
}
function find(issues: Issue[], rule: string): Issue[] {
  return issues.filter((i) => i.rule === rule)
}

/** A minimal valid activity to mutate per test, so each test states only its own defect. */
function base(): Activity {
  return {
    id: 'a',
    nodeOrder: ['s', 'q', 'e'],
    edgeOrder: ['e1', 'e2'],
    nodes: {
      s: { id: 's', type: 'activity_start', name: 'a' },
      q: { id: 'q', type: 'integer', name: 'weight' },
      e: { id: 'e', type: 'activity_end' },
    },
    edges: {
      e1: { id: 'e1', source: 's', target: 'q' },
      e2: { id: 'e2', source: 'q', target: 'e' },
    },
  }
}

function add(a: Activity, node: TriccNode, from?: string): Activity {
  a.nodes[node.id] = node
  a.nodeOrder.push(node.id)
  if (from) {
    const id = `edge-${from}-${node.id}`
    a.edges[id] = { id, source: from, target: node.id }
    a.edgeOrder.push(id)
  }
  return a
}

describe('a well-formed activity is clean', () => {
  it('reports nothing on the base fixture', () => {
    expect(validateActivity(base())).toEqual([])
  })

  it('reports nothing on the richer sample', () => {
    const issues = validateActivity(sampleActivity())
    expect(rules(issues)).toEqual([])
  })
})

describe('structure', () => {
  it('flags an activity with no entry point', () => {
    const a = base()
    delete a.nodes['s']
    a.nodeOrder = a.nodeOrder.filter((n) => n !== 's')
    expect(rules(validateActivity(a))).toContain('activity.no-start')
  })

  it('flags more than one entry point', () => {
    const a = add(base(), { id: 's2', type: 'activity_start', name: 'other' })
    expect(rules(validateActivity(a))).toContain('activity.multiple-starts')
  })

  it('warns, not errors, when an activity has no end', () => {
    const a = base()
    delete a.nodes['e']
    a.nodeOrder = a.nodeOrder.filter((n) => n !== 'e')
    delete a.edges['e2']
    a.edgeOrder = ['e1']
    const issues = validateActivity(a)
    expect(find(issues, 'activity.no-end')[0]?.severity).toBe('warning')
  })

  it('flags an unreachable node', () => {
    const a = add(base(), { id: 'orphan', type: 'note', name: 'orphan' })
    const issues = find(validateActivity(a), 'node.unreachable')
    expect(issues).toHaveLength(1)
    expect(issues[0]?.location.nodeId).toBe('orphan')
  })

  it('does not treat a dangling calculate as unreachable', () => {
    // tricc_oo collects these deliberately (manage_dangling_calculate).
    const a = add(base(), {
      id: 'calc',
      type: 'calculate',
      name: 'total',
      calculate: { expression: '1' },
    })
    expect(rules(validateActivity(a))).not.toContain('node.unreachable')
  })
})

describe('per-node rules', () => {
  it('requires options on a select_one', () => {
    const a = add(base(), { id: 'sel', type: 'select_one', name: 'colour' }, 'q')
    expect(rules(validateActivity(a))).toContain('select.no-options')
  })

  it('does not require options on select_yesno', () => {
    const a = add(base(), { id: 'yn', type: 'select_yesno', name: 'fever' }, 'q')
    expect(rules(validateActivity(a))).not.toContain('select.no-options')
  })

  it('requires an expression on a calculate', () => {
    const a = add(base(), { id: 'calc', type: 'calculate', name: 'score' })
    expect(rules(validateActivity(a))).toContain('calculate.no-expression')
  })

  it('requires a reference on a rhombus', () => {
    const a = add(base(), { id: 'r', type: 'rhombus' }, 'q')
    const issues = find(validateActivity(a), 'rhombus.no-reference')
    expect(issues[0]?.message).toMatch(/which earlier answer it checks/)
  })

  it('requires a reference on a wait', () => {
    const a = add(base(), { id: 'w', type: 'wait', name: 'w' }, 'q')
    expect(rules(validateActivity(a))).toContain('wait.no-reference')
  })

  it('requires a destination on a goto', () => {
    const a = add(base(), { id: 'g', type: 'goto' }, 'q')
    expect(rules(validateActivity(a))).toContain('goto.no-link')
  })

  it('requires a name on a capture node', () => {
    const a = base()
    delete a.nodes['q']!.name
    expect(rules(validateActivity(a))).toContain('node.missing-name')
  })

  it('does not require a name on a note', () => {
    const a = add(base(), { id: 'n', type: 'note', label: { en: 'Hello' } }, 'q')
    expect(find(validateActivity(a), 'node.missing-name')).toHaveLength(0)
  })

  it('rejects an injection-only type', () => {
    const a = base()
    a.nodes['f'] = { id: 'f', type: 'factor' as TriccNode['type'] }
    a.nodeOrder.push('f')
    const issues = find(validateActivity(a), 'node.injected-type')
    expect(issues[0]?.message).toMatch(/processed graph/)
  })
})

describe('name uniqueness is per repeat slot', () => {
  it('flags two nodes sharing a name in the same slot', () => {
    const a = add(base(), { id: 'q2', type: 'integer', name: 'weight' }, 'q')
    const issues = find(validateActivity(a), 'node.duplicate-name')
    expect(issues).toHaveLength(2)
    expect(issues[0]?.message).toMatch(/repeat slot 1/)
  })

  it('permits the same name in different repeat slots', () => {
    const a = add(base(), { id: 'q2', type: 'integer', name: 'weight', repeat: 2 }, 'q')
    expect(rules(validateActivity(a))).not.toContain('node.duplicate-name')
  })

  it('treats an absent repeat as slot 1', () => {
    const a = add(base(), { id: 'q2', type: 'integer', name: 'weight', repeat: 1 }, 'q')
    expect(rules(validateActivity(a))).toContain('node.duplicate-name')
  })
})

describe('open handoffs', () => {
  it('blocks export when an intent has no expression', () => {
    const a = base()
    a.nodes['q']!.relevance = { intent: { en: 'Only for infants' } }
    const issues = find(validateActivity(a), 'expression.open-handoff')
    expect(issues[0]?.severity).toBe('error')
    expect(blocksExport(issues)).toBe(true)
  })

  it('is clean when both intent and expression are present', () => {
    const a = base()
    a.nodes['q']!.relevance = {
      intent: { en: 'Only for infants' },
      expression: 'AgeInMonths() < 12',
    }
    expect(rules(validateActivity(a))).not.toContain('expression.open-handoff')
  })

  it('is clean when only an expression is present', () => {
    const a = base()
    a.nodes['q']!.relevance = { expression: 'true' }
    expect(rules(validateActivity(a))).not.toContain('expression.open-handoff')
  })
})

describe('edges', () => {
  it('flags a self-loop', () => {
    const a = base()
    a.edges['loop'] = { id: 'loop', source: 'q', target: 'q' }
    a.edgeOrder.push('loop')
    expect(rules(validateActivity(a))).toContain('edge.self-loop')
  })

  it('flags a dangling endpoint', () => {
    const a = base()
    a.edges['bad'] = { id: 'bad', source: 'q', target: 'ghost' }
    a.edgeOrder.push('bad')
    expect(rules(validateActivity(a))).toContain('edge.dangling-target')
  })

  it('flags two yes branches from one node', () => {
    const a = add(base(), { id: 'yn', type: 'select_yesno', name: 'fever' }, 'q')
    add(a, { id: 't1', type: 'note' })
    add(a, { id: 't2', type: 'note' })
    a.edges['y1'] = { id: 'y1', source: 'yn', target: 't1', value: 'yes' }
    a.edges['y2'] = { id: 'y2', source: 'yn', target: 't2', value: 'yes' }
    a.edgeOrder.push('y1', 'y2')
    expect(rules(validateActivity(a))).toContain('edge.duplicate-branch')
  })

  it('permits one yes and one no', () => {
    const a = add(base(), { id: 'yn', type: 'select_yesno', name: 'fever' }, 'q')
    add(a, { id: 't1', type: 'note' })
    add(a, { id: 't2', type: 'note' })
    a.edges['y1'] = { id: 'y1', source: 'yn', target: 't1', value: 'yes' }
    a.edges['n1'] = { id: 'n1', source: 'yn', target: 't2', value: 'no' }
    a.edgeOrder.push('y1', 'n1')
    expect(rules(validateActivity(a))).not.toContain('edge.duplicate-branch')
  })

  it('flags a yes branch from a node that has no answer to branch on', () => {
    const a = base()
    a.edges['e1']!.value = 'yes' // activity_start -> integer
    const issues = find(validateActivity(a), 'edge.branch-from-non-branching')
    expect(issues).toHaveLength(1)
    // A warning, not an error: the editor prevents creating these, so this only ever
    // fires on hand-edited or imported files, and blocking their export is too strong.
    expect(issues[0]?.severity).toBe('warning')
    expect(blocksExport(issues)).toBe(false)
  })

  it('accepts a yes branch from a node that does have an answer', () => {
    const a = add(base(), { id: 'yn', type: 'select_yesno', name: 'fever' }, 'q')
    add(a, { id: 't', type: 'note' })
    a.edges['y'] = { id: 'y', source: 'yn', target: 't', value: 'yes' }
    a.edgeOrder.push('y')
    expect(rules(validateActivity(a))).not.toContain('edge.branch-from-non-branching')
  })

  it('warns about the deprecated follow spelling and offers a fix', () => {
    const a = base()
    a.edges['e2']!.value = 'follow'
    const issues = find(validateActivity(a), 'edge.deprecated-continue')
    expect(issues[0]?.severity).toBe('warning')
    expect(issues[0]?.fix?.kind).toBe('edge.normalize-continue')
  })

  it('accepts continue without complaint', () => {
    const a = base()
    a.edges['e2']!.value = 'continue'
    expect(rules(validateActivity(a))).not.toContain('edge.deprecated-continue')
  })
})

describe('deprecated save', () => {
  it('warns but does not block export', () => {
    const a = base()
    a.nodes['q']!.save = 'obs'
    const issues = find(validateActivity(a), 'node.deprecated-save')
    expect(issues[0]?.severity).toBe('warning')
    expect(blocksExport(issues)).toBe(false)
  })
})

describe('concept binding', () => {
  it('flags a concept that is not in the project terminology', () => {
    const project = sampleProject()
    const a = project.activities['triage-danger-signs']!
    a.nodes['n-weight']!.concept = { system: 'http://tricc.org/CodeSystem/tricc', code: 'ghost' }
    expect(rules(validateActivity(a, project))).toContain('concept.unknown-code')
  })

  it('flags an unknown code system', () => {
    const project = sampleProject()
    const a = project.activities['triage-danger-signs']!
    a.nodes['n-weight']!.concept = { system: 'http://elsewhere/CodeSystem/x', code: 'weight' }
    expect(rules(validateActivity(a, project))).toContain('concept.unknown-system')
  })

  it('does not check concepts when no project is given', () => {
    const a = base()
    a.nodes['q']!.concept = { system: 'http://nope', code: 'nope' }
    expect(rules(validateActivity(a))).not.toContain('concept.unknown-system')
  })
})

describe('project scope', () => {
  function clean(): Project {
    const p = sampleProject()
    // hp-cough has only a start; give it an end so the sample is otherwise quiet.
    const cough = p.activities['hp-cough']!
    cough.nodes['end'] = { id: 'end', type: 'activity_end' }
    cough.nodeOrder.push('end')
    cough.edges['e'] = { id: 'e', source: 's', target: 'end' }
    cough.edgeOrder.push('e')
    return p
  }

  it('flags a goto pointing at a deleted activity', () => {
    const p = clean()
    const a = p.activities['triage-danger-signs']!
    a.nodes['g'] = { id: 'g', type: 'goto', link: 'deleted-activity' }
    a.nodeOrder.push('g')
    const issues = find(validateProject(p), 'goto.dangling-link')
    expect(issues[0]?.message).toMatch(/not an activity in this project/)
  })

  it('flags an intervention referring to a missing activity', () => {
    const p = clean()
    p.interventions[0]!.activities.push({ ref: 'never-created' })
    expect(rules(validateProject(p))).toContain('intervention.dangling-activity')
  })

  it('flags duplicate intervention codes', () => {
    const p = clean()
    p.interventions.push({ ...p.interventions[0]!, id: 'second' })
    const issues = find(validateProject(p), 'intervention.duplicate-code')
    expect(issues).toHaveLength(2)
  })

  it('blocks export for a reserved trigger mode', () => {
    const p = clean()
    p.interventions[0]!.trigger = { mode: 'planned' }
    const issues = find(validateProject(p), 'intervention.reserved-trigger')
    expect(issues[0]?.severity).toBe('error')
    expect(issues[0]?.message).toMatch(/planning layer/)
  })

  it('accepts on-demand', () => {
    expect(rules(validateProject(clean()))).not.toContain('intervention.reserved-trigger')
  })

  it('reports an unassigned activity as information, not a warning', () => {
    const p = clean()
    p.activities['loose'] = minimalActivity('loose')
    const issues = find(validateProject(p), 'activity.unassigned')
    expect(issues.map((i) => i.location.activityId)).toContain('loose')
    expect(issues[0]?.severity).toBe('info')
    expect(blocksExport(issues)).toBe(false)
  })

  it('flags an unmatched link-out as an error and an unmatched link-in as a warning', () => {
    const p = clean()
    const a = p.activities['triage-danger-signs']!
    a.nodes['lo'] = { id: 'lo', type: 'link_out', name: 'to_nowhere' }
    a.nodeOrder.push('lo')
    const cough = p.activities['hp-cough']!
    cough.nodes['li'] = { id: 'li', type: 'link_in', name: 'from_nowhere' }
    cough.nodeOrder.push('li')

    const issues = validateProject(p)
    expect(find(issues, 'link.unmatched-out')[0]?.severity).toBe('error')
    expect(find(issues, 'link.unmatched-in')[0]?.severity).toBe('warning')
  })

  it('is quiet when a link-out has its matching link-in', () => {
    const p = clean()
    p.activities['triage-danger-signs']!.nodes['lo'] = { id: 'lo', type: 'link_out', name: 'jump' }
    p.activities['triage-danger-signs']!.nodeOrder.push('lo')
    p.activities['hp-cough']!.nodes['li'] = { id: 'li', type: 'link_in', name: 'jump' }
    p.activities['hp-cough']!.nodeOrder.push('li')
    const issues = validateProject(p)
    expect(rules(issues)).not.toContain('link.unmatched-out')
    expect(rules(issues)).not.toContain('link.unmatched-in')
  })
})

describe('terminology rules', () => {
  it('rejects a target path with no target resource', () => {
    const p = sampleProject()
    const cs = p.codeSystems['http://tricc.org/CodeSystem/tricc']!
    delete cs.concepts['date_of_birth']!.targetResource
    const issues = find(validateProject(p), 'concept.path-without-resource')
    expect(issues[0]?.message).toMatch(/not on which resource/)
  })

  it('accepts a resource with no path', () => {
    const p = sampleProject()
    const cs = p.codeSystems['http://tricc.org/CodeSystem/tricc']!
    delete cs.concepts['date_of_birth']!.targetPath
    expect(rules(validateProject(p))).not.toContain('concept.path-without-resource')
  })

  it('warns about a concept with no data type', () => {
    const p = sampleProject()
    const cs = p.codeSystems['http://tricc.org/CodeSystem/tricc']!
    delete cs.concepts['weight']!.dataType
    expect(rules(validateProject(p))).toContain('concept.no-datatype')
  })
})

describe('messages teach', () => {
  it('never states only what is wrong', () => {
    // Every message must contain an actionable clause, not just a diagnosis.
    const p = sampleProject()
    const a = p.activities['triage-danger-signs']!
    a.nodes['bad-rhombus'] = { id: 'bad-rhombus', type: 'rhombus' }
    a.nodeOrder.push('bad-rhombus')
    a.nodes['bad-select'] = { id: 'bad-select', type: 'select_one', name: 'x' }
    a.nodeOrder.push('bad-select')

    for (const i of validateProject(p)) {
      // An actionable message either tells you to do something, or explains a consequence.
      expect(i.message.length).toBeGreaterThan(40)
      expect(i.message).toMatch(/\.\s|\.$/)
    }
  })
})

describe('process activities', () => {
  function withProcessActivity(): Project {
    const p = sampleProject()
    // A process activity wrapping the existing normal activity.
    p.activities['reg-process'] = {
      id: 'reg-process',
      title: { en: 'Registration' },
      process: 'registration',
      nodeOrder: ['s', 'call', 'e'],
      edgeOrder: ['e1', 'e2'],
      nodes: {
        s: { id: 's', type: 'start', name: 'reg_process', process: 'registration' },
        call: { id: 'call', type: 'goto', link: 'hp-cough' },
        e: { id: 'e', type: 'end' },
      },
      edges: {
        e1: { id: 'e1', source: 's', target: 'call' },
        e2: { id: 'e2', source: 'call', target: 'e' },
      },
    }
    p.interventions[0]!.activities = [{ ref: 'reg-process' }]
    return p
  }

  it('accepts an intervention referencing a process activity', () => {
    expect(rules(validateProject(withProcessActivity()))).not.toContain(
      'intervention.not-a-process-activity',
    )
  })

  it('accepts a normal activity listed on an intervention', () => {
    const p = withProcessActivity()
    p.interventions[0]!.activities = [{ ref: 'hp-cough' }]
    expect(rules(validateProject(p))).not.toContain('intervention.not-a-process-activity')
  })

  it('lists a process activity without filing the intervention under a guessed process', () => {
    const p = withProcessActivity()
    p.interventions[0]!.activities = [{ ref: 'reg-process' }]
    expect(rules(validateProject(p))).not.toContain('intervention.process-mismatch')
  })

  it('warns about a process activity that calls nothing', () => {
    const p = withProcessActivity()
    const wrapper = p.activities['reg-process']!
    delete wrapper.nodes['call']
    wrapper.nodeOrder = ['s', 'e']
    const issues = find(validateProject(p), 'process-activity.no-calls')
    expect(issues[0]?.severity).toBe('warning')
    expect(issues[0]?.message).toMatch(/would do nothing/)
  })

  it('requires a process activity to name its process', () => {
    const p = withProcessActivity()
    const wrapper = p.activities['reg-process']!
    delete wrapper.process
    delete wrapper.nodes['s']!.process
    expect(rules(validateActivity(wrapper, p))).toContain('process-activity.no-process')
  })

  it('does not report an activity called by a process activity as unassigned', () => {
    const p = withProcessActivity()
    // hp-cough is named by no intervention, but the wrapper calls it.
    const unassigned = find(validateProject(p), 'activity.unassigned').map(
      (i) => i.location.activityId,
    )
    expect(unassigned).not.toContain('hp-cough')
  })
})

describe('continue_with', () => {
  it('accepts an ISO delay aimed at an intervention in this project', () => {
    const p = sampleProject()
    const a = p.activities['triage-danger-signs']!
    a.nodes['follow'] = {
      id: 'follow',
      type: 'continue_with',
      intervention: 'sick-child',
      condition: 'AgeInMonths() < 2',
      delay: 'P3D',
    }
    a.nodeOrder.push('follow')
    expect(rules(validateProject(p))).not.toContain('continue_with.missing-intervention')
    expect(rules(validateProject(p))).not.toContain('continue_with.delay')
  })

  it('reports a missing intervention and a delay that is not an ISO period', () => {
    const p = sampleProject()
    const a = p.activities['triage-danger-signs']!
    a.nodes['follow'] = {
      id: 'follow',
      type: 'continue_with',
      intervention: 'not-in-project',
      delay: '3 d',
    }
    a.nodeOrder.push('follow')
    const missing = find(validateProject(p), 'continue_with.missing-intervention')
    const delay = find(validateProject(p), 'continue_with.delay')
    expect(missing[0]?.severity).toBe('error')
    expect(missing[0]?.message.length).toBeGreaterThan(40)
    expect(delay[0]?.severity).toBe('warning')
    expect(delay[0]?.message).toMatch(/P3D/)
  })
})

describe('goto targets', () => {
  function projectWithGoto(link: string): Project {
    const p = sampleProject()
    p.activities['reg-process'] = {
      id: 'reg-process',
      process: 'registration',
      nodeOrder: ['s', 'e'],
      edgeOrder: [],
      nodes: {
        s: { id: 's', type: 'start', name: 'reg_process', process: 'registration' },
        e: { id: 'e', type: 'end' },
      },
      edges: {},
    }
    const a = p.activities['triage-danger-signs']!
    a.nodes['g'] = { id: 'g', type: 'goto', link }
    a.nodeOrder.push('g')
    return p
  }

  it('accepts a jump to a normal activity', () => {
    expect(rules(validateProject(projectWithGoto('hp-cough')))).not.toContain(
      'goto.links-to-process-activity',
    )
  })

  it('refuses a jump into a process activity', () => {
    const issues = find(
      validateProject(projectWithGoto('reg-process')),
      'goto.links-to-process-activity',
    )
    expect(issues[0]?.severity).toBe('error')
    expect(issues[0]?.message).toMatch(/starts a process, so it cannot also be jumped to/)
  })

  it('refuses a jump to the activity it is in', () => {
    const issues = find(
      validateProject(projectWithGoto('triage-danger-signs')),
      'goto.self-reference',
    )
    expect(issues[0]?.message).toMatch(/never terminate/)
  })

  it('still reports a jump to something that does not exist', () => {
    expect(rules(validateProject(projectWithGoto('deleted')))).toContain('goto.dangling-link')
  })
})
