# Gates verificáveis

Execute `npm run gates` na raiz, depois da instalação concluída pela subida.
O comando executa todas as verificações mesmo que uma falhe, imprime o resumo
final com uma linha por violação (`G<ID> arquivo — detalhe`) e retorna código 1
quando houver falhas. Não modifica o código nem instala dependências.
Se a subida estiver em andamento (`.balcao/up.lock`), G0 informa essa pré-condição
e retorna código 2: não interpreta dependências parcialmente instaladas como
erros no código. Aguarde a subida terminar e execute novamente.

| Regra | Verificação | Implementação |
|---|---|---|
| G1 | Tipos da API e do front | API do compilador TypeScript; inclui explicitamente todo `src/` |
| G2 | Lint sem avisos, variáveis/imports sem uso, `any` explícito | ESLint + typescript-eslint, sem diretivas inline |
| G3 | Todos os testes `api/src/**/*.test.ts` | Vitest, relatório JSON de cada suíte |
| G4 | HTTP não importa Prisma nem repositórios | AST TypeScript e resolução de módulos |
| G5 | Ambiente somente em `src/config/` de cada aplicação | AST, incluindo acesso computado, aliases e desestruturação |
| G6 | Serviços não importam Express, Multer nem HTTP | AST, incluindo imports somente de tipo |
| G7 | SDK OpenAI somente em integrações | AST, incluindo subpaths, `require` e imports dinâmicos estáticos |
| G8 | Front não importa backend | Resolução de módulos, incluindo arquivos de configuração do front |
| G9 | Nenhum ciclo de imports | Componentes fortemente conexos (Tarjan), incluindo tipos e reexports |
| G10 | Arquivos, exports, tipos e dependências sem uso | Knip com `includeEntryExports`; sem listas de exclusão |
| G11 | Recursos locais fixos somente em configuração | AST de literais de URL loopback e pastas temporárias de uploads |
| G12 | Domínio independente de infraestrutura | Imports de `api/src/domain/` só podem apontar para o próprio domínio |

Os arquivos-fonte são enumerados integralmente. Não há supressões de resultados.
Parâmetros de framework com prefixo `_` podem ser omitidos pelo lint de parâmetros
sem uso, por exemplo a quarta posição exigida pelo middleware de erro do Express;
essa convenção não permite variáveis ou imports locais sem uso.

## Por que G11

O legado tinha CORS, URLs do front e anexos vinculados a recursos fixos. Uma segunda
cópia poderia chamar a API da primeira ou gravar na mesma pasta. G11 impede
reintroduzir literais de recursos locais em HTTP, serviços ou telas. As opções
pertencem a `api/src/config/` e `web/src/config/`, que definem a exceção da regra.
Ela acusa URLs `http(s)://localhost`, `127.x.x.x` e `[::1]`, e caminhos temporários
que contenham `upload` ou `anexo`. Não pretende provar sozinha todo o isolamento:
o teste de duas worktrees verifica o comportamento efetivo.

Exemplo versionado: `fixtures/gates/G11-endpoint-fixo.ts.modelo`.

## Por que G12

Retirar o erro de aplicação da camada HTTP não deve apenas transferir o acoplamento
para o domínio. G12 protege tipos e erros centrais contra dependências de Express,
Prisma, serviços e infraestrutura. Imports de tipo também são dependências.

Exemplo versionado: `fixtures/gates/G12-dominio-infraestrutura.ts.modelo`.

## Provar que os gates falham

`npm run gates:own` primeiro exige uma linha de base verde, aplica cada exemplo
próprio em um arquivo temporário de `src/`, exige saída não zero e a combinação
correta de regra + arquivo, e remove o arquivo em `finally`. Não sobrescreve
arquivos existentes. Aplique manualmente uma fixture copiando-a para
`web/src/mutacao-endereco.ts` (G11) ou
`api/src/domain/mutacao-infraestrutura.ts` (G12), rode `npm run gates` e remova
somente o arquivo que criou.

`npm run gates:adversarial` cobre formas adicionais: reexport, ambiente computado
e desestruturado, import inline de tipo, import dinâmico, ciclo só de tipos e
export de tipo abandonado em um módulo utilizado.

O kit oficial é executado em árvore Git limpa:

```bash
bash kit-gates/verificar.sh . "npm run gates"
```

Qualquer alteração nas configurações requer executar novamente o kit. Nunca
considere apenas a linha de base verde como prova de eficácia dos gates.

## Hook

`.githooks/pre-commit` executa o mesmo `scripts/gates.mjs`, incluindo G1 e G2.
A subida configura `core.hooksPath` automaticamente. O hook analisa o estado
atual dos arquivos; mantenha o índice e a árvore de trabalho alinhados ao commitar.

## Referências das ferramentas

- [Configuração do Knip](https://knip.dev/reference/configuration): workspaces e exports dos entrypoints.
- [Tipos de problemas do Knip](https://knip.dev/reference/issue-types): arquivos, exports, tipos e dependências.
- [CLI do Knip](https://knip.dev/reference/cli): relatórios JSON e seleção dos tipos de problemas.
