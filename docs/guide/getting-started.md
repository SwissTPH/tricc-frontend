# Getting started

TRICC Authoring is a web app that runs entirely on your computer. There are three ways to open it.
All three are the same app.

## 1. In the browser, with nothing to install

Open **[swisstph.github.io/tricc-frontend/app](https://swisstph.github.io/tricc-frontend/app/)**.

The page is downloaded once and runs in your browser. Your projects are not sent anywhere. They are
kept in this browser's storage, or in a folder on your disk if you choose one (see
[Saving and sharing](./saving)).

::: tip Use Chrome or Edge to save into a folder
Every current browser can create, edit, import and export projects. Only Chromium browsers (Chrome,
Edge, Brave, Opera) can also write straight into a folder on your disk.
:::

## 2. On your computer, with Node.js

If [Node.js](https://nodejs.org) 20 or newer is installed, run:

```bash
npx @tricc/app-local
```

This downloads the app, starts it at `http://localhost:4317`, and opens your browser. Press
<kbd>Ctrl</kbd>+<kbd>C</kbd> in the terminal to stop it.

To keep it installed instead of downloading each time:

```bash
npm install --global @tricc/app-local
tricc-local
```

| Option          | Meaning                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| `--port <n>`    | Listen on another port. Without it, the next free port after 4317 is used. |
| `--host <addr>` | Interface to bind. Default `127.0.0.1`, which means only this computer.    |
| `--no-open`     | Do not open a browser.                                                     |

## 3. From a downloaded archive

Use this on a computer with Node.js but no access to npm. Get `tricc-local.zip` from the
[download page](../download), unzip it, and run:

```bash
node bin/tricc-local.js
```

## First steps

1. On **Projects**, type a name under _Start a new project_ and create it.
2. The overview shows the project's **interventions**. Add one, then add a **process** to it.
3. Open the process and add nodes from the **Nodes** tab on the right.
4. Changes save automatically. Use **Export** to get a `.tricc` file you can send to someone.

[Authoring a guideline](./authoring) explains each of these.
