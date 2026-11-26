// Optional browser evidence tool; Playwright is installed separately from the harness.
// node scripts/validate-ui.mjs <copy-a> <copy-b> <playwright/index.mjs> <output-directory>
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const [copyA, copyB, playwrightModule, output] = process.argv.slice(2)
if (!output) throw new Error('Informe cópia A, cópia B, módulo Playwright e diretório de saída.')
const { chromium } = await import(pathToFileURL(path.resolve(playwrightModule)).href)
const states = [copyA, copyB].map(p => JSON.parse(fs.readFileSync(path.join(p, '.balcao/state.json'), 'utf8')))
fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const errors = [], results = []
try {
  const pages = await Promise.all(states.map(async state => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`http://localhost:${state.webPort}/login`)
    await page.getByLabel('E-mail').fill('cliente@balcao.dev')
    await page.getByLabel('Senha').fill('Cliente@123')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL('**/tickets')
    await page.getByRole('heading', { name: 'Meus chamados', exact: true }).waitFor()
    return page
  }))
  for (const [i, page] of pages.entries()) {
    const title = i === 0 ? 'Fatura em dobro, urgente' : 'Fatura da segunda cópia, urgente'
    await page.getByRole('link', { name: 'Novo chamado' }).click()
    await page.getByLabel('Título').fill(title)
    await page.getByLabel('Descrição').fill('Paguei duas vezes a mesma fatura.')
    const before = performance.now()
    await page.getByRole('button', { name: 'Abrir chamado' }).click()
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
    await page.getByText('Financeiro / prioridade Urgente', { exact: false }).waitFor({ timeout: 15000 })
    const elapsed = Math.round(performance.now() - before)
    assert(elapsed < 15000, `Triagem excedeu 15s: ${elapsed}`)
    const id = page.url().split('/').at(-1)
    results.push({ copy: i === 0 ? 'A' : 'B', title, id, triageMs: elapsed, front: page.url() })
    await page.screenshot({ path: path.join(output, `chamado-${i === 0 ? 'a' : 'b'}.png`), fullPage: true })
  }
  const a = pages[0], b = pages[1]
  const filesBefore = fs.readdirSync(states[0].uploads).length
  await a.locator('input[type=file]').setInputFiles({ name: 'prova-isolamento.txt', mimeType: 'text/plain', buffer: Buffer.from('Anexo exclusivo da copia A.\n') })
  await a.getByRole('button', { name: 'Enviar anexo' }).click()
  await a.getByText('prova-isolamento.txt', { exact: false }).waitFor()
  assert.equal(fs.readdirSync(states[0].uploads).length, filesBefore + 1)
  assert.equal(fs.readdirSync(states[1].uploads).length, 0)
  const downloadEvent = a.waitForEvent('download')
  await a.getByRole('button', { name: 'Baixar', exact: true }).click()
  const download = await downloadEvent
  assert.equal(download.suggestedFilename(), 'prova-isolamento.txt')
  await download.saveAs(path.join(output, 'anexo-baixado.txt'))
  assert.equal(fs.readFileSync(path.join(output, 'anexo-baixado.txt'), 'utf8'), 'Anexo exclusivo da copia A.\n')
  await a.screenshot({ path: path.join(output, 'anexo-a.png'), fullPage: true })
  await b.goto(`http://localhost:${states[1].webPort}/tickets`)
  await b.getByRole('heading', { name: 'Meus chamados', exact: true }).waitFor()
  assert.equal(await b.getByText('Fatura em dobro, urgente', { exact: true }).count(), 0)
  await b.screenshot({ path: path.join(output, 'isolamento-b.png'), fullPage: true })
  await b.goto(`http://localhost:${states[1].webPort}/tickets/${results[0].id}`)
  await b.getByText('Chamado não encontrado', { exact: true }).waitFor()
  await b.screenshot({ path: path.join(output, 'erro-isolamento.png'), fullPage: true })
  assert.deepEqual(errors, [])
  fs.writeFileSync(path.join(output, 'browser.json'), JSON.stringify({ status: 'PASS', results, uploadIsolated: true, downloadMatches: true, absentFromOtherCopy: true, pageErrors: errors }, null, 2))
  console.log(JSON.stringify({ status: 'PASS', results, uploadIsolated: true, downloadMatches: true, pageErrors: errors }, null, 2))
} finally { await browser.close() }
