import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
const [copyA, copyB, output] = process.argv.slice(2).map(p => path.resolve(p))
fs.mkdirSync(output, { recursive: true })
const read = copy => JSON.parse(fs.readFileSync(path.join(copy, '.balcao/state.json'), 'utf8'))
const a = read(copyA), b = read(copyB)
for (const key of ['apiPort', 'webPort', 'dbPort', 'project', 'uploads']) assert.notEqual(a[key], b[key], key)
function run(command) {
  const r = spawnSync(process.execPath, ['scripts/environment.mjs', command], { cwd: copyB, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  fs.writeFileSync(path.join(output, `b-${command}.log`), r.stdout + r.stderr)
  assert.equal(r.status, 0, `B ${command} falhou`)
}
run('down')
const healthA = await fetch(`http://localhost:${a.apiPort}/api/health`).then(r => r.json())
assert.deepEqual(healthA, { status: 'ok', db: 'ok' })
let bStopped = false
try { await fetch(`http://localhost:${b.apiPort}/api/health`, { signal: AbortSignal.timeout(3000) }) } catch { bStopped = true }
assert(bStopped)
run('up')
assert.deepEqual(read(copyB), b)
const healthB = await fetch(`http://localhost:${b.apiPort}/api/health`).then(r => r.json())
assert.deepEqual(healthB, { status: 'ok', db: 'ok' })
const result = { status: 'PASS', distinctResources: true, aHealthyAfterBDown: healthA, bStopped, bRestartHealthy: healthB, bStatePreserved: true }
fs.writeFileSync(path.join(output, 'isolation.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
