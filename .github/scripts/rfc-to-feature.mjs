// Turns an approved RFC issue into feature/<YYYYMMDD>-<slug>.md (run by rfc-to-feature.yml).
// Reads the issue from the event payload, never from the shell, because its body is untrusted.
import { appendFileSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,60}$/
const MARKER_RE = /<!--\s*rfc:\s*slug=\s*([^\s>]*)\s*-->\s*\n?/

const { issue } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
const title = issue.title.replace(/^\s*RFC\s*:\s*/i, '').trim()
let body = (issue.body ?? '').replace(/\r\n/g, '\n')

const marked = MARKER_RE.exec(body)?.[1]
const slug =
  marked && SLUG_RE.test(marked)
    ? marked
    : title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/, '')
if (!SLUG_RE.test(slug)) throw new Error(`No usable slug from the marker or the title "${title}".`)
body = body.replace(MARKER_RE, '').trim()

const now = new Date()
const iso = now.toISOString().slice(0, 10)
const stamp = iso.replaceAll('-', '')

if (!/^# /m.test(body)) body = `# ${title}\n\n${body}`

const lines = body.split('\n')
const row = (field) =>
  lines.findIndex((l) => new RegExp(`^\\|\\s*\\*\\*${field}\\*\\*\\s*\\|`).test(l))
const status = `| **Status** | Approved (${iso}, RFC #${issue.number}) |`
const rfc = `| **RFC** | [#${issue.number}](${issue.html_url}) |`
const at = row('Status')
if (at >= 0) {
  lines[at] = status
  const r = row('RFC')
  if (r >= 0) lines[r] = rfc
  else lines.splice(at + 1, 0, rfc)
} else {
  // No field table: put one under the heading.
  const h = lines.findIndex((l) => l.startsWith('# '))
  lines.splice(h + 1, 0, '', '| Field | Value |', '| --- | --- |', status, rfc)
}

// A revised RFC replaces its earlier spec under a new date (feature/README.md convention).
const dir = 'feature'
for (const f of readdirSync(dir)) {
  if (new RegExp(`^\\d{8}-${slug}\\.md$`).test(f)) rmSync(`${dir}/${f}`)
}
const path = `${dir}/${stamp}-${slug}.md`
writeFileSync(path, lines.join('\n').trimEnd() + '\n')

const out = process.env.GITHUB_OUTPUT
if (out) appendFileSync(out, `path=${path}\nslug=${slug}\nbranch=rfc/${issue.number}-${slug}\n`)
console.log(path)
