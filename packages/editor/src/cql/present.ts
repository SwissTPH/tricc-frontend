/**
 * A readable view and a portable-profile check for one CQL fragment.
 *
 * The project file keeps the author's text unchanged. This only describes it.
 */

export interface CqlToken {
  kind: 'name' | 'keyword' | 'number' | 'function' | 'operator' | 'text' | 'error'
  text: string
  /** Quoted name without the surrounding quotes. */
  label?: string
}

export interface CqlDiagnostic {
  severity: 'error'
  message: string
}

const KEYWORDS = new Set([
  'and',
  'or',
  'not',
  'xor',
  'if',
  'then',
  'else',
  'case',
  'when',
  'end',
  'between',
  'in',
  'contains',
  'is',
  'null',
  'true',
  'false',
  'exists',
  'mod',
])

/** Valid CQL that this profile does not export to a phone form. */
const OUTSIDE_PROFILE = new Set(['from', 'where', 'let', 'return'])

export function presentCql(source: string): { tokens: CqlToken[]; diagnostics: CqlDiagnostic[] } {
  if (source.trim() === '') return { tokens: [], diagnostics: [] }

  const tokens: CqlToken[] = []
  const diagnostics: CqlDiagnostic[] = []
  const seen = new Set<string>()
  const report = (message: string) => {
    if (seen.has(message)) return
    seen.add(message)
    diagnostics.push({ severity: 'error', message })
  }

  let i = 0
  let paren = 0
  let broken = false

  while (i < source.length && !broken) {
    const c = source[i]!

    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') {
      tokens.push({ kind: 'text', text: c })
      i += 1
      continue
    }

    if (c === '"') {
      const end = source.indexOf('"', i + 1)
      if (end < 0) {
        report('A quoted name is missing its closing quote.')
        tokens.push({ kind: 'error', text: source.slice(i) })
        broken = true
        break
      }
      tokens.push({ kind: 'name', text: source.slice(i, end + 1), label: source.slice(i + 1, end) })
      i = end + 1
      continue
    }

    if (c === "'") {
      let j = i + 1
      while (j < source.length) {
        if (source[j] === "'" && source[j + 1] === "'") {
          j += 2
          continue
        }
        if (source[j] === "'") break
        j += 1
      }
      if (j >= source.length || source[j] !== "'") {
        report('A string is missing its closing quote.')
        tokens.push({ kind: 'error', text: source.slice(i) })
        broken = true
        break
      }
      tokens.push({ kind: 'text', text: source.slice(i, j + 1) })
      i = j + 1
      continue
    }

    if (c === '[') {
      report('A retrieve is outside the portable profile. Read that data with a prefilled value.')
      tokens.push({ kind: 'error', text: c })
      i += 1
      continue
    }

    if (c === '(') {
      paren += 1
      tokens.push({ kind: 'operator', text: c })
      i += 1
      continue
    }

    if (c === ')') {
      paren -= 1
      if (paren < 0) report('A parenthesis has no match.')
      tokens.push({ kind: 'operator', text: c })
      i += 1
      continue
    }

    if (/[0-9]/.test(c)) {
      const match = /^(\d+(\.\d+)?)/.exec(source.slice(i))
      const text = match?.[0] ?? c
      tokens.push({ kind: 'number', text })
      i += text.length
      continue
    }

    if (/[A-Za-z_]/.test(c)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i))
      const word = match?.[0] ?? c
      const lower = word.toLowerCase()
      const call = /^\s*\(/.test(source.slice(i + word.length))
      if (OUTSIDE_PROFILE.has(lower)) {
        report(`\`${word}\` is outside the portable profile.`)
        tokens.push({ kind: 'error', text: word })
      } else if (KEYWORDS.has(lower) && !call) {
        tokens.push({ kind: 'keyword', text: word })
      } else if (call) {
        tokens.push({ kind: 'function', text: word })
      } else {
        tokens.push({ kind: 'text', text: word })
      }
      i += word.length
      continue
    }

    const two = source.slice(i, i + 2)
    if (two === '!=' || two === '<>' || two === '>=' || two === '<=') {
      tokens.push({ kind: 'operator', text: two })
      i += 2
      continue
    }

    if ('=<>+-*/&,'.includes(c)) {
      tokens.push({ kind: 'operator', text: c })
      i += 1
      continue
    }

    tokens.push({ kind: 'text', text: c })
    i += 1
  }

  if (!broken && paren > 0) report('A parenthesis is not closed.')
  return { tokens, diagnostics }
}
