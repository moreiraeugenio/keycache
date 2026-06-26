#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, symlinkSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import {
  getLastTag,
  getCommitsSinceTag,
  pickBump,
  printPreview,
} from './version-bump.mjs'

const dryRun = process.argv.includes('--dry-run')

function step(label) {
  console.log(`\n==> ${label}`)
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' })
}

function capture(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

function printWatchLink() {
  try {
    const remoteUrl = capture('git remote get-url origin')
    const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/)
    if (match) {
      console.log(`Watch the build: https://github.com/${match[1]}/actions/workflows/release.yml`)
    }
  } catch {
    // non-github remote; skip link
  }
}

async function confirm(msg) {
  const rl = createInterface({ input, output })
  const answer = await rl.question(`${msg} [y/N] `)
  rl.close()
  return answer.trim().toLowerCase() === 'y'
}

function abort(msg) {
  console.error(`\nAborted: ${msg}`)
  process.exit(1)
}

step('Check branch is main')
const branch = capture('git rev-parse --abbrev-ref HEAD')
if (branch !== 'main') abort(`must be on main (currently on ${branch})`)
console.log(`ok: on ${branch}`)

step('Check working tree is clean')
const status = capture('git status --porcelain')
if (status) abort(`uncommitted changes present:\n${status}`)
console.log('ok: clean')

step('Sync with origin/main')
run('git fetch origin main')
const local = capture('git rev-parse HEAD')
const remote = capture('git rev-parse origin/main')
if (local !== remote) {
  const base = capture('git merge-base HEAD origin/main')
  if (base === local) {
    run('git pull --ff-only origin main')
  } else if (base === remote) {
    console.log('ok: local has unpushed commits (will push at end)')
  } else {
    abort('local main and origin/main have diverged')
  }
} else {
  console.log('ok: up to date with origin/main')
}

// Resume support: if a prior run created the bump commit + tag locally
// but the push didn't deliver the tag (e.g. pre-push E2E flaked and the
// user recovered with a tag-less push), the tag is sitting unpushed at
// HEAD. Detect that and finish the release — skipping the slow checks
// that already passed on the prior run.
step('Check for unpushed release tag at HEAD')
let pendingTag = ''
try {
  pendingTag = capture('git describe --tags --exact-match HEAD')
} catch {
  // no tag at HEAD; nothing to resume
}
if (pendingTag) {
  const tagOnRemote = capture(`git ls-remote --tags origin refs/tags/${pendingTag}`)
  if (!tagOnRemote) {
    if (dryRun) {
      console.log(`(dry run) would resume push of ${pendingTag}`)
      process.exit(0)
    }
    console.log(`Resuming push of ${pendingTag} (tag at HEAD, missing on origin).`)
    step('Push commit and tag')
    run(`git push --follow-tags origin main ${pendingTag}`)
    console.log(`\nReleased ${pendingTag}.`)
    printWatchLink()
    process.exit(0)
  }
}
console.log('ok: no pending tag to push')

step('Check Node version matches .nvmrc')
const required = readFileSync('.nvmrc', 'utf8').trim().replace(/^v/, '')
const actual = process.versions.node
if (required !== actual) {
  abort(`Node ${required} required, got ${actual}. Run: nvm use (or fnm use)`)
}
console.log(`ok: node ${actual}`)

step('npm ci')
run('npm ci')

// Workaround: electron v42's npm package has no postinstall script, so the
// 180 MB binary is fetched lazily the first time `require('electron')` runs.
// When that lazy install happens under Playwright (during npm run test:e2e),
// the NAPI extract-zip occasionally drops the top-level `Electron Framework`
// symlink inside the framework bundle. Playwright's electron.launch() then
// fails with `dyld: Library not loaded: @rpath/Electron Framework.framework`.
// Force the install here, on a quiet system, then recreate the symlink if
// the extractor dropped it. Standalone installs produce a correct extract
// every time we've tested, but the repair is idempotent and cheap.
step('Pre-fetch electron + verify framework')
run('node -e "require(\'electron\')"')
const fwDir =
  'node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework'
const fwLink = `${fwDir}/Electron Framework`
let fwLinkPresent = false
try {
  lstatSync(fwLink)
  fwLinkPresent = true
} catch {
  // missing — repair below
}
if (existsSync(fwDir) && !fwLinkPresent) {
  symlinkSync('Versions/Current/Electron Framework', fwLink)
  console.log(`repaired ${fwLink}`)
} else if (fwLinkPresent) {
  console.log('framework symlink ok')
} else {
  abort('electron extract missing — framework directory not created')
}

step('Lint + unit tests + build + E2E')
run('npm run lint')
run('npm run test')
run('npm run build')
run('npm run test:e2e')

step('Preview bump')
const lastTag = getLastTag()
if (!lastTag) abort('no git tags found; create an initial tag first')
const commits = getCommitsSinceTag(lastTag)
if (commits.length === 0) abort(`no commits since ${lastTag}`)
printPreview(lastTag, commits)
const bump = pickBump(commits)

if (dryRun) {
  console.log('\n(dry run — stopping before bump + push)')
  process.exit(0)
}

if (!(await confirm(`\nProceed with ${bump} bump + commit + tag + push to origin?`))) {
  abort('cancelled by user')
}

step(`Bump version (${bump})`)
run(`npm version ${bump} -m "chore: release v%s"`)

step('Push commit and tag')
const newTag = capture('git describe --tags --abbrev=0')
// Push main + the new tag explicitly. Relying on --follow-tags alone is
// fragile: if main happens to already be at the bump commit on origin
// (e.g. a partial recovery push delivered the commit but not the tag),
// --follow-tags pushes no refs and silently skips the tag.
run(`git push --follow-tags origin main ${newTag}`)

console.log(`\nReleased ${newTag}.`)
printWatchLink()
