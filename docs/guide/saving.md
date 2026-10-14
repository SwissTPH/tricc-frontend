# Saving and sharing

The top bar always shows where the open project is stored. Check it before you close the tab.

## Where projects live

| Store       | How you get it                          | Notes                                                                                                    |
| ----------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Browser** | _Start a new project_, or any import    | Kept in this browser's storage on this computer. Clearing site data deletes it. Export a copy regularly. |
| **Folder**  | _Open a project folder…_ (Chrome, Edge) | Every save writes the files into the folder. Put the folder in git to review changes.                    |

Changes save automatically in both cases.

::: warning The hosted app shares browser storage with other pages on the same site
Projects created on `swisstph.github.io` are stored for that whole site. For real guideline
content, prefer a folder, or run the app locally with `npx @tricc/app-local`.
:::

## Export and import

- **Export** writes the whole project as one `.tricc` file, which is a zip archive. Send it, attach
  it, or keep it as a backup.
- On **Projects**, _Import a .tricc file_ opens that archive as a new project in the browser.
- _Import a project folder_ reads a project folder in any browser, including Firefox and Safari.

## draw.io drawings

A project whose `tricc.yaml` lists `.drawio` files opens directly. The drawings are read, and saving
writes one activity YAML file per page. The original `.drawio` file is left untouched. To bring in
a single drawing, use the import button on the **Activities** tab.

## Converting to forms

The saved folder is the input to [`tricc_oo`](https://github.com/SwissTPH/tricc), which converts it
to XLSForm/ODK, CHT, OpenMRS, DHIS2, FHIR SDC and OpenSRP.
