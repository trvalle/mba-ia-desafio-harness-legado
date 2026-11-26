// node scripts/validate-report.mjs <playwright/index.mjs>
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2])).href)
const file = path.resolve('docs/relatorio-final.html')
const browser = await chromium.launch({ headless: true })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(pathToFileURL(file).href)
  assert.equal(await page.locator('.requirement').count(), 56)
  await page.locator('#mode-toggle').click()
  assert.equal(await page.locator('body').getAttribute('data-mode'), 'tecnico')
  await page.locator('#mode-toggle').click()
  await page.locator('#theme-toggle').click()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  await page.locator('#theme-toggle').click()
  await page.locator('#search').fill('G5')
  assert.equal(await page.locator('.requirement:visible').count(), 1)
  await page.locator('#expand-all').click()
  assert.equal(await page.locator('.requirement:visible').getAttribute('open'), '')
  await page.locator('#search').fill('')
  await page.locator('#scope-filter').selectOption('ACADEMICO')
  assert.equal(await page.locator('.requirement:visible').count(), 39)
  await page.locator('#status-filter').selectOption('APROVADO')
  assert(await page.locator('.requirement:visible').count() > 0)
  await page.locator('#status-filter').selectOption('')
  await page.locator('#scope-filter').selectOption('')
  await page.locator('.copy').first().click()
  await page.locator('#toast').filter({ hasText: /Comando (copiado|selecionado)/ }).waitFor()
  await page.locator('.zoom').first().click()
  assert(await page.locator('#image-dialog').isVisible())
  await page.locator('#close-dialog').click()
  await page.locator('details[open]').evaluateAll(nodes => nodes.forEach(node => { node.open = false }))
  const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))
  for (const href of links) {
    if (href.startsWith('#')) assert.equal(await page.locator(`[id="${href.slice(1)}"]`).count(), 1, href)
    else if (!/^[a-z]+:/i.test(href)) assert(fs.existsSync(path.resolve(path.dirname(file), href.split('#')[0])), href)
  }
  assert.equal(await page.locator('img').evaluateAll(nodes => nodes.filter(node => node.getAttribute('src') && (!node.complete || node.naturalWidth === 0)).length), 0)
  await page.waitForFunction(() => document.getElementById('toast').textContent === '')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.screenshot({ path: 'docs/evidence/relatorio-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Overflow horizontal em celular')
  await page.screenshot({ path: 'docs/evidence/relatorio-mobile.png' })
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('.sidebar').isVisible(), false)
  assert.deepEqual(errors, [])
  const result = { status: 'PASS', file: 'docs/relatorio-final.html', requirements: 56, academic: 39, pageErrors: errors, desktop: '1440x1000', mobile: '390x844', offline: true, filters: true, theme: true, modes: true, copy: true, gallery: true, links: true, images: true, printCss: true }
  fs.writeFileSync('docs/evidence/report-validation.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally { await browser.close() }
