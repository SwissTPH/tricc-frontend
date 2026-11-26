/**
 * Where capability statements are published (feature/20261125-output-capabilities.md §1.3): an
 * npm registry (npmjs, or GitHub Packages with a token). Injected, so tests use a mock and the
 * editor never reaches a registry it was not given.
 */
export interface CapabilityPackageInfo {
  package: string
  /** The latest version. */
  version: string
  description?: string
}

export interface CapabilityRegistry {
  readonly source: 'npm' | 'github'
  /** The registry URL, recorded in `tricc.yaml` `registry`. */
  readonly url: string
  /** The latest version of every published `@tricc/capabilities-*` package. */
  list(): Promise<CapabilityPackageInfo[]>
  /** Every published version of a package, oldest first. */
  versions(pkg: string): Promise<string[]>
  /** The `statement.json` of one version (not yet validated). */
  fetchStatement(pkg: string, version: string): Promise<unknown>
}
