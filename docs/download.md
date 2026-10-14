# Download

## Latest release

| File                                                                                                       | Use it for                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [**tricc-local.zip**](https://github.com/SwissTPH/tricc-frontend/releases/latest/download/tricc-local.zip) | The app and its small local server. Unzip, then run `node bin/tricc-local.js`. Needs Node.js 20 or newer. |
| [**npm: @tricc/app-local**](https://www.npmjs.com/package/@tricc/app-local)                                | `npx @tricc/app-local`, or `npm install -g @tricc/app-local`                                              |
| [All releases and release notes](https://github.com/SwissTPH/tricc-frontend/releases)                      | Earlier versions, and the npm tarball for offline installs                                                |

## Nothing to download

The same app runs at
**[swisstph.github.io/tricc-frontend/app](https://swisstph.github.io/tricc-frontend/app/)**.

## Offline installation

On a computer with internet access, download the `.tgz` file from a release, copy it over, then run:

```bash
npm install --global ./tricc-app-local-<version>.tgz
tricc-local
```

The package has no dependencies, so nothing else is fetched.
