import { GitHubHost } from './github.js'
import { GitLabHost } from './gitlab.js'
import type { GitHost, HostKind } from './host.js'
import { tokenFor } from './links.js'

export * from './host.js'
export * from './changes.js'
export * from './links.js'

/** A client for the host, with the token this tab holds for that origin. */
export function hostFor(kind: HostKind, origin: string, fetchFn?: typeof fetch): GitHost {
  const token = tokenFor(origin)
  return kind === 'github' ? new GitHubHost(token, fetchFn) : new GitLabHost(token, fetchFn)
}
