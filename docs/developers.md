# Developers

The app is a thin shell over a set of libraries. Source:
[github.com/SwissTPH/tricc-frontend](https://github.com/SwissTPH/tricc-frontend).

| Package                 | What it holds                                                                 |
| ----------------------- | ----------------------------------------------------------------------------- |
| `@tricc/core`           | Model, CRDT project document (Yjs), file format, validation, ports. No React. |
| `@tricc/editor`         | React components: canvas, property panels, CQL display, dictionary.           |
| `@tricc/adapters-local` | Local persistence (folder and browser), identity, IndexedDB.                  |
| `@tricc/app-local`      | The app. The only package published to npm so far. It bundles the libraries.  |

The libraries will be published separately once their API has been tried against a second
consumer.

## Build from source

```bash
git clone https://github.com/SwissTPH/tricc-frontend.git
cd tricc-frontend
corepack enable
pnpm install
pnpm build
pnpm --filter @tricc/app-local dev     # http://localhost:5173
```

| Command                              | What it runs                                      |
| ------------------------------------ | ------------------------------------------------- |
| `pnpm test`                          | Unit tests (Vitest)                               |
| `pnpm test:e2e`                      | Browser tests (Playwright), against the built app |
| `pnpm typecheck`                     | TypeScript across the workspace                   |
| `pnpm --filter @tricc/docs docs:dev` | This site                                         |

## Releasing

Bump `version` in `apps/local/package.json`, commit, then push a tag with the same version:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The **Release** workflow builds and tests the app, publishes `@tricc/app-local` to npm, and creates
a GitHub release with `tricc-local.zip` and the npm tarball attached. It needs an `NPM_TOKEN`
repository secret that can publish to the `@tricc` scope.

The **Pages** workflow rebuilds this site and the hosted app on every push to `main` and `develop`.
