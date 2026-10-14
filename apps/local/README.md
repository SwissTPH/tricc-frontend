# @tricc/app-local

The TRICC authoring app: draw clinical decision-support guidelines in the browser and save them as
files that [`tricc_oo`](https://github.com/SwissTPH/tricc) converts to XLSForm/ODK, CHT, OpenMRS,
DHIS2 and FHIR.

```bash
npx @tricc/app-local
```

This starts the app at `http://localhost:4317` and opens your browser. Nothing is sent anywhere:
projects stay in the browser or in a folder you choose. Saving into a folder needs Chrome or Edge.

| Option          | Meaning                                                |
| --------------- | ------------------------------------------------------ |
| `--port <n>`    | Port to listen on (default 4317, or the next free one) |
| `--host <addr>` | Interface to bind (default `127.0.0.1`)                |
| `--no-open`     | Do not open a browser                                  |

Documentation, downloads and a hosted copy:
**[swisstph.github.io/tricc-frontend](https://swisstph.github.io/tricc-frontend/)**.

Apache-2.0.
