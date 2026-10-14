# Converting with tricc_oo

TRICC Authoring draws the guideline. [`tricc_oo`](https://github.com/SwissTPH/tricc), a Python
tool, turns the saved project into forms: XLSForm for ODK, CHT, OpenMRS, DHIS2, FHIR SDC and
OpenSRP. This page takes you from a project in the app to a form file.

::: warning Use the tricc_oo development branch for now
The released `tricc-oo` on PyPI (1.7.3) reads draw.io drawings only. It cannot read projects saved
by this app, and it has no `tricc` command. Until a release includes them, install from the
`feature/sync-fe` branch, as shown below.
:::

## 1. Install tricc_oo

You need Python 3.12 or 3.13. Newer versions are not tested yet.

::: code-group

```bash [Linux / macOS]
python3.13 -m venv ~/tricc-venv
source ~/tricc-venv/bin/activate
pip install "git+https://github.com/SwissTPH/tricc@feature/sync-fe"
tricc --help
```

```powershell [Windows]
py -3.13 -m venv $HOME\tricc-venv
$HOME\tricc-venv\Scripts\Activate.ps1
pip install "git+https://github.com/SwissTPH/tricc@feature/sync-fe"
tricc --help
```

:::

Activate the environment again (`source ~/tricc-venv/bin/activate`) in every new terminal before
running `tricc`.

## 2. Get the project as a folder

`tricc` reads a folder that contains `tricc.yaml`.

- **Folder projects** (opened with _Open a project folder…_ in Chrome or Edge) already are that
  folder. Let the top bar show _Saved_ before converting.
- **Browser projects:** click **Export .tricc** and unzip it into a new folder. The archive holds
  the files directly, without a folder of its own, so give `unzip` a destination:

  ```bash
  unzip "Fever demo.tricc" -d fever-demo
  ```

  On Windows, rename the file to `.zip` and use _Extract All…_.

The folder looks like this:

```
fever-demo/
├── tricc.yaml                          # interventions, languages, terminology
├── activities/fever-check.activity.yaml
└── terminology/demo.codesystem.json    # concepts and their texts
```

## 3. Convert

From inside the project folder:

```bash
cd fever-demo
tricc -o build
```

Each intervention becomes one form, named after the intervention:

```
build/XLSFormCHTStrategy/pediatrics/pediatrics.xlsx
build/XLSFormCHTStrategy/pediatrics/demo_codesystem.json
```

Only interventions that list at least one activity are converted.

## 4. Choose the output

The app writes `XLSFormCHTStrategy` into `tricc.yaml` each time it saves. To get another format,
pass `-O` on the command line rather than editing `tricc.yaml`, which the next save would undo:

```bash
tricc -o build -O XLSFormStrategy          # plain ODK / XLSForm
```

| `-O`                   | Produces                                                   |
| ---------------------- | ---------------------------------------------------------- |
| `XLSFormStrategy`      | ODK / XLSForm                                              |
| `XLSFormCHTStrategy`   | Community Health Toolkit form (the default the app writes) |
| `XLSFormCHTHFStrategy` | CHT form for health facilities                             |
| `XLSFormCDSSStrategy`  | CDSS-oriented XLSForm                                      |
| `FHIRStrategy`         | FHIR SDC Questionnaire with CQL                            |
| `OpenSRPStrategy`      | OpenSRP / FHIR-Core package                                |
| `OpenMRSStrategy`      | OpenMRS form                                               |
| `DHIS2Strategy`        | DHIS2 program                                              |
| `HTMLStrategy`         | HTML preview                                               |

The output then lands in `build/<strategy>/<intervention>/`.

## Other options

| Option                   | Meaning                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| `-i <folder>`            | Project folder, when not running from inside it                            |
| `-l d` / `-l i` / `-l w` | Log level: debug, info (default) or warnings only                          |
| `-T TestSpecStrategy`    | Also write `<intervention>.form-model.json`, used by the form test harness |

Every run also writes `build/debug.log`.

## When the conversion complains

- **Read the first `ERROR` or `CRITICAL` line.** It names the node as
  `[Type|name|…|label]`; search for that name in the app to find it.
- **"loop likely or unresolved dependence"** usually means a node waits on something that is
  never computed, for example a diagnosis wired into the flow. A diagnosis stands on its own on
  the diagram, with its _Applies when_ condition, and is not connected to the questions.
- **A question is missing from the form:** check its connections in the app's **Validation**
  tab. A node that nothing leads to is never asked.
- **`tricc_version` mismatch:** if `tricc.yaml` has `parameters.tricc_version`, it must equal the
  installed version (`pip show tricc-oo`). Remove the line to skip the check.

More about the converter: the
[tricc_oo documentation](https://github.com/SwissTPH/tricc/tree/develop/docs), in particular
`cli-and-inputs.md` and `troubleshooting.md`.
