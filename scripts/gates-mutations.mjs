import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv[2]
if (!['own', 'adversarial'].includes(mode)) throw new Error('Uso: node scripts/gates-mutations.mjs own|adversarial')
const run = () => spawnSync(process.execPath, ['scripts/gates.mjs'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000 })
const fixture = name => fs.readFileSync(path.join(root, 'fixtures/gates', name), 'utf8')
const cases = mode === 'own' ? [
  { rule: 'G11', files: { 'web/src/mutacao-endereco.ts': fixture('G11-endpoint-fixo.ts.modelo') } },
  { rule: 'G12', files: { 'api/src/domain/mutacao-infraestrutura.ts': fixture('G12-dominio-infraestrutura.ts.modelo') } },
] : [
  { rule: 'G4', files: { 'api/src/http/routes/mutacao-reexport.ts': "export type { TicketRepository } from '../../repositories/ticket-repository'\n" } },
  { rule: 'G5', files: { 'api/src/services/mutacao-env-computado.ts': "export const modo = process['env'].AI_MODE\n" } },
  { rule: 'G5', files: { 'web/src/mutacao-env-computado.ts': "export const modo = import.meta['env'].MODE\n" } },
  { rule: 'G5', files: { 'api/src/services/mutacao-env-desestruturado.ts': "const { env: ambiente } = process\nexport const modo = ambiente.AI_MODE\n" } },
  { rule: 'G6', files: { 'api/src/services/mutacao-tipo-importado.ts': "export type Requisicao = import('express').Request\n" } },
  { rule: 'G7', files: { 'api/src/services/mutacao-import-dinamico.ts': "export async function carregar() { return import('openai') }\n" } },
  { rule: 'G8', files: { 'web/src/mutacao-tipo-backend.ts': "export type Pessoa = import('../../api/src/domain/ticket').CurrentUser\n" } },
  { rule: 'G9', files: {
    'api/src/domain/mutacao-tipo-a.ts': "import type { B } from './mutacao-tipo-b'\nexport interface A { outro?: B }\n",
    'api/src/domain/mutacao-tipo-b.ts': "import type { A } from './mutacao-tipo-a'\nexport interface B { outro?: A }\n",
  } },
  { rule: 'G10', files: {
    'api/src/services/mutacao-export-tipo.ts': "export type TipoAbandonado = { id: string }\nexport const usado = 2\n",
    'api/src/services/mutacao-export-tipo.test.ts': "import { expect, it } from 'vitest'\nimport { usado } from './mutacao-export-tipo'\nit('consome valor', () => expect(usado).toBe(2))\n",
  } },
]
const baseline = run()
if (baseline.status !== 0) {
  process.stderr.write(baseline.stdout + baseline.stderr)
  throw new Error('A linha de base precisa passar antes do teste de mutação')
}
let failed = false
const temporaryFiles = new Set()
function cleanUp() {
  for (const file of temporaryFiles) if (fs.existsSync(file)) fs.unlinkSync(file)
  temporaryFiles.clear()
}
process.on('exit', cleanUp)
process.on('SIGINT', () => process.exit(130))
process.on('SIGTERM', () => process.exit(143))
for (const test of cases) {
  const created = []
  try {
    for (const [filename, content] of Object.entries(test.files)) {
      const target = path.join(root, filename)
      if (fs.existsSync(target)) throw new Error(`Arquivo já existe, preservado: ${filename}`)
      fs.writeFileSync(target, content, { flag: 'wx' })
      created.push(target)
      temporaryFiles.add(target)
    }
    const result = run()
    const output = result.stdout + result.stderr
    const detected = result.status !== 0 && Object.keys(test.files).some(filename => output.split('\n').some(line => line.startsWith(`${test.rule} ${filename}`)))
    console.log(`${detected ? 'PASS' : 'FAIL'} ${test.rule} ${Object.keys(test.files).join(', ')}`)
    if (!detected) {
      failed = true
      process.stderr.write(output)
    }
  } finally {
    for (const file of created) {
      fs.unlinkSync(file)
      temporaryFiles.delete(file)
    }
  }
}
process.exitCode = failed ? 1 : 0
