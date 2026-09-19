#!/usr/bin/env node
// Renders the landing page's designed images from HTML sources:
//
//   scripts/og-card.html   -> site/assets/og.png    (1200x630 social card)
//   scripts/icon-card.html -> site/assets/icon.png  (512x512 favicon)
//
// These are committed, unlike site/assets/demo.gif, which `npm run site:assets`
// copies from the repo's canonical assets on every build. Re-run this after
// editing either card: `npm run site:images`.
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '..', 'site', 'assets')

const targets = [
  { card: 'og-card.html', file: 'og.png', width: 1200, height: 630 },
  { card: 'icon-card.html', file: 'icon.png', width: 512, height: 512 },
]

const browser = await chromium.launch()
try {
  for (const { card, file, width, height } of targets) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    })
    await page.goto(`file://${resolve(here, card)}`)
    // Wait for the webfont so nothing renders in the fallback face.
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: resolve(out, file) })
    await page.close()
    console.log(`Wrote site/assets/${file}`)
  }
} finally {
  await browser.close()
}
