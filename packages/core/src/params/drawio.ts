import type { ActivityParam, ParamValue } from '../model/types.js'
import { PARAM_TYPES } from '../model/types.js'

/**
 * draw.io encodings (tricc_oo block-params §2, §3.1). A `parameters` shape holds one
 * `param.<name>` attribute per parameter, as JSON or as the shorthand
 * `type[(opt1|opt2|…)][!][=default]` (`!` is required). A `block` or `goto` shape holds one
 * `param.<name>` attribute per value, a literal or `{{name}}`.
 */

const SHORTHAND = /^([a-z]+)(?:\(([^)]*)\))?(!)?(?:=(.*))?$/s

/** A declaration from the `parameters` shape. Throws on a value that is neither form. */
export function parseParamShorthand(name: string, raw: string, lang = 'en'): ActivityParam {
  const text = raw.trim()
  if (text.startsWith('{')) {
    let json: Record<string, unknown>
    try {
      json = JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new Error(`The parameter "${name}" is not valid JSON.`)
    }
    const type = json['type']
    if (typeof type !== 'string' || !(PARAM_TYPES as readonly string[]).includes(type)) {
      throw new Error(`The parameter "${name}" has no known type.`)
    }
    const p: ActivityParam = { name, type: type as ActivityParam['type'] }
    if (Array.isArray(json['options'])) p.options = json['options'].map(String)
    if (json['default'] !== undefined) p.default = json['default'] as ParamValue
    if (json['required'] === true) p.required = true
    const label = json['label']
    if (typeof label === 'string') p.label = { [lang]: label }
    else if (label && typeof label === 'object') p.label = label as Record<string, string>
    const description = json['description']
    if (typeof description === 'string') p.description = { [lang]: description }
    else if (description && typeof description === 'object') p.description = description as Record<string, string>
    return p
  }
  const m = SHORTHAND.exec(text)
  if (!m || !(PARAM_TYPES as readonly string[]).includes(m[1]!)) {
    throw new Error(`The parameter "${name}" reads "${raw}", which is not type(options)!=default.`)
  }
  const p: ActivityParam = { name, type: m[1] as ActivityParam['type'] }
  if (m[2] !== undefined) p.options = m[2].split('|').map((o) => o.trim()).filter(Boolean)
  if (m[3]) p.required = true
  if (m[4] !== undefined) p.default = typed(p.type, m[4].trim())
  return p
}

/** A value from `param.<name>` on a call shape. */
export function parseParamArg(raw: string): ParamValue {
  const text = raw.trim()
  if (text === 'true') return true
  if (text === 'false') return false
  if (text !== '' && !Number.isNaN(Number(text)) && /^-?[0-9.]+$/.test(text)) return Number(text)
  return text
}

function typed(type: ActivityParam['type'], text: string): ParamValue {
  if (type === 'number' && !Number.isNaN(Number(text))) return Number(text)
  if (type === 'boolean') return text === 'true'
  return text
}
