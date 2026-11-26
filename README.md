# Balcão — domando um legado para agentes

Harness local para a central de chamados do módulo **Desenvolvimento em modo agente**. Preserva Express, Prisma, Postgres, React, Vite e o contrato HTTP do legado. O objetivo é permitir que agentes iniciem uma cópia isolada, alterem o código e comprovem a qualidade sem assistência.

## Como rodar

Pré-requisitos: **Git, Docker com Compose e Node.js LTS >=22.13**. No Windows, execute pelo **WSL**. Docker deve estar iniciado; a integração WSL é recomendada. Quando ela não está ativa, o script aceita o cliente `docker.exe` já disponível no PATH do WSL. Nenhum Python, jq, lsof ou chave de IA é necessário.

```bash
git clone https://github.com/trvalle/mba-ia-desafio-harness-legado.git
cd mba-ia-desafio-harness-legado
npm run up
```

A subida instala com `npm ci` respeitando os lockfiles, gera o Prisma Client explicitamente, instala o hook, constrói as imagens, aguarda o Postgres, aplica migrations, executa a seed idempotente e inicia API, worker separado e front. Ao terminar informa **API, front, banco/porta, pasta de anexos e worker**. Os endereços são escolhidos por cópia; use os que aparecerem na sua saída.

```bash
npm run status
npm run gates
npm run down
```

`up` pode ser repetido sem derrubar: os dados são preservados, as contas e os três chamados da seed não são duplicados. `down` encerra apenas o projeto Compose desta cópia, preservando banco e anexos para a próxima subida. A IA usa `fake`, sem chave. Os recursos locais são vinculados a localhost.

O runtime é construído a partir do código da cópia. Depois de editar código, rode `npm run up` novamente para reconstruí-lo. Gates analisam o código no diretório, não uma imagem antiga.

### Duas cópias simultâneas

Com a primeira no ar, a partir da raiz:

```bash
git worktree add ../copia-b
cd ../copia-b
npm run up
```

Cada cópia recebe seu próprio nome Compose derivado do caminho real, portas disponíveis, volume Postgres, pasta `.balcao/uploads` e worker. O front recebe `VITE_API_URL` da própria API; CORS, upload e download usam a mesma configuração. Não há container_name fixo nem volume externo compartilhado. O estado local fica em `.balcao/state.json`, fora do Git, e não é reaproveitado quando a cópia muda de caminho.

Portas continuam estáveis durante as repetições e reinícios da mesma cópia. Se outro programa ocupar uma porta reservada enquanto a cópia estiver desligada, a subida falha com o diagnóstico do Docker, sem matar esse programa. Não apague dados para contornar esse conflito.

## Contas da seed

Credenciais exclusivamente de demonstração local:

| Papel | E-mail | Senha |
|---|---|---|
| Admin | admin@balcao.dev | Admin@123 |
| Atendente | agente@balcao.dev | Agente@123 |
| Cliente | cliente@balcao.dev | Cliente@123 |

## Gates

`npm run gates` executa todas as verificações, mesmo após falhas, e termina com uma linha por violação: **ID arquivo detalhe**. Dependências sem uso incluem o nome do pacote. Qualquer violação, warning ou falha de ferramenta produz saída diferente de zero. Não há exclusão de arquivos de src nem comentários de supressão.

| ID | Regra | Ferramenta |
|---|---|---|
| G1 | Zero erros de tipo na API e no front | TypeScript Compiler API |
| G2 | Zero erros/warnings de lint; unused e any explícito | ESLint + typescript-eslint |
| G3 | Todos os unitários `api/src/**/*.test.ts` passam | Vitest |
| G4 | HTTP não importa Prisma/repositories | AST e resolução TypeScript |
| G5 | Ambiente somente em api/src/config e web/src/config | AST TypeScript |
| G6 | Services não importam Express, Multer ou HTTP, inclusive tipos | AST e resolução TypeScript |
| G7 | OpenAI somente em integrations | AST TypeScript |
| G8 | Web não importa arquivos da API, inclusive tipos | AST e resolução TypeScript |
| G9 | Sem ciclos de imports, incluindo tipos | Grafo de módulos + Tarjan |
| G10 | Sem arquivo, export, tipo exportado ou dependência sem uso | Knip |
| G11 | Endereços localhost e diretórios temporários de anexos não ficam fixos fora de config | AST TypeScript |
| G12 | Domain não depende de módulos externos ao domínio | AST e resolução TypeScript |

**G11:** protege o isolamento descoberto no legado: alterar só a porta não resolvia CORS e as três URLs no front. Exemplo versionado: `fixtures/gates/G11-endpoint-fixo.ts.modelo`.

**G12:** protege o domínio criado ao retirar os erros e DTOs da camada HTTP: importar Express, Prisma ou um serviço de volta reintroduziria o acoplamento. Exemplo: `fixtures/gates/G12-dominio-infraestrutura.ts.modelo`.

Aplicar, verificar ID/arquivo e restaurar automaticamente os dois exemplos:

```bash
npm run gates:own
```

Casos adicionais com import type, reexport, import dinâmico, acesso computado/desestruturado ao ambiente e ciclo só de tipos:

```bash
npm run gates:adversarial
```

Kit oficial, com Git limpo e gates passando:

```bash
bash kit-gates/verificar.sh . "npm run gates"
```

Não execute testes de mutação simultaneamente na mesma cópia. Logs gerados pelos kits ficam fora da árvore versionada. Depois de mudar a configuração de uma ferramenta, repita o kit.

### Hook

`npm run up` configura `core.hooksPath=.githooks` e a permissão de execução do pre-commit. O hook executa todos os gates, incluindo G1 e G2, e bloqueia o commit com falha. O caminho relativo funciona em worktrees. Não pule o hook para esconder violações.

## Decisões

- **Isolamento:** projeto Compose e volume por caminho real, três portas alocadas e bind de anexos por cópia. Serviços sobrevivem ao fechamento do terminal e são encerrados pelo Compose, sem caça a processos por porta.
- **Seed:** upsert por e-mail e IDs estáveis dos chamados de demonstração; update vazio preserva alterações e respostas existentes. Não precisa apagar o banco.
- **Camadas:** HTTP chama serviços, composition conecta repositórios, health/stats saíram das rotas. Erros e contratos ficam no domínio; upload recebe dados simples, sem Request Express.
- **Configuração:** acesso ao ambiente centralizado, incluindo API URL normal, upload, download e origem CORS. Fake permanece o padrão.
- **Qualidade:** tipos concretos substituem any; dependências e utilitários sem consumidores foram removidos; referência de chamado saiu para um módulo de domínio e rompeu o ciclo de notificações.
- **Agentes:** AGENTS.md virou índice curto. CLAUDE.md só aponta para ele. Os caminhos e comandos antigos incorretos foram retirados. Instalações de dependências na mesma cópia têm um único responsável.

## Contrato e avaliação

A suíte original em `blackbox/` e o kit em `kit-gates/` permanecem inalterados. Para avaliar com cópia independente do contrato oficial, clone o upstream em outra pasta:

```bash
git clone https://github.com/devfullcycle/mba-ia-desafio-harness-legado.git ../base-oficial
cd ../base-oficial/blackbox
npm ci
```

Rode `API_URL=http://localhost:PORTA npm test` para cada API, substituindo `PORTA` pelo número informado pela subida. O comando é propositalmente um modelo, não um endereço fixo. A suíte requer API e worker no ar. Os testes de integração herdados permanecem no projeto, mas estão fora dos critérios acadêmicos.

O fluxo completo do professor está em [ENUNCIADO.md](ENUNCIADO.md). Resultados, comandos executados e limitações estão em [evidências](docs/evidencias.md); o [estado](docs/estado.md) identifica a versão validada. A aprovação exige provas, não apenas gates verdes.

## Documentação e entrega

- [AGENTS.md](AGENTS.md): entrada dos agentes.
- [Registro de incidentes](docs/incidentes.md): erros reais, prevenção e commits.
- [Matriz de requisitos](docs/requisitos.json): requisito → solução → teste → evidência → resultado.
- [Relatório didático](docs/relatorio-final.html): material complementar offline e preparação para apresentação.
- Entrega acadêmica: este fork público, branch **main**, com o histórico e os arquivos do harness.

O relatório complementar não substitui o repositório nem representa nota oficial do professor.
