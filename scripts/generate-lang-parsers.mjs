#!/usr/bin/env node
// Generate the TypeScript parsers from the pinned copy packages/core/src/lang/
// (feature/20261125-expression-languages.md §1.3), with the same ANTLR tool as tricc's Python
// parsers: 4.13.2, runtime `antlr4@4.13.2`.
//
//   node scripts/generate-lang-parsers.mjs            write packages/core/src/lang/generated/
//   node scripts/generate-lang-parsers.mjs --check    regenerate into a temp folder, fail on drift
//
// Needs Java. The tool jar comes from ANTLR_JAR, else the antlr4-tools cache
// (~/.m2/repository/org/antlr/antlr4/4.13.2/antlr4-4.13.2-complete.jar).
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ANTLR_VERSION = '4.13.2'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LANG_DIR = path.join(root, 'packages/core/src/lang')
export const OUT_DIR = path.join(LANG_DIR, 'generated')
export const GENERATED = [
  'tricc_cqlLexer.ts',
  'tricc_cqlParser.ts',
  'tricc_cqlVisitor.ts',
  'tricc_feelLexer.ts',
  'TriccFeelParser.ts',
  'TriccFeelParserVisitor.ts',
]

export function antlrJar() {
  const jar =
    process.env.ANTLR_JAR ??
    path.join(
      os.homedir(),
      `.m2/repository/org/antlr/antlr4/${ANTLR_VERSION}/antlr4-${ANTLR_VERSION}-complete.jar`,
    )
  return fs.existsSync(jar) ? jar : undefined
}

function antlr(jar, dir, grammar) {
  execFileSync(
    'java',
    ['-jar', jar, '-Dlanguage=TypeScript', '-visitor', '-no-listener', grammar],
    {
      cwd: dir,
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  )
}

/** The names the `antlr4` runtime exports (the generated code also imports a few types). */
async function runtimeExports() {
  const require = createRequire(path.join(root, 'packages/core/package.json'))
  const entry = require.resolve('antlr4')
  const mjs = entry.replace(/\.cjs$/, '.mjs')
  return new Set(Object.keys(await import(pathToFileURL(fs.existsSync(mjs) ? mjs : entry).href)))
}

/** `import { A, SomeType } from 'antlr4'` -> a value import and an `import type` for the rest:
 * the runtime (4.13.2) declares some of the imported names only as types (`DecisionState`,
 * `TokenStream`), and an ES module import of a missing name fails. */
function splitTypeImports(text, exported) {
  return text.replace(/import \{([^}]*)\} from (['"])antlr4\2;?/, (_m, list) => {
    const names = list
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    const values = names.filter((n) => exported.has(n))
    const types = names.filter((n) => !exported.has(n))
    return (
      `import { ${values.join(', ')} } from 'antlr4';` +
      (types.length ? `\nimport type { ${types.join(', ')} } from 'antlr4';` : '')
    )
  })
}

/** Generate every parser into `out`. */
export async function generate(out) {
  const jar = antlrJar()
  if (!jar)
    throw new Error(
      `ANTLR ${ANTLR_VERSION} jar not found: set ANTLR_JAR (or pip install antlr4-tools and run antlr4 once)`,
    )
  const version = fs.readFileSync(path.join(LANG_DIR, 'VERSION'), 'utf8').trim()
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tricc-lang-ts-'))
  for (const kind of ['cql', 'feel']) {
    for (const f of fs.readdirSync(path.join(LANG_DIR, kind))) {
      if (f.endsWith('.g4')) fs.copyFileSync(path.join(LANG_DIR, kind, f), path.join(work, f))
    }
  }
  antlr(jar, work, 'tricc_cql.g4')
  antlr(jar, work, 'tricc_feel.g4') // only its lexer is kept
  antlr(jar, work, 'TriccFeelParser.g4')
  fs.mkdirSync(out, { recursive: true })
  const exported = await runtimeExports()
  for (const f of GENERATED) {
    const text = splitTypeImports(fs.readFileSync(path.join(work, f), 'utf8'), exported)
    fs.writeFileSync(
      path.join(out, f),
      `// @ts-nocheck\n// tricc-lang ${version} (packages/core/src/lang/VERSION)\n${text}`,
    )
  }
  fs.rmSync(work, { recursive: true, force: true })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--check')) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tricc-lang-check-'))
    await generate(tmp)
    const drift = GENERATED.filter(
      (f) =>
        !fs.existsSync(path.join(OUT_DIR, f)) ||
        fs.readFileSync(path.join(tmp, f), 'utf8') !==
          fs.readFileSync(path.join(OUT_DIR, f), 'utf8'),
    )
    fs.rmSync(tmp, { recursive: true, force: true })
    if (drift.length) {
      console.error(`drift: ${drift.join(', ')}`)
      process.exit(1)
    }
    console.log('generated parsers match a fresh ANTLR 4.13.2 generation')
  } else {
    await generate(OUT_DIR)
    console.log(`generated ${GENERATED.length} parsers with ANTLR ${ANTLR_VERSION}`)
  }
}
