#!/usr/bin/env node
// Pin a copy of tricc's tricc_oo/lang/ into packages/core/src/lang/
// (feature/20261125-expression-languages.md §1.1, §1.2).
//
//   node scripts/sync-lang.mjs [--from ../tricc]          copy a tricc clone at its HEAD
//   node scripts/sync-lang.mjs --ref <commit> --repo <path>   copy a commit of a tricc repository
//   node scripts/sync-lang.mjs --check                    fail when the copy does not match the lock
//
// The copy is never edited here. The lock records the package VERSION, the tricc commit and a
// sha256 of the folder; the capability statement schema (tricc capabilities/statement.schema.json)
// is copied too, with its sha256. After a copy the TypeScript parsers are regenerated.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const LANG_DIR = path.join(root, 'packages/core/src/lang')
export const SCHEMA_FILE = path.join(root, 'packages/core/src/capabilities/statement.schema.json')
export const LOCK_FILE = path.join(LANG_DIR, 'lang.lock.json')
/** Not part of the copy: written here. */
const OWN = new Set(['lang.lock.json'])
const OWN_DIRS = ['generated/']
const OWN_FILE = /\.ts$/ // the TypeScript entry and its tests live beside the copy

function files(dir, base = dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    const rel = path.relative(base, full).split(path.sep).join('/')
    if (entry.isDirectory()) {
      if (OWN_DIRS.includes(`${rel}/`)) continue
      out.push(...files(full, base))
    } else if (!OWN.has(rel) && !OWN_FILE.test(rel)) out.push(rel)
  }
  return out.sort()
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** The folder hash: `<path> <sha256>\n` per file, sorted by path, hashed as one text. */
export function folderHash(dir) {
  return sha256(
    files(dir)
      .map((f) => `${f} ${sha256(fs.readFileSync(path.join(dir, f)))}\n`)
      .join(''),
  )
}

function args() {
  const a = process.argv.slice(2)
  const get = (name) => {
    const i = a.indexOf(name)
    return i >= 0 ? a[i + 1] : undefined
  }
  return {
    check: a.includes('--check'),
    from: get('--from'),
    ref: get('--ref'),
    repo: get('--repo'),
    allowDirty: a.includes('--allow-dirty'),
  }
}

function git(repo, ...rest) {
  return execFileSync('git', ['-C', repo, ...rest], { encoding: 'utf8' }).trim()
}

function check() {
  const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'))
  const problems = []
  const version = fs.readFileSync(path.join(LANG_DIR, 'VERSION'), 'utf8').trim()
  if (lock.version !== version) problems.push(`lock version ${lock.version}, VERSION ${version}`)
  if (lock.sha256 !== folderHash(LANG_DIR))
    problems.push('the lang folder does not match lang.lock.json sha256')
  if (lock.schema_sha256 !== sha256(fs.readFileSync(SCHEMA_FILE)))
    problems.push('statement.schema.json does not match the lock')
  if (problems.length) {
    console.error(problems.join('\n'))
    process.exit(1)
  }
  console.log(
    `tricc-lang ${lock.version} (tricc ${lock.tricc_commit.slice(0, 12)}) matches its lock`,
  )
}

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const rel of files(dst)) fs.rmSync(path.join(dst, rel))
  for (const rel of files(src)) {
    fs.mkdirSync(path.dirname(path.join(dst, rel)), { recursive: true })
    fs.copyFileSync(path.join(src, rel), path.join(dst, rel))
  }
}

function sync({ from, ref, repo, allowDirty }) {
  let source
  let commit
  let tmp
  if (ref) {
    const repository = path.resolve(repo ?? from ?? '../tricc')
    commit = git(repository, 'rev-parse', `${ref}^{commit}`)
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tricc-lang-'))
    const tar = path.join(tmp, 'lang.tar')
    execFileSync('git', [
      '-C',
      repository,
      'archive',
      '-o',
      tar,
      commit,
      'tricc_oo/lang',
      'capabilities/statement.schema.json',
    ])
    execFileSync('tar', ['-xf', tar, '-C', tmp])
    source = tmp
  } else {
    source = path.resolve(from ?? '../tricc')
    commit = git(source, 'rev-parse', 'HEAD')
    const dirty = git(
      source,
      'status',
      '--porcelain',
      '--',
      'tricc_oo/lang',
      'capabilities/statement.schema.json',
    )
    if (dirty && !allowDirty) {
      console.error(
        `${source} has uncommitted changes in tricc_oo/lang: commit them or pass --allow-dirty\n${dirty}`,
      )
      process.exit(1)
    }
    if (dirty) commit += '-dirty'
  }
  copyTree(path.join(source, 'tricc_oo/lang'), LANG_DIR)
  fs.mkdirSync(path.dirname(SCHEMA_FILE), { recursive: true })
  fs.copyFileSync(path.join(source, 'capabilities/statement.schema.json'), SCHEMA_FILE)
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true })
  const lock = {
    version: fs.readFileSync(path.join(LANG_DIR, 'VERSION'), 'utf8').trim(),
    tricc_commit: commit,
    sha256: folderHash(LANG_DIR),
    schema_sha256: sha256(fs.readFileSync(SCHEMA_FILE)),
  }
  fs.writeFileSync(LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`)
  console.log(`copied tricc-lang ${lock.version} from tricc ${commit}`)
  execFileSync(process.execPath, [path.join(root, 'scripts/generate-lang-parsers.mjs')], {
    stdio: 'inherit',
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = args()
  if (options.check) check()
  else sync(options)
}
