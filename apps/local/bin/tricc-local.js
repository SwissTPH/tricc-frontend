#!/usr/bin/env node
// Serves the built authoring app on localhost and opens it in the browser.
// No dependencies: the app is a static bundle, and everything it stores stays in the browser
// or in a folder the author picks. Nothing here talks to the network beyond localhost.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const ROOT = fileURLToPath(new URL('../dist/', import.meta.url))
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const HELP = `Usage: tricc-local [--port <n>] [--host <addr>] [--no-open]

Starts the TRICC authoring app at http://localhost:4317 and opens it.
  --port <n>     port to listen on (default 4317; the next free one is used if taken)
  --host <addr>  interface to bind (default 127.0.0.1)
  --no-open      do not open a browser
`

function parseArgs(argv) {
  const opts = { port: 4317, host: '127.0.0.1', open: true, fixedPort: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') {
      process.stdout.write(HELP)
      process.exit(0)
    } else if (a === '--port' || a === '-p') {
      opts.port = Number(argv[++i])
      opts.fixedPort = true
    } else if (a === '--host') opts.host = argv[++i]
    else if (a === '--no-open') opts.open = false
    else {
      process.stderr.write(`Unknown option ${a}\n\n${HELP}`)
      process.exit(1)
    }
  }
  if (!Number.isInteger(opts.port) || opts.port < 0 || opts.port > 65535) {
    process.stderr.write('--port must be a number between 0 and 65535\n')
    process.exit(1)
  }
  return opts
}

async function fileFor(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '')
  const full = join(ROOT, rel)
  if (!full.startsWith(ROOT)) return undefined
  try {
    if ((await stat(full)).isFile()) return full
  } catch {
    // fall through to the app shell
  }
  // Client-side routes (`/project/…`) get the app shell; missing assets get a 404.
  return extname(rel) ? undefined : join(ROOT, 'index.html')
}

const server = createServer(async (req, res) => {
  try {
    const file = await fileFor(req.url ?? '/')
    if (!file) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found')
      return
    }
    const body = await readFile(file)
    const immutable = file.includes(`${sep}assets${sep}`)
    res
      .writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
        'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      })
      .end(body)
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' }).end(String(err))
  }
})

function openBrowser(url) {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]]
  spawn(cmd, args, { stdio: 'ignore', detached: true })
    .on('error', () => {})
    .unref()
}

const opts = parseArgs(process.argv.slice(2))
let port = opts.port

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && !opts.fixedPort && port < opts.port + 20) {
    port += 1
    server.listen(port, opts.host)
    return
  }
  process.stderr.write(`Could not start: ${err.message}\n`)
  process.exit(1)
})

server.on('listening', () => {
  const actual = server.address().port
  // `localhost` rather than 127.0.0.1: browsers treat it as a secure context, which the
  // folder-saving API requires.
  const url = `http://localhost:${actual}/`
  process.stdout.write(`TRICC authoring is running at ${url}\nPress Ctrl+C to stop.\n`)
  if (opts.open) openBrowser(url)
})

server.listen(port, opts.host)
