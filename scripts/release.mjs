#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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

step('Check Node version matches .nvmrc')
const required = readFileSync('.nvmrc', 'utf8').trim().replace(/^v/, '')
const actual = process.versions.node
if (required !== actual) {
  abort(`Node ${required} required, got ${actual}. Run: nvm use (or fnm use)`)
}
console.log(`ok: node ${actual}`)

step('npm ci')
run('npm ci')

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
run('git push --follow-tags origin main')

const newTag = capture('git describe --tags --abbrev=0')
console.log(`\nReleased ${newTag}.`)
try {
  const remoteUrl = capture('git remote get-url origin')
  const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/)
  if (match) {
    console.log(`Watch the build: https://github.com/${match[1]}/actions/workflows/release.yml`)
  }
} catch {
  // non-github remote; skip link
}
