/**
 * `CapabilityRegistry` over the npm registry API (npmjs, or GitHub Packages' npm registry with a
 * token), on an injected `fetch` (feature/20261125-output-capabilities.md §1.3).
 */
import { gunzipSync, strFromU8 } from 'fflate'
import type { CapabilityPackageInfo, CapabilityRegistry } from '../ports/capability-registry.js'
import { parseVersion } from './statement.js'

export const NPM_REGISTRY = 'https://registry.npmjs.org'
export const GITHUB_REGISTRY = 'https://npm.pkg.github.com'
export const CAPABILITY_PREFIX = '@tricc/capabilities-'

/** The statements tricc publishes (GitHub Packages has no search: `list()` reads these). */
export const TRICC_CAPABILITY_PACKAGES = [
  'xlsform',
  'xlsform-cdss',
  'xlsform-cht',
  'xlsform-cht-hf',
  'fhir',
  'opensrp',
  'html',
  'openmrs',
  'dhis2',
  'spice',
].map((id) => `${CAPABILITY_PREFIX}${id}`)

export type Fetch = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
  arrayBuffer(): Promise<ArrayBuffer>
}>

interface Packument {
  'dist-tags'?: Record<string, string>
  versions?: Record<string, { description?: string; dist?: { tarball?: string } }>
  description?: string
}

const byVersion = (a: string, b: string) => {
  const x = parseVersion(a)
  const y = parseVersion(b)
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

/** A file of a tar archive (ustar), or undefined. */
export function tarFile(tar: Uint8Array, name: string): Uint8Array | undefined {
  let offset = 0
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every((b) => b === 0)) return undefined
    const field = (from: number, to: number) =>
      strFromU8(header.subarray(from, to)).replace(/\0.*$/s, '')
    const prefix = field(345, 500)
    const path = prefix ? `${prefix}/${field(0, 100)}` : field(0, 100)
    const size = parseInt(field(124, 136).trim() || '0', 8)
    const start = offset + 512
    if (path === name) return tar.subarray(start, start + size)
    offset = start + Math.ceil(size / 512) * 512
  }
  return undefined
}

export function createNpmRegistry(options: {
  fetch: Fetch
  /** Default npmjs; `GITHUB_REGISTRY` for GitHub Packages. */
  url?: string
  /** GitHub Packages needs one (`read:packages`); never saved in the project. */
  token?: string
  source?: 'npm' | 'github'
}): CapabilityRegistry {
  const url = (options.url ?? NPM_REGISTRY).replace(/\/+$/, '')
  const source = options.source ?? (url === GITHUB_REGISTRY ? 'github' : 'npm')
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`

  async function get(address: string): Promise<unknown> {
    const response = await options.fetch(address, { headers })
    if (!response.ok) throw new Error(`${address}: HTTP ${response.status}`)
    return response.json()
  }
  const packument = (pkg: string) => get(`${url}/${pkg.replace('/', '%2f')}`) as Promise<Packument>

  async function latest(pkg: string): Promise<CapabilityPackageInfo | undefined> {
    const doc = await packument(pkg)
    const versions = Object.keys(doc.versions ?? {}).sort(byVersion)
    const version = doc['dist-tags']?.['latest'] ?? versions[versions.length - 1]
    if (!version) return undefined
    const description = doc.versions?.[version]?.description ?? doc.description
    return { package: pkg, version, ...(description ? { description } : {}) }
  }

  return {
    source,
    url,
    async list() {
      if (source === 'github') {
        const found = await Promise.all(
          TRICC_CAPABILITY_PACKAGES.map((pkg) => latest(pkg).catch(() => undefined)),
        )
        return found.filter((f): f is CapabilityPackageInfo => f !== undefined)
      }
      const result = (await get(
        `${url}/-/v1/search?text=${encodeURIComponent(CAPABILITY_PREFIX)}&size=250`,
      )) as { objects?: { package: { name: string; version: string; description?: string } }[] }
      return (result.objects ?? [])
        .map((o) => o.package)
        .filter((p) => p.name.startsWith(CAPABILITY_PREFIX))
        .map((p) => ({
          package: p.name,
          version: p.version,
          ...(p.description ? { description: p.description } : {}),
        }))
        .sort((a, b) => a.package.localeCompare(b.package))
    },
    async versions(pkg) {
      return Object.keys((await packument(pkg)).versions ?? {}).sort(byVersion)
    },
    async fetchStatement(pkg, version) {
      const tarball = (await packument(pkg)).versions?.[version]?.dist?.tarball
      if (!tarball) throw new Error(`${pkg}@${version} is not published on ${url}`)
      const response = await options.fetch(tarball, { headers })
      if (!response.ok) throw new Error(`${tarball}: HTTP ${response.status}`)
      const tar = gunzipSync(new Uint8Array(await response.arrayBuffer()))
      const file = tarFile(tar, 'package/statement.json')
      if (!file) throw new Error(`${pkg}@${version} has no statement.json`)
      return JSON.parse(strFromU8(file))
    },
  }
}
