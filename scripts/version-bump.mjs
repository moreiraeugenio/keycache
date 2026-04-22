#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8' })
}

export function getLastTag() {
  try {
    return git('describe --tags --abbrev=0').trim()
  } catch {
    return null
  }
}

export function getCommitsSinceTag(tag) {
  const raw = git(`log ${tag}..HEAD --format=%B%x00`)
  return raw
    .split('\0')
    .map((c) => c.trim())
    .filter(Boolean)
}

export function classify(commit) {
  const subject = commit.split('\n', 1)[0]
  if (/^[a-z]+(\([^)]+\))?!:/.test(subject)) return 'major'
  if (/^BREAKING CHANGE:/m.test(commit)) return 'major'
  if (/^feat(\([^)]+\))?:/.test(subject)) return 'minor'
  return 'patch'
}

export function pickBump(commits) {
  const levels = commits.map(classify)
  if (levels.includes('major')) return 'major'
  if (levels.includes('minor')) return 'minor'
  return 'patch'
}

export function printPreview(lastTag, commits) {
  console.log(`Commits since ${lastTag}:`)
  for (const c of commits) {
    console.log(`  [${classify(c).padEnd(5)}] ${c.split('\n', 1)[0]}`)
  }
  console.log(`\nBump: ${pickBump(commits)}`)
}

function main() {
  const dryRun = process.argv.includes('--dry-run')

  const lastTag = getLastTag()
  if (!lastTag) {
    console.error('No git tags found. Create an initial tag first (e.g. git tag v0.0.1).')
    process.exit(1)
  }

  const commits = getCommitsSinceTag(lastTag)
  if (commits.length === 0) {
    console.error(`No commits since ${lastTag}.`)
    process.exit(1)
  }

  printPreview(lastTag, commits)

  if (dryRun) {
    console.log('(dry run — no version change)')
    return
  }

  const bump = pickBump(commits)
  execSync(`npm version ${bump} -m "chore: release v%s"`, { stdio: 'inherit' })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
