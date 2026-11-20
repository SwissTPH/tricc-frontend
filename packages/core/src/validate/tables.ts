import type { DecisionTable, Project } from '../model/types.js'
import { projectExpressions } from '../terminology/retrieval.js'
import { boundArguments, tableCalls, type TableCall } from '../decision-table/calls.js'
import { tableProblems } from '../decision-table/evaluate.js'
import { issue, type Issue, type IssueLocation } from './types.js'

/**
 * Decision tables and the calls to them (feature/20261120-decision-table-editor.md §2). Rule
 * ids are the `tricc_oo` codes, so both tools name a problem the same way.
 */
export function validateTables(project: Project): Issue[] {
  const issues: Issue[] = []
  const tables = project.decisionTables ?? {}
  const calls = projectExpressions(project).flatMap((site) =>
    tableCalls(site.text, project.aliases).map((call) => ({ site, call })),
  )

  for (const { site, call } of calls) {
    const where: IssueLocation = {
      ...(site.activityId ? { activityId: site.activityId } : {}),
      ...(site.nodeId ? { nodeId: site.nodeId } : {}),
      ...(site.edgeId ? { edgeId: site.edgeId } : {}),
      ...(site.interventionId ? { interventionId: site.interventionId } : {}),
      field: site.field,
    }
    issues.push(...callIssues(call, tables, where))
  }

  for (const id of Object.keys(tables).sort()) {
    const table = tables[id]!
    const used = calls.filter((c) => c.call.table === id)
    const listed = used.some((c) => c.call.function === 'DMNList')
    for (const p of tableProblems(table, {
      listValues: table.hitPolicy === 'rule_order' || listed,
    })) {
      issues.push(
        issue(p.code, 'error', `Table "${id}": ${p.message}`, {
          tableId: id,
          ...(p.row !== undefined ? { row: p.row } : {}),
          ...(p.column !== undefined ? { column: p.column } : {}),
        }),
      )
    }
    issues.push(...columnIssues(project, table))
    if (used.length === 0) {
      issues.push(
        issue(
          'dmn.unused',
          'warning',
          `No expression calls the table "${id}", so it changes nothing in the forms. Call it with DMN('${id}', …), or delete it.`,
          { tableId: id },
        ),
      )
    }
  }
  return issues
}

function callIssues(
  call: TableCall,
  tables: Record<string, DecisionTable>,
  where: IssueLocation,
): Issue[] {
  if (!call.table) {
    return [
      issue(
        'E_DMN_TABLE_NOT_STATIC',
        'error',
        `${call.name}: the table must be written as a name in quotes, such as ${call.name}('diazepam', …), so the export can build it into the form.`,
        where,
      ),
    ]
  }
  const table = tables[call.table]
  if (!table) {
    return [
      issue(
        'E_DMN_TABLE_UNKNOWN',
        'error',
        `${call.name}: there is no table "${call.table}". Check the name, or add the table to the project.`,
        where,
      ),
    ]
  }
  const out: Issue[] = []
  if (call.output && !table.outputs.some((o) => o.name === call.output)) {
    out.push(
      issue(
        'E_DMN_TABLE_UNKNOWN',
        'error',
        `${call.name}: the table "${table.id}" has no output "${call.output}". Its outputs are ${table.outputs.map((o) => o.name).join(', ') || 'none'}.`,
        where,
      ),
    )
  }
  if (call.alias) {
    for (const name of call.alias.args) {
      if (name === 'table' || table.inputs.some((c) => c.name === name)) continue
      out.push(
        issue(
          'E_ALIAS_UNKNOWN_INPUT',
          'error',
          `${call.name} passes "${name}", but the table "${table.id}" has no input of that name. Rename the input, or change the alias.`,
          where,
        ),
      )
    }
    if (call.args.length > call.alias.args.length) {
      out.push(
        issue(
          'E_DMN_ARITY',
          'error',
          `${call.name} takes ${call.alias.args.length} arguments; this call has ${call.args.length}.`,
          where,
        ),
      )
    }
  } else if (call.args.length - 1 > table.inputs.length) {
    out.push(
      issue(
        'E_DMN_ARITY',
        'error',
        `${call.name}('${table.id}', …) takes up to ${table.inputs.length} values (${table.inputs.map((c) => c.name).join(', ')}); this call passes ${call.args.length - 1}.`,
        where,
      ),
    )
  }
  const bound = boundArguments(call, table)
  table.inputs.forEach((col, i) => {
    if (bound[i] !== undefined && bound[i] !== '') return
    if (col.concept) return
    out.push(
      issue(
        'E_DMN_ARITY',
        'error',
        `${call.name}('${table.id}', …) gives no value for "${col.name}", and that input has no concept to read it from. Pass the value, or pick a concept for the column.`,
        where,
      ),
    )
  })
  return out
}

function columnIssues(project: Project, table: DecisionTable): Issue[] {
  const out: Issue[] = []
  const at = (column: number): IssueLocation => ({ tableId: table.id, column })
  if (table.inputs.length === 0 || table.outputs.length === 0) {
    out.push(
      issue(
        'E_DMN_SHAPE',
        'error',
        `Table "${table.id}" needs at least one input and one output column.`,
        { tableId: table.id },
      ),
    )
  }
  const seen = new Set<string>()
  ;[...table.inputs, ...table.outputs].forEach((col, i) => {
    if (seen.has(col.name)) {
      out.push(
        issue(
          'E_DMN_SHAPE',
          'error',
          `Table "${table.id}" has two columns named "${col.name}". Each column needs its own name.`,
          at(i),
        ),
      )
    }
    seen.add(col.name)
    if (col.concept && !conceptExists(project, col.concept)) {
      out.push(
        issue(
          'E_DMN_CONCEPT',
          'error',
          `Table "${table.id}", column "${col.name}": the concept "${col.concept}" is not in any dictionary. Pick another concept, or clear it.`,
          at(i),
        ),
      )
    }
  })
  return out
}

/** Whether a concept code is in one of the project's dictionaries. */
export function conceptExists(project: Project, code: string): boolean {
  return Object.values(project.codeSystems).some((cs) => code in cs.concepts)
}
