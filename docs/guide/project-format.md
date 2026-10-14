# Project format

A project is a folder that can live in git:

```
my-guideline/
├── tricc.yaml                          # title, languages, interventions, activity list
├── activities/<id>.activity.yaml       # one file per activity, diagram positions included
├── terminology/*.codesystem.json       # FHIR R4 CodeSystem: the concepts and their texts
└── media/                              # images used by nodes
```

- **Activity files** hold the nodes, connections and expressions, and refer to concepts by code
  only. Labels, hints and translations are not repeated there.
- **Concepts** are stored as FHIR R4 CodeSystems, so they can be reused by other FHIR tools.
- **Expressions** are CQL strings.

`tricc_oo` reads this folder through its YAML input strategy, next to its existing draw.io path.
The full specification is in the repository under
[`feature/`](https://github.com/SwissTPH/tricc-frontend/tree/main/feature).
