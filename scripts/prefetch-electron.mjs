#!/usr/bin/env node
// Fetch Electron's binary before the E2E run, and repair one known bad extract.
//
// electron's npm package ships no postinstall script, so the ~180 MB binary is
// downloaded lazily the first time `require('electron')` runs. Left to the test
// run itself, both Playwright workers race that same download and one of them
// execs a half-written binary (spawn ETXTBSY). Worse, on macOS the NAPI
// extract-zip occasionally drops the top-level `Electron Framework` symlink
// inside the framework bundle, and electron.launch() then dies with
// `dyld: Library not loaded: @rpath/Electron Framework.framework`.
//
// Doing the fetch here, once, on a quiet system avoids the race; the symlink
// repair is idempotent and cheap. Runs via the pretest:e2e hook, so it covers
// both local runs and CI.
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, symlinkSync } from 'node:fs'

execFileSync(process.execPath, ['-e', "require('electron')"], { stdio: 'inherit' })

if (process.platform === 'darwin') {
  const fwDir =
    'node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework'
  const fwLink = `${fwDir}/Electron Framework`

  let linkPresent = false
  try {
    lstatSync(fwLink)
    linkPresent = true
  } catch {
    // missing — repaired below
  }

  if (linkPresent) {
    console.log('electron: framework symlink ok')
  } else if (existsSync(fwDir)) {
    symlinkSync('Versions/Current/Electron Framework', fwLink)
    console.log(`electron: repaired ${fwLink}`)
  } else {
    console.error('electron: extract missing — framework directory not created')
    process.exit(1)
  }
}
