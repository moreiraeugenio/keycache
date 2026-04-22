#!/usr/bin/env node
import { execSync } from 'node:child_process'

const dryRun = process.argv.includes('--dry-run')

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8' })
}

let lastTag
try {
  lastTag = git('describe --tags --abbrev=0').trim()
} catch {
  console.error('No git tags found. Create an initial tag first (e.g. git tag v0.0.1).')
  process.exit(1)
}

const raw = git(`log ${lastTag}..HEAD --format=%B%x00`)
const commits = raw.split('\0').map((c) => c.trim()).filter(Boolean)

if (commits.length === 0) {
  console.error(`No commits since ${lastTag}.`)
  process.exit(1)
}

function classify(commit) {
  const subject = commit.split('\n', 1)[0]
  if (/^[a-z]+(\([^)]+\))?!:/.test(subject)) return 'major'
  if (/^BREAKING CHANGE:/m.test(commit)) return 'major'
  if (/^feat(\([^)]+\))?:/.test(subject)) return 'minor'
  return 'patch'
}

const classified = commits.map((c) => ({
  subject: c.split('\n', 1)[0],
  level: classify(c),
}))

const bump = classified.some((c) => c.level === 'major')
  ? 'major'
  : classified.some((c) => c.level === 'minor')
    ? 'minor'
    : 'patch'

console.log(`Commits since ${lastTag}:`)
for (const { subject, level } of classified) {
  console.log(`  [${level.padEnd(5)}] ${subject}`)
}
console.log(`\nBump: ${bump}`)

if (dryRun) {
  console.log('(dry run — no version change)')
  process.exit(0)
}

execSync(`npm version ${bump} -m "chore: release v%s"`, { stdio: 'inherit' })
