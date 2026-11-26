import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'
import { ESLint } from 'eslint'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)
if (fs.existsSync(path.join(root, '.balcao/up.lock'))) {
  console.error('G0 scripts/environment.mjs — Subida em andamento; aguarde a instalação terminar antes de executar gates')
  process.exit(2)
}
const slash = value => value.replaceAll('\\', '/')
const relative = value => slash(path.relative(root, path.resolve(value)))
const codeExtension = /\.(?:[cm]?[jt]sx?)$/
const failures = new Map()
function report(rule, file, detail) {
  const location = path.isAbsolute(file) ? relative(file) : slash(file)
  const line = `${rule} ${location}${detail ? ` — ${String(detail).replace(/\s+/g, ' ')}` : ''}`
  failures.set(line, line)
}
function walk(directory, skipGenerated = false) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (skipGenerated && ['node_modules', 'dist', '.git', '.harness'].includes(entry.name)) return []
    const filename = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(filename, skipGenerated && entry.name !== 'src') : codeExtension.test(entry.name) ? [filename] : []
  })
}
const sourceFiles = [...walk(path.join(root, 'api/src')), ...walk(path.join(root, 'web/src'))]
const projectFiles = [...walk(path.join(root, 'api'), true), ...walk(path.join(root, 'web'), true)]
const compilerOptions = new Map()

function typecheck(project) {
  const configPath = path.join(root, project, 'tsconfig.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error) {
    report('G1', configPath, ts.flattenDiagnosticMessageText(config.error.messageText, ' '))
    return
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath), undefined, configPath)
  compilerOptions.set(project, parsed.options)
  // Explicit source enumeration keeps future files covered even after a narrow include.
  const files = [...new Set([...parsed.fileNames, ...sourceFiles.filter(file => relative(file).startsWith(`${project}/`))])]
  const program = ts.createProgram(files, { ...parsed.options, noEmit: true, allowJs: true, checkJs: true })
  for (const diagnostic of [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
    report('G1', diagnostic.file?.fileName ?? configPath, `TS${diagnostic.code} ${message}`)
  }
}

async function lint() {
  const eslint = new ESLint({ cwd: root, overrideConfigFile: path.join(root, 'eslint.config.mjs'), ignore: false })
  for (const result of await eslint.lintFiles(projectFiles)) {
    for (const message of result.messages) {
      report('G2', result.filePath, `${message.line ?? 1}:${message.column ?? 1} ${message.ruleId ?? 'parser'} ${message.message}`)
    }
  }
}

function checkSuppression(file, source) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source)
  let token = scanner.scan()
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) {
      const comment = scanner.getTokenText()
      if (/eslint-disable/.test(comment)) report('G2', file, 'Comentário de supressão não permitido')
      if (/@ts-(?:ignore|expect-error|nocheck)/.test(comment)) report('G1', file, 'Comentário de supressão não permitido')
    }
    token = scanner.scan()
  }
}

function staticText(node, constants = new Map(), seen = new Set()) {
  if (!node) return undefined
  if (ts.isStringLiteralLike(node)) return node.text
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) return staticText(node.expression, constants, seen)
  if (ts.isIdentifier(node) && constants.has(node.text) && !seen.has(node.text)) {
    return staticText(constants.get(node.text), constants, new Set([...seen, node.text]))
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticText(node.left, constants, seen)
    const right = staticText(node.right, constants, seen)
    if (left !== undefined && right !== undefined) return left + right
  }
  if (ts.isTemplateExpression(node)) {
    let result = node.head.text
    for (const span of node.templateSpans) {
      const value = staticText(span.expression, constants, seen)
      if (value === undefined) return undefined
      result += value + span.literal.text
    }
    return result
  }
  return undefined
}
function member(node) {
  if (ts.isPropertyAccessExpression(node)) return { target: node.expression, name: node.name.text }
  if (ts.isElementAccessExpression(node)) return { target: node.expression, name: staticText(node.argumentExpression) }
  return undefined
}
function packageIs(specifier, name) {
  return specifier === name || specifier.startsWith(`${name}/`)
}
function architecture() {
  const graph = new Map(sourceFiles.map(file => [path.resolve(file), new Set()]))
  // G8 covers configuration files in web/ as well as its application source.
  const inspected = [...new Set([...sourceFiles, ...projectFiles.filter(file => relative(file).startsWith('web/'))])]
  for (const file of inspected) {
    const filename = relative(file)
    const text = fs.readFileSync(file, 'utf8')
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    const inSource = /^(api|web)\/src\//.test(filename)
    if (inSource) checkSuppression(file, text)
    const project = filename.split('/')[0]
    const isConfig = filename.startsWith(`${project}/src/config/`)
    const constants = new Map()
    const processAliases = new Set(['process'])
    const processEnvImports = []
    function collect(node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text, node.initializer)
      if (ts.isImportDeclaration(node) && ['process', 'node:process'].includes(staticText(node.moduleSpecifier))) {
        if (node.importClause?.name) processAliases.add(node.importClause.name.text)
        const bindings = node.importClause?.namedBindings
        if (bindings && ts.isNamespaceImport(bindings)) processAliases.add(bindings.name.text)
        if (bindings && ts.isNamedImports(bindings)) {
          for (const binding of bindings.elements) if ((binding.propertyName ?? binding.name).text === 'env') processEnvImports.push(binding)
        }
      }
      ts.forEachChild(node, collect)
    }
    collect(source)
    function isProcess(node, seen = new Set()) {
      if (ts.isIdentifier(node)) {
        if (processAliases.has(node.text)) return true
        if (constants.has(node.text) && !seen.has(node.text)) return isProcess(constants.get(node.text), new Set([...seen, node.text]))
      }
      if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) return isProcess(node.expression, seen)
      const access = member(node)
      if (access?.name === 'process' && ts.isIdentifier(access.target) && ['globalThis', 'global'].includes(access.target.text)) return true
      return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require' && ['process', 'node:process'].includes(staticText(node.arguments[0], constants))
    }
    function isImportMeta(node, seen = new Set()) {
      if (ts.isMetaProperty(node)) return node.keywordToken === ts.SyntaxKind.ImportKeyword && node.name.text === 'meta'
      if (ts.isIdentifier(node) && constants.has(node.text) && !seen.has(node.text)) return isImportMeta(constants.get(node.text), new Set([...seen, node.text]))
      if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) return isImportMeta(node.expression, seen)
      return false
    }
    if (filename.startsWith('api/src/') && !isConfig && processEnvImports.length) report('G5', file, 'Import de process.env fora de config')
    function importEdge(specifier) {
      const options = compilerOptions.get(project) ?? { moduleResolution: ts.ModuleResolutionKind.Node10 }
      const resolution = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule
      let resolved = resolution ? path.resolve(resolution.resolvedFileName) : undefined
      if (!resolved && (specifier.startsWith('.') || path.isAbsolute(specifier))) resolved = path.resolve(path.dirname(file), specifier)
      const target = resolved ? relative(resolved) : ''
      if (filename.startsWith('api/src/http/') && (packageIs(specifier, '@prisma/client') || target.startsWith('api/src/repositories/'))) report('G4', file, `Import proibido: ${specifier}`)
      if (filename.startsWith('api/src/services/') && (packageIs(specifier, 'express') || packageIs(specifier, 'multer') || target.startsWith('api/src/http/'))) report('G6', file, `Import proibido: ${specifier}`)
      if (inSource && !filename.startsWith('api/src/integrations/') && packageIs(specifier, 'openai')) report('G7', file, `Import de SDK fora de integrations: ${specifier}`)
      if (filename.startsWith('web/') && target.startsWith('api/')) report('G8', file, `Import do backend: ${specifier}`)
      if (filename.startsWith('api/src/domain/') && (!target.startsWith('api/src/domain/'))) report('G12', file, `Domínio depende de infraestrutura: ${specifier}`)
      if (graph.has(file) && graph.has(resolved)) graph.get(file).add(resolved)
    }
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        const specifier = staticText(node.moduleSpecifier, constants)
        if (specifier !== undefined) importEdge(specifier)
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        const specifier = staticText(node.moduleReference.expression, constants)
        if (specifier !== undefined) importEdge(specifier)
      } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
        const specifier = staticText(node.argument.literal, constants)
        if (specifier !== undefined) importEdge(specifier)
      } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        const specifier = staticText(node.arguments[0], constants)
        if (specifier !== undefined) importEdge(specifier)
      }
      if (inSource && !isConfig) {
        const access = member(node)
        if (access?.name === 'env' && ((project === 'api' && isProcess(access.target)) || (project === 'web' && isImportMeta(access.target)))) report('G5', file, 'Ambiente acessado fora de config')
        if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer && ((project === 'api' && isProcess(node.initializer)) || (project === 'web' && isImportMeta(node.initializer)))) {
          if (node.name.elements.some(binding => (binding.propertyName ?? binding.name).getText(source).replaceAll(/['"]/g, '') === 'env')) report('G5', file, 'Ambiente desestruturado fora de config')
        }
        if (ts.isStringLiteralLike(node)) {
          if (/(?:https?:\/\/(?:localhost|127(?:\.\d+){3}|\[::1\])(?::\d+)?(?:\/|$)|^(?:\/tmp|\/var\/tmp)\/.*(?:upload|anexo))/i.test(node.text)) report('G11', file, 'Recurso local fixo fora de config')
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  // Tarjan reports every participant, including cycles made only of type imports.
  let nextIndex = 0
  const indexes = new Map(), low = new Map(), stack = [], active = new Set()
  function connect(file) {
    indexes.set(file, nextIndex)
    low.set(file, nextIndex++)
    stack.push(file)
    active.add(file)
    for (const target of graph.get(file)) {
      if (!indexes.has(target)) {
        connect(target)
        low.set(file, Math.min(low.get(file), low.get(target)))
      } else if (active.has(target)) low.set(file, Math.min(low.get(file), indexes.get(target)))
    }
    if (low.get(file) === indexes.get(file)) {
      const component = []
      let target
      do {
        target = stack.pop()
        active.delete(target)
        component.push(target)
      } while (target !== file)
      if (component.length > 1 || graph.get(file).has(file)) {
        for (const participant of component) report('G9', participant, `Ciclo: ${component.map(relative).sort().join(' <-> ')}`)
      }
    }
  }
  for (const file of graph.keys()) if (!indexes.has(file)) connect(file)
}

function command(args, cwd = root) {
  return spawnSync(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180000, env: { ...process.env, NO_COLOR: '1' } })
}
function unitTests() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'balcao-gates-'))
  const output = path.join(temporary, 'vitest.json')
  try {
    const result = command([path.join(root, 'api/node_modules/vitest/vitest.mjs'), 'run', '--reporter=json', `--outputFile=${output}`], path.join(root, 'api'))
    let data
    if (fs.existsSync(output)) data = JSON.parse(fs.readFileSync(output, 'utf8'))
    if (data) {
      console.log(`G3: ${data.numPassedTests}/${data.numTotalTests} testes aprovados`)
      for (const suite of data.testResults ?? []) {
        if (suite.status !== 'passed') report('G3', suite.name, suite.message || 'Suíte unitária reprovada')
      }
    }
    if (result.status !== 0 && ![...failures.keys()].some(line => line.startsWith('G3 '))) report('G3', 'api/vitest.config.mts', result.error?.message || result.stderr || result.stdout || 'Falha ao executar testes')
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}
function unused() {
  const result = command([path.join(root, 'node_modules/knip/bin/knip.js'), '--config', 'knip.json', '--workspace', 'api', '--workspace', 'web', '--reporter', 'json', '--include', 'files,dependencies,exports,types,nsExports,nsTypes,enumMembers,namespaceMembers'])
  let data
  try { data = JSON.parse(result.stdout) } catch { /* Report execution failure below; never pass a broken tool. */ }
  if (!data) {
    report('G10', 'knip.json', result.error?.message || result.stderr || result.stdout || 'Knip não produziu JSON')
    return
  }
  for (const file of data.files ?? []) report('G10', typeof file === 'string' ? file : file.filePath, 'Arquivo sem uso')
  for (const issue of data.issues ?? []) {
    for (const [kind, items] of Object.entries(issue)) {
      if (kind === 'file' || !Array.isArray(items)) continue
      for (const item of items) report('G10', issue.file, `${kind}: ${typeof item === 'string' ? item : item.name ?? item.symbol ?? JSON.stringify(item)}`)
    }
  }
  if (result.status !== 0 && ![...failures.keys()].some(line => line.startsWith('G10 '))) report('G10', 'knip.json', result.error?.message || result.stderr || 'Knip terminou com erro')
}

const checks = [
  ['G1', 'api/tsconfig.json', () => typecheck('api')],
  ['G1', 'web/tsconfig.json', () => typecheck('web')],
  ['G2', 'eslint.config.mjs', lint],
  ['G4', 'scripts/gates.mjs', architecture],
  ['G3', 'api/vitest.config.mts', unitTests],
  ['G10', 'knip.json', unused],
]
for (const [rule, file, check] of checks) {
  try { await check() } catch (error) { report(rule, file, `Falha da ferramenta: ${error.message}`) }
}
console.log('\nResumo dos gates (G1–G12):')
if (failures.size) {
  for (const violation of [...failures.values()].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))) console.log(violation)
  process.exitCode = 1
} else console.log('PASS — nenhuma violação encontrada')
