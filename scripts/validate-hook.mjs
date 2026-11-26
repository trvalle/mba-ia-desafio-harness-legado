// Run only against a clean disposable clone/worktree.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
const root = path.resolve(process.argv[2] || '.')
const output = path.resolve(process.argv[3] || '.balcao/hook-evidence')
fs.mkdirSync(output, { recursive: true })
const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
assert.equal(git('status', '--porcelain').stdout.trim(), '', 'Use uma cópia limpa')
const head = git('rev-parse', 'HEAD').stdout.trim()
assert.equal(git('config', 'core.hooksPath').stdout.trim(), '.githooks')
const file = 'api/src/services/teste-hook.ts'
assert(!fs.existsSync(path.join(root, file)), 'Não sobrescrever arquivo existente')
const tests = [
  ['G1', "export const total: number = 'muitos'\n"],
  ['G2', 'export function f(): number {\n  const sobra = 1\n  return 2\n}\n'],
]
const results = []
for (const [rule, content] of tests) {
  try {
    fs.writeFileSync(path.join(root, file), content, { flag: 'wx' })
    assert.equal(git('add', file).status, 0)
    const result = git('-c', 'user.name=Harness validation', '-c', 'user.email=harness@example.invalid', 'commit', '--no-gpg-sign', '-m', 'teste do hook')
    fs.writeFileSync(path.join(output, `${rule}.log`), result.stdout + result.stderr)
    assert.notEqual(result.status, 0, `${rule}: commit deveria ser bloqueado`)
    assert((result.stdout + result.stderr).includes(`${rule} ${file}`), `${rule}: diagnóstico não encontrado`)
    assert.equal(git('rev-parse', 'HEAD').stdout.trim(), head)
    results.push({ rule, status: 'PASS', commitBlocked: true, exitCode: result.status })
  } finally {
    git('reset', '-q', '--', file)
    if (fs.existsSync(path.join(root, file))) fs.unlinkSync(path.join(root, file))
  }
}
assert.equal(git('status', '--porcelain').stdout.trim(), '')
fs.writeFileSync(path.join(output, 'hook.json'), JSON.stringify({ head, results, clean: true }, null, 2))
console.log(JSON.stringify({ head, results, clean: true }, null, 2))
