import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(root)
const dir = path.join(root, '.balcao')
const stateFile = path.join(dir, 'state.json')
const command = process.argv[2]
if (!['up', 'down', 'status'].includes(command)) {
  console.error('Uso: node scripts/environment.mjs up|down|status')
  process.exit(2)
}
fs.mkdirSync(dir, { recursive: true })
const project = `balcao-${createHash('sha256').update(root).digest('hex').slice(0, 16)}`
let docker
// Docker Desktop without distro integration cannot resolve /mnt/<drive> bind paths.
// Its Windows client plus wslpath keeps the announced host upload directory real.
for (const candidate of process.env.WSL_DISTRO_NAME ? ['docker.exe', 'docker'] : ['docker']) {
  if (spawnSync(candidate, ['info'], { stdio: 'ignore' }).status === 0) { docker = candidate; break }
}
if (!docker) throw new Error('Docker indisponível. Inicie Docker e habilite a integração WSL, se aplicável.')
function run(executable, args, cwd = root, capture = false) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', maxBuffer: 32 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(`${executable} ${args.join(' ')} falhou (${result.status}): ${result.stderr || result.error || ''}`)
  return result.stdout?.trim()
}
function dockerPath(p) {
  return docker.endsWith('.exe') ? run('wslpath', ['-m', p], root, true) : p
}
const compose = (...args) => run(docker, ['compose', '-p', project, '-f', '.balcao/compose.json', ...args])
function show(s) {
  console.log(`API: http://localhost:${s.apiPort}\nFront: http://localhost:${s.webPort}\nBanco: ${project}/balcao (localhost:${s.dbPort})\nAnexos: ${s.uploads}\nWorker: ${project}-worker-1\nEstado: ${stateFile}`)
}
let state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null
if (state && state.root !== root) state = null // a copied checkout must never reuse another copy's resources
if (command === 'down') {
  if (!state) console.log('Esta cópia não tem ambiente registrado.')
  else { compose('down', '--remove-orphans'); console.log('Ambiente encerrado; banco e anexos preservados.'); show(state) }
  process.exit(0)
}
if (command === 'status') {
  if (!state) throw new Error('Execute npm run up nesta cópia primeiro.')
  compose('ps', '-a'); show(state); process.exit(0)
}
const lock = path.join(dir, 'up.lock')
try { fs.mkdirSync(lock) } catch { throw new Error('Outra subida está em andamento. Se foi interrompida, remova apenas .balcao/up.lock e tente novamente.') }
try {
  for (const folder of ['', 'api', 'web']) {
    const cwd = path.join(root, folder)
    const hash = createHash('sha256').update(fs.readFileSync(path.join(cwd, 'package-lock.json'))).update(fs.readFileSync(path.join(cwd, 'package.json'))).digest('hex')
    const stamp = path.join(cwd, 'node_modules', '.balcao-lock')
    if (!fs.existsSync(stamp) || fs.readFileSync(stamp, 'utf8') !== hash) {
      run('npm', ['ci'], cwd)
      fs.writeFileSync(stamp, hash)
    }
  }
  // Explicit generation: npm lifecycle behavior differs between npm releases.
  run('npm', ['exec', '--', 'prisma', 'generate'], path.join(root, 'api'))
  run('git', ['config', 'core.hooksPath', '.githooks'])
  fs.chmodSync(path.join(root, '.githooks', 'pre-commit'), 0o755)
  if (!state) {
    const reservations = []
    for (let i = 0; i < 3; i++) {
      const server = net.createServer()
      await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
      reservations.push(server)
    }
    const [apiPort, webPort, dbPort] = reservations.map(s => s.address().port)
    state = { root, project, apiPort, webPort, dbPort, uploads: path.join(dir, 'uploads') }
    await Promise.all(reservations.map(s => new Promise(resolve => s.close(resolve))))
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n')
  }
  fs.mkdirSync(state.uploads, { recursive: true })
  const environment = {
    DATABASE_URL: 'postgresql://balcao:balcao@db:5432/balcao', NODE_ENV: 'development',
    PORT: '4000', WEB_ORIGIN: `http://localhost:${state.webPort}`, JWT_SECRET: 'dev-secret',
    AI_MODE: 'fake', UPLOAD_DIR: '/app/uploads', TRIAGE_INTERVAL_MS: '2000',
  }
  const api = { build: { context: dockerPath(root), dockerfile: 'scripts/Dockerfile', target: 'api' }, environment,
    depends_on: { db: { condition: 'service_healthy' } }, init: true }
  const config = {
    services: {
      db: { image: 'postgres:16', environment: { POSTGRES_USER: 'balcao', POSTGRES_PASSWORD: 'balcao', POSTGRES_DB: 'balcao' },
        ports: [`127.0.0.1:${state.dbPort}:5432`], volumes: ['pgdata:/var/lib/postgresql/data'],
        healthcheck: { test: ['CMD-SHELL', 'pg_isready -U balcao -d balcao'], interval: '2s', timeout: '3s', retries: 30 } },
      api: { ...api, ports: [`127.0.0.1:${state.apiPort}:4000`],
        volumes: [{ type: 'bind', source: dockerPath(state.uploads), target: '/app/uploads' }],
        healthcheck: { test: ['CMD', 'node', '-e', "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"], interval: '2s', timeout: '5s', retries: 30 } },
      worker: { ...api, command: ['node', 'node_modules/tsx/dist/cli.mjs', 'src/jobs/triage-worker.ts'] },
      web: { build: { context: dockerPath(root), dockerfile: 'scripts/Dockerfile', target: 'web' }, init: true,
        environment: { VITE_API_URL: `http://localhost:${state.apiPort}` }, ports: [`127.0.0.1:${state.webPort}:5173`],
        healthcheck: { test: ['CMD', 'node', '-e', "fetch('http://localhost:5173').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"], interval: '2s', timeout: '5s', retries: 30 } },
    }, volumes: { pgdata: {} },
  }
  fs.writeFileSync(path.join(dir, 'compose.json'), JSON.stringify(config, null, 2) + '\n')
  compose('build')
  compose('up', '-d', '--wait', 'db')
  compose('run', '--rm', '--no-deps', 'api', 'node', 'node_modules/prisma/build/index.js', 'migrate', 'deploy')
  compose('run', '--rm', '--no-deps', 'api', 'node', 'node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts')
  compose('up', '-d', '--wait', '--wait-timeout', '120')
  show(state)
} finally {
  fs.rmdirSync(lock)
}
